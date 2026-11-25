import { readdirSync, readFileSync } from 'node:fs'
import { extname, join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { EVENTS_GROUP_BY_TOKENS } from '../src/resources/analytics/event-counts'
import { AUDIENCES_INCLUDE_TOKENS } from '../src/resources/audiences/get'
import { AUTOMATIONS_INCLUDE_TOKENS } from '../src/resources/automations/get'
import { AUTOMATION_RUNS_INCLUDE_TOKENS } from '../src/resources/automations/runs/get'
import { TRIGGERS_INCLUDE_TOKENS } from '../src/resources/automations/triggers/get'
import { BRAND_INCLUDE_TOKENS } from '../src/resources/brand/types'
import { CONTACTS_INCLUDE_TOKENS } from '../src/resources/contacts/get'
import { DOMAIN_HEALTH_INCLUDE_TOKENS } from '../src/resources/domains/health'
import { EMAIL_COMMENTS_INCLUDE_TOKENS } from '../src/resources/emails/comments/list'
import { EMAILS_INCLUDE_TOKENS } from '../src/resources/emails/get'
import { FLOWS_INCLUDE_TOKENS } from '../src/resources/flows/get'
import { INSIGHTS_INCLUDE_TOKENS } from '../src/resources/insights/list'
import { SENDS_INCLUDE_TOKENS } from '../src/resources/sends/get'
import { TEMPLATE_GROUP_BY_TOKENS } from '../src/resources/templates/list'
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
    const KNOWN_UNSPECED: ReadonlySet<string> = new Set([])
    const openApiOperations = readOpenApiOperations()
    const phantom = [...readSdkOperations()].filter(
      (operation) =>
        !(openApiOperations.has(operation) || KNOWN_UNSPECED.has(operation))
    )

    expect(phantom).toEqual([])

    const stale = [...KNOWN_UNSPECED].filter((operation) =>
      openApiOperations.has(operation)
    )
    expect(stale).toEqual([])
  })
})

function readIncludeTokens(): Map<string, Array<string>> {
  return readPublishedTokens('x-brew-include-tokens')
}

