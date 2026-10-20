import { readFile } from 'node:fs/promises'
import { execFileSync } from 'node:child_process'
import {
  mkdirSync,
  mkdtempSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
describe('browser package boundaries', () => {
  it('typechecks CommonJS imports of every package entry with Node16 resolution', () => {
    const root = mkdtempSync(join(tmpdir(), 'brew-sdk-cjs-types-'))
    try {
      mkdirSync(join(root, 'node_modules/@brew.new'), { recursive: true })
      symlinkSync(
        fileURLToPath(new URL('../', import.meta.url)),
        join(root, 'node_modules/@brew.new/sdk'),
        'dir'
      )
      symlinkSync(
        fileURLToPath(new URL('../node_modules/@types', import.meta.url)),
        join(root, 'node_modules/@types'),
        'dir'
      )
      writeFileSync(
        join(root, 'consumer.cts'),
        `import { createBrewClient, BrewBrandExtractionTimeoutError, type WaitForExtractionOptions } from '@brew.new/sdk';\nimport { createEmailCanvas } from '@brew.new/sdk/embed';\nimport { EmailCanvas } from '@brew.new/sdk/react';\nvoid EmailCanvas;
const brew = createBrewClient({apiKey:'brew_test'});
const waitOptions: WaitForExtractionOptions = {maxWaitMs: 1, pollIntervalMs: 1};
const waitResult: Promise<{brandId: string, ready: boolean}> = brew.brands.waitForExtraction('brand_a', waitOptions);
const waitError = new BrewBrandExtractionTimeoutError({brandId: 'brand_a', maxWaitMs: 1});
void waitResult; void waitError.lastStatus;
const group: Parameters<typeof createEmailCanvas>[1] = {clientId: 'brew_client_0123456789abcdef0123456789abcdef', groupId: 'grp_a'};
const email: Parameters<typeof createEmailCanvas>[1] = {clientId: 'brew_client_0123456789abcdef0123456789abcdef', emailId: 'email_a'};
// @ts-expect-error Exactly one target is required.
const both: Parameters<typeof createEmailCanvas>[1] = {clientId: 'brew_client_0123456789abcdef0123456789abcdef', groupId: 'grp_a', emailId: 'email_a'};
// @ts-expect-error Authentication is required.
const missing: Parameters<typeof createEmailCanvas>[1] = {groupId: 'grp_a'};
// @ts-expect-error Browser canvas props do not accept API keys.
const secret: Parameters<typeof createEmailCanvas>[1] = {apiKey: 'brew_secret', groupId: 'grp_a'};
void group; void email; void both; void missing; void secret;`
      )
      expect(() =>
        execFileSync(
          process.execPath,
          [
            fileURLToPath(
              new URL('../node_modules/typescript/bin/tsc', import.meta.url)
            ),
            '--module',
            'Node16',
            '--moduleResolution',
            'Node16',
            '--strict',
            '--skipLibCheck',
            '--noEmit',
            join(root, 'consumer.cts'),
          ],
          { cwd: root, stdio: 'pipe' }
        )
      ).not.toThrow()
    } finally {
      rmSync(root, { recursive: true, force: true })
    }
  })
  it('ships declarations for every public package entry', async () => {
    const declarations = await Promise.all(
      ['index', 'embed', 'react'].flatMap((entry) =>
        ['d.ts', 'd.cts'].map((extension) =>
          readFile(
            new URL(`../dist/${entry}.${extension}`, import.meta.url),
            'utf8'
          )
        )
      )
    )
    expect(declarations).toHaveLength(6)
    expect(declarations.every((source) => source.length > 0)).toBe(true)
  })
  it('preserves the React client directive without marking the server SDK as a client module', async () => {
    const [react, server, browser] = await Promise.all(
      ['react', 'index', 'embed'].map((entry) =>
        readFile(new URL(`../dist/${entry}.js`, import.meta.url), 'utf8')
      )
    )
    expect(react?.trimStart()).toMatch(/^['"]use client['"]/)
    expect(server?.trimStart()).not.toMatch(/^['"]use client['"]/)
    expect(browser).not.toMatch(/from ['"](?:node:|react)/)
  })
})
