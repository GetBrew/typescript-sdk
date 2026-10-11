import { join } from 'node:path'

import ts from 'typescript'
import { describe, expect, expectTypeOf, it } from 'vitest'

import type {
  BrewClient,
  BrewSendKey,
  BrewSendPayload,
  BrewSendResponse,
  FireTriggerByKeyResponse,
  SendPayloadValue,
} from '../../src/index'

/**
 * `BrewTriggerKeyRegistry` is EMPTY in this program, so `brew.send` takes
 * any string key and the default payload (`email` plus JSON values). The
 * augmented case lives in `./augmented-registry`, a program of its own,
 * because an augmentation applies to every file its program compiles.
 */
describe('BrewTriggerKeyRegistry: empty (the default)', () => {
  it('accepts any string key with an email-carrying JSON payload', () => {
    expectTypeOf<BrewSendKey>().toEqualTypeOf<string>()
    expectTypeOf<BrewSendPayload<'anything.at-all'>>().toEqualTypeOf<
      { email: string } & { [key: string]: SendPayloadValue }
    >()
    expectTypeOf<BrewSendResponse>().toEqualTypeOf<FireTriggerByKeyResponse>()

    // Compile-only: never called.
    const calls = async (brew: BrewClient) => {
      await brew.send('auth.password-reset', {
        email: 'jane@example.com',
        confirmationUrl: 'https://app.example.com/reset',
        nested: { plan: 'pro', seats: [1, 2] },
      })
      // @ts-expect-error: `email` is required on every send.
      await brew.send('order.paid', { orderId: 'ord_1' })
      await brew.send('order.paid', {
        email: 'jane@example.com',
        // @ts-expect-error: payload values must be JSON (no functions).
        onSent: () => undefined,
      })
    }
    expect(calls).toBeTypeOf('function')
  })
})

describe('BrewTriggerKeyRegistry: augmented with declare module', () => {
  it('rejects unknown keys and wrong payloads (tests/types/augmented-registry)', () => {
    const configPath = join(
      process.cwd(),
      'tests/types/augmented-registry/tsconfig.json'
    )
    const parsed = ts.getParsedCommandLineOfConfigFile(
      configPath,
      {},
      {
        ...ts.sys,
        onUnRecoverableConfigFileDiagnostic: (diagnostic) => {
          throw new Error(
            ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n')
          )
        },
      }
    )
    expect(parsed?.errors ?? []).toEqual([])
    const program = ts.createProgram({
      rootNames: parsed!.fileNames,
      options: parsed!.options,
    })
    const diagnostics = ts.getPreEmitDiagnostics(program).map((diagnostic) => {
      const where = diagnostic.file
        ? `${diagnostic.file.fileName}:${
            diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start ?? 0)
              .line + 1
          }`
        : 'program'
      return `${where} ${ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n')}`
    })

    expect(parsed!.fileNames.map((file) => file.split('/').pop())).toEqual(
      expect.arrayContaining(['check.ts', 'registry.d.ts'])
    )
    expect(diagnostics).toEqual([])
  }, 60_000)
})
