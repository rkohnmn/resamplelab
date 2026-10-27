/**
 * ResampleLab — Main Application Controller & State Coordinator
 *
 * Coordinates all 10 interactive destinations, 3 explanation modes (Simple,
 * Standard, Technical), High-DPI Canvas rendering, custom data import/export,
 * URL hash state synchronization, and classroom workflows.
 *
 * @module app
 * @version 1.0.0
 */

import { createPRNG } from "./prng.js";
import {
  DISTRIBUTION_FAMILIES,
  getDistribution,
  computeDistributionProbabilities
} from "./distributions.js";
import {
  mean,
  standardDeviation,
  summarizeUnivariate,
  STATISTIC_REGISTRY,
  sampleWithReplacement,
  sampleWithoutReplacement,
  sampleStratified,
  sampleClusters,
  finitePopulationCorrection
} from "./stats-core.js";
import {
  runBootstrapAnalysis,
  runPermutationAnalysis,
  runCoverageExperiment,
  runPowerSimulation,
  runOptionalStoppingSimulation,
  runSimulationUnityComparison
} from "./inference-engine.js";
import { PRESET_DATASETS, getPresetDataset } from "./presets.js";
import { ATLAS_ENTRIES } from "./atlas-data.js";
import { GUIDED_INVESTIGATIONS } from "./investigations.js";
import {
  renderDistributionHistogram,
  renderTheoreticalDistributionPlot,
  renderLLNTrajectoryCanvas,
  renderNormalQQCanvas,
  renderBootstrapCIComparisonCanvas,
  renderCoverageCaterpillarCanvas,
  renderPowerCurveCanvas,
  renderSampleSizeExplorerCanvas,
  generateHistogramSVG,
  getCanvasPalette
} from "./renderer.js";
import {
  parseDelimitedDataset,
  exportSummaryToCSV,
  exportReplicatesToCSV,
  exportDataSenseSimulationJSON,
  exportReproducibleSessionJSON,
  generateRScript,
  generatePythonScript,
  generateReadableReport
} from "./exporters.js";
import {
  loadLocalState,
  saveLocalState,
  clearAllLocalState,
  encodeShareableHashState,
  decodeShareableHashState
} from "./storage.js";

// ============================================================================
// APPLICATION STATE
// ============================================================================

const state = {
  activeDest: "sampling",
  explanationMode: "standard", // "simple" | "standard" | "technical"
  theme: "light",

  // 1. Sampling Lab State
  sampling: {
    popDistId: "normal",
    mechanism: "srswr",
    finiteN: 250,
    sampleSize: 25,
    statId: "mean",
    replicatesB: 1000,
    seed: 4289104,
    subview: "hierarchy",
    populationValues: [],
    lastSample: [],
    sampleStats: [],
    llnTrajectories: [],
    trueParam: 50,
    trueSD: 12
  },

  // 2. Distribution Explorer State
  distExplorer: {
    distId: "normal",
    params: { mu: 0, sigma: 1 },
    rangeA: -1.0,
    rangeB: 1.5,
    quantileQ: 0.95,
    simN: 300,
    viewMode: "pdf_pmf",
    compareOverlay: "none",
    simulatedSample: []
  },

  // 3. Bootstrap Studio State
  bootstrap: {
    presetId: "skewed_repair_times",
    statisticId: "mean",
    primaryCI: "percentile",
    confLevel: 0.95,
    replicates: 2000,
    seed: 4289104,
    plotType: "histogram",
    lastResult: null
  },

  // 4. Permutation Studio State
  permutation: {
    presetId: "sleep_deprivation_trial",
    statisticId: "diff_means",
    alternative: "two-sided",
    exactMode: "exact_if_available",
    pValConv: "plus_one",
    replicates: 2000,
    seed: 4289104,
    lastResult: null
  },

  // 5. Inference Workbench State
  workbench: {
    title: "Sleep Deprivation vs Control Visual Learning",
    designType: "two_independent_numerical",
    statisticId: "diff_means",
    dataPayload: PRESET_DATASETS.sleep_deprivation_trial.dataPayload,
    previewRows: [],
    headers: ["group", "improvement_ms"],
    bootResult: null,
    permResult: null
  },

  // 6. Experiment Simulator State
  experiments: {
    mode: "coverage",
    covDist: "normal",
    covMethod: "t_interval",
    covN: 25,
    covLevel: 0.95,
    powN: 30,
    powDelta: 0.5,
    powSD: 1.0,
    powAlpha: 0.05,
    peekMaxN: 60,
    peekStep: 5,
    seed: 4289104,
    lastCovResult: null,
    lastPowResult: null,
    lastPeekResult: null
  },

  // 7. Simulation Unity State
  unity: {
    mu1: 55,
    mu2: 50,
    n: 25,
    lastResult: null
  },

  // 8. Inference Atlas State
  atlas: {
    searchQuery: "",
    domainFilter: "all",
    statusFilter: "all",
    selectedId: ATLAS_ENTRIES[0].id
  },

  // 9. Guided Investigations State
  investigations: {
    selectedId: GUIDED_INVESTIGATIONS[0].id,
    selectedAnswers: {}
  }
};

// ============================================================================
// UTILITY HELPERS
// ============================================================================

function showToast(message) {
  const banner = document.getElementById("toast-banner");
  if (!banner) return;
  banner.textContent = message;
  banner.classList.add("visible");
  setTimeout(() => banner.classList.remove("visible"), 2600);
}

function downloadBlob(content, filename, mimeType = "text/plain;charset=utf-8") {
  try {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast(`Exported ${filename}`);
  } catch (_err) {
    showToast("Export prepared in preview.");
  }
}

function copyTextSafe(text, label = "Copied to clipboard") {
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(() => showToast(label)).catch(() => fallbackCopy(text, label));
    } else {
      fallbackCopy(text, label);
    }
  } catch (_e) {
    fallbackCopy(text, label);
  }
}

function fallbackCopy(text, label) {
  const ta = document.createElement("textarea");
  ta.value = text;
  ta.style.position = "fixed";
  ta.style.opacity = "0";
  document.body.appendChild(ta);
  ta.select();
  try {
    document.execCommand("copy");
    showToast(label);
  } catch (_err) {
    showToast("State encoded in URL bar.");
  }
  document.body.removeChild(ta);
}

/**
 * Populates a <select> of statistics filtered by study designType.
 */

/**
 * Extracts a balanced {...} group starting at startIdx.
 */
function extractBracedGroup(str, startIdx) {
  if (str[startIdx] !== "{") return null;
  let depth = 0;
  for (let i = startIdx; i < str.length; i++) {
    if (str[i] === "{") depth++;
    else if (str[i] === "}") {
      depth--;
      if (depth === 0) {
        return { content: str.slice(startIdx + 1, i), endIdx: i + 1 };
      }
    }
  }
  return null;
}

/**
 * Converts a LaTeX math inner string into semantic HTML math markup.
 */
function renderLatexInner(tex) {
  let s = String(tex || "").trim();
  s = s.replace(/\\left\s*/g, "").replace(/\\right\s*/g, "");
  s = s.replace(/\\middle\|/g, " | ").replace(/\\mid\b/g, " | ");
  s = s.replace(/\\quad\b/g, "&emsp;").replace(/\\qquad\b/g, "&emsp;&emsp;");
  s = s.replace(/\\,/g, "&thinsp;").replace(/\\;/g, " ").replace(/\\!/g, "");
  s = s.replace(/\\\{/g, "{").replace(/\\\}/g, "}").replace(/\\%/g, "%");

  let changed = true;
  let guard = 0;
  while (changed && guard++ < 50) {
    changed = false;

    let idx = s.indexOf("\\text{");
    if (idx !== -1) {
      const b = extractBracedGroup(s, idx + 5);
      if (b) {
        s = s.slice(0, idx) + `<span style="font-style:normal;font-family:var(--font-body);">${renderLatexInner(b.content)}</span>` + s.slice(b.endIdx);
        changed = true;
        continue;
      }
    }

    idx = s.indexOf("\\mathcal{");
    if (idx !== -1) {
      const b = extractBracedGroup(s, idx + 8);
      if (b) {
        const mapCal = { N: "𝒩", F: "ℱ", U: "𝒰" };
        s = s.slice(0, idx) + (mapCal[b.content] || `<i>${b.content}</i>`) + s.slice(b.endIdx);
        changed = true;
        continue;
      }
    }

    idx = s.indexOf("\\mathbb{");
    if (idx !== -1) {
      const b = extractBracedGroup(s, idx + 7);
      if (b) {
        const mapBb = { R: "ℝ", E: "𝔼", P: "ℙ", Z: "ℤ", N: "ℕ" };
        s = s.slice(0, idx) + (mapBb[b.content] || `<b>${b.content}</b>`) + s.slice(b.endIdx);
        changed = true;
        continue;
      }
    }

    idx = s.indexOf("\\frac{");
    if (idx !== -1) {
      const b1 = extractBracedGroup(s, idx + 5);
      if (b1 && s[b1.endIdx] === "{") {
        const b2 = extractBracedGroup(s, b1.endIdx);
        if (b2) {
          s = s.slice(0, idx) + `<span class="math-frac"><span class="m-num">${renderLatexInner(b1.content)}</span><span class="m-den">${renderLatexInner(b2.content)}</span></span>` + s.slice(b2.endIdx);
          changed = true;
          continue;
        }
      }
    }

    idx = s.indexOf("\\binom{");
    if (idx !== -1) {
      const b1 = extractBracedGroup(s, idx + 6);
      if (b1 && s[b1.endIdx] === "{") {
        const b2 = extractBracedGroup(s, b1.endIdx);
        if (b2) {
          s = s.slice(0, idx) + `(<span class="math-frac"><span class="m-num" style="border:none;">${renderLatexInner(b1.content)}</span><span class="m-den">${renderLatexInner(b2.content)}</span></span>)` + s.slice(b2.endIdx);
          changed = true;
          continue;
        }
      }
    }

    idx = s.indexOf("\\sqrt{");
    if (idx !== -1) {
      const b1 = extractBracedGroup(s, idx + 5);
      if (b1) {
        s = s.slice(0, idx) + `<span class="math-sqrt"><span class="m-rad">&radic;</span><span class="m-radicand">${renderLatexInner(b1.content)}</span></span>` + s.slice(b1.endIdx);
        changed = true;
        continue;
      }
    }

    idx = s.indexOf("\\bar{");
    if (idx !== -1) {
      const b1 = extractBracedGroup(s, idx + 4);
      if (b1) {
        s = s.slice(0, idx) + `<span class="m-overline">${renderLatexInner(b1.content)}</span>` + s.slice(b1.endIdx);
        changed = true;
        continue;
      }
    }

    for (const mac of ["\\widehat{", "\\hat{"]) {
      idx = s.indexOf(mac);
      if (idx !== -1) {
        const b1 = extractBracedGroup(s, idx + mac.length - 1);
        if (b1) {
          const inner = renderLatexInner(b1.content);
          const out = inner.length <= 2 ? `${inner}&#770;` : `<span class="m-overline">${inner}</span>&#770;`;
          s = s.slice(0, idx) + out + s.slice(b1.endIdx);
          changed = true;
          break;
        }
      }
    }
    if (changed) continue;

    idx = s.indexOf("\\tilde{");
    if (idx !== -1) {
      const b1 = extractBracedGroup(s, idx + 6);
      if (b1) {
        const inner = renderLatexInner(b1.content);
        s = s.slice(0, idx) + `${inner}&#771;` + s.slice(b1.endIdx);
        changed = true;
        continue;
      }
    }

    idx = s.indexOf("\\xrightarrow{");
    if (idx !== -1) {
      const b1 = extractBracedGroup(s, idx + 12);
      if (b1) {
        s = s.slice(0, idx) + `<span class="math-op"><span class="m-sup">${renderLatexInner(b1.content)}</span><span class="m-sym">&rarr;</span></span>` + s.slice(b1.endIdx);
        changed = true;
        continue;
      }
    }

    idx = s.indexOf("\\stackrel{");
    if (idx !== -1) {
      const b1 = extractBracedGroup(s, idx + 9);
      if (b1 && s[b1.endIdx] === "{") {
        const b2 = extractBracedGroup(s, b1.endIdx);
        if (b2) {
          s = s.slice(0, idx) + `<span class="math-op"><span class="m-sup">${renderLatexInner(b1.content)}</span><span class="m-sym">${renderLatexInner(b2.content)}</span></span>` + s.slice(b2.endIdx);
          changed = true;
          continue;
        }
      }
    }
  }

  const symMap = [
    ["\\\\theta", "θ"], ["\\\\mu", "μ"], ["\\\\sigma", "σ"], ["\\\\alpha", "α"],
    ["\\\\beta", "β"], ["\\\\gamma", "γ"], ["\\\\delta", "δ"], ["\\\\Delta", "Δ"],
    ["\\\\varepsilon", "ε"], ["\\\\epsilon", "ε"], ["\\\\lambda", "λ"], ["\\\\nu", "ν"],
    ["\\\\rho", "ρ"], ["\\\\phi", "ϕ"], ["\\\\Phi", "Φ"], ["\\\\chi", "χ"],
    ["\\\\Omega", "Ω"], ["\\\\Gamma", "Γ"], ["\\\\pi", "π"],
    ["\\\\le", "≤"], ["\\\\ge", "≥"], ["\\\\neq", "≠"], ["\\\\ne", "≠"],
    ["\\\\pm", "±"], ["\\\\times", "×"], ["\\\\cdot", "·"], ["\\\\ll", "≪"], ["\\\\gg", "≫"],
    ["\\\\longrightarrow", "⟶"], ["\\\\Longrightarrow", "⟹"], ["\\\\implies", "⟹"],
    ["\\\\iff", "⟺"], ["\\\\leftrightarrow", "↔"], ["\\\\rightarrow", "→"], ["\\\\to", "→"],
    ["\\\\in", "∈"], ["\\\\bigcup", "⋃"], ["\\\\cup", "∪"], ["\\\\cap", "∩"], ["\\\\emptyset", "∅"],
    ["\\\\approx", "≈"], ["\\\\sim", "∼"], ["\\\\propto", "∝"], ["\\\\infty", "∞"],
    ["\\\\dots", "…"], ["\\\\ldots", "…"], ["\\\\sum", "∑"], ["\\\\int", "∫"],
    ["\\\\ln", "ln"], ["\\\\log", "log"], ["\\\\exp", "exp"], ["\\\\max", "max"], ["\\\\min", "min"], ["\\\\inf", "inf"], ["\\\\lim", "lim"]
  ];
  for (const [pat, rep] of symMap) {
    s = s.replace(new RegExp(pat + "(?![a-zA-Z])", "g"), rep);
  }

  guard = 0;
  changed = true;
  while (changed && guard++ < 40) {
    changed = false;
    let subIdx = s.indexOf("_{");
    if (subIdx !== -1) {
      const b = extractBracedGroup(s, subIdx + 1);
      if (b) {
        s = s.slice(0, subIdx) + `<sub>${renderLatexInner(b.content)}</sub>` + s.slice(b.endIdx);
        changed = true;
        continue;
      }
    }
    let supIdx = s.indexOf("^{");
    if (supIdx !== -1) {
      const b = extractBracedGroup(s, supIdx + 1);
      if (b) {
        s = s.slice(0, supIdx) + `<sup>${renderLatexInner(b.content)}</sup>` + s.slice(b.endIdx);
        changed = true;
        continue;
      }
    }
  }
  s = s.replace(/_([a-zA-Z0-9*+-])/g, "<sub>$1</sub>");
  s = s.replace(/\^([a-zA-Z0-9*+-])/g, "<sup>$1</sup>");
  return s;
}

