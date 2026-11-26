import { unwrapResponse, type HttpClient } from '../../core/http'
import type { BrewRawResponse, RequestOptions } from '../../types'
import type { CancelEmailMigrationResponse } from './types'

export function createCancelEmailMigration(client: HttpClient) {
  function cancel(
    migrationId: string,
    options: RequestOptions & { readonly raw: true }
  ): Promise<BrewRawResponse<CancelEmailMigrationResponse>>
  function cancel(
    migrationId: string,
    options?: RequestOptions
  ): Promise<CancelEmailMigrationResponse>
  async function cancel(
    migrationId: string,
    options?: RequestOptions
  ): Promise<
    CancelEmailMigrationResponse | BrewRawResponse<CancelEmailMigrationResponse>
  > {
    const response = await client.request<CancelEmailMigrationResponse>({
      method: 'POST',
      path: `/v1/email-migrations/${encodeURIComponent(migrationId)}/cancel`,
      ...(options ? { options } : {}),
    })
    return unwrapResponse(response, options)
  }
  return cancel
}
