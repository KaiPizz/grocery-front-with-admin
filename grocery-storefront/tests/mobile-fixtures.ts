import type { Page, Route } from '@playwright/test';

type Money = {
  amount: number;
  currency: string;
};

type CartLineState = {
  id: string;
  merchandiseId: string;
  quantity: number;
  cost: {
    totalAmount: Money;
    amountPerQuantity: Money;
  };
};

type CartState = {
  id: string;
  lines: CartLineState[];
  cost: {
    subtotalAmount: Money;
    totalAmount: Money;
    totalTaxAmount: Money;
    totalDutyAmount: Money;
  };
  buyerIdentity: {
    email: string;
    phone: string;
    countryCode: string;
  };
  note: string;
  attributes: Array<{ key: string; value: string }>;
  discountCodes: Array<{ code: string; applicable: boolean }>;
  createdAt: string;
  updatedAt: string;
};

type CheckoutState = {
  id: string;
  email: string;
  availableShippingMethods: Array<{
    id: string;
    name: string;
    price: Money;
  }>;
  shippingPrice: Money;
  totalPrice: {
    gross: Money;
  };
  note: string;
};

type WishlistServerItemState = {
  productId: string;
  variantId: string;
  addedAt: string;
  name?: string | null;
  price?: number | null;
};

const LISTING_PRODUCT_MEDIA = [
  {
    url: 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=900&q=80',
    alt: 'Organic Gala Apples front package',
    type: 'IMAGE',
    sortOrder: 1,
  },
  {
    url: 'https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?auto=format&fit=crop&w=900&q=80',
    alt: 'Organic Gala Apples nutrition label',
    type: 'IMAGE',
    sortOrder: 2,
  },
  {
    url: 'https://images.unsplash.com/photo-1567306226416-28f0efdc88ce?auto=format&fit=crop&w=900&q=80',
    alt: 'Organic Gala Apples serving suggestion',
    type: 'IMAGE',
    sortOrder: 3,
  },
];

const PRIMARY_PRODUCT = {
  id: 'prod-apples',
  name: 'Organic Gala Apples Family Value Pack',
  slug: 'organic-gala-apples',
  description: 'Sweet and crisp apples ready for everyday delivery.',
  thumbnail: {
    id: 'thumb-apples',
    url: 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=800&q=80',
    alt: 'Fresh produce arranged on a market table',
  },
  media: LISTING_PRODUCT_MEDIA,
  allergens: ['tree_nuts', 'milk', 'soybeans'],
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
  nutritionFacts: {
    calories: 52,
    fat: 0.2,
    saturatedFat: 0,
    carbs: 14,
    sugar: 10,
    fiber: 2.4,
    protein: 0.3,
    salt: 0,
    servingSize: '100g',
  },
  certifications: ['Organic'],
  freshness: 'FRESH',
  nearestExpiry: '2026-03-25',
  category: {
    id: 'cat-fruit',
    name: 'Fruit',
    slug: 'fruit',
  },
  pricing: {
    priceRange: {
      start: {
        gross: {
          amount: 12.99,
          currency: 'PLN',
        },
      },
    },
    priceRangeUndiscounted: {
      start: {
        gross: {
          amount: 15.99,
          currency: 'PLN',
        },
      },
    },
    onSale: true,
  },
  variants: [
    {
      id: 'variant-apples',
      name: '1 kg',
      sku: 'APPLE-1KG',
      pricing: {
        price: {
          gross: {
            amount: 12.99,
            currency: 'PLN',
          },
        },
      },
      quantityAvailable: 20,
      expiryTracking: true,
      shelfLifeDays: 7,
      preOrder: null,
    },
  ],
};

const SECONDARY_PRODUCT = {
  ...PRIMARY_PRODUCT,
  id: 'prod-berries',
  name: 'Blueberries Snack Box',
  slug: 'blueberries-snack-box',
  allergens: [],
  dietaryTags: ['vegan', 'gluten-free'],
  storageZone: 'CHILLED',
  pricing: {
    priceRange: {
      start: {
        gross: {
          amount: 8.49,
          currency: 'PLN',
        },
      },
    },
    priceRangeUndiscounted: {
      start: {
        gross: {
          amount: 8.49,
          currency: 'PLN',
        },
      },
    },
    onSale: false,
  },
  variants: [
    {
      id: 'variant-berries',
      name: '250 g',
      sku: 'BERRY-250',
      pricing: {
        price: {
          gross: {
            amount: 8.49,
            currency: 'PLN',
          },
        },
      },
      quantityAvailable: 12,
      expiryTracking: true,
      shelfLifeDays: 5,
      preOrder: null,
    },
  ],
};

const THIRD_PRODUCT = {
  ...PRIMARY_PRODUCT,
  id: 'prod-bread',
  name: 'Sourdough Sandwich Bread',
  slug: 'sourdough-sandwich-bread',
  allergens: ['gluten'],
  dietaryTags: ['vegetarian'],
  storageZone: 'AMBIENT',
  category: {
    id: 'cat-bakery',
    name: 'Bakery',
    slug: 'bakery',
  },
  pricing: {
    priceRange: {
      start: {
        gross: {
          amount: 6.79,
          currency: 'PLN',
        },
      },
    },
    priceRangeUndiscounted: {
      start: {
        gross: {
          amount: 7.49,
          currency: 'PLN',
        },
      },
    },
    onSale: true,
  },
  variants: [
    {
      id: 'variant-bread',
      name: '1 loaf',
      sku: 'BREAD-1',
      pricing: {
        price: {
          gross: {
            amount: 6.79,
            currency: 'PLN',
          },
        },
      },
      quantityAvailable: 18,
      expiryTracking: true,
      shelfLifeDays: 4,
      preOrder: null,
    },
  ],
};

