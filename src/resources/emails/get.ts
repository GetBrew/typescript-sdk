import type { components } from '../../generated/openapi-types'
import { unwrapResponse, type HttpClient } from '../../core/http'
import type { BrewRawResponse, RequestOptions } from '../../types'

export type GetEmailInput = {
  emailId: string
}

/** Single-fetch returns the `{ emails: [item] }` one-element envelope. */
export type GetEmailResponse = components['schemas']['EmailsListResponse']

/** Version history returns `{ emails: [item], versions: [...] }`. */
export type EmailVersionsResponse = components['schemas']['EmailsListResponse']

/**
 * `GET /v1/emails?emailId=…` — single email (one-element `emails[]`,
 * or `404 EMAIL_NOT_FOUND`).
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
      path: '/v1/emails',
      query: { emailId: input.emailId },
      ...(options ? { options } : {}),
    })
    return unwrapResponse(response, options)
  }
  return getEmail
}

/**
 * `GET /v1/emails?emailId=…&include=versions` — the email plus its
 * full `versions[]` history.
 */
export function createListEmailVersions(client: HttpClient) {
  function emailVersions(
    input: GetEmailInput,
    options: RequestOptions & { readonly raw: true }
  ): Promise<BrewRawResponse<EmailVersionsResponse>>
  function emailVersions(
    input: GetEmailInput,
    options?: RequestOptions
  ): Promise<EmailVersionsResponse>
  async function emailVersions(
    input: GetEmailInput,
    options?: RequestOptions
  ): Promise<EmailVersionsResponse | BrewRawResponse<EmailVersionsResponse>> {
    const response = await client.request<EmailVersionsResponse>({
      method: 'GET',
      path: '/v1/emails',
      query: { emailId: input.emailId, include: 'versions' },
      ...(options ? { options } : {}),
    })
    return unwrapResponse(response, options)
  }
  return emailVersions
}
