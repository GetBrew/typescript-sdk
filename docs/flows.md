# `brew.flows`

One method for the public flows gallery: real multi-step email sequences by
brand, with the day each email landed.

| Method          | HTTP            |
| --------------- | --------------- |
| [`list`](#list) | `GET /v1/flows` |

## Shared types

```ts
type Flow = {
  readonly slug: string // the brand domain, e.g. 'brew.new'
  readonly brand: {
    // presentation only — the brand's DOMAIN is the flow's `slug`
    readonly name: string
    readonly logo?: string
  }
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
  // Detail only (`slug` set) — a LIST card never carries these:
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

List flow cards, or fetch one flow with every step.

```ts
type ListFlowsInput = {
  readonly slug?: string // fetch ONE flow by brand domain → { data: [flow] }
  readonly include?: ReadonlyArray<'html'> | string // detail-only: each step's rendered HTML
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
  readonly pagination?: {
    // present in list mode; omitted on the `slug` detail read
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
const {
  data: [flow],
} = await brew.flows.list({ slug: 'brew.new', include: 'html' })

for (const step of flow?.steps ?? []) {
  console.log(step.order, `+${step.delayDays}d`, step.subject, step.emailId)
}
```

An unknown `slug` throws a `BrewApiError` with `status: 404` and
`code: 'FLOW_NOT_FOUND'`; `include` without `slug` is `400 INVALID_REQUEST`.

`include: 'html'` is best-effort per step: a step whose template stopped
being public between the flow read and its body read comes back without
`html` rather than failing the whole flow, so check the field per step.
