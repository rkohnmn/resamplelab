/**
 * ResampleLab — Computational Inference, Resampling, Permutation, and Monte Carlo Engine
 *
 * Implements:
 * 1. Nonparametric Bootstrap Engine (univariate, two-group independent, paired, bivariate)
 * 2. Five Bootstrap Confidence Interval Methods:
 *    - Percentile Interval
 *    - Basic (Reverse-Percentile) Interval
 *    - Normal SE Bootstrap Interval
 *    - Studentized (Bootstrap-t) Interval (for eligible statistics with inner SE)
 *    - BCa (Bias-Corrected and Accelerated) Interval with Jackknife acceleration
 * 3. Permutation & Randomization Inference Engine:
 *    - Exact Enumeration (when C(N, n1) or 2^n is enumerable <= 4,000)
 *    - Monte Carlo Randomization with documented (b+1)/(B+1) and b/B p-value conventions
 *    - Group-label permutation, paired sign-flip, bivariate Y-shuffle, one-way ANOVA permutation,
 *      contingency table permutation (Patefield/marginal preserving shuffle), within-block permutation
 * 4. Experiment Simulator Engine:
 *    - Confidence Interval Coverage Simulator
 *    - Type I Error & Statistical Power Simulator
 *    - Optional Stopping / Repeated Peeking Simulator
 * 5. Simulation Unity ("One Dataset, Different Questions") Engine
 *
 * @module inference-engine
 * @version 1.0.0
 */

import { createPRNG, PRNG_VERSION } from "./prng.js";
import {
  normalCDF,
  inverseNormalCDF,
  studentTQuantile,
  getDistribution
} from "./distributions.js";
import {
  mean,
  standardDeviation,
  quantileSorted,
  summarizeUnivariate,
  STATISTIC_REGISTRY,
  sampleWithReplacement,
  sampleWithoutReplacement,
  finitePopulationCorrection
} from "./stats-core.js";
import {
  classicalOneSampleT,
  classicalWelchTwoSampleT,
  classicalPairedT,
  classicalOneProportion,
  classicalTwoProportions,
  classicalCorrelation,
  classicalRegressionSlope,
  classicalOneWayAnova,
  classicalChiSquareIndependence
} from "./classical-engine.js";

const EPSILON = 1e-12;

/**
 * Computes Jackknife leave-one-out estimates for BCa acceleration constant `a`.
 * For two-sample data, computes combined generalized jackknife acceleration.
 */
function computeJackknifeAcceleration(designType, dataPayload, statFn, originalEst) {
  if (designType === "one_numerical" || designType === "one_binary" || designType === "paired_numerical" || designType === "bivariate_numerical") {
    const arr = dataPayload;
    const n = arr.length;
    if (n < 3) return 0;
    const jackVals = [];
    for (let i = 0; i < n; i++) {
      const loo = arr.slice(0, i).concat(arr.slice(i + 1));
      const val = statFn(loo);
      if (Number.isFinite(val)) jackVals.push(val);
    }
    if (jackVals.length < 3) return 0;
    const jackMean = mean(jackVals);
    let num = 0;
    let den = 0;
    for (let i = 0; i < jackVals.length; i++) {
      const diff = jackMean - jackVals[i];
      num += diff * diff * diff;
      den += diff * diff;
    }
    if (den <= EPSILON) return 0;
    return num / (6 * Math.pow(den, 1.5));
  }

  if (designType === "two_independent_numerical" || designType === "two_independent_binary") {
    const { g1, g2 } = dataPayload;
    const n1 = g1.length;
    const n2 = g2.length;
    if (n1 < 3 || n2 < 3) return 0;
    const jack1 = [];
    for (let i = 0; i < n1; i++) {
      const loo1 = g1.slice(0, i).concat(g1.slice(i + 1));
      const v = statFn(loo1, g2);
      if (Number.isFinite(v)) jack1.push(v);
    }
    const jack2 = [];
    for (let j = 0; j < n2; j++) {
      const loo2 = g2.slice(0, j).concat(g2.slice(j + 1));
      const v = statFn(g1, loo2);
      if (Number.isFinite(v)) jack2.push(v);
    }
    const m1 = mean(jack1);
    const m2 = mean(jack2);
    let num = 0;
    let den = 0;
    for (const v of jack1) {
      const u = (n1 - 1) * (m1 - v);
      num += (u * u * u) / Math.pow(n1, 3);
      den += (u * u) / (n1 * n1);
    }
    for (const v of jack2) {
      const u = (n2 - 1) * (m2 - v);
      num += (u * u * u) / Math.pow(n2, 3);
      den += (u * u) / (n2 * n2);
    }
    if (den <= EPSILON) return 0;
    return num / (6 * Math.pow(den, 1.5));
  }

  return 0;
}

/**
 * Runs a complete Nonparametric Bootstrap analysis and computes all eligible
 * confidence interval procedures (Percentile, Basic, Normal SE, Bootstrap-t, BCa).
 *
 * @param {object} config
 * @returns {object} Versioned InferenceResult schema
 */
