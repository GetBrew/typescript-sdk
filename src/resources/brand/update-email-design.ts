import { unwrapResponse, type HttpClient } from '../../core/http'
import type { BrewRawResponse, RequestOptions } from '../../types'

import type {
  BrandEmailDesignResponse,
  UpdateBrandEmailDesignInput,
} from './types'

export type { BrandEmailDesignResponse, UpdateBrandEmailDesignInput }

/**
 * `PUT /v1/brand/email-design` — replace the entire `email-design.md`
 * markdown for the key's brand. Requires the `emails` scope.
 *
 * Pass `{ markdown }`; the whole document is overwritten (not merged).
 * Returns the saved `{ markdown }`.
 *
 * Pass `{ raw: true }` in `options` to receive the full
 * `BrewRawResponse<BrandEmailDesignResponse>` instead of the unwrapped
 * payload.
 */
export function createUpdateBrandEmailDesign(client: HttpClient) {
  function updateEmailDesign(
    input: UpdateBrandEmailDesignInput,
    options: RequestOptions & { readonly raw: true }
  ): Promise<BrewRawResponse<BrandEmailDesignResponse>>
  function updateEmailDesign(
    input: UpdateBrandEmailDesignInput,
    options?: RequestOptions
  ): Promise<BrandEmailDesignResponse>
  async function updateEmailDesign(
    input: UpdateBrandEmailDesignInput,
    options?: RequestOptions
  ): Promise<BrandEmailDesignResponse | BrewRawResponse<BrandEmailDesignResponse>> {
    const response = await client.request<BrandEmailDesignResponse>({
      method: 'PUT',
      path: '/v1/brand/email-design',
      body: input,
      ...(options ? { options } : {}),
    })
    return unwrapResponse(response, options)
  }
  return updateEmailDesign
}
