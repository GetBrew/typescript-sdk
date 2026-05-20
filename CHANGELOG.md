# Changelog

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

| Was              | Now                |
| ---------------- | ------------------ |
| `executionId`    | `automationRunId`  |
| `executions[]`   | `runs[]`           |
| `executionIds[]` | `automationRunIds[]` (fire response under `details`) |

Error codes:

| Was                     | Now                            |
| ----------------------- | ------------------------------ |
| `EXECUTION_NOT_FOUND`   | `AUTOMATION_RUN_NOT_FOUND`     |

Type renames:

| Was                       | Now                              |
| ------------------------- | -------------------------------- |
| `ExecutionsResource`      | `AutomationRunsResource`         |
| `Execution`               | `AutomationRun`                  |
| `ExecutionLog`            | `AutomationRunLog`               |
| `ExecutionsListResponse`  | `AutomationRunsListResponse`     |
| `ExecutionsPostResponse`  | `AutomationRunsPostResponse`     |
| `ExecutionsPostInput`     | `AutomationRunsPostInput`        |
| `ListExecutionsInput`     | `ListAutomationRunsInput`        |
| `ListExecutionsResponse`  | `ListAutomationRunsResponse`     |
| `GetExecutionInput`       | `GetAutomationRunInput`          |
| `GetExecutionResponse`    | `GetAutomationRunResponse`       |
| `CancelExecutionInput`    | `CancelAutomationRunInput`       |
| `CancelExecutionResponse` | `CancelAutomationRunResponse`   |
| `ReplayExecutionInput`    | `ReplayAutomationRunInput`       |

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

| Old call                                                     | New call                                                              |
| ------------------------------------------------------------ | --------------------------------------------------------------------- |
| `brew.executions.fire(...)`                                  | `brew.automationRuns.fire(...)`                                       |
| `brew.executions.get({ executionId })`                       | `brew.automationRuns.get({ automationRunId }).then(r => r.runs[0])`   |
| `brew.executions.cancel({ executionId })`                    | `brew.automationRuns.cancel({ automationRunId })`                     |
| `brew.triggers.create({ provider: 'brew_api', ... })`        | `brew.triggers.create({ /* drop provider */ ... })`                   |
| `brew.triggers.get({ triggerEventId, include: ['usage'] })`  | `brew.triggers.get({ triggerEventId }).then(r => r.triggers[0])`      |
| `brew.automations.get({ automationId }).then(r => r.automation)` | `brew.automations.get({ automationId }).then(r => r.automations[0])` |
| `brew.sends.create({ emails: [...] })`                       | `brew.automationRuns.fire({ triggerEventId, payload: { email: ... } })` |

## 3.1.0

### Strict sendEmail node config — `emailVersionId` + `domainId`

`AutomationSendEmailNodeConfig` is now strict on every required
field, mirroring the server-side
`API_SEND_EMAIL_CONFIG_SCHEMA` Zod contract:

| Field             | Status   | Notes                                                                                  |
| ----------------- | -------- | -------------------------------------------------------------------------------------- |
| `emailId`         | required | FK into `emails`. Returned by `brew.emails.generate(...)`.                              |
| `emailVersionId`  | required | Pin to an exact email version. Returned by `brew.emails.generate(...)` / `.edit(...)`. |
| `domainId`        | required | Custom verified domain. Pick from `brew.domains.list(...)`.                            |
| `subject`         | required | Inbox subject. Supports `{{var \| fallback}}` interpolation.                            |
| `previewText`     | required | Inbox preview. Supports interpolation.                                                 |
| `fromName`        | optional | Defaults to the domain's `defaultSenderName`.                                          |
| `replyTo`         | optional | Defaults to the domain's `defaultReplyToEmail`.                                        |

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
the agent edits against THAT version's JSX (instead of the current
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

| `kind`                       | Example                                              |
| ---------------------------- | ---------------------------------------------------- |
| `duplicate_node_id`          | Two nodes share an `id`.                             |
| `connection_unknown_from`    | `connection.from` points to a non-existent node.     |
| `connection_unknown_to`      | `connection.to` points to a non-existent node.       |
| `connection_targets_trigger` | A connection's `to` is the trigger node.             |
| `connection_self_loop`       | `connection.from === connection.to`.                 |
| `email_not_found`            | `emailVersionId` does not exist in the brand.        |
| `email_version_mismatch`     | `emailVersionId` exists but belongs to a different `emailId`. |
| `email_wrong_type`           | Referenced email is `campaign` (only `automation` / `transactional` allowed). |
| `domain_not_found`           | `domainId` does not exist in the brand.              |
| `domain_not_ready`           | Referenced domain is not verified for sending.       |

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
    { id: 'trg',     label: 'On checkout',  type: 'trigger',   config: { triggerEventId: trigger.triggerEventId } },
    { id: 'send_1',  label: 'Welcome',      type: 'sendEmail', config: { emailId: welcome.emailId } },
    { id: 'wait_2d', label: 'Wait 2 days',  type: 'wait',      config: { duration: 2, unit: 'days' } },
    { id: 'send_2',  label: 'Day 2 nudge',  type: 'sendEmail', config: { emailId: dayTwo.emailId } },
  ],
  connections: [
    { from: 'trg',     to: 'send_1' },
    { from: 'send_1',  to: 'wait_2d' },
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

| Before (1.x) | After (2.x) |
|---|---|
| `brew.emails.edit({ emailId, … })` — `emailId` on URL | `brew.emails.edit({ emailId, … })` — `emailId` now in body (server-side change, same SDK call site) |
| (no equivalent) | `brew.triggers.*`, `brew.automations.*`, `brew.executions.*` |
| (no equivalent) | `brew.events.fire(...)` — deprecated alias forwarding to `executions.fire` |

No breaking changes to existing 1.x methods.

## 1.2.0

### New methods

- `brew.emails.edit({ emailId, prompt, contentUrl? })` —
  `PATCH /v1/emails/{emailId}`. Runs the email agent's edit lane
  against the email's current `latest` JSX and persists a new
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
