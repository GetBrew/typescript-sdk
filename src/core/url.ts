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

export function buildUrl(input: BuildUrlInput): string {
  const { baseUrl, path, pathParams, query } = input

  const resolvedPath = substitutePathParams({ path, pathParams })
  const joined = joinBaseAndPath({ baseUrl, path: resolvedPath })
  const queryString = serializeQuery(query)

  return queryString === '' ? joined : `${joined}?${queryString}`
}

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

export function serializeInclude({
  include,
}: {
  readonly include: ReadonlyArray<string> | string | undefined
}): string | undefined {
  if (include === undefined) return undefined
  const joined = typeof include === 'string' ? include : include.join(',')
  return joined.length > 0 ? joined : undefined
}

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
