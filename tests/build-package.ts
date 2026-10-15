import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

/** Package-boundary tests always inspect fresh output, including on clean CI. */
export default function buildPackage(): void {
  execFileSync(
    process.execPath,
    [
      fileURLToPath(
        new URL('../node_modules/tsup/dist/cli-default.js', import.meta.url)
      ),
    ],
    { cwd: fileURLToPath(new URL('../', import.meta.url)), stdio: 'pipe' }
  )
}
