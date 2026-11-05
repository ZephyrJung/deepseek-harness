/** Skip bundling — this package is a plugin only, not a bundled library. */
import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: ['./index.js'],
  external: [],
  target: 'es2024',
})
