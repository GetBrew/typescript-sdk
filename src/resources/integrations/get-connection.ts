import { unwrapResponse, type HttpClient } from '../../core/http'
import type { BrewRawResponse, RequestOptions } from '../../types'

import { assertConnectionProvider } from './provider'
import type {
  IntegrationConnection,
  IntegrationConnectionProvider,
} from './types'

export type GetIntegrationConnectionResponse = IntegrationConnection

/**
 * `GET /v1/integrations/{provider}/connection` (no permission scope) — the
 * brand's connection for a hosted auth email hook (`supabase_auth` or
 * `clerk`): `provider`, `connectionId`, the `webhookUrl` the provider
 * delivers to, and `status` (`pending_verification` until the first signed
 * delivery, then `active`). It never returns the signing secret. A
 * provider not connected for the brand is `404 NOT_FOUND`.
 *
 * An empty provider, `.` or `..` throws a `TypeError` before any request.
 *
 * Pass `{ raw: true }` in `options` to receive the full
 * `BrewRawResponse<GetIntegrationConnectionResponse>` instead of the
 * unwrapped body.
 */
export function createGetIntegrationConnection(client: HttpClient) {
  function getConnection(
    provider: IntegrationConnectionProvider,
    options: RequestOptions & { readonly raw: true }
  ): Promise<BrewRawResponse<GetIntegrationConnectionResponse>>
  function getConnection(
    provider: IntegrationConnectionProvider,
    options?: RequestOptions
  ): Promise<GetIntegrationConnectionResponse>
  async function getConnection(
    provider: IntegrationConnectionProvider,
    options?: RequestOptions
  ): Promise<
    | GetIntegrationConnectionResponse
    | BrewRawResponse<GetIntegrationConnectionResponse>
  > {
    assertConnectionProvider(provider, 'integrations.getConnection')
    const response = await client.request<GetIntegrationConnectionResponse>({
      method: 'GET',
      path: `/v1/integrations/${encodeURIComponent(provider)}/connection`,
      ...(options ? { options } : {}),
    })
    return unwrapResponse(response, options)
  }
  return getConnection
}
