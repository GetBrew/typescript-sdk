import { unwrapResponse, type HttpClient } from '../../core/http'
import { serializeInclude } from '../../core/url'
import type { BrewRawResponse, RequestOptions } from '../../types'

import type { Send } from './types'

export const SENDS_INCLUDE_TOKENS = ['events'] as const
export type SendsIncludeToken = (typeof SENDS_INCLUDE_TOKENS)[number]

export type GetSendOptions = RequestOptions & {
  readonly include?: ReadonlyArray<SendsIncludeToken> | string
}

export type GetSendResponse = Send

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
    const include = serializeInclude({ include: options?.include })
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
