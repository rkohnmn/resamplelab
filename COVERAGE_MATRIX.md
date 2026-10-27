# Auditable Feature & Method Coverage Matrix (`COVERAGE_MATRIX.md`)

In accordance with Part 4.3 and Part 27, every statistical procedure and concept in ResampleLab is classified into one of four transparent categories:
- **Full Analytical Tool**: End-to-end computational implementation supporting user parameters/data, visualization, interpretation, and export.
- **Working Interactive Simulation**: Dedicated interactive laboratory simulation with user-controlled parameters.
- **Complete Educational Reference**: Substantive mathematical and conceptual article in the Inference Atlas (clearly distinguished from general-purpose computational tools).
- **Not Implemented**: Explicitly out-of-scope for client-side resampling (e.g., full MCMC Bayesian posterior sampling).

| Category / Method | Classification | Location | Notes |
|---|---|---|---|
| **Mulberry32 + SplitMix32 Deterministic PRNG** | Full Analytical Tool | `js/prng.js` | Seedable, resettable, independent stream derivation |
| **9 Discrete Probability Families** (Bernoulli, Binomial, Geometric, NegBin, Hypergeom, Poisson, DUnif, Custom, Empirical) | Full Analytical Tool | `js/distributions.js` | PMF, CDF, Quantile, Moments, Random Sampling |
| **10 Continuous Probability Families** (Unif, Normal, Student-$t$, Exp, Gamma, Beta, $\chi^2$, $F$, Lognormal, Bimodal Mixture) | Full Analytical Tool | `js/distributions.js` | PDF, CDF, Quantile, Moments, Random Sampling |
| **SRS With & Without Replacement + FPC** | Full Analytical Tool | `js/stats-core.js` | Exact partial Fisher-Yates & FPC factor |
| **Stratified, Cluster, & Weighted Sampling** | Working Interactive Simulation | `js/stats-core.js` | Proportional stratified & cluster sampling in Sampling Lab |
| **Law of Large Numbers & Central Limit Theorem** | Full Analytical Tool | `#view-sampling` | Multi-path LLN trajectories, CLT Normal overlay, Normal Q-Q plot |
| **Nonparametric Case, Groupwise, & Paired Bootstrap** | Full Analytical Tool | `js/inference-engine.js` | Preserves observational units across 1-sample, 2-group, paired, bivariate |
| **5 Bootstrap Confidence Intervals** (Percentile, Basic, Normal SE, Studentized $t$, BCa) | Full Analytical Tool | `js/inference-engine.js` | Includes Jackknife acceleration $\hat{a}$ and bias correction $z_0$ |
| **Exact Randomization Enumeration** ($\binom{N}{n_1}, 2^n \le 3,000$) | Full Analytical Tool | `js/inference-engine.js` | Exact combinatorial enumeration for small samples |
| **Monte Carlo Permutation Tests** (2-Group, Paired Sign-Flip, Correlation/Slope, 1-Way ANOVA, Contingency $\chi^2$) | Full Analytical Tool | `js/inference-engine.js` | Supports $(b+1)/(B+1)$ and $b/B$ conventions + MC SE |
| **Classical Analytical Counterparts** ($t$, Welch $t$, Paired $t$, Wilson CI, Fisher $z$, OLS $t$, ANOVA $F$, $\chi^2$) | Full Analytical Tool | `js/classical-engine.js` | Side-by-side comparison in Bootstrap, Permutation, and Workbench |
| **CI Coverage, Statistical Power, & Optional Stopping Simulators** | Full Analytical Tool | `#view-experiments` | 100-study coverage caterpillar plot, power curve, sequential peeking |
| **Simulation Unity ("One Dataset, Different Questions")** | Full Analytical Tool | `#view-unity` | Synchronized Sampling vs Bootstrap vs Permutation comparison + 14 contrasts |
| **12 Guided Investigations** | Working Interactive Simulation | `#view-investigations` | Reproducible seeds, one-click studio launch, verification checkpoints |
| **Block Bootstrap, Cluster Bootstrap, Importance Sampling, & Multiple Testing (FWER/FDR)** | Complete Educational Reference | `#view-atlas` (`js/atlas-data.js`) | Substantive mathematical reference articles + automated dependent-data warning |
| **Closed-Form Bayesian MCMC Posterior Sampling** | Not Implemented | Out of Scope | Excluded per `APPLICATION_GUIDELINES.md` Section K.3 |
