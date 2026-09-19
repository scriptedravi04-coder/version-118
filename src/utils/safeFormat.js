// Crash-safe formatting for money and text coming off the API.
//
// `amount.toLocaleString()` throws a TypeError the moment `amount` is undefined or null,
// and because React has no way to recover mid-render, one missing field takes the whole
// page down. This is not hypothetical — the escrow release modal calls
// `selectedOrder.amount.toLocaleString('en-IN')` in several places, and that object comes
// straight from an API response where `amount` is not guaranteed.
//
// A missing amount should render as ₹0 and be visibly wrong, not blank the screen.
//
// Use these instead of calling .toLocaleString() / .toUpperCase() on API data directly.

/** Coerce anything to a finite number. Handles "1,500", "₹1500", null, undefined, NaN. */
export function toNumber(value, fallback = 0) {
  if (typeof value === "number") return Number.isFinite(value) ? value : fallback;
  if (typeof value === "string") {
    const cleaned = value.replace(/[^0-9.-]/g, "");
    const n = Number(cleaned);
    return Number.isFinite(n) ? n : fallback;
  }
  return fallback;
}

/** "1,50,000" — Indian digit grouping, never throws. */
export function formatAmount(value, fallback = 0) {
  return toNumber(value, fallback).toLocaleString("en-IN");
}

/** "₹1,50,000" — never throws. */
export function formatINR(value, fallback = 0) {
  return `₹${formatAmount(value, fallback)}`;
}

/**
 * Like formatINR but returns a dash for missing values instead of ₹0.
 * Use where showing ₹0 would read as "this is free" rather than "we don't know yet".
 */
export function formatINROrDash(value, dash = "—") {
  if (value === null || value === undefined || value === "") return dash;
  const n = toNumber(value, NaN);
  return Number.isFinite(n) ? `₹${n.toLocaleString("en-IN")}` : dash;
}

/** Uppercase that tolerates null/undefined/numbers. */
export function safeUpper(value, fallback = "") {
  if (value === null || value === undefined) return fallback;
  return String(value).toUpperCase();
}

/** Lowercase that tolerates null/undefined/numbers. */
export function safeLower(value, fallback = "") {
  if (value === null || value === undefined) return fallback;
  return String(value).toLowerCase();
}

/** Always returns an array, so `.map()` is safe on anything the API sends back. */
export function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

/** JSON.parse that returns a fallback instead of throwing on bad or empty input. */
export function safeJsonParse(value, fallback = null) {
  if (value === null || value === undefined || value === "") return fallback;
  if (typeof value === "object") return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

export default {
  toNumber,
  formatAmount,
  formatINR,
  formatINROrDash,
  safeUpper,
  safeLower,
  safeArray,
  safeJsonParse
};
