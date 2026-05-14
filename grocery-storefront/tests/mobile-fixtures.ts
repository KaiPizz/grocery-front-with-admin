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
  allergens: ['gluten', 'eggs'],
  dietaryTags: ['vegetarian'],
  storageZone: 'FROZEN',
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

  return Array.from(categories.values());
}

function getProductsForCategory(products: Array<(typeof PRODUCTS)[number]>, categoryId: string) {
  return products.filter((product) => product.category.id === categoryId);
}

function buildCategoryNode(
  category: (typeof PRODUCTS)[number]['category'],
  products: Array<(typeof PRODUCTS)[number]>
) {
  return {
    ...category,
    level: 0,
    description: null,
    backgroundImage: null,
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

function buildCheckoutState(): CheckoutState {
  return {
    id: 'checkout-1',
    email: 'mobile@example.com',
    availableShippingMethods: DELIVERY_OPTIONS,
    shippingPrice: DELIVERY_OPTIONS[0].price,
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
  await page.addInitScript(() => {
    window.localStorage.setItem('grocery_auth_token', 'test-auth-token');
    window.localStorage.setItem(
      'grocery_auth_session',
      JSON.stringify({
        id: 'customer-1',
        email: 'mobile@example.com',
        fullName: 'Mobile Shopper',
      })
    );
  });
}

interface MockMobileStorefrontOptions {
  cart?: 'empty' | 'single-item';
  cartCosts?: 'priced' | 'zero';
  products?: 'ok' | 'error';
  facets?: 'populated' | 'empty';
  wishlist?: 'empty' | 'single-item' | 'stale-remove';
  onProductsQuery?: (variables: Record<string, unknown>) => void;
  onSearchProductsIndexQuery?: (variables: Record<string, unknown>) => void;
  onWishlistSyncMutation?: (productIds: string[]) => void;
}

export async function mockMobileStorefront(
  page: Page,
  options: MockMobileStorefrontOptions = {}
) {
  const products = options.facets === 'empty' ? PRODUCTS_WITH_EMPTY_FACETS : PRODUCTS;
  const productsById = new Map(products.map((product) => [product.id, product]));
  const categoryFixtures = buildCategoryFixtures(products);
  const featuredProduct = products[0] ?? PRIMARY_PRODUCT;
  const cartCostMode = options.cartCosts ?? 'priced';
  let cart = buildCart(options.cart === 'single-item' ? [buildCartLine(1, cartCostMode)] : []);
  let checkout = buildCheckoutState();
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

    if (operationName === 'GroceryProducts' || query.includes('query GroceryProducts')) {
      options.onProductsQuery?.(body.variables ?? {});

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

      const filteredProducts = products.filter((product) => matchesProductsFilter(product, body.variables?.filter));

      await fulfill(route, {
        products: {
          edges: filteredProducts.map(buildProductEdge),
          pageInfo: { hasNextPage: false, endCursor: null },
          totalCount: filteredProducts.length,
        },
      });
      return;
    }

    if (operationName === 'SearchProductsIndex' || query.includes('query SearchProductsIndex')) {
      if (route.request().method() === 'POST') {
        options.onSearchProductsIndexQuery?.(body.variables ?? {});
      }
      await fulfill(route, {
        products: {
          edges: products.map((product) => ({
            node: {
              id: product.id,
              name: product.name,
              slug: product.slug,
              thumbnail: product.thumbnail,
              category: product.category,
              pricing: {
                priceRange: product.pricing.priceRange,
              },
            },
          })),
        },
      });
      return;
    }

    if (operationName === 'Categories' || query.includes('query Categories')) {
      await fulfill(route, {
        categories: {
          edges: categoryFixtures.map((category, index) => buildCategoryEdge(category, products, index)),
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
      const categoryProducts = matchedCategory ? getProductsForCategory(products, matchedCategory.id) : [];

      await fulfill(route, {
        category: matchedCategory
          ? {
            ...buildCategoryNode(matchedCategory, products),
            products: {
              edges: categoryProducts.map(buildProductEdge),
              pageInfo: { hasNextPage: false, endCursor: null },
              totalCount: categoryProducts.length,
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
      const requestedSlug = body.variables?.slug;
      const matchedProduct = typeof requestedSlug === 'string'
        ? products.find((p) => p.slug === requestedSlug) ?? featuredProduct
        : featuredProduct;
      await fulfill(route, {
        product: {
          ...matchedProduct,
          media: [],
        },
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
        cartDeliveryOptions: DELIVERY_OPTIONS,
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
        availablePaymentMethods: PAYMENT_METHODS,
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
      const shippingPrice = DELIVERY_OPTIONS[0].price;
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
