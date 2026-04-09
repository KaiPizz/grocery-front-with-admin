Collections
3 endpoints

Fetch paginated list of product collections.
query Collections($channel: String!, $first: Int, $after: String) {
  collections(channel: $channel, first: $first, after: $after) {
    edges {
      node {
        id
        name
        slug
        description
        seoTitle
        seoDescription
        backgroundImage {
          url
          alt
        }
      }
      cursor
    }
    pageInfo {
      hasNextPage
      endCursor
    }
    totalCount
  }
}

Fetch a single collection with products.
query CollectionWithProducts($channel: String!, $slug: String!) {
  collection(channel: $channel, slug: $slug) {
    id
    name
    slug
    description
    backgroundImage { url alt }
    metadata { key value }
    products(first: 20, channel: $channel) {
      edges {
        node {
          id
          name
          slug
          pricing { priceRange { start { gross { amount currency } } } }
        }
      }
      pageInfo { hasNextPage endCursor }
      totalCount
    }
  }
}

Get time-limited collections currently active.
query SeasonalCollections($channel: String!, $first: Int) {
  seasonalCollections(channel: $channel, first: $first) {
    edges {
      node {
        id
        name
        slug
        description
        startDate
        endDate
        collectionType
        backgroundImage { url alt }
      }
    }
    totalCount
  }
}