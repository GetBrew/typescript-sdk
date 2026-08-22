import type { components } from '../../generated/openapi-types'

export type { TransactionalPayloadValue } from '../../generated/openapi-types'

/**
 * The `payload` field of a transactional fire (and of `test: true` sends,
 * which take it with live-fire semantics): a JSON object whose values may
 * nest arbitrarily. Scalar keys resolve legacy `{{ tag | fallback }}` merge
 * tags; the full tree renders via Liquid as `trigger.*` / `payload.*` on
 * Liquid-enabled workspaces. Nested values on a workspace without Liquid
 * are rejected with `400 INVALID_REQUEST`. API caps: 64 KiB serialized,
 * 10 container levels, 250 items per array, 100 top-level keys.
 */
export type TransactionalPayload = {
  [key: string]: components['schemas']['TransactionalPayloadValue']
}

/**
 * A reusable transactional email object (`txn_…`): locked design + domain +
 * envelope, fired by id via `emails.send({ transactionId, to, payload })`.
 * On Liquid-enabled workspaces the read also advertises the template's data
 * contract: `variableTree` (every `trigger.*` / `customer.*` path the
 * template references) and `examplePayload` (a copy-paste-sendable payload
 * that satisfies the template, including nested arrays/objects).
 */
export type TransactionalEmail = components['schemas']['TransactionalEmail']

/** One node of the template's referenced-variable tree. */
export type TransactionalVariableTreeNode =
  components['schemas']['TransactionalVariableTreeNode']