/**
 * Formats any $...$ or $...$ LaTeX expressions in an HTML string into typeset HTML math.
 */
function formatMathHTML(input) {
  if (!input || typeof input !== "string") return input;
  let out = input.replace(/\$\$([^$]+)\$\$/g, (_, tex) => `<div class="math-tex-block">${renderLatexInner(tex)}</div>`);
  out = out.replace(/\$([^$\n]+)\$/g, (_, tex) => `<span class="math-tex">${renderLatexInner(tex)}</span>`);
  return out;
}

function populateStatisticSelect(selectEl, designType, currentStatId) {
  if (!selectEl) return;
  const matching = Object.values(STATISTIC_REGISTRY).filter((s) => s.designType === designType);
  selectEl.innerHTML = matching
    .map((s) => `<option value="${s.id}">${s.name} (${s.symbol})</option>`)
    .join("");
  if (matching.some((s) => s.id === currentStatId)) {
    selectEl.value = currentStatId;
  } else if (matching.length > 0) {
    selectEl.value = matching[0].id;
  }
}

// ============================================================================
// DESTINATION 1: SAMPLING LABORATORY
// ============================================================================

function getSamplingPopConfig(popDistId) {
  switch (popDistId) {
    case "exponential":
      return { distId: "exponential", params: { lambda: 0.2 } }; // mean = 5, sd = 5
    case "lognormal":
      return { distId: "lognormal", params: { muLog: 1.2, sigmaLog: 0.7 } };
    case "continuous_uniform":
      return { distId: "continuous_uniform", params: { a: 0, b: 100 } };
    case "gaussian_mixture":
      return { distId: "gaussian_mixture", params: { w: 0.55, mu1: 35, sigma1: 6, mu2: 68, sigma2: 7 } };
    case "student_t":
      return { distId: "student_t", params: { df: 3 } };
    case "binomial":
      return { distId: "binomial", params: { n: 20, p: 0.35 } };
    case "poisson":
      return { distId: "poisson", params: { lambda: 4.5 } };
    default:
      return { distId: "normal", params: { mu: 50, sigma: 12 } };
  }
}

function drawSingleSampleFromConfig(popRecords, dist, params, n, mechanism, prng) {
  if (mechanism === "srswor") {
    const rawPop = popRecords.map((r) => r.value);
    return sampleWithoutReplacement(rawPop, Math.min(n, rawPop.length), prng);
  }
  if (mechanism === "stratified") {
    return sampleStratified(popRecords, n, false, prng).map((r) => r.value);
  }
  if (mechanism === "cluster") {
    const numClusters = Math.max(1, Math.round(n / 10));
    return sampleClusters(popRecords, numClusters, prng).map((r) => r.value);
  }
  // Default SRSWR / i.i.d.
  const out = new Array(n);
  for (let i = 0; i < n; i++) out[i] = dist.sample(params, prng);
  return out;
}

function runSamplingSimulation(drawCountMode = "batch") {
  const sState = state.sampling;
  const { distId, params } = getSamplingPopConfig(sState.popDistId);
  const dist = getDistribution(distId);
  const statDef = STATISTIC_REGISTRY[sState.statId] || STATISTIC_REGISTRY.mean;
  const prng = createPRNG(sState.seed);

  const finiteN = Math.max(sState.sampleSize + 5, sState.finiteN);
  const popValues = new Array(finiteN);
  const popRecords = new Array(finiteN);
  for (let i = 0; i < finiteN; i++) {
    const v = dist.sample(params, prng);
    popValues[i] = v;
    popRecords[i] = {
      value: v,
      stratum: i < finiteN / 2 ? "Stratum A" : "Stratum B",
      cluster: `Cluster_${(i % 25) + 1}`
    };
  }
  sState.populationValues = popValues;

  const moments = dist.moments(params);
  const trueMean = sState.mechanism === "srswr" ? moments.mean : mean(popValues);
  const trueSD = sState.mechanism === "srswr" ? moments.sd : standardDeviation(popValues);
  const trueTarget = statDef.id === "sd" ? trueSD : statDef.id === "iqr" ? statDef.compute(popValues) : trueMean;
  sState.trueParam = trueTarget;
  sState.trueSD = trueSD;

  const B = drawCountMode === "single" ? Math.max(1, sState.sampleStats.length + 1) : sState.replicatesB;
  const stats = [];
  let lastSample = [];
  for (let b = 0; b < B; b++) {
    const samp = drawSingleSampleFromConfig(popRecords, dist, params, sState.sampleSize, sState.mechanism, prng);
    const st = statDef.compute(samp);
    if (Number.isFinite(st)) stats.push(st);
    if (b === B - 1) lastSample = samp;
  }
  sState.lastSample = lastSample;
  sState.sampleStats = stats;

  // Build 4 LLN running mean trajectories of length 250
  const llnPaths = [];
  for (let p = 0; p < 4; p++) {
    const path = [];
    let sum = 0;
    for (let m = 1; m <= 250; m++) {
      sum += dist.sample(params, prng);
      path.push(sum / m);
    }
    llnPaths.push(path);
  }
  sState.llnTrajectories = llnPaths;

  renderSamplingView();
}

function renderSamplingView() {
  const sState = state.sampling;
  const pal = getCanvasPalette();
  const statDef = STATISTIC_REGISTRY[sState.statId] || STATISTIC_REGISTRY.mean;

  const popSum = summarizeUnivariate(sState.populationValues);
  const oneSum = summarizeUnivariate(sState.lastSample);
  const distSum = summarizeUnivariate(sState.sampleStats);

  // Compute common horizontal bounds so the user can visually compare spread of raw data vs spread of sample means
  const minX = popSum.valid ? popSum.min : 0;
  const maxX = popSum.valid ? popSum.max : 100;

  renderDistributionHistogram(
    document.getElementById("canvas-samp-pop"),
    sState.populationValues,
    {
      height: 175,
      xMin: minX,
      xMax: maxX,
      barFill: pal.neutralBar,
      barStroke: pal.neutralStroke,
      markers: [{ value: sState.trueParam, color: pal.secondary, label: `True=${sState.trueParam.toFixed(2)}` }]
    }
  );

  const lastStat = statDef.compute(sState.lastSample);
  renderDistributionHistogram(
    document.getElementById("canvas-samp-one"),
    sState.lastSample,
    {
      height: 175,
      xMin: minX,
      xMax: maxX,
      barFill: pal.warningFill,
      barStroke: pal.warning,
      markers: [
        { value: sState.trueParam, color: pal.secondary, label: `True`, dashed: true },
        { value: lastStat, color: pal.primary, label: `Sample Est=${lastStat.toFixed(2)}` }
      ]
    }
  );

  const fpc = sState.mechanism === "srswor" ? finitePopulationCorrection(sState.sampleSize, sState.finiteN) : 1.0;
  const theoSE = (sState.statId === "mean" && Number.isFinite(sState.trueSD))
    ? (sState.trueSD / Math.sqrt(sState.sampleSize)) * fpc
    : distSum.sd;

  renderDistributionHistogram(
    document.getElementById("canvas-samp-dist"),
    sState.sampleStats,
    {
      height: 215,
      barFill: pal.primaryFill,
      barStroke: pal.primary,
      normalOverlay: { mean: sState.trueParam, sd: theoSE },
      markers: [
        { value: sState.trueParam, color: pal.secondary, label: `True=${sState.trueParam.toFixed(2)}`, dashed: true },
        { value: distSum.mean, color: pal.primary, label: `Mean(Est)=${distSum.mean.toFixed(2)}` }
      ],
      xLabel: `Values of ${statDef.name} (${statDef.symbol}) across B = ${sState.sampleStats.length} repeated samples of size n = ${sState.sampleSize}`
    }
  );

  renderLLNTrajectoryCanvas(document.getElementById("canvas-samp-lln"), sState.llnTrajectories, sState.trueParam);
  renderNormalQQCanvas(document.getElementById("canvas-samp-qq"), sState.sampleStats);

  // Captions & KPIs
  document.getElementById("samp-pop-caption-stats").textContent =
    `Mean = ${popSum.mean.toFixed(2)} | SD (σ) = ${popSum.sd.toFixed(2)} | Skew = ${popSum.skewness.toFixed(2)}`;
  document.getElementById("samp-one-caption-stats").textContent =
    `n = ${oneSum.n} | Sample Est = ${lastStat.toFixed(3)} | Sample SD (s) = ${oneSum.sd.toFixed(2)}`;
  document.getElementById("samp-dist-caption-stats").textContent =
    `B = ${distSum.n} samples | Mean = ${distSum.mean.toFixed(3)} | Empirical SE = ${distSum.sd.toFixed(3)} | Skew = ${distSum.skewness.toFixed(2)}`;

  document.getElementById("kpi-samp-true-param").textContent = sState.trueParam.toFixed(4);
  document.getElementById("kpi-samp-last-stat").textContent = lastStat.toFixed(4);
  document.getElementById("kpi-samp-emp-mean").textContent = distSum.mean.toFixed(4);
  document.getElementById("kpi-samp-emp-se").textContent = distSum.sd.toFixed(4);
  document.getElementById("kpi-samp-theo-se").textContent = Number.isFinite(theoSE) ? theoSE.toFixed(4) : "Sim Only";
  document.getElementById("kpi-samp-fpc").textContent = fpc.toFixed(4);

  // Comparison Table
  const tbody = document.getElementById("tbody-samp-comparison");
  tbody.innerHTML = `
    <tr>
      <td><strong>1. Population ($F$)</strong></td>
      <td class="num">${popSum.mean.toFixed(3)}</td>
      <td class="num">${popSum.sd.toFixed(3)} ($\\sigma$)</td>
      <td class="num">${popSum.skewness.toFixed(2)}</td>
    </tr>
    <tr>
      <td><strong>2. One Sample ($n=${oneSum.n}$)</strong></td>
      <td class="num">${oneSum.mean.toFixed(3)}</td>
      <td class="num">${oneSum.sd.toFixed(3)} ($s$)</td>
      <td class="num">${oneSum.skewness.toFixed(2)}</td>
    </tr>
    <tr>
      <td><strong>3. Sampling Dist ($B=${distSum.n}$)</strong></td>
      <td class="num">${distSum.mean.toFixed(3)}</td>
      <td class="num">${distSum.sd.toFixed(3)} ($SE$)</td>
      <td class="num">${distSum.skewness.toFixed(2)}</td>
    </tr>
  `;

  tbody.innerHTML = formatMathHTML(tbody.innerHTML);

  // Mode-Aware Explanation (Concise & Math-Typeset)
  const expBox = document.getElementById("samp-Dynamic-Explanation");
  if (state.explanationMode === "simple") {
    expBox.innerHTML = formatMathHTML(`<strong>Intuition:</strong> Raw items vary by $\\sigma \\approx ${popSum.sd.toFixed(2)}$, but averaging $n = ${sState.sampleSize}$ items cancels highs and lows—shrinking sample-to-sample spread to $SE = ${distSum.sd.toFixed(3)}$.`);
  } else if (state.explanationMode === "standard") {
    expBox.innerHTML = formatMathHTML(`<strong>Interpretation:</strong> Across $B = ${distSum.n}$ samples ($n = ${sState.sampleSize}$), ${statDef.name} centers at <strong>${distSum.mean.toFixed(3)}</strong> ($\\theta = ${sState.trueParam.toFixed(3)}$) with $SE = ${distSum.sd.toFixed(4)}$. Larger $n$ shrinks $SE \\propto \\frac{1}{\\sqrt{n}}$; larger $B$ only smooths the histogram.`);
  } else {
    expBox.innerHTML = formatMathHTML(`<strong>Technical:</strong> $SE(\\bar{X}) = \\frac{\\sigma}{\\sqrt{n}}\\cdot\\text{FPC} = \\frac{${sState.trueSD.toFixed(3)}}{\\sqrt{${sState.sampleSize}}}\\times ${fpc.toFixed(4)} = ${theoSE.toFixed(4)}$, $\\hat{\\gamma}_1(\\hat{\\theta}) = ${distSum.skewness.toFixed(3)} \\approx \\frac{\\gamma_1(X)}{\\sqrt{n}}$. Seed: <code>${sState.seed}</code>.`);
  }

  const warnBox = document.getElementById("samp-Warning-Box");
  if (sState.popDistId === "student_t") {
    warnBox.innerHTML = formatMathHTML(`<div class="callout warning"><strong>Heavy Tails:</strong> $t(\\nu=3)$ has variance $\\frac{\\nu}{\\nu-2}=3$ but infinite 3rd/4th moments, slowing extreme-tail CLT convergence.</div>`);
  } else if (sState.mechanism === "cluster") {
    warnBox.innerHTML = formatMathHTML(`<div class="callout warning"><strong>Cluster Design:</strong> Whole-cluster draws require intra-cluster correlation adjustment rather than naive $\\frac{s}{\\sqrt{n}}$.</div>`);
  } else {
    warnBox.innerHTML = "";
  }
}

// ============================================================================
// DESTINATION 2: PROBABILITY DISTRIBUTION EXPLORER
// ============================================================================

function renderDistParameterControls() {
  const dState = state.distExplorer;
  const dist = getDistribution(dState.distId);
  const container = document.getElementById("dist-dynamic-params");
  if (!container) return;

  const newParams = {};
  container.innerHTML = dist.parameters
    .map((p) => {
      const val = dState.params[p.key] !== undefined ? dState.params[p.key] : p.default;
      newParams[p.key] = val;
      if (p.type === "text") {
        return `
          <div class="control-group">
            <label class="control-label" for="dparam-${p.key}">${p.label}</label>
            <input type="text" id="dparam-${p.key}" data-param-key="${p.key}" class="control-input mono-input dist-param-input" value="${val}">
          </div>
        `;
      }
      return `
        <div class="control-group">
          <label class="control-label" for="dparam-${p.key}">
            <span>${p.label}</span>
            <span class="mono" id="dparam-lbl-${p.key}">${val}</span>
          </label>
          <input type="range" id="dparam-${p.key}" data-param-key="${p.key}" class="control-range dist-param-input" min="${p.min}" max="${p.max}" step="${p.step}" value="${val}">
        </div>
      `;
    })
    .join("");
  dState.params = newParams;

  // Adjust default range a and b to match support
  const mom = dist.moments(newParams);
  if (Number.isFinite(mom.mean) && Number.isFinite(mom.sd)) {
    dState.rangeA = Number((mom.mean - 0.5 * mom.sd).toFixed(2));
    dState.rangeB = Number((mom.mean + 1.0 * mom.sd).toFixed(2));
    document.getElementById("dist-range-a").value = dState.rangeA;
    document.getElementById("dist-range-b").value = dState.rangeB;
  }

  container.querySelectorAll(".dist-param-input").forEach((input) => {
    input.addEventListener("input", (e) => {
      const key = e.target.getAttribute("data-param-key");
      const val = e.target.type === "text" ? e.target.value : Number(e.target.value);
      dState.params[key] = val;
      const lbl = document.getElementById(`dparam-lbl-${key}`);
      if (lbl) lbl.textContent = String(val);
      updateDistributionExplorer();
    });
  });
}

