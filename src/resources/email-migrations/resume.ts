import { unwrapResponse, type HttpClient } from '../../core/http'
import type { BrewRawResponse, RequestOptions } from '../../types'
import type { ResumeEmailMigrationResponse } from './types'

export function createResumeEmailMigration(client: HttpClient) {
  function resume(
    migrationId: string,
    options: RequestOptions & { readonly raw: true }
  ): Promise<BrewRawResponse<ResumeEmailMigrationResponse>>
  function resume(
    migrationId: string,
    options?: RequestOptions
  ): Promise<ResumeEmailMigrationResponse>
  async function resume(
    migrationId: string,
    options?: RequestOptions
  ): Promise<
    ResumeEmailMigrationResponse | BrewRawResponse<ResumeEmailMigrationResponse>
  > {
    const response = await client.request<ResumeEmailMigrationResponse>({
      method: 'POST',
      path: `/v1/email-migrations/${encodeURIComponent(migrationId)}/resume`,
      ...(options ? { options } : {}),
    })
    return unwrapResponse(response, options)
  }
  return resume
}
