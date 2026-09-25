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
 * The rendering job `POST /v1/emails/{emailId}/client-previews` admits (or
 * the existing job for the same version and clients): `previewId`, the job
 * `status`, per-client results, `nextPollAfterMs` and the credit
 * reservation.
 */
export type EmailClientPreviewResponse =
  components['schemas']['EmailClientPreviewResponse']

/**
 * Per-request timeout for `POST /v1/emails/{emailId}/client-previews`.
 * Admission stages the design and answers promptly; the rendering itself
 * continues server-side, so this only bounds the admission call.
 * Caller-supplied `RequestOptions.timeoutMs` and `RequestOptions.signal`
 * still win.
 */
export const PREVIEW_EMAIL_CLIENTS_DEFAULT_TIMEOUT_MS = 90_000

/**
 * `POST /v1/emails/{emailId}/client-previews` (scope: `emails`) — start a
 * rendering job for the design across REAL email clients & devices (Gmail,
 * Outlook, Apple Mail, iOS — with dark-mode variants — plus Yahoo). Pin a
 * saved version with `emailVersionId`, or omit it for the latest.
 *
 * Answers `202` with the admitted job (`status: 'queued' | 'running'`), or
 * `200` with the existing job for the same version and clients. Poll
 * `brew.emails.getClientPreview(previewId)` after `nextPollAfterMs` until
 * it settles as `completed`, `partially_completed` or `failed`; each client
 * then carries its full-size `imageUrl`, or a `reason` and whether it is
 * `retryable`. Polling never resubmits or charges again.
 *
 * Pass `clients` (ids from the supported catalogue — the field's OpenAPI
 * description carries the full `id = label` list) to target specific
 * inboxes/devices, or omit it for a popular default spread. Unknown client
 * ids are rejected with a `422` before any paid work happens.
 *
 * Fixed cost: 10 credits, reserved at admission and settled once; a job
 * that renders nothing releases them (`credits.status`).
 *
 * Pass `{ raw: true }` in `options` to receive the full
 * `BrewRawResponse<EmailClientPreviewResponse>` instead of the job.
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
