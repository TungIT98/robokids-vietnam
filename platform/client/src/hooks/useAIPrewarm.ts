/**
 * useAIPrewarm - Pre-warm AI context on hover for faster first-response
 * Call this hook on AI tutor button hover to trigger backend prewarm
 */

import { useCallback, useRef } from 'react';
import { aiApi } from '../services/api';

export function useAIPrewarm() {
  const prewarmTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isPrewarmedRef = useRef(false);

  const prewarm = useCallback((options?: { age?: number; currentLesson?: number }) => {
    // Debounce prewarm - only trigger after 200ms hover
    if (prewarmTimeoutRef.current) {
      clearTimeout(prewarmTimeoutRef.current);
    }

    prewarmTimeoutRef.current = setTimeout(() => {
      // Skip if already prewarmed in this session
      if (isPrewarmedRef.current) return;

      aiApi.prewarm(options || {}).then(() => {
        isPrewarmedRef.current = true;
      }).catch(() => {
        // Silent fail
      });
    }, 200);
  }, []);

  const resetPrewarm = useCallback(() => {
    // Reset prewarm state when student navigates away
    isPrewarmedRef.current = false;
    if (prewarmTimeoutRef.current) {
      clearTimeout(prewarmTimeoutRef.current);
    }
  }, []);

  return { prewarm, resetPrewarm };
}
