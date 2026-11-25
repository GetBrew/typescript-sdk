import {
  unwrapResponse,
  type HttpClient,
  type HttpRequestInput,
} from '../../core/http'
import type { BrewRawResponse, RequestOptions } from '../../types'

export function webhookMethod<Input, Output>(
  client: HttpClient,
  request: (input: Input) => Omit<HttpRequestInput, 'options'>
) {
  function call(
    input: Input,
    options: RequestOptions & { readonly raw: true }
  ): Promise<BrewRawResponse<Output>>
  function call(input: Input, options?: RequestOptions): Promise<Output>
  async function call(
    input: Input,
    options?: RequestOptions
  ): Promise<Output | BrewRawResponse<Output>> {
    return unwrapResponse(
      await client.request<Output>({
        ...request(input),
        ...(options ? { options } : {}),
      }),
      options
    )
  }
  return call
}
