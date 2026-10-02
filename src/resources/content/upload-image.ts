import { unwrapResponse, type HttpClient } from '../../core/http'
import type { BrewRawResponse, RequestOptions } from '../../types'

import { createAddImage } from './add-image'
import { createCreateImageUpload } from './create-image-upload'
import type {
  ContentAddImageResponse,
  ContentImageUploadContentType,
} from './types'

/** Input for `brew.content.uploadImage(...)`: one local image file. */
export type UploadImageInput = {
  /**
   * The file's bytes: a `Blob` or `File` (in Node,
   * `await fs.openAsBlob(path)`), an `ArrayBuffer`, or a `Uint8Array` such
   * as a Node `Buffer` (`await fs.readFile(path)`). At most 20,000,000
   * bytes; 2,097,152 for SVG.
   */
  readonly file: Blob | ArrayBuffer | Uint8Array
  /**
   * The file name, for example `logo.png` (1 to 255 characters). It names
   * the converted file, and its extension gives `contentType` when you omit
   * that.
   */
  readonly fileName: string
  /**
   * The file type. Omit it to infer it from `fileName`'s extension:
   * `.png`, `.jpg`/`.jpeg`, `.gif`, `.webp`, `.avif`, `.tif`/`.tiff` or
   * `.svg`. It sets the size cap; the bytes decide what is converted.
   */
  readonly contentType?: ContentImageUploadContentType
}

/**
 * Default per-attempt timeout, in milliseconds, for the step of
 * `uploadImage` that POSTs the file's bytes to `uploadUrl` (2 minutes). A
 * 20 MB file outlasts the 30 s client default on a slow link. A FLOOR: a
 * per-request `timeoutMs` wins, and a longer client-wide one is kept.
 */
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

/** The API's cap on an uploaded image, in bytes. */
const MAX_IMAGE_BYTES = 20_000_000

/** The API's cap on an uploaded SVG, in bytes (2 MiB). */
const MAX_SVG_BYTES = 2_097_152

/**
 * What `uploadUrl` answers once the bytes landed. Not a Brew API route (it
 * is the storage endpoint the URL points at), so it is not in the spec.
 */
type ImageUploadReceipt = {
  readonly uploadId: string
  readonly status: string
  readonly size?: number
  readonly expiresAt?: string
  readonly next?: string
}

/** `contentType`, or the type `fileName`'s extension names. */
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

/**
 * Refuse a size the API is certain to refuse, before any request: an empty
 * file, over 20,000,000 bytes, or an SVG over 2,097,152 bytes. Checked
 * locally because an upload refused after it opened holds one of the
 * brand's 20 upload slots until it expires.
 */
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

/**
 * The file as a `Blob`, which every attempt of the upload re-reads whole.
 * A `Uint8Array` is copied: it may be a view into a larger buffer (a Node
 * `Buffer` often is), and only the view's bytes are the file.
 */
function toBlob({ file }: Pick<UploadImageInput, 'file'>): Blob {
  if (file instanceof Blob) return file
  if (ArrayBuffer.isView(file)) return new Blob([new Uint8Array(file)])
  if (file instanceof ArrayBuffer) return new Blob([file])
  throw new TypeError(
    'uploadImage: `file` must be a Blob, an ArrayBuffer or a Uint8Array.'
  )
}

/**
 * Upload ONE local image file into the brand image library and return it
 * as `brew.content.addImage` does: `{ url, width, height, aspectRatio,
 * assetId }`. Requires the `emails` scope. Free; no credits are charged.
 *
 * Three requests, in order:
 * 1. `brew.content.createImageUpload({ fileName, contentType, size })`
 *    opens a single-use upload (`size` is the file's byte length).
 * 2. The bytes are POSTed to its `uploadUrl` through the client's `fetch`,
 *    WITHOUT the API key or `X-Brand-Id`: the URL carries its own
 *    credential. A refusal throws a `BrewApiError` with the upload URL's
 *    `code` (`404 UPLOAD_NOT_FOUND`, `413 PAYLOAD_TOO_LARGE`,
 *    `400 INVALID_REQUEST` for an empty file), and nothing is added.
 * 3. `brew.content.addImage({ uploadId })` converts and saves it (errors
 *    as there: `422 CONTENT_OPERATION_FAILED` for bytes that are not an
 *    image, …).
 *
 * `contentType` is inferred from `fileName`'s extension when omitted; a
 * name it cannot read throws a `TypeError` before any request is sent. So
 * does a size the API would refuse: an empty file, over 20,000,000 bytes,
 * or an SVG over 2,097,152 bytes.
 *
 * `options` applies to each request: `signal` cancels whichever one is
 * running (the call rejects with its `reason`), `timeoutMs` is each
 * attempt's deadline, response body included, and `maxRetries` /
 * `retryOnTimeout` set each one's retries (a `maxRetries` you pass also
 * opts step 1 in). Without a `timeoutMs`, the
 * bytes POST gets at least {@link IMAGE_UPLOAD_BYTES_DEFAULT_TIMEOUT_MS}
 * and `addImage` at least its own default. `raw: true` returns the
 * `addImage` answer raw.
 *
 * Step 1 is NOT retried unless you pass `maxRetries`: like
 * `createImageUpload`, it is never replayed, so a retry after a lost answer
 * would hold a second upload slot. If it fails, call `uploadImage` again.
 * The bytes POST IS retried under the client's normal policy (a dropped
 * connection, a timeout, `408`, `429`, 5xx): repeating it is safe, because
 * the URL names the one upload it fills and a repeat never replaces the
 * file that landed first. Its errors never carry the upload URL's token. A
 * failure after step 1 leaves the opened upload to expire on its own (15
 * minutes).
 *
 * Pass `{ raw: true }` in `options` to receive the full
 * `BrewRawResponse<ContentAddImageResponse>` of the final `addImage` call.
 */
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
    // Every step runs under the caller's signal, deadline and retry
    // settings; only the last answer is returned, raw or not.
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
