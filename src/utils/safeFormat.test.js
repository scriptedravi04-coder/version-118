import { describe, it, expect } from "vitest";
import {
  toNumber,
  formatAmount,
  formatINR,
  formatINROrDash,
  safeUpper,
  safeLower,
  safeArray,
  safeJsonParse
} from "./safeFormat";

// The values below are exactly what used to reach the escrow modal and blank the screen.
const CRASHERS = [undefined, null, "", NaN, {}, [], "abc"];

describe("formatAmount survives everything the API can send", () => {
  it("never throws", () => {
    for (const v of CRASHERS) {
      expect(() => formatAmount(v)).not.toThrow();
    }
  });

  it("is what the old code did, minus the crash", () => {
    // `selectedOrder.amount.toLocaleString('en-IN')` threw a TypeError here and took the
    // whole page down with it.
    expect(() => (undefined).toLocaleString("en-IN")).toThrow(TypeError);
    expect(formatAmount(undefined)).toBe("0");
  });

  it("formats real amounts with Indian grouping", () => {
    expect(formatAmount(3500)).toBe("3,500");
    expect(formatAmount(150000)).toBe("1,50,000");
    expect(formatINR(2967)).toBe("₹2,967");
  });

  it("copes with amounts that arrive as strings", () => {
    expect(formatAmount("3500")).toBe("3,500");
    expect(formatAmount("₹3,500")).toBe("3,500");
  });
});

describe("formatINROrDash", () => {
  it("shows a dash rather than pretending the value is zero", () => {
    expect(formatINROrDash(undefined)).toBe("—");
    expect(formatINROrDash(null)).toBe("—");
    expect(formatINROrDash("")).toBe("—");
    expect(formatINROrDash(0)).toBe("₹0");
    expect(formatINROrDash(3500)).toBe("₹3,500");
  });
});

describe("toNumber", () => {
  it("returns the fallback instead of NaN", () => {
    expect(toNumber(undefined)).toBe(0);
    expect(toNumber("abc")).toBe(0);
    expect(toNumber(NaN)).toBe(0);
    expect(toNumber("1500")).toBe(1500);
    expect(toNumber(-250)).toBe(-250);
  });
});

describe("string and array helpers", () => {
  it("safeUpper / safeLower never throw on null", () => {
    expect(() => safeUpper(undefined)).not.toThrow();
    expect(safeUpper(null)).toBe("");
    expect(safeUpper("revision_req")).toBe("REVISION_REQ");
    expect(safeLower(undefined)).toBe("");
  });

  it("safeArray makes .map() safe on any API shape", () => {
    expect(safeArray(undefined)).toEqual([]);
    expect(safeArray(null)).toEqual([]);
    expect(safeArray({ a: 1 })).toEqual([]);
    expect(safeArray([1, 2])).toEqual([1, 2]);
    expect(() => safeArray(undefined).map((x) => x)).not.toThrow();
  });

  it("safeJsonParse returns a fallback instead of throwing", () => {
    expect(safeJsonParse("{bad json")).toBeNull();
    expect(safeJsonParse("", { a: 1 })).toEqual({ a: 1 });
    expect(safeJsonParse('{"a":1}')).toEqual({ a: 1 });
    expect(safeJsonParse({ already: "object" })).toEqual({ already: "object" });
  });
});
