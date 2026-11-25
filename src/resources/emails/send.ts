import { type HttpClient, unwrapResponse } from '../../core/http'
import type { components } from '../../generated/openapi-types'
import type { BrewRawResponse, RequestOptions } from '../../types'

type WithTypedPayload<T, TPayload> = T extends { payload?: unknown }
  ? Omit<T, 'payload'> & { payload?: TPayload }
  : T

type DefaultSendPayload = {
  [key: string]: components['schemas']['SendPayloadValue']
}

export type SendEmailInput<
  TPayload extends Record<string, unknown> = DefaultSendPayload,
> = WithTypedPayload<components['schemas']['SendEmailRequest'], TPayload>

export type SendEmailTestResponse =
  components['schemas']['SendEmailTestResponse']

export type SendEmailCampaignResponse =
  components['schemas']['SendsPostResponse']

export type SendEmailResponse =
  | SendEmailTestResponse
  | SendEmailCampaignResponse

export type SendEmailStatus = SendEmailResponse['status']

export function createSendEmail(client: HttpClient) {
  function sendEmail<
    TPayload extends Record<string, unknown> = DefaultSendPayload,
  >(
    input: SendEmailInput<TPayload>,
    options: RequestOptions & { readonly raw: true }
  ): Promise<BrewRawResponse<SendEmailResponse>>
  function sendEmail<
    TPayload extends Record<string, unknown> = DefaultSendPayload,
  >(
    input: SendEmailInput<TPayload>,
    options?: RequestOptions
  ): Promise<SendEmailResponse>
  async function sendEmail(
    input: SendEmailInput,
    options?: RequestOptions
  ): Promise<SendEmailResponse | BrewRawResponse<SendEmailResponse>> {
    const response = await client.request<SendEmailResponse>({
      method: 'POST',
      path: '/v1/sends',
      body: input,
      ...(options ? { options } : {}),
    })
    return unwrapResponse(response, options)
  }
  return sendEmail
}
