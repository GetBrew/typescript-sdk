import type { HttpClient } from '../../core/http'

import { createGetAppEmail } from './get'
import { createListAppEmails } from './list'
import { createSetUpAppEmailKit } from './set-up-kit'
import { createUpsertAppEmail } from './upsert'

export type AppEmailsResource = {
  /** `GET /v1/app-emails` — the brand's app emails with `sender` and `readiness`, paged with `limit` / `cursor` (scope: `automations`). */
  readonly list: ReturnType<typeof createListAppEmails>
  /** `GET /v1/app-emails/{triggerKey}` — one app email by key, as the list row; unknown key is `404 TRIGGER_KEY_NOT_FOUND` (scope: `automations`). */
  readonly get: ReturnType<typeof createGetAppEmail>
  /**
   * `PUT /v1/app-emails/{triggerKey}` — set up one app email in one
   * idempotent call: trigger + contract + design (starter or your
   * `source`) + automation, published. `409 APP_EMAIL_EDITED_IN_BREW`
   * until `overwrite: true` when the design was edited in Brew
   * (scopes: `automations` and `emails`).
   */
  readonly upsert: ReturnType<typeof createUpsertAppEmail>
  /**
   * `POST /v1/app-emails/kit` — set up the auth and lifecycle starter kit
   * (`sets`, `stack` or exact `keys`); per-key `results` never throw, and
   * `stack.snippets` carries the code for your auth library
   * (scopes: `automations` and `emails`).
   */
  readonly setUpKit: ReturnType<typeof createSetUpAppEmailKit>
}

export function createAppEmailsResource(client: HttpClient): AppEmailsResource {
  return {
    list: createListAppEmails(client),
    get: createGetAppEmail(client),
    upsert: createUpsertAppEmail(client),
    setUpKit: createSetUpAppEmailKit(client),
  }
}
