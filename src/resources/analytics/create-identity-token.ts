import type { HttpClient } from '../../core/http'
import { unwrapResponse } from '../../core/http'
import type { components } from '../../generated/openapi-types'
import type { BrewRawResponse, RequestOptions } from '../../types'

export type CreateProductAnalyticsIdentityTokenInput =
  components['schemas']['ProductAnalyticsIdentityTokenRequest']
export type CreateProductAnalyticsIdentityTokenResponse =
  components['schemas']['ProductAnalyticsIdentityTokenResponse']

/**
 * Issue a five-minute token for an authenticated application user and an existing brand contact.
 * Tokens are never replayed; retries require a per-request maxRetries opt-in.
 */
export function createProductAnalyticsIdentityToken(client: HttpClient) {
  function createIdentityToken(
    input: CreateProductAnalyticsIdentityTokenInput,
    options: RequestOptions & { readonly raw: true }
  ): Promise<BrewRawResponse<CreateProductAnalyticsIdentityTokenResponse>>
  function createIdentityToken(
    input: CreateProductAnalyticsIdentityTokenInput,
    options?: RequestOptions
  ): Promise<CreateProductAnalyticsIdentityTokenResponse>
  async function createIdentityToken(
    input: CreateProductAnalyticsIdentityTokenInput,
    options?: RequestOptions
  ): Promise<
    | CreateProductAnalyticsIdentityTokenResponse
    | BrewRawResponse<CreateProductAnalyticsIdentityTokenResponse>
  > {
    const response =
      await client.request<CreateProductAnalyticsIdentityTokenResponse>({
        method: 'POST',
        path: '/v1/analytics/identity-token',
        body: input,
        idempotency: 'none',
        defaultMaxRetries: 0,
        ...(options ? { options } : {}),
      })
    return unwrapResponse(response, options)
  }
  return createIdentityToken
}
