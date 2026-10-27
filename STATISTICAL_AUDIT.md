# QuartetLab Comprehensive Statistical, Mathematical, and Architectural Audit

**Audit Date:** October 26, 2026  
**Auditor:** Senior Statistical Software Architect & Mathematical Auditor  
**Subject Application:** QuartetLab (v1.0.0)  
**Corpus / Repository Root:** `c:\Users\RobTop\Downloads\quartetlab`  
**Deployment Target:** GitHub Pages Static Site (`https://rkohnmn.github.io/quartetlab/`)  

---

## Section A: Repository Overview and Architectural Context

QuartetLab is an interactive bivariate dataset synthesizer, exact-moment solver, regression diagnostic workbench, and classroom assessment studio designed for zero-backend static deployment on GitHub Pages.

### A.1 Source File Inventory and Code Responsibilities

| File Path | Code Size | Architectural Responsibility |
|---|---|---|
| [`index.html`](file:///c:/Users/RobTop/Downloads/quartetlab/index.html) | 26,142 bytes | Semantic HTML5 structure, ARIA landmarks, bento grid layout, SVG icons, modal dialogs. |
| [`DESIGN.md`](file:///c:/Users/RobTop/Downloads/quartetlab/DESIGN.md) | 7,993 bytes | Canonical design system specification: visual tokens, typography, layout, component rules. |
| [`css/tokens.css`](file:///c:/Users/RobTop/Downloads/quartetlab/css/tokens.css) | 3,124 bytes | Light archival (`#F6F4EE`) and dark instrument (`#0D1014`) CSS custom properties. |
| [`css/base.css`](file:///c:/Users/RobTop/Downloads/quartetlab/css/base.css) | 3,512 bytes | CSS reset, font declarations, responsive grid layout, accessible focus rings. |
| [`css/components.css`](file:///c:/Users/RobTop/Downloads/quartetlab/css/components.css) | 8,421 bytes | Module card styling, buttons, data tables, sliders, toast notifications. |
| [`css/print.css`](file:///c:/Users/RobTop/Downloads/quartetlab/css/print.css) | 3,892 bytes | High-contrast print stylesheet for classroom Free-Response Question (FRQ) worksheets. |
| [`js/app.js`](file:///c:/Users/RobTop/Downloads/quartetlab/js/app.js) | 44,194 bytes | Main UI controller: state coordinator, pointer drag events, undo/redo history (40 steps). |
| [`js/math-engine.js`](file:///c:/Users/RobTop/Downloads/quartetlab/js/math-engine.js) | 19,772 bytes | Statistical calculation engine: OLS regression, exact Gram-Schmidt projection, diagnostics. |
| [`js/renderer.js`](file:///c:/Users/RobTop/Downloads/quartetlab/js/renderer.js) | 17,569 bytes | High-DPI Canvas 2D rendering: scatter plot, residual plot, normal Q-Q plot. |
| [`js/presets.js`](file:///c:/Users/RobTop/Downloads/quartetlab/js/presets.js) | 10,187 bytes | 8 curated datasets: Anscombe I-IV, pendulum physics, culinary yield, sports analytics. |
| [`js/exporters.js`](file:///c:/Users/RobTop/Downloads/quartetlab/js/exporters.js) | 11,462 bytes | Multi-format exporters (CSV, R, Python, TI-84, LaTeX) and URL hash state serializer. |
| [`js/storage.js`](file:///c:/Users/RobTop/Downloads/quartetlab/js/storage.js) | 4,173 bytes | Safe `localStorage` persistence wrapper with sandbox exception handling and privacy audit. |
| [`tests/math-engine.test.js`](file:///c:/Users/RobTop/Downloads/quartetlab/tests/math-engine.test.js) | 5,218 bytes | Automated Node.js unit tests for numerical algorithms, moments, and distributions. |
| [`tests/exporters-storage.test.js`](file:///c:/Users/RobTop/Downloads/quartetlab/tests/exporters-storage.test.js) | 3,247 bytes | Automated unit tests for export formats, CSV text parsing, and URL state round-tripping. |
| [`tests/verify-build.py`](file:///c:/Users/RobTop/Downloads/quartetlab/tests/verify-build.py) | 3,444 bytes | Python static verification script: subpath safety, zero external CDNs, zero TODOs. |
| [`scripts/prose_linter.py`](file:///c:/Users/RobTop/Downloads/quartetlab/scripts/prose_linter.py) | 19,993 bytes | Python deterministic prose quality auditor: Authenticity score, AI cliché penalization. |

---

## Section B: Exhaustive Statistical and Algorithmic Inventory

The following table catalogs every mathematical, statistical, diagnostic, and numerical algorithm implemented in QuartetLab's engine ([`js/math-engine.js`](file:///c:/Users/RobTop/Downloads/quartetlab/js/math-engine.js)).

| Index | Quantity / Algorithm | Implemented Function | Code Lines | Mathematical Definition |
|---|---|---|---|---|
| **1** | Sample Mean of $X$ ($\bar{x}$) | `computeDatasetDiagnostics` | L314–L320 | $\bar{x} = \frac{1}{n} \sum_{i=1}^n x_i$ |
| **2** | Sample Mean of $Y$ ($\bar{y}$) | `computeDatasetDiagnostics` | L315–L321 | $\bar{y} = \frac{1}{n} \sum_{i=1}^n y_i$ |
| **3** | Corrected Sum of Squares $SS_{xx}$ | `computeDatasetDiagnostics` | L323–L329 | $SS_{xx} = \sum_{i=1}^n (x_i - \bar{x})^2$ |
| **4** | Corrected Sum of Squares $SS_{yy}$ | `computeDatasetDiagnostics` | L324–L330 | $SS_{yy} = \sum_{i=1}^n (y_i - \bar{y})^2$ |
| **5** | Corrected Cross-Product $SS_{xy}$ | `computeDatasetDiagnostics` | L325–L331 | $SS_{xy} = \sum_{i=1}^n (x_i - \bar{x})(y_i - \bar{y})$ |
| **6** | Sample Standard Deviation $s_x$ | `computeDatasetDiagnostics` | L334 | $s_x = \sqrt{SS_{xx} / (n - 1)}$ |
| **7** | Sample Standard Deviation $s_y$ | `computeDatasetDiagnostics` | L335 | $s_y = \sqrt{SS_{yy} / (n - 1)}$ |
| **8** | Pearson Correlation Coefficient $r$ | `computeDatasetDiagnostics` | L336–L337 | $r = \frac{SS_{xy}}{\sqrt{SS_{xx} SS_{yy}}}$ (clamped to $[-1, 1]$) |
| **9** | Coefficient of Determination $R^2$ | `computeDatasetDiagnostics` | L338 | $R^2 = r^2$ |
| **10** | Adjusted $R^2$ ($R^2_{\text{adj}}$) | `computeDatasetDiagnostics` | L339 | $R^2_{\text{adj}} = 1 - \frac{(1 - R^2)(n - 1)}{n - 2}$ |
| **11** | OLS Slope ($\hat{\beta}_1$) | `computeDatasetDiagnostics` | L341 | $\hat{\beta}_1 = SS_{xy} / SS_{xx}$ |
| **12** | OLS Intercept ($\hat{\beta}_0$) | `computeDatasetDiagnostics` | L342 | $\hat{\beta}_0 = \bar{y} - \hat{\beta}_1 \bar{x}$ |
| **13** | Fitted Values ($\hat{y}_i$) | `computeDatasetDiagnostics` | L350 | $\hat{y}_i = \hat{\beta}_0 + \hat{\beta}_1 x_i$ |
| **14** | Raw Residuals ($e_i$) | `computeDatasetDiagnostics` | L351 | $e_i = y_i - \hat{y}_i$ |
| **15** | Residual Sum of Squares ($SSE$) | `computeDatasetDiagnostics` | L354 | $SSE = \sum_{i=1}^n e_i^2$ |
| **16** | Regression Sum of Squares ($SSR$) | `computeDatasetDiagnostics` | L355 | $SSR = \sum_{i=1}^n (\hat{y}_i - \bar{y})^2$ |
| **17** | Residual Standard Error ($s_e$) | `computeDatasetDiagnostics` | L358–L359 | $s_e = \sqrt{SSE / (n - 2)}$ |
| **18** | Standard Error of Slope ($SE(\hat{\beta}_1)$) | `computeDatasetDiagnostics` | L360 | $SE(\hat{\beta}_1) = s_e / \sqrt{SS_{xx}}$ |
| **19** | Standard Error of Intercept ($SE(\hat{\beta}_0)$) | `computeDatasetDiagnostics` | L361–L363 | $SE(\hat{\beta}_0) = s_e \sqrt{\frac{1}{n} + \frac{\bar{x}^2}{SS_{xx}}}$ |
| **20** | Slope $t$-Statistic ($t_{\beta_1}$) | `computeDatasetDiagnostics` | L365 | $t_{\beta_1} = \hat{\beta}_1 / SE(\hat{\beta}_1)$ |
| **21** | Intercept $t$-Statistic ($t_{\beta_0}$) | `computeDatasetDiagnostics` | L366 | $t_{\beta_0} = \hat{\beta}_0 / SE(\hat{\beta}_0)$ |
| **22** | Two-Sided Student-$t$ $p$-Value | `studentTTwoSidedPValue` | L104–L109 | $p = I_{\frac{df}{df + t^2}}\left(\frac{df}{2}, \frac{1}{2}\right)$ |
| **23** | ANOVA $F$-Statistic | `computeDatasetDiagnostics` | L369 | $F = t_{\beta_1}^2$ |
| **24** | 95% $t$ Critical Value ($t_{\text{crit}}$) | `studentTCritical95` | L161–L181 | Cornish-Fisher expansion + 6 Newton-Raphson steps |
| **25** | Slope 95% Confidence Interval | `computeDatasetDiagnostics` | L371 | $[\hat{\beta}_1 - t_{\text{crit}} SE(\hat{\beta}_1), \; \hat{\beta}_1 + t_{\text{crit}} SE(\hat{\beta}_1)]$ |
| **26** | 95% Confidence Band for Mean Response | `renderScatterCanvas` | L180–L198 | $\hat{y}_0 \pm t_{\text{crit}} s_e \sqrt{\frac{1}{n} + \frac{(x_0 - \bar{x})^2}{SS_{xx}}}$ |
| **27** | Hat Matrix Leverage ($h_i$) | `computeDatasetDiagnostics` | L382 | $h_i = \frac{1}{n} + \frac{(x_i - \bar{x})^2}{SS_{xx}}$ |
| **28** | Internally Studentized Residual ($r_i$) | `computeDatasetDiagnostics` | L384 | $r_i = \frac{e_i}{s_e \sqrt{1 - h_i}}$ |
| **29** | Externally Studentized Residual ($t_i$) | `computeDatasetDiagnostics` | L387–L389 | $t_i = r_i \sqrt{\frac{n - 3}{n - 2 - r_i^2}}$ |
| **30** | Cook's Distance ($D_i$) | `computeDatasetDiagnostics` | L390 | $D_i = \frac{r_i^2}{2} \cdot \frac{h_i}{1 - h_i}$ |
| **31** | Normal Q-Q Blom Plotting Position | `computeDatasetDiagnostics` | L424 | $p_i = \frac{i - 0.375}{n + 0.25}$ |
| **32** | Inverse Normal CDF ($\Phi^{-1}(p)$) | `inverseNormalCDF` | L116–L153 | Acklam rational minimax approximation |
| **33** | Lanczos Log-Gamma Function | `logGamma` | L19–L42 | Lanczos $g=7$, 9 coefficients, reflection formula for $z < 0.5$ |
| **34** | Regularized Incomplete Beta $I_x(a,b)$ | `regularizedBeta` | L51–L96 | Lentz continued fraction expansion |
| **35** | Spearman Rank Correlation ($\rho_s$) | `computeSpearmanRank` | L206–L239 | Fractional average tie ranks + Pearson correlation on ranks |
| **36** | Quadratic Model Fit ($y = b_0 + b_1 x + b_2 x^2$) | `fitQuadraticModel` | L248–L297 | $3 \times 3$ normal equations via Gaussian elimination with partial pivoting |
| **37** | Exact Sample Moment Projection | `projectToExactMoments` | L499–L592 | Gram-Schmidt orthogonalization matching $\bar{x}, s_x, \bar{y}, s_y, r$ |
| **38** | Geometric Pattern Synthesis | `synthesizeGeometricDataset` | L601–L662 | 6 geometric patterns projected onto exact moments |
| **39** | Sample Quantiles (Type 7) | `quantileSorted` | L189–L199 | Linear interpolation: $(n-1)q + 1$ |

---

## Section C: Mathematical and Algorithmic Verification

### C.1 Descriptive Statistics & Sums of Squares
- **Implementation**: [`js/math-engine.js:314-335`](file:///c:/Users/RobTop/Downloads/quartetlab/js/math-engine.js#L314-L335)
- **Mathematical Correctness**: Two-pass algorithm is implemented: Pass 1 computes $\bar{x}, \bar{y}$; Pass 2 computes $SS_{xx}, SS_{yy}, SS_{xy}$. This design avoids the catastrophic cancellation inherent in single-pass naive formulas $\sum x_i^2 - (\sum x_i)^2 / n$.
- **Conventions**: Unbiased sample variance uses Bessel's correction $n - 1$.
- **Edge Cases**:
  - $n < 3$: Function aborts at line 306, returning `{ valid: false, n, reason: ... }`. Verified by test in [`tests/math-engine.test.js:128-131`](file:///c:/Users/RobTop/Downloads/quartetlab/tests/math-engine.test.js#L128-L131).
  - $SS_{xx} \le \text{EPSILON}$ ($10^{-12}$): When all $x_i$ are identical, lines 341, 360 assign fallback `slope = 0`, `seSlope = Infinity`, preventing unhandled division-by-zero crashes.
- **Verification Status**: **VERIFIED CORRECT**.

### C.2 Ordinary Least Squares Regression & Inference
- **Implementation**: [`js/math-engine.js:341-372`](file:///c:/Users/RobTop/Downloads/quartetlab/js/math-engine.js#L341-L372)
- **Mathematical Correctness**:
  - $\hat{\beta}_1 = SS_{xy} / SS_{xx}$ exactly matches Gauss-Markov OLS solution.
  - Residual standard error $s_e = \sqrt{SSE / (n - 2)}$ uses correct degrees of freedom $n - 2$.
  - $SE(\hat{\beta}_1) = s_e / \sqrt{SS_{xx}}$ and $SE(\hat{\beta}_0) = s_e \sqrt{1/n + \bar{x}^2 / SS_{xx}}$ match classical theory.
- **Verification Status**: **VERIFIED CORRECT**.

### C.3 Special Distribution Functions (Student-$t$ and Inverse Normal)
- **Implementation**:
  - `logGamma(z)`: Lines 19–42. Lanczos approximation with $g = 7$ achieves precision of $\approx 15$ decimal digits. Includes Euler reflection formula $\Gamma(z)\Gamma(1-z) = \frac{\pi}{\sin(\pi z)}$ for $z < 0.5$.
  - `regularizedBeta(x, a, b)`: Lines 51–62. Evaluates incomplete beta using Lentz's continued fraction method with front-end symmetry transformation ($x < (a+1)/(a+b+2)$).
  - `studentTTwoSidedPValue(tStat, df)`: Lines 104–109. Uses exact relationship between Student-$t$ CDF and incomplete beta distribution: $P(|T| \ge t) = I_{\frac{df}{df + t^2}}\left(\frac{df}{2}, \frac{1}{2}\right)$. Verified against statistical reference tables to within $10^{-4}$ in [`tests/math-engine.test.js:109-113`](file:///c:/Users/RobTop/Downloads/quartetlab/tests/math-engine.test.js#L109-L113).
  - `inverseNormalCDF(p)`: Lines 116–153. Peter Acklam's rational approximation. Evaluated across three regions with clamped probabilities $[10^{-12}, 1 - 10^{-12}]$; maximum relative error is $< 1.15 \times 10^{-9}$.
  - `studentTCritical95(df, alpha)`: Lines 161–181. Uses Hill / Cornish-Fisher expansion followed by up to 6 Newton-Raphson refinement iterations matching the exact $t$-distribution PDF. Tested in [`tests/math-engine.test.js:114-116`](file:///c:/Users/RobTop/Downloads/quartetlab/tests/math-engine.test.js#L114-L116) ($t_{0.975, 9} = 2.2622$).
- **Verification Status**: **VERIFIED CORRECT**.

### C.4 Regression Diagnostics (Leverage, Studentized Residuals, Cook's Distance)
- **Implementation**: [`js/math-engine.js:374-417`](file:///c:/Users/RobTop/Downloads/quartetlab/js/math-engine.js#L374-L417)
- **Formulas**:
  - Leverage: $h_i = \frac{1}{n} + \frac{(x_i - \bar{x})^2}{SS_{xx}}$. Verified: $\sum h_i \equiv 2$.
  - Internally Studentized Residual: $r_i = e_i / (s_e \sqrt{1 - h_i})$. Clamped denominator to $\max(\text{EPSILON}, 1 - h_i)$ prevents division by zero when $h_i = 1.0$.
  - Externally Studentized Residual: $t_i = r_i \sqrt{(n - 3) / (n - 2 - r_i^2)}$. Clamped denominator prevents negative square roots under numerical rounding.
  - Cook's Distance: $D_i = \frac{r_i^2}{2} \cdot \frac{h_i}{1 - h_i}$. Matches Cook (1977).
- **Verification Status**: **VERIFIED CORRECT**.

### C.5 Exact-Moment Projection Solver (`projectToExactMoments`)
- **Implementation**: [`js/math-engine.js:499-592`](file:///c:/Users/RobTop/Downloads/quartetlab/js/math-engine.js#L499-L592)
- **Algorithm**:
  1. Center $\mathbf{x}$ and $\mathbf{y}$.
  2. Degenerate $X$ fallback: If $s_u < 10^{-12}$, initializes linear ramp $u_i = i - (n-1)/2$.
  3. Gram-Schmidt orthogonalization of $\mathbf{v}$ against $\mathbf{z}_x$.
  4. Re-centering of orthogonal vector $\mathbf{w}$.
  5. Collinear fallback: If $s_w < 10^{-12}$, injects deterministic harmonic perturbation vector.
  6. Normalizes to unit variance ($s_w = 1$) using $n - 1$ divisor.
  7. Affine synthesis: $\mathbf{z}_y = r^* \mathbf{z}_x + \sqrt{1 - (r^*)^2} \mathbf{z}_\perp$.
  8. Rescales to target moments: $\mu_x^* + s_x^* \mathbf{z}_x$ and $\mu_y^* + s_y^* \mathbf{z}_y$.
- **Automated Tests**: Tested in [`tests/math-engine.test.js:50-85`](file:///c:/Users/RobTop/Downloads/quartetlab/tests/math-engine.test.js#L50-L85). Proves convergence to exact target moments to within $1.0 \times 10^{-10}$ precision across degenerate, collinear, and standard inputs.
- **Verification Status**: **VERIFIED CORRECT**.

---

## Section D: Numerical Stability and Edge-Case Analysis

1. **Extreme Leverage Edge Case ($h_i = 1.0$)**:
   - In Anscombe's Quartet IV, observation 8 has coordinates $(19.0, 12.50)$ while all other 10 observations have $x = 8.0$.
   - Algebraic leverage evaluates to $h_8 = \frac{1}{11} + \frac{(19 - 9)^2}{110} = \frac{1}{11} + \frac{100}{110} = \frac{110}{110} = 1.0000$.
   - At $h_i = 1.0$, the theoretical term $1 - h_i = 0$, making division $e_i / (s_e \sqrt{1 - h_i})$ mathematically indeterminate ($0/0$).
   - *Code Audit*: [`js/math-engine.js:383`](file:///c:/Users/RobTop/Downloads/quartetlab/js/math-engine.js#L383) enforces `const oneMinusH = Math.max(EPSILON, 1 - h);`. This prevents `NaN` or unhandled zero-division, safely evaluating Cook's distance and studentized residuals. Verified by test in [`tests/math-engine.test.js:43-48`](file:///c:/Users/RobTop/Downloads/quartetlab/tests/math-engine.test.js#L43-L48).
2. **Quadratic Model Matrix Singularity**:
   - In [`js/math-engine.js:276`](file:///c:/Users/RobTop/Downloads/quartetlab/js/math-engine.js#L276), `fitQuadraticModel` verifies that Gaussian elimination pivot elements exceed $1.0 \times 10^{-11}$. If the normal matrix is nearly singular (e.g., collinear inputs), the function safely returns `null` rather than generating corrupted polynomial coefficients.

---

## Section E: Visualization Correspondence Audit

1. **Confidence Band Rendering**:
   - File: [`js/renderer.js:180-198`](file:///c:/Users/RobTop/Downloads/quartetlab/js/renderer.js#L180-L198)
   - Code calculates:
     `seMean = diag.sResid * Math.sqrt(1 / diag.n + Math.pow(xVal - diag.meanX, 2) / diag.ssx)`
     `upper = yHat + diag.tCrit95 * seMean`
     `lower = yHat - diag.tCrit95 * seMean`
   - *Finding*: Renders the true hyperbolic 95% confidence band for the mean response.
2. **Diagnostic Halos**:
   - High-influence halo ($D_i > 4/n$) renders a dashed vermilion ring with radius $11\text{px}$.
   - High-leverage ring ($h_i > 4/n$) renders a solid amber ring with radius $9.5\text{px}$.
   - Cross-canvas hover states synchronize instantly across scatter, residual, and Q-Q canvases.
3. **Residual Plot Alignment**:
   - Horizontal axis correctly plots fitted values $\hat{y}_i$ with an explicit zero reference line.

---

## Section F: Data Export and Serialization Audit

1. **CSV Export ([`js/exporters.js:37-71`](file:///c:/Users/RobTop/Downloads/quartetlab/js/exporters.js#L37-L71))**:
   - Correctly includes 10 columns: `obs_id`, `label`, `X`, `Y`, `fitted_y`, `residual`, `leverage_h`, `studentized_residual`, `cooks_distance`, and `diagnostic_flag`.
   - Tested in [`tests/exporters-storage.test.js:16-24`](file:///c:/Users/RobTop/Downloads/quartetlab/tests/exporters-storage.test.js#L16-L24).
2. **R Script Export ([`js/exporters.js:81-120`](file:///c:/Users/RobTop/Downloads/quartetlab/js/exporters.js#L81-L120))**:
   - Generates executable R code using base `lm()`, `hatvalues()`, `rstandard()`, and `cooks.distance()`.
3. **Python Script Export ([`js/exporters.js:129-154`](file:///c:/Users/RobTop/Downloads/quartetlab/js/exporters.js#L129-L154))**:
   - Generates executable Python using `scipy.stats.linregress` and `pandas`.
4. **TI-84 Command Export ([`js/exporters.js:163-173`](file:///c:/Users/RobTop/Downloads/quartetlab/js/exporters.js#L163-L173))**:
   - Generates calculator list assignment `{...}->L1`, `{...}->L2`, and `LinReg(a+bx) L1,L2,Y1`.
5. **LaTeX Table Export ([`js/exporters.js:181-200`](file:///c:/Users/RobTop/Downloads/quartetlab/js/exporters.js#L181-L200))**:
   - Generates publication-ready `booktabs` table matching standard Minitab / AP exam format.
6. **URL Hash Serialization ([`js/exporters.js:280-346`](file:///c:/Users/RobTop/Downloads/quartetlab/js/exporters.js#L280-L346))**:
   - Lossless Base64 JSON encoding tested in [`tests/exporters-storage.test.js:68-95`](file:///c:/Users/RobTop/Downloads/quartetlab/tests/exporters-storage.test.js#L68-L95).

---

## Section G: Automated Test Coverage Analysis

### G.1 Existing Automated Tests
The repository contains 12 unit tests in [`tests/math-engine.test.js`](file:///c:/Users/RobTop/Downloads/quartetlab/tests/math-engine.test.js) and 3 unit tests in [`tests/exporters-storage.test.js`](file:///c:/Users/RobTop/Downloads/quartetlab/tests/exporters-storage.test.js):
1. Anscombe I–IV summary moments match reference values to 2+ decimal places.
2. Anscombe II quadratic fit achieves $R^2 > 0.999$.
3. Anscombe III flags Observation 3 as Influential ($D_3 > 1.0$).
4. Anscombe IV flags Observation 8 with extreme leverage $h_8 = 1.0$.
5. `projectToExactMoments` converges to exact target moments to $10^{-10}$ precision.
6. `projectToExactMoments` handles degenerate collinear and constant $X$ inputs.
7. `synthesizeGeometricDataset` produces exact moments across all 6 patterns.
8. Student-$t$ $p$-values and critical values match statistical tables.
9. `computeDatasetDiagnostics` rejects datasets with $n < 3$.
10. CSV, R, Python, TI-84, and LaTeX exporters produce valid, non-empty outputs.
11. `parseDelimitedText` parses CSV with headers, 3-column labels, and whitespace.
12. URL hash state round-trips dataset state losslessly.

### G.2 Identified Test Coverage Gaps
1. **Property-Based Invariant Tests**: No automated tests currently verify that $\sum_{i=1}^n e_i \equiv 0$ across randomly generated point clouds.
2. **Confidence Band Bounds Check**: No unit test currently asserts that the confidence ribbon bounds returned by the renderer match the analytical formula at $x = \bar{x}$.
3. **CSV Formula Injection Sanitization**: No unit test checks whether string inputs beginning with `=`, `+`, `-`, or `@` are escaped upon export.

---

## Section H: Detailed Discrepancy Catalog and Classification

Each finding is classified according to the prescribed auditing typology:

### Finding 1: Adjusted $R^2$ Potential Negative Values
- **Location**: [`js/math-engine.js:339`](file:///c:/Users/RobTop/Downloads/quartetlab/js/math-engine.js#L339)
- **Code**: `const r2Adj = n > 2 ? 1 - ((1 - r2) * (n - 1)) / (n - 2) : r2;`
- **Classification**: **Documented Design Decision**.
- **Analysis**: In very small samples ($n = 3, 4$) with low correlation ($r^2 < 0.2$), the algebraic formula $1 - (1 - R^2)\frac{n-1}{n-2}$ yields negative values. For example, if $n = 3$ and $r^2 = 0.10$, $R^2_{\text{adj}} = 1 - (0.90)(2)/1 = 1 - 1.80 = -0.80$. This is mathematically correct according to the unbiased estimator definition, but can confuse introductory students if unexplained in the UI.

### Finding 2: Cook's Distance Minimum Threshold Floor
- **Location**: [`js/math-engine.js:393`](file:///c:/Users/RobTop/Downloads/quartetlab/js/math-engine.js#L393)
- **Code**: `const isInfluential = cooksD > Math.max(cooksThreshold, 0.25);` where `cooksThreshold = 4 / n`.
- **Classification**: **Documented Design Decision**.
- **Analysis**: Standard textbook literature quotes the cutoff as $4/n$. For small classroom datasets ($n = 11$), $4/11 \approx 0.3636$. However, for $n = 5$, $4/5 = 0.80$. The addition of `Math.max(..., 0.25)` ensures that when $n$ is very large (e.g., $n = 100$, where $4/n = 0.04$), points are not flagged as influential unless $D_i$ also exceeds $0.25$. This avoids visual noise in larger point clouds.

### Finding 3: Python Script Exporter Diagnostic Completeness
- **Location**: [`js/exporters.js:129-154`](file:///c:/Users/RobTop/Downloads/quartetlab/js/exporters.js#L129-L154)
- **Classification**: **Recommended Enhancement**.
- **Analysis**: The exported R script generates full diagnostic columns (hat values, studentized residuals, Cook's distance) using `hatvalues()`, `rstandard()`, and `cooks.distance()`. The Python script exporter uses `scipy.stats.linregress`, which only outputs slope and intercept. It should be enhanced in future versions to optionally export `statsmodels.api.OLS` code to provide identical diagnostic tables.

### Finding 4: Target Pearson Correlation Clamping
- **Location**: [`js/math-engine.js:507`](file:///c:/Users/RobTop/Downloads/quartetlab/js/math-engine.js#L507)
- **Code**: `const targetR = Math.max(-0.9999, Math.min(0.9999, ...));`
- **Classification**: **Documented Design Decision**.
- **Analysis**: Clamping target correlation to $[-0.9999, 0.9999]$ prevents the term $\sqrt{1 - (r^*)^2}$ from evaluating to exactly $0.0$, which would destroy the orthogonal residual subspace and prevent the user from continuing to drag points in interactive mode.

---

## Section I: Standards Migration and Reusability Mapping

### I.1 Practices Reusable as Ecosystem-Wide Standards
1. **Gram-Schmidt Exact-Moment Projection**: The closed-form $O(n)$ projection algorithm should be extracted into a shared `@datasense/math-engine` module for use in ResampleLab and VisualGrammar.
2. **Zero-Dependency Continued-Fraction Distributions**: The Lanczos log-gamma and Lentz regularized incomplete beta modules should serve as the canonical distribution engine across all applications.
3. **Subpath Safety Verification (`verify-build.py`)**: The static verifier script should be standard across all DataSense repositories.
4. **Design System & Tabular Numeral Enforcement**: The tokens and `tabular-nums` formatting rules should be mandatory across all tools.

### I.2 Practices Specific to QuartetLab
1. **Bivariate Coordinate Focus**: QuartetLab's strict focus on paired $(x_i, y_i)$ scatter plots is specific to its regression mission and should not constrain multivariate or time-series tools.
2. **AP Statistics Minitab Table Styling**: The specific regression table formatting is tailored to high school and introductory undergraduate assessment.

---

## Section J: Prioritized Recommendations Roadmap

1. **Priority 1 (High): CSV Formula Injection Sanitization**
   - *Recommendation*: Add sanitization to [`js/exporters.js:escapeCsvCell`](file:///c:/Users/RobTop/Downloads/quartetlab/js/exporters.js#L22) to prefix dangerous initial characters (`=`, `+`, `-`, `@`) with a single quote.
2. **Priority 2 (Medium): Python Exporter Parity with Statsmodels**
   - *Recommendation*: Update `exportToPythonScript` to include an option for `statsmodels.formula.api.ols`, printing hat values and Cook's distance to achieve exact parity with the R exporter.
3. **Priority 3 (Medium): Property-Based Test Expansion**
   - *Recommendation*: Add invariant property tests in `tests/math-engine.test.js` validating $\sum e_i = 0$ and $r \in [-1, 1]$ over 1,000 randomized synthetic datasets.
4. **Priority 4 (Low): Configurable Alpha Level for Critical Values**
   - *Recommendation*: Generalize `studentTCritical95` to support arbitrary user-selected confidence levels ($90\%, 95\%, 99\%$).
