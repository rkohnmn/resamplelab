/**
 * ResampleLab — Probability Distribution Library & Special Mathematical Functions
 *
 * Implements 19 probability distribution families (9 discrete, 10 continuous)
 * with explicit parameterizations, domain validation, PDF/PMF, CDF, Quantile
 * (inverse CDF), theoretical moments (mean, variance, SD, skewness), and
 * exact/validated random variate generators.
 *
 * @module distributions
 * @version 1.0.0
 */

const EPSILON = 1e-12;
const LANCZOS_COEFFS = [
  0.99999999999980993,
  676.5203681218851,
  -1259.1392167224028,
  771.32342877765313,
  -176.61502916214059,
  12.507343278686905,
  -0.13857109526572012,
  9.9843695780195716e-6,
  1.5056327351493116e-7
];

/**
 * Natural logarithm of the Gamma function ln(Gamma(z)) using Lanczos approximation (g=7).
 * @param {number} z
 * @returns {number}
 */
export function logGamma(z) {
  if (z <= 0 || !Number.isFinite(z)) return NaN;
  if (z < 0.5) {
    return Math.log(Math.PI / Math.sin(Math.PI * z)) - logGamma(1 - z);
  }
  let x = LANCZOS_COEFFS[0];
  const zm1 = z - 1;
  for (let i = 1; i < LANCZOS_COEFFS.length; i++) {
    x += LANCZOS_COEFFS[i] / (zm1 + i);
  }
  const t = zm1 + 7.5;
  return 0.5 * Math.log(2 * Math.PI) + (zm1 + 0.5) * Math.log(t) - t + Math.log(x);
}

/**
 * Log-factorial ln(k!) for non-negative integers.
 * @param {number} k
 * @returns {number}
 */
export function logFactorial(k) {
  if (k < 0 || !Number.isInteger(k)) return NaN;
  if (k <= 1) return 0;
  return logGamma(k + 1);
}

/**
 * Log-binomial coefficient ln(n choose k).
 * @param {number} n
 * @param {number} k
 * @returns {number}
 */
export function logChoose(n, k) {
  if (k < 0 || k > n || !Number.isInteger(n) || !Number.isInteger(k)) return -Infinity;
  if (k === 0 || k === n) return 0;
  return logGamma(n + 1) - logGamma(k + 1) - logGamma(n - k + 1);
}

/**
 * Log-Beta function ln(B(a, b)).
 * @param {number} a
 * @param {number} b
 * @returns {number}
 */
export function logBeta(a, b) {
  return logGamma(a) + logGamma(b) - logGamma(a + b);
}

/**
 * Regularized incomplete beta function I_x(a, b) via Lentz's continued fraction.
 * @param {number} x
 * @param {number} a
 * @param {number} b
 * @returns {number}
 */
export function regularizedBeta(x, a, b) {
  if (Number.isNaN(x) || Number.isNaN(a) || Number.isNaN(b) || a <= 0 || b <= 0) return NaN;
  if (x <= 0) return 0;
  if (x >= 1) return 1;

  if (x > (a + 1) / (a + b + 2)) {
    return 1 - regularizedBeta(1 - x, b, a);
  }

  const lnBetaVal = logBeta(a, b);
  const front = Math.exp(a * Math.log(x) + b * Math.log(1 - x) - lnBetaVal) / a;

  const TINY = 1e-30;
  let f = 1.0;
  let c = 1.0;
  let d = 0.0;

  for (let m = 0; m <= 250; m++) {
    let numerator;
    if (m === 0) {
      numerator = 1.0;
    } else if (m % 2 === 0) {
      const k = m / 2;
      numerator = (k * (b - k) * x) / ((a + 2 * k - 1) * (a + 2 * k));
    } else {
      const k = (m - 1) / 2;
      numerator = -((a + k) * (a + b + k) * x) / ((a + 2 * k) * (a + 2 * k + 1));
    }

    d = 1.0 + numerator * d;
    if (Math.abs(d) < TINY) d = TINY;
    d = 1.0 / d;

    c = 1.0 + numerator / c;
    if (Math.abs(c) < TINY) c = TINY;

    const cd = c * d;
    f *= cd;
    if (m > 0 && Math.abs(1.0 - cd) < 1e-13) break;
  }

  return Math.max(0, Math.min(1, front * (f - 1.0)));
}

/**
 * Regularized lower incomplete gamma function P(a, x) = gamma(a, x) / Gamma(a).
 * Uses series expansion for x < a + 1 and Lentz continued fraction for x >= a + 1.
 * @param {number} a
 * @param {number} x
 * @returns {number}
 */
export function regularizedGammaP(a, x) {
  if (a <= 0 || Number.isNaN(a) || Number.isNaN(x)) return NaN;
  if (x <= 0) return 0;
  if (!Number.isFinite(x)) return 1;

  if (x < a + 1.0) {
    let ap = a;
    let sum = 1.0 / a;
    let del = sum;
    for (let n = 1; n <= 300; n++) {
      ap += 1.0;
      del *= x / ap;
      sum += del;
      if (Math.abs(del) < Math.abs(sum) * 1e-14) break;
    }
    const val = sum * Math.exp(-x + a * Math.log(x) - logGamma(a));
    return Math.max(0, Math.min(1, val));
  } else {
    const TINY = 1e-30;
    let b = x + 1.0 - a;
    let c = 1.0 / TINY;
    let d = 1.0 / b;
    let h = d;
    for (let i = 1; i <= 300; i++) {
      const an = -i * (i - a);
      b += 2.0;
      d = an * d + b;
      if (Math.abs(d) < TINY) d = TINY;
      c = b + an / c;
      if (Math.abs(c) < TINY) c = TINY;
      d = 1.0 / d;
      const del = d * c;
      h *= del;
      if (Math.abs(del - 1.0) < 1e-14) break;
    }
    const q = Math.exp(-x + a * Math.log(x) - logGamma(a)) * h;
    return Math.max(0, Math.min(1, 1.0 - q));
  }
}

/**
 * Error function erf(x) using Abramowitz and Stegun / Chebyshev approximation.
 * @param {number} x
 * @returns {number}
 */
export function erf(x) {
  if (!Number.isFinite(x)) return x > 0 ? 1 : -1;
  const sign = x >= 0 ? 1 : -1;
  const ax = Math.abs(x);
  const t = 1.0 / (1.0 + 0.3275911 * ax);
  const y = 1.0 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-ax * ax);
  return sign * y;
}

/**
 * Standard normal CDF Phi(z).
 * @param {number} z
 * @returns {number}
 */
export function normalCDF(z, mu = 0, sigma = 1) {
  if (sigma <= 0) return NaN;
  const zStd = (z - mu) / sigma;
  return 0.5 * (1.0 + erf(zStd / Math.SQRT2));
}

/**
 * Standard normal PDF phi(x).
 * @param {number} x
 * @param {number} mu
 * @param {number} sigma
 * @returns {number}
 */
export function normalPDF(x, mu = 0, sigma = 1) {
  if (sigma <= 0) return NaN;
  const z = (x - mu) / sigma;
  return Math.exp(-0.5 * z * z) / (sigma * Math.sqrt(2 * Math.PI));
}

/**
 * Peter Acklam's rational minimax approximation for the inverse standard normal CDF Phi^-1(p).
 * Relative error < 1.15e-9 across (0, 1).
 * @param {number} p
 * @param {number} mu
 * @param {number} sigma
 * @returns {number}
 */
export function inverseNormalCDF(p, mu = 0, sigma = 1) {
  if (sigma <= 0 || Number.isNaN(p)) return NaN;
  if (p <= 0) return -Infinity;
  if (p >= 1) return Infinity;

  const q = Math.max(1e-15, Math.min(1 - 1e-15, p));
  const a = [
    -3.969683028665376e+01,
    2.209460984245205e+02,
    -2.759285104469687e+02,
    1.383577518672690e+02,
    -3.066479806614716e+01,
    2.506628277459239e+00
  ];
  const b = [
    -5.447609879822406e+01,
    1.615858368580409e+02,
    -1.556989798598866e+02,
    6.680131188771972e+01,
    -1.328068155288572e+01
  ];
  const c = [
    -7.784894002430293e-03,
    -3.223964580411365e-01,
    -2.400758277161838e+00,
    -2.549732539343734e+00,
    4.374664141464968e+00,
    2.938163982698783e+00
  ];
  const d = [
    7.784695709041462e-03,
    3.224671290700398e-01,
    2.445134137142996e+00,
    3.754408661907416e+00
  ];

  const pLow = 0.02425;
  const pHigh = 1.0 - pLow;
  let z;

  if (q < pLow) {
    const r = Math.sqrt(-2.0 * Math.log(q));
    z = (((((c[0] * r + c[1]) * r + c[2]) * r + c[3]) * r + c[4]) * r + c[5]) /
        ((((d[0] * r + d[1]) * r + d[2]) * r + d[3]) * r + 1.0);
  } else if (q <= pHigh) {
    const r = q - 0.5;
    const r2 = r * r;
    z = (((((a[0] * r2 + a[1]) * r2 + a[2]) * r2 + a[3]) * r2 + a[4]) * r2 + a[5]) * r /
        (((((b[0] * r2 + b[1]) * r2 + b[2]) * r2 + b[3]) * r2 + b[4]) * r2 + 1.0);
  } else {
    const r = Math.sqrt(-2.0 * Math.log(1.0 - q));
    z = -(((((c[0] * r + c[1]) * r + c[2]) * r + c[3]) * r + c[4]) * r + c[5]) /
         ((((d[0] * r + d[1]) * r + d[2]) * r + d[3]) * r + 1.0);
  }

  return mu + sigma * z;
}

