interface RefreshFailurePayload {
  errorCode?: string | null;
}

export const REFRESH_ALREADY_ROTATED = 'REFRESH_ALREADY_ROTATED';
export const DEFINITIVE_REFRESH_FAILURES = new Set([
  'INVALID_REFRESH_TOKEN',
  'REFRESH_TOKEN_REUSE',
]);

export function isRefreshAlreadyRotated(payload: RefreshFailurePayload | null): boolean {
  return payload?.errorCode === REFRESH_ALREADY_ROTATED;
}

export function isDefinitiveRefreshFailure(payload: RefreshFailurePayload | null): boolean {
  return DEFINITIVE_REFRESH_FAILURES.has(payload?.errorCode ?? '');
}
