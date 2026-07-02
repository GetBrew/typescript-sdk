import type { components } from '../../generated/openapi-types'
import { unwrapResponse, type HttpClient } from '../../core/http'
import type { BrewRawResponse, RequestOptions } from '../../types'

export type PreviewEmailClientsInput = {
  /**
   * The id of the email design to render. The design must belong to the
   * brand the API key is scoped to. Cross-brand or unknown ids surface
   * as `404 EMAIL_NOT_FOUND` from the server.
   */
  readonly emailId: string
} & components['schemas']['EmailClientPreviewRequest']

/**
 * Per-client render batch returned by
 * `POST /v1/emails/{emailId}/client-previews`.
 */
export type EmailClientPreviewResponse =
  components['schemas']['EmailClientPreviewResponse']

/**
 * Default per-request timeout for
 * `POST /v1/emails/{emailId}/client-previews`. The server renders in
 * real clients and blocks up to ~55s before returning whatever finished,
 * so the per-call ceiling sits above the global SDK default.
 * Caller-supplied `RequestOptions.timeoutMs` and `RequestOptions.signal`
 * still win.
 */
export const PREVIEW_EMAIL_CLIENTS_DEFAULT_TIMEOUT_MS = 90_000

/**
 * `POST /v1/emails/{emailId}/client-previews` (scope: `emails`) — render
 * the design's latest version across REAL email clients & devices
 * (Gmail, Outlook, Apple Mail, iOS — with dark-mode variants — plus
 * Yahoo) and return a screenshot per client, rehosted on the Brew CDN.
 *
 * Pass `clients` (ids from the supported catalogue — the field's
 * OpenAPI description carries the full `id = label` list) to target
 * specific inboxes/devices, or omit it for a popular default spread.
 * Rendering is a single bounded call: clients still rendering when the
 * window elapses come back in `pending` with `status: "partial"` — call
 * again to retry them.
 *
 * Fixed cost: 10 credits, charged only when at least one client renders
 * (`X-Credit-Cost: 10`). A batch where ZERO clients finish (or a
 * preview-provider outage) returns a retryable `503 SERVICE_UNAVAILABLE`
 * and is NOT billed. Unknown client ids are rejected with a `422`
 * before any paid work happens.
 *
 * Pass `{ raw: true }` in `options` to receive the full
 * `BrewRawResponse<EmailClientPreviewResponse>` (headers include
 * `X-Credit-Cost` / `X-Credits-Remaining`) instead of the unwrapped
 * payload.
 */
export function createPreviewEmailClients(client: HttpClient) {
  function previewClients(
    input: PreviewEmailClientsInput,
    options: RequestOptions & { readonly raw: true }
  ): Promise<BrewRawResponse<EmailClientPreviewResponse>>
  function previewClients(
    input: PreviewEmailClientsInput,
    options?: RequestOptions
  ): Promise<EmailClientPreviewResponse>
  async function previewClients(
    input: PreviewEmailClientsInput,
    options?: RequestOptions
  ): Promise<
    EmailClientPreviewResponse | BrewRawResponse<EmailClientPreviewResponse>
  > {
    const { emailId, ...body } = input
    const resolvedOptions: RequestOptions = {
      ...(options ?? {}),
      timeoutMs: options?.timeoutMs ?? PREVIEW_EMAIL_CLIENTS_DEFAULT_TIMEOUT_MS,
    }
    const response = await client.request<EmailClientPreviewResponse>({
      method: 'POST',
      path: `/v1/emails/${encodeURIComponent(emailId)}/client-previews`,
      body,
      options: resolvedOptions,
    })
    return unwrapResponse(response, resolvedOptions)
  }
  return previewClients
}
