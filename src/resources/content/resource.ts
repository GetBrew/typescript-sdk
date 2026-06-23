import type { HttpClient } from '../../core/http'

import { createGenerateGif } from './generate-gif'
import { createGenerateImage } from './generate-image'
import { createHostImage } from './host-image'
import { createHtmlToPng } from './html-to-png'
import { createImageToGif } from './image-to-gif'
import { createOptimizeImage } from './optimize-image'
import { createResize } from './resize'
import { createVideoToGif } from './video-to-gif'

/**
 * The public shape of `brew.content`. Every method wraps one
 * credit-metered `POST /v1/content/*` route. Each lives in its own file
 * under `resources/content/`, so a new endpoint is always one new file
 * plus one new line here, never a diff inside an existing method.
 *
 * Every method supports `dry_run: true` on the input to preview the
 * credit cost without doing work, and surfaces an exhausted balance as
 * `402 INSUFFICIENT_CREDITS`.
 */
export type ContentResource = {
  /** `POST /v1/content/generate-image` — text-to-image / image editing (scope: `emails`). */
  readonly generateImage: ReturnType<typeof createGenerateImage>
  /** `POST /v1/content/generate-gif` — generate an animated GIF from a prompt (scope: `emails`). */
  readonly generateGif: ReturnType<typeof createGenerateGif>
  /** `POST /v1/content/image-to-gif` — animate a source image into a GIF (scope: `emails`). */
  readonly imageToGif: ReturnType<typeof createImageToGif>
  /** `POST /v1/content/video-to-gif` — transcode a source video into a GIF (scope: `emails`). */
  readonly videoToGif: ReturnType<typeof createVideoToGif>
  /** `POST /v1/content/optimize-image` — re-encode an image for email (scope: `emails`). */
  readonly optimizeImage: ReturnType<typeof createOptimizeImage>
  /** `POST /v1/content/resize` — resize an image to a target size (scope: `emails`). */
  readonly resize: ReturnType<typeof createResize>
  /** `POST /v1/content/html-to-png` — render HTML to a hosted PNG (scope: `emails`). */
  readonly htmlToPng: ReturnType<typeof createHtmlToPng>
  /** `POST /v1/content/host-image` — mirror an image onto Brew-hosted storage (scope: `emails`). */
  readonly hostImage: ReturnType<typeof createHostImage>
}

/**
 * Wire every content method to a shared http client. The per-method
 * factories close over the client so consumers never have to pass it
 * around themselves.
 */
export function createContentResource(client: HttpClient): ContentResource {
  return {
    generateImage: createGenerateImage(client),
    generateGif: createGenerateGif(client),
    imageToGif: createImageToGif(client),
    videoToGif: createVideoToGif(client),
    optimizeImage: createOptimizeImage(client),
    resize: createResize(client),
    htmlToPng: createHtmlToPng(client),
    hostImage: createHostImage(client),
  }
}
