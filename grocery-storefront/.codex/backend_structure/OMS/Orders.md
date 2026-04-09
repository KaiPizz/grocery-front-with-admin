Orders
4 endpoints

Get paginated order history for the authenticated customer.
query Orders($first: Int, $after: String) {
  orders(first: $first, after: $after) {
    edges {
      node {
        id
        number
        status
        created
        totalPrice { gross { amount currency } }
        lines {
          productName
          quantity
          totalPrice { gross { amount currency } }
          thumbnail { url }
        }
      }
    }
    pageInfo { hasNextPage endCursor }
    totalCount
  }
}

Get full order details by ID.
query Order($id: ID!) {
  order(id: $id) {
    id
    number
    status
    created
    shippingAddress { street city postalCode country }
    billingAddress { street city postalCode country }
    shippingMethod { name }
    lines {
      productName
      variantName
      quantity
      unitPrice { gross { amount currency } }
      totalPrice { gross { amount currency } }
      thumbnail { url }
    }
    subtotalPrice { gross { amount currency } }
    shippingPrice { gross { amount currency } }
    totalPrice { gross { amount currency } }
    paymentStatus
    trackingNumber
  }
}

Get order details using a guest token (no auth required).
Used for guest checkout order tracking without authentication
query OrderByToken($token: String!) {
  orderByToken(token: $token) {
    id
    number
    status
    totalPrice { gross { amount currency } }
    lines {
      productName
      quantity
    }
  }
}

Get order with customer-visible timeline events.
query OrderTimeline($id: ID!) {
  orderWithEvents(id: $id) {
    id
    number
    status
    events {
      id
      type
      message
      date
    }
  }
}
