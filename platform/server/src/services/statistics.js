/**
 * Statistical Significance Service for A/B Testing
 * Parent: ROB-249 A/B Testing Framework
 */

/**
 * Calculate z-score for two-proportion z-test
 */
function calculateZScore(controlRate, treatmentRate, n1, n2) {
  if (n1 === 0 || n2 === 0) return 0;
  const pooledRate = (controlRate * n1 + treatmentRate * n2) / (n1 + n2);
  if (pooledRate === 0 || pooledRate === 1) return 0;
  const se = Math.sqrt(pooledRate * (1 - pooledRate) * (1/n1 + 1/n2));
  if (se === 0) return 0;
  return (treatmentRate - controlRate) / se;
}

/**
 * Approximate p-value from z-score using normal distribution
 */
function zScoreToPValue(z) {
  // Approximation of cumulative distribution function
  const absZ = Math.abs(z);
  const t = 1 / (1 + 0.2316419 * absZ);
  const d = 0.3989423 * Math.exp(-absZ * absZ / 2);
  const p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  return absZ > 0 ? 2 * p : 1;
}

/**
 * Calculate confidence interval for a proportion
 */
function calculateConfidenceInterval(p, n, confidenceLevel = 0.95) {
  if (n === 0) return { lower: 0, upper: 0 };
  const z = confidenceLevel === 0.95 ? 1.96 : 1.645; // 95% or 90%
  const se = Math.sqrt(p * (1 - p) / n);
  return {
    lower: Math.max(0, p - z * se),
    upper: Math.min(1, p + z * se)
  };
}

/**
 * Calculate mean and variance for a metric
 */
function calculateMeanAndVariance(values) {
  if (!values || values.length === 0) return { mean: 0, variance: 0, stdDev: 0 };
  const n = values.length;
  const mean = values.reduce((a, b) => a + b, 0) / n;
  const variance = values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / (n - 1 || 1);
  return { mean, variance, stdDev: Math.sqrt(variance) };
}

/**
 * Two-sample t-test for comparing means
 */
function tTest(sample1, sample2) {
  const stats1 = calculateMeanAndVariance(sample1);
  const stats2 = calculateMeanAndVariance(sample2);
  const n1 = sample1.length;
  const n2 = sample2.length;

  if (n1 < 2 || n2 < 2) return { tStatistic: 0, pValue: 1 };

  const se = Math.sqrt(stats1.variance / n1 + stats2.variance / n2);
  if (se === 0) return { tStatistic: 0, pValue: 1 };

  const tStatistic = (stats2.mean - stats1.mean) / se;
  // Welch-Satterthwaite degrees of freedom approximation
  const v1 = stats1.variance / n1;
  const v2 = stats2.variance / n2;
  const df = Math.pow(v1 + v2, 2) / (Math.pow(v1, 2) / (n1 - 1) + Math.pow(v2, 2) / (n2 - 1));

  // Convert t to approximate p-value
  const pValue = tDistToPValue(Math.abs(tStatistic), df);
  return { tStatistic, pValue, df };
}

/**
 * Approximate t-distribution p-value
 */
function tDistToPValue(t, df) {
  const x = df / (df + t * t);
  let p = betaIncomplete(df / 2, 0.5, x);
  return p;
}

/**
 * Incomplete beta function approximation
 */
function betaIncomplete(a, b, x) {
  if (x === 0) return 0;
  if (x === 1) return 1;
  if (x < 0 || x > 1) return 0;

  const bt = Math.exp(
    lgamma(a + b) - lgamma(a) - lgamma(b) +
    a * Math.log(x) + b * Math.log(1 - x)
  );

  if (x < (a + 1) / (a + b + 2)) {
    return bt * betaCF(a, b, x) / a;
  }
  return 1 - bt * betaCF(b, a, 1 - x) / b;
}

/**
 * Continued fraction for beta function
 */
