import type { components } from '../../generated/openapi-types'

/**
 * One app email: a keyed trigger that an app-email setup wired to a design
 * and an automation. `starterId` / `starterVersion` name the starter-kit
 * template it came from (absent for your own `source`), and
 * `upgradeAvailable` says a newer starter version exists. `sender.mode` is
 * `domain`, `sandbox` (team-only until a domain verifies) or `none`;
 * `readiness.ready` says a fire by this key sends now, with `blockers`
 * (`AUTOMATION_MISSING`, `AUTOMATION_NOT_PUBLISHED`, `DOMAIN_REQUIRED`)
 * when it does not.
 */
export type AppEmail = components['schemas']['AppEmailRow']

/** `{ data, pagination }` envelope returned by `GET /v1/app-emails`. */
export type AppEmailsListResponse =
  components['schemas']['AppEmailsListResponse']

/**
 * What one setup produced: the ids, `published`, which pieces this call
 * `created` (false = reused), the `sender` (with the sandbox's daily cap
 * while team-only), the stored `payloadSchema`, a `fireExample` (path,
 * example payload, curl and `brew.send` line) and `warnings`.
 */
export type AppEmailSetupResult = components['schemas']['AppEmailSetupResult']

/** Body of `PUT /v1/app-emails/{triggerKey}` (every field optional). */
export type AppEmailSetupBody = components['schemas']['AppEmailPutRequest']

/** Body of `POST /v1/app-emails/kit` (every field optional). */
export type AppEmailKitBody = components['schemas']['AppEmailsKitRequest']

/** `{ results, stack }` returned by `POST /v1/app-emails/kit`. */
export type AppEmailKitResponse = components['schemas']['AppEmailsKitResponse']

/**
 * One key's outcome in a kit run, in kit order: `ok: true` with the setup
 * result, or `ok: false` with its `error` (`code`, `message`, `details`).
 * Narrow on `ok`.
 */
export type AppEmailKitResult = AppEmailKitResponse['results'][number]

/** The auth stack a kit run targets, and the snippets it returns. */
export type AppEmailKitStack = AppEmailKitResponse['stack']

/** A canonical starter-kit key (`auth.password-reset`, `lifecycle.welcome`, …). */
export type AppEmailKitKey = NonNullable<AppEmailKitBody['keys']>[number]

/** A kit set: `auth` or `lifecycle`. */
export type AppEmailKitSet = NonNullable<AppEmailKitBody['sets']>[number]

/** An auth stack the kit knows: `better-auth`, `authjs`, `supabase`, `clerk`, `firebase` or `custom`. */
export type AppEmailKitStackProvider = NonNullable<AppEmailKitBody['stack']>