export function runBootstrapAnalysis(config) {
  const {
    statisticId = "mean",
    dataPayload,
    replicates = 2000,
    confLevel = 0.95,
    seed = 4289104,
    isDependentTimeSeries = false,
    datasetTitle = "Observed Sample"
  } = config;

  const statDef = STATISTIC_REGISTRY[statisticId] || STATISTIC_REGISTRY.mean;
  const designType = statDef.designType;
  const B = Math.max(50, Math.min(50000, Math.round(Number(replicates) || 2000)));
  const alpha = 1 - Math.max(0.5, Math.min(0.999, Number(confLevel) || 0.95));
  const prng = createPRNG(seed);

  const warnings = [];
  if (isDependentTimeSeries) {
    warnings.push({
      code: "DEPENDENT_DATA_IID_BOOTSTRAP",
      severity: "error",
      message: "Autocorrelated or time-series dependence detected. Ordinary i.i.d. case resampling destroys temporal dependence and yields invalid standard errors and intervals. Consider block bootstrap or time-series models."
    });
  }
  if (B < 1000) {
    warnings.push({
      code: "LOW_REPLICATE_COUNT",
      severity: "warning",
      message: `Bootstrap replicate count B = ${B} is below the recommended minimum of 1,000 for stable tail quantiles.`
    });
  }

  // Evaluate original point estimate and sample size check
  let originalEstimate = NaN;
  let originalSE = NaN;
  let sampleSizeSummary = "";
  let nEffective = 0;

  if (designType === "two_independent_numerical" || designType === "two_independent_binary") {
    const g1 = dataPayload.g1 || [];
    const g2 = dataPayload.g2 || [];
    nEffective = g1.length + g2.length;
    sampleSizeSummary = `n₁ = ${g1.length}, n₂ = ${g2.length}`;
    if (g1.length < statDef.minSampleSize || g2.length < statDef.minSampleSize) {
      return {
        valid: false,
        reason: `${statDef.name} requires at least ${statDef.minSampleSize} observations in each group.`
      };
    }
    if (g1.length < 10 || g2.length < 10) {
      warnings.push({
        code: "SMALL_SAMPLE_SIZE",
        severity: "warning",
        message: `Small group sample sizes (${sampleSizeSummary}) limit the discreetness of the empirical distribution and may reduce bootstrap coverage accuracy.`
      });
    }
    originalEstimate = statDef.compute(g1, g2);
    originalSE = statDef.analyticSE(g1, g2);
  } else {
    const arr = Array.isArray(dataPayload) ? dataPayload : [];
    nEffective = arr.length;
    sampleSizeSummary = `n = ${arr.length}`;
    if (arr.length < statDef.minSampleSize) {
      return {
        valid: false,
        reason: `${statDef.name} requires at least ${statDef.minSampleSize} valid observations.`
      };
    }
    if (arr.length < 12) {
      warnings.push({
        code: "SMALL_SAMPLE_SIZE",
        severity: "warning",
        message: `Small sample size (n = ${arr.length}) produces few distinct values in the empirical distribution; bootstrap intervals may under-cover.`
      });
    }
    originalEstimate = statDef.compute(arr);
    originalSE = statDef.analyticSE(arr);
  }

  if (!Number.isFinite(originalEstimate)) {
    return {
      valid: false,
      reason: `Original sample statistic (${statDef.name}) is undefined or degenerate on this dataset.`
    };
  }

  // Generate B bootstrap replicates
  const bootStats = [];
  const tizedStats = [];
  const exampleResamples = [];
  let invalidReplicateCount = 0;

  for (let b = 0; b < B; b++) {
    let thetaStar = NaN;
    let seStar = NaN;

    if (designType === "two_independent_numerical" || designType === "two_independent_binary") {
      const g1Star = sampleWithReplacement(dataPayload.g1, dataPayload.g1.length, prng);
      const g2Star = sampleWithReplacement(dataPayload.g2, dataPayload.g2.length, prng);
      thetaStar = statDef.compute(g1Star, g2Star);
      if (statDef.supportsBootstrapT) {
        seStar = statDef.analyticSE(g1Star, g2Star);
      }
      if (b < 5) {
        exampleResamples.push({ index: b + 1, stat: thetaStar, preview: g1Star.slice(0, 6) });
      }
    } else {
      const sampleStar = sampleWithReplacement(dataPayload, dataPayload.length, prng);
      thetaStar = statDef.compute(sampleStar);
      if (statDef.supportsBootstrapT) {
        seStar = statDef.analyticSE(sampleStar);
      }
      if (b < 5) {
        exampleResamples.push({
          index: b + 1,
          stat: thetaStar,
          preview: sampleStar.slice(0, 8).map((v) => (typeof v === "object" ? `(${v.x}, ${v.y})` : v))
        });
      }
    }

    if (Number.isFinite(thetaStar)) {
      bootStats.push(thetaStar);
      if (statDef.supportsBootstrapT && Number.isFinite(seStar) && seStar > EPSILON) {
        tizedStats.push((thetaStar - originalEstimate) / seStar);
      }
    } else {
      invalidReplicateCount++;
    }
  }

  if (invalidReplicateCount > 0) {
    warnings.push({
      code: "INVALID_REPLICATES_DETECTED",
      severity: invalidReplicateCount > 0.05 * B ? "error" : "warning",
      message: `${invalidReplicateCount} of ${B} bootstrap replicates (${((100 * invalidReplicateCount) / B).toFixed(1)}%) produced undefined statistics (e.g., zero variance in resample).`
    });
  }

  const validB = bootStats.length;
  if (validB < 30) {
    return {
      valid: false,
      reason: `Too few valid bootstrap replicates (${validB} of ${B}); dataset is nearly constant or degenerate.`
    };
  }

  const sortedBoot = bootStats.slice().sort((a, b) => a - b);
  const bootMean = mean(sortedBoot);
  const bootSE = standardDeviation(sortedBoot); // Uses 1 / (B - 1) per STATISTICAL_STANDARDS.md Section E.1
  const bootBias = bootMean - originalEstimate;
  const distSummary = summarizeUnivariate(sortedBoot);

  if (distSummary.isConstant || bootSE <= EPSILON) {
    warnings.push({
      code: "DEGENERATE_BOOTSTRAP_DISTRIBUTION",
      severity: "error",
      message: "Bootstrap distribution has zero spread (all resamples produced identical statistics). Confidence intervals cannot measure uncertainty on constant data."
    });
  }
  if (Math.abs(distSummary.skewness) > 0.75) {
    warnings.push({
      code: "STRONG_BOOTSTRAP_SKEWNESS",
      severity: "warning",
      message: `Bootstrap distribution exhibits notable skewness (${distSummary.skewness.toFixed(2)}). Normal-approximation intervals may be inaccurate; compare Percentile, BCa, and Studentized intervals.`
    });
  }

  // 1. Percentile Interval
  const qLow = alpha / 2;
  const qHigh = 1 - alpha / 2;
  const pctLow = quantileSorted(sortedBoot, qLow);
  const pctHigh = quantileSorted(sortedBoot, qHigh);

  // 2. Basic (Reverse-Percentile) Interval
  const basicLow = 2 * originalEstimate - pctHigh;
  const basicHigh = 2 * originalEstimate - pctLow;

  // 3. Normal Approximation Bootstrap Interval
  const zCrit = inverseNormalCDF(1 - alpha / 2);
  const normLow = originalEstimate - zCrit * bootSE;
  const normHigh = originalEstimate + zCrit * bootSE;

  const intervals = {
    percentile: {
      id: "percentile",
      name: "Percentile Bootstrap CI",
      eligible: true,
      ci: [pctLow, pctHigh],
      width: pctHigh - pctLow,
      center: 0.5 * (pctLow + pctHigh),
      formula: "[theta*_(alpha/2), theta*_(1 - alpha/2)]",
      notes: "Range-preserving and transformation-invariant; assumes an approximately unbiased estimator."
    },
    basic: {
      id: "basic",
      name: "Basic (Empirical / Reverse-Percentile) CI",
      eligible: true,
      ci: [basicLow, basicHigh],
      width: basicHigh - basicLow,
      center: 0.5 * (basicLow + basicHigh),
      formula: "[2*theta_hat - theta*_(1 - alpha/2), 2*theta_hat - theta*_(alpha/2)]",
      notes: "Pivotal reflection around point estimate; flips bootstrap tail asymmetry."
    },
    normal: {
      id: "normal",
      name: "Normal SE Bootstrap CI",
      eligible: true,
      ci: [normLow, normHigh],
      width: normHigh - normLow,
      center: originalEstimate,
      formula: "theta_hat +/- z_(1 - alpha/2) * SE_boot",
      notes: "Symmetric around point estimate; requires bootstrap distribution to be approximately normal with low bias."
    }
  };

  // 4. Studentized (Bootstrap-t) Interval
  if (statDef.supportsBootstrapT && Number.isFinite(originalSE) && originalSE > EPSILON && tizedStats.length >= 0.8 * validB) {
    const sortedT = tizedStats.slice().sort((a, b) => a - b);
    const tLow = quantileSorted(sortedT, qLow);
    const tHigh = quantileSorted(sortedT, qHigh);
    const studLow = originalEstimate - tHigh * originalSE;
    const studHigh = originalEstimate - tLow * originalSE;
    intervals.studentized = {
      id: "studentized",
      name: "Studentized (Bootstrap-t) CI",
      eligible: true,
      ci: [studLow, studHigh],
      width: studHigh - studLow,
      center: 0.5 * (studLow + studHigh),
      tQuantiles: [tLow, tHigh],
      formula: "[theta_hat - t*_(1 - alpha/2) * SE_hat, theta_hat - t*_(alpha/2) * SE_hat]",
      notes: "Second-order accurate for smooth location statistics; adjusts for skewness using replicate-specific standard errors."
    };
  } else {
    intervals.studentized = {
      id: "studentized",
      name: "Studentized (Bootstrap-t) CI",
      eligible: false,
      reason: "Requires a closed-form or nested replicate standard error estimator not supported for this statistic."
    };
  }

  // 5. BCa (Bias-Corrected and Accelerated) Interval
  if (statDef.supportsBCa && bootSE > EPSILON) {
    let countLess = 0;
    for (let i = 0; i < validB; i++) {
      if (sortedBoot[i] < originalEstimate) countLess++;
      else if (sortedBoot[i] === originalEstimate) countLess += 0.5;
    }
    const propLess = Math.max(1 / (validB + 1), Math.min(validB / (validB + 1), countLess / validB));
    const z0 = inverseNormalCDF(propLess);
    const acc = computeJackknifeAcceleration(designType, dataPayload, statDef.compute.bind(statDef), originalEstimate);

    const adjustProb = (zAlpha) => {
      const num = z0 + zAlpha;
      const den = 1 - acc * num;
      if (Math.abs(den) < 1e-9) return 0.5;
      return normalCDF(z0 + num / den);
    };

    const alpha1 = Math.max(0.0005, Math.min(0.9995, adjustProb(-zCrit)));
    const alpha2 = Math.max(0.0005, Math.min(0.9995, adjustProb(zCrit)));
    const bcaLow = quantileSorted(sortedBoot, Math.min(alpha1, alpha2));
    const bcaHigh = quantileSorted(sortedBoot, Math.max(alpha1, alpha2));

    intervals.bca = {
      id: "bca",
      name: "BCa (Bias-Corrected & Accelerated) CI",
      eligible: true,
      ci: [bcaLow, bcaHigh],
      width: bcaHigh - bcaLow,
      center: 0.5 * (bcaLow + bcaHigh),
      z0,
      acceleration: acc,
      adjustedQuantiles: [alpha1, alpha2],
      formula: "[theta*_(alpha_1), theta*_(alpha_2)] with bias z_0 and jackknife acceleration a",
      notes: `Second-order accurate ($z_0 = ${z0.toFixed(4)}, \\hat{a} = ${acc.toFixed(4)}$).`
    };
  } else {
    intervals.bca = {
      id: "bca",
      name: "BCa (Bias-Corrected & Accelerated) CI",
      eligible: false,
      reason: "Order statistics (such as IQR or raw quartiles) have degenerate jackknife influence functions; use Percentile CI."
    };
  }

  // Compute classical counterpart if available
  let classicalCounterpart = null;
  if (statisticId === "mean") {
    classicalCounterpart = classicalOneSampleT(dataPayload, { confLevel });
  } else if (statisticId === "proportion") {
    classicalCounterpart = classicalOneProportion(dataPayload, { confLevel });
  } else if (statisticId === "diff_means") {
    classicalCounterpart = classicalWelchTwoSampleT(dataPayload.g1, dataPayload.g2, { confLevel });
  } else if (statisticId === "diff_proportions") {
    classicalCounterpart = classicalTwoProportions(dataPayload.g1, dataPayload.g2, { confLevel });
  } else if (statisticId === "paired_mean_diff") {
    classicalCounterpart = classicalPairedT(dataPayload, { confLevel });
  } else if (statisticId === "pearson_r") {
    classicalCounterpart = classicalCorrelation(dataPayload, { confLevel });
  } else if (statisticId === "ols_slope") {
    classicalCounterpart = classicalRegressionSlope(dataPayload, { confLevel });
  }

  // Monte Carlo standard error of bootstrap SE and quantile
  const mcSEOfMean = bootSE / Math.sqrt(validB);

  return {
    schemaVersion: "1.0.0",
    analysisType: "bootstrap_inference",
    statisticalMethod: "nonparametric_case_bootstrap",
    datasetTitle,
    designType,
    statisticId,
    statisticName: statDef.name,
    statisticSymbol: statDef.symbol,
    estimand: statDef.parameterName,
    sampleSizeSummary,
    nEffective,
    originalEstimate,
    originalAnalyticSE: originalSE,
    confLevel: 1 - alpha,
    requestedReplicates: B,
    completedReplicates: validB,
    invalidReplicates: invalidReplicateCount,
    prng: {
      algorithm: PRNG_VERSION,
      seed: prng.initialSeed
    },
    resamplingMechanism: designType.startsWith("two_independent")
      ? "Separate sampling WITH replacement within each group (n₁, n₂)"
      : designType === "paired_numerical" || designType === "bivariate_numerical"
      ? "Case resampling WITH replacement of intact observational pairs (x_i, y_i)"
      : "Uniform sampling WITH replacement of size n from F̂ₙ",
    distributionObject: {
      objectType: "bootstrap_distribution",
      conditionalOn: "Observed sample S",
      centeredAt: "Original sample statistic theta_hat (up to bootstrap bias)",
      values: bootStats,
      sortedValues: sortedBoot,
      summary: distSummary
    },
    bootstrapMean: bootMean,
    bootstrapSE: bootSE,
    bootstrapBias: bootBias,
    biasToSERatio: bootSE > EPSILON ? bootBias / bootSE : 0,
    monteCarloUncertainty: {
      mcSEOfBootstrapMean: mcSEOfMean,
      note: `Monte Carlo simulation noise scales as 1/sqrt(B) with B = ${validB} replicates.`
    },
    intervals,
    exampleResamples,
    classicalCounterpart,
    warnings,
    assumptions: [
      "Observed sample units are mutually independent realizations from the target population (or experimental process).",
      "Empirical distribution F_hat_n is a reasonable plug-in approximation for the population distribution F.",
      "Statistic is sufficiently smooth around the parameter of interest (extreme order statistics cannot be consistently bootstrapped)."
    ],
    softwareVersion: "ResampleLab 1.0.0"
  };
}

