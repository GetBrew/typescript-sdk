import { readFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'
describe('browser package boundaries', () => {
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
