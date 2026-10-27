# Educational & Statistical Computing Research Teardown (`docs/RESEARCH.md`)

## 1. Pedagogical Motivation

Introductory and intermediate statistics students frequently struggle with three cognitive bottlenecks:
1. **Conflating Distinct Distributions**: Students routinely confuse the distribution of raw data ($s$), the theoretical sampling distribution ($SE = \sigma/\sqrt{n}$), the bootstrap distribution (centered at $\hat{\theta}$), and the permutation null distribution (centered at $\theta_0 = 0$).
2. **Opaque Black-Box Software**: Traditional statistical packages output a single $p$-value or confidence interval without showing how resampling preserves observational units (such as separate groupwise bootstrap vs paired sign-flip randomization).
3. **Asymptotic Over-Reliance**: Standard calculators only compute normal or Student-$t$ intervals, hiding how skewness affects interval asymmetry in small samples ($n < 30$) where BCa and Studentized bootstrap intervals provide critical diagnostic insight.

## 2. How ResampleLab Solves These Challenges

- **Synchronized Visual Hierarchy**: The Sampling Laboratory and the flagship **One Dataset, Different Questions** (Simulation Unity) studio align raw data, sampling distributions, bootstrap distributions, and permutation null distributions on common horizontal scales.
- **Explicit Methodological Guardrails**: Automated checks flag autocorrelated time-series data (`DEPENDENT_DATA_IID_BOOTSTRAP`), small sample sizes, and skewness, while pairing every computational method side by side with its classical analytical counterpart.
