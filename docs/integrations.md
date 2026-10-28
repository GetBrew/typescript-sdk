# `brew.integrations`

The integration catalog, and the live events connected sources send. Free,
read-only and brand-scoped (`X-Brand-Id` on an organization key). `list`
needs no permission scope. Connecting a provider is a human step in Brew
Settings, never an API call.

| Method                          | HTTP                                    |
| ------------------------------- | --------------------------------------- |
| `list`                          | `GET /v1/integrations`                  |
| [`events.list`](#list-events)   | `GET /v1/integrations/events`           |
| [`events.get`](#read-one-event) | `GET /v1/integrations/events/{eventId}` |

## Live integration events

A live source sends Brew its own events: a PostHog project's events, or the
Stripe and Shopify app catalogs. Each event can start an automation. Find
one with `events.list`, read what it carries with `events.get`, then get its
trigger with
[`automations.triggers.ensureIntegrationEvent`](./automations.md#integration-event-triggers).

### List events

```ts
const page = await brew.integrations.events.list({
  provider: 'posthog', // optional
  query: 'project', // optional: searches names, titles and categories
  kind: 'custom', // optional: standard | custom | action | derived | observed
  limit: 50, // 1–100, default 100
})

for (const event of page.data) {
  console.log(event.eventId, event.eventKey, event.label, event.volume30d)
}
// page.sources: the connected sources the page drew from
// page.pagination: { limit, cursor, hasMore }
```

Each `IntegrationEvent` has its `eventId`, the provider's `eventKey`, Brew's
`label` and lifecycle `stage`, its `modelRoles` (`signup`, `activation`,
`conversion`, `key_event`), `volume30d`, and its `triggerEventId` once it is
a trigger. Without `query`, each source's busiest events come first.

Events a brand member hid, and internal traffic Brew suppressed, are left
out, so a page can hold fewer than `limit` rows. Follow `pagination.cursor`
until `hasMore` is `false` to read every event.

### Read one event

```ts
const event = await brew.integrations.events.get(
  'k5714pq3vm8x2n6c9d0b7f1h4j6g2r8t'
)

for (const property of event.properties) {
  // e.g. 'properties.project_name' or 'person.first_name'
  console.log(property.variable, property.isPersonal)
}
```

Each property has its template `variable` (use it as
`{{ <variable> | fallback }}`), its `scope` (`event` or `person`), `type`,
`isPersonal` (personal data: never put it in a subject) and
`isPersonalization` (Brew suggests it to personalize an email).

Pass an `eventId` from `events.list`; never compose one. An unknown or
other-brand id throws a `BrewApiError` with `status: 404` and
`code: 'INTEGRATION_EVENT_NOT_FOUND'`.
