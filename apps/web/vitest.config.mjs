import { defineConfig } from 'vitest/config'

export default defineConfig({
  oxc: {
    jsx: {
      runtime: 'automatic',
    },
  },
  test: {
    setupFiles: ['./src/test-setup.ts'],
    environment: 'node',
    exclude: ['e2e/**', 'node_modules/**'],
  },
})
