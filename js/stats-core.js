/**
 * ResampleLab — Core Statistical Functions, Sampling Operations, and Estimator Registry
 *
 * Implements numerically stable descriptive statistics (two-pass centered sum
 * of squares, Hyndman-Fan Type 7 quantiles, trimmed mean, MAD, skewness,
 * kurtosis, OLS regression, ANOVA, contingency chi-square), sampling algorithms
 * (with/without replacement, weighted, stratified, cluster, paired-record,
 * restricted within-block randomization), and the typed Statistical Function Registry.
 *
 * @module stats-core
 * @version 1.0.0
 */

const EPSILON = 1e-12;

/**
 * Filters an array to finite numbers and reports missing/invalid count.
 * @param {Array} arr
 * @returns {{ values: number[], missingCount: number, totalCount: number }}
 */
export function cleanNumericArray(arr) {
  if (!Array.isArray(arr)) return { values: [], missingCount: 0, totalCount: 0 };
  const values = [];
  let missingCount = 0;
  for (let i = 0; i < arr.length; i++) {
    const v = arr[i];
    if (v === null || v === undefined || v === "" || Number.isNaN(Number(v))) {
      missingCount++;
    } else {
      const num = Number(v);
      if (Number.isFinite(num)) {
        values.push(num);
      } else {
        missingCount++;
      }
    }
  }
  return { values, missingCount, totalCount: arr.length };
}

/**
 * Arithmetic mean.
 * @param {number[]} x
 * @returns {number}
 */
export function mean(x) {
  const n = x.length;
  if (n === 0) return NaN;
  let sum = 0;
  for (let i = 0; i < n; i++) sum += x[i];
  return sum / n;
}

/**
 * Weighted arithmetic mean.
 * @param {number[]} x
 * @param {number[]} weights
 * @returns {number}
 */
export function weightedMean(x, weights) {
  const n = Math.min(x.length, weights.length);
  if (n === 0) return NaN;
  let wSum = 0;
  let wxSum = 0;
  for (let i = 0; i < n; i++) {
    const w = weights[i];
    if (w < 0 || !Number.isFinite(w)) return NaN;
    wSum += w;
    wxSum += w * x[i];
  }
  return wSum > 0 ? wxSum / wSum : NaN;
}

/**
 * Hyndman-Fan Type 7 sample quantile on a pre-sorted ascending array.
 * Matches R default `quantile(..., type=7)` and STATISTICAL_STANDARDS.md Section B.2.
 * @param {number[]} sorted
 * @param {number} q Probability in [0, 1]
 * @returns {number}
 */
export function quantileSorted(sorted, q) {
  const n = sorted.length;
  if (n === 0 || Number.isNaN(q) || q < 0 || q > 1) return NaN;
  if (n === 1) return sorted[0];
  if (q <= 0) return sorted[0];
  if (q >= 1) return sorted[n - 1];
  const k = (n - 1) * q + 1;
  const j = Math.floor(k);
  const gamma = k - j;
  const idx = j - 1;
  if (idx + 1 >= n) return sorted[n - 1];
  return (1 - gamma) * sorted[idx] + gamma * sorted[idx + 1];
}

/**
 * Sample quantile (sorts a copy first).
 * @param {number[]} x
 * @param {number} q
 * @returns {number}
 */
export function quantile(x, q) {
  if (x.length === 0) return NaN;
  const sorted = x.slice().sort((a, b) => a - b);
  return quantileSorted(sorted, q);
}

/**
 * Sample median.
 * @param {number[]} x
 * @returns {number}
 */
export function median(x) {
  return quantile(x, 0.5);
}

/**
 * Symmetric alpha-trimmed mean (e.g., trimProp = 0.10 trims 10% from each tail).
 * @param {number[]} x
 * @param {number} trimProp Proportion in [0, 0.45]
 * @returns {number}
 */
export function trimmedMean(x, trimProp = 0.1) {
  const n = x.length;
  if (n === 0) return NaN;
  const g = Math.min(Math.floor((n - 1) / 2), Math.max(0, Math.floor(n * trimProp)));
  const sorted = x.slice().sort((a, b) => a - b);
  let sum = 0;
  let count = 0;
  for (let i = g; i < n - g; i++) {
    sum += sorted[i];
    count++;
  }
  return count > 0 ? sum / count : NaN;
}

/**
 * Two-pass centered sample variance (with Bessel's correction n - 1 by default).
 * Avoids catastrophic cancellation per STATISTICAL_STANDARDS.md Section L.1.
 * @param {number[]} x
 * @param {boolean} isPopulation If true, divides by N instead of n - 1
 * @returns {number}
 */
