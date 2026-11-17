import {
  mkdirSync,
  mkdtempSync,
  realpathSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'
import { describe, expect, it } from 'vitest'

// Compiled as both module formats against the built package, so it checks
// the shipped `.d.ts` and `.d.cts`, not `src/`. Nothing here runs.
const consumer = `
import type { BrewClient, EventCountsResponse } from '@brew.new/sdk';
type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false;
type Group = EventCountsResponse['groups'][number];
export const isNumberOrAbsent: Equal<Group['recipients'], number | undefined> = true;
export const isOptional: Equal<{} extends Pick<Group, 'recipients'> ? true : false, true> = true;
export const isCountNumber: Equal<Group['count'], number> = true;
export const older: Group = { key: { eventType: 'sent' }, count: 3 };
export const measured: Group = { key: { eventType: 'opened' }, count: 7, recipients: 2 };
export const zero: Group = { key: { eventType: 'delivered' }, count: 1, recipients: 0 };
// @ts-expect-error The measurement is a number, never null.
export const isNull: Group = { key: {}, count: 1, recipients: null };
export async function read(brew: BrewClient) {
  const report = await brew.analytics.eventCounts({ groupBy: ['eventType'] });
  const inferred: number | undefined = report.groups[0]?.recipients;
  // @ts-expect-error Absent means not measured, so callers must handle it.
  const required: number = report.groups[0]!.recipients;
  const raw = await brew.analytics.eventCounts({ groupBy: ['eventType'] }, { raw: true });
  const fromRaw: number | undefined = raw.data.groups[0]?.recipients;
  return { inferred, required, fromRaw };
}
`

describe('analytics response declarations', () => {
  it('types grouped recipients as an optional number in both module formats', () => {
    const sdk = realpathSync(fileURLToPath(new URL('../', import.meta.url)))
    const root = mkdtempSync(join(tmpdir(), 'brew-analytics-types-'))
    try {
      mkdirSync(join(root, 'node_modules/@brew.new'), { recursive: true })
      symlinkSync(sdk, join(root, 'node_modules/@brew.new/sdk'), 'junction')
      const files = ['consumer.mts', 'consumer.cts'].map((name) => {
        const file = join(root, name)
        writeFileSync(file, consumer)
        return file
      })
      const options: ts.CompilerOptions = {
        strict: true,
        exactOptionalPropertyTypes: true,
        noUncheckedIndexedAccess: true,
        noEmit: true,
        skipLibCheck: true,
        target: ts.ScriptTarget.ES2022,
        module: ts.ModuleKind.NodeNext,
        moduleResolution: ts.ModuleResolutionKind.NodeNext,
        types: [],
      }
      const declarations = files.map((file, index) => {
        const resolved = ts.resolveModuleName(
          '@brew.new/sdk',
          file,
          options,
          ts.sys,
          undefined,
          undefined,
          index === 0 ? ts.ModuleKind.ESNext : ts.ModuleKind.CommonJS
        ).resolvedModule?.resolvedFileName
        return resolved && realpathSync(resolved)
      })
      expect(declarations).toEqual([
        join(sdk, 'dist/index.d.ts'),
        join(sdk, 'dist/index.d.cts'),
      ])
      const diagnostics = ts
        .getPreEmitDiagnostics(ts.createProgram(files, options))
        .map(
          (diagnostic) =>
            `${diagnostic.file?.fileName ?? ''}: ${ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n')}`
        )
      expect(diagnostics).toEqual([])
    } finally {
      rmSync(root, { recursive: true, force: true })
    }
  }, 30_000)
})
