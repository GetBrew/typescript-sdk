/**
 * `@brew.new/sdk/better-auth`: Better Auth's email callbacks, sent by Brew.
 *
 * ```ts
 * import { betterAuth } from 'better-auth'
 * import { emailOTP, magicLink } from 'better-auth/plugins'
 * import { createBrewClient } from '@brew.new/sdk'
 * import { brewAuthEmails } from '@brew.new/sdk/better-auth'
 *
 * const emails = brewAuthEmails({
 *   client: () => createBrewClient({ apiKey: process.env.BREW_API_KEY! }),
 *   appName: 'Acme',
 * })
 *
 * export const auth = betterAuth({
 *   emailVerification: { sendVerificationEmail: emails.sendVerificationEmail },
 *   emailAndPassword: { enabled: true, sendResetPassword: emails.sendResetPassword },
 *   user: {
 *     changeEmail: {
 *       enabled: true,
 *       sendChangeEmailConfirmation: emails.sendChangeEmailConfirmation,
 *     },
 *   },
 *   plugins: [
 *     magicLink({ sendMagicLink: emails.sendMagicLink }),
 *     emailOTP({ sendVerificationOTP: emails.sendVerificationOTP }),
 *   ],
 *   databaseHooks: { user: { create: { after: emails.onUserCreated } } },
 * })
 * ```
 *
 * Structural types only: no dependency on `better-auth`.
 */
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

export type {
  AuthEmailKeys,
  AuthEmailKind,
  AuthEmailPayload,
  BrewClientSource,
} from '../shared/auth'
export { DEFAULT_AUTH_EMAIL_KEYS } from '../shared/auth'

/** The user fields the callbacks read (Better Auth's `User` has them all). */
export type BetterAuthUserLike = {
  readonly id?: string
  readonly email: string
  readonly name?: string | null
}

/** What failed: the key it sent and the callback that sent it. */
export type BrewAuthEmailErrorContext = {
  readonly key: string
  readonly kind: AuthEmailKind
}

export type BrewAuthEmailsOptions = {
  /** The Brew client, or a function returning one (called on first send). */
  readonly client: BrewClientSource
  /** Trigger keys per email when yours differ from the starter kit's. */
  readonly keys?: AuthEmailKeys
  /** Sent as `appName` on every email. Optional: the kit's designs fall back to the brand name. */
  readonly appName?: string
  /**
   * Run each send in the background: the callback hands the send to
   * `waitUntil` (Vercel's `waitUntil`, Cloudflare's `ctx.waitUntil`, …) and
   * returns at once, so the response does not wait for Brew. Without it,
   * each callback returns the send itself and Better Auth awaits it (or
   * hands it to its own `advanced.backgroundTasks.handler`, when set).
   */
  readonly waitUntil?: (promise: Promise<unknown>) => void
  /**
   * Called with every failed send. Default: `console.error` for a send
   * nothing awaits (a `waitUntil` send, and `onUserCreated`); otherwise
   * nothing, because the rejection reaches Better Auth, which logs it. A
   * reporter that throws (or rejects) is logged and changes nothing: the
   * send still rejects with its own error, or still resolves.
   */
  readonly onError?: (
    error: unknown,
    context: BrewAuthEmailErrorContext
  ) => void
}

/** `{ user, url, token }`: what Better Auth passes its link callbacks. */
export type BetterAuthLinkEmailData = {
  readonly user: BetterAuthUserLike
  readonly url: string
  readonly token: string
}

export type BrewAuthEmails = {
  /** `emailVerification.sendVerificationEmail` → `auth.verify-email`. */
  readonly sendVerificationEmail: (
    data: BetterAuthLinkEmailData,
    request?: unknown
  ) => Promise<void>
  /** `emailAndPassword.sendResetPassword` → `auth.password-reset`. */
  readonly sendResetPassword: (
    data: BetterAuthLinkEmailData,
    request?: unknown
  ) => Promise<void>
  /**
   * `user.changeEmail.sendChangeEmailConfirmation` → `auth.email-change`,
   * sent to the CURRENT address (Better Auth asks it to approve the change)
   * with `newEmail` set.
   */
  readonly sendChangeEmailConfirmation: (
    data: BetterAuthLinkEmailData & { readonly newEmail: string },
    request?: unknown
  ) => Promise<void>
  /** `magicLink({ sendMagicLink })` → `auth.magic-link`. */
  readonly sendMagicLink: (
    data: {
      readonly email: string
      readonly url: string
      readonly token: string
    },
    context?: unknown
  ) => Promise<void>
  /**
   * `emailOTP({ sendVerificationOTP })` → `auth.otp` with `purpose: type`;
   * `type: 'change-email'` (the code goes to the new address) →
   * `auth.email-change` with `newEmail`.
   */
  readonly sendVerificationOTP: (
    data: {
      readonly email: string
      readonly otp: string
      readonly type: string
    },
    context?: unknown
  ) => Promise<void>
  /**
   * `databaseHooks.user.create.after` → `lifecycle.welcome`, once per user.
   * Never rejects: a failed welcome must not fail the sign-up.
   */
  readonly onUserCreated: (
    user: BetterAuthUserLike,
    context?: unknown
  ) => Promise<void>
}

