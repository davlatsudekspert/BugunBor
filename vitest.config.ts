import path from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  // Mirrors tsconfig.json's "@/*" -> "./*" path mapping, so a tested module can use the same
  // "@/..." imports as the rest of the app instead of switching to relative paths just for tests.
  resolve: { alias: { '@': path.resolve(__dirname, '.') } },
  test: {
    environment: 'node',
    include: ['modules/**/*.test.ts', 'lib/**/*.test.ts'],
    coverage: { reporter: ['text', 'json', 'html'] },
  },
});
