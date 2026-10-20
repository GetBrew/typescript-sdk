/**
 * `@brew.new/sdk/supabase`: a Supabase Auth Send Email Hook that sends
 * every auth email with Brew. Runs as a Supabase Edge Function (Deno) or
 * any `fetch`-style handler; WebCrypto only, no `node:` imports.
 *
 * ```ts
 * // supabase/functions/send-email/index.ts
 * import { createBrewClient } from 'npm:@brew.new/sdk'
 * import { createSupabaseSendEmailHook } from 'npm:@brew.new/sdk/supabase'
 *
 * Deno.serve(
 *   createSupabaseSendEmailHook({
 *     client: createBrewClient({ apiKey: Deno.env.get('BREW_API_KEY')! }),
 *     secret: Deno.env.get('SEND_EMAIL_HOOK_SECRET')!,
 *     appName: 'Acme',
 *   })
 * )
 * ```
 */
import { BrewApiError, BrewParseError, BrewTransportError } from '@brew.new/sdk'

import {
  type AuthEmailKeys,
  type AuthEmailKind,
  type AuthEmailPayload,
  type BrewClientSource,
  compactPayload,
  idempotencyKeyFor,
  lazyClient,
  reportSafely,
  resolveKey,
} from '../shared/auth'

import {
  decodeWebhookSecret,
  verifyStandardWebhook,
  WebhookVerificationError,
} from './standard-webhooks'

export type {
  AuthEmailKeys,
  AuthEmailKind,
  AuthEmailPayload,
  BrewClientSource,
} from '../shared/auth'
export { DEFAULT_AUTH_EMAIL_KEYS } from '../shared/auth'
export {
  decodeWebhookSecret,
  signStandardWebhook,
  STANDARD_WEBHOOK_TOLERANCE_SECONDS,
  verifyStandardWebhook,
  type VerifyStandardWebhookInput,
  type WebhookHeaders,
  WebhookVerificationError,
  type WebhookVerificationFailure,
} from './standard-webhooks'

/** The Send Email Hook body Supabase Auth posts (the fields this hook reads). */
export type SupabaseSendEmailHookPayload = {
  readonly user: {
    readonly id?: string
    readonly email?: string
    /** The address an email change moves to. */
    readonly new_email?: string
    readonly user_metadata?: Readonly<Record<string, unknown>>
  }
  readonly email_data: {
    readonly token?: string
    readonly token_hash?: string
    readonly redirect_to?: string
    readonly email_action_type: string
    /** Supabase Auth's API URL (`API_EXTERNAL_URL`), for example `https://<ref>.supabase.co`. */
    readonly site_url?: string
    readonly token_new?: string
    readonly token_hash_new?: string
    readonly old_email?: string
  }
}

/** What a confirmation link is built from. */
export type SupabaseConfirmationUrlInput = {
  readonly siteUrl: string
  readonly tokenHash: string
  /** The verify `type`: `signup`, `recovery`, `magiclink`, `invite` or `email_change`. */
  readonly type: string
  readonly redirectTo: string
}

/** What `planSupabaseSends` needs besides the hook body. */
export type PlanSupabaseSendsOptions = {
  readonly appName?: string
  readonly confirmationUrl?: (input: SupabaseConfirmationUrlInput) => string
  /**
   * Names this hook call, the same on each of Supabase's retries, and is
   * hashed into every send's idempotency key. Supabase signs each retry
   * with a NEW `webhook-id` but the same body, so
   * `createSupabaseSendEmailHook` passes `supabaseHookCallId` of the raw
   * body. Default: the body itself (`JSON.stringify(hook)`).
   */
  readonly callId?: string
}

/** One Brew send a hook call makes. */
export type PlannedSupabaseSend = {
  readonly kind: AuthEmailKind
  readonly payload: AuthEmailPayload
  /** Hashed into the idempotency key: the hook call's `callId`. */
  readonly unique: string
}

export type CreateSupabaseSendEmailHookOptions = {
  /** The Brew client, or a function returning one (called on first request). */
  readonly client: BrewClientSource
  /** The hook secret Supabase shows: `v1,whsec_<base64>`. */
  readonly secret: string
  /** Trigger keys per email when yours differ from the starter kit's. */
  readonly keys?: AuthEmailKeys
  /** Sent as `appName` on every email. Optional: the kit's designs fall back to the brand name. */
  readonly appName?: string
  /**
   * Build the link a user clicks. Default: Supabase's verify endpoint,
   * `${site_url}/auth/v1/verify?token=…&type=…&redirect_to=…`. Override it
   * to point at your own route (for example a server-side
   * `/auth/confirm?token_hash=…&type=…`).
   */
  readonly confirmationUrl?: (input: SupabaseConfirmationUrlInput) => string
  /**
   * Called with each failure the hook answers with an error. Default
   * `console.error`. A reporter that throws (or rejects) is logged, and
   * the hook still answers its error response.
   */
  readonly onError?: (error: unknown) => void
}

