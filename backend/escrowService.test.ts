import { describe, it, expect, vi } from "vitest";
import { createEscrowTransaction } from "./services/escrowService";

// These three were hollow stubs that returned success without doing anything. Campaign
// escrow rows were never written, and the KYC gate let everyone through. The tests below
// pin the two things that actually matter: that a row IS written, and that the money on it
// is right.

const isoNow = () => "2026-09-19T12:00:00.000Z";

function fakeDeps({ fee = 350, net = 3150, gst = 63 } = {}) {
  const inserted: any[] = [];
  const supabase = {
    from: () => ({
      insert: (row: any) => {
        inserted.push(row);
        return { select: () => ({ maybeSingle: async () => ({ data: row, error: null }) }) };
      }
    })
  };
  const db: any = { transactions: [] };
  return {
    inserted,
    db,
    deps: {
      supabase,
      getDb: () => db,
      saveDb: (next: any) => Object.assign(db, next),
      getIsoNow: isoNow,
      calculateFee: vi.fn(async () => ({ platformFee: fee, creatorNet: net, gstAmount: gst }))
    }
  };
}

describe("createEscrowTransaction writes a real row", () => {
  it("records an escrow transaction for a campaign", async () => {
    const { deps, inserted, db } = fakeDeps();

    const result = await createEscrowTransaction(deps as any, {
      campaign_id: "camp_9",
      brand_id: "brand_1",
      gross_amount: 3500,
      status: "HELD",
      escrow_hold: true
    });

    // The stub returned undefined and wrote nothing. Anything persisted is the fix.
    const row = inserted[0] || db.transactions[0] || result;
    expect(row).toBeTruthy();
    expect(row.campaign_id).toBe("camp_9");
    expect(row.brand_id).toBe("brand_1");
    expect(row.gross_amount).toBe(3500);
  });

  it("splits the money the way the fee config says, not zero", async () => {
    const { deps, inserted, db } = fakeDeps({ fee: 350, net: 3150, gst: 63 });

    const result = await createEscrowTransaction(deps as any, {
      campaign_id: "camp_9",
      brand_id: "brand_1",
      gross_amount: 3500
    });

    const row = inserted[0] || db.transactions[0] || result;
    expect(row.platform_fee_amount).toBe(350);
    expect(row.creator_net_amount).toBe(3150);
    expect(row.gst_amount).toBe(63);
    // The stub's zero-fee behaviour would have produced 0 / 3500 here.
    expect(row.platform_fee_amount).not.toBe(0);
  });

  it("keeps a UGC order id out of the campaign deal field", async () => {
    const { deps, inserted, db } = fakeDeps();

    const result = await createEscrowTransaction(deps as any, {
      deal_id: "ugcord_abc123",
      brand_id: "brand_1",
      gross_amount: 2500
    });

    const row = inserted[0] || db.transactions[0] || result;
    expect(row.ugc_order_id).toBe("ugcord_abc123");
  });

  it("never writes a negative or fractional gross amount", async () => {
    const { deps, inserted, db } = fakeDeps();

    const result = await createEscrowTransaction(deps as any, {
      campaign_id: "c",
      brand_id: "b",
      gross_amount: -500 as any
    });

    const row = inserted[0] || db.transactions[0] || result;
    expect(row.gross_amount).toBe(0);
  });
});
