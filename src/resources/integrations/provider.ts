/**
 * Guard for the `{provider}` that rides
 * `/v1/integrations/{provider}/connection`.
 *
 * `.` and `..` survive `encodeURIComponent` and a URL resolves them as dot
 * segments, so they would address another route; a connect would then send
 * its signing secret there. Refuse them, and an empty provider, before any
 * request. Anything else is percent-encoded and left for the API to judge
 * (`400 INVALID_REQUEST` for a provider it does not connect).
 *
 * Positional because an assertion signature can only narrow a parameter.
 */
export function assertConnectionProvider(
  provider: unknown,
  method: string
): asserts provider is string {
  if (
    typeof provider !== 'string' ||
    provider === '' ||
    provider === '.' ||
    provider === '..'
  ) {
    throw new TypeError(
      `${method}: \`provider\` must be 'supabase_auth' or 'clerk'; got ${JSON.stringify(provider)}.`
    )
  }
}
