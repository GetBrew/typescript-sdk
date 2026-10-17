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

**Nothing to deploy?** Brew can be the hook itself:
`brew.integrations.connect({ provider: 'supabase_auth', signingSecret })`
returns the `webhookUrl` to point the Send Email hook at, and sets up the
auth emails. This adapter is the self-hosted alternative, for renamed
keys, your own confirmation links or codes in link emails. See
[Hosted or self-hosted](../integrations.md#hosted-or-self-hosted-supabase).

## What it sends

The hook verifies the Standard Webhooks signature, maps
`email_action_type` to a starter-kit key and sends:

| `email_action_type` | Key                     | Recipient and payload                                                 |
| ------------------- | ----------------------- | --------------------------------------------------------------------- |
| `signup`            | `auth.verify-email`     | `user.email`: `confirmationUrl`                                       |
| `recovery`          | `auth.password-reset`   | `user.email`: `confirmationUrl`                                       |
| `magiclink`         | `auth.magic-link`       | `user.email`: `confirmationUrl`                                       |
| `invite`            | `auth.invite`           | `user.email`: `confirmationUrl`                                       |
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

**Codes in link emails.** Link emails carry the link only
(`verification: 'link'`, the default), as Supabase's default templates do.
With `verification: 'code'` they also carry the six-digit code as `otp`,
and the starter kit's designs show the code instead of the button: use it
when your app confirms with `verifyOtp({ email, token, type })`. An email
with no token hash to build a link from carries the code either way.

## Answers

| Outcome                              | Status | Body                                     |
| ------------------------------------ | ------ | ---------------------------------------- |
| Every email accepted                 | `200`  | `{}`                                     |
| Bad or missing signature, stale time | `401`  | `{ error: { http_code: 401, message } }` |
| A body it cannot use, unknown action | `400`  | `{ error: { http_code: 400, message } }` |
| A secret that is not `v1,whsec_…`    | `500`  | `{ error: { http_code: 500, message } }` |
| Brew refused or could not be reached | `500`  | `{ error: { http_code: 500, message } }` |
| Not a `POST`                         | `405`  | `{ error: { http_code: 405, message } }` |

On an error Supabase reports the email as not sent. Each send carries an
idempotency key hashed from its token hash (or, for codes and notices,
the code and the `webhook-id`), so the client's retries of a send never
email twice. A code repeats across requests, so a code email, including
a link email sent as a code because no link could be built, is keyed per
request. `onError(error)` sees every failure (default `console.error`);
one that throws is logged, and the hook still answers its error.

## Options

| Option            | Default             | What it does                                                     |
| ----------------- | ------------------- | ---------------------------------------------------------------- |
| `client`          | required            | A Brew client, or a function returning one (called once).        |
| `secret`          | required            | The hook secret: `v1,whsec_<base64>`.                            |
| `keys`            | starter kit         | Rename a key: `{ verifyEmail: 'acme.confirm' }`.                 |
| `appName`         | none                | Sent as `appName`. Optional: the designs use the brand name.     |
| `verification`    | `'link'`            | `'code'` adds `otp` to link emails.                              |
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

`planSupabaseSends(body, options)` is the hook's pure mapping, exported
for a handler of your own.