/**
 * A refusal Supabase shows the user: `http_code` becomes the auth request's
 * status (see `refuse`).
 */
class HookRequestError extends Error {
  readonly status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'HookRequestError'
    this.status = status
  }
}

const LINK_KIND_BY_ACTION: Readonly<Record<string, AuthEmailKind>> = {
  signup: 'verifyEmail',
  recovery: 'passwordReset',
  magiclink: 'magicLink',
  invite: 'invite',
}

const NOTIFICATION_SUFFIX = '_notification'

const LOG_LABEL = '[@brew.new/sdk/supabase]'

/**
 * Supabase's verify link, as its Send Email Hook guide builds it:
 * `${site_url}/auth/v1/verify?token=${token_hash}&type=${email_action_type}&redirect_to=${redirect_to}`.
 * `site_url` is the Auth API URL (`https://<ref>.supabase.co`); one that
 * already ends in `/auth/v1` is used as is.
 */
export function defaultSupabaseConfirmationUrl({
  siteUrl,
  tokenHash,
  type,
  redirectTo,
}: SupabaseConfirmationUrlInput): string {
  const base = siteUrl.replace(/\/+$/, '')
  const verify = base.endsWith('/auth/v1')
    ? `${base}/verify`
    : `${base}/auth/v1/verify`
  const query = new URLSearchParams({
    token: tokenHash,
    type,
    redirect_to: redirectTo,
  })
  return `${verify}?${query.toString()}`
}

/** What a planned email carries besides the shared fields. */
type EmailFields = { confirmationUrl?: string; otp?: string }

function text(value: unknown): string | undefined {
  return typeof value === 'string' && value !== '' ? value : undefined
}

function userNameOf(metadata: Readonly<Record<string, unknown>> | undefined): {
  userName?: string
} {
  const name = text(metadata?.['full_name']) ?? text(metadata?.['name'])
  return name === undefined ? {} : { userName: name }
}

function isHookPayload(value: unknown): value is SupabaseSendEmailHookPayload {
  if (typeof value !== 'object' || value === null) {
    return false
  }
  const { user, email_data: emailData } = value as Record<string, unknown>
  return (
    typeof user === 'object' &&
    user !== null &&
    typeof emailData === 'object' &&
    emailData !== null &&
    typeof (emailData as Record<string, unknown>)['email_action_type'] ===
      'string'
  )
}

const CALL_ID_CONTEXT = 'brew.send-email-hook.v1\n'

/**
 * The id of one hook call: hex HMAC-SHA256 of the raw body under the hook
 * secret. Supabase signs every retry of a call with a new `webhook-id` but
 * marshals the body once, so its retries share this id, and each new call
 * (a new token, or new user state for a notice) gets a new one. Keyed, so
 * an idempotency key reveals nothing about a six-digit code.
 */
