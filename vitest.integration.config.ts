import { defineConfig, mergeConfig } from 'vitest/config'
import baseConfig from './vitest.base.config'

export default mergeConfig(
  baseConfig,
  defineConfig({
    test: {
      name: 'integration',
      include: ['src/**/*.int.test.{ts,tsx}'],
      coverage: {
        provider: 'v8',
        reporter: ['text', 'html', 'lcov'],
        reportsDirectory: './coverage/integration',
      },
    },
  }),
)
