import { describe, it, expect, vi } from "vitest";
import express from "express";
import { setupCampaignThreadRoutes, createCampaignLifecycleHandlers } from "./campaigns_routes";
import { setupUgcOrderRoutes, createUgcLifecycleHandlers } from "./ugc_routes";
import { setupDealsChatRoutes } from "./deals_chat_routes";
import { setupBrandsRoutes } from "./brands_routes";
import { setupCreatorsRoutes } from "./creators_routes";
import { setupMiscRoutes } from "./misc_routes";
import { isUgcThread, isCampaignThread, getCampaignDealId, getUgcOrderId, isUuid } from "./dealFlow";

describe("Phase A: Separate Campaign and UGC Thread Routes", () => {
  it("setupCampaignThreadRoutes registers all campaign thread routes", () => {
    const app = express();
    const router = express.Router();

    const handleCampaignApprove = vi.fn();
    const handleCampaignApproveContent = vi.fn();
    const handleCampaignRevision = vi.fn();
    const handleCampaignDeclineRevisions = vi.fn();
    const handleCampaignCancel = vi.fn();

    setupCampaignThreadRoutes(app, router, {
      handleCampaignApprove,
      handleCampaignApproveContent,
      handleCampaignRevision,
      handleCampaignDeclineRevisions,
      handleCampaignCancel,
    });

    const registeredPostPaths = router.stack
      .filter((layer: any) => layer.route && layer.route.methods?.post)
      .flatMap((layer: any) => layer.route.path);

    expect(registeredPostPaths).toContain("/campaign/threads/:id/mark-complete");
    expect(registeredPostPaths).toContain("/campaign/threads/:id/approve-live-links");
    expect(registeredPostPaths).toContain("/campaign/threads/:id/approve-content");
    expect(registeredPostPaths).toContain("/campaign/threads/:id/reject-content");
    expect(registeredPostPaths).toContain("/campaign/threads/:id/request-revision");
    expect(registeredPostPaths).toContain("/campaign/threads/:id/decline-revisions");
    expect(registeredPostPaths).toContain("/campaign/threads/:id/cancel-order");
  });

  it("setupUgcOrderRoutes registers all UGC thread routes in /ugc namespace", () => {
    const app = express();
    const router = express.Router();

    const handlers = {
      handleThreadApproveContent: vi.fn(),
      handleUgcDeliverableSubmit: vi.fn(),
      handleUgcOrderApprove: vi.fn(),
      handleUgcOrderRevision: vi.fn(),
      handleUgcOrderDeclineRevisions: vi.fn(),
      handleUgcOrderCancel: vi.fn(),
    };

    setupUgcOrderRoutes(app, router, handlers);

    const registeredPostPaths = router.stack
      .filter((layer: any) => layer.route && layer.route.methods?.post)
      .flatMap((layer: any) => layer.route.path);

    expect(registeredPostPaths).toContain("/ugc/threads/:id/reject-content");
    expect(registeredPostPaths).toContain("/ugc/threads/:id/request-revision");
    expect(registeredPostPaths).toContain("/ugc/threads/:id/mark-complete");
    expect(registeredPostPaths).toContain("/ugc/threads/:id/approve");
    expect(registeredPostPaths).toContain("/ugc/threads/:id/decline-revisions");
    expect(registeredPostPaths).toContain("/ugc/threads/:id/cancel-order");
    expect(registeredPostPaths).toContain("/ugc/threads/:id/cancel-claim");
  });

  it("dealFlow classification distinguishes UGC vs Campaign threads for routing", () => {
    // UGC threads
    expect(isUgcThread({ id: "thread_ugc_123" })).toBe(true);
    expect(isUgcThread({ id: "t_1", is_ugc: true })).toBe(true);
    expect(isUgcThread({ id: "t_2", ugc_order_id_text: "ugcord_abc" })).toBe(true);
    expect(isUgcThread({ id: "ugcord_123" })).toBe(true);

    // Campaign threads
    expect(isUgcThread({ id: "thread_camp_456" })).toBe(false);
    expect(isUgcThread({ id: "b2d561b3-4f9e-4e4b-bb66-0dbb3f6d7647" })).toBe(false);
    expect(isUgcThread({ id: "t_3", campaign_deal_id: "b2d561b3-4f9e-4e4b-bb66-0dbb3f6d7647" })).toBe(false);
  });
});