export async function supabaseHookCallId({
  payload,
  secret,
}: {
  /** The raw request body, as verified. */
  readonly payload: string
  /** The hook secret: `v1,whsec_<base64>`. */
  readonly secret: string
}): Promise<string> {
  const key = await globalThis.crypto.subtle.importKey(
    'raw',
    decodeWebhookSecret(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const digest = await globalThis.crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(`${CALL_ID_CONTEXT}${payload}`)
  )
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
}

/**
 * The Brew sends one hook call makes: one per email, two for a secure email
 * change (the current and the new address each confirm). Link emails carry
 * the verify link and, when Supabase sent one, the six-digit code as `otp`
 * (an app that confirms with `verifyOtp` needs it; the kit shows both).
 * Pure: exported for a handler of your own.
 */
export function planSupabaseSends(
  hook: SupabaseSendEmailHookPayload,
  {
    appName,
    confirmationUrl = defaultSupabaseConfirmationUrl,
    callId = JSON.stringify(hook),
  }: PlanSupabaseSendsOptions = {}
): ReadonlyArray<PlannedSupabaseSend> {
  const { user, email_data: data } = hook
  const action = data.email_action_type
  const shared = {
    ...(appName === undefined ? {} : { appName }),
    ...userNameOf(user.user_metadata),
  }
  const requireAddress = (address: string | undefined): string => {
    const value = text(address)
    if (value === undefined) {
      throw new HookRequestError(400, `No recipient address for ${action}.`)
    }
    return value
  }
  const codeOf = (token: string | undefined): EmailFields => {
    const value = text(token)
    return value === undefined ? {} : { otp: value }
  }
  // A link email: the verify link from `tokenHash` and the code beside it.
  // With no link to build, the code alone (so the email still works).
  const linkEmail = (
    tokenHash: string | undefined,
    token: string | undefined
  ): EmailFields => {
    const hash = text(tokenHash)
    const siteUrl = text(data.site_url)
    if (hash === undefined || siteUrl === undefined) {
      return codeOf(token)
    }
    return {
      confirmationUrl: confirmationUrl({
        siteUrl,
        tokenHash: hash,
        type: action,
        redirectTo: data.redirect_to ?? '',
      }),
      ...codeOf(token),
    }
  }

  const linkKind = LINK_KIND_BY_ACTION[action]
  if (linkKind !== undefined) {
    return [
      {
        kind: linkKind,
        payload: {
          email: requireAddress(user.email),
          ...shared,
          ...linkEmail(data.token_hash, data.token),
        },
        unique: callId,
      },
    ]
  }

  if (action === 'email_change') {
    const newEmail = text(user.new_email)
    const newEmailField = newEmail === undefined ? {} : { newEmail }
    // Secure email change: both addresses confirm. Supabase's hash fields
    // are reversed for backward compatibility: the CURRENT address confirms
    // with `token` + `token_hash_new`, the NEW one with `token_new` +
    // `token_hash`.
    // The two sends share the call's id; their recipients tell their
    // idempotency keys apart.
    if (text(data.token_hash_new) !== undefined && text(user.email)) {
      return [
        {
          kind: 'emailChange',
          payload: {
            email: requireAddress(user.email),
            ...shared,
            ...newEmailField,
            ...linkEmail(data.token_hash_new, data.token),
          },
          unique: callId,
        },
        {
          kind: 'emailChange',
          payload: {
            email: requireAddress(newEmail),
            ...shared,
            ...newEmailField,
            ...linkEmail(data.token_hash, data.token_new),
          },
          unique: callId,
        },
      ]
    }
    // One confirmation, to the new address: `token_hash` with `token` (or
    // `token_new`, whichever Supabase filled).
    return [
      {
        kind: 'emailChange',
        payload: {
          email: requireAddress(newEmail ?? user.email),
          ...shared,
          ...newEmailField,
          ...linkEmail(data.token_hash, text(data.token) ?? data.token_new),
        },
        unique: callId,
      },
    ]
  }

  if (action === 'reauthentication' || action === 'email') {
    return [
      {
        kind: action === 'email' ? 'otp' : 'reauthentication',
        payload: {
          email: requireAddress(user.email),
          ...shared,
          ...codeOf(data.token),
        },
        unique: callId,
      },
    ]
  }

  if (action.endsWith(NOTIFICATION_SUFFIX)) {
    // Supabase sends the email-changed notice to the address the account
    // left; `newEmail` names the one it moved to.
    const isEmailChanged = action === 'email_changed_notification'
    const recipient = isEmailChanged
      ? (text(data.old_email) ?? user.email)
      : user.email
    const movedTo = isEmailChanged ? text(user.email) : undefined
    return [
      {
        kind: 'securityNotice',
        payload: {
          email: requireAddress(recipient),
          ...shared,
          ...(movedTo === undefined ? {} : { newEmail: movedTo }),
          noticeType: action.slice(0, -NOTIFICATION_SUFFIX.length),
        },
        unique: callId,
      },
    ]
  }

  throw new HookRequestError(400, `Unsupported email_action_type: ${action}.`)
}

function jsonResponse(
  status: number,
  body: unknown,
  headers: Readonly<Record<string, string>> = {}
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', ...headers },
  })
}

/**
 * A refusal. Supabase Auth reads a hook's body only on a `200`
 * (supabase/auth `internal/hooks/hookshttp.go`): `{ error: { http_code,
 * message } }` then fails the auth request with that status and message.
 * Any other status is a generic 500 and the message is dropped.
 */
function refuse(httpCode: number, message: string): Response {
  return jsonResponse(200, { error: { http_code: httpCode, message } })
}

/**
 * A failure an immediate retry may get past. Supabase retries a `503` at
 * once, with a new `webhook-id` and the same body, only when `Retry-After`
 * is set: at most 3 attempts inside its 5-second budget.
 */
function retryLater(message: string): Response {
  return jsonResponse(
    503,
    { error: { http_code: 503, message } },
    { 'retry-after': '1' }
  )
}

