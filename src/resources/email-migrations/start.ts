import { unwrapResponse, type HttpClient } from '../../core/http'
import type { BrewRawResponse, RequestOptions } from '../../types'
import type {
  StartEmailMigrationInput,
  StartEmailMigrationResponse,
} from './types'

export function createStartEmailMigration(client: HttpClient) {
  function start(
    input: StartEmailMigrationInput,
    options: RequestOptions & { readonly raw: true }
  ): Promise<BrewRawResponse<StartEmailMigrationResponse>>
  function start(
    input: StartEmailMigrationInput,
    options?: RequestOptions
  ): Promise<StartEmailMigrationResponse>
  async function start(
    input: StartEmailMigrationInput,
    options?: RequestOptions
  ): Promise<
    StartEmailMigrationResponse | BrewRawResponse<StartEmailMigrationResponse>
  > {
    const response = await client.request<StartEmailMigrationResponse>({
      method: 'POST',
      path: '/v1/email-migrations',
      body: input,
      ...(options ? { options } : {}),
    })
    return unwrapResponse(response, options)
  }
  return start
}