function updateDistributionExplorer() {
  const dState = state.distExplorer;
  const dist = getDistribution(dState.distId);
  const valCheck = dist.validate(dState.params);
  if (!valCheck.valid) {
    document.getElementById("dist-param-note").innerHTML = `<strong>Validation Error:</strong> ${valCheck.reason}`;
    return;
  }

  const moments = dist.moments(dState.params);
  let compareSpec = null;
  if (dState.compareOverlay === "std_normal") {
    compareSpec = { dist: getDistribution("normal"), params: { mu: 0, sigma: 1 }, label: "Standard Normal N(0,1)" };
  } else if (dState.compareOverlay === "moment_normal" && Number.isFinite(moments.mean) && moments.sd > 0) {
    compareSpec = { dist: getDistribution("normal"), params: { mu: moments.mean, sigma: moments.sd }, label: `Matched N(${moments.mean.toFixed(1)}, ${moments.sd.toFixed(1)}²)` };
  } else if (dState.compareOverlay === "heavy_t3") {
    compareSpec = { dist: getDistribution("student_t"), params: { df: 3 }, label: "Heavy-Tailed t(3)" };
  }

  const probs = computeDistributionProbabilities(dState.distId, dState.params, dState.rangeA, dState.rangeB);
  const quantVal = dist.quantile(dState.quantileQ, dState.params);
  renderTheoreticalDistributionPlot(
    document.getElementById("canvas-dist-main"),
    dist,
    dState.params,
    dState.rangeA,
    dState.rangeB,
    dState.simulatedSample,
    dState.viewMode,
    compareSpec,
    quantVal
  );

  document.getElementById("kpi-dist-mean").textContent = Number.isFinite(moments.mean) ? moments.mean.toFixed(4) : "Undefined";
  document.getElementById("kpi-dist-var").textContent = Number.isFinite(moments.variance) ? moments.variance.toFixed(4) : String(moments.variance);
  document.getElementById("kpi-dist-sd").textContent = Number.isFinite(moments.sd) ? moments.sd.toFixed(4) : String(moments.sd);
  document.getElementById("kpi-dist-skew").textContent = Number.isFinite(moments.skewness) ? moments.skewness.toFixed(4) : "Undefined";
  document.getElementById("kpi-dist-p-int").textContent = probs.valid ? probs.intervalProb.toFixed(4) : "—";
  document.getElementById("kpi-dist-quant").textContent = Number.isFinite(quantVal) ? quantVal.toFixed(4) : String(quantVal);

  document.getElementById("dist-param-note").innerHTML = formatMathHTML(
    `<strong>Parameterization (${dist.notation}):</strong> ${dist.parameterizationNote}`
  );

  const tbody = document.getElementById("tbody-dist-probs");
  const aLow = Math.min(dState.rangeA, dState.rangeB);
  const bHigh = Math.max(dState.rangeA, dState.rangeB);
  if (probs.isDiscrete) {
    tbody.innerHTML = formatMathHTML(`
      <tr><td>Point Mass $P(X = ${Math.round(aLow)})$</td><td class="num">${probs.exactAtA.toFixed(4)}</td></tr>
      <tr><td>Left Tail $P(X \\le ${aLow})$</td><td class="num">${probs.leftTail.toFixed(4)}</td></tr>
      <tr><td>Right Tail $P(X \\ge ${aLow})$</td><td class="num">${probs.rightTail.toFixed(4)}</td></tr>
      <tr><td>Interval $P(${aLow} \\le X \\le ${bHigh})$</td><td class="num">${probs.intervalProb.toFixed(4)}</td></tr>
      <tr><td>Quantile $F^{-1}(${dState.quantileQ})$</td><td class="num">${quantVal}</td></tr>
    `);
  } else {
    tbody.innerHTML = formatMathHTML(`
      <tr><td>Density $f(${aLow.toFixed(2)})$ <em>(height, not prob.)</em></td><td class="num">${probs.densityAtA.toFixed(4)}</td></tr>
      <tr><td>Point Prob. $P(X = ${aLow.toFixed(2)})$</td><td class="num">0.0000</td></tr>
      <tr><td>Left Tail $P(X \\le ${aLow.toFixed(2)})$</td><td class="num">${probs.leftTail.toFixed(4)}</td></tr>
      <tr><td>Right Tail $P(X \\ge ${aLow.toFixed(2)})$</td><td class="num">${probs.rightTail.toFixed(4)}</td></tr>
      <tr><td>Area $P(${aLow.toFixed(2)} \\le X \\le ${bHigh.toFixed(2)})$</td><td class="num">${probs.intervalProb.toFixed(4)}</td></tr>
    `);
  }

  const interp = document.getElementById("dist-interpretation-box");
  if (dist.type === "continuous") {
    interp.innerHTML = formatMathHTML(`<strong>Continuous Rule:</strong> Point probability is $P(X = a) = 0$; probability is the <strong>integrated area</strong> $\\int_{${aLow.toFixed(2)}}^{${bHigh.toFixed(2)}} f(x)\\,dx = ${(probs.intervalProb * 100).toFixed(2)}%$.`);
  } else {
    interp.innerHTML = formatMathHTML(`<strong>Discrete Rule:</strong> Probability sums discrete point masses $\\sum_{k \\in [${aLow}, ${bHigh}]} p(k) = ${(probs.intervalProb * 100).toFixed(2)}%$.`);
  }
}

// ============================================================================
// DESTINATION 3: BOOTSTRAP STUDIO
// ============================================================================

function resolveDatasetSource(presetId) {
  if (presetId === "custom_workbench") {
    return {
      title: state.workbench.title || "Custom Workbench Dataset",
      designType: state.workbench.designType,
      isDependentTimeSeries: false,
      defaultStatistic: state.workbench.statisticId,
      dataPayload: state.workbench.dataPayload
    };
  }
  return getPresetDataset(presetId);
}

function executeBootstrapStudio() {
  const bState = state.bootstrap;
  const ds = resolveDatasetSource(bState.presetId);
  populateStatisticSelect(document.getElementById("boot-stat-select"), ds.designType, bState.statisticId);
  bState.statisticId = document.getElementById("boot-stat-select").value;

  const res = runBootstrapAnalysis({
    statisticId: bState.statisticId,
    dataPayload: ds.dataPayload,
    replicates: bState.replicates,
    confLevel: bState.confLevel,
    seed: bState.seed,
    isDependentTimeSeries: ds.isDependentTimeSeries,
    datasetTitle: ds.title
  });
  bState.lastResult = res;
  renderBootstrapStudioView();
}

function renderBootstrapStudioView() {
  const bState = state.bootstrap;
  const res = bState.lastResult;
  if (!res || !res.distributionObject) return;
  const pal = getCanvasPalette();

  document.getElementById("boot-resampling-badge").textContent = res.resamplingMechanism;

  // Warnings
  const warnEl = document.getElementById("boot-warnings-container");
  warnEl.innerHTML = formatMathHTML((res.warnings || [])
    .map((w) => `<div class="callout ${w.severity === "error" ? "error" : "warning"}"><strong>[${w.code}]</strong> ${w.message}</div>`)
    .join(""));

  const activeCI = res.intervals[bState.primaryCI]?.eligible
    ? res.intervals[bState.primaryCI]
    : res.intervals.percentile;

  renderDistributionHistogram(
    document.getElementById("canvas-boot-dist"),
    res.distributionObject.values,
    {
      height: 230,
      plotType: bState.plotType,
      ciBand: activeCI.ci,
      markers: [
        { value: res.originalEstimate, color: pal.warning, label: `Est=${res.originalEstimate.toFixed(3)}` },
        { value: res.bootstrapMean, color: pal.secondary, label: `BootMean=${res.bootstrapMean.toFixed(3)}`, dashed: true },
        { value: activeCI.ci[0], color: pal.primary, label: `L=${activeCI.ci[0].toFixed(3)}`, dashed: true },
        { value: activeCI.ci[1], color: pal.primary, label: `U=${activeCI.ci[1].toFixed(3)}`, dashed: true }
      ],
      xLabel: `Bootstrap Replicate Statistics (${res.statisticName}) — Shaded: ${activeCI.name}`
    }
  );

  renderBootstrapCIComparisonCanvas(document.getElementById("canvas-boot-ci-comp"), res);

  const bootDs = resolveDatasetSource(bState.presetId);
  document.getElementById("boot-dist-subtitle").textContent =
    `${res.sampleSizeSummary}${bootDs.unit ? ` (${bootDs.unit})` : ""} | B = ${res.completedReplicates} | Seed = ${res.prng.seed}`;

  // KPIs
  document.getElementById("kpi-boot-est").textContent = res.originalEstimate.toFixed(4);
  document.getElementById("kpi-boot-mean").textContent = res.bootstrapMean.toFixed(4);
  document.getElementById("kpi-boot-se").textContent = res.bootstrapSE.toFixed(4);
  document.getElementById("kpi-boot-bias").textContent = (res.bootstrapBias >= 0 ? "+" : "") + res.bootstrapBias.toFixed(4);
  document.getElementById("kpi-boot-bias-ratio").textContent = res.biasToSERatio.toFixed(3);
  document.getElementById("kpi-boot-b").textContent = `${res.completedReplicates} / ${res.requestedReplicates}`;

  // Intervals Table
  const tbodyInt = document.getElementById("tbody-boot-intervals");
  const rowsHtml = [];
  for (const key of ["percentile", "bca", "studentized", "normal", "basic"]) {
    const iv = res.intervals[key];
    if (!iv) continue;
    if (iv.eligible) {
      rowsHtml.push(`
        <tr>
          <td><strong>${iv.name}</strong></td>
          <td class="num">${iv.ci[0].toFixed(4)}</td>
          <td class="num">${iv.ci[1].toFixed(4)}</td>
          <td class="num">${iv.width.toFixed(4)}</td>
        </tr>
      `);
    } else {
      rowsHtml.push(`
        <tr>
          <td>${iv.name}</td>
          <td colspan="3" style="color:var(--color-text-muted); font-size:12px;">Not eligible: ${iv.reason}</td>
        </tr>
      `);
    }
  }
  if (res.classicalCounterpart?.valid && res.classicalCounterpart.ci) {
    const c = res.classicalCounterpart;
    rowsHtml.push(`
      <tr style="background:var(--color-surface-alt);">
        <td><strong>Classical (${c.methodName.split(" ")[0]})</strong></td>
        <td class="num">${c.ci[0].toFixed(4)}</td>
        <td class="num">${c.ci[1].toFixed(4)}</td>
        <td class="num">${(c.ci[1] - c.ci[0]).toFixed(4)}</td>
      </tr>
    `);
  }
  tbodyInt.innerHTML = rowsHtml.join("");

  // Example Resamples Table
  const tbodyRes = document.getElementById("tbody-boot-resamples");
  tbodyRes.innerHTML = (res.exampleResamples || [])
    .map((ex) => `
      <tr>
        <td class="mono">#${ex.index}</td>
        <td class="num">${ex.stat.toFixed(4)}</td>
        <td class="mono" style="font-size:11px;">[${ex.preview.join(", ")}...]</td>
      </tr>
    `)
    .join("");

  // Mode-Aware Explanation (Concise & Math-Typeset)
  const expBox = document.getElementById("boot-explanation-box");
  if (state.explanationMode === "simple") {
    expBox.innerHTML = formatMathHTML(`<strong>Intuition:</strong> Across $B = ${res.completedReplicates}$ resamples with replacement, ${res.statisticName} varies by $\\widehat{SE}_{\\text{boot}} = ${res.bootstrapSE.toFixed(4)}$. The ${(res.confLevel * 100).toFixed(0)}% ${activeCI.name} is <strong>[${activeCI.ci[0].toFixed(4)}, ${activeCI.ci[1].toFixed(4)}]</strong>.`);
  } else if (state.explanationMode === "standard") {
    expBox.innerHTML = formatMathHTML(`<strong>Interpretation:</strong> ${(res.confLevel * 100).toFixed(0)}% ${activeCI.name} for <strong>${res.estimand}</strong>: <strong>[${activeCI.ci[0].toFixed(4)}, ${activeCI.ci[1].toFixed(4)}]</strong>. Centered at $\\hat{\\theta} = ${res.originalEstimate.toFixed(4)}$ with $\\widehat{SE}_{\\text{boot}} = ${res.bootstrapSE.toFixed(4)}$ and bias $\\bar{\\theta}^* - \\hat{\\theta} = ${res.bootstrapBias.toFixed(4)}$.`);
  } else {
    expBox.innerHTML = formatMathHTML(`<strong>Technical:</strong> $\\widehat{SE}_{\\text{boot}} = \\sqrt{\\frac{1}{B-1}\\sum_{b=1}^{B}(\\hat{\\theta}^{*b} - \\bar{\\theta}^*)^2} = ${res.bootstrapSE.toFixed(4)}$, $\\widehat{\\text{Bias}} = ${res.bootstrapBias.toFixed(4)}$. ${res.intervals.bca?.eligible ? `BCa: $z_0 = ${res.intervals.bca.z0.toFixed(4)}, \\hat{a} = ${res.intervals.bca.acceleration.toFixed(4)}$.` : ""} $SE_{\\text{MC}}(\\bar{\\theta}^*) = ${res.monteCarloUncertainty.mcSEOfBootstrapMean.toFixed(5)}$.`);
  }
}

// ============================================================================
// DESTINATION 4: PERMUTATION & RANDOMIZATION STUDIO
// ============================================================================

function executePermutationStudio() {
  const pState = state.permutation;
  const ds = resolveDatasetSource(pState.presetId);
  populateStatisticSelect(document.getElementById("perm-stat-select"), ds.designType, pState.statisticId);
  pState.statisticId = document.getElementById("perm-stat-select").value;

  const res = runPermutationAnalysis({
    statisticId: pState.statisticId,
    dataPayload: ds.dataPayload,
    alternative: pState.alternative,
    replicates: pState.replicates,
    seed: pState.seed,
    useExactIfAvailable: pState.exactMode === "exact_if_available",
    pValueConvention: pState.pValConv,
    studyDesign: ds.studyDesign || "randomized_experiment",
    datasetTitle: ds.title
  });
  pState.lastResult = res;
  renderPermutationStudioView();
}

