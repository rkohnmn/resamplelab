# Maintenance & Development Guide (`DEVELOPMENT.md`)

## 1. Engineering Principles for Future Agents & Maintainers

1. **Zero External Runtime Dependencies**: Never add CDN `<script>` or `<link>` tags to `index.html`, and never add runtime npm dependencies. All algorithms must execute in standard ES2022+ JavaScript.
2. **Strict Separation of Engine and UI**: Mathematical calculations belong exclusively in `js/prng.js`, `js/distributions.js`, `js/stats-core.js`, `js/classical-engine.js`, and `js/inference-engine.js`. These modules must never reference `window` or `document` so they remain 100% testable under `node --test`.
3. **Subpath Asset Compatibility**: Always reference local assets in `index.html` using explicit relative paths (`./css/...`, `./js/...`).
4. **Statistical Integrity Guardrails**:
   - Never describe a $p$-value as the probability that the null hypothesis is true.
   - Never describe a realized confidence interval $[l_{\text{obs}}, u_{\text{obs}}]$ as having a 95% probability of containing a random parameter.
   - Never substitute sampling with replacement for sampling without replacement silently.
   - Always preserve observational units (groupwise resampling for independent groups, intact pairs for paired/bivariate data).

## 2. Adding a New Estimator or Distribution

1. Add the estimator definition to `STATISTIC_REGISTRY` in `js/stats-core.js` with `id`, `name`, `symbol`, `parameterName`, `designType`, `minSampleSize`, `supportsBCa`, `supportsBootstrapT`, `compute()`, and `analyticSE()`.
2. Add corresponding unit tests in `tests/math-engine.test.js`.
3. Run `node --test tests/*.test.js` and `python3 tests/verify-build.py` before committing.
