import { unwrapResponse, type HttpClient } from '../../core/http'
import type { BrewRawResponse, RequestOptions } from '../../types'
import type * as T from './types'
import { webhookMethod } from './method'
import { verifyWebhook } from './verify'

export function createWebhooksResource(client: HttpClient) {
  function list(
    input: T.WebhookListInput | undefined,
    options: RequestOptions & { readonly raw: true }
  ): Promise<BrewRawResponse<T.ListWebhooksResponse>>
  function list(
    input?: T.WebhookListInput,
    options?: RequestOptions
  ): Promise<T.ListWebhooksResponse>
  async function list(
    input: T.WebhookListInput = {},
    options?: RequestOptions
  ): Promise<T.ListWebhooksResponse | BrewRawResponse<T.ListWebhooksResponse>> {
    return unwrapResponse(
      await client.request<T.ListWebhooksResponse>({
        method: 'GET',
        path: '/v1/webhooks',
        query: { limit: input.limit, cursor: input.cursor },
        ...(options ? { options } : {}),
      }),
      options
    )
  }
  return {
    list,
    verify: verifyWebhook,
    create: webhookMethod<T.CreateWebhookInput, T.CreateWebhookResponse>(
      client,
      (input) => ({ method: 'POST', path: '/v1/webhooks', body: input })
    ),
    get: webhookMethod<string, T.GetWebhookResponse>(client, (input) => ({
      method: 'GET',
      path: `/v1/webhooks/${encodeURIComponent(input)}`,
    })),
    update: webhookMethod<T.UpdateWebhookInput, T.UpdateWebhookResponse>(
      client,
      ({ webhookId, ...body }) => ({
        method: 'PATCH',
        path: `/v1/webhooks/${encodeURIComponent(webhookId)}`,
        body,
      })
    ),
    remove: webhookMethod<string, T.RemoveWebhookResponse>(client, (input) => ({
      method: 'DELETE',
      path: `/v1/webhooks/${encodeURIComponent(input)}`,
    })),
    rotateSecret: webhookMethod<string, T.RotateSecretWebhookResponse>(
      client,
      (input) => ({
        method: 'POST',
        path: `/v1/webhooks/${encodeURIComponent(input)}/rotate-secret`,
        body: {},
      })
    ),
    events: webhookMethod<T.WebhookEventsInput, T.EventsWebhookResponse>(
      client,
      (input) => ({
        method: 'GET',
        path: `/v1/webhooks/${encodeURIComponent(input.webhookId)}/events`,
        query: { limit: input.limit, cursor: input.cursor },
      })
    ),
    attempts: webhookMethod<T.WebhookAttemptsInput, T.AttemptsWebhookResponse>(
      client,
      (input) => ({
        method: 'GET',
        path: `/v1/webhooks/${encodeURIComponent(input.webhookId)}/events/${encodeURIComponent(input.eventId)}/attempts`,
        query: { limit: input.limit, cursor: input.cursor },
      })
    ),
    replay: webhookMethod<T.WebhookReplayInput, T.ReplayWebhookResponse>(
      client,
      (input) => ({
        method: 'POST',
        path: `/v1/webhooks/${encodeURIComponent(input.webhookId)}/events/${encodeURIComponent(input.eventId)}/replay`,
        body: {},
      })
    ),
    test: webhookMethod<T.WebhookTestInput, T.TestWebhookResponse>(
      client,
      (input) => ({
        method: 'POST',
        path: `/v1/webhooks/${encodeURIComponent(input.webhookId)}/test`,
        body: { type: input.type },
      })
    ),
  }
}
export type WebhooksResource = ReturnType<typeof createWebhooksResource>
