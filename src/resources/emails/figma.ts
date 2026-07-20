import type { components } from '../../generated/openapi-types'
import { unwrapResponse, type HttpClient } from '../../core/http'
import type { BrewRawResponse, RequestOptions } from '../../types'

/**
 * Body of `POST /v1/emails/figma`.
 *
 * `figmaUrl` must be a figma.com design/file/proto link that INCLUDES a
 * `node-id` query param, i.e. the link to one specific frame rather than the
 * whole file. In Figma, select the email frame and copy the link to it.
 */
export type ImportFigmaDesignInput =
  components['schemas']['EmailFigmaImportRequest']

/**
 * 201 result of `POST /v1/emails/figma` — the persisted design plus the
 * conversion report (`{ emailId, emailVersionId, title, warningCount,
 * exportedNodeCount }`).
 */
export type ImportFigmaDesignResponse =
  components['schemas']['EmailFigmaImportResponse']

/**
 * Default per-request timeout for `POST /v1/emails/figma`. The transpile
 * blocks while it fetches the Figma bundle, exports every image node, and
 * re-hosts them on the Brew CDN. A frame with many image nodes can outrun the
 * 4-minute ceiling the other email operations use, and the server keeps
 * working (and PERSISTS the design) up to its own 800s limit — so a client
 * timeout shorter than that would report failure while an email was in fact
 * created. This is matched to the server ceiling to avoid that split-brain.
 * Caller-supplied `RequestOptions.timeoutMs` and `RequestOptions.signal` still
 * win; a POST auto-attaches an idempotency key, so a retry after a timeout
 * replays rather than duplicates.
 */
export const IMPORT_FIGMA_DEFAULT_TIMEOUT_MS = 800_000

/**
 * `POST /v1/emails/figma` (scope: `emails`) — deterministically convert a
 * Figma frame into a new, fully editable Brew email design.
 *
 * No model is in the loop, so the same frame always converts the same way,
 * and the operation is FREE (unlike `emails.import`, which runs the email
 * agent and is usage-metered).
 *
 * Figma authentication resolves two ways. By default the brand's connected
 * Figma account is used, which is set up once from Integrations in the Brew
 * app. To import without that interactive step, pass `figmaAccessToken`; it
 * authenticates this single request and is never stored. With neither, the
 * call fails `422 FIGMA_NOT_CONNECTED`.
 *
 * A link that is malformed, is not a figma.com URL, or is missing the
 * `node-id` that identifies the frame surfaces as `400 INVALID_REQUEST`. A
 * frame that is fetched but cannot be transpiled is `422
 * FIGMA_CONVERSION_FAILED`; its `error.details.emailId` points at the design
 * row that was created before the transpile ran, so you can inspect or delete
 * it.
 *
 * Figma carries no link data, so button hrefs default to `#`; `warningCount`
 * reports how many placeholders to fill in with a follow-up
 * `brew.emails.edit(...)`. Supply `options.idempotencyKey` to make retries
 * safe; one is generated automatically otherwise.
 *
 * Pass `{ raw: true }` in `options` to receive the full
 * `BrewRawResponse<ImportFigmaDesignResponse>` instead of the unwrapped
 * payload.
 */
export function createImportFigmaDesign(client: HttpClient) {
  function importFigmaDesign(
    input: ImportFigmaDesignInput,
    options: RequestOptions & { readonly raw: true }
  ): Promise<BrewRawResponse<ImportFigmaDesignResponse>>
  function importFigmaDesign(
    input: ImportFigmaDesignInput,
    options?: RequestOptions
  ): Promise<ImportFigmaDesignResponse>
  async function importFigmaDesign(
    input: ImportFigmaDesignInput,
    options?: RequestOptions
  ): Promise<
    ImportFigmaDesignResponse | BrewRawResponse<ImportFigmaDesignResponse>
  > {
    const response = await client.request<ImportFigmaDesignResponse>({
      method: 'POST',
      path: '/v1/emails/figma',
      body: input,
      options: { timeoutMs: IMPORT_FIGMA_DEFAULT_TIMEOUT_MS, ...options },
    })
    return unwrapResponse(response, options)
  }
  return importFigmaDesign
}
