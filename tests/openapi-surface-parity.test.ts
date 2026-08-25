import { readdirSync, readFileSync } from 'node:fs'
import { extname, join } from 'node:path'

import { describe, expect, it } from 'vitest'

const ROOT = process.cwd()
const HTTP_METHODS = new Set(['get', 'post', 'put', 'patch', 'delete'])

function normalizePath(path: string): string {
  return path
    .replace(/\$\{encodeURIComponent\([^)]*\)\}/g, '{}')
    .replace(/\{[^}]+\}/g, '{}')
}

function collectTypeScriptFiles(directory: string): Array<string> {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name)
    if (entry.isDirectory()) {
      return collectTypeScriptFiles(path)
    }
    return extname(entry.name) === '.ts' ? [path] : []
  })
}

function readOpenApiOperations(): Set<string> {
  const yaml = readFileSync(join(ROOT, 'openapi/public-api-v1.yaml'), 'utf8')
  const operations = new Set<string>()
  let currentPath: string | undefined

  for (const line of yaml.split('\n')) {
    const pathMatch = /^ {2}(\/v1\/[^:]+):$/.exec(line)
    if (pathMatch) {
      currentPath = pathMatch[1]
      continue
    }
    const methodMatch = /^ {4}([a-z]+):$/.exec(line)
    if (!currentPath || !methodMatch || !HTTP_METHODS.has(methodMatch[1]!)) {
      continue
    }
    operations.add(
      `${methodMatch[1]!.toUpperCase()} ${normalizePath(currentPath)}`
    )
  }

  return operations
}

function readSdkOperations(): Set<string> {
  const operations = new Set<string>()
  const requestPattern =
    /method:\s*'(GET|POST|PUT|PATCH|DELETE)',[\s\S]{0,400}?path:\s*(['`])([^'`\n]+)\2/g

  for (const file of collectTypeScriptFiles(join(ROOT, 'src/resources'))) {
    const source = readFileSync(file, 'utf8')
    for (const match of source.matchAll(requestPattern)) {
      operations.add(`${match[1]} ${normalizePath(match[3]!)}`)
    }
  }

  return operations
}

describe('OpenAPI to SDK surface parity', () => {
  it('has a typed SDK request for every public v1 operation', () => {
    const openApiOperations = readOpenApiOperations()
    const sdkOperations = readSdkOperations()
    const missing = [...openApiOperations].filter(
      (operation) => !sdkOperations.has(operation)
    )

    expect(openApiOperations.size).toBeGreaterThan(0)
    expect(missing).toEqual([])
  })

  it('has no SDK request for a route the spec no longer documents', () => {
    // The inverse direction: a resource left behind after the platform
    // deletes its routes (e.g. the retired transactional-email object)
    // ships methods that can only 404. Any intentionally out-of-spec
    // path must be listed here with a reason.
    //
    // Payload-contract routes: shipped ahead of the platform — the
    // routes land with sub-agent-orchestrator PRs #1093/#1096/#1098
    // (Payload Contracts Wave 2). Remove these entries once the spec
    // refresh after those merges documents them.
    const KNOWN_UNSPECED: ReadonlySet<string> = new Set([
      'GET /v1/automations/triggers/{}/contract',
      'PUT /v1/automations/triggers/{}/contract',
      'POST /v1/automations/triggers/{}/contract/validate',
      'POST /v1/payload-contracts/infer',
    ])
    const openApiOperations = readOpenApiOperations()
    const phantom = [...readSdkOperations()].filter(
      (operation) =>
        !(openApiOperations.has(operation) || KNOWN_UNSPECED.has(operation))
    )

    expect(phantom).toEqual([])

    // Staleness guard: the moment the spec documents a listed route, its
    // entry must be deleted so the allowlist can never mask a real
    // phantom.
    const stale = [...KNOWN_UNSPECED].filter((operation) =>
      openApiOperations.has(operation)
    )
    expect(stale).toEqual([])
  })
})
