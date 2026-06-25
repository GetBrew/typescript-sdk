import type { HttpClient } from '../../core/http'

import { createGenerateImage } from './generate-image'
import { createGif } from './gif'
import { createAddImage } from './add-image'
import { createHtmlToPng } from './html-to-png'
import { createTransform } from './transform'

/**
 * The public shape of `brew.content`. Every method wraps one
 * credit-metered `POST /v1/content/*` route. Each lives in its own file
 * under `resources/content/`, so a new endpoint is always one new file
 * plus one new line here, never a diff inside an existing method.
 *
 * Every method is credit-metered and surfaces an exhausted balance as
 * `402 INSUFFICIENT_CREDITS`.
 */
export type ContentResource = {
  /** `POST /v1/content/generate-image` — text-to-image / image editing (scope: `emails`). */
  readonly generateImage: ReturnType<typeof createGenerateImage>
  /** `POST /v1/content/gif` — animated GIF from a prompt, image, or video (`from` union) (scope: `emails`). */
  readonly gif: ReturnType<typeof createGif>
  /** `POST /v1/content/transform` — optimize or resize a hosted image (`operation` union) (scope: `emails`). */
  readonly transform: ReturnType<typeof createTransform>
  /** `POST /v1/content/html-to-png` — render HTML to a hosted PNG (scope: `emails`). */
  readonly htmlToPng: ReturnType<typeof createHtmlToPng>
  /** `POST /v1/content/add-image` — mirror an image onto Brew-hosted storage (scope: `emails`). */
  readonly addImage: ReturnType<typeof createAddImage>
}

/**
 * Wire every content method to a shared http client. The per-method
 * factories close over the client so consumers never have to pass it
 * around themselves.
 */
export function createContentResource(client: HttpClient): ContentResource {
  return {
    generateImage: createGenerateImage(client),
    gif: createGif(client),
    transform: createTransform(client),
    htmlToPng: createHtmlToPng(client),
    addImage: createAddImage(client),
  }
}
