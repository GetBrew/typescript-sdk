import type { components } from '../../generated/openapi-types'
import { unwrapResponse, type HttpClient } from '../../core/http'
import type { BrewRawResponse, RequestOptions } from '../../types'

export type GenerateEmailInput = components['schemas']['EmailGenerateRequest']
export type GenerateEmailResponse =
  components['schemas']['EmailGenerateResponse']

/**
 * Generate an email from a prompt and optional brand or reference context.
 *
 * The response is a union.
 * - Normal case. a generated email artifact with `emailId` and `emailHtml`.
 * - Fallback case. a plain `{ response }` object when no email artifact was
 *   produced by the upstream agent flow.
 *
 * Pass `{ raw: true }` in `options` to receive the full
 * `BrewRawResponse<GenerateEmailResponse>` instead of the unwrapped
 * payload.
 */
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
      ...(options ? { options } : {}),
    })
    return unwrapResponse(response, options)
  }
  return generateEmail
}
