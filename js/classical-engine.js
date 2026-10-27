/**
 * ResampleLab — Classical Analytical Inference Counterparts
 *
 * Implements validated closed-form classical statistical inference methods
 * for side-by-side comparison with resampling procedures:
 * - One-sample t interval & test
 * - Welch two-sample t interval & test (with Satterthwaite df)
 * - Pooled two-sample t interval & test
 * - Paired t interval & test
 * - One-proportion Wald & Wilson score intervals + exact/normal test
 * - Two-proportion Wald & pooled z-test
 * - Pearson correlation t-test & Fisher z confidence interval
 * - Simple Linear Regression slope t-test & confidence interval
 * - One-way ANOVA F-test
 * - Contingency table Chi-Square test of independence
 *
 * @module classical-engine
 * @version 1.0.0
 */

import {
  normalCDF,
  inverseNormalCDF,
  studentTCDF,
  studentTQuantile,
  chiSquareCDF,
  fDistCDF
} from "./distributions.js";

import {
  mean,
  variance,
  standardDeviation,
  proportion,
  computeBivariateStats,
  computeOneWayAnova,
  computeContingencyChiSquare
} from "./stats-core.js";

/**
 * Computes directional or two-sided p-value from a symmetric CDF (Normal or Student-t).
 * @param {number} stat
 * @param {(x: number) => number} cdfFn
 * @param {"two-sided"|"greater"|"less"} alternative
 * @returns {number}
 */
function directionalPValueSymmetric(stat, cdfFn, alternative = "two-sided") {
  if (!Number.isFinite(stat)) return NaN;
  if (alternative === "greater") {
    return 1 - cdfFn(stat);
  }
  if (alternative === "less") {
    return cdfFn(stat);
  }
  return 2 * (1 - cdfFn(Math.abs(stat)));
}

/**
 * One-Sample Student-t Confidence Interval and Hypothesis Test.
 */
export function classicalOneSampleT(data, options = {}) {
  const confLevel = Number(options.confLevel ?? 0.95);
  const nullValue = Number(options.nullValue ?? 0);
  const alternative = options.alternative || "two-sided";
  const n = data.length;
  if (n < 2) {
    return { valid: false, reason: "One-sample t inference requires n >= 2." };
  }
  const xBar = mean(data);
  const s = standardDeviation(data);
  const se = s / Math.sqrt(n);
  const df = n - 1;
  const alpha = 1 - confLevel;
  const tCrit = studentTQuantile(1 - alpha / 2, df);
  const ci = [xBar - tCrit * se, xBar + tCrit * se];
  const tStat = se > 1e-12 ? (xBar - nullValue) / se : 0;
  const pValue = directionalPValueSymmetric(tStat, (x) => studentTCDF(x, df), alternative);

  return {
    valid: true,
    methodName: "One-Sample Student's t Procedure",
    estimand: "Population Mean (μ)",
    estimate: xBar,
    se,
    df,
    testStatisticName: "t",
    testStatistic: tStat,
    criticalValue: tCrit,
    confLevel,
    ci,
    nullValue,
    alternative,
    pValue,
    assumptions: [
      "i.i.d. random sample (or SRSWOR with $n < 0.10N$).",
      "Approximate normality or $n \\ge 30$ without extreme skewness (CLT)."
    ]
  };
}

/**
 * Welch Two-Sample t Confidence Interval and Test (unequal variances default).
 */
