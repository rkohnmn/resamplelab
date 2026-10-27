# DataSense Statistical Standards Specification

**Document Version:** 1.0.0  
**Status:** Canonical Standard  
**Applies to:** QuartetLab, VisualGrammar, ResampleLab, ForecastLab, and DataSense Studio Core  
**Governing Authority:** DataSense Architecture & Statistical Methods Committee  

---

## 1. Scope, Purpose, and Normative Terminology

This document establishes the canonical mathematical, statistical, algorithmic, and numerical standards governing all applications within the DataSense Studio ecosystem. Every statistical engine, interactive visualization, dataset generator, model exporter, and diagnostic report implemented in DataSense software MUST comply with the definitions, conventions, computational algorithms, and communication rules set forth herein.

The key words **MUST**, **MUST NOT**, **REQUIRED**, **SHALL**, **SHALL NOT**, **SHOULD**, **SHOULD NOT**, **RECOMMENDED**, **MAY**, and **OPTIONAL** in this document are to be interpreted as described in [BCP 14, RFC 2119](https://www.ietf.org/rfc/rfc2119.txt).

### 1.1 Document Structure and Ecosystem Role
- **[STATISTICAL_STANDARDS.md](file:///c:/Users/RobTop/Downloads/quartetlab/datasense-standards/STATISTICAL_STANDARDS.md)** (this document): Defines mathematical ground truths, formulas, assumptions, computational algorithms, edge-case protocols, and statistical reporting rules.
- **[VISUALIZATION_STANDARDS.md](file:///c:/Users/RobTop/Downloads/quartetlab/datasense-standards/VISUALIZATION_STANDARDS.md)**: Governs visual representations, graphical integrity, encoding constraints, and chart selection taxonomies.
- **[DATA_CONVENTIONS.md](file:///c:/Users/RobTop/Downloads/quartetlab/datasense-standards/DATA_CONVENTIONS.md)**: Establishes tabular formats, missing value representations, CSV schemas, and JSON interchange specifications.
- **[APPLICATION_GUIDELINES.md](file:///c:/Users/RobTop/Downloads/quartetlab/datasense-standards/APPLICATION_GUIDELINES.md)**: Defines software architecture, state management, client-side execution boundaries, and release criteria.
- **[STATISTICAL_AUDIT.md](file:///c:/Users/RobTop/Downloads/quartetlab/datasense-standards/STATISTICAL_AUDIT.md)**: Documents the verified empirical status, algorithm implementations, and discrepancy analyses for QuartetLab.
- **[DESIGN.md](file:///c:/Users/RobTop/Downloads/quartetlab/datasense-standards/DESIGN.md)**: Canonical design system tokens, typography, colors, and layout rules.

---

## Section A: Mathematical Notation and Foundational Conventions

### A.1 Sets, Observational Units, and Sample Spaces
- **Population Universe ($\Omega$ or $\mathcal{U}$)**: The collection of all conceivable units under study. The population size is denoted by $N \in \mathbb{N} \cup \{\infty\}$.
- **Sample ($S$ or $\mathcal{D}$)**: A finite subset of $n$ observations drawn from $\Omega$, where $n \in \mathbb{N}$ denotes the sample size.
- **Index Sets**: Individual observations in a sample are indexed by subscripts $i, j, k \in \{1, 2, \dots, n\}$. Time-series indices are denoted by $t \in \{1, 2, \dots, T\}$. Resampling / simulation replicate indices are denoted by $b \in \{1, 2, \dots, B\}$.
- **Real Coordinate Spaces**: $\mathbb{R}$ denotes the real numbers, $\mathbb{R}^p$ denotes real Euclidean $p$-space, and $\mathbb{R}^{n \times p}$ denotes the space of $n \times p$ real matrices.

### A.2 Typography of Scalars, Vectors, and Matrices
To eliminate ambiguity across mathematical documentation and code comments, applications MUST follow this typographic hierarchy:
- **Scalars**: Lowercase italic Latin or Greek letters: $x, y, s, \alpha, \beta, \sigma, \mu$.
- **Vectors**: Lowercase bold Latin or Greek letters: $\mathbf{x}, \mathbf{y}, \mathbf{e}, \boldsymbol{\beta}, \boldsymbol{\mu}$. All vectors are column vectors unless explicitly transposed:
  $$\mathbf{x} = \begin{bmatrix} x_1 \\ x_2 \\ \vdots \\ x_n \end{bmatrix} \in \mathbb{R}^{n \times 1}, \quad \mathbf{x}^T = \begin{bmatrix} x_1 & x_2 & \dots & x_n \end{bmatrix} \in \mathbb{R}^{1 \times n}$$
- **Matrices**: Uppercase bold Latin letters: $\mathbf{X}, \mathbf{Y}, \mathbf{H}, \mathbf{I}_n, \boldsymbol{\Sigma}$.
- **Identity and All-Ones Vectors**: $\mathbf{I}_n$ denotes the $n \times n$ identity matrix. $\mathbf{1}_n$ denotes the $n \times 1$ vector of ones: $\mathbf{1}_n = [1, 1, \dots, 1]^T$.
- **Centering Operator Matrix**: $\mathbf{C}_n = \mathbf{I}_n - \frac{1}{n} \mathbf{1}_n \mathbf{1}_n^T$. Multiplying any vector $\mathbf{x}$ by $\mathbf{C}_n$ yields the centered vector $\mathbf{x} - \bar{x}\mathbf{1}_n$.

### A.3 Random Variables versus Realized Observations
- **Random Variables**: Uppercase italic Latin letters ($X, Y, Z, T, F$) denote random variables prior to realization.
- **Realized Values**: Lowercase italic Latin letters ($x_i, y_i, z_i$) denote observed, deterministic real numbers recorded in a dataset.
- **Vector of Random Responses**: $\mathbf{Y} = [Y_1, \dots, Y_n]^T$ denotes the random vector; $\mathbf{y} = [y_1, \dots, y_n]^T$ denotes the observed data vector.

### A.4 Parameters versus Estimators versus Realized Estimates
Software documentation, user interfaces, and source code MUST maintain strict separation among:
1. **Population Parameter ($\theta$)**: An unknown fixed constant characterizing a distribution or population (e.g., $\mu, \sigma^2, \beta_1, \rho$).
2. **Estimator ($\hat{\theta}$ or $T(\mathbf{Y})$)**: A function or rule of random data—hence itself a random variable with a sampling distribution (e.g., sample mean $\bar{X} = \frac{1}{n}\sum_{i=1}^n Y_i$).
3. **Realized Estimate ($\hat{\theta}_{\text{obs}}$ or $t(\mathbf{y})$)**: The concrete numerical evaluation of an estimator on a realized dataset (e.g., $\bar{x} = 9.000$).

### A.5 Statistical Equality versus Numerical Equality
DataSense applications MUST distinguish between three levels of equivalence:
- **Algebraic Identity ($\equiv$)**: A mathematical identity holding across all real inputs (e.g., $SST \equiv SSR + SSE$ in OLS with intercept).
- **Statistical Equivalence ($\overset{d}{=}$)**: Equality in probability distribution between two random variables.
- **Numerical Machine Equality ($\approx_\epsilon$)**: Floating-point equivalence within a prescribed absolute or relative tolerance $\epsilon$:
  $$|a - b| \le \epsilon \quad \text{or} \quad \frac{|a - b|}{\max(|a|, |b|, \epsilon)} \le \epsilon$$
  In DataSense statistical engines, default absolute numerical tolerance is $\epsilon = 1.0 \times 10^{-12}$, unless specified otherwise.

### A.6 Rounding and Significant Digit Rules
- **Internal Calculations**: MUST run in standard IEEE 754 double-precision 64-bit floating point (`Float64`). Intermediate terms MUST NOT be truncated or rounded.
- **Displayed Summary Statistics**: MUST be formatted via `font-variant-numeric: tabular-nums` to prevent layout reflow during live pointer interaction.
- **Default Display Precision**:
  - Sample means ($\bar{x}, \bar{y}$), standard deviations ($s_x, s_y$), and regression coefficients ($\hat{\beta}_0, \hat{\beta}_1$): 4 decimal places.
  - Correlation ($r$) and determination ($R^2, R^2_{\text{adj}}$): 4 decimal places.
  - Test statistics ($t, F, z$): 2 decimal places.
  - $p$-values: 4 decimal places. When $p < 0.0001$, applications MUST display `< 0.0001` rather than rounding to `0.0000`.

---

## Section B: Descriptive Statistics

### B.1 Univariate Location Measures

#### Arithmetic Mean
For a quantitative sample $\mathbf{x} = [x_1, \dots, x_n]^T \in \mathbb{R}^n$:
$$\bar{x} = \frac{1}{n} \sum_{i=1}^n x_i = \frac{1}{n} \mathbf{1}_n^T \mathbf{x}$$
- **Assumptions**: $x_i \in \mathbb{R}$, $n \ge 1$.
- **Edge cases**: If $n = 0$, $\bar{x}$ is undefined; statistical engines MUST return `NaN` or throw a validation error. If any $x_i = \text{NaN}$, the arithmetic mean evaluates to `NaN`.

#### Weighted Arithmetic Mean
Given non-negative weights $\mathbf{w} = [w_1, \dots, w_n]^T$ with $\sum_{i=1}^n w_i > 0$:
$$\bar{x}_w = \frac{\sum_{i=1}^n w_i x_i}{\sum_{i=1}^n w_i}$$
- **Requirements**: If any $w_i < 0$ or $\sum w_i \le 0$, the operation MUST fail with an invalid weight exception.

#### Median
Let $x_{(1)} \le x_{(2)} \le \dots \le x_{(n)}$ denote the order statistics of $\mathbf{x}$.
$$\tilde{x} = \operatorname{median}(\mathbf{x}) = \begin{cases}
x_{\left(\frac{n+1}{2}\right)}, & n \text{ is odd} \\
\frac{1}{2}\left(x_{\left(\frac{n}{2}\right)} + x_{\left(\frac{n}{2} + 1\right)}\right), & n \text{ is even}
\end{cases}$$
- **Breakdown Point**: The sample median has an asymptotic breakdown point of $0.5$, making it robust against extreme outliers.

#### Mode
- **Discrete / Categorical**: The value(s) appearing with highest frequency. If every value appears with equal frequency, the sample is classified as having no unique mode.
- **Continuous Quantitative**: Continuous data MUST NOT be evaluated for mode via raw equality. If a continuous mode is required, it MUST be estimated via kernel density estimation mode $\operatorname{argmax}_x \hat{f}_h(x)$.

### B.2 Quantiles and Percentiles
Statistical software historically implements at least nine distinct sample quantile algorithms (Hyndman and Fan, 1996). 

#### Ecosystem Standard: Type 7 Quantile
DataSense Studio establishes **Hyndman-Fan Type 7** (linear interpolation of empirical CDF positions, the default in R, S-PLUS, and Python NumPy `method="weibull"`/default legacy linear) as the canonical standard.
For a target quantile probability $q \in [0, 1]$ on sorted observations $x_{(1)} \le \dots \le x_{(n)}$:
1. Compute the real index: $k = (n - 1)q + 1$.
2. Decompose $k = j + \gamma$, where $j = \lfloor k \rfloor$ and $\gamma = k - j \in [0, 1)$.
3. Evaluate:
   $$\hat{Q}(q) = \begin{cases}
   x_{(1)}, & k \le 1 \\
   x_{(n)}, & k \ge n \\
   (1 - \gamma) x_{(j)} + \gamma x_{(j+1)}, & 1 < k < n
   \end{cases}$$
- **Quartiles**: First quartile $Q_1 = \hat{Q}(0.25)$; second quartile $Q_2 = \hat{Q}(0.50) = \tilde{x}$; third quartile $Q_3 = \hat{Q}(0.75)$.
- **Interquartile Range (IQR)**:
  $$IQR = Q_3 - Q_1$$

### B.3 Dispersion Measures

#### Sample Variance ($s^2$) and Bessel's Correction
For a sample of size $n \ge 2$, sample variance MUST use the degrees-of-freedom divisor $n - 1$:
$$s^2 = s_x^2 = \frac{1}{n - 1} \sum_{i=1}^n (x_i - \bar{x})^2 = \frac{1}{n - 1} \mathbf{x}^T \mathbf{C}_n \mathbf{x}$$
- **Theoretical Rationale**: Dividing by $n - 1$ removes downward finite-sample bias, guaranteeing an unbiased estimator: $\mathbb{E}[s^2] = \sigma^2$.
- **Population Variance ($\sigma^2$)**: When an engine explicitly models a complete finite population of known size $N$:
  $$\sigma^2 = \frac{1}{N} \sum_{i=1}^N (x_i - \mu)^2$$
- **Rule on Divisors**: Applications MUST NOT use $n$ for sample variance calculations unless explicitly labeled as the uncorrected population moment $\hat{\sigma}^2_n = \frac{n-1}{n}s^2$.

#### Sample Standard Deviation ($s$)
$$s = \sqrt{s^2} = \sqrt{\frac{1}{n - 1} \sum_{i=1}^n (x_i - \bar{x})^2}$$
*Note on Jensen's Inequality*: Because the square-root function is strictly concave, $\mathbb{E}[s] < \sigma$ for finite $n$. Even though $s^2$ is an unbiased estimator of $\sigma^2$, $s$ is slightly biased downward for $\sigma$. DataSense retains $s$ as the standard descriptive estimate.

#### Standard Error of the Mean ($SE(\bar{x})$)
$$SE(\bar{x}) = \frac{s}{\sqrt{n}}$$

#### Median Absolute Deviation (MAD)
For robust dispersion estimation:
$$MAD = \operatorname{median}_i (|x_i - \tilde{x}|)$$
The standardized (normal-consistent) MAD is:
$$MAD_{\sigma} = 1.482602218505602 \times MAD$$
where $1.4826 \approx 1 / \Phi^{-1}(0.75)$.

### B.4 Bivariate Association Measures

#### Sample Covariance ($s_{xy}$)
For paired observations $\{(x_i, y_i)\}_{i=1}^n$ with $n \ge 2$:
$$s_{xy} = \operatorname{Cov}(X, Y) = \frac{1}{n - 1} \sum_{i=1}^n (x_i - \bar{x})(y_i - \bar{y}) = \frac{1}{n - 1} \mathbf{x}^T \mathbf{C}_n \mathbf{y}$$

#### Pearson Product-Moment Correlation Coefficient ($r$)
$$r = \frac{s_{xy}}{s_x s_y} = \frac{\sum_{i=1}^n (x_i - \bar{x})(y_i - \bar{y})}{\sqrt{\left[\sum_{i=1}^n (x_i - \bar{x})^2\right]\left[\sum_{i=1}^n (y_i - \bar{y})^2\right]}}$$
- **Mathematical Bounds**: By the Cauchy-Schwarz inequality, $-1 \le r \le 1$.
- **Degenerate Handling**: If $s_x < \epsilon$ or $s_y < \epsilon$ (zero variance / constant series), $r$ is mathematically undefined ($0/0$). The statistical engine MUST return $r = 0$ or flag the calculation as undefined with a `ZERO_VARIANCE_PREDICTOR` code.

#### Spearman Rank Correlation Coefficient ($\rho_s$)
Let $R(x_i)$ and $R(y_i)$ denote the fractional average ranks of $x_i$ and $y_i$ respectively. Ties are assigned the arithmetic mean of the rank positions they span.
$$\rho_s = \frac{\sum_{i=1}^n (R(x_i) - \bar{R}_x)(R(y_i) - \bar{R}_y)}{\sqrt{\sum_{i=1}^n (R(x_i) - \bar{R}_x)^2 \sum_{i=1}^n (R(y_i) - \bar{R}_y)^2}}$$
When no ties exist, this reduces to the classical algebraic identity:
$$\rho_s = 1 - \frac{6 \sum_{i=1}^n d_i^2}{n(n^2 - 1)}, \quad \text{where } d_i = R(x_i) - R(y_i)$$

### B.5 Higher-Order Sample Moments
- **Skewness (Fisher-Pearson Standardized Third Moment $g_1$)**:
  $$g_1 = \frac{m_3}{m_2^{3/2}} = \frac{\frac{1}{n}\sum (x_i - \bar{x})^3}{\left(\frac{1}{n}\sum (x_i - \bar{x})^2\right)^{3/2}}$$
  Sample-adjusted unbiased skewness $G_1$:
  $$G_1 = \frac{\sqrt{n(n-1)}}{n-2} g_1 \quad (n \ge 3)$$
- **Excess Kurtosis ($g_2$)**:
  $$g_2 = \frac{m_4}{m_2^2} - 3 = \frac{\frac{1}{n}\sum (x_i - \bar{x})^4}{\left(\frac{1}{n}\sum (x_i - \bar{x})^2\right)^2} - 3$$
  For a standard normal distribution, excess kurtosis is exactly $0$.

### B.6 Outlier Screening Rules
DataSense applications MUST explicitly label which outlier rule is active:
1. **Tukey 1.5 IQR Rule**:
   $$\text{Lower Inner Fence} = Q_1 - 1.5 \cdot IQR, \quad \text{Upper Inner Fence} = Q_3 + 1.5 \cdot IQR$$
   Observations outside $[Q_1 - 1.5 \cdot IQR, Q_3 + 1.5 \cdot IQR]$ are classified as mild outliers. Observations beyond $3.0 \cdot IQR$ are extreme outliers.
2. **$Z$-Score Rule**: $|z_i| = |x_i - \bar{x}| / s_x > 3.0$. Valid only when sample distribution is approximately normal.

---

## Section C: Probability Theory

### C.1 Axiomatic Foundations
Every probability model in DataSense MUST adhere to Kolmogorov's axioms on a measurable probability space $(\Omega, \mathcal{F}, P)$:
1. **Non-negativity**: $P(E) \ge 0$ for all events $E \in \mathcal{F}$.
2. **Unit Measure**: $P(\Omega) = 1$.
3. **Countable Additivity**: For any sequence of pairwise disjoint events $\{E_k\}_{k=1}^\infty$:
   $$P\left(\bigcup_{k=1}^\infty E_k\right) = \sum_{k=1}^\infty P(E_k)$$

### C.2 Conditional Probability, Independence, and Bayes' Theorem
- **Conditional Probability**: For events $A, B \in \mathcal{F}$ with $P(B) > 0$:
  $$P(A \mid B) = \frac{P(A \cap B)}{P(B)}$$
- **Statistical Independence**: Events $A$ and $B$ are statistically independent ($A \perp B$) if and only if:
  $$P(A \cap B) = P(A) P(B)$$
- **Law of Total Probability**: If $\{B_k\}_{k=1}^K$ forms a partition of $\Omega$ with $P(B_k) > 0$:
  $$P(A) = \sum_{k=1}^K P(A \mid B_k) P(B_k)$$
- **Bayes' Theorem**:
  $$P(B_j \mid A) = \frac{P(A \mid B_j) P(B_j)}{\sum_{k=1}^K P(A \mid B_k) P(B_k)}$$

### C.3 Random Variables and Distributions
- **Cumulative Distribution Function (CDF)**: For any random variable $X$:
  $$F_X(x) = P(X \le x), \quad x \in \mathbb{R}$$
  Properties: $F_X$ is non-decreasing, right-continuous, $\lim_{x \to -\infty} F_X(x) = 0$, and $\lim_{x \to \infty} F_X(x) = 1$.
- **Quantile Function (Generalized Inverse CDF)**:
  $$F_X^{-1}(p) = \inf \{x \in \mathbb{R} : F_X(x) \ge p\}, \quad p \in (0, 1)$$
- **Expectation**:
  $$\mathbb{E}[g(X)] = \begin{cases}
  \sum_{x} g(x) P(X = x), & X \text{ discrete} \\
  \int_{-\infty}^\infty g(x) f_X(x) \, dx, & X \text{ continuous with density } f_X
  \end{cases}$$
- **Variance**: $\operatorname{Var}(X) = \mathbb{E}[(X - \mathbb{E}[X])^2] = \mathbb{E}[X^2] - (\mathbb{E}[X])^2$.

### C.4 Canonical Probability Distributions Table

| Distribution | Notation | Parameters | Support | Mean $\mathbb{E}[X]$ | Variance $\operatorname{Var}(X)$ | Numerical Algorithm in DataSense |
|---|---|---|---|---|---|---|
| **Bernoulli** | $\operatorname{Bern}(p)$ | $p \in [0, 1]$ | $k \in \{0, 1\}$ | $p$ | $p(1-p)$ | Direct evaluation |
| **Binomial** | $\operatorname{Bin}(n, p)$ | $n \in \mathbb{N}, p \in [0, 1]$ | $k \in \{0, \dots, n\}$ | $np$ | $np(1-p)$ | Lanczos log-gamma for $\binom{n}{k}$ |
| **Uniform (Cont.)** | $\mathcal{U}(a, b)$ | $a < b$ | $x \in [a, b]$ | $\frac{a+b}{2}$ | $\frac{(b-a)^2}{12}$ | Closed form |
| **Normal (Gaussian)**| $\mathcal{N}(\mu, \sigma^2)$ | $\mu \in \mathbb{R}, \sigma > 0$ | $x \in \mathbb{R}$ | $\mu$ | $\sigma^2$ | Acklam rational inverse CDF; Chebyshev erf |
| **Student's $t$** | $t(\nu)$ | $\nu > 0$ degrees of freedom | $x \in \mathbb{R}$ | $0$ (for $\nu > 1$) | $\frac{\nu}{\nu - 2}$ (for $\nu > 2$) | Continued-fraction incomplete beta $I_x(\frac{\nu}{2}, \frac{1}{2})$ |
| **Snedecor's $F$** | $F(d_1, d_2)$ | $d_1, d_2 > 0$ | $x > 0$ | $\frac{d_2}{d_2 - 2}$ (for $d_2 > 2$) | $\frac{2 d_2^2 (d_1 + d_2 - 2)}{d_1(d_2 - 2)^2(d_2 - 4)}$ | Regularized beta: $I_{\frac{d_1 x}{d_1 x + d_2}}(\frac{d_1}{2}, \frac{d_2}{2})$ |
| **Chi-Squared** | $\chi^2(k)$ | $k \in \mathbb{N}$ | $x \ge 0$ | $k$ | $2k$ | Incomplete lower gamma $P(k/2, x/2)$ |
| **Exponential** | $\operatorname{Exp}(\lambda)$ | $\lambda > 0$ | $x \ge 0$ | $1/\lambda$ | $1/\lambda^2$ | Analytical inversion: $-\ln(1-u)/\lambda$ |

### C.5 Limit Theorems
- **Weak Law of Large Numbers (WLLN)**: For i.i.d. $X_1, \dots, X_n$ with finite mean $\mu$, the sample mean $\bar{X}_n \xrightarrow{P} \mu$ as $n \to \infty$.
- **Lindeberg-Lévy Central Limit Theorem (CLT)**: For i.i.d. $X_1, \dots, X_n$ with finite mean $\mu$ and finite non-zero variance $\sigma^2$:
  $$\sqrt{n}\left(\frac{\bar{X}_n - \mu}{\sigma}\right) \xrightarrow{d} \mathcal{N}(0, 1) \quad \text{as } n \to \infty$$
  Applications simulating sampling distributions MUST state whether convergence relies on the CLT or exact normality of errors.

---

## Section D: Statistical Inference

### D.1 Frequentist Confidence Intervals
A $(1 - \alpha) \times 100\%$ confidence interval for an unknown parameter $\theta$ is a pair of statistics $[L(\mathbf{Y}), U(\mathbf{Y})]$ such that:
$$P\left(L(\mathbf{Y}) \le \theta \le U(\mathbf{Y})\right) = 1 - \alpha$$

#### Mandatory Pedagogical Communication Rule
DataSense applications MUST enforce the correct frequentist interpretation of confidence intervals:
- **CORRECT**: "If we were to draw repeated independent samples of size $n$ from this population under identical conditions and compute a 95% confidence interval for each sample, approximately 95% of those calculated intervals would contain the true fixed parameter $\theta$."
- **PROHIBITED (FATAL ERROR)**: "There is a 95% chance that the true parameter lies between $L$ and $U$." (Once a sample is realized, $[L_{\text{obs}}, U_{\text{obs}}]$ is deterministic; it contains $\theta$ with probability either $0$ or $1$).

### D.2 Hypothesis Testing and $p$-Values
- **Null Hypothesis ($H_0$)**: A precise mathematical statement asserting no effect, no difference, or null correlation (e.g., $H_0: \beta_1 = 0$ or $H_0: \mu_1 - \mu_2 = 0$).
- **Alternative Hypothesis ($H_a$)**: The complement asserting a non-zero effect ($H_a: \beta_1 \ne 0$) or directional difference ($H_a: \beta_1 > 0$).
- **Test Statistic ($T(\mathbf{y})$)**: A standardized measure of discrepancy between the observed sample and $H_0$.

#### Exact Definition of $p$-Value
The $p$-value is the probability, calculated assuming the null hypothesis $H_0$ is true, of obtaining a test statistic at least as extreme as the value observed in the empirical data:
$$p\text{-value} = P\left(|T(\mathbf{Y})| \ge |T_{\text{obs}}| \;\middle|\; H_0\right) \quad (\text{two-sided test})$$

#### Mandatory Pedagogical Communication Rule
- **CORRECT**: "The $p$-value represents the probability of observing a sample statistic as extreme as, or more extreme than, our observed data, assuming the null hypothesis is true."
- **STRICT PROHIBITION**: Applications MUST NEVER describe a $p$-value as "the probability that the null hypothesis is true," "the probability that the result occurred by chance," or "the probability of making an error."

### D.3 Error Typology and Statistical Power
- **Type I Error ($\alpha$)**: Rejecting $H_0$ when $H_0$ is true. $P(\text{Type I Error}) \le \alpha$.
- **Type II Error ($\beta$)**: Failing to reject $H_0$ when $H_a$ is true.
- **Statistical Power ($1 - \beta$)**: The probability of correctly rejecting $H_0$ when a specific alternative effect size $\delta$ is true:
  $$\text{Power} = P\left(\text{Reject } H_0 \mid \theta = \theta_0 + \delta\right)$$
- **Significance versus Practical Importance**: A statistically significant test ($p < \alpha$) demonstrates that an effect is unlikely to be zero under the model assumptions, but does NOT establish that the effect size has substantive, physical, or commercial significance. Applications MUST display estimated effect sizes (e.g., Cohen's $d$, Pearson's $r$, slope coefficient) alongside test statistics.

### D.4 Multiple Comparisons
When testing $m$ simultaneous hypotheses at level $\alpha$:
- **Family-Wise Error Rate (FWER)**: $P(\text{at least one false rejection}) \le 1 - (1 - \alpha)^m \approx m\alpha$.
- **Bonferroni Correction**: Reject $H_{0,i}$ if $p_i \le \alpha / m$. Strictly conservative.
- **Holm-Bonferroni Step-Down Procedure**: Sort $p_{(1)} \le \dots \le p_{(m)}$. Find the smallest index $k$ such that $p_{(k)} > \frac{\alpha}{m - k + 1}$. Reject $H_{(1)}, \dots, H_{(k-1)}$.
- **Benjamini-Hochberg False Discovery Rate (FDR)**: Controls the expected proportion of false discoveries $Q = \mathbb{E}[V / R \mid R > 0] \le q^*$. Sort $p_{(1)} \le \dots \le p_{(m)}$, find largest $k$ such that $p_{(k)} \le \frac{k}{m} q^*$, and reject all $H_{(i)}$ for $i \le k$.

---

## Section E: Resampling and Simulation Standards

### E.1 The Nonparametric Bootstrap
Given an original observed sample $\mathbf{x} = [x_1, \dots, x_n]^T$ drawn from an unknown distribution $F$:
1. Form the empirical distribution function $\hat{F}_n(t) = \frac{1}{n}\sum_{i=1}^n \mathbb{I}(x_i \le t)$.
2. For $b = 1, \dots, B$, draw a bootstrap resample $\mathbf{x}^{*b} = [x_1^{*b}, \dots, x_n^{*b}]^T$ by sampling $n$ elements uniformly **with replacement** from $\mathbf{x}$.
3. Evaluate the target estimator on each resample: $\hat{\theta}^{*b} = T(\mathbf{x}^{*b})$.

#### Bootstrap Standard Error
$$\widehat{SE}_{\text{boot}}(\hat{\theta}) = \sqrt{\frac{1}{B - 1} \sum_{b=1}^B \left(\hat{\theta}^{*b} - \bar{\theta}^*\right)^2}, \quad \text{where } \bar{\theta}^* = \frac{1}{B}\sum_{b=1}^B \hat{\theta}^{*b}$$

#### Bootstrap Confidence Intervals
Applications in ResampleLab MUST support three bootstrap interval methods:
1. **Percentile Bootstrap Interval**:
   $$[L_{\text{pct}}, U_{\text{pct}}] = \left[\hat{\theta}^*_{(\lfloor B \cdot \alpha/2 \rfloor)}, \; \hat{\theta}^*_{(\lceil B \cdot (1 - \alpha/2) \rceil)}\right]$$
   Requires symmetric sampling distribution and parameter transformations.
2. **Normal Approximation Bootstrap Interval**:
   $$\hat{\theta}_{\text{obs}} \pm z_{1 - \alpha/2} \cdot \widehat{SE}_{\text{boot}}(\hat{\theta})$$
3. **Basic (Empirical) Bootstrap Interval**:
   $$[2\hat{\theta}_{\text{obs}} - \hat{\theta}^*_{(1 - \alpha/2)}, \; 2\hat{\theta}_{\text{obs}} - \hat{\theta}^*_{(\alpha/2)}]$$

### E.2 Permutation and Randomization Tests
For a two-sample comparison or correlation test under the sharp null hypothesis of exchangeability ($H_0: F_1 = F_2$ or $H_0: X \perp Y$):
1. **Sampling Protocol**: Sample **without replacement**.
2. For two-sample difference in means ($\bar{x}_1 - \bar{x}_2$): Pool $N = n_1 + n_2$ observations. At each iteration $b \in \{1, \dots, B\}$, randomly permute the group labels while keeping group sizes $n_1, n_2$ fixed.
3. Compute the permuted test statistic $T^{*b}$.
4. Compute the empirical simulation $p$-value with pseudo-count correction:
   $$\hat{p}_{\text{perm}} = \frac{1 + \sum_{b=1}^B \mathbb{I}\left(|T^{*b}| \ge |T_{\text{obs}}|\right)}{B + 1}$$
   *Rule*: The addition of $+1$ to numerator and denominator guarantees that $\hat{p}$ is strictly positive and constitutes an exact valid significance test under the random permutation mechanism.

### E.3 Simulation Resolution and PRNG Protocols
- **Minimum Replicate Thresholds**:
  - Exploratory/Interactive Live Sliders: $B \ge 1,000$.
  - Formal Hypothesis Tests ($p \approx 0.05$): $B \ge 10,000$.
  - Standard Error of Monte Carlo $p$-value: $SE(\hat{p}) = \sqrt{\frac{\hat{p}(1 - \hat{p})}{B}}$. For $B = 10,000$ and $p = 0.05$, $SE \approx 0.00218$.
- **Pseudorandom Number Generation (PRNG)**:
  - Standard `Math.random()` in browser engines is not seedable and MUST NOT be used for reproducible simulation workflows.
  - Engines MUST use a deterministic, seedable PRNG (e.g., Mulberry32, SplitMix64, or Xoshiro128+).
  - Every simulation export MUST record the 32-bit integer seed and iteration count $B$.

---

## Section F: Regression and Statistical Modeling

### F.1 Simple Linear Regression (SLR)
The classical bivariate linear regression model assumes:
$$Y_i = \beta_0 + \beta_1 X_i + \varepsilon_i, \quad i = 1, \dots, n$$
where $\beta_0$ is the intercept, $\beta_1$ is the slope, and $\varepsilon_i$ are unobserved disturbance terms.

#### Ordinary Least Squares (OLS) Estimators
OLS minimizes the sum of squared vertical residuals:
$$S(\beta_0, \beta_1) = \sum_{i=1}^n (y_i - \beta_0 - \beta_1 x_i)^2$$
Setting partial derivatives to zero yields the normal equations:
$$\sum_{i=1}^n (y_i - \hat{\beta}_0 - \hat{\beta}_1 x_i) = 0, \quad \sum_{i=1}^n x_i (y_i - \hat{\beta}_0 - \hat{\beta}_1 x_i) = 0$$
Solving yields closed-form expressions:
$$\hat{\beta}_1 = \frac{SS_{xy}}{SS_{xx}} = \frac{\sum (x_i - \bar{x})(y_i - \bar{y})}{\sum (x_i - \bar{x})^2} = r \frac{s_y}{s_x}, \quad \hat{\beta}_0 = \bar{y} - \hat{\beta}_1 \bar{x}$$

#### Fitted Values and Residuals
- **Fitted Values**: $\hat{y}_i = \hat{\beta}_0 + \hat{\beta}_1 x_i$.
- **Raw Residuals**: $e_i = y_i - \hat{y}_i$.

### F.2 Algebraic Properties of OLS (Independent of Model Assumptions)
DataSense engines and educators MUST distinguish algebraic OLS guarantees from statistical assumptions. The following five properties hold mathematically for any dataset with $SS_{xx} > 0$ whenever an intercept is included, even if the linear model is completely invalid:
1. **Sum of Residuals is Zero**: $\sum_{i=1}^n e_i = 0$.
2. **Mean of Fitted Values Equals Mean of Responses**: $\bar{\hat{y}} = \frac{1}{n}\sum \hat{y}_i = \bar{y}$.
3. **Orthogonality to Predictor**: $\sum_{i=1}^n x_i e_i = 0$ (sample covariance $s_{x, e} = 0$).
4. **Orthogonality to Fitted Values**: $\sum_{i=1}^n \hat{y}_i e_i = 0$.
5. **Centroid Passage**: The regression line passes exactly through the centroid $(\bar{x}, \bar{y})$: $\hat{y}(\bar{x}) = \hat{\beta}_0 + \hat{\beta}_1 \bar{x} = \bar{y}$.

### F.3 Statistical Assumptions for Inference (LINE)
Valid statistical inference (standard errors, $t$-tests, confidence bands) requires four conditions:
1. **Linearity ($L$)**: The conditional expectation is strictly linear: $\mathbb{E}[\varepsilon_i \mid X_i] = 0 \implies \mathbb{E}[Y_i \mid X_i] = \beta_0 + \beta_1 X_i$.
2. **Independence ($I$)**: Errors are mutually uncorrelated: $\operatorname{Cov}(\varepsilon_i, \varepsilon_j) = 0$ for all $i \ne j$.
3. **Normality ($N$)**: Disturbance terms are normally distributed: $\varepsilon_i \sim \mathcal{N}(0, \sigma^2)$.
4. **Equal Variance / Homoscedasticity ($E$)**: Disturbance variance is constant across all predictor levels: $\operatorname{Var}(\varepsilon_i \mid X_i) = \sigma^2$.

### F.4 ANOVA Decomposition of Variability
$$SST = SSR + SSE$$
- **Total Sum of Squares**: $SST = \sum_{i=1}^n (y_i - \bar{y})^2 = (n - 1)s_y^2$, with degrees of freedom $df_T = n - 1$.
- **Regression (Model) Sum of Squares**: $SSR = \sum_{i=1}^n (\hat{y}_i - \bar{y})^2 = \hat{\beta}_1^2 SS_{xx}$, with $df_R = 1$ (for SLR).
- **Error (Residual) Sum of Squares**: $SSE = \sum_{i=1}^n (y_i - \hat{y}_i)^2 = \sum_{i=1}^n e_i^2$, with $df_E = n - 2$.

#### Residual Variance and Standard Error
$$s_e^2 = \frac{SSE}{n - 2} = \frac{1}{n - 2}\sum_{i=1}^n e_i^2, \quad s_e = \sqrt{s_e^2}$$

#### Coefficient of Determination ($R^2$) and Adjusted $R^2$
- **Unadjusted $R^2$**:
  $$R^2 = \frac{SSR}{SST} = 1 - \frac{SSE}{SST}$$
  In simple linear regression with an intercept, $R^2 \equiv r^2$.
- **Adjusted $R^2$ ($R^2_{\text{adj}}$)**: Accounts for parameter count $p$ (including intercept, $p = 2$ in SLR):
  $$R^2_{\text{adj}} = 1 - \frac{SSE / (n - p)}{SST / (n - 1)} = 1 - (1 - R^2)\frac{n - 1}{n - p}$$
  *Edge Case*: When $R^2$ is low and $n$ is small, $R^2_{\text{adj}}$ can evaluate to negative values. Applications MUST allow negative $R^2_{\text{adj}}$ or display $0.0000$ with an informative tooltip explaining that model variance exceeds sample variance.

### F.5 Inference on Regression Coefficients
Under LINE assumptions, the sampling distributions of $\hat{\beta}_0$ and $\hat{\beta}_1$ are:
$$\hat{\beta}_1 \sim \mathcal{N}\left(\beta_1, \frac{\sigma^2}{SS_{xx}}\right), \quad \hat{\beta}_0 \sim \mathcal{N}\left(\beta_0, \sigma^2 \left[\frac{1}{n} + \frac{\bar{x}^2}{SS_{xx}}\right]\right)$$
Replacing unknown $\sigma$ with estimated residual standard error $s_e$ yields the standard errors:
$$SE(\hat{\beta}_1) = \frac{s_e}{\sqrt{SS_{xx}}}, \quad SE(\hat{\beta}_0) = s_e \sqrt{\frac{1}{n} + \frac{\bar{x}^2}{SS_{xx}}}$$

#### Student-$t$ Statistics and Critical Values
$$t_{\beta_1} = \frac{\hat{\beta}_1 - \beta_{1,0}}{SE(\hat{\beta}_1)}, \quad t_{\beta_0} = \frac{\hat{\beta}_0 - \beta_{0,0}}{SE(\hat{\beta}_0)}$$
Under $H_0: \beta_j = 0$, each statistic follows a Student-$t$ distribution with $df = n - 2$.
A $95\%$ confidence interval for the slope is:
$$\hat{\beta}_1 \pm t_{1 - \alpha/2, \; n - 2} \cdot SE(\hat{\beta}_1)$$

### F.6 Confidence Interval for Mean Response versus Prediction Interval
For a specific predictor value $x_0$:

#### Confidence Interval for Mean Response $\mu_{Y \mid X = x_0} = \mathbb{E}[Y \mid X = x_0]$
Reflects uncertainty in estimating the regression line parameters:
$$\hat{y}_0 \pm t_{1 - \alpha/2, \; n - 2} \cdot s_e \sqrt{\frac{1}{n} + \frac{(x_0 - \bar{x})^2}{SS_{xx}}}$$
- **Hyperbolic Geometry**: The interval reaches minimum width at the centroid $x_0 = \bar{x}$ and flares outwards quadratically as $|x_0 - \bar{x}|$ increases.
- **Asymptotics**: As sample size $n \to \infty$, the width of the confidence interval converges to $0$.

#### Prediction Interval for a Single Future Observation $Y_{\text{new}} \mid X = x_0$
Reflects parameter estimation uncertainty PLUS irreducible random disturbance $\varepsilon_{\text{new}}$:
$$\hat{y}_0 \pm t_{1 - \alpha/2, \; n - 2} \cdot s_e \sqrt{1 + \frac{1}{n} + \frac{(x_0 - \bar{x})^2}{SS_{xx}}}$$
- **Asymptotics**: As $n \to \infty$, the prediction interval width converges to $2 z_{1 - \alpha/2} \sigma > 0$. It never collapses to zero.
- **Rule on Canvas Visualization**: Applications MUST NOT confuse or conflate confidence ribbons and prediction ribbons. Visualizations displaying ribbons MUST explicitly designate them as "Confidence Interval for Mean Response" or "Prediction Interval for Individual Observations".

---

## Section G: Regression Diagnostics

### G.1 Leverage and the Hat Matrix
In matrix terms, fitted values are linear projections of response vector $\mathbf{y}$:
$$\hat{\mathbf{y}} = \mathbf{X}\hat{\boldsymbol{\beta}} = \mathbf{X}(\mathbf{X}^T \mathbf{X})^{-1}\mathbf{X}^T \mathbf{y} = \mathbf{H}\mathbf{y}$$
The orthogonal projection operator $\mathbf{H} \in \mathbb{R}^{n \times n}$ is the **hat matrix**.
- **Properties of $\mathbf{H}$**:
  1. Symmetric: $\mathbf{H} = \mathbf{H}^T$.
  2. Idempotent: $\mathbf{H}^2 = \mathbf{H}$.
  3. Trace equals parameter count: $\operatorname{tr}(\mathbf{H}) = \sum_{i=1}^n h_{ii} = p = 2$ (in SLR).
  4. Bounded: $1/n \le h_i \le 1$.

#### Scalar Leverage ($h_i$) in Simple Linear Regression
$$h_i = h_{ii} = \frac{1}{n} + \frac{(x_i - \bar{x})^2}{\sum_{j=1}^n (x_j - \bar{x})^2} = \frac{1}{n} + \frac{(x_i - \bar{x})^2}{SS_{xx}}$$
- **Interpretation**: Leverage $h_i$ measures exclusively the geometric distance of predictor $x_i$ from the predictor mean $\bar{x}$. It is entirely independent of $y_i$.
- **High-Leverage Heuristic Threshold**: An observation is flagged for high leverage when:
  $$h_i > \frac{2p}{n} = \frac{4}{n} \quad (\text{for } n \ge 5)$$
  A conservative alternative threshold is $3p/n = 6/n$.

### G.2 Residual Standardization and Studentization
Raw residuals $e_i$ do not have equal variances: $\operatorname{Var}(e_i) = \sigma^2(1 - h_i)$. Consequently, points with high leverage naturally exhibit smaller raw residuals.

#### Internally Studentized Residual ($r_i$)
$$r_i = \frac{e_i}{s_e \sqrt{1 - h_i}}$$
- **Variance**: $\operatorname{Var}(r_i) = 1$.
- **Outlier Flag**: Observations with $|r_i| > 2.0$ (or $|r_i| > 2.5$) warrant diagnostic review.

#### Externally Studentized (Jackknife) Residual ($t_i$)
Calculated by estimating the residual variance $s_{(i)}^2$ with the $i$-th observation deleted:
$$t_i = \frac{e_i}{s_{(i)}\sqrt{1 - h_i}} = r_i \sqrt{\frac{n - p - 1}{n - p - r_i^2}}$$
Under LINE assumptions, $t_i$ follows an exact Student-$t$ distribution with $n - p - 1$ degrees of freedom ($n - 3$ in SLR).

### G.3 Cook's Distance ($D_i$)
Cook's Distance measures the aggregate influence of deleting observation $i$ on all $n$ fitted values across the entire dataset:
$$D_i = \frac{\sum_{j=1}^n (\hat{y}_j - \hat{y}_{j(i)})^2}{p \, s_e^2}$$
Using leverage and studentized residuals, Cook's Distance evaluates in $O(1)$ time without refitting the model:
$$D_i = \frac{r_i^2}{p} \cdot \frac{h_i}{1 - h_i} = \frac{e_i^2}{p \, s_e^2 (1 - h_i)^2} \cdot h_i$$
In simple linear regression ($p = 2$):
$$D_i = \frac{r_i^2}{2} \cdot \frac{h_i}{1 - h_i}$$

#### Influence Thresholds
- **Cook's Conservative Cutoff**: $D_i > 1.0$ indicates substantial influence on parameter estimates (Cook, 1977).
- **Sample-Size-Adjusted Cutoff**: $D_i > \frac{4}{n}$ (frequently used in statistical software and introductory regression courses).
- **QuartetLab Heuristic**: QuartetLab flags observations as influential if $D_i > \max(4/n, 0.25)$ to prevent over-flagging in very small samples ($n < 8$).

### G.4 Summary of Diagnostic Cutoffs Table

| Diagnostic Metric | Symbol | Formula | Standard Threshold | Pedagogical Warning |
|---|---|---|---|---|
| **Leverage** | $h_i$ | $\frac{1}{n} + \frac{(x_i - \bar{x})^2}{SS_{xx}}$ | $h_i > 4/n$ ($n \ge 5$) | High leverage indicates extreme $x_i$, NOT necessarily an outlier in $y$. |
| **Internally Studentized Residual** | $r_i$ | $\frac{e_i}{s_e \sqrt{1 - h_i}}$ | $|r_i| > 2.0$ | Identifies vertical outliers (large residual relative to its standard error). |
| **Externally Studentized Residual** | $t_i$ | $r_i \sqrt{\frac{n - 3}{n - 2 - r_i^2}}$ | $|t_i| > t_{0.975, n-3}$ | Preferred test for single-outlier discordancy. |
| **Cook's Distance** | $D_i$ | $\frac{r_i^2}{2}\frac{h_i}{1 - h_i}$ | $D_i > 4/n$ or $D_i > 1.0$ | High influence requires BOTH non-zero leverage AND non-zero residual. |

---

## Section H: Exact-Moment Dataset Synthesis

### H.1 Purpose and Mathematical Foundations
QuartetLab features an exact-moment projection engine (`projectToExactMoments`). Given an arbitrary initial point cloud $\{(x_i, y_i)\}_{i=1}^n$ with $n \ge 3$, the engine transforms the coordinates so that the resulting dataset exhibits **exact** prescribed sample moments:
- Target sample mean of $X$: $\mu_x^*$
- Target sample standard deviation of $X$: $s_x^* > 0$
- Target sample mean of $Y$: $\mu_y^*$
- Target sample standard deviation of $Y$: $s_y^* > 0$
- Target Pearson correlation: $r^* \in (-1, 1)$

### H.2 Step-by-Step Algorithm Formulation

#### Step 1: Centering and Degeneracy Handling
Compute empirical sample means:
$$\bar{x} = \frac{1}{n}\sum_{i=1}^n x_i, \quad \bar{y} = \frac{1}{n}\sum_{i=1}^n y_i$$
Define centered displacement vectors:
$$u_i = x_i - \bar{x}, \quad v_i = y_i - \bar{y}, \quad i = 1, \dots, n$$
Evaluate initial sum of squared deviations for $X$:
$$SS_u = \sum_{i=1}^n u_i^2$$
*Degeneracy Fallback*: If $SS_u < 10^{-12}$ (all $x_i$ identical), assign a deterministic linear ramp:
$$u_i = i - \frac{n + 1}{2}, \quad SS_u = \sum_{i=1}^n u_i^2$$
Compute sample standard deviation $s_u = \sqrt{SS_u / (n - 1)}$ and normalize:
$$z_{x,i} = \frac{u_i}{s_u}$$
By construction, $\sum z_{x,i} = 0$ and $\frac{1}{n-1}\sum z_{x,i}^2 = 1$.

#### Step 2: Gram-Schmidt Orthogonalization of $Y$ against $X$
Compute the sample inner product (projection coefficient):
$$c = \frac{1}{n - 1} \mathbf{z}_x^T \mathbf{v} = \frac{1}{n - 1}\sum_{i=1}^n z_{x,i} v_i$$
Subtract the parallel component:
$$w_i = v_i - c \, z_{x,i}$$
Re-center $\mathbf{w}$ to eliminate floating-point drift:
$$\bar{w} = \frac{1}{n}\sum_{i=1}^n w_i, \quad w_i \leftarrow w_i - \bar{w}$$
Compute residual sum of squares $SS_w = \sum_{i=1}^n w_i^2$.
*Collinearity Fallback*: If $SS_w < 10^{-12}$ (input points were strictly collinear with $X$), synthesize an orthogonal deterministic vector:
$$w_i = \cos\left(\frac{2\pi i}{n}\right) + \begin{cases} 0.25, & i \text{ even} \\ -0.25, & i \text{ odd} \end{cases}$$
Re-orthogonalize against $\mathbf{z}_x$ and re-center.
Compute standard deviation $s_w = \sqrt{SS_w / (n - 1)}$ and normalize:
$$z_{\perp,i} = \frac{w_i}{s_w}$$
By construction:
$$\sum_{i=1}^n z_{\perp,i} = 0, \quad \frac{1}{n-1}\sum_{i=1}^n z_{\perp,i}^2 = 1, \quad \frac{1}{n-1}\sum_{i=1}^n z_{x,i} z_{\perp,i} = 0$$

#### Step 3: Affine Synthesis of Target Correlation and Moments
Form the target standardized response vector:
$$z_{y,i} = r^* z_{x,i} + \sqrt{1 - (r^*)^2} \, z_{\perp,i}$$
Map standardized coordinates to target physical moments:
$$x_i^{\text{new}} = \mu_x^* + s_x^* z_{x,i}, \quad y_i^{\text{new}} = \mu_y^* + s_y^* z_{y,i}$$

### H.3 Algebraic Proof of Exact Moment Realization
1. **Sample Means**:
   $$\bar{x}^{\text{new}} = \frac{1}{n}\sum (\mu_x^* + s_x^* z_{x,i}) = \mu_x^* + s_x^* \left(\frac{1}{n}\sum z_{x,i}\right) = \mu_x^* + 0 = \mu_x^*$$
   $$\bar{y}^{\text{new}} = \frac{1}{n}\sum (\mu_y^* + s_y^* z_{y,i}) = \mu_y^* + s_y^* \left(r^* \frac{\sum z_{x,i}}{n} + \sqrt{1 - (r^*)^2}\frac{\sum z_{\perp,i}}{n}\right) = \mu_y^*$$
2. **Sample Standard Deviations**:
   $$s_x^{\text{new}} = \sqrt{\frac{1}{n-1}\sum (x_i^{\text{new}} - \mu_x^*)^2} = \sqrt{\frac{(s_x^*)^2}{n-1}\sum z_{x,i}^2} = s_x^* \cdot 1 = s_x^*$$
   $$s_y^{\text{new}} = \sqrt{\frac{(s_y^*)^2}{n-1}\left[(r^*)^2 \sum z_{x,i}^2 + (1 - (r^*)^2)\sum z_{\perp,i}^2 + 2 r^* \sqrt{1 - (r^*)^2}\sum z_{x,i} z_{\perp,i}\right]}$$
   $$= s_y^* \sqrt{(r^*)^2(1) + (1 - (r^*)^2)(1) + 0} = s_y^* \sqrt{1} = s_y^*$$
3. **Sample Correlation**:
   $$s_{xy}^{\text{new}} = \frac{1}{n-1}\sum (x_i^{\text{new}} - \mu_x^*)(y_i^{\text{new}} - \mu_y^*) = \frac{s_x^* s_y^*}{n-1}\sum z_{x,i} \left(r^* z_{x,i} + \sqrt{1 - (r^*)^2} z_{\perp,i}\right)$$
   $$= s_x^* s_y^* \left[r^* (1) + \sqrt{1 - (r^*)^2}(0)\right] = r^* s_x^* s_y^*$$
   $$r^{\text{new}} = \frac{s_{xy}^{\text{new}}}{s_x^{\text{new}} s_y^{\text{new}}} = \frac{r^* s_x^* s_y^*}{s_x^* s_y^*} = r^*$$

*Computational Complexity*: The entire procedure executes in $O(n)$ arithmetic operations, achieving convergence to within $10^{-14}$ of machine precision in a single closed-form pass without numerical iterations.

---

## Section I: Analysis of Variance (ANOVA) and Experimental Design

### I.1 One-Way ANOVA Model
When comparing $k \ge 2$ independent treatment groups:
$$Y_{ij} = \mu + \alpha_i + \varepsilon_{ij} = \mu_i + \varepsilon_{ij}, \quad i = 1, \dots, k; \quad j = 1, \dots, n_i$$
where total sample size is $N = \sum_{i=1}^k n_i$.

#### Sums of Squares and Mean Squares
- **Total Sum of Squares ($SST$)**: $\sum_{i=1}^k \sum_{j=1}^{n_i} (y_{ij} - \bar{y}_{\bullet\bullet})^2$, with $df_T = N - 1$.
- **Between-Group Sum of Squares ($SSB$ or $SS_{\text{treatments}}$)**: $\sum_{i=1}^k n_i (\bar{y}_{i\bullet} - \bar{y}_{\bullet\bullet})^2$, with $df_B = k - 1$.
- **Within-Group Sum of Squares ($SSW$ or $SSE$)**: $\sum_{i=1}^k \sum_{j=1}^{n_i} (y_{ij} - \bar{y}_{i\bullet})^2$, with $df_W = N - k$.
- **Mean Squares**: $MSB = SSB / (k - 1)$, $MSW = SSW / (N - k)$.

#### The $F$-Test Statistic
$$F = \frac{MSB}{MSW} \sim F(k - 1, N - k) \quad \text{under } H_0: \mu_1 = \mu_2 = \dots = \mu_k$$

### I.2 Principles of Experimental Design (Fisherian Standards)
Applications supporting experimental workflows MUST document three foundational principles:
1. **Randomization**: Random assignment of experimental units to treatments balances unmeasured confounders.
2. **Replication**: Applying treatments to multiple independent units allows estimation of pure experimental error variance ($MSW$).
3. **Local Control (Blocking)**: Grouping homogeneous units into blocks reduces nuisance variability, increasing statistical power.

---

## Section J: Statistical Learning

### J.1 Supervised Learning and the Bias-Variance Trade-Off
For a regression function estimate $\hat{f}(X)$ evaluated on a test point $X = x_0$ where $Y = f(x_0) + \varepsilon$ with $\operatorname{Var}(\varepsilon) = \sigma^2$:
$$\mathbb{E}\left[(Y - \hat{f}(x_0))^2\right] = \operatorname{Bias}\left(\hat{f}(x_0)\right)^2 + \operatorname{Var}\left(\hat{f}(x_0)\right) + \sigma^2$$
- **Bias**: $\operatorname{Bias}(\hat{f}(x_0)) = \mathbb{E}[\hat{f}(x_0)] - f(x_0)$.
- **Variance**: $\operatorname{Var}(\hat{f}(x_0)) = \mathbb{E}[(\hat{f}(x_0) - \mathbb{E}[\hat{f}(x_0)])^2]$.
- **Irreducible Error**: $\sigma^2$ cannot be eliminated by any estimator.

### J.2 Resampling Validation and Data Leakage
- **Cross-Validation ($k$-fold CV)**: Partition data randomly into $k$ disjoint folds. At each iteration $v \in \{1, \dots, k\}$, train on $k - 1$ folds and evaluate test loss on fold $v$:
  $$CV_{(k)} = \frac{1}{k}\sum_{v=1}^k MSE_v$$
- **Prevention of Data Leakage (Mandatory)**: All data transformations (centering, scaling, imputation, feature selection) MUST be calculated exclusively on the training folds and applied out-of-sample to the validation/test fold. Preprocessing on the pooled dataset prior to cross-validation is strictly prohibited.

---

## Section K: Time-Series Analysis and Forecasting

### K.1 Classical Time-Series Decomposition
For time-indexed observations $\{y_t\}_{t=1}^T$:
- **Additive Decomposition**: $y_t = T_t + S_t + R_t$ (appropriate when seasonal amplitude remains constant over time).
- **Multiplicative Decomposition**: $y_t = T_t \times S_t \times R_t$ (appropriate when seasonal variations scale proportionally with trend level).
- **Components**: $T_t$ (trend-cycle), $S_t$ (seasonal component with period $m$), $R_t$ (remainder / irregular noise).

### K.2 Autocorrelation and Stationarity
- **Sample Autocovariance at Lag $k$**:
  $$\hat{\gamma}_k = \frac{1}{T}\sum_{t=k+1}^T (y_t - \bar{y})(y_{t-k} - \bar{y})$$
- **Sample Autocorrelation Function (ACF)**:
  $$\hat{r}_k = \frac{\hat{\gamma}_k}{\hat{\gamma}_0}$$
- **Bartlett's 95% Confidence Bounds**: For an i.i.d. white-noise process:
  $$\pm \frac{1.96}{\sqrt{T}}$$
- **Weak (Covariance) Stationarity**: Requires constant mean $\mathbb{E}[y_t] = \mu$ and autocovariance $\operatorname{Cov}(y_t, y_{t-k})$ dependent only on lag $k$, not on time $t$. Non-stationary series MUST be stabilized via differencing ($\nabla y_t = y_t - y_{t-1}$) or Box-Cox transformations before fitting ARMA models.

### K.3 Point Forecasts and Prediction Intervals
For forecast horizon $h \in \{1, \dots, H\}$:
- **Point Forecast**: $\hat{y}_{T+h \mid T} = \mathbb{E}[y_{T+h} \mid y_1, \dots, y_T]$.
- **Prediction Interval**: A $(1 - \alpha) \times 100\%$ prediction interval for future value $y_{T+h}$ MUST incorporate both parameter uncertainty and future error variance:
  $$\hat{y}_{T+h \mid T} \pm z_{1 - \alpha/2} \cdot \sigma_h$$
  where forecast error variance $\sigma_h^2$ strictly increases with horizon $h$.

### K.4 Forecast Accuracy Metrics
Evaluated on holdout test set $t = T+1, \dots, T+H$ with forecast errors $e_t = y_t - \hat{y}_{t \mid T}$:
- **Mean Absolute Error (MAE)**: $\frac{1}{H}\sum_{t=T+1}^{T+H} |e_t|$
- **Root Mean Squared Error (RMSE)**: $\sqrt{\frac{1}{H}\sum_{t=T+1}^{T+H} e_t^2}$
- **Mean Absolute Scaled Error (MASE)** (Hyndman and Koehler, 2006):
  $$MASE = \frac{\frac{1}{H}\sum_{t=T+1}^{T+H} |e_t|}{\frac{1}{T-1}\sum_{t=2}^T |y_t - y_{t-1}|}$$
  *Advantage*: Scale-independent, non-infinite for zero values, directly benchmarks against in-sample one-step naïve forecast.

---

## Section L: Numerical Reliability Standards

### L.1 Floating-Point Safety and Catastrophic Cancellation
- **Naive Variance Cancellation Hazard**: Computing sum of squares via $\sum x_i^2 - \frac{1}{n}(\sum x_i)^2$ can subtract two large numbers of nearly equal magnitude, resulting in catastrophic loss of precision.
- **Mandatory Algorithm**: DataSense engines MUST use either:
  1. **Two-Pass Centered Algorithm**: Compute $\bar{x} = \frac{1}{n}\sum x_i$ first, then accumulate $SS_{xx} = \sum (x_i - \bar{x})^2$.
  2. **Welford's Numerically Stable One-Pass Algorithm**:
     $$M_1 = x_1, \quad S_1 = 0$$
     For $k = 2, \dots, n$:
     $$M_k = M_{k-1} + \frac{x_k - M_{k-1}}{k}, \quad S_k = S_{k-1} + (x_k - M_{k-1})(x_k - M_k)$$
     Sample variance evaluates to $s^2 = S_n / (n - 1)$.

### L.2 Singular Systems and Numerical Safeguards
- In matrix inversion or Gaussian elimination (e.g., polynomial fits), engines MUST employ partial pivoting and test absolute pivot values against singularity threshold $\tau = 1.0 \times 10^{-11}$.
- When collinearity is detected, engines MUST NOT throw unhandled browser exceptions. They MUST gracefully return structured diagnostic warnings (e.g., `{ valid: false, code: "SINGULAR_MATRIX" }`).

---

## Section M: Statistical Software Testing Standards

Every statistical calculation engine in DataSense MUST be accompanied by automated test suites covering:
1. **Reference Value Benchmarking**: Verifying OLS outputs against NIST Statistical Reference Datasets (StRD) or certified R output to at least 8 decimal places.
2. **Property-Based Invariant Tests**:
   - $\sum e_i \equiv 0$ within $10^{-10}$.
   - Pearson $r \in [-1, 1]$.
   - $s^2 \ge 0$.
   - $0 \le R^2 \le 1$ in models with intercept.
   - Exact-moment projection matches target moments to $10^{-10}$.
3. **Edge-Case Resilience Tests**:
   - Sample size $n < 3$ returns rejection payload.
   - Constant $x$ vector ($SS_x = 0$) handles division by zero safely.
   - Non-finite inputs (`NaN`, `Infinity`) fail validation gracefully.

---

## Section N: Statistical Communication Standards

To ensure educational integrity and eliminate statistical fallacies, applications MUST adhere to these communication guidelines:
1. **Interpretation of Slope**: Always report slope within context: "For each additional 1 [unit of $X$], [response $Y$] is estimated to change by $\hat{\beta}_1$ [units of $Y$], on average."
2. **Causal versus Associational Language**:
   - For observational data, applications MUST use associational phrases ("is associated with", "correlates with", "is predictive of").
   - Applications MUST NOT use causal phrasing ("causes", "drives", "leads to", "produces") unless the dataset is explicitly tagged with experimental randomization metadata.
3. **Uncertainty Transparency**: Point estimates MUST NOT appear in isolation. They SHOULD be accompanied by standard errors, sample sizes, and confidence intervals.
