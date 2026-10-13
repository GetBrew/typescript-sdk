# Embedded email canvas

Use `EmailCanvas` to put one Brew group, or one email, inside your app. It provides realtime generation, collaborator cursors and selections, manual editing, the properties inspector, autosave, recovery, and version selection. The iframe runs on Brew's origin and does not require third-party login cookies.

## React

```tsx
'use client'

import { EmailCanvas } from '@brew.new/sdk/react'
import { createCanvasSessionProvider } from '@brew.new/sdk/embed'

const getSession = createCanvasSessionProvider('/api/brew/canvas-session')

export function CustomerEditor({ groupId }: { groupId: string }) {
  return (
    <EmailCanvas
      groupId={groupId}
      getSession={getSession}
      style={{ height: 800 }}
      onSaved={(event) => console.log('Saved', event.emailId)}
      onError={(error) => console.error(error.code, error.message)}
    />
  )
}
```

Pass `emailId` instead of `groupId` for single-email mode. The props are an exclusive TypeScript union; passing both is invalid. React is an optional peer dependency. The server SDK and plain browser entry do not import React.

## Your server endpoint

Authenticate the current user in your app. Resolve their allowed Brew brand and group/email on the server. Reject unauthorized targets and session IDs before issuing or refreshing access. Keep the Brew API key exclusively on your server.

```ts
import { createBrewClient } from '@brew.new/sdk'

const brew = createBrewClient({ apiKey: process.env.BREW_API_KEY! })

// Inside your authenticated handler, after checking the requested target:
const session = await brew.canvas.sessions.create({
  target: { type: 'group', groupId: authorizedGroupId },
  user: { externalId: currentUser.id, name: currentUser.name },
  parentOrigin: 'https://your-app.example',
  permissions: ['read', 'edit', 'presence'],
})
// Return session as JSON with Cache-Control: no-store.
```

`createCanvasSessionProvider` POSTs `{ target, sessionId? }` to your endpoint. A renewal must return `brew.canvas.sessions.refresh(sessionId)` for the same authorized session. Store the association between that session ID, the user, and the target in your app. A session ID by itself is not proof of ownership. Use `brew.canvas.sessions.revoke(sessionId)` when access ends.

The backend validates brand permissions, target membership, and the issuing credential on every content operation. API keys have the `emails` scope. External identities are display identities, not Brew organization memberships. Read-only embeds use `permissions: ['read']`; add `presence` for collaboration awareness.

## Plain JavaScript

```ts
import {
  createEmailCanvas,
  createCanvasSessionProvider,
} from '@brew.new/sdk/embed'

const canvas = createEmailCanvas(document.getElementById('canvas')!, {
  emailId: 'email_example',
  getSession: createCanvasSessionProvider('/api/brew/canvas-session'),
})

// After onReady:
await canvas.fitView()
await canvas.focusEmail('email_example')
await canvas.flush()
canvas.destroy()
```

Give the container a nonzero height. The React component defaults to 640px. `flush()` rejects when edits remain unsaved. Await it before navigation; destroying the iframe is a synchronous cleanup operation and does not save edits. `onSaved` fires only after persistence acknowledges the change. `onDirtyChange` supports your app's navigation guard.

## Sessions and framing

A session is scoped to one brand and exactly one target. It lasts one hour and can be renewed by the same server credential. Its bootstrap credential is one-use and lasts one minute; authenticated iframe access lasts five minutes. The SDK renews through your server without replacing the iframe. Credentials travel through an origin- and source-validated `postMessage` handshake, never in the iframe URL. Framing policy allows the session's exact parent origin.

`parentOrigin` must be an exact HTTPS origin without a path. HTTP loopback origins are accepted for local development. For a preview or local Brew deployment, explicitly set `embedOrigin` to its trusted origin. The SDK defaults to `https://brew.new` and rejects a session URL from another origin.

Multiplayer provides live presence, selections, synchronized saved content, and an exclusive renewable editing lease per email. Two viewers cannot save concurrently; the second sees an editing conflict and can retry after the first releases the document. It is not character-level collaborative editing.

The embedded inspector supports file uploads and cropping through scoped authentication. Existing durable Brew image URLs can be reused. Workspace media search, logos, Giphy, and AI image generation require separate capabilities and are omitted from this surface.
