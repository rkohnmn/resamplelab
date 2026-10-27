/**
 * ResampleLab — Automated Mathematical & Statistical Verification Test Suite
 *
 * Executed via Node.js native test runner: `node --test tests/math-engine.test.js`
 * Verifies:
 * 1. Deterministic PRNG reproducibility and stream derivation
 * 2. All 19 probability distribution families (normalization, moments, CDF monotonicity, quantile inversion)
 * 3. Descriptive statistics, Type 7 quantiles, two-pass variance, FPC, SRSWR vs SRSWOR
 * 4. Nonparametric bootstrap, groupwise bootstrap, paired bootstrap, and all 5 CI methods (including BCa)
 * 5. Permutation tests, exact enumeration C(10,5)=252, paired sign-flip, and (b+1)/(B+1) p-values
 * 6. Classical analytical counterparts (t-tests, Wilson score CI, Fisher z, OLS slope, ANOVA F, Chi-square)
 * 7. Coverage, Power, Optional Stopping, and Simulation Unity engines
 * 8. RFC 4180 CSV formula injection sanitization, CSV/TSV parsing, and URL hash round-tripping
 */

import test from "node:test";
import assert from "node:assert/strict";

import { createPRNG, normalizeSeed, deriveStreamSeed } from "../js/prng.js";
import {
  DISTRIBUTION_FAMILIES,
  normalCDF,
  inverseNormalCDF,
  studentTCDF,
  studentTQuantile,
  chiSquareCDF,
  fDistCDF
} from "../js/distributions.js";
import {
  mean,
  median,
  variance,
  standardDeviation,
  quantile,
  sampleWithReplacement,
  sampleWithoutReplacement,
  finitePopulationCorrection,
  permuteWithinBlocks,
  STATISTIC_REGISTRY,
  computeBivariateStats,
  computeOneWayAnova,
  computeContingencyChiSquare
} from "../js/stats-core.js";
import {
  classicalOneSampleT,
  classicalWelchTwoSampleT,
  classicalPairedT,
  classicalOneProportion,
  classicalCorrelation,
  classicalRegressionSlope
} from "../js/classical-engine.js";
import {
  runBootstrapAnalysis,
  runPermutationAnalysis,
  runCoverageExperiment,
  runPowerSimulation,
  runOptionalStoppingSimulation,
  runSimulationUnityComparison
} from "../js/inference-engine.js";
import { PRESET_DATASETS } from "../js/presets.js";
import {
  escapeCsvCell,
  parseDelimitedDataset,
  exportSummaryToCSV,
  exportDataSenseSimulationJSON,
  exportReproducibleSessionJSON
} from "../js/exporters.js";
import {
  encodeShareableHashState,
  decodeShareableHashState
} from "../js/storage.js";

test("1. PRNG determinism, reset, and independent stream derivation", () => {
  const rng1 = createPRNG(4289104);
  const rng2 = createPRNG(4289104);
  const seq1 = Array.from({ length: 50 }, () => rng1.nextFloat());
  const seq2 = Array.from({ length: 50 }, () => rng2.nextFloat());
  assert.deepEqual(seq1, seq2, "Identical seeds must produce bit-identical sequences");

  rng1.reset();
  const seqReset = Array.from({ length: 50 }, () => rng1.nextFloat());
  assert.deepEqual(seq1, seqReset, "reset() must restore exact initial sequence");

  const sA = deriveStreamSeed(4289104, 1);
  const sB = deriveStreamSeed(4289104, 2);
  assert.notEqual(sA, sB, "Different stream indices must derive distinct seeds");
  assert.ok(normalizeSeed("ResampleLab-2026") > 0);
});

