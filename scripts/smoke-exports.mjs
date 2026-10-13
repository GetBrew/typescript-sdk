// Pack the SDK, install the tarball into a scratch project, and load every
// published subpath the way an app would: `import()` (ESM) and `require()`
// (CJS), then type-check the subpaths with `tsc` (node16 + bundler) against
// the packed `.d.ts` files, including a `BrewTriggerKeyRegistry`
// augmentation.
//
// The load-bearing assertion is ONE `BrewApiError` class: each adapter
// imports the SDK as `@brew.new/sdk`, so a root `BrewApiError` thrown through
// an adapter is still recognised with `instanceof`. A bundle that inlined
// its own copy would map it as an unknown error instead.
//
// Run after `bun run build`: `node scripts/smoke-exports.mjs`.
import { execFileSync } from 'node:child_process'
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const pkg = JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8'))
const SUBPATHS = Object.keys(pkg.exports)
  .filter((subpath) => subpath !== './package.json')
  .map((subpath) =>
    subpath === '.' ? pkg.name : `${pkg.name}/${subpath.slice(2)}`
  )

const scratch = mkdtempSync(path.join(tmpdir(), 'brew-sdk-smoke-'))
let failures = 0

function check(condition, message) {
  if (condition) {
    console.log(`  ok   ${message}`)
    return
  }
  failures += 1
  console.error(`  FAIL ${message}`)
}

