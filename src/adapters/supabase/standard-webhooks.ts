// Standard Webhooks (https://www.standardwebhooks.com) signature check, on
// WebCrypto only: runs on Node 20+, Deno (Supabase Edge Functions), Bun and
// edge runtimes. No `node:` imports.

/** Default tolerance for `webhook-timestamp` drift, both ways: 5 minutes. */
export const STANDARD_WEBHOOK_TOLERANCE_SECONDS = 5 * 60

/** Why a webhook was refused. */
export type WebhookVerificationFailure =
  | 'missing_headers'
  | 'invalid_timestamp'
  | 'timestamp_out_of_tolerance'
  | 'invalid_signature'
  | 'invalid_secret'
  | 'invalid_payload'

/** Thrown by `verifyStandardWebhook` when a request cannot be trusted. */
export class WebhookVerificationError extends Error {
  readonly reason: WebhookVerificationFailure

  constructor(reason: WebhookVerificationFailure, message: string) {
    super(message)
    this.name = 'WebhookVerificationError'
    this.reason = reason
  }
}

export type WebhookHeaders =
  | Headers
  | Readonly<Record<string, string | ReadonlyArray<string> | undefined>>

export type VerifyStandardWebhookInput = {
  /** The raw request body, exactly as received (`await request.text()`). */
  readonly payload: string
  /** `webhook-id`, `webhook-timestamp` and `webhook-signature` are read. */
  readonly headers: WebhookHeaders
  /**
   * The signing secret: `v1,whsec_<base64>` as Supabase shows it,
   * `whsec_<base64>`, or the bare base64 key.
   */
  readonly secret: string
  /** Allowed clock drift in seconds. Default 300. */
  readonly toleranceInSeconds?: number
  /** For tests: the current time in milliseconds. */
  readonly now?: number
}

function isHeaders(headers: WebhookHeaders): headers is Headers {
  return typeof Headers !== 'undefined' && headers instanceof Headers
}

function readHeader(headers: WebhookHeaders, name: string): string | undefined {
  if (isHeaders(headers)) {
    return headers.get(name) ?? undefined
  }
  const found = Object.keys(headers).find((key) => key.toLowerCase() === name)
  const value = found === undefined ? undefined : headers[found]
  return typeof value === 'string' ? value : value?.join(' ')
}

function decodeBase64(text: string): Uint8Array<ArrayBuffer> {
  const binary = atob(text)
  const bytes = new Uint8Array(binary.length)
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index)
  }
  return bytes
}

function encodeBase64(bytes: Uint8Array): string {
  let binary = ''
  for (const byte of bytes) {
    binary += String.fromCharCode(byte)
  }
  return btoa(binary)
}

/** `v1,whsec_abc` / `whsec_abc` / `abc` → the decoded HMAC key bytes. */
export function decodeWebhookSecret(secret: string): Uint8Array<ArrayBuffer> {
  const base64 = secret
    .trim()
    .replace(/^v1,/, '')
    .replace(/^whsec_/, '')
  try {
    const key = decodeBase64(base64)
    if (key.length === 0) {
      throw new RangeError('empty key')
    }
    return key
  } catch {
    throw new WebhookVerificationError(
      'invalid_secret',
      'The webhook secret is not a `v1,whsec_<base64>` (or `whsec_<base64>`) signing secret.'
    )
  }
}

/** Constant-time comparison of two equal-purpose strings. */
function timingSafeEqual(left: string, right: string): boolean {
  if (left.length !== right.length) {
    return false
  }
  let difference = 0
  for (let index = 0; index < left.length; index += 1) {
    difference |= left.charCodeAt(index) ^ right.charCodeAt(index)
  }
  return difference === 0
}

/**
 * Sign `${id}.${timestamp}.${payload}` the Standard Webhooks way and return
 * the `webhook-signature` header value (`v1,<base64>`). Exported for tests
 * and for signing requests to your own handler.
 */
export async function signStandardWebhook({
  id,
  timestamp,
  payload,
  secret,
}: {
  readonly id: string
  readonly timestamp: number
  readonly payload: string
  readonly secret: string
}): Promise<string> {
  const key = await globalThis.crypto.subtle.importKey(
    'raw',
    decodeWebhookSecret(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const signature = await globalThis.crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(`${id}.${timestamp}.${payload}`)
  )
  return `v1,${encodeBase64(new Uint8Array(signature))}`
}

/**
 * Verify a Standard Webhooks request (Supabase Auth hooks, among others)
 * and return its parsed JSON body. Throws `WebhookVerificationError` when a
 * header is missing, the timestamp is outside `toleranceInSeconds`, no
 * `v1` signature matches, or the body is not JSON.
 */
export async function verifyStandardWebhook(
  input: VerifyStandardWebhookInput
): Promise<unknown> {
  const id = readHeader(input.headers, 'webhook-id')
  const timestampHeader = readHeader(input.headers, 'webhook-timestamp')
  const signatureHeader = readHeader(input.headers, 'webhook-signature')
  if (!id || !timestampHeader || !signatureHeader) {
    throw new WebhookVerificationError(
      'missing_headers',
      'Missing webhook-id, webhook-timestamp or webhook-signature header.'
    )
  }
  const timestamp = Number(timestampHeader)
  if (!/^\d+$/.test(timestampHeader) || !Number.isSafeInteger(timestamp)) {
    throw new WebhookVerificationError(
      'invalid_timestamp',
      'webhook-timestamp is not a Unix timestamp in seconds.'
    )
  }
  const tolerance =
    input.toleranceInSeconds ?? STANDARD_WEBHOOK_TOLERANCE_SECONDS
  const nowSeconds = Math.floor((input.now ?? Date.now()) / 1000)
  if (Math.abs(nowSeconds - timestamp) > tolerance) {
    throw new WebhookVerificationError(
      'timestamp_out_of_tolerance',
      'webhook-timestamp is too old or too far in the future.'
    )
  }
  const expected = await signStandardWebhook({
    id,
    timestamp,
    payload: input.payload,
    secret: input.secret,
  })
  const isSigned = signatureHeader
    .split(' ')
    .filter((candidate) => candidate.startsWith('v1,'))
    .some((candidate) => timingSafeEqual(candidate, expected))
  if (!isSigned) {
    throw new WebhookVerificationError(
      'invalid_signature',
      'No webhook signature matches the secret.'
    )
  }
  try {
    return JSON.parse(input.payload) as unknown
  } catch {
    throw new WebhookVerificationError(
      'invalid_payload',
      'The webhook body is not JSON.'
    )
  }
}
