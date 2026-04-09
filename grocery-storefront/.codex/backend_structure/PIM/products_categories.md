Products & Categories
6 endpoints

Fetch paginated list of products with filtering
Parameters
Name	Type	Description
channel	String	Salon slug (defaults to "default")
first	Int	Number of items to fetch
after	String	Cursor for pagination
filter	ProductFilterInput	Filter criteria

query Products($channel: String, $first: Int, $after: String, $filter: ProductFilterInput) {
  products(channel: $channel, first: $first, after: $after, filter: $filter) {
    edges {
      node {
        id
        name
        slug
        description
        thumbnail(size: 256, format: WEBP) {
          url
          alt
        }
        pricing {
          priceRange {
            start { gross { amount currency } }
            stop { gross { amount currency } }
          }
          onSale
        }
        category {
          id
          name
        }
        variants {
          id
          name
          sku
          quantityAvailable
        }
      }
    }
    pageInfo {
      hasNextPage
      endCursor
    }
    totalCount
  }
}
{
  "channel": "my-salon",
  "first": 20,
  "filter": {
    "isAvailable": true,
    "categories": ["cat-id-1"]
  }
}

Fetch a single product by slug or ID with full details.
Provide either slug or id to identify the product
Variant media returns variant-specific image, falling back to product thumbnail
query Product($channel: String!, $slug: String, $id: ID) {
  product(channel: $channel, slug: $slug, id: $id) {
    id
    name
    slug
    description
    seoTitle
    seoDescription
    thumbnail(size: 512) {
      url
      alt
    }
    media {
      id
      url
      alt
      type
      sortOrder
    }
    attributes {
      attribute { name slug }
      values { name value }
    }
    variants {
      id
      name
      sku
      quantityAvailable
      pricing {
        price { gross { amount currency } }
        priceUndiscounted { gross { amount currency } }
        compareAtPrice { gross { amount currency } }
        discountPercent
        onSale
      }
    }
  }
}

Fetch product categories with hierarchy support.
Parameters
Name	Type	Description
channel	String	Salon slug
first	Int	Number of categories
level	Int	Category tree level (0 = root)
query Categories($channel: String, $first: Int, $level: Int) {
  categories(channel: $channel, first: $first, level: $level) {
    edges {
      node {
        id
        name
        slug
        description
        backgroundImage { url }
        children(first: 10) {
          edges { node { id name slug } }
        }
        products(channel: $channel, first: 5) {
          totalCount
        }
      }
    }
  }
}

Available filter options for the ProductFilterInput.
This is an input type, not a standalone query
input ProductFilterInput {
  search: String              # Text search
  categories: [ID!]           # Category IDs
  collections: [ID!]          # Collection IDs
  isAvailable: Boolean        # In stock only
  isPublished: Boolean        # Published only
  stockAvailability: StockAvailability  # IN_STOCK | OUT_OF_STOCK
  tags: [String!]             # Filter by tags (AND logic)
  brands: [String!]           # Filter by brand names
  price: PriceRangeInput      # Price range { gte, lte }
  attributes: [AttributeFilterInput!]  # { slug, values }
  storageZone: StorageZoneEnum  # Food: AMBIENT | CHILLED | FROZEN
  dietaryTags: [String!]      # Food: dietary tags
  excludeAllergens: [String!] # Food: allergens to exclude
  isPreOrderable: Boolean     # Pre-orderable only
}

Subscribe to receive email notification when a variant is back in stock.
Parameters
Name	Type	Description
channelrequired	String!	Salon slug
variantIdrequired	ID!	Product variant ID
emailrequired	String!	Email to notify
mutation BackInStockSubscribe($channel: String!, $variantId: ID!, $email: String!) {
  productBackInStockSubscribe(channel: $channel, variantId: $variantId, email: $email) {
    success
    message
  }
}

Generate SEO sitemap entries for products, categories, or collections.
Parameters
Name	Type	Description
channelrequired	String!	Salon slug
type	String	products (default), categories, collections
query Sitemap($channel: String!, $type: String) {
  sitemap(channel: $channel, type: $type) {
    url
    lastModified
    changeFrequency
    priority
  }
}