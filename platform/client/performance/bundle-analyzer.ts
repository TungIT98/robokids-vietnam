/**
 * Bundle Size Analyzer for RoboKids Platform
 * Monitors chunk sizes and enforces performance budgets
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';

interface BundleChunk {
  name: string;
  size: number;
  gzipSize: number;
}

interface BundleAnalysis {
  chunks: BundleChunk[];
  totalSize: number;
  totalGzipSize: number;
  timestamp: string;
}

// Performance budgets (in KB)
export const BUNDLE_BUDGETS = {
  // Individual chunk limits
  'vendor-react': 100,      // 100KB max (gzipped)
  'vendor-chakra': 80,      // 80KB max
  'vendor-blockly': 150,   // 150KB max (Blockly is large)
  'vendor-three': 200,      // 200KB max (Three.js ecosystem)
  'vendor-ui': 50,          // 50KB max

  // Total limits
  totalGzip: 500,           // 500KB total gzipped
  initialLoad: 300,         // 300KB for initial bundle
};

export function parseBundleStats(distPath: string): BundleAnalysis {
  const statsPath = resolve(distPath, 'stats.html');
  const chunks: BundleChunk[] = [];

  // Read the stats HTML file to get chunk info
  // In production, use the JSON stats file
  try {
    const statsJsonPath = resolve(distPath, 'stats.json');
    const stats = JSON.parse(readFileSync(statsJsonPath, 'utf-8'));

    for (const chunk of stats.chunks || []) {
      if (chunk.names && chunk.names.length > 0) {
        const name = chunk.names[0];
        chunks.push({
          name,
          size: chunk.size || 0,
          gzipSize: chunk.gzipSize || 0,
        });
      }
    }
  } catch {
    // Fallback: stats.json not available
    console.warn('Bundle stats not available. Run build with --mode production');
  }

  return {
    chunks,
    totalSize: chunks.reduce((sum, c) => sum + c.size, 0),
    totalGzipSize: chunks.reduce((sum, c) => sum + c.gzipSize, 0),
    timestamp: new Date().toISOString(),
  };
}

export function checkBundleBudget(analysis: BundleAnalysis): {
  passed: boolean;
  violations: string[];
} {
  const violations: string[] = [];

  // Check total gzip size
  const totalGzipKB = analysis.totalGzipSize / 1024;
  if (totalGzipKB > BUNDLE_BUDGETS.totalGzip) {
    violations.push(
      `Total gzip size ${totalGzipKB.toFixed(1)}KB exceeds budget ${BUNDLE_BUDGETS.totalGzip}KB`
    );
  }

  // Check individual chunks
  for (const chunk of analysis.chunks) {
    const budget = BUNDLE_BUDGETS[chunk.name as keyof typeof BUNDLE_BUDGETS];
    if (budget) {
      const gzipKB = chunk.gzipSize / 1024;
      if (gzipKB > budget) {
        violations.push(
          `Chunk "${chunk.name}" is ${gzipKB.toFixed(1)}KB, exceeds budget ${budget}KB`
        );
      }
    }
  }

  return {
    passed: violations.length === 0,
    violations,
  };
}

export function generateBaselineReport(analysis: BundleAnalysis): string {
  return `
========================================
RoboKids Bundle Size Baseline
Generated: ${analysis.timestamp}
========================================

CHUNK SIZES (gzipped):
${analysis.chunks.map(c => `  ${c.name}: ${(c.gzipSize / 1024).toFixed(1)}KB`).join('\n')}

TOTALS:
  Total Size: ${(analysis.totalSize / 1024).toFixed(1)}KB
  Total Gzip: ${(analysis.totalGzipSize / 1024).toFixed(1)}KB

BUDGETS:
  Total Gzip Budget: ${BUNDLE_BUDGETS.totalGzip}KB
  Status: ${checkBundleBudget(analysis).passed ? 'PASS' : 'FAIL'}
========================================
`;
}

// CLI usage
if (require.main === module) {
  const distPath = resolve(process.cwd(), 'dist');
  const analysis = parseBundleStats(distPath);
  console.log(generateBaselineReport(analysis));

  const { passed, violations } = checkBundleBudget(analysis);
  if (!passed) {
    console.error('\nBUDGET VIOLATIONS:');
    violations.forEach(v => console.error(`  - ${v}`));
    process.exit(1);
  }
}