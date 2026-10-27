/**
 * ResampleLab — High-DPI Canvas 2D Statistical Graphics Renderer
 *
 * Implements VISUALIZATION_STANDARDS.md & DESIGN.md:
 * - High-DPI (window.devicePixelRatio) scaling
 * - Non-truncated zero baselines for bar/histogram/PMF length encodings
 * - Explicit statistical semantic labels distinguishing Population, Observed Sample,
 *   Sampling Distribution, Bootstrap Distribution, and Permutation Null Distribution
 * - Empirical Cumulative Distribution Function (ECDF) right-continuous step plots
 * - Multi-Distribution Comparison Overlay plots (Part 7.6)
 * - PNG and SVG chart export generators (Part 19.1)
 *
 * @module renderer
 * @version 1.0.0
 */

import { normalPDF, inverseNormalCDF, getDistribution } from "./distributions.js";
import { mean, standardDeviation } from "./stats-core.js";

/**
 * Resolves active theme palette colors for Canvas 2D drawing.
 */
export function getCanvasPalette() {
  const isDark = typeof document !== "undefined" && document.documentElement.getAttribute("data-theme") === "dark";
  return {
    bg: isDark ? "#151921" : "#FFFFFF",
    grid: isDark ? "#232A38" : "#ECE8DD",
    axis: isDark ? "#64748B" : "#8C887B",
    text: isDark ? "#F1F5F9" : "#141619",
    muted: isDark ? "#94A3B8" : "#525866",
    primary: isDark ? "#34D399" : "#0F6E56",
    primaryFill: isDark ? "rgba(52, 211, 153, 0.25)" : "rgba(15, 110, 86, 0.22)",
    secondary: isDark ? "#F87171" : "#D9381E",
    secondaryFill: isDark ? "rgba(248, 113, 113, 0.28)" : "rgba(217, 56, 30, 0.24)",
    warning: isDark ? "#F59E0B" : "#B45309",
    warningFill: isDark ? "rgba(245, 158, 11, 0.22)" : "rgba(180, 83, 9, 0.20)",
    accent: isDark ? "#60A5FA" : "#1D4ED8",
    accentFill: isDark ? "rgba(96, 165, 250, 0.24)" : "rgba(29, 78, 216, 0.20)",
    purple: isDark ? "#A78BFA" : "#7C3AED",
    neutralBar: isDark ? "rgba(148, 163, 184, 0.30)" : "rgba(82, 88, 102, 0.22)",
    neutralStroke: isDark ? "#94A3B8" : "#525866"
  };
}

/**
 * Prepares a Canvas 2D context for crisp High-DPI rendering.
 * @param {HTMLCanvasElement} canvas
 * @param {number} heightCss
 * @returns {{ ctx: CanvasRenderingContext2D, width: number, height: number, pal: object }}
 */
export function setupHighDPICanvas(canvas, heightCss = 240) {
  if (!canvas) return null;
  const dpr = Math.min(2.5, (typeof window !== "undefined" && window.devicePixelRatio) || 1);
  const rect = canvas.getBoundingClientRect();
  const width = Math.max(280, Math.floor(rect.width || canvas.clientWidth || 640));
  const height = heightCss;
  if (canvas.width !== Math.floor(width * dpr) || canvas.height !== Math.floor(height * dpr)) {
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
  }
  canvas.style.height = `${height}px`;
  const ctx = canvas.getContext("2d");
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const pal = getCanvasPalette();
  ctx.fillStyle = pal.bg;
  ctx.fillRect(0, 0, width, height);
  return { ctx, width, height, pal };
}

/**
 * Draws a vertical reference line with an anchored pill label.
 */
function drawVerticalMarker(ctx, xPx, topY, bottomY, color, label, dashed = false, alignRight = false) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  if (dashed) ctx.setLineDash([5, 4]);
  ctx.beginPath();
  ctx.moveTo(xPx, topY);
  ctx.lineTo(xPx, bottomY);
  ctx.stroke();
  ctx.setLineDash([]);

  if (label) {
    ctx.font = "600 11px 'JetBrains Mono', monospace";
    const tw = ctx.measureText(label).width + 8;
    const lx = alignRight ? Math.max(8, xPx - tw - 4) : Math.min(ctx.canvas.width / ((window.devicePixelRatio || 1)) - tw - 6, xPx + 4);
    ctx.fillStyle = color;
    ctx.fillRect(lx, topY + 2, tw, 16);
    ctx.fillStyle = "#FFFFFF";
    ctx.fillText(label, lx + 4, topY + 13);
  }
  ctx.restore();
}

/**
 * Renders a right-continuous Empirical Cumulative Distribution Function (ECDF) step plot
 * per VISUALIZATION_STANDARDS.md Section B.2.
 */
