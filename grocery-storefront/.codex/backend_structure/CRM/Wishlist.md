Wishlist
4 endpoints

Get the current customer wishlist.
query Wishlist($channel: String!) {
  wishlist(channel: $channel) {
    items {
      variantId
      addedAt
      product {
        id
        name
        slug
        thumbnail { url }
        pricing { priceRange { start { gross { amount currency } } } }
      }
    }
  }
}

Add a product variant to the wishlist.
mutation AddToWishlist($channel: String!, $variantId: ID!) {
  addToWishlist(channel: $channel, variantId: $variantId) {
    success
    message
  }
}

Remove a product variant from the wishlist.
mutation RemoveFromWishlist($channel: String!, $variantId: ID!) {
  removeFromWishlist(channel: $channel, variantId: $variantId) {
    success
    message
  }
}

Sync local wishlist with server (merge guest → authenticated).
mutation SyncWishlist($channel: String!, $variantIds: [ID!]!) {
  syncWishlist(channel: $channel, variantIds: $variantIds) {
    success
    message
  }
}