export function classicalWelchTwoSampleT(group1, group2, options = {}) {
  const confLevel = Number(options.confLevel ?? 0.95);
  const nullValue = Number(options.nullValue ?? 0);
  const alternative = options.alternative || "two-sided";
  const n1 = group1.length;
  const n2 = group2.length;
  if (n1 < 2 || n2 < 2) {
    return { valid: false, reason: "Welch two-sample t procedure requires at least 2 observations per group." };
  }
  const m1 = mean(group1);
  const m2 = mean(group2);
  const v1 = variance(group1);
  const v2 = variance(group2);
  const diff = m1 - m2;
  const se1Sq = v1 / n1;
  const se2Sq = v2 / n2;
  const se = Math.sqrt(se1Sq + se2Sq);

  // Welch-Satterthwaite degrees of freedom
  const dfNum = Math.pow(se1Sq + se2Sq, 2);
  const dfDen = (se1Sq * se1Sq) / (n1 - 1) + (se2Sq * se2Sq) / (n2 - 1);
  const df = dfDen > 1e-15 ? dfNum / dfDen : (n1 + n2 - 2);

  const alpha = 1 - confLevel;
  const tCrit = studentTQuantile(1 - alpha / 2, df);
  const ci = [diff - tCrit * se, diff + tCrit * se];
  const tStat = se > 1e-12 ? (diff - nullValue) / se : 0;
  const pValue = directionalPValueSymmetric(tStat, (x) => studentTCDF(x, df), alternative);

  return {
    valid: true,
    methodName: "Welch Two-Sample t Procedure (Satterthwaite df)",
    estimand: "Difference in Means (μ₁ − μ₂)",
    estimate: diff,
    se,
    df,
    testStatisticName: "t_W",
    testStatistic: tStat,
    criticalValue: tCrit,
    confLevel,
    ci,
    nullValue,
    alternative,
    pValue,
    assumptions: [
      "Mutually independent groups.",
      "Approximate normality or $n_1, n_2 \\ge 30$.",
      "Allows unequal variances ($\\sigma_1^2 \\ne \\sigma_2^2$)."
    ]
  };
}

/**
 * Paired Student-t Confidence Interval and Test on within-pair differences d_i = x_i - y_i.
 */
export function classicalPairedT(pairs, options = {}) {
  const diffs = pairs.map((p) => (typeof p === "number" ? p : p.x - p.y));
  const res = classicalOneSampleT(diffs, options);
  if (!res.valid) return res;
  return {
    ...res,
    methodName: "Paired-Differences Student's t Procedure",
    estimand: "Mean Paired Difference (μ_d = E[X − Y])",
    testStatisticName: "t_d",
    assumptions: [
      "Independent paired units $(X_i, Y_i)$.",
      "Paired differences $d_i = X_i - Y_i$ approximately normal (or $n \\ge 30$)."
    ]
  };
}

/**
 * One-Proportion Classical Inference: Wilson Score CI, Wald CI, and Normal z-test.
 */
export function classicalOneProportion(data, options = {}) {
  const confLevel = Number(options.confLevel ?? 0.95);
  const nullValue = Number(options.nullValue ?? 0.5);
  const alternative = options.alternative || "two-sided";
  const n = data.length;
  if (n < 2) return { valid: false, reason: "One-proportion inference requires n >= 2." };

  const pHat = proportion(data);
  const k = Math.round(pHat * n);
  const alpha = 1 - confLevel;
  const zCrit = inverseNormalCDF(1 - alpha / 2);

  // Wald SE and interval
  const seWald = Math.sqrt((pHat * (1 - pHat)) / n);
  const ciWald = [Math.max(0, pHat - zCrit * seWald), Math.min(1, pHat + zCrit * seWald)];

  // Wilson Score Interval (preferred in statistical standards)
  const z2 = zCrit * zCrit;
  const denom = 1 + z2 / n;
  const center = (pHat + z2 / (2 * n)) / denom;
  const halfWidth = (zCrit * Math.sqrt((pHat * (1 - pHat)) / n + z2 / (4 * n * n))) / denom;
  const ciWilson = [Math.max(0, center - halfWidth), Math.min(1, center + halfWidth)];

  // Null SE for hypothesis test
  const seNull = Math.sqrt((nullValue * (1 - nullValue)) / n);
  const zStat = seNull > 1e-12 ? (pHat - nullValue) / seNull : 0;
  const pValue = directionalPValueSymmetric(zStat, (z) => normalCDF(z), alternative);

  return {
    valid: true,
    methodName: "One-Sample Proportion (Wilson Score CI & Normal z-Test)",
    estimand: "Population Proportion (p)",
    estimate: pHat,
    successes: k,
    n,
    se: seWald,
    seNull,
    df: Infinity,
    testStatisticName: "z",
    testStatistic: zStat,
    criticalValue: zCrit,
    confLevel,
    ci: ciWilson,
    ciWald,
    ciWilson,
    nullValue,
    alternative,
    pValue,
    assumptions: [
      "Independent and identically distributed Bernoulli(p) trials.",
      `Success-failure counts $np_0 = ${(n * nullValue).toFixed(1)} \\ge 10$, $n(1-p_0) = ${(n * (1 - nullValue)).toFixed(1)} \\ge 10$.`,
      "Wilson score interval maintains reliable coverage near $p \\to 0, 1$."
    ]
  };
}

