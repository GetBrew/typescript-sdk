import type { HttpClient } from '../../core/http'

import { createInferPayloadContract } from './infer'

export type PayloadContractsResource = {
  /** `POST /v1/payload-contracts/infer` — draft a contract from a real example payload; nothing is saved (scope: `automations`). */
  readonly infer: ReturnType<typeof createInferPayloadContract>
}

export function createPayloadContractsResource(
  client: HttpClient
): PayloadContractsResource {
  return {
    infer: createInferPayloadContract(client),
  }
}
