import { type HttpClient, unwrapResponse } from '../../core/http'
import type { BrewRawResponse, RequestOptions } from '../../types'
import type {
  CanvasSession,
  CreateCanvasSessionInput,
} from '../../embed/contracts'

type SessionMethod<Input> = {
  (
    input: Input,
    options: RequestOptions & { readonly raw: true }
  ): Promise<BrewRawResponse<CanvasSession>>
  (input: Input, options?: RequestOptions): Promise<CanvasSession>
}
export type CanvasResource = {
  readonly sessions: {
    readonly create: SessionMethod<CreateCanvasSessionInput>
    readonly refresh: SessionMethod<string>
    readonly revoke: (
      sessionId: string,
      options?: RequestOptions
    ) => Promise<void>
  }
}
export function createCanvasResource(client: HttpClient): CanvasResource {
  function create(
    input: CreateCanvasSessionInput,
    options: RequestOptions & { readonly raw: true }
  ): Promise<BrewRawResponse<CanvasSession>>
  function create(
    input: CreateCanvasSessionInput,
    options?: RequestOptions
  ): Promise<CanvasSession>
  async function create(
    input: CreateCanvasSessionInput,
    options?: RequestOptions
  ): Promise<CanvasSession | BrewRawResponse<CanvasSession>> {
    const response = await client.request<CanvasSession>({
      method: 'POST',
      path: '/v1/canvas/sessions',
      body: input,
      idempotency: 'none',
      defaultMaxRetries: 0,
      ...(options ? { options } : {}),
    })
    return unwrapResponse(response, options)
  }
  function refresh(
    sessionId: string,
    options: RequestOptions & { readonly raw: true }
  ): Promise<BrewRawResponse<CanvasSession>>
  function refresh(
    sessionId: string,
    options?: RequestOptions
  ): Promise<CanvasSession>
  async function refresh(
    sessionId: string,
    options?: RequestOptions
  ): Promise<CanvasSession | BrewRawResponse<CanvasSession>> {
    const response = await client.request<CanvasSession>({
      method: 'POST',
      path: `/v1/canvas/sessions/${encodeURIComponent(sessionId)}/refresh`,
      idempotency: 'none',
      defaultMaxRetries: 0,
      ...(options ? { options } : {}),
    })
    return unwrapResponse(response, options)
  }
  return {
    sessions: {
      create,
      refresh,
      revoke: async (sessionId, options) => {
        await client.request({
          method: 'DELETE',
          path: `/v1/canvas/sessions/${encodeURIComponent(sessionId)}`,
          ...(options ? { options } : {}),
        })
      },
    },
  }
}
