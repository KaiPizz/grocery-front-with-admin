Search
2 endpoints

Full-text product search with facets.
query SearchProducts($channel: String!, $query: String!, $first: Int, $filter: ProductFilterInput) {
  searchProducts(channel: $channel, query: $query, first: $first, filter: $filter) {
    edges {
      node {
        id
        name
        slug
        thumbnail { url }
        pricing { priceRange { start { gross { amount currency } } } }
      }
    }
    totalCount
    facets {
      name
      values { value count }
    }
  }
}

Quick autocomplete suggestions for the search bar.
query Autocomplete($channel: String!, $query: String!, $limit: Int) {
  autocomplete(channel: $channel, query: $query, limit: $limit) {
    products { id name slug thumbnail { url } }
    categories { id name slug }
    collections { id name slug }
  }
}