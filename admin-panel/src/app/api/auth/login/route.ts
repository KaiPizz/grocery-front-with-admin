import { NextRequest, NextResponse } from 'next/server';
import { setSessionCookie } from '@/lib/session';

export async function POST(request: NextRequest) {
  let body: { username?: string; password?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: 'Invalid request body' },
      { status: 400 }
    );
  }

  const { username, password } = body;

  if (!username || !password) {
    return NextResponse.json(
      { success: false, error: 'Username and password are required' },
      { status: 400 }
    );
  }

  const validUsername = process.env.ADMIN_USERNAME;
  const validPassword = process.env.ADMIN_PASSWORD;

  if (!validUsername || !validPassword) {
    console.error('[auth] ADMIN_USERNAME or ADMIN_PASSWORD not set');
    return NextResponse.json(
      { success: false, error: 'Server misconfiguration' },
      { status: 500 }
    );
  }

  if (username !== validUsername || password !== validPassword) {
    return NextResponse.json(
      { success: false, error: 'Invalid credentials' },
      { status: 401 }
    );
  }

  setSessionCookie(username);

  return NextResponse.json({ success: true });
}
