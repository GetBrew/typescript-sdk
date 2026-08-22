import type { HttpClient } from '../../core/http'

import { createGetTransactionalEmail } from './get'

export type TransactionalResource = {
  /**
   * `GET /v1/transactional/{transactionId}` — the object's locked config
   * plus its Liquid data contract (`variableTree`, `examplePayload`).
   * Fire the object with `emails.send({ transactionId, to, payload })`.
   */
  readonly get: ReturnType<typeof createGetTransactionalEmail>
}

export function createTransactionalResource(
  client: HttpClient
): TransactionalResource {
  return {
    get: createGetTransactionalEmail(client),
  }
}
