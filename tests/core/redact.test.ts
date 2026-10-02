import { inspect } from 'node:util'

import { describe, expect, it } from 'vitest'

import {
  credentialRedactor,
  redactThrown,
  withoutQuery,
} from '../../src/core/redact'

const TOKEN = '0123456789abcdef'.repeat(4)
const BASE = 'https://uploads.brew.test/brand-image-upload'
const URL_WITH_TOKEN = `${BASE}?uploadId=imgup_abcdefghijklmnopqrstu&token=${TOKEN}`

describe('credentialRedactor', () => {
  const redact = credentialRedactor({ url: URL_WITH_TOKEN })

  it('keeps the path of the URL and redacts its query', () => {
    expect(redact(`POST ${URL_WITH_TOKEN} failed`)).toBe(
      `POST ${BASE}?[redacted] failed`
    )
  })

  it('redacts the token wherever it appears on its own', () => {
    expect(redact(`{"token":"${TOKEN}"}`)).toBe('{"token":"[redacted]"}')
    expect(redact(`token=${TOKEN}`)).toBe('token=[redacted]')
  })

  it('redacts any token= parameter, even of another URL', () => {
    expect(redact('https://elsewhere.test/x?a=1&token=abc123')).toBe(
      'https://elsewhere.test/x?a=1&token=[redacted]'
    )
  })

  it('leaves short query values alone', () => {
    const short = credentialRedactor({ url: `${BASE}?kind=png` })
    expect(short(`a png named kind`)).toBe('a png named kind')
  })

  it('tolerates a URL it cannot parse', () => {
    const odd = credentialRedactor({ url: 'not a url?token=secret-value' })
    expect(odd('sent not a url?token=secret-value')).toBe(
      'sent not a url?[redacted]'
    )
    expect(withoutQuery({ url: 'not a url?token=x' })).toBe('not a url')
  })
})

describe('redactThrown', () => {
  const redact = credentialRedactor({ url: URL_WITH_TOKEN })

  it('copies an error chain with its names and codes, minus the token', () => {
    const root = new Error(`connect to ${URL_WITH_TOKEN}`)
    Object.defineProperty(root, 'code', {
      value: 'ECONNRESET',
      enumerable: true,
    })
    const thrown = new TypeError(`fetch ${URL_WITH_TOKEN}`, { cause: root })

    const copy = redactThrown({ value: thrown, redact }) as Error

    expect(copy).not.toBe(thrown)
    expect(copy.name).toBe('TypeError')
    expect((copy.cause as Error & { code?: unknown }).code).toBe('ECONNRESET')
    expect(inspect(copy, { depth: 10 })).not.toContain(TOKEN)
  })

  it('redacts a string or a plain-object cause', () => {
    expect(redactThrown({ value: `at ${URL_WITH_TOKEN}`, redact })).toBe(
      `at ${BASE}?[redacted]`
    )
    const copy = redactThrown({
      value: {
        message: `at ${URL_WITH_TOKEN}`,
        code: 'X',
        nested: { token: TOKEN },
      },
      redact,
    })
    expect(JSON.stringify(copy)).not.toContain(TOKEN)
    expect(copy).toMatchObject({ code: 'X' })
  })

  it('drops a cause chain deeper than it copies', () => {
    let error = new Error(`deepest ${URL_WITH_TOKEN}`)
    for (let level = 0; level < 10; level++) {
      error = new Error(`level ${String(level)}`, { cause: error })
    }

    const copy = redactThrown({ value: error, redact })

    expect(inspect(copy, { depth: 20 })).not.toContain(TOKEN)
  })

  it('returns anything else as is', () => {
    expect(redactThrown({ value: 42, redact })).toBe(42)
    expect(redactThrown({ value: undefined, redact })).toBeUndefined()
  })
})
