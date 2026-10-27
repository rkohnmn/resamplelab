# Probability Distribution Families Specification (`DISTRIBUTIONS.md`)

ResampleLab (`js/distributions.js`) implements 19 probability distribution families with explicit parameterizations, domain validation, exact or high-precision numerical PDF/PMF, CDF, Quantile ($F^{-1}$), moments, and random variate generation.

## 1. Discrete Distribution Families (9)

| Family | ID | Parameterization & Support | PMF $P(X = k)$ | Mean $\mathbb{E}[X]$ | Variance $\operatorname{Var}(X)$ | Sampling Algorithm |
|---|---|---|---|---|---|---|
| **Bernoulli** | `bernoulli` | $p \in [0,1]$, $k \in \{0,1\}$ | $p^k (1-p)^{1-k}$ | $p$ | $p(1-p)$ | Direct uniform threshold |
| **Binomial** | `binomial` | $n \in \mathbb{N}, p \in [0,1]$, $k \in \{0,\dots,n\}$ | $\binom{n}{k}p^k(1-p)^{n-k}$ | $np$ | $np(1-p)$ | Sum of $n$ Bernoulli trials |
| **Geometric** | `geometric` | $p \in (0,1]$, failures $k \in \{0,1,2,\dots\}$ before 1st success | $(1-p)^k p$ | $\frac{1-p}{p}$ | $\frac{1-p}{p^2}$ | Exact inversion $\lfloor \ln U / \ln(1-p) \rfloor$ |
| **Negative Binomial** | `negative_binomial` | $r \in \mathbb{N}, p \in (0,1]$, failures $k \in \{0,1,\dots\}$ before $r$-th success | $\binom{k+r-1}{k}p^r(1-p)^k$ | $\frac{r(1-p)}{p}$ | $\frac{r(1-p)}{p^2}$ | Sum of $r$ independent $\operatorname{Geom}(p)$ draws |
| **Hypergeometric** | `hypergeometric` | $N, K, n \in \mathbb{N}$, $k \in [\max(0, n+K-N), \min(n,K)]$ | $\frac{\binom{K}{k}\binom{N-K}{n-k}}{\binom{N}{n}}$ | $n\frac{K}{N}$ | $n\frac{K}{N}\frac{N-K}{N}\frac{N-n}{N-1}$ | Sequential conditional depletion without replacement |
| **Poisson** | `poisson` | $\lambda > 0$, $k \in \{0,1,2,\dots\}$ | $\frac{e^{-\lambda}\lambda^k}{k!}$ | $\lambda$ | $\lambda$ | Knuth exact ($\lambda < 30$) / Atkinson rejection ($\lambda \ge 30$) |
| **Discrete Uniform** | `discrete_uniform` | Integers $a \le b$, $m = b - a + 1$ | $1/m$ | $\frac{a+b}{2}$ | $\frac{m^2 - 1}{12}$ | Direct integer scaling |
| **Custom Finite Discrete** | `custom_discrete` | User support $\{x_k\}$ and weights $\{w_k \ge 0\}$ | $p_k = w_k / \sum w_j$ | $\sum x_k p_k$ | $\sum (x_k - \mu)^2 p_k$ | Cumulative probability table inversion |
| **Empirical ($\hat{F}_n$)** | `empirical_discrete` | Observed sample $\{x_1, \dots, x_n\}$ | $\frac{1}{n}\sum_{i=1}^n \mathbb{I}(x_i = k)$ | $\bar{x}$ | $\frac{1}{n}\sum (x_i - \bar{x})^2$ | Uniform index draw $I \sim \operatorname{DUnif}(1, n)$ |

## 2. Continuous Distribution Families (10)

