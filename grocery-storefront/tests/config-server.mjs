import { createServer } from 'node:http';

const PORT = Number(process.env.TEST_CONFIG_SERVER_PORT ?? 4199);
const PROVIDER_STEP_UP_PROOF = 'playwright.step.up.proof.bound.to.session.auth.version.20260715';

const products = [
  {
    id: 'prod-apples',
    name: 'Organic Gala Apples Family Value Pack',
    slug: 'organic-gala-apples',
    description: 'Sweet and crisp apples ready for everyday delivery.',
    seoTitle: 'Jabłka Gala 1 kg | Configured Test Grocery',
    seoDescription: 'Świeże jabłka Gala 1 kg. Sprawdź cenę i dostępność w sklepie Configured Test Grocery.',
    translation: {
      language: 'en',
      name: 'Organic Gala Apples Family Value Pack',
      description: 'Sweet and crisp apples ready for everyday delivery.',
      shortDescription: 'Fresh Gala apples in a family value pack.',
      seoTitle: 'Organic Gala Apples 1 kg | Configured Test Grocery',
      seoDescription: 'Organic Gala apples 1 kg. Check the current price and availability at Configured Test Grocery.',
    },
    thumbnail: {
      id: 'thumb-apples',
      url: 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=800&q=80',
      alt: 'Fresh produce arranged on a market table',
    },
    allergens: ['nuts', 'milk', 'soybeans'],
    dietaryTags: ['vegan'],
    calories: 52,
    spiceLevel: null,
    isAlcohol: false,
    countryOfOrigin: 'Poland',
    sellByWeight: false,
    pricePerUnit: 2.99,
    unitOfMeasure: 'kg',
    storageZone: 'AMBIENT',
    ingredients: 'Apples',
    nutritionFacts: null,
    certifications: ['Organic'],
    freshness: 'FRESH',
    nearestExpiry: '2026-03-25',
    category: { id: 'cat-fruit', name: 'Fruit', slug: 'fruit' },
    pricing: {
      priceRange: { start: { gross: { amount: 12.99, currency: 'PLN' } } },
      priceRangeUndiscounted: { start: { gross: { amount: 15.99, currency: 'PLN' } } },
      onSale: true,
    },
    variants: [
      {
        id: 'variant-apples',
        name: '1 kg',
        sku: 'APPLE-1KG',
        pricing: { price: { gross: { amount: 12.99, currency: 'PLN' } } },
        quantityAvailable: 20,
        expiryTracking: true,
        shelfLifeDays: 7,
        preOrder: null,
      },
    ],
  },
  {
    id: 'prod-berries',
    name: 'Blueberries Snack Box',
    slug: 'blueberries-snack-box',
    description: 'Fresh berries packed for snacking.',
    thumbnail: null,
    allergens: [],
    dietaryTags: ['vegan', 'gluten-free'],
    calories: 57,
    spiceLevel: null,
    isAlcohol: false,
    countryOfOrigin: 'Poland',
    sellByWeight: false,
    pricePerUnit: 33.96,
    unitOfMeasure: 'kg',
    storageZone: 'CHILLED',
    ingredients: 'Blueberries',
    nutritionFacts: null,
    certifications: [],
    freshness: 'FRESH',
    nearestExpiry: '2026-03-25',
    category: { id: 'cat-fruit', name: 'Fruit', slug: 'fruit' },
    pricing: {
      priceRange: { start: { gross: { amount: 8.49, currency: 'PLN' } } },
      priceRangeUndiscounted: { start: { gross: { amount: 8.49, currency: 'PLN' } } },
      onSale: false,
    },
    variants: [
      {
        id: 'variant-berries',
        name: '250 g',
        sku: 'BERRY-250',
        pricing: { price: { gross: { amount: 8.49, currency: 'PLN' } } },
        quantityAvailable: 12,
        expiryTracking: true,
        shelfLifeDays: 5,
        preOrder: null,
      },
    ],
  },
  {
    id: 'prod-bread',
    name: 'Sourdough Sandwich Bread',
    slug: 'sourdough-sandwich-bread',
    description: 'Daily bakery loaf.',
    thumbnail: null,
    allergens: ['gluten'],
    dietaryTags: ['vegetarian'],
    calories: 240,
    spiceLevel: null,
    isAlcohol: false,
    countryOfOrigin: 'Poland',
    sellByWeight: false,
    pricePerUnit: 6.79,
    unitOfMeasure: 'piece',
    storageZone: 'AMBIENT',
    ingredients: 'Flour, water, salt',
    nutritionFacts: null,
    certifications: [],
    freshness: 'FRESH',
    nearestExpiry: '2026-03-25',
    category: { id: 'cat-bakery', name: 'Bakery', slug: 'bakery' },
    pricing: {
      priceRange: { start: { gross: { amount: 6.79, currency: 'PLN' } } },
      priceRangeUndiscounted: { start: { gross: { amount: 7.49, currency: 'PLN' } } },
      onSale: true,
    },
    variants: [
      {
        id: 'variant-bread',
        name: '1 loaf',
        sku: 'BREAD-1',
        pricing: { price: { gross: { amount: 6.79, currency: 'PLN' } } },
        quantityAvailable: 18,
        expiryTracking: true,
        shelfLifeDays: 4,
        preOrder: null,
      },
    ],
  },
];

