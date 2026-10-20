# Brands (organization lifecycle)

`brew.brands.*` manages the brands themselves. This
**organization-level** resource acts across the organization and
sends no `X-Brand-Id`.

Not to be confused with [`brew.brand.*`](./brand.md) (singular), which reads
the design context — identity, design system, logos — of whichever brand the
current request acts on.

## Key scope

An API key is scoped either to **one brand** or to the whole **organization**.

|                    | brand-scoped key           | organization-scoped key            |
| ------------------ | -------------------------- | ---------------------------------- |
| brand resolution   | automatic                  | you name one per request           |
| `brands.list()`    | returns just its own brand | returns every brand                |
| `brands.create()`  | `403 ORG_SCOPE_REQUIRED`   | allowed (needs the `brands` scope) |
| brand-scoped calls | work as-is                 | need `X-Brand-Id`                  |

There is **no default brand**. An organization-scoped key that names none gets
`400 BRAND_ID_REQUIRED` — deliberately, so a missing brand can never be
silently guessed into a send from the wrong one.

Pin a brand with `withBrand`:

```ts
import { createBrewClient } from '@brew.new/sdk'

const brew = createBrewClient({ apiKey: process.env.BREW_API_KEY! })

const { data: brands } = await brew.brands.list()
const acme = brew.withBrand(brands[0]!.brandId)

await acme.emails.list() // sends X-Brand-Id
```

`withBrand` returns a **new** client with the same auth, transport and tuning —
it does not mutate the original, so you can hold several at once:

```ts
const [a, b] = brands.map((brand) => brew.withBrand(brand.brandId))
await Promise.all([a.emails.list(), b.emails.list()])
```

You can also pin once at construction: `createBrewClient({ apiKey, brandId })`.

## `brands.list(input?)`

`GET /v1/brands` — authenticated discovery; no feature scope is required.

```ts
const { data, pagination } = await brew.brands.list({ status: 'completed' })
```

| field             | type                                                    | notes                          |
| ----------------- | ------------------------------------------------------- | ------------------------------ |
| `status`          | `'extracting' \| 'completed' \| 'failed' \| 'deleting'` | optional filter                |
| `limit`, `cursor` | pagination                                              | loop `while (cursor !== null)` |

## `brands.create(input)`

`POST /v1/brands` — scope `brands`, **organization-scoped keys only**.

Starts an asynchronous extraction that crawls the site and builds the design
system. Returns `201` immediately with `status: 'extracting'`; the crawl takes
**1–3 minutes**.

```ts
const { brandId, status, extraction } = await brew.brands.create({
  url: 'acme.com',
  instructions:
    'Use the product pages for tone. Primary colour is the header navy.',
})
```

> **Changed in 10.0.0.** The brand row is FLAT on every brand response —
> there is no `{ brand: … }` wrapper. `result.brand.ready` is now
> `result.ready`.

| field               | type        | notes                               |
| ------------------- | ----------- | ----------------------------------- |
| `url`               | `string`    | website URL or bare domain          |
| `instructions`      | `string?`   | free text, treated as authoritative |
| `includePaths`      | `string[]?` | extra pages to read                 |
| `excludePaths`      | `string[]?` | pages to skip                       |
| `excludeSubdomains` | `string[]?` | subdomains to skip                  |

Extraction requires a non-empty credit balance but is **not itself charged** to
your credits.

Errors worth branching on:

| code                    | status | meaning                                             |
| ----------------------- | ------ | --------------------------------------------------- |
| `ORG_SCOPE_REQUIRED`    | 403    | the key is bound to one brand                       |
| `BRAND_DOMAIN_CONFLICT` | 409    | this org already has a brand for that domain        |
| `BRAND_LIMIT_REACHED`   | 402    | at the plan cap; see `details.{used,limit,planKey}` |

## `brands.get(input)`

`GET /v1/brands/{brandId}` — authenticated lifecycle read; no feature scope is
required. Read one status snapshot without waiting:

```ts
const brand = await brew.brands.get({ brandId })
console.log(brand.status, brand.ready, brand.progress, brand.error)
```

While extracting, `progress` (0–100) and `phase` are present; on failure,
`error` is. **Wait for `ready` before calling `emails.generate(...)`**, which
returns `422 BRAND_NOT_READY` until then.

An unknown brand, one in another organization, and one being deleted are all
`404 BRAND_NOT_FOUND` — indistinguishable on purpose, so brand ids in other
organizations cannot be probed.

## `brands.waitForExtraction(brandId, options?)`

**Available in the next SDK release; not included in npm version 12.3.0.**
Until that release, poll `brands.get({ brandId })` from a worker or your app's
status endpoint.

Wait for an existing brand's extraction to end without writing a polling loop:

```ts
const controller = new AbortController()
const created = await brew.brands.create({ url: 'https://example.com' })
const brand = await brew.brands.waitForExtraction(created.brandId, {
  maxWaitMs: 300_000,
  pollIntervalMs: 5_000,
  signal: controller.signal,
})
if (!brand.ready) throw new Error(brand.error ?? `Brand is ${brand.status}`)
const customer = brew.withBrand(brand.brandId)
```

The helper reads immediately, then waits five seconds between status reads by
default. It returns the actual lifecycle row as soon as `status` is no longer
`extracting`, including `failed`, `deleting`, or a `completed` row whose `ready`
flag is false. Always check `ready` before generating. If deletion makes the
brand unavailable, the API's `404 BRAND_NOT_FOUND` still propagates.

The only options are `maxWaitMs`, `pollIntervalMs`, and `signal`. The total
deadline defaults to five minutes and includes HTTP attempts, retries,
backoff and polling sleeps. Both durations must be positive whole numbers no
larger than 2,147,483,647 milliseconds. The client's HTTP timeout and retry
settings apply to every status read.

An elapsed total deadline throws `BrewBrandExtractionTimeoutError` with
`brandId`, `maxWaitMs`, and `lastStatus` (the latest observed row, or
`undefined` if no read completed). Extraction continues on the server: keep
the saved brand ID and check its status later. Ordinary API/transport errors
are preserved. A per-wait or client-wide abort interrupts reads and sleeps
with its original `reason`.

This helper returns lifecycle data, without a `raw` response option. Use
`brands.get({ brandId }, { raw: true })` when you need HTTP metadata.

## Deleting a brand

Not exposed. Deleting a brand cascades across ~55 tables plus search indexes
and blob storage, and a brand-scoped credential deleting its own brand would
revoke itself mid-request. Do it from the Brew dashboard.
