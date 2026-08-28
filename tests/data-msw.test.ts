import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'

import { createBrewClient } from '../src/index'

import { server } from './msw/server'

function client() {
  return createBrewClient({
    apiKey: 'brew_test_key',
    brandId: 'brand_data_test',
  })
}

/**
 * `POST /v1/data` — the unified `db …` command surface. Contract-level
 * coverage: the request body carries `{ command }`, the response unwraps
 * to `{ exitCode, output, truncated }`, and a FAILED command is still an
 * HTTP 200 the SDK must NOT throw on (`exitCode !== 0` + message in
 * `output` — the caller reads and adjusts).
 */
describe('data.run', () => {
  it('posts the command and unwraps the result', async () => {
    let body: unknown = null
    server.use(
      http.post('https://brew.new/api/v1/data', async ({ request }) => {
        body = await request.json()
        return HttpResponse.json(
          {
            exitCode: 0,
            output: '{"name":"Newsletter VIPs"}\n\n[stderr]\n# 1 row(s)',
            truncated: false,
          },
          { status: 200, headers: { 'x-request-id': 'req_data_1' } }
        )
      })
    )

    const result = await client().data.run({
      command: 'db find audiences --fields name --limit 1',
    })
    expect(body).toEqual({
      command: 'db find audiences --fields name --limit 1',
    })
    expect(result.exitCode).toBe(0)
    expect(result.output).toContain('Newsletter VIPs')
    expect(result.truncated).toBe(false)
  })

  it('a failed command (exitCode 1) resolves — it is not an HTTP error', async () => {
    server.use(
      http.post('https://brew.new/api/v1/data', () =>
        HttpResponse.json(
          {
            exitCode: 1,
            output:
              "[stderr]\ndb: patch on 'emails' is owned by a domain tool — use: manageEmails",
            truncated: false,
          },
          { status: 200, headers: { 'x-request-id': 'req_data_2' } }
        )
      )
    )
    const result = await client().data.run({
      command: 'db set emails:x --patch {}',
    })
    expect(result.exitCode).toBe(1)
    expect(result.output).toContain('manageEmails')
  })
})
