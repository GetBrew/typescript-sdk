import type { components, operations } from '../../generated/openapi-types'

export type EmailGroup = components['schemas']['EmailGroupSummary']

export type EmailGroupWriteResponse =
  components['schemas']['EmailGroupWriteResponse']

export type EmailGroupsListResponse =
  components['schemas']['EmailGroupsListResponse']

export type ListEmailGroupsInput = NonNullable<
  operations['listEmailGroups']['parameters']['query']
>

export type CreateEmailGroupInput =
  components['schemas']['EmailGroupCreateRequest']

export type CreateEmailGroupResponse = EmailGroupWriteResponse

type EmailGroupPatch = components['schemas']['EmailGroupPatchRequest']

export type UpdateEmailGroupInput = {
  readonly groupId: string
} & (
  | (EmailGroupPatch & { readonly name: string })
  | (EmailGroupPatch & {
      readonly emailIds: NonNullable<EmailGroupPatch['emailIds']>
    })
)

export type UpdateEmailGroupResponse = EmailGroupWriteResponse

export type DeleteEmailGroupInput = {
  readonly groupId: string
}

export type EmailGroupDeleteResponse =
  components['schemas']['EmailGroupDeleteResponse']
