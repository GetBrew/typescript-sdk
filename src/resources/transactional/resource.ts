import type { HttpClient } from '../../core/http'

import {
  createGetTransactionalContract,
  createPutTransactionalContract,
  createValidateTransactionalPayload,
} from './contract'
import { createGetTransactionalEmail } from './get'

export type TransactionalResource = {
  /**
   * `GET /v1/transactional/{transactionId}` — the object's locked config
   * plus its Liquid data contract (`variableTree`, `examplePayload`).
   * Fire the object with `emails.send({ transactionId, to, payload })`.
   */
  readonly get: ReturnType<typeof createGetTransactionalEmail>
  /** `GET /v1/transactional/{transactionId}/contract` — the stored contract when declared, else derived from the pinned template; `format` renders ts/zod/jsonschema/skill (scope: `sends`). */
  readonly getContract: ReturnType<typeof createGetTransactionalContract>
  /** `PUT /v1/transactional/{transactionId}/contract` — declare/replace the stored contract (scope: `sends`). */
  readonly putContract: ReturnType<typeof createPutTransactionalContract>
  /** `POST /v1/transactional/{transactionId}/contract/validate` — dry-run a send payload; never sends (scope: `sends`). */
  readonly validatePayload: ReturnType<
    typeof createValidateTransactionalPayload
  >
}

export function createTransactionalResource(
  client: HttpClient
): TransactionalResource {
  return {
    get: createGetTransactionalEmail(client),
    getContract: createGetTransactionalContract(client),
    putContract: createPutTransactionalContract(client),
    validatePayload: createValidateTransactionalPayload(client),
  }
}