// ============================================================================
// PERMUTATION & RANDOMIZATION INFERENCE ENGINE (Part 10)
// ============================================================================

/**
 * Generates all exact combinations C(N, k) indices when small enough for exact enumeration.
 */
function generateExactCombinations(N, k, maxCombinations = 4096) {
  const results = [];
  const combo = new Array(k);
  function backtrack(start, depth) {
    if (results.length > maxCombinations) return;
    if (depth === k) {
      results.push(combo.slice());
      return;
    }
    for (let i = start; i <= N - (k - depth); i++) {
      combo[depth] = i;
      backtrack(i + 1, depth + 1);
      if (results.length > maxCombinations) return;
    }
  }
  backtrack(0, 0);
  return results;
}

/**
 * Runs a complete Permutation or Randomization Hypothesis Test.
 * Supports:
 * - Two-group independent numerical/binary (diff_means, diff_medians, diff_proportions)
 * - Paired sign-flip randomization (paired_mean_diff, paired_median_diff)
 * - Bivariate independence permutation (pearson_r, ols_slope)
 * - Multi-group one-way ANOVA permutation (anova_f)
 * - Contingency table marginal-preserving permutation (chisq_stat)
 *
 * Also supports Exact Enumeration when the finite reference set size <= 3000.
 */
export function runPermutationAnalysis(config) {
  const {
    statisticId = "diff_means",
    dataPayload,
    alternative = "two-sided",
    replicates = 2000,
    seed = 4289104,
    useExactIfAvailable = false,
    pValueConvention = "plus_one", // "plus_one" -> (b+1)/(B+1) or "raw" -> b/B
    studyDesign = "randomized_experiment", // "randomized_experiment" or "observational_study"
    datasetTitle = "Observed Study Data"
  } = config;

  const statDef = STATISTIC_REGISTRY[statisticId] || STATISTIC_REGISTRY.diff_means;
  const designType = statDef.designType;
  const B = Math.max(50, Math.min(50000, Math.round(Number(replicates) || 2000)));
  const prng = createPRNG(seed);
  const warnings = [];

  let observedStat = NaN;
  let nullValues = [];
  let isExactEnumerated = false;
  let exactSetSize = Infinity;
  let nullHypothesisText = "";
  let alternativeHypothesisText = "";
  let nullGenerationMechanism = "";
  let exchangeabilityAssumption = "";
  let sampleSizeSummary = "";
  let examplePermutations = [];

  // 1. TWO INDEPENDENT GROUPS (Numerical or Binary)
  if (designType === "two_independent_numerical" || designType === "two_independent_binary") {
    const g1 = dataPayload.g1 || [];
    const g2 = dataPayload.g2 || [];
    const n1 = g1.length;
    const n2 = g2.length;
    const N = n1 + n2;
    if (n1 < 2 || n2 < 2) {
      return { valid: false, reason: "Two-group permutation test requires at least 2 observations per group." };
    }
    sampleSizeSummary = `n₁ = ${n1}, n₂ = ${n2} (Pooled N = ${N})`;
    observedStat = statDef.compute(g1, g2);
    const pooled = g1.concat(g2);

    // Compute exact combination count C(N, n1)
    let combCount = 1;
    for (let i = 1; i <= Math.min(n1, n2); i++) {
      combCount = (combCount * (N - i + 1)) / i;
      if (combCount > 5000) break;
    }
    exactSetSize = Math.round(combCount);

    nullHypothesisText = statisticId === "diff_medians"
      ? "H₀: F₁(y) = F₂(y) (Identical distributions, M₁ − M₂ = 0)"
      : statisticId === "diff_proportions"
      ? "H₀: p₁ − p₂ = 0 (Equal group proportions)"
      : "H₀: F₁(y) = F₂(y) (Zero treatment effect, μ₁ − μ₂ = 0)";

    const altSign = alternative === "greater" ? "> 0" : alternative === "less" ? "< 0" : "!= 0";
    alternativeHypothesisText = `H_a: ${statDef.parameterSymbol} ${altSign}`;
    nullGenerationMechanism = `Pool $N = ${N}$ observations and reassign $n_1 = ${n1}$, $n_2 = ${n2}$ WITHOUT replacement.`;
    exchangeabilityAssumption = studyDesign === "randomized_experiment"
      ? "Justified by randomized treatment assignment under Fisher's sharp null $H_0$."
      : "Assumes exchangeability under $H_0: F_1 = F_2$ (equal shapes/variances across groups).";

    if (statisticId === "diff_medians") {
      warnings.push({
        code: "PERMUTATION_EXCHANGEABILITY_NOTE",
        severity: "info",
        message: "Label permutation tests the sharp null of identical group distributions ($F_1 = F_2$). Interpreting it purely as a test of equal medians requires equal distributional shapes under $H_0$."
      });
    }

    if (useExactIfAvailable && exactSetSize <= 3000) {
      isExactEnumerated = true;
      const combos = generateExactCombinations(N, n1, 3005);
      for (let idx = 0; idx < combos.length; idx++) {
        const c = combos[idx];
        const inG1 = new Uint8Array(N);
        for (let k = 0; k < c.length; k++) inG1[c[k]] = 1;
        const p1 = [];
        const p2 = [];
        for (let i = 0; i < N; i++) {
          if (inG1[i]) p1.push(pooled[i]);
          else p2.push(pooled[i]);
        }
        const st = statDef.compute(p1, p2);
        if (Number.isFinite(st)) nullValues.push(st);
      }
    } else {
      for (let b = 0; b < B; b++) {
        const shuffled = prng.shuffle(pooled);
        const p1 = shuffled.slice(0, n1);
        const p2 = shuffled.slice(n1);
        const st = statDef.compute(p1, p2);
        if (Number.isFinite(st)) {
          nullValues.push(st);
          if (b < 5) {
            examplePermutations.push({ index: b + 1, stat: st, preview: `G1: [${p1.slice(0, 4).join(", ")}...]` });
          }
        }
      }
    }
  }
  // 2. PAIRED SIGN-FLIP RANDOMIZATION
  else if (designType === "paired_numerical") {
    const diffs = dataPayload.map((p) => (typeof p === "number" ? p : p.x - p.y));
    const n = diffs.length;
    if (n < 2) return { valid: false, reason: "Paired randomization test requires at least 2 pairs." };
    sampleSizeSummary = `n = ${n} paired units (2^${n} possible sign flips)`;
    observedStat = statDef.compute(diffs);
    exactSetSize = n <= 12 ? Math.pow(2, n) : Infinity;

    nullHypothesisText = `H₀: Symmetric paired differences around 0 (${statDef.parameterSymbol} = 0)`;
    const altSign = alternative === "greater" ? "> 0" : alternative === "less" ? "< 0" : "!= 0";
    alternativeHypothesisText = `H_a: ${statDef.parameterSymbol} ${altSign}`;
    nullGenerationMechanism = `Preserve each pair $i = 1, \\dots, ${n}$ and flip signs $d_i^* = \\pm |x_i - y_i|$ with probability $0.5$.`;
    exchangeabilityAssumption = "Within each pair $i$, $(X_i, Y_i)$ are exchangeable under $H_0$, so $+d_i$ and $-d_i$ are equally likely.";

    if (useExactIfAvailable && exactSetSize <= 2048) {
      isExactEnumerated = true;
      const totalMasks = 1 << n;
      for (let mask = 0; mask < totalMasks; mask++) {
        const flipped = new Array(n);
        for (let i = 0; i < n; i++) {
          flipped[i] = ((mask >> i) & 1) ? -diffs[i] : diffs[i];
        }
        const st = statDef.compute(flipped);
        if (Number.isFinite(st)) nullValues.push(st);
      }
    } else {
      for (let b = 0; b < B; b++) {
        const flipped = new Array(n);
        for (let i = 0; i < n; i++) {
          flipped[i] = prng.nextFloat() < 0.5 ? diffs[i] : -diffs[i];
        }
        const st = statDef.compute(flipped);
        if (Number.isFinite(st)) {
          nullValues.push(st);
          if (b < 5) {
            examplePermutations.push({ index: b + 1, stat: st, preview: `Signs: [${flipped.slice(0, 5).map((v) => (v >= 0 ? "+" : "-")).join(" ")}...]` });
          }
        }
      }
    }
  }
  // 3. BIVARIATE INDEPENDENCE PERMUTATION (Correlation or OLS Slope)
  else if (designType === "bivariate_numerical") {
    const pairs = dataPayload || [];
    const n = pairs.length;
    if (n < 4) return { valid: false, reason: "Bivariate permutation test requires at least 4 paired observations." };
    sampleSizeSummary = `n = ${n} paired observations (${n}! possible permutations)`;
    observedStat = statDef.compute(pairs);
    const xVec = pairs.map((p) => p.x);
    const yVec = pairs.map((p) => p.y);

    nullHypothesisText = `H₀: X and Y are independent (${statDef.parameterSymbol} = 0)`;
    const altSign = alternative === "greater" ? "> 0" : alternative === "less" ? "< 0" : "!= 0";
    alternativeHypothesisText = `H_a: ${statDef.parameterSymbol} ${altSign}`;
    nullGenerationMechanism = `Hold $X$ fixed and permute $Y$ WITHOUT replacement across $n = ${n}$ units.`;
    exchangeabilityAssumption = "Under $H_0$ of independence, all $n!$ pairings of $Y$ with $X$ are equally likely.";

    for (let b = 0; b < B; b++) {
      const yPerm = prng.shuffle(yVec);
      const permPairs = xVec.map((x, idx) => ({ x, y: yPerm[idx] }));
      const st = statDef.compute(permPairs);
      if (Number.isFinite(st)) {
        nullValues.push(st);
        if (b < 5) {
          examplePermutations.push({ index: b + 1, stat: st, preview: `Permuted Y: [${yPerm.slice(0, 4).join(", ")}...]` });
        }
      }
    }
  }
  // 4. ONE-WAY ANOVA MULTI-GROUP PERMUTATION
  else if (designType === "multi_group_numerical") {
    const groups = dataPayload || [];
    const sizes = groups.map((g) => g.length);
    const pooled = groups.flat();
    const N = pooled.length;
    sampleSizeSummary = `k = ${groups.length} groups, total N = ${N} (${sizes.join(", ")})`;
    observedStat = statDef.compute(groups);

    nullHypothesisText = "H₀: F₁ = F₂ = … = Fₖ (Identical group distributions, μ₁ = … = μₖ)";
    alternativeHypothesisText = "H_a: At least one group mean differs (Right-tailed F >= F_obs)";
    nullGenerationMechanism = `Pool $N = ${N}$ observations and partition into group sizes $[${sizes.join(", ")}]$ WITHOUT replacement.`;
    exchangeabilityAssumption = "Observations are exchangeable across all $k$ groups under $H_0$.";

    for (let b = 0; b < B; b++) {
      const shuffled = prng.shuffle(pooled);
      const permGroups = [];
      let offset = 0;
      for (const sz of sizes) {
        permGroups.push(shuffled.slice(offset, offset + sz));
        offset += sz;
      }
      const st = statDef.compute(permGroups);
      if (Number.isFinite(st)) {
        nullValues.push(st);
        if (b < 5) examplePermutations.push({ index: b + 1, stat: st, preview: `F* = ${st.toFixed(3)}` });
      }
    }
  }
  // 5. CONTINGENCY TABLE PERMUTATION
  else if (designType === "contingency_categorical") {
    const table = dataPayload || [];
    observedStat = statDef.compute(table);
    const R = table.length;
    const C = table[0].length;
    const rowLabels = [];
    const colLabels = [];
    for (let r = 0; r < R; r++) {
      for (let c = 0; c < C; c++) {
        const count = Math.max(0, Math.round(Number(table[r][c]) || 0));
        for (let k = 0; k < count; k++) {
          rowLabels.push(r);
          colLabels.push(c);
        }
      }
    }
    const N = rowLabels.length;
    sampleSizeSummary = `${R}x${C} contingency table, N = ${N}`;
    nullHypothesisText = "H₀: Row and Column categorical variables are independent";
    alternativeHypothesisText = "H_a: Row and Column variables are associated (Right-tailed X^2 >= X^2_obs)";
    nullGenerationMechanism = `Permute $N = ${N}$ column labels WITHOUT replacement conditional on fixed row and column marginals.`;
    exchangeabilityAssumption = "Column assignments are exchangeable conditional on fixed marginal counts under $H_0$.";

    for (let b = 0; b < B; b++) {
      const permCols = prng.shuffle(colLabels);
      const permTable = Array.from({ length: R }, () => new Array(C).fill(0));
      for (let i = 0; i < N; i++) {
        permTable[rowLabels[i]][permCols[i]]++;
      }
      const st = statDef.compute(permTable);
      if (Number.isFinite(st)) {
        nullValues.push(st);
        if (b < 5) examplePermutations.push({ index: b + 1, stat: st, preview: `χ²* = ${st.toFixed(3)}` });
      }
    }
  }

  const validB = nullValues.length;
  if (validB === 0 || !Number.isFinite(observedStat)) {
    return { valid: false, reason: "Could not compute valid observed statistic or permutation null distribution." };
  }

  // Force right-tailed for non-negative omnibus test statistics (ANOVA F and Chi-Square)
  const effectiveAlt = (statisticId === "anova_f" || statisticId === "chisq_stat") ? "greater" : alternative;

  // Count extreme replicates
  const nullMean = mean(nullValues);
  const nullSD = standardDeviation(nullValues);
  let extremeCount = 0;
  const obsAbsDev = Math.abs(observedStat - nullMean);

  for (let i = 0; i < validB; i++) {
    const val = nullValues[i];
    if (effectiveAlt === "greater") {
      if (val >= observedStat - EPSILON) extremeCount++;
    } else if (effectiveAlt === "less") {
      if (val <= observedStat + EPSILON) extremeCount++;
    } else {
      // Two-sided extremeness centered around theoretical null (0) or null center
      if (Math.abs(val) >= Math.abs(observedStat) - EPSILON) extremeCount++;
    }
  }

  // Compute p-value according to exact vs Monte Carlo convention
  let pValue;
  let pValueFormulaText;
  if (isExactEnumerated) {
    pValue = extremeCount / validB;
    pValueFormulaText = `Exact: $p = \\frac{b}{M} = \\frac{${extremeCount}}{${validB}}$ across all $M = ${validB}$ exact partitions.`;
  } else if (pValueConvention === "raw") {
    pValue = extremeCount / validB;
    pValueFormulaText = `Raw MC: $\\hat{p} = \\frac{b}{B} = \\frac{${extremeCount}}{${validB}}$ (Note: plus-one $\\frac{b+1}{B+1} = ${(1 / (validB + 1)).toFixed(4)}$ avoids zero-probability overclaiming when $b=0$).`;
  } else {
    pValue = (extremeCount + 1) / (validB + 1);
    pValueFormulaText = `Plus-one MC estimator: $\\hat{p} = \\frac{b + 1}{B + 1} = \\frac{${extremeCount} + 1}{${validB} + 1}$.`;
  }

  const mcSE = isExactEnumerated ? 0 : Math.sqrt((pValue * (1 - pValue)) / validB);
  const sortedNull = nullValues.slice().sort((a, b) => a - b);

  // Classical counterpart
  let classicalCounterpart = null;
  if (statisticId === "diff_means") {
    classicalCounterpart = classicalWelchTwoSampleT(dataPayload.g1, dataPayload.g2, { alternative: effectiveAlt });
  } else if (statisticId === "diff_proportions") {
    classicalCounterpart = classicalTwoProportions(dataPayload.g1, dataPayload.g2, { alternative: effectiveAlt });
  } else if (statisticId === "paired_mean_diff") {
    classicalCounterpart = classicalPairedT(dataPayload, { alternative: effectiveAlt });
  } else if (statisticId === "pearson_r") {
    classicalCounterpart = classicalCorrelation(dataPayload, { alternative: effectiveAlt });
  } else if (statisticId === "ols_slope") {
    classicalCounterpart = classicalRegressionSlope(dataPayload, { alternative: effectiveAlt });
  } else if (statisticId === "anova_f") {
    classicalCounterpart = classicalOneWayAnova(dataPayload);
  } else if (statisticId === "chisq_stat") {
    classicalCounterpart = classicalChiSquareIndependence(dataPayload);
  }

  return {
    schemaVersion: "1.0.0",
    analysisType: "permutation_inference",
    statisticalMethod: isExactEnumerated ? "exact_randomization_enumeration" : "monte_carlo_permutation_test",
    datasetTitle,
    studyDesign,
    designType,
    statisticId,
    statisticName: statDef.name,
    statisticSymbol: statDef.symbol,
    estimand: statDef.parameterName,
    sampleSizeSummary,
    observedStatistic: observedStat,
    nullHypothesis: nullHypothesisText,
    alternativeHypothesis: alternativeHypothesisText,
    alternative: effectiveAlt,
    nullGenerationMechanism,
    exchangeabilityAssumption,
    isExactEnumerated,
    exactSetSize,
    requestedReplicates: B,
    completedReplicates: validB,
    extremeCount,
    pValue,
    pValueConvention,
    pValueFormulaText,
    monteCarloUncertainty: {
      mcSE,
      ci95: isExactEnumerated ? [pValue, pValue] : [Math.max(0, pValue - 1.96 * mcSE), Math.min(1, pValue + 1.96 * mcSE)]
    },
    prng: {
      algorithm: PRNG_VERSION,
      seed: prng.initialSeed
    },
    distributionObject: {
      objectType: "null_randomization_distribution",
      conditionalOn: "Null hypothesis H_0 and marginal/pooled data values",
      centeredAt: "Theoretical null value (0 for differences/correlations)",
      values: nullValues,
      sortedValues: sortedNull,
      summary: summarizeUnivariate(sortedNull)
    },
    nullMean,
    nullSD,
    examplePermutations,
    classicalCounterpart,
    warnings,
    causalScopeNote: studyDesign === "randomized_experiment"
      ? "Because treatments were randomly assigned to units, a small p-value provides evidence of a causal treatment effect."
      : "Observational study design: a small p-value provides evidence against random chance association, but cannot establish causation due to potential unmeasured confounding.",
    softwareVersion: "ResampleLab 1.0.0"
  };
}

