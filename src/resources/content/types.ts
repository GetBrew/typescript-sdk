import type { components } from '../../generated/openapi-types'

/**
 * Request body for `POST /v1/content/generate-image`. Carries the
 * `prompt`, optional `mode` / `aspectRatio` / source images.
 */
export type ContentGenerateImageRequest =
  components['schemas']['ContentGenerateImageRequest']

/** The generated image returned by `POST /v1/content/generate-image`. */
export type ContentImageResponse = components['schemas']['ContentImageResponse']

/**
 * Request body for `POST /v1/content/gif`. A discriminated union on
 * `from`:
 *   - `{ from: 'prompt', prompt, duration?, fps?, aspectRatio?, loop? }`
 *   - `{ from: 'image', imageUrl, prompt?, duration?, fps?, aspectRatio?, loop? }`
 *   - `{ from: 'video', videoUrl, fps?, width? }`
 */
export type ContentGifRequest = components['schemas']['ContentGifRequest']

/** The generated GIF (plus source video) returned by `POST /v1/content/gif`. */
export type ContentGifResponse = components['schemas']['ContentGifResponse']

/**
 * Request body for `POST /v1/content/transform`. A discriminated union on
 * `operation`:
 *   - `{ operation: 'optimize', imageUrl }`
 *   - `{ operation: 'resize', imageUrl, width, height, prompt?, resolution?, outputFormat? }`
 */
export type ContentTransformRequest =
  components['schemas']['ContentTransformRequest']

/** The transformed image (url + dimensions) returned by `POST /v1/content/transform`. */
export type ContentTransformResponse =
  components['schemas']['ContentTransformResponse']

/**
 * Request body for `POST /v1/content/html-to-png`. Carries the `html`,
 * optional `width` / `maxHeight`.
 */
export type ContentHtmlToPngRequest =
  components['schemas']['ContentHtmlToPngRequest']

/** The rendered PNG (url + width) returned by `POST /v1/content/html-to-png`. */
export type ContentPngResponse = components['schemas']['ContentPngResponse']

/**
 * Request body for `POST /v1/content/add-image`: exactly one of
 *   - `{ imageUrl }` — one public image URL, added synchronously;
 *   - `{ imageUrls }` — 1 to 100 public URLs, a background batch import;
 *   - `{ uploadId }` — a local file whose bytes were sent to the
 *     `uploadUrl` from `POST /v1/content/image-uploads`.
 */
export type ContentAddImageRequest =
  components['schemas']['ContentAddImageRequest']

/**
 * `{ url, width, height, aspectRatio, assetId }` returned by
 * `POST /v1/content/add-image` for an `imageUrl` or an `uploadId`: the
 * durable `cdn.brew.new` URL and the library row's `assetId`.
 */
export type ContentAddImageResponse =
  components['schemas']['ContentAddImageResponse']

/**
 * `{ accepted, skipped, runId? }` returned (`202`) by
 * `POST /v1/content/add-image` for an `imageUrls` batch.
 */
export type ContentAddImageBatchResponse =
  components['schemas']['ContentAddImageBatchResponse']

/**
 * Request body for `POST /v1/content/image-uploads`: the local file's
 * `fileName`, `contentType` and `size` in bytes.
 */
export type ContentImageUploadCreateRequest =
  components['schemas']['ContentImageUploadCreateRequest']

/**
 * `{ uploadId, uploadUrl, expiresAt, maxBytes }` returned (`201`) by
 * `POST /v1/content/image-uploads`. `uploadUrl` carries its own
 * credential: keep it private.
 */
export type ContentImageUploadCreateResponse =
  components['schemas']['ContentImageUploadCreateResponse']

/**
 * The image types an upload accepts: `image/png`, `image/jpeg`,
 * `image/gif`, `image/webp`, `image/avif`, `image/tiff`, `image/svg+xml`.
 */
export type ContentImageUploadContentType =
  ContentImageUploadCreateRequest['contentType']