try {
  // 1. Pack and install exactly what npm would publish.
  const [packed] = JSON.parse(
    execFileSync('npm', ['pack', '--json', '--pack-destination', scratch], {
      cwd: root,
      encoding: 'utf8',
    })
  )
  const app = path.join(scratch, 'app')
  mkdirSync(app)
  writeFileSync(
    path.join(app, 'package.json'),
    JSON.stringify({
      name: 'smoke-app',
      private: true,
      version: '0.0.0',
      type: 'module',
    })
  )
  execFileSync(
    'npm',
    [
      'install',
      '--no-audit',
      '--no-fund',
      '--ignore-scripts',
      '--offline',
      path.join(scratch, packed.filename),
    ],
    { cwd: app, stdio: ['ignore', 'ignore', 'pipe'] }
  )
  const installed = JSON.parse(
    readFileSync(
      path.join(app, 'node_modules', pkg.name, 'package.json'),
      'utf8'
    )
  )
  check(
    installed.dependencies === undefined &&
      installed.peerDependencies === undefined,
    'no runtime or peer dependencies'
  )

  // 2. Every subpath loads both ways, resolved from inside the app.
  const loader = (kind) =>
    SUBPATHS.map((specifier, index) =>
      kind === 'esm'
        ? `export * as m${index} from '${specifier}'`
        : `exports.m${index} = require('${specifier}')`
    ).join('\n')
  writeFileSync(path.join(app, 'load.mjs'), loader('esm'))
  writeFileSync(path.join(app, 'load.cjs'), loader('cjs'))
  const requireFromApp = createRequire(path.join(app, 'index.js'))
  const loaded = {
    esm: await import(pathToFileURL(path.join(app, 'load.mjs')).href).catch(
      (error) => error
    ),
    cjs: (() => {
      try {
        return requireFromApp('./load.cjs')
      } catch (error) {
        return error
      }
    })(),
  }
  check(
    !(loaded.esm instanceof Error),
    `import() every subpath ${loaded.esm instanceof Error ? loaded.esm.message : ''}`
  )
  check(
    !(loaded.cjs instanceof Error),
    `require() every subpath ${loaded.cjs instanceof Error ? loaded.cjs.message : ''}`
  )
  const esm = Object.fromEntries(
    SUBPATHS.map((specifier, index) => [specifier, loaded.esm[`m${index}`]])
  )
  const cjs = Object.fromEntries(
    SUBPATHS.map((specifier, index) => [specifier, loaded.cjs[`m${index}`]])
  )
  check(
    requireFromApp.resolve(pkg.name).endsWith(path.join('dist', 'index.cjs')),
    'require() resolves the CJS build'
  )

  const expectations = {
    [pkg.name]: ['createBrewClient', 'BrewApiError'],
    [`${pkg.name}/resend`]: ['Resend'],
    [`${pkg.name}/better-auth`]: ['brewAuthEmails'],
    [`${pkg.name}/next-auth`]: ['BrewEmail'],
    [`${pkg.name}/auth-js`]: ['BrewEmail'],
    [`${pkg.name}/supabase`]: [
      'createSupabaseSendEmailHook',
      'verifyStandardWebhook',
    ],
  }
  for (const [specifier, names] of Object.entries(expectations)) {
    for (const name of names) {
      check(
        typeof esm[specifier]?.[name] === 'function',
        `ESM ${specifier} exports ${name}`
      )
      check(
        typeof cjs[specifier]?.[name] === 'function',
        `CJS ${specifier} exports ${name}`
      )
    }
  }
  check(
    esm[`${pkg.name}/auth-js`].BrewEmail ===
      esm[`${pkg.name}/next-auth`].BrewEmail,
    '/auth-js and /next-auth are one module'
  )

  // 3. One BrewApiError class per module system, shared by every adapter.
  for (const [system, modules] of [
    ['ESM', esm],
    ['CJS', cjs],
  ]) {
    const { BrewApiError } = modules[pkg.name]
    const notFound = new BrewApiError({
      message: 'No trigger in the brand has that key.',
      status: 404,
      code: 'TRIGGER_KEY_NOT_FOUND',
      type: 'not_found',
      param: undefined,
      suggestion: '',
      docs: '',
      requestId: 'req_smoke',
      retryAfter: undefined,
    })
    const throwingClient = {
      send: () => Promise.reject(notFound),
    }
    const resend = new modules[`${pkg.name}/resend`].Resend(undefined, {
      client: throwingClient,
      onWarning: () => undefined,
    })
    const result = await resend.emails.send({
      to: 'smoke@example.com',
      template: { id: 'auth.password-reset' },
    })
    check(
      result.error?.name === 'not_found' &&
        result.error?.brewCode === 'TRIGGER_KEY_NOT_FOUND',
      `${system}: /resend recognises the root BrewApiError (one class identity)`
    )
  }

  const bundles = ['resend', 'better-auth', 'next-auth', 'supabase'].flatMap(
    (name) => [
      path.join(app, 'node_modules', pkg.name, 'dist', name, 'index.js'),
      path.join(app, 'node_modules', pkg.name, 'dist', name, 'index.cjs'),
    ]
  )
  for (const bundle of bundles) {
    const source = readFileSync(bundle, 'utf8')
    check(
      !/class BrewApiError|BrewApiError = class/.test(source) &&
        !/["']\.\.\/index/.test(source),
      `${path.relative(app, bundle)} does not inline the root SDK`
    )
    if (source.includes('BrewApiError')) {
      check(
        /(?:from |require\()["']@brew\.new\/sdk["']/.test(source),
        `${path.relative(app, bundle)} loads BrewApiError from the root SDK by package name`
      )
    }
    check(
      !/["']node:/.test(source),
      `${path.relative(app, bundle)} has no node: imports`
    )
  }

  // 4. The packed types resolve and compose (node16 ESM + bundler), and an
  // app's registry augmentation reaches the client an adapter takes.
  const tsc = path.join(root, 'node_modules', 'typescript', 'bin', 'tsc')
  writeFileSync(
    path.join(app, 'keys.d.ts'),
    `import '${pkg.name}'
declare module '${pkg.name}' {
  interface BrewTriggerKeyRegistry {
    'auth.password-reset': { email: string; confirmationUrl: string }
  }
}
`
  )
  writeFileSync(
    path.join(app, 'check.mts'),
    `import { createBrewClient, type BrewClient } from '${pkg.name}'
import { Resend } from '${pkg.name}/resend'
import { brewAuthEmails } from '${pkg.name}/better-auth'
import { BrewEmail } from '${pkg.name}/next-auth'
import { BrewEmail as AuthJsBrewEmail } from '${pkg.name}/auth-js'
import { createSupabaseSendEmailHook } from '${pkg.name}/supabase'

const brew: BrewClient = createBrewClient({ apiKey: 'brew_test' })
export const sent = brew.send('auth.password-reset', {
  email: 'a@b.co',
  confirmationUrl: 'https://x.test',
})
// @ts-expect-error: not a registered key.
export const unknownKey = brew.send('auth.unknown', { email: 'a@b.co' })
export const resend = new Resend('brew_test', { client: brew })
export const emails = brewAuthEmails({ client: brew })
export const provider: { id: 'brew'; type: 'email' } = BrewEmail({ client: () => brew })
export const v4Provider: { id: 'email' } = AuthJsBrewEmail({ client: brew, id: 'email' })
export const hook: (request: Request) => Promise<Response> = createSupabaseSendEmailHook({
  client: brew,
  secret: 'v1,whsec_c2VjcmV0',
})
`
  )
  for (const [module, moduleResolution] of [
    ['node16', 'node16'],
    ['esnext', 'bundler'],
  ]) {
    const config = `tsconfig.${moduleResolution}.json`
    writeFileSync(
      path.join(app, config),
      JSON.stringify({
        compilerOptions: {
          noEmit: true,
          strict: true,
          exactOptionalPropertyTypes: true,
          skipLibCheck: false,
          target: 'es2022',
          lib: ['es2022', 'dom'],
          types: [],
          module,
          moduleResolution,
        },
        files: ['check.mts', 'keys.d.ts'],
      })
    )
    try {
      execFileSync(process.execPath, [tsc, '-p', config], {
        cwd: app,
        encoding: 'utf8',
      })
      check(true, `tsc (${moduleResolution}) type-checks every subpath`)
    } catch (error) {
      check(
        false,
        `tsc (${moduleResolution}) type-checks every subpath\n${error.stdout}`
      )
    }
  }
} finally {
  rmSync(scratch, { recursive: true, force: true })
}

if (failures > 0) {
  console.error(`\n${failures} smoke check(s) failed`)
  process.exit(1)
}
console.log(
  '\nexports smoke: all subpaths load, one BrewApiError, types resolve'
)
