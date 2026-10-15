import { execFileSync } from 'node:child_process'
import {
  cpSync,
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

describe('Git source package boundary', () => {
  it('builds usable declarations when prepared inside node_modules', () => {
    const root = mkdtempSync(join(tmpdir(), 'brew-sdk-source-install-'))
    const sdk = join(root, 'node_modules/@brew.new/sdk')
    const repository = fileURLToPath(new URL('../', import.meta.url))
    const dependencies = join(repository, 'node_modules')
    try {
      mkdirSync(sdk, { recursive: true })
      for (const file of [
        'src',
        'package.json',
        'tsconfig.json',
        'tsup.config.ts',
        'scripts/build-source-package.mjs',
      ]) {
        cpSync(join(repository, file), join(sdk, file), { recursive: true })
      }
      symlinkSync(dependencies, join(sdk, 'node_modules'), 'dir')
      symlinkSync(
        join(dependencies, '@types'),
        join(root, 'node_modules/@types'),
        'dir'
      )
      execFileSync(
        process.execPath,
        [join(sdk, 'scripts/build-source-package.mjs')],
        { cwd: sdk, stdio: 'pipe' }
      )
      const consumer = `
        import { createBrewClient, BrewApiError, type CreateApiKeyInput, type CanvasSessionRevokeResponse } from '@brew.new/sdk';
        import { createEmailCanvas } from '@brew.new/sdk/embed';
        import { EmailCanvas } from '@brew.new/sdk/react';
        const client = createBrewClient({ apiKey: 'brew_test' });
        async function revoke(): Promise<CanvasSessionRevokeResponse> {
          return client.canvas.sessions.revoke('session_test');
        }
        function handle(error: unknown) {
          if (error instanceof BrewApiError) return error.status;
          return 0;
        }
        type KeyName = CreateApiKeyInput['name'];
        void revoke; void handle; void createEmailCanvas; void EmailCanvas;
        export type { KeyName };
      `
      writeFileSync(join(root, 'consumer.mts'), consumer)
      writeFileSync(join(root, 'consumer.cts'), consumer)
      expect(() =>
        execFileSync(
          process.execPath,
          [
            join(dependencies, 'typescript/bin/tsc'),
            '--module',
            'Node16',
            '--moduleResolution',
            'Node16',
            '--strict',
            '--skipLibCheck',
            '--noEmit',
            join(root, 'consumer.mts'),
            join(root, 'consumer.cts'),
          ],
          { cwd: root, stdio: 'pipe' }
        )
      ).not.toThrow()
    } finally {
      rmSync(root, { recursive: true, force: true })
    }
  }, 120_000)
})
