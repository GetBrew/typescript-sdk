import { unwrapResponse, type HttpClient } from '../../core/http'
import type { BrewRawResponse, RequestOptions } from '../../types'

import { createAddImage } from './add-image'
import { createCreateImageUpload } from './create-image-upload'
import type {
  ContentAddImageResponse,
  ContentImageUploadContentType,
} from './types'

export type UploadImageInput = {
  readonly file: Blob | ArrayBuffer | Uint8Array
  readonly fileName: string
  readonly contentType?: ContentImageUploadContentType
}

export const IMAGE_UPLOAD_BYTES_DEFAULT_TIMEOUT_MS = 120_000

const CONTENT_TYPE_BY_EXTENSION: ReadonlyMap<
  string,
  ContentImageUploadContentType
> = new Map([
  ['png', 'image/png'],
  ['jpg', 'image/jpeg'],
  ['jpeg', 'image/jpeg'],
  ['gif', 'image/gif'],
  ['webp', 'image/webp'],
  ['avif', 'image/avif'],
  ['tif', 'image/tiff'],
  ['tiff', 'image/tiff'],
  ['svg', 'image/svg+xml'],
])

const MAX_IMAGE_BYTES = 20_000_000

const MAX_SVG_BYTES = 2_097_152

type ImageUploadReceipt = {
  readonly uploadId: string
  readonly status: string
  readonly size?: number
  readonly expiresAt?: string
  readonly next?: string
}

function resolveContentType({
  fileName,
  contentType,
}: Pick<
  UploadImageInput,
  'fileName' | 'contentType'
>): ContentImageUploadContentType {
  if (contentType !== undefined) return contentType
  const extension = /\.([^./\\]+)$/.exec(fileName)?.[1]?.toLowerCase()
  const inferred =
    extension === undefined
      ? undefined
      : CONTENT_TYPE_BY_EXTENSION.get(extension)
  if (inferred === undefined) {
    throw new TypeError(
      `uploadImage: cannot tell the image type of ${JSON.stringify(fileName)} from its extension. Pass contentType (image/png, image/jpeg, image/gif, image/webp, image/avif, image/tiff or image/svg+xml), or name the file .png, .jpg, .jpeg, .gif, .webp, .avif, .tif, .tiff or .svg.`
    )
  }
  return inferred
}

function assertUploadableSize({
  fileName,
  contentType,
  size,
}: {
  readonly fileName: string
  readonly contentType: ContentImageUploadContentType
  readonly size: number
}): void {
  const name = JSON.stringify(fileName)
  if (size === 0) {
    throw new TypeError(
      `uploadImage: ${name} is empty (0 bytes). Pass the file's bytes.`
    )
  }
  const isSvg = contentType === 'image/svg+xml'
  const limit = isSvg ? MAX_SVG_BYTES : MAX_IMAGE_BYTES
  if (size > limit) {
    const what = isSvg ? 'an SVG' : 'an image'
    throw new TypeError(
      `uploadImage: ${name} is ${size.toLocaleString('en-US')} bytes; ${what} upload takes at most ${limit.toLocaleString('en-US')} bytes.`
    )
  }
}

function toBlob({ file }: Pick<UploadImageInput, 'file'>): Blob {
  if (file instanceof Blob) return file
  if (ArrayBuffer.isView(file)) return new Blob([new Uint8Array(file)])
  if (file instanceof ArrayBuffer) return new Blob([file])
  throw new TypeError(
    'uploadImage: `file` must be a Blob, an ArrayBuffer or a Uint8Array.'
  )
}

export function createUploadImage(client: HttpClient) {
  const createImageUpload = createCreateImageUpload(client)
  const addImage = createAddImage(client)

  function uploadImage(
    input: UploadImageInput,
    options: RequestOptions & { readonly raw: true }
  ): Promise<BrewRawResponse<ContentAddImageResponse>>
  function uploadImage(
    input: UploadImageInput,
    options?: RequestOptions
  ): Promise<ContentAddImageResponse>
  async function uploadImage(
    input: UploadImageInput,
    options?: RequestOptions
  ): Promise<
    ContentAddImageResponse | BrewRawResponse<ContentAddImageResponse>
  > {
    const contentType = resolveContentType(input)
    const bytes = toBlob(input)
    assertUploadableSize({
      fileName: input.fileName,
      contentType,
      size: bytes.size,
    })
    const steps: RequestOptions = { ...options, raw: false }

    const upload = await createImageUpload(
      { fileName: input.fileName, contentType, size: bytes.size },
      steps
    )
    await client.sendBytes<ImageUploadReceipt>({
      url: upload.uploadUrl,
      bytes,
      contentType,
      options: steps,
      defaultTimeoutMs: IMAGE_UPLOAD_BYTES_DEFAULT_TIMEOUT_MS,
    })
    const added = await addImage(
      { uploadId: upload.uploadId },
      { ...steps, raw: true }
    )
    return unwrapResponse(added, options)
  }
  return uploadImage
}
