import { unwrapResponse, type HttpClient } from '../../core/http'
import type { BrewRawResponse, RequestOptions } from '../../types'

import type { HelpResponse } from './types'

export type { HelpResponse }

export type GetHelpResponse = HelpResponse

/**
 * `GET /v1/help` — fetch the machine-readable API catalog. No auth and
 * no rate limit: a structured-JSON document an MCP server (or any agent)
 * can parse to self-discover how to use Brew — auth, permission scopes,
 * rate limits, flat credit costs, the error envelope, and the full
 * endpoint list (derived from the same OpenAPI document, so it never
 * drifts).
 *
 * Returns a generic JSON object; read the live response for the concrete
 * shape.
 *
 * Pass `{ raw: true }` in `options` to receive the full
 * `BrewRawResponse<GetHelpResponse>` instead of the unwrapped payload.
 */
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
