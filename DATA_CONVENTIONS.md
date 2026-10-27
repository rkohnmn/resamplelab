# DataSense Data Conventions and Interchange Specification

**Document Version:** 1.0.0  
**Status:** Canonical Standard  
**Applies to:** QuartetLab, VisualGrammar, ResampleLab, ForecastLab, and DataSense Studio Core  
**Governing Authority:** DataSense Data Architecture & Interoperability Committee  

---

## 1. Scope and Objective

This specification establishes the canonical conventions for dataset structure, data types, missing value semantics, delimiter parsing, RFC 4180 CSV export, JSON interchange schemas, and cross-application data pipelines across the DataSense Studio ecosystem.

Statistical tools in DataSense operate strictly in client-side, local-first browser environments. Data structures MUST preserve complete semantic context—including variable roles, measurement units, sample moments, mathematical provenance, random seeds, and diagnostic flags—as data moves seamlessly among QuartetLab, VisualGrammar, ResampleLab, and ForecastLab.

---

## Section A: Dataset Structure and Tidy Data Principles

### A.1 Core Definitions
Every dataset in DataSense is modeled as a relational collection of observations and variables adhering to Tidy Data principles (Wickham, 2014):
1. **Observation (Unit of Analysis)**: A single realized event, item, subject, or experimental trial. In tabular storage, each observation forms exactly one **Row**.
2. **Variable (Attribute / Feature)**: A distinct characteristic, measurement, or property observed across units. In tabular storage, each variable forms exactly one **Column**.
3. **Field / Cell**: A single scalar value located at the intersection of a specific observation row and variable column.
4. **Table**: A rectangular array of cells with dimension $n \times p$, where $n \in \mathbb{N}$ denotes the number of observations and $p \in \mathbb{N}$ denotes the number of variables.
5. **Metadata**: Structural and contextual descriptions bound to a dataset or variable, including titles, measurement units, domain descriptions, author attribution, creation timestamps, and software versions.
6. **Observation Identifier (`obs_id`)**: A unique, non-null, immutable key identifying a specific row within the dataset (e.g., `pt_1`, `case_104`).
7. **Variable Identifier**: A standardized alphanumeric string identifying a column (e.g., `length_m`, `period_sq`).

### A.2 Variable Roles in Analytical Modeling
Variables MUST be categorized by analytical role in application schemas:
- `explanatory` / `predictor` / `independent` ($X$): Input feature used to model or predict response.
- `response` / `dependent` ($Y$): Primary outcome under study.
- `grouping` / `factor`: Categorical variable defining sub-populations, treatments, or strata.
- `weight`: Non-negative numerical weight assigned to each observation for weighted statistics.
- `timestamp` / `time_index`: Ordered temporal coordinate for time-series analysis.
- `metadata` / `label`: Contextual annotations not included directly in mathematical matrix computations.

---

## Section B: Data Types and In-Memory Representations

DataSense applications execute in JavaScript/TypeScript engines. Values MUST conform to the following type representations:

### B.1 Quantitative Types
- **Floating-Point Number**: Standard IEEE 754 64-bit double-precision `Float64`.
- **Integer**: Exact integers in the range $[-(2^{53} - 1), 2^{53} - 1]$ (`Number.isSafeInteger()`).
- **Probabilities & Proportions**: Floats strictly constrained to the closed interval $[0.0, 1.0]$.
- **Percentages**: Floats scaled to $[0.0, 100.0]$. Code comments and variable metadata MUST state whether a proportion or percentage is stored to avoid 100x scaling errors.

### B.2 Categorical Types
- **Nominal String**: UTF-8 encoded text representing discrete classes.
- **Ordered Factor**: A categorical variable explicitly bound to an ordered list of allowed level strings (e.g., `["low", "medium", "high"]`). Encodings MUST sort by factor level index, never alphabetically.

### B.3 Temporal Types
- **Calendar Date**: ISO 8601 extended calendar date string: `YYYY-MM-DD` (e.g., `2026-10-26`).
- **Timestamp (Datetime)**: ISO 8601 UTC timestamp: `YYYY-MM-DDTHH:mm:ssZ` or with millisecond precision `YYYY-MM-DDTHH:mm:ss.sssZ`. Local time zone offsets MUST be converted to UTC or stored with explicit offset notation.

