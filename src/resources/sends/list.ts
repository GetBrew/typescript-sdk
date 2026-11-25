import { autoPaginate, pageReadOptions } from '../../core/pagination'
import { unwrapResponse, type HttpClient } from '../../core/http'
import type { BrewRawResponse, RequestOptions } from '../../types'

import type { ListSendsInput, Send, SendsListResponse } from './types'

export type { ListSendsInput, SendsListResponse }

export function createListSends(client: HttpClient) {
  function listSends(
    input: ListSendsInput | undefined,
    options: RequestOptions & { readonly raw: true }
  ): Promise<BrewRawResponse<SendsListResponse>>
  function listSends(
    input?: ListSendsInput,
    options?: RequestOptions
  ): Promise<SendsListResponse>
  async function listSends(
    input: ListSendsInput = {},
    options?: RequestOptions
  ): Promise<SendsListResponse | BrewRawResponse<SendsListResponse>> {
    const response = await client.request<SendsListResponse>({
      method: 'GET',
      path: '/v1/sends',
      query: {
        emailId: input.emailId,
        kind: input.kind,
        automationId: input.automationId,
        automationRunId: input.automationRunId,
        audienceRunId: input.audienceRunId,
        triggerInstanceId: input.triggerInstanceId,
        status: input.status,
        messageClass: input.messageClass,
        from: input.from,
        to: input.to,
        limit: input.limit,
        cursor: input.cursor,
      },
      ...(options ? { options } : {}),
    })
    return unwrapResponse(response, options)
  }
  return listSends
}

export type ListAllSendsInput = Readonly<Omit<ListSendsInput, 'cursor'>>

export function createListAllSends(client: HttpClient) {
  const list = createListSends(client)

  return function listAllSends(
    input: ListAllSendsInput = {},
    options?: RequestOptions
  ): AsyncGenerator<Send, void, void> {
    return autoPaginate<Send>(
      async (cursor) => {
        const pageInput: ListSendsInput = {
          ...input,
          ...(cursor !== null ? { cursor } : {}),
        }
        const response = await list(pageInput, pageReadOptions({ options }))
        return { items: response.data, pagination: response.pagination }
      },
      options?.signal ? { signal: options.signal } : undefined
    )
  }
}
