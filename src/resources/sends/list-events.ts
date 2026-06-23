import { autoPaginate } from '../../core/pagination'
import { unwrapResponse, type HttpClient } from '../../core/http'
import type { BrewRawResponse, RequestOptions } from '../../types'

import type {
  ListSendEventsInput,
  SendEvent,
  SendEventsResponse,
} from './types'

export type { ListSendEventsInput, SendEventsResponse }

/**
 * Input to `brew.sends.listEvents(...)`. The `sendId` is sent on the URL
 * path; `eventType` filters the feed and `limit`/`cursor` page it.
 */
export type ListSendEventsForSendInput = ListSendEventsInput & {
  /**
   * The send whose per-recipient event feed to read. Cross-brand or
   * unknown ids surface as `404 SEND_NOT_FOUND` from the server.
   */
  readonly sendId: string
}

/**
 * `GET /v1/sends/{sendId}/events` — per-recipient analytics event feed
 * for one send under `{ data, pagination }`
 * (`sent | delivered | opened | clicked | bounced | complained |
 * unsubscribed`), each with `occurredAt`, `recipientEmail`, and the
 * click `url` when known. Requires the `emails` scope.
 *
 * Filter with `eventType`. Uses a native feed cursor (longer than list
 * cursors). To page through every event use `brew.sends.listAllEvents`.
 *
 * Pass `{ raw: true }` in `options` to receive the full
 * `BrewRawResponse<SendEventsResponse>` instead of the unwrapped
 * envelope.
 */
export function createListSendEvents(client: HttpClient) {
  function listSendEvents(
    input: ListSendEventsForSendInput,
    options: RequestOptions & { readonly raw: true }
  ): Promise<BrewRawResponse<SendEventsResponse>>
  function listSendEvents(
    input: ListSendEventsForSendInput,
    options?: RequestOptions
  ): Promise<SendEventsResponse>
  async function listSendEvents(
    input: ListSendEventsForSendInput,
    options?: RequestOptions
  ): Promise<SendEventsResponse | BrewRawResponse<SendEventsResponse>> {
    const { sendId, ...query } = input
    const response = await client.request<SendEventsResponse>({
      method: 'GET',
      path: `/v1/sends/${encodeURIComponent(sendId)}/events`,
      query: {
        eventType: query.eventType,
        limit: query.limit,
        cursor: query.cursor,
      },
      ...(options ? { options } : {}),
    })
    return unwrapResponse(response, options)
  }
  return listSendEvents
}

/**
 * Input to `brew.sends.listAllEvents(...)`. Same as
 * `ListSendEventsForSendInput` minus `cursor` — the iterator owns cursor
 * state internally. `limit` is the per-page size, not a total cap.
 */
export type ListAllSendEventsInput = Readonly<
  Omit<ListSendEventsForSendInput, 'cursor'>
>

/**
 * Async iterator over `GET /v1/sends/{sendId}/events` that pages through
 * every event of one send, yielding one `SendEvent` at a time. Follows
 * `pagination.cursor` until `hasMore` is `false`; honors `options.signal`
 * between pages.
 *
 * ```ts
 * for await (const ev of brew.sends.listAllEvents({ sendId: 'snd_x' })) {
 *   console.log(ev.eventType, ev.recipientEmail)
 * }
 * ```
 */
export function createListAllSendEvents(client: HttpClient) {
  const list = createListSendEvents(client)

  return function listAllSendEvents(
    input: ListAllSendEventsInput,
    options?: RequestOptions
  ): AsyncGenerator<SendEvent, void, void> {
    return autoPaginate<SendEvent>(
      async (cursor) => {
        const pageInput: ListSendEventsForSendInput = {
          ...input,
          ...(cursor !== null ? { cursor } : {}),
        }
        const response = await list(pageInput, options)
        return { items: response.data, pagination: response.pagination }
      },
      options?.signal ? { signal: options.signal } : undefined
    )
  }
}
