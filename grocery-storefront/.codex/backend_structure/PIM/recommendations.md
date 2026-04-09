Recommendations
7 endpoints

Get top-selling products.
query Bestsellers($channel: String!, $first: Int) {
  bestsellers(channel: $channel, first: $first) {
    edges {
      node {
        id
        name
        slug
        thumbnail { url }
        pricing { priceRange { start { gross { amount currency } } } }
      }
    }
  }
}

Get recently added products.
query NewArrivals($channel: String!, $first: Int) {
  newArrivals(channel: $channel, first: $first) {
    edges {
      node {
        id
        name
        slug
        thumbnail { url }
      }
    }
  }
}

Get products related to a specific product.
query RelatedProducts($channel: String!, $productId: ID!, $first: Int) {
  relatedProducts(channel: $channel, productId: $productId, first: $first) {
    edges {
      node {
        id
        name
        slug
        thumbnail { url }
      }
    }
  }
}

Get products commonly purchased together.
query FrequentlyBought($channel: String!, $productId: ID!, $first: Int) {
  frequentlyBoughtTogether(channel: $channel, productId: $productId, first: $first) {
    edges {
      node {
        id
        name
        slug
        thumbnail { url }
      }
    }
  }
}

Get product recommendations based on cart contents.
query CartRecs($channel: String!, $variantIds: [ID!]!, $first: Int) {
  cartRecommendations(channel: $channel, variantIds: $variantIds, first: $first) {
    edges {
      node {
        id
        name
        slug
        thumbnail { url }
      }
    }
  }
}

Track a product view for recommendation engine.
mutation TrackView($channel: String!, $productId: ID!) {
  trackView(channel: $channel, productId: $productId) {
    success
  }
}

Get products the customer recently viewed.
query RecentlyViewed($channel: String!, $first: Int) {
  recentlyViewed(channel: $channel, first: $first) {
    edges {
      node {
        id
        name
        slug
        thumbnail { url }
      }
    }
  }
}