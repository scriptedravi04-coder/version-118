import { describe, it, expect } from "vitest";
import { resolveTestMode, isSimulatedPaymentId, decideSignatureCheck } from "./paymentTestMode";

describe("resolveTestMode", () => {
  it("is on in local development", () => {
    expect(resolveTestMode({ NODE_ENV: "development" })).toBe(true);
  });

  it("is off for a plain production deploy", () => {
    expect(resolveTestMode({ NODE_ENV: "production", APP_URL: "https://ybex.in" })).toBe(false);
  });

  it("PAYMENTS_TEST_MODE=false wins over the run.app heuristic", () => {
    // Without the explicit switch a default Cloud Run domain keeps test mode on
    // even at NODE_ENV=production. That trap is what this variable closes.
    expect(resolveTestMode({ NODE_ENV: "production", APP_URL: "https://ybex-xyz.run.app" })).toBe(true);
    expect(
      resolveTestMode({ NODE_ENV: "production", APP_URL: "https://ybex-xyz.run.app", PAYMENTS_TEST_MODE: "false" })
    ).toBe(false);
  });

  it("PAYMENTS_TEST_MODE=true wins in the other direction", () => {
    expect(
      resolveTestMode({ NODE_ENV: "production", APP_URL: "https://ybex.in", PAYMENTS_TEST_MODE: "true" })
    ).toBe(true);
  });

  it("ignores a blank PAYMENTS_TEST_MODE and falls back to the heuristics", () => {
    expect(
      resolveTestMode({ NODE_ENV: "production", APP_URL: "https://ybex.in", PAYMENTS_TEST_MODE: "  " })
    ).toBe(false);
  });

  it("leaves today's behaviour unchanged when the variable is unset", () => {
    expect(resolveTestMode({ NODE_ENV: "production", APP_URL: "http://localhost:3000" })).toBe(true);
    expect(resolveTestMode({})).toBe(true);
  });
});

describe("isSimulatedPaymentId", () => {
  it("recognises simulator ids and nothing else", () => {
    expect(isSimulatedPaymentId("pay_test_1737000000")).toBe(true);
    expect(isSimulatedPaymentId("pay_PLm9XyZ123")).toBe(false);
    expect(isSimulatedPaymentId(null)).toBe(false);
    expect(isSimulatedPaymentId(undefined)).toBe(false);
  });
});

describe("decideSignatureCheck", () => {
  it("rejects a simulated payment id when test mode is off", () => {
    // The hole this closes: a caller sending pay_test_* in production used to
    // skip signature verification entirely and have escrow marked funded.
    expect(
      decideSignatureCheck({ paymentId: "pay_test_forged", testMode: false, hasSecret: true }).action
    ).toBe("reject_simulated");
  });

  it("rejects a simulated id in production even when no secret is configured", () => {
    expect(
      decideSignatureCheck({ paymentId: "pay_test_forged", testMode: false, hasSecret: false }).action
    ).toBe("reject_simulated");
  });

  it("still accepts a simulated payment id while test mode is on", () => {
    expect(
      decideSignatureCheck({ paymentId: "pay_test_1737000000", testMode: true, hasSecret: false }).action
    ).toBe("skip");
  });

  it("verifies a real payment in production", () => {
    expect(
      decideSignatureCheck({ paymentId: "pay_PLm9XyZ123", testMode: false, hasSecret: true }).action
    ).toBe("verify");
  });

  it("refuses a real production payment when the secret is missing", () => {
    expect(
      decideSignatureCheck({ paymentId: "pay_PLm9XyZ123", testMode: false, hasSecret: false }).action
    ).toBe("missing_secret");
  });

  it("skips verification for every payment while test mode is on", () => {
    expect(
      decideSignatureCheck({ paymentId: "pay_PLm9XyZ123", testMode: true, hasSecret: true }).action
    ).toBe("skip");
  });
});
