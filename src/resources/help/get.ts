import { unwrapResponse, type HttpClient } from '../../core/http'
import type { BrewRawResponse, RequestOptions } from '../../types'

import type { HelpResponse } from './types'

export type { HelpResponse }

export type GetHelpResponse = HelpResponse

export function createGetHelp(client: HttpClient) {
  function getHelp(
    options: RequestOptions & { readonly raw: true }
  ): Promise<BrewRawResponse<GetHelpResponse>>
  function getHelp(options?: RequestOptions): Promise<GetHelpResponse>
  async function getHelp(
    options?: RequestOptions
  ): Promise<GetHelpResponse | BrewRawResponse<GetHelpResponse>> {
    const response = await client.request<GetHelpResponse>({
      method: 'GET',
      path: '/v1/help',
      ...(options ? { options } : {}),
    })
    return unwrapResponse(response, options)
  }
  return getHelp
}
