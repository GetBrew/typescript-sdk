import { unwrapResponse, type HttpClient } from '../../core/http'
import type { components } from '../../generated/openapi-types'
import type { BrewRawResponse, RequestOptions } from '../../types'

export type GetDomainHealthInput = {
  readonly domainId: string
}
export type GetDomainHealthResponse = components['schemas']['DomainHealth']

/**
 * `GET /v1/domains/{domainId}/health` — aggregate deliverability health,
 * authentication, reputation, warmup, placement, and actionable signals.
 */
export function createGetDomainHealth(client: HttpClient) {
  function getDomainHealth(
    input: GetDomainHealthInput,
    options: RequestOptions & { readonly raw: true }
  ): Promise<BrewRawResponse<GetDomainHealthResponse>>
  function getDomainHealth(
    input: GetDomainHealthInput,
    options?: RequestOptions
  ): Promise<GetDomainHealthResponse>
  async function getDomainHealth(
    input: GetDomainHealthInput,
    options?: RequestOptions
  ): Promise<
    GetDomainHealthResponse | BrewRawResponse<GetDomainHealthResponse>
  > {
    const response = await client.request<GetDomainHealthResponse>({
      method: 'GET',
      path: `/v1/domains/${encodeURIComponent(input.domainId)}/health`,
      ...(options ? { options } : {}),
    })
    return unwrapResponse(response, options)
  }
  return getDomainHealth
}
