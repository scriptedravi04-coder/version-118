// Payment test-mode resolution and Razorpay signature-check policy.
//
// Kept in its own module, free of the server closure, so both decisions can be
// unit tested. Getting either wrong means escrow can be marked funded without a
// verified payment, so neither should be inlined back into a route.

export type SignatureDecision =
  | { action: "reject_simulated"; reason: string }
  | { action: "missing_secret"; reason: string }
  | { action: "skip" }
  | { action: "verify" };

/**
 * Is the server currently in payment test mode?
 *
 * PAYMENTS_TEST_MODE is the explicit switch and always wins. Set it to "false"
 * in production and the heuristics below are ignored entirely.
 *
 * The heuristics are the historical fallback and are kept so that behaviour is
 * unchanged for environments that have not set the variable. They are generous,
 * and `APP_URL` containing "run.app" is the dangerous one: a real production
 * deploy on a default Cloud Run domain would otherwise silently stay in test
 * mode. Set the explicit variable rather than relying on these.
 */
export function resolveTestMode(env: Record<string, string | undefined> = process.env): boolean {
  const explicit = env.PAYMENTS_TEST_MODE;
  if (typeof explicit === "string" && explicit.trim() !== "") {
    return ["1", "true", "yes", "on"].includes(explicit.trim().toLowerCase());
  }
  return (
    env.NODE_ENV !== "production" ||
    Boolean(env.APP_URL?.includes("run.app")) ||
    Boolean(env.APP_URL?.includes("localhost"))
  );
}

/** Ids minted by the test-payment simulator, e.g. `pay_test_1737000000`. */
export function isSimulatedPaymentId(paymentId?: string | null): boolean {
  return typeof paymentId === "string" && paymentId.startsWith("pay_test_");
}

/**
 * What should /payments/razorpay/verify do with this payment?
 *
 * The rule that matters: a `pay_test_` id is honoured ONLY while test mode is
 * on. It used to short-circuit the signature check on its own, which meant any
 * caller could send `razorpay_payment_id: "pay_test_anything"` in production and
 * have escrow marked funded without paying.
 */
export function decideSignatureCheck(opts: {
  paymentId?: string | null;
  testMode: boolean;
  hasSecret: boolean;
}): SignatureDecision {
  const { paymentId, testMode, hasSecret } = opts;

  if (isSimulatedPaymentId(paymentId) && !testMode) {
    return {
      action: "reject_simulated",
      reason: "Simulated test payments are not accepted outside test mode."
    };
  }

  if (testMode) return { action: "skip" };

  if (!hasSecret) {
    return {
      action: "missing_secret",
      reason: "Razorpay secret key is not configured on the server."
    };
  }

  return { action: "verify" };
}
