# Data Formats, Schemas, & Ecosystem Interoperability (`DATA_FORMATS.md`)

## 1. Supported Import Formats (`js/exporters.js`)

1. **RFC 4180 CSV & TSV**: Automatically detects comma (`,`), tab (`\t`), or semicolon (`;`) delimiters, header rows, quantitative vs binary vs categorical columns, and missing values (`""`, `"NA"`, `"null"`, `"NaN"`).
2. **Single-Line Numeric Vectors**: Space- or comma-separated numeric strings for rapid classroom exploration.
3. **DataSense Interchange JSON (`DataSenseDataset` v1.0.0)**: Compatible with QuartetLab, VisualGrammar, and ForecastLab.

## 2. CSV Formula Injection Protection

Per `DATA_CONVENTIONS.md` Section D.2, `escapeCsvCell()` inspects every exported string cell and prepends a literal single quote (`'`) whenever the string starts with `=`, `+`, `-`, `@`, `\t`, or `\r`. This prevents malicious or accidental formula execution when opening exported CSVs in spreadsheet applications.

## 3. Exported `DataSenseSimulationResult` Schema (v1.0.0)

```json
{
  "$schema": "https://datasense-studio.github.io/schemas/v1/simulation-result.json",
  "version": "1.0.0",
  "sourceApplication": "ResampleLab",
  "applicationVersion": "1.0.0",
  "procedure": "nonparametric_case_bootstrap",
  "analysisType": "bootstrap_inference",
  "targetStatistic": "mean",
  "originalEstimate": 5.5083,
  "replicates": 2000,
  "prng": {
    "algorithm": "Mulberry32-v1.0",
    "seed": 4289104
  },
  "summary": {
    "bootstrapMean": 5.5142,
    "bootstrapStandardError": 1.2418,
    "bootstrapBias": 0.0059,
    "confidenceLevel": 0.95,
    "percentileCI": [3.3917, 8.1792],
    "bcaCI": [3.6250, 8.6417]
  }
}
```
