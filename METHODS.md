# Mathematical Definitions, Algorithms, & Statistical Conventions (`METHODS.md`)

## 1. Descriptive Statistics & Sample Quantiles

- **Two-Pass Centered Variance**: To prevent catastrophic floating-point cancellation in naive one-pass formulas, sample variance is computed in two passes:
  $$\bar{x} = \frac{1}{n}\sum_{i=1}^n x_i, \quad s^2 = \frac{1}{n - 1}\sum_{i=1}^n (x_i - \bar{x})^2$$
- **Hyndman-Fan Type 7 Sample Quantiles**: Given order statistics $x_{(1)} \le \dots \le x_{(n)}$ and $q \in [0, 1]$, let $k = (n - 1)q + 1$, $j = \lfloor k \rfloor$, and $\gamma = k - j$:
  $$\hat{Q}_7(q) = (1 - \gamma) x_{(j)} + \gamma x_{(j+1)}$$
  This matches R's default `quantile(x, probs = q, type = 7)` and `STATISTICAL_STANDARDS.md` Section B.2.

## 2. Finite Population Sampling & Standard Error Conventions

- **Sampling With Replacement (SRSWR / i.i.d.)**:
  $$SE(\bar{X}) = \frac{\sigma}{\sqrt{n}}$$
- **Simple Random Sampling Without Replacement (SRSWOR)**: When drawing $n$ distinct units from a finite population of size $N$, ResampleLab applies the Finite Population Correction (FPC):
  $$SE_{\text{SRSWOR}}(\bar{X}) = \frac{\sigma}{\sqrt{n}}\sqrt{\frac{N - n}{N - 1}}$$

## 3. Classical Analytical Counterparts (`js/classical-engine.js`)

1. **One-Sample $t$**: $t = (\bar{x} - \mu_0)/(s/\sqrt{n})$ with $df = n - 1$, $\text{CI} = \bar{x} \pm t_{1-\alpha/2, n-1}(s/\sqrt{n})$.
2. **Welch Two-Sample $t$**: $t = (\bar{x}_1 - \bar{x}_2 - \Delta_0)/\sqrt{s_1^2/n_1 + s_2^2/n_2}$ with Welch-Satterthwaite degrees of freedom:
   $$df = \frac{\left(s_1^2/n_1 + s_2^2/n_2\right)^2}{\frac{(s_1^2/n_1)^2}{n_1 - 1} + \frac{(s_2^2/n_2)^2}{n_2 - 1}}$$
3. **Paired $t$**: Evaluated on within-pair differences $d_i = x_i - y_i$ with $df = n - 1$.
4. **One-Proportion Wilson Score Confidence Interval**:
   $$\frac{\hat{p} + \frac{z^2}{2n} \pm z\sqrt{\frac{\hat{p}(1-\hat{p})}{n} + \frac{z^2}{4n^2}}}{1 + \frac{z^2}{n}}$$
5. **Pearson Correlation Fisher $z$-Transform CI**: $z_r = \frac{1}{2}\ln\left(\frac{1+r}{1-r}\right) = \operatorname{atanh}(r)$, $SE(z_r) = \frac{1}{\sqrt{n-3}}$, inverted via $\tanh(z_r \pm z_{1-\alpha/2} SE(z_r))$.
6. **Simple Linear Regression (OLS) Slope**: $\hat{\beta}_1 = SS_{xy}/SS_{xx}$, $s_e = \sqrt{SSE/(n-2)}$, $SE(\hat{\beta}_1) = s_e/\sqrt{SS_{xx}}$, $df = n - 2$.
7. **One-Way ANOVA**: $F = MSB / MSW$ with $df_1 = k - 1, df_2 = N - k$, and effect size $\eta^2 = SSB / SST$.
8. **Contingency Table Independence**: $\chi^2 = \sum_{r,c} \frac{(O_{rc} - E_{rc})^2}{E_{rc}}$ with $df = (R-1)(C-1)$ and Cramér's $V = \sqrt{\chi^2 / (N \min(R-1, C-1))}$.
