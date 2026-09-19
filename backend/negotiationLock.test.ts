import { describe, it, expect } from "vitest";
import { isCampaignThreadRecord, negotiationLockedFor } from "./deals_chat_routes";

const BRAND = { user_id: "brand-1", role: "brand" };
const CREATOR = { user_id: "creator-1", role: "creator" };

const campaignThread = (extra: Record<string, any> = {}) => ({
  id: "11111111-1111-1111-1111-111111111111",
  campaign_id: "camp-9",
  brand_id: BRAND.user_id,
  creator_id: CREATOR.user_id,
  ...extra
});

const ugcThread = (extra: Record<string, any> = {}) => ({
  id: "thread_ugc_abc",
  deal_id: "ugcord_abc",
  is_ugc: true,
  brand_id: BRAND.user_id,
  creator_id: CREATOR.user_id,
  ...extra
});

describe("isCampaignThreadRecord", () => {
  it("recognises a campaign thread", () => {
    expect(isCampaignThreadRecord(campaignThread())).toBe(true);
    expect(isCampaignThreadRecord({ id: "thread_camp_x" })).toBe(true);
  });

  it("never treats a UGC thread as a campaign, even with a campaign_id present", () => {
    expect(isCampaignThreadRecord(ugcThread())).toBe(false);
    expect(isCampaignThreadRecord(ugcThread({ campaign_id: "camp-9" }))).toBe(false);
  });
});

describe("negotiationLockedFor", () => {
  it("locks both parties once the brand has signed", () => {
    const thread = campaignThread({ agreement_signed_brand: true });
    expect(negotiationLockedFor(thread, BRAND)).toBe(true);
    expect(negotiationLockedFor(thread, CREATOR)).toBe(true);
  });

  it("locks both parties once the creator has signed", () => {
    const thread = campaignThread({ agreement_signed_creator: true });
    expect(negotiationLockedFor(thread, CREATOR)).toBe(true);
    expect(negotiationLockedFor(thread, BRAND)).toBe(true);
  });

  it("locks both parties once the agreement is ready for signature", () => {
    const thread = campaignThread({ flow_state: "AI_AGREEMENT_READY" });
    expect(negotiationLockedFor(thread, BRAND)).toBe(true);
    expect(negotiationLockedFor(thread, CREATOR)).toBe(true);
  });

  it("does not lock before anyone signs or before agreement is ready", () => {
    expect(negotiationLockedFor(campaignThread({ flow_state: "NEGOTIATING" }), BRAND)).toBe(false);
    expect(negotiationLockedFor(campaignThread({ flow_state: "NEGOTIATING" }), CREATOR)).toBe(false);
  });

  it("never locks a UGC thread — UGC has no signature stage", () => {
    const thread = ugcThread({ agreement_signed_brand: true, agreement_signed_creator: true });
    expect(negotiationLockedFor(thread, BRAND)).toBe(false);
    expect(negotiationLockedFor(thread, CREATOR)).toBe(false);
  });

  it("leaves admins unlocked so support can still correct a contract", () => {
    const thread = campaignThread({ agreement_signed_brand: true });
    expect(negotiationLockedFor(thread, { user_id: BRAND.user_id, role: "admin" })).toBe(false);
  });
});
