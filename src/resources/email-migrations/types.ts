import type { components, operations } from '../../generated/openapi-types'

export type EmailMigration = components['schemas']['EmailMigration']

export type StartEmailMigrationInput = Readonly<
  NonNullable<
    operations['startEmailMigration']['requestBody']
  >['content']['application/json']
>

export type StartEmailMigrationResponse =
  operations['startEmailMigration']['responses'][202]['content']['application/json']

export type GetEmailMigrationResponse =
  operations['getEmailMigration']['responses'][200]['content']['application/json']

export type ResumeEmailMigrationResponse =
  operations['resumeEmailMigration']['responses'][202]['content']['application/json']

export type CancelEmailMigrationResponse =
  operations['cancelEmailMigration']['responses'][200]['content']['application/json']
