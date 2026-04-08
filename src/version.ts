/**
 * Single source of truth for SDK name and version.
 *
 * Imported by:
 *   - `core/config.ts` to build the default `User-Agent` header
 *   - `index.ts` so consumers can read `SDK_VERSION` at runtime (e.g. to
 *     attach it to their own tracing headers)
 *
 * Keep this in sync with `package.json` on every release. There is no
 * build-time generation because the simpler manual sync has never
 * actually bitten us, and automating it would add a codegen step that
 * forked the package.json version away from git.
 */

export const SDK_NAME = 'brew.new-sdk'
export const SDK_VERSION = '0.1.0'
