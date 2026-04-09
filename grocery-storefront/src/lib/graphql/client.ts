import { createClient, cacheExchange, fetchExchange } from 'urql';
import { getAuthToken } from '@/lib/auth';

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
    exchanges: [cacheExchange, fetchExchange],
    fetchOptions: () => {
      const token = getAuthToken();
      const headers: Record<string, string> = {};
      if (token) headers.Authorization = `Bearer ${token}`;
      return { headers, method: 'POST' };
    },
  });

  return clientInstance;
}
