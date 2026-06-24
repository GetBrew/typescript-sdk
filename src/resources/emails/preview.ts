import type { components } from '../../generated/openapi-types'
import { unwrapResponse, type HttpClient } from '../../core/http'
import type { BrewRawResponse, RequestOptions } from '../../types'

export type PreviewEmailInput = {
  /**
   * The id of the saved email to render. The email must belong to the
   * brand the API key is scoped to. Cross-brand or unknown ids surface
   * as `404 EMAIL_NOT_FOUND` from the server.
   */
  readonly emailId: string
  /**
   * Which device widths to render. `desktop` = 600px, `mobile` = 375px,
   * `all` (the default) renders both. Sent on the body; omitting it lets
   * the server default to `all`.
   */
  readonly device?: 'desktop' | 'mobile' | 'all'
}

/** The rendered preview URL(s) returned by `POST /v1/emails/{emailId}/preview`. */
export type PreviewEmailResponse =
  components['schemas']['EmailPreviewResponse']

/**
 * `POST /v1/emails/{emailId}/preview` — render the email's latest
 * version to a hosted PNG screenshot at one or both device widths
 * (`desktop` = 600px, `mobile` = 375px). Requires the `emails` scope.
 *
 * The brand is resolved from the API key and the `emailId` is sent on
 * the URL, so neither may appear in the body — sending either returns
 * `400 INVALID_REQUEST`.
 *
 * Returns `{ previews: [{ device, url, width }] }`. This operation is
 * credit-metered (low). An insufficient balance surfaces as
 * `402 INSUFFICIENT_CREDITS`.
 *
 * Pass `{ raw: true }` in `options` to receive the full
 * `BrewRawResponse<PreviewEmailResponse>` instead of the unwrapped
 * payload.
 */
export function createPreviewEmail(client: HttpClient) {
  function previewEmail(
    input: PreviewEmailInput,
    options: RequestOptions & { readonly raw: true }
  ): Promise<BrewRawResponse<PreviewEmailResponse>>
  function previewEmail(
    input: PreviewEmailInput,
    options?: RequestOptions
  ): Promise<PreviewEmailResponse>
  async function previewEmail(
    input: PreviewEmailInput,
    options?: RequestOptions
  ): Promise<PreviewEmailResponse | BrewRawResponse<PreviewEmailResponse>> {
    const { emailId, ...body } = input
    const response = await client.request<PreviewEmailResponse>({
      method: 'POST',
      path: `/v1/emails/${encodeURIComponent(emailId)}/preview`,
      body,
      ...(options ? { options } : {}),
    })
    return unwrapResponse(response, options)
  }
  return previewEmail
}
