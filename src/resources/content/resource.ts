import type { HttpClient } from '../../core/http'

import { createGenerateImage } from './generate-image'
import { createGif } from './gif'
import { createAddImage } from './add-image'
import { createCreateImageUpload } from './create-image-upload'
import { createHtmlToPng } from './html-to-png'
import { createTransform } from './transform'
import { createUploadImage } from './upload-image'

export type ContentResource = {
  readonly generateImage: ReturnType<typeof createGenerateImage>
  readonly gif: ReturnType<typeof createGif>
  readonly transform: ReturnType<typeof createTransform>
  readonly htmlToPng: ReturnType<typeof createHtmlToPng>
  readonly addImage: ReturnType<typeof createAddImage>
  readonly createImageUpload: ReturnType<typeof createCreateImageUpload>
  readonly uploadImage: ReturnType<typeof createUploadImage>
}

export function createContentResource(client: HttpClient): ContentResource {
  return {
    generateImage: createGenerateImage(client),
    gif: createGif(client),
    transform: createTransform(client),
    htmlToPng: createHtmlToPng(client),
    addImage: createAddImage(client),
    createImageUpload: createCreateImageUpload(client),
    uploadImage: createUploadImage(client),
  }
}
