import { mkdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import process from 'node:process'
import { defineConfig } from 'tsdown'

const sourcemap = process.env.NODE_ENV === 'development'

export default defineConfig([
  {
    entry: 'src/index.ts',
    shims: false,
    dts: false,
    sourcemap,
    external: [
      'vscode',
    ],
  },
  {
    entry: 'src/plugin.ts',
    format: 'cjs',
    shims: false,
    dts: false,
    sourcemap,
    hooks: {
      'build:done': async function () {
        const pluginDir = resolve(import.meta.dirname, './node_modules/goto-alias-typescript-plugin')
        await mkdir(pluginDir, { recursive: true })
        await writeFile(
          resolve(pluginDir, 'index.js'),
          `module.exports = require('../../dist/plugin.cjs')\n`,
        )
      },
    },
  },
])