| Family | ID | Parameterization & Support | Density $f(x)$ | Mean $\mathbb{E}[X]$ | Variance $\operatorname{Var}(X)$ | Sampling & Special Function Notes |
|---|---|---|---|---|---|---|
| **Continuous Uniform** | `continuous_uniform` | $a < b$, $x \in [a,b]$ | $\frac{1}{b-a}$ | $\frac{a+b}{2}$ | $\frac{(b-a)^2}{12}$ | $a + U(b-a)$ |
| **Normal (Gaussian)** | `normal` | $\mu \in \mathbb{R}, \sigma > 0$, $x \in \mathbb{R}$ | $\frac{1}{\sigma\sqrt{2\pi}}e^{-\frac{(x-\mu)^2}{2\sigma^2}}$ | $\mu$ | $\sigma^2$ | Marsaglia polar Box-Muller; Acklam inverse CDF |
| **Student's $t$** | `student_t` | $\nu > 0$ df, $x \in \mathbb{R}$ | $\frac{\Gamma((\nu+1)/2)}{\sqrt{\nu\pi}\Gamma(\nu/2)}(1+\frac{x^2}{\nu})^{-\frac{\nu+1}{2}}$ | $0$ ($\nu > 1$) | $\frac{\nu}{\nu-2}$ ($\nu > 2$) | $Z / \sqrt{V/\nu}$ with $V \sim \chi^2(\nu)$; Lentz $I_x(\nu/2, 1/2)$ |
| **Exponential** | `exponential` | Rate $\lambda > 0$, $x \ge 0$ | $\lambda e^{-\lambda x}$ | $1/\lambda$ | $1/\lambda^2$ | Exact inversion $-\ln(U)/\lambda$ |
| **Gamma** | `gamma` | Shape $\alpha > 0$, Scale $\theta > 0$ ($\text{rate}=1/\theta$), $x \ge 0$ | $\frac{x^{\alpha-1}e^{-x/\theta}}{\Gamma(\alpha)\theta^\alpha}$ | $\alpha\theta$ | $\alpha\theta^2$ | Marsaglia & Tsang (2000) exact rejection; $P(\alpha, x/\theta)$ |
| **Beta** | `beta` | Shapes $\alpha > 0, \beta > 0$, $x \in [0,1]$ | $\frac{x^{\alpha-1}(1-x)^{\beta-1}}{B(\alpha,\beta)}$ | $\frac{\alpha}{\alpha+\beta}$ | $\frac{\alpha\beta}{(\alpha+\beta)^2(\alpha+\beta+1)}$ | $G_1/(G_1+G_2)$ from independent Gamma draws |
| **Chi-Square** | `chi_square` | $k > 0$ df, $x \ge 0$ | $\frac{x^{k/2-1}e^{-x/2}}{2^{k/2}\Gamma(k/2)}$ | $k$ | $2k$ | $2 \times \operatorname{Gamma}(k/2, 1)$ |
| **Snedecor's $F$** | `f_distribution` | $d_1 > 0, d_2 > 0$ df, $x \ge 0$ | $\frac{\sqrt{\frac{(d_1 x)^{d_1} d_2^{d_2}}{(d_1 x + d_2)^{d_1+d_2}}}}{x B(d_1/2, d_2/2)}$ | $\frac{d_2}{d_2-2}$ ($d_2 > 2$) | $\frac{2d_2^2(d_1+d_2-2)}{d_1(d_2-2)^2(d_2-4)}$ | Ratio of scaled independent Gamma draws |
| **Lognormal** | `lognormal` | $\mu_{\log} \in \mathbb{R}, \sigma_{\log} > 0$, $x > 0$ | $\frac{1}{x\sigma_{\log}\sqrt{2\pi}}e^{-\frac{(\ln x - \mu_{\log})^2}{2\sigma_{\log}^2}}$ | $e^{\mu_{\log}+\sigma_{\log}^2/2}$ | $(e^{\sigma_{\log}^2}-1)e^{2\mu_{\log}+\sigma_{\log}^2}$ | $\exp(\mu_{\log} + \sigma_{\log} Z)$ |
| **Gaussian Mixture** | `gaussian_mixture` | $w \in [0,1], \mu_1, \sigma_1, \mu_2, \sigma_2$ | $w\phi_1(x) + (1-w)\phi_2(x)$ | $w\mu_1 + (1-w)\mu_2$ | Law of total variance | Two-stage mixture component selection |
