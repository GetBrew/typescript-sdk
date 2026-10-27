import type { components, operations } from '../../generated/openapi-types'
export type EmailWebhookEvent = components['schemas']['EmailWebhookEvent']
export type EmailWebhookType = EmailWebhookEvent['type']
export type Webhook = components['schemas']['Webhook']
export type CreateWebhookInput = Readonly<
  NonNullable<
    operations['createWebhook']['requestBody']
  >['content']['application/json']
>
export type UpdateWebhookInput = Readonly<
  { webhookId: string } & NonNullable<
    operations['updateWebhook']['requestBody']
  >['content']['application/json']
>
export type WebhookListInput = Readonly<
  NonNullable<operations['listWebhooks']['parameters']['query']>
>
export type WebhookEventsInput = Readonly<
  { webhookId: string } & WebhookListInput
>
export type WebhookReplayInput = Readonly<{
  webhookId: string
  eventId: string
}>
export type WebhookAttemptsInput = WebhookReplayInput & WebhookListInput
export type WebhookTestInput = Readonly<{
  webhookId: string
  type: EmailWebhookType
}>
export type CreateWebhookResponse =
  operations['createWebhook']['responses'][201]['content']['application/json']
export type GetWebhookResponse =
  operations['getWebhook']['responses'][200]['content']['application/json']
export type UpdateWebhookResponse =
  operations['updateWebhook']['responses'][200]['content']['application/json']
export type RemoveWebhookResponse =
  operations['deleteWebhook']['responses'][200]['content']['application/json']
export type RotateSecretWebhookResponse =
  operations['rotateWebhookSecret']['responses'][200]['content']['application/json']
export type EventsWebhookResponse =
  operations['listWebhookEvents']['responses'][200]['content']['application/json']
export type AttemptsWebhookResponse =
  operations['listWebhookAttempts']['responses'][200]['content']['application/json']
export type ReplayWebhookResponse =
  operations['replayWebhookEvent']['responses'][202]['content']['application/json']
export type TestWebhookResponse =
  operations['testWebhook']['responses'][202]['content']['application/json']
export type ListWebhooksResponse =
  operations['listWebhooks']['responses'][200]['content']['application/json']
