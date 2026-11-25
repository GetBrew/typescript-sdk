import type { BrewHttpMethod } from '../types'
import { BrewInputError } from './errors'

function normalizeIdempotencyKey(key: string): string {
  const message =
    'idempotencyKey must be a nonblank HTTP header value of at most 100 characters.'
  let normalized: string
  try {
    normalized =
      new Headers({ 'Idempotency-Key': key }).get('Idempotency-Key')?.trim() ??
      ''
  } catch {
    throw new BrewInputError({ param: 'idempotencyKey', message })
  }
  if (normalized.length === 0 || normalized.length > 100) {
    throw new BrewInputError({ param: 'idempotencyKey', message })
  }
  return normalized
}

export function generateIdempotencyKey(): string {
  return crypto.randomUUID()
}

export type ResolveIdempotencyKeyInput = {
  readonly method: BrewHttpMethod
  readonly provided: string | undefined
}

export function resolveIdempotencyKey(
  input: ResolveIdempotencyKeyInput
): string | undefined {
  if (input.method === 'POST') {
    if (input.provided !== undefined)
      return normalizeIdempotencyKey(input.provided)
    return generateIdempotencyKey()
  }
  if (input.method === 'PATCH' && input.provided !== undefined) {
    return normalizeIdempotencyKey(input.provided)
  }
  return undefined
}
