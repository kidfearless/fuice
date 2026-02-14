import { defineConfig, mergeConfig } from 'vitest/config'
import baseConfig from './vitest.base.config'

export default mergeConfig(
  baseConfig,
  defineConfig({
    test: {
      name: 'unit',
      include: ['src/**/*.unit.test.{ts,tsx}'],
      coverage: {
        provider: 'v8',
        reporter: ['text', 'html', 'lcov'],
        reportsDirectory: './coverage/unit',
        include: ['src/lib/**/*.ts', 'src/hooks/**/*.ts', 'src/components/**/*.tsx'],
        exclude: [
          'src/lib/P2PContext.tsx',
          'src/lib/P2PContextTypes.ts',
          'src/lib/types.ts',
          'src/lib/webrtcTypes.ts',
          'src/components/ui/**',
        ],
      },
    },
  }),
)
