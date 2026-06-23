import { unwrapResponse, type HttpClient } from '../../core/http'
import type { BrewRawResponse, RequestOptions } from '../../types'

import type { BrandEmailDesignResponse } from './types'

export type { BrandEmailDesignResponse }

/**
 * `GET /v1/brand/email-design` — the brand's `email-design.md`, the design
 * system `POST /v1/emails` follows when generating. Requires the `emails`
 * scope.
 *
 * Returns `{ markdown }` — the markdown for layout, spacing, typography,
 * and component conventions (empty string if unset). Read it to understand
 * or steer what the agent produces; replace it with `updateEmailDesign`.
 *
 * Pass `{ raw: true }` in `options` to receive the full
 * `BrewRawResponse<BrandEmailDesignResponse>` instead of the unwrapped
 * payload.
 */
export function createGetBrandEmailDesign(client: HttpClient) {
  function getEmailDesign(
    options: RequestOptions & { readonly raw: true }
  ): Promise<BrewRawResponse<BrandEmailDesignResponse>>
  function getEmailDesign(
    options?: RequestOptions
  ): Promise<BrandEmailDesignResponse>
  async function getEmailDesign(
    options?: RequestOptions
  ): Promise<BrandEmailDesignResponse | BrewRawResponse<BrandEmailDesignResponse>> {
    const response = await client.request<BrandEmailDesignResponse>({
      method: 'GET',
      path: '/v1/brand/email-design',
      ...(options ? { options } : {}),
    })
    return unwrapResponse(response, options)
  }
  return getEmailDesign
}
