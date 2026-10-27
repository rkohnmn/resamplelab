# DataSense Application Guidelines and Ecosystem Architecture

**Document Version:** 1.0.0  
**Status:** Canonical Standard  
**Applies to:** QuartetLab, VisualGrammar, ResampleLab, ForecastLab, and Future Applications  
**Governing Authority:** DataSense Engineering & Architecture Council  

---

## 1. Executive Summary and Architectural Principles

The DataSense Studio ecosystem consists of a family of independent, interconnected, static web applications dedicated to statistical computing, exploratory visualization, simulation, and data education.

To ensure longevity, security, universal classroom accessibility, and zero ongoing server hosting costs, all DataSense applications adhere to three core architectural principles:
1. **100% Client-Side Static Architecture**: Applications MUST run entirely in modern web browsers without server-side processing, databases, or containerized backend runtimes.
2. **Zero Runtime Dependencies**: Core mathematical and rendering modules MUST be written in pure, standard ECMAScript (ES2022+) without third-party runtime npm packages, external charting libraries, or CDN script tags.
3. **Federated Modular Repositories**: Each application maintains its own dedicated GitHub repository, issue tracker, test suite, and GitHub Pages deployment lifecycle, while adhering to the shared standards defined in this library.

---

## Section A: Ecosystem Architecture and Federated Boundaries

```
                    +--------------------------------+
                    |       DataSense Studio         |
                    |     (Hub & Navigation Hub)     |
                    +---------------+----------------+
                                    |
          +-------------------------+-------------------------+
          |                         |                         |
          v                         v                         v
+-------------------+     +-------------------+     +-------------------+
|    QuartetLab     |     |   VisualGrammar   |     |    ResampleLab    |
| (Bivariate OLS,   |     | (Visual Grammar,  |     | (Bootstrapping,   |
|  Diagnostics,     |     |  Chart Selection, |     |  Permutations,    |
|  Moment Solver)   |     |  Encoding Audit)  |     |  Simulations)     |
+-------------------+     +-------------------+     +-------------------+
          |                         |                         |
          +-------------------------+-------------------------+
                                    |
                                    v
                          +-------------------+
                          |    ForecastLab    |
                          | (Time Series,     |
                          |  Decomposition,   |
                          |  Forecast Fans)   |
                          +-------------------+
```

### A.1 Why Federated Repositories?
Rather than combining all tools into a monolithic web bundle, DataSense intentionally separates applications into discrete repositories for three decisive reasons:
1. **Pedagogical Focus**: An instructor teaching simple linear regression and Cook's distance in AP Statistics requires an immediate, distraction-free workbench (QuartetLab) without navigation clutter from time-series ARIMA decomposition.
2. **Decoupled Release Cycles**: Improvements to resampling algorithms in ResampleLab do not risk regressions or invalidate cached assets in QuartetLab.
3. **Subpath Static Deployability**: Each application deploys independently to its own clean GitHub Pages URL (`https://<organization>.github.io/<app-name>/`).

---

## Section B: GitHub Pages and Static Hosting Requirements

All DataSense applications deploy via GitHub Actions to GitHub Pages. The build and asset configuration MUST satisfy the following conditions:

### B.1 Relative Asset Paths for Subpath Compatibility
GitHub Pages frequently hosts project repositories under subpaths (e.g., `https://username.github.io/quartetlab/`).
- **MANDATORY**: All asset references in `index.html` (scripts, stylesheets, favicons, open-graph images) MUST use explicit relative paths:
  ```html
  <!-- CORRECT -->
  <link rel="stylesheet" href="./css/tokens.css">
  <script type="module" src="./js/app.js"></script>

  <!-- STRICTLY PROHIBITED (Breaks on subpaths) -->
  <link rel="stylesheet" href="/css/tokens.css">
  ```
- Applications MUST include an automated verifier (`verify-build.py`) in CI that scans HTML files and fails if any root-absolute path (`href="/..."`) is detected.

### B.2 Zero External Runtime Dependencies
- `index.html` MUST NOT load scripts, fonts, or stylesheets from external Content Delivery Networks (CDNs) such as unpkg, cdnjs, or Google Fonts at runtime.
- **Rationale**: External runtime network calls leak student telemetry, violate school network firewall filters, fail when offline, and introduce supply-chain security risks.
- All web fonts (Inter, JetBrains Mono, Instrument Serif) and SVG assets MUST be vendor-bundled locally in the repository.

### B.3 Browser State Persistence
Because GitHub Pages provides no backend database:
1. **Ephemeral State**: Active session state is retained in browser memory and synchronized to `localStorage` safely wrapped in `try/catch` blocks.
2. **Shareable State**: Applications MUST serialize shareable workspace configurations into the browser URL hash fragment:
   `https://.../index.html#state=<base64-payload>`
   Hash fragments are never transmitted to server logs, preserving user privacy.

