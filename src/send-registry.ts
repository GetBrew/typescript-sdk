import type { SendPayloadValue } from './generated/openapi-types'
import type { FireTriggerByKeyResponse } from './resources/automations/triggers/fire-by-key'
import type { BrewRawResponse, RequestOptions } from './types'

/**
 * The trigger keys your app sends, each mapped to its payload type. Empty
 * by default, so `brew.send` takes any string key. Augment it once and
 * every `brew.send` call site is checked: an unknown key or a wrong payload
 * stops compiling.
 *
 * ```ts
 * // brew-keys.d.ts
 * import '@brew.new/sdk'
 *
 * declare module '@brew.new/sdk' {
 *   interface BrewTriggerKeyRegistry {
 *     'auth.password-reset': {
 *       email: string
 *       appName?: string
 *       userName?: string
 *       confirmationUrl?: string
 *       expiresInMinutes?: number
 *     }
 *   }
 * }
 * ```
 */
// An interface (not a type alias) so `declare module` can merge into it.
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface BrewTriggerKeyRegistry {}

/** `true` while nothing augmented `BrewTriggerKeyRegistry`. */
type IsRegistryEmpty = [keyof BrewTriggerKeyRegistry] extends [never]
  ? true
  : false

/**
 * The key `brew.send` accepts: any string while `BrewTriggerKeyRegistry` is
 * empty, otherwise exactly its keys.
 */
export type BrewSendKey = IsRegistryEmpty extends true
  ? string
  : Extract<keyof BrewTriggerKeyRegistry, string>

/**
 * A send payload without a registry: the recipient `email` plus any JSON
 * values the email reads as `{{ trigger.* }}`. A field may be `undefined`
 * (an optional value straight from app state, such as `userName`):
 * `JSON.stringify` leaves it out of the body, so the trigger sees it as
 * absent. Nothing else the wire rejects type-checks.
 */
export type BrewDefaultSendPayload = { email: string } & {
  [key: string]: SendPayloadValue | undefined
}

/**
 * The payload `brew.send(key, …)` takes: the registry's type for `key`, or
 * `BrewDefaultSendPayload` while the registry is empty.
 */
export type BrewSendPayload<TKey extends BrewSendKey> =
  IsRegistryEmpty extends true
    ? BrewDefaultSendPayload
    : TKey extends keyof BrewTriggerKeyRegistry
      ? BrewTriggerKeyRegistry[TKey]
      : never

/** What `brew.send` resolves to: the by-key fire body. */
export type BrewSendResponse = FireTriggerByKeyResponse

/** `true` when `T` is a union of two or more members. */
type IsUnion<T, TAll = T> = T extends unknown
  ? [TAll] extends [T]
    ? false
    : true
  : never

type UnionToIntersection<TUnion> = (
  TUnion extends unknown ? (value: TUnion) => void : never
) extends (value: infer TIntersection) => void
  ? TIntersection
  : never

/**
 * The payload a `brew.send(key, …)` call must carry for a key of type
 * `TKey`. A literal key takes its own payload. A key typed as a union
 * (`'auth.password-reset' | 'order.paid'`) can be any member at runtime, so
 * the payload must satisfy every member's payload: a password-reset payload
 * no longer type-checks for a key that might be `order.paid`.
 */
export type BrewSendPayloadFor<TKey extends BrewSendKey> =
  IsUnion<TKey> extends true
    ? UnionToIntersection<BrewSendPayload<TKey>>
    : BrewSendPayload<TKey>

/**
 * `brew.send(key, payload, options?)`: send the app email (or run any
 * automation) behind a trigger key. Two positionals is a deliberate
 * exception to the SDK's `(input, options?)` rule (see
 * `docs/development.md`).
 */
export type BrewSend = {
  <TKey extends BrewSendKey>(
    key: TKey,
    payload: BrewSendPayloadFor<TKey>,
    options: RequestOptions & { readonly raw: true }
  ): Promise<BrewRawResponse<BrewSendResponse>>
  <TKey extends BrewSendKey>(
    key: TKey,
    payload: BrewSendPayloadFor<TKey>,
    options?: RequestOptions
  ): Promise<BrewSendResponse>
}
