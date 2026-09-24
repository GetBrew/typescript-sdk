# `brew.templates`

List public templates and read one by id.

| Method          | HTTP                             |
| --------------- | -------------------------------- |
| [`list`](#list) | `GET /v1/templates`              |
| [`get`](#get)   | `GET /v1/templates/{templateId}` |

## Shared types

```ts
type Template = {
  readonly emailId: string
  readonly title: string
  readonly category?: string
  readonly brand?: string
  readonly html: string
  readonly previewImage: string // rendered screenshot URL
  readonly updatedAt: string
}
```

Templates are public starter emails. Each row carries the rendered
`html` + `previewImage` directly — no per-template fetch is needed. You
can use the returned `emailId` as `referenceEmailId` in
`brew.emails.generate(...)`.

---

## `list`

List public templates with optional filters.

```ts
type ListTemplatesInput = {
  readonly brand?: string
  readonly category?: string
  readonly semantic?: string // vector-ranked matches
  readonly query?: string // title text or an exact template id
  readonly representation?: 'full' | 'summary' // summary omits html
  readonly limit?: number
  readonly cursor?: string
}

type TemplatesListResponse = {
  readonly data: ReadonlyArray<Template>
  readonly pagination: {
    readonly limit: number
    readonly cursor: string | null
    readonly hasMore: boolean
  }
}

// representation: 'summary' rows omit html and carry referenceEmailId + viewUrl
type TemplateSummaryListResponse = {
  readonly data: ReadonlyArray<TemplateSummary>
  readonly pagination: TemplatesListResponse['pagination']
}

list(input?: ListTemplatesInput): Promise<TemplatesListResponse>
list(input: ListTemplatesInput & { representation: 'summary' }): Promise<TemplateSummaryListResponse>
```

The return type follows the representation: full rows by default, summary
rows when you pass `representation: 'summary'` (a value only known at
runtime returns the union).

```ts
const { data } = await brew.templates.list({
  brand: 'vercel.com',
  category: 'newsletter',
  semantic: 'frontend',
})

for (const template of data) {
  console.log(template.emailId, template.title)
}

// Lean rows for picking a layout: no html, a viewUrl and referenceEmailId.
const { data: picks } = await brew.templates.list({
  query: 'product launch',
  representation: 'summary',
})
console.log(picks[0]?.viewUrl, picks[0]?.referenceEmailId)
```

---

## `get`

One public template with its `previewImage`, `viewUrl` and the
`referenceEmailId` that `brew.emails.generate({ referenceEmailId })` remixes.
Pass `include: 'html'` for its rendered HTML; large HTML arrives as a
downloadable `content.url` instead of inline. An unknown id is
`404 TEMPLATE_NOT_FOUND`.

```ts
get(
  templateId: string,
  options?: RequestOptions & { include?: 'html' }
): Promise<GetTemplateResponse>
```

```ts
const template = await brew.templates.get('pt1_vercel_digest', {
  include: 'html',
})
await brew.emails.generate({
  prompt: 'Our launch, in this layout',
  referenceEmailId: template.referenceEmailId,
})
```
