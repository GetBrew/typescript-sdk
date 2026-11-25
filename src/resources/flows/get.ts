import { unwrapResponse, type HttpClient } from '../../core/http'
import { serializeInclude } from '../../core/url'
import type { BrewRawResponse, RequestOptions } from '../../types'

import type { Flow } from './types'

export const FLOWS_INCLUDE_TOKENS = ['html'] as const
export type FlowsIncludeToken = (typeof FLOWS_INCLUDE_TOKENS)[number]

export type GetFlowOptions = RequestOptions & {
  readonly include?: ReadonlyArray<FlowsIncludeToken> | string
  readonly kind?: string
}

export type GetFlowResponse = Flow

export function createGetFlow(client: HttpClient) {
  function getFlow(
    slug: string,
    options: GetFlowOptions & { readonly raw: true }
  ): Promise<BrewRawResponse<GetFlowResponse>>
  function getFlow(
    slug: string,
    options?: GetFlowOptions
  ): Promise<GetFlowResponse>
  async function getFlow(
    slug: string,
    options?: GetFlowOptions
  ): Promise<GetFlowResponse | BrewRawResponse<GetFlowResponse>> {
    const include = serializeInclude({ include: options?.include })
    const slash = slug.indexOf('/')
    const domain = slash === -1 ? slug : slug.slice(0, slash)
    const kind = slash === -1 ? options?.kind : slug.slice(slash + 1)
    const query = {
      ...(include !== undefined ? { include } : {}),
      ...(kind ? { kind } : {}),
    }
    const response = await client.request<GetFlowResponse>({
      method: 'GET',
      path: `/v1/flows/${encodeURIComponent(domain)}`,
      ...(Object.keys(query).length > 0 ? { query } : {}),
      ...(options ? { options } : {}),
    })
    return unwrapResponse(response, options)
  }
  return getFlow
}