// ============================================================================
// EXPERIMENT SIMULATOR ENGINE (Part 12: Coverage, Power, Optional Stopping)
// ============================================================================

/**
 * Simulates repeated confidence interval studies to evaluate empirical coverage
 * vs nominal coverage level (1 - alpha).
 */
export function runCoverageExperiment(config) {
  const {
    distId = "normal",
    distParams = { mu: 10, sigma: 3 },
    sampleSize = 25,
    numStudies = 100,
    confLevel = 0.95,
    ciMethod = "t_interval", // "t_interval", "normal_z", "bootstrap_percentile"
    seed = 4289104
  } = config;

  const dist = getDistribution(distId);
  const moments = dist.moments(distParams);
  const trueParam = moments.mean;
  const n = Math.max(3, Math.min(500, Math.round(Number(sampleSize) || 25)));
  const M = Math.max(10, Math.min(1000, Math.round(Number(numStudies) || 100)));
  const alpha = 1 - Math.max(0.5, Math.min(0.999, Number(confLevel) || 0.95));
  const prng = createPRNG(seed);

  const zCrit = inverseNormalCDF(1 - alpha / 2);
  const tCrit = studentTQuantile(1 - alpha / 2, n - 1);

  const intervals = [];
  let coveredCount = 0;
  let totalWidth = 0;

  for (let m = 0; m < M; m++) {
    const sample = new Array(n);
    for (let i = 0; i < n; i++) {
      sample[i] = dist.sample(distParams, prng);
    }
    const est = mean(sample);
    const s = standardDeviation(sample);
    const se = s / Math.sqrt(n);

    let low;
    let high;
    if (ciMethod === "normal_z") {
      low = est - zCrit * se;
      high = est + zCrit * se;
    } else if (ciMethod === "bootstrap_percentile") {
      const bootB = 250;
      const bMeans = new Array(bootB);
      for (let b = 0; b < bootB; b++) {
        let sum = 0;
        for (let i = 0; i < n; i++) sum += sample[prng.nextInt(0, n - 1)];
        bMeans[b] = sum / n;
      }
      bMeans.sort((a, b) => a - b);
      low = quantileSorted(bMeans, alpha / 2);
      high = quantileSorted(bMeans, 1 - alpha / 2);
    } else {
      low = est - tCrit * se;
      high = est + tCrit * se;
    }

    const covers = low <= trueParam && trueParam <= high;
    if (covers) coveredCount++;
    totalWidth += high - low;
    intervals.push({
      studyIndex: m + 1,
      estimate: est,
      se,
      low,
      high,
      width: high - low,
      covers
    });
  }

  const empiricalCoverage = coveredCount / M;
  const mcSE = Math.sqrt((empiricalCoverage * (1 - empiricalCoverage)) / M);

  return {
    valid: true,
    distId,
    distName: dist.name,
    trueParam,
    trueSD: moments.sd,
    sampleSize: n,
    numStudies: M,
    nominalCoverage: 1 - alpha,
    empiricalCoverage,
    coveredCount,
    missedCount: M - coveredCount,
    meanWidth: totalWidth / M,
    mcSE,
    ciMethod,
    seed: prng.initialSeed,
    intervals
  };
}

