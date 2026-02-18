import { coverageConfigDefaults, defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    coverage: {
      provider: 'istanbul',
      reporter: ['text', 'lcov'],
      exclude: [
        'test/',
        'dist/',
        '**/*types.ts',
        ...coverageConfigDefaults.exclude
      ],
    },
    restoreMocks: true
  }
});
