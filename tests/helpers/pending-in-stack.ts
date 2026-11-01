/**
 * Operations the vendored spec (brew-v2 #2169, vendored whole) documents
 * that a later PR in this stack implements. Each entry names that PR. The
 * surface parity test fails on a stale entry (the SDK now sends the request,
 * or the spec dropped the route); the PR that implements a route deletes it.
 */
export const PENDING_IN_STACK: Readonly<Record<string, string>> = {
  'GET /v1/integrations/{}/connection':
    'integrations.getConnection (typescript-sdk#74)',
  'PUT /v1/integrations/{}/connection':
    'integrations.connect (typescript-sdk#74)',
}
