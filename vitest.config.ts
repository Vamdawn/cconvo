import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    include: ['tests/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/core/**', 'src/utils/**'],
      thresholds: {
        lines: 40,
        functions: 48,
        branches: 31,
        statements: 38,
      },
    },
  },
});
