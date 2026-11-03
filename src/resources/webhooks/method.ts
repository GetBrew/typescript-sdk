import {
  unwrapResponse,
  type HttpClient,
  type HttpRequestInput,
} from '../../core/http'
import type { BrewRawResponse, RequestOptions } from '../../types'

/** Keep URL/body projection in resource methods and transport/raw-response behavior here. */
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
