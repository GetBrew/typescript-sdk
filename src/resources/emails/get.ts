import type { components, operations } from '../../generated/openapi-types'
import { unwrapResponse, type HttpClient } from '../../core/http'
import type { BrewRawResponse, RequestOptions } from '../../types'

export type GetEmailInput = {
  emailId: string
}

/** Single-fetch returns the bare design row (identity + `status` + `html`). */
export type GetEmailResponse = components['schemas']['EmailDetail']

export type ListEmailVersionsInput = {
  emailId: string
} & operations['listEmailVersions']['parameters']['query']

/** Version history returns the uniform `{ data, pagination }` envelope. */
export type EmailVersionsResponse =
  components['schemas']['EmailVersionsResponse']

/**
 * `GET /v1/emails/{emailId}` (scope: `emails`) — fetch one design row,
 * including the rendered `html` of the current latest version (and
 * `previewImage` when captured). Unknown / cross-brand ids surface as
 * `404 EMAIL_NOT_FOUND`.
 */
export function createGetEmail(client: HttpClient) {
  function getEmail(
    input: GetEmailInput,
    options: RequestOptions & { readonly raw: true }
  ): Promise<BrewRawResponse<GetEmailResponse>>
  function getEmail(
    input: GetEmailInput,
    options?: RequestOptions
  ): Promise<GetEmailResponse>
  async function getEmail(
    input: GetEmailInput,
    options?: RequestOptions
  ): Promise<GetEmailResponse | BrewRawResponse<GetEmailResponse>> {
    const response = await client.request<GetEmailResponse>({
      method: 'GET',
      path: `/v1/emails/${encodeURIComponent(input.emailId)}`,
      ...(options ? { options } : {}),
    })
    return unwrapResponse(response, options)
  }
  return getEmail
}

/**
 * `GET /v1/emails/{emailId}/versions` (scope: `emails`) — the email's
 * version history under the uniform `{ data, pagination }` envelope,
 * latest first. `version: 'latest'` is the current head; numeric
 * versions are historical snapshots. Page with `limit` / `cursor`.
 */
export function createListEmailVersions(client: HttpClient) {
  function emailVersions(
    input: ListEmailVersionsInput,
    options: RequestOptions & { readonly raw: true }
  ): Promise<BrewRawResponse<EmailVersionsResponse>>
  function emailVersions(
    input: ListEmailVersionsInput,
    options?: RequestOptions
  ): Promise<EmailVersionsResponse>
  async function emailVersions(
    input: ListEmailVersionsInput,
    options?: RequestOptions
  ): Promise<EmailVersionsResponse | BrewRawResponse<EmailVersionsResponse>> {
    const { emailId, ...query } = input
    const response = await client.request<EmailVersionsResponse>({
      method: 'GET',
      path: `/v1/emails/${encodeURIComponent(emailId)}/versions`,
      ...(Object.keys(query).length > 0 ? { query } : {}),
      ...(options ? { options } : {}),
    })
    return unwrapResponse(response, options)
  }
  return emailVersions
}
