import { unwrapResponse, type HttpClient } from '../../core/http'
import type { BrewRawResponse, RequestOptions } from '../../types'

import type { GenerateEmailResponse } from './generate'

export type RestoreEmailInput = {
  emailId: string
  restoreVersion: number
}

/** Restore returns the same generated-email shape as generate / edit. */
export type RestoreEmailResponse = GenerateEmailResponse

/**
 * `PATCH /v1/emails { emailId, restoreVersion }` — non-destructively
 * clone a historical version into a new `latest` (history preserved).
 * `404 EMAIL_VERSION_NOT_FOUND` when the version doesn't exist.
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
    const response = await client.request<RestoreEmailResponse>({
      method: 'PATCH',
      path: '/v1/emails',
      body: input,
      ...(options ? { options } : {}),
    })
    return unwrapResponse(response, options)
  }
  return restoreEmail
}