export function renderECDFCanvas(canvas, values, options = {}) {
  const heightCss = options.height || 230;
  const setup = setupHighDPICanvas(canvas, heightCss);
  if (!setup) return;
  const { ctx, width, height, pal } = setup;

  const pad = { top: 26, right: 24, bottom: 34, left: 48 };
  const plotW = width - pad.left - pad.right;
  const plotH = height - pad.top - pad.bottom;

  if (!Array.isArray(values) || values.length === 0) return;
  const sorted = values.slice().sort((a, b) => a - b);
  const n = sorted.length;
  let minV = options.xMin !== undefined ? options.xMin : sorted[0];
  let maxV = options.xMax !== undefined ? options.xMax : sorted[n - 1];
  const span = Math.max(1e-6, maxV - minV);
  minV -= 0.06 * span;
  maxV += 0.06 * span;

  canvas._plotMeta = { padLeft: pad.left, plotW, xMin: minV, xMax: maxV };
  const toX = (v) => pad.left + ((v - minV) / (maxV - minV)) * plotW;
  const toY = (p) => pad.top + plotH - p * plotH;

  // Grid lines at 0, 0.25, 0.50, 0.75, 1.00
  ctx.strokeStyle = pal.grid;
  for (let g = 0; g <= 4; g++) {
    const pVal = 1 - g / 4;
    const y = toY(pVal);
    ctx.beginPath();
    ctx.moveTo(pad.left, y);
    ctx.lineTo(pad.left + plotW, y);
    ctx.stroke();
    ctx.fillStyle = pal.muted;
    ctx.font = "10px 'JetBrains Mono', monospace";
    ctx.textAlign = "right";
    ctx.fillText(pVal.toFixed(2), pad.left - 6, y + 3);
  }
  ctx.textAlign = "left";

  // Shaded CI band if provided
  if (Array.isArray(options.ciBand) && Number.isFinite(options.ciBand[0])) {
    const xL = Math.max(pad.left, toX(options.ciBand[0]));
    const xR = Math.min(pad.left + plotW, toX(options.ciBand[1]));
    ctx.fillStyle = pal.primaryFill;
    ctx.fillRect(xL, pad.top, Math.max(1, xR - xL), plotH);
  }

  // Right-continuous ECDF steps
  ctx.strokeStyle = pal.primary;
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.moveTo(pad.left, toY(0));
  const step = Math.max(1, Math.floor(n / 250));
  let prevX = pad.left;
  let prevY = toY(0);
  for (let i = 0; i < n; i += step) {
    const curX = toX(sorted[i]);
    const curY = toY((i + 1) / n);
    ctx.lineTo(curX, prevY); // Horizontal step
    ctx.lineTo(curX, curY);  // Vertical riser
    prevX = curX;
    prevY = curY;
  }
  ctx.lineTo(pad.left + plotW, toY(1));
  ctx.stroke();

  // X ticks
  ctx.fillStyle = pal.muted;
  ctx.font = "11px 'JetBrains Mono', monospace";
  ctx.textAlign = "center";
  for (let t = 0; t <= 6; t++) {
    const v = minV + (t / 6) * (maxV - minV);
    ctx.fillText(v.toFixed(2), toX(v), pad.top + plotH + 16);
  }
  ctx.textAlign = "left";

  if (Array.isArray(options.markers)) {
    options.markers.forEach((m, idx) => {
      if (!Number.isFinite(m.value)) return;
      drawVerticalMarker(ctx, toX(m.value), pad.top + (idx % 2) * 18, pad.top + plotH, m.color || pal.primary, m.label, Boolean(m.dashed));
    });
  }

  ctx.fillStyle = pal.text;
  ctx.font = "600 12px 'Inter', sans-serif";
  ctx.fillText(options.title || "Empirical Cumulative Distribution Function F̂_B(t) (Right-Continuous Step Function)", pad.left, 16);
}

/**
 * Renders a Histogram with optional interval shading, tail shading, vertical reference markers,
 * and optional normal density curve overlay.
 *
 * @param {HTMLCanvasElement} canvas
 * @param {number[]} values
 * @param {object} options
 */
