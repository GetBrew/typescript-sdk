import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

import { defineConfig } from 'tsup'

const here = path.dirname(fileURLToPath(import.meta.url))
const pkg = JSON.parse(
  readFileSync(path.resolve(here, 'package.json'), 'utf8')
) as { version: string }

export default defineConfig({
  // One root bundle plus the browser canvas entries and one bundle per
  // adapter subpath. Adapters import the SDK as `@brew.new/sdk` (external
  // below), so at runtime they load the root bundle instead of inlining a
  // second copy: one `BrewApiError` class.
  entry: {
    index: 'src/index.ts',
    embed: 'src/embed/index.ts',
    react: 'src/react/index.tsx',
    'resend/index': 'src/adapters/resend/index.ts',
    'better-auth/index': 'src/adapters/better-auth/index.ts',
    'next-auth/index': 'src/adapters/next-auth/index.ts',
    'supabase/index': 'src/adapters/supabase/index.ts',
  },
  format: ['esm', 'cjs'],
  dts: true,
  sourcemap: true,
  minify: false,
  target: 'es2022',
  // A single declaration build owns all entries. Esbuild preserves the
  // React entry's client directive; a Rollup treeshake pass would strip it.
  treeshake: false,
  clean: true,
  external: ['react', 'react/jsx-runtime', '@brew.new/sdk'],
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
    // Replace the bare `__SDK_VERSION__` identifier in `src/version.ts`
    // with the real version at build time so consumers always see the
    // published SDK version in the default User-Agent without needing
    // a manual sync between `package.json` and a hand-edited constant.
    __SDK_VERSION__: JSON.stringify(pkg.version),
  },
})