// Category pages use a realistic Asian-grocery taxonomy while the general
// catalog keeps its long-standing fruit/bakery fixtures and stable counts.
const publicTaxonomyProducts = [
  {
    ...products[0],
    id: 'prod-napa-kimchi',
    name: 'Napa Cabbage Kimchi',
    slug: 'napa-cabbage-kimchi',
    description: 'Fermented napa cabbage with Korean chili and garlic.',
    translation: null,
    thumbnail: null,
    allergens: ['soybeans'],
    ingredients: 'Napa cabbage, radish, chili, garlic, ginger',
    category: { id: 'cat-kimchi', name: 'Kimchi', slug: 'kimchi' },
    variants: [
      {
        ...products[0].variants[0],
        id: 'variant-napa-kimchi',
        name: '500 g',
        sku: 'KIMCHI-500',
      },
    ],
  },
  {
    ...products[1],
    id: 'prod-pickled-daikon',
    name: 'Pickled Daikon Radish',
    slug: 'pickled-daikon-radish',
    description: 'Crisp daikon radish in a sweet and tangy pickle brine.',
    thumbnail: null,
    ingredients: 'Daikon radish, vinegar, sugar, salt',
    category: {
      id: 'cat-pickled-vegetables',
      name: 'Pickled vegetables',
      slug: 'owoce-marynowane-warzywa',
    },
    variants: [
      {
        ...products[1].variants[0],
        id: 'variant-pickled-daikon',
        name: '250 g',
        sku: 'DAIKON-250',
      },
    ],
  },
  {
    ...products[2],
    id: 'prod-spicy-ramyun',
    name: 'Spicy Ramyun Noodles',
    slug: 'spicy-ramyun-noodles',
    description: 'Korean instant noodles with a spicy soup base.',
    thumbnail: null,
    allergens: ['gluten', 'soybeans'],
    ingredients: 'Wheat noodles, chili, soy sauce, garlic',
    category: { id: 'cat-ramen', name: 'Ramen', slug: 'ramyun-ramen' },
    variants: [
      {
        ...products[2].variants[0],
        id: 'variant-spicy-ramyun',
        name: '1 pack',
        sku: 'RAMYUN-1',
      },
    ],
  },
];

// Product detail routes render on the Next.js server before Playwright's
// browser-side GraphQL interception is active. Keep detail-only fixtures here
// without changing catalog/category listing counts used by other tests.
const detailProducts = [
  ...products,
  {
    ...products[0],
    id: 'prod-ravioli',
    name: 'Spinach Ravioli Family Pack',
    slug: 'spinach-ravioli-family-pack',
    description: 'Family-size spinach ravioli for quick freezer meals.',
    seoTitle: 'Spinach Ravioli Family Pack | Configured Test Grocery',
    seoDescription: 'Spinach ravioli family pack. Check the current price and availability.',
    translation: null,
    allergens: ['gluten', 'eggs'],
    dietaryTags: ['vegetarian'],
    storageZone: 'FROZEN',
    ingredients: 'Wheat flour, spinach, eggs',
    certifications: [],
    category: { id: 'cat-frozen', name: 'Frozen', slug: 'frozen' },
    pricing: {
      priceRange: { start: { gross: { amount: 18.49, currency: 'PLN' } } },
      priceRangeUndiscounted: { start: { gross: { amount: 18.49, currency: 'PLN' } } },
      onSale: false,
    },
    variants: [
      {
        id: 'variant-ravioli',
        name: '750 g',
        sku: 'RAVIOLI-750',
        pricing: { price: { gross: { amount: 18.49, currency: 'PLN' } } },
        quantityAvailable: 9,
        expiryTracking: true,
        shelfLifeDays: 120,
        preOrder: null,
      },
    ],
  },
];

