/** GraphQL operations for the grocery storefront */

const GROCERY_PRODUCT_FIELDS = `
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

const RECIPE_FIELDS = `
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

// --- OMS cart ---

const CART_FIELDS = `
  fragment CartFields on Cart {
    id
    lines {
      id
      merchandiseId
      quantity
      cost {
        totalAmount { amount currency }
        amountPerQuantity { amount currency }
      }
    }
    cost {
      subtotalAmount { amount currency }
      totalAmount { amount currency }
      totalTaxAmount { amount currency }
      totalDutyAmount { amount currency }
    }
    buyerIdentity {
      email
      phone
      countryCode
    }
    note
    attributes { key value }
    discountCodes { code applicable }
    createdAt
    updatedAt
  }
`;

export const CART_PRODUCT_METADATA_QUERY = `
  query CartProductMetadata($channel: String!, $first: Int!, $after: String) {
    products(channel: $channel, first: $first, after: $after) {
      edges {
        node {
          id
          name
          slug
          thumbnail { url alt }
          storageZone
          allergens
          pricing {
            priceRange {
              start { gross { amount currency } }
            }
          }
          variants {
            id
            name
            pricing {
              price { gross { amount currency } }
            }
          }
        }
      }
      pageInfo { hasNextPage endCursor }
    }
  }
`;

export const CART_CREATE_MUTATION = `
  ${CART_FIELDS}
  mutation CartCreate($channel: String!, $input: CartCreateInput!) {
    cartCreate(channel: $channel, input: $input) {
      cart { ...CartFields }
      userErrors { field message code }
    }
  }
`;

export const GET_CART_QUERY = `
  ${CART_FIELDS}
  query GetCart($id: ID!) {
    cart(id: $id) {
      ...CartFields
    }
  }
`;

export const CART_LINES_ADD_MUTATION = `
  ${CART_FIELDS}
  mutation CartLinesAdd($cartId: ID!, $lines: [CartLineInput!]!) {
    cartLinesAdd(cartId: $cartId, lines: $lines) {
      cart { ...CartFields }
      userErrors { field message code }
    }
  }
`;

export const CART_LINES_UPDATE_MUTATION = `
  ${CART_FIELDS}
  mutation CartLinesUpdate($cartId: ID!, $lines: [CartLineUpdateInput!]!) {
    cartLinesUpdate(cartId: $cartId, lines: $lines) {
      cart { ...CartFields }
      userErrors { field message code }
    }
  }
`;

export const CART_LINES_REMOVE_MUTATION = `
  ${CART_FIELDS}
  mutation CartLinesRemove($cartId: ID!, $lineIds: [ID!]!) {
    cartLinesRemove(cartId: $cartId, lineIds: $lineIds) {
      cart { ...CartFields }
      userErrors { field message code }
    }
  }
`;

export const CART_BUYER_IDENTITY_UPDATE_MUTATION = `
  ${CART_FIELDS}
  mutation CartBuyerIdentityUpdate($cartId: ID!, $buyerIdentity: CartBuyerIdentityInput!) {
    cartBuyerIdentityUpdate(cartId: $cartId, buyerIdentity: $buyerIdentity) {
      cart { ...CartFields }
      userErrors { field message code }
    }
  }
`;

export const CART_DISCOUNT_CODES_UPDATE_MUTATION = `
  ${CART_FIELDS}
  mutation CartDiscountCodesUpdate($cartId: ID!, $discountCodes: [String!]!) {
    cartDiscountCodesUpdate(cartId: $cartId, discountCodes: $discountCodes) {
      cart { ...CartFields }
      userErrors { field message code }
    }
  }
`;

export const CART_NOTE_UPDATE_MUTATION = `
  ${CART_FIELDS}
  mutation CartNoteUpdate($cartId: ID!, $note: String!) {
    cartNoteUpdate(cartId: $cartId, note: $note) {
      cart { ...CartFields }
      userErrors { field message code }
    }
  }
`;

export const CART_DELIVERY_OPTIONS_QUERY = `
  query CartDeliveryOptions($cartId: ID!, $channel: String!) {
    cartDeliveryOptions(cartId: $cartId, channel: $channel) {
      id
      name
      price { amount currency }
    }
  }
`;

export const CART_SELECTED_DELIVERY_OPTIONS_UPDATE_MUTATION = `
  ${CART_FIELDS}
  mutation CartSelectedDeliveryOptionsUpdate($cartId: ID!, $selectedDeliveryOptions: [CartSelectedDeliveryOptionInput!]!) {
    cartSelectedDeliveryOptionsUpdate(cartId: $cartId, selectedDeliveryOptions: $selectedDeliveryOptions) {
      cart { ...CartFields }
      userErrors { field message code }
    }
  }
`;

export const CART_SUBMIT_FOR_COMPLETION_MUTATION = `
  ${CART_FIELDS}
  mutation CartSubmitForCompletion($cartId: ID!) {
    cartSubmitForCompletion(cartId: $cartId) {
      cart { ...CartFields }
      userErrors { field message code }
    }
  }
`;

// --- Hybrid checkout/payment handoff ---

export const CHECKOUT_CREATE_MUTATION = `
  mutation CheckoutCreateFull($input: CheckoutCreateInputExtended!) {
    checkoutCreateFull(input: $input) {
      checkout {
        id
        email
        lines {
          id
          quantity
          variant { id name sku }
          totalPrice { gross { amount currency } }
        }
        subtotalPrice { gross { amount currency } }
        totalPrice { gross { amount currency } }
      }
      errors { field message code }
    }
  }
`;

