# Embedded email canvas demo

A standalone Next.js app showing Brew’s email canvas inside your app. Configure a publishable client ID and a group ID or email ID. No Clerk account, Clerk keys, Brew login, API key, or custom session endpoint is required by this example.

This directory is MIT licensed. Its public mirror lives in the [TypeScript SDK examples](https://github.com/GetBrew/typescript-sdk/tree/main/examples/embedded-email-canvas). It has no imports from Brew’s private app.

## Run it

1. Use Node 22.18 or newer and the pnpm version in `package.json`. Clone the public example:

```bash
git clone https://github.com/GetBrew/typescript-sdk.git
cd typescript-sdk/examples/embedded-email-canvas
```

2. In Brew, open **Settings → API → Client apps**. Choose **Create client ID**, name your app, choose **All brands** or one specific brand, and allow **`http://localhost:3500`**. Organization admins can choose All brands; members can choose only their authorized brands. Save and copy the client ID. Enable editing if you want the editor panel.
3. Copy `.env.example` to `.env.local`. Set `NEXT_PUBLIC_BREW_CLIENT_ID` and the selected `BREW_BRAND_ID`. All brands client IDs require a brand ID, including for `ungrouped`; existing specific-brand IDs can omit it. Keep `BREW_GROUP_ID=ungrouped` to start, or supply a group ID or email ID returned by the Brew API. Clear the group ID for single-email-only mode. These targets must belong to the selected brand and the client app must allow that brand. Set both to try both modes.
4. Install dependencies, then run the demo:

```bash
pnpm install --frozen-lockfile
pnpm run doctor
pnpm dev
```

Open **http://localhost:3500**. Choose the group or single email. Select an email to edit text and open its properties. Open a second tab to try multiplayer presence and saved updates. New emails and generated content stream into the selected group automatically. One person edits each email at a time.

Use `pnpm run doctor` explicitly: `pnpm doctor` runs pnpm's own diagnostics instead of this example's configuration check. Both the demo setup screen and its check explain missing or invalid configuration without displaying credentials.

This example installs SDK 13.2.0 from npm. No SDK source build, Bun installation, or local tarball is required. Use `BREW_EMBED_ORIGIN` only for a trusted preview or local Brew deployment.

## SDK source development

SDK contributors can test an unpublished build instead. From the SDK repository root:

```bash
npx --yes bun@1.3.10 install --frozen-lockfile
npx --yes bun@1.3.10 run build
cd examples/embedded-email-canvas
node scripts/use-local-sdk.mjs ../..
pnpm add ./vendor/brew-sdk.tgz --save-exact
```

This intentionally changes the example's dependency and lockfile to use the ignored local tarball. Keep those development-only changes out of commits.

## The integration

```tsx
'use client'
import { EmailCanvas } from '@brew.new/sdk/react'

export function CustomerEmails() {
  return <EmailCanvas clientId="brew_client_..." brandId="brand_..." groupId="grp_..." />
}
```

For one email, replace `groupId` with `emailId`; passing both is a type error. Give the canvas a height (the component defaults to 640px). The SDK authenticates, renews access in the same iframe, and closes its owned session on unmount. Pass the selected brandId for an All brands client ID. You do not supply user, origin, permission, or session fields to the SDK. Editing permission comes from the client app’s settings.

`components/canvas-demo.tsx` adds fit/save controls, loading/error feedback, a before-unload warning for unsaved changes, and **save before leaving** using `ref.current.flush()`. A failed save keeps the editor open. The SDK owns session cleanup; if the browser loses connectivity, server-side expiration remains the backstop.

`lib/config.ts` validates the demo configuration; `app/page.tsx` reads it at request time so a build without credentials still shows a setup screen. `tests/browser-server.ts` is a test-only protocol fixture, not a production authentication adapter.

## Domains and access

Allowed origins are exact: `https://app.example.com` and `https://app.example.com:8443` differ. No paths, trailing slash, wildcards, or unencrypted non-loopback origins. Localhost and `127.0.0.1` are different origins; whitelist the URL you actually open. Add your deployed app’s HTTPS origin in Settings before deploying.

A client ID is public and does not identify a signed-in person. It grants the embedded canvas access to its configured brand scope from approved browser origins. All brands covers every current and future brand in the organization; a specific-brand ID covers only that brand. Every session still opens one brand and one group or email. Anyone using an approved app can request a group or email within that scope; opaque IDs and your UI’s chooser are not per-user access controls. Browser origin restrictions do not authenticate non-browser callers, which can forge an Origin header. For private tenant or user access, use a dedicated brand/client app per tenant and your own access controls, or the SDK’s advanced server-issued session provider for per-target authorization.

Client IDs cannot authorize API generation, sending, management, or ordinary Convex endpoints. Keep API keys on your backend. Revoke unused clients in Settings; revocation blocks established reads, edits, media admission, presence and renewal. Changing allowed origins, editing access or brand scope ends existing grants; reopen the canvas afterward.

If the canvas cannot connect, check that the client ID is active, its allowed origin exactly matches the address bar (including port), and the target belongs to the selected brand. For an All brands ID, set BREW_BRAND_ID; a specific-brand ID rejects another brand. A blocked CORS request cannot expose Brew’s error body to your browser, so the SDK’s connection error points you back to the allowed origins.

## Headless use cases

- **Embedded email builder:** manage and generate emails through Brew’s server API, and let customers edit them in this canvas.
- **Live generation workspace:** use a group ID when generating emails on your backend. Newly created emails and their content appear without remounting the canvas.
- **Single-email editor:** pass an email ID returned by the API for a focused editor inside an existing workflow.
- **Review portal:** disable editing in the client app’s settings. Reviewers see current content and collaborator presence.
- **Organization brand switcher:** reuse one All brands client ID and pass the selected brandId to the SDK. Switching brands acquires a new session; updates within the open board do not require remounting.
- **Multitenant platform:** use separate brands and specific-brand client apps, with your backend authorizing which tenant to load. Use server-issued sessions when individual users require narrower target permissions.

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
