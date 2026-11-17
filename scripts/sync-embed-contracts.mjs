import { readFile, writeFile } from 'node:fs/promises'
const source = new URL('../../brew-v2/lib/embed/contracts.ts', import.meta.url)
const target = new URL('../src/embed/contracts.ts', import.meta.url)
const content =
  '// Generated from brew-v2/lib/embed/contracts.ts. Do not edit.\n' +
  (await readFile(source, 'utf8')).replace(
    "'../shared/guards/is-record'",
    "'./is-record'"
  )
const guardTarget = new URL('../src/embed/is-record.ts', import.meta.url)
const guardContent =
  '// Generated from brew-v2/lib/shared/guards/is-record.ts. Do not edit.\n' +
  (await readFile(
    new URL('../../brew-v2/lib/shared/guards/is-record.ts', import.meta.url),
    'utf8'
  ))
if (process.argv.includes('--check')) {
  if ((await readFile(target, 'utf8')) !== content)
    throw new Error('Embed contracts are stale; run npm run sync:embed')
  if ((await readFile(guardTarget, 'utf8')) !== guardContent)
    throw new Error('Embed object guard is stale; run npm run sync:embed')
} else {
  await writeFile(target, content)
  await writeFile(guardTarget, guardContent)
}