/**
 * Two-Proportion Classical Inference: Wald CI and Pooled z-Test for H_0: p_1 - p_2 = 0.
 */
export function classicalTwoProportions(group1, group2, options = {}) {
  const confLevel = Number(options.confLevel ?? 0.95);
  const nullValue = Number(options.nullValue ?? 0);
  const alternative = options.alternative || "two-sided";
  const n1 = group1.length;
  const n2 = group2.length;
  if (n1 < 2 || n2 < 2) {
    return { valid: false, reason: "Two-proportion inference requires at least 2 observations per group." };
  }
  const p1 = proportion(group1);
  const p2 = proportion(group2);
  const diff = p1 - p2;
  const alpha = 1 - confLevel;
  const zCrit = inverseNormalCDF(1 - alpha / 2);

  // Unpooled SE for confidence interval
  const seUnpooled = Math.sqrt((p1 * (1 - p1)) / n1 + (p2 * (1 - p2)) / n2);
  const ci = [Math.max(-1, diff - zCrit * seUnpooled), Math.min(1, diff + zCrit * seUnpooled)];

  // Pooled SE when testing H_0: p_1 - p_2 = 0
  const k1 = Math.round(p1 * n1);
  const k2 = Math.round(p2 * n2);
  const pPooled = (k1 + k2) / (n1 + n2);
  const seTest = Math.abs(nullValue) < 1e-12
    ? Math.sqrt(pPooled * (1 - pPooled) * (1 / n1 + 1 / n2))
    : seUnpooled;

  const zStat = seTest > 1e-12 ? (diff - nullValue) / seTest : 0;
  const pValue = directionalPValueSymmetric(zStat, (z) => normalCDF(z), alternative);

  return {
    valid: true,
    methodName: "Two-Proportion z Procedure (Unpooled CI / Pooled Null Test)",
    estimand: "Difference in Proportions (p₁ − p₂)",
    estimate: diff,
    p1,
    p2,
    pPooled,
    se: seUnpooled,
    seTest,
    df: Infinity,
    testStatisticName: "z",
    testStatistic: zStat,
    criticalValue: zCrit,
    confLevel,
    ci,
    nullValue,
    alternative,
    pValue,
    assumptions: [
      "Two mutually independent binomial samples.",
      "At least $5\\text{–}10$ successes and failures per group."
    ]
  };
}

/**
 * Classical Pearson Correlation Inference (t-test for H_0: rho = 0 and Fisher's z-transform CI).
 */
export function classicalCorrelation(pairs, options = {}) {
  const confLevel = Number(options.confLevel ?? 0.95);
  const alternative = options.alternative || "two-sided";
  const x = pairs.map((p) => p.x);
  const y = pairs.map((p) => p.y);
  const biv = computeBivariateStats(x, y);
  if (!biv.valid || biv.n < 4) {
    return { valid: false, reason: biv.reason || "Correlation inference requires n >= 4 complete pairs." };
  }
  const n = biv.n;
  const r = biv.r;
  const df = n - 2;
  const seR = Math.sqrt(Math.max(0, 1 - r * r) / df);
  const tStat = seR > 1e-12 ? r / seR : (r > 0 ? Infinity : -Infinity);
  const pValue = directionalPValueSymmetric(tStat, (val) => studentTCDF(val, df), alternative);

  // Fisher z-transformation for CI: z_r = 0.5 * ln((1+r)/(1-r)) = atanh(r)
  const alpha = 1 - confLevel;
  const zCrit = inverseNormalCDF(1 - alpha / 2);
  const rClamped = Math.max(-0.99999, Math.min(0.99999, r));
  const fisherZ = 0.5 * Math.log((1 + rClamped) / (1 - rClamped));
  const seFisher = 1 / Math.sqrt(n - 3);
  const zLow = fisherZ - zCrit * seFisher;
  const zHigh = fisherZ + zCrit * seFisher;
  const ci = [Math.tanh(zLow), Math.tanh(zHigh)];

  return {
    valid: true,
    methodName: "Pearson Correlation t-Test & Fisher z-Transform CI",
    estimand: "Population Correlation (ρ)",
    estimate: r,
    se: seR,
    df,
    testStatisticName: "t",
    testStatistic: tStat,
    criticalValue: studentTQuantile(1 - alpha / 2, df),
    confLevel,
    ci,
    nullValue: 0,
    alternative,
    pValue,
    assumptions: [
      "Bivariate normality for Fisher $z = \\frac{1}{2}\\ln\\frac{1+r}{1-r}$ CI (or large $n$).",
      "Linear relationship without high-leverage outliers."
    ]
  };
}

