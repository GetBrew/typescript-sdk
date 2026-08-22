import type { components, operations } from '../../generated/openapi-types'

/**
 * A named email folder: `groupId` (`grp_*`, or the `ungrouped`
 * sentinel), `groupName`, and the live `emailCount` (capped at 100).
 * Returned bare by `create` / `update`, and as each row of `list`'s
 * `{ data, pagination? }` envelope.
 */
export type EmailGroup = components['schemas']['EmailGroupSummary']

/**
 * Envelope returned by `GET /v1/email-groups` in list mode — `{ data,
 * pagination }`. Detail mode (`groupId` set) omits `pagination`.
 */
export type EmailGroupsListResponse =
  components['schemas']['EmailGroupsListResponse']

/**
 * Query params accepted by `brew.emailGroups.list(...)` — `groupId`
 * (detail mode), `limit`, `cursor`.
 */
export type ListEmailGroupsInput = NonNullable<
  operations['listEmailGroups']['parameters']['query']
>

/**
 * Body of `POST /v1/email-groups` — the new folder's display name
 * (1–60 chars). Reserved names (`Ungrouped` / `ungrouped` /
 * `__ungrouped__`) are rejected.
 */
export type CreateEmailGroupInput =
  components['schemas']['EmailGroupCreateRequest']

/** `POST /v1/email-groups` returns the bare created row (`emailCount: 0`). */
export type CreateEmailGroupResponse = EmailGroup

/**
 * Input to `brew.emailGroups.update(...)` — the `groupId` (path) plus
 * the folder's new display name.
 */
export type UpdateEmailGroupInput = {
  /** Named group id (`grp_*`) to rename. Ungrouped is not writable. */
  readonly groupId: string
} & components['schemas']['EmailGroupPatchRequest']

/** `PATCH /v1/email-groups/{groupId}` returns the renamed row. */
export type UpdateEmailGroupResponse = EmailGroup

/** Input to `brew.emailGroups.delete(...)` — the folder to remove. */
export type DeleteEmailGroupInput = {
  /** Named group id (`grp_*`) to remove. Ungrouped cannot be deleted. */
  readonly groupId: string
}

/**
 * Response from `DELETE /v1/email-groups/{groupId}` — `{ groupId,
 * deleted }`. Idempotent: an unknown / cross-brand id resolves with
 * `deleted: false` rather than throwing.
 */
export type EmailGroupDeleteResponse =
  components['schemas']['EmailGroupDeleteResponse']
