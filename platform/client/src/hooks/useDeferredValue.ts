import { useState, useEffect, useRef } from 'react';

/**
 * Custom useDeferredValue implementation for React 18
 * Provides deferred value updates to keep UI responsive during heavy renders
 */
export function useDeferredValue<T>(value: T, delay: number = 50): T {
  const [deferredValue, setDeferredValue] = useState<T>(value);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const valueRef = useRef<T>(value);

  useEffect(() => {
    // Clear any pending update
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Schedule the deferred update
    timeoutRef.current = setTimeout(() => {
      setDeferredValue(valueRef.current);
    }, delay);

    // Immediately update the ref so the deferred value is correct
    valueRef.current = value;

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [value, delay]);

  return deferredValue;
}

/**
 * useDeferredTransition - Simulates useTransition behavior in React 18
 * Returns a deferred version of state updates
 */
export function useDeferredTransition<T>(value: T, delay: number = 50): {
  deferredValue: T;
  isPending: boolean;
} {
  const [deferredValue, setDeferredValue] = useState<T>(value);
  const [isPending, setIsPending] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pendingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const valueRef = useRef<T>(value);

  useEffect(() => {
    // Clear any pending update
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    setIsPending(true);

    // Schedule the deferred update
    timeoutRef.current = setTimeout(() => {
      setDeferredValue(valueRef.current);
      setIsPending(false);
    }, delay);

    // Immediately update the ref
    valueRef.current = value;

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (pendingTimeoutRef.current) {
        clearTimeout(pendingTimeoutRef.current);
      }
    };
  }, [value, delay]);

  return { deferredValue, isPending };
}
