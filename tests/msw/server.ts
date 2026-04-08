import { setupServer } from 'msw/node'

import { handlers } from './handlers'

/**
 * Shared MSW server for every test in the suite.
 *
 * Lifecycle is wired in `tests/setup.ts` via vitest hooks:
 *   - beforeAll  -> server.listen({ onUnhandledRequest: 'error' })
 *   - afterEach  -> server.resetHandlers()
 *   - afterAll   -> server.close()
 *
 * Per-test overrides go through `server.use(...)` inside the test body.
 */
export const server = setupServer(...handlers)
