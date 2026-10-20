# `@brew.new/sdk/supabase`

A [Supabase Auth Send Email Hook](https://supabase.com/docs/guides/auth/auth-hooks/send-email-hook)
that sends every auth email with [`brew.send`](../send.md). It runs as a
Supabase Edge Function (Deno) or any `fetch`-style handler: WebCrypto
only, no `node:` imports.

```ts
// supabase/functions/send-email/index.ts
import { createBrewClient } from 'npm:@brew.new/sdk'
import { createSupabaseSendEmailHook } from 'npm:@brew.new/sdk/supabase'

Deno.serve(
  createSupabaseSendEmailHook({
    client: createBrewClient({ apiKey: Deno.env.get('BREW_API_KEY')! }),
    secret: Deno.env.get('SEND_EMAIL_HOOK_SECRET')!, // v1,whsec_…
    appName: 'Acme', // optional
  })
)
```

Deploy it with `supabase functions deploy send-email --no-verify-jwt`,
then point **Authentication > Hooks > Send Email** at the function's URL
and store the secret Supabase shows as `SEND_EMAIL_HOOK_SECRET`.

## What it sends

The hook verifies the Standard Webhooks signature, maps
`email_action_type` to a starter-kit key and sends:

| `email_action_type` | Key                     | Recipient and payload                                                 |
| ------------------- | ----------------------- | --------------------------------------------------------------------- |
| `signup`            | `auth.verify-email`     | `user.email`: `confirmationUrl`, `otp`                                |
| `recovery`          | `auth.password-reset`   | `user.email`: `confirmationUrl`, `otp`                                |
| `magiclink`         | `auth.magic-link`       | `user.email`: `confirmationUrl`, `otp`                                |
| `invite`            | `auth.invite`           | `user.email`: `confirmationUrl`, `otp`                                |
| `email_change`      | `auth.email-change`     | see below                                                             |
| `reauthentication`  | `auth.reauthentication` | `user.email`: `otp`                                                   |
| `email`             | `auth.otp`              | `user.email`: `otp`                                                   |
| `*_notification`    | `auth.security-notice`  | `user.email`: `noticeType` (`password_changed`, `identity_linked`, …) |

Every payload carries `email` (the recipient), `userName` (from
`user_metadata.full_name` or `name`) and `appName` when set.
`email_changed_notification` goes to `old_email`, the address the account
left, with `newEmail` set to the one it moved to.

**Email change.** With Secure Email Change on, Supabase asks both
addresses to confirm, so the hook makes two sends: the current address
(`token` with `token_hash_new`) and the new one (`token_new` with
`token_hash`). Supabase's hash field names are reversed for backward
compatibility; the hook pairs them for you. With it off, one send goes to
the new address. Both carry `newEmail`.

## The confirmation link

`confirmationUrl` is Supabase's verify endpoint, built the way its Send
Email Hook guide builds it:

```
${site_url}/auth/v1/verify?token=${token_hash}&type=${email_action_type}&redirect_to=${redirect_to}
```

`site_url` in the hook body is the Auth API URL
(`https://<ref>.supabase.co`). To send users to your own route instead
(for example a server-side `/auth/confirm?token_hash=…&type=…` that calls
`verifyOtp`), pass a builder:

```ts
createSupabaseSendEmailHook({
  client,
  secret,
  confirmationUrl: ({ tokenHash, type, redirectTo }) =>
    `https://app.example.com/auth/confirm?token_hash=${tokenHash}&type=${type}&next=${encodeURIComponent(redirectTo)}`,
})
```

**Codes in link emails.** Link emails carry the link and, when Supabase
sent one, the six-digit code as `otp`, as Brew's hosted Supabase hook does:
an app that confirms with `verifyOtp({ email, token, type })` needs the
code, and the starter kit's designs show both. An email with no token hash
to build a link from carries the code alone.

## Answers

Supabase Auth reads a hook's body only when it answers `200`; any other
status becomes a generic 500 and the message is lost. So every refusal is a
`200` whose `{ error: { http_code, message } }` fails the auth request with
that status and message, and only a failure a retry may get past answers
`503` with `Retry-After`, which Supabase retries at once (at most 3
attempts in 5 seconds).

| Outcome                                               | Status | Body                                        |
| ----------------------------------------------------- | ------ | ------------------------------------------- |
| Every email accepted                                  | `200`  | `{}`                                        |
| Bad or missing signature, stale time                  | `200`  | `{ error: { http_code: 401, message } }`    |
| A body it cannot use, unknown action                  | `200`  | `{ error: { http_code: 400, message } }`    |
| Brew refused (`422`, `404`, a daily sandbox cap …)    | `200`  | `{ error: { http_code: status, message } }` |
| Brew refused the API key (`401` / `403`)              | `200`  | `{ error: { http_code: 500, message } }`    |
| A secret that is not `v1,whsec_…`, anything else      | `200`  | `{ error: { http_code: 500, message } }`    |
| Timeout, dropped connection, Brew `5xx` or rate limit | `503`  | `{ error: { http_code: 503, message } }`    |
| Not a `POST` (not a hook call)                        | `405`  | `{ error: { http_code: 405, message } }`    |

Supabase signs each retry with a new `webhook-id` but the same body, so
every send's idempotency key hashes the call's id instead:
`supabaseHookCallId({ payload, secret })`, an HMAC of the raw body under
the hook secret (it reveals nothing about a code). Supabase's retries and
the client's own replay the same send; a new call (a new token, or new user
state for a notice) sends again. `onError(error)` sees every failure
(default `console.error`); one that throws is logged, and the hook still
answers its error.

## Options

| Option            | Default             | What it does                                                     |
| ----------------- | ------------------- | ---------------------------------------------------------------- |
| `client`          | required            | A Brew client, or a function returning one (called once).        |
| `secret`          | required            | The hook secret: `v1,whsec_<base64>`.                            |
| `keys`            | starter kit         | Rename a key: `{ verifyEmail: 'acme.confirm' }`.                 |
| `appName`         | none                | Sent as `appName`. Optional: the designs use the brand name.     |
| `confirmationUrl` | Supabase verify URL | Builds the link from `{ siteUrl, tokenHash, type, redirectTo }`. |
| `onError`         | `console.error`     | Called with each failure the hook answers with an error.         |

## Standard Webhooks

`verifyStandardWebhook({ payload, headers, secret })` is exported on its
own for any [Standard Webhooks](https://www.standardwebhooks.com) sender.
It checks `webhook-id`, `webhook-timestamp` (within 5 minutes either way;
`toleranceInSeconds` changes it) and `webhook-signature` (any one `v1`
signature of several may match, as during a secret rotation), then
returns the parsed JSON body. It throws `WebhookVerificationError` with a
`reason`: `missing_headers`, `invalid_timestamp`,
`timestamp_out_of_tolerance`, `invalid_signature`, `invalid_secret` or
`invalid_payload`. `payload` must be the raw body (`await request.text()`).

`planSupabaseSends(body, { appName, confirmationUrl, callId })` is the
hook's pure mapping, exported for a handler of your own; pass
`supabaseHookCallId` of the raw body as `callId`.
