/**
 * Keeping a credential-bearing URL out of the errors the SDK builds.
 *
 * An image upload's `uploadUrl` carries its bearer token in the query
 * (`?uploadId=…&token=<64 hex>`), and error objects end up in logs. A
 * transport error built for such a URL reports the URL without its query,
 * and its `cause` chain is a redacted copy: a `fetch` (or a wrapper around
 * it) may name the URL it was given in its own message.
 */

/** Replaces every credential-bearing string a redactor knows. */
export type Redactor = (text: string) => string

const REDACTED = '[redacted]'

/**
 * A query value at least this long is treated as a secret wherever it
 * appears on its own. Shorter values (`1`, `png`) would redact ordinary
 * words; the upload token is 64 characters and the upload id 27.
 */
const MIN_SECRET_LENGTH = 8

/** How deep a `cause` chain is copied; anything deeper is dropped. */
const MAX_CAUSE_DEPTH = 5

/** `token=…` in any query, whatever URL it belongs to. */
const TOKEN_PARAMETER = /([?&]token=)[^&#\s"'<>]+/gi

/** `url` without its query string or fragment. */
export function withoutQuery({ url }: { readonly url: string }): string {
  try {
    const parsed = new URL(url)
    return `${parsed.origin}${parsed.pathname}`
  } catch {
    return url.split(/[?#]/)[0] ?? ''
  }
}

/**
 * A redactor for `url`: the whole URL becomes its path plus `?[redacted]`,
 * and its raw query, and each long query value (raw and percent-encoded),
 * become `[redacted]` wherever else they appear. Any `token=` parameter is
 * redacted too.
 */
export function credentialRedactor({
  url,
}: {
  readonly url: string
}): Redactor {
  const replacements = credentialStrings({ url })
  return (text) => {
    let redacted = text
    for (const [secret, replacement] of replacements) {
      redacted = redacted.replaceAll(secret, replacement)
    }
    return redacted.replace(TOKEN_PARAMETER, `$1${REDACTED}`)
  }
}

/** `[secret, replacement]` pairs for `url`, longest secret first. */
function credentialStrings({
  url,
}: {
  readonly url: string
}): ReadonlyArray<readonly [string, string]> {
  const base = withoutQuery({ url })
  const pairs: Array<readonly [string, string]> = [[url, `${base}?${REDACTED}`]]
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return pairs
  }
  if (parsed.href !== url) pairs.push([parsed.href, `${base}?${REDACTED}`])
  if (parsed.search.length > 1) pairs.push([parsed.search.slice(1), REDACTED])
  for (const value of parsed.searchParams.values()) {
    if (value.length < MIN_SECRET_LENGTH) continue
    pairs.push([value, REDACTED])
    const encoded = encodeURIComponent(value)
    if (encoded !== value) pairs.push([encoded, REDACTED])
  }
  return pairs.sort(([a], [b]) => b.length - a.length)
}

/**
 * A copy of a thrown value with every string `redact` knows replaced: an
 * `Error`'s `message`, `stack` and `cause` chain (its `name` and string
 * `code` are kept, so a runtime timeout is still recognised), a plain
 * object's string fields, or a string. Anything else is returned as is.
 */
export function redactThrown({
  value,
  redact,
  depth = 0,
}: {
  readonly value: unknown
  readonly redact: Redactor
  readonly depth?: number
}): unknown {
  if (typeof value === 'string') return redact(value)
  if (value instanceof Error)
    return redactError({ error: value, redact, depth })
  if (isRecord(value)) return redactRecord({ record: value, redact, depth })
  return value
}

function redactError({
  error,
  redact,
  depth,
}: {
  readonly error: Error
  readonly redact: Redactor
  readonly depth: number
}): Error {
  const cause =
    error.cause === undefined || depth >= MAX_CAUSE_DEPTH
      ? undefined
      : redactThrown({ value: error.cause, redact, depth: depth + 1 })
  const copy = new Error(
    redact(error.message),
    cause === undefined ? undefined : { cause }
  )
  copy.name = error.name
  if (error.stack !== undefined) copy.stack = redact(error.stack)
  if ('code' in error && typeof error.code === 'string') {
    Object.defineProperty(copy, 'code', {
      value: error.code,
      enumerable: true,
      configurable: true,
      writable: true,
    })
  }
  return copy
}

function redactRecord({
  record,
  redact,
  depth,
}: {
  readonly record: Record<string, unknown>
  readonly redact: Redactor
  readonly depth: number
}): Record<string, unknown> {
  const copy: Record<string, unknown> = {}
  for (const [key, field] of Object.entries(record)) {
    if (depth >= MAX_CAUSE_DEPTH) {
      copy[key] = typeof field === 'string' ? redact(field) : undefined
      continue
    }
    copy[key] = redactThrown({ value: field, redact, depth: depth + 1 })
  }
  return copy
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
