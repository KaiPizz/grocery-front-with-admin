import { NextRequest, NextResponse } from 'next/server';

import { setNoStoreHeaders } from '@/lib/auth/server-cookies';
import { validateJsonMutationRequest } from '@/lib/auth/request-security';
import { requestCustomerPasswordReset } from '@/lib/auth/server-service';

type SupportedLocale = 'pl' | 'en';

const GENERIC_SUCCESS: Record<SupportedLocale, string> = {
  en: 'If an account exists for this email, we sent a password reset link.',
  pl: 'Jeśli konto z tym adresem e-mail istnieje, wysłaliśmy link do zmiany hasła.',
};

const GENERIC_FAILURE: Record<SupportedLocale, string> = {
  en: 'We could not process this request right now. Please try again.',
  pl: 'Nie udało się teraz przetworzyć prośby. Spróbuj ponownie.',
};

function normalizeLocale(value: unknown): SupportedLocale {
  return value === 'en' ? 'en' : 'pl';
}

export async function POST(request: NextRequest) {
  const rejection = validateJsonMutationRequest(request);
  if (rejection) {
    return setNoStoreHeaders(NextResponse.json(
      { success: false, message: rejection },
      { status: 403 },
    ));
  }

  let locale: SupportedLocale = 'pl';

  try {
    const body = await request.json() as { email?: unknown; locale?: unknown };
    locale = normalizeLocale(body.locale);
    const email = typeof body.email === 'string' ? body.email.trim() : '';

    if (!email || email.length > 320) {
      return setNoStoreHeaders(NextResponse.json(
        { success: false, message: GENERIC_FAILURE[locale] },
        { status: 400 },
      ));
    }

    const result = await requestCustomerPasswordReset(email, locale);
    if (result.status >= 500 || result.payload?.success !== true) {
      return setNoStoreHeaders(NextResponse.json(
        { success: false, message: GENERIC_FAILURE[locale] },
        { status: 502 },
      ));
    }

    // Keep account existence private: all non-transport outcomes receive the same response.
    return setNoStoreHeaders(NextResponse.json({
      success: true,
      message: GENERIC_SUCCESS[locale],
    }));
  } catch {
    return setNoStoreHeaders(NextResponse.json(
      { success: false, message: GENERIC_FAILURE[locale] },
      { status: 502 },
    ));
  }
}
