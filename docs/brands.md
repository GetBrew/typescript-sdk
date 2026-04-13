# `brew.brands`

Two methods for creating and listing brands.

| Method              | HTTP              |
| ------------------- | ----------------- |
| [`list`](#list)     | `GET /v1/brands`  |
| [`create`](#create) | `POST /v1/brands` |

## Shared types

```ts
type Brand = {
  readonly brandId: string
  readonly brandUrl: string
}
```

Brands are design context objects that you can pass into
`brew.emails.generate(...)` as `brandId`.

---

## `list`

List completed brands for the current organization.

```ts
type ListBrandsResponse = {
  readonly brands: ReadonlyArray<Brand>
}

list(): Promise<ListBrandsResponse>
```

```ts
const { brands } = await brew.brands.list()
```

---

## `create`

Create a brand from a website URL or bare domain.

```ts
type CreateBrandInput = {
  readonly brandUrl: string
}

type CreateBrandResponse = {
  readonly brandId: string
}

create(
  input: CreateBrandInput,
  options?: RequestOptions
): Promise<CreateBrandResponse>
```

```ts
const result = await brew.brands.create({
  brandUrl: 'https://vercel.com',
})

console.log(result.brandId)
```

The Brew API waits for phase 1 brand extraction before returning, so the
returned `brandId` is ready to use immediately in email generation.
