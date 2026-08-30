import { unwrapResponse, type HttpClient } from '../../core/http'
import type { BrewRawResponse, RequestOptions } from '../../types'

import type { RunDataCommandInput, RunDataCommandResponse } from './types'

export type { RunDataCommandInput, RunDataCommandResponse }

/**
 * `POST /v1/data` — run one `db …` command (find/agg/get + policy-gated
 * writes, composable with jq/grep/sort pipes). Start with `db ls` and
 * `db schema <table>`. A failed COMMAND is still HTTP 200 with
 * `exitCode !== 0` and the message in `output` — read it, adjust, retry.
 *
 * Pass `{ raw: true }` in `options` to receive the full
 * `BrewRawResponse<RunDataCommandResponse>` instead of the unwrapped
 * payload.
 */
export function createRunDataCommand(client: HttpClient) {
  function runDataCommand(
    input: RunDataCommandInput,
    options: RequestOptions & { readonly raw: true }
  ): Promise<BrewRawResponse<RunDataCommandResponse>>
  function runDataCommand(
    input: RunDataCommandInput,
    options?: RequestOptions
  ): Promise<RunDataCommandResponse>
  async function runDataCommand(
    input: RunDataCommandInput,
    options?: RequestOptions
  ): Promise<RunDataCommandResponse | BrewRawResponse<RunDataCommandResponse>> {
    const response = await client.request<RunDataCommandResponse>({
      method: 'POST',
      path: '/v1/data',
      body: input,
      ...(options ? { options } : {}),
    })
    return unwrapResponse(response, options)
  }
  return runDataCommand
}
