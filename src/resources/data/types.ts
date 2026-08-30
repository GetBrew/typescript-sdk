import type { operations } from '../../generated/openapi-types'

/**
 * `POST /v1/data` — one sandboxed-bash surface (`db …` verbs + jq/grep
 * pipes) over the brand's data in both storage planes. Same engine as the
 * MCP `run_data_command` tool and the in-app agent's `data` tool.
 */
export type RunDataCommandInput =
  operations['runDataCommand']['requestBody']['content']['application/json']

export type RunDataCommandResponse =
  operations['runDataCommand']['responses']['200']['content']['application/json']
