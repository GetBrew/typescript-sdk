import type { createFireTriggerByKey } from './resources/automations/triggers/fire-by-key'
import type {
  BrewSend,
  BrewSendKey,
  BrewSendPayloadFor,
  BrewSendResponse,
} from './send-registry'
import type { BrewRawResponse, RequestOptions } from './types'

function isPayloadObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/**
 * Build `brew.send` on top of the client's `automations.triggers.fireByKey`,
 * so it shares that client's transport, brand pin, retries and idempotency.
 */
export function createSend(
  fireByKey: ReturnType<typeof createFireTriggerByKey>
): BrewSend {
  function send<TKey extends BrewSendKey>(
    key: TKey,
    payload: BrewSendPayloadFor<TKey>,
    options: RequestOptions & { readonly raw: true }
  ): Promise<BrewRawResponse<BrewSendResponse>>
  function send<TKey extends BrewSendKey>(
    key: TKey,
    payload: BrewSendPayloadFor<TKey>,
    options?: RequestOptions
  ): Promise<BrewSendResponse>
  async function send(
    key: string,
    payload: unknown,
    options?: RequestOptions
  ): Promise<BrewSendResponse | BrewRawResponse<BrewSendResponse>> {
    if (!isPayloadObject(payload)) {
      throw new TypeError(
        'send: `payload` must be an object carrying at least the recipient `email`.'
      )
    }
    return fireByKey({ triggerKey: key, payload }, options)
  }
  return send
}
