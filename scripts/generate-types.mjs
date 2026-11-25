import fs from 'node:fs'
import openapiTS, { astToString } from 'openapi-typescript'
import ts from 'typescript'
import { withoutComments } from './lib/source-comments.mjs'

const RECURSIVE_PAYLOAD_SCHEMA = '#/components/schemas/SendPayloadValue'

const INJECTED_ALIAS = `export type SendPayloadValue =
  | string
  | number
  | boolean
  | null
  | SendPayloadValue[]
  | { [key: string]: SendPayloadValue };
`

const specUrl = new URL('../openapi/public-api-v1.yaml', import.meta.url)
const outUrl = new URL('../src/generated/openapi-types.ts', import.meta.url)

const ast = await openapiTS(specUrl, {
  defaultNonNullable: false,
  inject: INJECTED_ALIAS,
  transform(_schemaObject, options) {
    if (options.path === RECURSIVE_PAYLOAD_SCHEMA) {
      return ts.factory.createTypeReferenceNode('SendPayloadValue')
    }
  },
})

fs.writeFileSync(
  outUrl,
  ts
    .createPrinter()
    .printFile(
      ts.createSourceFile(
        'openapi-types.ts',
        withoutComments('openapi-types.ts', astToString(ast)),
        ts.ScriptTarget.Latest,
        true,
        ts.ScriptKind.TS
      )
    )
)
console.log(`wrote ${outUrl.pathname}`)
