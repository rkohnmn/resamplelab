import { STATISTIC_REGISTRY } from './stats-core.js';
import { assertInputSize, assertTableSize, assertHeaders, missingNumber, readDelimitedRecords } from './import-safety.js';
/**
 * ResampleLab — Multi-Format Exporters, CSV/TSV/JSON Importers, & Code Generators
 *
 * Implements Part 18 & Part 19 and DATA_CONVENTIONS.md:
 * - RFC 4180 CSV & TSV parser with automatic type detection and missing-value reporting
 * - DataSenseDataset JSON & Reproducible Session JSON importer
 * - CSV Formula Injection sanitization (prefixes '=', '+', '-', '@', '\t', '\r' with "'")
 * - Summary CSV & Replicate CSV exporters
 * - DataSenseSimulationResult (v1.0.0) & DataSenseDataset (v1.0.0) JSON interchange
 * - Full Session State JSON export & validated import
 * - Executable R script generator (`boot`, permutation, and classical verification)
 * - Executable Python script generator (`numpy`, `scipy.stats`)
 * - Readable Markdown/Text Analysis Report generator
 *
 * @module exporters
 * @version 1.0.0
 */

/**
 * Sanitizes a cell value for RFC 4180 CSV export and prevents spreadsheet
 * formula injection per DATA_CONVENTIONS.md Section D.2.
 *
 * @param {*} value
 * @returns {string}
 */
