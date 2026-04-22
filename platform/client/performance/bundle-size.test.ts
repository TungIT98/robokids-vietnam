/**
 * Bundle Size Tests
 * Ensures bundle sizes stay within defined budgets
 */

import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';
import { BUNDLE_BUDGETS, parseBundleStats, checkBundleBudget } from './bundle-analyzer';

describe('Bundle Size Tests', () => {
  const distPath = resolve(process.cwd(), 'dist');

  it('should have built dist folder', () => {
    expect(existsSync(distPath)).toBe(true);
  });

  it('should have stats.json after build', () => {
    const statsPath = resolve(distPath, 'stats.json');
    expect(existsSync(statsPath)).toBe(true);
  });

  it('should respect vendor-react budget', () => {
    const statsPath = resolve(distPath, 'stats.json');
    if (!existsSync(statsPath)) return;

    const stats = JSON.parse(readFileSync(statsPath, 'utf-8'));
    const chunk = stats.chunks?.find((c: any) => c.names?.includes('vendor-react'));

    if (chunk) {
      const gzipKB = (chunk.gzipSize || 0) / 1024;
      expect(gzipKB).toBeLessThan(BUNDLE_BUDGETS['vendor-react']);
    }
  });

  it('should respect vendor-blockly budget', () => {
    const statsPath = resolve(distPath, 'stats.json');
    if (!existsSync(statsPath)) return;

    const stats = JSON.parse(readFileSync(statsPath, 'utf-8'));
    const chunk = stats.chunks?.find((c: any) => c.names?.includes('vendor-blockly'));

    if (chunk) {
      const gzipKB = (chunk.gzipSize || 0) / 1024;
      expect(gzipKB).toBeLessThan(BUNDLE_BUDGETS['vendor-blockly']);
    }
  });

  it('should respect vendor-three budget', () => {
    const statsPath = resolve(distPath, 'stats.json');
    if (!existsSync(statsPath)) return;

    const stats = JSON.parse(readFileSync(statsPath, 'utf-8'));
    const chunk = stats.chunks?.find((c: any) => c.names?.includes('vendor-three'));

    if (chunk) {
      const gzipKB = (chunk.gzipSize || 0) / 1024;
      expect(gzipKB).toBeLessThan(BUNDLE_BUDGETS['vendor-three']);
    }
  });

  it('should respect total gzip budget', () => {
    const analysis = parseBundleStats(distPath);
    const { passed } = checkBundleBudget(analysis);

    if (!passed) {
      const { violations } = checkBundleBudget(analysis);
      console.error('Budget violations:', violations);
    }

    expect(passed).toBe(true);
  });
});