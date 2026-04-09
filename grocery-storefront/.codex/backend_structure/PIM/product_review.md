Product Reviews
3 endpoints

Get reviews for a product.
query ProductReviews($channel: String!, $productId: ID!, $first: Int) {
  productReviews(channel: $channel, productId: $productId, first: $first) {
    edges {
      node {
        id
        rating
        title
        content
        author
        createdAt
        isVerifiedPurchase
      }
    }
    totalCount
  }
}

Get aggregated review statistics for a product.
query ReviewSummary($channel: String!, $productId: ID!) {
  reviewSummary(channel: $channel, productId: $productId) {
    averageRating
    totalCount
    distribution {
      stars
      count
      percentage
    }
  }
}

Submit a new product review.
mutation CreateReview($input: ReviewInput!) {
  createReview(input: $input) {
    success
    review {
      id
      rating
      title
      content
    }
    errors { field message }
  }
}
{
  "input": {
    "channel": "my-salon",
    "productId": "product-123",
    "rating": 5,
    "title": "Great product!",
    "content": "Really happy with this purchase."
  }
}