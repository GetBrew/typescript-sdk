import { unwrapResponse, type HttpClient } from '../../core/http'
import type { BrewRawResponse, RequestOptions } from '../../types'

import type {
  ContentAddImageBatchResponse,
  ContentAddImageRequest,
  ContentAddImageResponse,
} from './types'

export type {
  ContentAddImageBatchResponse,
  ContentAddImageRequest,
  ContentAddImageResponse,
}

/** The `{ imageUrls }` branch: a batch, answered `202`. */
type AddImageBatchInput = Extract<
  ContentAddImageRequest,
  { readonly imageUrls: ReadonlyArray<string> }
>

/** The `{ imageUrl }` and `{ uploadId }` branches: one image, answered `200`. */
type AddOneImageInput = Exclude<ContentAddImageRequest, AddImageBatchInput>

type AddImageAnswer = ContentAddImageResponse | ContentAddImageBatchResponse

/**
 * Default per-attempt timeout for `addImage`, in milliseconds (5 minutes,
 * the route's own limit). The server fetches or reads the image, converts
 * it (up to 120 s for a large animation), captions and indexes it, which
 * outlasts the 30 s client default. A FLOOR: a per-request `timeoutMs`
 * wins, and a longer client-wide one is kept.
 */
export const ADD_IMAGE_DEFAULT_TIMEOUT_MS = 300_000

/**
 * `POST /v1/content/add-image` — add an image to the brand image library:
 * the API fetches or reads it, converts it, stores it on `cdn.brew.new` and
 * indexes it so the email agent can find it. Requires the `emails` scope.
 * Free; no credits are charged.
 *
 * Pass exactly one of:
 * - `{ imageUrl }` — one public image URL. Returns `{ url, width, height,
 *   aspectRatio, assetId }`.
 * - `{ imageUrls }` — 1 to 100 public URLs, imported in the background.
 *   Returns `202` with `{ accepted, skipped, runId? }`.
 * - `{ uploadId }` — a local file whose bytes were sent to the `uploadUrl`
 *   from `brew.content.createImageUpload(...)` (or use
 *   `brew.content.uploadImage(...)` for all three steps). Returns the same
 *   row as `imageUrl`; repeating the call returns the same answer for 24
 *   hours, even if the image was deleted since.
 *
 * The return type follows the input: a batch types as
 * `ContentAddImageBatchResponse`, one image as `ContentAddImageResponse`.
 * `assetId` is the id `brew.brand.getImages()` rows carry and
 * `brew.brand.deleteImage(assetId)` takes.
 *
 * Errors: `422 CONTENT_OPERATION_FAILED` when the image cannot be fetched,
 * decoded or saved (for an upload: bytes that are not PNG, JPEG, GIF, WebP,
 * AVIF, TIFF or SVG). For `uploadId`: `404 UPLOAD_NOT_FOUND` (unknown,
 * expired or another brand), `409 UPLOAD_NOT_RECEIVED` (the bytes were
 * never sent), `409 UPLOAD_IN_PROGRESS` (another call is converting it;
 * retry shortly) and `413 PAYLOAD_TOO_LARGE` (over 20 MB, or an SVG over
 * 2 MB).
 *
 * Each attempt gets at least {@link ADD_IMAGE_DEFAULT_TIMEOUT_MS}.
 *
 * Pass `{ raw: true }` in `options` to receive the full `BrewRawResponse`
 * instead of the unwrapped payload.
 */
export function createAddImage(client: HttpClient) {
  function addImage(
    input: AddImageBatchInput,
    options: RequestOptions & { readonly raw: true }
  ): Promise<BrewRawResponse<ContentAddImageBatchResponse>>
  function addImage(
    input: AddImageBatchInput,
    options?: RequestOptions
  ): Promise<ContentAddImageBatchResponse>
  function addImage(
    input: AddOneImageInput,
    options: RequestOptions & { readonly raw: true }
  ): Promise<BrewRawResponse<ContentAddImageResponse>>
  function addImage(
    input: AddOneImageInput,
    options?: RequestOptions
  ): Promise<ContentAddImageResponse>
  // An input only known at runtime gets the union.
  function addImage(
    input: ContentAddImageRequest,
    options: RequestOptions & { readonly raw: true }
  ): Promise<BrewRawResponse<AddImageAnswer>>
  function addImage(
    input: ContentAddImageRequest,
    options?: RequestOptions
  ): Promise<AddImageAnswer>
  async function addImage(
    input: ContentAddImageRequest,
    options?: RequestOptions
  ): Promise<AddImageAnswer | BrewRawResponse<AddImageAnswer>> {
    const response = await client.request<AddImageAnswer>({
      method: 'POST',
      path: '/v1/content/add-image',
      body: input,
      defaultTimeoutMs: ADD_IMAGE_DEFAULT_TIMEOUT_MS,
      ...(options ? { options } : {}),
    })
    return unwrapResponse(response, options)
  }
  return addImage
}
