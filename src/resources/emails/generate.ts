import type { components } from '../../generated/openapi-types'
import { unwrapResponse, type HttpClient } from '../../core/http'
import type { BrewRawResponse, RequestOptions } from '../../types'

export type GenerateEmailInput = components['schemas']['EmailGenerateRequest']
export type GenerateEmailResponse =
  components['schemas']['EmailGenerateResponse']

/**
 * Default per-request timeout for `POST /v1/emails`.
 *
 * The Brew email agent typically takes 30–90 seconds to produce an
 * artifact (planning, render, screenshot). The
 * client default `timeoutMs` of 30s is too short for this single
 * endpoint and would surface as an `AbortError` mid-generation. We
 * raise the floor to 4 minutes here while still allowing callers to
 * override it via `RequestOptions.timeoutMs` or to supply an
 * `AbortSignal` of their own. The server route declares
 * `maxDuration = 800` seconds, so the SDK ceiling is well below the
 * server ceiling.
 */
export const GENERATE_EMAIL_DEFAULT_TIMEOUT_MS = 240_000

/**
 * Generate an email from a prompt and optional reference context.
 *
 * The brand is resolved from the API key — `GenerateEmailInput` does
 * not accept a `brandId` field. Sending one returns
 * `400 INVALID_REQUEST`.
 *
 * The response is a union.
 * - Normal case. a generated email artifact with `emailId` and `emailHtml`.
 * - Fallback case. a plain `{ response }` object when no email artifact was
 *   produced by the upstream agent flow.
 *
 * Generation is long-running. The SDK applies a 4-minute default
 * timeout for this endpoint; pass `RequestOptions.timeoutMs` to raise
 * it, or `RequestOptions.signal` to cancel a request from your own
 * `AbortController`.
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
    const resolvedOptions: RequestOptions = {
      ...(options ?? {}),
      timeoutMs: options?.timeoutMs ?? GENERATE_EMAIL_DEFAULT_TIMEOUT_MS,
    }
    const response = await client.request<GenerateEmailResponse>({
      method: 'POST',
      path: '/v1/emails',
      body: input,
      options: resolvedOptions,
    })
    return unwrapResponse(response, resolvedOptions)
  }
  return generateEmail
}
