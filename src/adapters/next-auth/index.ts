/**
 * `@brew.new/sdk/next-auth` (also `@brew.new/sdk/auth-js`): an Auth.js email
 * provider that sends the sign-in link with Brew.
 *
 * ```ts
 * import NextAuth from 'next-auth'
 * import { createBrewClient } from '@brew.new/sdk'
 * import { BrewEmail } from '@brew.new/sdk/next-auth'
 *
 * export const { handlers, auth, signIn } = NextAuth({
 *   adapter, // email sign-in needs a database adapter
 *   providers: [
 *     BrewEmail({
 *       client: () => createBrewClient({ apiKey: process.env.BREW_API_KEY! }),
 *       appName: 'Acme',
 *     }),
 *   ],
 * })
 * // signIn('brew', { email })
 * ```
 *
 * Structural types only: no dependency on `next-auth` or `@auth/core`. On
 * next-auth v4, pass `id: 'email'` (v4's types accept only that id).
 */
import {
  type BrewClientSource,
  compactPayload,
  idempotencyKeyFor,
  lazyClient,
} from '../shared/auth'

export type { BrewClientSource } from '../shared/auth'

/** Auth.js's default sign-in link lifetime: 24 hours. */
export const BREW_EMAIL_DEFAULT_MAX_AGE_SECONDS = 24 * 60 * 60

export type BrewEmailOptions = {
  /** The Brew client, or a function returning one (called on first send). */
  readonly client: BrewClientSource
  /** Trigger key to send. Default `auth.magic-link`. */
  readonly key?: string
  /** Provider id, the first argument to `signIn()`. Default `'brew'`; use `'email'` on next-auth v4. */
  readonly id?: string
  /** Sent as `appName`. Optional: the kit's designs fall back to the brand name. */
  readonly appName?: string
  /** Link lifetime in seconds. Default 24 hours. */
  readonly maxAge?: number
}

/**
 * The fields of Auth.js's `sendVerificationRequest` params (v4 and v5) this
 * provider reads; Auth.js also passes `provider`, `theme` and, on v5,
 * `request`.
 */
export type BrewEmailVerificationRequest = {
  readonly identifier: string
  readonly url: string
  readonly expires?: Date
  readonly token?: string
  readonly provider?: unknown
}

/**
 * An Auth.js email provider. `server`, `from` and `options` are inert: they
 * exist because next-auth v4's `EmailConfig` requires them; Brew's
 * automation holds the sender.
 */
export type BrewEmailProvider<TId extends string = 'brew'> = {
  readonly id: TId
  readonly type: 'email'
  readonly name: 'Email'
  readonly maxAge: number
  readonly server: string
  readonly from: string
  readonly options: Record<string, never>
  readonly sendVerificationRequest: (
    params: BrewEmailVerificationRequest
  ) => Promise<void>
}

function minutesUntil(expires: Date | undefined, maxAge: number): number {
  const seconds =
    expires instanceof Date ? (expires.getTime() - Date.now()) / 1000 : maxAge
  return Math.max(1, Math.round(seconds / 60))
}

/**
 * `sendVerificationRequest` awaits `brew.send(key, { email, confirmationUrl,
 * appName, expiresInMinutes })` and lets a failure throw, so Auth.js shows
 * its sign-in error page instead of "check your email". The idempotency key
 * hashes the token: a retried request never sends a second link.
 */
export function BrewEmail(
  options: BrewEmailOptions & { readonly id?: undefined }
): BrewEmailProvider<'brew'>
export function BrewEmail<TId extends string>(
  options: BrewEmailOptions & { readonly id: TId }
): BrewEmailProvider<TId>
export function BrewEmail(
  options: BrewEmailOptions
): BrewEmailProvider<string> {
  const key = options.key ?? 'auth.magic-link'
  const maxAge = options.maxAge ?? BREW_EMAIL_DEFAULT_MAX_AGE_SECONDS
  const getClient = lazyClient(options.client)
  return {
    id: options.id ?? 'brew',
    type: 'email',
    name: 'Email',
    maxAge,
    server: '',
    from: '',
    options: {},
    async sendVerificationRequest({ identifier, url, expires, token }) {
      const idempotencyKey = await idempotencyKeyFor(key, [token ?? url])
      await getClient().send(
        key,
        compactPayload({
          email: identifier,
          confirmationUrl: url,
          expiresInMinutes: minutesUntil(expires, maxAge),
          ...(options.appName === undefined
            ? {}
            : { appName: options.appName }),
        }),
        { idempotencyKey }
      )
    },
  }
}