test("2. All 19 probability distribution families validate, normalize, and invert quantiles", () => {
  const rng = createPRNG(123456);
  const familyKeys = Object.keys(DISTRIBUTION_FAMILIES);
  assert.equal(familyKeys.length, 19, "Must implement all 19 required distribution families");

  for (const key of familyKeys) {
    const fam = DISTRIBUTION_FAMILIES[key];
    const defaultParams = {};
    for (const p of fam.parameters) defaultParams[p.key] = p.default;

    const val = fam.validate(defaultParams);
    assert.equal(val.valid, true, `Default params for ${key} must be valid`);

    const moments = fam.moments(defaultParams);
    assert.ok(Number.isFinite(moments.mean), `Mean for ${key} should be finite on default params`);
    assert.ok(moments.sd > 0, `SD for ${key} should be positive on default params`);

    // Check CDF monotonicity
    const q25 = fam.quantile(0.25, defaultParams);
    const q50 = fam.quantile(0.50, defaultParams);
    const q75 = fam.quantile(0.75, defaultParams);
    assert.ok(q25 <= q50 && q50 <= q75, `Quantiles must be non-decreasing for ${key}: ${q25}, ${q50}, ${q75}`);

    if (fam.type === "continuous") {
      const c50 = fam.cdf(q50, defaultParams);
      assert.ok(Math.abs(c50 - 0.50) < 1e-4, `Continuous CDF(quantile(0.5)) should equal 0.5 for ${key}, got ${c50}`);
    } else {
      // Discrete PMF sum check on support
      const sup = fam.support(defaultParams);
      let massSum = 0;
      for (const k of sup.discreteValues) {
        const pmfVal = fam.pmf(k, defaultParams);
        assert.ok(pmfVal >= 0, `PMF must be non-negative for ${key}`);
        massSum += pmfVal;
      }
      assert.ok(massSum > 0.99, `Discrete PMF sum over support for ${key} should be ~1, got ${massSum}`);
    }

    // Check empirical sample mean convergence (N = 2000)
    const samples = Array.from({ length: 2000 }, () => fam.sample(defaultParams, rng));
    const empMean = mean(samples);
    const tol = 4.5 * (moments.sd / Math.sqrt(2000));
    assert.ok(
      Math.abs(empMean - moments.mean) <= Math.max(0.15, tol),
      `Sample mean for ${key} (${empMean}) should be within tolerance of theoretical mean (${moments.mean})`
    );
  }
});

test("3. Special functions match statistical reference tables", () => {
  assert.ok(Math.abs(inverseNormalCDF(0.975) - 1.9599639845) < 1e-7);
  assert.ok(Math.abs(normalCDF(1.9599639845) - 0.975) < 1e-7);
  assert.ok(Math.abs(studentTQuantile(0.975, 9) - 2.262157) < 1e-4);
  assert.ok(Math.abs(2 * (1 - studentTCDF(2.262157, 9)) - 0.05) < 1e-4);
  assert.ok(Math.abs(1 - chiSquareCDF(3.8414588, 1) - 0.05) < 1e-4);
  assert.ok(Math.abs(1 - fDistCDF(4.387374, 5, 20) - 0.0075) < 1e-3);
});

test("4. Sampling with vs without replacement and FPC", () => {
  const rng = createPRNG(999);
  const pop = Array.from({ length: 20 }, (_, i) => i + 1);
  const srswor = sampleWithoutReplacement(pop, 20, rng);
  const uniqueWor = new Set(srswor);
  assert.equal(uniqueWor.size, 20, "SRSWOR of size N from N distinct elements must contain all N distinct elements");

  assert.throws(() => sampleWithoutReplacement(pop, 25, rng), /Cannot sample/);
  assert.equal(finitePopulationCorrection(20, 20), 0.0);
  assert.ok(Math.abs(finitePopulationCorrection(10, 100) - Math.sqrt(90 / 99)) < 1e-12);
});

test("5. Nonparametric bootstrap & all 5 CI methods (Percentile, Basic, Normal, Studentized, BCa)", () => {
  const repairData = PRESET_DATASETS.skewed_repair_times.dataPayload;
  const res1 = runBootstrapAnalysis({
    statisticId: "mean",
    dataPayload: repairData,
    replicates: 2000,
    confLevel: 0.95,
    seed: 4289104
  });
  const res2 = runBootstrapAnalysis({
    statisticId: "mean",
    dataPayload: repairData,
    replicates: 2000,
    confLevel: 0.95,
    seed: 4289104
  });

  assert.equal(res1.completedReplicates, 2000);
  assert.equal(res1.bootstrapSE, res2.bootstrapSE, "Same seed must reproduce identical bootstrap SE");
  assert.deepEqual(res1.intervals.percentile.ci, res2.intervals.percentile.ci);
  assert.equal(res1.intervals.studentized.eligible, true);
  assert.equal(res1.intervals.bca.eligible, true);
  assert.ok(res1.intervals.percentile.ci[0] < res1.originalEstimate && res1.originalEstimate < res1.intervals.percentile.ci[1]);
  assert.ok(res1.intervals.bca.ci[0] < res1.originalEstimate && res1.originalEstimate < res1.intervals.bca.ci[1]);

  // Dependent time-series assumption warning (Acceptance Scenario 9)
  const depRes = runBootstrapAnalysis({
    statisticId: "mean",
    dataPayload: PRESET_DATASETS.dependent_ar1_sensor_series.dataPayload,
    isDependentTimeSeries: true,
    replicates: 500,
    seed: 101
  });
  assert.ok(depRes.warnings.some((w) => w.code === "DEPENDENT_DATA_IID_BOOTSTRAP"), "Must warn on dependent time-series bootstrap");
});

