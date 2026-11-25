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
  readonly previewImage: string
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
type ListTemplateRowsInput = {
  readonly brand?: string
  readonly category?: string
  readonly group?: ListTemplateCountsInput['group']
  readonly semantic?: string
  readonly query?: string
  readonly representation?: 'full' | 'summary'
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

type TemplateSummaryListResponse = {
  readonly data: ReadonlyArray<TemplateSummary>
  readonly pagination: TemplatesListResponse['pagination']
}

import type { ListTemplateCountsInput, TemplatesCountResponse } from '@brew.new/sdk'
type ListTemplatesInput = ListTemplateRowsInput | ListTemplateCountsInput

list(input: ListTemplateCountsInput): Promise<TemplatesCountResponse>
list(input: ListTemplateRowsInput & { representation: 'summary' }): Promise<TemplateSummaryListResponse>
list(input?: ListTemplateRowsInput & { representation?: 'full' }): Promise<TemplatesListResponse>
list(input?: ListTemplateRowsInput): Promise<TemplatesListResponse | TemplateSummaryListResponse>
list(input?: ListTemplatesInput): Promise<TemplatesListResponse | TemplateSummaryListResponse | TemplatesCountResponse>
```

The return type follows the representation: summary rows when you pass
`representation: 'summary'`, full rows by default or with `'full'`, and the
union when the representation is only known at runtime.

```ts
const { data } = await brew.templates.list({
  brand: 'vercel.com',
  category: 'newsletter',
  semantic: 'frontend',
})

for (const template of data) {
  console.log(template.emailId, template.title)
}

const { data: picks } = await brew.templates.list({
  query: 'product launch',
  representation: 'summary',
})
console.log(picks[0]?.viewUrl, picks[0]?.referenceEmailId)

const { data: events } = await brew.templates.list({
  group: 'events',
  representation: 'summary',
})
console.log(events.map((template) => template.title))
```

With `count: true`, the response is `{ count }`. Add `groupBy: 'brand'` or
`'category'` or `'group'` for `groups`, `groupCount`, `ungroupedCount`, and group
pagination. Continue grouped counts with the returned cursor; a plain count
accepts no cursor. Counts support `brand`, `category` and
`group` filters; `query` and `semantic` require row mode. Raw mode keeps
the count response type as well.

```ts
const counts = await brew.templates.list({ count: true, groupBy: 'category' })
console.log(counts.count, counts.groups)

const browseGroups = await brew.templates.list({
  count: true,
  groupBy: 'group',
  brand: 'vercel.com',
})
console.log(browseGroups.groups)
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
