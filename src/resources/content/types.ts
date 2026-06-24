import type { components, paths } from '../../generated/openapi-types'

/**
 * Request body for `POST /v1/content/generate-image`. Carries the
 * `prompt`, optional `mode` / `aspectRatio` / `model` / source images.
 */
export type ContentGenerateImageRequest =
  components['schemas']['ContentGenerateImageRequest']

/** The generated image returned by `POST /v1/content/generate-image`. */
export type ContentImageResponse =
  components['schemas']['ContentImageResponse']

/**
 * Request body for `POST /v1/content/generate-gif`. Carries the
 * `prompt`, optional `duration` / `fps` / `aspectRatio` / `loop`.
 */
export type ContentGenerateGifRequest =
  components['schemas']['ContentGenerateGifRequest']

/** The generated GIF (plus source video) returned by the GIF routes. */
export type ContentGifResponse = components['schemas']['ContentGifResponse']

/**
 * Request body for `POST /v1/content/image-to-gif`. Carries the source
 * `imageUrl`, optional motion `prompt` / `duration` / `fps` /
 * `aspectRatio` / `loop`.
 */
export type ContentImageToGifRequest =
  components['schemas']['ContentImageToGifRequest']

/**
 * The 200 payload of `POST /v1/content/image-to-gif`. This route has no
 * separately named success schema in the spec, so it is referenced
 * through its `paths` entry. The success branch matches `ContentGifResponse`.
 */
export type ContentImageToGifResponse =
  paths['/v1/content/image-to-gif']['post']['responses']['200']['content']['application/json']

/**
 * Request body for `POST /v1/content/video-to-gif`. Carries the source
 * `videoUrl`, optional `fps` / `width`.
 */
export type ContentVideoToGifRequest =
  components['schemas']['ContentVideoToGifRequest']

/** The transcoded GIF url returned by `POST /v1/content/video-to-gif`. */
export type ContentVideoToGifResponse =
  components['schemas']['ContentVideoToGifResponse']

/**
 * Request body for `POST /v1/content/optimize-image`. Carries the source
 * `imageUrl`.
 */
export type ContentOptimizeImageRequest =
  components['schemas']['ContentOptimizeImageRequest']

/** The optimized image (url + dimensions + bytes) returned by the route. */
export type ContentOptimizedImageResponse =
  components['schemas']['ContentOptimizedImageResponse']

/**
 * Request body for `POST /v1/content/resize`. Carries the source
 * `imageUrl`, target `width` / `height`, optional `prompt` /
 * `resolution` / `outputFormat`.
 */
export type ContentResizeRequest =
  components['schemas']['ContentResizeRequest']

/** The resized image (url + dimensions) returned by `POST /v1/content/resize`. */
export type ContentResizeResponse =
  components['schemas']['ContentResizeResponse']

/**
 * Request body for `POST /v1/content/html-to-png`. Carries the `html`,
 * optional `width` / `maxHeight`.
 */
export type ContentHtmlToPngRequest =
  components['schemas']['ContentHtmlToPngRequest']

/** The rendered PNG (url + width) returned by `POST /v1/content/html-to-png`. */
export type ContentPngResponse = components['schemas']['ContentPngResponse']

/**
 * Request body for `POST /v1/content/host-image`. Carries the source
 * `imageUrl` to mirror onto Brew-hosted storage.
 */
export type ContentHostImageRequest =
  components['schemas']['ContentHostImageRequest']

/** The Brew-hosted image url returned by `POST /v1/content/host-image`. */
export type ContentHostedImageResponse =
  components['schemas']['ContentHostedImageResponse']