---

## Section C: Shared Design System Implementation

All applications MUST implement the visual language defined in [DESIGN.md](file:///c:/Users/RobTop/Downloads/quartetlab/datasense-standards/DESIGN.md).

### C.1 Design Tokens and Theming
- Applications MUST define design tokens in `css/tokens.css` using standard CSS custom properties.
- **Color Roles**:
  - Background: Warm archival grid paper (`#F6F4EE` light / `#0D1014` dark).
  - Primary Action / Fit Line: Phosphor emerald (`#0F6E56` light / `#34D399` dark).
  - Diagnostic / Residual / Error: Vermilion (`#D9381E` light / `#F87171` dark).
  - Warning / Leverage: Amber (`#B45309` light / `#F59E0B` dark).
- **Typography Tokens**:
  - Headlines: `'Instrument Serif', 'Georgia', serif`
  - Body: `'Inter', -apple-system, sans-serif`
  - Statistics & Data Tables: `'JetBrains Mono', 'Fira Code', monospace`
- **Tabular Numerals**: Every live statistical value, coordinate readout, and table cell MUST apply `font-variant-numeric: tabular-nums` to eliminate jitter during continuous mouse dragging.

---

## Section D: Recommended Application Architecture

DataSense applications follow a modular, zero-framework architecture separating DOM coordination from mathematical computation.

```
project-root/
├── index.html                 # Semantic HTML5 shell, ARIA regions, dialog modals
├── DESIGN.md                  # Canonical design specification copy
├── css/
│   ├── tokens.css             # Light/dark CSS custom properties
│   ├── base.css               # Reset, typography, responsive layout
│   ├── components.css         # Bento grid panels, tables, controls
│   └── print.css              # Print stylesheet for classroom worksheets
├── js/
│   ├── app.js                 # Event coordinator, state, undo/redo history
│   ├── math-engine.js         # Pure mathematical & statistical algorithms
│   ├── renderer.js            # High-DPI Canvas 2D or SVG rendering
│   ├── presets.js             # Domain and educational preset datasets
│   ├── exporters.js           # Multi-format serializers (CSV, R, Python, LaTeX)
│   └── storage.js             # LocalStorage wrapper & privacy audit tools
└── tests/
    ├── math-engine.test.js    # Node.js built-in runner unit tests
    └── verify-build.py        # Static deployment verifier
```

### D.1 Layer Responsibilities
1. **Mathematical Engine (`math-engine.js`)**: Pure mathematical functions. Has no access to the DOM, window, or document. Highly testable under `node --test`.
2. **Plotting Engine (`renderer.js`)**: Stateless rendering procedures. Accepts canvas context, data models, and UI state objects; renders at 60fps; returns coordinate projection closures (`toScreen`, `toData`).
3. **Application Controller (`app.js`)**: Binds DOM events, coordinates undo/redo stacks, updates reactive UI tables, and manages dragging lifecycles.
4. **Storage & Serialization (`storage.js`, `exporters.js`)**: Handles URL hash state, RFC 4180 CSV generation, and script export formatting.

---

## Section E: Statistical Engine Quality Standards

1. **Determinism**: Statistical calculations on identical input data MUST produce identical numerical results across all browser engines (Chromium, WebKit, Gecko).
2. **Input Validation**: Engines MUST validate inputs prior to computing regressions or matrix operations. Datasets with insufficient observations (e.g., $n < 3$ in regression) MUST return structured error payloads:
   ```javascript
   if (n < 3) {
     return { valid: false, reason: "At least 3 observations are required." };
   }
   ```
3. **Singular Matrix Safeguards**: When predictors exhibit zero variance or collinearity, solvers MUST NOT throw uncaught exceptions. They MUST fall back gracefully and alert the user.

---

## Section F: Visualization Integration Standards

1. **Compliance**: All graphical charts MUST conform to [VISUALIZATION_STANDARDS.md](file:///c:/Users/RobTop/Downloads/quartetlab/datasense-standards/VISUALIZATION_STANDARDS.md).
2. **High-DPI Canvas Scaling**: Canvas elements MUST be scaled to the physical device pixel ratio (`window.devicePixelRatio`) to prevent blurred lines and text on Retina screens.
3. **Accessibility**: All interactive canvases MUST be accompanied by accessible text summaries (`aria-label` or synchronized data tables) so screen-reader users can access summary statistics.

---

## Section G: User Experience and Educational Workflow

1. **Zero-Friction Landing**: The user MUST land immediately on the active, interactive workbench. Applications MUST NOT hide the tool behind marketing splash pages or login modals.
2. **Tactile Direct Manipulation**: Users should be able to click, drag, add, and erase data points directly on the plotting surface with immediate 60fps visual updates.
3. **Undo/Redo History**: Every mutating action (dragging a point, applying an exact-moment projection, adding an outlier) MUST be recorded on an in-memory undo stack (depth $\ge 30$). Keyboard shortcuts (`Ctrl+Z`, `Ctrl+Y` / `Cmd+Shift+Z`) MUST be supported.

---

## Section H: Export and Classroom Workflow

1. **Multi-Format Export**: Applications SHOULD provide one-click exports for:
   - Clean RFC 4180 CSV
   - Reproducible R script (`lm()`, `ggplot2`)
   - Reproducible Python script (`scipy.stats`, `pandas`)
   - Graphing calculator list syntax (e.g., TI-84 Plus `LinReg(a+bx)`)
   - Publication-quality LaTeX table (`booktabs`)
2. **Printable Classroom Worksheets**: Applications SHOULD support a clean print view generating student worksheets and instructor answer keys with rubric scoring criteria.

---

## Section I: Required Documentation Artifacts

Every application repository in DataSense MUST include:
1. `README.md`: Overview, feature list, mathematical rationale, live demo link, and local development instructions.
2. `DESIGN.md`: Verbatim copy of the canonical design specification.
3. `docs/ARCHITECTURE.md`: Module decomposition and algorithmic specifications.
4. `docs/RESEARCH.md`: Educational and market teardown justifying the application's unique value proposition.
5. `docs/PRIVACY.md`: Explicit local-first, zero-tracking privacy guarantee.
6. `docs/LAUNCH_PLAN.md`: Static deployment instructions and community outreach checklist.

---

## Section J: Testing and Quality Assurance

Continuous Integration (CI) on GitHub Actions MUST execute:
1. **Automated Unit Tests**: Executed via Node.js native test runner:
   `node --test tests/*.test.js`
2. **Build Verification**: Python static audit:
   `python tests/verify-build.py`
   Verifying zero broken relative assets, zero CDN dependencies, and zero TODO markers.
3. **Prose Quality Audit**: Deterministic voice linter:
   `python scripts/prose_linter.py <doc>`
   Enforcing technical clarity and penalizing artificial buzzwords.

---

## Section K: Application-Specific Contracts

### K.1 QuartetLab Contract
- **Core Mission**: Interactive bivariate dataset synthesis, exact sample moment projection via Gram-Schmidt orthogonalization, ordinary least squares regression, and point-level influence diagnostics ($h_i, r_i, D_i$).
- **Out-of-Scope**: Generalized linear models, multivariate time series, deep neural networks.

### K.2 VisualGrammar Contract
- **Core Mission**: Data-type classification, visualization integrity auditing, automated chart selection matrices, and multi-channel graphical encoding education.
- **Out-of-Scope**: Statistical hypothesis testing, time-series forecasting.

### K.3 ResampleLab Contract
- **Core Mission**: Nonparametric bootstrap confidence intervals, permutation tests, randomization inference, and empirical sampling distribution simulations.
- **Out-of-Scope**: Closed-form Bayesian posterior sampling, symbolic mathematics.

### K.4 ForecastLab Contract
- **Core Mission**: Classical time-series decomposition (trend, seasonality, noise), autocorrelation analysis, exponential smoothing, ARIMA modeling, and forecast fan plots with prediction intervals.
- **Out-of-Scope**: Cross-sectional spatial clustering, real-time streaming trade execution.

---

## Section L: Release Compliance Checklist

Before tagging a production release of any DataSense application, the development team MUST verify each item:

- [ ] **Architecture**: Zero server backend; deploys statically to GitHub Pages.
- [ ] **Subpaths**: All links in HTML use explicit relative paths (`./css/...`, `./js/...`).
- [ ] **Dependencies**: Zero external runtime npm packages; zero external CDN scripts.
- [ ] **Design Tokens**: All colors, fonts, and borders match `DESIGN.md`.
- [ ] **Tabular Numerals**: `tabular-nums` applied to all live statistics and table cells.
- [ ] **Math Engine**: OLS, standard deviations, and diagnostics match certified reference values.
- [ ] **Visual Integrity**: Bar charts include zero baseline; confidence ribbons are explicitly labeled.
- [ ] **Data Formats**: CSV export conforms to RFC 4180 with CSV-injection sanitization.
- [ ] **Performance**: 60fps maintained during active pointer dragging on scatter canvas.
- [ ] **Automated Tests**: `npm test` passes with 100% success.
- [ ] **Build Verifier**: `python tests/verify-build.py` exits with code 0.
- [ ] **Privacy**: Zero external analytics or data transmission; local-first storage.
