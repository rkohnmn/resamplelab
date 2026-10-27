# DataSense Visualization Standards Specification

**Document Version:** 1.0.0  
**Status:** Canonical Standard  
**Applies to:** VisualGrammar, QuartetLab, ResampleLab, ForecastLab, and DataSense Studio Core  
**Governing Authority:** DataSense Data Visualization & Graphical Perception Committee  

---

## 1. Scope and Objective

This specification establishes the canonical visual, perceptual, cognitive, and interactive standards governing all statistical graphics across the DataSense Studio ecosystem. Visualizations in DataSense software are not decorative illustrations; they are precision instruments for exploratory analysis, statistical diagnostics, uncertainty quantification, and pedagogical communication.

Every chart rendered in DataSense software MUST strictly adhere to the data-type encoding rules, perceptual hierarchies, graphical integrity constraints, and interaction contracts detailed in this document.

---

## Section A: Data-Type Taxonomy

Statistical visualization integrity begins with precise taxonomy of variable types. Graphical encodings MUST be constrained by the mathematical scale of measurement (Stevens, 1946).

### A.1 Variable Classifications
1. **Nominal Categorical**: Unordered qualitative classes (e.g., treatment group `control`, `drug_A`, `drug_B`; blood type; region).
   - *Permitted Encodings*: Spatial position (discrete category axis), color hue, shape, faceting (small multiples).
   - *Prohibited Encodings*: Continuous color scales, size ramps, line connection across categories.
2. **Ordinal Categorical**: Qualitative classes possessing an intrinsic natural ordering but lacking uniform numerical distance (e.g., Likert ratings `strongly disagree` < `neutral` < `agree`; education levels).
   - *Permitted Encodings*: Ordered spatial position, ordered color luminance / lightness ramp.
   - *Prohibited Encodings*: Unordered categorical palettes, arbitrary alphabetical sorting.
3. **Binary / Dichotomous**: Special case of nominal/ordinal with exactly two mutually exclusive states (e.g., `0/1`, `treatment/control`, `pass/fail`).
   - *Permitted Encodings*: Discrete point markers, binary color contrast, facet splits.
4. **Discrete Quantitative**: Numeric count variables taking values in $\mathbb{N}_0 = \{0, 1, 2, \dots\}$ with discrete steps (e.g., customer arrivals, number of defects, trial counts).
   - *Permitted Encodings*: Position along continuous or stepped scale, bar length, point count.
   - *Integrity Rule*: Binning MUST align with integer boundaries to avoid fractional binning artifacts.
5. **Continuous Quantitative**: Numeric real-valued measurements taking values in an interval on $\mathbb{R}$ (e.g., temperature, blood pressure, duration, coordinate values).
   - *Permitted Encodings*: Position along aligned continuous scales, length, area, color luminance / saturation gradient.
6. **Temporal Variables**: Time-indexed coordinates taking values in calendar time or elapsed time (e.g., `YYYY-MM-DD`, seconds since start).
   - *Permitted Encodings*: Horizontal axis position ($x$-axis standard), connected line geometry.
7. **Cyclical Temporal**: Periodic time units (e.g., hour of day, day of week, month of year).
   - *Permitted Encodings*: Polar / radar charts, faceted seasonal subseries plots, calendar heatmaps.
8. **Probabilities, Proportions, and Rates**: Normalized quantities bounded strictly in $[0, 1]$ or $[0, 100\%]$ (e.g., survival probability, false positive rate).
   - *Integrity Rule*: Axes MUST display full unit interval $[0, 1]$ or clearly denote truncated focal regions.
9. **Uncertainty Intervals**: Statistical error ranges representing standard errors, frequentist confidence intervals, prediction intervals, or credible intervals.
   - *Permitted Encodings*: Error bars, crossbars, shaded ribbons / envelopes, confidence strips.
   - *Integrity Rule*: The exact statistical nature (e.g., "95% Confidence Interval for Mean Response" versus "95% Prediction Interval for Single Observation") MUST be explicitly labeled in the legend and tooltip. Generic labels such as "error" or "confidence" are strictly prohibited.

---

## Section B: Known Visualization Unity

Statistical visualization literature often presents charts as an arbitrary catalog of independent graph types. In the DataSense architecture, all charts are unified representations of underlying relational data structures, mapped through specific geometric mark transformations and coordinate projections.

The following comparative taxonomy unifies chart families across common data structures, detailing analytical emphases, hidden failure modes, and conditions where seemingly interchangeable charts MUST NOT be substituted.

