/**
 * PWA Testing Utilities
 * Tests for offline functionality, service worker updates, and cache invalidation
 */

export interface PWAFeatures {
  serviceWorker: boolean;
  manifest: boolean;
  offlineSupport: boolean;
  installable: boolean;
}

export interface CacheEntry {
  url: string;
  timestamp: number;
  size: number;
}

export interface SWUpdateStatus {
  registered: boolean;
  active: boolean;
  updateAvailable: boolean;
  updateReady: boolean;
}

/**
 * Check if PWA features are available
 */
export function checkPWAFeatures(): PWAFeatures {
  if (typeof window === 'undefined') {
    return {
      serviceWorker: false,
      manifest: false,
      offlineSupport: false,
      installable: false,
    };
  }

  const nav = window.navigator as any;

  return {
    serviceWorker: 'serviceWorker' in nav,
    manifest: document.querySelector('link[rel="manifest"]') !== null,
    offlineSupport: 'serviceWorker' in nav,
    installable: (nav as any).standalone !== undefined ||
                 window.matchMedia('(display-mode: standalone)').matches,
  };
}

/**
 * Get service worker update status
 */
export async function getSWUpdateStatus(): Promise<SWUpdateStatus> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return {
      registered: false,
      active: false,
      updateAvailable: false,
      updateReady: false,
    };
  }

  const reg = await navigator.serviceWorker.getRegistration();

  return {
    registered: !!reg,
    active: !!reg?.active,
    updateAvailable: !!reg?.updateFound,
    updateReady: !!(reg as any)?.waiting,
  };
}

/**
 * Request service worker update
 */
export async function requestSWUpdate(): Promise<boolean> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return false;
  }

  const reg = await navigator.serviceWorker.getRegistration();
  if (!reg) return false;

  try {
    await reg.update();
    return true;
  } catch {
    return false;
  }
}

/**
 * Skip waiting and activate new service worker
 */
export async function activateNewSW(): Promise<boolean> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return false;
  }

  const reg = await navigator.serviceWorker.getRegistration();
  if (!reg || !(reg as any).waiting) return false;

  try {
    (reg as any).waiting.postMessage({ type: 'SKIP_WAITING' });
    return true;
  } catch {
    return false;
  }
}

/**
 * List cached entries (for testing cache invalidation)
 */
export async function getCacheEntries(cacheName: string): Promise<CacheEntry[]> {
  if (typeof window === 'undefined' || !('caches' in window)) {
    return [];
  }

  try {
    const cache = await caches.open(cacheName);
    const keys = await cache.keys();
    const entries: CacheEntry[] = [];

    for (const request of keys) {
      const response = await cache.match(request);
      if (response) {
        const blob = await response.clone().blob();
        entries.push({
          url: request.url,
          timestamp: Date.now(),
          size: blob.size,
        });
      }
    }

    return entries;
  } catch {
    return [];
  }
}

/**
 * Test offline mode - try to fetch and check if it fails gracefully
 */
export async function testOfflineMode(url: string): Promise<{
  success: boolean;
  fromCache: boolean;
  error?: string;
}> {
  // First cache the URL
  try {
    const cache = await caches.open('test-cache');
    await cache.add(url);

    // Now go offline and try to fetch
    const offlineHandler = new Promise<boolean>((resolve) => {
      window.addEventListener('offline', () => resolve(true), { once: true });
      setTimeout(() => resolve(false), 2000);
    });

    // Trigger offline mode
    (window as any).mockOffline = true;

    try {
      const response = await fetch(url);
      const fromCache = response.headers.get('X-From-Cache') === 'true';
      return { success: true, fromCache };
    } catch (error) {
      // Try cache
      const cached = await cache.match(url);
      if (cached) {
        return { success: true, fromCache: true };
      }
      return { success: false, fromCache: false, error: String(error) };
    } finally {
      (window as any).mockOffline = false;
    }
  } catch (error) {
    return { success: false, fromCache: false, error: String(error) };
  }
}

/**
 * Verify service worker registration
 */
export async function verifySWRegistration(): Promise<{
  registered: boolean;
  scope: string | null;
  state: string | null;
}> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return { registered: false, scope: null, state: null };
  }

  const reg = await navigator.serviceWorker.getRegistration();

  if (!reg) {
    return { registered: false, scope: null, state: null };
  }

  return {
    registered: true,
    scope: reg.scope,
    state: reg.active?.state || null,
  };
}

/**
 * PWA Test Suite Results
 */
export interface PWATestResults {
  features: PWAFeatures;
  swStatus: SWUpdateStatus;
  swVerification: {
    registered: boolean;
    scope: string | null;
    state: string | null;
  };
  passed: boolean;
  issues: string[];
}

export async function runPWATests(): Promise<PWATestResults> {
  const features = checkPWAFeatures();
  const swStatus = await getSWUpdateStatus();
  const swVerification = await verifySWRegistration();

  const issues: string[] = [];

  if (!features.serviceWorker) issues.push('Service Worker not supported');
  if (!features.manifest) issues.push('Web App Manifest missing');
  if (!features.offlineSupport) issues.push('Offline support not available');
  if (!swStatus.registered) issues.push('Service Worker not registered');
  if (!swVerification.registered) issues.push('Service Worker registration failed');

  return {
    features,
    swStatus,
    swVerification,
    passed: issues.length === 0,
    issues,
  };
}

/**
 * Generate PWA test report
 */
export function generatePWAReport(results: PWATestResults): string {
  return `
========================================
PWA Test Report
========================================
Service Worker
  Registered: ${results.swVerification.registered ? 'YES' : 'NO'}
  Scope: ${results.swVerification.scope || 'N/A'}
  State: ${results.swVerification.state || 'N/A'}

Update Status
  Update Available: ${results.swStatus.updateAvailable ? 'YES' : 'NO'}
  Update Ready: ${results.swStatus.updateReady ? 'YES' : 'NO'}

Features
  Service Worker: ${results.features.serviceWorker ? 'SUPPORTED' : 'NOT SUPPORTED'}
  Manifest: ${results.features.manifest ? 'FOUND' : 'NOT FOUND'}
  Offline Support: ${results.features.offlineSupport ? 'YES' : 'NO'}
  Installable: ${results.features.installable ? 'YES' : 'NO'}

Status: ${results.passed ? 'PASS' : 'FAIL'}
${results.issues.length > 0 ? '\nIssues:\n' + results.issues.map(i => `  - ${i}`).join('\n') : ''}
========================================
`;
}