export function variance(x, isPopulation = false) {
  const n = x.length;
  if (isPopulation ? n < 1 : n < 2) return NaN;
  const mu = mean(x);
  let ss = 0;
  for (let i = 0; i < n; i++) {
    const d = x[i] - mu;
    ss += d * d;
  }
  return ss / (isPopulation ? n : n - 1);
}

/**
 * Sample standard deviation s.
 * @param {number[]} x
 * @param {boolean} isPopulation
 * @returns {number}
 */
export function standardDeviation(x, isPopulation = false) {
  return Math.sqrt(variance(x, isPopulation));
}

/**
 * Interquartile range IQR = Q3 - Q1 (Type 7 quartiles).
 * @param {number[]} x
 * @returns {number}
 */
export function iqr(x) {
  if (x.length === 0) return NaN;
  const sorted = x.slice().sort((a, b) => a - b);
  return quantileSorted(sorted, 0.75) - quantileSorted(sorted, 0.25);
}

/**
 * Median Absolute Deviation (MAD) and normal-consistent MAD_sigma.
 * @param {number[]} x
 * @returns {{ mad: number, madSigma: number }}
 */
export function computeMAD(x) {
  if (x.length === 0) return { mad: NaN, madSigma: NaN };
  const med = median(x);
  const absDevs = x.map((v) => Math.abs(v - med));
  const madVal = median(absDevs);
  return { mad: madVal, madSigma: 1.482602218505602 * madVal };
}

/**
 * Computes comprehensive univariate descriptive summary.
 * @param {number[]} x
 * @returns {object}
 */
export function summarizeUnivariate(x) {
  const n = x.length;
  if (n === 0) {
    return { valid: false, n: 0, reason: "Dataset contains 0 valid numeric observations." };
  }
  const sorted = x.slice().sort((a, b) => a - b);
  const mu = mean(x);
  let m2 = 0;
  let m3 = 0;
  let m4 = 0;
  for (let i = 0; i < n; i++) {
    const d = x[i] - mu;
    const d2 = d * d;
    m2 += d2;
    m3 += d2 * d;
    m4 += d2 * d2;
  }
  const s2 = n > 1 ? m2 / (n - 1) : NaN;
  const s = n > 1 ? Math.sqrt(s2) : NaN;
  const popVar = m2 / n;
  const popSD = Math.sqrt(popVar);
  const seMean = n > 1 ? s / Math.sqrt(n) : NaN;

  const g1 = (n >= 3 && popSD > EPSILON) ? (m3 / n) / Math.pow(popVar, 1.5) : 0;
  const skewness = n >= 3 ? (Math.sqrt(n * (n - 1)) / (n - 2)) * g1 : 0;
  const excessKurtosis = (n >= 4 && popSD > EPSILON) ? (m4 / n) / (popVar * popVar) - 3 : 0;

  const q1 = quantileSorted(sorted, 0.25);
  const med = quantileSorted(sorted, 0.50);
  const q3 = quantileSorted(sorted, 0.75);
  const iqrVal = q3 - q1;
  const { mad, madSigma } = computeMAD(sorted);

  const lowerFence = q1 - 1.5 * iqrVal;
  const upperFence = q3 + 1.5 * iqrVal;
  const outliers = sorted.filter((v) => v < lowerFence || v > upperFence);

  return {
    valid: true,
    n,
    min: sorted[0],
    max: sorted[n - 1],
    mean: mu,
    median: med,
    trimmedMean10: trimmedMean(sorted, 0.1),
    variance: s2,
    sd: s,
    popVariance: popVar,
    popSD,
    seMean,
    q1,
    q3,
    iqr: iqrVal,
    mad,
    madSigma,
    skewness,
    excessKurtosis,
    outliersCount: outliers.length,
    isConstant: popSD <= EPSILON
  };
}

/**
 * Sample proportion of binary successes (1 or true or matching target category).
 * @param {Array} x
 * @param {*} successValue Optional target category; if omitted, treats 1 / "1" / true as success
 * @returns {number}
 */
export function proportion(x, successValue = undefined) {
  if (!Array.isArray(x) || x.length === 0) return NaN;
  let k = 0;
  for (let i = 0; i < x.length; i++) {
    const v = x[i];
    if (successValue !== undefined) {
      if (String(v).trim() === String(successValue).trim()) k++;
    } else if (v === 1 || v === true || v === "1" || String(v).toLowerCase() === "yes" || String(v).toLowerCase() === "true") {
      k++;
    }
  }
  return k / x.length;
}

/**
 * Cohen's d standardized mean difference for two independent groups (pooled SD).
 * @param {number[]} group1
 * @param {number[]} group2
 * @returns {number}
 */
