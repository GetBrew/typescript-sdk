import type { components } from '../../generated/openapi-types'
import { unwrapResponse, type HttpClient } from '../../core/http'
import type { BrewRawResponse, RequestOptions } from '../../types'

/**
 * Body for `POST /v1/emails/import` — import an existing email as a new
 * saved design. Provide the raw `content` and its `format` (`'html'` or
 * `'jsx'`); optionally a `title` and a `baseUrl` used to resolve
 * relative asset URLs in the source.
 */
export type EmailImportInput = components['schemas']['EmailImportRequest']

/**
 * Mirrors the generate response: the persisted design's identity, the
 * pinned `emailVersionId`, the rendered `html`, and `previewImage` when
 * one was captured.
 */
export type EmailImportResponse =
  components['schemas']['EmailGenerateGeneratedResponse']

/**
 * `POST /v1/emails/import` (scope: `emails`) — import an existing email
 * (raw `html` or React-Email `jsx`) as a new editable Brand design,
 * returning the same shape as `brew.emails.generate(...)`: `emailId`,
 * the pinned `emailVersionId`, the rendered `html`, and `previewImage`.
 * Resolves with HTTP 201.
 *
 * The brand is resolved from the API key — the body does not accept a
 * `brandId`. Pass `baseUrl` to resolve relative asset URLs in the
 * source. This operation is usage-metered (the agent's token usage is
 * charged); an insufficient balance surfaces as
 * `402 INSUFFICIENT_CREDITS`.
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
      ...(options ? { options } : {}),
    })
    return unwrapResponse(response, options)
  }
  return importEmail
}