const FOURTH_PRODUCT = {
  ...PRIMARY_PRODUCT,
  id: 'prod-ravioli',
  name: 'Spinach Ravioli Family Pack',
  slug: 'spinach-ravioli-family-pack',
  description: 'Family-size spinach ravioli for quick freezer meals.',
  allergens: ['gluten', 'eggs'],
  dietaryTags: ['vegetarian'],
  storageZone: 'FROZEN',
  ingredients: 'Wheat flour, spinach, eggs',
  nutritionFacts: null,
  certifications: [],
  category: {
    id: 'cat-frozen',
    name: 'Frozen',
    slug: 'frozen',
  },
  pricing: {
    priceRange: {
      start: {
        gross: {
          amount: 18.49,
          currency: 'PLN',
        },
      },
    },
    priceRangeUndiscounted: {
      start: {
        gross: {
          amount: 18.49,
          currency: 'PLN',
        },
      },
    },
    onSale: false,
  },
  variants: [
    {
      id: 'variant-ravioli',
      name: '750 g',
      sku: 'RAVIOLI-750',
      pricing: {
        price: {
          gross: {
            amount: 18.49,
            currency: 'PLN',
          },
        },
      },
      quantityAvailable: 9,
      expiryTracking: true,
      shelfLifeDays: 120,
      preOrder: null,
    },
  ],
};

const PRODUCTS = [PRIMARY_PRODUCT, SECONDARY_PRODUCT, THIRD_PRODUCT, FOURTH_PRODUCT];
const PRODUCTS_BY_ID = new Map(PRODUCTS.map((product) => [product.id, product]));
const PRODUCTS_WITH_EMPTY_FACETS = PRODUCTS.map((product) => ({
  ...product,
  allergens: [],
  dietaryTags: [],
  storageZone: '',
  certifications: [],
}));
const PRODUCTS_WITHOUT_SALES = PRODUCTS.map((product) => ({
  ...product,
  pricing: {
    ...product.pricing,
    priceRangeUndiscounted: product.pricing.priceRange,
    onSale: false,
  },
}));

type ProductDetailImageMode = 'default' | 'multi-media' | 'unordered-media' | 'crowded-media' | 'thumbnail-only' | 'no-image';
type ProductDetailLabelMode = 'complete' | 'missing';
type ProductDetailCategoryMode = 'present' | 'missing';
type ProductFixture = (typeof PRODUCTS)[number];

// Public taxonomy browsing needs realistic raw categories without changing the
// four-product catalog used by the broader mobile suite. These three products
// are returned only when a public category scopes the product query.
const PUBLIC_TAXONOMY_PRODUCTS: ProductFixture[] = [
  {
    ...PRIMARY_PRODUCT,
    id: 'prod-napa-kimchi',
    name: 'Napa Cabbage Kimchi',
    slug: 'napa-cabbage-kimchi',
    description: 'Fermented napa cabbage with Korean chili and garlic.',
    thumbnail: {
      ...PRIMARY_PRODUCT.thumbnail,
      alt: 'Napa cabbage kimchi in a bowl',
    },
    media: [],
    allergens: ['soybeans'],
    ingredients: 'Napa cabbage, radish, chili, garlic, ginger',
    category: {
      id: 'cat-kimchi',
      name: 'Kimchi',
      slug: 'kimchi',
    },
    variants: [
      {
        ...PRIMARY_PRODUCT.variants[0],
        id: 'variant-napa-kimchi',
        name: '500 g',
        sku: 'KIMCHI-500',
      },
    ],
  },
  {
    ...SECONDARY_PRODUCT,
    id: 'prod-pickled-daikon',
    name: 'Pickled Daikon Radish',
    slug: 'pickled-daikon-radish',
    description: 'Crisp daikon radish in a sweet and tangy pickle brine.',
    thumbnail: {
      ...SECONDARY_PRODUCT.thumbnail,
      alt: 'Pickled daikon radish',
    },
    media: [],
    ingredients: 'Daikon radish, vinegar, sugar, salt',
    category: {
      id: 'cat-pickled-vegetables',
      name: 'Pickled vegetables',
      slug: 'owoce-marynowane-warzywa',
    },
    variants: [
      {
        ...SECONDARY_PRODUCT.variants[0],
        id: 'variant-pickled-daikon',
        name: '250 g',
        sku: 'DAIKON-250',
      },
    ],
  },
  {
    ...THIRD_PRODUCT,
    id: 'prod-spicy-ramyun',
    name: 'Spicy Ramyun Noodles',
    slug: 'spicy-ramyun-noodles',
    description: 'Korean instant noodles with a spicy soup base.',
    thumbnail: {
      ...THIRD_PRODUCT.thumbnail,
      alt: 'Bowl of spicy ramyun noodles',
    },
    media: [],
    allergens: ['gluten', 'soybeans'],
    ingredients: 'Wheat noodles, chili, soy sauce, garlic',
    category: {
      id: 'cat-ramen',
      name: 'Ramen',
      slug: 'ramyun-ramen',
    },
    variants: [
      {
        ...THIRD_PRODUCT.variants[0],
        id: 'variant-spicy-ramyun',
        name: '1 pack',
        sku: 'RAMYUN-1',
      },
    ],
  },
];

