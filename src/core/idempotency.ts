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
 *   - Only POST carries an idempotency key. Every other method returns
 *     `undefined` — even if the caller passed one — because the Brew API
 *     contract only recognizes idempotency keys on POST, and sending one
 *     on, say, GET would be meaningless at best and confusing at worst.
 *   - On POST, a caller-provided key wins. If none is provided, we
 *     auto-generate one so the request is safe to retry without the
 *     caller having to think about it.
 */
export function resolveIdempotencyKey(
  input: ResolveIdempotencyKeyInput
): string | undefined {
  if (input.method !== 'POST') return undefined
  if (input.provided !== undefined) return input.provided
  return generateIdempotencyKey()
}
