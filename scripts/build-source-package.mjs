import { execFileSync } from 'node:child_process'
import { cpSync, mkdtempSync, rmSync, symlinkSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const workspace = mkdtempSync(join(tmpdir(), 'brew-sdk-build-'))

try {
  // TypeScript will not emit declarations for sources under node_modules.
  // Git dependency managers may prepare the SDK there, so build outside it
  // with the SDK's own locked dependencies and copy back only the artifacts.
  for (const file of [
    'src',
    'package.json',
    'tsconfig.json',
    'tsup.config.ts',
  ]) {
    cpSync(join(root, file), join(workspace, file), { recursive: true })
  }
  symlinkSync(
    join(root, 'node_modules'),
    join(workspace, 'node_modules'),
    // Junctions use absolute paths and need no symlink privilege on Windows.
    'junction'
  )
  execFileSync(
    process.execPath,
    [join(root, 'node_modules/tsup/dist/cli-default.js')],
    { cwd: workspace, stdio: 'inherit' }
  )
  rmSync(join(root, 'dist'), { recursive: true, force: true })
  cpSync(join(workspace, 'dist'), join(root, 'dist'), { recursive: true })
} finally {
  rmSync(workspace, { recursive: true, force: true })
}