### B.4 Missing and Non-Finite Values
DataSense applications MUST enforce distinct semantics for non-standard numeric states:
- **Missing Value (`null`)**: Observation was not recorded or is absent.
- **Invalid Value**: Observation failed validation bounds (e.g., negative mass, probability $> 1.0$).
- **Undefined Value**: Mathematical operation is undefined (e.g., sample variance of $n=1$, division by zero $0/0$). Evaluates to `NaN`.
- **Non-Finite (`+Infinity`, `-Infinity`)**: Arithmetic overflow beyond float range ($\approx 1.8 \times 10^{308}$).

---

## Section C: Missing Data Handling Standards

### C.1 Permitted Handling Strategies
When missing (`null`) or non-finite (`NaN`, `Inf`) observations are detected during analysis:
1. **Complete-Case Analysis (Listwise Deletion)**: Observations with missing values in any required modeling column are excluded from calculation.
   - *Mandatory Disclosure*: Applications MUST prominently display the effective sample size alongside the original count: e.g., "Computed on $n = 48$ complete cases ($2$ observations excluded due to missing coordinates)".
2. **Pairwise Deletion**: Permitted exclusively in bivariate correlation matrices where each cell is computed from all observations complete for that specific pair of variables.
3. **Imputation**:
   - Simple imputation (mean, median) is prohibited for automated modeling unless explicitly selected by the user.
   - Model-based imputation (e.g., linear interpolation in regular time-series) MUST mark imputed records with an explicit `is_imputed: true` boolean metadata flag.

### C.2 Prohibition of Silent Data Dropping
Statistical engines MUST NOT silently drop, alter, or replace missing values without notifying the user in the UI and recording the exclusion in exported provenance logs.

---

## Section D: Delimited Text and CSV Standards

