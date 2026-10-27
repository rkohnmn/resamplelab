/**
 * ResampleLab — Built-In Domain & Educational Datasets
 *
 * Provides curated, scientifically authentic datasets across all supported
 * study designs (one-sample numerical, skewed numerical, one-sample binary,
 * two-sample independent numerical, two-sample independent binary, paired
 * before/after measurements, bivariate correlation/regression including
 * Anscombe's Quartet I from QuartetLab, multi-group one-way ANOVA, contingency
 * table categorical association, and dependent autocorrelated time-series for
 * assumption violation testing).
 *
 * @module presets
 * @version 1.0.0
 */

export const PRESET_DATASETS = {
  skewed_repair_times: {
    id: "skewed_repair_times",
    title: "Telecom Fiber Repair Times (Hours, Right-Skewed)",
    designType: "one_numerical",
    studyDesign: "observational_study",
    isDependentTimeSeries: false,
    unit: "hours",
    defaultStatistic: "mean",
    nullValue: 4.0,
    description: "Service restoration times (n = 24) for municipal fiber outages, patterned after Chihara & Hesterberg's Verizon repair-time benchmark. Strong right skewness illustrates why bootstrap-t and BCa intervals shift rightward compared to symmetric normal intervals.",
    dataPayload: [
      0.8, 1.1, 1.3, 1.4, 1.6, 1.8, 2.0, 2.1, 2.3, 2.5,
      2.7, 2.9, 3.2, 3.5, 3.9, 4.4, 5.1, 6.2, 7.8, 9.4,
      11.5, 14.8, 19.2, 26.5
    ]
  },

  mercury_fish_levels: {
    id: "mercury_fish_levels",
    title: "Lake Trout Mercury Concentration (ppm)",
    designType: "one_numerical",
    studyDesign: "observational_study",
    isDependentTimeSeries: false,
    unit: "ppm",
    defaultStatistic: "median",
    nullValue: 0.50,
    description: "Tissue mercury levels (ppm) sampled from n = 18 lake trout across northern watersheds (Lock5 benchmark style). Contains high-concentration outliers ideal for comparing sample mean vs sample median bootstrap uncertainty.",
    dataPayload: [
      0.28, 0.31, 0.34, 0.36, 0.39, 0.42, 0.44, 0.47, 0.49,
      0.52, 0.55, 0.59, 0.63, 0.68, 0.74, 0.89, 1.24, 1.68
    ]
  },

  voter_poll_binary: {
    id: "voter_poll_binary",
    title: "Municipal Transit Bond Referendum Poll (Binary 0/1)",
    designType: "one_binary",
    studyDesign: "observational_study",
    isDependentTimeSeries: false,
    unit: "support (1=Yes, 0=No)",
    defaultStatistic: "proportion",
    nullValue: 0.50,
    description: "Random sample of n = 80 likely voters asked whether they support Proposition B (46 Yes = 57.5%, 34 No = 42.5%). Compare percentile bootstrap intervals with the classical Wilson score interval.",
    dataPayload: [
      1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1,
      1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1,
      1, 1, 1, 1, 1, 1,
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0
    ]
  },

  sleep_deprivation_trial: {
    id: "sleep_deprivation_trial",
    title: "Sleep Deprivation vs Control Visual Learning (Randomized Trial)",
    designType: "two_independent_numerical",
    studyDesign: "randomized_experiment",
    isDependentTimeSeries: false,
    unit: "ms improvement",
    groupLabels: ["Unrestricted Sleep", "Sleep Deprived"],
    defaultStatistic: "diff_means",
    nullValue: 0,
    description: "Randomized experiment (Stickgold et al., 2000; Chihara & Hesterberg / Lock5 classic) where 21 subjects were randomly assigned to Unrestricted Sleep (n₁ = 10) or Sleep Deprivation (n₂ = 11) and tested on visual discrimination improvement 3 days later. Small enough (C(21, 10) = 352,716; or subset exact) to compare randomization inference and Welch's t-test.",
    dataPayload: {
      g1: [25.2, 14.5, -7.0, 12.6, 34.5, 45.6, 11.6, 18.6, 12.1, 30.5],
      g2: [-10.7, 4.5, 2.2, 21.3, -14.7, -10.7, 9.6, 2.4, 21.8, 7.2, 10.0]
    }
  },

  small_exact_drug_pilot: {
    id: "small_exact_drug_pilot",
    title: "Phase I Biomarker Pilot (Small Sample Exact Enumeration, N = 10)",
    designType: "two_independent_numerical",
    studyDesign: "randomized_experiment",
    isDependentTimeSeries: false,
    unit: "ng/mL reduction",
    groupLabels: ["Active Compound", "Placebo"],
    defaultStatistic: "diff_means",
    nullValue: 0,
    description: "Randomized pilot study with n₁ = 5 Active and n₂ = 5 Placebo subjects. Total exact partitions C(10, 5) = 252, allowing direct comparison between Exact Randomization Enumeration and Monte Carlo sampling.",
    dataPayload: {
      g1: [18.4, 22.1, 15.6, 25.0, 19.8],
      g2: [11.2, 14.5, 9.8, 16.0, 12.4]
    }
  },

  cardioprotective_binary_trial: {
    id: "cardioprotective_binary_trial",
    title: "Post-Surgical Complication Rate (Two Binary Groups)",
    designType: "two_independent_binary",
    studyDesign: "randomized_experiment",
    isDependentTimeSeries: false,
    unit: "eventFree (1=Success, 0=Complication)",
    groupLabels: ["New Protocol", "Standard Care"],
    defaultStatistic: "diff_proportions",
    nullValue: 0,
    description: "Randomized clinical comparison of complication-free recovery between New Protocol (34/40 = 85.0%) and Standard Care (25/40 = 62.5%).",
    dataPayload: {
      g1: [
        1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1,
        1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1,
        0, 0, 0, 0, 0, 0
      ],
      g2: [
        1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1,
        1, 1, 1, 1, 1, 1, 1, 1,
        0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0
      ]
    }
  },

  wetsuit_swim_paired: {
    id: "wetsuit_swim_paired",
    title: "Triathlon Wetsuit vs Swimsuit Velocity (Paired Design, n = 12)",
    designType: "paired_numerical",
    studyDesign: "randomized_experiment",
    isDependentTimeSeries: false,
    unit: "m/s",
    defaultStatistic: "paired_mean_diff",
    nullValue: 0,
    description: "Maximum 1500m swim velocity (m/s) for n = 12 competitive triathletes measured both wearing a neoprene wetsuit (X) and wearing a standard swimsuit (Y) in randomized order (de Lucas et al., 2000; Lock5). With 2^12 = 4,096 sign-flips, demonstrates why preserving pairing is critical.",
    dataPayload: [
      { label: "Swimmer 1", x: 1.57, y: 1.49 },
      { label: "Swimmer 2", x: 1.47, y: 1.37 },
      { label: "Swimmer 3", x: 1.42, y: 1.35 },
      { label: "Swimmer 4", x: 1.35, y: 1.27 },
      { label: "Swimmer 5", x: 1.22, y: 1.12 },
      { label: "Swimmer 6", x: 1.75, y: 1.64 },
      { label: "Swimmer 7", x: 1.64, y: 1.59 },
      { label: "Swimmer 8", x: 1.57, y: 1.52 },
      { label: "Swimmer 9", x: 1.56, y: 1.50 },
      { label: "Swimmer 10", x: 1.53, y: 1.45 },
      { label: "Swimmer 11", x: 1.49, y: 1.44 },
      { label: "Swimmer 12", x: 1.51, y: 1.41 }
    ]
  },

  anscombe_quartet_1: {
    id: "anscombe_quartet_1",
    title: "Anscombe's Quartet I — Bivariate Linear (QuartetLab Interop)",
    designType: "bivariate_numerical",
    studyDesign: "observational_study",
    isDependentTimeSeries: false,
    unit: "units",
    defaultStatistic: "ols_slope",
    nullValue: 0,
    description: "Canonical bivariate dataset from Anscombe (1973) and QuartetLab (n = 11, x̄ = 9.0, ȳ = 7.50, r = 0.8164, OLS slope = 0.5001). Demonstrates case-resampling bootstrap intervals for slope and correlation alongside Y-permutation tests.",
    dataPayload: [
      { obs_id: "a1_1", label: "Case 1", x: 10.0, y: 8.04 },
      { obs_id: "a1_2", label: "Case 2", x: 8.0, y: 6.95 },
      { obs_id: "a1_3", label: "Case 3", x: 13.0, y: 7.58 },
      { obs_id: "a1_4", label: "Case 4", x: 9.0, y: 8.81 },
      { obs_id: "a1_5", label: "Case 5", x: 11.0, y: 8.33 },
      { obs_id: "a1_6", label: "Case 6", x: 14.0, y: 9.96 },
      { obs_id: "a1_7", label: "Case 7", x: 6.0, y: 7.24 },
      { obs_id: "a1_8", label: "Case 8", x: 4.0, y: 4.26 },
      { obs_id: "a1_9", label: "Case 9", x: 12.0, y: 10.84 },
      { obs_id: "a1_10", label: "Case 10", x: 7.0, y: 4.82 },
      { obs_id: "a1_11", label: "Case 11", x: 5.0, y: 5.68 }
    ]
  },

  agronomy_fertilizer_anova: {
    id: "agronomy_fertilizer_anova",
    title: "Crop Yield Across Three Fertilizer Regimens (One-Way ANOVA)",
    designType: "multi_group_numerical",
    studyDesign: "randomized_experiment",
    isDependentTimeSeries: false,
    unit: "bushels/acre",
    groupLabels: ["Control", "Bio-Compost", "Slow-Release Nitrogen"],
    defaultStatistic: "anova_f",
    nullValue: 0,
    description: "Randomized agricultural field trial comparing grain yield (bushels/acre) across k = 3 fertilizer treatments (8 plots per treatment, N = 24).",
    dataPayload: [
      [48.2, 51.0, 49.5, 53.1, 47.8, 50.4, 52.0, 49.1],
      [54.6, 57.2, 55.8, 59.0, 53.4, 56.5, 58.1, 55.0],
      [60.2, 63.5, 58.9, 64.1, 61.8, 59.7, 62.4, 61.0]
    ]
  },

  clinical_triage_contingency: {
    id: "clinical_triage_contingency",
    title: "Emergency Triage Acuity vs Admission Outcome (3x2 Contingency)",
    designType: "contingency_categorical",
    studyDesign: "observational_study",
    isDependentTimeSeries: false,
    unit: "patient count",
    rowLabels: ["Level 1 (High Acuity)", "Level 2 (Moderate)", "Level 3 (Low Acuity)"],
    colLabels: ["Admitted to Ward", "Discharged Home"],
    defaultStatistic: "chisq_stat",
    nullValue: 0,
    description: "Contingency table (N = 180 patients) cross-classifying triage acuity level against hospital admission outcome. Compares permutation chi-square test against the asymptotic chi-square approximation.",
    dataPayload: [
      [42, 18],
      [28, 32],
      [12, 48]
    ]
  },

  dependent_ar1_sensor_series: {
    id: "dependent_ar1_sensor_series",
    title: "Autocorrelated Thermal Sensor Stream (Dependent Time Series — Assumption Warning)",
    designType: "one_numerical",
    studyDesign: "observational_study",
    isDependentTimeSeries: true,
    unit: "deg C",
    defaultStatistic: "mean",
    nullValue: 20.0,
    description: "Strongly autocorrelated AR(1) sensor readings (ϕ₁ = 0.85, n = 30) designed for Acceptance Scenario 9. Attempting an ordinary i.i.d. bootstrap triggers an explicit methodological assumption violation warning because naive resampling destroys serial dependence and underestimates the true standard error.",
    dataPayload: [
      18.2, 18.5, 18.9, 19.4, 19.8, 20.3, 20.7, 21.2, 21.5, 21.8,
      22.0, 21.9, 21.6, 21.2, 20.8, 20.3, 19.9, 19.5, 19.2, 19.0,
      19.3, 19.7, 20.2, 20.8, 21.3, 21.7, 22.1, 22.4, 22.6, 22.7
    ]
  }
};

export function getPresetDataset(id) {
  return PRESET_DATASETS[id] || PRESET_DATASETS.skewed_repair_times;
}
