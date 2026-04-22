/**
 * Utility functions for pre-fetching resources
 * These help reduce perceived latency by loading resources before they're needed
 */

/**
 * Chunk manifest for production builds
 * Maps chunk names to their actual URLs
 */
interface ChunkManifest {
  [chunkName: string]: string;
}

let chunkManifest: ChunkManifest = {};

/**
 * Initialize prefetch system - builds chunk manifest from loaded scripts
 * Call once in App.tsx after mount
 */
export function initPrefetch(): void {
  if (typeof window === 'undefined') return;

  // Scan existing scripts to build chunk manifest
  const scripts = document.querySelectorAll('script[src]');
  const foundChunks: ChunkManifest = {};

  const chunkPatterns: { pattern: RegExp; name: string }[] = [
    { pattern: /vendor-three-[a-zA-Z0-9_-]+\.js$/, name: 'vendor-three' },
    { pattern: /vendor-blockly-[a-zA-Z0-9_-]+\.js$/, name: 'vendor-blockly' },
    { pattern: /vendor-ui-[a-zA-Z0-9_-]+\.js$/, name: 'vendor-ui' },
    { pattern: /vendor-chakra-[a-zA-Z0-9_-]+\.js$/, name: 'vendor-chakra' },
    { pattern: /vendor-react-[a-zA-Z0-9_-]+\.js$/, name: 'vendor-react' },
  ];

  scripts.forEach(script => {
    const src = script.getAttribute('src') || '';
    for (const { pattern, name } of chunkPatterns) {
      if (pattern.test(src) && !foundChunks[name]) {
        foundChunks[name] = src;
      }
    }
  });

  chunkManifest = foundChunks;
  (window as any).__PREFETCH_MANIFEST__ = chunkManifest;
}

/**
 * Get the URL for a named chunk
 */
export function getChunkUrl(chunkName: string): string | null {
  return chunkManifest[chunkName] || null;
}

/**
 * Preload a vendor chunk using link rel=preload
 */
export function preloadChunk(chunkName: string): void {
  if (typeof window === 'undefined') return;

  const url = getChunkUrl(chunkName);
  if (!url) return;

  // Check if already preloaded
  const existing = document.querySelector(`link[data-prefetch-chunk="${chunkName}"]`);
  if (existing) return;

  const link = document.createElement('link');
  link.rel = 'preload';
  link.as = 'script';
  link.href = url;
  link.setAttribute('data-prefetch-chunk', chunkName);
  link.crossOrigin = 'anonymous';
  document.head.appendChild(link);
}

/**
 * Preload an image into browser cache
 */
export function preloadImage(url: string): void {
  if (typeof window === 'undefined') return;

  const img = new Image();
  img.src = url;
}

/**
 * Map of route paths to their lazy-loaded component getters
 * This gets populated when routes are defined in App.tsx
 */
const routeComponentMap = new Map<string, () => Promise<unknown>>();

/**
 * Register a lazy route component for pre-fetching
 * Called internally when we setup lazy routes
 */
export function registerLazyRoute(path: string, loader: () => Promise<unknown>): void {
  routeComponentMap.set(path, loader);
}

/**
 * Prefetch a route's component chunk by triggering the lazy loader
 */
export function preloadRouteComponent(path: string): void {
  const loader = routeComponentMap.get(path);
  if (loader) {
    // This triggers the dynamic import() to start
    loader();
  }
}

/**
 * Preload fonts for better text rendering
 */
export function preloadFont(family: string, weight?: string): void {
  if (typeof window === 'undefined') return;

  const fontFace = new FontFace(family, `url(https://fonts.gstatic.com/s/${family.toLowerCase().replace(/\s+/g, '-')}/v.woff2)`, {
    weight: weight || 'normal',
  });

  fontFace.load().catch(() => {
    // Silently fail - fonts will load normally
  });
}

/**
 * Preload multiple resources
 */
export function preloadResources(urls: string[]): void {
  urls.forEach(preloadImage);
}
