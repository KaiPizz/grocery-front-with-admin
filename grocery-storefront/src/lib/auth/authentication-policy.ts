export interface AuthenticationFailureDetails {
  status: number;
  error?: string | null;
  errorCode?: string | null;
  errorStatus?: number | null;
}

export interface GraphqlAuthenticationError {
  message?: string | null;
  extensions?: {
    code?: string | null;
    originalError?: {
      message?: string | string[] | null;
      statusCode?: number | null;
    } | null;
  } | null;
}

export function isDefinitiveAuthenticationFailure(
  result: AuthenticationFailureDetails,
): boolean {
  if (result.status === 401 || result.status === 403) return true;
  if (result.errorStatus === 401 || result.errorStatus === 403) return true;

  const code = result.errorCode?.toUpperCase();
  if (code === 'UNAUTHENTICATED' || code === 'UNAUTHORIZED') return true;

  const message = result.error?.toLowerCase() ?? '';
  return message.includes('authentication required')
    || message.includes('unauthenticated')
    || message.includes('unauthorized')
    || message.includes('invalid token')
    || message.includes('expired token')
    || message.includes('tokenu autoryzacji')
    || message.includes('nieprawidłowy lub wygasły token');
}

export function isGraphqlAuthenticationFailure(
  status: number,
  errors: GraphqlAuthenticationError[] | null | undefined,
): boolean {
  if (status === 401 || status === 403) return true;

  return (errors ?? []).some((error) => {
    const originalMessage = error.extensions?.originalError?.message;
    const message = Array.isArray(originalMessage)
      ? originalMessage.map(String).join(' ')
      : typeof originalMessage === 'string'
        ? originalMessage
        : error.message;
    return isDefinitiveAuthenticationFailure({
      status,
      errorCode: error.extensions?.code,
      errorStatus: error.extensions?.originalError?.statusCode,
      error: message,
    });
  });
}
