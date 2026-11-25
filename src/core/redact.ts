export type Redactor = (text: string) => string

const REDACTED = '[redacted]'

const MIN_SECRET_LENGTH = 8

const MAX_CAUSE_DEPTH = 5

const TOKEN_PARAMETER = /([?&]token=)[^&#\s"'<>]+/gi

export function withoutQuery({ url }: { readonly url: string }): string {
  try {
    const parsed = new URL(url)
    return `${parsed.origin}${parsed.pathname}`
  } catch {
    return url.split(/[?#]/)[0] ?? ''
  }
}

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
