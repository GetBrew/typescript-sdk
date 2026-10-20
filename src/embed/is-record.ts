// Generated from brew-v2/lib/shared/guards/is-record.ts. Do not edit.
/**
 * Canonical "is this a non-null, non-array object" guard.
 *
 * Returns `true` for plain objects AND class instances (`new Date()`,
 * `Object.create(null)`); `false` for `null`, arrays, functions, and every
 * primitive. This is deliberately the permissive `typeof === 'object'`
 * check, not a prototype check.
 *
 * Leaf module by contract: zero imports, no `server-only`, so it is safe
 * from client components, API routes, workflows, scripts, AND `convex/`
 * (the Convex bundler breaks on any module graph that reaches `server-only`;
 * `tsc --project convex` gates the production deploy).
 *
 * Replaces the 32 module-private copies with this exact body (2026-09
 * condensation audit, unit U3.1 — `isRecord` ×26, `isPlainObject` ×5,
 * `isPlainRecord` ×1), e.g. `lib/payload-contract/{validate,infer,fire-diff,
 * draft}.ts`, `lib/mcp/{present,response}.ts`, `lib/automations/steps/_shared.ts`,
 * `lib/automations/runtime/resolve-input.ts`, `convex/triggerInstances/queries.ts`,
 * `scripts/automation-trigger-prod-audit-*.ts`. The loose copies WITHOUT the
 * array exclusion (site-factory, app-error, retry, the brand normalizer) let
 * arrays through and are NOT this function — they collapsed onto
 * `isObjectLike` in lib/shared/guards/is-object-like.ts. `apps/admin` imports
 * this leaf through the allowlisted `@brew-root/lib/*` alias
 * (`tests/admin/import-hygiene.test.ts`) — its two former copies are gone.
 */
export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
