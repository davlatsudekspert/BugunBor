import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['modules/**/*.test.ts', 'lib/**/*.test.ts'],
    coverage: { reporter: ['text', 'json', 'html'] },
  },
});
