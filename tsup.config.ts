import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

import { defineConfig } from 'tsup'

const here = path.dirname(fileURLToPath(import.meta.url))
const pkg = JSON.parse(
  readFileSync(path.resolve(here, 'package.json'), 'utf8')
) as { version: string }

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    embed: 'src/embed/index.ts',
    react: 'src/react/index.tsx',
  },
  format: ['esm', 'cjs'],
  dts: true,
  sourcemap: true,
  minify: false,
  target: 'es2022',
  treeshake: false,
  clean: true,
  external: ['react', 'react/jsx-runtime'],
  esbuildPlugins: [
    {
      name: 'shared-embed-runtime',
      setup(build) {
        build.onResolve({ filter: /^\.\.\/embed\/index$/ }, () => ({
          path:
            build.initialOptions.format === 'cjs'
              ? './embed.cjs'
              : './embed.js',
          external: true,
        }))
      },
    },
  ],
  splitting: false,
  outDir: 'dist',
  define: {
    __SDK_VERSION__: JSON.stringify(pkg.version),
  },
})
