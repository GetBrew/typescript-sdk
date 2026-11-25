import type { HttpClient } from '../../core/http'

import { createInferPayloadContract } from './infer'

export type PayloadContractsResource = {
  readonly infer: ReturnType<typeof createInferPayloadContract>
}

export function createPayloadContractsResource(
  client: HttpClient
): PayloadContractsResource {
  return {
    infer: createInferPayloadContract(client),
  }
}
