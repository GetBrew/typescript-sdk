import { execFileSync } from 'node:child_process'
import { copyFileSync, existsSync, mkdirSync, rmSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const sdkDirectory = resolve(process.argv[2] ?? '')
const root = fileURLToPath(new URL('../', import.meta.url))
if (!process.argv[2] || !existsSync(resolve(sdkDirectory, 'dist/react.js'))) {
  throw new Error(
    'Pass a built SDK checkout: node scripts/use-local-sdk.mjs /path/to/typescript-sdk'
  )
}
const vendor = resolve(root, 'vendor')
mkdirSync(vendor, { recursive: true })
const packed = JSON.parse(
  execFileSync(
    'npm',
    ['pack', '--ignore-scripts', '--json', '--pack-destination', vendor],
    { cwd: sdkDirectory, encoding: 'utf8' }
  )
)
const source = resolve(vendor, packed[0].filename)
copyFileSync(source, resolve(vendor, 'brew-sdk.tgz'))
rmSync(source)
console.log(
  'SDK packed. Run pnpm add ./vendor/brew-sdk.tgz --save-exact, then pnpm run doctor.'
)