/**
 * Simulates Type I error rate (under H_0: delta = 0) and Statistical Power (under H_a: delta != 0)
 * across sample sizes, plus builds an empirical power curve.
 */
export function runPowerSimulation(config) {
  const {
    sampleSize = 30,
    effectSize = 0.5, // True shift delta = mu_1 - mu_2
    sd = 1.0,
    alpha = 0.05,
    alternative = "two-sided",
    numTrials = 400,
    seed = 4289104
  } = config;

  const n = Math.max(4, Math.min(300, Math.round(Number(sampleSize) || 30)));
  const delta = Number(effectSize) || 0;
  const sigma = Math.max(0.1, Number(sd) || 1.0);
  const sigLevel = Math.max(0.005, Math.min(0.25, Number(alpha) || 0.05));
  const M = Math.max(50, Math.min(2000, Math.round(Number(numTrials) || 400)));
  const prng = createPRNG(seed);

  function simulateForN(nPerGroup, trueShift, trialsCount) {
    let rejectCount = 0;
    const tStats = [];
    const dfApprox = 2 * nPerGroup - 2;
    const tCritTwo = studentTQuantile(1 - sigLevel / 2, dfApprox);
    const tCritOne = studentTQuantile(1 - sigLevel, dfApprox);

    for (let t = 0; t < trialsCount; t++) {
      let s1 = 0, s2 = 0, ss1 = 0, ss2 = 0;
      const g1 = new Array(nPerGroup);
      const g2 = new Array(nPerGroup);
      for (let i = 0; i < nPerGroup; i++) {
        g1[i] = trueShift + sigma * prng.nextStandardNormal();
        g2[i] = sigma * prng.nextStandardNormal();
        s1 += g1[i];
        s2 += g2[i];
      }
      const m1 = s1 / nPerGroup;
      const m2 = s2 / nPerGroup;
      for (let i = 0; i < nPerGroup; i++) {
        ss1 += (g1[i] - m1) * (g1[i] - m1);
        ss2 += (g2[i] - m2) * (g2[i] - m2);
      }
      const v1 = ss1 / (nPerGroup - 1);
      const v2 = ss2 / (nPerGroup - 1);
      const se = Math.sqrt((v1 + v2) / nPerGroup);
      const tStat = se > EPSILON ? (m1 - m2) / se : 0;
      tStats.push(tStat);

      let rejected = false;
      if (alternative === "greater") rejected = tStat >= tCritOne;
      else if (alternative === "less") rejected = tStat <= -tCritOne;
      else rejected = Math.abs(tStat) >= tCritTwo;

      if (rejected) rejectCount++;
    }
    const rate = rejectCount / trialsCount;
    const mcSE = Math.sqrt((rate * (1 - rate)) / trialsCount);
    return { rate, rejectCount, mcSE, tStats };
  }

  // 1. Run under Null (H_0: shift = 0) to measure Empirical Type I Error
  const nullSim = simulateForN(n, 0, M);
  // 2. Run under Alternative (H_a: shift = delta) to measure Empirical Power
  const altSim = simulateForN(n, delta, M);

  // 3. Build Power Curve across sample sizes n in [8, 16, 25, 40, 60, 85, 120]
  const gridN = [8, 15, 25, 40, 60, 85, 120];
  if (!gridN.includes(n)) {
    gridN.push(n);
    gridN.sort((a, b) => a - b);
  }
  const powerCurve = gridN.map((nGrid) => {
    const res = simulateForN(nGrid, delta, Math.min(250, M));
    return {
      n: nGrid,
      empiricalPower: res.rate,
      mcSE: res.mcSE
    };
  });

  return {
    valid: true,
    sampleSize: n,
    effectSize: delta,
    sd: sigma,
    standardizedEffectD: delta / sigma,
    alpha: sigLevel,
    alternative,
    numTrials: M,
    empiricalTypeIError: nullSim.rate,
    typeIErrorMCSE: nullSim.mcSE,
    empiricalPower: altSim.rate,
    empiricalTypeIIError: 1 - altSim.rate,
    powerMCSE: altSim.mcSE,
    nullTStats: nullSim.tStats,
    altTStats: altSim.tStats,
    powerCurve,
    seed: prng.initialSeed
  };
}

