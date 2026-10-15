# Embedded email canvas demo

A standalone Next.js app showing Brew’s email canvas inside your app. Configure a publishable client ID and a group ID or email ID. No Clerk account, Clerk keys, Brew login, API key, or custom session endpoint is required by this example.

This directory is MIT licensed. Its public mirror lives in the [TypeScript SDK examples](https://github.com/GetBrew/typescript-sdk/tree/main/examples/embedded-email-canvas). It has no imports from Brew’s private app.

## Run it

1. Use Node 22.18 or newer and the pnpm version in `package.json`.
2. In Brew, select your brand and open **Settings → API → Client apps**. Choose **Create client ID**, name your app, and allow **`http://localhost:3500`**. Save and copy the client ID. Enable editing if you want the editor panel.
3. Copy `.env.example` to `.env.local`. Set `NEXT_PUBLIC_BREW_CLIENT_ID`. Keep `BREW_GROUP_ID=ungrouped` to start, or supply a group ID or email ID returned by the Brew API. Clear the group ID for single-email-only mode. These targets must belong to the client app’s brand. Set both to try both modes.
4. Install the SDK build and dependencies, then run the demo:

```bash
# Temporary setup until an embed-capable SDK version is published:
# clone https://github.com/GetBrew/typescript-sdk beside this repository,
# check out main, install its dependencies, and build it.
# Use an absolute path to that SDK checkout here:
node scripts/use-local-sdk.mjs /absolute/path/to/typescript-sdk
pnpm install --no-frozen-lockfile
pnpm doctor
pnpm dev
```

Open **http://localhost:3500**. Choose the group or single email. Select an email to edit text and open its properties. Open a second tab to try multiplayer presence and saved updates. New emails and generated content stream into the selected group automatically. One person edits each email at a time.

Published SDK 12.2.0 does not contain the embed entry points. The packing script installs a locally built public SDK tarball into ignored `vendor/`; it never copies private app modules. Once a release includes these entry points, replace the file dependency with that release and commit the regenerated lockfile. An embed-capable Brew deployment is required; use `BREW_EMBED_ORIGIN` only for a trusted preview or local Brew deployment.

## The integration

```tsx
'use client'
import { EmailCanvas } from '@brew.new/sdk/react'

export function CustomerEmails() {
  return <EmailCanvas clientId="brew_client_..." groupId="grp_..." />
}
```

For one email, replace `groupId` with `emailId`; passing both is a type error. Give the canvas a height (the component defaults to 640px). The SDK authenticates, renews access in the same iframe, and closes its owned session on unmount. You do not supply brand, user, origin, permission, or session fields to the SDK. Editing permission comes from the client app’s settings.

`components/canvas-demo.tsx` adds fit/save controls, loading/error feedback, a before-unload warning for unsaved changes, and **save before leaving** using `ref.current.flush()`. A failed save keeps the editor open. The SDK owns session cleanup; if the browser loses connectivity, server-side expiration remains the backstop.

`lib/config.ts` validates the demo configuration; `app/page.tsx` reads it at request time so a build without credentials still shows a setup screen. `tests/browser-server.ts` is a test-only protocol fixture, not a production authentication adapter.

## Domains and access

Allowed origins are exact: `https://app.example.com` and `https://app.example.com:8443` differ. No paths, trailing slash, wildcards, or unencrypted non-loopback origins. Localhost and `127.0.0.1` are different origins; whitelist the URL you actually open. Add your deployed app’s HTTPS origin in Settings before deploying.

A client ID is public and does not identify a signed-in person. It grants the embedded canvas access to the configured brand from approved browser origins. Anyone using an approved app can request a group or email in that brand; opaque IDs and your UI’s chooser are not per-user access controls. Browser origin restrictions do not authenticate non-browser callers, which can forge an Origin header. For private tenant or user access, use a dedicated brand/client app per tenant and your own access controls, or the SDK’s advanced server-issued session provider for per-target authorization.

Client IDs cannot authorize API generation, sending, management, or ordinary Convex endpoints. Keep API keys on your backend. Revoke unused clients in Settings; revocation blocks established reads, edits, media admission, presence and renewal. Changing allowed origins or editing access ends existing grants; reopen the canvas afterward.

If the canvas cannot connect, check that the client ID is active, its allowed origin exactly matches the address bar (including port), and the target belongs to its brand. A blocked CORS request cannot expose Brew’s error body to your browser, so the SDK’s connection error points you back to the allowed origins.

## Headless use cases

- **Embedded email builder:** manage and generate emails through Brew’s server API, and let customers edit them in this canvas.
- **Live generation workspace:** use a group ID when generating emails on your backend. Newly created emails and their content appear without remounting the canvas.
- **Single-email editor:** pass an email ID returned by the API for a focused editor inside an existing workflow.
- **Review portal:** disable editing in the client app’s settings. Reviewers see current content and collaborator presence.
- **Multitenant platform:** use separate brands and client apps, with your backend authorizing which tenant to load. Use server-issued sessions when individual users require narrower target permissions.

Your backend uses `createBrewClient({ apiKey, brandId })` from `@brew.new/sdk` for generation and management. The browser uses `EmailCanvas` from `@brew.new/sdk/react` with the client ID. No API key belongs in this component’s props or public environment variables.

## Validate and deploy

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm exec playwright install chromium
pnpm test:browser
pnpm build
pnpm start
```

Unit tests cover configuration and save-before-exit behavior. Browser tests use the real SDK controller and demo UI against an isolated protocol fixture, covering group/single mode, renewal, errors and failed saves. For a real isolated Brew backend, set `DEMO_E2E_BREW_ORIGIN` to its loopback origin and `DEMO_E2E_CLIENT_ID` to a synthetic client app allowing `http://localhost:3501`, then run `pnpm test:browser`. The test server refuses remote Brew origins. The Brew repository’s full loopback harness additionally covers tenant isolation, streams, version switching, editing leases, persistence, expiration and revocation.

Set the same environment variables in your deployment, whitelist its exact HTTPS origin, and build/start normally. No authentication provider or secret is required to host this demo. Protect your own app according to your product’s access requirements.

Before a production release, test the deployed canvas from an allowed and a denied HTTPS origin, ensure CDN headers preserve framing policy, and upload/crop/save/reopen a real image. Local synthetic tests do not validate hosted CDN policy or production object storage. Workspace media search, logos, Giphy and AI image generation are not part of the embedded inspector; scoped file uploads and cropping are supported.
