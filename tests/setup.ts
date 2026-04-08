import { afterAll, afterEach, beforeAll } from 'vitest'

import { server } from './msw/server'

/**
 * Global MSW lifecycle for every vitest file.
 *
 * `onUnhandledRequest: 'error'` is deliberate: it turns any accidental real
 * network call into a loud test failure instead of a silent pass. If a test
 * hits an endpoint it didn't set up, we want to know immediately.
 */
beforeAll(() => {
  server.listen({ onUnhandledRequest: 'error' })
})

afterEach(() => {
  server.resetHandlers()
})

afterAll(() => {
  server.close()
})
