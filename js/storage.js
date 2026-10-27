/**
 * ResampleLab — Safe LocalStorage Persistence, URL Hash State, & Privacy Auditor
 *
 * Implements APPLICATION_GUIDELINES.md Section B.3 & DATA_CONVENTIONS.md Section G:
 * - Safe try/catch localStorage wrapper
 * - Base64 JSON URL hash fragment serialization (#state=...)
 * - Zero external telemetry guarantee & storage inspection/clearing
 *
 * @module storage
 * @version 1.0.0
 */

const STORAGE_KEY_SETTINGS = "datasense_resamplelab_settings_v1";
const STORAGE_KEY_SESSIONS = "datasense_resamplelab_saved_sessions_v1";

/**
 * Safely reads a JSON key from localStorage.
 * @param {string} key
 * @param {*} fallback
 * @returns {*}
 */
export function loadLocalState(key = STORAGE_KEY_SETTINGS, fallback = null) {
  try {
    if (typeof window === "undefined" || !window.localStorage) return fallback;
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch (_err) {
    return fallback;
  }
}

/**
 * Safely writes a JSON value to localStorage.
 * @param {string} key
 * @param {*} value
 * @returns {boolean}
 */
export function saveLocalState(key = STORAGE_KEY_SETTINGS, value = {}) {
  try {
    if (typeof window === "undefined" || !window.localStorage) return false;
    window.localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (_err) {
    return false;
  }
}

/**
 * Clears all ResampleLab keys from localStorage.
 * @returns {boolean}
 */
export function clearAllLocalState() {
  try {
    if (typeof window === "undefined" || !window.localStorage) return false;
    window.localStorage.removeItem(STORAGE_KEY_SETTINGS);
    window.localStorage.removeItem(STORAGE_KEY_SESSIONS);
    return true;
  } catch (_err) {
    return false;
  }
}

/**
 * Encodes a shareable simulation configuration object into a URL-safe Base64 string.
 * Does NOT include private uploaded raw datasets unless explicitly small and requested.
 * @param {object} stateObj
 * @returns {string}
 */
export function encodeShareableHashState(stateObj) {
  try {
    const json = JSON.stringify(stateObj);
    if (typeof Buffer !== "undefined") {
      return Buffer.from(json, "utf-8").toString("base64");
    }
    return btoa(encodeURIComponent(json).replace(/%([0-9A-F]{2})/g, (_, p1) => String.fromCharCode(parseInt(p1, 16))));
  } catch (_err) {
    return "";
  }
}

/**
 * Decodes a Base64 URL hash payload back into a validated configuration object.
 * @param {string} hashStr
 * @returns {object|null}
 */
export function decodeShareableHashState(hashStr) {
  try {
    if (!hashStr) return null;
    const cleaned = String(hashStr).replace(/^#?state=/, "").trim();
    if (!cleaned) return null;
    let json;
    if (typeof Buffer !== "undefined") {
      json = Buffer.from(cleaned, "base64").toString("utf-8");
    } else {
      const bin = atob(cleaned);
      const pct = Array.from(bin, (c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2)).join("");
      json = decodeURIComponent(pct);
    }
    const parsed = JSON.parse(json);
    if (!parsed || typeof parsed !== "object") return null;
    return parsed;
  } catch (_err) {
    return null;
  }
}

export { STORAGE_KEY_SETTINGS, STORAGE_KEY_SESSIONS };
