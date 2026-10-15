import { defineConfig } from '@playwright/test'
export default defineConfig({
  testDir: './tests/browser',
  workers: 1,
  timeout: 90_000,
  expect: { timeout: 60_000 },
  use: {
    baseURL: process.env.DEMO_E2E_APP_ORIGIN ?? 'http://localhost:3501',
    trace: 'retain-on-failure',
    launchOptions: {
      args: [
        '--no-sandbox',
        '--disable-third-party-cookies',
        '--enable-unsafe-swiftshader',
        '--use-angle=swiftshader',
      ],
    },
  },
  webServer: process.env.DEMO_E2E_APP_ORIGIN ? undefined : {
    command: 'node --experimental-strip-types tests/browser-server.ts',
    url: 'http://localhost:3501',
    reuseExistingServer: false,
  },
})
