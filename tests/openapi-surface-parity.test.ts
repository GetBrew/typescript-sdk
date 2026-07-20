import { readFileSync, readdirSync } from 'node:fs'
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
    if (entry.isDirectory()) return collectTypeScriptFiles(path)
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
})
