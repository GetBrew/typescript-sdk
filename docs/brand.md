# `brew.brand`

The brand bound to your API key, plus its extraction readiness. Singleton —
one key maps to one brand, so there is no list or id lookup.

| Method        | HTTP            | Scope    |
| ------------- | --------------- | -------- |
| [`get`](#get) | `GET /v1/brand` | `emails` |

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
