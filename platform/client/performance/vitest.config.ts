/**
 * Vitest Configuration for Performance Tests
 */
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['performance/**/*.test.ts'],
    coverage: {
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules/', 'dist/'],
    },
    // Timeout for performance tests
    testTimeout: 60000,
    // Allow long-running tests
    hookTimeout: 30000,
  },
});