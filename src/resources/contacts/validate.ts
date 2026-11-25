import type { components } from '../../generated/openapi-types'
import { unwrapResponse, type HttpClient } from '../../core/http'
import type { BrewRawResponse, RequestOptions } from '../../types'

export type ValidateContactsInput = {
  readonly emails: ReadonlyArray<string>
}

export type ValidateContactsResponse =
  components['schemas']['ContactsValidateResponse']

export type ContactValidationResult = ValidateContactsResponse['data'][number]

export function createValidateContacts(client: HttpClient) {
  function validate(
    input: ValidateContactsInput,
    options: RequestOptions & { readonly raw: true }
  ): Promise<BrewRawResponse<ValidateContactsResponse>>
  function validate(
    input: ValidateContactsInput,
    options?: RequestOptions
  ): Promise<ValidateContactsResponse>
  async function validate(
    input: ValidateContactsInput,
    options?: RequestOptions
  ): Promise<
    ValidateContactsResponse | BrewRawResponse<ValidateContactsResponse>
  > {
    const response = await client.request<ValidateContactsResponse>({
      method: 'POST',
      path: '/v1/contacts/validate',
      body: input,
      ...(options ? { options } : {}),
    })
    return unwrapResponse(response, options)
  }
  return validate
}