function readPublishedTokens(
  extensionName: string
): Map<string, Array<string>> {
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
    const extension = new RegExp(`^( +)${extensionName}:$`).exec(line)
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
  const TYPED: Readonly<Record<string, ReadonlyArray<string> | 'generated'>> = {
    getAudience: AUDIENCES_INCLUDE_TOKENS,
    getAutomation: AUTOMATIONS_INCLUDE_TOKENS,
    getAutomationRun: AUTOMATION_RUNS_INCLUDE_TOKENS,
    getBrand: BRAND_INCLUDE_TOKENS,
    getContact: CONTACTS_INCLUDE_TOKENS,
    getDomainHealth: DOMAIN_HEALTH_INCLUDE_TOKENS,
    getEmail: EMAILS_INCLUDE_TOKENS,
    getFlow: FLOWS_INCLUDE_TOKENS,
    getSend: SENDS_INCLUDE_TOKENS,
    getTemplate: TEMPLATES_INCLUDE_TOKENS,
    getTrigger: TRIGGERS_INCLUDE_TOKENS,
    listEmailComments: EMAIL_COMMENTS_INCLUDE_TOKENS,
    listInsights: INSIGHTS_INCLUDE_TOKENS,
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

describe('typed groupBy fields', () => {
  it('types every field the spec publishes for grouped reads', () => {
    const published = readPublishedTokens('x-brew-group-by-tokens')
    const typed = {
      getEventsAnalytics: EVENTS_GROUP_BY_TOKENS,
      listTemplates: TEMPLATE_GROUP_BY_TOKENS,
    }
    expect([...published.keys()].sort(byName)).toEqual(
      Object.keys(typed).sort(byName)
    )
    for (const [operation, tokens] of Object.entries(typed)) {
      expect([...tokens].sort(byName)).toEqual(
        [...(published.get(operation) ?? [])].sort(byName)
      )
    }
  })
})

function readSpecQueryParameters(): Map<string, Set<string>> {
  const lines = readFileSync(
    join(ROOT, 'openapi/public-api-v1.yaml'),
    'utf8'
  ).split('\n')
  const byOperation = new Map<string, Set<string>>()
  let currentPath: string | undefined
  let operation: string | undefined
  let isInParameters = false
  let name: string | undefined
  let location: string | undefined
  const flush = () => {
    if (operation && name && location === 'query') {
      const names = byOperation.get(operation) ?? new Set<string>()
      names.add(name)
      byOperation.set(operation, names)
    }
    name = undefined
    location = undefined
  }
  for (const line of lines) {
    const pathMatch = /^ {2}(\/v1\/[^:]+):$/.exec(line)
    const methodMatch = /^ {4}([a-z]+):$/.exec(line)
    if (pathMatch || methodMatch) {
      flush()
      isInParameters = false
      if (pathMatch) {
        currentPath = pathMatch[1]
        operation = undefined
      } else if (currentPath && HTTP_METHODS.has(methodMatch![1]!)) {
        operation = `${methodMatch![1]!.toUpperCase()} ${normalizePath(currentPath)}`
      }
      continue
    }
    if (/^ {6}parameters:$/.test(line)) {
      isInParameters = true
      continue
    }
    if (!isInParameters) {
      continue
    }
    if (/^ {0,6}\S/.test(line)) {
      flush()
      isInParameters = false
      continue
    }
    if (/^ {8}- /.test(line)) {
      flush()
    }
    const field = /^ {8}(?:- | {2})(name|in): (\S+)$/.exec(line)
    if (field?.[1] === 'name') {
      name = field[2]
    } else if (field?.[1] === 'in') {
      location = field[2]
    }
  }
  flush()
  return byOperation
}

function balancedBlock(source: string, start: number): string {
  let depth = 0
  for (let index = start; index < source.length; index += 1) {
    if (source[index] === '{') {
      depth += 1
    } else if (source[index] === '}') {
      depth -= 1
      if (depth === 0) {
        return source.slice(start, index + 1)
      }
    }
  }
  return source.slice(start)
}

function forwardedQueryKeys(scope: string): Set<string> {
  const keys = new Set<string>()
  if (/\bquery:\s*input\b/.test(scope)) {
    keys.add('*')
  }
  for (const opening of scope.matchAll(
    /\bquery(?::\s*|(?::[^=\n]+)?\s*=\s*)\{/g
  )) {
    const body = balancedBlock(scope, opening.index + opening[0].length - 1)
    for (const key of body.matchAll(
      /(\w+)\s*:(?!:)|[{,]\s*(\w+)\s*(?=[,}])/g
    )) {
      keys.add((key[1] ?? key[2])!)
    }
  }
  for (const assignment of scope.matchAll(
    /\bquery(?:\.(\w+)|\[['"](\w+)['"]\])\s*=/g
  )) {
    keys.add((assignment[1] ?? assignment[2])!)
  }
  if (/\bquery\[[a-z]\w*\]\s*=/.test(scope)) {
    keys.add('*')
  }
  return keys
}

function readSdkQueryKeys(): Map<string, Set<string>> {
  const requestPattern =
    /method:\s*'(GET|POST|PUT|PATCH|DELETE)',[\s\S]{0,400}?path:\s*(['`])([^'`\n]+)\2/g
  const byOperation = new Map<string, Set<string>>()
  for (const file of collectTypeScriptFiles(join(ROOT, 'src/resources'))) {
    const source = readFileSync(file, 'utf8')
    let scopeStart = 0
    for (const match of source.matchAll(requestPattern)) {
      const open = source.lastIndexOf('{', match.index)
      const end = open + balancedBlock(source, open).length
      const operation = `${match[1]} ${normalizePath(match[3]!)}`
      const forwarded = byOperation.get(operation) ?? new Set<string>()
      for (const key of forwardedQueryKeys(source.slice(scopeStart, end))) {
        forwarded.add(key)
      }
      byOperation.set(operation, forwarded)
      scopeStart = end
    }
  }
  return byOperation
}

describe('query parameter forwarding', () => {
  const KNOWN_UNFORWARDED: Readonly<Record<string, string>> = {
    'GET /v1/api-keys ?cursor': 'deprecated, session-only route',
    'GET /v1/api-keys ?limit': 'deprecated, session-only route',
    'GET /v1/integrations ?cursor': 'list(options?) takes no input',
    'GET /v1/integrations ?limit': 'list(options?) takes no input',
  }

  it('forwards every query parameter the spec documents', () => {
    const documented = readSpecQueryParameters()
    const forwarded = readSdkQueryKeys()
    expect(documented.size).toBeGreaterThan(20)
    const dropped = [...documented].flatMap(([operation, names]) => {
      const keys = forwarded.get(operation) ?? new Set<string>()
      if (keys.has('*')) {
        return []
      }
      return [...names]
        .filter((name) => !keys.has(name))
        .map((name) => `${operation} ?${name}`)
    })
    expect(
      dropped.filter((entry) => !(entry in KNOWN_UNFORWARDED)).sort(byName)
    ).toEqual([])
    expect(
      Object.keys(KNOWN_UNFORWARDED)
        .filter((entry) => !dropped.includes(entry))
        .sort(byName)
    ).toEqual([])
  })
})