/**
 * Student's t PDF, CDF, and Quantile.
 */
export function studentTPDF(x, df) {
  if (df <= 0) return NaN;
  const lnC = logGamma((df + 1) / 2) - 0.5 * Math.log(df * Math.PI) - logGamma(df / 2);
  return Math.exp(lnC - ((df + 1) / 2) * Math.log(1 + (x * x) / df));
}

export function studentTCDF(x, df) {
  if (df <= 0 || Number.isNaN(x)) return NaN;
  if (x === 0) return 0.5;
  if (!Number.isFinite(x)) return x > 0 ? 1 : 0;
  const ib = regularizedBeta(df / (df + x * x), df / 2, 0.5);
  return x > 0 ? 1 - 0.5 * ib : 0.5 * ib;
}

export function studentTQuantile(p, df) {
  if (df <= 0 || Number.isNaN(p)) return NaN;
  if (p <= 0) return -Infinity;
  if (p >= 1) return Infinity;
  if (Math.abs(p - 0.5) < 1e-15) return 0;

  if (df === 1) {
    return Math.tan(Math.PI * (p - 0.5));
  }
  if (df === 2) {
    return (2 * p - 1) / Math.sqrt(2 * p * (1 - p));
  }

  const z = inverseNormalCDF(p);
  const z2 = z * z;
  let x = z + (z * (z2 + 1)) / (4 * df) + (z * (5 * z2 * z2 + 16 * z2 + 3)) / (96 * df * df);

  for (let i = 0; i < 8; i++) {
    const cdf = studentTCDF(x, df);
    const pdf = studentTPDF(x, df);
    if (pdf < 1e-15) break;
    const delta = (cdf - p) / pdf;
    x -= delta;
    if (Math.abs(delta) < 1e-12) break;
  }
  return x;
}

/**
 * Chi-Square PDF, CDF, and Quantile.
 */
export function chiSquarePDF(x, k) {
  if (k <= 0) return NaN;
  if (x < 0) return 0;
  if (x === 0) return k === 2 ? 0.5 : (k < 2 ? Infinity : 0);
  const halfK = k / 2;
  return Math.exp((halfK - 1) * Math.log(x) - x / 2 - halfK * Math.LN2 - logGamma(halfK));
}

export function chiSquareCDF(x, k) {
  if (k <= 0 || Number.isNaN(x)) return NaN;
  if (x <= 0) return 0;
  return regularizedGammaP(k / 2, x / 2);
}

/**
 * Generic monotone continuous quantile solver via bracketed bisection + Newton-Raphson.
 */
function invertContinuousCDF(targetP, cdfFn, pdfFn, lowBound, highBound, initialGuess) {
  if (targetP <= 0) return lowBound;
  if (targetP >= 1) return highBound;

  let lo = Number.isFinite(lowBound) ? lowBound : -50;
  let hi = Number.isFinite(highBound) ? highBound : 50;

  // Expand brackets if necessary
  let iterExpand = 0;
  while (cdfFn(lo) > targetP && !Number.isFinite(lowBound) && iterExpand < 40) {
    lo *= 2;
    iterExpand++;
  }
  iterExpand = 0;
  while (cdfFn(hi) < targetP && !Number.isFinite(highBound) && iterExpand < 60) {
    hi = hi <= 0 ? 10 : hi * 2;
    iterExpand++;
  }

  let x = Number.isFinite(initialGuess) ? Math.max(lo, Math.min(hi, initialGuess)) : 0.5 * (lo + hi);

  for (let i = 0; i < 60; i++) {
    const f = cdfFn(x) - targetP;
    if (Math.abs(f) < 1e-11 || (hi - lo) < 1e-11) break;
    if (f < 0) lo = x;
    else hi = x;

    const d = pdfFn ? pdfFn(x) : 0;
    if (d > 1e-12) {
      const nextX = x - f / d;
      if (nextX > lo && nextX < hi) {
        x = nextX;
        continue;
      }
    }
    x = 0.5 * (lo + hi);
  }
  return x;
}

export function chiSquareQuantile(p, k) {
  if (k <= 0 || Number.isNaN(p)) return NaN;
  if (p <= 0) return 0;
  if (p >= 1) return Infinity;
  // Wilson-Hilferty initial approximation
  const z = inverseNormalCDF(p);
  const wh = k * Math.pow(Math.max(0.01, 1 - 2 / (9 * k) + z * Math.sqrt(2 / (9 * k))), 3);
  return invertContinuousCDF(
    p,
    (x) => chiSquareCDF(x, k),
    (x) => chiSquarePDF(x, k),
    0,
    Infinity,
    Math.max(0.001, wh)
  );
}

/**
 * Snedecor's F distribution PDF, CDF, and Quantile.
 */
export function fDistPDF(x, d1, d2) {
  if (d1 <= 0 || d2 <= 0) return NaN;
  if (x < 0) return 0;
  if (x === 0) return d1 < 2 ? Infinity : (d1 === 2 ? 1 : 0);
  const a = d1 / 2;
  const b = d2 / 2;
  const lnNum = a * Math.log(d1) + b * Math.log(d2) + (a - 1) * Math.log(x);
  const lnDen = (a + b) * Math.log(d1 * x + d2) + logBeta(a, b);
  return Math.exp(lnNum - lnDen);
}

export function fDistCDF(x, d1, d2) {
  if (d1 <= 0 || d2 <= 0 || Number.isNaN(x)) return NaN;
  if (x <= 0) return 0;
  if (!Number.isFinite(x)) return 1;
  const z = (d1 * x) / (d1 * x + d2);
  return regularizedBeta(z, d1 / 2, d2 / 2);
}

export function fDistQuantile(p, d1, d2) {
  if (d1 <= 0 || d2 <= 0 || Number.isNaN(p)) return NaN;
  if (p <= 0) return 0;
  if (p >= 1) return Infinity;
  const guess = d2 > 2 ? d2 / (d2 - 2) : 1.0;
  return invertContinuousCDF(
    p,
    (x) => fDistCDF(x, d1, d2),
    (x) => fDistPDF(x, d1, d2),
    0,
    Infinity,
    guess
  );
}

/**
 * Marsaglia & Tsang (2000) exact acceptance-rejection sampler for Gamma(shape, scale=1).
 * @param {number} shape (alpha > 0)
 * @param {object} prng
 * @returns {number}
 */
export function sampleStandardGamma(shape, prng) {
  if (shape <= 0) return NaN;
  if (shape < 1.0) {
    const u = prng.nextOpenFloat();
    return sampleStandardGamma(shape + 1.0, prng) * Math.pow(u, 1.0 / shape);
  }
  const d = shape - 1.0 / 3.0;
  const c = 1.0 / Math.sqrt(9.0 * d);
  while (true) {
    let x = prng.nextStandardNormal();
    let v = 1.0 + c * x;
    if (v <= 0) continue;
    v = v * v * v;
    const u = prng.nextOpenFloat();
    if (u < 1.0 - 0.0331 * (x * x) * (x * x)) {
      return d * v;
    }
    if (Math.log(u) < 0.5 * x * x + d * (1.0 - v + Math.log(v))) {
      return d * v;
    }
  }
}

/**
 * Canonical Registry of 19 Probability Distribution Families (9 Discrete, 10 Continuous).
 *
 * Parameterization conventions are explicitly documented per family to prevent
 * ambiguity (e.g., Gamma uses shape alpha and scale theta = 1/rate; Geometric
 * counts failures k in {0, 1, 2, ...} before first success with note on trial convention).
 */
