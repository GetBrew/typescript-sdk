# `brew.integrations`

The triggerable integration-event catalog for your brand. Lists every event
you can drive automations from — even for providers that are not connected yet
— so an agent can discover what is possible.

| Method          | HTTP                   | Scope         |
| --------------- | ---------------------- | ------------- |
| [`list`](#list) | `GET /v1/integrations` | `automations` |

## Shared types

```ts
type IntegrationProvider =
  | 'clerk'
  | 'stripe'
  | 'stytch'
  | 'supabase'
  | 'workos'
  | 'shopify'
  | 'revenuecat'

type Integration = {
  readonly provider: IntegrationProvider
  readonly connected: boolean // an active connection exists for the brand
  readonly events: ReadonlyArray<{
    readonly eventType: string
    readonly title: string
    readonly description?: string
    readonly category: string
    readonly fieldKeys: ReadonlyArray<string>
    readonly requiredFieldKeys: ReadonlyArray<string>
    readonly provisioned: boolean // a Brew trigger already exists for this event
  }>
}
```

---

## `list`

```ts
const { integrations } = await brew.integrations.list()

for (const integration of integrations) {
  console.log(integration.provider, integration.connected)
  for (const event of integration.events) {
    console.log('  ', event.eventType, event.provisioned ? '(wired)' : '')
  }
}
```

Scope to one provider with `{ provider }`. An unknown provider is a
`400 INVALID_REQUEST`.

```ts
const { integrations } = await brew.integrations.list({ provider: 'stripe' })
```
