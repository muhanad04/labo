import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

const pages = process.env.LABO_PAGES === '1'

export default defineConfig({
  base: pages ? '/labo/' : '/',
  build: pages ? { outDir: 'dist-pages/labo' } : {},
  plugins: [react()],
  server: {
    watch: {
      ignored: ['**/dist-pages/**', '**/docs/assets/**'],
      awaitWriteFinish: { stabilityThreshold: 150, pollInterval: 25 },
    },
  },
  test: { include: ['src/**/*.test.ts'] },
})
