interface GraphQLErrorPayload {
  message?: string | null;
  extensions?: {
    originalError?: {
      message?: string | string[] | null;
    } | null;
  } | null;
}

interface GraphQLPayload<TData> {
  data?: TData | null;
  errors?: GraphQLErrorPayload[] | null;
}

interface ServerGraphqlResult<TData> {
  data: TData | null;
  errorMessage: string | null;
}

const GRAPHQL_URL =
  process.env.NEXT_PUBLIC_GRAPHQL_URL || 'https://zira-ai.com/graphql/storefront';

function getGraphqlErrorMessage(errors: GraphQLErrorPayload[] | null | undefined) {
  const messages: string[] = [];

  for (const error of errors ?? []) {
    const originalMessage = error.extensions?.originalError?.message;

    if (Array.isArray(originalMessage)) {
      messages.push(...originalMessage.map(String).filter(Boolean));
      continue;
    }

    if (typeof originalMessage === 'string' && originalMessage.trim()) {
      messages.push(originalMessage);
      continue;
    }

    if (error.message?.trim()) {
      messages.push(error.message);
    }
  }

  return messages.length > 0 ? messages.join(' - ') : null;
}

export async function serverGraphqlRequest<TData>(
  query: string,
  variables: Record<string, unknown>,
): Promise<ServerGraphqlResult<TData>> {
  try {
    const response = await fetch(GRAPHQL_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
      body: JSON.stringify({ query, variables }),
    });

    const payload = await response.json() as GraphQLPayload<TData>;
    const errorMessage = getGraphqlErrorMessage(payload.errors);

    if (!response.ok) {
      return {
        data: payload.data ?? null,
        errorMessage: errorMessage ?? `GraphQL request failed with status ${response.status}.`,
      };
    }

    return {
      data: payload.data ?? null,
      errorMessage,
    };
  } catch (error) {
    return {
      data: null,
      errorMessage: error instanceof Error ? error.message : 'GraphQL request failed.',
    };
  }
}
