import { unwrapResponse, type HttpClient } from '../../core/http'
import type { BrewRawResponse, RequestOptions } from '../../types'

import type {
  ContentImageUploadCreateRequest,
  ContentImageUploadCreateResponse,
} from './types'

export type {
  ContentImageUploadCreateRequest,
  ContentImageUploadCreateResponse,
}

/**
 * `POST /v1/content/image-uploads` — open a single-use upload for ONE local
 * image file. Requires the `emails` scope. Free; no credits are charged.
 *
 * Send `fileName`, `contentType` (`image/png`, `image/jpeg`, `image/gif`,
 * `image/webp`, `image/avif`, `image/tiff` or `image/svg+xml`) and `size` in
 * bytes (at most 20,000,000; 2,097,152 for SVG). Returns `201` with
 * `{ uploadId, uploadUrl, expiresAt, maxBytes }`. Then, within 15 minutes:
 *
 * 1. POST the file's raw bytes to `uploadUrl` — no `Authorization` header;
 *    the URL carries its own credential, so keep it private. A repeat POST
 *    never replaces the first file.
 * 2. Call `brew.content.addImage({ uploadId })` to put it in the brand
 *    library.
 *
 * `brew.content.uploadImage({ file, fileName })` does all three steps.
 *
 * NOT retried by default, and sent without an `Idempotency-Key`. The API
 * never replays this answer (it carries a bearer URL), so a retry after a
 * lost answer would open a second upload, and the unused one would hold one
 * of the brand's 20 upload slots until it expires (15 minutes). The
 * client-wide `maxRetries` does not apply; pass `maxRetries` on this
 * request to opt in. After a failure, open a new upload.
 *
 * `400 INVALID_REQUEST` for an unsupported `contentType` or a `size` over
 * the cap; `429 RATE_LIMITED` when the brand already has 20 uploads open
 * (`retryAfter` is when the oldest expires).
 *
 * Pass `{ raw: true }` in `options` to receive the full
 * `BrewRawResponse<ContentImageUploadCreateResponse>` instead of the
 * unwrapped payload.
 */
export function createCreateImageUpload(client: HttpClient) {
  function createImageUpload(
    input: ContentImageUploadCreateRequest,
    options: RequestOptions & { readonly raw: true }
  ): Promise<BrewRawResponse<ContentImageUploadCreateResponse>>
  function createImageUpload(
    input: ContentImageUploadCreateRequest,
    options?: RequestOptions
  ): Promise<ContentImageUploadCreateResponse>
  async function createImageUpload(
    input: ContentImageUploadCreateRequest,
    options?: RequestOptions
  ): Promise<
    | ContentImageUploadCreateResponse
    | BrewRawResponse<ContentImageUploadCreateResponse>
  > {
    const response = await client.request<ContentImageUploadCreateResponse>({
      method: 'POST',
      path: '/v1/content/image-uploads',
      body: input,
      idempotency: 'none',
      defaultMaxRetries: 0,
      ...(options ? { options } : {}),
    })
    return unwrapResponse(response, options)
  }
  return createImageUpload
}