/**
 * Simulates Optional Stopping (Repeated Peeking under a true Null H_0: mu = 0)
 * to demonstrate how unadjusted sequential peeking inflates the false-positive rate above alpha.
 */
export function runOptionalStoppingSimulation(config = {}) {
  const maxN = Math.max(20, Math.min(200, Number(config.maxN) || 60));
  const peekEvery = Math.max(1, Math.min(20, Number(config.peekEvery) || 5));
  const alpha = Number(config.alpha) || 0.05;
  const numStudies = Math.max(50, Math.min(1000, Number(config.numStudies) || 300));
  const prng = createPRNG(config.seed || 4289104);

  let fixedHorizonRejections = 0;
  let optionalStoppingRejections = 0;
  const sampleTrajectory = [];

  for (let s = 0; s < numStudies; s++) {
    const x = [];
    let stoppedEarly = false;
    for (let i = 1; i <= maxN; i++) {
      x.push(prng.nextStandardNormal());
      if (i >= 5 && (i % peekEvery === 0 || i === maxN)) {
        const m = mean(x);
        const sdVal = standardDeviation(x);
        const se = sdVal / Math.sqrt(i);
        const tStat = se > EPSILON ? Math.abs(m / se) : 0;
        const tCrit = studentTQuantile(1 - alpha / 2, i - 1);
        const pVal = 2 * (1 - normalCDF(tStat));
        if (s === 0) {
          sampleTrajectory.push({ n: i, tStat, tCrit, pVal });
        }
        if (tStat >= tCrit) {
          stoppedEarly = true;
        }
        if (i === maxN && tStat >= tCrit) {
          fixedHorizonRejections++;
        }
      }
    }
    if (stoppedEarly) optionalStoppingRejections++;
  }

  return {
    valid: true,
    maxN,
    peekEvery,
    alpha,
    numStudies,
    fixedFalsePositiveRate: fixedHorizonRejections / numStudies,
    peekingFalsePositiveRate: optionalStoppingRejections / numStudies,
    sampleTrajectory
  };
}

