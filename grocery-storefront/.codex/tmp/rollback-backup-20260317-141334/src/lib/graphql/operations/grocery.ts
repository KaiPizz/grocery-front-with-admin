/** GraphQL operations for the grocery storefront */

export const GROCERY_PRODUCT_FIELDS = `
  fragment GroceryProductFields on Product {
    id
    name
    slug
    description
    thumbnail { url alt }
    allergens
    dietaryTags
    calories
    spiceLevel
    isAlcohol
    countryOfOrigin
    sellByWeight
    pricePerUnit
    unitOfMeasure
    storageZone
    ingredients
    nutritionFacts {
      calories
      fat
      saturatedFat
      carbs
      sugar
      fiber
      protein
      salt
      servingSize
    }
    certifications
    freshness
    nearestExpiry
    category { id name slug }
    pricing {
      priceRange {
        start { gross { amount currency } }
      }
      priceRangeUndiscounted {
        start { gross { amount currency } }
      }
      onSale
    }
    variants {
      id
      name
      sku
      pricing { price { gross { amount currency } } }
      quantityAvailable
      expiryTracking
      shelfLifeDays
      preOrder { enabled date depositPercent maxQuantity }
    }
  }
`;

export const PRODUCTS_QUERY = `
  ${GROCERY_PRODUCT_FIELDS}
  query GroceryProducts(
    $channel: String!
    $first: Int
    $after: String
    $filter: ProductFilterInput
    $sortBy: ProductOrder
  ) {
    products(
      channel: $channel
      first: $first
      after: $after
      filter: $filter
      sortBy: $sortBy
    ) {
      edges {
        node { ...GroceryProductFields }
        cursor
      }
      pageInfo { hasNextPage endCursor }
      totalCount
    }
  }
`;

export const SEARCH_PRODUCTS_QUERY = `
  query SearchProductsIndex($channel: String!, $first: Int) {
    products(channel: $channel, first: $first) {
      edges {
        node {
          id
          name
          slug
          thumbnail { url alt }
          category { id name slug }
          pricing {
            priceRange {
              start { gross { amount currency } }
            }
          }
        }
      }
    }
  }
`;

export const PRODUCT_BY_SLUG_QUERY = `
  ${GROCERY_PRODUCT_FIELDS}
  query GroceryProduct($channel: String!, $slug: String!) {
    product(channel: $channel, slug: $slug) {
      ...GroceryProductFields
      media { url alt type }
    }
  }
`;

export const PRODUCTS_BY_ZONE_QUERY = `
  ${GROCERY_PRODUCT_FIELDS}
  query ProductsByZone($channel: String!, $zone: StorageZone!, $first: Int) {
    productsByStorageZone(channel: $channel, zone: $zone, first: $first) {
      edges {
        node { ...GroceryProductFields }
        cursor
      }
      pageInfo { hasNextPage endCursor }
    }
  }
`;

export const RECIPE_FIELDS = `
  fragment RecipeFields on Recipe {
    id
    name
    slug
    description
    thumbnail { url alt }
    servings
    prepTime
    cookTime
    totalTime
    difficulty
  }
`;

export const RECIPES_QUERY = `
  ${RECIPE_FIELDS}
  query Recipes($channel: String!, $first: Int, $after: String) {
    recipes(channel: $channel, first: $first, after: $after) {
      edges {
        node { ...RecipeFields }
        cursor
      }
      pageInfo { hasNextPage endCursor }
      totalCount
    }
  }
`;

export const RECIPE_BY_SLUG_QUERY = `
  ${RECIPE_FIELDS}
  query RecipeBySlug($channel: String!, $slug: String!) {
    recipe(channel: $channel, slug: $slug) {
      ...RecipeFields
      steps {
        stepNumber
        instruction
        image { url alt }
      }
      ingredients {
        id
        quantity
        unit
        displayName
        isOptional
        inStock
        variant {
          id
          name
          pricing { price { gross { amount currency } } }
        }
        product {
          id
          name
          slug
          thumbnail { url alt }
        }
      }
    }
  }
`;

export const PRODUCT_RECIPES_QUERY = `
  ${RECIPE_FIELDS}
  query ProductRecipes($channel: String!, $productId: ID!, $first: Int) {
    productRecipes(channel: $channel, productId: $productId, first: $first) {
      edges {
        node { ...RecipeFields }
        cursor
      }
      pageInfo { hasNextPage endCursor }
    }
  }
`;

// --- Customer auth + wishlist ---

export const ME_QUERY = `
  query Me {
    me {
      id
      email
      fullName
      phone
      createdAt
    }
  }
`;

export const CUSTOMER_LOGIN_MUTATION = `
  mutation CustomerLogin($input: LoginInput!) {
    customerLogin(input: $input) {
      accessToken
      refreshToken
      success
      message
      customer {
        id
        email
        fullName
        phone
        createdAt
      }
      errors {
        field
        message
        code
      }
    }
  }
`;

export const CUSTOMER_REGISTER_MUTATION = `
  mutation CustomerRegister($input: RegisterInput!) {
    customerRegister(input: $input) {
      accessToken
      refreshToken
      success
      message
      customer {
        id
        email
        fullName
        phone
        createdAt
      }
      errors {
        field
        message
        code
      }
    }
  }
`;