export function cohensD(group1, group2) {
  const n1 = group1.length;
  const n2 = group2.length;
  if (n1 < 2 || n2 < 2) return NaN;
  const m1 = mean(group1);
  const m2 = mean(group2);
  const v1 = variance(group1);
  const v2 = variance(group2);
  const sPooled = Math.sqrt(((n1 - 1) * v1 + (n2 - 1) * v2) / (n1 + n2 - 2));
  if (sPooled <= EPSILON) return NaN;
  return (m1 - m2) / sPooled;
}

/**
 * Bivariate statistics: Pearson r, Spearman rho_s, OLS slope beta_1, intercept beta_0, R^2.
 * @param {number[]} x
 * @param {number[]} y
 * @returns {object}
 */
export function computeBivariateStats(x, y) {
  const n = Math.min(x.length, y.length);
  if (n < 3) {
    return { valid: false, n, reason: "At least 3 paired observations are required for bivariate analysis." };
  }
  const mx = mean(x);
  const my = mean(y);
  let ssxx = 0;
  let ssyy = 0;
  let ssxy = 0;
  for (let i = 0; i < n; i++) {
    const dx = x[i] - mx;
    const dy = y[i] - my;
    ssxx += dx * dx;
    ssyy += dy * dy;
    ssxy += dx * dy;
  }
  if (ssxx <= EPSILON || ssyy <= EPSILON) {
    return {
      valid: false,
      n,
      meanX: mx,
      meanY: my,
      reason: "Zero variance in X or Y prevents correlation and regression calculation."
    };
  }
  const sx = Math.sqrt(ssxx / (n - 1));
  const sy = Math.sqrt(ssyy / (n - 1));
  const r = Math.max(-1, Math.min(1, ssxy / Math.sqrt(ssxx * ssyy)));
  const r2 = r * r;
  const slope = ssxy / ssxx;
  const intercept = my - slope * mx;

  let sse = 0;
  const residuals = [];
  const fitted = [];
  for (let i = 0; i < n; i++) {
    const yh = intercept + slope * x[i];
    const e = y[i] - yh;
    fitted.push(yh);
    residuals.push(e);
    sse += e * e;
  }
  const seResid = n > 2 ? Math.sqrt(sse / (n - 2)) : NaN;
  const seSlope = seResid / Math.sqrt(ssxx);
  const seIntercept = seResid * Math.sqrt(1 / n + (mx * mx) / ssxx);

  return {
    valid: true,
    n,
    meanX: mx,
    meanY: my,
    sx,
    sy,
    ssxx,
    ssyy,
    ssxy,
    r,
    r2,
    slope,
    intercept,
    sse,
    seResid,
    seSlope,
    seIntercept,
    fitted,
    residuals
  };
}

/**
 * Spearman rank correlation rho_s with fractional average tie ranks.
 * @param {number[]} x
 * @param {number[]} y
 * @returns {number}
 */
export function spearmanCorrelation(x, y) {
  const n = Math.min(x.length, y.length);
  if (n < 3) return NaN;
  const rankVector = (arr) => {
    const indexed = arr.slice(0, n).map((v, idx) => ({ v, idx })).sort((a, b) => a.v - b.v);
    const ranks = new Array(n);
    let i = 0;
    while (i < n) {
      let j = i;
      while (j + 1 < n && indexed[j + 1].v === indexed[i].v) j++;
      const avgRank = 0.5 * (i + j) + 1;
      for (let k = i; k <= j; k++) ranks[indexed[k].idx] = avgRank;
      i = j + 1;
    }
    return ranks;
  };
  const rx = rankVector(x);
  const ry = rankVector(y);
  const biv = computeBivariateStats(rx, ry);
  return biv.valid ? biv.r : NaN;
}

/**
 * One-Way ANOVA F-statistic for k >= 2 groups.
 * @param {number[][]} groups Array of numeric arrays
 * @returns {object}
 */
export function computeOneWayAnova(groups) {
  const validGroups = groups.filter((g) => Array.isArray(g) && g.length >= 2);
  const k = validGroups.length;
  if (k < 2) {
    return { valid: false, reason: "One-way ANOVA requires at least 2 groups with at least 2 observations each." };
  }
  let N = 0;
  let grandSum = 0;
  for (const g of validGroups) {
    N += g.length;
    for (const v of g) grandSum += v;
  }
  const grandMean = grandSum / N;
  let ssb = 0;
  let ssw = 0;
  const groupSummaries = [];
  for (let i = 0; i < k; i++) {
    const g = validGroups[i];
    const ni = g.length;
    const mi = mean(g);
    ssb += ni * Math.pow(mi - grandMean, 2);
    let ssi = 0;
    for (const v of g) {
      const d = v - mi;
      ssi += d * d;
    }
    ssw += ssi;
    groupSummaries.push({ n: ni, mean: mi, sd: Math.sqrt(ssi / (ni - 1)) });
  }
  const dfBetween = k - 1;
  const dfWithin = N - k;
  if (dfWithin <= 0) return { valid: false, reason: "Insufficient degrees of freedom within groups." };
  const msb = ssb / dfBetween;
  const msw = ssw / dfWithin;
  const fStat = msw > EPSILON ? msb / msw : (ssb > EPSILON ? Infinity : 0);
  const etaSquared = (ssb + ssw) > EPSILON ? ssb / (ssb + ssw) : 0;

  return {
    valid: true,
    k,
    N,
    grandMean,
    ssb,
    ssw,
    sst: ssb + ssw,
    dfBetween,
    dfWithin,
    msb,
    msw,
    fStat,
    etaSquared,
    groupSummaries
  };
}

