import type { BrewHttpMethod } from '../types'

/**
 * Generate a fresh RFC 4122 v4 UUID to use as an `Idempotency-Key`.
 *
 * Uses the global `crypto.randomUUID` available in Node 20+ (and in every
 * modern browser). The `engines` field in `package.json` already pins
 * Node 20 as the floor, so we can rely on this without a polyfill.
 */
export function generateIdempotencyKey(): string {
  return crypto.randomUUID()
}

export type ResolveIdempotencyKeyInput = {
  readonly method: BrewHttpMethod
  readonly provided: string | undefined
}

/**
 * Decide the final `Idempotency-Key` value for a request.
 *
 * Policy:
 *   - **POST**: a caller-provided key wins. If none is provided, we
 *     auto-generate one so the request is safe to retry without the
 *     caller having to think about it.
 *   - **PATCH**: only forward a caller-provided key. We do NOT
 *     auto-generate because PATCH is not retry-by-default in the
 *     standard SDK retry policy, and a unique auto-key per call would
 *     defeat the point of an idempotency key in the first place. The
 *     Brew server accepts `Idempotency-Key` on `PATCH /v1/emails/{id}`
 *     so callers who want safe replays can opt in.
 *   - **Every other method**: returns `undefined`. Sending an
 *     idempotency key on GET / DELETE is meaningless at best.
 */
export function resolveIdempotencyKey(
  input: ResolveIdempotencyKeyInput
): string | undefined {
  if (input.method === 'POST') {
    if (input.provided !== undefined) return input.provided
    return generateIdempotencyKey()
  }
  if (input.method === 'PATCH' && input.provided !== undefined) {
    return input.provided
  }
  return undefined
}
