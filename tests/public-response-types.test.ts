import { join } from 'node:path'
import ts from 'typescript'
import { describe, expect, it } from 'vitest'

describe('public SDK response types', () => {
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
          if (
            !body ||
            body.flags &
              (ts.TypeFlags.Void | ts.TypeFlags.Any | ts.TypeFlags.Unknown)
          )
            untyped.push(name)
        }
      }
    }
    visit(checker.getTypeFromTypeNode(declaration.type), '')
    expect(checked.length).toBeGreaterThan(125)
    expect(checked).toContain('canvas.sessions.revoke')
    expect(untyped).toEqual([])
  }, 120_000)
})
