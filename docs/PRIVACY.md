# Local-First Privacy & Security Specification (`docs/PRIVACY.md`)

1. **100% Local Browser Computation**: All dataset parsing, random number generation, bootstrap resampling, permutation enumeration, and chart rendering execute strictly inside the user's local browser tab.
2. **Zero External Telemetry or Network Calls**: ResampleLab loads zero external CDN scripts, stylesheets, or tracking beacons. Uploaded CSV/TSV/JSON files never leave the client device.
3. **Safe URL State Sharing**: Shareable URL hash fragments (`#state=...`) live strictly after the `#` symbol, which browsers never transmit in HTTP requests to static web servers.
4. **Local Storage Control**: User theme and explanation-mode preferences are stored in `localStorage` inside `try/catch` guards and can be wiped at any time via the **Clear Local Browser Storage** button in the Methods & Overview tab.
