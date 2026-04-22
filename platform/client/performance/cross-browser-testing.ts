/**
 * Cross-Browser Testing Utilities
 * Browser detection and feature compatibility checks
 */

export type BrowserName = 'chrome' | 'firefox' | 'safari' | 'edge' | 'opera' | 'unknown';

export interface BrowserInfo {
  name: BrowserName;
  version: string;
  engine: string;
  os: string;
  isMobile: boolean;
  supports: {
    webgl: boolean;
    webpwa: boolean;
    serviceWorker: boolean;
    webWorkers: boolean;
    esModules: boolean;
    cssGrid: boolean;
    flexbox: boolean;
  };
}

export interface BrowserFeatureTest {
  name: string;
  supported: boolean;
  fallback?: string;
}

/**
 * Detect browser and its capabilities
 */
export function detectBrowser(): BrowserInfo {
  if (typeof window === 'undefined') {
    return {
      name: 'unknown',
      version: '0',
      engine: 'unknown',
      os: 'unknown',
      isMobile: false,
      supports: {
        webgl: false,
        webpwa: false,
        serviceWorker: false,
        webWorkers: false,
        esModules: false,
        cssGrid: false,
        flexbox: false,
      },
    };
  }

  const ua = window.navigator.userAgent;
  const nav = window.navigator as any;

  const browserName = detectBrowserName(ua);
  const version = detectVersion(ua, browserName);
  const engine = detectEngine(ua, browserName);
  const os = detectOS(ua);

  return {
    name: browserName,
    version,
    engine,
    os,
    isMobile: /Mobile|Android|iPhone|iPad/i.test(ua),
    supports: {
      webgl: checkWebGL(),
      webpwa: checkPWA(),
      serviceWorker: 'serviceWorker' in nav,
      webWorkers: 'Worker' in window,
      esModules: 'noModule' in HTMLScriptElement.prototype,
      cssGrid: checkCSSGrid(),
      flexbox: checkFlexbox(),
    },
  };
}

function detectBrowserName(ua: string): BrowserName {
  if (ua.includes('Firefox')) return 'firefox';
  if (ua.includes('SamsungBrowser')) return 'chrome'; // Samsung uses Blink
  if (ua.includes('Opera') || ua.includes('OPR')) return 'opera';
  if (ua.includes('Edge')) return 'edge';
  if (ua.includes('Edg')) return 'edge'; // Edge Chromium
  if (ua.includes('Chrome')) return 'chrome';
  if (ua.includes('Safari')) return 'safari';
  return 'unknown';
}

function detectVersion(ua: string, browser: BrowserName): string {
  switch (browser) {
    case 'chrome':
      const chromeMatch = ua.match(/Chrome\/(\d+)/);
      return chromeMatch ? chromeMatch[1] : '0';
    case 'firefox':
      const ffMatch = ua.match(/Firefox\/(\d+)/);
      return ffMatch ? ffMatch[1] : '0';
    case 'safari':
      const safariMatch = ua.match(/Version\/(\d+)/);
      return safariMatch ? safariMatch[1] : '0';
    case 'edge':
      const edgeMatch = ua.match(/Edg\/(\d+)/);
      return edgeMatch ? edgeMatch[1] : '0';
    case 'opera':
      const operaMatch = ua.match(/OPR\/(\d+)/);
      return operaMatch ? operaMatch[1] : '0';
    default:
      return '0';
  }
}

function detectEngine(ua: string, browser: BrowserName): string {
  if (browser === 'firefox') return 'Gecko';
  if (browser === 'safari') return 'WebKit';
  return 'Blink'; // Chrome, Edge, Opera
}

function detectOS(ua: string): string {
  if (ua.includes('Windows')) return 'Windows';
  if (ua.includes('Mac OS')) return 'macOS';
  if (ua.includes('Linux')) return 'Linux';
  if (ua.includes('Android')) return 'Android';
  if (ua.includes('iOS') || ua.includes('iPhone') || ua.includes('iPad')) return 'iOS';
  return 'Unknown';
}

