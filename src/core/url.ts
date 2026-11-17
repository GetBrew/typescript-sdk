/**
 * Values we know how to serialize into a query string. Everything else
 * (plain objects, functions, Dates, etc.) is deliberately rejected at the
 * type level — the Brew API does not need richer query encoding, and
 * tightening the type here stops callers from passing something we would
 * have had to stringify ambiguously at runtime.
 */
export type QueryValue =
  | string
  | number
  | boolean
  | ReadonlyArray<string | number | boolean>
  | null
  | undefined

export type BuildUrlInput = {
  readonly baseUrl: string
  readonly path: string
  readonly pathParams?: Readonly<Record<string, string | number>>
  readonly query?: Readonly<Record<string, QueryValue>>
}

/**
 * Build a fully-qualified request URL from a base, a path template, and
 * optional path/query params. Pure — no fetch, no side effects. Used by
 * the transport layer and also unit-testable in isolation.
 */
export function buildUrl(input: BuildUrlInput): string {
  const { baseUrl, path, pathParams, query } = input

  const resolvedPath = substitutePathParams({ path, pathParams })
  const joined = joinBaseAndPath({ baseUrl, path: resolvedPath })
  const queryString = serializeQuery(query)

  return queryString === '' ? joined : `${joined}?${queryString}`
}

/**
 * Replace every `:token` in the path with the URL-encoded value from
 * `pathParams`. Throws if the path contains a token that was not provided,
 * so bugs like `/v1/contacts/:email` without an email fail loudly at the
 * call site instead of producing a silently broken URL.
 */
function substitutePathParams({
  path,
  pathParams,
}: {
  readonly path: string
  readonly pathParams: BuildUrlInput['pathParams']
}): string {
  if (!pathParams) {
    assertNoUnresolvedParams({ path })
    return path
  }

  let resolved = path
  for (const [key, value] of Object.entries(pathParams)) {
    const token = `:${key}`
    resolved = resolved.replaceAll(token, encodeURIComponent(String(value)))
  }

  assertNoUnresolvedParams({ path: resolved })
  return resolved
}

function assertNoUnresolvedParams({ path }: { readonly path: string }): void {
  const leftover = /:([a-zA-Z_][a-zA-Z0-9_]*)/.exec(path)
  if (leftover) {
    throw new Error(
      `buildUrl: missing path param "${leftover[1] ?? ''}" in path "${path}"`
    )
  }
}

/**
 * Join base and path with exactly one separating slash, regardless of
 * whether either side includes its own slash.
 */
function joinBaseAndPath({
  baseUrl,
  path,
}: {
  readonly baseUrl: string
  readonly path: string
}): string {
  const trimmedBase = baseUrl.replace(/\/+$/, '')
  const trimmedPath = path.replace(/^\/+/, '')
  return `${trimmedBase}/${trimmedPath}`
}

/**
 * Serialize an `include` option into the single comma-separated value the
 * API's `?include=` takes. Every detail read that accepts expansions types
 * `include` as an array of its tokens or a pre-joined comma string; this
 * joins an array with commas and passes a string through unchanged. An
 * empty array or string returns `undefined`, so the request sends no
 * `include` at all (the query builder skips `undefined`). Tokens are not
 * trimmed, deduplicated or validated: the API answers an unknown token with
 * `400 INVALID_REQUEST`.
 */
export function serializeInclude({
  include,
}: {
  readonly include: ReadonlyArray<string> | string | undefined
}): string | undefined {
  if (include === undefined) return undefined
  const joined = typeof include === 'string' ? include : include.join(',')
  return joined.length > 0 ? joined : undefined
}

/**
 * Serialize a query object into an `application/x-www-form-urlencoded`
 * string. Skips `undefined`/`null` values, serializes arrays as repeated
 * keys, and defers encoding to `URLSearchParams` for correctness.
 */
function serializeQuery(query: BuildUrlInput['query'] | undefined): string {
  if (!query) return ''

  const params = new URLSearchParams()

  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null) continue

    if (Array.isArray(value)) {
      for (const item of value) {
        params.append(key, String(item))
      }
      continue
    }

    params.append(key, String(value))
  }

  return params.toString()
}
