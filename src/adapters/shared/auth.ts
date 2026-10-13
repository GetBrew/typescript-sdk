// Shared by the auth adapters (`better-auth`, `next-auth`, `supabase`).
// Adapters import the SDK only as `@brew.new/sdk` (never a relative path
// into `src/`), so each subpath bundle reuses the root build and there is
// ONE `BrewApiError` class at runtime.
import type { BrewClient } from '@brew.new/sdk'

/** The starter-kit trigger keys each auth email fires by default. */
export const DEFAULT_AUTH_EMAIL_KEYS = {
  verifyEmail: 'auth.verify-email',
  magicLink: 'auth.magic-link',
  otp: 'auth.otp',
  passwordReset: 'auth.password-reset',
  invite: 'auth.invite',
  emailChange: 'auth.email-change',
  reauthentication: 'auth.reauthentication',
  securityNotice: 'auth.security-notice',
  welcome: 'lifecycle.welcome',
} as const

/** Which auth email a key sends. */
export type AuthEmailKind = keyof typeof DEFAULT_AUTH_EMAIL_KEYS

/**
 * Override the trigger key per email, for keys named other than the starter
 * kit's: `{ passwordReset: 'acme.reset' }`. Unset kinds keep the default.
 */
export type AuthEmailKeys = Partial<Readonly<Record<AuthEmailKind, string>>>

/**
 * The payload every auth email sends: the starter kit's shared contract.
 * `email` is the recipient; the rest is data the design reads as
 * `{{ trigger.* }}`. Fields an email does not use are left out.
 */
export type AuthEmailPayload = {
  readonly email: string
  /** Optional: the kit's designs fall back to the brand name. */
  readonly appName?: string
  readonly userName?: string
  readonly confirmationUrl?: string
  readonly otp?: string
  readonly expiresInMinutes?: number
  readonly newEmail?: string
  readonly inviterName?: string
  readonly organizationName?: string
  readonly noticeType?: string
  /** `auth.otp` only: what the code is for (`sign-in`, `email-verification`, …). */
  readonly purpose?: string
}

/** A client, or a function that returns one (called once, on first send). */
export type BrewClientSource = BrewClient | (() => BrewClient)

export function resolveKey(
  keys: AuthEmailKeys | undefined,
  kind: AuthEmailKind
): string {
  return keys?.[kind] ?? DEFAULT_AUTH_EMAIL_KEYS[kind]
}

/**
 * A getter for the client: a factory runs on the first send, not at import
 * time (so a missing env var fails that send, not the module), and its
 * client is reused after that.
 */
export function lazyClient(source: BrewClientSource): () => BrewClient {
  if (typeof source !== 'function') {
    return () => source
  }
  let client: BrewClient | undefined
  return () => {
    client ??= source()
    return client
  }
}

const OPTIONAL_PAYLOAD_FIELDS = [
  'appName',
  'userName',
  'confirmationUrl',
  'otp',
  'expiresInMinutes',
  'newEmail',
  'inviterName',
  'organizationName',
  'noticeType',
  'purpose',
] as const satisfies ReadonlyArray<Exclude<keyof AuthEmailPayload, 'email'>>

/**
 * The payload without the fields left `undefined` or empty, so the wire
 * carries only what the email uses and the body is the same on every retry
 * (an idempotent replay must repeat the exact body).
 */
export function compactPayload(
  payload: AuthEmailPayload
): { email: string } & Record<string, string | number> {
  const compact: { email: string } & Record<string, string | number> = {
    email: payload.email,
  }
  for (const field of OPTIONAL_PAYLOAD_FIELDS) {
    const value = payload[field]
    if (value !== undefined && value !== '') {
      compact[field] = value
    }
  }
  return compact
}

/** Lowercase hex SHA-256 of `text`, via WebCrypto (Node 20+, Deno, edge). */
export async function sha256Hex(text: string): Promise<string> {
  const digest = await globalThis.crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(text)
  )
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
}

/** The API's `Idempotency-Key` length limit. */
const IDEMPOTENCY_KEY_MAX_LENGTH = 100

/**
 * `${key}:${sha256(parts)}`: one idempotency key per email, derived from
 * the secret that makes it unique (a link token, or recipient + code for a
 * one-time code), so a retried callback never sends twice and the secret
 * itself never leaves the process. Every starter-kit key gets the full
 * 64-character digest; a custom key long enough to pass the API's
 * 100-character limit keeps a shorter prefix of it (at least 35 characters).
 */
export async function idempotencyKeyFor(
  key: string,
  parts: ReadonlyArray<string>
): Promise<string> {
  const digest = await sha256Hex(parts.join('\n'))
  return `${key}:${digest.slice(0, IDEMPOTENCY_KEY_MAX_LENGTH - key.length - 1)}`
}
