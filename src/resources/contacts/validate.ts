import type { components } from '../../generated/openapi-types'
import { unwrapResponse, type HttpClient } from '../../core/http'
import type { BrewRawResponse, RequestOptions } from '../../types'

/**
 * Caller-facing input for a batch email validation. Matches the spec's
 * `ContactsValidateRequest` (`{ emails: string[] }`) but with a
 * `readonly` array so callers cannot mutate the input after passing it.
 */
export type ValidateContactsInput = {
  readonly emails: ReadonlyArray<string>
}

export type ValidateContactsResponse =
  components['schemas']['ContactsValidateResponse']

/** One per-email validation result in `ValidateContactsResponse.data`. */
export type ContactValidationResult =
  ValidateContactsResponse['data'][number]

/**
 * Validate a batch of email addresses without creating any contacts.
 *
 * The wire format is `{ emails: [...] }`. Each address comes back in
 * `data` with a `valid` boolean, a `status` of `valid` | `risky` |
 * `invalid`, and an optional human-readable `reason` when the address is
 * risky or invalid. Order is not guaranteed to match the input — match on
 * `email`.
 *
 * Returns the full `ContactsValidateResponse` envelope (`{ data }`).
 *
 * Pass `{ raw: true }` in `options` to receive the full
 * `BrewRawResponse<ValidateContactsResponse>` instead of the unwrapped
 * payload.
 */
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
