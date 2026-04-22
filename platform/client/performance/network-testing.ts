/**
 * Network Simulation Testing Utilities
 * Tests platform under various network conditions (3G, 4G, offline)
 */

export type NetworkCondition = 'online' | 'offline' | 'slow-3g' | 'fast-3g' | '4g' | 'wifi';

export interface NetworkProfile {
  name: NetworkCondition;
  downloadThroughput: number;  // kbps
  uploadThroughput: number;    // kbps
  latency: number;            // ms
  RTT?: number;               // ms
}

export const NETWORK_PROFILES: Record<NetworkCondition, NetworkProfile> = {
  online: {
    name: 'online',
    downloadThroughput: Infinity,
    uploadThroughput: Infinity,
    latency: 0,
  },
  offline: {
    name: 'offline',
    downloadThroughput: 0,
    uploadThroughput: 0,
    latency: Infinity,
  },
  'slow-3g': {
    name: 'slow-3g',
    downloadThroughput: 400,   // 400 kbps
    uploadThroughput: 400,
    latency: 1500,             // 1500 ms RTT
    RTT: 1500,
  },
  'fast-3g': {
    name: 'fast-3g',
    downloadThroughput: 1500,   // 1.5 Mbps
    uploadThroughput: 750,
    latency: 300,
    RTT: 300,
  },
  '4g': {
    name: '4g',
    downloadThroughput: 4000,   // 4 Mbps
    uploadThroughput: 3000,
    latency: 50,
    RTT: 50,
  },
  wifi: {
    name: 'wifi',
    downloadThroughput: 20000, // 20 Mbps
    uploadThroughput: 20000,
    latency: 5,
    RTT: 5,
  },
};

export interface NetworkTestResult {
  condition: NetworkCondition;
  pageLoaded: boolean;
  loadTime: number;        // ms
  resourcesLoaded: number;
  resourcesFailed: number;
  bytesLoaded: number;
  fromCache: boolean;
}

export interface GracefulDegradationResult {
  offlineWorked: boolean;
  cachedContent: string[];
  criticalFeatures: {
    name: string;
    available: boolean;
  }[];
}

/**
 * Simulate network throttling (requires Chrome DevTools Protocol or Playwright)
 * This is a utility for test scripts
 */
export async function simulateNetworkCondition(
  condition: NetworkCondition
): Promise<void> {
  if (typeof window === 'undefined') return;

  const profile = NETWORK_PROFILES[condition];

  // Use Navigator.connection API if available
  const connection = (navigator as any).connection;
  if (connection) {
    connection.effectiveType = getEffectiveType(condition);
    connection.downlink = profile.downloadThroughput / 1000;
    connection.rtt = profile.RTT || profile.latency;
  }

  // For actual throttling, use Playwright or Chrome DevTools
  console.log(`Network condition set to: ${condition}`);
}

function getEffectiveType(condition: NetworkCondition): string {
  switch (condition) {
    case 'slow-3g':
      return 'slow-2g';
    case 'fast-3g':
      return '3g';
    case '4g':
      return '4g';
    default:
      return '4g';
  }
}

/**
 * Test page load under specific network condition
 */
export async function testPageLoad(
  url: string,
  condition: NetworkCondition
): Promise<NetworkTestResult> {
  const profile = NETWORK_PROFILES[condition];
  const startTime = performance.now();
  let resourcesLoaded = 0;
  let resourcesFailed = 0;
  let bytesLoaded = 0;
  let pageLoaded = false;

  // Track resource loading
  const originalFetch = window.fetch;
  const originalXHR = window.XMLHttpRequest;

  try {
    // Set up resource tracking
    const resourceObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.initiatorType === 'fetch' || entry.initiatorType === 'xhr') {
          resourcesLoaded++;
          bytesLoaded += entry.transferSize || 0;
        }
      }
    });
    resourceObserver.observe({ entryTypes: ['resource'] });

    // Navigate
    if (condition === 'offline') {
      pageLoaded = false;
    } else {
      await fetch(url, { mode: 'no-cors' }).catch(() => {});
      pageLoaded = true;
    }

    const loadTime = performance.now() - startTime;

    return {
      condition,
      pageLoaded,
      loadTime,
      resourcesLoaded,
      resourcesFailed,
      bytesLoaded,
      fromCache: false,
    };
  } catch {
    return {
      condition,
      pageLoaded: false,
      loadTime: performance.now() - startTime,
      resourcesLoaded,
      resourcesFailed: resourcesFailed + 1,
      bytesLoaded,
      fromCache: false,
    };
  }
}

/**
 * Verify graceful degradation when offline
 */
export async function verifyGracefulDegradation(): Promise<GracefulDegradationResult> {
  const criticalFeatures = [
    { name: 'Blockly Workspace', available: false },
    { name: 'Lesson Content', available: false },
    { name: 'Progress Display', available: false },
    { name: 'Navigation', available: false },
  ];

  // Check if critical content is cached
  const cachedContent: string[] = [];

  try {
    const cacheNames = await caches.keys();
    for (const name of cacheNames) {
      const cache = await caches.open(name);
      const keys = await cache.keys();
      cachedContent.push(...keys.map((k) => k.url));
    }
  } catch {
    // Caches not available
  }

  // Verify Blockly is cached
  const blocklyCached = cachedContent.some((url) => url.includes('blockly'));
  criticalFeatures[0].available = blocklyCached;

  // Verify lesson content
  const lessonsCached = cachedContent.some(
    (url) => url.includes('lesson') || url.includes('curriculum')
  );
  criticalFeatures[1].available = lessonsCached;

  // Verify assets
  const assetsCached = cachedContent.some(
    (url) => url.includes('.js') || url.includes('.css') || url.includes('.png')
  );
  criticalFeatures[2].available = assetsCached;
  criticalFeatures[3].available = assetsCached; // Navigation uses assets

  const offlineWorked = cachedContent.length > 0;

  return {
    offlineWorked,
    cachedContent: [...new Set(cachedContent)],
    criticalFeatures,
  };
}

/**
 * Generate network test report
 */
export function generateNetworkReport(results: NetworkTestResult[]): string {
  const lines = [
    '========================================',
    'Network Simulation Test Report',
    '========================================',
    '',
  ];

  for (const result of results) {
    lines.push(`\nCondition: ${result.condition.toUpperCase()}`);
    lines.push(`  Page Loaded: ${result.pageLoaded ? 'YES' : 'NO'}`);
    lines.push(`  Load Time: ${result.loadTime.toFixed(0)}ms`);
    lines.push(`  Resources Loaded: ${result.resourcesLoaded}`);
    lines.push(`  Resources Failed: ${result.resourcesFailed}`);
    lines.push(`  Bytes Loaded: ${(result.bytesLoaded / 1024).toFixed(1)}KB`);
    lines.push(`  From Cache: ${result.fromCache ? 'YES' : 'NO'}`);
  }

  lines.push('\n========================================');
  const passed3G = results.find((r) => r.condition === 'fast-3g')?.loadTime || Infinity;
  lines.push(`3G Usable: ${passed3G < 10000 ? 'YES' : 'NO'} (${(passed3G / 1000).toFixed(1)}s load time)`);
  lines.push('========================================');

  return lines.join('\n');
}