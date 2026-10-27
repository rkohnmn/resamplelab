# ResampleLab

[![Deploy ResampleLab to GitHub Pages](https://github.com/rkohnmn/resamplelab/actions/workflows/deploy.yml/badge.svg)](https://github.com/rkohnmn/resamplelab/actions/workflows/deploy.yml)
[![Ecosystem](https://img.shields.io/badge/Ecosystem-DataSense%20Studio-0d6efd)](https://github.com/rkohnmn/resamplelab)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Tests](https://img.shields.io/badge/Tests-11%20suites%20passing-success)](https://github.com/rkohnmn/resamplelab)
[![Dependencies](https://img.shields.io/badge/Dependencies-0%20(Pure%20ESM)-blue)](https://github.com/rkohnmn/resamplelab)

> **Explore randomness. Measure uncertainty. Understand evidence.**

**ResampleLab** is a zero-dependency, 100% client-side interactive statistical laboratory for probability distributions, sampling variability, limit theorems, nonparametric bootstrap estimation, permutation/randomization hypothesis testing, and Monte Carlo inferential operating characteristics. 

It is a member of the **DataSense Studio** statistical computing ecosystem alongside [QuartetLab](https://github.com/rkohnmn/quartetlab), VisualGrammar, and ForecastLab.

🌐 **Live Deployment**: [https://rkohnmn.github.io/resamplelab/](https://rkohnmn.github.io/resamplelab/)

---

## 1. Principal Features & Interactive Studios

ResampleLab is organized into 10 synchronized modules:

1. **Sampling Laboratory (`#view-sampling`)**:
   - Synchronized three-stage hierarchy: **Population ($F$)** $\rightarrow$ **Single Sample ($S$, size $n$)** $\rightarrow$ **Sampling Distribution of Statistic ($\hat{\theta}$ across $B$ repeated samples)**.
   - Sampling mechanisms: Independent sampling with replacement (i.i.d.), simple random sampling without replacement (SRSWOR) with Finite Population Correction factor $\text{FPC} = \sqrt{(N-n)/(N-1)}$, proportional stratified sampling, and cluster sampling.
   - Interactive **Law of Large Numbers (LLN)** running-average trajectory plot and **Central Limit Theorem (CLT)** normal density overlay with Blom Normal Q-Q diagnostic plots.

2. **Probability Distribution Explorer (`#view-distributions`)**:
   - Complete implementation of **19 probability distribution families**:
     - *9 Discrete*: Bernoulli, Binomial, Geometric, Negative Binomial, Hypergeometric, Poisson, Discrete Uniform, Custom Finite Discrete, Empirical $\hat{F}_n$.
     - *10 Continuous*: Continuous Uniform, Normal, Student's $t$, Exponential, Gamma, Beta, Chi-Square, Snedecor's $F$, Lognormal, Bimodal Gaussian Mixture.
   - Exact PDF/PMF, CDF, Quantile ($F^{-1}(q)$ via Acklam & Lentz algorithms), theoretical moments ($E[X], \operatorname{Var}(X), \sigma, \gamma_1$), shaded interval probabilities $P(a \le X \le b)$, and empirical sample overlays.

3. **Bootstrap Studio (`#view-bootstrap`)**:
   - Nonparametric case resampling WITH replacement preserving observational units: univariate samples, separate groupwise two-sample allocations, intact paired differences, and bivariate pairs.
   - Synchronized computation and visual comparison of **all 5 bootstrap confidence interval procedures**:
     1. **Percentile Interval**
     2. **Basic (Reverse-Percentile / Empirical) Interval**
     3. **Normal SE Interval**
     4. **Studentized (Bootstrap-$t$) Interval**
     5. **BCa (Bias-Corrected and Accelerated) Interval** with Jackknife acceleration $\hat{a}$ and bias-correction $z_0$.
   - Automated diagnostic alerts for dependent time-series data (`DEPENDENT_DATA_IID_BOOTSTRAP`), small sample sizes ($n < 15$), severe skewness, and zero-variance bootstrap resamples.

4. **Randomization & Permutation Studio (`#view-permutation`)**:
   - Null hypothesis testing under Fisher's sharp null: two-group label permutation, paired sign-flip randomization, bivariate $Y$-permutation for correlation/OLS slope, one-way ANOVA multi-group permutation, and marginal-preserving contingency table permutation.
   - Supports **Exact Combinatorial Enumeration** when reference set size $M \le 3,000$ (e.g., $\binom{10}{5} = 252$ or $2^{10} = 1,024$) alongside Monte Carlo sampling with explicit $(b+1)/(B+1)$ and $b/B$ $p$-value conventions and Monte Carlo standard error $SE_{\text{MC}}(\hat{p})$.

5. **Inference Workbench (`#view-workbench`)**:
   - Real-data analysis workspace supporting RFC 4180 CSV/TSV upload, pasted tables, DataSense JSON, and 11 built-in domain datasets.
   - Automated sanitization against spreadsheet formula injection (`=`, `+`, `-`, `@`, `\t`, `\r`).
   - Direct side-by-side comparison of resampling procedures with validated **Classical Analytical Counterparts** (One-sample $t$, Welch two-sample $t$, Paired $t$, Wilson score & Wald proportion intervals, Fisher's $z$-transform correlation CI, OLS regression $t$-test, One-Way ANOVA $F$-test, and Pearson $\chi^2$ test).
   - One-click export of Summary CSV, Replicate CSV, DataSense JSON, SVG charts, formatted Markdown reports, and executable **R** and **Python** scripts.

6. **Experiment Simulator (`#view-experiments`)**:
   - **Confidence Interval Coverage**: 100-study caterpillar plot showing intervals capturing vs missing true parameter $\theta$, empirical coverage vs nominal $1-\alpha$, and average interval width.
   - **Type I / Type II Errors & Power Curve**: Empirical power curves across sample sizes with Monte Carlo standard error bars.
   - **Optional Stopping (Repeated Peeking)**: Visualizes alpha-inflation under sequential uncorrected testing vs fixed-horizon designs.

7. **Simulation Unity — "One Dataset, Different Questions" (`#view-unity`)**:
   - Aligns the true Sampling Distribution, Bootstrap Distribution, and Permutation Null Distribution on identical horizontal scales.
   - Side-by-side contrast cards clarifying 14 foundational statistical distinctions (e.g., Standard Deviation vs Standard Error, Sampling with vs without replacement, Fisher vs Neyman-Pearson inference).

8. **Inference Atlas (`#view-atlas`)**:
   - Searchable reference library across 7 statistical knowledge domains with formal definitions, formulas, underlying assumptions, and algorithmic pseudo-code.

9. **Guided Investigations (`#view-investigations`)**:
   - 12 interactive, seed-reproducible statistical challenges with one-click studio launch and dynamic verification checkpoints.

10. **Methods & Overview (`#view-methods`)**:
    - Complete methodological documentation, auditable feature coverage matrix, PRNG stream architecture specifications, and local browser storage controls.

---

## 2. Explanation Depth Modes

ResampleLab features three explanation depth modes selectable from the header:
- **Simple**: Intuitive, metaphor-driven explanations avoiding notation overload; ideal for introductory learners and conceptual grasp.
- **Standard**: Undergraduate-level statistical explanations balancing formulas with operational context.
- **Technical**: Rigorous measure-theoretic and mathematical definitions, asymptotic properties, second-order accuracy theorems, and asymptotic expansions.

---

## 3. Architecture & Repository Layout

```
resamplelab/
├── index.html                  # Semantic HTML5 shell, 10 ARIA destinations, mode switchers
├── package.json                # ESM manifest & native Node.js test scripts
├── .gitignore                  # Git ignore rules for node, python, os, and editor files
├── DESIGN.md                   # Canonical visual design tokens & component specifications
├── STATISTICAL_STANDARDS.md    # Ecosystem mathematical & statistical ground truths
├── VISUALIZATION_STANDARDS.md  # Graphical integrity & perceptual encoding rules
├── DATA_CONVENTIONS.md         # Tidy data, CSV RFC 4180, & JSON interchange schemas
├── APPLICATION_GUIDELINES.md   # Static hosting & ecosystem architecture contract
├── ARCHITECTURE.md             # Detailed software architecture & dataflow specifications
├── METHODS.md                  # Mathematical definitions & algorithmic conventions
├── DISTRIBUTIONS.md            # 19 probability distributions & numerical routines
├── RESAMPLING_METHODS.md       # Bootstrap & permutation algorithms & CIs
├── COVERAGE_MATRIX.md          # Auditable feature & method coverage matrix
├── TESTING.md                  # Testing methodology & verification plan
├── DEVELOPMENT.md              # Local developer environment setup
├── .github/
│   └── workflows/
│       └── deploy.yml          # GitHub Actions CI/CD test and deployment workflow
├── css/
│   ├── tokens.css              # Light archival (#F6F4EE) & dark instrument (#0D1014) tokens
│   ├── base.css                # CSS reset, typography, tabular-nums, responsive grid
│   ├── components.css          # UI cards, sliders, buttons, callouts, data tables, badges
│   └── print.css               # Clean print & PDF export stylesheet
├── docs/
│   ├── ARCHITECTURE.md         # Architecture teardown & module responsibilities
│   ├── PRIVACY.md              # Local-first privacy & zero-telemetry policy
│   ├── RESEARCH.md             # Educational research background & pedagogical rationale
│   └── LAUNCH_PLAN.md          # Deployment checklist & verification gates
├── js/
│   ├── prng.js                 # Seedable Mulberry32 PRNG & SplitMix32 stream splitter
│   ├── distributions.js        # 19 probability distributions + special functions (Lanczos, Lentz, Acklam)
│   ├── stats-core.js           # Descriptive stats, Type 7 quantiles, sampling operations, registry
│   ├── classical-engine.js     # Analytical t, Welch t, Wilson CI, Fisher z, OLS, ANOVA, Chi-Square
│   ├── inference-engine.js     # Bootstrap (5 CIs incl. BCa), Permutation (Exact/MC), Coverage/Power
│   ├── presets.js              # 11 curated domain datasets across all study designs
│   ├── atlas-data.js           # Searchable 7-domain Inference Atlas knowledge library
│   ├── investigations.js       # 12 reproducible Guided Investigations with checkpoints
│   ├── renderer.js             # High-DPI Canvas 2D & SVG statistical graphics renderer
│   ├── exporters.js            # RFC 4180 CSV parser/exporter, injection guards, R/Python generators
│   ├── storage.js              # Safe localStorage wrapper & URL hash state serializer
│   ├── worker.js               # Dedicated Web Worker for computationally intensive simulations
│   └── app.js                  # Central UI controller, state coordinator, and routing
└── tests/
    ├── math-engine.test.js     # 11-suite mathematical and statistical unit tests
    └── verify-build.py         # Static subpath, zero-CDN, and code quality verifier
```

---

## 4. Local Execution & Automated Verification

### Prerequisites
- Modern web browser (Chrome, Firefox, Safari, Edge).
- Optional for automated testing: **Node.js** (`>= 18`) and **Python** (`>= 3.9`). Zero third-party npm packages are required.

### Running Locally
Serve the repository root with any local static HTTP server:
```bash
# Using Python
python3 -m http.server 8080

# Using Node.js
npx serve -l 8080 .

# Open http://localhost:8080/index.html in your browser
```

### Running Automated Test Suite
ResampleLab includes comprehensive unit tests verifying numerical accuracy against NIST standards and statistical reference tables:
```bash
# Run the 11 mathematical & statistical test suites
npm test
# Equivalent to: node --test tests/*.test.js

# Run the static build, zero-CDN, and subpath compliance verifier
npm run verify
# Equivalent to: python3 tests/verify-build.py
```

### Automated GitHub Pages Deployment
Pushing to the `main` branch triggers `.github/workflows/deploy.yml`:
1. Executes all 11 suites in `tests/math-engine.test.js`.
2. Runs `python3 tests/verify-build.py` to ensure zero CDN dependencies and subpath-safe asset URLs.
3. Packages and publishes the site to GitHub Pages automatically.

---

## 5. Security & Privacy Guarantees

- **100% Client-Side Local Execution**: All computations, data processing, randomizations, and rendering execute inside your browser tab. No user data is ever transmitted to a server.
- **Zero External CDNs**: Zero external runtime network requests (`unpkg`, `cdnjs`, `jsdelivr`, `googleapis`, etc.). ResampleLab works entirely offline.
- **CSV Formula Injection Guard**: All CSV exports sanitize formulas beginning with `=`, `+`, `-`, `@`, `\t`, or `\r` to protect downstream spreadsheet applications.
- **Private URL State Sharing**: URL share states use the `#` fragment identifier, which is never sent across the network in HTTP requests.

---

## 6. License

MIT License. Developed as part of the **DataSense Studio** computational statistics ecosystem.
