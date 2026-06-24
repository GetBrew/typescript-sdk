# `brew.brand`

The brand bound to your API key, plus its extraction readiness. Singleton —
one key maps to one brand, so there is no list or id lookup.

| Method                    | HTTP                   | Scope    |
| ------------------------- | ---------------------- | -------- |
| [`get`](#get)             | `GET /v1/brand`        | `emails` |
| [`patch`](#patch)         | `PATCH /v1/brand`      | `emails` |
| [`getImages`](#getimages) | `GET /v1/brand/images` | `emails` |

`patch` is also exported as `update` (same function).

## Shared types

```ts
type Brand = {
  readonly brandId: string
  readonly domain: string
  readonly status: 'extracting' | 'completed' | 'failed' | 'deleting'
  readonly ready: boolean // true ⇔ status === 'completed'
  readonly createdAt?: string
  readonly updatedAt?: string
}
```

---

## `get`

Fetch the bound brand. Check `ready` before generating or sending — those
paths 422 (`BRAND_NOT_READY`) until extraction finishes. A deleted brand
returns `404 BRAND_NOT_FOUND`.

```ts
const { brand } = await brew.brand.get()

if (!brand.ready) {
  throw new Error(`Brand is still ${brand.status}; try again shortly.`)
}
```

Embed the design context in the same call with `include` — any subset of
`identity` (structured brand facts), `emailDesign` / `imageStyle` (the
markdown design system the email agent follows), and `logos` (the CDN logo
set). Accepts an array or a comma string; the SDK sends it as the single
comma-separated `?include=` value the API expects.

```ts
const { brand, identity, emailDesign, logos } = await brew.brand.get({
  include: ['identity', 'emailDesign', 'logos'],
})
```

## `patch`

Update the bound brand's design context. Supply at least one of `identity`
(shallow-merged onto the stored identity), `emailDesign`, or `imageStyle`
(the latter two are markdown documents that replace the whole document).
Returns the same `{ brand, ... }` envelope as `get`, echoing only the
touched fields. Also available as `brew.brand.update(...)`.

```ts
const result = await brew.brand.patch({
  identity: { tagline: 'Ship faster.' },
  emailDesign: '# Email design\n\n...',
})
```

## `getImages`

Page through the brand's saved image library — `{ data, pagination }`.
Accepts `{ limit, cursor }`.

```ts
const { data, pagination } = await brew.brand.getImages({ limit: 50 })
```
