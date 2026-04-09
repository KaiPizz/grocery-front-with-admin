'use client';

import { useMemo } from 'react';
import { Provider } from 'urql';
import { getUrqlClient } from './client';

export function GraphQLProvider({ children }: { children: React.ReactNode }) {
  const client = useMemo(() => getUrqlClient(), []);
  return <Provider value={client}>{children}</Provider>;
}
