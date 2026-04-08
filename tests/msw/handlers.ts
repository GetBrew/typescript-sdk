import { type RequestHandler } from 'msw'

/**
 * Default MSW handlers loaded into the test server.
 *
 * We intentionally keep this list empty. The primary pattern is to install
 * per-test overrides via `server.use(...)` inside each test file — that
 * keeps assertions local to the test that cares about them and avoids
 * shared mutable state across the suite.
 *
 * Only add a handler here if it is a legitimate global default that every
 * test should inherit (e.g. a future health-check endpoint).
 */
export const handlers: Array<RequestHandler> = []
