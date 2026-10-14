# Embedded Email Canvas Demo

A standalone, MIT-licensed Next.js + React app that embeds Brew's email canvas in your own authenticated workspace. Copy this directory into a separate repository to use it as a starting point. It imports the public SDK and Clerk; it has no imports from Brew's private application code.

The public source is distributed in the [TypeScript SDK examples](https://github.com/GetBrew/typescript-sdk/tree/codex/embedded-email-canvas/examples/embedded-email-canvas). The canonical source is maintained in `brew-v2` and exported by its `sync-embedded-canvas-demo` script. Change the canonical source, then regenerate the public mirror; do not maintain two implementations.

The app includes a group workspace, optional single-email workspace, live updates, multiplayer presence, editing and the properties panel, autosave feedback, explicit Save now, and save-before-exit. Switch workspaces through the chooser so the current canvas saves and its session is revoked first.

## Requirements

- Node.js 22.18 or newer and pnpm 11.25 (`corepack enable` if needed).
- A Clerk application and at least one allowed Clerk user ID.
- A Brew API key with the `emails` scope, an accessible brand, and a group or email in that brand.
- A Brew deployment containing the embedded canvas endpoints and an SDK build containing `@brew.new/sdk/embed` and `@brew.new/sdk/react`.

**Release status:** the embed API is currently on the SDK's `codex/embedded-email-canvas` branch (PR 65). Published SDK 12.1.0 does not contain these entry points. The example deliberately uses a locally packed SDK until an embed-capable version is published. A Brew preview must also contain PR 2073. Set `BREW_EMBED_ORIGIN` to that preview's exact origin and configure any preview protection to allow your test host to frame it.

## Run Locally

First build the SDK. You only need to do this once per SDK update:

```sh
git clone --branch codex/embedded-email-canvas https://github.com/GetBrew/typescript-sdk.git
cd typescript-sdk
bun install --frozen-lockfile
bun run build
```

In this example directory:

```sh
node scripts/use-local-sdk.mjs /absolute/path/to/typescript-sdk
pnpm install --no-frozen-lockfile
cp .env.example .env.local
```

The preparation script packs the SDK's built public package into `vendor/brew-sdk.tgz`. It does not copy private Brew modules, change SDK versions, or publish anything. The tarball is ignored by Git. Regenerating it can change its lockfile checksum, so installation after packing explicitly permits updating the example's own lockfile.

Fill in `.env.local` using your own test resources:

| Variable | Purpose |
| --- | --- |
| `APP_ORIGIN` | Exact host origin, initially `http://localhost:3500`. No path or trailing slash. |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk's public key for the host app. |
| `CLERK_SECRET_KEY` | Clerk's server key. |
| `DEMO_ALLOWED_USER_IDS` | Comma-separated Clerk user IDs allowed to access these demo targets. Signing in alone grants no canvas access. Find IDs in Clerk's user dashboard. |
| `CANVAS_SESSION_SECRET` | Random server secret used to bind a canvas grant to its signed-in owner. Generate it with the command in `.env.example`. |
| `BREW_API_KEY` | Server-only Brew API key with the `emails` scope. |
| `BREW_BRAND_ID` | Brand containing the configured group/email. |
| `BREW_GROUP_ID` | Group displayed by Campaign group. Optional if you only configure an email. |
| `BREW_EMAIL_ID` | Optional email displayed by Single email. At least one target is required. |
| `CANVAS_CAN_EDIT` | `true` for editing; `false` for read-only review with presence. |
| `BREW_EMBED_ORIGIN` | Exact trusted Brew origin; defaults to `https://brew.new`. Use your embed-capable preview until release. |

```sh
pnpm doctor
pnpm dev
```

Open **http://localhost:3500**, sign in normally, and choose a workspace. A fresh checkout shows a setup screen listing missing variables. `doctor` checks configuration without printing secrets or contacting customer APIs; opening the canvas verifies actual Brew access.

After the feature is published, replace the tarball dependency with an **embed-capable released version** using `pnpm add @brew.new/sdk@<released-version>`, commit the updated manifest and lockfile, and remove `vendor/` from your build process.

## Try The User Flow

1. Open Campaign group. Only the configured group's emails are visible. Emails generated or updated in that Brew group appear through realtime subscriptions; the demo itself never sends email or starts paid generation.
2. Select an email and edit its text or properties. The canvas contains the editor and inspector. Watch Unsaved changes become Saved after persistence acknowledges the update.
3. Open a second tab, or sign in as a second allowed user in another browser. You can see presence, selections, and saved updates. Each email has an exclusive renewable editing lease: one person edits it at a time. This is not character-level simultaneous text editing.
4. Use Save now to flush pending edits. Back to workspaces flushes, revokes the current session, and then returns to the chooser. A failed save keeps the editor open and shows the failure. Closing a dirty browser tab triggers its native unsaved-changes warning.
5. Open Single email to work with exactly one email. Omit `BREW_EMAIL_ID` to remove this option, or omit `BREW_GROUP_ID` for an email-only portal.
6. Set `CANVAS_CAN_EDIT=false` and restart to try read-only review. Permissions come from the host server and cannot be upgraded through browser props.

## How It Works

```text
Signed-in user → host /api/canvas-session → Brew SDK session API
                        ↓
                  scoped session + ownership receipt
                        ↓
React EmailCanvas → Brew iframe → authenticated realtime data + editing
```

- [lib/config.ts](lib/config.ts) owns configuration and the server-approved target list. The page sends only labels, targets, edit mode, and the trusted embed origin to the client.
- [lib/server.ts](lib/server.ts) authenticates each request through Clerk and creates the server SDK client. The Brew key and receipt-signing secret never reach the browser.
- [lib/session-handler.ts](lib/session-handler.ts) checks exact request origin, bounded JSON input, user access, approved target, and session ownership before calling Brew. It returns uncached JSON. The stateless HMAC receipt binds the session ID to the user, their Clerk login session, the brand, host origin, target, and edit policy. A policy change requires a fresh session; the owner can still revoke the previous policy's grant. The receipt proves issuance; Clerk still authenticates every renewal/revocation. Another signed-in user or a new login cannot reuse it. No process-local ownership database is required.
- [lib/session-bridge.ts](lib/session-bridge.ts) connects the SDK's `createCanvasSessionProvider` to that endpoint, keeps ownership receipts in memory, includes them during renewals, and revokes tracked grants on exit. SDK session renewal preserves the iframe and unsaved edits.
- [components/canvas-demo.tsx](components/canvas-demo.tsx) uses the SDK's typed `EmailCanvas` props and ref. Group/email props are mutually exclusive. It displays readiness, selection, save state, errors, and saves before switching targets or signing out. Unmount cleanup attempts revocation; abrupt network loss is bounded by Brew's credential expiry.

The iframe authenticates through an origin-checked `postMessage` handshake. Bootstrap credentials stay out of its URL, and Brew permits framing only by the exact `APP_ORIGIN` that issued the session. The iframe does not depend on third-party Clerk cookies.

## Adapt It To Your App

Use the demo's static allowlist for an internal pilot. For a multi-tenant product, replace `config.allowedUserIds` and `config.targets` with server-side authorization from your application's database. Resolve the user's brand, target, and edit role on **every create, refresh, and revoke request**. Keep the ownership check. Never accept a caller-provided brand, external identity, permission set, or parent origin as authority.

Keep one bridge per mounted canvas. Await `flush()` before your router changes pages, then revoke and unmount. Do not destroy or remount the iframe as a save operation. For navigation you add beyond this example, use `onDirtyChange` to guard it. Receipts stay in memory; do not put grants in query strings, local storage, analytics, or logs.

The embedded inspector supports scoped uploads and cropping, plus existing durable Brew image URLs. Workspace asset search and AI image generation are separate capabilities and are omitted from this embed.

| Use Case | Configuration |
| --- | --- |
| Customer campaign workspace | Group target, edit + presence, app-defined tenant access. |
| Client approval portal | Group or single email, `CANVAS_CAN_EDIT=false`, explicitly approved reviewers. |
| Transactional template editor | Single email, edit enabled, flush before completing your surrounding flow. |
| Agency collaboration | One client's group per surface, approved collaborators, live presence and saved updates. |

## Deploy

Build and run with `pnpm build` and `pnpm start`. Deploy this directory as its own Next.js project. If using the unreleased SDK, run the SDK preparation step in CI **before** dependency installation, or include the prepared MIT-licensed tarball in your deployment source. Once the SDK is published, prefer the released dependency.

Set `APP_ORIGIN` to the exact HTTPS host used by your users; configure separate values for local, preview, and production. Preview URLs change, so use a stable preview domain or update this value for each deployment. Configure Clerk's production keys and allowed host domain. Store server keys/secrets in your hosting provider's secret manager. Use a least-privilege Brew key for the configured brand. Keep `CANVAS_SESSION_SECRET` consistent across replicas; rotating it makes old receipts fail and requires reopening canvases.

For a public product, integrate your own tenant/role authorization and shared rate limiting before opening access beyond the demo allowlist. Removing an allowed user blocks their next renewal; revoke existing grants immediately when your application's access changes. Brew independently rechecks its issuing credential and target permissions on content operations. Session grants last one hour, bootstrap credentials one minute, and iframe access credentials five minutes; successful renewal extends the grant without recreating the iframe.

## Validate

```sh
pnpm typecheck
pnpm lint
pnpm test
pnpm exec playwright install chromium
pnpm test:browser
pnpm build
```

The tests cover origin checks, anonymous and unapproved users, allowed targets, forged/stolen receipts, cross-user and cross-login renewal/revocation, read-only policy, upstream error sanitization, effect ordering, failed saves, and save-before-exit. Browser tests use the **real SDK and demo UI** with a test-only identity adapter and a protocol fixture. Production routes always authenticate with Clerk; the test adapter is never imported by the app.

When running inside `brew-v2`, wrap each heavy command in `node ../../scripts/with-heavy-check-lock.mjs embedded-demo-<check> -- pnpm <command>` and run checks sequentially. In a copied standalone repository, the normal commands above suffice.

For Brew maintainers testing against the real iframe and backend, first set up the isolated synthetic Convex/Next fixture from the `brew-v2` embedded canvas validation runbook, then run:

```sh
DEMO_E2E_BREW_ORIGIN=http://127.0.0.1:3400 \
DEMO_E2E_BRAND_ID=<synthetic-fixture-brand-id> pnpm test:browser
```

That mode refuses remote origins and uses only the synthetic fixture key. It exercises group/email readiness, SDK commands, actual revocation, and host ownership rejection against real API sessions. The protocol-only failure-injection test is skipped; Brew's full loopback suite covers actual edits, inspector saves, realtime streams, leases, and recovery. A release acceptance pass must additionally use normal Clerk sign-in and a test brand on your deployed HTTPS host, including upload/crop/save/reopen; hermetic tests cannot establish those deployment settings.

## Troubleshooting

| Symptom | Check |
| --- | --- |
| SDK embed/react import is missing | Pack the feature branch, or install an embed-capable released SDK. Published 12.1.0 lacks it. |
| Setup screen remains | Run `pnpm doctor`; set at least one target and restart after changing env. |
| Signed in but denied | Add the correct Clerk user ID to `DEMO_ALLOWED_USER_IDS`; sign-in alone is insufficient. |
| Canvas cannot authorize | Confirm key scope, brand, target membership, and that `BREW_EMBED_ORIGIN` hosts the embed API. |
| Origin/framing error | Match `APP_ORIGIN` to the browser's exact origin. `localhost` and `127.0.0.1` differ. Check preview protection and your host's `frame-src` policy. |
| Renewal fails after sign-out or a secret rotation | Return to the chooser and open a fresh session after signing in. |
| Editing conflict | Another viewer owns the email's editing lease. Wait for release, then retry. |
| Save failed | Keep the current canvas open, resolve the displayed failure, and retry Save now. Unsaved changes are not a confirmed save. |

## License

This example is MIT licensed; see [LICENSE](LICENSE). The license applies to this directory. Brew's hosted service and other repository code retain their own terms and licenses.