function checkWebGL(): boolean {
  try {
    const canvas = document.createElement('canvas');
    return !!(
      canvas.getContext('webgl') || canvas.getContext('experimental-webgl')
    );
  } catch {
    return false;
  }
}

function checkPWA(): boolean {
  return (
    'serviceWorker' in navigator &&
    'pushManager' in window &&
    Notification.permission !== undefined
  );
}

function checkCSSGrid(): boolean {
  if (typeof document === 'undefined') return false;
  const el = document.createElement('div');
  return CSS.supports('display', 'grid');
}

function checkFlexbox(): boolean {
  if (typeof document === 'undefined') return false;
  const el = document.createElement('div');
  return CSS.supports('display', 'flex');
}

/**
 * Test specific browser features
 */
export function testBrowserFeatures(): BrowserFeatureTest[] {
  const browser = detectBrowser();

  return [
    {
      name: 'WebGL',
      supported: browser.supports.webgl,
      fallback: 'Use CSS animations instead of 3D',
    },
    {
      name: 'Service Workers',
      supported: browser.supports.serviceWorker,
      fallback: 'No offline support',
    },
    {
      name: 'Web Workers',
      supported: browser.supports.webWorkers,
      fallback: 'Main thread may freeze',
    },
    {
      name: 'ES Modules',
      supported: browser.supports.esModules,
      fallback: 'Use transpiled bundles',
    },
    {
      name: 'CSS Grid',
      supported: browser.supports.cssGrid,
      fallback: 'Use Flexbox layout',
    },
    {
      name: 'PWA Features',
      supported: browser.supports.webpwa,
      fallback: 'Cannot install as app',
    },
  ];
}

/**
 * Check if browser meets minimum requirements
 */
export function meetsMinimumRequirements(): {
  met: boolean;
  issues: string[];
} {
  const browser = detectBrowser();
  const issues: string[] = [];

  // Minimum version requirements
  const minVersions: Record<BrowserName, number> = {
    chrome: 80,
    firefox: 75,
    safari: 13,
    edge: 80,
    opera: 67,
    unknown: 999,
  };

  const minVersion = minVersions[browser.name];
  const versionNum = parseInt(browser.version, 10);

  if (versionNum < minVersion) {
    issues.push(
      `${browser.name} ${browser.version} is below minimum ${minVersion}`
    );
  }

  if (!browser.supports.webgl) {
    issues.push('WebGL not supported - 3D features disabled');
  }

  if (!browser.supports.serviceWorker) {
    issues.push('Service Workers not supported - offline mode disabled');
  }

  return {
    met: issues.length === 0,
    issues,
  };
}

/**
 * Generate browser compatibility report
 */
export function generateBrowserReport(info: BrowserInfo): string {
  const tests = testBrowserFeatures();
  const reqs = meetsMinimumRequirements();

  return `
========================================
Browser Compatibility Report
========================================
Browser: ${info.name} ${info.version}
Engine: ${info.engine}
OS: ${info.os}
Mobile: ${info.isMobile ? 'YES' : 'NO'}

FEATURE SUPPORT:
${tests.map((t) => `  ${t.name}: ${t.supported ? 'YES' : 'NO'}`).join('\n')}

MINIMUM REQUIREMENTS:
  Status: ${reqs.met ? 'MET' : 'NOT MET'}
${reqs.issues.length > 0 ? reqs.issues.map((i) => `  - ${i}`).join('\n') : ''}
========================================
`;
}

/**
 * Get recommended browser warning
 */
export function getBrowserWarning(): string | null {
  const browser = detectBrowser();

  if (browser.name === 'safari' && parseInt(browser.version, 10) < 14) {
    return 'Safari < 14 may have issues with WebGL performance';
  }

  if (browser.name === 'firefox' && parseInt(browser.version, 10) < 78) {
    return 'Firefox < 78 may have performance issues';
  }

  if (!browser.supports.webgl) {
    return 'WebGL not supported - 3D features will be limited';
  }

  return null;
}