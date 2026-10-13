import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['tests/**/*.test.{ts,tsx}'],
    environment: 'node',
    globals: false,
    clearMocks: true,
    restoreMocks: true,
    setupFiles: ['./tests/setup.ts'],
  },
})