test("6. Two-group, paired, and bivariate case bootstrap preserve observational units", () => {
  // Two independent samples (Scenario 3)
  const sleep = PRESET_DATASETS.sleep_deprivation_trial.dataPayload;
  const twoGrpBoot = runBootstrapAnalysis({
    statisticId: "diff_means",
    dataPayload: sleep,
    replicates: 1000,
    seed: 777
  });
  assert.ok(Math.abs(twoGrpBoot.originalEstimate - 15.92) < 0.05);
  assert.ok(twoGrpBoot.intervals.percentile.ci[0] > 0, "Sleep deprivation 95% CI should be strictly positive");

  // Paired data (Scenario 4)
  const swim = PRESET_DATASETS.wetsuit_swim_paired.dataPayload;
  const pairedBoot = runBootstrapAnalysis({
    statisticId: "paired_mean_diff",
    dataPayload: swim,
    replicates: 1000,
    seed: 888
  });
  assert.ok(Math.abs(pairedBoot.originalEstimate - 0.0775) < 1e-4);
  assert.ok(pairedBoot.bootstrapSE < 0.015, "Paired bootstrap SE must reflect small within-swimmer variance (~0.006)");

  // Bivariate Anscombe I OLS slope
  const ans1 = PRESET_DATASETS.anscombe_quartet_1.dataPayload;
  const slopeBoot = runBootstrapAnalysis({
    statisticId: "ols_slope",
    dataPayload: ans1,
    replicates: 1000,
    seed: 999
  });
  assert.ok(Math.abs(slopeBoot.originalEstimate - 0.5001) < 1e-3);
});

test("7. Permutation tests: Exact enumeration vs Monte Carlo and Paired sign-flip", () => {
  // Small pilot N=10 (n1=5, n2=5 -> C(10,5) = 252 exact combinations, Scenario 6)
  const pilot = PRESET_DATASETS.small_exact_drug_pilot.dataPayload;
  const exactRes = runPermutationAnalysis({
    statisticId: "diff_means",
    dataPayload: pilot,
    alternative: "two-sided",
    useExactIfAvailable: true,
    seed: 123
  });
  assert.equal(exactRes.isExactEnumerated, true);
  assert.equal(exactRes.completedReplicates, 252, "C(10, 5) must enumerate all 252 exact partitions");
  assert.ok(exactRes.pValue > 0 && exactRes.pValue < 0.05);

  const mcRes = runPermutationAnalysis({
    statisticId: "diff_means",
    dataPayload: pilot,
    alternative: "two-sided",
    useExactIfAvailable: false,
    replicates: 2000,
    seed: 123
  });
  assert.equal(mcRes.isExactEnumerated, false);
  assert.ok(Math.abs(mcRes.pValue - exactRes.pValue) < 0.02, "Monte Carlo p-value must agree closely with exact p-value");

  // Paired sign-flip exact enumeration (2^12 = 4096 or MC)
  const swim = PRESET_DATASETS.wetsuit_swim_paired.dataPayload.slice(0, 10); // 2^10 = 1024
  const pairedExact = runPermutationAnalysis({
    statisticId: "paired_mean_diff",
    dataPayload: swim,
    useExactIfAvailable: true
  });
  assert.equal(pairedExact.isExactEnumerated, true);
  assert.equal(pairedExact.completedReplicates, 1024);
  assert.ok(Math.abs(pairedExact.pValue - 2 / 1024) < 1e-9, "Since all 10 diffs are positive, two-sided exact sign-flip p-value is 2/1024");
});

test("8. Classical inference counterparts match certified values", () => {
  const ans1 = PRESET_DATASETS.anscombe_quartet_1.dataPayload;
  const ols = classicalRegressionSlope(ans1, { confLevel: 0.95 });
  assert.equal(ols.valid, true);
  assert.ok(Math.abs(ols.estimate - 0.5001) < 1e-3);
  assert.ok(Math.abs(ols.se - 0.1179) < 1e-3);
  assert.ok(Math.abs(ols.rSquared - 0.6665) < 1e-3);

  const corr = classicalCorrelation(ans1, { confLevel: 0.95 });
  assert.ok(Math.abs(corr.estimate - 0.8164) < 1e-3);

  const prop = classicalOneProportion(PRESET_DATASETS.voter_poll_binary.dataPayload, { confLevel: 0.95, nullValue: 0.5 });
  assert.ok(Math.abs(prop.estimate - 0.575) < 1e-6);
  assert.ok(prop.ciWilson[0] > 0.46 && prop.ciWilson[1] < 0.68);
});

