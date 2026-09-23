# `brew.flows`

One method for the public flows gallery: real multi-step email sequences by
brand, with the day each email landed.

| Method          | HTTP            |
| --------------- | --------------- |
| [`list`](#list) | `GET /v1/flows` |
| [`get`](#get) | `GET /v1/flows/{slug}` |

## Shared types

```ts
type Flow = {
  readonly slug: string // the brand domain, e.g. 'brew.new'
  readonly brand: {
    // presentation only — the brand's DOMAIN is the flow's `slug`
    readonly name: string
    readonly logo?: string
  } // the brand's domain is `slug`, not repeated here
  readonly title: string
  readonly type: 'newsletter' | 'signup' // how the sequence starts
  readonly category: string // the dominant step category
  readonly categoryLabel: string
  readonly emailCount: number
  readonly spanDays: number // first email → last email
  readonly remixCount: number
  readonly previewImages: ReadonlyArray<string> // up to three step previews
  readonly publishedAt: string
  readonly updatedAt: string
  // On `get` only; a LIST card never carries these:
  readonly anchor?: 'submittedAt' | 'signedUpAt' | 'verifiedAt' | 'firstEmail' // what day 0 means
  readonly steps?: ReadonlyArray<FlowStep>
}

type FlowStep = {
  readonly order: number // 1-based position
  readonly dayOffset: number // days after `anchor`
  readonly delayDays: number // days after the PREVIOUS step — the wait a remix reproduces
  readonly subject: string
  readonly previewText?: string
  readonly category: string
  readonly categoryLabel: string
  readonly emailId: string // a template reference (`pt1_…`)
  readonly previewImage?: string
  readonly html?: string // only with `include: 'html'`, and best-effort per step
}
```

Flows are organization-wide, like templates: the client never sends
`X-Brand-Id` here. A step's `emailId` is the same reference
`brew.templates.list()` returns, so you can pass it as `referenceEmailId`
to `brew.emails.generate(...)` to rebuild that email for your brand.

---

## `list`

List flow cards. Every card carries the `slug` that [`get`](#get) takes.

```ts
type ListFlowsInput = {
  readonly brand?: string // exact brand domain filter
  readonly category?: string
  readonly type?: 'newsletter' | 'signup'
  readonly semantic?: string // relevance-ranked search; `sort` is ignored
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
}

list(input?: ListFlowsInput): Promise<FlowsListResponse>
```

```ts
// Which signup sequences run the longest?
const { data: cards } = await brew.flows.list({ type: 'signup', sort: 'span' })

// One flow, every step, with the rendered HTML
const flow = await brew.flows.get('brew.new', { include: 'html' })

for (const step of flow.steps ?? []) {
  console.log(step.order, `+${step.delayDays}d`, step.subject, step.emailId)
}
```

## `get`

One flow as the bare row, with `anchor` and every step.

```ts
const flow = await brew.flows.get('brew.new')
const withBodies = await brew.flows.get('brew.new', { include: 'html' })
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