export function renderDistributionHistogram(canvas, values, options = {}) {
  if (options.plotType === "ecdf") {
    renderECDFCanvas(canvas, values, options);
    return;
  }
  const heightCss = options.height || 235;
  const setup = setupHighDPICanvas(canvas, heightCss);
  if (!setup) return;
  const { ctx, width, height, pal } = setup;

  const pad = { top: 26, right: 22, bottom: 34, left: 48 };
  const plotW = width - pad.left - pad.right;
  const plotH = height - pad.top - pad.bottom;

  if (!Array.isArray(values) || values.length === 0) {
    ctx.fillStyle = pal.muted;
    ctx.font = "13px 'Inter', sans-serif";
    ctx.fillText("Run simulation or select dataset to populate distribution.", pad.left + 12, pad.top + plotH / 2);
    return;
  }

  let minV = options.xMin !== undefined ? options.xMin : Math.min(...values);
  let maxV = options.xMax !== undefined ? options.xMax : Math.max(...values);
  if (Math.abs(maxV - minV) < 1e-9) {
    minV -= 1;
    maxV += 1;
  } else if (options.xMin === undefined) {
    const span = maxV - minV;
    minV -= 0.04 * span;
    maxV += 0.04 * span;
  }

  const numBins = options.bins || Math.min(40, Math.max(12, Math.ceil(Math.sqrt(values.length) * 1.2)));
  const binWidth = (maxV - minV) / numBins;
  const counts = new Array(numBins).fill(0);

  for (let i = 0; i < values.length; i++) {
    const v = values[i];
    if (v < minV || v > maxV) continue;
    const idx = Math.min(numBins - 1, Math.max(0, Math.floor((v - minV) / binWidth)));
    counts[idx]++;
  }

  canvas._plotMeta = { padLeft: pad.left, plotW, xMin: minV, xMax: maxV };
  const maxCount = Math.max(1, ...counts);
  const toX = (v) => pad.left + ((v - minV) / (maxV - minV)) * plotW;
  const toY = (c) => pad.top + plotH - (c / maxCount) * plotH;

  // Title banner
  if (options.title) {
    ctx.fillStyle = pal.text;
    ctx.font = "600 12px 'Inter', sans-serif";
    ctx.fillText(options.title, pad.left, 16);
  }
  if (options.subtitle) {
    ctx.fillStyle = pal.muted;
    ctx.font = "11px 'JetBrains Mono', monospace";
    const subW = ctx.measureText(options.subtitle).width;
    ctx.fillText(options.subtitle, Math.max(pad.left + 180, width - pad.right - subW), 16);
  }

  // Horizontal grid lines (zero baseline mandatory per VISUALIZATION_STANDARDS.md)
  ctx.strokeStyle = pal.grid;
  ctx.lineWidth = 1;
  for (let g = 0; g <= 4; g++) {
    const y = pad.top + (g / 4) * plotH;
    ctx.beginPath();
    ctx.moveTo(pad.left, y);
    ctx.lineTo(pad.left + plotW, y);
    ctx.stroke();

    const countLabel = Math.round(maxCount * (1 - g / 4));
    ctx.fillStyle = pal.muted;
    ctx.font = "10px 'JetBrains Mono', monospace";
    ctx.textAlign = "right";
    ctx.fillText(String(countLabel), pad.left - 6, y + 3);
  }
  ctx.textAlign = "left";

  // Shaded Confidence Interval band if provided
  if (Array.isArray(options.ciBand) && Number.isFinite(options.ciBand[0]) && Number.isFinite(options.ciBand[1])) {
    const xL = Math.max(pad.left, Math.min(pad.left + plotW, toX(options.ciBand[0])));
    const xR = Math.max(pad.left, Math.min(pad.left + plotW, toX(options.ciBand[1])));
    ctx.fillStyle = pal.primaryFill;
    ctx.fillRect(xL, pad.top, Math.max(1, xR - xL), plotH);
  }

  // Draw histogram bars
  for (let b = 0; b < numBins; b++) {
    const bStart = minV + b * binWidth;
    const bEnd = bStart + binWidth;
    const bMid = 0.5 * (bStart + bEnd);
    const x0 = toX(bStart);
    const x1 = toX(bEnd);
    const y0 = toY(counts[b]);
    const barH = pad.top + plotH - y0;
    if (barH <= 0) continue;

    let fill = options.barFill || pal.primaryFill;
    let stroke = options.barStroke || pal.primary;

    if (options.tailThreshold !== undefined && Number.isFinite(options.tailThreshold)) {
      const thresh = options.tailThreshold;
      const alt = options.tailDirection || "two-sided";
      const isExtreme =
        (alt === "greater" && bMid >= thresh) ||
        (alt === "less" && bMid <= thresh) ||
        (alt === "two-sided" && Math.abs(bMid) >= Math.abs(thresh));
      if (isExtreme) {
        fill = pal.secondaryFill;
        stroke = pal.secondary;
      } else {
        fill = pal.neutralBar;
        stroke = pal.neutralStroke;
      }
    } else if (Array.isArray(options.ciBand)) {
      if (bMid < options.ciBand[0] || bMid > options.ciBand[1]) {
        fill = pal.neutralBar;
        stroke = pal.neutralStroke;
      }
    }

    ctx.fillStyle = fill;
    ctx.fillRect(x0 + 0.5, y0, Math.max(1, x1 - x0 - 1), barH);
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 1;
    ctx.strokeRect(x0 + 0.5, y0, Math.max(1, x1 - x0 - 1), barH);
  }

  // Optional Normal Approximation Overlay Curve (scaled to histogram area = N * binWidth)
  if (options.normalOverlay && Number.isFinite(options.normalOverlay.mean) && options.normalOverlay.sd > 1e-9) {
    const { mean: nMu, sd: nSd } = options.normalOverlay;
    const areaScale = values.length * binWidth;
    ctx.save();
    ctx.strokeStyle = pal.purple;
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    for (let px = 0; px <= plotW; px += 2) {
      const xVal = minV + (px / plotW) * (maxV - minV);
      const dens = normalPDF(xVal, nMu, nSd);
      const expectedCount = dens * areaScale;
      const yPx = pad.top + plotH - (expectedCount / maxCount) * plotH;
      const clampedY = Math.max(pad.top - 4, Math.min(pad.top + plotH, yPx));
      if (px === 0) ctx.moveTo(pad.left + px, clampedY);
      else ctx.lineTo(pad.left + px, clampedY);
    }
    ctx.stroke();
    ctx.restore();
  }

  // X-axis ticks
  ctx.strokeStyle = pal.axis;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(pad.left, pad.top + plotH);
  ctx.lineTo(pad.left + plotW, pad.top + plotH);
  ctx.stroke();

  const numTicks = 6;
  ctx.fillStyle = pal.muted;
  ctx.font = "11px 'JetBrains Mono', monospace";
  ctx.textAlign = "center";
  for (let t = 0; t <= numTicks; t++) {
    const v = minV + (t / numTicks) * (maxV - minV);
    const xPx = toX(v);
    ctx.fillText(v.toFixed(Math.abs(maxV - minV) < 2 ? 3 : 2), xPx, pad.top + plotH + 16);
  }
  if (options.xLabel) {
    ctx.font = "11px 'Inter', sans-serif";
    ctx.fillText(options.xLabel, pad.left + plotW / 2, height - 4);
  }
  ctx.textAlign = "left";

  // Vertical Reference Markers
  if (Array.isArray(options.markers)) {
    options.markers.forEach((m, idx) => {
      if (!Number.isFinite(m.value)) return;
      const xPx = toX(m.value);
      if (xPx < pad.left - 2 || xPx > pad.left + plotW + 2) return;
      drawVerticalMarker(
        ctx,
        xPx,
        pad.top + (idx % 2) * 18,
        pad.top + plotH,
        m.color || pal.primary,
        m.label,
        Boolean(m.dashed),
        xPx > pad.left + 0.72 * plotW
      );
    });
  }
}

/**
 * Renders the Distribution Explorer Canvas (Continuous PDF or Discrete PMF + Shaded Probability Interval + Optional CDF, Sample Overlay, or Comparison Overlay).
 */
