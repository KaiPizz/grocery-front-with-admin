Checkout
8 endpoints

Create a new checkout (shopping cart). 
mutation CreateCheckout($input: CheckoutCreateInputExtended!) {
  checkoutCreateFull(input: $input) {
    checkout {
      id
      lines {
        id
        variant { id name sku }
        quantity
        totalPrice { gross { amount currency } }
      }
      subtotalPrice { gross { amount currency } }
      totalPrice { gross { amount currency } }
      shippingPrice { gross { amount currency } }
    }
    errors { field message }
  }
}
{
  "input": {
    "channel": "my-salon",
    "lines": [
      { "variantId": "variant-123", "quantity": 2 }
    ],
    "email": "customer@example.com"
  }
}

Add items to an existing checkout.
mutation AddLines($checkoutId: ID!, $lines: [CheckoutLineInput!]!) {
  checkoutLinesAddFull(checkoutId: $checkoutId, lines: $lines) {
    checkout {
      id
      lines {
        id
        variant { id name }
        quantity
        totalPrice { gross { amount currency } }
      }
      totalPrice { gross { amount currency } }
    }
    errors { field message }
  }
}
 
Update the shipping address on a checkout.
mutation SetShippingAddress($checkoutId: ID!, $address: AddressInput!) {
  checkoutShippingAddressUpdate(checkoutId: $checkoutId, shippingAddress: $address) {
    checkout {
      id
      shippingAddress { street city postalCode country }
      availableShippingMethods { id name price { gross { amount currency } } }
    }
    errors { field message }
  }
}

Select a shipping method for the checkout.
mutation SetShippingMethod($checkoutId: ID!, $methodId: ID!) {
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

Apply a promo/coupon code to the checkout.
mutation ApplyPromo($checkoutId: ID!, $promoCode: String!) {
  checkoutPromoCodeAdd(checkoutId: $checkoutId, promoCode: $promoCode) {
    checkout {
      id
      discount { amount currency }
      totalPrice { gross { amount currency } }
    }
    errors { field message }
  }
} 

Add a note to the checkout order.
mutation UpdateNote($checkoutId: ID!, $note: String!) {
  checkoutNoteUpdate(checkoutId: $checkoutId, note: $note) {
    checkout {
      id
      note
    }
    errors { field message }
  }
} 

Finalize the checkout and create an order.
Returns paymentUrl for redirect-based payment methods (Stripe, P24, TPay)

mutation CompleteCheckout($checkoutId: ID!) {
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

Retrieve an existing checkout by ID.
query GetCheckout($id: ID!) {
  checkoutById(id: $id) {
    id
    email
    lines {
      id
      variant { id name sku }
      quantity
      totalPrice { gross { amount currency } }
    }
    shippingAddress { street city postalCode country }
    billingAddress { street city postalCode country }
    shippingMethod { id name }
    subtotalPrice { gross { amount currency } }
    shippingPrice { gross { amount currency } }
    discount { amount currency }
    totalPrice { gross { amount currency } }
    note
  }
}