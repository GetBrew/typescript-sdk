import type { components, operations } from '../../generated/openapi-types'

/**
 * A named email folder: `groupId` (`grp_*`, or the `ungrouped`
 * sentinel), `groupName`, the live `emailCount` (capped at 100), and its
 * creator when one was recorded. Each row of `list`'s `{ data, pagination? }`
 * envelope, and the bare row `get` returns.
 */
export type EmailGroup = components['schemas']['EmailGroupSummary']

/**
 * What `create` / `update` return: the folder row, plus — when the call sent
 * `emailIds` — `moved` (how many designs landed in it) and `notMoved` (each
 * design left where it was, with a reason: `not_found`, `generating`,
 * `not_movable`, `folder_full` or `retry`).
 */
export type EmailGroupWriteResponse =
  components['schemas']['EmailGroupWriteResponse']

/** Envelope returned by `GET /v1/email-groups` — `{ data, pagination }`. */
export type EmailGroupsListResponse =
  components['schemas']['EmailGroupsListResponse']

/** Query params accepted by `brew.emailGroups.list(...)` — `limit`, `cursor`. */
export type ListEmailGroupsInput = NonNullable<
  operations['listEmailGroups']['parameters']['query']
>

/**
 * Body of `POST /v1/email-groups` — the new folder's display name
 * (1–60 chars; reserved names `Ungrouped` / `ungrouped` / `__ungrouped__`
 * are rejected), and optionally `emailIds`: up to 50 designs to move into it
 * in the same call.
 */
export type CreateEmailGroupInput =
  components['schemas']['EmailGroupCreateRequest']

/** `POST /v1/email-groups` returns the created row, plus what a move did. */
export type CreateEmailGroupResponse = EmailGroupWriteResponse

type EmailGroupPatch = components['schemas']['EmailGroupPatchRequest']

/**
 * Input to `brew.emailGroups.update(...)` — the `groupId` (path) plus a new
 * display `name`, `emailIds` (up to 50 designs to move in), or both. The
 * spec marks both optional, but the API refuses a PATCH with neither, so the
 * type requires at least one: `update({ groupId })` does not compile.
 */
export type UpdateEmailGroupInput = {
  /** Named group id (`grp_*`) to rename or move into. Ungrouped is not writable. */
  readonly groupId: string
} & (
  | (EmailGroupPatch & { readonly name: string })
  | (EmailGroupPatch & {
      readonly emailIds: NonNullable<EmailGroupPatch['emailIds']>
    })
)

/** `PATCH /v1/email-groups/{groupId}` returns the row, plus what a move did. */
export type UpdateEmailGroupResponse = EmailGroupWriteResponse

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
