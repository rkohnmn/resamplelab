#!/usr/bin/env python3
"""
ResampleLab — Static Build & Repository Compliance Verifier (verify-build.py)

Verifies compliance with APPLICATION_GUIDELINES.md Section B & Section J:
1. All required HTML, CSS, JS, test, and documentation files exist and are non-empty.
2. Zero root-absolute asset paths (e.g., href="/..." or src="/...") in index.html.
3. Zero external runtime CDN dependencies (unpkg, cdnjs, jsdelivr, googleapis, etc.).
4. Zero unresolved TODO or FIXME placeholders in source code.
5. Tabular numerals (`font-variant-numeric: tabular-nums`) enforced in stylesheets.
"""

import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

REQUIRED_FILES = [
    "index.html",
    "package.json",
    "DESIGN.md",
    "README.md",
    "ARCHITECTURE.md",
    "METHODS.md",
    "DISTRIBUTIONS.md",
    "RESAMPLING_METHODS.md",
    "DATA_FORMATS.md",
    "TESTING.md",
    "COVERAGE_MATRIX.md",
    "DEVELOPMENT.md",
    "docs/ARCHITECTURE.md",
    "docs/PRIVACY.md",
    "docs/RESEARCH.md",
    "docs/LAUNCH_PLAN.md",
    ".github/workflows/deploy.yml",
    "css/tokens.css",
    "css/base.css",
    "css/components.css",
    "css/print.css",
    "js/prng.js",
    "js/distributions.js",
    "js/stats-core.js",
    "js/classical-engine.js",
    "js/inference-engine.js",
    "js/presets.js",
    "js/atlas-data.js",
    "js/investigations.js",
    "js/renderer.js",
    "js/exporters.js",
    "js/storage.js",
    "js/worker.js",
    "js/app.js",
    "tests/math-engine.test.js",
]

def main():
    errors = []

    # 1. Check required files exist and are non-empty
    for rel_path in REQUIRED_FILES:
        full_path = os.path.join(ROOT, rel_path)
        if not os.path.isfile(full_path):
            errors.append(f"MISSING_FILE: {rel_path}")
        elif os.path.getsize(full_path) == 0:
            errors.append(f"EMPTY_FILE: {rel_path}")

    # 2. Inspect index.html for subpath safety and zero external CDNs
    index_path = os.path.join(ROOT, "index.html")
    if os.path.isfile(index_path):
        with open(index_path, "r", encoding="utf-8") as f:
            html = f.read()

        # Check for root-absolute paths href="/..." or src="/..."
        abs_matches = re.findall(r'(?:href|src)\s*=\s*["\'](/[^"\']*)["\']', html)
        for m in abs_matches:
            errors.append(f"ROOT_ABSOLUTE_PATH in index.html: {m} (breaks GitHub Pages subpath deployment)")

        # Check for external CDN script/link tags
        ext_matches = re.findall(r'<(?:script|link)[^>]+(?:src|href)\s*=\s*["\'](https?://[^"\']+)["\']', html, re.I)
        for m in ext_matches:
            errors.append(f"EXTERNAL_RUNTIME_DEPENDENCY in index.html: {m}")

    # 3. Check CSS for tabular-nums
    base_css_path = os.path.join(ROOT, "css/base.css")
    if os.path.isfile(base_css_path):
        with open(base_css_path, "r", encoding="utf-8") as f:
            css = f.read()
        if "tabular-nums" not in css:
            errors.append("MISSING_TABULAR_NUMS in css/base.css")

    # 4. Check JS files for TODO / FIXME placeholders
    js_dir = os.path.join(ROOT, "js")
    if os.path.isdir(js_dir):
        for fname in os.listdir(js_dir):
            if fname.endswith(".js"):
                fpath = os.path.join(js_dir, fname)
                with open(fpath, "r", encoding="utf-8") as f:
                    code = f.read()
                if re.search(r"//\s*(?:TODO|FIXME)\b", code):
                    errors.append(f"PLACEHOLDER_COMMENT in js/{fname}")

    if errors:
        print("BUILD VERIFICATION FAILED:")
        for e in errors:
            print("  -", e)
        sys.exit(1)

    print(f"OK: ResampleLab static build verification passed ({len(REQUIRED_FILES)} files audited, 0 errors).")
    sys.exit(0)

if __name__ == "__main__":
    main()