function renderPermutationStudioView() {
  const pState = state.permutation;
  const res = pState.lastResult;
  if (!res || !res.valid && res.reason) return;
  const pal = getCanvasPalette();

  document.getElementById("perm-mode-badge").textContent = res.isExactEnumerated
    ? `Exact Enumeration (All ${res.completedReplicates} Partitions)`
    : `Monte Carlo Randomization (B = ${res.completedReplicates})`;

  document.getElementById("perm-warnings-container").innerHTML = formatMathHTML((res.warnings || [])
    .map((w) => `<div class="callout warning"><strong>[${w.code}]</strong> ${w.message}</div>`)
    .join(""));

  renderDistributionHistogram(
    document.getElementById("canvas-perm-null"),
    res.distributionObject.values,
    {
      height: 235,
      tailThreshold: res.observedStatistic,
      tailDirection: res.alternative,
      markers: [
        { value: res.nullMean, color: pal.neutralStroke, label: `Null Center=${res.nullMean.toFixed(2)}`, dashed: true },
        { value: res.observedStatistic, color: pal.secondary, label: `Obs=${res.observedStatistic.toFixed(3)}` }
      ],
      xLabel: `Null Distribution of ${res.statisticName} under ${res.nullHypothesis}`
    }
  );

  document.getElementById("perm-null-title").textContent = res.nullHypothesis;
  const permDs = resolveDatasetSource(pState.presetId);
  document.getElementById("perm-null-subtitle").textContent = `${res.sampleSizeSummary}${permDs.unit ? ` (${permDs.unit})` : ""}`;
  document.getElementById("perm-mechanism-box").innerHTML = formatMathHTML(
    `<strong>Null Mechanism:</strong> ${res.nullGenerationMechanism} &bull; <strong>Condition:</strong> ${res.exchangeabilityAssumption}`
  );

  const pDisp = res.pValue < 0.0001 ? "< 0.0001" : res.pValue.toFixed(4);
  document.getElementById("kpi-perm-obs").textContent = res.observedStatistic.toFixed(4);
  document.getElementById("kpi-perm-pval").textContent = pDisp;
  document.getElementById("kpi-perm-hits").textContent = `${res.extremeCount} / ${res.completedReplicates}`;
  document.getElementById("kpi-perm-mcse").textContent = res.isExactEnumerated
    ? "0 (Exact)"
    : `±${res.monteCarloUncertainty.mcSE.toFixed(4)}`;
  document.getElementById("kpi-perm-null-mean").textContent = res.nullMean.toFixed(4);
  document.getElementById("kpi-perm-null-sd").textContent = res.nullSD.toFixed(4);

  // Classical comparison table
  const tbodyClass = document.getElementById("tbody-perm-classical");
  const rows = [
    `<tr>
      <td><strong>${res.isExactEnumerated ? "Exact Randomization" : "Monte Carlo Permutation"}</strong></td>
      <td class="num">${res.observedStatistic.toFixed(4)}</td>
      <td class="num">${pDisp}</td>
    </tr>`
  ];
  if (res.classicalCounterpart?.valid) {
    const c = res.classicalCounterpart;
    const cp = c.pValue < 0.0001 ? "< 0.0001" : c.pValue.toFixed(4);
    rows.push(`
      <tr style="background:var(--color-surface-alt);">
        <td><strong>${c.methodName}</strong></td>
        <td class="num">${c.testStatisticName} = ${c.testStatistic.toFixed(3)}</td>
        <td class="num">${cp}</td>
      </tr>
    `);
  }
  tbodyClass.innerHTML = rows.join("");

  // Example permutations
  document.getElementById("tbody-perm-examples").innerHTML = (res.examplePermutations || [])
    .map((ex) => `
      <tr>
        <td class="mono">#${ex.index}</td>
        <td class="num">${ex.stat.toFixed(4)}</td>
        <td class="mono" style="font-size:11px;">${ex.preview}</td>
      </tr>
    `)
    .join("");

  // Mode-Aware Explanation (Concise & Math-Typeset)
  const expBox = document.getElementById("perm-explanation-box");
  if (state.explanationMode === "simple") {
    expBox.innerHTML = formatMathHTML(`<strong>Meaning of $p = ${pDisp}$:</strong> If $H_0$ is true, a result as extreme as <strong>${res.observedStatistic.toFixed(3)}</strong> occurs by random chance in <strong>${(res.pValue * 100).toFixed(2)}%</strong> of shuffles. <em>($p$ is NOT the probability that $H_0$ is true.)</em>`);
  } else if (state.explanationMode === "standard") {
    expBox.innerHTML = formatMathHTML(`<strong>Evidence:</strong> Empirical $p = <strong>${pDisp}</strong>$ (${res.pValueFormulaText}). ${res.causalScopeNote}`);
  } else {
    expBox.innerHTML = formatMathHTML(`<strong>Technical:</strong> ${res.pValueFormulaText} MC $95%$ CI for $p$: $[${res.monteCarloUncertainty.ci95[0].toFixed(4)}, ${res.monteCarloUncertainty.ci95[1].toFixed(4)}]$. Tail: <code>${res.alternative}</code>.`);
  }
}

// ============================================================================
// DESTINATION 5: INFERENCE WORKBENCH
// ============================================================================

function loadPresetIntoWorkbench(presetId) {
  const ds = getPresetDataset(presetId);
  state.workbench.title = ds.title;
  state.workbench.designType = ds.designType;
  state.workbench.statisticId = ds.defaultStatistic;
  state.workbench.dataPayload = ds.dataPayload;

  // Serialize to raw textarea for inspection/editing
  const ta = document.getElementById("wb-raw-input");
  if (ds.designType === "one_numerical" || ds.designType === "one_binary") {
    ta.value = ds.dataPayload.join(", ");
  } else if (ds.designType.startsWith("two_independent")) {
    const g1Label = ds.groupLabels?.[0] || "Group1";
    const g2Label = ds.groupLabels?.[1] || "Group2";
    const lines = ["group,value"];
    ds.dataPayload.g1.forEach((v) => lines.push(`${g1Label},${v}`));
    ds.dataPayload.g2.forEach((v) => lines.push(`${g2Label},${v}`));
    ta.value = lines.join("\n");
  } else if (ds.designType === "paired_numerical" || ds.designType === "bivariate_numerical") {
    const lines = ["x,y"];
    ds.dataPayload.forEach((p) => lines.push(`${p.x},${p.y}`));
    ta.value = lines.join("\n");
  } else {
    ta.value = JSON.stringify(ds.dataPayload);
  }

  document.getElementById("wb-design-override").value = ds.designType;
  populateStatisticSelect(document.getElementById("wb-stat-select"), ds.designType, ds.defaultStatistic);
  executeWorkbenchAnalysis();
}

function executeWorkbenchAnalysis() {
  const wb = state.workbench;
  wb.statisticId = document.getElementById("wb-stat-select").value;
  const pal = getCanvasPalette();

  // Run Bootstrap if applicable
  let bootRes = null;
  if (wb.designType !== "multi_group_numerical" && wb.designType !== "contingency_categorical") {
    bootRes = runBootstrapAnalysis({
      statisticId: wb.statisticId,
      dataPayload: wb.dataPayload,
      replicates: 2000,
      confLevel: 0.95,
      seed: 4289104,
      datasetTitle: wb.title
    });
  }

  // Run Permutation if applicable
  let permRes = null;
  if (wb.designType !== "one_numerical" && wb.designType !== "one_binary") {
    permRes = runPermutationAnalysis({
      statisticId: wb.statisticId,
      dataPayload: wb.dataPayload,
      alternative: "two-sided",
      replicates: 2000,
      seed: 4289104,
      useExactIfAvailable: true,
      datasetTitle: wb.title
    });
  }

  wb.bootResult = bootRes;
  wb.permResult = permRes;

  const activeRes = bootRes?.distributionObject ? bootRes : permRes;
  document.getElementById("wb-validation-banner").innerHTML = activeRes
    ? `<strong>Validated Analysis:</strong> ${wb.title} (${activeRes.sampleSizeSummary}) — Target Estimand: <strong>${activeRes.estimand}</strong>.`
    : `<strong>Validation Warning:</strong> Check dataset structure for the selected estimator.`;

  if (bootRes?.distributionObject) {
    renderDistributionHistogram(
      document.getElementById("canvas-wb-boot"),
      bootRes.distributionObject.values,
      {
        height: 220,
        ciBand: bootRes.intervals.percentile.ci,
        markers: [
          { value: bootRes.originalEstimate, color: pal.warning, label: `Est=${bootRes.originalEstimate.toFixed(3)}` },
          { value: bootRes.intervals.percentile.ci[0], color: pal.primary, label: `95% L`, dashed: true },
          { value: bootRes.intervals.percentile.ci[1], color: pal.primary, label: `95% U`, dashed: true }
        ],
        xLabel: `Bootstrap Distribution of ${bootRes.statisticName}`
      }
    );
  } else if (permRes?.distributionObject) {
    renderDistributionHistogram(
      document.getElementById("canvas-wb-boot"),
      permRes.distributionObject.values,
      {
        height: 220,
        tailThreshold: permRes.observedStatistic,
        tailDirection: permRes.alternative,
        markers: [{ value: permRes.observedStatistic, color: pal.secondary, label: `Obs=${permRes.observedStatistic.toFixed(3)}` }],
        xLabel: `Permutation Null Distribution of ${permRes.statisticName}`
      }
    );
  }

  // Comparison Table
  const compRows = [];
  if (bootRes?.intervals) {
    for (const k of ["percentile", "bca", "normal"]) {
      const iv = bootRes.intervals[k];
      if (iv?.eligible) {
        compRows.push(`
          <tr>
            <td><strong>${iv.name}</strong></td>
            <td class="num">${bootRes.originalEstimate.toFixed(4)}</td>
            <td class="num">${bootRes.bootstrapSE.toFixed(4)}</td>
            <td class="num">[${iv.ci[0].toFixed(4)}, ${iv.ci[1].toFixed(4)}]</td>
            <td style="font-size:12px;">${iv.notes}</td>
          </tr>
        `);
      }
    }
  }
  if (permRes?.pValue !== undefined) {
    const pStr = permRes.pValue < 0.0001 ? "< 0.0001" : permRes.pValue.toFixed(4);
    compRows.push(`
      <tr>
        <td><strong>Permutation Test (${permRes.isExactEnumerated ? "Exact" : "MC"})</strong></td>
        <td class="num">${permRes.observedStatistic.toFixed(4)}</td>
        <td class="num">${permRes.nullSD.toFixed(4)} ($SE_0$)</td>
        <td class="num">p = ${pStr}</td>
        <td style="font-size:12px;">${permRes.exchangeabilityAssumption}</td>
      </tr>
    `);
  }
  const classCounter = bootRes?.classicalCounterpart || permRes?.classicalCounterpart;
  if (classCounter?.valid) {
    const c = classCounter;
    const ciOrP = Array.isArray(c.ci)
      ? `[${c.ci[0].toFixed(4)}, ${c.ci[1].toFixed(4)}] (p=${c.pValue < 0.0001 ? "<0.0001" : c.pValue.toFixed(4)})`
      : `p = ${c.pValue < 0.0001 ? "< 0.0001" : c.pValue.toFixed(4)}`;
    compRows.push(`
      <tr style="background:var(--color-surface-alt);">
        <td><strong>${c.methodName}</strong></td>
        <td class="num">${c.estimate.toFixed(4)}</td>
        <td class="num">${Number.isFinite(c.se) ? c.se.toFixed(4) : "—"}</td>
        <td class="num">${ciOrP}</td>
        <td style="font-size:12px;">${(c.assumptions || []).join(" ")}</td>
      </tr>
    `);
  }
  document.getElementById("tbody-wb-comparison").innerHTML = formatMathHTML(compRows.join(""));

  // Code & Report preview
  document.getElementById("wb-code-preview").textContent = generateRScript(activeRes, wb.dataPayload);
  document.getElementById("wb-report-summary").innerHTML =
    `<pre style="white-space:pre-wrap; margin:0; font-size:12px;">${generateReadableReport(activeRes)}</pre>`;

  // Dataset Preview Table
  const thead = document.getElementById("thead-wb-preview");
  const tbody = document.getElementById("tbody-wb-preview");
  if (Array.isArray(wb.dataPayload) && typeof wb.dataPayload[0] === "number") {
    thead.innerHTML = "<tr><th>#</th><th class='num'>Value</th></tr>";
    tbody.innerHTML = wb.dataPayload
      .slice(0, 10)
      .map((v, i) => `<tr><td class="mono">${i + 1}</td><td class="num">${v}</td></tr>`)
      .join("");
  } else if (wb.dataPayload?.g1 && wb.dataPayload?.g2) {
    thead.innerHTML = "<tr><th>#</th><th class='num'>Group 1</th><th class='num'>Group 2</th></tr>";
    const maxLen = Math.min(10, Math.max(wb.dataPayload.g1.length, wb.dataPayload.g2.length));
    const rHtml = [];
    for (let i = 0; i < maxLen; i++) {
      rHtml.push(`<tr><td class="mono">${i + 1}</td><td class="num">${wb.dataPayload.g1[i] ?? "—"}</td><td class="num">${wb.dataPayload.g2[i] ?? "—"}</td></tr>`);
    }
    tbody.innerHTML = rHtml.join("");
  } else if (Array.isArray(wb.dataPayload) && wb.dataPayload[0]?.x !== undefined) {
    thead.innerHTML = "<tr><th>Unit</th><th class='num'>X</th><th class='num'>Y</th></tr>";
    tbody.innerHTML = wb.dataPayload
      .slice(0, 10)
      .map((p, i) => `<tr><td>${p.label || i + 1}</td><td class="num">${p.x}</td><td class="num">${p.y}</td></tr>`)
      .join("");
  }
}

// ============================================================================
// DESTINATION 6: EXPERIMENT SIMULATOR (Coverage, Power, Peeking)
// ============================================================================

