import process from 'node:process'
import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: [
    'src/index.ts',
  ],
  format: 'esm',
  shims: false,
  dts: false,
  sourcemap: process.env.NODE_ENV === 'development',
  external: [
    'vscode',
  ],
})
