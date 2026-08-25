/**
 * Wire types for the payload-contract routes, declared locally.
 *
 * TEMPORARY BRIDGE: these routes ship in the SDK ahead of the platform —
 * they land with sub-agent-orchestrator PRs #1093/#1096/#1098 (Payload
 * Contracts Wave 2), so the vendored `openapi/public-api-v1.yaml` does
 * not document them yet and `openapi-types.ts` has no
 * `components['schemas']['PayloadContract*']` entries to reference.
 * Once the spec refresh after those merges documents the routes, replace
 * every type below with its `components['schemas'][…]` indexed access
 * and delete this file (the parity test's KNOWN_UNSPECED entries go with
 * it).
 */

/** One node of a payload contract's typed field tree. */
export type PayloadContractFieldNode = {
  key: string
  type:
    | 'string'
    | 'int'
    | 'float'
    | 'boolean'
    | 'date'
    | 'enum'
    | 'object'
    | 'array'
    | 'unknown'
  required: boolean
  description?: string
  exampleValue?: string | number | boolean
  fallbackValue?: string | number | boolean
  pii?: 'none' | 'low' | 'high'
  enumValues?: Array<string>
  itemType?:
    | 'string'
    | 'int'
    | 'float'
    | 'boolean'
    | 'date'
    | 'enum'
    | 'unknown'
  usedIn?: Array<'body' | 'subject' | 'previewText'>
  children?: Array<PayloadContractFieldNode>
}

/** `GET /v1/automations/triggers/{triggerEventId}/contract` response. */
export type PayloadContractGetResponseWire = {
  subjectKind: 'trigger'
  subjectId: string
  source: 'stored' | 'derived_from_schema' | 'derived_from_template'
  typeName: string
  contractHash?: string
  version?: number
  enforcement?: 'off' | 'prune' | 'strict'
  driftStatus?: 'fresh' | 'stale'
  fields?: Array<PayloadContractFieldNode>
  format: 'json' | 'ts' | 'zod' | 'jsonschema' | 'skill'
  content?: string
}

/** `PUT /v1/automations/triggers/{triggerEventId}/contract` body. */
export type PayloadContractPutRequestWire = {
  fields?: Array<PayloadContractFieldNode>
  name?: string
  enforcement?: 'off' | 'prune' | 'strict'
}

type PayloadContractValidationIssue = {
  code:
    | 'payload_not_object'
    | 'missing_required'
    | 'invalid_type'
    | 'unexpected_key'
  field: string
  message: string
  expectedType?: string
  actualType?: string
}

/** `POST /v1/automations/triggers/{triggerEventId}/contract/validate` response. */
export type PayloadContractValidateResponseWire = {
  valid: boolean
  errors: Array<PayloadContractValidationIssue>
  warnings: Array<PayloadContractValidationIssue>
  resolvedPayload: { [key: string]: unknown }
  prunedKeys: Array<string>
  source: 'stored' | 'derived_from_schema' | 'derived_from_template'
  contractHash?: string
}

/** `POST /v1/payload-contracts/infer` response. */
export type PayloadContractInferResponseWire = {
  fields: Array<PayloadContractFieldNode>
  issues: Array<{ message: string }>
}
