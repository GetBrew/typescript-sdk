/**
 * Guard for a trigger key that rides the URL path
 * (`/v1/automations/triggers/by-key/{triggerKey}/fire`,
 * `/v1/app-emails/{triggerKey}`).
 *
 * `.` and `..` survive `encodeURIComponent` and a URL resolves them as dot
 * segments, so they would address another route. The API's key grammar
 * never produces them (nor an empty key); refuse them before any request.
 * Anything else is percent-encoded by the caller and left for the API to
 * judge.
 *
 * Positional because an assertion signature can only narrow a parameter.
 */
export function assertTriggerKey(
  triggerKey: unknown,
  method: string
): asserts triggerKey is string {
  if (
    typeof triggerKey !== 'string' ||
    triggerKey === '' ||
    triggerKey === '.' ||
    triggerKey === '..'
  ) {
    throw new TypeError(
      `${method}: \`triggerKey\` must be a trigger key such as 'order.paid'; got ${JSON.stringify(triggerKey)}.`
    )
  }
}
