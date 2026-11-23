import type { components } from '../../generated/openapi-types'
import { unwrapResponse, type HttpClient } from '../../core/http'
import type { BrewRawResponse, RequestOptions } from '../../types'

/**
 * Body of `POST /v1/emails/image`.
 *
 * `imageUrl` must be a publicly reachable http(s) URL of a PNG, JPEG or WebP
 * picture of one email (a screenshot or an export), at most 2048 px wide.
 */
export type ImportEmailImageInput = components['schemas']['ImageToEmailRequest']

/**
 * 201 result of `POST /v1/emails/image`: the persisted design, the requested
 * source representation (`format` + `content`) and `conversion`, which says
 * how the design was made. Model fallbacks also carry `fallbackReason` and
 * `warnings`; their picture blocks are empty and need the original assets.
 */
export type ImportEmailImageResponse =
  components['schemas']['ImageToEmailResponse']

/**
 * Default per-request timeout for `POST /v1/emails/image`. The conversion
 * blocks for 1 to 6 minutes while the picture is split into layers, and the
 * server keeps working (and PERSISTS the design) up to its own 800s limit, so
 * a shorter client timeout would report failure while an email was in fact
 * created. This is matched to the server ceiling to avoid that split-brain.
 *
 * On Node's built-in `fetch` the effective ceiling is 300 s: the runtime stops
 * waiting for a response after that, whatever `timeoutMs` says, and the SDK
 * reports it as a `BrewTimeoutError` (see `docs/configuration.md` to raise it).
 * Caller-supplied `RequestOptions.timeoutMs` and `RequestOptions.signal` still
 * win. Every attempt carries the same idempotency key: if the first attempt
 * is still running when a retry arrives, the SDK throws the timeout with
 * `inProgress: true` and that key, so you can replay it later instead of
 * converting the picture twice.
 *
 * It is a floor, never a cap: a longer client-wide `timeoutMs` is kept.
 */
export const IMPORT_IMAGE_DEFAULT_TIMEOUT_MS = 800_000

/**
 * `POST /v1/emails/image` (scope: `emails`): convert a picture of an email
 * into a new, fully editable Brew email design.
 *
 * The picture is split into its own text, shape and image layers and laid out
 * deterministically: every text is live text and every button a button, and
 * no model writes the email. Converting the same image again within three
 * weeks reuses its stored layers, returns in seconds and gives the same
 * design.
 *
 * `conversion` in the result is `layers` for that conversion, which costs a
 * flat credit price. When a picture cannot be split into layers a model
 * recreates its layout instead: `conversion` is `model`, the flat price is not
 * charged and the run is metered by model usage like `emails.generate`.
 *
 * A picture carries no links, so every button and link in the result points
 * to `#`. A URL that is not a public picture is `400 IMAGE_URL_INVALID`. A
 * picture neither lane could convert is `422 IMAGE_CONVERSION_FAILED`; its
 * `error.details.emailId` points at the design row created before the
 * conversion ran, so you can inspect or delete it.
 *
 * Model fallback also applies when the layer service is unavailable or times
 * out. It returns `fallbackReason` and `warnings`, leaves image blocks empty
 * and sets links to `#`. Add the original pictures before sending.
 *
 * Set `format` to `jsx` (default) or `html`; the selected representation is
 * returned in `content`. Supply `options.idempotencyKey` to make retries
 * safe; one is generated automatically otherwise.
 *
 * Pass `{ raw: true }` in `options` to receive the full
 * `BrewRawResponse<ImportEmailImageResponse>` instead of the unwrapped
 * payload.
 */
export function createImportEmailImage(client: HttpClient) {
  function importEmailImage(
    input: ImportEmailImageInput,
    options: RequestOptions & { readonly raw: true }
  ): Promise<BrewRawResponse<ImportEmailImageResponse>>
  function importEmailImage(
    input: ImportEmailImageInput,
    options?: RequestOptions
  ): Promise<ImportEmailImageResponse>
  async function importEmailImage(
    input: ImportEmailImageInput,
    options?: RequestOptions
  ): Promise<
    ImportEmailImageResponse | BrewRawResponse<ImportEmailImageResponse>
  > {
    const response = await client.request<ImportEmailImageResponse>({
      method: 'POST',
      path: '/v1/emails/image',
      body: input,
      defaultTimeoutMs: IMPORT_IMAGE_DEFAULT_TIMEOUT_MS,
      ...(options ? { options } : {}),
    })
    return unwrapResponse(response, options)
  }
  return importEmailImage
}
