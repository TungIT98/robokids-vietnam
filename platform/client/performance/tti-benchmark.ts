/**
 * TTI (Time to Interactive) Benchmark Tests
 * Baseline performance metrics for RoboKids platform
 */

import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

export interface TTIMetrics {
  ttfb: number;       // Time to First Byte (ms)
  fcp: number;        // First Contentful Paint (ms)
  lcp: number;        // Largest Contentful Paint (ms)
  tti: number;        // Time to Interactive (ms)
  cls: number;        // Cumulative Layout Shift
  bundleSize: number; // Total JS size (bytes)
}

export interface TTIResult {
  page: string;
  metrics: TTIMetrics;
  passed: boolean;
  rating: 'good' | 'needs-improvement' | 'poor';
}

// Performance budgets for TTI
export const TTI_BUDGETS = {
  ttfb: 800,          // ms
  fcp: 1800,         // ms
  lcp: 4000,         // ms
  tti: 5000,         // ms (critical for kids - must be fast!)
  cls: 0.1,
  bundleSize: 500 * 1024, // 500KB max JS
};

// Lighthouse CI baseline (when running lighthouse)
export const LIGHTHOUSE_BASELINE: Record<string, TTIMetrics> = {
  'homepage': {
    ttfb: 200,
    fcp: 800,
    lcp: 1500,
    tti: 2000,
    cls: 0.05,
    bundleSize: 420000,
  },
  'lessons': {
    ttfb: 250,
    fcp: 900,
    lcp: 1800,
    tti: 2500,
    cls: 0.08,
    bundleSize: 480000,
  },
  'missions': {
    ttfb: 300,
    fcp: 1000,
    lcp: 2000,
    tti: 3000,
    cls: 0.1,
    bundleSize: 450000,
  },
  'blockly': {
    ttfb: 400,
    fcp: 1200,
    lcp: 2500,
    tti: 4000,
    cls: 0.12,
    bundleSize: 520000, // Blockly is heavy
  },
};

/**
 * Parse bundle stats from build output
 */
export function getBundleSize(): number {
  const statsPath = resolve(process.cwd(), 'dist', 'stats.json');

  if (!existsSync(statsPath)) {
    console.warn('Build stats not found. Run "npm run build" first.');
    return 0;
  }

  try {
    const stats = JSON.parse(readFileSync(statsPath, 'utf-8'));
    let totalSize = 0;

    for (const chunk of stats.chunks || []) {
      totalSize += chunk.size || 0;
    }

    return totalSize;
  } catch {
    return 0;
  }
}

/**
 * Check if TTI metrics pass the budget
 */
export function checkTTIBudget(metrics: TTIMetrics): { passed: boolean; violations: string[] } {
  const violations: string[] = [];

  if (metrics.ttfb > TTI_BUDGETS.ttfb) {
    violations.push(`TTFB ${metrics.ttfb}ms exceeds budget ${TTI_BUDGETS.ttfb}ms`);
  }
  if (metrics.fcp > TTI_BUDGETS.fcp) {
    violations.push(`FCP ${metrics.fcp}ms exceeds budget ${TTI_BUDGETS.fcp}ms`);
  }
  if (metrics.lcp > TTI_BUDGETS.lcp) {
    violations.push(`LCP ${metrics.lcp}ms exceeds budget ${TTI_BUDGETS.lcp}ms`);
  }
  if (metrics.tti > TTI_BUDGETS.tti) {
    violations.push(`TTI ${metrics.tti}ms exceeds budget ${TTI_BUDGETS.tti}ms`);
  }
  if (metrics.cls > TTI_BUDGETS.cls) {
    violations.push(`CLS ${metrics.cls} exceeds budget ${TTI_BUDGETS.cls}`);
  }
  if (metrics.bundleSize > TTI_BUDGETS.bundleSize) {
    violations.push(
      `Bundle size ${(metrics.bundleSize / 1024).toFixed(0)}KB exceeds budget ${(TTI_BUDGETS.bundleSize / 1024).toFixed(0)}KB`
    );
  }

  return {
    passed: violations.length === 0,
    violations,
  };
}

/**
 * Rate the overall performance
 */
export function rateTTIPerformance(metrics: TTIMetrics): 'good' | 'needs-improvement' | 'poor' {
  const checks = [
    metrics.ttfb <= TTI_BUDGETS.ttfb,
    metrics.fcp <= TTI_BUDGETS.fcp,
    metrics.lcp <= TTI_BUDGETS.lcp,
    metrics.tti <= TTI_BUDGETS.tti,
    metrics.cls <= TTI_BUDGETS.cls,
    metrics.bundleSize <= TTI_BUDGETS.bundleSize,
  ];

  const passCount = checks.filter(Boolean).length;

  if (passCount >= 5) return 'good';
  if (passCount >= 3) return 'needs-improvement';
  return 'poor';
}

/**
 * Generate TTI baseline report
 */
export function generateTTIReport(results: TTIResult[]): string {
  const lines = [
    '========================================',
    'RoboKids TTI Baseline Report',
    `Generated: ${new Date().toISOString()}`,
    '========================================',
    '',
  ];

  for (const result of results) {
    lines.push(`\nPage: ${result.page}`);
    lines.push(`  Rating: ${result.rating.toUpperCase()}`);
    lines.push(`  TTFB: ${result.metrics.ttfb}ms (budget: ${TTI_BUDGETS.ttfb}ms)`);
    lines.push(`  FCP: ${result.metrics.fcp}ms (budget: ${TTI_BUDGETS.fcp}ms)`);
    lines.push(`  LCP: ${result.metrics.lcp}ms (budget: ${TTI_BUDGETS.lcp}ms)`);
    lines.push(`  TTI: ${result.metrics.tti}ms (budget: ${TTI_BUDGETS.tti}ms)`);
    lines.push(`  CLS: ${result.metrics.cls} (budget: ${TTI_BUDGETS.cls})`);
    lines.push(`  Bundle: ${(result.metrics.bundleSize / 1024).toFixed(0)}KB`);
    lines.push(`  Status: ${result.passed ? 'PASS' : 'FAIL'}`);
  }

  lines.push('\n========================================');
  const totalPassed = results.filter(r => r.passed).length;
  lines.push(`Summary: ${totalPassed}/${results.length} pages passed`);
  lines.push('========================================');

  return lines.join('\n');
}

// CLI
if (require.main === module) {
  const bundleSize = getBundleSize();
  console.log(`
========================================
TTI Performance Check (CLI)
========================================
Bundle Size: ${(bundleSize / 1024).toFixed(0)}KB / ${(TTI_BUDGETS.bundleSize / 1024).toFixed(0)}KB budget
${bundleSize > TTI_BUDGETS.bundleSize ? 'WARNING: Bundle exceeds budget!' : 'Bundle size OK'}
========================================
  `);
}