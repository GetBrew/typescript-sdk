import type { components, operations } from '../../generated/openapi-types'

export type ContactFieldType =
  components['schemas']['FieldsPostRequest']['fieldType']

export type ContactField = components['schemas']['ContactFieldDefinition']

export type FieldsGetResponse = components['schemas']['FieldsGetResponse']

export type FieldsPagination = FieldsGetResponse['pagination']

export type CreateFieldResponse =
  components['schemas']['ContactFieldDefinition']

export type FieldsDeleteResponse = components['schemas']['FieldsDeleteResponse']

export type ListFieldsInput = NonNullable<
  operations['listContactFields']['parameters']['query']
>
