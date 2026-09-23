import { unwrapResponse, type HttpClient } from '../../core/http'
import type { BrewRawResponse, RequestOptions } from '../../types'

import type { Send } from './types'

/** The one expansion `GET /v1/sends/{sendId}` accepts. */
export type SendsIncludeToken = 'events'

/**
 * Per-request options for `brew.sends.get(...)` — the standard
 * `RequestOptions` plus the detail-only `include` expansion.
 */
export type GetSendOptions = RequestOptions & {
  /**
   * `'events'` attaches a bounded first page of the send's
   * per-recipient analytics events to the row. Accepts an array of
   * tokens or a comma string.
   */
  readonly include?: ReadonlyArray<SendsIncludeToken> | string
}

/** `GET /v1/sends/{sendId}` returns the BARE `Send` row. */
export type GetSendResponse = Send

/** Serialize the `include` option into the API's comma-separated form. */
function serializeInclude(
  include: GetSendOptions['include']
): string | undefined {
  if (include === undefined) return undefined
  const joined = typeof include === 'string' ? include : include.join(',')
  return joined.length > 0 ? joined : undefined
}

/**
 * `GET /v1/sends/{sendId}` (scope: `sends`) — one send, returned as the
 * BARE row (no `{ data }` envelope). This is the real detail read that
 * replaced the old `analytics.sends.list({ sendId })` single-row-page
 * trick; a `sendId` query filter on `GET /v1/sends` now `400`s.
 *
 * Pass `include: 'events'` for a bounded first page of the send's
 * per-recipient analytics events inlined on the row. An unknown or
 * cross-brand `sendId` is `404 SEND_NOT_FOUND` — it is no longer an
 * empty page you have to test for.
 *
 * Pass `{ raw: true }` in `options` to receive the full
 * `BrewRawResponse<GetSendResponse>` instead of the unwrapped row.
 */
export function createGetSend(client: HttpClient) {
  function getSend(
    sendId: string,
    options: GetSendOptions & { readonly raw: true }
  ): Promise<BrewRawResponse<GetSendResponse>>
  function getSend(
    sendId: string,
    options?: GetSendOptions
  ): Promise<GetSendResponse>
  async function getSend(
    sendId: string,
    options?: GetSendOptions
  ): Promise<GetSendResponse | BrewRawResponse<GetSendResponse>> {
    const include = serializeInclude(options?.include)
    const response = await client.request<GetSendResponse>({
      method: 'GET',
      path: `/v1/sends/${encodeURIComponent(sendId)}`,
      ...(include !== undefined ? { query: { include } } : {}),
      ...(options ? { options } : {}),
    })
    return unwrapResponse(response, options)
  }
  return getSend
}