export const DISTRIBUTION_FAMILIES = {
  // =========================================================================
  // DISCRETE DISTRIBUTIONS (9)
  // =========================================================================
  bernoulli: {
    id: "bernoulli",
    name: "Bernoulli",
    type: "discrete",
    notation: "Bern(p)",
    parameterizationNote: "Binary trial $k \\in \\{0, 1\\}$ with $P(X=1)=p$, $E[X]=p$, and $\\text{Var}(X)=p(1-p)$.",
    parameters: [
      { key: "p", label: "Success Probability (p)", min: 0.01, max: 0.99, step: 0.01, default: 0.5 }
    ],
    validate(params) {
      const p = Number(params.p);
      if (!Number.isFinite(p) || p < 0 || p > 1) return { valid: false, reason: "Probability p must be in [0, 1]." };
      return { valid: true };
    },
    support(params) {
      return { min: 0, max: 1, discreteValues: [0, 1] };
    },
    moments(params) {
      const p = Number(params.p);
      const q = 1 - p;
      const variance = p * q;
      const sd = Math.sqrt(variance);
      const skewness = sd > 0 ? (q - p) / sd : 0;
      return { mean: p, variance, sd, skewness };
    },
    pmf(k, params) {
      const p = Number(params.p);
      if (k === 0) return 1 - p;
      if (k === 1) return p;
      return 0;
    },
    cdf(x, params) {
      const p = Number(params.p);
      if (x < 0) return 0;
      if (x < 1) return 1 - p;
      return 1;
    },
    quantile(q, params) {
      const p = Number(params.p);
      if (q < 0 || q > 1) return NaN;
      return q <= 1 - p ? 0 : 1;
    },
    sample(params, prng) {
      return prng.nextFloat() < Number(params.p) ? 1 : 0;
    }
  },

  binomial: {
    id: "binomial",
    name: "Binomial",
    type: "discrete",
    notation: "Bin(n, p)",
    parameterizationNote: "Successes $k \\in \\{0, \\dots, n\\}$ in $n$ i.i.d. trials: $P(X=k) = \\binom{n}{k}p^k(1-p)^{n-k}$, $E[X]=np$.",
    parameters: [
      { key: "n", label: "Number of Trials (n)", min: 1, max: 200, step: 1, default: 20 },
      { key: "p", label: "Success Probability (p)", min: 0.01, max: 0.99, step: 0.01, default: 0.35 }
    ],
    validate(params) {
      const n = Math.round(Number(params.n));
      const p = Number(params.p);
      if (!Number.isInteger(n) || n < 1 || n > 10000) return { valid: false, reason: "Trials n must be a positive integer." };
      if (!Number.isFinite(p) || p < 0 || p > 1) return { valid: false, reason: "Probability p must be in [0, 1]." };
      return { valid: true };
    },
    support(params) {
      const n = Math.round(Number(params.n));
      const vals = [];
      for (let k = 0; k <= n; k++) vals.push(k);
      return { min: 0, max: n, discreteValues: vals };
    },
    moments(params) {
      const n = Math.round(Number(params.n));
      const p = Number(params.p);
      const mean = n * p;
      const variance = n * p * (1 - p);
      const sd = Math.sqrt(variance);
      const skewness = sd > 0 ? (1 - 2 * p) / sd : 0;
      return { mean, variance, sd, skewness };
    },
    pmf(k, params) {
      const n = Math.round(Number(params.n));
      const p = Number(params.p);
      if (!Number.isInteger(k) || k < 0 || k > n) return 0;
      if (p === 0) return k === 0 ? 1 : 0;
      if (p === 1) return k === n ? 1 : 0;
      return Math.exp(logChoose(n, k) + k * Math.log(p) + (n - k) * Math.log(1 - p));
    },
    cdf(x, params) {
      const n = Math.round(Number(params.n));
      const kMax = Math.floor(x);
      if (kMax < 0) return 0;
      if (kMax >= n) return 1;
      let sum = 0;
      for (let k = 0; k <= kMax; k++) {
        sum += this.pmf(k, params);
      }
      return Math.min(1, sum);
    },
    quantile(q, params) {
      if (q < 0 || q > 1) return NaN;
      if (q === 0) return 0;
      const n = Math.round(Number(params.n));
      let cum = 0;
      for (let k = 0; k <= n; k++) {
        cum += this.pmf(k, params);
        if (cum >= q - EPSILON) return k;
      }
      return n;
    },
    sample(params, prng) {
      const n = Math.round(Number(params.n));
      const p = Number(params.p);
      let successes = 0;
      for (let i = 0; i < n; i++) {
        if (prng.nextFloat() < p) successes++;
      }
      return successes;
    }
  },

  geometric: {
    id: "geometric",
    name: "Geometric",
    type: "discrete",
    notation: "Geom(p)",
    parameterizationNote: "Failure-count convention ($k \\in \\{0, 1, \\dots\\}$ failures before 1st success): $P(X=k) = (1-p)^k p$, $E[X] = \\frac{1-p}{p}$.",
    parameters: [
      { key: "p", label: "Success Probability (p)", min: 0.05, max: 0.95, step: 0.01, default: 0.3 }
    ],
    validate(params) {
      const p = Number(params.p);
      if (!Number.isFinite(p) || p <= 0 || p > 1) return { valid: false, reason: "Success probability p must be in (0, 1]." };
      return { valid: true };
    },
    support(params) {
      const p = Number(params.p);
      const maxPlot = Math.min(150, Math.max(15, Math.ceil(Math.log(0.0005) / Math.log(Math.max(1e-6, 1 - p)))));
      const vals = [];
      for (let k = 0; k <= maxPlot; k++) vals.push(k);
      return { min: 0, max: Infinity, plotMax: maxPlot, discreteValues: vals };
    },
    moments(params) {
      const p = Number(params.p);
      const mean = (1 - p) / p;
      const variance = (1 - p) / (p * p);
      const sd = Math.sqrt(variance);
      const skewness = (2 - p) / Math.sqrt(1 - p);
      return { mean, variance, sd, skewness };
    },
    pmf(k, params) {
      const p = Number(params.p);
      if (!Number.isInteger(k) || k < 0) return 0;
      if (p === 1) return k === 0 ? 1 : 0;
      return Math.pow(1 - p, k) * p;
    },
    cdf(x, params) {
      const p = Number(params.p);
      const k = Math.floor(x);
      if (k < 0) return 0;
      if (p === 1) return 1;
      return 1 - Math.pow(1 - p, k + 1);
    },
    quantile(q, params) {
      if (q < 0 || q > 1) return NaN;
      if (q === 0) return 0;
      if (q === 1) return Infinity;
      const p = Number(params.p);
      if (p === 1) return 0;
      return Math.max(0, Math.ceil(Math.log(1 - q) / Math.log(1 - p) - 1 - EPSILON));
    },
    sample(params, prng) {
      const p = Number(params.p);
      if (p >= 1) return 0;
      const u = prng.nextOpenFloat();
      return Math.floor(Math.log(u) / Math.log(1 - p));
    }
  },

  negative_binomial: {
    id: "negative_binomial",
    name: "Negative Binomial",
    type: "discrete",
    notation: "NegBin(r, p)",
    parameterizationNote: "Failures $k \\in \\{0, 1, \\dots\\}$ before $r$-th success: $P(X=k) = \\binom{k+r-1}{k}p^r(1-p)^k$, $E[X] = \\frac{r(1-p)}{p}$.",
    parameters: [
      { key: "r", label: "Target Successes (r)", min: 1, max: 40, step: 1, default: 5 },
      { key: "p", label: "Success Probability (p)", min: 0.05, max: 0.95, step: 0.01, default: 0.4 }
    ],
    validate(params) {
      const r = Math.round(Number(params.r));
      const p = Number(params.p);
      if (!Number.isInteger(r) || r < 1) return { valid: false, reason: "Target successes r must be a positive integer." };
      if (!Number.isFinite(p) || p <= 0 || p > 1) return { valid: false, reason: "Success probability p must be in (0, 1]." };
      return { valid: true };
    },
    support(params) {
      const { mean, sd } = this.moments(params);
      const maxPlot = Math.min(200, Math.max(20, Math.ceil(mean + 5 * sd)));
      const vals = [];
      for (let k = 0; k <= maxPlot; k++) vals.push(k);
      return { min: 0, max: Infinity, plotMax: maxPlot, discreteValues: vals };
    },
    moments(params) {
      const r = Math.round(Number(params.r));
      const p = Number(params.p);
      const mean = (r * (1 - p)) / p;
      const variance = (r * (1 - p)) / (p * p);
      const sd = Math.sqrt(variance);
      const skewness = (2 - p) / Math.sqrt(r * (1 - p));
      return { mean, variance, sd, skewness };
    },
    pmf(k, params) {
      const r = Math.round(Number(params.r));
      const p = Number(params.p);
      if (!Number.isInteger(k) || k < 0) return 0;
      if (p === 1) return k === 0 ? 1 : 0;
      return Math.exp(logChoose(k + r - 1, k) + r * Math.log(p) + k * Math.log(1 - p));
    },
    cdf(x, params) {
      const kMax = Math.floor(x);
      if (kMax < 0) return 0;
      let sum = 0;
      for (let k = 0; k <= kMax; k++) {
        sum += this.pmf(k, params);
        if (sum >= 1 - 1e-14) return 1;
      }
      return Math.min(1, sum);
    },
    quantile(q, params) {
      if (q < 0 || q > 1) return NaN;
      if (q === 0) return 0;
      if (q === 1) return Infinity;
      let cum = 0;
      for (let k = 0; k <= 2000; k++) {
        cum += this.pmf(k, params);
        if (cum >= q - EPSILON) return k;
      }
      return 2000;
    },
    sample(params, prng) {
      const r = Math.round(Number(params.r));
      let totalFailures = 0;
      for (let i = 0; i < r; i++) {
        totalFailures += DISTRIBUTION_FAMILIES.geometric.sample({ p: params.p }, prng);
      }
      return totalFailures;
    }
  },

  hypergeometric: {
    id: "hypergeometric",
    name: "Hypergeometric",
    type: "discrete",
    notation: "Hypergeom(N, K, n)",
    parameterizationNote: "Successes $k$ in $n$ draws WITHOUT replacement from finite $N$ containing $K$ successes: $P(X=k) = \\frac{\\binom{K}{k}\\binom{N-K}{n-k}}{\\binom{N}{n}}$.",
    parameters: [
      { key: "N", label: "Population Size (N)", min: 5, max: 300, step: 1, default: 60 },
      { key: "K", label: "Population Successes (K)", min: 1, max: 200, step: 1, default: 24 },
      { key: "n", label: "Sample Size (n)", min: 1, max: 100, step: 1, default: 15 }
    ],
    validate(params) {
      const N = Math.round(Number(params.N));
      const K = Math.round(Number(params.K));
      const n = Math.round(Number(params.n));
      if (N < 1 || K < 0 || K > N || n < 1 || n > N) {
        return { valid: false, reason: "Require 0 <= K <= N and 1 <= n <= N." };
      }
      return { valid: true };
    },
    support(params) {
      const N = Math.round(Number(params.N));
      const K = Math.round(Number(params.K));
      const n = Math.round(Number(params.n));
      const minK = Math.max(0, n + K - N);
      const maxK = Math.min(n, K);
      const vals = [];
      for (let k = minK; k <= maxK; k++) vals.push(k);
      return { min: minK, max: maxK, discreteValues: vals };
    },
    moments(params) {
      const N = Math.round(Number(params.N));
      const K = Math.round(Number(params.K));
      const n = Math.round(Number(params.n));
      const p = K / N;
      const mean = n * p;
      const fpc = N > 1 ? (N - n) / (N - 1) : 0;
      const variance = n * p * (1 - p) * fpc;
      const sd = Math.sqrt(variance);
      const skewness = (N > 2 && sd > 0)
        ? ((N - 2 * K) * Math.sqrt(N - 1) * (N - 2 * n)) / (Math.sqrt(n * K * (N - K) * (N - n)) * (N - 2))
        : 0;
      return { mean, variance, sd, skewness };
    },
    pmf(k, params) {
      const N = Math.round(Number(params.N));
      const K = Math.round(Number(params.K));
      const n = Math.round(Number(params.n));
      const minK = Math.max(0, n + K - N);
      const maxK = Math.min(n, K);
      if (!Number.isInteger(k) || k < minK || k > maxK) return 0;
      return Math.exp(logChoose(K, k) + logChoose(N - K, n - k) - logChoose(N, n));
    },
    cdf(x, params) {
      const { min, max } = this.support(params);
      const kMax = Math.floor(x);
      if (kMax < min) return 0;
      if (kMax >= max) return 1;
      let sum = 0;
      for (let k = min; k <= kMax; k++) sum += this.pmf(k, params);
      return Math.min(1, sum);
    },
    quantile(q, params) {
      if (q < 0 || q > 1) return NaN;
      const { min, max } = this.support(params);
      let cum = 0;
      for (let k = min; k <= max; k++) {
        cum += this.pmf(k, params);
        if (cum >= q - EPSILON) return k;
      }
      return max;
    },
    sample(params, prng) {
      let N = Math.round(Number(params.N));
      let K = Math.round(Number(params.K));
      const n = Math.round(Number(params.n));
      let successes = 0;
      for (let i = 0; i < n; i++) {
        if (prng.nextFloat() < K / N) {
          successes++;
          K--;
        }
        N--;
      }
      return successes;
    }
  },

  poisson: {
    id: "poisson",
    name: "Poisson",
    type: "discrete",
    notation: "Pois(λ)",
    parameterizationNote: "Count $k \\in \\{0, 1, 2, \\dots\\}$ with rate $\\lambda > 0$: $P(X = k) = \\frac{e^{-\\lambda} \\lambda^k}{k!}$, $E[X] = \\text{Var}(X) = \\lambda$.",
    parameters: [
      { key: "lambda", label: "Event Rate (λ)", min: 0.2, max: 60, step: 0.2, default: 4.5 }
    ],
    validate(params) {
      const lambda = Number(params.lambda);
      if (!Number.isFinite(lambda) || lambda <= 0) return { valid: false, reason: "Rate lambda must be > 0." };
      return { valid: true };
    },
    support(params) {
      const lambda = Number(params.lambda);
      const maxPlot = Math.min(180, Math.max(15, Math.ceil(lambda + 5 * Math.sqrt(lambda))));
      const vals = [];
      for (let k = 0; k <= maxPlot; k++) vals.push(k);
      return { min: 0, max: Infinity, plotMax: maxPlot, discreteValues: vals };
    },
    moments(params) {
      const lambda = Number(params.lambda);
      return {
        mean: lambda,
        variance: lambda,
        sd: Math.sqrt(lambda),
        skewness: 1 / Math.sqrt(lambda)
      };
    },
    pmf(k, params) {
      const lambda = Number(params.lambda);
      if (!Number.isInteger(k) || k < 0) return 0;
      return Math.exp(k * Math.log(lambda) - lambda - logFactorial(k));
    },
    cdf(x, params) {
      const kMax = Math.floor(x);
      if (kMax < 0) return 0;
      let sum = 0;
      for (let k = 0; k <= kMax; k++) {
        sum += this.pmf(k, params);
        if (sum >= 1 - 1e-14) return 1;
      }
      return Math.min(1, sum);
    },
    quantile(q, params) {
      if (q < 0 || q > 1) return NaN;
      if (q === 0) return 0;
      if (q === 1) return Infinity;
      let cum = 0;
      for (let k = 0; k <= 1000; k++) {
        cum += this.pmf(k, params);
        if (cum >= q - EPSILON) return k;
      }
      return 1000;
    },
    sample(params, prng) {
      const lambda = Number(params.lambda);
      if (lambda < 30) {
        // Knuth's exact Poisson algorithm
        const L = Math.exp(-lambda);
        let k = 0;
        let p = 1.0;
        do {
          k++;
          p *= prng.nextOpenFloat();
        } while (p > L);
        return k - 1;
      }
      // Ahrens-Dieter / Atkinson rejection for larger lambda
      const c = 0.767 - 3.36 / lambda;
      const beta = Math.PI / Math.sqrt(3.0 * lambda);
      const alpha = beta * lambda;
      const kConst = Math.log(c) - lambda - Math.log(beta);
      while (true) {
        const u = prng.nextOpenFloat();
        const x = (alpha - Math.log((1.0 - u) / u)) / beta;
        const n = Math.floor(x + 0.5);
        if (n < 0) continue;
        const v = prng.nextOpenFloat();
        const y = alpha - beta * x;
        const lhs = y + Math.log(v / Math.pow(1.0 + Math.exp(y), 2));
        const rhs = kConst + n * Math.log(lambda) - logFactorial(n);
        if (lhs <= rhs) return n;
      }
    }
  },

  discrete_uniform: {
    id: "discrete_uniform",
    name: "Discrete Uniform",
    type: "discrete",
    notation: "DUnif(a, b)",
    parameterizationNote: "Equally likely integers $k \\in \\{a, \\dots, b\\}$ ($m = b - a + 1$ states): $P(X=k) = \\frac{1}{m}$, $E[X] = \\frac{a+b}{2}$.",
    parameters: [
      { key: "a", label: "Minimum Integer (a)", min: -20, max: 20, step: 1, default: 1 },
      { key: "b", label: "Maximum Integer (b)", min: -19, max: 50, step: 1, default: 6 }
    ],
    validate(params) {
      const a = Math.round(Number(params.a));
      const b = Math.round(Number(params.b));
      if (b < a) return { valid: false, reason: "Require maximum integer b >= minimum integer a." };
      return { valid: true };
    },
    support(params) {
      const a = Math.round(Number(params.a));
      const b = Math.round(Number(params.b));
      const vals = [];
      for (let k = a; k <= b; k++) vals.push(k);
      return { min: a, max: b, discreteValues: vals };
    },
    moments(params) {
      const a = Math.round(Number(params.a));
      const b = Math.round(Number(params.b));
      const m = b - a + 1;
      const mean = 0.5 * (a + b);
      const variance = (m * m - 1) / 12;
      return { mean, variance, sd: Math.sqrt(variance), skewness: 0 };
    },
    pmf(k, params) {
      const a = Math.round(Number(params.a));
      const b = Math.round(Number(params.b));
      if (!Number.isInteger(k) || k < a || k > b) return 0;
      return 1 / (b - a + 1);
    },
    cdf(x, params) {
      const a = Math.round(Number(params.a));
      const b = Math.round(Number(params.b));
      if (x < a) return 0;
      if (x >= b) return 1;
      return (Math.floor(x) - a + 1) / (b - a + 1);
    },
    quantile(q, params) {
      if (q < 0 || q > 1) return NaN;
      const a = Math.round(Number(params.a));
      const b = Math.round(Number(params.b));
      const m = b - a + 1;
      if (q === 0) return a;
      return Math.min(b, a + Math.ceil(q * m - EPSILON) - 1);
    },
    sample(params, prng) {
      const a = Math.round(Number(params.a));
      const b = Math.round(Number(params.b));
      return prng.nextInt(a, b);
    }
  },

  custom_discrete: {
    id: "custom_discrete",
    name: "User-Defined Finite Discrete",
    type: "discrete",
    notation: "Discrete(xₖ, pₖ)",
    parameterizationNote: "Finite discrete table where weights $w_k \\ge 0$ normalize to $p_k = \\frac{w_k}{\\sum w_j}$.",
    parameters: [
      { key: "valuesStr", label: "Support Values (comma-separated)", type: "text", default: "0, 1, 2, 5, 10" },
      { key: "weightsStr", label: "Probability Weights (comma-separated)", type: "text", default: "0.35, 0.30, 0.20, 0.10, 0.05" }
    ],
    parseTable(params) {
      const rawVals = String(params.valuesStr ?? "0, 1, 2, 5, 10").split(",").map((s) => Number(s.trim()));
      const rawWeights = String(params.weightsStr ?? "0.35, 0.30, 0.20, 0.10, 0.05").split(",").map((s) => Number(s.trim()));
      const len = Math.min(rawVals.length, rawWeights.length);
      const pairs = [];
      let wSum = 0;
      for (let i = 0; i < len; i++) {
        if (Number.isFinite(rawVals[i]) && Number.isFinite(rawWeights[i]) && rawWeights[i] >= 0) {
          pairs.push({ x: rawVals[i], w: rawWeights[i] });
          wSum += rawWeights[i];
        }
      }
      if (pairs.length === 0 || wSum <= 0) {
        return [{ x: 0, p: 0.5 }, { x: 1, p: 0.5 }];
      }
      pairs.sort((a, b) => a.x - b.x);
      // Merge duplicate x values
      const merged = [];
      for (const item of pairs) {
        if (merged.length > 0 && Math.abs(merged[merged.length - 1].x - item.x) < 1e-12) {
          merged[merged.length - 1].p += item.w / wSum;
        } else {
          merged.push({ x: item.x, p: item.w / wSum });
        }
      }
      return merged;
    },
    validate(params) {
      const table = this.parseTable(params);
      if (table.length < 1) return { valid: false, reason: "Provide at least one valid value and positive weight." };
      return { valid: true };
    },
    support(params) {
      const table = this.parseTable(params);
      const vals = table.map((d) => d.x);
      return { min: vals[0], max: vals[vals.length - 1], discreteValues: vals };
    },
    moments(params) {
      const table = this.parseTable(params);
      let mean = 0;
      for (const d of table) mean += d.x * d.p;
      let variance = 0;
      let m3 = 0;
      for (const d of table) {
        const diff = d.x - mean;
        variance += diff * diff * d.p;
        m3 += diff * diff * diff * d.p;
      }
      const sd = Math.sqrt(variance);
      const skewness = sd > 1e-12 ? m3 / Math.pow(sd, 3) : 0;
      return { mean, variance, sd, skewness };
    },
    pmf(k, params) {
      const table = this.parseTable(params);
      for (const d of table) {
        if (Math.abs(d.x - k) < 1e-9) return d.p;
      }
      return 0;
    },
    cdf(x, params) {
      const table = this.parseTable(params);
      let sum = 0;
      for (const d of table) {
        if (d.x <= x + 1e-12) sum += d.p;
      }
      return Math.min(1, sum);
    },
    quantile(q, params) {
      if (q < 0 || q > 1) return NaN;
      const table = this.parseTable(params);
      let cum = 0;
      for (const d of table) {
        cum += d.p;
        if (cum >= q - EPSILON) return d.x;
      }
      return table[table.length - 1].x;
    },
    sample(params, prng) {
      const table = this.parseTable(params);
      const u = prng.nextFloat();
      let cum = 0;
      for (const d of table) {
        cum += d.p;
        if (u <= cum) return d.x;
      }
      return table[table.length - 1].x;
    }
  },

  empirical_discrete: {
    id: "empirical_discrete",
    name: "Empirical Distribution (F̂ₙ)",
    type: "discrete",
    notation: "F̂ₙ(x₁, …, xₙ)",
    parameterizationNote: "Places mass $1/n$ on each sample point $x_i$ ($\\hat{F}_n(x) = \\frac{1}{n}\\sum I(x_i \\le x)$); resampling from $\\hat{F}_n$ powers the nonparametric bootstrap.",
    parameters: [
      { key: "sampleStr", label: "Observed Sample Values", type: "text", default: "12.4, 14.1, 14.8, 15.2, 16.0, 16.0, 17.5, 19.1, 22.4, 28.0" }
    ],
    parseSample(params) {
      const arr = String(params.sampleStr ?? "12.4, 14.1, 14.8, 15.2, 16.0, 16.0, 17.5, 19.1, 22.4, 28.0")
        .split(",")
        .map((s) => Number(s.trim()))
        .filter((v) => Number.isFinite(v));
      return arr.length > 0 ? arr.sort((a, b) => a - b) : [0, 1];
    },
    validate(params) {
      const s = this.parseSample(params);
      if (s.length < 2) return { valid: false, reason: "Empirical distribution requires at least 2 finite values." };
      return { valid: true };
    },
    support(params) {
      const s = this.parseSample(params);
      const unique = Array.from(new Set(s));
      return { min: s[0], max: s[s.length - 1], discreteValues: unique };
    },
    moments(params) {
      const s = this.parseSample(params);
      const n = s.length;
      const mean = s.reduce((a, b) => a + b, 0) / n;
      // Empirical distribution plug-in variance uses 1/n
      let m2 = 0;
      let m3 = 0;
      for (const x of s) {
        const d = x - mean;
        m2 += (d * d) / n;
        m3 += (d * d * d) / n;
      }
      const sd = Math.sqrt(m2);
      return { mean, variance: m2, sd, skewness: sd > 1e-12 ? m3 / Math.pow(sd, 3) : 0 };
    },
    pmf(k, params) {
      const s = this.parseSample(params);
      let count = 0;
      for (const x of s) {
        if (Math.abs(x - k) < 1e-9) count++;
      }
      return count / s.length;
    },
    cdf(x, params) {
      const s = this.parseSample(params);
      let count = 0;
      for (const v of s) {
        if (v <= x + 1e-12) count++;
      }
      return count / s.length;
    },
    quantile(q, params) {
      if (q < 0 || q > 1) return NaN;
      const s = this.parseSample(params);
      if (q === 0) return s[0];
      const idx = Math.min(s.length - 1, Math.max(0, Math.ceil(q * s.length - EPSILON) - 1));
      return s[idx];
    },
    sample(params, prng) {
      const s = this.parseSample(params);
      return s[prng.nextInt(0, s.length - 1)];
    }
  },

  // =========================================================================
  // CONTINUOUS DISTRIBUTIONS (10)
  // =========================================================================
  continuous_uniform: {
    id: "continuous_uniform",
    name: "Continuous Uniform",
    type: "continuous",
    notation: "Unif(a, b)",
    parameterizationNote: "Constant density $f(x) = \\frac{1}{b-a}$ on $[a, b]$, with $E[X] = \\frac{a+b}{2}$ and $\\text{Var}(X) = \\frac{(b-a)^2}{12}$.",
    parameters: [
      { key: "a", label: "Lower Bound (a)", min: -20, max: 20, step: 0.5, default: 0 },
      { key: "b", label: "Upper Bound (b)", min: -19, max: 50, step: 0.5, default: 10 }
    ],
    validate(params) {
      const a = Number(params.a);
      const b = Number(params.b);
      if (!Number.isFinite(a) || !Number.isFinite(b) || b <= a) {
        return { valid: false, reason: "Require upper bound b > lower bound a." };
      }
      return { valid: true };
    },
    support(params) {
      const a = Number(params.a);
      const b = Number(params.b);
      const pad = 0.1 * (b - a);
      return { min: a, max: b, plotMin: a - pad, plotMax: b + pad };
    },
    moments(params) {
      const a = Number(params.a);
      const b = Number(params.b);
      const mean = 0.5 * (a + b);
      const variance = Math.pow(b - a, 2) / 12;
      return { mean, variance, sd: Math.sqrt(variance), skewness: 0 };
    },
    pdf(x, params) {
      const a = Number(params.a);
      const b = Number(params.b);
      return x >= a && x <= b ? 1 / (b - a) : 0;
    },
    cdf(x, params) {
      const a = Number(params.a);
      const b = Number(params.b);
      if (x <= a) return 0;
      if (x >= b) return 1;
      return (x - a) / (b - a);
    },
    quantile(q, params) {
      if (q < 0 || q > 1) return NaN;
      const a = Number(params.a);
      const b = Number(params.b);
      return a + q * (b - a);
    },
    sample(params, prng) {
      const a = Number(params.a);
      const b = Number(params.b);
      return a + prng.nextFloat() * (b - a);
    }
  },

  normal: {
    id: "normal",
    name: "Normal (Gaussian)",
    type: "continuous",
    notation: "N(μ, σ²)",
    parameterizationNote: "Parameterized by mean $\\mu$ and standard deviation $\\sigma > 0$ (variance $\\sigma^2$), density $f(x) = \\frac{1}{\\sigma\\sqrt{2\\pi}} e^{-(x-\\mu)^2/(2\\sigma^2)}$.",
    parameters: [
      { key: "mu", label: "Mean (μ)", min: -50, max: 50, step: 0.5, default: 0 },
      { key: "sigma", label: "Standard Deviation (σ)", min: 0.1, max: 25, step: 0.1, default: 1 }
    ],
    validate(params) {
      const mu = Number(params.mu);
      const sigma = Number(params.sigma);
      if (!Number.isFinite(mu) || !Number.isFinite(sigma) || sigma <= 0) {
        return { valid: false, reason: "Standard deviation sigma must be > 0." };
      }
      return { valid: true };
    },
    support(params) {
      const mu = Number(params.mu);
      const sigma = Number(params.sigma);
      return { min: -Infinity, max: Infinity, plotMin: mu - 4.2 * sigma, plotMax: mu + 4.2 * sigma };
    },
    moments(params) {
      const mu = Number(params.mu);
      const sigma = Number(params.sigma);
      return { mean: mu, variance: sigma * sigma, sd: sigma, skewness: 0 };
    },
    pdf(x, params) {
      return normalPDF(x, Number(params.mu), Number(params.sigma));
    },
    cdf(x, params) {
      return normalCDF(x, Number(params.mu), Number(params.sigma));
    },
    quantile(q, params) {
      return inverseNormalCDF(q, Number(params.mu), Number(params.sigma));
    },
    sample(params, prng) {
      return Number(params.mu) + Number(params.sigma) * prng.nextStandardNormal();
    }
  },

  student_t: {
    id: "student_t",
    name: "Student's t",
    type: "continuous",
    notation: "t(ν)",
    parameterizationNote: "Symmetric heavy-tailed family with df $\\nu > 0$. Mean $0$ ($\\nu > 1$); variance $\\frac{\\nu}{\\nu - 2}$ ($\\nu > 2$, infinite for $1 < \\nu \\le 2$).",
    parameters: [
      { key: "df", label: "Degrees of Freedom (ν)", min: 1, max: 100, step: 0.5, default: 5 }
    ],
    validate(params) {
      const df = Number(params.df);
      if (!Number.isFinite(df) || df <= 0) return { valid: false, reason: "Degrees of freedom nu must be > 0." };
      return { valid: true };
    },
    support(params) {
      const df = Number(params.df);
      const span = df < 3 ? 8 : 4.5;
      return { min: -Infinity, max: Infinity, plotMin: -span, plotMax: span };
    },
    moments(params) {
      const df = Number(params.df);
      const mean = df > 1 ? 0 : NaN;
      const variance = df > 2 ? df / (df - 2) : (df > 1 ? Infinity : NaN);
      const sd = Number.isFinite(variance) ? Math.sqrt(variance) : variance;
      const skewness = df > 3 ? 0 : NaN;
      return { mean, variance, sd, skewness };
    },
    pdf(x, params) {
      return studentTPDF(x, Number(params.df));
    },
    cdf(x, params) {
      return studentTCDF(x, Number(params.df));
    },
    quantile(q, params) {
      return studentTQuantile(q, Number(params.df));
    },
    sample(params, prng) {
      const df = Number(params.df);
      const z = prng.nextStandardNormal();
      const v = 2.0 * sampleStandardGamma(df / 2.0, prng);
      return z / Math.sqrt(v / df);
    }
  },

  exponential: {
    id: "exponential",
    name: "Exponential",
    type: "continuous",
    notation: "Exp(λ)",
    parameterizationNote: "Rate parameterization ($\\lambda > 0$): $f(x) = \\lambda e^{-\\lambda x}$ for $x \\ge 0$, with $E[X] = \\frac{1}{\\lambda}$ and $\\text{SD}(X) = \\frac{1}{\\lambda}$.",
    parameters: [
      { key: "lambda", label: "Rate Parameter (λ)", min: 0.1, max: 10, step: 0.1, default: 1.0 }
    ],
    validate(params) {
      const lambda = Number(params.lambda);
      if (!Number.isFinite(lambda) || lambda <= 0) return { valid: false, reason: "Rate lambda must be > 0." };
      return { valid: true };
    },
    support(params) {
      const lambda = Number(params.lambda);
      return { min: 0, max: Infinity, plotMin: 0, plotMax: 6 / lambda };
    },
    moments(params) {
      const lambda = Number(params.lambda);
      return {
        mean: 1 / lambda,
        variance: 1 / (lambda * lambda),
        sd: 1 / lambda,
        skewness: 2
      };
    },
    pdf(x, params) {
      const lambda = Number(params.lambda);
      return x < 0 ? 0 : lambda * Math.exp(-lambda * x);
    },
    cdf(x, params) {
      const lambda = Number(params.lambda);
      return x <= 0 ? 0 : 1 - Math.exp(-lambda * x);
    },
    quantile(q, params) {
      if (q < 0 || q > 1) return NaN;
      if (q === 0) return 0;
      if (q === 1) return Infinity;
      return -Math.log(1 - q) / Number(params.lambda);
    },
    sample(params, prng) {
      return -Math.log(prng.nextOpenFloat()) / Number(params.lambda);
    }
  },

  gamma: {
    id: "gamma",
    name: "Gamma",
    type: "continuous",
    notation: "Gamma(α, θ)",
    parameterizationNote: "Shape $\\alpha > 0$ and scale $\\theta > 0$ (rate $\\beta = 1/\\theta$): $f(x) = \\frac{x^{\\alpha-1} e^{-x/\\theta}}{\\Gamma(\\alpha)\\theta^\\alpha}$, $E[X] = \\alpha\\theta$, $\\text{Var}(X) = \\alpha\\theta^2$.",
    parameters: [
      { key: "shape", label: "Shape (α)", min: 0.5, max: 25, step: 0.25, default: 3.0 },
      { key: "scale", label: "Scale (θ = 1/rate)", min: 0.2, max: 10, step: 0.1, default: 1.5 }
    ],
    validate(params) {
      const shape = Number(params.shape);
      const scale = Number(params.scale);
      if (!Number.isFinite(shape) || shape <= 0 || !Number.isFinite(scale) || scale <= 0) {
        return { valid: false, reason: "Shape alpha and scale theta must both be > 0." };
      }
      return { valid: true };
    },
    support(params) {
      const { mean, sd } = this.moments(params);
      return { min: 0, max: Infinity, plotMin: 0, plotMax: Math.max(5, mean + 4.5 * sd) };
    },
    moments(params) {
      const shape = Number(params.shape);
      const scale = Number(params.scale);
      const mean = shape * scale;
      const variance = shape * scale * scale;
      return {
        mean,
        variance,
        sd: Math.sqrt(variance),
        skewness: 2 / Math.sqrt(shape)
      };
    },
    pdf(x, params) {
      if (x < 0) return 0;
      const shape = Number(params.shape);
      const scale = Number(params.scale);
      if (x === 0) return shape < 1 ? Infinity : (shape === 1 ? 1 / scale : 0);
      return Math.exp((shape - 1) * Math.log(x) - x / scale - shape * Math.log(scale) - logGamma(shape));
    },
    cdf(x, params) {
      if (x <= 0) return 0;
      const shape = Number(params.shape);
      const scale = Number(params.scale);
      return regularizedGammaP(shape, x / scale);
    },
    quantile(q, params) {
      if (q < 0 || q > 1) return NaN;
      if (q === 0) return 0;
      if (q === 1) return Infinity;
      const shape = Number(params.shape);
      const scale = Number(params.scale);
      return (scale / 2) * chiSquareQuantile(q, 2 * shape);
    },
    sample(params, prng) {
      return Number(params.scale) * sampleStandardGamma(Number(params.shape), prng);
    }
  },

  beta: {
    id: "beta",
    name: "Beta",
    type: "continuous",
    notation: "Beta(α, β)",
    parameterizationNote: "Support $[0, 1]$ with shapes $\\alpha, \\beta > 0$: $f(x) = \\frac{x^{\\alpha-1}(1-x)^{\\beta-1}}{B(\\alpha,\\beta)}$, $E[X] = \\frac{\\alpha}{\\alpha+\\beta}$.",
    parameters: [
      { key: "alpha", label: "Shape 1 (α)", min: 0.5, max: 20, step: 0.25, default: 2.5 },
      { key: "beta", label: "Shape 2 (β)", min: 0.5, max: 20, step: 0.25, default: 5.0 }
    ],
    validate(params) {
      const a = Number(params.alpha);
      const b = Number(params.beta);
      if (!Number.isFinite(a) || a <= 0 || !Number.isFinite(b) || b <= 0) {
        return { valid: false, reason: "Shape parameters alpha and beta must be > 0." };
      }
      return { valid: true };
    },
    support() {
      return { min: 0, max: 1, plotMin: 0, plotMax: 1 };
    },
    moments(params) {
      const a = Number(params.alpha);
      const b = Number(params.beta);
      const s = a + b;
      const mean = a / s;
      const variance = (a * b) / (s * s * (s + 1));
      const sd = Math.sqrt(variance);
      const skewness = (2 * (b - a) * Math.sqrt(s + 1)) / ((s + 2) * Math.sqrt(a * b));
      return { mean, variance, sd, skewness };
    },
    pdf(x, params) {
      if (x < 0 || x > 1) return 0;
      const a = Number(params.alpha);
      const b = Number(params.beta);
      if (x === 0) return a < 1 ? Infinity : (a === 1 ? b : 0);
      if (x === 1) return b < 1 ? Infinity : (b === 1 ? a : 0);
      return Math.exp((a - 1) * Math.log(x) + (b - 1) * Math.log(1 - x) - logBeta(a, b));
    },
    cdf(x, params) {
      if (x <= 0) return 0;
      if (x >= 1) return 1;
      return regularizedBeta(x, Number(params.alpha), Number(params.beta));
    },
    quantile(q, params) {
      if (q < 0 || q > 1) return NaN;
      if (q === 0) return 0;
      if (q === 1) return 1;
      const a = Number(params.alpha);
      const b = Number(params.beta);
      return invertContinuousCDF(
        q,
        (x) => regularizedBeta(x, a, b),
        (x) => this.pdf(x, params),
        0,
        1,
        a / (a + b)
      );
    },
    sample(params, prng) {
      const g1 = sampleStandardGamma(Number(params.alpha), prng);
      const g2 = sampleStandardGamma(Number(params.beta), prng);
      return g1 + g2 > 0 ? g1 / (g1 + g2) : 0.5;
    }
  },

  chi_square: {
    id: "chi_square",
    name: "Chi-Square",
    type: "continuous",
    notation: "χ²(k)",
    parameterizationNote: "Sum of $k$ squared standard normals $\\sum_{i=1}^k Z_i^2 \\sim \\text{Gamma}(k/2, 2)$, with $E[X] = k$ and $\\text{Var}(X) = 2k$.",
    parameters: [
      { key: "k", label: "Degrees of Freedom (k)", min: 1, max: 50, step: 1, default: 6 }
    ],
    validate(params) {
      const k = Number(params.k);
      if (!Number.isFinite(k) || k <= 0) return { valid: false, reason: "Degrees of freedom k must be > 0." };
      return { valid: true };
    },
    support(params) {
      const k = Number(params.k);
      return { min: 0, max: Infinity, plotMin: 0, plotMax: Math.max(12, k + 4.5 * Math.sqrt(2 * k)) };
    },
    moments(params) {
      const k = Number(params.k);
      return {
        mean: k,
        variance: 2 * k,
        sd: Math.sqrt(2 * k),
        skewness: Math.sqrt(8 / k)
      };
    },
    pdf(x, params) {
      return chiSquarePDF(x, Number(params.k));
    },
    cdf(x, params) {
      return chiSquareCDF(x, Number(params.k));
    },
    quantile(q, params) {
      return chiSquareQuantile(q, Number(params.k));
    },
    sample(params, prng) {
      return 2.0 * sampleStandardGamma(Number(params.k) / 2.0, prng);
    }
  },

  f_distribution: {
    id: "f_distribution",
    name: "Snedecor's F",
    type: "continuous",
    notation: "F(d₁, d₂)",
    parameterizationNote: "Ratio $F = \\frac{\\chi^2_{d_1}/d_1}{\\chi^2_{d_2}/d_2}$ with numerator df $d_1$ and denominator df $d_2$; $E[X] = \\frac{d_2}{d_2-2}$ for $d_2 > 2$.",
    parameters: [
      { key: "d1", label: "Numerator df (d₁)", min: 1, max: 60, step: 1, default: 5 },
      { key: "d2", label: "Denominator df (d₂)", min: 1, max: 100, step: 1, default: 20 }
    ],
    validate(params) {
      const d1 = Number(params.d1);
      const d2 = Number(params.d2);
      if (!Number.isFinite(d1) || d1 <= 0 || !Number.isFinite(d2) || d2 <= 0) {
        return { valid: false, reason: "Degrees of freedom d1 and d2 must be > 0." };
      }
      return { valid: true };
    },
    support(params) {
      const d2 = Number(params.d2);
      const maxPlot = d2 > 4 ? Math.min(15, Math.max(5, this.quantile(0.99, params))) : 8;
      return { min: 0, max: Infinity, plotMin: 0, plotMax: maxPlot };
    },
    moments(params) {
      const d1 = Number(params.d1);
      const d2 = Number(params.d2);
      const mean = d2 > 2 ? d2 / (d2 - 2) : NaN;
      const variance = d2 > 4
        ? (2 * d2 * d2 * (d1 + d2 - 2)) / (d1 * Math.pow(d2 - 2, 2) * (d2 - 4))
        : (d2 > 2 ? Infinity : NaN);
      const sd = Number.isFinite(variance) ? Math.sqrt(variance) : variance;
      const skewness = d2 > 6
        ? ((2 * d1 + d2 - 2) * Math.sqrt(8 * (d2 - 4))) / ((d2 - 6) * Math.sqrt(d1 * (d1 + d2 - 2)))
        : NaN;
      return { mean, variance, sd, skewness };
    },
    pdf(x, params) {
      return fDistPDF(x, Number(params.d1), Number(params.d2));
    },
    cdf(x, params) {
      return fDistCDF(x, Number(params.d1), Number(params.d2));
    },
    quantile(q, params) {
      return fDistQuantile(q, Number(params.d1), Number(params.d2));
    },
    sample(params, prng) {
      const d1 = Number(params.d1);
      const d2 = Number(params.d2);
      const u1 = (2.0 * sampleStandardGamma(d1 / 2.0, prng)) / d1;
      const u2 = (2.0 * sampleStandardGamma(d2 / 2.0, prng)) / d2;
      return u2 > 0 ? u1 / u2 : 0;
    }
  },

  lognormal: {
    id: "lognormal",
    name: "Lognormal",
    type: "continuous",
    notation: "Lognormal(μ_log, σ_log)",
    parameterizationNote: "Where $\\ln(X) \\sim \\mathcal{N}(\\mu_{\\log}, \\sigma_{\\log}^2)$ on $(0, \\infty)$, with $E[X] = e^{\\mu_{\\log} + \\sigma_{\\log}^2/2}$.",
    parameters: [
      { key: "muLog", label: "Log-Mean (μ_log)", min: -3, max: 3, step: 0.1, default: 0.5 },
      { key: "sigmaLog", label: "Log-SD (σ_log)", min: 0.1, max: 1.5, step: 0.05, default: 0.6 }
    ],
    validate(params) {
      const muLog = Number(params.muLog);
      const sigmaLog = Number(params.sigmaLog);
      if (!Number.isFinite(muLog) || !Number.isFinite(sigmaLog) || sigmaLog <= 0) {
        return { valid: false, reason: "Log-SD sigma_log must be > 0." };
      }
      return { valid: true };
    },
    support(params) {
      const q99 = this.quantile(0.985, params);
      return { min: 0, max: Infinity, plotMin: 0, plotMax: Math.min(200, Math.max(5, q99)) };
    },
    moments(params) {
      const mu = Number(params.muLog);
      const s = Number(params.sigmaLog);
      const s2 = s * s;
      const mean = Math.exp(mu + 0.5 * s2);
      const variance = (Math.exp(s2) - 1) * Math.exp(2 * mu + s2);
      const sd = Math.sqrt(variance);
      const skewness = (Math.exp(s2) + 2) * Math.sqrt(Math.exp(s2) - 1);
      return { mean, variance, sd, skewness };
    },
    pdf(x, params) {
      if (x <= 0) return 0;
      const mu = Number(params.muLog);
      const s = Number(params.sigmaLog);
      const z = (Math.log(x) - mu) / s;
      return Math.exp(-0.5 * z * z) / (x * s * Math.sqrt(2 * Math.PI));
    },
    cdf(x, params) {
      if (x <= 0) return 0;
      return normalCDF(Math.log(x), Number(params.muLog), Number(params.sigmaLog));
    },
    quantile(q, params) {
      if (q < 0 || q > 1) return NaN;
      if (q === 0) return 0;
      if (q === 1) return Infinity;
      return Math.exp(inverseNormalCDF(q, Number(params.muLog), Number(params.sigmaLog)));
    },
    sample(params, prng) {
      const z = prng.nextStandardNormal();
      return Math.exp(Number(params.muLog) + Number(params.sigmaLog) * z);
    }
  },

  gaussian_mixture: {
    id: "gaussian_mixture",
    name: "Gaussian Mixture (Bimodal)",
    type: "continuous",
    notation: "w·N(μ₁, σ₁²) + (1−w)·N(μ₂, σ₂²)",
    parameterizationNote: "Bimodal mixture $f(x) = w\\\,\\phi(x;\\mu_1,\\sigma_1^2) + (1-w)\\\,\\phi(x;\\mu_2,\\sigma_2^2)$ illustrating multimodality.",
    parameters: [
      { key: "w", label: "Component 1 Weight (w)", min: 0.05, max: 0.95, step: 0.05, default: 0.6 },
      { key: "mu1", label: "Mean 1 (μ₁)", min: -10, max: 10, step: 0.5, default: -2.0 },
      { key: "sigma1", label: "SD 1 (σ₁)", min: 0.2, max: 5, step: 0.1, default: 0.9 },
      { key: "mu2", label: "Mean 2 (μ₂)", min: -10, max: 10, step: 0.5, default: 2.5 },
      { key: "sigma2", label: "SD 2 (σ₂)", min: 0.2, max: 5, step: 0.1, default: 1.1 }
    ],
    validate(params) {
      const w = Number(params.w);
      const s1 = Number(params.sigma1);
      const s2 = Number(params.sigma2);
      if (w < 0 || w > 1 || s1 <= 0 || s2 <= 0) {
        return { valid: false, reason: "Weight w must be in [0, 1] and component SDs must be > 0." };
      }
      return { valid: true };
    },
    support(params) {
      const mu1 = Number(params.mu1);
      const s1 = Number(params.sigma1);
      const mu2 = Number(params.mu2);
      const s2 = Number(params.sigma2);
      const plotMin = Math.min(mu1 - 4 * s1, mu2 - 4 * s2);
      const plotMax = Math.max(mu1 + 4 * s1, mu2 + 4 * s2);
      return { min: -Infinity, max: Infinity, plotMin, plotMax };
    },
    moments(params) {
      const w = Number(params.w);
      const mu1 = Number(params.mu1);
      const s1 = Number(params.sigma1);
      const mu2 = Number(params.mu2);
      const s2 = Number(params.sigma2);
      const mean = w * mu1 + (1 - w) * mu2;
      const variance = w * (s1 * s1 + Math.pow(mu1 - mean, 2)) + (1 - w) * (s2 * s2 + Math.pow(mu2 - mean, 2));
      const sd = Math.sqrt(variance);
      const m3 = w * (Math.pow(mu1 - mean, 3) + 3 * (mu1 - mean) * s1 * s1) +
                 (1 - w) * (Math.pow(mu2 - mean, 3) + 3 * (mu2 - mean) * s2 * s2);
      const skewness = sd > 0 ? m3 / Math.pow(sd, 3) : 0;
      return { mean, variance, sd, skewness };
    },
    pdf(x, params) {
      const w = Number(params.w);
      return w * normalPDF(x, Number(params.mu1), Number(params.sigma1)) +
             (1 - w) * normalPDF(x, Number(params.mu2), Number(params.sigma2));
    },
    cdf(x, params) {
      const w = Number(params.w);
      return w * normalCDF(x, Number(params.mu1), Number(params.sigma1)) +
             (1 - w) * normalCDF(x, Number(params.mu2), Number(params.sigma2));
    },
    quantile(q, params) {
      if (q < 0 || q > 1) return NaN;
      if (q === 0) return -Infinity;
      if (q === 1) return Infinity;
      const { plotMin, plotMax } = this.support(params);
      const { mean } = this.moments(params);
      return invertContinuousCDF(
        q,
        (x) => this.cdf(x, params),
        (x) => this.pdf(x, params),
        plotMin - 10,
        plotMax + 10,
        mean
      );
    },
    sample(params, prng) {
      const w = Number(params.w);
      if (prng.nextFloat() < w) {
        return Number(params.mu1) + Number(params.sigma1) * prng.nextStandardNormal();
      }
      return Number(params.mu2) + Number(params.sigma2) * prng.nextStandardNormal();
    }
  }
};

