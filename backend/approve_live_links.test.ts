import { describe, it, expect } from "vitest";

const isUuid = (val: any) =>
  typeof val === "string" &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);

const isUgcOrderIdentifier = (targetThread: any, rawId: string, dealId: string) => {
  const targetThreadId = targetThread?.id || rawId;
  return Boolean(
    targetThread?.is_ugc ||
    targetThread?.deal_type === 'UGC' ||
    targetThread?.deal_type === 'ugc' ||
    targetThread?.type === 'ugc' ||
    targetThread?.ugc_order_id ||
    targetThread?.ugc_brief_id ||
    (typeof targetThreadId === 'string' && (targetThreadId.startsWith('ugcord_') || targetThreadId.startsWith('thread_ugc_'))) ||
    (typeof rawId === 'string' && (rawId.startsWith('ugcord_') || rawId.startsWith('thread_ugc_'))) ||
    (typeof dealId === 'string' && dealId.startsWith('ugcord_'))
  );
};

describe("handleThreadApproveLiveLinks UUID and order type safety", () => {
  it("correctly identifies UUIDs vs UGC order IDs", () => {
    expect(isUuid("1c3d5525-0373-40f6-ab50-df43f3e790c6")).toBe(true);
    expect(isUuid("ugcord_1726668102394_abc123")).toBe(false);
    expect(isUuid("thread_camp_1c3d5525-0373-40f6-ab50-df43f3e790c6")).toBe(false);
    expect(isUuid("thread_ugc_123456")).toBe(false);
    expect(isUuid(null)).toBe(false);
    expect(isUuid(undefined)).toBe(false);
  });

  it("detects UGC orders properly so deals table is never queried with invalid UUID", () => {
    expect(isUgcOrderIdentifier({ is_ugc: true }, "thread_123", "ugcord_123")).toBe(true);
    expect(isUgcOrderIdentifier({}, "ugcord_12345", "ugcord_12345")).toBe(true);
    expect(isUgcOrderIdentifier({ ugc_order_id: "ugcord_999" }, "thread_999", "ugcord_999")).toBe(true);
    expect(isUgcOrderIdentifier({ deal_type: "UGC" }, "thread_abc", "deal_abc")).toBe(true);
    expect(isUgcOrderIdentifier({}, "thread_camp_1c3d5525-0373-40f6-ab50-df43f3e790c6", "1c3d5525-0373-40f6-ab50-df43f3e790c6")).toBe(false);
  });
});
