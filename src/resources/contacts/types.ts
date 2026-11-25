import type { components, operations } from '../../generated/openapi-types'

export type Contact = components['schemas']['Contact']

export type ContactCustomFields = Contact['customFields']

export type ContactOpenProfile = NonNullable<
  operations['getContact']['responses'][200]['content']['application/json']['openProfile']
>

export type ContactConsentInput = NonNullable<
  components['schemas']['ContactsPatchRequest']['consent']
>

export type ContactsFilter = NonNullable<
  components['schemas']['ContactsSearchRequest']['filters']
>[number]