/**
 * Helper to retrieve a distribution definition by ID.
 */
export function getDistribution(distId) {
  return DISTRIBUTION_FAMILIES[distId] || DISTRIBUTION_FAMILIES.normal;
}

/**
 * Computes interval and tail probabilities for any distribution family.
 */
export function computeDistributionProbabilities(distId, params, a, b) {
  const dist = getDistribution(distId);
  const val = dist.validate(params);
  if (!val.valid) return { valid: false, reason: val.reason };

  const xLow = Math.min(a, b);
  const xHigh = Math.max(a, b);

  if (dist.type === "discrete") {
    const leftTail = dist.cdf(xLow, params);
    const rightTail = 1 - dist.cdf(xLow - 1e-9, params);
    const intervalProb = Math.max(0, dist.cdf(xHigh, params) - dist.cdf(xLow - 1e-9, params));
    const exactAtA = dist.pmf(Math.round(xLow), params);
    return {
      valid: true,
      isDiscrete: true,
      leftTail,      // P(X <= a)
      rightTail,     // P(X >= a)
      intervalProb,  // P(a <= X <= b)
      exactAtA       // P(X = a)
    };
  } else {
    const leftTail = dist.cdf(xLow, params);
    const rightTail = 1 - leftTail;
    const intervalProb = Math.max(0, dist.cdf(xHigh, params) - dist.cdf(xLow, params));
    const densityAtA = dist.pdf(xLow, params);
    return {
      valid: true,
      isDiscrete: false,
      leftTail,      // P(X <= a)
      rightTail,     // P(X >= a)
      intervalProb,  // P(a <= X <= b)
      densityAtA     // f(a) - density height, NOT probability!
    };
  }
}
