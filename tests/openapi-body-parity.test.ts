import { readdirSync } from 'node:fs'
import { extname, join } from 'node:path'

import ts from 'typescript'
import { describe, expect, it } from 'vitest'

/**
 * Every request-body property the spec documents is one the SDK can send.
 *
 * `openapi-surface-parity.test.ts` proves every route has a method and every
 * query parameter is forwarded; bodies were unchecked, so `consent`
 * (contacts) and `dateOrder` (CSV import) shipped in the API long before the
 * SDK could send them. This walks the generated `paths` types for each
 * route's JSON body, then the TypeScript type of the `body:` each SDK
 * `client.request({ method, path, body })` call sends, and requires every
 * spec property to appear in at least one call for that route. One route
 * may be split across methods (`search` / `count` / `countBy`, `upsert` /
 * `upsertMany`, `patch` / `publish` / `unpublish`); their union must cover
 * it. Top-level properties only: a batch row's fields are not walked.
 */

const ROOT = process.cwd()
const METHODS = ['get', 'post', 'put', 'patch', 'delete'] as const

function collectTypeScriptFiles(directory: string): Array<string> {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name)
    if (entry.isDirectory()) {
      return collectTypeScriptFiles(path)
    }
    return extname(entry.name) === '.ts' ? [path] : []
  })
}

function normalizePath(path: string): string {
  return path.replace(/\$\{[^}]*\}/g, '{}').replace(/\{[^}]+\}/g, '{}')
}

function propertyNames(checker: ts.TypeChecker, type: ts.Type): Set<string> {
  const names = new Set<string>()
  const parts = type.isUnionOrIntersection() ? type.types : [type]
  for (const part of parts) {
    for (const symbol of checker.getPropertiesOfType(
      checker.getApparentType(part)
    )) {
      names.add(symbol.name)
    }
  }
  return names
}

/** `"POST /v1/contacts/import-csv"` → the JSON body's property names. */
function readSpecBodies(
  program: ts.Program,
  checker: ts.TypeChecker
): Map<string, Set<string>> {
  const generated = program.getSourceFile(
    join(ROOT, 'src/generated/openapi-types.ts')
  )
  const paths = generated?.statements.find(
    (statement): statement is ts.InterfaceDeclaration =>
      ts.isInterfaceDeclaration(statement) && statement.name.text === 'paths'
  )
  if (!generated || !paths) {
    throw new Error('src/generated/openapi-types.ts has no `paths` interface')
  }
  const typeOf = (symbol: ts.Symbol): ts.Type =>
    checker.getNonNullableType(checker.getTypeOfSymbolAtLocation(symbol, paths))

  const bodies = new Map<string, Set<string>>()
  for (const route of checker.getPropertiesOfType(
    checker.getTypeAtLocation(paths)
  )) {
    const item = typeOf(route)
    for (const method of METHODS) {
      const operation = item.getProperty(method)
      const requestBody =
        operation && typeOf(operation).getProperty('requestBody')
      const content = requestBody && typeOf(requestBody).getProperty('content')
      const json = content && typeOf(content).getProperty('application/json')
      if (json) {
        bodies.set(
          `${method.toUpperCase()} ${normalizePath(route.name)}`,
          propertyNames(checker, typeOf(json))
        )
      }
    }
  }
  return bodies
}

/** The `body` of a request literal, including `...(cond ? { body } : {})`. */
function findBody(
  request: ts.ObjectLiteralExpression
): ts.ObjectLiteralElementLike | undefined {
  const named = (literal: ts.ObjectLiteralExpression, name: string) =>
    literal.properties.find(
      (property) =>
        property.name !== undefined &&
        ts.isIdentifier(property.name) &&
        property.name.text === name
    )
  const direct = named(request, 'body')
  if (direct) {
    return direct
  }
  for (const property of request.properties) {
    if (!ts.isSpreadAssignment(property)) {
      continue
    }
    let expression = property.expression
    while (ts.isParenthesizedExpression(expression)) {
      expression = expression.expression
    }
    const branches = ts.isConditionalExpression(expression)
      ? [expression.whenTrue, expression.whenFalse]
      : [expression]
    for (let branch of branches) {
      while (ts.isParenthesizedExpression(branch)) {
        branch = branch.expression
      }
      const body = ts.isObjectLiteralExpression(branch)
        ? named(branch, 'body')
        : undefined
      if (body) {
        return body
      }
    }
  }
  return undefined
}

/** `"POST /v1/contacts/import-csv"` → every key the SDK's calls can send. */
function readSdkBodies(
  program: ts.Program,
  checker: ts.TypeChecker
): Map<string, Set<string>> {
  const sent = new Map<string, Set<string>>()
  for (const file of program.getSourceFiles()) {
    if (!file.fileName.startsWith(join(ROOT, 'src/resources'))) {
      continue
    }
    const visit = (node: ts.Node): void => {
      const request = ts.isCallExpression(node) ? node.arguments[0] : undefined
      if (
        ts.isCallExpression(node) &&
        ts.isPropertyAccessExpression(node.expression) &&
        node.expression.name.text === 'request' &&
        request !== undefined &&
        ts.isObjectLiteralExpression(request)
      ) {
        const text = (name: string) => {
          const property = request.properties.find(
            (candidate): candidate is ts.PropertyAssignment =>
              ts.isPropertyAssignment(candidate) &&
              ts.isIdentifier(candidate.name) &&
              candidate.name.text === name
          )
          return property?.initializer.getText(file)
        }
        const method = text('method')?.replace(/['"`]/g, '')
        const path = text('path')?.replace(/^[`'"]|[`'"]$/g, '')
        const body = findBody(request)
        if (method && path && body) {
          const key = `${method} ${normalizePath(path)}`
          let expression: ts.Expression | undefined
          if (ts.isShorthandPropertyAssignment(body)) {
            expression = body.name
          } else if (ts.isPropertyAssignment(body)) {
            expression = body.initializer
          }
          if (expression) {
            const keys = sent.get(key) ?? new Set<string>()
            for (const name of propertyNames(
              checker,
              checker.getTypeAtLocation(expression)
            )) {
              keys.add(name)
            }
            sent.set(key, keys)
          }
        }
      }
      ts.forEachChild(node, visit)
    }
    visit(file)
  }
  return sent
}

describe('request body parity', () => {
  it('can send every body property the spec documents', () => {
    const program = ts.createProgram(
      collectTypeScriptFiles(join(ROOT, 'src')),
      {
        strict: true,
        noEmit: true,
        skipLibCheck: true,
        target: ts.ScriptTarget.ES2022,
        module: ts.ModuleKind.ESNext,
        moduleResolution: ts.ModuleResolutionKind.Bundler,
      }
    )
    const checker = program.getTypeChecker()
    const spec = readSpecBodies(program, checker)
    const sdk = readSdkBodies(program, checker)

    // The walk found the bodies (a broken walk would pass vacuously).
    expect(spec.size).toBeGreaterThan(40)
    expect(spec.get('POST /v1/contacts/import-csv')).toContain('csv')

    const unsendable = [...spec].flatMap(([route, properties]) => {
      const keys = sdk.get(route)
      if (!keys) {
        return [`${route}: no SDK call sends a body`]
      }
      const missing = [...properties].filter((name) => !keys.has(name))
      return missing.length > 0 ? [`${route}: ${missing.join(', ')}`] : []
    })
    expect(unsendable).toEqual([])
  }, 120_000)
})