/**
 * Contingency table Chi-Square statistic and Cramer's V for categorical association.
 * @param {number[][]} table 2D matrix of observed counts (R x C)
 * @returns {object}
 */
export function computeContingencyChiSquare(table) {
  const R = table.length;
  if (R < 2) return { valid: false, reason: "Contingency table needs at least 2 rows." };
  const C = table[0].length;
  if (C < 2) return { valid: false, reason: "Contingency table needs at least 2 columns." };

  const rowTotals = new Array(R).fill(0);
  const colTotals = new Array(C).fill(0);
  let N = 0;

  for (let r = 0; r < R; r++) {
    for (let c = 0; c < C; c++) {
      const count = Math.max(0, Math.round(Number(table[r][c]) || 0));
      rowTotals[r] += count;
      colTotals[c] += count;
      N += count;
    }
  }
  if (N === 0) return { valid: false, reason: "Contingency table total count is 0." };

  let chiSq = 0;
  let minExpected = Infinity;
  const expected = [];
  for (let r = 0; r < R; r++) {
    const expRow = [];
    for (let c = 0; c < C; c++) {
      const exp = (rowTotals[r] * colTotals[c]) / N;
      expRow.push(exp);
      if (exp < minExpected) minExpected = exp;
      if (exp > 0) {
        const diff = table[r][c] - exp;
        chiSq += (diff * diff) / exp;
      }
    }
    expected.push(expRow);
  }
  const df = (R - 1) * (C - 1);
  const cramersV = Math.sqrt(chiSq / (N * Math.min(R - 1, C - 1)));

  return {
    valid: true,
    R,
    C,
    N,
    df,
    chiSq,
    cramersV,
    minExpected,
    lowExpectedWarning: minExpected < 5,
    expected,
    rowTotals,
    colTotals
  };
}

// ============================================================================
// SAMPLING OPERATIONS (Part 6.2 & Part 8.3)
// ============================================================================

/**
 * Simple random sampling WITH replacement (SRSWR / iid empirical draw).
 * @template T
 * @param {T[]} population
 * @param {number} n Sample size
 * @param {object} prng
 * @returns {T[]}
 */
export function sampleWithReplacement(population, n, prng) {
  const N = population.length;
  if (N === 0 || n <= 0) return [];
  const out = new Array(n);
  for (let i = 0; i < n; i++) {
    out[i] = population[prng.nextInt(0, N - 1)];
  }
  return out;
}

/**
 * Simple random sampling WITHOUT replacement (SRSWOR) from a finite population.
 * Uses partial Fisher-Yates selection in O(n) steps.
 * @template T
 * @param {T[]} population
 * @param {number} n Sample size (must satisfy n <= N)
 * @param {object} prng
 * @returns {T[]}
 */
export function sampleWithoutReplacement(population, n, prng) {
  const N = population.length;
  if (N === 0 || n <= 0) return [];
  if (n > N) {
    throw new Error(`Cannot sample n=${n} without replacement from finite population of size N=${N}.`);
  }
  const copy = population.slice();
  const out = new Array(n);
  for (let i = 0; i < n; i++) {
    const j = i + Math.floor(prng.nextFloat() * (N - i));
    out[i] = copy[j];
    copy[j] = copy[i];
  }
  return out;
}

/**
 * Weighted random sampling with replacement using cumulative weight binary search.
 * @template T
 * @param {T[]} items
 * @param {number[]} weights
 * @param {number} n
 * @param {object} prng
 * @returns {T[]}
 */
export function sampleWeightedWithReplacement(items, weights, n, prng) {
  const len = Math.min(items.length, weights.length);
  if (len === 0 || n <= 0) return [];
  const cdf = new Array(len);
  let total = 0;
  for (let i = 0; i < len; i++) {
    total += Math.max(0, Number(weights[i]) || 0);
    cdf[i] = total;
  }
  if (total <= 0) return sampleWithReplacement(items, n, prng);

  const out = new Array(n);
  for (let k = 0; k < n; k++) {
    const u = prng.nextFloat() * total;
    let lo = 0;
    let hi = len - 1;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (cdf[mid] < u) lo = mid + 1;
      else hi = mid;
    }
    out[k] = items[lo];
  }
  return out;
}

