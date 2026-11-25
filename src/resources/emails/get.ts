import type { components } from '../../generated/openapi-types'
import { unwrapResponse, type HttpClient } from '../../core/http'
import { serializeInclude } from '../../core/url'
import type { BrewRawResponse, RequestOptions } from '../../types'

export const EMAILS_INCLUDE_TOKENS = [
  'html',
  'versions',
  'text',
  'links',
] as const
export type EmailsIncludeToken = (typeof EMAILS_INCLUDE_TOKENS)[number]

export type GetEmailOptions = RequestOptions & {
  readonly include?: ReadonlyArray<EmailsIncludeToken> | string
  readonly emailVersionId?: string
  readonly runId?: string
}

export type GetEmailResponse = components['schemas']['EmailDetail']

export function createGetEmail(client: HttpClient) {
  function getEmail(
    emailId: string,
    options: GetEmailOptions & { readonly raw: true }
  ): Promise<BrewRawResponse<GetEmailResponse>>
  function getEmail(
    emailId: string,
    options?: GetEmailOptions
  ): Promise<GetEmailResponse>
  async function getEmail(
    emailId: string,
    options?: GetEmailOptions
  ): Promise<GetEmailResponse | BrewRawResponse<GetEmailResponse>> {
    const include = serializeInclude({ include: options?.include })
    const query = {
      ...(include !== undefined ? { include } : {}),
      ...(options?.emailVersionId !== undefined
        ? { emailVersionId: options.emailVersionId }
        : {}),
      ...(options?.runId !== undefined ? { runId: options.runId } : {}),
    }
    const response = await client.request<GetEmailResponse>({
      method: 'GET',
      path: `/v1/emails/${encodeURIComponent(emailId)}`,
      ...(Object.keys(query).length > 0 ? { query } : {}),
      ...(options ? { options } : {}),
    })
    return unwrapResponse(response, options)
  }
  return getEmail
}
