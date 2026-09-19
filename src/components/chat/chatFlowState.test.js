import { describe, it, expect } from "vitest";
import { resolveReviewFlags } from "./chatFlowState";

describe("resolveReviewFlags — revision vs submitted precedence", () => {
  it("shows the revision state even when the ugc_order row is still stale at SUBMITTED", () => {
    // This is the exact shape of the bug reported on 18 Sep 2026. The brand asked for
    // changes, the thread moved to REVISION_REQUESTED, but the ugc_orders write had not
    // landed so ugcStatus still read SUBMITTED. With the wrong precedence the chat stayed
    // on "awaiting review" and the revision card never rendered.
    const flags = resolveReviewFlags({
      flowState: "REVISION_REQUESTED",
      ugcStatus: "SUBMITTED",
      rawStatus: "ACTIVE",
      latestActionType: "revision_requested"
    });

    expect(flags.isRevisionRequested).toBe(true);
    expect(flags.isContentSubmitted).toBe(false);
  });

  it("shows the revision state from the message alone when no status has caught up yet", () => {
    const flags = resolveReviewFlags({
      flowState: "SUBMITTED",
      ugcStatus: "SUBMITTED",
      latestActionType: "revision_requested"
    });

    expect(flags.isRevisionRequested).toBe(true);
    expect(flags.isContentSubmitted).toBe(false);
  });

  it("clears the revision state once the creator re-uploads", () => {
    // The one signal allowed to end a revision: a fresh submission as the latest action.
    const flags = resolveReviewFlags({
      flowState: "REVISION_REQUESTED",
      ugcStatus: "REVISION_REQUESTED",
      latestActionType: "content_proof_submitted"
    });

    expect(flags.isRevisionRequested).toBe(false);
    expect(flags.isContentSubmitted).toBe(true);
  });

  it("keeps the declined state visible over a stale SUBMITTED order status", () => {
    const flags = resolveReviewFlags({
      flowState: "REVISION_DECLINED",
      ugcStatus: "SUBMITTED",
      latestActionType: "revision_declined"
    });

    expect(flags.isRevisionDeclined).toBe(true);
    expect(flags.isContentSubmitted).toBe(false);
  });

  it("still reports a plain submission with no revision history", () => {
    const flags = resolveReviewFlags({
      flowState: "SUBMITTED",
      ugcStatus: "SUBMITTED",
      latestActionType: "content_proof_submitted"
    });

    expect(flags.isContentSubmitted).toBe(true);
    expect(flags.isRevisionRequested).toBe(false);
    expect(flags.isRevisionDeclined).toBe(false);
  });

  it("reports nothing active once the deal is completed or approved", () => {
    expect(
      resolveReviewFlags({ isDealCompleted: true, flowState: "REVISION_REQUESTED" })
        .isRevisionRequested
    ).toBe(false);

    expect(
      resolveReviewFlags({ isContentApproved: true, flowState: "REVISION_REQUESTED" })
        .isRevisionRequested
    ).toBe(false);

    expect(
      resolveReviewFlags({ isContentApproved: true, ugcStatus: "SUBMITTED" }).isContentSubmitted
    ).toBe(false);
  });

  it("handles the DB-compliant REVISION_REQ status correctly", () => {
    const flags = resolveReviewFlags({
      flowState: "REVISION_REQ",
      ugcStatus: "REVISION_REQ",
      rawStatus: "REVISION_REQ",
      latestActionType: "revision_requested"
    });

    expect(flags.isRevisionRequested).toBe(true);
    expect(flags.isContentSubmitted).toBe(false);
  });
});