describe("Phase D: Lifecycle Handlers Extraction, Namespace Completeness & Invariants", () => {
  it("createCampaignLifecycleHandlers instantiates all campaign handlers including handleThreadApproveContent", () => {
    const mockSupabase = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    };

    const campaignHandlers = createCampaignLifecycleHandlers({
      supabase: mockSupabase,
      privilegedSupabase: mockSupabase,
      getDb: () => ({ chat_threads: [], deals: [], content_submissions: [] }),
      saveDb: vi.fn(),
      parseAuthUser: vi.fn().mockResolvedValue({ user_id: "u1" }),
      insertChatMessageToSupabase: vi.fn().mockResolvedValue({}),
      getIsoNow: () => "2026-09-19T12:00:00.000Z",
      syncUgcLifecycleEvent: vi.fn(),
    });

    expect(typeof campaignHandlers.handleThreadApproveLiveLinks).toBe("function");
    expect(typeof campaignHandlers.handleThreadApproveContent).toBe("function");
    expect(typeof campaignHandlers.handleThreadSubmitLiveLink).toBe("function");
    expect(typeof campaignHandlers.handleThreadRejectLiveLinks).toBe("function");
    expect(typeof campaignHandlers.handleThreadDeclineLiveLinksResubmission).toBe("function");
    expect(typeof campaignHandlers.handleCampaignRevision).toBe("function");
    expect(typeof campaignHandlers.handleCampaignCancel).toBe("function");
  });

  it("createUgcLifecycleHandlers instantiates all UGC handlers", () => {
    const mockSupabase = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    };

    const ugcHandlers = createUgcLifecycleHandlers({
      supabase: mockSupabase,
      privilegedSupabase: mockSupabase,
      getDb: () => ({ chat_threads: [], ugc_orders: [], ugc_briefs: [] }),
      parseAuthUser: vi.fn().mockResolvedValue({ user_id: "u1" }),
      syncUgcLifecycleEvent: vi.fn().mockResolvedValue({ success: true }),
      handleThreadApproveLiveLinks: vi.fn(),
      handleThreadApproveContent: vi.fn(),
      handleCampaignRevision: vi.fn(),
    });

    expect(typeof ugcHandlers.handleUgcDeliverableSubmit).toBe("function");
    expect(typeof ugcHandlers.handleUgcOrderApprove).toBe("function");
    expect(typeof ugcHandlers.handleUgcOrderRevision).toBe("function");
    expect(typeof ugcHandlers.handleUgcOrderDeclineRevisions).toBe("function");
    expect(typeof ugcHandlers.handleUgcOrderCancel).toBe("function");
  });

  it("setupCampaignThreadRoutes registers submit-content, submit-live-link, and approve-content in /campaign namespace", () => {
    const app = express();
    const router = express.Router();

    setupCampaignThreadRoutes(app, router, {
      handleCampaignApprove: vi.fn(),
      handleCampaignApproveContent: vi.fn(),
      handleCampaignSubmitLiveLink: vi.fn(),
      handleCampaignSubmitContent: vi.fn(),
      handleCampaignRevision: vi.fn(),
      handleCampaignDeclineRevisions: vi.fn(),
      handleCampaignCancel: vi.fn(),
    });

    const registeredPostPaths = router.stack
      .filter((layer: any) => layer.route && layer.route.methods?.post)
      .flatMap((layer: any) => layer.route.path);

    expect(registeredPostPaths).toContain("/campaign/threads/:id/submit-content");
    expect(registeredPostPaths).toContain("/campaign/threads/:id/submit-draft");
    expect(registeredPostPaths).toContain("/campaign/threads/:id/submit-live-link");
    expect(registeredPostPaths).toContain("/campaign/threads/:id/submit-live-links");
    expect(registeredPostPaths).toContain("/campaign/threads/:id/approve-content");
    expect(registeredPostPaths).toContain("/campaign/threads/:id/content/approve");
  });

  it("setupUgcOrderRoutes registers submit-content, submit-live-link, and approve-content in /ugc namespace", () => {
    const app = express();
    const router = express.Router();

    setupUgcOrderRoutes(app, router, {
      handleThreadApproveContent: vi.fn(),
      handleUgcDeliverableSubmit: vi.fn(),
      handleUgcOrderApprove: vi.fn(),
      handleUgcOrderRevision: vi.fn(),
      handleUgcOrderDeclineRevisions: vi.fn(),
      handleUgcOrderCancel: vi.fn(),
    });

    const registeredPostPaths = router.stack
      .filter((layer: any) => layer.route && layer.route.methods?.post)
      .flatMap((layer: any) => layer.route.path);

    expect(registeredPostPaths).toContain("/ugc/threads/:id/submit-content");
    expect(registeredPostPaths).toContain("/ugc/threads/:id/submit-draft");
    expect(registeredPostPaths).toContain("/ugc/threads/:id/submit-live-link");
    expect(registeredPostPaths).toContain("/ugc/threads/:id/submit-live-links");
    expect(registeredPostPaths).toContain("/ugc/threads/:id/approve-content");
  });

  it("enforces Rule 1 & Rule 2: UUID guards prevent UGC IDs from corrupting deal queries", () => {
    const validUuid = "123e4567-e89b-12d3-a456-426614174000";
    const ugcOrderId = "ugcord_987654321";
    const ugcThreadId = "thread_ugc_123456";

    expect(isUuid(validUuid)).toBe(true);
    expect(isUuid(ugcOrderId)).toBe(false);
    expect(isUuid(ugcThreadId)).toBe(false);

    // UGC thread deal_id cannot be misidentified as a campaign deal id
    const ugcThread = { id: ugcThreadId, deal_id: ugcOrderId };
    expect(isUgcThread(ugcThread)).toBe(true);
    expect(isCampaignThread(ugcThread)).toBe(false);
    expect(getCampaignDealId(ugcThread)).toBeNull();
    expect(getUgcOrderId(ugcThread)).toBe(ugcOrderId);

    // Campaign thread deal_id is correctly resolved as campaign deal id
    const campaignThread = { id: "thread_camp_1", deal_id: validUuid };
    expect(isUgcThread(campaignThread)).toBe(false);
    expect(isCampaignThread(campaignThread)).toBe(true);
    expect(getCampaignDealId(campaignThread)).toBe(validUuid);
    expect(getUgcOrderId(campaignThread)).toBeNull();
  });

  it("thin forwarder dispatch logic reliably separates UGC and Campaign handlers", async () => {
    const handleUgcOrderRevision = vi.fn().mockReturnValue({ handled: "ugc" });
    const handleCampaignRevision = vi.fn().mockReturnValue({ handled: "campaign" });

    const dispatchRevision = async (thread: any, req: any, res: any) => {
      if (isUgcThread(thread)) {
        return handleUgcOrderRevision(req, res);
      }
      return handleCampaignRevision(req, res);
    };

    const mockRes = { json: vi.fn(), status: vi.fn().mockReturnThis() };

    // UGC Dispatch
    const resUgc = await dispatchRevision({ id: "ugcord_123" }, {}, mockRes);
    expect(resUgc).toEqual({ handled: "ugc" });
    expect(handleUgcOrderRevision).toHaveBeenCalledTimes(1);
    expect(handleCampaignRevision).not.toHaveBeenCalled();

    // Campaign Dispatch
    const resCamp = await dispatchRevision({ id: "thread_camp_456" }, {}, mockRes);
    expect(resCamp).toEqual({ handled: "campaign" });
    expect(handleCampaignRevision).toHaveBeenCalledTimes(1);
  });
});

