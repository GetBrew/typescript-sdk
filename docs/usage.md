# `brew.usage`

Read-only API usage for the organization behind your key.

| Method        | HTTP            | Scope    |
| ------------- | --------------- | -------- |
| [`get`](#get) | `GET /v1/usage` | `emails` |

---

## `get`

Returns three views of API usage:

- `overview` — rolling 24h totals (`requests`, `successRate` 0–100, `errors`,
  `rateLimited`).
- `trend` — 30 daily points (`date`, `requests`, `errors`).
- `routes` — per-route rollup over the last 7 days (`route`, `requests`,
  `successRate`, `topErrorCode`).

```ts
const { usage } = await brew.usage.get()

console.log(
  `24h: ${usage.overview.requests} reqs, ${usage.overview.successRate}% ok`
)

for (const route of usage.routes) {
  console.log(route.route, route.requests, route.topErrorCode ?? 'no errors')
}
```
