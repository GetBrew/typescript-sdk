import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { checkConfiguration } from '../lib/config.ts'

const problems = [...checkConfiguration(process.env).problems]
if (!existsSync(resolve('node_modules/@brew.new/sdk/dist/react.js'))) {
  problems.push(
    'Install an SDK build containing the embed and react entry points. See README.md.'
  )
}
if (problems.length) {
  console.error(problems.join('\n'))
  process.exitCode = 1
} else {
  console.log(
    'Configuration is complete. This checks setup only; open the app to verify access to your configured targets.'
  )
}
