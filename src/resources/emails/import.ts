import type { components } from '../../generated/openapi-types'
import { unwrapResponse, type HttpClient } from '../../core/http'
import type { BrewRawResponse, RequestOptions } from '../../types'

/**
 * Body for `POST /v1/emails/import` — import an existing email as a new
 * saved design. Provide the raw `content` (as a string) and its `format`
 * (`'html'`, `'mjml'`, `'jsx'`, or `'eml'`); optionally a `title` and a `baseUrl`
 * used to resolve relative asset URLs in the source.
 */
export type EmailImportInput = components['schemas']['EmailImportRequest']

/**
 * Mirrors the generate response: the persisted design's identity, the
 * pinned `emailVersionId`, the rendered `html`, `previewImage` when one was
 * captured, and an `assetReport` describing rehosted, retained and removed assets.
 */
export type EmailImportResponse = components['schemas']['EmailImportResponse']

/**
 * Default per-call timeout for `POST /v1/emails/import`.
 *
 * An import re-hosts every public asset the markup references and captures
 * a preview, so a real newsletter routinely outlasts the 30 s client
 * default. 300 s is also the longest Node's built-in `fetch` waits for a
 * response. Caller-supplied `RequestOptions.timeoutMs` and
 * `RequestOptions.signal` still win.
 *
 * It is a floor, never a cap: a longer client-wide `timeoutMs` is kept.
 */
export const IMPORT_EMAIL_DEFAULT_TIMEOUT_MS = 300_000

/**
 * `POST /v1/emails/import` (scope: `emails`) — import existing markup
 * (raw `html`, `mjml`, React-Email `jsx`, or RFC 822 `eml`) as a new editable
 * brand design, returning `emailId`, the pinned `emailVersionId`, the rendered
 * `html`, `previewImage`, group metadata and an `assetReport`.
 * Resolves with HTTP 201.
 *
 * The brand is resolved from the API key — the body does not accept a
 * `brandId`. Pass `baseUrl` to resolve relative asset URLs in the
 * source. Free: the import is a deterministic compiler — no model runs and
 * no credits are charged. Long-running: the SDK applies a 5-minute default
 * timeout (`IMPORT_EMAIL_DEFAULT_TIMEOUT_MS`).
 *
 * Supply `options.idempotencyKey` to make retries safe — reusing the
 * same key with the same body returns the original response for 24
 * hours.
 *
 * Pass `{ raw: true }` in `options` to receive the full
 * `BrewRawResponse<EmailImportResponse>` instead of the unwrapped
 * payload.
 */
export function createImportEmail(client: HttpClient) {
  function importEmail(
    input: EmailImportInput,
    options: RequestOptions & { readonly raw: true }
  ): Promise<BrewRawResponse<EmailImportResponse>>
  function importEmail(
    input: EmailImportInput,
    options?: RequestOptions
  ): Promise<EmailImportResponse>
  async function importEmail(
    input: EmailImportInput,
    options?: RequestOptions
  ): Promise<EmailImportResponse | BrewRawResponse<EmailImportResponse>> {
    const response = await client.request<EmailImportResponse>({
      method: 'POST',
      path: '/v1/emails/import',
      body: input,
      defaultTimeoutMs: IMPORT_EMAIL_DEFAULT_TIMEOUT_MS,
      ...(options ? { options } : {}),
    })
    return unwrapResponse(response, options)
  }
  return importEmail
}
