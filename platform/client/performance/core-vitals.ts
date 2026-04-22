/**
 * Core Web Vitals (CWV) Metrics Collector
 * Tracks LCP, INP, CLS for RoboKids platform
 */

export interface CoreVitalsMetrics {
  lcp: number | null;  // Largest Contentful Paint (ms)
  inp: number | null;  // Interaction to Next Paint (ms)
  cls: number | null;  // Cumulative Layout Shift
  fcp: number | null;  // First Contentful Paint (ms)
  ttfb: number | null; // Time to First Byte (ms)
  timestamp: number;
}

// Success thresholds (Google Core Web Vitals)
export const CWV_THRESHOLDS = {
  lcp: { good: 2500, needsImprovement: 4000 },      // ms
  inp: { good: 200, needsImprovement: 500 },       // ms
  cls: { good: 0.1, needsImprovement: 0.25 },        // score
  fcp: { good: 1800, needsImprovement: 3000 },       // ms
  ttfb: { good: 800, needsImprovement: 1800 },       // ms
};

export type CWVRating = 'good' | 'needs-improvement' | 'poor';

export function rateMetric(value: number | null, thresholds: { good: number; needsImprovement: number }): CWVRating {
  if (value === null) return 'poor';
  if (value <= thresholds.good) return 'good';
  if (value <= thresholds.needsImprovement) return 'needs-improvement';
  return 'poor';
}

export function rateLCP(lcp: number | null): CWVRating {
  return rateMetric(lcp, CWV_THRESHOLDS.lcp);
}

export function rateINP(inp: number | null): CWVRating {
  return rateMetric(inp, CWV_THRESHOLDS.inp);
}

export function rateCLS(cls: number | null): CWVRating {
  return rateMetric(cls, CWV_THRESHOLDS.cls);
}

export function rateFCP(fcp: number | null): CWVRating {
  return rateMetric(fcp, CWV_THRESHOLDS.fcp);
}

/**
 * Collect Core Web Vitals using web-vitals library pattern
 * Can be used with Playwright or in-browser
 */
export class CoreVitalsCollector {
  private metrics: CoreVitalsMetrics = {
    lcp: null,
    inp: null,
    cls: null,
    fcp: null,
    ttfb: null,
    timestamp: Date.now(),
  };

  private observers: PerformanceObserver[] = [];

  /**
   * Start collecting metrics (browser environment)
   */
  start(): void {
    if (typeof window === 'undefined') return;

    // LCP Observer
    try {
      const lcpObserver = new PerformanceObserver((entryList) => {
        const entries = entryList.getEntries();
        const lastEntry = entries[entries.length - 1] as LargestContentfulPaint;
        this.metrics.lcp = lastEntry.startTime;
      });
      lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
      this.observers.push(lcpObserver);
    } catch { /* LCP not supported */ }

    // CLS Observer
    try {
      let clsValue = 0;
      const clsObserver = new PerformanceObserver((entryList) => {
        for (const entry of entryList.getEntries()) {
          if ('hadRecentInput' in entry && !(entry as any).hadRecentInput) {
            clsValue += (entry as any).value;
          }
        }
        this.metrics.cls = clsValue;
      });
      clsObserver.observe({ entryTypes: ['layout-shift'] });
      this.observers.push(clsObserver);
    } catch { /* CLS not supported */ }

    // FCP Observer
    try {
      const fcpObserver = new PerformanceObserver((entryList) => {
        const entries = entryList.getEntries();
        const fcpEntry = entries.find(e => e.name === 'first-contentful-paint');
        if (fcpEntry) {
          this.metrics.fcp = fcpEntry.startTime;
        }
      });
      fcpObserver.observe({ entryTypes: ['paint'] });
      this.observers.push(fcpObserver);
    } catch { /* FCP not supported */ }

    // TTFB
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    if (navigation) {
      this.metrics.ttfb = navigation.responseStart;
    }
  }

  /**
   * Measure INP (Interaction to Next Paint)
   * Call this on user interactions
   */
  measureInteraction(name: string, callback: () => void): void {
    if (typeof window === 'undefined') {
      callback();
      return;
    }

    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.interactionId) {
          // INP is the max interaction duration
          const duration = entry.duration;
          if (this.metrics.inp === null || duration > this.metrics.inp) {
            this.metrics.inp = duration;
          }
        }
      }
    });

    observer.observe({ entryTypes: ['event'] });
    this.observers.push(observer);

    callback();
  }

  /**
   * Stop collecting and return metrics
   */
  stop(): CoreVitalsMetrics {
    this.observers.forEach(o => o.disconnect());
    this.observers = [];
    this.metrics.timestamp = Date.now();
    return { ...this.metrics };
  }

  getMetrics(): CoreVitalsMetrics {
    return { ...this.metrics };
  }

  /**
   * Generate a report string
   */
  generateReport(): string {
    const m = this.metrics;
    return `
========================================
Core Web Vitals Report
========================================
LCP (Largest Contentful Paint)
  Value: ${m.lcp !== null ? `${m.lcp.toFixed(0)}ms` : 'N/A'}
  Rating: ${rateLCP(m.lcp)}

INP (Interaction to Next Paint)
  Value: ${m.inp !== null ? `${m.inp.toFixed(0)}ms` : 'N/A'}
  Rating: ${rateINP(m.inp)}

CLS (Cumulative Layout Shift)
  Value: ${m.cls !== null ? m.cls.toFixed(3) : 'N/A'}
  Rating: ${rateCLS(m.cls)}

FCP (First Contentful Paint)
  Value: ${m.fcp !== null ? `${m.fcp.toFixed(0)}ms` : 'N/A'}
  Rating: ${rateFCP(m.fcp)}

TTFB (Time to First Byte)
  Value: ${m.ttfb !== null ? `${m.ttfb.toFixed(0)}ms` : 'N/A'}

Overall: ${this.getOverallRating()}
========================================
`;
  }

  getOverallRating(): CWVRating {
    const lcp = rateLCP(this.metrics.lcp);
    const inp = rateINP(this.metrics.inp);
    const cls = rateCLS(this.metrics.cls);

    // If any metric is poor, overall is poor
    if (lcp === 'poor' || inp === 'poor' || cls === 'poor') return 'poor';
    // If any needs improvement, overall is needs-improvement
    if (lcp === 'needs-improvement' || inp === 'needs-improvement' || cls === 'needs-improvement') {
      return 'needs-improvement';
    }
    return 'good';
  }
}

// Export singleton for global use
export const vitalsCollector = typeof window !== 'undefined' ? new CoreVitalsCollector() : null;