/**
 * Stratified random sampling (proportional allocation across strata).
 * @param {Array<{value: number, stratum: string}>} populationRecords
 * @param {number} n Total sample size
 * @param {boolean} withReplacement
 * @param {object} prng
 * @returns {Array<{value: number, stratum: string}>}
 */
export function sampleStratified(populationRecords, n, withReplacement, prng) {
  const N = populationRecords.length;
  if (N === 0 || n <= 0) return [];
  const strataMap = new Map();
  for (const rec of populationRecords) {
    const key = String(rec.stratum ?? "default");
    if (!strataMap.has(key)) strataMap.set(key, []);
    strataMap.get(key).push(rec);
  }
  const result = [];
  let remaining = n;
  const entries = Array.from(strataMap.entries());
  for (let i = 0; i < entries.length; i++) {
    const [, items] = entries[i];
    const nh = i === entries.length - 1
      ? Math.max(0, remaining)
      : Math.max(1, Math.round((items.length / N) * n));
    remaining -= nh;
    const count = withReplacement ? nh : Math.min(nh, items.length);
    const drawn = withReplacement
      ? sampleWithReplacement(items, count, prng)
      : sampleWithoutReplacement(items, count, prng);
    result.push(...drawn);
  }
  return result;
}

/**
 * Cluster random sampling: draws `numClusters` primary sampling units (clusters)
 * and includes all observations within the selected clusters.
 * @param {Array<{value: number, cluster: string}>} populationRecords
 * @param {number} numClusters
 * @param {object} prng
 * @returns {Array<{value: number, cluster: string}>}
 */
export function sampleClusters(populationRecords, numClusters, prng) {
  const clusterMap = new Map();
  for (const rec of populationRecords) {
    const key = String(rec.cluster ?? "c1");
    if (!clusterMap.has(key)) clusterMap.set(key, []);
    clusterMap.get(key).push(rec);
  }
  const clusterKeys = Array.from(clusterMap.keys());
  const k = Math.min(clusterKeys.length, Math.max(1, numClusters));
  const chosenClusters = sampleWithoutReplacement(clusterKeys, k, prng);
  const out = [];
  for (const key of chosenClusters) {
    out.push(...clusterMap.get(key));
  }
  return out;
}

/**
 * Restricted within-block randomization: permutes treatment assignments
 * independently within each block b in {1, ..., B} to preserve exact block-level
 * treatment counts (Part 6.2 & Part 10.5).
 * @param {Array<{block: string, group: string, value: number}>} records
 * @param {object} prng
 * @returns {{ g1: number[], g2: number[], groupLabels: string[] }}
 */
export function permuteWithinBlocks(records, prng) {
  const blocks = new Map();
  const groupSet = new Set();
  for (const rec of records) {
    const bKey = String(rec.block ?? "Block_1");
    const gKey = String(rec.group ?? "G1");
    groupSet.add(gKey);
    if (!blocks.has(bKey)) blocks.set(bKey, []);
    blocks.get(bKey).push({ group: gKey, value: Number(rec.value) });
  }
  const labels = Array.from(groupSet);
  const g1Label = labels[0] || "G1";
  const g2Label = labels[1] || "G2";
  const g1 = [];
  const g2 = [];

  for (const [, items] of blocks.entries()) {
    const shuffledGroups = prng.shuffle(items.map((it) => it.group));
    for (let i = 0; i < items.length; i++) {
      if (shuffledGroups[i] === g1Label) g1.push(items[i].value);
      else g2.push(items[i].value);
    }
  }
  return { g1, g2, groupLabels: [g1Label, g2Label] };
}

/**
 * Finite Population Correction (FPC) factor for standard error under SRSWOR:
 * FPC = sqrt((N - n) / (N - 1)).
 * @param {number} n Sample size
 * @param {number} N Finite population size
 * @returns {number}
 */
export function finitePopulationCorrection(n, N) {
  if (!Number.isFinite(N) || N <= 1 || n <= 1) return 1.0;
  if (n >= N) return 0.0;
  return Math.sqrt((N - n) / (N - 1));
}

// ============================================================================
// TYPED STATISTICAL FUNCTION REGISTRY (Part 6.3)
// ============================================================================