function executeExperimentSimulator() {
  const eState = state.experiments;
  const pal = getCanvasPalette();

  document.getElementById("exp-controls-coverage").style.display = eState.mode === "coverage" ? "block" : "none";
  document.getElementById("exp-controls-power").style.display = (eState.mode === "power" || eState.mode === "sample_size") ? "block" : "none";
  document.getElementById("exp-controls-peeking").style.display = eState.mode === "peeking" ? "block" : "none";

  if (eState.mode === "coverage") {
    const distParamsMap = {
      normal: { mu: 10, sigma: 3 },
      exponential: { lambda: 0.2 },
      lognormal: { muLog: 1.0, sigmaLog: 0.8 },
      continuous_uniform: { a: 0, b: 20 }
    };
    const res = runCoverageExperiment({
      distId: eState.covDist,
      distParams: distParamsMap[eState.covDist] || { mu: 10, sigma: 3 },
      sampleSize: eState.covN,
      numStudies: 100,
      confLevel: eState.covLevel,
      ciMethod: eState.covMethod,
      seed: eState.seed
    });
    eState.lastCovResult = res;

    document.getElementById("exp-main-title").textContent =
      `Confidence Interval Coverage Across 100 Independent Studies (Nominal ${(res.nominalCoverage * 100).toFixed(0)}%)`;
    renderCoverageCaterpillarCanvas(document.getElementById("canvas-exp-main"), res);

    document.getElementById("exp-secondary-caption").textContent =
      "Sampling Distribution of Study Point Estimates (x̄) Across the 100 Studies";
    renderDistributionHistogram(
      document.getElementById("canvas-exp-secondary"),
      res.intervals.map((iv) => iv.estimate),
      {
        height: 185,
        markers: [{ value: res.trueParam, color: pal.secondary, label: `True μ=${res.trueParam.toFixed(2)}` }]
      }
    );

    document.getElementById("exp-kpi-container").innerHTML = `
      <div class="kpi-box"><span class="kpi-label">Empirical Coverage</span><span class="kpi-val emerald">${(res.empiricalCoverage * 100).toFixed(1)}%</span></div>
      <div class="kpi-box"><span class="kpi-label">Nominal Target</span><span class="kpi-val">${(res.nominalCoverage * 100).toFixed(1)}%</span></div>
      <div class="kpi-box"><span class="kpi-label">Captured / Missed</span><span class="kpi-val vermilion">${res.coveredCount} / ${res.missedCount}</span></div>
      <div class="kpi-box"><span class="kpi-label">Mean CI Width</span><span class="kpi-val">${res.meanWidth.toFixed(3)}</span></div>
      <div class="kpi-box"><span class="kpi-label">Monte Carlo SE</span><span class="kpi-val">±${(res.mcSE * 100).toFixed(1)}%</span></div>
    `;
    document.getElementById("exp-explanation-box").innerHTML = formatMathHTML(
      `<strong>Coverage Principle:</strong> Fixed $\\mu = ${res.trueParam.toFixed(2)}$; each segment $[L_m, U_m]$ is a random interval ($n = ${res.sampleSize}$). Across $100$ studies, <strong>${res.coveredCount}%</strong> covered $\\mu$ and <strong>${res.missedCount}%</strong> missed.`
    );
  } else if (eState.mode === "power" || eState.mode === "sample_size") {
    const res = runPowerSimulation({
      sampleSize: eState.powN,
      effectSize: eState.powDelta,
      sd: eState.powSD,
      alpha: eState.powAlpha,
      numTrials: 400,
      seed: eState.seed
    });
    eState.lastPowResult = res;

    if (eState.mode === "sample_size") {
      document.getElementById("exp-main-title").textContent =
        `Sample-Size Explorer: 95% Margin of Error (±MOE) & Power (1 − β) vs Sample Size n`;
      renderSampleSizeExplorerCanvas(document.getElementById("canvas-exp-main"), res, eState.powSD);
    } else {
      document.getElementById("exp-main-title").textContent =
        `Statistical Power Curve (1 − β) vs Sample Size n per Group`;
      renderPowerCurveCanvas(document.getElementById("canvas-exp-main"), res);
    }

    document.getElementById("exp-secondary-caption").textContent =
      `Distribution of Two-Sample t-Statistics Under Hₐ (Shift δ = ${res.effectSize})`;
    renderDistributionHistogram(
      document.getElementById("canvas-exp-secondary"),
      res.altTStats,
      {
        height: 185,
        tailThreshold: 1.98,
        tailDirection: "two-sided",
        markers: [{ value: 0, color: pal.neutralStroke, label: "Null 0", dashed: true }]
      }
    );

    const seDiff = eState.powSD * Math.sqrt(2 / eState.powN);
    const moe95 = 1.96 * seDiff;
    const minN80 = res.powerCurve.find((pt) => pt.empiricalPower >= 0.80)?.n || "> 100";

    if (eState.mode === "sample_size") {
      document.getElementById("exp-kpi-container").innerHTML = formatMathHTML(`
        <div class="kpi-box"><span class="kpi-label">95% Half-Width ($\\pm\\text{MOE}$)</span><span class="kpi-val amber">±${moe95.toFixed(3)}</span></div>
        <div class="kpi-box"><span class="kpi-label">Diff SE ($\\sigma\\sqrt{2/n}$)</span><span class="kpi-val">${seDiff.toFixed(3)}</span></div>
        <div class="kpi-box"><span class="kpi-label">Min $n$ for $80\\%$ Power</span><span class="kpi-val emerald">${minN80}</span></div>
        <div class="kpi-box"><span class="kpi-label">Power at $n=${eState.powN}$</span><span class="kpi-val emerald">${(res.empiricalPower * 100).toFixed(1)}%</span></div>
        <div class="kpi-box"><span class="kpi-label">Cohen's $d$</span><span class="kpi-val">${res.standardizedEffectD.toFixed(2)}</span></div>
      `);
      document.getElementById("exp-explanation-box").innerHTML = formatMathHTML(
        `<strong>Square-Root Precision Law:</strong> At $n = ${eState.powN}$ per group, $SE(\\bar{X}_1 - \\bar{X}_2) = \\sigma\\sqrt{\\frac{2}{n}} = ${seDiff.toFixed(3)}$ and $95\\%$ $\\text{MOE} = \\pm ${moe95.toFixed(3)}$. Because precision scales as $\\frac{1}{\\sqrt{n}}$, halving the margin of error requires <strong>quadrupling</strong> sample size $n$.`
      );
    } else {
      document.getElementById("exp-kpi-container").innerHTML = formatMathHTML(`
        <div class="kpi-box"><span class="kpi-label">Empirical Power ($1-\\beta$)</span><span class="kpi-val emerald">${(res.empiricalPower * 100).toFixed(1)}%</span></div>
        <div class="kpi-box"><span class="kpi-label">Type II Error ($\\beta$)</span><span class="kpi-val amber">${(res.empiricalTypeIIError * 100).toFixed(1)}%</span></div>
        <div class="kpi-box"><span class="kpi-label">Null Type I Rate ($\\hat{\\alpha}$)</span><span class="kpi-val vermilion">${(res.empiricalTypeIError * 100).toFixed(1)}%</span></div>
        <div class="kpi-box"><span class="kpi-label">Cohen's $d$</span><span class="kpi-val">${res.standardizedEffectD.toFixed(2)}</span></div>
        <div class="kpi-box"><span class="kpi-label">Power MC SE</span><span class="kpi-val">±${(res.powerMCSE * 100).toFixed(1)}%</span></div>
      `);
      document.getElementById("exp-explanation-box").innerHTML = formatMathHTML(
        `<strong>Power &amp; Errors:</strong> Under true $H_0$ ($\\delta = 0$), Type I error is <strong>${(res.empiricalTypeIError * 100).toFixed(1)}%</strong> (nominal $\\alpha = ${(res.alpha * 100).toFixed(1)}%$). Under $H_a$ ($\\delta = ${res.effectSize}$), empirical power $1 - \\beta$ is <strong>${(res.empiricalPower * 100).toFixed(1)}%</strong>.`
      );
    }
  } else {
    const res = runOptionalStoppingSimulation({
      maxN: eState.peekMaxN,
      peekEvery: eState.peekStep,
      alpha: 0.05,
      numStudies: 300,
      seed: eState.seed
    });
    eState.lastPeekResult = res;

    document.getElementById("exp-main-title").textContent =
      `Optional Stopping Demonstration: Sequential |tₙ| Trajectory Under True H₀`;
    const traj = res.sampleTrajectory.map((pt) => pt.tStat);
    renderLLNTrajectoryCanvas(document.getElementById("canvas-exp-main"), [traj], 1.96);

    document.getElementById("exp-kpi-container").innerHTML = `
      <div class="kpi-box"><span class="kpi-label">Fixed-Horizon Type I</span><span class="kpi-val emerald">${(res.fixedFalsePositiveRate * 100).toFixed(1)}%</span></div>
      <div class="kpi-box"><span class="kpi-label">Repeated-Peeking Type I</span><span class="kpi-val vermilion">${(res.peekingFalsePositiveRate * 100).toFixed(1)}%</span></div>
      <div class="kpi-box"><span class="kpi-label">Nominal Alpha</span><span class="kpi-val">5.0%</span></div>
    `;
    document.getElementById("exp-explanation-box").innerHTML = formatMathHTML(
      `<strong>Optional Stopping Inflation:</strong> Under a $100%$ true $H_0$, peeking every $k = ${res.peekEvery}$ observations up to $N_{\\max} = ${res.maxN}$ inflates Type I error from <strong>${(res.fixedFalsePositiveRate * 100).toFixed(1)}%</strong> to <strong>${(res.peekingFalsePositiveRate * 100).toFixed(1)}%</strong>.`
    );
  }
}

// ============================================================================
// DESTINATION 7: SIMULATION UNITY ("ONE DATASET, DIFFERENT QUESTIONS")
// ============================================================================

const FOURTEEN_CONCEPT_CONTRASTS = [
  ["1", "Raw Data vs Sampling Distribution", "Observations $X_i$ (spread $s$)", "Statistic $\\hat{\\theta}$ across samples (spread $SE = \\frac{s}{\\sqrt{n}}$)", "$s$ measures unit-to-unit dispersion; $SE$ measures estimator precision and shrinks as $n$ grows."],
  ["2", "Sampling With vs Without Replacement", "Independent draws (SRSWR / i.i.d.)", "Distinct finite subset (SRSWOR)", "SRSWOR scales $SE$ by $\\text{FPC} = \\sqrt{\\frac{N-n}{N-1}}$; bootstrap requires sampling WITH replacement."],
  ["3", "Bootstrap vs Permutation Distribution", "Resamples WITH replacement within groups (center $\\hat{\\theta}$)", "Shuffles labels WITHOUT replacement across pooled data (center $\\theta_0 = 0$)", "Bootstrap estimates CI uncertainty around $\\hat{\\theta}$; Permutation tests compatibility with $H_0$."],
  ["4", "Confidence Interval vs Hypothesis Test", "Plausible parameter range $[L, U]$ at level $1 - \\alpha$", "Tail probability $p$-value under $H_0$", "A CI gives effect magnitude and precision in measurement units; a $p$-value alone does not."],
  ["5", "Point Estimate vs Uncertainty", "Single value $\\hat{\\theta}$ from observed sample", "Standard error $SE(\\hat{\\theta})$ or CI width", "A point estimate without $SE$ hides whether sample size was $n = 5$ or $n = 50{,}000$."],
  ["6", "Standard Deviation ($s$) vs Standard Error ($SE$)", "Spread of raw points around $\\bar{x}$", "Spread of sample statistic across repeated samples", "$s \\to \\sigma$ as $n \\to \\infty$, whereas $SE(\\bar{X}) = \\frac{s}{\\sqrt{n}} \\to 0$."],
  ["7", "Statistical Significance vs Effect Size", "Small $p$-value against $H_0$", "Practical magnitude (e.g., Cohen's $d$, physical units)", "Large $n$ can produce $p < 0.0001$ for a practically negligible shift."],
  ["8", "Sample Size ($n$) vs Replicates ($B$)", "Real-world observations collected", "Computer resamples/shuffles generated", "Larger $n$ narrows $SE$ and CIs; larger $B$ only reduces Monte Carlo simulation noise."],
  ["9", "Theoretical Formulas vs Resampling", "Asymptotic curves ($\\mathcal{N}, t, \\chi^2, F$)", "Empirical bootstrap & permutation", "Analytical formulas rely on parametric/CLT assumptions; resampling uses empirical data directly."],
  ["10", "Random Assignment vs Random Sampling", "Randomized treatment allocation", "Probability sampling from population", "Random assignment justifies causal claims; random sampling justifies population generalization."],
  ["11", "Independent vs Paired Observations", "Unrelated groups ($\\text{Var}(\\bar{X}_1-\\bar{X}_2) = \\frac{\\sigma_1^2}{n_1}+\\frac{\\sigma_2^2}{n_2}$)", "Matched units ($\\text{Var}(X-Y) = \\sigma_X^2+\\sigma_Y^2-2\\text{Cov}$)", "Ignoring positive within-pair covariance inflates $SE$ and reduces power."],
  ["12", "Parametric vs Nonparametric Bootstrap", "Draws from fitted family $F(x;\\hat{\\theta})$", "Draws with replacement from $\\hat{F}_n$", "Nonparametric bootstrap avoids parametric shape misspecification."],
  ["13", "Exact Enumeration vs Monte Carlo", "All $M = \\binom{N}{n_1}$ or $2^n$ partitions", "$B$ random shuffles ($SE_{\\text{MC}} = \\sqrt{\\frac{\\hat{p}(1-\\hat{p})}{B}}$)", "Monte Carlo $p$-values carry simulation uncertainty."],
  ["14", "Long-Run Coverage vs Realized Interval", "Proportion $1-\\alpha$ of intervals covering $\\theta$", "Single computed bracket $[l_{\\text{obs}}, u_{\\text{obs}}]$", "Once observed, $[l_{\\text{obs}}, u_{\\text{obs}}]$ either covers fixed $\\theta$ or does not."]
];

