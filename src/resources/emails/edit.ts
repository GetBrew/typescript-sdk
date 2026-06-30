import type { components } from '../../generated/openapi-types'
import { unwrapResponse, type HttpClient } from '../../core/http'
import type { BrewRawResponse, RequestOptions } from '../../types'

export type EditEmailInput = {
  /**
   * The id of the saved email to edit. The email must belong to the
   * brand the API key is scoped to. Cross-brand or unknown ids surface
   * as `404 EMAIL_NOT_FOUND` from the server.
   */
  readonly emailId: string
} & components['schemas']['EmailEditRequest']

export type EditEmailResponse = components['schemas']['EmailGenerateResponse']

/**
 * Default per-request timeout for `PATCH /v1/emails/{emailId}`. Edit
 * runs the same agent loop as generate (planning, render, screenshot),
 * so we share the 4-minute ceiling. Caller-supplied
 * `RequestOptions.timeoutMs` and `RequestOptions.signal` still win.
 */
export const EDIT_EMAIL_DEFAULT_TIMEOUT_MS = 240_000

/**
 * Edit a saved email by running the Brew email agent against its
 * current `latest` version. The new draft is persisted as a new
 * `version: "latest"` row on the same `emailId`, and the previous
 * head is demoted to a numeric historical version.
 *
 * The brand is resolved from the API key — `EditEmailInput` does not
 * accept a `brandId` field. The `emailId` is sent on the URL, so it
 * must not appear in the body either; sending either returns
 * `400 INVALID_REQUEST`.
 *
 * The response is the same union returned by `emails.generate`:
 * narrow on `'emailId' in result` to access the artifact, otherwise
 * the agent answered with prose and `result.response` carries the
 * text.
 */
export function createEditEmail(client: HttpClient) {
  function editEmail(
    input: EditEmailInput,
    options: RequestOptions & { readonly raw: true }
  ): Promise<BrewRawResponse<EditEmailResponse>>
  function editEmail(
    input: EditEmailInput,
    options?: RequestOptions
  ): Promise<EditEmailResponse>
  async function editEmail(
    input: EditEmailInput,
    options?: RequestOptions
  ): Promise<EditEmailResponse | BrewRawResponse<EditEmailResponse>> {
    const { emailId, ...body } = input
    const resolvedOptions: RequestOptions = {
      ...(options ?? {}),
      timeoutMs: options?.timeoutMs ?? EDIT_EMAIL_DEFAULT_TIMEOUT_MS,
    }
    const response = await client.request<EditEmailResponse>({
      method: 'PATCH',
      path: `/v1/emails/${encodeURIComponent(emailId)}`,
      body,
      options: resolvedOptions,
    })
    return unwrapResponse(response, resolvedOptions)
  }
  return editEmail
}
