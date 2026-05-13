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
  },
  test: {
    environment: 'jsdom',
    setupFiles:  ['./tests/setup.ts'],
    include:     ['tests/**/*.test.ts'],
    coverage:    { provider: 'v8', reporter: ['text', 'html'] },
  },
});
