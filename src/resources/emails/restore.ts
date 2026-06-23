import type { components } from '../../generated/openapi-types'
import { unwrapResponse, type HttpClient } from '../../core/http'
import type { BrewRawResponse, RequestOptions } from '../../types'

import type { GenerateEmailResponse } from './generate'

export type RestoreEmailInput = {
  /**
   * The id of the email design whose history is being restored from.
   * Sent on the URL — unknown or cross-brand ids surface as
   * `404 EMAIL_NOT_FOUND`.
   */
  readonly emailId: string
} & components['schemas']['EmailRestoreRequest']

/** Restore returns the same generated-email shape as generate / edit. */
export type RestoreEmailResponse = GenerateEmailResponse

/**
 * `POST /v1/emails/{emailId}/restore` (scope: `emails`) — non-destructively
 * clone the numbered `version` into a NEW `latest` row (the current head
 * is demoted to history, nothing is lost) and return the same
 * generated-email shape as an edit. `404 EMAIL_VERSION_NOT_FOUND` when
 * the version doesn't exist.
 */
export function createRestoreEmail(client: HttpClient) {
  function restoreEmail(
    input: RestoreEmailInput,
    options: RequestOptions & { readonly raw: true }
  ): Promise<BrewRawResponse<RestoreEmailResponse>>
  function restoreEmail(
    input: RestoreEmailInput,
    options?: RequestOptions
  ): Promise<RestoreEmailResponse>
  async function restoreEmail(
    input: RestoreEmailInput,
    options?: RequestOptions
  ): Promise<RestoreEmailResponse | BrewRawResponse<RestoreEmailResponse>> {
    const { emailId, ...body } = input
    const response = await client.request<RestoreEmailResponse>({
      method: 'POST',
      path: `/v1/emails/${encodeURIComponent(emailId)}/restore`,
      body,
      ...(options ? { options } : {}),
    })
    return unwrapResponse(response, options)
  }
  return restoreEmail
}