const PRODUCT_DETAIL_MEDIA = [
  {
    url: 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=900&q=80',
    alt: 'Organic Gala Apples front package',
    type: 'IMAGE',
    sortOrder: 1,
  },
  {
    url: 'https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?auto=format&fit=crop&w=900&q=80',
    alt: 'Organic Gala Apples nutrition label',
    type: 'IMAGE',
    sortOrder: 2,
  },
  {
    url: 'https://images.unsplash.com/photo-1567306226416-28f0efdc88ce?auto=format&fit=crop&w=900&q=80',
    alt: 'Organic Gala Apples serving suggestion',
    type: 'IMAGE',
    sortOrder: 3,
  },
];

const PRODUCT_DETAIL_UNORDERED_MEDIA = [
  PRODUCT_DETAIL_MEDIA[2],
  PRODUCT_DETAIL_MEDIA[0],
  PRODUCT_DETAIL_MEDIA[1],
];

const PRODUCT_DETAIL_CROWDED_MEDIA = [
  ...PRODUCT_DETAIL_MEDIA,
  {
    url: 'https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?auto=format&fit=crop&w=900&q=80',
    alt: 'Organic Gala Apples detail crop',
    type: 'IMAGE',
    sortOrder: 4,
  },
  {
    url: 'https://images.unsplash.com/photo-1570913149827-d2ac84ab3f9a?auto=format&fit=crop&w=900&q=80',
    alt: 'Organic Gala Apples alternate package',
    type: 'IMAGE',
    sortOrder: 5,
  },
];

function buildProductDetailFixture(
  product: ProductFixture,
  imageMode: ProductDetailImageMode = 'default',
  labelMode: ProductDetailLabelMode = 'complete',
  categoryMode: ProductDetailCategoryMode = 'present'
) {
  const labelProduct = labelMode === 'missing'
    ? {
      ...product,
      allergens: [],
      dietaryTags: [],
      ingredients: null,
      nutritionFacts: null,
      countryOfOrigin: null,
      certifications: [],
    }
    : product;
  const detailProduct = categoryMode === 'missing'
    ? {
      ...labelProduct,
      category: null,
    }
    : labelProduct;

  if (imageMode === 'multi-media') {
    return {
      ...detailProduct,
      thumbnail: {
        id: 'thumb-gallery-duplicate',
        url: PRODUCT_DETAIL_MEDIA[0].url,
        alt: PRODUCT_DETAIL_MEDIA[0].alt,
      },
      media: PRODUCT_DETAIL_MEDIA,
    };
  }

  if (imageMode === 'unordered-media') {
    return {
      ...detailProduct,
      thumbnail: {
        id: 'thumb-gallery-duplicate',
        url: PRODUCT_DETAIL_MEDIA[0].url,
        alt: PRODUCT_DETAIL_MEDIA[0].alt,
      },
      media: PRODUCT_DETAIL_UNORDERED_MEDIA,
    };
  }

  if (imageMode === 'crowded-media') {
    return {
      ...detailProduct,
      thumbnail: {
        id: 'thumb-gallery-duplicate',
        url: PRODUCT_DETAIL_CROWDED_MEDIA[0].url,
        alt: PRODUCT_DETAIL_CROWDED_MEDIA[0].alt,
      },
      media: PRODUCT_DETAIL_CROWDED_MEDIA,
    };
  }

  if (imageMode === 'no-image') {
    return {
      ...detailProduct,
      thumbnail: null,
      media: [],
    };
  }

  return {
    ...detailProduct,
    media: [],
  };
}

const RECIPES = [
  {
    id: 'recipe-salad',
    name: 'Spring Fruit Salad',
    slug: 'spring-fruit-salad',
    description: 'Fast mobile-friendly recipe content for homepage coverage.',
    thumbnail: null,
    servings: 2,
    prepTime: 10,
    cookTime: 0,
    totalTime: 10,
    difficulty: 'EASY',
  },
];

const DELIVERY_OPTIONS = [
  {
    id: 'delivery-standard',
    name: 'Standard courier',
    price: {
      amount: 9.99,
      currency: 'PLN',
    },
  },
  {
    id: 'delivery-pickup',
    name: 'Pickup in store',
    price: {
      amount: 0,
      currency: 'PLN',
    },
  },
];

const PAYMENT_METHODS = [
  {
    id: 'card',
    name: 'Card',
    description: 'Pay by card',
    provider: 'stripe',
    isActive: true,
    fee: { amount: 0, currency: 'PLN' },
  },
  {
    id: 'blik',
    name: 'BLIK',
    description: 'Pay with BLIK',
    provider: 'blik',
    isActive: true,
    fee: { amount: 0, currency: 'PLN' },
  },
];

function buildCategoryFixtures(products: Array<(typeof PRODUCTS)[number]>) {
  const categories = new Map<string, (typeof PRODUCTS)[number]['category']>();

  for (const product of products) {
    categories.set(product.category.id, product.category);
  }

  categories.set('cat-household', {
    id: 'cat-household',
    name: 'Household',
    slug: 'household',
  });

  categories.set('cat-tofu-empty', {
    id: 'cat-tofu-empty',
    name: 'Tofu',
    slug: 'tofu',
  });

  return Array.from(categories.values());
}

function getProductsForCategory(products: Array<(typeof PRODUCTS)[number]>, categoryId: string) {
  return products.filter((product) => product.category.id === categoryId);
}

function getCategoryBackgroundImage(category: (typeof PRODUCTS)[number]['category']) {
  if (category.id !== 'cat-kimchi') {
    return null;
  }

  return {
    url: 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=800&q=80',
    alt: 'Kimchi category',
  };
}

