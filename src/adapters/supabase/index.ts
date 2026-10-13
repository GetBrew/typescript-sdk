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
import {
  type AuthEmailKeys,
  type AuthEmailKind,
  type AuthEmailPayload,
  type BrewClientSource,
  compactPayload,
  idempotencyKeyFor,
  lazyClient,
  resolveKey,
} from '../shared/auth'

import {
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

/**
 * What a link email carries. `'link'` (default) sends the confirmation link,
 * as Supabase's default templates do; `'code'` also sends the six-digit
 * code as `otp`, and the starter kit's designs then show the code instead
 * of the button (for apps that confirm with `verifyOtp`).
 */
export type SupabaseVerificationStyle = 'link' | 'code'

/** What `planSupabaseSends` needs besides the hook body. */
export type PlanSupabaseSendsOptions = {
  readonly appName?: string
  readonly verification?: SupabaseVerificationStyle
  readonly confirmationUrl?: (input: SupabaseConfirmationUrlInput) => string
  /**
   * The request's `webhook-id`, hashed into the idempotency key of a code
   * or a notice (they carry no token hash).
   */
  readonly webhookId?: string
}

/** One Brew send a hook call makes. */
export type PlannedSupabaseSend = {
  readonly kind: AuthEmailKind
  readonly payload: AuthEmailPayload
  /** Hashed into the idempotency key. */
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
   * Link emails (signup, recovery, magic link, invite, email change) send
   * the link (`'link'`, default) or the code too (`'code'`). Sign-in codes
   * (`email`) and reauthentication always send the code.
   */
  readonly verification?: SupabaseVerificationStyle
  /**
   * Build the link a user clicks. Default: Supabase's verify endpoint,
   * `${site_url}/auth/v1/verify?token=…&type=…&redirect_to=…`. Override it
   * to point at your own route (for example a server-side
   * `/auth/confirm?token_hash=…&type=…`).
   */
  readonly confirmationUrl?: (input: SupabaseConfirmationUrlInput) => string
  /** Called with each failure the hook answers with an error. Default `console.error`. */
  readonly onError?: (error: unknown) => void
}

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

/**
 * The Brew sends one hook call makes: one per email, two for a secure email
 * change (the current and the new address each confirm). Pure: exported
 * for a handler of your own.
 */
export function planSupabaseSends(
  hook: SupabaseSendEmailHookPayload,
  {
    appName,
    verification = 'link',
    confirmationUrl = defaultSupabaseConfirmationUrl,
    webhookId = '',
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
  const codeOf = (token: string | undefined): { otp?: string } => {
    const value = text(token)
    return value === undefined ? {} : { otp: value }
  }
  // A link email: the verify link from `tokenHash`, plus the code when the
  // hook sends codes or no link can be built (so the email still works).
  const linkOf = (
    tokenHash: string | undefined,
    token: string | undefined
  ): { confirmationUrl?: string; otp?: string } => {
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
      ...(verification === 'code' ? codeOf(token) : {}),
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
          ...linkOf(data.token_hash, data.token),
        },
        unique: text(data.token_hash) ?? text(data.token) ?? webhookId,
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
    if (text(data.token_hash_new) !== undefined && text(user.email)) {
      return [
        {
          kind: 'emailChange',
          payload: {
            email: requireAddress(user.email),
            ...shared,
            ...newEmailField,
            ...linkOf(data.token_hash_new, data.token),
          },
          unique: data.token_hash_new ?? '',
        },
        {
          kind: 'emailChange',
          payload: {
            email: requireAddress(newEmail),
            ...shared,
            ...newEmailField,
            ...linkOf(data.token_hash, data.token_new),
          },
          unique: text(data.token_hash) ?? text(data.token_new) ?? webhookId,
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
          ...linkOf(data.token_hash, text(data.token) ?? data.token_new),
        },
        unique: text(data.token_hash) ?? text(data.token) ?? webhookId,
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
        // A six-digit code repeats; the delivery id keeps two requests
        // that drew the same code apart.
        unique: `${data.token ?? ''}:${webhookId}`,
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
        unique: webhookId,
      },
    ]
  }

  throw new HookRequestError(400, `Unsupported email_action_type: ${action}.`)
}

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

function errorResponse(status: number, message: string): Response {
  return jsonResponse(status, { error: { http_code: status, message } })
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
 * Answers `200 {}` when every email was accepted, otherwise
 * `{ error: { http_code, message } }` with that status: 401 for a bad
 * signature, 400 for a body it cannot use, 500 when Brew refused or could
 * not be reached (Supabase then reports the send as failed). Idempotency
 * keys hash each email's token, so a retried hook never sends twice.
 */
export function createSupabaseSendEmailHook(
  options: CreateSupabaseSendEmailHookOptions
): (request: Request) => Promise<Response> {
  const onError =
    options.onError ??
    ((error: unknown) =>
      console.error('[@brew.new/sdk/supabase] send email hook failed', error))
  const getClient = lazyClient(options.client)

  return async (request: Request): Promise<Response> => {
    if (request.method !== 'POST') {
      return errorResponse(405, 'The Send Email Hook takes POST.')
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
        ...(options.verification === undefined
          ? {}
          : { verification: options.verification }),
        ...(options.confirmationUrl === undefined
          ? {}
          : { confirmationUrl: options.confirmationUrl }),
        webhookId: request.headers.get('webhook-id') ?? '',
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
      onError(error)
      if (error instanceof WebhookVerificationError) {
        return error.reason === 'invalid_secret'
          ? errorResponse(500, error.message)
          : errorResponse(401, error.message)
      }
      if (error instanceof HookRequestError) {
        return errorResponse(error.status, error.message)
      }
      const message = error instanceof Error ? error.message : String(error)
      return errorResponse(500, `Brew could not send the email: ${message}`)
    }
  }
}