const categories = [
  { id: 'cat-fruit', name: 'Fruit', slug: 'fruit' },
  { id: 'cat-bakery', name: 'Bakery', slug: 'bakery' },
  { id: 'cat-kimchi', name: 'Kimchi', slug: 'kimchi' },
  { id: 'cat-pickled-vegetables', name: 'Pickled vegetables', slug: 'owoce-marynowane-warzywa' },
  { id: 'cat-ramen', name: 'Ramen', slug: 'ramyun-ramen' },
  { id: 'cat-household', name: 'Household', slug: 'household' },
  { id: 'cat-tofu-empty', name: 'Tofu', slug: 'tofu' },
  { id: 'cat-korean-cosmetics-empty', name: 'Korean cosmetics', slug: 'koreańskie-kosmetyki' },
  { id: 'cat-rice-empty', name: 'Ryż', slug: 'ryż-i-inne-ziarna' },
];

const recipes = [
  {
    id: 'recipe-salad',
    name: 'Spring Fruit Salad',
    slug: 'spring-fruit-salad',
    description: 'A quick fruit salad with a bright, fresh finish.',
    thumbnail: {
      url: 'https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?auto=format&fit=crop&w=1200&q=80',
      alt: 'Spring fruit salad',
    },
    servings: 2,
    prepTime: 10,
    cookTime: 0,
    totalTime: 10,
    difficulty: 'EASY',
    steps: [
      { stepNumber: 1, instruction: 'Prepare and combine the fruit.', image: null },
    ],
    ingredients: [
      {
        id: 'recipe-ingredient-apples',
        quantity: 2,
        unit: 'pieces',
        displayName: 'apples',
        isOptional: false,
        inStock: true,
        variant: null,
        product: null,
      },
    ],
  },
];

const config = {
  branding: {
    logoUrl: null,
    faviconUrl: '/brand/asia-deli-go-favicon.png',
    storeName: 'Configured Test Grocery',
    colors: {
      primary: '#16a34a',
      primaryHover: '#15803d',
      background: '#ffffff',
      foreground: '#0a0a0a',
      accent: '#f59e0b',
      accentForeground: '#ffffff',
      muted: '#f5f5f5',
      mutedForeground: '#525252',
      border: '#e5e5e5',
      card: '#ffffff',
      cardForeground: '#0a0a0a',
      destructive: '#dc2626',
      ring: '#16a34a',
    },
  },
  homepage: {
    hero: {
      enabled: false,
      headline: '',
      subtitle: '',
      ctaText: '',
      ctaLink: '',
      backgroundImageUrl: null,
    },
    promoBanners: [],
    blocks: [],
    sections: [],
  },
  layout: {
    header: {
      navItems: [],
      showSearch: true,
      showWishlist: true,
      showLanguageSwitcher: true,
    },
    footer: {
      tagline: '',
      columns: [],
      copyrightText: '',
    },
    bannerPosition: 'below-hero',
  },
  tracking: {
    facebookPixel: { enabled: false, pixelId: '' },
    googleAnalytics: { enabled: false, measurementId: '' },
    googleTagManager: { enabled: false, containerId: '' },
    hotjar: { enabled: false, siteId: '' },
  },
  seo: {
    defaultTitle: 'Configured SEO Title',
    defaultDescription: 'Configured SEO description from the admin panel.',
    ogImageUrl: 'https://cdn.example.test/og-image.jpg',
    canonical: 'https://store.example.test/en',
  },
  general: {
    phone: '',
    email: '',
    address: '',
    socialLinks: [],
    policyLinks: {
      privacy: '/privacy',
      terms: '/terms',
      about: '#',
    },
    freeShippingThreshold: 150,
    sameDayShippingCutoff: '12:00',
    lowStockThreshold: 10,
  },
  commercial: {
    enabled: true,
    categoryHub: {
      enabled: true,
      items: [
        {
          id: 'category-hub-noodles-rice',
          categorySlug: 'makaron-i-ryz',
          imageUrl: '/brand/categories/noodles-rice.webp',
          enabled: true,
          order: 0,
        },
        {
          id: 'category-hub-kimchi-pickles',
          categorySlug: 'kimchi-i-kiszonki',
          imageUrl: '/brand/categories/kimchi-pickles.webp',
          enabled: true,
          order: 1,
        },
      ],
    },
    quickLinks: [
      {
        id: 'quick-outlet',
        label: 'Outlet',
        href: '/outlet',
        kind: 'outlet',
        description: 'Discounted and short-date picks',
        imageUrl: null,
        enabled: true,
        order: 0,
      },
      {
        id: 'quick-korean-pantry',
        label: 'Korean pantry',
        href: '/collections/korean-pantry',
        kind: 'collection',
        description: 'Rice, noodles, sauces, and daily staples',
        imageUrl: null,
        enabled: true,
        order: 1,
      },
    ],
    collections: [
      {
        slug: 'korean-pantry',
        title: 'Korean pantry',
        subtitle: 'Rice, noodles, sauces, and everyday staples',
        heroImageUrl: 'https://images.unsplash.com/photo-1585032226651-759b368d7246?auto=format&fit=crop&w=1200&q=80',
        enabled: true,
        order: 0,
        tiles: [
          {
            id: 'tile-kimchi',
            title: 'Kimchi',
            href: '/categories/kimchi',
            description: 'Fermented essentials and chilled sides',
            imageUrl: null,
            enabled: true,
            order: 0,
          },
          {
            id: 'tile-noodles',
            title: 'Noodles',
            href: '/products?search=noodles',
            description: 'Fast pantry meals',
            imageUrl: null,
            enabled: true,
            order: 1,
          },
        ],
      },
    ],
    outlet: {
      enabled: true,
      label: 'Outlet',
      collectionSlug: 'korean-pantry',
    },
  },
};

