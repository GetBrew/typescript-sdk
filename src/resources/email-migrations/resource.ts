import type { HttpClient } from '../../core/http'
import { createCancelEmailMigration } from './cancel'
import { createGetEmailMigration } from './get'
import { createResumeEmailMigration } from './resume'
import { createStartEmailMigration } from './start'

export type EmailMigrationsResource = {
  readonly start: ReturnType<typeof createStartEmailMigration>
  readonly get: ReturnType<typeof createGetEmailMigration>
  readonly resume: ReturnType<typeof createResumeEmailMigration>
  readonly cancel: ReturnType<typeof createCancelEmailMigration>
}

export function createEmailMigrationsResource(
  client: HttpClient
): EmailMigrationsResource {
  return {
    start: createStartEmailMigration(client),
    get: createGetEmailMigration(client),
    resume: createResumeEmailMigration(client),
    cancel: createCancelEmailMigration(client),
  }
}
