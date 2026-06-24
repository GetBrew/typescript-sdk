import { unwrapResponse, type HttpClient } from '../../core/http'
import type { BrewRawResponse, RequestOptions } from '../../types'

import type { ContentHtmlToPngRequest, ContentPngResponse } from './types'

export type { ContentHtmlToPngRequest, ContentPngResponse }

/**
 * `POST /v1/content/html-to-png` — render an `html` string to a hosted
 * PNG screenshot at an optional `width` / `maxHeight`. Requires the
 * `emails` scope.
 *
 * Returns a `ContentPngResponse` (`{ url, width }`). This operation is
 * credit-metered. An insufficient balance surfaces
 * as `402 INSUFFICIENT_CREDITS`.
 *
 * Pass `{ raw: true }` in `options` to receive the full
 * `BrewRawResponse<ContentPngResponse>` instead of the unwrapped
 * payload.
 */
export function createHtmlToPng(client: HttpClient) {
  function htmlToPng(
    input: ContentHtmlToPngRequest,
    options: RequestOptions & { readonly raw: true }
  ): Promise<BrewRawResponse<ContentPngResponse>>
  function htmlToPng(
    input: ContentHtmlToPngRequest,
    options?: RequestOptions
  ): Promise<ContentPngResponse>
  async function htmlToPng(
    input: ContentHtmlToPngRequest,
    options?: RequestOptions
  ): Promise<ContentPngResponse | BrewRawResponse<ContentPngResponse>> {
    const response = await client.request<ContentPngResponse>({
      method: 'POST',
      path: '/v1/content/html-to-png',
      body: input,
      ...(options ? { options } : {}),
    })
    return unwrapResponse(response, options)
  }
  return htmlToPng
}
