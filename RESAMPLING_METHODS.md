# Bootstrap & Permutation Resampling Specifications (`RESAMPLING_METHODS.md`)

## 1. Nonparametric Bootstrap Algorithms (`js/inference-engine.js`)

### 1.1 Preserving Observational Units by Study Design
- **Univariate Sample ($X_1, \dots, X_n$)**: Draw $n$ observations uniformly WITH replacement from $\{X_1, \dots, X_n\}$.
- **Two Independent Groups ($G_1$ of size $n_1$, $G_2$ of size $n_2$)**: Draw $n_1$ observations WITH replacement from $G_1$ and independently draw $n_2$ observations WITH replacement from $G_2$. Group sample sizes $n_1, n_2$ are strictly preserved.
- **Paired Measurements ($\{(X_i, Y_i)\}_{i=1}^n$)**: Draw $n$ intact pairs $(X_{I_k}, Y_{I_k})$ WITH replacement, preserving within-subject covariance $\operatorname{Cov}(X, Y)$.
- **Bivariate Correlation & OLS Regression ($\{(X_i, Y_i)\}_{i=1}^n$)**: Case bootstrap draws $n$ intact observation pairs $(X_{I_k}, Y_{I_k})$ WITH replacement. Observations are never resampled independently across columns during bootstrap estimation.

### 1.2 Standard Error and Bias Estimators
Given $B$ valid bootstrap replicates $\hat{\theta}^{*1}, \dots, \hat{\theta}^{*B}$ with mean $\bar{\theta}^* = \frac{1}{B}\sum_{b=1}^B \hat{\theta}^{*b}$:
$$\widehat{SE}_{\text{boot}}(\hat{\theta}) = \sqrt{\frac{1}{B - 1}\sum_{b=1}^B \left(\hat{\theta}^{*b} - \bar{\theta}^*\right)^2}, \quad \widehat{\operatorname{Bias}}_{\text{boot}}(\hat{\theta}) = \bar{\theta}^* - \hat{\theta}_{\text{obs}}$$

### 1.3 Five Bootstrap Confidence Interval Procedures
For confidence level $1 - \alpha$:
1. **Percentile Interval**: $[\hat{\theta}^*_{(\alpha/2)}, \; \hat{\theta}^*_{(1-\alpha/2)}]$ using Type 7 quantiles.
2. **Basic (Reverse-Percentile) Interval**: $[2\hat{\theta}_{\text{obs}} - \hat{\theta}^*_{(1-\alpha/2)}, \; 2\hat{\theta}_{\text{obs}} - \hat{\theta}^*_{(\alpha/2)}]$.
3. **Normal SE Interval**: $\hat{\theta}_{\text{obs}} \pm z_{1-\alpha/2}\widehat{SE}_{\text{boot}}$.
4. **Studentized (Bootstrap-$t$) Interval**: For statistics with a valid per-resample standard error $\widehat{SE}^{*b}$, compute $t^{*b} = (\hat{\theta}^{*b} - \hat{\theta}_{\text{obs}}) / \widehat{SE}^{*b}$ and form:
   $$\left[\hat{\theta}_{\text{obs}} - t^*_{(1-\alpha/2)}\widehat{SE}_{\text{obs}}, \; \hat{\theta}_{\text{obs}} - t^*_{(\alpha/2)}\widehat{SE}_{\text{obs}}\right]$$
5. **BCa (Bias-Corrected and Accelerated) Interval**:
   - Bias-correction factor: $z_0 = \Phi^{-1}\left(\frac{1}{B}\sum_{b=1}^B \mathbb{I}(\hat{\theta}^{*b} < \hat{\theta}_{\text{obs}})\right)$
   - Acceleration factor $\hat{a}$ from leave-one-out jackknife values $\hat{\theta}_{(-i)}$:
     $$\hat{a} = \frac{\sum_{i=1}^n (\hat{\theta}_{(\bullet)} - \hat{\theta}_{(-i)})^3}{6 \left[\sum_{i=1}^n (\hat{\theta}_{(\bullet)} - \hat{\theta}_{(-i)})^2\right]^{3/2}}$$
   - Adjusted quantile levels:
     $$\alpha_1 = \Phi\left(z_0 + \frac{z_0 + z_{\alpha/2}}{1 - \hat{a}(z_0 + z_{\alpha/2})}\right), \quad \alpha_2 = \Phi\left(z_0 + \frac{z_0 + z_{1-\alpha/2}}{1 - \hat{a}(z_0 + z_{1-\alpha/2})}\right)$$

---

## 2. Permutation & Randomization Inference (`js/inference-engine.js`)

### 2.1 Valid Null-Generation Schemes
- **Two Independent Groups**: Pool all $N = n_1 + n_2$ observations and partition WITHOUT replacement into groups of size $n_1$ and $n_2$.
- **Paired Data Sign-Flip**: Preserve each pair $i \in \{1, \dots, n\}$ and multiply each within-pair difference $d_i = x_i - y_i$ by an independent Rademacher sign $S_i \in \{-1, +1\}$ with $P(S_i = +1) = 0.5$.
- **Bivariate Independence**: Hold predictor vector $\mathbf{x}$ fixed and permute response vector $\mathbf{y}$ WITHOUT replacement across the $n$ observations.
- **One-Way ANOVA**: Pool all $N = \sum_{j=1}^k n_j$ observations and partition WITHOUT replacement into $k$ groups of sizes $n_1, \dots, n_k$.
- **Contingency Table Independence**: Permute individual column category assignments across all $N$ units WITHOUT replacement while holding row and column marginal totals fixed.

### 2.2 Exact Enumeration vs Monte Carlo $p$-Values
- When the complete finite reference set $M$ ($\binom{N}{n_1}$ or $2^n$) satisfies $M \le 3,000$ and Exact Mode is enabled, ResampleLab enumerates all $M$ configurations and computes the exact randomization $p$-value $p = b / M$.
- Under Monte Carlo sampling of $B$ permutations, the default **Plus-One Estimator** is:
  $$\hat{p} = \frac{b + 1}{B + 1}$$
  with Monte Carlo standard error $SE_{\text{MC}}(\hat{p}) = \sqrt{\frac{\hat{p}(1 - \hat{p})}{B}}$.
