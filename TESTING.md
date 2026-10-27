# Mathematical Testing & Verification Strategy (`TESTING.md`)

## 1. Verification Commands

Execute from the repository root:

```bash
# 1. Automated Node.js Mathematical & Statistical Verification Suite
node --test tests/math-engine.test.js

# 2. Static Subpath, Zero-CDN, & Code Completeness Verifier
python3 tests/verify-build.py
```

## 2. Mathematical Verification Coverage (`tests/math-engine.test.js`)

1. **PRNG Determinism & Stream Independence**: Verifies bit-identical sequences for identical seeds, exact state restoration on `.reset()`, and non-overlapping sub-stream seeds via `deriveStreamSeed`.
2. **All 19 Probability Distribution Families**: Verifies parameter validation, PMF normalization ($\sum p(k) = 1$), CDF monotonicity, continuous quantile inversion $F(F^{-1}(0.5)) = 0.5$ to $< 10^{-4}$, and empirical sample mean convergence within Monte Carlo tolerance.
3. **Special Functions**: Benchmarks `inverseNormalCDF(0.975) = 1.95996398`, `studentTQuantile(0.975, 9) = 2.262157`, `chiSquareCDF`, and `fDistCDF` against statistical reference tables.
4. **Sampling Operations**: Verifies SRSWOR uniqueness and Finite Population Correction $\text{FPC} = \sqrt{(N-n)/(N-1)}$.
5. **Bootstrap Engine & 5 CI Methods**: Verifies deterministic reproducibility, Percentile/Basic/Normal/Studentized/BCa intervals on skewed telecom repair data, and automated `DEPENDENT_DATA_IID_BOOTSTRAP` warning on autocorrelated series.
6. **Observational Unit Preservation**: Verifies separate within-group resampling for two independent samples, intact pair resampling for paired data, and case resampling for Anscombe I OLS regression.
7. **Exact Enumeration vs Monte Carlo Permutation**: Verifies exact enumeration of all $\binom{10}{5} = 252$ two-group partitions and $2^{10} = 1,024$ paired sign-flips against Monte Carlo estimates.
8. **Classical Inference Parity**: Verifies Anscombe I OLS slope ($0.5001$), $SE(b_1) = 0.1179$, $R^2 = 0.6665$, Pearson $r = 0.8164$, and Wilson score intervals.
9. **Coverage, Power, & Optional Stopping**: Verifies nominal 95% coverage, power monotonicity with sample size $n$, and false-positive inflation under sequential peeking.
10. **Security & Serialization**: Verifies RFC 4180 CSV formula-injection escaping (`=SUM(...)` $\rightarrow$ `'=SUM(...)`), delimited parsing, and lossless URL hash round-tripping.