function sendJson(response, status, body) {
  response.writeHead(status, {
    'access-control-allow-origin': '*',
    'content-type': 'application/json',
  });
  response.end(JSON.stringify(body));
}

function buildProductEdge(product, index) {
  return {
    cursor: `cursor-${index + 1}`,
    node: product,
  };
}

function getProductsForCategory(categoryId) {
  return [...products, ...publicTaxonomyProducts]
    .filter((product) => product.category.id === categoryId);
}

function buildCategoryNode(category) {
  return {
    ...category,
    level: 0,
    description: null,
    backgroundImage: null,
    parent: null,
    children: { edges: [] },
    products: {
      totalCount: getProductsForCategory(category.id).length,
    },
  };
}

function buildGraphqlResponse(requestBody, requestHeaders = {}) {
  const query = String(requestBody.query ?? '');
  const variables = requestBody.variables ?? {};

  if (query.includes('mutation CustomerCredentialStepUp')) {
    const expectedBffSecret = process.env.TEST_CUSTOMER_AUTH_BFF_SECRET;
    const bffIsAuthenticated = typeof expectedBffSecret === 'string'
      && expectedBffSecret.length >= 32
      && requestHeaders['x-customer-auth-bff-secret'] === expectedBffSecret;
    const bearerIsAuthenticated = requestHeaders.authorization
      === 'Bearer opaque-account-capability-session';
    const channelIsValid = requestHeaders['x-channel'] === 'test';
    const variablesAreMinimal = Object.keys(variables).join(',') === 'currentPassword';
    const passwordIsValid = variables.currentPassword === 'correct-provider-password'
      || variables.currentPassword === 'correct-link-password';

    if (variables.currentPassword === 'stepup-graphql-bad-request') {
      return {
        data: null,
        errors: [
          {
            message: 'Current password is incorrect.',
            extensions: {
              code: 'BAD_REQUEST',
              originalError: { statusCode: 400, message: 'Current password is incorrect.' },
            },
          },
        ],
      };
    }

    if (variables.currentPassword === 'bff-unavailable-password') {
      return {
        data: null,
        errors: [
          {
            message: 'Customer authentication unavailable.',
            extensions: {
              code: 'SERVICE_UNAVAILABLE',
              originalError: {
                statusCode: 503,
                message: 'Customer authentication unavailable.',
              },
            },
          },
        ],
      };
    }

    if (
      !bffIsAuthenticated
      || !bearerIsAuthenticated
      || !channelIsValid
      || !variablesAreMinimal
      || !passwordIsValid
    ) {
      return {
        data: {
          customerCredentialStepUp: {
            success: false,
            message: 'Current password is incorrect.',
            stepUpProof: null,
            expiresIn: null,
          },
        },
      };
    }

    return {
      data: {
        customerCredentialStepUp: {
          success: true,
          message: 'Credential confirmed.',
          stepUpProof: PROVIDER_STEP_UP_PROOF,
          expiresIn: 300,
        },
      },
    };
  }

  if (query.includes('mutation CustomerGoogleLink')) {
    const expectedBffSecret = process.env.TEST_CUSTOMER_AUTH_BFF_SECRET;
    if (variables.token === 'playwright-google-link-bad-request') {
      return {
        data: null,
        errors: [
          {
            message: 'Invalid OAuth credential.',
            extensions: {
              code: 'BAD_REQUEST',
              originalError: { statusCode: 400, message: 'Invalid OAuth credential.' },
            },
          },
        ],
      };
    }
    if (variables.token === 'playwright-google-link-graphql-unavailable') {
      return {
        data: null,
        errors: [
          {
            message: 'Provider temporarily unavailable.',
            extensions: {
              code: 'SERVICE_UNAVAILABLE',
              originalError: { statusCode: 503, message: 'Provider temporarily unavailable.' },
            },
          },
        ],
      };
    }

    const accepted = typeof expectedBffSecret === 'string'
      && expectedBffSecret.length >= 32
      && requestHeaders['x-customer-auth-bff-secret'] === expectedBffSecret
      && requestHeaders.authorization === 'Bearer opaque-account-capability-session'
      && requestHeaders['x-channel'] === 'test'
      && Object.keys(variables).sort().join(',') === 'nonce,stepUpProof,token'
      && variables.token === 'playwright-google-link-credential'
      && typeof variables.nonce === 'string'
      && /^[A-Za-z0-9_-]{43}$/.test(variables.nonce)
      && variables.stepUpProof === PROVIDER_STEP_UP_PROOF;

    return {
      data: {
        customerGoogleLink: accepted
          ? { success: true, message: 'Google linked and sessions revoked.' }
          : { success: false, message: 'Google link rejected.' },
      },
    };
  }

  if (query.includes('mutation CustomerGoogleLogin')) {
    const bffSecret = requestHeaders['x-customer-auth-bff-secret'];
    const channel = requestHeaders['x-channel'];
    const expectedBffSecret = process.env.TEST_CUSTOMER_AUTH_BFF_SECRET;
    const input = variables.input && typeof variables.input === 'object'
      ? variables.input
      : {};
    const bffIsAuthenticated = typeof expectedBffSecret === 'string'
      && expectedBffSecret.length >= 32
      && bffSecret === expectedBffSecret;
    const channelIsValid = channel === 'test';
    const nonceIsValid = typeof input.nonce === 'string' && /^[A-Za-z0-9_-]{43}$/.test(input.nonce);
    const credentialIsValid = input.token === 'playwright-google-success-credential';

    if (!bffIsAuthenticated || !channelIsValid || !nonceIsValid || !credentialIsValid) {
      return {
        data: {
          customerGoogleAuth: {
            accessToken: null,
            refreshToken: null,
            expiresIn: null,
            success: false,
            message: 'Mock provider rejected credential.',
            customer: null,
            errors: [{ field: 'token', message: 'Mock provider rejected credential.', code: 'INVALID_OAUTH_TOKEN' }],
          },
        },
      };
    }

    return {
      data: {
        customerGoogleAuth: {
          accessToken: 'playwright-http-only-access',
          refreshToken: 'playwright-http-only-refresh',
          expiresIn: 900,
          success: true,
          message: 'Mock Google sign-in succeeded.',
          customer: {
            id: 'google-customer-1',
            email: 'google-shopper@example.test',
            fullName: 'Google Shopper',
            phone: null,
            emailVerified: true,
            createdAt: '2026-07-15T00:00:00.000Z',
            hasPassword: true,
            linkedProviders: ['password', 'google'],
          },
          errors: [],
        },
      },
    };
  }

  if (query.includes('mutation CustomerFacebookLogin')) {
    const bffSecret = requestHeaders['x-customer-auth-bff-secret'];
    const channel = requestHeaders['x-channel'];
    const locale = requestHeaders['x-locale'];
    const expectedBffSecret = process.env.TEST_CUSTOMER_AUTH_BFF_SECRET;
    const input = variables.input && typeof variables.input === 'object'
      ? variables.input
      : {};
    const bffIsAuthenticated = typeof expectedBffSecret === 'string'
      && expectedBffSecret.length >= 32
      && bffSecret === expectedBffSecret;
    const channelIsValid = channel === 'test';
    const localeIsValid = locale === 'pl' || locale === 'en';
    const inputIsMinimal = Object.keys(input).length === 1
      && Object.prototype.hasOwnProperty.call(input, 'token');
    const credentialIsValid = input.token === `playwright-facebook-success-${locale}`;

    if (
      !bffIsAuthenticated
      || !channelIsValid
      || !localeIsValid
      || !inputIsMinimal
      || !credentialIsValid
    ) {
      return {
        data: {
          customerFacebookAuth: {
            accessToken: null,
            refreshToken: null,
            expiresIn: null,
            success: false,
            message: 'Mock provider rejected credential.',
            customer: null,
            errors: [{ field: 'token', message: 'Mock provider rejected credential.', code: 'INVALID_OAUTH_TOKEN' }],
          },
        },
      };
    }

    return {
      data: {
        customerFacebookAuth: {
          accessToken: 'playwright-facebook-http-only-access',
          refreshToken: 'playwright-facebook-http-only-refresh',
          expiresIn: 900,
          success: true,
          message: 'Mock Facebook sign-in succeeded.',
          customer: {
            id: 'facebook-customer-1',
            email: 'facebook-shopper@example.test',
            fullName: 'Facebook Shopper',
            phone: null,
            emailVerified: false,
            createdAt: '2026-07-15T00:00:00.000Z',
            hasPassword: false,
            linkedProviders: ['facebook'],
          },
          errors: [],
        },
      },
    };
  }

  if (query.includes('mutation CustomerFacebookLink')) {
    const expectedBffSecret = process.env.TEST_CUSTOMER_AUTH_BFF_SECRET;
    const bffIsAuthenticated = typeof expectedBffSecret === 'string'
      && expectedBffSecret.length >= 32
      && requestHeaders['x-customer-auth-bff-secret'] === expectedBffSecret;
    const bearerIsAuthenticated = requestHeaders.authorization
      === 'Bearer opaque-account-capability-session';
    const channelIsValid = requestHeaders['x-channel'] === 'test';
    const variablesAreMinimal = Object.keys(variables).sort().join(',')
      === 'stepUpProof,token';
    const inputIsValid = variables.token === 'provider-link-facebook-pl'
      || variables.token === 'provider-link-facebook-en';
    const proofIsValid = variables.stepUpProof === PROVIDER_STEP_UP_PROOF;

    return {
      data: {
        customerFacebookLink: bffIsAuthenticated
          && bearerIsAuthenticated
          && channelIsValid
          && variablesAreMinimal
          && inputIsValid
          && proofIsValid
          ? {
              success: true,
              message: 'Facebook linked and sessions revoked.',
            }
          : {
              success: false,
              message: 'Facebook link rejected.',
            },
      },
    };
  }

  if (query.includes('mutation CustomerLoginProviderUnlink')) {
    const expectedBffSecret = process.env.TEST_CUSTOMER_AUTH_BFF_SECRET;
    const accepted = typeof expectedBffSecret === 'string'
      && expectedBffSecret.length >= 32
      && requestHeaders['x-customer-auth-bff-secret'] === expectedBffSecret
      && requestHeaders.authorization === 'Bearer opaque-account-capability-session'
      && requestHeaders['x-channel'] === 'test'
      && Object.keys(variables).sort().join(',') === 'provider,stepUpProof'
      && (variables.provider === 'google' || variables.provider === 'facebook')
      && variables.stepUpProof === PROVIDER_STEP_UP_PROOF;

    return {
      data: {
        customerLoginProviderUnlink: accepted
          ? { success: true, message: 'Provider disconnected and sessions revoked.' }
          : { success: false, message: 'Provider unlink rejected.' },
      },
    };
  }

  if (query.includes('mutation CustomerAccessTokenRenew')) {
    const input =
      variables.input && typeof variables.input === 'object'
        ? variables.input
        : {};
    const inputIsMinimal = Object.keys(input).length === 1;
    const refreshToken = input.refreshToken;
    const renewedTokens = inputIsMinimal && refreshToken === 'playwright-resend-refresh'
      ? {
          accessToken: 'playwright-resend-renewed-access',
          refreshToken: 'playwright-resend-renewed-refresh',
        }
      : inputIsMinimal && refreshToken === 'playwright-delete-refresh'
        ? {
            accessToken: 'playwright-delete-renewed-access',
            refreshToken: 'playwright-delete-renewed-refresh',
          }
        : null;
    return {
      data: {
        customerAccessTokenRenew: renewedTokens
          ? {
              success: true,
              ...renewedTokens,
              expiresIn: 900,
              errorCode: null,
              message: null,
            }
          : {
              success: false,
              accessToken: null,
              refreshToken: null,
              expiresIn: null,
              errorCode: 'INVALID_REFRESH_TOKEN',
              message: 'Invalid refresh token.',
            },
      },
    };
  }

  if (query.includes('mutation CustomerAccountDelete')) {
    const authorization = requestHeaders.authorization;
    const channel = requestHeaders['x-channel'];
    const inputIsMinimal = Object.keys(variables).length === 1
      && Object.prototype.hasOwnProperty.call(variables, 'password');
    const accessIsValid = authorization === 'Bearer playwright-delete-access'
      || authorization === 'Bearer playwright-delete-renewed-access';

    if (authorization === 'Bearer playwright-delete-expired-access') {
      return {
        data: null,
        errors: [
          {
            message: 'Authentication required',
            extensions: {
              code: 'UNAUTHENTICATED',
              originalError: {
                statusCode: 401,
                message: 'Authentication required',
              },
            },
          },
        ],
      };
    }

    if (!accessIsValid || channel !== 'test' || !inputIsMinimal) {
      return {
        data: { customerAccountDelete: { success: false, message: 'Rejected.' } },
      };
    }

    if (variables.password === 'rate-limited-by-status-delete-password') {
      return {
        data: null,
        errors: [
          {
            message: 'Too many requests',
            extensions: {
              code: 'RATE_LIMITED',
              originalError: {
                statusCode: 429,
                message: 'Too many requests',
              },
            },
          },
        ],
      };
    }

    if (variables.password === 'rate-limited-by-code-delete-password') {
      return {
        data: null,
        errors: [
          {
            message: 'Too many requests',
            extensions: {
              code: 'TOO_MANY_REQUESTS',
              originalError: {
                message: 'Too many requests',
              },
            },
          },
        ],
      };
    }

    return {
      data: {
        customerAccountDelete: variables.password === 'correct-delete-password'
          ? { success: true, message: 'Account deleted successfully.' }
          : { success: false, message: 'Invalid password' },
      },
    };
  }

  if (query.includes('mutation CustomerResendVerification')) {
    const authorization = requestHeaders.authorization;
    const channel = requestHeaders['x-channel'];
    const localeIsValid =
      variables.locale === 'pl' || variables.locale === 'en';
    const inputIsMinimal =
      Object.keys(variables).length === 1 &&
      Object.prototype.hasOwnProperty.call(variables, 'locale');
    const accessIsValid =
      authorization === 'Bearer playwright-resend-access' ||
      authorization === 'Bearer playwright-resend-renewed-access';

    if (authorization === 'Bearer playwright-resend-expired-access') {
      return {
        data: null,
        errors: [
          {
            message: 'Authentication required',
            extensions: {
              code: 'UNAUTHENTICATED',
              originalError: {
                statusCode: 401,
                message: 'Authentication required',
              },
            },
          },
        ],
      };
    }

    if (
      !accessIsValid ||
      channel !== 'test' ||
      !localeIsValid ||
      !inputIsMinimal
    ) {
      return {
        data: { resendVerification: { success: false, message: 'Rejected.' } },
      };
    }

    return {
      data: {
        resendVerification: {
          success: true,
          message: 'Verification email requested.',
        },
      },
    };
  }

  if (
    query.includes('query Categories')
    || query.includes('query PublicCategories')
    || query.includes('query PublicCategoryNavigation')
  ) {
    const isSlimNavigationQuery = query.includes('query PublicCategoryNavigation');
    return {
      data: {
        categories: {
          edges: categories.map((category, index) => {
            const node = buildCategoryNode(category);
            return {
              cursor: `category-${index + 1}`,
              node: isSlimNavigationQuery
                ? {
                  id: node.id,
                  slug: node.slug,
                  name: node.name,
                  description: node.description,
                }
                : node,
            };
          }),
          pageInfo: { hasNextPage: false, endCursor: null },
          totalCount: categories.length,
        },
      },
    };
  }

  if (query.includes('query RecipeBySlug')) {
    return {
      data: {
        recipe: recipes.find((recipe) => recipe.slug === variables.slug) ?? null,
      },
    };
  }

  if (query.includes('query Recipes')) {
    return {
      data: {
        recipes: {
          edges: recipes.map((recipe, index) => ({
            cursor: `recipe-${index + 1}`,
            node: recipe,
          })),
          pageInfo: { hasNextPage: false, endCursor: null },
          totalCount: recipes.length,
        },
      },
    };
  }

  if (query.includes('query ProductDietaryAvailability')) {
    const availabilityFields = [
      ['vegan', 'veganFilter'],
      ['vegetarian', 'vegetarianFilter'],
      ['glutenFree', 'glutenFreeFilter'],
      ['lactoseFree', 'lactoseFreeFilter'],
      ['sugarFree', 'sugarFreeFilter'],
    ];
    const availability = Object.fromEntries(availabilityFields.map(([field, filterVariable]) => {
      const filter = variables[filterVariable] ?? {};
      const categoryKeys = Array.isArray(filter.categories) ? filter.categories.map(String) : [];
      const sourceProducts = categoryKeys.length > 0 ? [...products, ...publicTaxonomyProducts] : products;
      const dietaryTags = Array.isArray(filter.dietaryTags) ? filter.dietaryTags.map(String) : [];
      const totalCount = sourceProducts.filter((product) => (
        (categoryKeys.length === 0
          || categoryKeys.includes(product.category.id)
          || categoryKeys.includes(product.category.slug))
        && dietaryTags.every((tag) => product.dietaryTags.includes(tag))
      )).length;
      return [field, { totalCount }];
    }));

    return { data: availability };
  }

  if (
    query.includes('query GroceryProductListing')
    || query.includes('query GroceryProductFilterCatalog')
  ) {
    const categoryKeys = Array.isArray(variables.filter?.categories)
      ? variables.filter.categories.map(String)
      : [];
    const usesPublicTaxonomy = categoryKeys.some((categoryKey) => (
      publicTaxonomyProducts.some((product) => (
        product.category.id === categoryKey || product.category.slug === categoryKey
      ))
    ));
    const listingProducts = usesPublicTaxonomy ? publicTaxonomyProducts : products;
    const matchingProducts = categoryKeys.length === 0
      ? listingProducts
      : listingProducts.filter((product) => (
        categoryKeys.includes(product.category.id)
        || categoryKeys.includes(product.category.slug)
      ));

    return {
      data: {
        products: {
          edges: matchingProducts.map(buildProductEdge),
          pageInfo: {
            hasNextPage: false,
            hasPreviousPage: false,
            startCursor: matchingProducts.length > 0 ? 'cursor-1' : null,
            endCursor: matchingProducts.length > 0 ? `cursor-${matchingProducts.length}` : null,
          },
          totalCount: matchingProducts.length,
        },
      },
    };
  }

  if (query.includes('query CategoryBySlug')) {
    const matchedCategory = categories.find((category) => category.slug === variables.slug) ?? null;
    const categoryProducts = matchedCategory ? getProductsForCategory(matchedCategory.id) : [];

    return {
      data: {
        category: matchedCategory
          ? {
            ...buildCategoryNode(matchedCategory),
            products: {
              edges: categoryProducts.map(buildProductEdge),
              pageInfo: { hasNextPage: false, endCursor: null },
              totalCount: categoryProducts.length,
            },
          }
          : null,
      },
    };
  }

  if (/query\s+GroceryProduct\b/.test(query)) {
    const matchedProduct = detailProducts.find((product) => product.slug === variables.slug) ?? null;

    return {
      data: {
        product: matchedProduct,
      },
    };
  }

  return {
    data: null,
    errors: [{ message: `Unhandled mock GraphQL query: ${query.slice(0, 80)}` }],
  };
}

