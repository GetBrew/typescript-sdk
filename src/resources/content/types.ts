import type { components } from '../../generated/openapi-types'

/**
 * Request body for `POST /v1/content/generate-image`. Carries the
 * `prompt`, optional `mode` / `aspectRatio` / `model` / source images.
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
 * Request body for `POST /v1/content/add-image`. Carries the source
 * `imageUrl` to mirror onto Brew-hosted storage.
 */
export type ContentAddImageRequest =
  components['schemas']['ContentAddImageRequest']

/** The Brew-hosted image url returned by `POST /v1/content/add-image`. */
export type ContentAddImageResponse =
  components['schemas']['ContentAddImageResponse']
