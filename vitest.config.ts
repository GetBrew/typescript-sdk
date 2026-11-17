import { configDefaults, defineConfig } from 'vitest/config'

const packagingTests = [
  'tests/embed-packaging.test.ts',
  'tests/embed-runtime-sharing.test.tsx',
  'tests/source-install-packaging.test.ts',
]

export default defineConfig({
  test: {
    environment: 'node',
    globals: false,
    clearMocks: true,
    restoreMocks: true,
    projects: [
      {
        extends: true,
        test: {
          name: 'unit',
          include: ['tests/**/*.test.{ts,tsx}'],
          exclude: [...configDefaults.exclude, ...packagingTests],
          setupFiles: ['./tests/setup.ts'],
        },
      },
      {
        extends: true,
        test: {
          name: 'packaging',
          include: packagingTests,
          globalSetup: ['./tests/build-package.ts'],
        },
      },
    ],
  },
})
