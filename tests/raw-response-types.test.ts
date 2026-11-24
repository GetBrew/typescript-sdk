import { join } from 'node:path'
import ts from 'typescript'
import { describe, expect, it } from 'vitest'

const compilerOptions: ts.CompilerOptions = {
  strict: true,
  exactOptionalPropertyTypes: true,
  noEmit: true,
  skipLibCheck: true,
  target: ts.ScriptTarget.ES2022,
  module: ts.ModuleKind.ESNext,
  moduleResolution: ts.ModuleResolutionKind.Bundler,
}

/** Compile consumer calls, including reusable options that widen raw to boolean. */
function checkConsumer(source: string): Array<string> {
  const file = join(process.cwd(), 'tests/raw-response-options.fixture.ts')
  const host = ts.createCompilerHost(compilerOptions)
  const readSource = host.getSourceFile.bind(host)
  host.getSourceFile = (path, languageVersion, onError, shouldCreate) =>
    path === file
      ? ts.createSourceFile(path, source, languageVersion, true)
      : readSource(path, languageVersion, onError, shouldCreate)
  const program = ts.createProgram([file], compilerOptions, host)
  return ts.getPreEmitDiagnostics(program).map((diagnostic) => {
    let sourceLine: string | undefined
    if (diagnostic.file && diagnostic.start !== undefined) {
      const position = diagnostic.file.getLineAndCharacterOfPosition(
        diagnostic.start
      )
      sourceLine = diagnostic.file.text.split('\n').at(position.line)?.trim()
    }
    return [
      diagnostic.file?.fileName,
      sourceLine,
      ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'),
    ]
      .filter(Boolean)
      .join(': ')
  })
}

const preamble = `
  import type { BrewClient, BrewRawResponse, CountContactsByResponse, RequestOptions } from '../src/index'
  declare const brew: BrewClient
  declare const options: RequestOptions
  declare const maybeOptions: RequestOptions | undefined
  declare const isRaw: boolean
  declare const maybeRaw: { readonly raw?: true }
  declare const maybeRequiredRaw: { readonly raw: true } | undefined
  type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends
    (<T>() => T extends B ? 1 : 2) ? true : false
  declare function equal<T extends true>(): void
`

