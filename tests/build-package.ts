import { execFileSync } from 'node:child_process'
import { mkdtempSync, rmSync } from 'node:fs'
import { basename, join } from 'node:path'
import { fileURLToPath } from 'node:url'

export default function buildPackage(): void {
  const root = fileURLToPath(new URL('../', import.meta.url))
  execFileSync(
    process.execPath,
    [
      fileURLToPath(
        new URL('../node_modules/tsup/dist/cli-default.js', import.meta.url)
      ),
    ],
    { cwd: root, stdio: 'pipe' }
  )
  const destination = mkdtempSync(join(root, '.sdk-pack-'))
  try {
    JSON.parse(
      execFileSync(
        'npm',
        [
          'pack',
          '--ignore-scripts',
          '--json',
          '--pack-destination',
          basename(destination),
        ],
        {
          cwd: root,
          encoding: 'utf8',
          stdio: 'pipe',
          shell: process.platform === 'win32',
        }
      )
    )
  } finally {
    rmSync(destination, { recursive: true, force: true })
  }
}
