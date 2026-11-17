import { execFileSync } from 'node:child_process'
import { mkdtempSync, rmSync } from 'node:fs'
import { basename, join } from 'node:path'
import { fileURLToPath } from 'node:url'

/** Package-boundary tests always inspect fresh output, including on clean CI. */
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
  // Run before parallel tests: prepare rebuilds dist, and consumers such as
  // the canvas demo require npm's machine-readable pack output to stay JSON.
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
          // npm is a command shim on Windows. Arguments are fixed strings
          // and a generated basename, so no caller paths reach the shell.
          shell: process.platform === 'win32',
        }
      )
    )
  } finally {
    rmSync(destination, { recursive: true, force: true })
  }
}
