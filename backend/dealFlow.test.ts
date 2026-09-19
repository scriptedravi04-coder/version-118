import { describe, it, expect } from "vitest";
import {
  isUgcThread,
  isCampaignThread,
  getUgcOrderId,
  getCampaignDealId,
  isUuid,
  safeUuidOrNull
} from "./dealFlow";

const UUID = "8b3e45b5-4178-405a-9051-a94ba43a05c1";

describe("isUgcThread — every signal the old inline checks used", () => {
  it("the explicit flags", () => {
    expect(isUgcThread({ is_ugc: true })).toBe(true);
    expect(isUgcThread({ ugc_order_id: "ugcord_x" })).toBe(true);
    expect(isUgcThread({ ugc_brief_id: "brief_1" })).toBe(true);
    expect(isUgcThread({ deal_type: "UGC" })).toBe(true);
    expect(isUgcThread({ type: "ugc" })).toBe(true);
  });

  it("the id prefixes — the check Chat.jsx was missing", () => {
    // This is the exact row shape that made the inbox file a UGC thread under CAMPAIGN:
    // no is_ugc flag (the DB does not set it), only a prefixed deal_id.
    expect(isUgcThread({ id: "ugcord_mu6hn57v_1f7434", deal_id: "ugcord_mu6hn57v_1f7434" })).toBe(true);
    expect(isUgcThread({ id: "thread_ugc_abc" })).toBe(true);
    expect(isUgcThread({ deal_id: "ugcord_abc" })).toBe(true);
  });

  it("nested objects", () => {
    expect(isUgcThread({ ugc_order: { id: "ugcord_1" } })).toBe(true);
    expect(isUgcThread({ ugc_brief: { id: "b1" } })).toBe(true);
  });
});

describe("isCampaignThread", () => {
  it("recognises campaign threads", () => {
    expect(isCampaignThread({ id: "thread_camp_" + UUID, deal_id: UUID })).toBe(true);
    expect(isCampaignThread({ campaign_id: "camp_9" })).toBe(true);
    expect(isCampaignThread({ deal_type: "CAMPAIGN" })).toBe(true);
    expect(isCampaignThread({ deal_id: UUID })).toBe(true);
  });

  it("UGC always wins, even when a campaign_id is also present", () => {
    // A UGC order placed off the back of a campaign brief carries both. If campaign won,
    // the UGC order would be pushed down the campaign path and its ugc_orders row would
    // never be updated.
    const both = { campaign_id: "camp_9", deal_id: "ugcord_abc", is_ugc: true };
    expect(isUgcThread(both)).toBe(true);
    expect(isCampaignThread(both)).toBe(false);
  });

  it("the two are always mutually exclusive", () => {
    const samples: any[] = [
      { is_ugc: true },
      { deal_id: UUID },
      { id: "ugcord_1" },
      { id: "thread_camp_" + UUID },
      { campaign_id: "c1", ugc_order_id: "ugcord_2" },
      {}
    ];
    for (const s of samples) {
      expect(isUgcThread(s) && isCampaignThread(s)).toBe(false);
    }
  });
});

describe("id extraction never crosses the streams", () => {
  it("a UGC thread never yields a campaign deal id", () => {
    const t = { id: "thread_ugc_x", deal_id: "ugcord_abc", is_ugc: true };
    expect(getCampaignDealId(t)).toBeNull();
    expect(getUgcOrderId(t)).toBe("ugcord_abc");
  });

  it("a campaign thread never yields a UGC order id", () => {
    const t = { id: "thread_camp_" + UUID, deal_id: UUID };
    expect(getUgcOrderId(t)).toBeNull();
    expect(getCampaignDealId(t)).toBe(UUID);
  });

  it("getCampaignDealId only ever returns a real UUID", () => {
    // The guard that prevents Postgres error 22P02, which fails the whole statement.
    expect(getCampaignDealId({ deal_id: "ugcord_abc", campaign_id: "c" })).toBeNull();
    expect(getCampaignDealId({ deal_id: "not-a-uuid", campaign_id: "c" })).toBeNull();
  });
});

describe("uuid guards", () => {
  it("accepts real UUIDs and rejects UGC ids", () => {
    expect(isUuid(UUID)).toBe(true);
    expect(isUuid("ugcord_mu6hn57v_1f7434")).toBe(false);
    expect(isUuid("thread_camp_" + UUID)).toBe(false);
    expect(safeUuidOrNull("ugcord_x")).toBeNull();
    expect(safeUuidOrNull(UUID)).toBe(UUID);
  });
});
