import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';

export default defineConfig([
  ...nextVitals,
  {
    rules: {
      // Existing data-loading effects intentionally synchronize local state
      // with storage and HTTP resources.
      'react-hooks/set-state-in-effect': 'off',
      // These React Compiler rules were not part of the previous Next 14 lint
      // gate. Keep the migration behavior-neutral; enable them separately with
      // focused component refactors and regression tests.
      'react-hooks/immutability': 'off',
      'react-hooks/purity': 'off',
      'react-hooks/refs': 'off',
    },
  },
  globalIgnores([
    '.next/**',
    'out/**',
    'build/**',
    'next-env.d.ts',
  ]),
]);