function betaCF(a, b, x) {
  const maxIterations = 100;
  const epsilon = 1e-10;
  const qab = a + b;
  const qap = a + 1;
  const qam = a - 1;
  let c = 1;
  let d = 1 - qab * x / qap;
  if (Math.abs(d) < epsilon) d = epsilon;
  d = 1 / d;
  let h = d;

  for (let m = 1; m <= maxIterations; m++) {
    const m2 = 2 * m;
    let aa = m * (b - m) * x / ((qam + m2) * (a + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < epsilon) d = epsilon;
    c = 1 + aa / c;
    if (Math.abs(c) < epsilon) c = epsilon;
    d = 1 / d;
    h *= d * c;
    aa = -(a + m) * (qab + m) * x / ((a + m2) * (qap + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < epsilon) d = epsilon;
    c = 1 + aa / c;
    if (Math.abs(c) < epsilon) c = epsilon;
    d = 1 / d;
    const del = d * c;
    h *= del;
    if (Math.abs(del - 1) < epsilon) break;
  }
  return h;
}

/**
 * Log gamma function approximation
 */
function lgamma(x) {
  const cof = [
    76.18009172947146, -86.50532032941677, 24.01409824083091,
    -1.231739572450155, 0.1208650973866179e-2, -0.5395239384953e-5
  ];
  let y = x;
  let tmp = x + 5.5;
  tmp -= (x + 0.5) * Math.log(tmp);
  let ser = 1.000000000190015;
  for (let j = 0; j < 6; j++) {
    ser += cof[j] / ++y;
  }
  return -tmp + Math.log(2.5066282746310005 * ser / x);
}

/**
 * Calculate minimum sample size needed per variant
 */
function calculateMinSampleSize(baselineRate, minimumDetectableEffect, confidenceLevel = 0.95, power = 0.8) {
  const zAlpha = confidenceLevel === 0.95 ? 1.96 : 1.645;
  const zBeta = power === 0.8 ? 0.84 : 0.52;
  const p1 = baselineRate;
  const p2 = p1 * (1 + minimumDetectableEffect);
  const pBar = (p1 + p2) / 2;
  const n = Math.ceil(
    2 * Math.pow(zAlpha * Math.sqrt(2 * pBar * (1 - pBar)) + zBeta * Math.sqrt(p1 * (1 - p1) + p2 * (1 - p2)), 2) /
    Math.pow(p2 - p1, 2)
  );
  return n;
}

/**
 * Analyze experiment results and return statistical significance
 */
export function analyzeExperimentResults(metricsByVariant) {
  const results = {};
  const variantIds = Object.keys(metricsByVariant);

  if (variantIds.length < 2) {
    return { error: 'Need at least 2 variants to compare' };
  }

  // First variant is control
  const controlId = variantIds[0];
  const controlMetrics = metricsByVariant[controlId];

  for (let i = 1; i < variantIds.length; i++) {
    const variantId = variantIds[i];
    const treatmentMetrics = metricsByVariant[variantId];

    // Group by metric name
    const metricNames = new Set([
      ...controlMetrics.map(m => m.metric_name),
      ...treatmentMetrics.map(m => m.metric_name)
    ]);

    const metricResults = {};

    for (const metricName of metricNames) {
      const controlValues = controlMetrics
        .filter(m => m.metric_name === metricName)
        .map(m => parseFloat(m.metric_value));

      const treatmentValues = treatmentMetrics
        .filter(m => m.metric_name === metricName)
        .map(m => parseFloat(m.metric_value));

      if (controlValues.length === 0 || treatmentValues.length === 0) {
        metricResults[metricName] = { error: 'Insufficient data' };
        continue;
      }

      // Determine if metric is conversion (binary) or continuous
      const isBinary = controlValues.every(v => v === 0 || v === 1) &&
                       treatmentValues.every(v => v === 0 || v === 1);

      let testResult;
      if (isBinary) {
        const controlRate = controlValues.reduce((a, b) => a + b, 0) / controlValues.length;
        const treatmentRate = treatmentValues.reduce((a, b) => a + b, 0) / treatmentValues.length;
        const z = calculateZScore(controlRate, treatmentRate, controlValues.length, treatmentValues.length);
        const pValue = zScoreToPValue(z);
        const ci = calculateConfidenceInterval(treatmentRate - controlRate, controlValues.length + treatmentValues.length);

        testResult = {
          type: 'two-proportion-z-test',
          controlRate,
          treatmentRate,
          relativeLift: controlRate > 0 ? (treatmentRate - controlRate) / controlRate : 0,
          zScore: z,
          pValue,
          significant: pValue < 0.05,
          confidenceInterval: ci,
          controlSampleSize: controlValues.length,
          treatmentSampleSize: treatmentValues.length
        };
      } else {
        const { tStatistic, pValue } = tTest(controlValues, treatmentValues);
        const controlMean = calculateMeanAndVariance(controlValues);
        const treatmentMean = calculateMeanAndVariance(treatmentValues);

        testResult = {
          type: 'welch-t-test',
          controlMean: controlMean.mean,
          treatmentMean: treatmentMean.mean,
          controlStdDev: controlMean.stdDev,
          treatmentStdDev: treatmentMean.stdDev,
          relativeLift: controlMean.mean !== 0 ? (treatmentMean.mean - controlMean.mean) / controlMean.mean : 0,
          tStatistic,
          pValue,
          significant: pValue < 0.05,
          controlSampleSize: controlValues.length,
          treatmentSampleSize: treatmentValues.length
        };
      }

      metricResults[metricName] = testResult;
    }

    results[variantId] = {
      variantId,
      comparisonToControl: controlId,
      metrics: metricResults,
      sampleSize: treatmentMetrics.length
    };
  }

  return {
    controlVariantId: controlId,
    controlSampleSize: controlMetrics.length,
    variants: results,
    summary: {
      totalSamples: Object.values(metricsByVariant).reduce((sum, arr) => sum + arr.length, 0),
      analyzedVariants: variantIds.length - 1
    }
  };
}

export { calculateMinSampleSize, calculateMeanAndVariance };
export default {
  analyzeExperimentResults,
  calculateMinSampleSize,
  calculateMeanAndVariance
};
