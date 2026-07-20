import type { components } from '../../generated/openapi-types'
import { unwrapResponse, type HttpClient } from '../../core/http'
import type { BrewRawResponse, RequestOptions } from '../../types'

/**
 * Body of `POST /v1/emails/{emailId}/export`, plus the `emailId` that goes on
 * the URL.
 *
 * Set `dry_run: true` to validate the design, brand ownership, and the ESP
 * connection without creating a template.
 */
export type ExportEmailInput = {
  /** The design to export. Cross-brand or unknown ids surface as `404`. */
  readonly emailId: string
} & components['schemas']['EmailExportRequest']

/**
 * 200 result of `POST /v1/emails/{emailId}/export` — what was written to the
 * ESP (`{ emailId, provider, providerName, templateName, templateId?,
 * dryRun }`). On a dry run `dryRun` is `true` and no `templateId` is issued.
 */
export type ExportEmailResponse = components['schemas']['EmailExportResponse']

/** The ESPs a design can be exported to. */
export type ExportProvider = ExportEmailResponse['provider']

/**
 * `POST /v1/emails/{emailId}/export` (scope: `emails`) — export a design to a
 * connected ESP as a template, so you can send it from a stack you already
 * run.
 *
 * The ESP must be connected for the brand: exporting to one that is not
 * surfaces as `400 INTEGRATION_NOT_CONNECTED`. If the provider rejects the
 * template or is temporarily unavailable you get `502 EXPORT_PROVIDER_ERROR`.
 *
 * Supply `options.idempotencyKey` to make retries safe; one is generated
 * automatically otherwise.
 *
 * Pass `{ raw: true }` in `options` to receive the full
 * `BrewRawResponse<ExportEmailResponse>` instead of the unwrapped payload.
 */
export function createExportEmail(client: HttpClient) {
  function exportEmail(
    input: ExportEmailInput,
    options: RequestOptions & { readonly raw: true }
  ): Promise<BrewRawResponse<ExportEmailResponse>>
  function exportEmail(
    input: ExportEmailInput,
    options?: RequestOptions
  ): Promise<ExportEmailResponse>
  async function exportEmail(
    input: ExportEmailInput,
    options?: RequestOptions
  ): Promise<ExportEmailResponse | BrewRawResponse<ExportEmailResponse>> {
    const { emailId, ...body } = input
    const response = await client.request<ExportEmailResponse>({
      method: 'POST',
      path: `/v1/emails/${encodeURIComponent(emailId)}/export`,
      body,
      ...(options ? { options } : {}),
    })
    return unwrapResponse(response, options)
  }
  return exportEmail
}