describe("Phase E: Dual-Mount Negotiation, Signing & Escrow Routes", () => {
  it("setupDealsChatRoutes mounts negotiation, sign, and pay under /campaign and /chat/v2 namespaces", () => {
    const app = express();
    const router = express.Router();

    setupDealsChatRoutes(app, router, {
      supabase: null,
      privilegedSupabase: null,
      getDb: () => ({ chat_threads: [], chat_messages: [] }),
      saveDb: vi.fn(),
      parseAuthUser: vi.fn().mockResolvedValue({ user_id: "u1", role: "brand" }),
      sendNotification: vi.fn().mockResolvedValue({}),
      serializeChatMessage: vi.fn().mockReturnValue("test"),
      insertChatMessageToSupabase: vi.fn().mockResolvedValue({}),
      parseThreadState: vi.fn(),
      updateThreadState: vi.fn().mockResolvedValue({}),
      enrichThread: vi.fn(),
      handleThreadApproveLiveLinks: vi.fn(),
      handleThreadApproveContent: vi.fn(),
      handleThreadSubmitLiveLink: vi.fn(),
      handleThreadRejectLiveLinks: vi.fn(),
      handleThreadDeclineLiveLinksResubmission: vi.fn(),
      getIsTestMode: () => true,
    });

    const registeredPostPaths = router.stack
      .filter((layer: any) => layer.route && layer.route.methods?.post)
      .flatMap((layer: any) => layer.route.path);

    // Verify /campaign/threads/* endpoints
    expect(registeredPostPaths).toContain("/campaign/threads/:threadId/creator-negotiate");
    expect(registeredPostPaths).toContain("/campaign/threads/:threadId/brand-accept-counter");
    expect(registeredPostPaths).toContain("/campaign/threads/:threadId/sign");
    expect(registeredPostPaths).toContain("/campaign/threads/:threadId/pay");
    expect(registeredPostPaths).toContain("/campaign/threads/:threadId/approve-request");
    expect(registeredPostPaths).toContain("/campaign/threads/:threadId/creator-approve-agreement");

    // Verify backward compatible /chat/v2/threads/* endpoints
    expect(registeredPostPaths).toContain("/chat/v2/threads/:threadId/creator-negotiate");
    expect(registeredPostPaths).toContain("/chat/v2/threads/:threadId/brand-accept-counter");
    expect(registeredPostPaths).toContain("/chat/v2/threads/:threadId/sign");
    expect(registeredPostPaths).toContain("/chat/v2/threads/:threadId/pay");
    expect(registeredPostPaths).toContain("/chat/v2/threads/:threadId/approve-request");
    expect(registeredPostPaths).toContain("/chat/v2/threads/:threadId/creator-approve-agreement");
  });
});

