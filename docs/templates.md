# `brew.templates`

One method for listing public templates.

| Method          | HTTP                |
| --------------- | ------------------- |
| [`list`](#list) | `GET /v1/templates` |

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
  readonly semantic?: string
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

list(input?: ListTemplatesInput): Promise<TemplatesListResponse>
```

```ts
const { data } = await brew.templates.list({
  brand: 'vercel.com',
  category: 'newsletter',
  semantic: 'frontend',
})

for (const template of data) {
  console.log(template.emailId, template.title)
}
```