/**
 * Brew could not answer, or answered that an immediate retry may succeed.
 * A `429` is not: Supabase retries at once, with no wait, so a rate limit
 * or a daily sandbox cap would refuse every attempt (as Brew's hosted hook
 * does, it fails the auth request with its message instead).
 */
function isTransient(error: unknown): boolean {
  if (error instanceof BrewTransportError || error instanceof BrewParseError) {
    return true
  }
  return (
    error instanceof BrewApiError &&
    (error.status === 408 || error.status >= 500)
  )
}

/**
 * The `http_code` of a Brew refusal: its status, except an API key Brew
 * does not accept (`401` / `403`), which is this server's setup, not the
 * signing-in user's.
 */
function refusalCode(error: unknown): number {
  if (!(error instanceof BrewApiError)) {
    return 500
  }
  return error.status === 401 || error.status === 403 ? 500 : error.status
}

/**
 * Build the Send Email Hook handler: `(request) => Promise<Response>`, as
 * `Deno.serve` and other `fetch`-style servers take it. It verifies the
 * Standard Webhooks signature, maps `email_action_type` to a starter-kit
 * key, and sends with `brew.send`:
 *
 * | `email_action_type`  | Key                                   |
 * | -------------------- | ------------------------------------- |
 * | `signup`             | `auth.verify-email`                   |
 * | `recovery`           | `auth.password-reset`                 |
 * | `magiclink`          | `auth.magic-link`                     |
 * | `invite`             | `auth.invite`                         |
 * | `email_change`       | `auth.email-change` (twice when secure email change is on) |
 * | `reauthentication`   | `auth.reauthentication`               |
 * | `email`              | `auth.otp`                            |
 * | `*_notification`     | `auth.security-notice` + `noticeType` |
 *
 * Answers `200 {}` when every email was accepted. Every refusal is a `200`
 * with `{ error: { http_code, message } }`, the only error body Supabase
 * reads: `401` for a bad signature, `400` for a body it cannot use, Brew's
 * status when Brew refused (`500` for an API key it does not accept), `500`
 * for anything else. A timeout, a dropped connection or a Brew `5xx`
 * answers `503` with `Retry-After`, which Supabase retries at once.
 * Each send's idempotency key hashes `supabaseHookCallId` of the body, the
 * same on every retry, so a retried call never emails twice.
 */
export function createSupabaseSendEmailHook(
  options: CreateSupabaseSendEmailHookOptions
): (request: Request) => Promise<Response> {
  const onError =
    options.onError ??
    ((error: unknown) =>
      console.error(`${LOG_LABEL} send email hook failed`, error))
  const getClient = lazyClient(options.client)

  return async (request: Request): Promise<Response> => {
    if (request.method !== 'POST') {
      // Not a hook call: Supabase only ever POSTs.
      return jsonResponse(405, {
        error: { http_code: 405, message: 'The Send Email Hook takes POST.' },
      })
    }
    try {
      const body = await request.text()
      const verified = await verifyStandardWebhook({
        payload: body,
        headers: request.headers,
        secret: options.secret,
      })
      if (!isHookPayload(verified)) {
        throw new HookRequestError(400, 'Not a Send Email Hook payload.')
      }
      const plan = planSupabaseSends(verified, {
        ...(options.appName === undefined ? {} : { appName: options.appName }),
        ...(options.confirmationUrl === undefined
          ? {}
          : { confirmationUrl: options.confirmationUrl }),
        callId: await supabaseHookCallId({
          payload: body,
          secret: options.secret,
        }),
      })
      const client = getClient()
      await Promise.all(
        plan.map(async (send) => {
          const key = resolveKey(options.keys, send.kind)
          const idempotencyKey = await idempotencyKeyFor(key, [
            send.payload.email,
            verified.email_data.email_action_type,
            send.unique,
          ])
          await client.send(key, compactPayload(send.payload), {
            idempotencyKey,
          })
        })
      )
      return jsonResponse(200, {})
    } catch (error) {
      reportSafely(LOG_LABEL, () => onError(error))
      if (error instanceof WebhookVerificationError) {
        return refuse(
          error.reason === 'invalid_secret' ? 500 : 401,
          error.message
        )
      }
      if (error instanceof HookRequestError) {
        return refuse(error.status, error.message)
      }
      const message = `Brew could not send the email: ${
        error instanceof Error ? error.message : String(error)
      }`
      return isTransient(error)
        ? retryLater(message)
        : refuse(refusalCode(error), message)
    }
  }
}
