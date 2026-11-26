# `brew.emailMigrations`

Inventory and import up to 100 historical HubSpot marketing-email designs from
a connected `marketing_emails` capability grant. These methods are scoped to
the selected brand. They do not send emails, activate automations, or import
recipient delivery history.

| Method                          | HTTP                                             |
| ------------------------------- | ------------------------------------------------ |
| `start(input, options?)`        | `POST /v1/email-migrations`                      |
| `get(migrationId, options?)`    | `GET /v1/email-migrations/{migrationId}`         |
| `resume(migrationId, options?)` | `POST /v1/email-migrations/{migrationId}/resume` |
| `cancel(migrationId, options?)` | `POST /v1/email-migrations/{migrationId}/cancel` |

## Review the inventory first

`start` defaults to `dryRun: true` on the server. Pass explicit source IDs.
Each source ID must be unique and contain only 1–20 digits. The inventory
contains 1–100 sources. An omitted `capabilityGrantId` selects the only active,
ready HubSpot `marketing_emails` grant available to the current tenant. If more
than one matches, the server returns a conflict with safe choices; select the
intended grant explicitly. The SDK does not guess a connection or grant.

```ts
const inventory = await brew.emailMigrations.start({
  items: [{ sourceId: '123456' }, { sourceId: '789012' }],
})

const progress = await brew.emailMigrations.get(inventory.migrationId)
console.log(progress.status, progress.outcomes, progress.nextAction)
```

Poll `get` while `nextAction` is `wait`. A running response can include
`leaseExpiresAt`; use the server's current `status` and `nextAction` to decide
what to do. Public `leaseExpiresAt` and `hold.retryAt` values are ISO 8601
date-time strings. An expired worker lease is not proof that an import failed.

Dry-run outcomes identify sources that are `ready-to-import`, already imported,
unsupported, or failed. Missing full HTML is an explicit source refusal. Hosted
web copies can differ from the delivered email, and delivery records are not
included. Preserve the returned `limitations` and any source refusal reason
when presenting results.

## Import an approved inventory

After reviewing the inventory, start an import with `dryRun: false`. Pin each
approved source's returned revision with `expectedRevision` so a changed source
is refused instead of silently importing different content. `targetGroupId` can
place the designs in an existing group.

```ts
const migration = await brew.emailMigrations.start({
  capabilityGrantId: 'grant_marketing_emails',
  dryRun: false,
  items: [{ sourceId: '123456', expectedRevision: 'reviewed-source-revision' }],
  targetGroupId: 'grp_archive',
})

const result = await brew.emailMigrations.get(migration.migrationId)
for (const outcome of result.outcomes) {
  console.log(outcome.status, outcome.emailId, outcome.emailVersionId)
}
```

Imported outcomes carry the exact saved `emailId` and `emailVersionId`.
`warningCodes` describe conversion or retained-asset limitations. Do not treat
an unsupported or failed source as an imported design. Repeated imports of the
same scoped source revision reuse its existing design.

## Resume or cancel

```ts
await brew.emailMigrations.resume(migration.migrationId)
await brew.emailMigrations.cancel(migration.migrationId)
```

Resume when the latest view says `nextAction: 'resume'`. A provider hold can
include `hold.retryAt`; wait until then. Resume retains the original inventory
and dry-run mode and rechecks current access. It cannot turn a dry-run job into
an import or restart a canceled job.

Cancellation stops further work. Already imported designs remain available;
cancel does not delete them or undo previous outcomes. Read the resulting
view to distinguish `completed`, `partial`, `held`, `failed`, and `canceled`.

All four methods accept normal
[`RequestOptions`](./configuration.md) and support `{ raw: true }` for HTTP
status, headers, and request ID. Errors use the shared
[`BrewApiError` and transport errors](./errors.md); a canceled request does not
prove the server stopped its job. Read its migration ID before deciding the
next action.

Public types are `EmailMigration`, `StartEmailMigrationInput`,
`StartEmailMigrationResponse`, `GetEmailMigrationResponse`,
`ResumeEmailMigrationResponse`, `CancelEmailMigrationResponse`, and
`EmailMigrationsResource`. They derive from the vendored API contract.