function executeSimulationUnity() {
  const uState = state.unity;
  const pal = getCanvasPalette();

  const res = runSimulationUnityComparison({
    mu1: uState.mu1,
    mu2: uState.mu2,
    sigma: 8.0,
    n1: uState.n,
    n2: uState.n,
    replicates: 1500,
    seed: 4289104
  });
  uState.lastResult = res;

  // Shared horizontal scale across all 3 canvases!
  const allVals = res.samplingDist.concat(res.bootstrapDist, res.permutationDist);
  const xMin = Math.min(...allVals) - 1.0;
  const xMax = Math.max(...allVals) + 1.0;

  renderDistributionHistogram(document.getElementById("canvas-unity-sampling"), res.samplingDist, {
    height: 175,
    xMin,
    xMax,
    barFill: pal.accentFill,
    barStroke: pal.accent,
    markers: [{ value: res.trueDiff, color: pal.secondary, label: `True Diff=${res.trueDiff.toFixed(2)}` }]
  });

  renderDistributionHistogram(document.getElementById("canvas-unity-bootstrap"), res.bootstrapDist, {
    height: 175,
    xMin,
    xMax,
    barFill: pal.primaryFill,
    barStroke: pal.primary,
    markers: [
      { value: res.observedDiff, color: pal.warning, label: `Obs Est=${res.observedDiff.toFixed(2)}` },
      { value: res.trueDiff, color: pal.secondary, label: `True`, dashed: true }
    ]
  });

  renderDistributionHistogram(document.getElementById("canvas-unity-permutation"), res.permutationDist, {
    height: 175,
    xMin,
    xMax,
    tailThreshold: res.observedDiff,
    tailDirection: "two-sided",
    markers: [
      { value: 0, color: pal.neutralStroke, label: `Null Center=0.0`, dashed: true },
      { value: res.observedDiff, color: pal.secondary, label: `Obs Est=${res.observedDiff.toFixed(2)}` }
    ]
  });

  document.getElementById("unity-cap-sampling").textContent =
    `Center = ${res.samplingSummary.mean.toFixed(2)} | SE = ${res.samplingSummary.sd.toFixed(2)}`;
  document.getElementById("unity-cap-bootstrap").textContent =
    `Center = ${res.bootstrapSummary.mean.toFixed(2)} | SE_boot = ${res.bootstrapSummary.sd.toFixed(2)}`;
  document.getElementById("unity-cap-permutation").textContent =
    `Center = ${res.permutationSummary.mean.toFixed(2)} | SE_null = ${res.permutationSummary.sd.toFixed(2)}`;

  document.getElementById("tbody-unity-matrix").innerHTML = formatMathHTML(`
    <tr>
      <td><strong>1. Sampling Distribution</strong></td>
      <td>Known Population $F$</td>
      <td>Population parameters $(\\mu_1, \\mu_2, \\sigma)$</td>
      <td>Fresh samples of sizes $n_1, n_2$ from $F$</td>
      <td class="num">${res.samplingSummary.mean.toFixed(3)} ($\\approx \\mu_1 - \\mu_2$)</td>
      <td class="num">${res.samplingSummary.sd.toFixed(3)}</td>
      <td>Defines true theoretical sampling variability</td>
    </tr>
    <tr>
      <td><strong>2. Bootstrap Distribution</strong></td>
      <td>Observed Sample $S$</td>
      <td>Group membership &amp; empirical distribution $\\hat{F}$</td>
      <td>Draws WITH replacement separately within Group 1 &amp; Group 2</td>
      <td class="num">${res.bootstrapSummary.mean.toFixed(3)} ($\\approx \\hat{\\theta}_{\\text{obs}}$)</td>
      <td class="num">${res.bootstrapSummary.sd.toFixed(3)}</td>
      <td>Estimates $SE_{\\text{boot}}$ &amp; builds Confidence Interval around $\\hat{\\theta}_{\\text{obs}}$</td>
    </tr>
    <tr>
      <td><strong>3. Permutation Null Dist</strong></td>
      <td>Pooled Sample $S_1 \\cup S_2$</td>
      <td>All $N = n_1 + n_2$ outcome values</td>
      <td>Group labels shuffled WITHOUT replacement under $H_0$</td>
      <td class="num">${res.permutationSummary.mean.toFixed(3)} ($\\approx 0.000$)</td>
      <td class="num">${res.permutationSummary.sd.toFixed(3)}</td>
      <td>Tests $H_0: \\mu_1 - \\mu_2 = 0$ &amp; computes tail $p$-value</td>
    </tr>
  `);

  document.getElementById("tbody-unity-14-contrasts").innerHTML = formatMathHTML(FOURTEEN_CONCEPT_CONTRASTS.map(
    (row) => `
      <tr>
        <td class="mono">${row[0]}</td>
        <td><strong>${row[1]}</strong></td>
        <td>${row[2]}</td>
        <td>${row[3]}</td>
        <td>${row[4]}</td>
      </tr>
    `
  ).join(""));
}

// ============================================================================
// DESTINATION 8: INFERENCE ATLAS
// ============================================================================

function renderAtlasView() {
  const aState = state.atlas;
  const q = aState.searchQuery.toLowerCase().trim();

  const filtered = ATLAS_ENTRIES.filter((entry) => {
    if (aState.domainFilter !== "all" && entry.domain !== aState.domainFilter) return false;
    if (aState.statusFilter !== "all" && entry.status !== aState.statusFilter) return false;
    if (!q) return true;
    return (
      entry.title.toLowerCase().includes(q) ||
      entry.definition.toLowerCase().includes(q) ||
      entry.mathDetails.toLowerCase().includes(q) ||
      entry.misconceptions.toLowerCase().includes(q)
    );
  });

  const listEl = document.getElementById("atlas-entry-list");
  if (filtered.length === 0) {
    listEl.innerHTML = `<div class="callout warning">No atlas entries match your filter.</div>`;
    return;
  }

  if (!filtered.some((e) => e.id === aState.selectedId)) {
    aState.selectedId = filtered[0].id;
  }

  listEl.innerHTML = filtered
    .map((e) => {
      const isAct = e.id === aState.selectedId;
      return `
        <button type="button" class="btn" data-atlas-id="${e.id}" style="justify-content:space-between; text-align:left; ${isAct ? "border-color:var(--color-primary); background:var(--color-primary-soft);" : ""}">
          <span>${e.title}</span>
          <span class="status-pill ${e.status.includes("Tool") ? "tool" : "reference"}">${e.difficulty}</span>
        </button>
      `;
    })
    .join("");

  listEl.querySelectorAll("[data-atlas-id]").forEach((btn) => {
    btn.addEventListener("click", () => {
      aState.selectedId = btn.getAttribute("data-atlas-id");
      renderAtlasView();
    });
  });

  const active = ATLAS_ENTRIES.find((e) => e.id === aState.selectedId) || filtered[0];
  const viewer = document.getElementById("atlas-article-viewer");
  viewer.innerHTML = formatMathHTML(`
    <div class="module-header">
      <div>
        <span class="status-pill ${active.status.includes("Tool") ? "tool" : "reference"}">${active.status}</span>
        <span class="status-pill" style="margin-left:6px;">Difficulty: ${active.difficulty}</span>
        <h2 class="module-title" style="margin-top:8px;">${active.title}</h2>
      </div>
      ${active.linkedTool && active.linkedTool !== "atlas" ? `<button type="button" class="btn btn-primary btn-sm" id="btn-atlas-open-tool" data-open-dest="${active.linkedTool}">Open Interactive Studio &rarr;</button>` : ""}
    </div>

    <div class="callout">
      <strong>Definition:</strong> ${active.definition}<br>
      <strong>Intuition:</strong> ${active.intuition}
    </div>

    <h4>Mathematical Formulation</h4>
    <div>${active.mathDetails}</div>

    <details class="collapsible-panel" open>
      <summary>Purpose, Assumptions, Algorithm &amp; Concrete Example</summary>
      <div class="collapsible-body">
        <p style="margin-top:0;"><strong>Statistical Purpose:</strong> ${active.purpose}</p>
        <p><strong>Assumptions:</strong> ${active.assumptions}</p>
        <p><strong>ResampleLab Algorithm:</strong> ${active.algorithm}</p>
        <p style="margin-bottom:0;"><strong>Example:</strong> ${active.example}</p>
      </div>
    </details>

    <details class="collapsible-panel">
      <summary>Common Misconceptions &amp; Practical Limitations</summary>
      <div class="collapsible-body">
        <div class="callout warning" style="margin-bottom:8px;">
          <strong>Misconception to Avoid:</strong> ${active.misconceptions}
        </div>
        <p style="margin:0;"><strong>Limitations:</strong> ${active.limitations}</p>
      </div>
    </details>

    ${Array.isArray(active.relatedIds) && active.relatedIds.length > 0 ? `
      <div style="margin-top:12px; display:flex; flex-wrap:wrap; gap:6px; align-items:center;">
        <span style="font-size:12px; color:var(--color-text-muted); font-weight:600;">Related Concepts:</span>
        ${active.relatedIds.map((rid) => {
          const rel = ATLAS_ENTRIES.find((x) => x.id === rid);
          return rel ? `<span class="badge" style="cursor:pointer;" data-rel-atlas="${rel.id}">${rel.title} &rarr;</span>` : "";
        }).join("")}
      </div>
    ` : ""}
  `);

  viewer.querySelectorAll("[data-rel-atlas]").forEach((chip) => {
    chip.addEventListener("click", () => {
      aState.selectedId = chip.getAttribute("data-rel-atlas");
      aState.domainFilter = "all";
      aState.statusFilter = "all";
      renderAtlasView();
    });
  });

  const openBtn = document.getElementById("btn-atlas-open-tool");
  if (openBtn) {
    openBtn.addEventListener("click", () => {
      switchDestination(openBtn.getAttribute("data-open-dest"));
    });
  }
}

// ============================================================================
// DESTINATION 9: GUIDED INVESTIGATIONS
// ============================================================================

function renderInvestigationsView() {
  const iState = state.investigations;
  const navEl = document.getElementById("inv-list-nav");

  navEl.innerHTML = GUIDED_INVESTIGATIONS.map((inv) => {
    const isAct = inv.id === iState.selectedId;
    const answered = iState.selectedAnswers[inv.id] !== undefined;
    return `
      <button type="button" class="btn" data-inv-id="${inv.id}" style="justify-content:space-between; text-align:left; ${isAct ? "border-color:var(--color-primary); background:var(--color-primary-soft);" : ""}">
        <span><strong>#${inv.number}.</strong> ${inv.title}</span>
        <span class="status-pill ${answered ? "tool" : ""}">${answered ? "Verified" : inv.difficulty}</span>
      </button>
    `;
  }).join("");

  navEl.querySelectorAll("[data-inv-id]").forEach((btn) => {
    btn.addEventListener("click", () => {
      iState.selectedId = btn.getAttribute("data-inv-id");
      renderInvestigationsView();
    });
  });

  const inv = GUIDED_INVESTIGATIONS.find((x) => x.id === iState.selectedId) || GUIDED_INVESTIGATIONS[0];
  const chosenOptId = iState.selectedAnswers[inv.id];
  const chosenOpt = inv.options.find((o) => o.id === chosenOptId);

  const detailEl = document.getElementById("inv-detail-panel");
  detailEl.innerHTML = formatMathHTML(`
    <div class="module-header">
      <div>
        <span class="status-pill tool">Investigation #${inv.number} • ${inv.difficulty}</span>
        <span class="status-pill" style="margin-left:6px;">Reproducible Seed: ${inv.seed}</span>
        <h2 class="module-title" style="margin-top:8px;">${inv.title}</h2>
      </div>
      <button type="button" class="btn btn-primary" id="btn-inv-launch">Launch Configured Experiment &rarr;</button>
    </div>

    <div class="callout">
      <strong>Objective:</strong> ${inv.objective}<br>
      <span style="color:var(--color-text-muted);">${inv.explanation}</span>
    </div>

    <h4>Interactive Experiment Steps</h4>
    <ol style="margin-top:4px; padding-left:20px;">
      ${inv.experimentSteps.map((s) => `<li style="margin-bottom:4px;">${s}</li>`).join("")}
    </ol>

    <h4>Verification Checkpoint</h4>
    <p><strong>${inv.question}</strong></p>
    <div style="display:flex; flex-direction:column; gap:8px; margin-bottom:14px;">
      ${inv.options
        .map(
          (opt) => `
          <button type="button" class="btn" data-inv-opt="${opt.id}" style="justify-content:flex-start; text-align:left; ${chosenOptId === opt.id ? "border-color:var(--color-primary); background:var(--color-primary-soft);" : ""}">
            <strong>(${opt.id.toUpperCase()})</strong>&nbsp; <span>${opt.text}</span>
          </button>
        `
        )
        .join("")}
    </div>

    ${
      chosenOpt
        ? `<div class="callout ${chosenOpt.correct ? "" : "warning"}">
            <strong>${chosenOpt.correct ? "Verified Correct:" : "Review Reasoning:"}</strong>
            ${chosenOpt.correct ? inv.feedbackCorrect : inv.feedbackIncorrect}
           </div>`
        : ""
    }

    <details class="collapsible-panel" open>
      <summary>Underlying Mathematical Principle &amp; Formula</summary>
      <div class="collapsible-body">
        ${inv.mathExplanation}
      </div>
    </details>

    ${Array.isArray(inv.relatedAtlasIds) && inv.relatedAtlasIds.length > 0 ? `
      <div style="margin-top:12px; display:flex; flex-wrap:wrap; gap:6px; align-items:center;">
        <span style="font-size:12px; color:var(--color-text-muted); font-weight:600;">Deep-Dive Atlas Articles:</span>
        ${inv.relatedAtlasIds.map((rid) => {
          const rel = ATLAS_ENTRIES.find((x) => x.id === rid);
          return rel ? `<span class="badge" style="cursor:pointer;" data-inv-atlas="${rel.id}">${rel.title} &rarr;</span>` : "";
        }).join("")}
      </div>
    ` : ""}
  `);

  detailEl.querySelectorAll("[data-inv-atlas]").forEach((chip) => {
    chip.addEventListener("click", () => {
      state.atlas.selectedId = chip.getAttribute("data-inv-atlas");
      state.atlas.domainFilter = "all";
      state.atlas.statusFilter = "all";
      switchDestination("atlas");
    });
  });

  detailEl.querySelectorAll("[data-inv-opt]").forEach((btn) => {
    btn.addEventListener("click", () => {
      iState.selectedAnswers[inv.id] = btn.getAttribute("data-inv-opt");
      renderInvestigationsView();
    });
  });

  document.getElementById("btn-inv-launch")?.addEventListener("click", () => {
    launchInvestigationPreset(inv);
  });
}

function launchInvestigationPreset(inv) {
  const cfg = inv.presetConfig || {};
  if (inv.targetStudio === "sampling") {
    state.sampling.popDistId = cfg.distId || "normal";
    state.sampling.sampleSize = cfg.sampleSize || 25;
    state.sampling.replicatesB = cfg.replicates || 1000;
    state.sampling.seed = inv.seed;
    document.getElementById("samp-pop-dist").value = state.sampling.popDistId;
    document.getElementById("samp-n").value = state.sampling.sampleSize;
    document.getElementById("samp-n-lbl").textContent = String(state.sampling.sampleSize);
    document.getElementById("samp-B").value = state.sampling.replicatesB;
    document.getElementById("samp-B-lbl").textContent = String(state.sampling.replicatesB);
    document.getElementById("samp-seed").value = inv.seed;
    switchDestination("sampling");
    runSamplingSimulation("batch");
  } else if (inv.targetStudio === "bootstrap") {
    state.bootstrap.presetId = cfg.presetId || "skewed_repair_times";
    state.bootstrap.statisticId = cfg.statisticId || "mean";
    state.bootstrap.replicates = cfg.replicates || 2000;
    state.bootstrap.seed = inv.seed;
    document.getElementById("boot-preset-select").value = state.bootstrap.presetId;
    document.getElementById("boot-replicates").value = state.bootstrap.replicates;
    document.getElementById("boot-B-lbl").textContent = String(state.bootstrap.replicates);
    document.getElementById("boot-seed").value = inv.seed;
    switchDestination("bootstrap");
    executeBootstrapStudio();
  } else if (inv.targetStudio === "permutation") {
    state.permutation.presetId = cfg.presetId || "wetsuit_swim_paired";
    state.permutation.statisticId = cfg.statisticId || "paired_mean_diff";
    state.permutation.seed = inv.seed;
    document.getElementById("perm-preset-select").value = state.permutation.presetId;
    document.getElementById("perm-seed").value = inv.seed;
    switchDestination("permutation");
    executePermutationStudio();
  } else if (inv.targetStudio === "experiments") {
    state.experiments.mode = cfg.expTab || "coverage";
    state.experiments.seed = inv.seed;
    document.getElementById("exp-mode-select").value = state.experiments.mode;
    if (cfg.sampleSize) {
      state.experiments.covN = cfg.sampleSize;
      state.experiments.powN = cfg.sampleSize;
    }
    if (cfg.effectSize !== undefined) {
      state.experiments.powDelta = cfg.effectSize;
      document.getElementById("exp-pow-delta").value = cfg.effectSize;
      document.getElementById("exp-pow-delta-lbl").textContent = Number(cfg.effectSize).toFixed(2);
    }
    switchDestination("experiments");
    executeExperimentSimulator();
  } else if (inv.targetStudio === "unity") {
    state.unity.mu1 = cfg.mu1 || 55;
    state.unity.mu2 = cfg.mu2 || 50;
    state.unity.n = cfg.n1 || 25;
    switchDestination("unity");
    executeSimulationUnity();
  }
  showToast(`Launched Investigation #${inv.number} with seed ${inv.seed}`);
}