describe("Option A: server.ts Monolith Cleanup Route Extractions", () => {
  it("setupBrandsRoutes registers brand KYC and me endpoints internally", () => {
    const app = express();
    const router = express.Router();

    setupBrandsRoutes(app, router, {
      supabase: null,
      privilegedSupabase: null,
      getDb: () => ({ brand_profiles: [], users: [] }),
      saveDb: vi.fn(),
      parseAuthUser: vi.fn().mockResolvedValue({ user_id: "b1", role: "brand" }),
      syncEntityTags: vi.fn(),
      processBase64Image: vi.fn(),
      getActingBrandId: (u: any) => u.user_id,
      logTeamActivity: vi.fn(),
      sanitizeBrandProfile: (p: any) => p,
      broadcastAdminNotification: vi.fn(),
    });

    const registeredPostPaths = router.stack
      .filter((layer: any) => layer.route && layer.route.methods?.post)
      .flatMap((layer: any) => layer.route.path);
    const registeredGetPaths = router.stack
      .filter((layer: any) => layer.route && layer.route.methods?.get)
      .flatMap((layer: any) => layer.route.path);

    expect(registeredPostPaths).toContain("/brand/kyc/submit");
    expect(registeredGetPaths).toContain("/brands/me");
    expect(registeredGetPaths).toContain("/brand/me");
  });

  it("setupCreatorsRoutes registers creator KYC and profile endpoints internally", () => {
    const app = express();
    const router = express.Router();

    setupCreatorsRoutes(app, router, {
      supabase: null,
      privilegedSupabase: null,
      getDb: () => ({ creator_profiles: [], users: [] }),
      saveDb: vi.fn(),
      parseAuthUser: vi.fn().mockResolvedValue({ user_id: "c1", role: "creator" }),
      syncEntityTags: vi.fn(),
      processBase64Image: vi.fn(),
      getSettings: () => ({}),
      markupForRole: () => 0,
      getActingBrandId: (u: any) => u.user_id,
      logTeamActivity: vi.fn(),
      sanitizeCreatorProfile: (cp: any) => cp,
      fetchCreatorReviews: vi.fn().mockResolvedValue([]),
      broadcastAdminNotification: vi.fn(),
    });

    const registeredPostPaths = router.stack
      .filter((layer: any) => layer.route && layer.route.methods?.post)
      .flatMap((layer: any) => layer.route.path);
    const registeredGetPaths = router.stack
      .filter((layer: any) => layer.route && layer.route.methods?.get)
      .flatMap((layer: any) => layer.route.path);

    expect(registeredPostPaths).toContain("/creator/kyc/submit");
    expect(registeredPostPaths).toContain("/verifications/creator");
    expect(registeredGetPaths).toContain("/creators/:user_id/profile");
    expect(registeredGetPaths).toContain("/creators/me");
  });

  it("setupMiscRoutes registers public creator apply and waitlist endpoints internally", () => {
    const app = express();
    const router = express.Router();

    setupMiscRoutes(app, router, {
      supabase: null,
      privilegedSupabase: null,
      getDb: () => ({ waitlist: [], users: [] }),
      saveDb: vi.fn(),
      parseAuthUser: vi.fn().mockResolvedValue(null),
      ensureBucketExists: vi.fn(),
      getFullFeeAndReferralConfig: vi.fn().mockResolvedValue({}),
      upload: { single: () => (req: any, res: any, next: any) => next() },
      getSettings: () => ({}),
      getActingBrandId: (u: any) => u?.user_id,
    });

    const registeredPostPaths = router.stack
      .filter((layer: any) => layer.route && layer.route.methods?.post)
      .flatMap((layer: any) => layer.route.path);

    expect(registeredPostPaths).toContain("/public/creator-apply");
    expect(registeredPostPaths).toContain("/waitlist");
  });
});

