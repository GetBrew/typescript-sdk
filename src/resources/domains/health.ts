import { unwrapResponse, type HttpClient } from '../../core/http'
import { serializeInclude } from '../../core/url'
import type { operations } from '../../generated/openapi-types'
import type { BrewRawResponse, RequestOptions } from '../../types'

export const DOMAIN_HEALTH_INCLUDE_TOKENS = [
  'scoreHistory',
  'scoreRuns',
] as const
export type DomainHealthIncludeToken =
  (typeof DOMAIN_HEALTH_INCLUDE_TOKENS)[number]

export type GetDomainHealthInput = {
  readonly domainId: string
  readonly include?: ReadonlyArray<DomainHealthIncludeToken> | string
}

export type GetDomainHealthResponse =
  operations['getDomainHealth']['responses'][200]['content']['application/json']

export type DomainScoreSnapshot = NonNullable<
  GetDomainHealthResponse['scoreHistory']
>[number]

export type DomainScoreRun = NonNullable<
  GetDomainHealthResponse['scoreRuns']
>[number]

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
      query: { include: serializeInclude({ include: input.include }) },
      ...(options ? { options } : {}),
    })
    return unwrapResponse(response, options)
  }
  return getDomainHealth
}