export const STATISTIC_REGISTRY = {
  mean: {
    id: "mean",
    name: "Sample Mean",
    symbol: "x̄",
    parameterSymbol: "μ",
    parameterName: "Population Mean (μ)",
    designType: "one_numerical",
    formula: "x̄ = (1/n) ∑ xᵢ",
    minSampleSize: 2,
    supportsBCa: true,
    supportsBootstrapT: true,
    compute(data) {
      return mean(data);
    },
    analyticSE(data) {
      const n = data.length;
      return n > 1 ? standardDeviation(data) / Math.sqrt(n) : NaN;
    },
    description: "Arithmetic average; unbiased estimator of E[X] = μ."
  },

  median: {
    id: "median",
    name: "Sample Median",
    symbol: "x̃",
    parameterSymbol: "M",
    parameterName: "Population Median (M)",
    designType: "one_numerical",
    formula: "median(x₍₁₎, …, x₍ₙ₎)",
    minSampleSize: 3,
    supportsBCa: true,
    supportsBootstrapT: false,
    compute(data) {
      return median(data);
    },
    analyticSE() {
      return NaN; // No simple closed-form SE without density estimation; bootstrap is ideal
    },
    description: "Middle order statistic (50th percentile); resistant to extreme outliers with a 50% breakdown point."
  },

  trimmed_mean: {
    id: "trimmed_mean",
    name: "10% Trimmed Mean",
    symbol: "x̄_trim",
    parameterSymbol: "μ_trim",
    parameterName: "10% Trimmed Population Mean",
    designType: "one_numerical",
    formula: "Average after removing lowest 10% and highest 10% of order statistics",
    minSampleSize: 5,
    supportsBCa: true,
    supportsBootstrapT: false,
    compute(data) {
      return trimmedMean(data, 0.10);
    },
    analyticSE() {
      return NaN;
    },
    description: "Robust location estimator that compromises between the mean and median by trimming tail observations."
  },

  sd: {
    id: "sd",
    name: "Sample Standard Deviation",
    symbol: "s",
    parameterSymbol: "σ",
    parameterName: "Population SD (σ)",
    designType: "one_numerical",
    formula: "s = √[ (1/(n−1)) ∑(xᵢ − x̄)² ]",
    minSampleSize: 3,
    supportsBCa: true,
    supportsBootstrapT: false,
    compute(data) {
      return standardDeviation(data);
    },
    analyticSE(data) {
      const n = data.length;
      return n > 2 ? standardDeviation(data) / Math.sqrt(2 * (n - 1)) : NaN;
    },
    description: "Square root of unbiased sample variance; measures typical dispersion in the original measurement units."
  },

  variance: {
    id: "variance",
    name: "Sample Variance",
    symbol: "s²",
    parameterSymbol: "σ²",
    parameterName: "Population Variance (σ²)",
    designType: "one_numerical",
    formula: "s² = (1/(n−1)) ∑(xᵢ − x̄)²",
    minSampleSize: 3,
    supportsBCa: true,
    supportsBootstrapT: false,
    compute(data) {
      return variance(data);
    },
    analyticSE() {
      return NaN;
    },
    description: "Unbiased estimator of population variance σ² using Bessel's divisor n − 1."
  },

  iqr: {
    id: "iqr",
    name: "Interquartile Range (IQR)",
    symbol: "IQR",
    parameterSymbol: "IQR_pop",
    parameterName: "Population Interquartile Range",
    designType: "one_numerical",
    formula: "Q₃ − Q₁ (Hyndman-Fan Type 7)",
    minSampleSize: 4,
    supportsBCa: false,
    supportsBootstrapT: false,
    compute(data) {
      return iqr(data);
    },
    analyticSE() {
      return NaN;
    },
    description: "Spread of the middle 50% of observations; resistant to extreme tail outliers."
  },

  quantile_75: {
    id: "quantile_75",
    name: "Upper Quartile (75th Percentile)",
    symbol: "Q₃",
    parameterSymbol: "θ₀.₇₅",
    parameterName: "Population 75th Percentile",
    designType: "one_numerical",
    formula: "Qhat(0.75) via Type 7 linear interpolation",
    minSampleSize: 4,
    supportsBCa: false,
    supportsBootstrapT: false,
    compute(data) {
      return quantile(data, 0.75);
    },
    analyticSE() {
      return NaN;
    },
    description: "Sample 0.75 quantile estimated using Hyndman-Fan Type 7 linear interpolation."
  },

  proportion: {
    id: "proportion",
    name: "Sample Proportion",
    symbol: "p̂",
    parameterSymbol: "p",
    parameterName: "Population Proportion (p)",
    designType: "one_binary",
    formula: "p̂ = k / n",
    minSampleSize: 2,
    supportsBCa: true,
    supportsBootstrapT: true,
    compute(data) {
      return proportion(data);
    },
    analyticSE(data) {
      const n = data.length;
      if (n < 2) return NaN;
      const p = proportion(data);
      return Math.sqrt(Math.max(1e-9, p * (1 - p)) / n);
    },
    description: "Fraction of successes in a binary sample; unbiased estimator of the Bernoulli probability p."
  },

  diff_means: {
    id: "diff_means",
    name: "Difference in Means",
    symbol: "x̄₁ − x̄₂",
    parameterSymbol: "μ₁ − μ₂",
    parameterName: "Difference in Means (μ₁ − μ₂)",
    designType: "two_independent_numerical",
    formula: "x̄₁ − x̄₂",
    minSampleSize: 2,
    supportsBCa: true,
    supportsBootstrapT: true,
    compute(g1, g2) {
      return mean(g1) - mean(g2);
    },
    analyticSE(g1, g2) {
      if (g1.length < 2 || g2.length < 2) return NaN;
      return Math.sqrt(variance(g1) / g1.length + variance(g2) / g2.length);
    },
    description: "Difference between two independent group means; estimates shift in average outcome."
  },

  diff_medians: {
    id: "diff_medians",
    name: "Difference in Medians",
    symbol: "M̂₁ − M̂₂",
    parameterSymbol: "M₁ − M₂",
    parameterName: "Difference in Medians (M₁ − M₂)",
    designType: "two_independent_numerical",
    formula: "median(x₁) − median(x₂)",
    minSampleSize: 3,
    supportsBCa: true,
    supportsBootstrapT: false,
    compute(g1, g2) {
      return median(g1) - median(g2);
    },
    analyticSE() {
      return NaN;
    },
    description: "Difference between two group medians; useful for comparing skewed distributions without outlier sensitivity."
  },

  cohens_d: {
    id: "cohens_d",
    name: "Cohen's d Effect Size",
    symbol: "d",
    parameterSymbol: "δ",
    parameterName: "Standardized Effect (δ)",
    designType: "two_independent_numerical",
    formula: "(x̄₁ − x̄₂) / s_pooled",
    minSampleSize: 3,
    supportsBCa: true,
    supportsBootstrapT: false,
    compute(g1, g2) {
      return cohensD(g1, g2);
    },
    analyticSE(g1, g2) {
      const n1 = g1.length;
      const n2 = g2.length;
      const d = cohensD(g1, g2);
      if (!Number.isFinite(d)) return NaN;
      return Math.sqrt((n1 + n2) / (n1 * n2) + (d * d) / (2 * (n1 + n2)));
    },
    description: "Scale-free standardized mean difference expressed in pooled standard deviation units."
  },

  diff_proportions: {
    id: "diff_proportions",
    name: "Difference in Proportions",
    symbol: "p̂₁ − p̂₂",
    parameterSymbol: "p₁ − p₂",
    parameterName: "Difference in Proportions (p₁ − p₂)",
    designType: "two_independent_binary",
    formula: "k₁/n₁ − k₂/n₂",
    minSampleSize: 2,
    supportsBCa: true,
    supportsBootstrapT: true,
    compute(g1, g2) {
      return proportion(g1) - proportion(g2);
    },
    analyticSE(g1, g2) {
      const n1 = g1.length;
      const n2 = g2.length;
      if (n1 < 2 || n2 < 2) return NaN;
      const p1 = proportion(g1);
      const p2 = proportion(g2);
      return Math.sqrt(Math.max(1e-9, (p1 * (1 - p1)) / n1 + (p2 * (1 - p2)) / n2));
    },
    description: "Difference between success rates in two independent binary groups."
  },

  paired_mean_diff: {
    id: "paired_mean_diff",
    name: "Mean of Paired Differences",
    symbol: "d̄",
    parameterSymbol: "μ_d",
    parameterName: "Mean Paired Difference (μ_d)",
    designType: "paired_numerical",
    formula: "d̄ = (1/n) ∑(xᵢ − yᵢ)",
    minSampleSize: 2,
    supportsBCa: true,
    supportsBootstrapT: true,
    compute(pairs) {
      const diffs = pairs.map((p) => (typeof p === "number" ? p : p.x - p.y));
      return mean(diffs);
    },
    analyticSE(pairs) {
      const diffs = pairs.map((p) => (typeof p === "number" ? p : p.x - p.y));
      return diffs.length > 1 ? standardDeviation(diffs) / Math.sqrt(diffs.length) : NaN;
    },
    description: "Average within-unit difference d_i = x_i - y_i; preserves natural pairing to eliminate between-subject variance."
  },

  paired_median_diff: {
    id: "paired_median_diff",
    name: "Median of Paired Differences",
    symbol: "d̃",
    parameterSymbol: "M_d",
    parameterName: "Population Median Paired Difference (M_d)",
    designType: "paired_numerical",
    formula: "median(x₁ − y₁, …, xₙ − yₙ)",
    minSampleSize: 3,
    supportsBCa: true,
    supportsBootstrapT: false,
    compute(pairs) {
      const diffs = pairs.map((p) => (typeof p === "number" ? p : p.x - p.y));
      return median(diffs);
    },
    analyticSE() {
      return NaN;
    },
    description: "Median of within-pair differences d_i = x_i - y_i; note that median(X - Y) is not necessarily equal to median(X) - median(Y)."
  },

  pearson_r: {
    id: "pearson_r",
    name: "Pearson Correlation (r)",
    symbol: "r",
    parameterSymbol: "ρ",
    parameterName: "Population Correlation (ρ)",
    designType: "bivariate_numerical",
    formula: "SS_xy / √(SS_xx · SS_yy)",
    minSampleSize: 4,
    supportsBCa: true,
    supportsBootstrapT: false,
    compute(pairs) {
      const x = pairs.map((p) => p.x);
      const y = pairs.map((p) => p.y);
      const biv = computeBivariateStats(x, y);
      return biv.valid ? biv.r : NaN;
    },
    analyticSE(pairs) {
      const n = pairs.length;
      const r = this.compute(pairs);
      return (n > 3 && Number.isFinite(r)) ? Math.sqrt((1 - r * r) / (n - 2)) : NaN;
    },
    description: "Linear association strength and direction between two quantitative variables in [-1, 1]."
  },

  spearman_rho: {
    id: "spearman_rho",
    name: "Spearman Rank Correlation (ρₛ)",
    symbol: "ρₛ",
    parameterSymbol: "ρₛ",
    parameterName: "Rank Correlation (ρₛ)",
    designType: "bivariate_numerical",
    formula: "Pearson correlation on fractional tie-adjusted ranks R(x_i) and R(y_i)",
    minSampleSize: 4,
    supportsBCa: true,
    supportsBootstrapT: false,
    compute(pairs) {
      const x = pairs.map((p) => p.x);
      const y = pairs.map((p) => p.y);
      return spearmanCorrelation(x, y);
    },
    analyticSE() {
      return NaN;
    },
    description: "Nonparametric monotonic rank correlation in [-1, 1]; resistant to outliers and monotone nonlinear transformations."
  },

  ols_slope: {
    id: "ols_slope",
    name: "OLS Regression Slope (β̂₁)",
    symbol: "β̂₁",
    parameterSymbol: "β₁",
    parameterName: "Regression Slope (β₁)",
    designType: "bivariate_numerical",
    formula: "β̂₁ = SS_xy / SS_xx = r · (s_y / s_x)",
    minSampleSize: 4,
    supportsBCa: true,
    supportsBootstrapT: true,
    compute(pairs) {
      const x = pairs.map((p) => p.x);
      const y = pairs.map((p) => p.y);
      const biv = computeBivariateStats(x, y);
      return biv.valid ? biv.slope : NaN;
    },
    analyticSE(pairs) {
      const x = pairs.map((p) => p.x);
      const y = pairs.map((p) => p.y);
      const biv = computeBivariateStats(x, y);
      return biv.valid ? biv.seSlope : NaN;
    },
    description: "Estimated average change in response Y per 1-unit increase in predictor X under ordinary least squares."
  },

  anova_f: {
    id: "anova_f",
    name: "One-Way ANOVA F-Statistic",
    symbol: "F",
    parameterSymbol: "F_pop",
    parameterName: "Between-to-Within Group Variance Ratio",
    designType: "multi_group_numerical",
    formula: "F = MSB / MSW",
    minSampleSize: 2,
    supportsBCa: false,
    supportsBootstrapT: false,
    compute(groups) {
      const res = computeOneWayAnova(groups);
      return res.valid ? res.fStat : NaN;
    },
    analyticSE() {
      return NaN;
    },
    description: "Ratio of between-group mean square to within-group mean square across k >= 2 groups."
  },

  chisq_stat: {
    id: "chisq_stat",
    name: "Contingency Chi-Square (χ²)",
    symbol: "χ²",
    parameterSymbol: "χ²",
    parameterName: "Contingency Independence Discrepancy",
    designType: "contingency_categorical",
    formula: "∑ (O_rc − E_rc)² / E_rc",
    minSampleSize: 5,
    supportsBCa: false,
    supportsBootstrapT: false,
    compute(table) {
      const res = computeContingencyChiSquare(table);
      return res.valid ? res.chiSq : NaN;
    },
    analyticSE() {
      return NaN;
    },
    description: "Measures aggregate discrepancy between observed cell counts and counts expected under row-column independence."
  }
};
