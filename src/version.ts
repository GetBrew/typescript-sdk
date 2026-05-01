/**
 * Single source of truth for SDK name and version.
 *
 * Imported by:
 *   - `core/config.ts` to build the default `User-Agent` header
 *   - `index.ts` so consumers can read `SDK_VERSION` at runtime (e.g. to
 *     attach it to their own tracing headers)
 *
 * The bare `__SDK_VERSION__` identifier below is replaced at build time
 * by `tsup` (see the `define` block in `tsup.config.ts`) with the
 * `version` field from `package.json`. In dev/test the identifier is
 * undefined at runtime and we fall back to `'0.0.0-dev'` so the
 * User-Agent header still resolves to a sensible value.
 */

declare const __SDK_VERSION__: string | undefined

export const SDK_NAME = 'brew.new-sdk'

export const SDK_VERSION: string =
  typeof __SDK_VERSION__ === 'string' && __SDK_VERSION__.length > 0
    ? __SDK_VERSION__
    : '0.0.0-dev'
