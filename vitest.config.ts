import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    alias: [
      {
        find: /^@xinkjs\/xi$/,
        replacement: fileURLToPath(new URL('./packages/xi/lib/exports/index.ts', import.meta.url))
      },
      {
        find: /^@xinkjs\/xin$/,
        replacement: fileURLToPath(new URL('./packages/xin/lib/exports/index.ts', import.meta.url))
      }
    ]
  }
})