### B.1 One Categorical Variable

| Chart Family | Primary Encodings | What It Emphasizes | What It Conceals / Distorts | Key Statistical Assumptions | Common Graphical Mistakes | When Not Interchangeable |
|---|---|---|---|---|---|---|
| **Bar Chart** | Length from common zero baseline | Absolute or relative frequency comparisons | Within-category heterogeneity; sample size if plotting proportions without counts | Nominal or ordinal discrete categories | Truncating baseline at non-zero value; 3D perspective distortion | MUST NOT be used for continuous quantitative distributions (hides skewness and multimodality). |
| **Dot Plot (Cleveland)** | Position along an aligned scale | Exact frequency comparison; reduced ink footprint | Category boundaries when points are dense | Discrete categories | Unequal line spacing | Preferred over bar charts when category labels are long or baseline zero clutter detracts from difference comparisons. |
| **Pie / Donut Chart** | Angle and sector area of circle | Parts-of-a-whole relationship ($100\%$ sum) | Exact value comparison; subtle differences between slices | Strict partition ($\sum p_i = 1$) | Displaying > 5 slices; comparing slices across multiple pies | Prohibited in DataSense for quantitative comparisons with > 3 categories (human perception of angle and area is inferior to position). |

### B.2 One Quantitative Variable

| Chart Family | Primary Encodings | What It Emphasizes | What It Conceals / Distorts | Key Statistical Assumptions | Common Graphical Mistakes | When Not Interchangeable |
|---|---|---|---|---|---|---|
| **Histogram** | Area and height of contiguous bins | Empirical density, modality, skewness, spread | Individual observations; sensitive to bin width and bin origin | Continuous numeric variable | Unequal bin widths without density scaling; arbitrary bin width hiding bimodality | Cannot reveal exact quantiles or individual outliers; should be paired with boxplot or rug plot. |
| **Kernel Density Plot (KDE)**| Continuous curve height | Smooth shape of population distribution | Boundary values (edge bleeding below physical minimum); sample size $n$ | Smooth continuous support | Oversmoothing (large bandwidth) hides real modes; undersmoothing shows spurious noise | Prohibited for small samples ($n < 30$) where kernel bandwidth choice dominates observed shape. |
| **Empirical Cumulative Distribution Function (ECDF)** | Step height at each unique observed value | Exact percentiles, sample size, stochastic dominance; parameter-free | Density modes (requires visual slope estimation) | Ordered quantitative sample | Connecting steps with diagonal lines instead of right-continuous steps | The gold standard for comparing two continuous distributions without binning or smoothing artifacts. |
| **Boxplot (Tukey 5-Number)** | Center line (median), box ($IQR$), whiskers ($1.5 \cdot IQR$), points (outliers) | Summary location, spread, skewness, extreme outliers | Modality (bimodal distribution looks identical to uniform distribution) | Monomodal distribution | Applying boxplot to small samples ($n < 10$); hiding sample size | MUST NOT be used as the sole summary of multimodal distributions. Pair with jittered points or violin plot. |
| **Violin Plot** | Mirrored kernel density width | Bimodal/multimodal shape combined with spread | Individual points; bandwidth artifacts; sample size | Continuous numeric variable ($n \ge 50$) | Plotting on small datasets without showing raw data points | Inappropriate for small datasets where KDE generates false density tails beyond observed range. |

### B.3 Two Quantitative Variables

| Chart Family | Primary Encodings | What It Emphasizes | What It Conceals / Distorts | Key Statistical Assumptions | Common Graphical Mistakes | When Not Interchangeable |
|---|---|---|---|---|---|---|
| **Scatter Plot** | Orthogonal 2D Cartesian positions $(x_i, y_i)$ | Bivariate relationship, linearity, clusters, leverage, outliers | Overplotting in dense regions ($n > 1,000$) | Paired quantitative observations | Unequal aspect ratio distorting slope perception; overplotting without transparency | Fundamental standard for bivariate regression; cannot be replaced by summary curves alone. |
| **Hexagonal Binning / 2D Density** | 2D position + color luminance / saturation of bin count | High-density bivariate patterns without occlusion | Individual outlying points in low-density margins | Large sample size ($n > 1,000$) | Bins too large hiding fine structure; color scale non-perceptually uniform | Replaces raw scatter plot when $n$ causes complete visual point saturation. Outliers MUST be plotted as discrete points over hexbins. |
| **Connected Scatter Plot** | 2D position $(x_t, y_t)$ with directed sequential path | Trajectory of two interrelated series over time | Directionality if arrows / timestamps are omitted | Ordered sequence (usually time) | Convoluted spaghetti trails without milestone annotations | Not interchangeable with standard scatter plot; requires explicit time-ordering along path. |