export const REFRESH_TOKEN_MUTATION = `
  mutation RefreshToken($input: TokenRefreshInput!) {
    refreshToken(input: $input) {
      success
      accessToken
      refreshToken
      expiresIn
      message
    }
  }
`;

export const LOGOUT_MUTATION = `
  mutation Logout {
    logout {
      success
      message
    }
  }
`;

export const WISHLIST_QUERY = `
  query Wishlist {
    wishlist {
      items {
        productId
        variantId
        addedAt
        name
        price
      }
    }
  }
`;

export const WISHLIST_SYNC_MUTATION = `
  mutation WishlistSync($productIds: [ID!]!) {
    wishlistSync(productIds: $productIds) {
      success
      message
      items {
        productId
        variantId
        addedAt
        name
        price
      }
    }
  }
`;

export const WISHLIST_PRODUCT_FIELDS = `
  fragment WishlistProductFields on Product {
    id
    name
    slug
    thumbnail { url alt }
    storageZone
    pricing {
      priceRange {
        start { gross { amount currency } }
      }
    }
    variants {
      id
      name
      pricing { price { gross { amount currency } } }
      quantityAvailable
    }
  }
`;

// --- Checkout mutations ---

export const CHECKOUT_CREATE_MUTATION = `
  mutation CheckoutCreateFull($input: CheckoutCreateInputExtended!) {
    checkoutCreateFull(input: $input) {
      checkout {
        id
      }
      errors { field message }
    }
  }
`;

export const CHECKOUT_SHIPPING_ADDRESS_UPDATE = `
  mutation CheckoutShippingAddressUpdate($checkoutId: ID!, $address: AddressInput!) {
    checkoutShippingAddressUpdate(checkoutId: $checkoutId, shippingAddress: $address) {
      checkout {
        id
        availableShippingMethods {
          id
          name
          price { gross { amount currency } }
        }
      }
      errors { field message }
    }
  }
`;

export const CHECKOUT_SHIPPING_METHOD_UPDATE = `
  mutation CheckoutShippingMethodUpdate($checkoutId: ID!, $methodId: ID!) {
    checkoutShippingMethodUpdate(checkoutId: $checkoutId, shippingMethodId: $methodId) {
      checkout {
        id
        shippingMethod { id name }
        shippingPrice { gross { amount currency } }
        totalPrice { gross { amount currency } }
      }
      errors { field message }
    }
  }
`;

export const CHECKOUT_PAYMENT_CREATE = `
  mutation CheckoutPaymentCreate($input: PaymentInput!) {
    checkoutPaymentCreate(input: $input) {
      payment {
        id
        gateway
        paymentUrl
        total { amount currency }
      }
      errors { field message }
    }
  }
`;

export const CHECKOUT_COMPLETE_MUTATION = `
  mutation CheckoutComplete($checkoutId: ID!) {
    checkoutComplete(checkoutId: $checkoutId) {
      order {
        id
        number
        status
        totalPrice { gross { amount currency } }
        paymentUrl
      }
      errors { field message }
    }
  }
`;

export const CHECKOUT_NOTE_UPDATE = `
  mutation CheckoutNoteUpdate($checkoutId: ID!, $note: String!) {
    checkoutNoteUpdate(checkoutId: $checkoutId, note: $note) {
      checkout { id note }
      errors { field message }
    }
  }
`;

export const CHECKOUT_PROMO_CODE_ADD = `
  mutation CheckoutPromoCodeAdd($checkoutId: ID!, $promoCode: String!) {
    checkoutPromoCodeAdd(checkoutId: $checkoutId, promoCode: $promoCode) {
      checkout {
        id
        discount { amount currency }
        totalPrice { gross { amount currency } }
      }
      errors { field message }
    }
  }
`;

export const CHECKOUT_PROMO_CODE_REMOVE = `
  mutation CheckoutPromoCodeRemove($checkoutId: ID!) {
    checkoutPromoCodeRemove(checkoutId: $checkoutId) {
      checkout {
        id
        totalPrice { gross { amount currency } }
      }
      errors { field message }
    }
  }
`;

export const AVAILABLE_SHIPPING_METHODS_QUERY = `
  query AvailableShippingMethods($channel: String!) {
    availableShippingMethods(channel: $channel) {
      id name description
      price { amount currency }
      minimumDeliveryDays maximumDeliveryDays
    }
  }
`;

export const AVAILABLE_PAYMENT_METHODS_QUERY = `
  query AvailablePaymentMethods($checkoutId: ID!) {
    availablePaymentMethods(checkoutId: $checkoutId) {
      id
      name
      type
      currencies
      config
    }
  }
`;

export const CUSTOMER_ORDERS_QUERY = `
  query CustomerOrders($first: Int!, $after: String) {
    orders(first: $first, after: $after) {
      totalCount
      pageInfo { hasNextPage endCursor }
      edges {
        node {
          id
          number
          status
          created
          total {
            gross { amount currency }
          }
          lines {
            quantity
            productName
            totalPrice { gross { amount currency } }
            thumbnail { url }
          }
        }
      }
    }
  }
`;
