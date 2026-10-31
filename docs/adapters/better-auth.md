# `@brew.new/sdk/better-auth`

Better Auth's email callbacks, sent with [`brew.send`](../send.md) to the
starter kit's auth keys. Written against Better Auth 1.7; no dependency on
`better-auth` (the types are structural).

```ts
import { createBrewClient } from '@brew.new/sdk'
import { brewAuthEmails } from '@brew.new/sdk/better-auth'
import { betterAuth } from 'better-auth'
import { emailOTP, magicLink, organization } from 'better-auth/plugins'

const emails = brewAuthEmails({
  client: () => createBrewClient({ apiKey: process.env.BREW_API_KEY! }),
  appName: 'Acme', // optional: the starter designs fall back to the brand name
  // the accept link an organization invitation carries
  invitationUrl: ({ id }) => `https://acme.com/accept-invite/${id}`,
})

export const auth = betterAuth({
  emailVerification: { sendVerificationEmail: emails.sendVerificationEmail },
  emailAndPassword: {
    enabled: true,
    sendResetPassword: emails.sendResetPassword,
  },
  user: {
    changeEmail: {
      enabled: true,
      sendChangeEmailConfirmation: emails.sendChangeEmailConfirmation,
    },
  },
  plugins: [
    magicLink({ sendMagicLink: emails.sendMagicLink }),
    emailOTP({ sendVerificationOTP: emails.sendVerificationOTP }),
    organization({ sendInvitationEmail: emails.sendInvitationEmail }),
  ],
  databaseHooks: { user: { create: { after: emails.onUserCreated } } },
})
```

## What each callback sends

The keys and payloads match the Better Auth snippets Brew's app-email setup
hands you (`setUpKit({ stack: 'better-auth' })`).

| Callback                                                                      | Key                   | Payload                                                        |
| ----------------------------------------------------------------------------- | --------------------- | -------------------------------------------------------------- |
| `sendVerificationEmail({ user, url, token })`                                 | `auth.verify-email`   | `email`, `userName`, `confirmationUrl`                         |
| `sendResetPassword({ user, url, token })`                                     | `auth.password-reset` | `email`, `userName`, `confirmationUrl`                         |
| `sendChangeEmailConfirmation({ user, newEmail, url, token })`                 | `auth.email-change`   | to the CURRENT address: `email`, `newEmail`, `confirmationUrl` |
| `sendMagicLink({ email, url, token })`                                        | `auth.magic-link`     | `email`, `confirmationUrl`                                     |
| `sendVerificationOTP({ email, otp, type: 'forget-password' })`                | `auth.password-reset` | `email`, `otp`                                                 |
| `sendVerificationOTP({ email, otp, type: 'change-email' })`                   | `auth.email-change`   | to the new address: `email`, `otp`                             |
| `sendVerificationOTP({ email, otp, type })` (`sign-in`, `email-verification`) | `auth.otp`            | `email`, `otp`                                                 |
| `sendInvitationEmail({ id, email, organization, inviter })`                   | `auth.invite`         | `email`, `inviterName`, `organizationName`, `confirmationUrl`  |
| `onUserCreated(user)`                                                         | `lifecycle.welcome`   | `email`, `userName`                                            |

Every payload also carries `appName` when you set it. `userName` is the
user's `name` and `inviterName` the inviter's, when there is one. Each
starter design handles both a code (`otp`) and a link
(`confirmationUrl`), so a password-reset code and a reset link share one
email. Rename a key with `keys`:
`brewAuthEmails({ client, keys: { passwordReset: 'acme.reset' } })`.

`sendInvitationEmail` builds `confirmationUrl` with your `invitationUrl`
option; without it, the callback rejects with a `TypeError` and sends
nothing.

## Waiting for the send

Without `waitUntil`, each callback returns the send itself. Better Auth
awaits it, or hands it to its own background handler when you set
`advanced.backgroundTasks.handler`. A failed send rejects, and Better Auth
reports it.

With `waitUntil`, each callback hands the send to it and returns at once,
so the response does not wait for Brew:

```ts
import { waitUntil } from '@vercel/functions'

const emails = brewAuthEmails({ client, waitUntil })
```

`onError(error, { key, kind })` is called with every failed send. Its
default is `console.error` for a send nothing awaits (a `waitUntil` send,
and `onUserCreated`), and nothing otherwise. `onUserCreated` never
rejects: a failed welcome email must not fail the sign-up. An `onError`
that throws or rejects is logged with `console.error` and changes
nothing: the send still rejects with its own error, or still resolves.

## Retries never send twice

Every send carries an idempotency key, `${key}:${sha256(secret)}`:

- link emails hash the `token`, so a retried callback replays the first
  send;
- codes hash the recipient, the `type` and the code, so two users who
  draw the same code still get one email each;
- invitations hash the invitation id;
- the welcome email hashes the user id.

The token or code itself never leaves your server in the key. A custom
key long enough to pass the API's 100-character limit keeps a shorter
prefix of the digest.

`client` takes a client or a function that returns one. A function runs
on the first send (so a missing environment variable fails that send,
not the import), and its client is reused after that.