### B.4 One Categorical and One Quantitative Variable

| Chart Family | Primary Encodings | What It Emphasizes | What It Conceals / Distorts | Key Statistical Assumptions | Common Graphical Mistakes | When Not Interchangeable |
|---|---|---|---|---|---|---|
| **Grouped Boxplots** | Parallel position along category axis | Median and IQR comparisons across groups | Underlying sample sizes; internal modality | Independent observations within groups | Concealing small group sizes ($n_i < 10$) | Standard exploratory view for ANOVA; MUST overlay jittered raw points when $n_i \le 30$. |
| **Jittered Strip Plot / Beeswarm** | Position along numeric axis + horizontal displacement | Every raw data point, exact sample size, clustering | Overlap when point counts are massive ($n > 500$ per group) | Quantitative response across discrete groups | Excessive jitter obscuring true position; jittering along the measurement axis | Essential for small-to-moderate sample comparisons where aggregate summaries deceive. |
| **Bar Chart of Group Means ("Dynamite Plot")** | Bar height for mean + error bar for standard error | Mean comparison | **FATAL**: Entire distribution shape, sample size, skewness, outliers, bimodality | Strict normality (rarely met) | Using bar chart for continuous distributions (Tufte / Cairo violation) | **STRICTLY PROHIBITED** in DataSense software. Bar charts MUST represent counts or proportions, never continuous group means. Use boxplot + points instead. |

### B.5 Model Predictions, Residuals, and Diagnostics

| Chart Family | Primary Encodings | What It Emphasizes | What It Conceals / Distorts | Key Statistical Assumptions | Common Graphical Mistakes | When Not Interchangeable |
|---|---|---|---|---|---|---|
| **Residual-vs-Fitted Plot** | Horizontal position $\hat{y}_i$, vertical position $e_i = y_i - \hat{y}_i$ | Non-linear curvature, heteroscedasticity, vertical outliers | Predictor leverage ($h_i$) | Linear model fit | Omitting horizontal zero reference line; connecting points with lines | Canonical diagnostic for checking linearity and equal variance. Cannot be substituted by raw scatter plot. |
| **Normal Quantile-Quantile (Q-Q) Plot** | Theoretical standard normal quantile $z_i$ vs standardized residual $r_i$ | Departures from normality (heavy tails, skewness, light tails) | Relationship between residuals and predictors | Normal distribution baseline | Omitting identity reference line $y = x$; plotting raw residuals without standardizing | Essential for assessing validity of small-sample $t$-tests and $F$-tests. |
| **Cook's Distance Needle / Stem Plot** | Observation index $i$ on $x$-axis, vertical stem height for $D_i$ | Identification of influential observations | Geometric direction of shift in parameter space | OLS regression fit | Omitting diagnostic threshold lines ($4/n$ and $1.0$) | Isolates observation leverage-residual interactions across the dataset index. |

---

## Section C: Graphical Encoding Standards

Human visual perception decodes graphical encodings with differing degrees of cognitive accuracy (Cleveland and McGill, 1984; Mackinlay, 1986). DataSense applications MUST prioritize higher-accuracy encodings for primary analytical variables.

### C.1 Perceptual Accuracy Hierarchy

```
[Highest Accuracy]
  1. Position along a common aligned scale (e.g., Cartesian scatter, aligned bar chart)
  2. Position along non-aligned identical scales (e.g., small multiples, faceted charts)
  3. Length (e.g., bar charts with shared zero baseline)
  4. Direction / Angle / Slope (e.g., trendlines, vector arrows, sparklines)
  5. Area (e.g., bubble chart markers, Voronoi tiles)
  6. Volume / 3D Perspective (STRICTLY PROHIBITED for quantitative encoding)
  7. Color Luminance / Lightness (e.g., continuous heatmaps)
  8. Color Saturation (e.g., intensity ramps)
  9. Color Hue (e.g., nominal category separation)
[Lowest Quantitative Accuracy]
```