// ============================================================================
// DESTINATION 10: METHODS & COVERAGE MATRIX
// ============================================================================

const COVERAGE_MATRIX_ROWS = [
  ["Deterministic PRNG (Mulberry32 + SplitMix32)", "Full Analytical Tool", "js/prng.js (All Studios)", "Explicit 32-bit seeds, reset, stream splitting, tested determinism"],
  ["19 Probability Distribution Families (9 Discrete, 10 Continuous)", "Full Analytical Tool", "Distribution Explorer (js/distributions.js)", "PDF/PMF, CDF, Quantile, Moments, and Random Samplers verified"],
  ["Sampling With & Without Replacement + FPC", "Full Analytical Tool", "Sampling Laboratory (js/stats-core.js)", "Partial Fisher-Yates SRSWOR, $\\text{FPC} = \\sqrt{\\frac{N-n}{N-1}}$"],
  ["Stratified, Cluster, & Weighted Sampling", "Working Interactive Simulation", "Sampling Laboratory (js/stats-core.js)", "Proportional stratified and primary cluster sampling"],
  ["Law of Large Numbers & Central Limit Theorem", "Full Analytical Tool", "Sampling Laboratory", "Multi-path LLN trajectories, CLT Normal overlay, Blom Normal Q-Q plot"],
  ["Nonparametric Case, Groupwise, & Paired Bootstrap", "Full Analytical Tool", "Bootstrap Studio & Workbench", "Preserves observational units (univariate, 2-group, paired, bivariate)"],
  ["5 Bootstrap CI Methods (Percentile, Basic, Normal, Studentized t, BCa)", "Full Analytical Tool", "Bootstrap Studio (js/inference-engine.js)", "Includes Jackknife acceleration $\\hat{a}$ and bias-correction $z_0$ for BCa"],
  ["Exact Randomization Enumeration & Monte Carlo Permutation Tests", "Full Analytical Tool", "Permutation Studio (js/inference-engine.js)", "Exact $\\binom{N}{n_1}$ & $2^n$ enumeration + $\\frac{b+1}{B+1}$ and $\\frac{b}{B}$ MC estimators"],
  ["Classical Analytical Inference Counterparts", "Full Analytical Tool", "Inference Workbench (js/classical-engine.js)", "1-Sample t, Welch t, Paired t, Wilson Score CI, Fisher z, OLS t, ANOVA F, Chi-Sq"],
  ["CI Coverage, Statistical Power, & Optional Stopping Simulators", "Full Analytical Tool", "Experiment Simulator", "100-study coverage caterpillar plot, power curves, sequential peeking"],
  ["Simulation Unity: One Dataset, Different Questions", "Full Analytical Tool", "Destination 7 (Simulation Unity)", "Synchronized side-by-side Sampling vs Bootstrap vs Permutation comparison"],
  ["Dependent Time-Series & Block/Cluster Bootstrap Theory", "Complete Reference Article", "Inference Atlas + Assumption Detector", "Automated error banner when applying i.i.d. bootstrap to dependent series"],
  ["Monte Carlo Integration, Importance Sampling, & Variance Reduction", "Complete Reference Article", "Inference Atlas", "Substantive mathematical reference + explicit MC SE reporting"]
];

function renderCoverageMatrix() {
  const tbody = document.getElementById("tbody-coverage-matrix");
  if (!tbody) return;
  tbody.innerHTML = formatMathHTML(COVERAGE_MATRIX_ROWS.map(
    (r) => `
      <tr>
        <td><strong>${r[0]}</strong></td>
        <td><span class="status-pill ${r[1].includes("Tool") ? "tool" : "reference"}">${r[1]}</span></td>
        <td>${r[2]}</td>
        <td>${r[3]}</td>
      </tr>
    `
  ).join(""));
}

// ============================================================================
// NAVIGATION & GLOBAL EVENT WIRING
// ============================================================================

function switchDestination(destId) {
  state.activeDest = destId;
  document.querySelectorAll(".nav-tab-btn").forEach((btn) => {
    btn.classList.toggle("active", btn.getAttribute("data-dest") === destId);
  });
  document.querySelectorAll(".dest-view").forEach((sec) => {
    sec.classList.toggle("active", sec.id === `view-${destId}`);
  });

  // Render active destination canvas so widths are accurate
  if (destId === "sampling") renderSamplingView();
  else if (destId === "distributions") updateDistributionExplorer();
  else if (destId === "bootstrap") {
    if (!state.bootstrap.lastResult) executeBootstrapStudio();
    else renderBootstrapStudioView();
  } else if (destId === "permutation") {
    if (!state.permutation.lastResult) executePermutationStudio();
    else renderPermutationStudioView();
  } else if (destId === "workbench") executeWorkbenchAnalysis();
  else if (destId === "experiments") executeExperimentSimulator();
  else if (destId === "unity") executeSimulationUnity();
  else if (destId === "atlas") renderAtlasView();
  else if (destId === "investigations") renderInvestigationsView();
  else if (destId === "methods") renderCoverageMatrix();
}