export function renderTheoreticalDistributionPlot(canvas, dist, params, rangeA, rangeB, simulatedSample = [], viewMode = "pdf_pmf", compareSpec = null, quantileX = null) {
  const setup = setupHighDPICanvas(canvas, 270);
  if (!setup) return;
  const { ctx, width, height, pal } = setup;

  const pad = { top: 28, right: 24, bottom: 36, left: 52 };
  const plotW = width - pad.left - pad.right;
  const plotH = height - pad.top - pad.bottom;

  const sup = dist.support(params);
  const xLow = Math.min(rangeA, rangeB);
  const xHigh = Math.max(rangeA, rangeB);

  if (dist.type === "discrete") {
    const vals = sup.discreteValues || [0, 1];
    const minK = vals[0];
    const maxK = vals[vals.length - 1];
    const span = Math.max(1, maxK - minK);
    const xMin = minK - 0.6;
    const xMax = maxK + 0.6;

    const probs = vals.map((k) => (viewMode === "cdf" ? dist.cdf(k, params) : dist.pmf(k, params)));
    const maxP = Math.max(0.05, ...probs) * 1.15;

    canvas._plotMeta = { padLeft: pad.left, plotW, xMin, xMax };
    const toX = (x) => pad.left + ((x - xMin) / (xMax - xMin)) * plotW;
    const toY = (p) => pad.top + plotH - (p / maxP) * plotH;

    // Grid
    ctx.strokeStyle = pal.grid;
    for (let g = 0; g <= 4; g++) {
      const y = pad.top + (g / 4) * plotH;
      ctx.beginPath();
      ctx.moveTo(pad.left, y);
      ctx.lineTo(pad.left + plotW, y);
      ctx.stroke();
      ctx.fillStyle = pal.muted;
      ctx.font = "10px 'JetBrains Mono', monospace";
      ctx.textAlign = "right";
      ctx.fillText((maxP * (1 - g / 4)).toFixed(2), pad.left - 6, y + 3);
    }
    ctx.textAlign = "left";

    // Empirical sample relative frequency bars
    if (viewMode !== "cdf" && simulatedSample.length > 0) {
      const freqMap = new Map();
      for (const v of simulatedSample) {
        freqMap.set(v, (freqMap.get(v) || 0) + 1);
      }
      const barW = Math.min(26, Math.max(4, (plotW / (span + 2)) * 0.65));
      for (const k of vals) {
        const empP = (freqMap.get(k) || 0) / simulatedSample.length;
        if (empP <= 0) continue;
        const xPx = toX(k);
        const yPx = toY(empP);
        ctx.fillStyle = pal.warningFill;
        ctx.strokeStyle = pal.warning;
        ctx.fillRect(xPx - barW / 2, yPx, barW, pad.top + plotH - yPx);
        ctx.strokeRect(xPx - barW / 2, yPx, barW, pad.top + plotH - yPx);
      }
    }

    // Discrete PMF Lollipops / Bars or Step CDF
    const barW = Math.min(18, Math.max(3, (plotW / (span + 2)) * 0.42));
    vals.forEach((k, idx) => {
      const pVal = probs[idx];
      const xPx = toX(k);
      const yPx = toY(pVal);
      const inRegion = k >= xLow - 1e-9 && k <= xHigh + 1e-9;
      ctx.fillStyle = inRegion ? pal.primary : pal.neutralBar;
      ctx.strokeStyle = inRegion ? pal.primary : pal.neutralStroke;
      ctx.fillRect(xPx - barW / 2, yPx, barW, pad.top + plotH - yPx);
      ctx.beginPath();
      ctx.arc(xPx, yPx, 3.5, 0, Math.PI * 2);
      ctx.fill();
    });

    // Optional Comparison Overlay (e.g., Normal approximation to Binomial/Poisson)
    if (compareSpec && compareSpec.dist) {
      const cDist = compareSpec.dist;
      const cParams = compareSpec.params;
      ctx.save();
      ctx.strokeStyle = pal.purple;
      ctx.lineWidth = 2.2;
      ctx.setLineDash([5, 4]);
      ctx.beginPath();
      for (let px = 0; px <= plotW; px += 2) {
        const xv = xMin + (px / plotW) * (xMax - xMin);
        const yv = viewMode === "cdf"
          ? cDist.cdf(xv, cParams)
          : (cDist.type === "continuous" ? cDist.pdf(xv, cParams) : cDist.pmf(Math.round(xv), cParams));
        const yPx = Math.max(pad.top, Math.min(pad.top + plotH, toY(yv)));
        if (px === 0) ctx.moveTo(pad.left + px, yPx);
        else ctx.lineTo(pad.left + px, yPx);
      }
      ctx.stroke();
      ctx.restore();
    }

    if (Number.isFinite(quantileX) && quantileX >= xMin && quantileX <= xMax) {
      drawVerticalMarker(ctx, toX(quantileX), pad.top + 16, pad.top + plotH, pal.warning, `q=${quantileX}`, true);
    }
    // X ticks
    ctx.fillStyle = pal.muted;
    ctx.font = "11px 'JetBrains Mono', monospace";
    ctx.textAlign = "center";
    const step = Math.max(1, Math.ceil(vals.length / 10));
    for (let i = 0; i < vals.length; i += step) {
      ctx.fillText(String(vals[i]), toX(vals[i]), pad.top + plotH + 16);
    }
    ctx.textAlign = "left";
  } else {
    // Continuous Distribution PDF or CDF
    const xMin = sup.plotMin ?? -4;
    const xMax = sup.plotMax ?? 4;
    const steps = 220;
    const xs = [];
    const ys = [];
    let maxY = 0.05;
    for (let i = 0; i <= steps; i++) {
      const x = xMin + (i / steps) * (xMax - xMin);
      const y = viewMode === "cdf" ? dist.cdf(x, params) : dist.pdf(x, params);
      const cleanY = Number.isFinite(y) ? Math.min(25, Math.max(0, y)) : 0;
      xs.push(x);
      ys.push(cleanY);
      if (cleanY > maxY) maxY = cleanY;
    }
    maxY *= 1.12;

    canvas._plotMeta = { padLeft: pad.left, plotW, xMin, xMax };
    const toX = (x) => pad.left + ((x - xMin) / (xMax - xMin)) * plotW;
    const toY = (y) => pad.top + plotH - (y / maxY) * plotH;

    // Grid
    ctx.strokeStyle = pal.grid;
    for (let g = 0; g <= 4; g++) {
      const y = pad.top + (g / 4) * plotH;
      ctx.beginPath();
      ctx.moveTo(pad.left, y);
      ctx.lineTo(pad.left + plotW, y);
      ctx.stroke();
      ctx.fillStyle = pal.muted;
      ctx.font = "10px 'JetBrains Mono', monospace";
      ctx.textAlign = "right";
      ctx.fillText((maxY * (1 - g / 4)).toFixed(2), pad.left - 6, y + 3);
    }
    ctx.textAlign = "left";

    // Simulated sample density histogram behind PDF curve
    if (viewMode !== "cdf" && simulatedSample.length > 0) {
      const nBins = 24;
      const bW = (xMax - xMin) / nBins;
      const counts = new Array(nBins).fill(0);
      for (const v of simulatedSample) {
        if (v >= xMin && v <= xMax) {
          const idx = Math.min(nBins - 1, Math.max(0, Math.floor((v - xMin) / bW)));
          counts[idx]++;
        }
      }
      for (let b = 0; b < nBins; b++) {
        const dens = counts[b] / (simulatedSample.length * bW);
        const x0 = toX(xMin + b * bW);
        const x1 = toX(xMin + (b + 1) * bW);
        const y0 = toY(Math.min(maxY, dens));
        ctx.fillStyle = pal.warningFill;
        ctx.strokeStyle = pal.warning;
        ctx.fillRect(x0, y0, Math.max(1, x1 - x0 - 1), pad.top + plotH - y0);
      }
    }

    // Shaded probability region P(a <= X <= b) under PDF curve
    if (viewMode !== "cdf") {
      ctx.fillStyle = pal.primaryFill;
      ctx.beginPath();
      let started = false;
      for (let i = 0; i <= steps; i++) {
        if (xs[i] >= xLow && xs[i] <= xHigh) {
          const px = toX(xs[i]);
          const py = toY(ys[i]);
          if (!started) {
            ctx.moveTo(px, pad.top + plotH);
            ctx.lineTo(px, py);
            started = true;
          } else {
            ctx.lineTo(px, py);
          }
        }
      }
      if (started) {
        ctx.lineTo(toX(Math.min(xMax, xHigh)), pad.top + plotH);
        ctx.closePath();
        ctx.fill();
      }
    }

    // Main PDF or CDF Curve
    ctx.strokeStyle = pal.primary;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    for (let i = 0; i <= steps; i++) {
      const px = toX(xs[i]);
      const py = toY(ys[i]);
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();

    // Optional Comparison Distribution Overlay (Part 7.6)
    if (compareSpec && compareSpec.dist) {
      const cDist = compareSpec.dist;
      const cParams = compareSpec.params;
      ctx.save();
      ctx.strokeStyle = pal.purple;
      ctx.lineWidth = 2.2;
      ctx.setLineDash([6, 4]);
      ctx.beginPath();
      for (let i = 0; i <= steps; i++) {
        const xv = xs[i];
        const yv = viewMode === "cdf"
          ? cDist.cdf(xv, cParams)
          : (cDist.type === "continuous" ? cDist.pdf(xv, cParams) : cDist.pmf(Math.round(xv), cParams));
        const cleanCY = Number.isFinite(yv) ? Math.min(maxY, Math.max(0, yv)) : 0;
        const px = toX(xv);
        const py = toY(cleanCY);
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.stroke();
      ctx.restore();
    }

    // Expected value marker
    const moments = dist.moments(params);
    if (Number.isFinite(moments.mean) && moments.mean >= xMin && moments.mean <= xMax) {
      drawVerticalMarker(ctx, toX(moments.mean), pad.top, pad.top + plotH, pal.secondary, `E[X]=${moments.mean.toFixed(2)}`, true);
    }
    if (Number.isFinite(quantileX) && quantileX >= xMin && quantileX <= xMax) {
      drawVerticalMarker(ctx, toX(quantileX), pad.top + 18, pad.top + plotH, pal.warning, `F⁻¹(q)=${quantileX.toFixed(2)}`, true);
    }

    // X ticks
    ctx.fillStyle = pal.muted;
    ctx.font = "11px 'JetBrains Mono', monospace";
    ctx.textAlign = "center";
    for (let t = 0; t <= 6; t++) {
      const xv = xMin + (t / 6) * (xMax - xMin);
      ctx.fillText(xv.toFixed(2), toX(xv), pad.top + plotH + 16);
    }
    ctx.textAlign = "left";
  }

  ctx.fillStyle = pal.text;
  ctx.font = "600 12px 'Inter', sans-serif";
  const compLabel = compareSpec?.label ? ` vs ${compareSpec.label}` : "";
  ctx.fillText(
    `${dist.name} (${dist.notation})${compLabel} — ${viewMode === "cdf" ? "Cumulative Distribution Function F(x)" : (dist.type === "discrete" ? "Probability Mass Function P(X = k)" : "Probability Density Function f(x)")}`,
    pad.left,
    16
  );
}

/**
 * Renders Law of Large Numbers (LLN) Running Sample Average Trajectories.
 */
export function renderLLNTrajectoryCanvas(canvas, trajectories, trueMean) {
  const setup = setupHighDPICanvas(canvas, 210);
  if (!setup) return;
  const { ctx, width, height, pal } = setup;

  const pad = { top: 24, right: 24, bottom: 30, left: 50 };
  const plotW = width - pad.left - pad.right;
  const plotH = height - pad.top - pad.bottom;

  if (!trajectories || trajectories.length === 0 || trajectories[0].length === 0) return;

  const N = trajectories[0].length;
  let minY = trueMean - 1;
  let maxY = trueMean + 1;
  for (const path of trajectories) {
    for (const v of path) {
      if (Number.isFinite(v)) {
        if (v < minY) minY = v;
        if (v > maxY) maxY = v;
      }
    }
  }
  const span = Math.max(0.5, maxY - minY);
  minY -= 0.08 * span;
  maxY += 0.08 * span;

  const toX = (i) => pad.left + ((i - 1) / Math.max(1, N - 1)) * plotW;
  const toY = (v) => pad.top + plotH - ((v - minY) / (maxY - minY)) * plotH;

  // Grid
  ctx.strokeStyle = pal.grid;
  for (let g = 0; g <= 4; g++) {
    const y = pad.top + (g / 4) * plotH;
    ctx.beginPath();
    ctx.moveTo(pad.left, y);
    ctx.lineTo(pad.left + plotW, y);
    ctx.stroke();
    ctx.fillStyle = pal.muted;
    ctx.font = "10px 'JetBrains Mono', monospace";
    ctx.textAlign = "right";
    ctx.fillText((maxY - (g / 4) * (maxY - minY)).toFixed(2), pad.left - 6, y + 3);
  }
  ctx.textAlign = "left";

  // True mean reference line
  if (Number.isFinite(trueMean)) {
    const yMu = toY(trueMean);
    ctx.save();
    ctx.strokeStyle = pal.secondary;
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 4]);
    ctx.beginPath();
    ctx.moveTo(pad.left, yMu);
    ctx.lineTo(pad.left + plotW, yMu);
    ctx.stroke();
    ctx.restore();
  }

  // Trajectories
  const colors = [pal.primary, pal.accent, pal.purple, pal.warning];
  trajectories.forEach((path, idx) => {
    ctx.strokeStyle = colors[idx % colors.length];
    ctx.lineWidth = idx === 0 ? 2.2 : 1.4;
    ctx.beginPath();
    for (let i = 0; i < path.length; i++) {
      const px = toX(i + 1);
      const py = toY(path[i]);
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();
  });

  ctx.fillStyle = pal.text;
  ctx.font = "600 12px 'Inter', sans-serif";
  ctx.fillText(`Law of Large Numbers: Running Sample Average X̄ₘ vs Cumulative Trials m (Target μ = ${Number.isFinite(trueMean) ? trueMean.toFixed(3) : "Undefined"})`, pad.left, 15);
}

/**
 * Renders a Normal Quantile-Quantile (Q-Q) Plot of Sample Statistics for CLT verification.
 */
export function renderNormalQQCanvas(canvas, values) {
  const setup = setupHighDPICanvas(canvas, 210);
  if (!setup) return;
  const { ctx, width, height, pal } = setup;

  const pad = { top: 24, right: 24, bottom: 32, left: 50 };
  const plotW = width - pad.left - pad.right;
  const plotH = height - pad.top - pad.bottom;

  if (!Array.isArray(values) || values.length < 5) return;
  const m = mean(values);
  const s = standardDeviation(values);
  if (s <= 1e-12) return;

  const sorted = values.slice().sort((a, b) => a - b);
  const n = sorted.length;
  const step = Math.max(1, Math.floor(n / 150));
  const pts = [];
  for (let i = 0; i < n; i += step) {
    const p = (i + 1 - 0.375) / (n + 0.25); // Blom's plotting position per STATISTICAL_STANDARDS.md
    const zTheo = inverseNormalCDF(p);
    const zEmp = (sorted[i] - m) / s;
    pts.push({ x: zTheo, y: zEmp });
  }

  const bound = 3.5;
  const toX = (z) => pad.left + ((z + bound) / (2 * bound)) * plotW;
  const toY = (z) => pad.top + plotH - ((z + bound) / (2 * bound)) * plotH;

  // Identity reference line y = x
  ctx.strokeStyle = pal.secondary;
  ctx.lineWidth = 1.8;
  ctx.setLineDash([5, 4]);
  ctx.beginPath();
  ctx.moveTo(toX(-bound), toY(-bound));
  ctx.lineTo(toX(bound), toY(bound));
  ctx.stroke();
  ctx.setLineDash([]);

  // Points
  ctx.fillStyle = pal.primary;
  for (const pt of pts) {
    const px = Math.max(pad.left, Math.min(pad.left + plotW, toX(pt.x)));
    const py = Math.max(pad.top, Math.min(pad.top + plotH, toY(pt.y)));
    ctx.beginPath();
    ctx.arc(px, py, 3, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.fillStyle = pal.text;
  ctx.font = "600 12px 'Inter', sans-serif";
  ctx.fillText("Normal Q-Q Diagnostic of Sample Means (Blom Plotting Positions vs Identity Line)", pad.left, 15);
}

/**
 * Renders the Synchronized Bootstrap Confidence Interval Comparison Chart (Part 9.9).
 */
export function renderBootstrapCIComparisonCanvas(canvas, bootResult) {
  const setup = setupHighDPICanvas(canvas, 205);
  if (!setup || !bootResult || !bootResult.intervals) return;
  const { ctx, width, height, pal } = setup;

  const pad = { top: 26, right: 28, bottom: 32, left: 175 };
  const plotW = width - pad.left - pad.right;
  const plotH = height - pad.top - pad.bottom;

  const rows = [];
  for (const key of ["percentile", "basic", "normal", "studentized", "bca"]) {
    const iv = bootResult.intervals[key];
    if (iv && iv.eligible && iv.ci) {
      rows.push({ name: iv.name.replace(" Bootstrap CI", "").replace(" CI", ""), ci: iv.ci, color: pal.primary });
    }
  }
  if (bootResult.classicalCounterpart?.valid && Array.isArray(bootResult.classicalCounterpart.ci)) {
    rows.push({
      name: "Classical Analytical CI",
      ci: bootResult.classicalCounterpart.ci,
      color: pal.purple
    });
  }
  if (rows.length === 0) return;

  let minX = bootResult.originalEstimate;
  let maxX = bootResult.originalEstimate;
  for (const r of rows) {
    minX = Math.min(minX, r.ci[0]);
    maxX = Math.max(maxX, r.ci[1]);
  }
  const span = Math.max(1e-6, maxX - minX);
  minX -= 0.12 * span;
  maxX += 0.12 * span;

  const toX = (v) => pad.left + ((v - minX) / (maxX - minX)) * plotW;

  // Point estimate vertical reference line
  drawVerticalMarker(
    ctx,
    toX(bootResult.originalEstimate),
    pad.top,
    pad.top + plotH,
    pal.warning,
    `Est=${bootResult.originalEstimate.toFixed(3)}`,
    true
  );

  const rowH = plotH / rows.length;
  rows.forEach((r, idx) => {
    const yMid = pad.top + (idx + 0.5) * rowH;
    ctx.fillStyle = pal.text;
    ctx.font = "500 12px 'Inter', sans-serif";
    ctx.textAlign = "right";
    ctx.fillText(r.name, pad.left - 12, yMid + 4);

    const xL = toX(r.ci[0]);
    const xR = toX(r.ci[1]);
    ctx.strokeStyle = r.color;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(xL, yMid);
    ctx.lineTo(xR, yMid);
    ctx.stroke();

    // End caps
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(xL, yMid - 5);
    ctx.lineTo(xL, yMid + 5);
    ctx.moveTo(xR, yMid - 5);
    ctx.lineTo(xR, yMid + 5);
    ctx.stroke();
  });
  ctx.textAlign = "left";

  // X-axis ticks
  ctx.fillStyle = pal.muted;
  ctx.font = "10px 'JetBrains Mono', monospace";
  ctx.textAlign = "center";
  for (let t = 0; t <= 5; t++) {
    const v = minX + (t / 5) * (maxX - minX);
    ctx.fillText(v.toFixed(3), toX(v), pad.top + plotH + 16);
  }
  ctx.textAlign = "left";

  ctx.fillStyle = pal.text;
  ctx.font = "600 12px 'Inter', sans-serif";
  ctx.fillText("Synchronized Confidence Interval Method Comparison", 12, 16);
}

/**
 * Renders the Confidence Interval Coverage Caterpillar Plot (Part 12.2).
 */
export function renderCoverageCaterpillarCanvas(canvas, covResult) {
  const setup = setupHighDPICanvas(canvas, 280);
  if (!setup || !covResult || !covResult.intervals) return;
  const { ctx, width, height, pal } = setup;

  const pad = { top: 28, right: 24, bottom: 34, left: 46 };
  const plotW = width - pad.left - pad.right;
  const plotH = height - pad.top - pad.bottom;

  const shown = covResult.intervals.slice(0, 100);
  const M = shown.length;
  let minY = covResult.trueParam;
  let maxY = covResult.trueParam;
  for (const iv of shown) {
    if (iv.low < minY) minY = iv.low;
    if (iv.high > maxY) maxY = iv.high;
  }
  const span = Math.max(1, maxY - minY);
  minY -= 0.08 * span;
  maxY += 0.08 * span;

  const toX = (idx) => pad.left + ((idx + 0.5) / M) * plotW;
  const toY = (val) => pad.top + plotH - ((val - minY) / (maxY - minY)) * plotH;

  // True parameter horizontal line
  const yTrue = toY(covResult.trueParam);
  ctx.strokeStyle = pal.text;
  ctx.lineWidth = 2;
  ctx.setLineDash([6, 4]);
  ctx.beginPath();
  ctx.moveTo(pad.left, yTrue);
  ctx.lineTo(pad.left + plotW, yTrue);
  ctx.stroke();
  ctx.setLineDash([]);

  // Draw each study interval vertically
  shown.forEach((iv, idx) => {
    const xPx = toX(idx);
    const yL = toY(iv.low);
    const yH = toY(iv.high);
    const yEst = toY(iv.estimate);

    ctx.strokeStyle = iv.covers ? pal.primary : pal.secondary;
    ctx.lineWidth = iv.covers ? 1.6 : 2.6;
    ctx.beginPath();
    ctx.moveTo(xPx, yL);
    ctx.lineTo(xPx, yH);
    ctx.stroke();

    ctx.fillStyle = iv.covers ? pal.primary : pal.secondary;
    ctx.beginPath();
    ctx.arc(xPx, yEst, iv.covers ? 2.2 : 3.4, 0, Math.PI * 2);
    ctx.fill();
  });

  ctx.fillStyle = pal.text;
  ctx.font = "600 12px 'Inter', sans-serif";
  ctx.fillText(
    `Repeated Confidence Intervals Across ${M} Simulated Studies — Green: Covers True μ (${covResult.trueParam.toFixed(2)}) | Vermilion: Misses`,
    pad.left,
    16
  );
}

/**
 * Renders the Statistical Power Curve across Sample Sizes (Part 12.4).
 */
export function renderPowerCurveCanvas(canvas, powerResult) {
  const setup = setupHighDPICanvas(canvas, 250);
  if (!setup || !powerResult || !powerResult.powerCurve) return;
  const { ctx, width, height, pal } = setup;

  const pad = { top: 28, right: 28, bottom: 36, left: 52 };
  const plotW = width - pad.left - pad.right;
  const plotH = height - pad.top - pad.bottom;

  const curve = powerResult.powerCurve;
  const minN = curve[0].n;
  const maxN = curve[curve.length - 1].n;

  const toX = (n) => pad.left + ((n - minN) / Math.max(1, maxN - minN)) * plotW;
  const toY = (p) => pad.top + plotH - p * plotH;

  // Grid & 80% target power reference line
  ctx.strokeStyle = pal.grid;
  for (let g = 0; g <= 4; g++) {
    const pVal = 1 - g / 4;
    const y = toY(pVal);
    ctx.beginPath();
    ctx.moveTo(pad.left, y);
    ctx.lineTo(pad.left + plotW, y);
    ctx.stroke();
    ctx.fillStyle = pal.muted;
    ctx.font = "10px 'JetBrains Mono', monospace";
    ctx.textAlign = "right";
    ctx.fillText(`${Math.round(pVal * 100)}%`, pad.left - 6, y + 3);
  }
  ctx.textAlign = "left";

  // 80% conventional power line
  const y80 = toY(0.8);
  ctx.strokeStyle = pal.warning;
  ctx.setLineDash([5, 4]);
  ctx.beginPath();
  ctx.moveTo(pad.left, y80);
  ctx.lineTo(pad.left + plotW, y80);
  ctx.stroke();
  ctx.setLineDash([]);

  // Power curve line + Monte Carlo SE error bars
  ctx.strokeStyle = pal.primary;
  ctx.lineWidth = 2.6;
  ctx.beginPath();
  curve.forEach((pt, idx) => {
    const px = toX(pt.n);
    const py = toY(pt.empiricalPower);
    if (idx === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  });
  ctx.stroke();

  curve.forEach((pt) => {
    const px = toX(pt.n);
    const py = toY(pt.empiricalPower);
    const errTop = toY(Math.min(1, pt.empiricalPower + 1.96 * pt.mcSE));
    const errBot = toY(Math.max(0, pt.empiricalPower - 1.96 * pt.mcSE));

    ctx.strokeStyle = pal.primary;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(px, errTop);
    ctx.lineTo(px, errBot);
    ctx.stroke();

    ctx.fillStyle = pt.n === powerResult.sampleSize ? pal.secondary : pal.primary;
    ctx.beginPath();
    ctx.arc(px, py, pt.n === powerResult.sampleSize ? 5.5 : 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = pal.muted;
    ctx.font = "10px 'JetBrains Mono', monospace";
    ctx.textAlign = "center";
    ctx.fillText(`n=${pt.n}`, px, pad.top + plotH + 16);
  });
  ctx.textAlign = "left";

  ctx.fillStyle = pal.text;
  ctx.font = "600 12px 'Inter', sans-serif";
  ctx.fillText(`Empirical Statistical Power Curve (1 − β) vs Sample Size per Group (d = ${powerResult.standardizedEffectD.toFixed(2)}, α = ${powerResult.alpha})`, pad.left, 16);
}

/**
 * Exports a vector of distribution values as a clean standalone SVG string (Part 19.1).
 */

/**
 * Renders the Sample-Size & Precision Explorer: Margin of Error (MOE) & Power vs Sample Size n (Part 12.4).
 */
export function renderSampleSizeExplorerCanvas(canvas, powerResult, sd = 4.0) {
  const setup = setupHighDPICanvas(canvas, 250);
  if (!setup || !powerResult || !powerResult.powerCurve) return;
  const { ctx, width, height, pal } = setup;

  const pad = { top: 28, right: 54, bottom: 36, left: 52 };
  const plotW = width - pad.left - pad.right;
  const plotH = height - pad.top - pad.bottom;

  const curve = powerResult.powerCurve.map((pt) => {
    const seDiff = sd * Math.sqrt(2 / pt.n);
    const moe95 = 1.96 * seDiff;
    return { ...pt, seDiff, moe95 };
  });
  const minN = curve[0].n;
  const maxN = curve[curve.length - 1].n;
  const maxMOE = Math.max(0.5, curve[0].moe95 * 1.1);

  canvas._plotMeta = { padLeft: pad.left, plotW, xMin: minN, xMax: maxN };
  const toX = (n) => pad.left + ((n - minN) / Math.max(1, maxN - minN)) * plotW;
  const toYMOE = (m) => pad.top + plotH - (m / maxMOE) * plotH;
  const toYPow = (p) => pad.top + plotH - p * plotH;

  // Grid & dual Y axes (Left: MOE in units, Right: Power %)
  ctx.strokeStyle = pal.grid;
  for (let g = 0; g <= 4; g++) {
    const frac = 1 - g / 4;
    const y = pad.top + (g / 4) * plotH;
    ctx.beginPath();
    ctx.moveTo(pad.left, y);
    ctx.lineTo(pad.left + plotW, y);
    ctx.stroke();

    ctx.fillStyle = pal.warning;
    ctx.font = "10px 'JetBrains Mono', monospace";
    ctx.textAlign = "right";
    ctx.fillText(`±${(maxMOE * frac).toFixed(2)}`, pad.left - 6, y + 3);

    ctx.fillStyle = pal.primary;
    ctx.textAlign = "left";
    ctx.fillText(`${Math.round(frac * 100)}%`, pad.left + plotW + 6, y + 3);
  }

  // Curve 1: Margin of Error MOE(n) = 1.96 * sigma * sqrt(2/n)
  ctx.strokeStyle = pal.warning;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  curve.forEach((pt, idx) => {
    const px = toX(pt.n);
    const py = toYMOE(pt.moe95);
    if (idx === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  });
  ctx.stroke();

  // Curve 2: Empirical Statistical Power (1 - beta)
  ctx.strokeStyle = pal.primary;
  ctx.lineWidth = 2.4;
  ctx.setLineDash([6, 4]);
  ctx.beginPath();
  curve.forEach((pt, idx) => {
    const px = toX(pt.n);
    const py = toYPow(pt.empiricalPower);
    if (idx === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  });
  ctx.stroke();
  ctx.setLineDash([]);

  curve.forEach((pt) => {
    const px = toX(pt.n);
    const isActive = pt.n === powerResult.sampleSize;
    ctx.fillStyle = isActive ? pal.secondary : pal.warning;
    ctx.beginPath();
    ctx.arc(px, toYMOE(pt.moe95), isActive ? 5.5 : 3.8, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = isActive ? pal.secondary : pal.primary;
    ctx.beginPath();
    ctx.arc(px, toYPow(pt.empiricalPower), isActive ? 5.5 : 3.8, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = pal.muted;
    ctx.font = "10px 'JetBrains Mono', monospace";
    ctx.textAlign = "center";
    ctx.fillText(`n=${pt.n}`, px, pad.top + plotH + 16);
  });
  ctx.textAlign = "left";

  ctx.fillStyle = pal.text;
  ctx.font = "600 12px 'Inter', sans-serif";
  ctx.fillText(`Sample-Size Explorer: 95% Margin of Error ±MOE (Amber, Left) & Power 1−β (Emerald Dashed, Right) vs n`, pad.left, 16);
}

export function generateHistogramSVG(values, title = "ResampleLab Distribution") {
  if (!Array.isArray(values) || values.length === 0) return "<svg xmlns='http://www.w3.org/2000/svg'></svg>";
  const W = 680;
  const H = 300;
  const pad = { top: 36, right: 24, bottom: 40, left: 50 };
  const plotW = W - pad.left - pad.right;
  const plotH = H - pad.top - pad.bottom;

  const minV = Math.min(...values);
  const maxV = Math.max(...values);
  const span = Math.max(1e-6, maxV - minV);
  const nBins = 28;
  const bW = span / nBins;
  const counts = new Array(nBins).fill(0);
  for (const v of values) {
    const idx = Math.min(nBins - 1, Math.max(0, Math.floor((v - minV) / bW)));
    counts[idx]++;
  }
  const maxC = Math.max(1, ...counts);

  const rects = counts.map((c, b) => {
    const x = pad.left + (b / nBins) * plotW;
    const w = Math.max(1, plotW / nBins - 1.5);
    const h = (c / maxC) * plotH;
    const y = pad.top + plotH - h;
    return `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${w.toFixed(1)}" height="${h.toFixed(1)}" fill="#0F6E56" fill-opacity="0.28" stroke="#0F6E56" stroke-width="1"/>`;
  }).join("\n  ");

  const safeTitle = String(title).replace(/[<>&"']/g, "");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
  <rect width="100%" height="100%" fill="#F6F4EE"/>
  <text x="${pad.left}" y="22" font-family="Georgia, serif" font-size="15" font-weight="bold" fill="#141619">${safeTitle}</text>
  ${rects}
  <line x1="${pad.left}" y1="${pad.top + plotH}" x2="${pad.left + plotW}" y2="${pad.top + plotH}" stroke="#141619" stroke-width="1.5"/>
</svg>`;
}