type Dispatch = {
  readonly kind: AuthEmailKind
  readonly payload: Omit<AuthEmailPayload, 'appName'>
  /** Hashed into the idempotency key: the secret that makes the email unique. */
  readonly unique: ReadonlyArray<string>
  /** `false` for an email whose failure must never reach Better Auth. */
  readonly shouldReject: boolean
}

const LOG_LABEL = '[@brew.new/sdk/better-auth]'

function consoleError(error: unknown, context: BrewAuthEmailErrorContext) {
  console.error(`${LOG_LABEL} ${context.key} failed`, error)
}

/**
 * Build Better Auth's email callbacks on top of `brew.send`.
 *
 * Every send carries an idempotency key derived from its secret,
 * `${key}:${sha256(token)}` (recipient and code for a one-time code, the
 * user id for the welcome), so a retried callback never emails twice.
 */
export function brewAuthEmails(options: BrewAuthEmailsOptions): BrewAuthEmails {
  const getClient = lazyClient(options.client)

  // Without `waitUntil`, the callback returns the send itself: Better Auth
  // awaits it (a failure rejects, and Better Auth reports it) or runs it as
  // its own background task. With `waitUntil`, the send runs past the
  // response and the callback resolves at once.
  const dispatch = ({
    kind,
    payload,
    unique,
    shouldReject,
  }: Dispatch): Promise<void> => {
    const key = resolveKey(options.keys, kind)
    const sending = (async () => {
      const idempotencyKey = await idempotencyKeyFor(key, unique)
      await getClient().send(
        key,
        compactPayload({
          ...payload,
          ...(options.appName === undefined
            ? {}
            : { appName: options.appName }),
        }),
        { idempotencyKey }
      )
    })()
    const context = { key, kind }
    const report = (error: unknown) => {
      const onError = options.onError ?? consoleError
      reportSafely(LOG_LABEL, () => onError(error, context))
    }
    if (options.waitUntil) {
      options.waitUntil(sending.catch(report))
      return Promise.resolve()
    }
    if (!shouldReject) {
      return sending.catch(report)
    }
    return sending.catch((error: unknown) => {
      const { onError } = options
      if (onError !== undefined) {
        reportSafely(LOG_LABEL, () => onError(error, context))
      }
      throw error
    })
  }

  const userName = (user: BetterAuthUserLike) =>
    user.name === null || user.name === undefined ? {} : { userName: user.name }

  return {
    sendVerificationEmail: ({ user, url, token }) =>
      dispatch({
        kind: 'verifyEmail',
        payload: { email: user.email, ...userName(user), confirmationUrl: url },
        unique: [token],
        shouldReject: true,
      }),
    sendResetPassword: ({ user, url, token }) =>
      dispatch({
        kind: 'passwordReset',
        payload: { email: user.email, ...userName(user), confirmationUrl: url },
        unique: [token],
        shouldReject: true,
      }),
    sendChangeEmailConfirmation: ({ user, newEmail, url, token }) =>
      dispatch({
        kind: 'emailChange',
        payload: {
          email: user.email,
          ...userName(user),
          newEmail,
          confirmationUrl: url,
        },
        unique: [token],
        shouldReject: true,
      }),
    sendMagicLink: ({ email, url, token }) =>
      dispatch({
        kind: 'magicLink',
        payload: { email, confirmationUrl: url },
        unique: [token],
        shouldReject: true,
      }),
    // A code is short and repeats across users, so the key also hashes the
    // recipient and purpose: two users' equal codes must not replay.
    sendVerificationOTP: ({ email, otp, type }) =>
      dispatch(
        type === 'change-email'
          ? {
              kind: 'emailChange',
              payload: { email, newEmail: email, otp },
              unique: [email, type, otp],
              shouldReject: true,
            }
          : {
              kind: 'otp',
              payload: { email, otp, purpose: type },
              unique: [email, type, otp],
              shouldReject: true,
            }
      ),
    onUserCreated: (user) =>
      dispatch({
        kind: 'welcome',
        payload: { email: user.email, ...userName(user) },
        unique: [user.id ?? user.email],
        shouldReject: false,
      }),
  }
}
