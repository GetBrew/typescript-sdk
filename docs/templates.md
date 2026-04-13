# `brew.templates`

One method for listing public templates.

| Method          | HTTP                |
| --------------- | ------------------- |
| [`list`](#list) | `GET /v1/templates` |

## Shared types

```ts
type Template = {
  readonly emailId: string
  readonly emailHtml: string
  readonly emailPng: string
}
```

Templates are public starter emails. You can use the returned `emailId`
as `referenceEmailId` in `brew.emails.generate(...)`.

---

## `list`

List public templates with optional filters.

```ts
type ListTemplatesInput = {
  readonly brand?: string
  readonly category?: string
  readonly semantic?: string
}

type ListTemplatesResponse = {
  readonly templates: ReadonlyArray<Template>
}

list(input?: ListTemplatesInput): Promise<ListTemplatesResponse>
```

```ts
const { templates } = await brew.templates.list({
  brand: 'vercel.com',
  category: 'newsletter',
  semantic: 'frontend',
})
```
