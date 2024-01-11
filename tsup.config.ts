import process from 'node:process'
import { defineConfig } from 'tsup'

export default defineConfig({
  entry: [
    'src/index.ts',
  ],
  format: ['cjs'],
  shims: false,
  dts: false,
  sourcemap: process.env.NODE_ENV === 'development',
  external: [
    'vscode',
  ],
})
