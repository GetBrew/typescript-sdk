import type { components } from '../../generated/openapi-types'
import { unwrapResponse, type HttpClient } from '../../core/http'
import type { BrewRawResponse, RequestOptions } from '../../types'

export type GenerateEmailInput = components['schemas']['EmailGenerateRequest']
export type GenerateEmailResponse =
  components['schemas']['EmailGenerateResponse']

export const GENERATE_EMAIL_DEFAULT_TIMEOUT_MS = 240_000

export function createGenerateEmail(client: HttpClient) {
  function generateEmail(
    input: GenerateEmailInput,
    options: RequestOptions & { readonly raw: true }
  ): Promise<BrewRawResponse<GenerateEmailResponse>>
  function generateEmail(
    input: GenerateEmailInput,
    options?: RequestOptions
  ): Promise<GenerateEmailResponse>
  async function generateEmail(
    input: GenerateEmailInput,
    options?: RequestOptions
  ): Promise<GenerateEmailResponse | BrewRawResponse<GenerateEmailResponse>> {
    const response = await client.request<GenerateEmailResponse>({
      method: 'POST',
      path: '/v1/emails',
      body: input,
      defaultTimeoutMs: GENERATE_EMAIL_DEFAULT_TIMEOUT_MS,
      ...(options ? { options } : {}),
    })
    return unwrapResponse(response, options)
  }
  return generateEmail
}