describe('raw response inference', () => {
  it('returns a union for reusable options on every raw-capable public method', () => {
    const file = join(process.cwd(), 'src/client.ts')
    const program = ts.createProgram([file], compilerOptions)
    const checker = program.getTypeChecker()
    const declaration = program
      .getSourceFile(file)!
      .statements.find(
        (node): node is ts.TypeAliasDeclaration =>
          ts.isTypeAliasDeclaration(node) && node.name.text === 'BrewClient'
      )!
    const calls: Array<string> = []
    const methods: Array<string> = []
    function visit(type: ts.Type, prefix: string): void {
      for (const property of checker.getPropertiesOfType(type)) {
        if (property.name === 'withBrand') continue
        const path = `${prefix}.${property.name}`
        const member = checker.getTypeOfSymbolAtLocation(property, declaration)
        const signatures = checker.getSignaturesOfType(
          member,
          ts.SignatureKind.Call
        )
        if (signatures.length === 0) {
          visit(member, path)
          continue
        }
        const signature = signatures.at(-1)!
        if (
          checker.getReturnTypeOfSignature(signature).getSymbol()?.name !==
          'Promise'
        )
          continue
        const optionsIndex = signature.parameters.findIndex((parameter) => {
          const type = checker.getNonNullableType(
            checker.getTypeOfSymbolAtLocation(parameter, declaration)
          )
          return type.getProperty('raw') !== undefined
        })
        if (optionsIndex < 0) continue
        const id = path.replaceAll('.', '_')
        methods.push(path)
        const args = Array.from(
          { length: optionsIndex },
          (_, index) => `args${String(id)}[${String(index)}]`
        ).join(', ')
        const start = args.length > 0 ? `${args}, ` : ''
        const wireData =
          path === 'brew.contacts.count'
            ? 'CountContactsByResponse'
            : `Body${String(id)}`
        calls.push(`
          declare const args${String(id)}: Parameters<typeof ${path}>
          const plain${String(id)} = ${path}(${args})
          const raw${String(id)} = ${path}(${start}{ raw: true })
          const unwrapped${String(id)} = ${path}(${start}{ raw: false })
          const flexible${String(id)} = ${path}(${start}options)
          const maybe${String(id)} = ${path}(${start}maybeOptions)
          const dynamic${String(id)} = ${path}(${start}{ raw: isRaw })
          const optionalRaw${String(id)} = ${path}(${start}maybeRaw)
          const optionalOptions${String(id)} = ${path}(${start}maybeRequiredRaw)
          const timeoutOnly${String(id)} = ${path}(${start}{ timeoutMs: 100 })
          type Body${String(id)} = Awaited<typeof plain${String(id)}>
          type Response${String(id)} = Body${String(id)} | BrewRawResponse<${wireData}>
          equal<Equal<Awaited<typeof raw${String(id)}>, BrewRawResponse<${wireData}>>>()
          equal<Equal<Awaited<typeof unwrapped${String(id)}>, Body${String(id)}>>()
          equal<Equal<Awaited<typeof flexible${String(id)}>, Response${String(id)}>>()
          equal<Equal<Awaited<typeof maybe${String(id)}>, Response${String(id)}>>()
          equal<Equal<Awaited<typeof dynamic${String(id)}>, Response${String(id)}>>()
          equal<Equal<Awaited<typeof optionalRaw${String(id)}>, Response${String(id)}>>()
          equal<Equal<Awaited<typeof optionalOptions${String(id)}>, Response${String(id)}>>()
          equal<Equal<Awaited<typeof timeoutOnly${String(id)}>, Body${String(id)}>>()
        `)
      }
    }
    visit(checker.getTypeFromTypeNode(declaration.type), 'brew')
    expect(methods.length).toBeGreaterThan(125)
    expect(methods).toContain('brew.canvas.sessions.revoke')
    expect(methods).toContain('brew.webhooks.rotateSecret')
    expect(methods).toContain('brew.integrations.events.get')
    expect(methods).toContain(
      'brew.automations.triggers.ensureIntegrationEvent'
    )
    expect(checkConsumer(preamble + calls.join('\n'))).toEqual([])
  }, 120_000)

  it('preserves input-specific returns for polymorphic methods and custom option fields', () => {
    expect(
      checkConsumer(
        preamble +
          `
      import type {
        ContentAddImageResponse, ContentAddImageBatchResponse,
        TemplatesCountResponse, TemplateSummaryListResponse,
        GetEmailResponse, SendEmailInput, SendEmailResponse, FireTriggerInput, FireTriggerResponse,
      } from '../src/index'
      type Payload = { total: number }
      declare const sendInput: SendEmailInput<Payload>
      declare const fireInput: FireTriggerInput<Payload>
      const typedSend = brew.emails.send<Payload>(sendInput, { raw: true })
      const plainSend = brew.emails.send<Payload>(sendInput, {})
      const timeoutSend = brew.emails.send<Payload>(sendInput, { timeoutMs: 100 })
      const plainFire = brew.automations.triggers.fire<Payload>(fireInput, { timeoutMs: 100 })
      const optionalFire = brew.automations.triggers.fire<Payload>(fireInput, maybeRaw)
      equal<Equal<Awaited<typeof plainSend>, SendEmailResponse>>()
      equal<Equal<Awaited<typeof timeoutSend>, SendEmailResponse>>()
      equal<Equal<Awaited<typeof plainFire>, FireTriggerResponse>>()
      equal<Equal<Awaited<typeof optionalFire>, FireTriggerResponse | BrewRawResponse<FireTriggerResponse>>>()
      const typedFire = brew.automations.triggers.fire<Payload>(fireInput, options)
      equal<Equal<Awaited<typeof typedSend>, BrewRawResponse<SendEmailResponse>>>()
      equal<Equal<Awaited<typeof typedFire>, FireTriggerResponse | BrewRawResponse<FireTriggerResponse>>>()
      const one = brew.content.addImage({ imageUrl: 'https://example.com/a.png' }, options)
      const batch = brew.content.addImage({ imageUrls: ['https://example.com/a.png'] }, options)
      const counts = brew.templates.list({ count: true }, options)
      const summary = brew.templates.list({ representation: 'summary' }, { raw: true })
      const email = brew.emails.get('email_a', { include: ['html'], raw: isRaw })
      equal<Equal<Awaited<typeof one>, ContentAddImageResponse | BrewRawResponse<ContentAddImageResponse>>>()
      equal<Equal<Awaited<typeof batch>, ContentAddImageBatchResponse | BrewRawResponse<ContentAddImageBatchResponse>>>()
      equal<Equal<Awaited<typeof counts>, TemplatesCountResponse | BrewRawResponse<TemplatesCountResponse>>>()
      equal<Equal<Awaited<typeof summary>, BrewRawResponse<TemplateSummaryListResponse>>>()
      equal<Equal<Awaited<typeof email>, GetEmailResponse | BrewRawResponse<GetEmailResponse>>>()
    `
      )
    ).toEqual([])
  }, 120_000)
})
