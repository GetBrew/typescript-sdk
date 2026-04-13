import type { components } from '../../generated/openapi-types'
import type { HttpClient } from '../../core/http'
import type { RequestOptions } from '../../types'

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
 */
export function createGenerateEmail(client: HttpClient) {
  return async (
    input: GenerateEmailInput,
    options?: RequestOptions
  ): Promise<GenerateEmailResponse> => {
    const response = await client.request<GenerateEmailResponse>({
      method: 'POST',
      path: '/v1/emails',
      body: input,
      ...(options ? { options } : {}),
    })
    return response.data
  }
}
