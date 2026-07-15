import { createClient, cacheExchange, fetchExchange } from 'urql';

function getGraphqlUrl(): string {
  if (typeof window !== 'undefined') {
    // Client-side: use the local proxy to avoid CORS
    return '/api/graphql';
  }
  // Server-side: call the remote URL directly (no CORS issue)
  return process.env.NEXT_PUBLIC_GRAPHQL_URL || 'http://localhost:3003/graphql/storefront';
}

let clientInstance: ReturnType<typeof createClient> | null = null;

export function getUrqlClient() {
  if (clientInstance) return clientInstance;

  clientInstance = createClient({
    url: getGraphqlUrl(),
    // The same-origin BFF deliberately exposes POST only. urql v5 otherwise
    // converts short queries to GET even when fetchOptions specifies POST.
    preferGetMethod: false,
    exchanges: [cacheExchange, fetchExchange],
    fetchOptions: () => ({
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
    }),
  });

  return clientInstance;
}
