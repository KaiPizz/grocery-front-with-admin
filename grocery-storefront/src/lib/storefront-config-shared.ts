import type {
  CommercialTrustRowConfig,
  HomepageSeoTextConfig,
  LegalIdentityConfig,
  StorefrontConfig,
} from '@/types/storefront-config';
import { DEFAULT_FULFILLMENT_CONFIG } from '@/lib/fulfillment';

// The four promises under the hero when the admin config carries none.
export const DEFAULT_TRUST_ROW: CommercialTrustRowConfig = {
  enabled: true,
  items: [
    {
      id: 'trust-pickup',
      icon: 'map-pin',
      title: 'Odbiór osobisty w Warszawie',
      description: 'Zamów online, odbierz w sklepie',
      titleEn: 'Pickup in Warsaw',
      descriptionEn: 'Order online, collect in store',
      enabled: true,
      order: 0,
    },
    {
      id: 'trust-confirmation',
      icon: 'check-circle',
      title: 'Potwierdzenie ręczne w godzinach otwarcia',
      description: 'Sklep potwierdza dostępność i termin odbioru',
      titleEn: 'Confirmed by hand during opening hours',
      descriptionEn: 'The shop confirms availability and pickup time',
      enabled: true,
      order: 1,
    },
    {
      id: 'trust-payment',
      icon: 'credit-card',
      title: 'Płatność online (Przelewy24, BLIK) lub przy odbiorze',
      description: 'Wybierz wygodną formę płatności',
      titleEn: 'Pay online (Przelewy24, BLIK) or on pickup',
      descriptionEn: 'Choose the payment that suits you',
      enabled: true,
      order: 2,
    },
    {
      id: 'trust-catalog',
      icon: 'package',
      title: 'Ponad 1 700 produktów z Azji',
      description: 'Korea, Japonia, Wietnam, Tajlandia i więcej',
      titleEn: 'Over 1,700 products from Asia',
      descriptionEn: 'Korea, Japan, Vietnam, Thailand and more',
      enabled: true,
      order: 3,
    },
  ],
};

const DEFAULT_SEO_TEXT: HomepageSeoTextConfig = {
  enabled: false,
  headline: '',
  paragraphs: [],
  headlineEn: '',
  paragraphsEn: [],
};

const DEFAULT_LEGAL_IDENTITY: LegalIdentityConfig = {
  legalName: '',
  registrationType: '',
  nip: '',
  regon: '',
  krs: '',
  registeredAddress: '',
  complaintAddress: '',
};

const DEFAULT_COMMERCIAL_CONFIG: StorefrontConfig['commercial'] = {
  enabled: false,
  quickLinks: [],
  collections: [],
  outlet: {
    enabled: false,
    label: 'Outlet',
    collectionSlug: null,
  },
  categoryHub: {
    enabled: true,
    items: [],
  },
  trustRow: DEFAULT_TRUST_ROW,
};

export function withStorefrontConfigDefaults(config: StorefrontConfig | null): StorefrontConfig | null {
  if (!config) return null;

  const commercial = config.commercial;
  const homepage = config.homepage;

  return {
    ...config,
    homepage: {
      ...homepage,
      featured: { categorySlugs: homepage?.featured?.categorySlugs ?? [] },
      seoText: { ...DEFAULT_SEO_TEXT, ...(homepage?.seoText ?? {}) },
    },
    general: {
      ...config.general,
      openingHours: config.general.openingHours ?? [],
      legalIdentity: {
        ...DEFAULT_LEGAL_IDENTITY,
        ...(config.general.legalIdentity ?? {}),
      },
      fulfillment: {
        ...DEFAULT_FULFILLMENT_CONFIG,
        ...(config.general.fulfillment ?? {}),
      },
    },
    commercial: commercial
      ? {
        ...commercial,
        categoryHub: commercial.categoryHub ?? DEFAULT_COMMERCIAL_CONFIG.categoryHub,
        trustRow: {
          enabled: commercial.trustRow?.enabled ?? true,
          items: commercial.trustRow?.items?.length ? commercial.trustRow.items : DEFAULT_TRUST_ROW.items,
        },
      }
      : DEFAULT_COMMERCIAL_CONFIG,
  };
}

export function getPublicLegalIdentity(config: StorefrontConfig | null): LegalIdentityConfig | null {
  const identity = config?.general?.legalIdentity;
  const legalName = identity?.legalName?.trim() ?? '';
  if (!identity || !legalName) return null;

  return {
    ...DEFAULT_LEGAL_IDENTITY,
    ...identity,
    legalName,
    nip: identity.nip.trim(),
    regon: identity.regon.trim(),
    krs: identity.krs.trim(),
    registeredAddress: identity.registeredAddress.trim(),
    complaintAddress: identity.complaintAddress.trim(),
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

export function extractStorefrontConfig(payload: unknown): StorefrontConfig | null {
  if (!isRecord(payload)) return null;

  const data = isRecord(payload.data) ? payload.data : null;
  const candidate = data?.config ?? payload.config ?? payload.published ?? null;

  if (!isRecord(candidate)) return null;

  return withStorefrontConfigDefaults(candidate as unknown as StorefrontConfig);
}

export function getStorefrontConfigUrls(): string[] {
  const apiUrl = process.env.NEXT_PUBLIC_CONFIG_API_URL?.trim();
  const staticUrl = process.env.NEXT_PUBLIC_STATIC_CONFIG_URL?.trim();
  const slug = process.env.NEXT_PUBLIC_SALON_SLUG || 'my-grocery-store';
  const urls: string[] = [];

  if (apiUrl) {
    urls.push(`${apiUrl.replace(/\/$/, '')}/api/config/${encodeURIComponent(slug)}`);
  }

  if (staticUrl) {
    urls.push(staticUrl);
  }

  return urls;
}

export function getConfigString(value: string | null | undefined): string | undefined {
  const nextValue = value?.trim();
  return nextValue ? nextValue : undefined;
}
