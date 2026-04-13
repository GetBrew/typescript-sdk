# `brew.domains`

One method for listing verified sending domains.

| Method          | HTTP              |
| --------------- | ----------------- |
| [`list`](#list) | `GET /v1/domains` |

## Shared types

```ts
type Domain = {
  readonly domainId: string
  readonly domainUrl: string
}
```

The API only returns domains that are usable for sends. That means this
list is the safe source for `domainId` when you later call
`brew.sends.create(...)`.

---

## `list`

List verified sending domains for the current organization.

```ts
type ListDomainsResponse = {
  readonly domains: ReadonlyArray<Domain>
}

list(): Promise<ListDomainsResponse>
```

```ts
const { domains } = await brew.domains.list()

for (const domain of domains) {
  console.log(domain.domainId, domain.domainUrl)
}
```
