import { fileURLToPath } from 'node:url'

import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    // Adapters import the SDK by its package name (see tsconfig `paths`).
    // Exact match only: `@brew.new/sdk/resend` must not become
    // `src/index.ts/resend`.
    alias: [
      {
        find: /^@brew\.new\/sdk$/,
        replacement: fileURLToPath(new URL('./src/index.ts', import.meta.url)),
      },
    ],
  },
  test: {
    include: ['tests/**/*.test.{ts,tsx}'],
    environment: 'node',
    globals: false,
    clearMocks: true,
    restoreMocks: true,
    globalSetup: ['./tests/build-package.ts'],
    setupFiles: ['./tests/setup.ts'],
  },
})
