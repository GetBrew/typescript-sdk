import type { SendPayloadValue } from './generated/openapi-types'
import type { FireTriggerByKeyResponse } from './resources/automations/triggers/fire-by-key'
import type { BrewRawResponse, RequestOptions } from './types'

/**
 * The trigger keys your app sends, each mapped to its payload type. Empty
 * by default, so `brew.send` takes any string key. Augment it once (by
 * hand, or with the file `brew-cli` writes) and every `brew.send` call site
 * is checked: an unknown key or a wrong payload stops compiling.
 *
 * ```ts
 * // brew-keys.d.ts
 * import '@brew.new/sdk'
 *
 * declare module '@brew.new/sdk' {
 *   interface BrewTriggerKeyRegistry {
 *     'auth.password-reset': {
 *       email: string
 *       confirmationUrl: string
 *       appName?: string
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
 * values the email reads as `{{ trigger.* }}`. The same value type as
 * `automations.triggers.fire`, so nothing the wire rejects type-checks.
 */
export type BrewDefaultSendPayload = { email: string } & {
  [key: string]: SendPayloadValue
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

/**
 * `brew.send(key, payload, options?)`: send the app email (or run any
 * automation) behind a trigger key. Two positionals is a deliberate
 * exception to the SDK's `(input, options?)` rule (see AGENTS.md).
 */
export type BrewSend = {
  <TKey extends BrewSendKey>(
    key: TKey,
    payload: BrewSendPayload<TKey>,
    options: RequestOptions & { readonly raw: true }
  ): Promise<BrewRawResponse<BrewSendResponse>>
  <TKey extends BrewSendKey>(
    key: TKey,
    payload: BrewSendPayload<TKey>,
    options?: RequestOptions
  ): Promise<BrewSendResponse>
}
