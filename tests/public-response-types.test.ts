import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import ts from 'typescript'
import { describe, expect, it } from 'vitest'

function hasMissingResponse(type: ts.Type): boolean {
  if (type.isUnion()) return type.types.some(hasMissingResponse)
  return Boolean(
    type.flags &
    (ts.TypeFlags.Void |
      ts.TypeFlags.Undefined |
      ts.TypeFlags.Any |
      ts.TypeFlags.Unknown)
  )
}

describe('public SDK response types', () => {
  it('rejects missing responses inside unions while preserving typed and nullable results', () => {
    const directory = mkdtempSync(join(tmpdir(), 'brew-response-types-'))
    const file = join(directory, 'responses.ts')
    try {
      writeFileSync(
        file,
        `
          type DirectVoid = Promise<void>
          type UnionVoid = Promise<{ revoked: true } | void>
          type UnionUndefined = Promise<{ revoked: true } | undefined>
          type DirectAny = Promise<any>
          type DirectUnknown = Promise<unknown>
          type ValidObject = Promise<{ revoked: true }>
          type ValidUnion = Promise<{ revoked: true } | { pending: true }>
          type ValidNullable = Promise<{ revoked: true } | null>
        `
      )
      const program = ts.createProgram([file], {
        strict: true,
        noEmit: true,
        skipLibCheck: true,
        target: ts.ScriptTarget.ES2022,
        types: [],
      })
      const checker = program.getTypeChecker()
      const untyped: Array<string> = []
      for (const node of program.getSourceFile(file)!.statements) {
        if (!ts.isTypeAliasDeclaration(node)) continue
        const response = checker.getAwaitedType(
          checker.getTypeFromTypeNode(node.type)
        )
        if (!response || hasMissingResponse(response))
          untyped.push(node.name.text)
      }
      expect(untyped).toEqual([
        'DirectVoid',
        'UnionVoid',
        'UnionUndefined',
        'DirectAny',
        'DirectUnknown',
      ])
    } finally {
      rmSync(directory, { recursive: true, force: true })
    }
  })

  it('preserves a typed response from every promise-returning resource method', () => {
    const file = join(process.cwd(), 'src/client.ts')
    const program = ts.createProgram([file], {
      strict: true,
      noEmit: true,
      skipLibCheck: true,
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ESNext,
      moduleResolution: ts.ModuleResolutionKind.Bundler,
    })
    const checker = program.getTypeChecker()
    const source = program.getSourceFile(file)!
    const declaration = source.statements.find(
      (node): node is ts.TypeAliasDeclaration =>
        ts.isTypeAliasDeclaration(node) && node.name.text === 'BrewClient'
    )!
    const checked: Array<string> = []
    const untyped: Array<string> = []
    function visit(type: ts.Type, prefix: string): void {
      for (const property of checker.getPropertiesOfType(type)) {
        const name = prefix + property.name
        if (name === 'withBrand') continue
        const member = checker.getTypeOfSymbolAtLocation(property, declaration)
        const signatures = checker.getSignaturesOfType(
          member,
          ts.SignatureKind.Call
        )
        if (signatures.length === 0) {
          visit(member, name + '.')
          continue
        }
        for (const signature of signatures) {
          const returned = checker.getReturnTypeOfSignature(signature)
          if (returned.getSymbol()?.name !== 'Promise') continue
          const body = checker.getAwaitedType(returned)
          checked.push(name)
          if (!body || hasMissingResponse(body)) untyped.push(name)
        }
      }
    }
    visit(checker.getTypeFromTypeNode(declaration.type), '')
    expect(checked.length).toBeGreaterThan(125)
    expect(checked).toContain('canvas.sessions.revoke')
    expect(untyped).toEqual([])
  }, 120_000)
})
