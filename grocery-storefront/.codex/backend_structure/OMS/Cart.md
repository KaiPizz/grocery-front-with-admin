Cart
13 endpoints

Create a new cart with optional initial lines, buyer identity, note, attributes, and discount codes.
This is a public endpoint - no authentication required.
The channel argument resolves the salon/storefront context.
Returns the full Cart object with cost calculations.
Compatible with Shopify Storefront API cart flow.
Parameters
Name	Type	Description
channelrequired	String!	Salon slug or channel identifier used to resolve the storefront
input.lines	[CartLineInput!]	Initial line items to add to the cart
input.lines[].merchandiseIdrequired	ID!	Product variant UUID
input.lines[].quantityrequired	Int!	Quantity (min 1)
input.buyerIdentity	CartBuyerIdentityInput	Buyer identity (email, phone, countryCode)
input.note	String	Order note from the customer
input.attributes	[CartAttributeInput!]	Custom key-value attributes
input.discountCodes	[String!]	Discount codes to apply

mutation CartCreate($channel: String!, $input: CartCreateInput!) {
  cartCreate(channel: $channel, input: $input) {
    cart {
      id
      lines {
        id
        merchandiseId
        quantity
        cost {
          totalAmount { amount currencyCode }
          amountPerQuantity { amount currencyCode }
        }
      }
      cost {
        subtotalAmount { amount currencyCode }
        totalAmount { amount currencyCode }
        totalTaxAmount { amount currencyCode }
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
    userErrors {
      field
      message
      code
    }
  }
}
{
  "channel": "my-salon-slug",
  "input": {
    "lines": [
      { "merchandiseId": "variant-uuid-1", "quantity": 2 },
      { "merchandiseId": "variant-uuid-2", "quantity": 1 }
    ],
    "buyerIdentity": {
      "email": "customer@example.com",
      "phone": "+48123456789",
      "countryCode": "PL"
    },
    "note": "Please gift wrap",
    "discountCodes": ["WELCOME10"]
  }
}

Add one or more line items to an existing cart.
If a variant already exists in the cart, the quantity is incremented.
Cost is automatically recalculated after adding lines.
Parameters
Name	Type	Description
cartIdrequired	ID!	Cart ID returned from cartCreate
linesrequired	[CartLineInput!]!	Line items to add
lines[].merchandiseIdrequired	ID!	Product variant UUID
lines[].quantityrequired	Int!	Quantity (min 1)

mutation CartLinesAdd($cartId: ID!, $lines: [CartLineInput!]!) {
  cartLinesAdd(cartId: $cartId, lines: $lines) {
    cart {
      id
      lines {
        id
        merchandiseId
        quantity
        cost {
          totalAmount { amount currencyCode }
          amountPerQuantity { amount currencyCode }
        }
      }
      cost {
        subtotalAmount { amount currencyCode }
        totalAmount { amount currencyCode }
      }
    }
    userErrors { field message code }
  }
}
{
  "cartId": "cart-uuid",
  "lines": [
    { "merchandiseId": "variant-uuid", "quantity": 3 }
  ]
}

Update the quantity of existing line items in a cart.
Setting quantity to 0 effectively removes the line item.
The line ID comes from the cart.lines[].id field, not the variant ID.
Parameters
Name	Type	Description
cartIdrequired	ID!	Cart ID
linesrequired	[CartLineUpdateInput!]!	Lines to update
lines[].idrequired	ID!	Cart line ID to update
lines[].quantityrequired	Int!	New quantity (min 0; setting to 0 removes the line)
mutation CartLinesUpdate($cartId: ID!, $lines: [CartLineUpdateInput!]!) {
  cartLinesUpdate(cartId: $cartId, lines: $lines) {
    cart {
      id
      lines {
        id
        merchandiseId
        quantity
        cost {
          totalAmount { amount currencyCode }
          amountPerQuantity { amount currencyCode }
        }
      }
      cost {
        subtotalAmount { amount currencyCode }
        totalAmount { amount currencyCode }
      }
    }
    userErrors { field message code }
  }
}
{
  "cartId": "cart-uuid",
  "lines": [
    { "id": "cart-line-uuid", "quantity": 5 }
  ]
}

Remove one or more line items from a cart by their line IDs.
Use cart line IDs (from cart.lines[].id), not variant IDs.
Removing all lines leaves an empty cart (does not delete it).
Parameters
Name	Type	Description
cartIdrequired	ID!	Cart ID
lineIdsrequired	[ID!]!	Array of cart line IDs to remove

mutation CartLinesRemove($cartId: ID!, $lineIds: [ID!]!) {
  cartLinesRemove(cartId: $cartId, lineIds: $lineIds) {
    cart {
      id
      lines {
        id
        merchandiseId
        quantity
      }
      cost {
        subtotalAmount { amount currencyCode }
        totalAmount { amount currencyCode }
      }
    }
    userErrors { field message code }
  }
}
{
  "cartId": "cart-uuid",
  "lineIds": ["cart-line-uuid-1", "cart-line-uuid-2"]
}

Update the buyer identity (email, phone, country) on a cart.
Buyer identity is required before submitting the cart for completion.
Country code may affect tax calculations and available shipping methods.
Parameters
Name	Type	Description
cartIdrequired	ID!	Cart ID
buyerIdentity.email	String	Customer email address
buyerIdentity.phone	String	Customer phone number
buyerIdentity.countryCode	String	ISO country code (e.g. "PL", "DE")

mutation CartBuyerIdentityUpdate($cartId: ID!, $buyerIdentity: CartBuyerIdentityInput!) {
  cartBuyerIdentityUpdate(cartId: $cartId, buyerIdentity: $buyerIdentity) {
    cart {
      id
      buyerIdentity {
        email
        phone
        countryCode
      }
    }
    userErrors { field message code }
  }
}
{
  "cartId": "cart-uuid",
  "buyerIdentity": {
    "email": "customer@example.com",
    "phone": "+48123456789",
    "countryCode": "PL"
  }
}

Apply or replace discount codes on a cart.
This replaces all existing discount codes on the cart.
Pass an empty array to remove all discount codes.
Each code in the response includes an "applicable" flag indicating if it was valid.
Parameters
Name	Type	Description
cartIdrequired	ID!	Cart ID
discountCodesrequired	[String!]!	Discount codes to apply (replaces existing codes)

mutation CartDiscountCodesUpdate($cartId: ID!, $discountCodes: [String!]!) {
  cartDiscountCodesUpdate(cartId: $cartId, discountCodes: $discountCodes) {
    cart {
      id
      discountCodes {
        code
        applicable
      }
      cost {
        subtotalAmount { amount currencyCode }
        totalAmount { amount currencyCode }
      }
    }
    userErrors { field message code }
  }
}
{
  "cartId": "cart-uuid",
  "discountCodes": ["SUMMER20", "FREESHIP"]
}

Update the note on a cart.
Parameters
Name	Type	Description
cartIdrequired	ID!	Cart ID
noterequired	String!	Note text (pass empty string to clear)

mutation CartNoteUpdate($cartId: ID!, $note: String!) {
  cartNoteUpdate(cartId: $cartId, note: $note) {
    cart {
      id
      note
    }
    userErrors { field message code }
  }
}
{
  "cartId": "cart-uuid",
  "note": "Please deliver between 9-12 AM"
}

Set custom key-value attributes on a cart.
Attributes are custom metadata attached to the cart/order.
Common uses: gift messages, referral codes, UTM tracking.
Parameters
Name	Type	Description
cartIdrequired	ID!	Cart ID
attributesrequired	[CartAttributeInput!]!	Key-value pairs to set on the cart
attributes[].keyrequired	String!	Attribute key
attributes[].valuerequired	String!	Attribute value

mutation CartAttributesUpdate($cartId: ID!, $attributes: [CartAttributeInput!]!) {
  cartAttributesUpdate(cartId: $cartId, attributes: $attributes) {
    cart {
      id
      attributes {
        key
        value
      }
    }
    userErrors { field message code }
  }
}
{
  "cartId": "cart-uuid",
  "attributes": [
    { "key": "gift_message", "value": "Happy Birthday!" },
    { "key": "source", "value": "mobile-app" }
  ]
}

Select delivery/shipping options for a cart.
Use the cartDeliveryOptions query to get available options first.
Selecting a delivery option updates the cart total cost.
Parameters
Name	Type	Description
cartIdrequired	ID!	Cart ID
selectedDeliveryOptionsrequired	[CartSelectedDeliveryOptionInput!]!	Selected delivery options per group
selectedDeliveryOptions[].deliveryGroupIdrequired	ID!	Delivery group identifier
selectedDeliveryOptions[].deliveryOptionHandlerequired	ID!

mutation CartSelectedDeliveryOptionsUpdate(
  $cartId: ID!,
  $selectedDeliveryOptions: [CartSelectedDeliveryOptionInput!]!
) {
  cartSelectedDeliveryOptionsUpdate(
    cartId: $cartId,
    selectedDeliveryOptions: $selectedDeliveryOptions
  ) {
    cart {
      id
      cost {
        subtotalAmount { amount currencyCode }
        totalAmount { amount currencyCode }
      }
    }
    userErrors { field message code }
  }
}
{
  "cartId": "cart-uuid",
  "selectedDeliveryOptions": [
    {
      "deliveryGroupId": "group-1",
      "deliveryOptionHandle": "shipping-method-uuid"
    }
  ]
}

Submit a cart for order completion. This finalizes the cart and creates an order.
Ensure buyer identity and delivery options are set before submitting.
On success, the cart is converted into an order.
Check userErrors for validation failures (missing address, out-of-stock, etc.).
Parameters
Name	Type	Description
cartIdrequired	ID!	Cart ID to submit

mutation CartSubmitForCompletion($cartId: ID!) {
  cartSubmitForCompletion(cartId: $cartId) {
    cart {
      id
      cost {
        subtotalAmount { amount currencyCode }
        totalAmount { amount currencyCode }
        totalTaxAmount { amount currencyCode }
      }
    }
    userErrors { field message code }
  }
}
{
  "cartId": "cart-uuid"
}

Retrieve a cart by its ID, including all lines, costs, buyer identity, and attributes.
Returns null if the cart does not exist or has expired.
Cart IDs are persisted client-side (e.g. localStorage) for session continuity.
Parameters
Name	Type	Description
idrequired	ID!	Cart ID

query GetCart($id: ID!) {
  cart(id: $id) {
    id
    lines {
      id
      merchandiseId
      quantity
      cost {
        totalAmount { amount currencyCode }
        amountPerQuantity { amount currencyCode }
      }
    }
    cost {
      subtotalAmount { amount currencyCode }
      totalAmount { amount currencyCode }
      totalTaxAmount { amount currencyCode }
      totalDutyAmount { amount currencyCode }
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
}
{
  "id": "cart-uuid"
}

Get the estimated cost breakdown for a cart without fetching the full cart object.
Lightweight alternative to fetching the full cart when you only need pricing.
Returns null if the cart does not exist.
Parameters
Name	Type	Description
cartIdrequired	ID!	Cart ID

query CartEstimatedCost($cartId: ID!) {
  cartEstimatedCost(cartId: $cartId) {
    subtotalAmount { amount currencyCode }
    totalAmount { amount currencyCode }
    totalTaxAmount { amount currencyCode }
    totalDutyAmount { amount currencyCode }
  }
}
{
  "cartId": "cart-uuid"
}

Get available delivery/shipping options for a cart.
Returns available shipping methods for the salon.
Use the returned IDs as deliveryOptionHandle in cartSelectedDeliveryOptionsUpdate.
Parameters
Name	Type	Description
cartIdrequired	ID!	Cart ID
channelrequired	String!	Salon slug / channel identifier

query CartDeliveryOptions($cartId: ID!, $channel: String!) {
  cartDeliveryOptions(cartId: $cartId, channel: $channel) {
    id
    name
    price { amount currencyCode }
    estimatedDeliveryTime
  }
}
{
  "cartId": "cart-uuid",
  "channel": "my-salon-slug"
}