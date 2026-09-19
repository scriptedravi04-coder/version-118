import { describe, it, expect } from "vitest";
import { mergeOrderRecords, isCollaborationDeliverable } from "./ugc_routes";

describe("isCollaborationDeliverable", () => {
  it("detects collaboration deliverable types that require live links", () => {
    expect(isCollaborationDeliverable("collaboration_reel")).toBe(true);
    expect(isCollaborationDeliverable("instagram_reel")).toBe(true);
    expect(isCollaborationDeliverable("collab_post")).toBe(true);
    expect(isCollaborationDeliverable("")).toBe(true); // default fallback
  });

  it("detects normal UGC video deliverables that only require draft approval", () => {
    expect(isCollaborationDeliverable("ugc_video_raw")).toBe(false);
    expect(isCollaborationDeliverable("ugc_video_edited")).toBe(false);
    expect(isCollaborationDeliverable("ugc_raw_video")).toBe(false);
    expect(isCollaborationDeliverable("raw_video")).toBe(false);
  });
});

// The approve bug: a lifecycle write landed in the local db but not in Supabase. The old
// merge always preferred the Supabase copy, so the brand's order page kept rendering the
// pre-approval row and the UI "reverted" on the next 20s poll.

describe("mergeOrderRecords", () => {
  const staleRemote = {
    id: "ord-1",
    status: "SUBMITTED",
    payment_status: "ESCROW_HELD",
    updated_at: "2026-09-16T12:00:00.000Z",
  };
  const freshLocal = {
    id: "ord-1",
    status: "COMPLETED",
    payment_status: "RELEASED",
    updated_at: "2026-09-16T12:05:00.000Z",
  };

  it("uses the newer local row when Supabase is behind", () => {
    const merged = mergeOrderRecords(staleRemote, freshLocal);
    expect(merged.status).toBe("COMPLETED");
    expect(merged.payment_status).toBe("RELEASED");
  });

  it("still prefers Supabase when it is the newer copy", () => {
    const staleLocal = { ...freshLocal, status: "SUBMITTED", payment_status: "ESCROW_HELD", updated_at: "2026-09-16T11:00:00.000Z" };
    const freshRemote = { ...staleRemote, status: "COMPLETED", payment_status: "RELEASED", updated_at: "2026-09-16T12:30:00.000Z" };
    const merged = mergeOrderRecords(freshRemote, staleLocal);
    expect(merged.status).toBe("COMPLETED");
    expect(merged.payment_status).toBe("RELEASED");
  });

  it("keeps fields that only one side has", () => {
    const merged = mergeOrderRecords(
      { ...staleRemote, brief_id: "brief-9" },
      { ...freshLocal, video_url: "https://example.com/v.mp4" }
    );
    expect(merged.brief_id).toBe("brief-9");
    expect(merged.video_url).toBe("https://example.com/v.mp4");
  });

  it("handles a row that exists on only one side", () => {
    expect(mergeOrderRecords(null, freshLocal)).toBe(freshLocal);
    expect(mergeOrderRecords(staleRemote, null)).toBe(staleRemote);
  });

  it("recognizes remote resubmission via delivered_at when updated_at is missing", () => {
    const localRevisionRequested = {
      id: "ord-2",
      status: "REVISION_REQ",
      video_url: "https://example.com/old_draft.mp4",
      updated_at: "2026-09-18T17:31:49.801Z",
      revision_feedback: "need chnges"
    };
    const remoteNewSubmission = {
      id: "ord-2",
      status: "SUBMITTED",
      video_url: "https://example.com/new_revised_draft.mp4",
      created_at: "2026-09-18T16:33:46.176Z",
      delivered_at: "2026-09-18T17:35:39.550Z"
      // Note: remote does not have updated_at column in Supabase schema
    };
    const merged = mergeOrderRecords(remoteNewSubmission, localRevisionRequested);
    expect(merged.status).toBe("SUBMITTED");
    expect(merged.video_url).toBe("https://example.com/new_revised_draft.mp4");
    expect(merged.delivered_at).toBe("2026-09-18T17:35:39.550Z");
    expect(merged.revision_feedback).toBe("need chnges");
  });
});
