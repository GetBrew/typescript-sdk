import { readdirSync, readFileSync } from 'node:fs'
import { extname, join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { AUDIENCES_INCLUDE_TOKENS } from '../src/resources/audiences/get'
import { AUTOMATIONS_INCLUDE_TOKENS } from '../src/resources/automations/get'
import { AUTOMATION_RUNS_INCLUDE_TOKENS } from '../src/resources/automations/runs/get'
import { TRIGGERS_INCLUDE_TOKENS } from '../src/resources/automations/triggers/get'
import { BRAND_INCLUDE_TOKENS } from '../src/resources/brand/types'
import { EMAILS_INCLUDE_TOKENS } from '../src/resources/emails/get'
import { FLOWS_INCLUDE_TOKENS } from '../src/resources/flows/get'
import { SENDS_INCLUDE_TOKENS } from '../src/resources/sends/get'
import { TEMPLATES_INCLUDE_TOKENS } from '../src/resources/templates/get'

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
    const KNOWN_UNSPECED: ReadonlySet<string> = new Set([])
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

/**
 * `operationId` → the `x-brew-include-tokens` the spec publishes: the tokens
 * each `include` accepts, generated from the tuples the API parses with.
 */
function readIncludeTokens(): Map<string, Array<string>> {
  const lines = readFileSync(
    join(ROOT, 'openapi/public-api-v1.yaml'),
    'utf8'
  ).split('\n')
  const published = new Map<string, Array<string>>()
  let operationId: string | undefined
  for (const [index, line] of lines.entries()) {
    const operation = /^ +operationId: (\S+)$/.exec(line)
    if (operation) {
      operationId = operation[1]
      continue
    }
    const extension = /^( +)x-brew-include-tokens:$/.exec(line)
    if (!operationId || !extension) {
      continue
    }
    const tokens: Array<string> = []
    for (const item of lines.slice(index + 1)) {
      const match = /^( +)- (\S+)$/.exec(item)
      if (!match || match[1]!.length <= extension[1]!.length) {
        break
      }
      tokens.push(match[2]!)
    }
    published.set(operationId, tokens)
  }
  return published
}

const byName = (a: string, b: string) => a.localeCompare(b)

describe('typed include tokens', () => {
  /**
   * Every typed `include` against the spec. 11.0.0 typed
   * `automations.triggers.get` with `automations`, which the API refuses
   * (it takes `skill`), and `audiences.get` without `build`.
   */
  const TYPED: Readonly<Record<string, ReadonlyArray<string> | 'generated'>> = {
    getAudience: AUDIENCES_INCLUDE_TOKENS,
    getAutomation: AUTOMATIONS_INCLUDE_TOKENS,
    getAutomationRun: AUTOMATION_RUNS_INCLUDE_TOKENS,
    getBrand: BRAND_INCLUDE_TOKENS,
    getEmail: EMAILS_INCLUDE_TOKENS,
    getFlow: FLOWS_INCLUDE_TOKENS,
    getSend: SENDS_INCLUDE_TOKENS,
    getTemplate: TEMPLATES_INCLUDE_TOKENS,
    getTrigger: TRIGGERS_INCLUDE_TOKENS,
    // `ListFieldsInput` is the generated query type, `include` enum and all.
    listContactFields: 'generated',
  }

  it('types exactly the tokens the spec publishes, for every include', () => {
    const published = readIncludeTokens()
    expect([...published.keys()].sort(byName)).toEqual(
      Object.keys(TYPED).sort(byName)
    )
    for (const [operationId, typed] of Object.entries(TYPED)) {
      if (typed === 'generated') {
        continue
      }
      expect([...typed].sort(byName), operationId).toEqual(
        [...(published.get(operationId) ?? [])].sort(byName)
      )
    }
  })
})
