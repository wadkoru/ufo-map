import { defineConfig } from 'vitest/config';

export default defineConfig({
  base: '/ufo-map/',
  test: { include: ['tests/**/*.test.ts'] },
});