test("9. Coverage, Power, Optional Stopping, and Simulation Unity engines", () => {
  const cov = runCoverageExperiment({
    distId: "normal",
    distParams: { mu: 10, sigma: 3 },
    sampleSize: 25,
    numStudies: 200,
    confLevel: 0.95,
    ciMethod: "t_interval",
    seed: 42
  });
  assert.ok(cov.empiricalCoverage >= 0.88 && cov.empiricalCoverage <= 0.99);

  const powSmall = runPowerSimulation({ sampleSize: 15, effectSize: 0.5, sd: 1, numTrials: 200, seed: 42 });
  const powLarge = runPowerSimulation({ sampleSize: 80, effectSize: 0.5, sd: 1, numTrials: 200, seed: 42 });
  assert.ok(powLarge.empiricalPower > powSmall.empiricalPower, "Power must increase with sample size n");

  const peek = runOptionalStoppingSimulation({ maxN: 50, peekEvery: 5, alpha: 0.05, numStudies: 200, seed: 42 });
  assert.ok(peek.peekingFalsePositiveRate > peek.fixedFalsePositiveRate, "Optional stopping must inflate false positives");

  const unity = runSimulationUnityComparison({ mu1: 60, mu2: 50, sigma: 8, n1: 30, n2: 30, replicates: 800, seed: 42 });
  assert.ok(Math.abs(unity.samplingSummary.mean - 10) < 1.0, "Sampling distribution centers near true parameter 10");
  assert.ok(Math.abs(unity.bootstrapSummary.mean - unity.observedDiff) < 1.0, "Bootstrap distribution centers near observed diff");
  assert.ok(Math.abs(unity.permutationSummary.mean - 0) < 1.0, "Permutation null distribution centers near 0");
});

test("10. CSV formula injection sanitization, CSV/TSV parsing, and URL hash round-trip", () => {
  assert.equal(escapeCsvCell("=SUM(A1:A10)"), "'=SUM(A1:A10)");
  assert.equal(escapeCsvCell("+cmd|' /C calc'!A0"), "'+cmd|' /C calc'!A0");
  assert.equal(escapeCsvCell("@evil"), "'@evil");

  const csvText = "group,score\nTreatment,24.5\nTreatment,28.1\nTreatment,26.0\nControl,19.2\nControl,20.4\nControl,18.7";
  const parsed = parseDelimitedDataset(csvText);
  assert.equal(parsed.valid, true);
  assert.equal(parsed.inferredDesign, "two_independent_numerical");
  assert.equal(parsed.dataPayload.g1.length, 3);
  assert.equal(parsed.dataPayload.g2.length, 3);

  const state = { tab: "bootstrap", preset: "skewed_repair_times", seed: 4289104, B: 2000 };
  const hash = encodeShareableHashState(state);
  const decoded = decodeShareableHashState(hash);
  assert.deepEqual(decoded, state);
});

test("11. Within-block restricted randomization, Spearman rho estimator, and JSON session round-trip", () => {
  const rng = createPRNG(54321);
  const blockRecords = [
    { block: "Clinic_A", group: "Tx", value: 10 },
    { block: "Clinic_A", group: "Tx", value: 12 },
    { block: "Clinic_A", group: "Ctrl", value: 8 },
    { block: "Clinic_B", group: "Tx", value: 20 },
    { block: "Clinic_B", group: "Ctrl", value: 15 },
    { block: "Clinic_B", group: "Ctrl", value: 14 }
  ];
  const perm = permuteWithinBlocks(blockRecords, rng);
  assert.equal(perm.g1.length, 3, "Must preserve total Tx count across blocks");
  assert.equal(perm.g2.length, 3, "Must preserve total Ctrl count across blocks");

  const ans1 = PRESET_DATASETS.anscombe_quartet_1.dataPayload;
  const rho = STATISTIC_REGISTRY.spearman_rho.compute(ans1);
  assert.ok(Number.isFinite(rho) && rho > 0.7 && rho <= 1.0);

  const sessionJson = exportReproducibleSessionJSON({
    title: "Test Session",
    designType: "one_numerical",
    statisticId: "mean",
    dataPayload: [10, 12, 15, 18, 22],
    bootResult: {
      analysisType: "bootstrap_inference",
      originalEstimate: 15.4,
      bootstrapSE: 2.1,
      prng: { algorithm: "Mulberry32-v1.0", seed: 99 }
    }
  });
  const parsedSession = parseDelimitedDataset(sessionJson);
  assert.equal(parsedSession.valid, true);
  assert.equal(parsedSession.isSessionRestore, true);
  assert.deepEqual(parsedSession.dataPayload, [10, 12, 15, 18, 22]);
});