/**
 * Classical Simple Linear Regression Slope Inference (OLS t-test and CI).
 */
export function classicalRegressionSlope(pairs, options = {}) {
  const confLevel = Number(options.confLevel ?? 0.95);
  const nullValue = Number(options.nullValue ?? 0);
  const alternative = options.alternative || "two-sided";
  const x = pairs.map((p) => p.x);
  const y = pairs.map((p) => p.y);
  const biv = computeBivariateStats(x, y);
  if (!biv.valid) return { valid: false, reason: biv.reason };

  const df = biv.n - 2;
  const alpha = 1 - confLevel;
  const tCrit = studentTQuantile(1 - alpha / 2, df);
  const ci = [biv.slope - tCrit * biv.seSlope, biv.slope + tCrit * biv.seSlope];
  const tStat = biv.seSlope > 1e-12 ? (biv.slope - nullValue) / biv.seSlope : 0;
  const pValue = directionalPValueSymmetric(tStat, (val) => studentTCDF(val, df), alternative);

  return {
    valid: true,
    methodName: "Ordinary Least Squares (OLS) Slope t-Procedure",
    estimand: "Regression Slope (β₁)",
    estimate: biv.slope,
    intercept: biv.intercept,
    rSquared: biv.r2,
    se: biv.seSlope,
    seResid: biv.seResid,
    df,
    testStatisticName: "t",
    testStatistic: tStat,
    criticalValue: tCrit,
    confLevel,
    ci,
    nullValue,
    alternative,
    pValue,
    assumptions: [
      "Linearity $E[Y \\mid X] = \\beta_0 + \\beta_1 X$.",
      "Independent errors.",
      "Normal residuals.",
      "Homoscedastic error variance $\\sigma^2$."
    ]
  };
}

/**
 * Classical One-Way ANOVA F-Test.
 */
export function classicalOneWayAnova(groups) {
  const res = computeOneWayAnova(groups);
  if (!res.valid) return res;
  const pValue = 1 - fDistCDF(res.fStat, res.dfBetween, res.dfWithin);
  return {
    valid: true,
    methodName: "Classical One-Way ANOVA F-Test",
    estimand: "Equal Group Means (H₀: μ₁ = … = μₖ)",
    estimate: res.fStat,
    etaSquared: res.etaSquared,
    dfBetween: res.dfBetween,
    dfWithin: res.dfWithin,
    msb: res.msb,
    msw: res.msw,
    testStatisticName: "F",
    testStatistic: res.fStat,
    pValue,
    assumptions: [
      "Independent observations within and across all k groups.",
      "Normal population distribution within each group.",
      "Equal group variances ($\\sigma_1^2 = \\dots = \\sigma_k^2$)."
    ]
  };
}

/**
 * Classical Chi-Square Test of Independence for Contingency Tables.
 */
export function classicalChiSquareIndependence(table) {
  const res = computeContingencyChiSquare(table);
  if (!res.valid) return res;
  const pValue = 1 - chiSquareCDF(res.chiSq, res.df);
  return {
    valid: true,
    methodName: "Pearson Chi-Square Test of Independence",
    estimand: "Row-by-Column Categorical Independence",
    estimate: res.chiSq,
    cramersV: res.cramersV,
    df: res.df,
    minExpected: res.minExpected,
    lowExpectedWarning: res.lowExpectedWarning,
    testStatisticName: "χ²",
    testStatistic: res.chiSq,
    pValue,
    assumptions: [
      "Independent observations classified into mutually exclusive cells.",
      `Expected counts $E_{rc} \\ge 5$ in $\\ge 80\\%$ of cells ($\\min E_{rc} = ${res.minExpected.toFixed(2)}$).`
    ]
  };
}
