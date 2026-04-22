import { useEffect, useRef, useCallback } from 'react';

/**
 * Track interaction timing for INP (Interaction to Next Paint) optimization
 * INP measures the worst interaction latency across the page lifetime
 */
export function useInteractionTiming() {
  const interactionStart = useRef<number>(0);
  const pendingInteractions = useRef<Set<string>>(new Set());

  useEffect(() => {
    // Track pointer events (clicks, taps)
    const handlePointerDown = (e: PointerEvent) => {
      interactionStart.current = performance.now();
      pendingInteractions.current.add(e.pointerId.toString());
    };

    const handlePointerUp = (e: PointerEvent) => {
      if (pendingInteractions.current.has(e.pointerId.toString())) {
        const duration = performance.now() - interactionStart.current;
        // Log interaction duration for debugging
        if (duration > 100) {
          console.debug(`[INP] Interaction ${e.pointerId} took ${duration.toFixed(2)}ms`);
        }
        pendingInteractions.current.delete(e.pointerId.toString());
      }
    };

    // Track keyboard interactions
    const handleKeyDown = (e: KeyboardEvent) => {
      interactionStart.current = performance.now();
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const duration = performance.now() - interactionStart.current;
      if (duration > 100) {
        console.debug(`[INP] Keyboard interaction took ${duration.toFixed(2)}ms`);
      }
    };

    window.addEventListener('pointerdown', handlePointerDown, { passive: true });
    window.addEventListener('pointerup', handlePointerUp, { passive: true });
    window.addEventListener('keydown', handleKeyDown, { passive: true });
    window.addEventListener('keyup', handleKeyUp, { passive: true });

    return () => {
      window.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);
}

/**
 * Mark the end of an interaction handler
 * Call this at the end of expensive event handlers
 */
export function endInteraction(): number {
  return performance.now();
}

/**
 * Wrap an event handler to track its duration
 */
export function withInteractionTracking<T extends (...args: unknown[]) => unknown>(
  handler: T,
  label?: string
): T {
  return ((...args: unknown[]) => {
    const start = performance.now();
    const result = handler(...args);
    const duration = performance.now() - start;

    if (duration > 50) {
      console.debug(`[INP] Handler "${label || 'anonymous'}" took ${duration.toFixed(2)}ms`);
    }

    // If handler returns a promise, track async completion too
    if (result instanceof Promise) {
      result.then(() => {
        const totalDuration = performance.now() - start;
        if (totalDuration > 100) {
          console.debug(`[INP] Async handler "${label || 'anonymous'}" took ${totalDuration.toFixed(2)}ms`);
        }
      });
    }

    return result;
  }) as T;
}
