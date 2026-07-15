import { createServer } from 'node:http';

const PORT = Number(process.env.TEST_CONFIG_SERVER_PORT ?? 4199);

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

const categories = [
  { id: 'cat-fruit', name: 'Fruit', slug: 'fruit' },
  { id: 'cat-bakery', name: 'Bakery', slug: 'bakery' },
  { id: 'cat-household', name: 'Household', slug: 'household' },
];

const config = {
  branding: {
    logoUrl: null,
    faviconUrl: 'https://cdn.example.test/favicon.ico',
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
            href: '/categories/fruit',
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
  return products.filter((product) => product.category.id === categoryId);
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
            createdAt: '2026-07-15T00:00:00.000Z',
          },
          errors: [],
        },
      },
    };
  }

  if (query.includes('query Categories')) {
    return {
      data: {
        categories: {
          edges: categories.map((category, index) => ({
            cursor: `category-${index + 1}`,
            node: buildCategoryNode(category),
          })),
          pageInfo: { hasNextPage: false, endCursor: null },
          totalCount: categories.length,
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

  if (query.includes('query GroceryProduct')) {
    const matchedProduct = products.find((product) => product.slug === variables.slug) ?? null;

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

  if (request.method === 'POST' && request.url === '/graphql') {
    let body = '';
    request.on('data', (chunk) => {
      body += chunk;
    });
    request.on('end', () => {
      try {
        sendJson(response, 200, buildGraphqlResponse(JSON.parse(body || '{}'), request.headers));
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
