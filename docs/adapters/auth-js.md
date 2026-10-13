# `@brew.new/sdk/next-auth` (and `@brew.new/sdk/auth-js`)

An Auth.js email provider that sends the sign-in link with
[`brew.send`](../send.md). `@brew.new/sdk/auth-js` is the same module
under the Auth.js name. Works with Auth.js v5 (`next-auth@5`,
`@auth/core`) and next-auth v4; no dependency on either.

```ts
// auth.ts (Auth.js v5)
import { createBrewClient } from '@brew.new/sdk'
import { BrewEmail } from '@brew.new/sdk/next-auth'
import NextAuth from 'next-auth'

export const { handlers, auth, signIn } = NextAuth({
  adapter, // email sign-in needs a database adapter
  providers: [
    BrewEmail({
      client: () => createBrewClient({ apiKey: process.env.BREW_API_KEY! }),
      appName: 'Acme',
    }),
  ],
})

// signIn('brew', { email })
```

On next-auth v4, pass `id: 'email'` (v4's `EmailConfig` type accepts only
that id) and sign in with `signIn('email', { email })`.

## Options

| Option    | Default           | What it does                                                         |
| --------- | ----------------- | -------------------------------------------------------------------- |
| `client`  | required          | A Brew client, or a function returning one (called on first send).   |
| `key`     | `auth.magic-link` | The trigger key to send.                                             |
| `appName` | none              | Sent as `appName`. Optional: the starter designs use the brand name. |
| `maxAge`  | `86400` (24 h)    | How long the link works, in seconds (Auth.js reads it).              |
| `id`      | `'brew'`          | The provider id, the first argument to `signIn()`.                   |

The provider is `{ id, type: 'email', name: 'Email', maxAge,
sendVerificationRequest }` (plus inert `server`, `from` and `options`,
which next-auth v4's type requires; the sender lives on the automation).

## What it sends

`sendVerificationRequest({ identifier, url, expires, token })` awaits

```ts
brew.send(key, {
  email: identifier,
  confirmationUrl: url,
  expiresInMinutes, // the link lifetime, `maxAge` / 60
  appName, // when set
})
```

with the idempotency key `${key}:${sha256(token)}`. The body is the same
on every retry (`expiresInMinutes` is the lifetime, not a countdown to
`expires`), so a retried request replays instead of sending a second
link. A failed send throws (a `BrewApiError` or a
transport error), so Auth.js shows its error page instead of "check your
email".