function buildCategoryNode(
  category: (typeof PRODUCTS)[number]['category'],
  products: Array<(typeof PRODUCTS)[number]>
) {
  return {
    ...category,
    level: 0,
    description: null,
    backgroundImage: getCategoryBackgroundImage(category),
    parent: null,
    children: { edges: [] },
    products: {
      totalCount: getProductsForCategory(products, category.id).length,
    },
  };
}

function buildCategoryEdge(
  category: (typeof PRODUCTS)[number]['category'],
  products: Array<(typeof PRODUCTS)[number]>,
  index: number
) {
  return {
    cursor: `category-${index + 1}`,
    node: buildCategoryNode(category, products),
  };
}

function buildProductEdge(product: (typeof PRODUCTS)[number], index: number) {
  return {
    cursor: `cursor-${index + 1}`,
    node: product,
  };
}

function getProductPrice(product: (typeof PRODUCTS)[number]) {
  return product.variants[0]?.pricing?.price?.gross?.amount
    ?? product.pricing.priceRange.start.gross.amount;
}

function matchesProductsFilter(product: (typeof PRODUCTS)[number], filter: Record<string, any> | undefined) {
  if (!filter) {
    return true;
  }

  if (typeof filter.search === 'string' && filter.search.trim()) {
    const query = filter.search.trim().toLowerCase();
    const searchableText = [product.name, product.category.name]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

    if (!searchableText.includes(query)) {
      return false;
    }
  }

  if (Array.isArray(filter.categories) && filter.categories.length > 0) {
    const categoryKeys = filter.categories.map((value: unknown) => String(value));

    if (!categoryKeys.includes(product.category.id) && !categoryKeys.includes(product.category.slug)) {
      return false;
    }
  }

  if (Array.isArray(filter.excludeAllergens) && filter.excludeAllergens.length > 0) {
    if (filter.excludeAllergens.some((allergen: string) => product.allergens.includes(allergen))) {
      return false;
    }
  }

  if (Array.isArray(filter.dietaryTags) && filter.dietaryTags.length > 0) {
    if (!filter.dietaryTags.every((tag: string) => product.dietaryTags.includes(tag))) {
      return false;
    }
  }

  if (typeof filter.storageZone === 'string' && filter.storageZone.length > 0) {
    if (product.storageZone !== filter.storageZone) {
      return false;
    }
  }

  if (Array.isArray(filter.certifications) && filter.certifications.length > 0) {
    const certifications = Array.isArray(product.certifications)
      ? product.certifications.map((value: string) => value.toLowerCase())
      : [];

    if (!filter.certifications.every((certification: string) => certifications.includes(String(certification).toLowerCase()))) {
      return false;
    }
  }

  if (filter.price && typeof filter.price === 'object') {
    const price = getProductPrice(product);

    if (typeof filter.price.gte === 'number' && price < filter.price.gte) {
      return false;
    }

    if (typeof filter.price.lte === 'number' && price > filter.price.lte) {
      return false;
    }
  }

  return true;
}

function buildCart(lines: CartLineState[]): CartState {
  const subtotal = lines.reduce((sum, line) => sum + line.cost.totalAmount.amount, 0);

  return {
    id: 'cart-1',
    lines,
    cost: {
      subtotalAmount: { amount: subtotal, currency: 'PLN' },
      totalAmount: { amount: subtotal, currency: 'PLN' },
      totalTaxAmount: { amount: 0, currency: 'PLN' },
      totalDutyAmount: { amount: 0, currency: 'PLN' },
    },
    buyerIdentity: {
      email: 'mobile@example.com',
      phone: '+48123123123',
      countryCode: 'PL',
    },
    note: '',
    attributes: [],
    discountCodes: [],
    createdAt: '2026-03-18T08:00:00.000Z',
    updatedAt: '2026-03-18T08:00:00.000Z',
  };
}

function buildCartLine(quantity = 1, cartCosts: 'priced' | 'zero' = 'priced'): CartLineState {
  const unitAmount = cartCosts === 'zero' ? 0 : 12.99;

  return {
    id: 'line-1',
    merchandiseId: 'variant-apples',
    quantity,
    cost: {
      amountPerQuantity: { amount: unitAmount, currency: 'PLN' },
      totalAmount: { amount: unitAmount * quantity, currency: 'PLN' },
    },
  };
}

const PICKUP_ONLY_DELIVERY_OPTIONS = [
  {
    id: 'PICKUP',
    name: 'Pickup in store',
    price: {
      amount: 0,
      currency: 'PLN',
    },
  },
];

const BANK_TRANSFER_PAYMENT_METHODS = [
  {
    id: 'bank_transfer',
    name: 'Bank transfer',
    description: 'Pay by bank transfer after placing the order',
    provider: 'bank_transfer',
    isActive: true,
    fee: { amount: 0, currency: 'PLN' },
  },
];

function buildCheckoutState(deliveryOptions = DELIVERY_OPTIONS): CheckoutState {
  const shippingPrice = deliveryOptions[0]?.price ?? { amount: 0, currency: 'PLN' };

  return {
    id: 'checkout-1',
    email: 'mobile@example.com',
    availableShippingMethods: deliveryOptions,
    shippingPrice,
    totalPrice: {
      gross: {
        amount: 22.98,
        currency: 'PLN',
      },
    },
    note: '',
  };
}

async function fulfill(route: Route, data: unknown) {
  await route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ data }),
  });
}

function buildWishlistServerItem(productId: string): WishlistServerItemState | null {
  const product = PRODUCTS_BY_ID.get(productId);

  if (!product) {
    return null;
  }

  return {
    productId: product.id,
    variantId: product.variants[0]?.id ?? '',
    addedAt: '2026-03-18T08:00:00.000Z',
    name: product.name,
    price: product.variants[0]?.pricing?.price?.gross?.amount
      ?? product.pricing.priceRange.start.gross.amount,
  };
}

