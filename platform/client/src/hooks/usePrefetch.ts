import { useCallback, useRef } from 'react';
import { preloadImage, preloadRouteComponent } from '../utils/prefetchUtils';

/**
 * Hook for hover-based pre-fetching
 * Triggers prefetching when user hovers over links/buttons
 */
export function usePrefetch() {
  const prefetchTimers = useRef<Map<string, NodeJS.Timeout>>(new Map());

  /**
   * Prefetch images by URLs
   */
  const prefetchImages = useCallback((urls: string[]) => {
    urls.forEach(url => preloadImage(url));
  }, []);

  /**
   * Prefetch a route's component chunk by path
   * This triggers React.lazy to start loading the chunk
   */
  const prefetchRoute = useCallback((path: string) => {
    // Cancel any existing timer for this path
    const existing = prefetchTimers.current.get(path);
    if (existing) {
      clearTimeout(existing);
    }

    // Debounce to avoid excessive prefetching
    const timer = setTimeout(() => {
      preloadRouteComponent(path);
      prefetchTimers.current.delete(path);
    }, 100);

    prefetchTimers.current.set(path, timer);
  }, []);

  /**
   * Prefetch multiple routes
   */
  const prefetchRoutes = useCallback((paths: string[]) => {
    paths.forEach(path => prefetchRoute(path));
  }, [prefetchRoute]);

  /**
   * Cancel all pending prefetches
   */
  const cancelAllPrefetches = useCallback(() => {
    prefetchTimers.current.forEach(timer => clearTimeout(timer));
    prefetchTimers.current.clear();
  }, []);

  return {
    prefetchImages,
    prefetchRoute,
    prefetchRoutes,
    cancelAllPrefetches,
  };
}

/**
 * Prefetch hook for link hover
 * Returns handlers to attach to link elements
 */
export function useLinkPrefetch(paths: string[]) {
  const { prefetchRoutes, cancelAllPrefetches } = usePrefetch();

  const onMouseEnter = useCallback(() => {
    prefetchRoutes(paths);
  }, [prefetchRoutes, paths]);

  const onMouseLeave = useCallback(() => {
    cancelAllPrefetches();
  }, [cancelAllPrefetches]);

  return { onMouseEnter, onMouseLeave };
}