// ============================================================================
// SIMULATION UNITY: "ONE DATASET, DIFFERENT QUESTIONS" (Part 13)
// ============================================================================

/**
 * Generates synchronized side-by-side distributions for the same two-group scenario:
 * 1. Sampling Distribution of (X_bar_1 - X_bar_2) drawn from the true known populations
 * 2. Bootstrap Distribution of (X*_bar_1 - X*_bar_2) resampled with replacement from ONE observed sample
 * 3. Permutation Null Distribution of (X_perm_1 - X_perm_2) shuffled without replacement under H_0: mu_1 = mu_2
 */
export function runSimulationUnityComparison(config = {}) {
  const {
    mu1 = 54.0,
    mu2 = 50.0,
    sigma = 8.0,
    n1 = 25,
    n2 = 25,
    replicates = 1500,
    seed = 4289104
  } = config;

  const prng = createPRNG(seed);
  const trueDiff = mu1 - mu2;
  const trueSE = Math.sqrt((sigma * sigma) / n1 + (sigma * sigma) / n2);

  // Draw the ONE realized sample observed by the researcher
  const obsG1 = new Array(n1);
  const obsG2 = new Array(n2);
  for (let i = 0; i < n1; i++) obsG1[i] = mu1 + sigma * prng.nextStandardNormal();
  for (let j = 0; j < n2; j++) obsG2[j] = mu2 + sigma * prng.nextStandardNormal();
  const observedDiff = mean(obsG1) - mean(obsG2);
  const pooledObs = obsG1.concat(obsG2);

  const B = Math.max(200, Math.min(5000, Math.round(Number(replicates) || 1500)));
  const samplingDist = new Array(B);
  const bootstrapDist = new Array(B);
  const permutationDist = new Array(B);

  for (let b = 0; b < B; b++) {
    // 1. Fresh sample from true population
    let sum1 = 0, sum2 = 0;
    for (let i = 0; i < n1; i++) sum1 += mu1 + sigma * prng.nextStandardNormal();
    for (let j = 0; j < n2; j++) sum2 += mu2 + sigma * prng.nextStandardNormal();
    samplingDist[b] = sum1 / n1 - sum2 / n2;

    // 2. Bootstrap resample with replacement from observed sample
    let bSum1 = 0, bSum2 = 0;
    for (let i = 0; i < n1; i++) bSum1 += obsG1[prng.nextInt(0, n1 - 1)];
    for (let j = 0; j < n2; j++) bSum2 += obsG2[prng.nextInt(0, n2 - 1)];
    bootstrapDist[b] = bSum1 / n1 - bSum2 / n2;

    // 3. Permutation shuffle without replacement from pooled observed sample
    const shuf = prng.shuffle(pooledObs);
    let pSum1 = 0, pSum2 = 0;
    for (let i = 0; i < n1; i++) pSum1 += shuf[i];
    for (let j = n1; j < n1 + n2; j++) pSum2 += shuf[j];
    permutationDist[b] = pSum1 / n1 - pSum2 / n2;
  }

  return {
    trueDiff,
    trueSE,
    observedDiff,
    obsG1,
    obsG2,
    replicates: B,
    seed: prng.initialSeed,
    samplingSummary: summarizeUnivariate(samplingDist),
    bootstrapSummary: summarizeUnivariate(bootstrapDist),
    permutationSummary: summarizeUnivariate(permutationDist),
    samplingDist,
    bootstrapDist,
    permutationDist
  };
}