const server = createServer((request, response) => {
  if (request.method === 'OPTIONS') {
    response.writeHead(204, {
      'access-control-allow-origin': '*',
      'access-control-allow-methods': 'GET,OPTIONS',
      'access-control-allow-headers': 'content-type',
    });
    response.end();
    return;
  }

  if (request.method === 'GET' && request.url?.startsWith('/api/config/')) {
    sendJson(response, 200, {
      slug: 'test',
      config,
      version: 1,
      updatedAt: '2026-05-12T00:00:00.000Z',
    });
    return;
  }

  if (request.method === 'GET' && request.url === '/api/v1/public/salon/test') {
    sendJson(response, 200, {
      source: 'playwright-config-server',
      slug: 'test',
      path: request.url,
    });
    return;
  }

  if (request.method === 'POST' && request.url?.startsWith('/graphql')) {
    let body = '';
    request.on('data', (chunk) => {
      body += chunk;
    });
    request.on('end', () => {
      try {
        const requestBody = JSON.parse(body || '{}');
        if (
          String(requestBody.query ?? '').includes('mutation CustomerAccountDelete')
          && requestBody.variables?.password === 'disconnect-after-refresh-delete-password'
          && request.headers.authorization === 'Bearer playwright-delete-renewed-access'
        ) {
          response.destroy();
          return;
        }
        if (
          String(requestBody.query ?? '').includes('mutation CustomerAccountDelete')
          && requestBody.variables?.password === 'rate-limited-by-http-delete-password'
          && request.headers.authorization === 'Bearer playwright-delete-renewed-access'
        ) {
          sendJson(response, 429, {
            data: null,
            errors: [{ message: 'Too many requests' }],
          });
          return;
        }
        sendJson(response, 200, buildGraphqlResponse(requestBody, request.headers));
      } catch (error) {
        sendJson(response, 400, {
          data: null,
          errors: [{ message: error instanceof Error ? error.message : 'Invalid GraphQL request.' }],
        });
      }
    });
    return;
  }

  sendJson(response, 200, { ok: true });
});

server.listen(PORT, '127.0.0.1');
