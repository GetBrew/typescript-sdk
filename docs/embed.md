# Embedded email canvas

Put one Brew group or one email inside your app, with live generation streams, multiplayer presence, manual editing, the properties panel, autosave and version selection. The iframe authenticates with a client ID and works without Clerk or third-party login cookies.

## Create a client app

Install SDK 12.3.0 or newer:

```bash
npm install @brew.new/sdk@^12.3.0
```

Select the brand in Brew, then open **Settings → API → Client apps → Create client ID**. Name the app, add its exact allowed origins, choose whether editing is enabled, and copy its client ID.

Use HTTPS in production. HTTP loopback origins such as `http://localhost:3500` are accepted for development. Origins include the port and exclude paths and trailing slashes. Wildcards are not accepted.

## React

```tsx
'use client'
import { EmailCanvas } from '@brew.new/sdk/react'

export function CustomerEmails() {
  return (
    <EmailCanvas
      clientId="brew_client_..."
      groupId="grp_..."
      style={{ height: '80vh' }}
    />
  )
}
```

For a focused editor, replace `groupId` with `emailId`. Exactly one is required, both in TypeScript and at runtime. The client ID determines the brand and editing permissions. You do not provide an API key, Clerk key, user object, brand ID, parent origin or session endpoint.

The component defaults to a height of 640px. React 18 and 19 are supported. React is optional if you use the browser controller.

## Other frameworks

```ts
import { createEmailCanvas } from '@brew.new/sdk/embed'

const container = document.getElementById('canvas')!
const canvas = createEmailCanvas(container, {
  clientId: 'brew_client_...',
  emailId: 'email_...',
  onReady: () => console.log('Ready'),
  onSaved: ({ emailId }) => console.log('Saved', emailId),
  onError: (error) => console.error(error.code, error.message),
})

await canvas.flush() // before navigating away
canvas.destroy() // unmount and close access
```

Give the container a nonzero height. `fitView()`, `focusEmail(emailId)` and `flush()` return promises. The React component exposes the same methods through an `EmailCanvasHandle` ref. Await `flush()` before navigation; if saving fails, keep the canvas mounted so the user can retry. `onDirtyChange` can drive a navigation warning, and `onSelectionChange` reports selected email IDs.

Authentication, ownership-bound renewal and revocation are handled by the SDK. Renewal preserves the mounted iframe and unsaved content. Ownership and access secrets stay in memory and never appear in iframe URLs. A separate, public recovery ID is stored per client app in your app’s local storage so reopening can find unsaved drafts. This ID grants no access; recovery across reloads requires browser storage to be available. Unmounting revokes access on a best-effort basis; server expiration handles lost connections. `embedOrigin` is optional and defaults to `https://brew.new`; override it only for a trusted preview or local Brew deployment.

## Headless generation and management

Use a server-side Brew client for API operations, and the browser component for the editing surface:

```ts
// Your backend only
import { createBrewClient } from '@brew.new/sdk'
const brew = createBrewClient({
  apiKey: process.env.BREW_API_KEY!,
  brandId: process.env.BREW_BRAND_ID!,
})
// Generate and manage emails with brew.emails and brew.emailGroups.
// Return the authorized groupId or emailId to your frontend.
```

Keep a group canvas mounted while your backend generates emails in that group: the new emails and generation chunks appear live. Pass an email ID when embedding a focused editing step. Client IDs cannot authorize API generation, management or sending.

## Access boundaries

Client IDs are publishable app credentials. Brew checks the request’s exact Origin against stored allowed origins before issuing a scoped grant and uses that same origin for iframe framing. Each content, edit and presence operation rechecks current client policy, organization status and brand lifecycle. Revoke the client app in Settings to end access. Changing origins or editing permissions invalidates existing sessions; reopen the canvas afterward.

A client ID does not authenticate an individual person. Visitors to an approved origin can access the configured brand’s emails through the canvas, including other group/email IDs in that brand. Browser origin restrictions are not end-user authorization and can be forged by non-browser clients. Use dedicated brands/client apps for tenant isolation. For private per-user or per-target access, use the advanced server session flow below with your existing authentication provider.

Multiplayer means live cursors/selections plus synchronized persisted changes. One person edits an email at a time; simultaneous character-level CRDT editing is not provided. Read-only mode is configured in the client app’s settings. The inspector supports scoped file uploads and cropping; workspace media search, logos, Giphy and AI image generation require separate workspace capabilities.

## Advanced: server-authorized sessions

If your app needs per-user/target authorization, replace `clientId` with a session provider. No particular login provider is required:

```tsx
import { EmailCanvas } from '@brew.new/sdk/react'
import { createCanvasSessionProvider } from '@brew.new/sdk/embed'

const getSession = createCanvasSessionProvider('/api/brew/canvas-session')
<EmailCanvas emailId="email_..." getSession={getSession} />
```

Your endpoint receives `{ target, sessionId? }`. Authenticate the caller with your app’s existing login, authorize the target and brand on your backend, then call `brew.canvas.sessions.create({ target, user: {externalId, name}, parentOrigin, permissions })` with a server-side API key. Store ownership of the returned session ID. Renew only that caller’s owned session using `brew.canvas.sessions.refresh(sessionId)` and revoke it when access ends. A session ID alone is not proof of ownership. The SDK accepts either `clientId` or `getSession`, never both.

## Runnable open source demo

The [MIT Next.js example](../examples/embedded-email-canvas/README.md) demonstrates the client ID setup, group and single-email modes, save-before-exit and error recovery. No Clerk dependency or secret credentials are required. Its README covers installation, allowed domains, headless use cases, deployment and tests.

The example installs the released SDK directly from npm. Validate hosted HTTPS framing and real image upload/crop persistence for your deployment; local fixture tests do not establish production hosting/storage readiness.