export async function seedCartStorage(page: Page, cartId = 'cart-1') {
  await page.addInitScript((seedId) => {
    window.localStorage.setItem(
      'grocery-cart',
      JSON.stringify({
        state: { cartId: seedId },
        version: 1,
      })
    );
  }, cartId);
}

export async function seedAuthSession(page: Page) {
  await page.context().addCookies([{
    name: 'grocery_customer_access',
    value: 'opaque-mobile-test-session',
    domain: '127.0.0.1',
    path: '/',
    httpOnly: true,
    secure: false,
    sameSite: 'Lax',
  }]);
  await page.route('**/api/auth/session', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        authenticated: true,
        customer: {
          id: 'customer-1',
          email: 'mobile@example.com',
          fullName: 'Mobile Shopper',
        },
      }),
    });
  });
}

interface MockMobileStorefrontOptions {
  cart?: 'empty' | 'single-item';
  cartCosts?: 'priced' | 'zero';
  checkoutProfile?: 'delivery' | 'pickup-bank-transfer' | 'pickup-no-payment' | 'unconfigured';
  checkoutComplete?: 'success' | 'insufficient-stock';
  products?: 'ok' | 'error';
  productPromotions?: 'mixed' | 'none';
  productDetailImages?: ProductDetailImageMode;
  productDetailLabels?: ProductDetailLabelMode;
  productDetailCategory?: ProductDetailCategoryMode;
  facets?: 'populated' | 'empty';
  listingProductLimit?: number;
  filterCatalogProductLimit?: number;
  wishlist?: 'empty' | 'single-item' | 'stale-remove';
  beforeProductListingResponse?: () => Promise<void>;
  beforeProductFilterCatalogResponse?: () => Promise<void>;
  beforeProductDietaryAvailabilityResponse?: () => Promise<void>;
  onGraphqlOperation?: (operationName: string, query: string) => void;
  onProductsQuery?: (variables: Record<string, unknown>) => void;
  onProductDetailQuery?: (query: string, variables: Record<string, unknown>) => void;
  onSearchProductsIndexQuery?: (variables: Record<string, unknown>) => void;
  onWishlistSyncMutation?: (productIds: string[]) => void;
}

