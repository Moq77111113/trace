import { defineConfig } from 'vitest/config';
import { sveltekit } from '@sveltejs/kit/vite';
import { svelteTesting } from '@testing-library/svelte/vite';
import path from 'node:path';

export default defineConfig({
  plugins: [sveltekit(), svelteTesting()],
  resolve: {
    alias: {
      '~': path.resolve(import.meta.dirname),
    },
    // AWS SDK v3 ships dist-cjs as `main` and dist-es as `module` — and omits
    // an `exports` field. Without forcing `module` first, vitest pulls the CJS
    // build and trips on the SDK's internal `loadConfig` interop wrapper.
    mainFields: ['module', 'browser', 'jsnext:main', 'jsnext', 'main'],
    conditions: ['module', 'import', 'node', 'default'],
  },
  test: {
    environment: 'jsdom',
    setupFiles:  ['./tests/setup.ts'],
    include:     ['tests/**/*.test.ts'],
    coverage:    { provider: 'v8', reporter: ['text', 'html'] },

    // Per-file env overrides via `// @vitest-environment node` (used in tests
    // that exercise Node-only deps like the AWS SDK).
    environmentMatchGlobs: [
      ['tests/integration/storage/**', 'node'],
    ],

    // Forks pool: each test file runs in its own Node subprocess. Required for
    // the AWS SDK v3 (CJS/ESM interop fails under the default threads pool +
    // Vite bundler).
    pool: 'forks',
  },
});
