import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

/**
 * Vitest configuration.
 *
 * The project uses the `@/*` path alias (declared in `tsconfig.json`) in both
 * application code and tests. Without this alias Vitest cannot resolve those
 * imports, which previously made `tests/bank-integration.test.ts` and
 * `tests/transaction-tracker.test.ts` fail even though the modules exist.
 */
export default defineConfig({
  resolve: {
    alias: {
      '@shared': fileURLToPath(new URL('./shared', import.meta.url)),
      '@': fileURLToPath(new URL('./', import.meta.url)),
    },
  },
  // React Native defines this global; several modules read it at import time.
  define: {
    __DEV__: 'false',
  },
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx'],
  },
});