### C.2 Normative Rules on Visual Encodings
1. **Primary Quantitative Variables**: MUST be encoded by position along aligned axes (Rank 1).
2. **Length Encodings**: MUST originate from a true, non-truncated zero baseline ($y = 0$). Truncating the baseline of a length-encoded chart (bar chart) is a fatal visual integrity violation.
3. **Area Encodings**: Marker area MUST scale linearly with the quantitative variable:
   $$\text{Area} \propto V \implies \text{Radius } r \propto \sqrt{V}$$
   Scaling marker diameter or radius directly proportional to $V$ inflates perceptual magnitude quadratically ($r \propto V \implies \text{Area} \propto V^2$) and is STRICTLY PROHIBITED.
4. **Color Palettes**:
   - **Nominal Variables**: MUST use distinct, perceptually equidistant color hues with balanced luminance to prevent unintended emphasis.
   - **Sequential Quantitative Variables**: MUST use monotonic luminance gradients (e.g., Viridis, Cividis, Blues).
   - **Diverging Quantitative Variables**: MUST have a distinct neutral midpoint (e.g., zero residual, zero correlation) with balanced contrasting arms (e.g., Blue-Red, Orange-Purple).
   - **Color-Vision Deficiency (CVD)**: All visual channels MUST be distinguishable under deuteranopia, protanopia, and tritanopia. Color MUST NEVER be the sole encoding of diagnostic meaning; it MUST be paired with geometric shape, dashed line patterns, or textual badges.

---

## Section D: Chart Taxonomy and Specifications

DataSense applications MUST implement charts according to the following canonical specifications:

### D.1 Scatter Plot & Regression Layer
- **Coordinate System**: 2D Cartesian plane with linear or logarithmic scaling.
- **Data Elements**:
  - Individual observations plotted as solid circular glyphs ($r = 5.2\text{px}$ default).
  - OLS regression line rendered as a continuous solid stroke ($2.6\text{px}$ width, `{color.primary}`).
  - Confidence interval ribbon rendered as a semi-transparent polygon ($\alpha = 0.14$, `{color.primary}`).
  - Residual drop-lines rendered from $(x_i, y_i)$ vertically to $(x_i, \hat{y}_i)$ as dashed stems ($\alpha = 0.55$, `{color.secondary}`).
  - Centroid fulcrum crosshairs rendered as dashed amber lines passing through $(\bar{x}, \bar{y})$ with a pivot marker.
  - High-influence observations ($D_i > 4/n$) highlighted with a dashed vermilion halo ($r = 11\text{px}$).
  - High-leverage observations ($h_i > 4/n$) highlighted with a solid amber ring ($r = 9.5\text{px}$).

### D.2 Residual Plot
- **Horizontal Axis**: Fitted values $\hat{y}_i$ (standard) or explanatory variable $x_i$.
- **Vertical Axis**: Raw residual $e_i = y_i - \hat{y}_i$ or standardized residual $r_i$.
- **Reference Geometry**: Prominent horizontal dashed line at $e = 0$.
- **Vertical Stems**: Connecting each point to the zero reference line to reinforce magnitude.

### D.3 Normal Quantile-Quantile (Q-Q) Plot
- **Horizontal Axis**: Theoretical normal quantiles $z_{(i)} = \Phi^{-1}\left(\frac{i - 0.375}{n + 0.25}\right)$ using Blom's plotting position.
- **Vertical Axis**: Empirical standardized residuals $r_{(i)}$ sorted in ascending order.
- **Reference Geometry**: Identity reference line $y = x$ passing through origin with unit slope.

---

## Section E: Statistical Graphics Integrity

Following Cairo (2019, *How Charts Lie*) and Wilke (2019, *Fundamentals of Data Visualization*), DataSense applications MUST enforce these integrity rules:

### E.1 Axis Scaling and Baseline Truncation
1. **Bar Charts**: Baseline MUST include zero. Truncating the value axis of a bar chart distorts the length-to-value ratio and is strictly prohibited.
2. **Scatter Plots and Line Charts**: The vertical scale MAY be truncated to focus on data variation, provided:
   - The zero baseline is not artificially implied.
   - Axis tick labels explicitly display the truncated numerical range.
   - The aspect ratio is selected to maintain interpretable slope angles (banking to $45^\circ$, Cleveland et al., 1988).

### E.2 Dual Independent Axes
- **STRICT PROHIBITION**: Applications MUST NOT display two independent quantitative vertical axes with different scales on a single plot canvas. Dual axes allow arbitrary visual manipulation of slope and intersection points.
- **Approved Alternative**: Split the series into vertically stacked small multiples sharing an identical horizontal time or index scale.