export async function mockMobileStorefront(
  page: Page,
  options: MockMobileStorefrontOptions = {}
) {
  const products = options.productPromotions === 'none'
    ? PRODUCTS_WITHOUT_SALES
    : options.facets === 'empty'
      ? PRODUCTS_WITH_EMPTY_FACETS
      : PRODUCTS;
  const categoryProducts = [...products, ...PUBLIC_TAXONOMY_PRODUCTS];
  const productsById = new Map(products.map((product) => [product.id, product]));
  const categoryFixtures = buildCategoryFixtures(categoryProducts);
  const featuredProduct = products[0] ?? PRIMARY_PRODUCT;
  const cartCostMode = options.cartCosts ?? 'priced';
  const deliveryOptions = options.checkoutProfile === 'unconfigured'
    ? []
    : options.checkoutProfile === 'pickup-bank-transfer' || options.checkoutProfile === 'pickup-no-payment'
      ? PICKUP_ONLY_DELIVERY_OPTIONS
      : DELIVERY_OPTIONS;
  const paymentMethods = options.checkoutProfile === 'unconfigured' || options.checkoutProfile === 'pickup-no-payment'
    ? []
    : options.checkoutProfile === 'pickup-bank-transfer'
      ? BANK_TRANSFER_PAYMENT_METHODS
      : PAYMENT_METHODS;
  let cart = buildCart(options.cart === 'single-item' ? [buildCartLine(1, cartCostMode)] : []);
  let checkout = buildCheckoutState(deliveryOptions);
  let wishlistItems = (() => {
    if (options.wishlist === 'single-item' || options.wishlist === 'stale-remove') {
      return [buildWishlistServerItem(featuredProduct.id)].filter(Boolean) as WishlistServerItemState[];
    }

    return [] as WishlistServerItemState[];
  })();

  await page.route('**/api/graphql*', async (route) => {
    const requestUrl = new URL(route.request().url());
    const rawBody = route.request().postData();
    const body = rawBody
      ? JSON.parse(rawBody) as { query?: string; variables?: Record<string, any>; operationName?: string }
      : {
        query: requestUrl.searchParams.get('query') ?? undefined,
        operationName: requestUrl.searchParams.get('operationName') ?? undefined,
        variables: requestUrl.searchParams.get('variables')
          ? JSON.parse(requestUrl.searchParams.get('variables') as string)
          : undefined,
      };
    const query = body.query ?? '';
    const operationName = body.operationName ?? '';

    options.onGraphqlOperation?.(operationName, query);

    const isProductListingQuery = operationName === 'GroceryProducts'
      || operationName === 'GroceryProductListing'
      || query.includes('query GroceryProducts')
      || query.includes('query GroceryProductListing');
    const isProductFilterCatalogQuery = operationName === 'GroceryProductFilterCatalog'
      || query.includes('query GroceryProductFilterCatalog');
    const isProductDietaryAvailabilityQuery = operationName === 'ProductDietaryAvailability'
      || query.includes('query ProductDietaryAvailability');

    if (isProductDietaryAvailabilityQuery) {
      await options.beforeProductDietaryAvailabilityResponse?.();

      const availabilityFields = [
        ['vegan', 'veganFilter'],
        ['vegetarian', 'vegetarianFilter'],
        ['glutenFree', 'glutenFreeFilter'],
        ['lactoseFree', 'lactoseFreeFilter'],
        ['sugarFree', 'sugarFreeFilter'],
      ] as const;
      const availability = Object.fromEntries(availabilityFields.map(([field, filterVariable]) => {
        const filter = body.variables?.[filterVariable] as Record<string, any> | undefined;
        const categoryKeys = Array.isArray(filter?.categories) ? filter.categories : [];
        const sourceProducts = categoryKeys.length > 0 ? categoryProducts : products;
        const totalCount = sourceProducts.filter((product) => matchesProductsFilter(product, filter)).length;
        return [field, { totalCount }];
      }));

      await fulfill(route, availability);
      return;
    }

    if (isProductListingQuery || isProductFilterCatalogQuery) {
      if (isProductListingQuery) {
        options.onProductsQuery?.(body.variables ?? {});
        await options.beforeProductListingResponse?.();
      } else {
        await options.beforeProductFilterCatalogResponse?.();
      }

      if (options.products === 'error') {
        await route.fulfill({
          status: 404,
          contentType: 'application/json',
          body: JSON.stringify({
            errors: [
              {
                message: "Channel 'default' not found or inactive",
              },
            ],
            data: {
              products: null,
            },
          }),
        });
        return;
      }

      const categoryKeys = Array.isArray(body.variables?.filter?.categories)
        ? body.variables.filter.categories.map(String)
        : [];
      const usesPublicTaxonomy = categoryKeys.some((categoryKey) => (
        PUBLIC_TAXONOMY_PRODUCTS.some((product) => (
          product.category.id === categoryKey || product.category.slug === categoryKey
        ))
      ));
      const unpaginatedProducts = usesPublicTaxonomy ? PUBLIC_TAXONOMY_PRODUCTS : products;
      const listingProducts = isProductListingQuery && options.listingProductLimit !== undefined
        ? unpaginatedProducts.slice(0, options.listingProductLimit)
        : unpaginatedProducts;
      const matchingProducts = listingProducts.filter((product) => matchesProductsFilter(product, body.variables?.filter));
      const filteredProducts = isProductFilterCatalogQuery && options.filterCatalogProductLimit !== undefined
        ? matchingProducts.slice(0, options.filterCatalogProductLimit)
        : matchingProducts;

      await fulfill(route, {
        products: {
          edges: filteredProducts.map(buildProductEdge),
          pageInfo: { hasNextPage: false, endCursor: null },
          totalCount: matchingProducts.length,
        },
      });
      return;
    }

    if (operationName === 'ProductCountryOrigins' || query.includes('query ProductCountryOrigins')) {
      const categoryIds = Array.isArray(body.variables?.categoryIds)
        ? body.variables.categoryIds.map(String)
        : [];
      const originProducts = categoryIds.length > 0
        ? categoryProducts.filter((product) => categoryIds.includes(product.category.id))
        : products;
      const originCounts = new Map<string, number>();

      for (const product of originProducts) {
        const origin = product.countryOfOrigin?.trim();
        if (!origin) continue;
        originCounts.set(origin, (originCounts.get(origin) ?? 0) + 1);
      }

      await fulfill(route, {
        productCountryOrigins: Array.from(originCounts, ([value, count]) => ({ value, count })),
      });
      return;
    }

    if (operationName === 'StorefrontProductSearch' || query.includes('query StorefrontProductSearch')) {
      options.onSearchProductsIndexQuery?.(body.variables ?? {});
      await fulfill(route, {
        searchProducts: {
          edges: products.map((product) => ({
            node: {
              product: {
                id: product.id,
                name: product.name,
                slug: product.slug,
                thumbnail: product.thumbnail,
                pricing: {
                  priceRange: product.pricing.priceRange,
                },
              },
            },
          })),
          totalCount: products.length,
        },
      });
      return;
    }

    if (
      operationName === 'Categories'
      || operationName === 'PublicCategories'
      || operationName === 'PublicCategoryNavigation'
      || query.includes('query Categories')
      || query.includes('query PublicCategories')
      || query.includes('query PublicCategoryNavigation')
    ) {
      const isSlimNavigationQuery = operationName === 'PublicCategoryNavigation'
        || query.includes('query PublicCategoryNavigation');
      await fulfill(route, {
        categories: {
          edges: categoryFixtures.map((category, index) => {
            const edge = buildCategoryEdge(category, categoryProducts, index);
            return isSlimNavigationQuery
              ? {
                ...edge,
                node: {
                  id: edge.node.id,
                  slug: edge.node.slug,
                  name: edge.node.name,
                  description: edge.node.description,
                },
              }
              : edge;
          }),
          pageInfo: { hasNextPage: false, endCursor: null },
          totalCount: categoryFixtures.length,
        },
      });
      return;
    }

    if (operationName === 'CategoryBySlug' || query.includes('query CategoryBySlug')) {
      const requestedSlug = body.variables?.slug;
      const matchedCategory = typeof requestedSlug === 'string'
        ? categoryFixtures.find((category) => category.slug === requestedSlug) ?? null
        : null;
      const matchedCategoryProducts = matchedCategory
        ? getProductsForCategory(categoryProducts, matchedCategory.id)
        : [];

      await fulfill(route, {
        category: matchedCategory
          ? {
            ...buildCategoryNode(matchedCategory, categoryProducts),
            products: {
              edges: matchedCategoryProducts.map(buildProductEdge),
              pageInfo: { hasNextPage: false, endCursor: null },
              totalCount: matchedCategoryProducts.length,
            },
          }
          : null,
      });
      return;
    }

    if (operationName === 'WishlistProducts' || query.includes('query WishlistProducts')) {
      const variables = body.variables ?? {};
      const ids = Object.entries(variables)
        .filter(([key]) => key.startsWith('id'))
        .map(([, value]) => String(value));
      const data = ids.reduce<Record<string, unknown>>((acc, productId, index) => {
        acc[`product${index}`] = productsById.get(productId) ?? null;
        return acc;
      }, {});

      await fulfill(route, data);
      return;
    }

    if (operationName === 'Wishlist' || query.includes('query Wishlist')) {
      await fulfill(route, {
        wishlist: {
          items: wishlistItems,
        },
      });
      return;
    }

    if (operationName === 'WishlistSync' || query.includes('mutation WishlistSync')) {
      const productIds = Array.isArray(body.variables?.productIds)
        ? body.variables.productIds.map((value: unknown) => String(value))
        : [];

      options.onWishlistSyncMutation?.(productIds);

      if (options.wishlist === 'stale-remove') {
        await fulfill(route, {
          wishlistSync: {
            success: true,
            message: null,
            items: [buildWishlistServerItem(featuredProduct.id)].filter(Boolean),
          },
        });
        return;
      }

      wishlistItems = productIds
        .map((productId: string) => buildWishlistServerItem(productId))
        .filter((item: WishlistServerItemState | null): item is WishlistServerItemState => item !== null);

      await fulfill(route, {
        wishlistSync: {
          success: true,
          message: null,
          items: wishlistItems,
        },
      });
      return;
    }

    if (operationName === 'GroceryProduct' || query.includes('query GroceryProduct')) {
      options.onProductDetailQuery?.(query, body.variables ?? {});
      const requestedSlug = body.variables?.slug;
      const matchedProduct = typeof requestedSlug === 'string'
        ? products.find((p) => p.slug === requestedSlug) ?? featuredProduct
        : featuredProduct;
      await fulfill(route, {
        product: buildProductDetailFixture(
          matchedProduct,
          options.productDetailImages,
          options.productDetailLabels,
          options.productDetailCategory
        ),
      });
      return;
    }

    if (operationName === 'ProductRecipes' || query.includes('query ProductRecipes')) {
      await fulfill(route, {
        productRecipes: {
          edges: [],
          pageInfo: { hasNextPage: false, endCursor: null },
          totalCount: 0,
        },
      });
      return;
    }

    if (operationName === 'Recipes' || query.includes('query Recipes')) {
      await fulfill(route, {
        recipes: {
          edges: RECIPES.map((recipe, index) => ({
            cursor: `recipe-${index + 1}`,
            node: recipe,
          })),
          pageInfo: { hasNextPage: false, endCursor: null },
          totalCount: RECIPES.length,
        },
      });
      return;
    }

    if (operationName === 'CartProductMetadata' || query.includes('query CartProductMetadata')) {
      await fulfill(route, {
        products: {
          edges: products.map((product) => ({
            node: {
              id: product.id,
              name: product.name,
              slug: product.slug,
              thumbnail: product.thumbnail,
              storageZone: product.storageZone,
              allergens: product.allergens,
              pricing: {
                priceRange: product.pricing.priceRange,
              },
              variants: product.variants.map((variant) => ({
                id: variant.id,
                name: variant.name,
                pricing: variant.pricing,
              })),
            },
          })),
          pageInfo: { hasNextPage: false, endCursor: null },
        },
      });
      return;
    }

    if (operationName === 'GetCart' || query.includes('query GetCart')) {
      await fulfill(route, { cart });
      return;
    }

    if (operationName === 'CartCreate' || query.includes('mutation CartCreate')) {
      const quantity = body.variables?.input?.lines?.[0]?.quantity ?? 1;
      cart = buildCart([buildCartLine(quantity, cartCostMode)]);
      await fulfill(route, {
        cartCreate: {
          cart,
          userErrors: [],
        },
      });
      return;
    }

    if (operationName === 'CartLinesAdd' || query.includes('mutation CartLinesAdd')) {
      const currentQuantity = cart.lines[0]?.quantity ?? 0;
      const addedQuantity = body.variables?.lines?.[0]?.quantity ?? 1;
      cart = buildCart([buildCartLine(currentQuantity + addedQuantity, cartCostMode)]);
      await fulfill(route, {
        cartLinesAdd: {
          cart,
          userErrors: [],
        },
      });
      return;
    }

    if (operationName === 'CartLinesUpdate' || query.includes('mutation CartLinesUpdate')) {
      const quantity = body.variables?.lines?.[0]?.quantity ?? 1;
      cart = buildCart(quantity > 0 ? [buildCartLine(quantity, cartCostMode)] : []);
      await fulfill(route, {
        cartLinesUpdate: {
          cart,
          userErrors: [],
        },
      });
      return;
    }

    if (operationName === 'CartLinesRemove' || query.includes('mutation CartLinesRemove')) {
      cart = buildCart([]);
      await fulfill(route, {
        cartLinesRemove: {
          cart,
          userErrors: [],
        },
      });
      return;
    }

    if (operationName === 'CartBuyerIdentityUpdate' || query.includes('mutation CartBuyerIdentityUpdate')) {
      cart = {
        ...cart,
        buyerIdentity: {
          email: body.variables?.buyerIdentity?.email ?? 'mobile@example.com',
          phone: body.variables?.buyerIdentity?.phone ?? '+48123123123',
          countryCode: body.variables?.buyerIdentity?.countryCode ?? 'PL',
        },
      };
      await fulfill(route, {
        cartBuyerIdentityUpdate: {
          cart,
          userErrors: [],
        },
      });
      return;
    }

    if (operationName === 'CartNoteUpdate' || query.includes('mutation CartNoteUpdate')) {
      cart = {
        ...cart,
        note: body.variables?.note ?? '',
      };
      await fulfill(route, {
        cartNoteUpdate: {
          cart,
          userErrors: [],
        },
      });
      return;
    }

    if (operationName === 'CartDeliveryOptions' || query.includes('query CartDeliveryOptions')) {
      await fulfill(route, {
        cartDeliveryOptions: deliveryOptions,
      });
      return;
    }

    if (operationName === 'CartSelectedDeliveryOptionsUpdate' || query.includes('mutation CartSelectedDeliveryOptionsUpdate')) {
      await fulfill(route, {
        cartSelectedDeliveryOptionsUpdate: {
          cart,
          userErrors: [],
        },
      });
      return;
    }

    if (operationName === 'AvailablePaymentMethods' || query.includes('query AvailablePaymentMethods')) {
      await fulfill(route, {
        availablePaymentMethods: paymentMethods,
      });
      return;
    }

    if (operationName === 'CheckoutCreateFull' || query.includes('mutation CheckoutCreateFull')) {
      await fulfill(route, {
        checkoutCreateFull: {
          checkout: {
            id: checkout.id,
            email: checkout.email,
            lines: cart.lines.map((line) => ({
              id: line.id,
              quantity: line.quantity,
              variant: {
                id: line.merchandiseId,
                name: PRIMARY_PRODUCT.variants[0].name,
                sku: PRIMARY_PRODUCT.variants[0].sku,
              },
              totalPrice: {
                gross: line.cost.totalAmount,
              },
            })),
            subtotalPrice: {
              gross: cart.cost.subtotalAmount,
            },
            totalPrice: checkout.totalPrice,
          },
          errors: [],
        },
      });
      return;
    }

    if (operationName === 'CheckoutShippingAddressUpdate' || query.includes('mutation CheckoutShippingAddressUpdate')) {
      await fulfill(route, {
        checkoutShippingAddressUpdate: {
          checkout: {
            id: checkout.id,
            availableShippingMethods: checkout.availableShippingMethods,
          },
          errors: [],
        },
      });
      return;
    }

    if (operationName === 'CheckoutShippingMethodUpdate' || query.includes('mutation CheckoutShippingMethodUpdate')) {
      const requestedMethodId = body.variables?.input?.shippingMethodId;
      const selectedMethod = deliveryOptions.find((option) => option.id === requestedMethodId) ?? deliveryOptions[0];
      const shippingPrice = selectedMethod.price;
      checkout = {
        ...checkout,
        shippingPrice,
        totalPrice: {
          gross: {
            amount: cart.cost.subtotalAmount.amount + shippingPrice.amount,
            currency: shippingPrice.currency,
          },
        },
      };
      await fulfill(route, {
        checkoutShippingMethodUpdate: {
          checkout: {
            id: checkout.id,
            shippingPrice,
            totalPrice: checkout.totalPrice,
          },
          errors: [],
        },
      });
      return;
    }

    if (operationName === 'CheckoutPaymentCreate' || query.includes('mutation CheckoutPaymentCreate')) {
      await fulfill(route, {
        checkoutPaymentCreate: {
          payment: {
            id: 'payment-1',
            gateway: body.variables?.input?.gateway ?? 'card',
            status: 'AUTHORIZED',
            clientSecret: null,
            actionUrl: null,
            total: checkout.totalPrice.gross,
          },
          errors: [],
        },
      });
      return;
    }

    if (operationName === 'CheckoutPromoCodeAdd' || query.includes('mutation CheckoutPromoCodeAdd')) {
      await fulfill(route, {
        checkoutPromoCodeAdd: {
          checkout: { id: checkout.id },
          errors: [],
        },
      });
      return;
    }

    if (operationName === 'CheckoutPromoCodeRemove' || query.includes('mutation CheckoutPromoCodeRemove')) {
      await fulfill(route, {
        checkoutPromoCodeRemove: {
          checkout: { id: checkout.id },
          errors: [],
        },
      });
      return;
    }

    if (operationName === 'CheckoutNoteUpdate' || query.includes('mutation CheckoutNoteUpdate')) {
      checkout = {
        ...checkout,
        note: body.variables?.input?.note ?? '',
      };
      await fulfill(route, {
        checkoutNoteUpdate: {
          checkout: {
            id: checkout.id,
            note: checkout.note,
          },
          errors: [],
        },
      });
      return;
    }

    if (operationName === 'CheckoutComplete' || query.includes('mutation CheckoutComplete')) {
      if (options.checkoutComplete === 'insufficient-stock') {
        await fulfill(route, {
          checkoutComplete: {
            order: null,
            confirmationNeeded: false,
            errors: [
              {
                field: 'quantity',
                message: 'Insufficient stock for "Organic Gala Apples Family Value Pack". Available: 0, Requested: 5',
                code: 'INSUFFICIENT_STOCK',
                variants: ['variant-apples'],
              },
            ],
          },
        });
        return;
      }

      await fulfill(route, {
        checkoutComplete: {
          order: {
            id: 'order-1',
            number: '1001',
            status: 'UNFULFILLED',
            createdAt: '2026-03-18T09:00:00.000Z',
            total: checkout.totalPrice,
          },
          confirmationNeeded: false,
          errors: [],
        },
      });
      return;
    }

    await route.fulfill({
      status: 500,
      contentType: 'application/json',
      body: JSON.stringify({
        errors: [{ message: `Unhandled mock query: ${query.slice(0, 60)}` }],
      }),
    });
  });
}