export const CHECKOUT_SHIPPING_ADDRESS_UPDATE = `
  mutation CheckoutShippingAddressUpdate($input: CheckoutShippingAddressUpdateInput!) {
    checkoutShippingAddressUpdate(input: $input) {
      checkout {
        id
        availableShippingMethods {
          id
          name
          price { amount currency }
        }
      }
      errors { field message code }
    }
  }
`;

export const CHECKOUT_SHIPPING_METHOD_UPDATE = `
  mutation CheckoutShippingMethodUpdate($input: CheckoutShippingMethodUpdateInput!) {
    checkoutShippingMethodUpdate(input: $input) {
      checkout {
        id
        shippingMethod { id name }
        shippingPrice { amount currency }
        totalPrice { gross { amount currency } }
      }
      errors { field message code }
    }
  }
`;

export const CHECKOUT_PAYMENT_CREATE = `
  mutation CheckoutPaymentCreate($checkoutId: ID!, $input: CheckoutPaymentInput!) {
    checkoutPaymentCreate(checkoutId: $checkoutId, input: $input) {
      payment {
        id
        gateway
        status
        clientSecret
        actionUrl
        total { amount currency }
      }
      errors { field message code }
    }
  }
`;

export const CHECKOUT_COMPLETE_MUTATION = `
  mutation CheckoutComplete($input: CheckoutCompleteInput!) {
    checkoutComplete(input: $input) {
      order {
        id
        number
        status
        createdAt
        total { gross { amount currency } }
      }
      confirmationNeeded
      errors { field message code }
    }
  }
`;

export const CHECKOUT_NOTE_UPDATE = `
  mutation CheckoutNoteUpdate($input: CheckoutNoteUpdateInput!) {
    checkoutNoteUpdate(input: $input) {
      checkout { id note }
      errors { field message code }
    }
  }
`;

export const AVAILABLE_PAYMENT_METHODS_QUERY = `
  query AvailablePaymentMethods($channel: String!) {
    availablePaymentMethods(channel: $channel) {
      id
      name
      description
      provider
      isActive
      fee { amount currency }
    }
  }
`;

export const CHECKOUT_PROMO_CODE_ADD = `
  mutation CheckoutPromoCodeAdd($checkoutId: ID!, $promoCode: String!) {
    checkoutPromoCodeAdd(input: { checkoutId: $checkoutId, promoCode: $promoCode }) {
      checkout { id }
      errors { field message code }
    }
  }
`;

export const CHECKOUT_PROMO_CODE_REMOVE = `
  mutation CheckoutPromoCodeRemove($checkoutId: ID!) {
    checkoutPromoCodeRemove(checkoutId: $checkoutId) {
      checkout { id }
      errors { field message code }
    }
  }
`;

// --- Customer profile & addresses ---

export const CUSTOMER_PROFILE_QUERY = `
  query CustomerProfile {
    customerProfile {
      id
      email
      fullName
      phone
      emailVerified
      addresses {
        id
        label
        isDefault
        fullName
        phone
        street
        city
        postalCode
        country
        createdAt
      }
      defaultAddress {
        id
        street
        city
      }
      createdAt
    }
  }
`;

export const UPDATE_PROFILE_MUTATION = `
  mutation UpdateProfile($input: UpdateProfileInput!) {
    updateProfile(input: $input) {
      success
      customer {
        id
        fullName
        phone
      }
      errors { field message }
    }
  }
`;

export const CUSTOMER_ADDRESSES_QUERY = `
  query CustomerAddresses {
    customerAddresses {
      id
      label
      isDefault
      fullName
      phone
      street
      city
      postalCode
      country
    }
  }
`;

export const CUSTOMER_ADDRESS_CREATE_MUTATION = `
  mutation CreateAddress($input: CustomerAddressInput!) {
    customerAddressCreate(input: $input) {
      success
      address {
        id
        label
        isDefault
        fullName
        phone
        street
        city
        postalCode
        country
      }
      errors
    }
  }
`;

export const CUSTOMER_ADDRESS_UPDATE_MUTATION = `
  mutation UpdateAddress($id: ID!, $input: CustomerAddressInput!) {
    customerAddressUpdate(id: $id, input: $input) {
      success
      address {
        id
        label
        isDefault
        fullName
        phone
        street
        city
        postalCode
        country
      }
      errors
    }
  }
`;

export const CUSTOMER_ADDRESS_DELETE_MUTATION = `
  mutation DeleteAddress($id: ID!) {
    customerAddressDelete(id: $id) {
      success
      errors
    }
  }
`;

export const CUSTOMER_ADDRESS_SET_DEFAULT_MUTATION = `
  mutation SetDefaultAddress($id: ID!) {
    customerAddressSetDefault(id: $id) {
      success
      address {
        id
        isDefault
      }
      errors
    }
  }
`;

// --- Orders ---

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
            productName
            quantity
            totalPrice { gross { amount currency } }
            thumbnail { url }
          }
        }
      }
    }
  }
`;

export const ORDER_DETAIL_QUERY = `
  query OrderDetail($id: ID!) {
    order(id: $id) {
      id
      number
      status
      created
      shippingAddress { streetAddress1 city postalCode country }
      billingAddress { streetAddress1 city postalCode country }
      shippingMethodName
      lines {
        productName
        variantName
        quantity
        unitPrice { gross { amount currency } }
        totalPrice { gross { amount currency } }
        thumbnail { url }
      }
      subtotal { gross { amount currency } }
      shippingPrice { amount currency }
      total { gross { amount currency } }
      paymentStatus
      trackingNumber
    }
  }
`;