### E.3 Overplotting Mitigation
When sample size $n$ leads to overlapping marks:
1. Apply alpha opacity blending ($\alpha \in [0.1, 0.4]$).
2. For categorical discrete values, apply minimal jitter along the categorical axis only. Jittering along a continuous measurement axis is prohibited unless explicitly toggled by user.
3. For $n > 2,000$, transition to 2D hexagonal binning or density contour lines.

---

## Section F: Interactive Visualization Standards

Interactive graphics MUST provide responsive, tactile feedback while preserving statistical rigor.

### F.1 Pointer Dragging and 60fps Performance
- During active point dragging on interactive canvases (e.g., QuartetLab scatter studio), mathematical recalculations and canvas redraws MUST execute synchronously at 60 frames per second ($\le 16.6\text{ms}$ frame budget).
- Expensive UI transitions, modal backdrop blurs, and animated layout reflows MUST be disabled during active pointer drag.

### F.2 Coordinated Brushing and Linking
- Hovering or selecting an observation in any visualization canvas (e.g., Scatter Plot, Residual Plot, or Q-Q Plot) MUST immediately highlight the corresponding observation across all synchronized plots, diagnostic badges, and data table rows.

### F.3 Responsive Resizing and Touch Targets
- Canvases MUST adapt to high-DPI (Retina) displays by scaling their internal backing buffer by `window.devicePixelRatio` (clamped to $2.5\times$).
- Interactive hit targets for pointer events MUST be at least $44 \times 44\text{px}$ on touch devices or provide a proximity-based nearest-neighbor hit testing algorithm (e.g., Euclidean distance radius $\le 14\text{px}$).

---

## Section G: Cross-Application Consistency and Decision Matrix

### G.1 Ecosystem Color Semantics

| Visual Channel | Hex (Light Mode) | Hex (Dark Mode) | Canonical Semantic Meaning |
|---|---|---|---|
| `{color.primary}` | `#0F6E56` (Emerald) | `#34D399` | Active OLS line, point forecast, parameter point estimate, confidence band |
| `{color.secondary}` | `#D9381E` (Vermilion) | `#F87171` | Residual vector, Cook's distance halo, permutation null rejection region |
| `{color.warning}` | `#B45309` (Amber) | `#F59E0B` | High leverage ($h_i$), fulcrum centroid marker, matrix conditioning warning |
| `{color.accentHighlight}` | `#1D4ED8` (Blue) | `#60A5FA` | Pointer hover state, active selection brush, UI focus ring |
| `{color.altModel}` | `#7C3AED` (Purple) | `#A78BFA` | Alternative comparison model (e.g., quadratic polynomial curve overlay) |

### G.2 Canonical Chart-Selection Decision Matrix

| Data Structure / Objective | Primary Recommended Chart | Secondary / Exploratory Alternative | Prohibited / Misleading Chart |
|---|---|---|---|
| **Distribution of 1 Quantitative Variable ($n < 30$)** | Dot Plot with median crossbar, or Jittered Strip Plot | ECDF | Raw Histogram with default bins (binning artifacts) |
| **Distribution of 1 Quantitative Variable ($n \ge 30$)** | Histogram with density scaling + rug plot | ECDF or Boxplot + Points | Pie chart, "Dynamite" mean bar plot |
| **Multimodal Distribution ($n \ge 50$)** | Violin Plot with embedded boxplot | Stacked Histogram or KDE | Standalone Boxplot (hides bimodality) |
| **Comparison of 2 Quantitative Distributions** | Overlaid ECDFs or Back-to-Back Histograms | Quantile-Quantile Plot | Two independent pie charts |
| **Bivariate Relationship ($X$ and $Y$ quantitative)** | Scatter Plot with OLS line and 95% CI ribbon | Hexagonal Binning ($n > 2,000$) | Line chart connecting un-ordered points |
| **Bivariate Non-linear / Curvature Diagnostics** | Residual Plot ($e_i$ vs $\hat{y}_i$) with zero line | Scatter Plot with Quadratic overlay | Bar chart of correlation |
| **Normality of Model Residuals** | Normal Q-Q Plot with identity line | Residual Histogram with normal curve overlay | Raw Scatter Plot |
| **Time-Series with Seasonality** | Line Chart with Seasonal Subseries Facets | Calendar Heatmap | Un-ordered bar chart, 3D ribbon plot |
| **Bootstrap Sampling Distribution** | Sampling Distribution Histogram with CI bounds | Bootstrap ECDF | Unbounded KDE curve bleeding beyond support |
| **Permutation Null Hypothesis Test** | Null Distribution Histogram + Observed Statistic Line | Permutation Dot Plot | Standalone $p$-value badge without distribution context |
