# `brew.audiences`

One method for listing saved audiences.

| Method          | HTTP                |
| --------------- | ------------------- |
| [`list`](#list) | `GET /v1/audiences` |

## Shared types

```ts
type Audience = {
  readonly audienceId: string
  readonly audienceName: string
}
```

The API returns only saved audiences. It does not include the synthetic
`All Contacts` option that can exist in app UI flows.

---

## `list`

List saved audiences for the current organization.

```ts
type ListAudiencesResponse = {
  readonly audiences: ReadonlyArray<Audience>
}

list(): Promise<ListAudiencesResponse>
```

```ts
const { audiences } = await brew.audiences.list()

for (const audience of audiences) {
  console.log(audience.audienceId, audience.audienceName)
}
```
