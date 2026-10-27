/**
 * ResampleLab — Deterministic Pseudorandom Number Generation (PRNG) Engine
 *
 * Implements Mulberry32 and SplitMix32 stream derivation for reproducible
 * statistical simulations, bootstrap resampling, permutation inference, and
 * deterministic Web Worker stream partitioning.
 *
 * @module prng
 * @version 1.0.0
 */

export const PRNG_VERSION = "Mulberry32-v1.0";

/**
 * Normalizes any user seed (number or string) to an unsigned 32-bit integer.
 * Uses FNV-1a hash for string seeds and bit-mixing for integer seeds.
 *
 * @param {number|string} seedInput
 * @returns {number} Unsigned 32-bit integer seed
 */
export function normalizeSeed(seedInput) {
  if (typeof seedInput === "number" && Number.isFinite(seedInput)) {
    return (Math.floor(Math.abs(seedInput)) >>> 0) || 1;
  }
  const str = String(seedInput ?? "4289104").trim();
  if (/^\d+$/.test(str)) {
    const parsed = Number.parseInt(str, 10);
    if (Number.isFinite(parsed)) {
      return (parsed >>> 0) || 1;
    }
  }
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return (h >>> 0) || 1;
}

/**
 * SplitMix32 mixer for deriving independent sub-stream seeds (e.g., across
 * Web Workers or repeated experiment trials) without state correlation.
 *
 * @param {number} baseSeed
 * @param {number} streamIndex
 * @returns {number} Derived unsigned 32-bit integer seed
 */
export function deriveStreamSeed(baseSeed, streamIndex = 0) {
  let z = ((baseSeed >>> 0) + Math.imul((streamIndex >>> 0) + 1, 0x9E3779B9)) >>> 0;
  z = Math.imul(z ^ (z >>> 16), 0x85EBCA6B) >>> 0;
  z = Math.imul(z ^ (z >>> 13), 0xC2B2AE35) >>> 0;
  return ((z ^ (z >>> 16)) >>> 0) || 1;
}

/**
 * Creates a stateful, deterministic Mulberry32 pseudorandom number generator.
 * Period: 2^32. Passes standard statistical randomness checks for Monte Carlo
 * pedagogy and resampling inference.
 *
 *Note: This is a deterministic scientific simulation PRNG, NOT a
 * cryptographically secure random number generator (CSPRNG).
 *
 * @param {number|string} seedInput
 * @returns {object} Stateful PRNG instance
 */
export function createPRNG(seedInput = 4289104) {
  const initialSeed = normalizeSeed(seedInput);
  let state = initialSeed >>> 0;
  let spareNormal = null;
  let drawCount = 0;

  /**
   * Generates a uniform float in [0, 1).
   * @returns {number}
   */
  function nextFloat() {
    drawCount++;
    state = (state + 0x6D2B79F5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /**
   * Generates a strictly open uniform float in (0, 1) avoiding 0 and 1 endpoints.
   * Safe for inverse CDF and Box-Muller transforms.
   * @returns {number}
   */
  function nextOpenFloat() {
    let u = nextFloat();
    while (u <= 1e-15 || u >= 1 - 1e-15) {
      u = nextFloat();
    }
    return u;
  }

  /**
   * Generates a uniform random integer in [min, max] inclusive.
   * @param {number} min
   * @param {number} max
   * @returns {number}
   */
  function nextInt(min, max) {
    const lo = Math.ceil(Math.min(min, max));
    const hi = Math.floor(Math.max(min, max));
    if (lo === hi) return lo;
    return lo + Math.floor(nextFloat() * (hi - lo + 1));
  }

  /**
   * Generates a standard normal N(0, 1) variate using the polar Marsaglia / Box-Muller transform.
   * @returns {number}
   */
  function nextStandardNormal() {
    if (spareNormal !== null) {
      const val = spareNormal;
      spareNormal = null;
      return val;
    }
    let u = 0;
    let v = 0;
    let s = 0;
    do {
      u = 2.0 * nextOpenFloat() - 1.0;
      v = 2.0 * nextOpenFloat() - 1.0;
      s = u * u + v * v;
    } while (s >= 1.0 || s === 0.0);
    const mul = Math.sqrt((-2.0 * Math.log(s)) / s);
    spareNormal = v * mul;
    return u * mul;
  }

  /**
   * Performs an in-place Fisher-Yates (Knuth) shuffle on an array.
   * @template T
   * @param {T[]} array
   * @returns {T[]} The mutated array
   */
  function shuffleInPlace(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(nextFloat() * (i + 1));
      const tmp = array[i];
      array[i] = array[j];
      array[j] = tmp;
    }
    return array;
  }

  /**
   * Returns a new shuffled copy of the input array without mutating the original.
   * @template T
   * @param {T[]} array
   * @returns {T[]}
   */
  function shuffle(array) {
    return shuffleInPlace(array.slice());
  }

  /**
   * Forks an independent child PRNG stream indexed by `streamIdx`.
   * @param {number} streamIdx
   * @returns {object}
   */
  function fork(streamIdx = 1) {
    return createPRNG(deriveStreamSeed(state, streamIdx));
  }

  /**
   * Resets the generator back to its initial seed state.
   */
  function reset() {
    state = initialSeed >>> 0;
    spareNormal = null;
    drawCount = 0;
  }

  return {
    algorithm: PRNG_VERSION,
    initialSeed,
    nextFloat,
    nextOpenFloat,
    nextInt,
    nextStandardNormal,
    shuffleInPlace,
    shuffle,
    fork,
    reset,
    getState: () => ({
      algorithm: PRNG_VERSION,
      initialSeed,
      currentState: state >>> 0,
      drawCount
    })
  };
}
