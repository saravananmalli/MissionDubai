import { defineConfig, mergeConfig } from 'vitest/config';
import viteConfig from './vite.config.ts';

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      environment: 'jsdom',
      setupFiles: ['./tests/unit/setup.ts'],
      globals: true,
      exclude: ['node_modules', 'e2e', 'dist', 'tests/integration'],
    },
  }),
);
