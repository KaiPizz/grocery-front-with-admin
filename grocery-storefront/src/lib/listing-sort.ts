// "Polecane" ranks by the shop's curated order (products.display_order,
// exposed by the API as the RATING sort field), highest first. Plain module:
// the category page (a server component) sends the same sort as the client.
export const DEFAULT_SORT = 'recommended';
export const DEFAULT_SORT_BY = { field: 'RATING', direction: 'DESC' } as const;
