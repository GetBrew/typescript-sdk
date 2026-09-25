# Changelog

## 11.0.1

Type and docs fixes; no runtime change. Regenerated from the live spec after
brew-v2#1641.

### Fixed

- `automations.triggers.get` typed its `include` token as `automations`,
  which the API refuses with a `400`. The token is `skill`: it adds `skill`,
  a SKILL.md-shaped brief for wiring the fire endpoint.
- `audiences.get` types `include: 'build'`, which attaches the latest cohort
  build of an audience made by `audiences.fromEvents(...)`.
- `emails.getAudit` pages 1-50 findings (default 10). The 11.0.0 docs, and
  the spec they came from, said 1-100 with a default of 100; a `limit` over
  50 is a `400`.
- Generated JSDoc: `exportEmailDesign` names all eleven ESPs (Brevo and
  Mailjet were missing) and their `senderEmail` rule; `runAutomation`'s
  50,000 / 30 / 30 caps apply to `gradualSend` plans.

### Added

- `TemplatesIncludeToken`, like the other resources' include tokens.
- A test checks every typed `include` token against the spec's
  `x-brew-include-tokens`, so re-vendoring a spec that adds or renames one
  fails CI instead of shipping a stale union.

## 11.0.0

Tracks the MCP task refactor (brew-v2#1588) and the contact and send changes
just before it (brew-v2#1630-#1632). Regenerated from the live spec.

### Breaking

- **`emails.previewClients` starts a rendering job** instead of blocking for
  screenshots. It answers `202` with the admitted job, or `200` with the
  existing job for the same version and clients. The response is now the job:
  `previewId`, `status` (`queued | running | completed | partially_completed |
failed`), per-client `status` (`running | completed | failed`) with `reason`
  and `retryable`, `pending`, `createdAt`, `expiresAt`, `nextPollAfterMs` and
  `credits` (`reserved | settled | released`). Poll it with the new
  `emails.getClientPreview(previewId)`. The `ready`, `partial` and
  `processing` values are gone.
- **`Contact` and the contact write responses drop `verificationStatus`**,
  the deprecated mirror of `validationStatus`. Read `validationStatus`; since
  #1631 `valid` only comes from a real deliverability check.
- **`emails.get` returns the detail row** (`GetEmailResponse` is the
  `EmailDetail` schema, which adds a required `previewStatus`). The SDK's
  `EmailDetail` type now extends that schema.

### Added

- `emails.getClientPreview(previewId)` — `GET /v1/emails/client-previews/{previewId}`.
- `emails.getAudit(auditId, { cursor, limit })` — `GET /v1/emails/audits/{auditId}`, a free read of a saved audit's findings.
- `templates.get(templateId, { include: 'html' })` — `GET /v1/templates/{templateId}`.
- `emails.get(emailId, { emailVersionId | runId })` reads a saved version or a generation run; the row carries `version`, `runId`, `previewStatus`, `content`, and `errorMessage` / `errorCause` on a failed run.
- `emails.edit` changes only `title`, `subjectLine` and `groupId` (`null` ungroups) when sent without a `prompt`.
- `emails.previewClients({ emailVersionId })` renders a saved version.
- `automations.test({ scenario })` simulates engagement and forces split branches; the response carries `testMode`, and a test run's detail carries `testCoverage`.
- `templates.list({ query, representation: 'summary' })`. The return type follows the representation: `representation: 'summary'` returns `TemplateSummaryListResponse` (rows without `html`, carrying `referenceEmailId` and `viewUrl`; new `TemplateSummary` row type), the default or `'full'` returns `TemplatesListResponse`, and a representation known only at runtime returns the union.
- Error codes `AUDIT_NOT_FOUND`, `EMAIL_RUN_AMBIGUOUS`, `NO_ELIGIBLE_RECIPIENTS`, `PREVIEW_NOT_FOUND`, `RESUBSCRIBE_NOT_ALLOWED`, `TEMPLATE_NOT_FOUND`; warning codes `RESUBSCRIBE_SKIPPED`, `RECIPIENTS_EXCLUDED`. Contact write warnings name the contact (`email`).
- `data.command` responses carry `stdout`, `stderr`, `pagination` and `retryCommand`.

## 10.0.0

Tracks the public API v1 cleanup. Every collection gained a real detail read
at `/{collection}/{id}` returning the BARE row, sends read and write at their
own root, trigger instances moved under automations, and lifecycle changes
became action sub-paths instead of a body verb.

**This release is breaking on purpose and ships no aliases.** The old trick of
calling a list with an id filter and taking `data[0]` is gone — those query
filters now `400`, and an unknown id is a `404` you can catch instead of an
empty page you have to test for.

### Breaking — resources that moved

| Was                                                      | Now                                                     |
| -------------------------------------------------------- | ------------------------------------------------------- |
| `analytics.campaigns()`                                  | `sends.list({ kind: 'campaign' })` — rows carry `stats` |
| `analytics.sends.list({ sendId })`                       | `sends.get(sendId)`                                     |
| `analytics.sends.list(query)`                            | `sends.list(query)`                                     |
| `analytics.sends.listAll(query)`                         | `sends.listAll(query)`                                  |
| `analytics.triggerInstances.list(query)`                 | `automations.triggerInstances.list(query)`              |
| `analytics.triggerInstances.list({ triggerInstanceId })` | `automations.triggerInstances.get(triggerInstanceId)`   |
| `emails.createInboxPlacementTest(input)`                 | `emails.inboxPlacementTests.create(input)`              |
| `emails.getInboxPlacementResults({ emailId })`           | `emails.inboxPlacementTests.list({ emailId })`          |
| `emails.getInboxPlacementResults({ emailId, testId })`   | `emails.inboxPlacementTests.get(emailId, testId)`       |
| `flows.list({ slug, include })` (a one-row page)         | `flows.get(slug, { include })` — the bare flow          |

`brew.analytics` keeps only reports: `overview`, `automations`, `events`,
`eventsAll`. Types `CampaignAnalyticsResponse`, `CampaignAnalyticsRow`,
`CampaignAnalyticsInput`, `AnalyticsSendsResource`, and
`AnalyticsTriggerInstancesResource` are removed; `Send`, `SendStats`,
`SendStatus`, `SendEvent`, `SendsListResponse`, `ListSendsInput`,
`ListAllSendsInput`, `TriggerInstance`, `TriggerInstancesListResponse`, and
`ListTriggerInstancesInput` are re-exported from their new homes under the
same names.

### Breaking — methods that were retargeted

| Was                                                                                   | Now                                                                           |
| ------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| `automations.triggers.ready({ triggerEventId })` (`GET …/fire`)                       | `automations.triggers.readiness(triggerEventId)` (`GET …/readiness`)          |
| `automations.runs.cancel({ automationRunId, reason })` (`PATCH /v1/automations/runs`) | `automations.runs.cancel(automationRunId, { reason })` (`POST …/{id}/cancel`) |
| `automations.audienceRuns.control({ audienceRunId, action: 'pause' })`                | `automations.audienceRuns.pause(audienceRunId)`                               |
| `automations.audienceRuns.control({ audienceRunId, action: 'resume' })`               | `automations.audienceRuns.resume(audienceRunId)`                              |
| `automations.audienceRuns.control({ audienceRunId, action: 'cancel' })`               | `automations.audienceRuns.cancel(audienceRunId)`                              |

`readiness` answers a bare `{ triggerEventId, ready, blockers[],
publishedAutomations[], counts, … }` body instead of the fire envelope.
`runs.cancel` no longer fills in a `status: 'canceled'` body field — the id
rides the URL and the only body field is the optional `reason`, which moved
into the options argument. Types `TriggerReadyInput` / `TriggerReadyResponse`
became `TriggerReadinessResponse` (+ `TriggerReadinessBlocker`);
`ControlAudienceRunInput`, `ControlAudienceRunResponse`,
`AudienceRunControlAction`, and `AudienceRunControlResponse` became the single
`AudienceRunActionResponse`; `CancelAutomationRunInput` became
`CancelAutomationRunOptions`.

### Breaking — list reads lost their id and `include` filters

`audiences.list`, `automations.list`, `automations.runs.list`,
`automations.audienceRuns.list`, `automations.triggers.list`, `domains.list`,
`emailGroups.list`, and `emails.list` no longer accept the resource's own id
or `include`. Pass them to the new `get` instead:

```ts
// Before
const { data } = await brew.emails.list({ emailId, include: 'html' })
const email = data[0] // may be undefined

// After
const email = await brew.emails.get(emailId, { include: 'html' })
// 404 EMAIL_NOT_FOUND instead of an empty page
```

`emails.list` also swapped its four window params — `createdAtFrom`,
`createdAtTo`, `updatedAtFrom`, `updatedAtTo` — for one `from` / `to` pair
plus `sortBy: 'createdAt' | 'updatedAt'`.

`automations.runs.list` keeps its `recipientEmail` filter — one contact's run
history, matched case-insensitively by the server — and forwards it again.

### Breaking — renamed request and response fields

- **`emails.export`** takes `dryRun`, not `dry_run`.
- **`automations.run`** takes `dryRun`, not `dry_run`, and its preview answers
  `dryRun: true`.
- **`automations.unpublish`** takes `stopInFlight`, not `stop_in_flight`.
  `PatchAutomationInput` grew the same field, plus `paused`, `dryRun`, and the
  two `expectedBase*` concurrency guards.
- **`emails.restore`** takes `{ emailVersionId }`, not `{ version }`. Read the
  ids from `emails.get(emailId, { include: 'versions' })`.
- **`emails.send`** takes `from: { email, name? }` instead of `fromEmail` +
  `senderName`; `replyTo` is a top-level string.
- **`analytics.events`** filters on `recipient`, not `recipientEmail`. (The
  returned rows still carry the address as `recipientEmail` — only the filter
  was renamed.)
- **`contacts.deleteMany`** returns `{ deletedCount, notFound }`. The count was
  `deleted`, and `notFound` is now always present (empty when everything
  matched).
- **`contacts.delete`** returns `{ email, deleted: boolean }` and is idempotent
  — an unknown email resolves `200` with `deleted: false` instead of throwing.
- **`apiKeys.revoke`** returns `{ keyId, deleted, revokedAt? }`. The flag was
  `revoked`.
- **`brand.get` / `brand.patch`** return the brand row FLAT. There is no
  `{ brand: … }` wrapper, so `result.brand.ready` is now `result.ready`. Same
  for `brands.get`. The exported `Brand` type is the row minus the `include`
  expansions.
- **`automations.triggers.fire`** returns the bare accepted body
  (`{ triggerInstanceId, triggerEventId, status, automationRunIds,
publishedAutomations, counts, warnings, receivedAt }`). The
  `{ success, code, message, details }` envelope is gone, so
  `result.details.automationRunIds` is now `result.automationRunIds`. The
  idempotency key is a request option, never a body field.
- **`runId` is gone** from send rows and from the `POST /v1/sends` 202.
  `sendId` is the only handle. Send rows gained the automation provenance
  chain: `automationId`, `nodeId`, `automationRunId`, `audienceRunId`,
  `triggerInstanceId`.

### Breaking — one status vocabulary

Runs, sends, audience builds, and inbox-placement tests all report
`queued | scheduled | running | paused | completed | partially_completed |
failed | canceled`. A step or node reports `running | completed | failed |
skipped`. An email design reports `generating | ready | failed`.

Status **filters** accept only those values, so anything typed against
`sent`, `partially_sent`, `sending`, `pending`, `streaming`, `complete`, or
`error` must be updated:

```ts
// Before
await brew.analytics.sends.list({ status: 'sent' })
await brew.emails.list({ status: 'complete' })

// After
await brew.sends.list({ status: 'completed' })
await brew.emails.list({ status: 'ready' })
```

A test send now answers `status: 'completed'`, not `'sent'`. `sends.resume`
answers `status: 'running'`, not `'sending'`. An inbox-placement test's old
`collecting` status became a separate `phase` field (`sending` | `collecting`)
alongside a real `status`.

### Breaking — error codes

- `SEND_QUOTA_EXCEEDED` is **402** and absorbs the old
  `INSUFFICIENT_EMAIL_SENDS`.
- `PUBLISH_VALIDATION_FAILED` is **422**, was 409.
- `EVENT_NOT_FOUND` became `TRIGGER_INSTANCE_NOT_FOUND`.
- 429 is `RATE_LIMITED` only, and `Retry-After` rides the 429 alone — so
  `error.retryAfter` is only populated on a rate-limit error.
- A brand-bound API key calling an organization operation gets
  `403 ORG_SCOPE_REQUIRED` (mint an organization-scoped key). A person without
  the role still gets `403 INSUFFICIENT_ROLE`. `GET /v1/usage` needs
  organization standing, so a brand-bound key gets `ORG_SCOPE_REQUIRED` there.
- `automations.run` names the missing entity: `404 AUTOMATION_NOT_FOUND` or
  `404 AUDIENCE_NOT_FOUND` instead of a generic `NOT_FOUND`.

Branch on `error.code`, which stays a `string`. New export `BrewErrorCode` is
the union of every documented code, for exhaustive switches. `BrewErrorType`
gained `payment_required` and `service_unavailable`.

### Added — 21 methods

| Method                                                   | Route                                                       |
| -------------------------------------------------------- | ----------------------------------------------------------- |
| `audiences.get(audienceId, { include? })`                | `GET /v1/audiences/{audienceId}`                            |
| `automations.get(automationId, { include? })`            | `GET /v1/automations/{automationId}`                        |
| `automations.runs.get(automationRunId, { include? })`    | `GET /v1/automations/runs/{automationRunId}`                |
| `automations.runs.cancel(automationRunId)`               | `POST /v1/automations/runs/{automationRunId}/cancel`        |
| `automations.audienceRuns.get(audienceRunId)`            | `GET /v1/automations/audience-runs/{audienceRunId}`         |
| `automations.audienceRuns.pause(audienceRunId)`          | `POST …/audience-runs/{audienceRunId}/pause`                |
| `automations.audienceRuns.resume(audienceRunId)`         | `POST …/audience-runs/{audienceRunId}/resume`               |
| `automations.audienceRuns.cancel(audienceRunId)`         | `POST …/audience-runs/{audienceRunId}/cancel`               |
| `automations.triggerInstances.list(query)`               | `GET /v1/automations/trigger-instances`                     |
| `automations.triggerInstances.listAll(query)`            | `GET /v1/automations/trigger-instances` (paged)             |
| `automations.triggerInstances.get(triggerInstanceId)`    | `GET /v1/automations/trigger-instances/{triggerInstanceId}` |
| `automations.triggers.get(triggerEventId, { include? })` | `GET /v1/automations/triggers/{triggerEventId}`             |
| `automations.triggers.readiness(triggerEventId)`         | `GET /v1/automations/triggers/{triggerEventId}/readiness`   |
| `contacts.list(query)`                                   | `GET /v1/contacts`                                          |
| `contacts.get(email)`                                    | `GET /v1/contacts/{email}`                                  |
| `domains.get(domainId)`                                  | `GET /v1/domains/{domainId}`                                |
| `emailGroups.get(groupId)`                               | `GET /v1/email-groups/{groupId}`                            |
| `emails.get(emailId, { include? })`                      | `GET /v1/emails/{emailId}`                                  |
| `emails.inboxPlacementTests.get(emailId, testId)`        | `GET /v1/emails/{emailId}/inbox-placement-tests/{testId}`   |
| `fields.get(fieldName)`                                  | `GET /v1/fields/{fieldName}`                                |
| `sends.list(query)` / `sends.listAll(query)`             | `GET /v1/sends`                                             |
| `sends.get(sendId, { include? })`                        | `GET /v1/sends/{sendId}`                                    |

Every `get` returns the BARE row, not a `{ data }` envelope, and `404`s on an
unknown or cross-brand id. The `include` expansions ride the options argument
alongside `raw` / `idempotencyKey` / `signal`.

`fields.list` gained `include: 'coverage'` and `audienceId`; `domains.list`
gained `sendingPurpose`; `sends.list` filters on `kind`, `messageClass`, and
the four automation provenance ids.

`TriggerInstance.state` is a real enum —
`received | verified | matched | partially_fired | fired | rejected |
dead_letter`, exported as `TriggerInstanceState`. Branch on it rather than on
the presence of `automationRunIds`: `fired` means every matched automation
started, `partially_fired` means some starts are still being retried.

### Spec resync

`openapi/public-api-v1.yaml` and `src/generated/openapi-types.ts` regenerated
from the authoritative v1 spec (106 operations). `tests/openapi-surface-parity.test.ts`
passes in both directions: every documented operation has a typed SDK request,
and no SDK request points at a route the spec no longer documents.

## 9.3.0

### Fixed — trigger-fire refusals no longer degrade to `unknown_error`

`POST`/`GET /v1/automations/triggers/{id}/fire` is the ONE endpoint outside
the `{ error: { … } }` convention: its pipeline answers its successes and its
own refusals with the legacy fire envelope `{ success, status, code, message,
receivedAt, details? }` (a malformed JSON body and the contract's documented
401/403/429 stay `{ error }`; the SDK tries that shape first). `BrewApiError.fromResponse` only recognised the standard
envelope, so a documented `400 INVALID_PAYLOAD` (`status:
"payload_mismatch"`) surfaced as `code: 'unknown_error'`, `type:
'internal_error'`, "Request failed with status 400", retry advice, and a
dead `docs.getbrew.io` link — and `details.errors[]`, which names the
offending fields, was unreachable. The legacy shape now maps verbatim:
`code` and `message` from the body, `type` derived from the HTTP status
(`400`/`422` → `invalid_request`, `404` → `not_found`, `403` →
`authorization_error`, …), a fix-the-request suggestion for 4xx, and the
fire reference as `docs`.

### Added — `BrewApiError.details` and `BrewApiError.body`

`details` is the envelope's `details` object when the server sent one
(read from the standard envelope too, which previously dropped it); for a
fire `payload_mismatch` it is `{ errors[], warnings[], payloadSchema,
contractHash?, enforcement? }`. `body` is the parsed response body exactly
as received — the escape hatch for anything the mapping does not model,
such as the fire envelope's own `status` discriminator. Both constructor
fields are optional, so existing `new BrewApiError({ … })` call sites keep
compiling.

### Changed — the generic fallback

A body that is neither envelope now derives `type` from the HTTP status
instead of always reporting `internal_error` (any 4xx the map does not name
is `invalid_request`), only advises a retry for the transient statuses the
retry policy itself retries (`408`/`429`/5xx), and links
`https://docs.brew.new/api-reference/api/errors` instead of the retired
`docs.getbrew.io` host.

## 9.2.0

### Added — `brew.flows.list`

`GET /v1/flows`: the public flows gallery — one brand's real onboarding or
newsletter sequence, with the day each email landed. Organization-wide like
`brew.templates`, so the client never sends `X-Brand-Id`. `list()` returns
cards (filter `brand`, `category`, `type: 'signup' | 'newsletter'`, rank with
`semantic`, order with `sort: 'newest' | 'emails' | 'span' | 'remixes'`);
`list({ slug })` returns one flow as a single-row page with `anchor` and
`steps[]` (`order`, `dayOffset`, `delayDays`, `subject`, `previewText`,
`category`, `previewImage`, `emailId`), and `include: 'html'` adds each
step's rendered HTML. A step's `emailId` is a template reference usable as
`referenceEmailId` on `brew.emails.generate(...)`. New types: `Flow`,
`FlowStep`, `FlowsListResponse`, `ListFlowsInput`, `ListFlowsResponse`,
`FlowsIncludeToken`, `FlowsResource`. Unknown slug → `404 FLOW_NOT_FOUND`.

### Added — `brew.automations.runs.cancel`

`PATCH /v1/automations/runs`: cancel ONE run of an event-triggered automation
(or a test run) by `automationRunId`; the method sets the only action,
`status: 'canceled'`, and takes an optional `reason`. Returns
`{ automationRunId, status: 'canceled', previousStatus }`. Irreversible:
nothing further is sent, delivered emails are not recalled. `409
RUN_NOT_CANCELLABLE` once the run finished. New types:
`CancelAutomationRunInput`, `CancelAutomationRunResponse`,
`AutomationRunCancelResponse`.

### Deprecated — `brew.apiKeys.*`

The resynced spec documents that `/v1/api-keys*` now requires an exact
`org:admin` Clerk dashboard session (`sessionAuth`) and rejects API-key and
OAuth actors, so `brew.apiKeys.list()`, `create()`, and `revoke()` — which
can only authenticate with the configured API key — return `403` on the
current platform. They are marked `@deprecated` and will be removed in the
next major; manage keys at https://brew.new/settings/api.

### Spec resync

`openapi/public-api-v1.yaml` and the generated types now carry both
operations (`listFlows`, `cancelAutomationRun`).

## 8.1.1

### Fixed — analytics recipient filters reach the API

`brew.analytics.overview({ recipient })` now serializes the recipient filter
into the request query instead of silently dropping it. This release also
includes the unified email-audit and API-surface additions prepared for 8.1.0;
the 8.1.0 package was never published.

### Breaking: unified email audit

`brew.emails.auditEmail({ emailHtml, subject?, previewText?, sendingPurpose? })`
replaces the saved-design accessibility method. It calls
`POST /v1/emails/audit` with raw content and returns the versioned
`EmailAuditResponse` union. Complete results have a numeric score and cost 5
credits. Partial results have `score: null`, cost 0 credits, and can be retried
with the same idempotency key. `rulesetVersion` remains forward-compatible as
a string, and aggregated findings can include `occurrenceCount`. The current
`2026-08-24.3` ruleset keeps explicit response bounds for check IDs, findings,
sources, standards references, selectors, and display URLs. Audit admission is
6 calls per minute per credential or session and 20 calls per minute per
organization, with at most 4 concurrent audits per organization and 16
globally.

### Breaking: the transactional email object is removed

The platform deleted the standalone transactional email object — every
`/v1/transactional*` route is gone, and with it:

- `brew.transactional` (the whole resource: `get`, `getContract`,
  `putContract`, `validatePayload`) is removed.
- The `{ transactionId, to, payload }` arm of `brew.emails.send` is
  removed — `POST /v1/sends` is now a `test: true` / campaign union
  only, and `txn_` ids no longer exist.
- The exported `TransactionalPayload` / `TransactionalPayloadValue`
  types are replaced by the spec's `SendPayloadValue` (same recursive
  shape, new name).
- Fire/ready envelopes no longer carry the always-empty
  `details.publishedTransactionalEmails` / `counts.transactionalEmails`
  stubs (`counts` is `{ automations }`), and automation `sendEmail`
  node configs no longer accept a `messageClass` key — sending one is a
  `400` with a migration hint. The delivery class always derives from
  the sending domain's `sendingPurpose`.

Transactional email is a trigger-fired automation on a
transactional-purpose domain: create a trigger + an automation whose
`sendEmail` node uses a domain with `sendingPurpose: 'transactional'`
(no unsubscribe link; delivers to unsubscribed contacts), publish it,
then fire it — with full typed-payload support:

```ts
await brew.automations.triggers.fire<OrderCompletedPayload>({
  triggerEventId: 'tri_8fK2mQ4pLx',
  payload: { orderId: 'ord_1', total: 42.5 },
})
```

Typed payload contracts live on triggers:
`automations.triggers.getContract` / `putContract` / `validatePayload`
and `payloadContracts.infer`.

### Breaking: unified email audit

`brew.emails.auditEmail({ emailHtml, subject?, previewText?, sendingPurpose? })`
replaces the saved-design accessibility method. It calls
`POST /v1/emails/audit` with raw content and returns the versioned
`EmailAuditResponse` union. Complete results have a numeric score and cost 5
credits. Partial results have `score: null`, cost 0 credits, and can be retried
with the same idempotency key. `rulesetVersion` remains forward-compatible as
a string, and aggregated findings can include `occurrenceCount`. Ruleset
`2026-08-23.4` adds explicit response bounds for check IDs, findings, sources,
standards references, selectors, and display URLs. Audit admission is 6 calls
per minute per credential or session and 20 calls per minute per organization,
with at most 4 concurrent audits per organization and 16 globally.

### Added — typed nested payloads for test sends and trigger fires

The spec resync brings the recursive payload value into the generated
types. `payload` on `emails.send` (and `automations.triggers.fire`) is
typed by the exported `SendPayloadValue`: scalars, null, and
arbitrarily nested arrays/objects, instead of a flat record. Scalar keys
resolve `{{ tag | fallback }}` merge tags; the full tree renders through
Liquid as `trigger.*` on Liquid-enabled workspaces, and a nested payload
sent to a workspace without Liquid is rejected with `400
INVALID_REQUEST` — on live fires and `test: true` sends alike.

Type generation moved from the raw `openapi-typescript` CLI to
`scripts/generate-types.mjs`, which emits the recursive union as a
standalone type alias (the inline interface-member form trips TS2502).
Same flags otherwise; `bun run generate:types` is unchanged.

### Added — `brew.emailGroups`, `brew.integrations`, `brew.apiKeys`

Surface parity with the current spec: email-group CRUD
(`list`/`create`/`update`/`delete`), the connected-integrations list,
and API key management (`list`/`create`/`revoke` — `create` returns the
plaintext secret exactly once; listing only ever shows `keyPreview`).

### Added — `brew.emails.previewClients`

`POST /v1/emails/{emailId}/client-previews` renders a design's latest
version across real email clients & devices — Gmail, Outlook, Apple
Mail, iOS (with dark-mode variants), plus Yahoo — and returns a
screenshot per client, rehosted on the Brew CDN:

```ts
const batch = await brew.emails.previewClients({
  emailId: 'email_123',
  clients: ['outlook2021_win11_dm_dt'], // omit for a default spread
})
```

Fixed cost of 10 credits, charged only when at least one client renders
(`X-Credit-Cost` via `{ raw: true }`); a zero-preview batch returns a
retryable `503 SERVICE_UNAVAILABLE` and is not billed. 90-second
per-call default timeout (`PREVIEW_EMAIL_CLIENTS_DEFAULT_TIMEOUT_MS`,
exported from the entrypoint along with `PreviewEmailClientsInput` and
`EmailClientPreviewResponse`).

### Fixed — `402` / `503` error envelopes no longer degrade to `unknown_error`

`BrewApiError` was rejecting `payment_required` and
`service_unavailable` as envelope types (they were missing from the
internal allowlist), so real `402 INSUFFICIENT_CREDITS` and
`503 SERVICE_UNAVAILABLE` responses surfaced with
`code: 'unknown_error'` / `type: 'internal_error'` instead of their
documented values — breaking branch-on-`code` handling for credit
exhaustion and retryable-outage flows across every endpoint. Both types
now parse into their real `code`/`type`.

### Added — email create `category`

`POST /v1/emails` (`brew.emails.generate`) now accepts an optional marketing
`category` so a create gets the same category-tailored design treatment
(exemplars, hero recipe, personalization) the in-app agent applies, instead of
a generic default:

```ts
await brew.emails.generate({
  prompt: 'Announce our new analytics dashboard',
  category: 'product-launch',
})
```

Accepted values are the marketing categories only: `welcome`, `newsletter`,
`promotional`, `product-launch`, `product-update`, `cart-abandonment`,
`event-invitation`, `event-reminder`, `feedback-request`, `re-engagement`,
`referral`, `business`, `internal`, `general`. Omit `category` for the previous
generic default. Transactional categories (receipts, password resets, order
confirmations) are intentionally not accepted — those emails are sent from
automations with a trigger. `GenerateEmailInput` gains the optional field; no
other method signatures change.

### Changed — email edits are AI-only

`PATCH /v1/emails/{emailId}` (`brew.emails.edit`) now accepts only a
natural-language `prompt` edit, which the Brew email agent applies to
produce a new `version: "latest"` (usage-metered). The previous
manual-save body — passing raw markup directly to persist a version
without the agent — has been removed; that branch is no longer
accepted and a body carrying it returns `400 INVALID_REQUEST`.

`brew.emails.edit` already only accepted `{ prompt }`, so its method
signature is unchanged. The generated `EmailJsxSaveRequest` type is
removed, and the `EMAIL_JSX_INVALID` error code no longer exists.
`brew.emails.import` is unaffected — it still ingests existing
`html` / `mjml` / `jsx` markup into an editable design.

### Added — `brew.sends.cancel`

Cancel a scheduled or queued send before it goes out:

```ts
const result = await brew.sends.cancel('snd_8fK2mQ4p')
// { sendId: 'snd_8fK2mQ4p', status: 'canceled' }
```

Wraps `POST /v1/sends/{sendId}/cancel` (scope: `sends`). The action is
idempotent — a send already `canceled` resolves `200` with the same body.
A send that has already started or finished (`sending`, `sent`, `failed`)
returns `409 SEND_NOT_CANCELLABLE`; an unknown / cross-brand `sendId` is
`404`. This reintroduces the top-level `brew.sends` namespace (removed
below when the send _action_ moved to `emails.send`) — it now carries only
this lifecycle action, not `send` or `list`. New exported types:
`SendCancelResponse`, `SendCancelStatus`, `SendsResource`.

### Breaking — `brew.account` → `brew.usage`, `content.hostImage` → `content.addImage`

Two operations were renamed to match the API:

```ts
brew.account.get()       →  brew.usage.get()        // GET /v1/account → GET /v1/usage
brew.content.hostImage() →  brew.content.addImage() // POST /v1/content/host-image → /add-image
```

The request/response shapes are unchanged. The exported types moved
accordingly: `AccountGetResponse` → `UsageGetResponse` (and the
`Account*` sub-types → `Usage*`), and `ContentHostImageRequest` /
`ContentHostedImageResponse` → `ContentAddImageRequest` /
`ContentAddImageResponse`. The `AccountResource` type is now
`UsageResource`.

### Breaking — send actions moved to `emails`, `brew.sends` removed

A send is the act of sending an email design to a target — it is not
campaign-specific — so the two send actions now live with emails, and the
top-level `brew.sends` namespace is removed entirely.

```ts
brew.sends.create(...)  →  brew.emails.send(...)      // still POST /v1/sends
brew.sends.test(...)    →  brew.emails.sendTest(...)  // still POST /v1/sends/test
```

The HTTP URLs (`/v1/sends`, `/v1/sends/test`) and the request/response
shapes are unchanged — `emailId` stays a required body field and a send
still combines `emailId` + `emailVersionId?` + `domainId` +
`audienceId | to`. Only the SDK method location/name changed. Send
**reads** remain on `brew.analytics.sends.*`.

The exported request/response types moved accordingly: `SendsPostRequest`,
`SendsTestRequest`, `SendsTestResponse`, `SendAcceptedResponse`,
`SendAcceptedStatus` (plus the new `SendEmailInput` / `SendEmailResponse` /
`SendTestInput` / `SendTestResponse` aliases) now re-export from the
`emails` resource; the `SendsResource` type and `CreateSendInput` /
`CreateSendResponse` / `TestSendInput` / `TestSendResponse` are gone.

## 8.0.0

**BREAKING.** The v1 API was consolidated into three domains
(`automations`, `analytics`, plus the per-resource roots). The SDK surface
moves to match, several resources are removed, and the `dry_run` cost-preview
feature is gone. Generated types refreshed from the resynced
`openapi/public-api-v1.yaml`.

### Breaking — resources removed

- **`brew.me`** removed — `GET /v1/me` was deleted from the API.
- **`brew.usage`** removed — `GET /v1/usage` was deleted from the API.
- **`brew.integrations`** removed — `GET /v1/integrations` was deleted from
  the API.
- **`brew.templates.get`** removed — `GET /v1/templates/{emailId}` was deleted.
  The single-template fetch is gone; **`brew.templates.list`** rows now carry
  the rendered `html` + `previewImage` inline, so no follow-up call is needed.

### Breaking — namespace moves

Trigger and automation-run management moved under `automations`; send reads and
fired-trigger history moved under `analytics`:

```ts
// Triggers — now under automations (RESTful, id-on-path)
brew.triggers.list()        →  brew.automations.triggers.list()
brew.triggers.get(...)      →  brew.automations.triggers.get(...)
brew.triggers.create(...)   →  brew.automations.triggers.create(...)   // returns the bare row (201)
brew.triggers.patch(...)    →  brew.automations.triggers.patch(...)     // { triggerEventId, …fields }
brew.triggers.delete(...)   →  brew.automations.triggers.delete(...)
brew.triggers.fire(...)     →  brew.automations.triggers.fire(...)

// Automation runs — now under automations
brew.automationRuns.list()  →  brew.automations.runs.list()
brew.automationRuns.get(...) →  brew.automations.runs.get(...)

// Send reads — now under analytics (create + test stay on `sends`)
brew.sends.list()           →  brew.analytics.sends.list()
brew.sends.listAll()        →  brew.analytics.sends.listAll()
brew.sends.get(...)         →  brew.analytics.sends.get(...)
brew.sends.listEvents(...)  →  brew.analytics.sends.listEvents(...)
brew.sends.listForEmail(...) → brew.analytics.sends.listForEmail(...)

// Trigger instances (the old `events` reads) — now under analytics
brew.events.list()          →  brew.analytics.triggerInstances.list()
brew.events.get(...)        →  brew.analytics.triggerInstances.get(...)
```

The top-level **`brew.sends`** keeps only the writes:
`brew.sends.create` (`POST /v1/sends`) and `brew.sends.test`
(`POST /v1/sends/test`). (Superseded in _Unreleased_ above: these writes
moved to `brew.emails.send` / `brew.emails.sendTest` and `brew.sends` was
removed.)

Underlying paths changed too: triggers now hit
`/v1/automations/triggers(/{triggerEventId}(/fire))`, runs hit
`/v1/automations/runs(/{automationRunId})`, send reads hit
`/v1/analytics/sends(/{sendId}(/events))`, and trigger instances hit
`/v1/analytics/trigger-instances(/{triggerInstanceId})`.

### Breaking — `dry_run` removed

The `dry_run` cost-preview flag is gone from the API and from every SDK method
input/options (`emails.generate` / `emails.edit` / `emails.preview`, all
`content.*` methods, and `automations.create` / `automations.patch`). The
dry-run preview return-type union on `automations.create` was dropped — it now
always returns `{ automations: [row] }`.

### Added

- **`brew.help.get()`** → `GET /v1/help` — the no-auth, machine-readable API
  catalog (auth, scopes, rate limits, flat credit costs, error envelope, and
  the full endpoint list) an MCP server or agent can parse to self-discover the
  API.

### Final client surface

`account`, `analytics` (`campaigns` / `automations` / `events` / `sends` /
`triggerInstances`), `audiences`, `automations` (+ `triggers` + `runs`),
`brand`, `contacts`, `content`, `domains`, `emails`, `fields`, `help`, `sends`
(create / test), `templates`.

## Unreleased (7.0.0)

The full v1 surface — major expansion + the completion of the lean-lists
migration. Supersedes the never-released 6.0.0 (its notes are retained below).
Generated types refreshed from the complete v1 OpenAPI spec (19 → 63 routes).

> **Status:** the SDK source compiles clean (`tsc` green) and exposes every new
> method; the **MSW test-suite migration is in progress** (envelope + path +
> moved-method updates) — this is a draft until the suite is green.

### NEW — resources

```ts
await brew.account.get() // GET /v1/account — plan, credits, send quota
await brew.me.get() // GET /v1/me — key identity, brand, scopes
await brew.content.generateImage({ prompt }) // POST /v1/content/generate-image (+ 7 more media ops)
```

`brew.content.*`: `generateImage`, `generateGif`, `imageToGif`, `videoToGif`,
`optimizeImage`, `resize`, `htmlToPng`, `hostImage` — all credit-metered with
`dry_run` cost preview.

### NEW — methods

```ts
// Brand design-context (read + write)
brew.brand.getEmailDesign() / updateEmailDesign({ markdown })
brew.brand.getImageStyle()  / updateImageStyle({ markdown })
brew.brand.getIdentity()    / updateIdentity({ … })
brew.brand.getLogos() / brew.brand.getImages({ limit?, cursor? })
// Contacts
brew.contacts.validate({ emails })               // POST /v1/contacts/validate (free deliverability check)
brew.contacts.importCsv({ csv, mapping? })       // POST /v1/contacts/import-csv
brew.contacts.search(input) / searchAll(input)   // POST /v1/contacts/search (filtering moved off list)
// Emails
brew.emails.preview({ emailId, device? })        // POST /v1/emails/{id}/preview (credit-metered)
brew.emails.auditEmail({ emailHtml })            // POST /v1/emails/audit (5 credits complete, 0 partial)
// Audiences / triggers / automations
brew.audiences.getCount({ audienceId })          // GET /v1/audiences/{id}/count
brew.triggers.fire({ triggerEventId, payload })  // POST /v1/triggers/{id}/fire
brew.automations.test({ automationId, payload }) // POST /v1/automations/{id}/test
```

### BREAKING

- **Uniform `{ data, pagination }` envelope.** Every list now returns `.data`
  (was resource-named keys like `.contacts` / `.campaigns` / `.sends`). The
  finished "lean lists" migration.
- **`contacts.list()` is pagination-only.** Filtering/search/sort moved to
  `contacts.search()` / `searchAll()` (`POST /v1/contacts/search`).
- **`contacts.getByEmail()` returns the bare `Contact`** (the `{ contact }`
  wrapper is gone); `delete`/`patch` take the email in the path;
  `deleteMany` → `POST /v1/contacts/batch-delete`.
- **`sends.get({ sendId })` returns a bare `Send`** (was `{ emailId }` →
  envelope). An email's sends moved to `sends.listForEmail({ emailId })`;
  per-recipient events to `sends.listEvents({ sendId })`.
- **Automation runs are read-only** (`automationRuns.list/get` →
  `/v1/analytics/automations/runs`). Fire/test moved to `triggers.fire()` /
  `automations.test()`; public **replay/cancel removed**; the deprecated
  `brew.events` resource is **removed**.
- Type renames: `DeleteContactsResponse` → `DeleteContactResponse`; dropped
  `EmailType`, `FieldsSuccessResponse`, `FieldsMutationResponse`,
  `AutomationRunsPostResponse`, `FireTriggerResponse`, `TestRunResponse`.

### Changed

- `dry_run: true` is supported on every credit-metered op (email generate/edit,
  email preview, all `content.*`) for a no-charge cost preview.

---

## Unreleased (6.0.0) — superseded by 7.0.0

The v1 hardening pass — 7 new endpoints, uniform cursor pagination, lean
lists with opt-in `include=`, granular scopes, and several response-shape
fixes. Generated types were refreshed from the updated OpenAPI spec. This
section sits on top of the v1 lifecycle expansion (below); both ship together
as `6.0.0`.

### NEW — resources

```ts
await brew.brand.get() // GET /v1/brand — the key's brand + readiness (scope: emails)
await brew.usage.get() // GET /v1/usage — request volume + trend (scope: emails)
await brew.integrations.list({ provider }) // GET /v1/integrations (scope: automations)
```

### NEW — methods

```ts
await brew.sends.list({ status, from, to, limit, cursor }) // GET /v1/sends
await brew.sends.get({ emailId }) // GET /v1/sends?emailId= (404 SEND_NOT_FOUND on miss)
await brew.sends.test({ emailId, subject, to }) // POST /v1/sends { mode: 'test' } → { status: 'sent', recipient }
await brew.analytics.events({ recipientEmail }) // GET /v1/analytics/events — unified event explorer
```

### NEW — auto-pagination

A shared `Pagination` type and `autoPaginate()` helper now back per-resource
`listAll` iterators (`contacts.listAll`, `sends.listAll`,
`analytics.eventsAll`). Every list method accepts `{ limit, cursor }`.

```ts
for await (const send of brew.sends.listAll({ status: 'sent' })) {
  console.log(send.emailId, send.stats?.delivered)
}
```

### BREAKING — `automationRuns.replay` body + response changed

Replay was never shipped on the old `{ automationId, triggerInstanceId }`
shape. It now takes `{ automationRunId }` and returns the flat
`{ status: 'replay_started', automationRunIds, receivedAt, warnings? }`
envelope (404 `AUTOMATION_RUN_NOT_FOUND` for unknown/cross-brand ids).

```diff
- await brew.automationRuns.replay({ automationId, triggerInstanceId })
+ const { automationRunIds } = await brew.automationRuns.replay({ automationRunId })
```

### BREAKING — `fields.create` returns the created row

`POST /v1/fields` now returns `{ fields: [field] }` instead of
`{ success: true }`. `fields.delete` is unchanged (`{ success: true }`).

```diff
- const { success } = await brew.fields.create({ fieldName, fieldType })
+ const { fields } = await brew.fields.create({ fieldName, fieldType })
+ const field = fields[0]!
```

### BREAKING — lean lists + `include=`

`automations.list` is lean by default (rows omit `nodes`/`connections`);
pass `include: ['graph']` to attach the graph. `templates.list` rows omit
`emailHtml`/`emailPng` unless `include: 'html'` is passed — those fields are
now optional on the row type. Single-fetch and create/patch responses always
include the full shape.

### BREAKING — automation row drops `createdByUserId`

The internal `createdByUserId` field was removed from the public automation
row. Use `createdBy` (display name). `nodes`/`connections` are now optional on
list rows.

### Changed — delete responses carry `deleted`

`triggers.delete` and `automations.delete` responses now include
`deleted: boolean` alongside their existing counts.

### Changed — list signatures accept pagination

`audiences.list`, `domains.list` / `listSendable`, `triggers.list`, and
`analytics.campaigns` now take `(input?, options?)` where `input` carries
`{ limit, cursor }`. Callers that previously passed `{ raw: true }` as the
sole argument must move it to the second `options` argument:

```diff
- await brew.audiences.list({ raw: true })
+ await brew.audiences.list(undefined, { raw: true })
```

---

## v1 lifecycle expansion

The v1 lifecycle expansion — full parity for audiences, domains, analytics,
and the email version lifecycle, plus the triggers envelope normalization.
Generated types were refreshed from the updated OpenAPI spec.

### BREAKING — triggers create/patch now return `{ triggers: [row] }`

`brew.triggers.create()` and `brew.triggers.patch()` now return the same
uniform list envelope as `list()` / `get()` (a one-element array), instead of
the singular `{ trigger }`.

```diff
- const { trigger } = await brew.triggers.create({ ... })
+ const { triggers } = await brew.triggers.create({ ... })
+ const trigger = triggers[0]!
```

### BREAKING — `automationRuns.fire()` returns the fire envelope

`fire()` now returns the rich fire envelope; read the started run ids from
`result.details.automationRunIds`. `test()` / `replay()` return the flat
shape with top-level `automationRunIds`. The dead `dryRun` field was removed
from the fire input (the API rejects it).

```diff
- const { automationRunIds } = await brew.automationRuns.fire({ ... })
+ const { details } = await brew.automationRuns.fire({ ... })
+ const runIds = details?.automationRunIds ?? []
```

### NEW — analytics resource

```ts
await brew.analytics.campaigns() // lifetime per-campaign KPIs (scope: emails)
await brew.analytics.automations({ from, to, limit }) // windowed per-automation perf (scope: automations)
```

### NEW — audiences full CRUD

`brew.audiences.create()`, `.update()`, `.delete()`, `.duplicate()`, `.get()`.
Audience rows are enriched with `filters`, `count`, and ISO timestamps.

### NEW — domains lifecycle

`brew.domains.add()`, `.verify()`, `.updateSettings()`, `.delete()`, `.get()`,
`.listSendable()`. `list()` now returns ALL domains (incl. `pending` + DNS
`records`); use `listSendable()` for the verified, send-ready set. Rows gain
`status`, `sendable`, `records`, and `region`.

### NEW — email version lifecycle

`brew.emails.get()`, `.versions()` (`?include=versions`), `.restore({ emailId,
restoreVersion })`, `.delete()`. `generate()` / `edit()` now return the
correct persisted `emailVersionId` (previously a phantom id that failed
`sendEmail`-node validation).

### Other

- Contact `createdAt` / `updatedAt` are now ISO-8601 strings (were epoch-ms).
- Automation-run rows dropped internal `workflowRunId` / `dedupKey`;
  `automationVersionId` is now optional.

## 5.0.0

The one-switch trigger refactor. Brew previously required two operator
steps to turn on an integration trigger: connect the integration AND
flip a per-event `status: 'enabled' | 'disabled'` toggle. Step 2 was a
recurring footgun (users built automations, published them, and watched
events arrive without ever firing because they hadn't toggled the
matching event row). The whole status concept is gone. **Wired
automations fire iff they're published.** Whether a trigger is "on" is
no longer a separate question.

### BREAKING — removed: `brew.triggers.enable()` and `brew.triggers.disable()`

```diff
- await brew.triggers.enable({ triggerEventId })
- await brew.triggers.disable({ triggerEventId })
```

There is no replacement. To stop a trigger from firing, unpublish the
bound automation (`brew.automations.patch({ automationId, published: false })`).
To remove the trigger entirely, use `brew.triggers.delete({ triggerEventId })`.

### BREAKING — `brew.triggers.patch()` is metadata-only

The status-toggle branch on PATCH is removed. The body now accepts
`{ triggerEventId, title?, description?, payloadSchema? }` exclusively;
sending `{ status }` returns `400 INVALID_REQUEST`.

```diff
- await brew.triggers.patch({ triggerEventId, status: 'enabled' })
+ await brew.automations.patch({ automationId, published: true })
```

### BREAKING — `TriggerRow.status` field removed

`status: 'enabled' | 'disabled'` is no longer on the `Trigger` /
`TriggerRow` type returned by `brew.triggers.list()` / `.get()` /
`.create()` / `.patch()`. Code that destructures or filters on it must
be updated.

```diff
- const liveTriggers = (await brew.triggers.list()).triggers.filter(
-   (t) => t.status === 'enabled'
- )
+ const allTriggers = (await brew.triggers.list()).triggers
+ // To find which triggers are actually firing, list published automations
+ // and read each automation.bindings[].triggerEventId.
```

### BREAKING — `TRIGGER_DISABLED` error code removed

`POST /v1/events` (and `brew.automationRuns.fire()`) used to return
HTTP 422 with `code: 'TRIGGER_DISABLED'` when the trigger row's status
was `'disabled'`. That path is gone. The only 422 on fire is
`NO_PUBLISHED_AUTOMATION` (no automation is published against the
trigger event id).

Error-handling code that switched on `TRIGGER_DISABLED` should be
removed; consumers should rely on `NO_PUBLISHED_AUTOMATION` instead.

### Migration: `1.2.0` → `5.0.0`

This release jumps over the unpublished `4.0.0` work — v4 was prepared
in `public-api/v4-flat-api-surface` (flat list envelopes, executions →
automationRuns rename) but never landed on npm. v5 ships the whole v4
surface PLUS the trigger-status removal in one major. Read the v4.0.0
notes below for the flat-envelope + automationRuns changes you'll also
encounter on upgrade from `1.2.0`.

## 4.0.0

Sweeping cleanup of the v1 surface: every list endpoint now returns
the same `{ <resource>: [...] }` envelope (single-row gets are a
one-element array), the executions resource is renamed to
**automation runs**, and several body fields go away. Detailed
changes below.

### BREAKING — resource rename: `brew.executions` → `brew.automationRuns`

The `/v1/executions` URL is renamed to `/v1/automation/runs`. The
SDK resource follows:

```diff
- await brew.executions.fire({ triggerEventId, payload })
+ await brew.automationRuns.fire({ triggerEventId, payload })

- await brew.executions.list({ status: 'completed' })
+ await brew.automationRuns.list({ status: 'completed' })

- await brew.executions.get({ executionId })          // result.execution
+ await brew.automationRuns.get({ automationRunId })  // result.runs[0]

- await brew.executions.cancel({ executionId })
+ await brew.automationRuns.cancel({ automationRunId })
```

Field renames at the wire boundary:

| Was              | Now                                                  |
| ---------------- | ---------------------------------------------------- |
| `executionId`    | `automationRunId`                                    |
| `executions[]`   | `runs[]`                                             |
| `executionIds[]` | `automationRunIds[]` (fire response under `details`) |

Error codes:

| Was                   | Now                        |
| --------------------- | -------------------------- |
| `EXECUTION_NOT_FOUND` | `AUTOMATION_RUN_NOT_FOUND` |

Type renames:

| Was                       | Now                           |
| ------------------------- | ----------------------------- |
| `ExecutionsResource`      | `AutomationRunsResource`      |
| `Execution`               | `AutomationRun`               |
| `ExecutionLog`            | `AutomationRunLog`            |
| `ExecutionsListResponse`  | `AutomationRunsListResponse`  |
| `ExecutionsPostResponse`  | `AutomationRunsPostResponse`  |
| `ExecutionsPostInput`     | `AutomationRunsPostInput`     |
| `ListExecutionsInput`     | `ListAutomationRunsInput`     |
| `ListExecutionsResponse`  | `ListAutomationRunsResponse`  |
| `GetExecutionInput`       | `GetAutomationRunInput`       |
| `GetExecutionResponse`    | `GetAutomationRunResponse`    |
| `CancelExecutionInput`    | `CancelAutomationRunInput`    |
| `CancelExecutionResponse` | `CancelAutomationRunResponse` |
| `ReplayExecutionInput`    | `ReplayAutomationRunInput`    |

The server keeps `/v1/executions` as a deprecated alias (with
`Deprecation: true` / `Sunset: 2026-12-01T00:00:00Z` headers) so old
HTTP clients keep working through the cutover. The SDK does NOT
keep a deprecated forwarder — `brew.executions` is gone.

### BREAKING — `brew.triggers.create` drops `provider` + `providerEventKey`

Triggers created through the public API are always
`provider: 'brew_api'` — the server hardcodes it. Integration
triggers (clerk, stripe, shopify, …) are still surfaced by
`brew.triggers.list()` but cannot be authored through
`brew.triggers.create(...)`.

```diff
  await brew.triggers.create({
    title: 'User Signed Up',
    description: 'Fires when a user completes signup.',
-   provider: 'brew_api',
-   providerEventKey: 'user.signed_up',
    payloadSchema: { type: 'object', fields: [...] },
  })
```

### BREAKING — `brew.triggers.get` / `brew.triggers.list` return shape

Both methods now return the same `{ triggers: TriggerRow[] }`
envelope. Single-row `get` is a one-element array (or
`404 TRIGGER_EVENT_NOT_FOUND`):

```diff
- const { trigger, usage, samplePayload } = await brew.triggers.get({
-   triggerEventId, include: ['usage', 'samplePayload'],
- })
+ const { triggers } = await brew.triggers.get({ triggerEventId })
+ const trigger = triggers[0]
```

The `?include=usage,samplePayload` query is gone. `TriggerUsage`
type removed.

### BREAKING — `brew.automations` envelope unification

`brew.automations.create / .patch / .publish / .unpublish / .get /
.list` all return the same `{ automations: AutomationRow[] }`
envelope. Dry-run returns the unchanged
`{ valid, blockers, warnings, nodeCounts }` shape.

```diff
- const { automation } = await brew.automations.create({ ... })
+ const { automations } = await brew.automations.create({ ... })
+ const automation = automations[0]
```

`?include=versions` (single-row `get` only) attaches the version
history on the row itself (`automations[0].versions[]`) instead of a
top-level `versions[]`.

### BREAKING — `metadata` removed from automation-run fire + test

The optional `metadata: Record<string, unknown>` request field on
the fire / test branches is gone. The trigger payload itself carries
all the context the workflow runtime needs.

```diff
  await brew.automationRuns.fire({
    triggerEventId,
    payload: { email, orderId },
-   metadata: { source: 'checkout-backend' },
  })
```

### BREAKING — `brew.sends.create` requires `audienceId`; `emails[]` removed

`POST /v1/sends` is now campaign-only — every send targets exactly
one brand-owned `audienceId`. The ad-hoc `emails: string[]`
recipient list is gone; for per-recipient event-driven delivery
chain `brew.automationRuns.fire(...)` against a published
automation graph instead.

```diff
  await brew.sends.create({
    emailId, domainId, subject,
-   emails: ['ada@example.com', 'grace@example.com'],
+   audienceId: 'aud_subscribers',
  })
```

### Internal — `brew.events` (deprecated alias) now targets `/v1/automation/runs`

`brew.events.fire(...)` (kept for one-release back-compat) now sends
to `/v1/automation/runs` instead of `/v1/executions`. Same response
shape. Migrate callers to `brew.automationRuns.fire(...)`.

### Migration cheat sheet

| Old call                                                         | New call                                                                |
| ---------------------------------------------------------------- | ----------------------------------------------------------------------- |
| `brew.executions.fire(...)`                                      | `brew.automationRuns.fire(...)`                                         |
| `brew.executions.get({ executionId })`                           | `brew.automationRuns.get({ automationRunId }).then(r => r.runs[0])`     |
| `brew.executions.cancel({ executionId })`                        | `brew.automationRuns.cancel({ automationRunId })`                       |
| `brew.triggers.create({ provider: 'brew_api', ... })`            | `brew.triggers.create({ /* drop provider */ ... })`                     |
| `brew.triggers.get({ triggerEventId, include: ['usage'] })`      | `brew.triggers.get({ triggerEventId }).then(r => r.triggers[0])`        |
| `brew.automations.get({ automationId }).then(r => r.automation)` | `brew.automations.get({ automationId }).then(r => r.automations[0])`    |
| `brew.sends.create({ emails: [...] })`                           | `brew.automationRuns.fire({ triggerEventId, payload: { email: ... } })` |

## 3.1.0

### Strict sendEmail node config — `emailVersionId` + `domainId`

`AutomationSendEmailNodeConfig` is now strict on every required
field, mirroring the server-side
`API_SEND_EMAIL_CONFIG_SCHEMA` Zod contract:

| Field            | Status   | Notes                                                                                  |
| ---------------- | -------- | -------------------------------------------------------------------------------------- |
| `emailId`        | required | FK into `emails`. Returned by `brew.emails.generate(...)`.                             |
| `emailVersionId` | required | Pin to an exact email version. Returned by `brew.emails.generate(...)` / `.edit(...)`. |
| `domainId`       | required | Custom verified domain. Pick from `brew.domains.list(...)`.                            |
| `subject`        | required | Inbox subject. Supports `{{var \| fallback}}` interpolation.                           |
| `previewText`    | required | Inbox preview. Supports interpolation.                                                 |
| `fromName`       | optional | Defaults to the domain's `defaultSenderName`.                                          |
| `replyTo`        | optional | Defaults to the domain's `defaultReplyToEmail`.                                        |

The server resolves every `emailId + emailVersionId` pair through
`getEmailByEmailVersionIdScoped` to verify the row exists in the
brand AND its `emailType` is `automation` or `transactional`
(`campaign` rows are reserved for direct `POST /v1/sends`). Each
`domainId` is verified against `brew.domains.list(...)` for
existence + sendability.

### `emails.generate` + `emails.edit` return `emailVersionId`

`GeneratedEmailArtifact` now carries
`{ emailId, emailVersionId, emailHtml, emailPng? }`. Chain it
straight into `brew.automations.create({ nodes: [{ type: 'sendEmail',
config: { emailId, emailVersionId, … } }] })` so the runtime fires
the EXACT version the user just generated, even after subsequent
edits create new versions on the same `emailId`.

### `emails.edit({ emailVersionId? })` — pin the source version

`EditEmailInput` accepts an optional `emailVersionId`. When supplied
the agent edits against THAT version (instead of the current
latest). The newly-written row is still `version: 'latest'` and the
caller receives a fresh `emailVersionId` to forward to the next
`brew.automations.patch(...)`.

### `sends.create({ emailVersionId? })` — pin the version to send

`CreateSendInput` accepts an optional `emailVersionId`. Omit to send
the current `'latest'` (back-compat). Supply to deliver an
already-approved version even after a draft edit demoted it.

### New `AUTOMATION_GRAPH_INVALID` error (`HTTP 400`)

`POST /v1/automations` and `PATCH /v1/automations` now surface a
structured `error.details.issues[]` envelope when the graph fails the
post-Zod, pre-write resolution pass. Each issue carries a `kind`
discriminator so SDK callers can branch:

| `kind`                       | Example                                                                       |
| ---------------------------- | ----------------------------------------------------------------------------- |
| `duplicate_node_id`          | Two nodes share an `id`.                                                      |
| `connection_unknown_from`    | `connection.from` points to a non-existent node.                              |
| `connection_unknown_to`      | `connection.to` points to a non-existent node.                                |
| `connection_targets_trigger` | A connection's `to` is the trigger node.                                      |
| `connection_self_loop`       | `connection.from === connection.to`.                                          |
| `email_not_found`            | `emailVersionId` does not exist in the brand.                                 |
| `email_version_mismatch`     | `emailVersionId` exists but belongs to a different `emailId`.                 |
| `email_wrong_type`           | Referenced email is `campaign` (only `automation` / `transactional` allowed). |
| `domain_not_found`           | `domainId` does not exist in the brand.                                       |
| `domain_not_ready`           | Referenced domain is not verified for sending.                                |

## 3.0.0

### Deterministic public surface — AI authoring removed from `brew.triggers` and `brew.automations`

The public HTTP / SDK surface is now deterministic-only for trigger
and automation authoring. Every body shape carries the explicit
record (`{ title, provider, payloadSchema }` for triggers, `{ name,
triggerEventId, nodes, connections }` for automations). The chat-side
orchestrator (`routeToAutomationAgent`, `createTriggerEvent`) still
covers agentic flows internally, but consumers building automations
through the SDK chain deterministic calls.

**Breaking — removed**

- `brew.triggers.generate({ prompt, … })` — call `brew.triggers.create(…)`
  with the explicit `{ title, provider, payloadSchema }` shape.
- `brew.automations.generate({ prompt, triggerEventId, emailIds, autoCreateEmails })`
  — pre-mint each email body via
  `brew.emails.generate({ emailType: 'automation', prompt })`, then
  `brew.automations.create({ name, triggerEventId, nodes, connections })`
  with `sendEmail` nodes referencing the returned `emailId` values.
- `brew.automations.regenerate({ automationId, prompt })` — issue a
  deterministic `brew.automations.patch({ automationId, nodes,
connections })` instead.
- `PatchAutomationInput.prompt` / `PatchAutomationInput.autoCreateEmails`
  — fields removed; PATCH bodies that include them now return
  `400 INVALID_REQUEST`.
- Removed exported types: `GenerateTriggerInput`,
  `GenerateTriggerResponse`, `GenerateAutomationInput`,
  `GenerateAutomationResponse`.

### Breaking — `brew.emails.generate({ emailType })` now required

`POST /v1/emails` requires the new `emailType: 'campaign' |
'automation' | 'transactional'` field. Categorisation:

- `campaign` — one-shot send to an audience / contact list
  (default canvas-board surface).
- `automation` — body referenced by `sendEmail` nodes inside an
  automation graph. NEVER surfaces on the /emails canvas.
- `transactional` — system-triggered (welcome / receipt / reset).

`EMAIL_PUBLIC_SCHEMA` now surfaces `emailType` on every list item, so
`EmailSummary` carries it too — branching on `summary.emailType` is
now type-safe without a cast.

### New

- `brew.emails.list({ emailType })` — filter the latest-email list
  by the new three-way classification.
- `EmailType` — exported re-export of the union for SDK consumers.
- `AutomationNodeInput` is now a per-kind discriminated union
  (`trigger | sendEmail | wait | filter | split`). Setting
  `node.type === 'sendEmail'` narrows `node.config` to
  `AutomationSendEmailNodeConfig` (with `emailId`, `subject`,
  `previewText`, `fromAddress`, …). IDE autocomplete is now wired
  per-kind so callers no longer pass `Record<string, unknown>`.
- New named OpenAPI components (`AutomationNode`,
  `AutomationConnection`, `EmailType`, `EmailListItem`) so generated
  SDK types stay aligned with the wire format.

### Migration guide — `2.x → 3.0`

```ts
// 2.x — AI generate (REMOVED)
const { trigger } = await brew.triggers.generate({ prompt: 'on checkout' })
const { automation } = await brew.automations.generate({
  prompt: 'welcome flow',
  triggerEventId: trigger.triggerEventId,
  autoCreateEmails: true,
})

// 3.0 — deterministic chain
const { trigger } = await brew.triggers.create({
  title: 'Checkout Completed',
  provider: 'brew_api',
  payloadSchema: {
    type: 'object',
    fields: [
      { key: 'email', type: 'string', required: true },
      { key: 'orderId', type: 'string', required: true },
    ],
  },
})

const welcome = await brew.emails.generate({
  prompt: 'welcome email for new customers',
  emailType: 'automation',
})
const dayTwo = await brew.emails.generate({
  prompt: 'day-2 nudge for users who skipped setup',
  emailType: 'automation',
})

const { automation } = await brew.automations.create({
  name: 'Welcome flow',
  triggerEventId: trigger.triggerEventId,
  nodes: [
    {
      id: 'trg',
      label: 'On checkout',
      type: 'trigger',
      config: { triggerEventId: trigger.triggerEventId },
    },
    {
      id: 'send_1',
      label: 'Welcome',
      type: 'sendEmail',
      config: { emailId: welcome.emailId },
    },
    {
      id: 'wait_2d',
      label: 'Wait 2 days',
      type: 'wait',
      config: { duration: 2, unit: 'days' },
    },
    {
      id: 'send_2',
      label: 'Day 2 nudge',
      type: 'sendEmail',
      config: { emailId: dayTwo.emailId },
    },
  ],
  connections: [
    { from: 'trg', to: 'send_1' },
    { from: 'send_1', to: 'wait_2d' },
    { from: 'wait_2d', to: 'send_2' },
  ],
})

await brew.automations.publish({ automationId: automation.automationId })
```

## 2.0.0

### New resources — triggers, automations, executions, events

The SDK now covers the full email-automation lifecycle. Each method
maps 1:1 to a flat HTTP route in the public API
(`/v1/triggers`, `/v1/automations`, `/v1/executions`) — identifiers
live in the body or query string, never in the URL path.

**`brew.triggers`** — manage trigger event definitions.

- `create({ title, provider, payloadSchema, … })` — deterministic create.
- `generate({ prompt, title? })` — AI generate. Returns a
  discriminated union: switch on `result.status === 'ok'` vs
  `'needs_clarification'` (HTTP 422 mapped to the latter).
- `list()` — every trigger for the brand.
- `get({ triggerEventId, include? })` — single trigger + optional
  `usage` / `samplePayload` fan-out via `?include=`.
- `patch({ triggerEventId, title? | description? | payloadSchema? })` —
  update metadata.
- `enable({ triggerEventId })` / `disable({ triggerEventId })` —
  sugar over `patch({ status })`.
- `delete({ triggerEventId })` — refuses with HTTP 409
  `TRIGGER_HAS_DEPENDENT_AUTOMATIONS` when automations depend on it.

**`brew.automations`** — manage automation graphs.

- `create({ name, triggerEventId, nodes, connections, dryRun? })` —
  deterministic. `dryRun: true` validates without persisting.
- `generate({ prompt, triggerEventId?, emailIds?, autoCreateEmails? })`
  — AI generate. `triggerEventId` is forwarded verbatim to the
  agent's `callOptions.triggerEventId` so the agent never lists or
  searches for triggers. Same discriminated union as `triggers.generate`.
- `list()` — every automation for the brand.
- `get({ automationId, include? })` — single + optional
  `?include=versions` fan-out for full version history.
- `patch({ automationId, … })` — update | publish | unpublish |
  regenerate via a discriminated body union.
- `publish({ automationId, automationVersionId? })` — sugar for
  `patch({ published: true })`. Pass `automationVersionId` to publish
  a specific historical version.
- `unpublish({ automationId })` — sugar for `patch({ published: false })`.
  Returns 422 `AUTOMATION_NOT_PUBLISHED` (as `BrewApiError`) if the
  automation was never live.
- `regenerate({ automationId, prompt, autoCreateEmails? })` — AI
  edit against the existing graph as context.
- `delete({ automationId })` — cascade delete (idempotent).

**`brew.executions`** — fire triggers, test automations, query runs.

- `fire({ triggerEventId, payload, metadata?, idempotencyKey? })` —
  replaces `POST /v1/events`. Auto-attaches `Idempotency-Key` header.
- `test({ automationId, payload?, metadata? })` — test-fire a saved
  automation (no real mail sent).
- `replay({ automationId, triggerInstanceId })` — replay a historical
  fire (currently `501 NOT_IMPLEMENTED` — ships with P7).
- `list({ automationId?, triggerEventId?, recipientEmail?, status?, mode?, from?, to?, limit?, cursor?, include? })`
  — filterable execution list.
- `get({ executionId, include? })` — single + optional `?include=logs`
  fan-out.
- `cancel({ executionId, reason? })` — currently `501 NOT_IMPLEMENTED`
  (workflow cancel hook ships with P7).

**`brew.events`** — DEPRECATED back-compat alias.

- `events.fire(...)` forwards to `brew.executions.fire(...)`. The
  underlying HTTP path is now `POST /v1/executions`. New code should
  use `brew.executions.fire(...)` directly.

### Server-side route changes mirrored in the SDK

The public v1 API was flattened in the same release — `[id]` URL
path segments and action sub-paths are eliminated. Every legacy route
returns `Deprecation: true` + `Sunset: 2026-12-01T00:00:00Z` headers
and forwards to the flat shape. SDK consumers on `2.x` always target
the flat routes; the deprecated routes are kept only for `1.x` SDK
back-compat through the sunset window.

### Migration guide (from 1.x)

| Before (1.x)                                          | After (2.x)                                                                                         |
| ----------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| `brew.emails.edit({ emailId, … })` — `emailId` on URL | `brew.emails.edit({ emailId, … })` — `emailId` now in body (server-side change, same SDK call site) |
| (no equivalent)                                       | `brew.triggers.*`, `brew.automations.*`, `brew.executions.*`                                        |
| (no equivalent)                                       | `brew.events.fire(...)` — deprecated alias forwarding to `executions.fire`                          |

No breaking changes to existing 1.x methods.

## 1.2.0

### New methods

- `brew.emails.edit({ emailId, prompt, contentUrl? })` —
  `PATCH /v1/emails/{emailId}`. Runs the email agent's edit lane
  against the email's current `latest` version and persists a new
  `version: "latest"` row in Convex while the previous head is
  demoted to a numeric historical version. Same response union as
  `generate` — narrow on `'emailId' in result` to access the
  artifact.

### Behavior changes

- The HTTP layer now forwards a caller-supplied `Idempotency-Key`
  on `PATCH` (previously dropped). Auto-generation remains POST-only;
  callers must opt into idempotency on PATCH by passing
  `RequestOptions.idempotencyKey`. This lets `emails.edit` replay
  safely without changing existing PATCH callers' behavior.

### Long-running default timeout

- `brew.emails.edit` shares the 4-minute default timeout with
  `generate` (same agent loop). Exported as
  `EDIT_EMAIL_DEFAULT_TIMEOUT_MS` from the public entrypoint.

### Docs

- `docs/emails.md` documents the new `edit` method, the response
  union narrowing, idempotency on PATCH, and the
  `EMAIL_NOT_FOUND` / `EMAIL_IN_PROGRESS` error envelopes.

## 1.1.0

### Breaking shape narrowing

- `GenerateEmailInput` no longer accepts `brandId`. The brand is resolved
  from the API key on the server. Sending `brandId` returns
  `400 INVALID_REQUEST`.
- `ListEmailsInput` no longer accepts `brandId`. Same rationale.

These shapes were generated from `openapi/public-api-v1.yaml`, so the
change is type-level. Existing call sites that pass `brandId` will fail
TypeScript compilation; remove the field. Runtime behavior was already
inconsistent: the server returned `403 BRAND_SCOPE_MISMATCH` if the
value did not match the key brand and silently used the key brand
otherwise.

### Improvements

- `brew.emails.generate` now defaults `RequestOptions.timeoutMs` to
  **4 minutes** for `POST /v1/emails`. The global SDK default is 30
  seconds, which used to abort legitimate 30–90 second email
  generations. Caller-supplied `timeoutMs` and `signal` still win.
- Exposed `GENERATE_EMAIL_DEFAULT_TIMEOUT_MS` from the public entrypoint
  for callers who want to compose their own timeouts.

### Docs

- `docs/emails.md` documents the new shape, the long-running nature of
  `POST /v1/emails`, and how to handle the `GenerateEmailResponse`
  union.

## 1.0.0

Initial release.
