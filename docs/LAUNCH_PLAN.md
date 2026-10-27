# Static Deployment & Launch Checklist (`docs/LAUNCH_PLAN.md`)

## 1. GitHub Pages Deployment Steps

1. Push the repository to GitHub (`https://github.com/<org>/resamplelab`).
2. In **Settings → Pages**, set **Build and deployment → Source** to **GitHub Actions**.
3. Push to `main` or trigger `.github/workflows/deploy.yml` manually.
4. The workflow executes `node --test tests/*.test.js` and `python3 tests/verify-build.py` before publishing the static site to `https://<org>.github.io/resamplelab/`.

## 2. Pre-Launch Verification Gate

- [x] Zero server backend; 100% static client-side execution.
- [x] All HTML asset paths use explicit relative syntax (`./css/...`, `./js/...`).
- [x] Zero external CDN dependencies.
- [x] `tabular-nums` applied to all numeric readouts and tables.
- [x] All 10 automated test suites in `tests/math-engine.test.js` pass.
- [x] `python3 tests/verify-build.py` exits with code 0.
