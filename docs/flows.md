# `brew.flows`

Two methods for the public flows gallery: real multi-step email sequences by
brand, with the day each email landed.

| Method          | HTTP                   |
| --------------- | ---------------------- |
| [`list`](#list) | `GET /v1/flows`        |
| [`get`](#get)   | `GET /v1/flows/{slug}` |

## Shared types

```ts
import type { Flow, FlowStep } from '@brew.new/sdk'
```

Use each list card's `slug` unchanged when fetching its detail. A slug can
identify a domain's primary flow or a specific `<domain>/<kind>` flow.
The exported types own the response fields; details include the sequence's
anchor and steps, and `include: 'html'` requests best-effort step bodies.

Flows are organization-wide, like templates: the client never sends
`X-Brand-Id` here. A step's `emailId` is the same reference
`brew.templates.list()` returns, so you can pass it as `referenceEmailId`
to `brew.emails.generate(...)` to rebuild that email for your brand.

---

## `list`

List flow cards. Every card carries the `slug` that [`get`](#get) takes.

```ts
type ListFlowsInput = {
  readonly brand?: string
  readonly category?: string
  readonly type?: 'newsletter' | 'signup'
  readonly semantic?: string
  readonly sort?: 'newest' | 'emails' | 'span' | 'remixes'
  readonly limit?: number
  readonly cursor?: string
}

type FlowsListResponse = {
  readonly data: ReadonlyArray<Flow>
  readonly pagination: {
    readonly limit: number
    readonly cursor: string | null
    readonly hasMore: boolean
  }
  readonly total: number
  readonly isTotalExact: boolean
}

list(input?: ListFlowsInput): Promise<FlowsListResponse>
```

`total` counts every flow the query matches across all pages: filters narrow
it, `semantic` only orders it. One `limit: 1` call answers "how many".
`isTotalExact` is `false` when the read was cut at 500 flows — the newest,
or the 500 nearest a `semantic` query — before the filters applied, so a
filtered total is a floor then too. Treat `total` as a floor in that case.

A `semantic` search that cannot run (no search index, or its kill switch)
throws a `BrewApiError` with `status: 503` and `code: 'SERVICE_UNAVAILABLE'`
instead of answering an empty page; retry without `semantic`. Its
`Retry-After` is 300 s, over the SDK's 60 s ceiling, so it is thrown at once
rather than retried.

```ts
const { total, isTotalExact } = await brew.flows.list({
  type: 'signup',
  limit: 1,
})
console.log(isTotalExact ? `${total}` : `at least ${total}`)

const { data: cards } = await brew.flows.list({ type: 'signup', sort: 'span' })

const first = cards[0]
if (!first) throw new Error('No matching flows')
const flow = await brew.flows.get(first.slug, { include: 'html' })

for (const step of flow.steps ?? []) {
  console.log(step.order, `+${step.delayDays}d`, step.subject, step.emailId)
}
```

## `get`

One flow as the bare row, with `anchor` and every step. A bare domain selects
its primary flow. Pass `kind` or the composite slug returned by `list` to
select a particular sequence; the SDK sends the domain in the URL and the
kind as a query parameter.

```ts
const flow = await brew.flows.get('brew.new')
const withBodies = await brew.flows.get('brew.new', { include: 'html' })
const signup = await brew.flows.get('brew.new', { kind: 'onboarding' })
```

`include: 'html'` (a token, an array, or a comma string) attaches each step's
rendered HTML, best-effort per step: a step whose body is no longer servable
comes back without `html`. An unknown or private slug throws a `BrewApiError`
with `status: 404` and `code: 'FLOW_NOT_FOUND'`. Passing `slug` or `include`
to `list` is `400 INVALID_REQUEST`: identity rides the path, and the expansion
is detail-only.

`include: 'html'` is best-effort per step: a step whose template stopped
being public between the flow read and its body read comes back without
`html` rather than failing the whole flow, so check the field per step.