### D.1 RFC 4180 Compliance
CSV imports and exports in DataSense software MUST strictly comply with [RFC 4180](https://www.ietf.org/rfc/rfc4180.txt):
1. **Header Row**: The first record MUST contain column header names.
2. **Field Delimiters**: Default delimiter is comma (`,`). Importers SHOULD also recognize tab-delimited text (`\t`) and semicolon (`;`).
3. **Line Breaks**: Records are terminated by CRLF (`\r\n`) or LF (`\n`).
4. **Quoting**: Any field containing commas, line breaks, or double quotes MUST be enclosed in double quotes (`"`). Double quotes within a quoted string MUST be escaped by prefixing with another double quote (`""`).
5. **Character Encoding**: File text MUST be encoded as UTF-8 without byte order marks (BOM).

### D.2 Prevention of Spreadsheet Formula Injection (CSV Injection)
Exporting un-sanitized user labels or strings to CSV exposes users to formula injection vulnerabilities in Microsoft Excel, Google Sheets, and LibreOffice Calc.
- **Mandatory Export Sanitization Rule**: If any string field begins with the characters `=`, `+`, `-`, `@`, `\t`, or `\r`, the export engine MUST prepend a single apostrophe (`'`) or quote the field safely to force spreadsheet software to treat the content as literal text rather than an executable formula.

### D.3 Column Header Naming Conventions
- Column headers SHOULD use lowercase alphanumeric characters and underscores: `[a-z0-9_]+`.
- Column names MUST NOT start with a number. If a user inputs a numeric header (e.g., `2026_sales`), the exporter MUST prefix it: `v_2026_sales`.
- Space characters in user labels MUST be converted to underscores during script and export generation.

---

## Section E: Shared Interchange Formats (DataSense JSON Standards)

DataSense establishes four canonical, versioned JSON schemas for cross-application communication and state persistence.

### E.1 Dataset Schema: `DataSenseDataset` (v1.0.0)

```json
{
  "$schema": "https://datasense-studio.github.io/schemas/v1/dataset.json",
  "version": "1.0.0",
  "metadata": {
    "id": "anscombe_1",
    "title": "Anscombe's Quartet I — Well-Behaved Linear",
    "description": "Bivariate dataset exhibiting classic well-behaved linear regression.",
    "createdAt": "2026-10-26T15:00:00Z",
    "sourceApplication": "QuartetLab",
    "applicationVersion": "1.0.0"
  },
  "variables": [
    {
      "name": "explanatory_x",
      "label": "Explanatory X1",
      "unit": "units",
      "dataType": "float64",
      "role": "explanatory"
    },
    {
      "name": "response_y",
      "label": "Response Y1",
      "unit": "units",
      "dataType": "float64",
      "role": "response"
    }
  ],
  "observations": [
    { "obs_id": "a1_1", "label": "Case 1", "explanatory_x": 10.0, "response_y": 8.04 },
    { "obs_id": "a1_2", "label": "Case 2", "explanatory_x": 8.0, "response_y": 6.95 },
    { "obs_id": "a1_3", "label": "Case 3", "explanatory_x": 13.0, "response_y": 7.58 },
    { "obs_id": "a1_4", "label": "Case 4", "explanatory_x": 9.0, "response_y": 8.81 },
    { "obs_id": "a1_5", "label": "Case 5", "explanatory_x": 11.0, "response_y": 8.33 },
    { "obs_id": "a1_6", "label": "Case 6", "explanatory_x": 14.0, "response_y": 9.96 },
    { "obs_id": "a1_7", "label": "Case 7", "explanatory_x": 6.0, "response_y": 7.24 },
    { "obs_id": "a1_8", "label": "Case 8", "explanatory_x": 4.0, "response_y": 4.26 },
    { "obs_id": "a1_9", "label": "Case 9", "explanatory_x": 12.0, "response_y": 10.84 },
    { "obs_id": "a1_10", "label": "Case 10", "explanatory_x": 7.0, "response_y": 4.82 },
    { "obs_id": "a1_11", "label": "Case 11", "explanatory_x": 5.0, "response_y": 5.68 }
  ]
}
```

### E.2 Model Output Schema: `DataSenseModelOutput` (v1.0.0)

```json
{
  "$schema": "https://datasense-studio.github.io/schemas/v1/model-output.json",
  "version": "1.0.0",
  "modelType": "ordinary_least_squares",
  "formula": "response_y ~ explanatory_x",
  "sampleSize": 11,
  "degreesOfFreedom": 9,
  "coefficients": [
    {
      "term": "(Intercept)",
      "estimate": 3.0001,
      "standardError": 1.1247,
      "tStatistic": 2.667,
      "pValue": 0.0257,
      "confidenceInterval95": [0.4559, 5.5443]
    },
    {
      "term": "explanatory_x",
      "estimate": 0.5001,
      "standardError": 0.1179,
      "tStatistic": 4.241,
      "pValue": 0.0022,
      "confidenceInterval95": [0.2334, 0.7668]
    }
  ],
  "fitMetrics": {
    "residualStandardError": 1.2366,
    "rSquared": 0.6665,
    "adjustedRSquared": 0.6295,
    "fStatistic": 17.99,
    "fPValue": 0.0022
  },
  "diagnostics": [
    {
      "obs_id": "a1_1",
      "fitted": 8.0011,
      "residual": 0.0389,
      "leverage": 0.1000,
      "internallyStudentizedResidual": 0.0332,
      "cooksDistance": 0.00006,
      "flags": ["OK"]
    }
  ]
}
```

### E.3 Simulation Output Schema: `DataSenseSimulationResult` (v1.0.0)

```json
{
  "$schema": "https://datasense-studio.github.io/schemas/v1/simulation-result.json",
  "version": "1.0.0",
  "procedure": "nonparametric_bootstrap",
  "targetStatistic": "pearson_r",
  "originalEstimate": 0.8164,
  "replicates": 10000,
  "prng": {
    "algorithm": "Mulberry32",
    "seed": 4289104
  },
  "summary": {
    "bootstrapMean": 0.8142,
    "bootstrapStandardError": 0.0894,
    "bootstrapBias": -0.0022,
    "percentileCI95": [0.6012, 0.9421],
    "normalCI95": [0.6412, 0.9916]
  }
}
```

### E.4 Time-Series Forecast Schema: `DataSenseForecastResult` (v1.0.0)

```json
{
  "$schema": "https://datasense-studio.github.io/schemas/v1/forecast-result.json",
  "version": "1.0.0",
  "modelType": "ETS_A_A_N",
  "seriesId": "monthly_passenger_volume",
  "frequency": 12,
  "inSampleMetrics": {
    "mae": 14.2,
    "rmse": 18.5,
    "mase": 0.68
  },
  "horizon": 3,
  "forecasts": [
    {
      "step": 1,
      "timestamp": "2026-11-01",
      "pointForecast": 412.5,
      "predictionInterval80": [398.2, 426.8],
      "predictionInterval95": [390.6, 434.4]
    },
    {
      "step": 2,
      "timestamp": "2026-12-01",
      "pointForecast": 418.1,
      "predictionInterval80": [401.4, 434.8],
      "predictionInterval95": [392.5, 443.7]
    },
    {
      "step": 3,
      "timestamp": "2027-01-01",
      "pointForecast": 423.7,
      "predictionInterval80": [404.3, 443.1],
      "predictionInterval95": [394.0, 453.4]
    }
  ]
}
```

*Note on Status*: The schemas above represent the canonical proposed DataSense Studio interchange standards. The current QuartetLab implementation uses a compact Base64 JSON tuple format in URL hash fragments (`#state=...`) as detailed in [STATISTICAL_AUDIT.md](file:///c:/Users/RobTop/Downloads/quartetlab/datasense-standards/STATISTICAL_AUDIT.md).

---

## Section F: Cross-Application Interoperability Flows

```
 +---------------------------------------------------------+
 |                       QuartetLab                        |
 |  (Exact-moment synthesis, OLS regression, diagnostics)  |
 +---------------------------+-----------------------------+
                             |
         Export DataSenseDataset / CSV with diagnostics
                             |
             +---------------+---------------+
             |                               |
             v                               v
 +-----------------------+       +-----------------------+
 |      ResampleLab      |       |     VisualGrammar     |
 | (Bootstrap inference, |       | (Chart selector,      |
 |  permutation tests)   |       |  encoding inspection) |
 +-----------+-----------+       +-----------+-----------+
             |                               |
             +---------------+---------------+
                             |
                             v
                 +-----------------------+
                 |      ForecastLab      |
                 | (Time-series modeling |
                 |  & forecast fan plots)|
                 +-----------------------+
```

### F.1 Pipeline Guarantees
1. **QuartetLab to ResampleLab**: Exporting a synthesized bivariate dataset MUST carry coordinates, target moments, and diagnostic flags. ResampleLab uses these to evaluate sampling variability of the slope $\hat{\beta}_1$ or execute permutation tests on Pearson $r$.
2. **QuartetLab to VisualGrammar**: Passing coordinates along with diagnostic classifications (`INFLUENTIAL`, `HIGH LEV`, `OUTLIER`) allows VisualGrammar to recommend multi-channel encodings (e.g., dual-encoding leverage by shape and color).
3. **ResampleLab to VisualGrammar**: Bootstrap distribution vectors pass directly to VisualGrammar to demonstrate sampling distribution histograms versus empirical cumulative distributions.
4. **ForecastLab to VisualGrammar**: Time-series decomposition components ($T_t, S_t, R_t$) pass to VisualGrammar to demonstrate faceted seasonal subseries plots.

---

## Section G: Data Integrity and Privacy Standards

1. **Local-First Architecture**: All data parsing, transformations, and exports MUST execute 100% inside the client browser. Under no circumstances may user data be transmitted to third-party endpoints or analytics services.
2. **Input Validation**: Import parsers MUST validate:
   - Non-empty input text.
   - At least 2 columns and at least 3 valid observations.
   - All coordinate values parse to finite numbers (`Number.isFinite()`).
   - Line-by-line reporting of specific parse errors (e.g., "Line 4: Non-numeric token 'abc' found in column 2").
3. **State Losslessness**: Encoding dataset state to URL hash fragment or `localStorage` snapshot MUST preserve numeric coordinates to at least 4 decimal places without cumulative drift.