function initEventListeners() {
  // Navigation tabs
  document.querySelectorAll(".nav-tab-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      switchDestination(btn.getAttribute("data-dest"));
    });
  });

  // Quick-jump buttons on banner
  document.querySelectorAll("[data-quick-jump]").forEach((btn) => {
    btn.addEventListener("click", () => {
      switchDestination(btn.getAttribute("data-quick-jump"));
    });
  });

  // Explanation Mode Switcher (Simple / Standard / Technical)
  document.querySelectorAll("[data-exp-mode]").forEach((btn) => {
    btn.addEventListener("click", () => {
      state.explanationMode = btn.getAttribute("data-exp-mode");
      document.querySelectorAll("[data-exp-mode]").forEach((b) => {
        b.classList.toggle("active", b.getAttribute("data-exp-mode") === state.explanationMode);
      });
      saveLocalState(undefined, { explanationMode: state.explanationMode, theme: state.theme });
      switchDestination(state.activeDest);
    });
  });

  // Theme Toggle
  document.getElementById("btn-theme-toggle")?.addEventListener("click", () => {
    state.theme = state.theme === "light" ? "dark" : "light";
    document.documentElement.setAttribute("data-theme", state.theme);
    document.getElementById("btn-theme-toggle").textContent = state.theme === "dark" ? "Light Mode" : "Dark Mode";
    saveLocalState(undefined, { explanationMode: state.explanationMode, theme: state.theme });
    switchDestination(state.activeDest);
  });

  // Share State Hash Button
  document.getElementById("btn-share-url")?.addEventListener("click", () => {
    const hashPayload = encodeShareableHashState({
      dest: state.activeDest,
      mode: state.explanationMode,
      samp: {
        popDistId: state.sampling.popDistId,
        n: state.sampling.sampleSize,
        B: state.sampling.replicatesB,
        seed: state.sampling.seed
      },
      boot: {
        presetId: state.bootstrap.presetId,
        statId: state.bootstrap.statisticId,
        B: state.bootstrap.replicates,
        seed: state.bootstrap.seed
      },
      perm: {
        presetId: state.permutation.presetId,
        statId: state.permutation.statisticId,
        B: state.permutation.replicates,
        seed: state.permutation.seed
      }
    });
    if (typeof history !== "undefined" && history.replaceState) {
      history.replaceState(null, "", `#state=${hashPayload}`);
    }
    copyTextSafe(window.location.href, "Shareable simulation state URL copied!");
  });

  // Print View Button
  document.getElementById("btn-print-view")?.addEventListener("click", () => {
    window.print();
  });

  // Clear Storage Button
  document.getElementById("btn-clear-storage")?.addEventListener("click", () => {
    clearAllLocalState();
    showToast("Cleared local browser storage.");
  });

  // -------------------------------------------------------------------------
  // 1. Sampling Lab Controls
  // -------------------------------------------------------------------------
  document.getElementById("samp-pop-dist")?.addEventListener("change", (e) => {
    state.sampling.popDistId = e.target.value;
    runSamplingSimulation("batch");
  });
  document.getElementById("samp-mechanism")?.addEventListener("change", (e) => {
    state.sampling.mechanism = e.target.value;
    runSamplingSimulation("batch");
  });
  document.getElementById("samp-finite-N")?.addEventListener("input", (e) => {
    state.sampling.finiteN = Number(e.target.value);
    document.getElementById("samp-finite-N-lbl").textContent = String(state.sampling.finiteN);
    runSamplingSimulation("batch");
  });
  document.getElementById("samp-n")?.addEventListener("input", (e) => {
    state.sampling.sampleSize = Number(e.target.value);
    document.getElementById("samp-n-lbl").textContent = String(state.sampling.sampleSize);
    runSamplingSimulation("batch");
  });
  document.getElementById("samp-stat")?.addEventListener("change", (e) => {
    state.sampling.statId = e.target.value;
    runSamplingSimulation("batch");
  });
  document.getElementById("samp-B")?.addEventListener("input", (e) => {
    state.sampling.replicatesB = Number(e.target.value);
    document.getElementById("samp-B-lbl").textContent = String(state.sampling.replicatesB);
  });
  document.getElementById("samp-seed")?.addEventListener("change", (e) => {
    state.sampling.seed = Number(e.target.value) || 1;
    runSamplingSimulation("batch");
  });
  document.getElementById("btn-samp-new-seed")?.addEventListener("click", () => {
    state.sampling.seed = Math.floor(100000 + Math.random() * 8999999);
    document.getElementById("samp-seed").value = state.sampling.seed;
    runSamplingSimulation("batch");
  });
  document.getElementById("btn-samp-draw-one")?.addEventListener("click", () => {
    runSamplingSimulation("single");
  });
  document.getElementById("btn-samp-run-batch")?.addEventListener("click", () => {
    runSamplingSimulation("batch");
  });
  document.getElementById("btn-samp-animate")?.addEventListener("click", () => {
    let steps = 0;
    state.sampling.sampleStats = [];
    const timer = setInterval(() => {
      steps++;
      state.sampling.replicatesB = steps * 25;
      runSamplingSimulation("batch");
      if (steps >= 10) clearInterval(timer);
    }, 65);
  });
  document.getElementById("btn-samp-reset")?.addEventListener("click", () => {
    state.sampling.sampleStats = [];
    runSamplingSimulation("batch");
  });

  document.querySelectorAll("[data-samp-subview]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const sv = btn.getAttribute("data-samp-subview");
      state.sampling.subview = sv;
      document.querySelectorAll("[data-samp-subview]").forEach((b) => {
        b.classList.toggle("active", b.getAttribute("data-samp-subview") === sv);
      });
      document.getElementById("samp-subview-hierarchy").style.display = sv === "hierarchy" ? "block" : "none";
      document.getElementById("samp-subview-lln").style.display = sv === "lln" ? "block" : "none";
      renderSamplingView();
    });
  });

  // -------------------------------------------------------------------------
  // 2. Distribution Explorer Controls
  // -------------------------------------------------------------------------
  document.getElementById("dist-family-select")?.addEventListener("change", (e) => {
    state.distExplorer.distId = e.target.value;
    state.distExplorer.params = {};
    state.distExplorer.simulatedSample = [];
    renderDistParameterControls();
    updateDistributionExplorer();
  });
  document.getElementById("dist-range-a")?.addEventListener("input", (e) => {
    state.distExplorer.rangeA = Number(e.target.value);
    updateDistributionExplorer();
  });
  document.getElementById("dist-range-b")?.addEventListener("input", (e) => {
    state.distExplorer.rangeB = Number(e.target.value);
    updateDistributionExplorer();
  });
  document.getElementById("dist-quantile-q")?.addEventListener("input", (e) => {
    state.distExplorer.quantileQ = Math.max(0.001, Math.min(0.999, Number(e.target.value) || 0.95));
    updateDistributionExplorer();
  });
  document.getElementById("btn-dist-draw-sample")?.addEventListener("click", () => {
    const n = Math.max(10, Math.min(5000, Number(document.getElementById("dist-sim-n").value) || 300));
    const dist = getDistribution(state.distExplorer.distId);
    const rng = createPRNG(state.sampling.seed + n);
    state.distExplorer.simulatedSample = Array.from({ length: n }, () => dist.sample(state.distExplorer.params, rng));
    updateDistributionExplorer();
  });
  document.getElementById("btn-dist-clear-sample")?.addEventListener("click", () => {
    state.distExplorer.simulatedSample = [];
    updateDistributionExplorer();
  });
  document.querySelectorAll("[data-dist-view]").forEach((btn) => {
    btn.addEventListener("click", () => {
      state.distExplorer.viewMode = btn.getAttribute("data-dist-view");
      document.querySelectorAll("[data-dist-view]").forEach((b) => {
        b.classList.toggle("active", b.getAttribute("data-dist-view") === state.distExplorer.viewMode);
      });
      updateDistributionExplorer();
    });
  });

  // -------------------------------------------------------------------------
  // 3. Bootstrap Studio Controls
  // -------------------------------------------------------------------------
  document.getElementById("boot-preset-select")?.addEventListener("change", (e) => {
    state.bootstrap.presetId = e.target.value;
    const ds = resolveDatasetSource(state.bootstrap.presetId);
    state.bootstrap.statisticId = ds.defaultStatistic;
    executeBootstrapStudio();
  });
  document.getElementById("boot-stat-select")?.addEventListener("change", (e) => {
    state.bootstrap.statisticId = e.target.value;
    executeBootstrapStudio();
  });
  document.getElementById("boot-ci-primary")?.addEventListener("change", (e) => {
    state.bootstrap.primaryCI = e.target.value;
    renderBootstrapStudioView();
  });
  document.getElementById("boot-conf-level")?.addEventListener("change", (e) => {
    state.bootstrap.confLevel = Number(e.target.value);
    executeBootstrapStudio();
  });
  document.getElementById("boot-replicates")?.addEventListener("input", (e) => {
    state.bootstrap.replicates = Number(e.target.value);
    document.getElementById("boot-B-lbl").textContent = String(state.bootstrap.replicates);
  });
  document.getElementById("boot-seed")?.addEventListener("change", (e) => {
    state.bootstrap.seed = Number(e.target.value) || 1;
    executeBootstrapStudio();
  });
  document.getElementById("btn-boot-new-seed")?.addEventListener("click", () => {
    state.bootstrap.seed = Math.floor(100000 + Math.random() * 8999999);
    document.getElementById("boot-seed").value = state.bootstrap.seed;
    executeBootstrapStudio();
  });
  document.getElementById("btn-boot-run")?.addEventListener("click", () => {
    executeBootstrapStudio();
  });
  document.getElementById("btn-boot-export-csv")?.addEventListener("click", () => {
    if (state.bootstrap.lastResult) {
      downloadBlob(exportSummaryToCSV(state.bootstrap.lastResult), "resamplelab-bootstrap-summary.csv", "text/csv;charset=utf-8");
    }
  });
  document.getElementById("btn-boot-export-r")?.addEventListener("click", () => {
    switchDestination("workbench");
  });

  // -------------------------------------------------------------------------
  // 4. Permutation Studio Controls
  // -------------------------------------------------------------------------
  document.getElementById("perm-preset-select")?.addEventListener("change", (e) => {
    state.permutation.presetId = e.target.value;
    const ds = resolveDatasetSource(state.permutation.presetId);
    state.permutation.statisticId = ds.defaultStatistic;
    executePermutationStudio();
  });
  document.getElementById("perm-stat-select")?.addEventListener("change", (e) => {
    state.permutation.statisticId = e.target.value;
    executePermutationStudio();
  });
  document.getElementById("perm-alt-select")?.addEventListener("change", (e) => {
    state.permutation.alternative = e.target.value;
    executePermutationStudio();
  });
  document.getElementById("perm-exact-toggle")?.addEventListener("change", (e) => {
    state.permutation.exactMode = e.target.value;
    executePermutationStudio();
  });
  document.getElementById("perm-pval-conv")?.addEventListener("change", (e) => {
    state.permutation.pValConv = e.target.value;
    executePermutationStudio();
  });
  document.getElementById("perm-replicates")?.addEventListener("input", (e) => {
    state.permutation.replicates = Number(e.target.value);
    document.getElementById("perm-B-lbl").textContent = String(state.permutation.replicates);
  });
  document.getElementById("perm-seed")?.addEventListener("change", (e) => {
    state.permutation.seed = Number(e.target.value) || 1;
    executePermutationStudio();
  });
  document.getElementById("btn-perm-new-seed")?.addEventListener("click", () => {
    state.permutation.seed = Math.floor(100000 + Math.random() * 8999999);
    document.getElementById("perm-seed").value = state.permutation.seed;
    executePermutationStudio();
  });
  document.getElementById("btn-perm-run")?.addEventListener("click", () => {
    executePermutationStudio();
  });
  document.getElementById("btn-perm-export-csv")?.addEventListener("click", () => {
    if (state.permutation.lastResult) {
      downloadBlob(exportSummaryToCSV(state.permutation.lastResult), "resamplelab-permutation-summary.csv", "text/csv;charset=utf-8");
    }
  });

  // -------------------------------------------------------------------------
  // 5. Inference Workbench Controls
  // -------------------------------------------------------------------------
  document.getElementById("wb-preset-load")?.addEventListener("change", (e) => {
    loadPresetIntoWorkbench(e.target.value);
  });
  document.getElementById("btn-wb-parse")?.addEventListener("click", () => {
    const raw = document.getElementById("wb-raw-input").value;
    const parsed = parseDelimitedDataset(raw);
    if (!parsed.valid) {
      document.getElementById("wb-validation-banner").innerHTML = `<strong style="color:var(--color-error);">Parse Error:</strong> ${parsed.reason}`;
      return;
    }
    if (parsed.isSessionRestore && parsed.sessionPayload) {
      state.workbench.title = parsed.sessionPayload.title || "Restored Session Dataset";
      state.workbench.designType = parsed.sessionPayload.designType || "two_independent_numerical";
      state.workbench.statisticId = parsed.sessionPayload.statisticId || "diff_means";
      state.workbench.dataPayload = parsed.sessionPayload.dataPayload;
    } else {
      state.workbench.title = parsed.title || `User Imported Dataset (n = ${parsed.rowCount})`;
      state.workbench.designType = parsed.inferredDesign;
      state.workbench.dataPayload = parsed.dataPayload;
    }
    document.getElementById("wb-design-override").value = parsed.inferredDesign;
    populateStatisticSelect(document.getElementById("wb-stat-select"), parsed.inferredDesign, "");
    executeWorkbenchAnalysis();
    showToast(`Parsed ${parsed.rowCount} observations (${parsed.missingCount} missing excluded).`);
  });
  document.getElementById("wb-file-upload")?.addEventListener("change", (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      document.getElementById("wb-raw-input").value = String(reader.result || "");
      document.getElementById("btn-wb-parse").click();
    };
    reader.readAsText(file);
  });
  document.getElementById("wb-design-override")?.addEventListener("change", (e) => {
    state.workbench.designType = e.target.value;
    populateStatisticSelect(document.getElementById("wb-stat-select"), state.workbench.designType, "");
    executeWorkbenchAnalysis();
  });
  document.getElementById("wb-stat-select")?.addEventListener("change", () => {
    executeWorkbenchAnalysis();
  });
  document.getElementById("btn-wb-run-all")?.addEventListener("click", () => {
    executeWorkbenchAnalysis();
  });

  // Workbench Exporters
  const getActiveWbRes = () => state.workbench.bootResult || state.workbench.permResult;
  document.getElementById("btn-wb-show-r")?.addEventListener("click", () => {
    document.getElementById("wb-code-preview").textContent = generateRScript(getActiveWbRes(), state.workbench.dataPayload);
  });
  document.getElementById("btn-wb-show-py")?.addEventListener("click", () => {
    document.getElementById("wb-code-preview").textContent = generatePythonScript(getActiveWbRes(), state.workbench.dataPayload);
  });
  document.getElementById("btn-wb-show-json")?.addEventListener("click", () => {
    document.getElementById("wb-code-preview").textContent = exportDataSenseSimulationJSON(getActiveWbRes());
  });
  document.getElementById("btn-wb-show-report")?.addEventListener("click", () => {
    document.getElementById("wb-code-preview").textContent = generateReadableReport(getActiveWbRes());
  });
  document.getElementById("btn-wb-download-csv")?.addEventListener("click", () => {
    downloadBlob(exportSummaryToCSV(getActiveWbRes()), "resamplelab-analysis-summary.csv", "text/csv;charset=utf-8");
  });
  document.getElementById("btn-wb-download-reps")?.addEventListener("click", () => {
    downloadBlob(exportReplicatesToCSV(getActiveWbRes()), "resamplelab-replicates.csv", "text/csv;charset=utf-8");
  });
  document.getElementById("dist-compare-overlay")?.addEventListener("change", (e) => {
    state.distExplorer.compareOverlay = e.target.value;
    updateDistributionExplorer();
  });
  document.querySelectorAll("[data-boot-plot]").forEach((btn) => {
    btn.addEventListener("click", () => {
      state.bootstrap.plotType = btn.getAttribute("data-boot-plot");
      document.querySelectorAll("[data-boot-plot]").forEach((b) => {
        b.classList.toggle("active", b.getAttribute("data-boot-plot") === state.bootstrap.plotType);
      });
      renderBootstrapStudioView();
    });
  });
  document.getElementById("btn-wb-download-png")?.addEventListener("click", () => {
    const canvas = document.getElementById("canvas-wb-boot");
    if (canvas && canvas.toDataURL) {
      const dataUrl = canvas.toDataURL("image/png");
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = "resamplelab-chart.png";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      showToast("Exported resamplelab-chart.png");
    }
  });
  document.getElementById("btn-wb-download-session")?.addEventListener("click", () => {
    const sessionJson = exportReproducibleSessionJSON(state.workbench);
    document.getElementById("wb-code-preview").textContent = sessionJson;
    downloadBlob(sessionJson, "resamplelab-session.json", "application/json;charset=utf-8");
  });
  document.getElementById("btn-wb-download-svg")?.addEventListener("click", () => {
    const res = getActiveWbRes();
    const svg = generateHistogramSVG(res?.distributionObject?.values || [], res?.datasetTitle || "ResampleLab");
    downloadBlob(svg, "resamplelab-distribution.svg", "image/svg+xml;charset=utf-8");
  });

  // -------------------------------------------------------------------------
  // 6. Experiment Simulator Controls
  // -------------------------------------------------------------------------
  document.getElementById("exp-mode-select")?.addEventListener("change", (e) => {
    state.experiments.mode = e.target.value;
    executeExperimentSimulator();
  });
  document.getElementById("exp-cov-dist")?.addEventListener("change", (e) => {
    state.experiments.covDist = e.target.value;
    executeExperimentSimulator();
  });
  document.getElementById("exp-cov-method")?.addEventListener("change", (e) => {
    state.experiments.covMethod = e.target.value;
    executeExperimentSimulator();
  });
  document.getElementById("exp-cov-n")?.addEventListener("input", (e) => {
    state.experiments.covN = Number(e.target.value);
    document.getElementById("exp-cov-n-lbl").textContent = String(state.experiments.covN);
    executeExperimentSimulator();
  });
  document.getElementById("exp-cov-level")?.addEventListener("change", (e) => {
    state.experiments.covLevel = Number(e.target.value);
    executeExperimentSimulator();
  });
  document.getElementById("exp-pow-n")?.addEventListener("input", (e) => {
    state.experiments.powN = Number(e.target.value);
    document.getElementById("exp-pow-n-lbl").textContent = String(state.experiments.powN);
    executeExperimentSimulator();
  });
  document.getElementById("exp-pow-delta")?.addEventListener("input", (e) => {
    state.experiments.powDelta = Number(e.target.value);
    document.getElementById("exp-pow-delta-lbl").textContent = state.experiments.powDelta.toFixed(2);
    executeExperimentSimulator();
  });
  document.getElementById("exp-pow-sd")?.addEventListener("input", (e) => {
    state.experiments.powSD = Number(e.target.value);
    document.getElementById("exp-pow-sd-lbl").textContent = state.experiments.powSD.toFixed(1);
    executeExperimentSimulator();
  });
  document.getElementById("exp-pow-alpha")?.addEventListener("change", (e) => {
    state.experiments.powAlpha = Number(e.target.value);
    executeExperimentSimulator();
  });
  document.getElementById("exp-peek-maxn")?.addEventListener("input", (e) => {
    state.experiments.peekMaxN = Number(e.target.value);
    document.getElementById("exp-peek-maxn-lbl").textContent = String(state.experiments.peekMaxN);
    executeExperimentSimulator();
  });
  document.getElementById("exp-peek-step")?.addEventListener("input", (e) => {
    state.experiments.peekStep = Number(e.target.value);
    document.getElementById("exp-peek-step-lbl").textContent = String(state.experiments.peekStep);
    executeExperimentSimulator();
  });
  document.getElementById("exp-seed")?.addEventListener("change", (e) => {
    state.experiments.seed = Number(e.target.value) || 1;
    executeExperimentSimulator();
  });
  document.getElementById("btn-exp-run")?.addEventListener("click", () => {
    executeExperimentSimulator();
  });

  // -------------------------------------------------------------------------
  // 7. Simulation Unity Controls
  // -------------------------------------------------------------------------
  document.getElementById("btn-unity-run")?.addEventListener("click", () => {
    state.unity.mu1 = Number(document.getElementById("unity-mu1").value) || 55;
    state.unity.mu2 = Number(document.getElementById("unity-mu2").value) || 50;
    state.unity.n = Math.max(5, Math.min(200, Number(document.getElementById("unity-n").value) || 25));
    executeSimulationUnity();
  });

  // -------------------------------------------------------------------------
  // 8. Inference Atlas Filters
  // -------------------------------------------------------------------------
  document.getElementById("atlas-search-input")?.addEventListener("input", (e) => {
    state.atlas.searchQuery = e.target.value;
    renderAtlasView();
  });
  document.getElementById("atlas-domain-filter")?.addEventListener("change", (e) => {
    state.atlas.domainFilter = e.target.value;
    renderAtlasView();
  });
  document.getElementById("atlas-status-filter")?.addEventListener("change", (e) => {
    state.atlas.statusFilter = e.target.value;
    renderAtlasView();
  });

  // Interactive Canvas Coordinate Readout on Hover
  document.querySelectorAll(".plot-canvas").forEach((canvas) => {
    const frame = canvas.closest(".canvas-frame");
    if (!frame) return;
    frame.style.position = "relative";
    const badge = document.createElement("div");
    badge.className = "mono";
    badge.style.cssText = "position:absolute; top:8px; right:12px; padding:2px 8px; border-radius:4px; font-size:11px; background:var(--color-surface); border:1px solid var(--color-border-strong); color:var(--color-text); pointer-events:none; opacity:0; transition:opacity 120ms ease; z-index:5;";
    frame.appendChild(badge);

    canvas.addEventListener("mousemove", (ev) => {
      const meta = canvas._plotMeta;
      if (!meta || !meta.plotW) return;
      const rect = canvas.getBoundingClientRect();
      const relX = ev.clientX - rect.left;
      const frac = (relX - meta.padLeft) / meta.plotW;
      if (frac < 0 || frac > 1) {
        badge.style.opacity = "0";
        return;
      }
      const xVal = meta.xMin + frac * (meta.xMax - meta.xMin);
      badge.textContent = `x = ${xVal.toFixed(3)}`;
      badge.style.opacity = "0.94";
    });
    canvas.addEventListener("mouseleave", () => {
      badge.style.opacity = "0";
    });
  });

  // Responsive Resize Listener
  window.addEventListener("resize", () => {
    switchDestination(state.activeDest);
  });
}

// ============================================================================
// INITIALIZATION
// ============================================================================

function bootstrapApp() {
  // Restore saved preferences or URL hash state
  const saved = loadLocalState();
  if (saved) {
    if (saved.theme === "dark") {
      state.theme = "dark";
      document.documentElement.setAttribute("data-theme", "dark");
      const tBtn = document.getElementById("btn-theme-toggle");
      if (tBtn) tBtn.textContent = "Light Mode";
    }
    if (saved.explanationMode) {
      state.explanationMode = saved.explanationMode;
      document.querySelectorAll("[data-exp-mode]").forEach((b) => {
        b.classList.toggle("active", b.getAttribute("data-exp-mode") === state.explanationMode);
      });
    }
  }

  if (typeof window !== "undefined" && window.location.hash.startsWith("#state=")) {
    const decoded = decodeShareableHashState(window.location.hash);
    if (decoded) {
      if (decoded.dest) state.activeDest = decoded.dest;
      if (decoded.samp?.seed) state.sampling.seed = decoded.samp.seed;
      if (decoded.boot?.presetId) state.bootstrap.presetId = decoded.boot.presetId;
      if (decoded.perm?.presetId) state.permutation.presetId = decoded.perm.presetId;
    }
  }

  renderDistParameterControls();
  loadPresetIntoWorkbench("sleep_deprivation_trial");
  initEventListeners();
  runSamplingSimulation("batch");
  switchDestination(state.activeDest);
}

if (typeof window !== "undefined") {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bootstrapApp);
  } else {
    bootstrapApp();
  }
}
