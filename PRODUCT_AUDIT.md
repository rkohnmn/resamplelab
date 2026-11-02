# ResampleLab: Studio quality improvements

Review date: October 29, 2026. Publication to main was authorized after local verification. GitHub Actions records the deployment and remote validation results.

## Product direction

The application keeps its existing paper/emerald palette, serif headings, and numerical typography. Responsive layout fixes keep controls within the viewport while allowing dense tables and navigation to scroll in their own containers. Existing print styling remains separate from the screen-specific product stylesheet.

Preserved product strengths: Sampling experiments, design-aware inference, bootstrap estimates, and randomization tests.

## Implemented changes

- Responsive controls and headers remain usable on phones, and import messages use a live region.
- Missing numeric values no longer become observed zeros. CSV uses complete quoted records, rejects duplicate columns, and validates shape before analysis.
- Session payloads must match a supported data design, and saved statistics must match that design. Restored observation counts come from the actual payload; the selected statistic is retained.
- Imported titles and report previews render as text, preventing the HTML injection detected by the new browser suite. Exported script titles cannot introduce new code lines.
- Oversized files and stale reads leave active work intact; file-read failures offer a recovery path.

## Import limits

Interactive imports accept at most 2 MiB, 5,000 rows, 40 columns, and 100,000 cells. These are deliberate UI bounds, not a claim that every permitted dataset runs quickly. Choose a representative subset for larger datasets. Each lab retains its format-specific semantics; the preparation lab can preview malformed rows that the analytical labs reject.

## Repeatable validation

```sh
npm test
npm run verify
python -m pip install -r requirements-dev.txt
python -m playwright install chromium
npm run test:browser
```

The new parser regression cases exercise size limits, quoted records, and missing-value behavior, alongside the existing numerical tests. The Chromium suite visits 10 main workspace(s) at 320, 390, 768, 1024, and 1440 pixels in both themes. It exercises the changed import and keyboard workflows, checks for page overflow and uncaught errors, and saves representative screenshots plus results to `artifacts/browser/` (ignored by Git).

`.github/workflows/product-quality.yml` runs unit/static/browser checks on pull requests and manual dispatch with read-only repository permissions. Remote run results are recorded in GitHub Actions. Existing deployment workflows are unchanged.

## Local verification results

`npm test` passed all 19 tests, `npm run verify` passed, and the per-repository Chromium suite passed. Representative light/dark desktop/phone screenshots were inspected. The results and screenshots are retained locally in `artifacts/browser/`.

## Remaining work

Automatic design inference for matrix-shaped inputs can be ambiguous. Review the design selector before interpretation. The statistical algorithms themselves were not rewritten or independently revalidated.

Chromium checks do not replace Firefox/Safari, physical-device, screen-reader, comprehensive contrast, or performance testing. Imports are synchronous within the documented limits; no background-worker migration is claimed.


## November 2, 2026 review follow-up

Deployments now wait for reusable product validation in Chromium, Firefox and WebKit. The Chromium job also runs axe-core WCAG A/AA checks across the main workspaces in light and dark themes, plus keyboard-entry and 320-CSS-pixel reflow checks. axe-core is a pinned development dependency; run `npm ci --ignore-scripts` before `npm run test:a11y`. Failed browser journeys retain a screenshot and Playwright trace. Pages bundles contain public assets and documentation, excluding tests, browser artifacts and development packages.

Automated audits do not certify screen-reader behavior, physical devices, every chart/dialog state, or complete WCAG conformance. Those remain manual validation tasks.

Script exports select the actual statistic and confidence level. Supported bootstrap exports implement percentile, basic and normal intervals; supported Monte Carlo independent-group permutation exports preserve the test alternative. Unsupported statistics/designs, exact enumeration, BCa and studentized intervals explicitly report export unavailable instead of substituting another analysis. `npm run test:exports` executes generated Python against 36 numerical fixtures after installing requirements-dev.txt. R output is covered by generator assertions; an R runtime was not available for execution testing.
