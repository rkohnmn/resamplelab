/**
 * ResampleLab — Guided Investigations & Reproducible Classroom Exercises
 *
 * Implements Part 15: 12 interactive, reproducible lessons with live studio
 * launches, mathematical derivations, and verification checkpoints.
 *
 * @module investigations
 * @version 1.1.0
 */

export const GUIDED_INVESTIGATIONS = [
  {
    id: "inv_01_sample_means_vary",
    number: 1,
    title: "Why Do Sample Averages Vary From Sample to Sample?",
    targetStudio: "sampling",
    difficulty: "Beginner",
    seed: 10101,
    presetConfig: {
      distId: "normal",
      distParams: { mu: 50, sigma: 12 },
      sampleSize: 16,
      replicates: 500
    },
    objective: "Distinguish between the fixed population parameter $\\mu$, raw observation spread $\\sigma$, and the sample-to-sample standard error $SE(\\bar{X})$.",
    explanation: "Each random sample of size $n = 16$ captures a different subset of individuals. Even when the population mean is fixed at $\\mu = 50$, individual sample means $\\bar{x}$ fluctuate around $50$ with spread $SE = \\frac{\\sigma}{\\sqrt{n}}$.",
    experimentSteps: [
      "Click 'Launch Configured Experiment' to open the Sampling Lab with $\\mathcal{N}(\\mu = 50, \\sigma = 12)$ and $n = 16$.",
      "Click 'Draw 1 Sample' three times and watch the middle panel (Single Sample) and its sample mean marker $\\bar{x}$.",
      "Click 'Run B Samples' to build the Sampling Distribution of $\\bar{X}$ in Stage 3."
    ],
    question: "When $\\sigma = 12$ and $n = 16$, what is the theoretical standard error $SE(\\bar{X})$ of the sample mean?",
    options: [
      { id: "a", text: "$SE(\\bar{X}) = \\frac{12}{\\sqrt{16}} = 3.0$, which is 4 times narrower than the population SD ($\\sigma = 12$).", correct: true },
      { id: "b", text: "$SE(\\bar{X}) = 12$, identical to the population SD $\\sigma$.", correct: false },
      { id: "c", text: "$SE(\\bar{X}) = \\frac{12}{16} = 0.75$, shrinking linearly with $n$.", correct: false }
    ],
    feedbackCorrect: "Spot on! Averaging $n = 16$ independent draws cancels random highs and lows, reducing standard deviation to $SE(\\bar{X}) = \\frac{\\sigma}{\\sqrt{n}} = \\frac{12}{4} = 3.0$.",
    feedbackIncorrect: "Apply the square-root law: $\\text{Var}(\\bar{X}) = \\frac{\\sigma^2}{n}$, so $SE(\\bar{X}) = \\frac{\\sigma}{\\sqrt{n}} = \\frac{12}{\\sqrt{16}} = 3.0$.",
    mathExplanation: "$$E[\\bar{X}] = \\mu = 50, \\qquad SE(\\bar{X}) = \\sqrt{\\text{Var}\\left(\\frac{1}{n}\\sum_{i=1}^{n} X_i\\right)} = \\frac{\\sigma}{\\sqrt{n}} = \\frac{12}{\\sqrt{16}} = 3.0$$",
    relatedAtlasIds: ["pop_vs_sample", "sampling_distribution_concept", "sd_vs_se"]
  },
  {
    id: "inv_02_quadruple_n_halve_se",
    number: 2,
    title: "Does Doubling Sample Size Halve the Standard Error?",
    targetStudio: "sampling",
    difficulty: "Beginner",
    seed: 20202,
    presetConfig: {
      distId: "normal",
      distParams: { mu: 100, sigma: 20 },
      sampleSize: 25,
      replicates: 1000
    },
    objective: "Verify the inverse square-root law $SE(\\bar{X}) = \\frac{\\sigma}{\\sqrt{n}}$ and see why halving uncertainty requires quadrupling $n$.",
    explanation: "Because independent variances add linearly, standard deviation scales with $\\sqrt{n}$. Cutting standard error in half requires multiplying sample size by $4$.",
    experimentSteps: [
      "Launch at $n = 25$ ($\\sigma = 20$) and note $SE \\approx \\frac{20}{5} = 4.0$.",
      "Slide sample size to $n = 50$ (doubling $n$): $SE$ drops to $\\frac{20}{\\sqrt{50}} \\approx 2.83$, not $2.0$.",
      "Slide sample size to $n = 100$ (quadrupling $n$): $SE$ drops to $\\frac{20}{\\sqrt{100}} = 2.0$."
    ],
    question: "To cut the standard error (or confidence interval width) in half, by what factor must you multiply sample size $n$?",
    options: [
      { id: "a", text: "Multiply sample size $n$ by $2$.", correct: false },
      { id: "b", text: "Multiply sample size $n$ by $4$ (since $\\sqrt{4} = 2$).", correct: true },
      { id: "c", text: "Increase simulation replicates $B$ by $4$.", correct: false }
    ],
    feedbackCorrect: "Correct! Replacing $n$ with $4n$ gives $SE(\\bar{X}_{4n}) = \\frac{\\sigma}{\\sqrt{4n}} = \\frac{1}{2}\\frac{\\sigma}{\\sqrt{n}}$.",
    feedbackIncorrect: "Since $\\sqrt{n}$ is in the denominator, dividing $SE$ by $2$ requires $\\sqrt{n_{\\text{new}}} = 2\\sqrt{n} \\implies n_{\\text{new}} = 4n$.",
    mathExplanation: "$$\\frac{SE(\\bar{X}_{4n})}{SE(\\bar{X}_n)} = \\frac{\\sigma / \\sqrt{4n}}{\\sigma / \\sqrt{n}} = \\frac{1}{\\sqrt{4}} = \\frac{1}{2}$$",
    relatedAtlasIds: ["sd_vs_se", "expectation_variance"]
  },
  {
    id: "inv_03_skewness_clt",
    number: 3,
    title: "How Does Population Skewness Affect the Central Limit Theorem?",
    targetStudio: "sampling",
    difficulty: "Intermediate",
    seed: 30303,
    presetConfig: {
      distId: "lognormal",
      distParams: { muLog: 0.5, sigmaLog: 0.75 },
      sampleSize: 6,
      replicates: 1500
    },
    objective: "Observe how population skewness $\\gamma_1(X)$ slows CLT convergence at small $n$ and bends the Normal Q-Q plot.",
    explanation: "When the population is strongly right-skewed (Lognormal or Exponential), small-sample averages $\\bar{X}$ inherit right skewness $\\gamma_1(\\bar{X}) = \\frac{\\gamma_1(X)}{\\sqrt{n}}$.",
    experimentSteps: [
      "Launch the Lognormal CLT experiment at $n = 6$ and inspect the Sampling Distribution and Normal Q-Q plot.",
      "Increase $n$ to $25$, then $80$, and watch the skewness of $\\bar{X}$ decay toward $0$ as the Q-Q points straighten."
    ],
    question: "What happens to the sampling distribution of $\\bar{X}$ when $n$ increases from $6$ to $80$ for a right-skewed Lognormal population?",
    options: [
      { id: "a", text: "The raw sample data $X_i$ become normally distributed.", correct: false },
      { id: "b", text: "The sampling distribution of $\\bar{X}$ becomes progressively more bell-shaped with skewness shrinking at rate $1/\\sqrt{n}$.", correct: true },
      { id: "c", text: "The mean of the sampling distribution shifts to $0$.", correct: false }
    ],
    feedbackCorrect: "Exactly! Raw data continue to follow the skewed Lognormal population, while the sample mean's skewness shrinks as $\\gamma_1(X)/\\sqrt{n}$.",
    feedbackIncorrect: "Individual observations $X_i$ always mirror the skewed population $F$; only the average $\\bar{X}$ becomes symmetric as $n$ grows.",
    mathExplanation: "$$\\gamma_1(\\bar{X}_n) = \\frac{\\gamma_1(X)}{\\sqrt{n}} \\xrightarrow{n\\to\\infty} 0, \\qquad \\frac{\\bar{X}_n - \\mu}{\\sigma/\\sqrt{n}} \\xrightarrow{d} \\mathcal{N}(0, 1)$$",
    relatedAtlasIds: ["clt_theorem", "sampling_distribution_concept"]
  },
  {
    id: "inv_04_bootstrap_with_replacement",
    number: 4,
    title: "Why Must the Bootstrap Sample WITH Replacement?",
    targetStudio: "bootstrap",
    difficulty: "Beginner",
    seed: 40404,
    presetConfig: {
      presetId: "skewed_repair_times",
      statisticId: "mean",
      replicates: 2000,
      confLevel: 0.95
    },
    objective: "Understand why drawing $n$ items from $n$ WITHOUT replacement gives zero variability, whereas sampling WITH replacement draws i.i.d. from $\\hat{F}_n$.",
    explanation: "Drawing $n = 24$ observations from $n = 24$ without replacement simply reorders the exact same $24$ numbers every time, leaving $\\bar{x}^*$ constant!",
    experimentSteps: [
      "Launch Bootstrap Studio on Telecom Repair Times ($n = 24$).",
      "Expand 'Inspect Individual Bootstrap Resamples' to see repeated and omitted values in each draw.",
      "Verify that $B = 2{,}000$ resamples WITH replacement yield $\\widehat{SE}_{\\text{boot}} \\approx 1.24\\text{ hr}$."
    ],
    question: "If you drew resamples of size $n$ from a sample of size $n$ WITHOUT replacement, what would the bootstrap standard error of the mean be?",
    options: [
      { id: "a", text: "Exactly $0$, because every resample contains the exact same $n$ numbers and has mean $\\bar{x}^* = \\bar{x}$.", correct: true },
      { id: "b", text: "Equal to $s / \\sqrt{n}$.", correct: false },
      { id: "c", text: "Twice as large as sampling with replacement.", correct: false }
    ],
    feedbackCorrect: "Precisely! Sampling $n$ of $n$ without replacement just permutes the sample ($\\text{FPC} = \\sqrt{(n-n)/(n-1)} = 0$). Sampling WITH replacement draws i.i.d. from $\\hat{F}_n$.",
    feedbackIncorrect: "Picking all $n$ items out of a bag of $n$ items without replacement always gives the exact same set of numbers, so $\\bar{x}^*$ never changes!",
    mathExplanation: "$$X_1^*, \\dots, X_n^* \\stackrel{\\text{i.i.d.}}{\\sim} \\hat{F}_n(x) = \\frac{1}{n}\\sum_{i=1}^{n} I(x_i \\le x) \\implies \\text{Var}_*(\\bar{X}^*) = \\frac{\\hat{\\sigma}^2}{n} > 0$$",
    relatedAtlasIds: ["nonparametric_bootstrap", "srswr_vs_srswor_fpc"]
  },
  {
    id: "inv_05_bootstrap_vs_null_centers",
    number: 5,
    title: "Why Are Bootstrap and Permutation Null Distributions Centered Differently?",
    targetStudio: "unity",
    difficulty: "Beginner",
    seed: 50505,
    presetConfig: {
      mu1: 55,
      mu2: 50,
      sigma: 8,
      n1: 25,
      n2: 25,
      replicates: 1500
    },
    objective: "Contrast what is fixed vs randomized in Bootstrap Confidence Intervals vs Permutation Hypothesis Tests.",
    explanation: "Bootstrap resamples WITH replacement within each group (centered at observed $\\hat{\\theta}$). Permutation shuffles labels WITHOUT replacement across pooled groups (centered at null $0$).",
    experimentSteps: [
      "Launch 'One Dataset, Different Questions' (Destination 7).",
      "Compare Stage 2 (Bootstrap Distribution) and Stage 3 (Permutation Null Distribution) on the shared horizontal axis."
    ],
    question: "When the observed group difference is $\\bar{x}_1 - \\bar{x}_2 = +5.2$, where are the Bootstrap and Permutation distributions centered?",
    options: [
      { id: "a", text: "Both are centered at $0.0$.", correct: false },
      { id: "b", text: "Bootstrap centers near $+5.2$ (observed estimate) to build a CI; Permutation centers at $0.0$ to test $H_0: \\mu_1 - \\mu_2 = 0$.", correct: true },
      { id: "c", text: "Bootstrap centers at $+5.0$ (true parameter) and Permutation centers at $+5.2$.", correct: false }
    ],
    feedbackCorrect: "Bravo! Bootstrap preserves group membership to measure uncertainty around $\\hat{\\theta} = +5.2$, while Permutation breaks group labels to simulate $H_0: \\mu_1 - \\mu_2 = 0$.",
    feedbackIncorrect: "Bootstrap resamples within groups (centered at observed $+5.2$); Permutation scrambles group labels across pooled data (centered at null $0.0$).",
    mathExplanation: "$$E_*\\left[\\bar{X}_1^* - \\bar{X}_2^* \\mid S\\right] = \\bar{x}_1 - \\bar{x}_2, \\qquad E_{\\text{perm}}\\left[\\bar{X}_1^{\\text{perm}} - \\bar{X}_2^{\\text{perm}} \\mid H_0\\right] = 0$$",
    relatedAtlasIds: ["unity_three_distributions", "nonparametric_bootstrap", "permutation_randomization_tests"]
  },
  {
    id: "inv_06_replicates_b_vs_n",
    number: 6,
    title: "Sample Size (n) vs Replicate Count (B): What Does Increasing B Change?",
    targetStudio: "bootstrap",
    difficulty: "Intermediate",
    seed: 60606,
    presetConfig: {
      presetId: "mercury_fish_levels",
      statisticId: "mean",
      replicates: 200,
      confLevel: 0.95
    },
    objective: "Separate real-world sampling error ($1/\\sqrt{n}$) from Monte Carlo simulation noise ($1/\\sqrt{B}$).",
    explanation: "Running $B = 10{,}000$ bootstrap resamples instead of $B = 200$ does NOT narrow the confidence interval or compensate for a small sample $n = 18$.",
    experimentSteps: [
      "Launch Bootstrap Studio on Lake Trout Mercury ($n = 18$) at $B = 200$ and note $\\widehat{SE}_{\\text{boot}} \\approx 0.083\\text{ ppm}$.",
      "Increase $B$ to $5{,}000$, click 'Run Bootstrap', and compare $\\widehat{SE}_{\\text{boot}}$."
    ],
    question: "When you increase replicates from $B = 200$ to $B = 5{,}000$ on the same $n = 18$ dataset, what happens to $\\widehat{SE}_{\\text{boot}}$?",
    options: [
      { id: "a", text: "$\\widehat{SE}_{\\text{boot}}$ shrinks by a factor of $5$ (since $\\sqrt{5000/200} = 5$).", correct: false },
      { id: "b", text: "$\\widehat{SE}_{\\text{boot}}$ stays near $0.083\\text{ ppm}$, while Monte Carlo jitter of the histogram and CI endpoints smooths out.", correct: true },
      { id: "c", text: "$\\widehat{SE}_{\\text{boot}}$ grows larger.", correct: false }
    ],
    feedbackCorrect: "Exactly! Statistical spread is governed by data size $n = 18$. Increasing $B$ only refines our numerical approximation of the bootstrap distribution.",
    feedbackIncorrect: "Only collecting more real observations ($n$) shrinks $SE$. Increasing $B$ reduces Monte Carlo simulation noise around the fixed-sample bootstrap limit.",
    mathExplanation: "$$\\lim_{B\\to\\infty} \\widehat{SE}_{\\text{boot}}(B) = \\sqrt{\\frac{n-1}{n}}\\,\\frac{s}{\\sqrt{n}} > 0 \\qquad (\\text{governed by } n, \\text{ not } B)$$",
    relatedAtlasIds: ["monte_carlo_error", "nonparametric_bootstrap"]
  },
  {
    id: "inv_07_ci_coverage_misses",
    number: 7,
    title: "What Happens When a 95% Confidence Interval Misses the Parameter?",
    targetStudio: "experiments",
    difficulty: "Beginner",
    seed: 70707,
    presetConfig: {
      expTab: "coverage",
      distId: "normal",
      distParams: { mu: 10, sigma: 3 },
      sampleSize: 25,
      numStudies: 100,
      confLevel: 0.95
    },
    objective: "Visualize frequentist coverage across $100$ repeated studies and see why $\\approx 5\\%$ of valid $95\\%$ intervals miss fixed $\\mu$.",
    explanation: "In the Experiment Simulator, $\\mu = 10$ is fixed. Each vertical segment is a random interval $[L_m, U_m]$ from an independent sample of size $n = 25$.",
    experimentSteps: [
      "Launch the Coverage Simulator ($\\mathcal{N}(10, 3^2)$, $n = 25$, $100$ studies).",
      "Inspect the caterpillar plot: emerald intervals capture $\\mu = 10$, while vermilion intervals miss.",
      "Switch Population Shape to Lognormal at $n = 8$ to see skewness cause under-coverage."
    ],
    question: "Why do roughly $5$ out of $100$ intervals fail to cross the horizontal parameter line $\\mu = 10$?",
    options: [
      { id: "a", text: "Because of a rounding bug on those 5 samples.", correct: false },
      { id: "b", text: "Because random sampling occasionally yields an extreme $\\bar{x}$, and a $95\\%$ procedure is calibrated to capture $\\mu$ in $95\\%$ of repeated samples ($\\alpha = 5\\%$ miss rate).", correct: true },
      { id: "c", text: "Because the true parameter $\\mu$ jumped outside those intervals.", correct: false }
    ],
    feedbackCorrect: "Well reasoned! A $95\\%$ confidence procedure guarantees $95\\%$ long-run coverage across repeated samples, which entails a $5\\%$ long-run miss rate.",
    feedbackIncorrect: "Remember: $\\mu = 10$ is constant. By definition, a $1 - \\alpha = 0.95$ interval procedure misses in $\\alpha = 5\\%$ of random samples.",
    mathExplanation: "$$P_\\mu\\left(\\bar{X} - t_{\\alpha/2, n-1}\\frac{S}{\\sqrt{n}} \\le \\mu \\le \\bar{X} + t_{\\alpha/2, n-1}\\frac{S}{\\sqrt{n}}\\right) = 1 - \\alpha = 0.95$$",
    relatedAtlasIds: ["ci_frequentist_coverage", "bootstrap_ci_comparison"]
  },
  {
    id: "inv_08_large_n_tiny_effect",
    number: 8,
    title: "Statistical Significance vs Practical Importance in Large Samples",
    targetStudio: "experiments",
    difficulty: "Intermediate",
    seed: 80808,
    presetConfig: {
      expTab: "power",
      sampleSize: 150,
      effectSize: 0.25,
      sd: 1.0,
      alpha: 0.05,
      numTrials: 400
    },
    objective: "See why a tiny $p$-value ($p < 0.05$) does not imply a large or practically meaningful effect when sample size $n$ is large.",
    explanation: "Because $SE \\propto 1/\\sqrt{n}$, a huge sample size turns even a tiny shift $\\delta$ into a large test statistic $|t| = \\frac{|\\hat{\\delta}|}{SE}$ and a tiny $p$-value.",
    experimentSteps: [
      "Launch the Power Simulator with a small standardized shift $\\delta = 0.25$ ($\\sigma = 1.0$).",
      "Compare empirical power at $n = 15$ per group ($\\approx 10\\%$) vs $n = 150$ per group ($> 55\\%$).",
      "Always inspect both the $p$-value and the effect-size confidence interval."
    ],
    question: "A trial of $n = 5{,}000$ patients finds a drug lowers systolic BP by $0.4\\text{ mmHg}$ ($95\\%\\text{ CI } [0.15, 0.65]$, $p = 0.002$). What is the valid conclusion?",
    options: [
      { id: "a", text: "Because $p = 0.002$, the drug produces a massive clinical benefit.", correct: false },
      { id: "b", text: "There is strong statistical evidence of a non-zero effect, but the magnitude ($0.4\\text{ mmHg}$) is practically negligible.", correct: true },
      { id: "c", text: "The $p$-value is invalid when $n > 1{,}000$.", correct: false }
    ],
    feedbackCorrect: "Spot on! The $p$-value measures evidence against zero effect (scaling with $\\sqrt{n}$), whereas the confidence interval $[0.15, 0.65]\\text{ mmHg}$ shows practical magnitude.",
    feedbackIncorrect: "Since $t = \\frac{\\hat{\\delta}}{s\\sqrt{2/n}}$, huge $n$ makes the denominator tiny, yielding a small $p$-value even for a trivial $0.4\\text{ mmHg}$ shift.",
    mathExplanation: "$$T_n = \\frac{\\bar{X}_1 - \\bar{X}_2}{s_p\\sqrt{2/n}} = \\sqrt{\\frac{n}{2}}\\,\\hat{d} \\implies |T_n| \\xrightarrow{n\\to\\infty} \\infty \\text{ for any fixed } \\delta \\neq 0$$",
    relatedAtlasIds: ["pvalue_interpretation", "type1_type2_power"]
  },
  {
    id: "inv_09_pvalue_not_prob_null",
    number: 9,
    title: "Why Is a p-Value NOT the Probability That the Null Hypothesis Is True?",
    targetStudio: "experiments",
    difficulty: "Intermediate",
    seed: 90909,
    presetConfig: {
      expTab: "power",
      sampleSize: 30,
      effectSize: 0.0,
      sd: 1.0,
      alpha: 0.05,
      numTrials: 500
    },
    objective: "Verify under a $100\\%$ true null hypothesis ($\\delta = 0$) that $p < 0.05$ still occurs in $5\\%$ of studies.",
    explanation: "When we set true shift $\\delta = 0.0$, $H_0$ is $100\\%$ true in every simulated study ($P(H_0) = 1$), yet $5\\%$ of random samples yield $p < 0.05$.",
    experimentSteps: [
      "Launch the Power Simulator with True Effect Shift $\\delta = 0.0$ (so $H_0$ holds strictly).",
      "Inspect the Null Type I Rate ($\\hat{\\alpha} \\approx 5.0\\%$): roughly $1$ in $20$ studies gets $p < 0.05$ by chance alone."
    ],
    question: "In a simulation where $\\delta = 0.0$ ($H_0$ is $100\\%$ true), $5\\%$ of studies obtain $p < 0.05$. What does this show about $p = 0.03$?",
    options: [
      { id: "a", text: "$p = 0.03$ means there is a $3\\%$ probability that $H_0$ is true.", correct: false },
      { id: "b", text: "$p = 0.03$ is $P(|T| \\ge |t_{\\text{obs}}| \\mid H_0)$, NOT $P(H_0 \\mid \\text{Data})$. Even when $H_0$ is $100\\%$ true, $p \\le 0.03$ occurs in $3\\%$ of samples.", correct: true },
      { id: "c", text: "The test is broken when $\\delta = 0$.", correct: false }
    ],
    feedbackCorrect: "Exactly! Under a continuous true null $H_0$, the $p$-value follows $\\text{Uniform}(0, 1)$, so $P(p \\le \\alpha \\mid H_0) = \\alpha$.",
    feedbackIncorrect: "Here $P(H_0 \\text{ is true}) = 100\\%$, yet $p \\le 0.03$ occurs in $3\\%$ of samples—proving $p$ is $P(\\text{Data} \\mid H_0)$, not $P(H_0 \\mid \\text{Data})$.",
    mathExplanation: "$$P \\sim \\text{Uniform}(0, 1) \\text{ under } H_0 \\implies P(p \\le \\alpha \\mid H_0) = \\alpha \\neq P(H_0 \\mid p \\le \\alpha)$$",
    relatedAtlasIds: ["pvalue_interpretation", "conditional_bayes", "type1_type2_power"]
  },
  {
    id: "inv_10_paired_vs_independent_trap",
    number: 10,
    title: "What Goes Wrong When Paired Data Are Analyzed as Two Independent Samples?",
    targetStudio: "permutation",
    difficulty: "Intermediate",
    seed: 11011,
    presetConfig: {
      presetId: "wetsuit_swim_paired",
      statisticId: "paired_mean_diff",
      replicates: 2000,
      useExactIfAvailable: true
    },
    objective: "Observe how preserving within-subject pairing eliminates between-subject variance and boosts precision.",
    explanation: "In the Triathlon Wetsuit dataset ($n = 12$ swimmers), swimmers differ widely in baseline speed ($1.12\\text{ to }1.75\\text{ m/s}$), but EVERY swimmer is faster in the wetsuit ($\\bar{d} = +0.0775\\text{ m/s}$).",
    experimentSteps: [
      "Launch Permutation Studio on Triathlon Wetsuit Velocity ($n = 12$ pairs).",
      "Inspect the exact paired sign-flip test ($2^{12} = 4{,}096$ sign configurations) and paired $t$-test ($SE(\\bar{d}) = 0.0063\\text{ m/s}, t = 12.31$).",
      "Note that ignoring pairing inflates $SE$ nearly $10\\times$ by mixing between-swimmer variance into the error term."
    ],
    question: "Why does paired randomization flip signs $d_i^* = \\pm d_i$ within each swimmer rather than shuffling all $24$ velocities across swimmers?",
    options: [
      { id: "a", text: "Because treatment order was randomized within each swimmer, making $(X_i, Y_i)$ exchangeable within Swimmer $i$ under $H_0$.", correct: true },
      { id: "b", text: "To make the $p$-value larger.", correct: false },
      { id: "c", text: "Because $n < 30$.", correct: false }
    ],
    feedbackCorrect: "Spot on! Randomization happened within each swimmer, so valid randomization inference swaps conditions within each pair ($d_i \\leftrightarrow -d_i$).",
    feedbackIncorrect: "Swimmers have different baseline speeds; shuffling across swimmers contaminates the treatment contrast with between-swimmer heterogeneity.",
    mathExplanation: "$$\\text{Var}(X - Y) = \\sigma_X^2 + \\sigma_Y^2 - 2\\rho\\sigma_X\\sigma_Y \\ll \\sigma_X^2 + \\sigma_Y^2 \\quad (\\text{when } \\rho > 0)$$",
    relatedAtlasIds: ["resampling_units_preserve", "permutation_randomization_tests"]
  },
  {
    id: "inv_11_optional_stopping_peeking",
    number: 11,
    title: "How Does Unplanned 'Data Peeking' (Optional Stopping) Inflate False Positives?",
    targetStudio: "experiments",
    difficulty: "Advanced",
    seed: 12012,
    presetConfig: {
      expTab: "peeking",
      maxN: 60,
      peekEvery: 5,
      alpha: 0.05,
      numStudies: 300
    },
    objective: "Demonstrate how repeatedly testing accumulating data and stopping when $p < 0.05$ inflates Type I error far above $\\alpha = 5\\%$.",
    explanation: "When $H_0$ is true, testing after every $k = 5$ observations up to $N_{\\max} = 60$ gives the random walk $|T_n|$ multiple chances to cross $1.96$ by luck.",
    experimentSteps: [
      "Launch the Experiment Simulator in Optional Stopping (Peeking) mode.",
      "Compare Fixed-Horizon Type I error ($\\approx 5\\%$) against Repeated-Peeking Type I error ($\\approx 16\\%\\text{–}19\\%$).",
      "Slide 'Peek Every $k$ Observations' to $1$ and watch false positives climb past $22\\%$."
    ],
    question: "Why does checking $p < 0.05$ repeatedly as observations arrive inflate the false-positive rate above $5\\%$?",
    options: [
      { id: "a", text: "Each peek gives the random walk $|T_n|$ another opportunity to cross the critical threshold by chance.", correct: true },
      { id: "b", text: "The sample mean becomes biased when inspected.", correct: false },
      { id: "c", text: "Student's $t$ distribution requires $n > 100$.", correct: false }
    ],
    feedbackCorrect: "Exactly! Unadjusted sequential peeking is multiple testing across time; valid sequential designs require $\\alpha$-spending boundaries.",
    feedbackIncorrect: "Testing at $n = 5, 10, \\dots, 60$ rejects whenever $\\max_k |T_{n_k}| > t_{\\text{crit}}$, which happens much more often than a single test at $N_{\\max}$.",
    mathExplanation: "$$P\\left(\\max_{k \\in \\{1,\\dots,K\\}} |T_{n_k}| \\ge t_{1-\\alpha/2} \\;\\middle|\\; H_0\\right) > P\\left(|T_{N_{\\max}}| \\ge t_{1-\\alpha/2} \\;\\middle|\\; H_0\\right) = \\alpha$$",
    relatedAtlasIds: ["type1_type2_power", "multiple_testing_fwer_fdr"]
  },
  {
    id: "inv_12_dependent_data_bootstrap_failure",
    number: 12,
    title: "Why Does Ordinary i.i.d. Bootstrap Fail on Dependent Time-Series Data?",
    targetStudio: "bootstrap",
    difficulty: "Advanced",
    seed: 13013,
    presetConfig: {
      presetId: "dependent_ar1_sensor_series",
      statisticId: "mean",
      replicates: 2000,
      confLevel: 0.95
    },
    objective: "Observe Acceptance Scenario 9: see why naive i.i.d. resampling on autocorrelated data understates true uncertainty.",
    explanation: "In a positively autocorrelated series ($\\phi_1 = 0.85$), consecutive observations move together in slow waves, so effective sample size is much smaller than $n$.",
    experimentSteps: [
      "Launch Bootstrap Studio with the 'Autocorrelated Sensor Stream' preset (`dependent_ar1_sensor_series`).",
      "Inspect the `[DEPENDENT_DATA_IID_BOOTSTRAP]` diagnostic callout banner.",
      "Review why scrambling time order destroys serial correlation $\\phi_1$."
    ],
    question: "What happens when you apply an ordinary i.i.d. case bootstrap to positively autocorrelated time-series data?",
    options: [
      { id: "a", text: "Scrambling individual points destroys positive autocorrelation and yields an artificially small $\\widehat{SE}_{\\text{boot}}$ (overconfident intervals).", correct: true },
      { id: "b", text: "It automatically preserves time order.", correct: false },
      { id: "c", text: "It produces intervals that are too wide.", correct: false }
    ],
    feedbackCorrect: "Spot on! Positive autocorrelation inflates $\\text{Var}(\\bar{X})$ by $\\frac{1+\\phi}{1-\\phi}$, which naive i.i.d. resampling misses completely.",
    feedbackIncorrect: "Positive autocorrelation reduces effective sample size; scrambling points treats them as independent and underestimates true $SE$.",
    mathExplanation: "$$\\text{Var}_{\\text{AR(1)}}(\\bar{X}_n) \\approx \\frac{\\sigma^2}{n}\\left(\\frac{1 + \\phi}{1 - \\phi}\\right) \\gg \\frac{s^2}{n} = \\text{Var}_{*\\text{,iid}}(\\bar{X}^*)$$",
    relatedAtlasIds: ["dependent_block_cluster_bootstrap", "bootstrap_limitations_diagnostics"]
  }
];
