import { createHash } from 'node:crypto'

import { HttpResponse, http } from 'msw'

import { type BrewClient, createBrewClient } from '../../src/index'
import { server } from '../msw/server'

export const baseUrl = 'https://brew.new/api'

/** A real client with retries off, so an error answer surfaces at once. */
export function testClient(): BrewClient {
  return createBrewClient({
    apiKey: 'brew_test_adapters',
    baseUrl,
    maxRetries: 0,
  })
}

/** One by-key fire as the API received it. */
export type CapturedFire = {
  readonly key: string
  readonly payload: Record<string, unknown>
  readonly idempotencyKey: string | null
}

export function acceptedFire(triggerKey: string, index = 0) {
  return {
    triggerInstanceId: `tin_${index}`,
    triggerEventId: 'tri_adapter',
    triggerKey,
    status: 'triggered',
    automationRunIds: [`run_${index}`],
    publishedAutomations: [{ automationId: 'auto_adapter' }],
    counts: { automations: 1, skipped: 0 },
    warnings: [],
    receivedAt: '2026-10-13T08:00:00.000Z',
  }
}

/**
 * Accept every `POST /v1/automations/triggers/by-key/{key}/fire` and record
 * it, in arrival order. `respond` overrides the answer for one fire.
 */
export function captureFires(
  respond?: (fire: CapturedFire, index: number) => Response | undefined
): Array<CapturedFire> {
  const fires: Array<CapturedFire> = []
  server.use(
    http.post(
      `${baseUrl}/v1/automations/triggers/by-key/:key/fire`,
      async ({ request, params }) => {
        const body = (await request.json()) as {
          payload: Record<string, unknown>
        }
        const fire: CapturedFire = {
          key: decodeURIComponent(String(params['key'])),
          payload: body.payload,
          idempotencyKey: request.headers.get('idempotency-key'),
        }
        const index = fires.length
        fires.push(fire)
        return (
          respond?.(fire, index) ??
          HttpResponse.json(acceptedFire(fire.key, index), { status: 202 })
        )
      }
    )
  )
  return fires
}

/** The API's `{ error }` envelope. */
export function apiError(
  status: number,
  code: string,
  type = 'invalid_request',
  message = `${code} from the test server.`
): Response {
  return HttpResponse.json(
    {
      error: {
        code,
        type,
        message,
        suggestion: 'Test suggestion.',
        docs: 'https://docs.brew.new/api-reference/api/errors',
      },
    },
    { status, headers: { 'x-request-id': `req_${code.toLowerCase()}` } }
  )
}

/** `${key}:${sha256(parts.join('\n'))}` computed independently of the SDK. */
export function expectedIdempotencyKey(
  key: string,
  ...parts: ReadonlyArray<string>
): string {
  return `${key}:${createHash('sha256').update(parts.join('\n')).digest('hex')}`
}