export function escapeCsvCell(value) {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "";
  }
  if (typeof value === "number") {
    return Number.isFinite(value) ? String(value) : "";
  }
  let str = String(value);
  if (/^[=+\-@|\t\r]/.test(str)) {
    str = "'" + str;
  }
  if (/[",\r\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Parses RFC 4180 CSV, TSV, or DataSense JSON (`DataSenseDataset` / Session JSON)
 * into rows and columns, detects variable types, and constructs supported analysis payloads.
 *
 * @param {string} rawText
 * @returns {object}
 */
export function parseDelimitedDataset(rawText) {
  try {
    assertInputSize(rawText);
    const result = parseDelimitedDatasetUnchecked(rawText);
    if (result.valid) {
      const size = validatePayload(result.inferredDesign, result.dataPayload);
      assertTableSize(size.rows, size.columns);
      result.rowCount = result.isSessionRestore ? size.rows : result.rowCount;
    }
    return result;
  } catch (error) { return {valid:false, reason:error.message}; }
}
function validatePayload(design, payload) {
  const finite = value => typeof value === 'number' && Number.isFinite(value);
  const vector = (values, binary=false) => Array.isArray(values) && values.length >= 2 && values.every(v => finite(v) && (!binary || v === 0 || v === 1));
  if (['one_numerical','one_binary'].includes(design) && vector(payload, design==='one_binary')) return {rows:payload.length, columns:1};
  if (design==='paired_numerical' && vector(payload)) return {rows:payload.length,columns:1};
  if (['paired_numerical','bivariate_numerical'].includes(design) && Array.isArray(payload) && payload.length>=2 && payload.every(p=>p && finite(p.x) && finite(p.y))) return {rows:payload.length,columns:2};
  if (['two_independent_numerical','two_independent_binary'].includes(design) && payload && vector(payload.g1,design.endsWith('binary')) && vector(payload.g2,design.endsWith('binary'))) return {rows:payload.g1.length+payload.g2.length,columns:2};
  if (design==='multi_group_numerical' && Array.isArray(payload) && payload.length>=2 && payload.every(g=>vector(g))) return {rows:payload.flat().length,columns:payload.length};
  if (design==='contingency_categorical' && Array.isArray(payload) && payload.length>=2 && payload[0].length>=2 && payload.every(row=>row.length===payload[0].length && row.every(v=>Number.isInteger(v) && v>=0)) && payload.flat().some(v=>v>0)) return {rows:payload.length,columns:payload[0].length};
  throw new Error('Dataset does not match its analysis design. Provide at least two complete observations per sample and finite numeric values.');
}
function parseDelimitedDatasetUnchecked(rawText) {
  const text = String(rawText ?? "").trim();
  if (!text) {
    return { valid: false, reason: "Input text is empty." };
  }

  // 1. Check if input is JSON (DataSenseDataset v1.0.0, array, or ResampleLab Session JSON)
  if (text.startsWith("{") || text.startsWith("[")) {
    try {
      const obj = JSON.parse(text);
      if (obj && obj.sessionType === "ResampleLabSession") {
        if (obj.statisticId && (!Object.hasOwn(STATISTIC_REGISTRY, obj.statisticId) || STATISTIC_REGISTRY[obj.statisticId].designType !== obj.designType)) {
          return {valid:false, reason:"The saved statistic does not match the session's analysis design."};
        }
        return {
          valid: true,
          isSessionRestore: true,
          sessionPayload: obj,
          rowCount: obj.rowCount || 10,
          missingCount: 0,
          inferredDesign: obj.designType || "two_independent_numerical",
          dataPayload: obj.dataPayload
        };
      }
      if (obj && Array.isArray(obj.observations) && obj.observations.length >= 2) {
        // DataSenseDataset v1.0.0 format (e.g. from QuartetLab)
        const obs = obj.observations;
        const vars = obj.variables || [];
        const quantVars = vars.filter((v) => v.dataType === "float64" || v.dataType === "int");
        if (quantVars.length >= 2) {
          const kx = quantVars[0].name;
          const ky = quantVars[1].name;
          const pairs = obs
            .map((row, idx) => ({
              obs_id: row.obs_id || `row_${idx + 1}`,
              label: row.label || `Case ${idx + 1}`,
              x: missingNumber(row[kx]),
              y: missingNumber(row[ky])
            }))
            .filter((p) => Number.isFinite(p.x) && Number.isFinite(p.y));
          return {
            valid: true,
            title: obj.metadata?.title || "Imported DataSenseDataset",
            rowCount: pairs.length,
            missingCount: obs.length - pairs.length,
            inferredDesign: "bivariate_numerical",
            dataPayload: pairs
          };
        }
      }
      if (Array.isArray(obj)) {
        if (obj.length && obj.every(value => value === null || (typeof value === "number" && Number.isFinite(value)))) {
          const nums = obj.filter((v) => Number.isFinite(v));
          return {
            valid: nums.length >= 2,
            reason: nums.length < 2 ? "Provide at least two numeric observations." : undefined,
            rowCount: nums.length,
            missingCount: obj.length - nums.length,
            inferredDesign: "one_numerical",
            dataPayload: nums
          };
        }
        if (Array.isArray(obj[0])) {
          return {
            valid: true,
            rowCount: obj.length,
            missingCount: 0,
            inferredDesign: obj.length >= 2 && obj[0].length >= 2 && obj.every((g) => g.length <= 4)
              ? "contingency_categorical"
              : "multi_group_numerical",
            dataPayload: obj
          };
        }
      }
      return {valid:false, reason:"Unsupported JSON structure. Import observations, a numeric array, or a valid ResampleLab session."};
    } catch (_err) {
      return { valid: false, reason: "Invalid JSON syntax or observation structure in input." };
    }
  }

  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) {
    return { valid: false, reason: "No non-empty lines found." };
  }

  // Detect delimiter (tab, comma, or semicolon)
  const firstLine = lines[0];
  let delimiter = ",";
  if (firstLine.includes("\t")) delimiter = "\t";
  else if (!firstLine.includes(",") && firstLine.includes(";")) delimiter = ";";

  // Single-line comma-separated numbers
  if (lines.length === 1) {
    const tokens = firstLine.split(/[\s,;]+/).filter(Boolean);
    const nums = tokens.map(Number).filter((v) => Number.isFinite(v));
    if (nums.length >= 2 && nums.length === tokens.length) {
      return {
        valid: true,
        rowCount: nums.length,
        missingCount: 0,
        headers: ["value"],
        columns: [{ name: "value", type: "quantitative", validCount: nums.length, missingCount: 0, values: nums }],
        inferredDesign: "one_numerical",
        dataPayload: nums,
        previewRows: nums.slice(0, 10).map((v, idx) => ({ obs_id: `row_${idx + 1}`, value: v }))
      };
    }
  }

  const parsedRows = readDelimitedRecords(text, delimiter).records;
  const firstTokens = parsedRows[0];
  const isFirstHeader = firstTokens.some((tok) => tok !== "" && Number.isNaN(Number(tok)));

  const headers = isFirstHeader
    ? firstTokens.map((h, i) => h || `col_${i + 1}`)
    : firstTokens.map((_, i) => `var_${i + 1}`);

  const dataRows = isFirstHeader ? parsedRows.slice(1) : parsedRows;
  if (dataRows.length < 2) {
    return { valid: false, reason: "At least 2 data rows are required." };
  }

  assertHeaders(headers);
  assertTableSize(dataRows.length, headers.length);
  if (dataRows.some(row => row.length !== headers.length)) throw new Error("Column counts do not match. Check delimiters and missing cells.");
  const colCount = headers.length;
  const columns = headers.map((name, colIdx) => {
    const rawVals = dataRows.map((r) => (r[colIdx] !== undefined ? r[colIdx] : ""));
    let numericCount = 0;
    let nonEmptyCount = 0;
    const uniqueTokens = new Set();
    for (const v of rawVals) {
      if (v !== "" && v !== "NA" && v !== "null" && v !== "NaN") {
        nonEmptyCount++;
        uniqueTokens.add(v);
        if (Number.isFinite(Number(v))) numericCount++;
      }
    }
    const isNumeric = nonEmptyCount > 0 && numericCount / nonEmptyCount >= 0.85;
    const isBinary = uniqueTokens.size === 2 && (
      Array.from(uniqueTokens).every((u) => ["0", "1", "yes", "no", "true", "false"].includes(String(u).toLowerCase()))
    );
    return {
      name,
      index: colIdx,
      type: isBinary ? "binary" : isNumeric ? "quantitative" : "categorical",
      validCount: nonEmptyCount,
      missingCount: dataRows.length - nonEmptyCount,
      uniqueCount: uniqueTokens.size,
      rawValues: rawVals
    };
  });

  let inferredDesign = "one_numerical";
  let dataPayload = [];
  let missingCount = 0;

  if (colCount === 1) {
    const col = columns[0];
    missingCount = col.missingCount;
    if (col.type === "binary") {
      inferredDesign = "one_binary";
      dataPayload = col.rawValues
        .filter((v) => ["0","1","yes","no","true","false"].includes(String(v).toLowerCase()))
        .map((v) => (["1", "yes", "true"].includes(String(v).toLowerCase()) ? 1 : 0));
    } else {
      inferredDesign = "one_numerical";
      dataPayload = col.rawValues.map(missingNumber).filter((v) => Number.isFinite(v));
    }
  } else if (colCount >= 2) {
    const c0 = columns[0];
    const c1 = columns[1];

    if (c0.type === "categorical" && c0.uniqueCount === 2 && (c1.type === "quantitative" || c1.type === "binary")) {
      const levels = Array.from(new Set(c0.rawValues.filter((v) => v !== "")));
      const g1 = [];
      const g2 = [];
      for (let i = 0; i < dataRows.length; i++) {
        const grp = c0.rawValues[i];
        const num = missingNumber(c1.rawValues[i]);
        if (grp && Number.isFinite(num)) {
          if (grp === levels[0]) g1.push(num);
          else if (grp === levels[1]) g2.push(num);
        } else {
          missingCount++;
        }
      }
      inferredDesign = c1.type === "binary" ? "two_independent_binary" : "two_independent_numerical";
      dataPayload = { g1, g2, groupLabels: levels };
    } else if ((c0.type === "quantitative" || c0.type === "binary") && (c1.type === "quantitative" || c1.type === "binary")) {
      const pairs = [];
      for (let i = 0; i < dataRows.length; i++) {
        const x = missingNumber(c0.rawValues[i]);
        const y = missingNumber(c1.rawValues[i]);
        if (Number.isFinite(x) && Number.isFinite(y)) {
          pairs.push({ obs_id: `row_${i + 1}`, label: `Row ${i + 1}`, x, y });
        } else {
          missingCount++;
        }
      }
      inferredDesign = "bivariate_numerical";
      dataPayload = pairs;
    } else {
      const quantCol = columns.find((c) => c.type === "quantitative") || columns[0];
      dataPayload = quantCol.rawValues.map(missingNumber).filter((v) => Number.isFinite(v));
      inferredDesign = "one_numerical";
    }
  }

  const previewRows = dataRows.slice(0, 8).map((r, idx) => {
    const obj = Object.assign(Object.create(null), {obs_id:`row_${idx+1}`});
    headers.forEach((h, cIdx) => {
      obj[h] = r[cIdx] ?? "";
    });
    return obj;
  });

  return {
    valid: true,
    rowCount: dataRows.length,
    missingCount,
    headers,
    columns,
    inferredDesign,
    dataPayload,
    previewRows
  };
}

/**
 * Exports analysis summary metrics to RFC 4180 CSV with formula-injection protection.
 * @param {object} result Inference result object
 * @returns {string}
 */
export function exportSummaryToCSV(result) {
  if (!result) return "";
  const rows = [
    ["metric", "value", "notes"]
  ];
  rows.push(["analysis_type", result.analysisType || "", result.statisticalMethod || ""]);
  rows.push(["dataset_title", result.datasetTitle || "", result.sampleSizeSummary || ""]);
  rows.push(["statistic", result.statisticName || "", result.estimand || ""]);
  rows.push(["random_seed", result.prng?.seed ?? "", result.prng?.algorithm ?? ""]);
  rows.push(["completed_replicates", result.completedReplicates ?? "", `Requested: ${result.requestedReplicates ?? ""}`]);

  if (result.analysisType === "bootstrap_inference") {
    rows.push(["original_estimate", result.originalEstimate, "Point estimate on observed sample"]);
    rows.push(["bootstrap_mean", result.bootstrapMean, "Mean of bootstrap replicates"]);
    rows.push(["bootstrap_se", result.bootstrapSE, "Sample SD of bootstrap replicates (B-1 divisor)"]);
    rows.push(["bootstrap_bias", result.bootstrapBias, "bootstrap_mean - original_estimate"]);
    if (result.intervals) {
      for (const key of Object.keys(result.intervals)) {
        const iv = result.intervals[key];
        if (iv.eligible && iv.ci) {
          rows.push([`${key}_ci_low`, iv.ci[0], iv.name]);
          rows.push([`${key}_ci_high`, iv.ci[1], `Width: ${iv.width.toFixed(4)}`]);
        }
      }
    }
  } else if (result.analysisType === "permutation_inference") {
    rows.push(["observed_statistic", result.observedStatistic, result.nullHypothesis || ""]);
    rows.push(["p_value", result.pValue, result.pValueFormulaText || ""]);
    rows.push(["extreme_count", result.extremeCount, `Alternative: ${result.alternative}`]);
    rows.push(["mc_se_pvalue", result.monteCarloUncertainty?.mcSE ?? 0, "Monte Carlo SE of p-value"]);
  }

  return rows.map((r) => r.map(escapeCsvCell).join(",")).join("\r\n");
}

/**
 * Exports all replicate statistics to RFC 4180 CSV.
 * @param {object} result
 * @returns {string}
 */
export function exportReplicatesToCSV(result) {
  const vals = result?.distributionObject?.values || [];
  const lines = ["replicate_index,statistic_value"];
  for (let i = 0; i < vals.length; i++) {
    lines.push(`${i + 1},${escapeCsvCell(vals[i])}`);
  }
  return lines.join("\r\n");
}

/**
 * Exports DataSenseSimulationResult v1.0.0 compliant JSON per DATA_CONVENTIONS.md Section E.3.
 * @param {object} result
 * @returns {string}
 */
export function exportDataSenseSimulationJSON(result) {
  if (!result) return "{}";
  const payload = {
    $schema: "https://datasense-studio.github.io/schemas/v1/simulation-result.json",
    version: "1.0.0",
    sourceApplication: "ResampleLab",
    applicationVersion: "1.0.0",
    createdAt: new Date().toISOString(),
    procedure: result.statisticalMethod,
    analysisType: result.analysisType,
    datasetTitle: result.datasetTitle,
    targetStatistic: result.statisticId,
    estimand: result.estimand,
    originalEstimate: result.originalEstimate ?? result.observedStatistic,
    replicates: result.completedReplicates,
    prng: result.prng,
    summary: result.analysisType === "bootstrap_inference"
      ? {
          bootstrapMean: result.bootstrapMean,
          bootstrapStandardError: result.bootstrapSE,
          bootstrapBias: result.bootstrapBias,
          confidenceLevel: result.confLevel,
          percentileCI: result.intervals?.percentile?.ci || null,
          basicCI: result.intervals?.basic?.ci || null,
          normalCI: result.intervals?.normal?.ci || null,
          studentizedCI: result.intervals?.studentized?.ci || null,
          bcaCI: result.intervals?.bca?.ci || null
        }
      : {
          nullHypothesis: result.nullHypothesis,
          alternative: result.alternative,
          pValue: result.pValue,
          extremeCount: result.extremeCount,
          isExactEnumerated: result.isExactEnumerated,
          monteCarloSE: result.monteCarloUncertainty?.mcSE ?? 0
        },
    warnings: result.warnings || []
  };
  return JSON.stringify(payload, null, 2);
}

/**
 * Exports a complete reproducible ResampleLab Session JSON (Part 19.3) containing
 * dataset schema, configuration, seed, PRNG algorithm version, and results.
 */
export function exportReproducibleSessionJSON(workbenchState) {
  const activeRes = workbenchState.bootResult || workbenchState.permResult;
  return JSON.stringify(
    {
      sessionType: "ResampleLabSession",
      schemaVersion: "1.0.0",
      softwareVersion: "ResampleLab 1.0.0",
      exportedAt: new Date().toISOString(),
      title: workbenchState.title,
      designType: workbenchState.designType,
      statisticId: workbenchState.statisticId,
      dataPayload: workbenchState.dataPayload,
      prng: activeRes?.prng || { algorithm: "Mulberry32-v1.0", seed: 4289104 },
      lastAnalysisSummary: activeRes
        ? {
            analysisType: activeRes.analysisType,
            originalEstimate: activeRes.originalEstimate ?? activeRes.observedStatistic,
            bootstrapSE: activeRes.bootstrapSE ?? null,
            pValue: activeRes.pValue ?? null
          }
        : null
    },
    null,
    2
  );
}

/**
 * Generates an executable R script reproducing the analysis.
 * @param {object} result
 * @param {*} rawDataPayload
 * @returns {string}
 */
export {generateRScript, generatePythonScript} from './script-export.js';

/**
 * Generates a structured, human-readable Markdown analysis report.
 * @param {object} result
 * @returns {string}
 */
export function generateReadableReport(result) {
  if (!result) return "No completed analysis available.";
  const lines = [
    `# ResampleLab Statistical Analysis Report`,
    ``,
    `- **Dataset**: ${result.datasetTitle}`,
    `- **Sample Size**: ${result.sampleSizeSummary}`,
    `- **Target Estimand**: ${result.estimand}`,
    `- **Sample Statistic**: ${result.statisticName} (${result.statisticSymbol})`,
    `- **Method**: ${result.statisticalMethod}`,
    `- **Replicates Completed**: B = ${result.completedReplicates} (Seed: ${result.prng?.seed}, Engine: ${result.prng?.algorithm})`,
    `- **Resampling Mechanism**: ${result.resamplingMechanism || result.nullGenerationMechanism}`,
    ``
  ];

  if (result.analysisType === "bootstrap_inference") {
    lines.push(`## Numerical Results`);
    lines.push(`- **Observed Point Estimate**: ${result.originalEstimate.toFixed(4)}`);
    lines.push(`- **Bootstrap Mean**: ${result.bootstrapMean.toFixed(4)}`);
    lines.push(`- **Bootstrap Standard Error (SE_boot)**: ${result.bootstrapSE.toFixed(4)}`);
    lines.push(`- **Bootstrap Bias Estimate**: ${result.bootstrapBias.toFixed(4)}`);
    lines.push(``);
    lines.push(`## ${(result.confLevel * 100).toFixed(1)}% Confidence Intervals`);
    for (const key of Object.keys(result.intervals || {})) {
      const iv = result.intervals[key];
      if (iv.eligible) {
        lines.push(`- **${iv.name}**: [${iv.ci[0].toFixed(4)}, ${iv.ci[1].toFixed(4)}] (Width: ${iv.width.toFixed(4)})`);
      } else {
        lines.push(`- **${iv.name}**: Not eligible (${iv.reason})`);
      }
    }
  } else {
    lines.push(`## Hypothesis Test Results`);
    lines.push(`- **Null Hypothesis**: ${result.nullHypothesis}`);
    lines.push(`- **Alternative Hypothesis**: ${result.alternativeHypothesis}`);
    lines.push(`- **Observed Test Statistic**: ${result.observedStatistic.toFixed(4)}`);
    lines.push(`- **p-Value**: ${result.pValue < 0.0001 ? "< 0.0001" : result.pValue.toFixed(4)} (${result.pValueFormulaText})`);
    lines.push(`- **Monte Carlo Uncertainty (SE_MC)**: ${result.monteCarloUncertainty?.mcSE?.toFixed(4) ?? "0 (Exact)"}`);
    lines.push(`- **Scope of Inference**: ${result.causalScopeNote}`);
  }

  if (result.warnings && result.warnings.length > 0) {
    lines.push(``);
    lines.push(`## Validation & Assumption Warnings`);
    for (const w of result.warnings) {
      lines.push(`- **[${w.severity.toUpperCase()}] ${w.code}**: ${w.message}`);
    }
  }

  return lines.join("\n");
}
