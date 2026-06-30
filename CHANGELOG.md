# Changelog

## Unreleased

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
brew.emails.auditAccessibility({ emailId })      // GET /v1/emails/{id}/accessibility-audit (free)
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
