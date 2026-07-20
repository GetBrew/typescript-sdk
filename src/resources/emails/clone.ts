import type { components } from '../../generated/openapi-types'
import { unwrapResponse, type HttpClient } from '../../core/http'
import type { BrewRawResponse, RequestOptions } from '../../types'

/**
 * Body of `POST /v1/emails/{emailId}/clone`, plus the `emailId` that goes on
 * the URL. Omit `emailVersionId` to clone the current latest version.
 */
export type CloneEmailInput = {
  /** The design to clone. Cross-brand or unknown ids surface as `404`. */
  readonly emailId: string
} & components['schemas']['EmailCloneRequest']

/**
 * 201 result of `POST /v1/emails/{emailId}/clone` — the NEW design, in the
 * same shape as `emails.generate` (`{ emailId, emailVersionId, html,
 * previewImage? }`).
 */
export type CloneEmailResponse =
  components['schemas']['EmailGenerateGeneratedResponse']

/**
 * `POST /v1/emails/{emailId}/clone` (scope: `emails`) — duplicate a design
 * into a brand new one, leaving the original untouched.
 *
 * Use it to branch a variant for an A/B test, or to keep a known-good design
 * intact while you iterate on a copy. Pass `emailVersionId` to clone an exact
 * historical version rather than the current latest.
 *
 * The returned `emailId` is the CLONE, so subsequent edits and sends should
 * target it. Supply `options.idempotencyKey` to make retries safe; one is
 * generated automatically otherwise.
 *
 * Pass `{ raw: true }` in `options` to receive the full
 * `BrewRawResponse<CloneEmailResponse>` instead of the unwrapped payload.
 */
export function createCloneEmail(client: HttpClient) {
  function cloneEmail(
    input: CloneEmailInput,
    options: RequestOptions & { readonly raw: true }
  ): Promise<BrewRawResponse<CloneEmailResponse>>
  function cloneEmail(
    input: CloneEmailInput,
    options?: RequestOptions
  ): Promise<CloneEmailResponse>
  async function cloneEmail(
    input: CloneEmailInput,
    options?: RequestOptions
  ): Promise<CloneEmailResponse | BrewRawResponse<CloneEmailResponse>> {
    const { emailId, ...body } = input
    const response = await client.request<CloneEmailResponse>({
      method: 'POST',
      path: `/v1/emails/${encodeURIComponent(emailId)}/clone`,
      body,
      ...(options ? { options } : {}),
    })
    return unwrapResponse(response, options)
  }
  return cloneEmail
}
