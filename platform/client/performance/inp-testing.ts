/**
 * INP (Interaction to Next Paint) Testing Utilities
 * Measures responsiveness of interactive elements
 */

export interface INPMetric {
  interactionType: string;
  duration: number;
  timestamp: number;
  element?: string;
}

export interface INPResult {
  inp: number;          // Worst interaction duration
  interactions: INPMetric[];
  rating: 'good' | 'needs-improvement' | 'poor';
}

/**
 * INP Success thresholds
 */
export const INP_THRESHOLDS = {
  good: 200,           // ms
  needsImprovement: 500, // ms
};

export function rateINP(inp: number): 'good' | 'needs-improvement' | 'poor' {
  if (inp <= INP_THRESHOLDS.good) return 'good';
  if (inp <= INP_THRESHOLDS.needsImprovement) return 'needs-improvement';
  return 'poor';
}

/**
 * INP Collector - measures all interactions on the page
 */
export class INPCollector {
  private interactions: INPMetric[] = [];
  private observer: PerformanceObserver | null = null;

  start(): void {
    if (typeof window === 'undefined') return;

    this.observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.interactionId && entry.duration > 0) {
          this.interactions.push({
            interactionType: entry.name,
            duration: entry.duration,
            timestamp: entry.startTime,
            element: (entry.target as Element)?.tagName?.toLowerCase(),
          });
        }
      }
    });

    this.observer.observe({ entryTypes: ['event'] });
  }

  stop(): INPResult {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }

    return this.getINPResult();
  }

  getINPResult(): INPResult {
    const worst = this.interactions.reduce(
      (max, i) => (i.duration > max.duration ? i : max),
      { duration: 0, interactionType: '', timestamp: 0 }
    );

    return {
      inp: worst.duration,
      interactions: [...this.interactions],
      rating: rateINP(worst.duration),
    };
  }

  getInteractions(): INPMetric[] {
    return [...this.interactions];
  }
}

/**
 * Measure a specific interaction
 */
export async function measureInteraction(
  element: Element,
  action: 'click' | 'keydown' | 'focus' | 'blur'
): Promise<number> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') {
      resolve(0);
      return;
    }

    const start = performance.now();

    const handler = () => {
      const duration = performance.now() - start;
      element.removeEventListener(action, handler);
      resolve(duration);
    };

    element.addEventListener(action, handler, { once: true });

    // Fallback timeout
    setTimeout(() => {
      element.removeEventListener(action, handler);
      resolve(performance.now() - start);
    }, 5000);
  });
}

/**
 * Test specific interactive elements for INP
 */
export interface InteractiveElementTest {
  selector: string;
  action: 'click' | 'keydown' | 'focus';
  maxDuration: number;
}

export async function testInteractiveElements(
  tests: InteractiveElementTest[]
): Promise<{ passed: boolean; results: { selector: string; passed: boolean; duration: number }[] }> {
  if (typeof window === 'undefined') {
    return { passed: false, results: [] };
  }

  const results: { selector: string; passed: boolean; duration: number }[] = [];

  for (const test of tests) {
    const element = document.querySelector(test.selector);
    if (!element) {
      results.push({ selector: test.selector, passed: false, duration: 0 });
      continue;
    }

    const duration = await measureInteraction(element, test.action);
    results.push({
      selector: test.selector,
      passed: duration <= test.maxDuration,
      duration,
    });
  }

  const allPassed = results.every((r) => r.passed);

  return { passed: allPassed, results };
}

/**
 * Generate INP report
 */
export function generateINPReport(result: INPResult): string {
  return `
========================================
INP (Interaction to Next Paint) Report
========================================
Worst Interaction: ${result.inp.toFixed(0)}ms
Rating: ${result.rating.toUpperCase()}

All Interactions (${result.interactions.length}):
${result.interactions
  .sort((a, b) => b.duration - a.duration)
  .slice(0, 10)
  .map(
    (i) =>
      `  ${i.interactionType}: ${i.duration.toFixed(0)}ms ${i.element ? `(${i.element})` : ''}`
  )
  .join('\n')}

Status: ${result.rating === 'good' ? 'PASS' : result.rating === 'needs-improvement' ? 'WARNING' : 'FAIL'}
========================================
`;
}