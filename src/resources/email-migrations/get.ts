import { unwrapResponse, type HttpClient } from '../../core/http'
import type { BrewRawResponse, RequestOptions } from '../../types'
import type { GetEmailMigrationResponse } from './types'

export function createGetEmailMigration(client: HttpClient) {
  function get(
    migrationId: string,
    options: RequestOptions & { readonly raw: true }
  ): Promise<BrewRawResponse<GetEmailMigrationResponse>>
  function get(
    migrationId: string,
    options?: RequestOptions
  ): Promise<GetEmailMigrationResponse>
  async function get(
    migrationId: string,
    options?: RequestOptions
  ): Promise<
    GetEmailMigrationResponse | BrewRawResponse<GetEmailMigrationResponse>
  > {
    const response = await client.request<GetEmailMigrationResponse>({
      method: 'GET',
      path: `/v1/email-migrations/${encodeURIComponent(migrationId)}`,
      ...(options ? { options } : {}),
    })
    return unwrapResponse(response, options)
  }
  return get
}
