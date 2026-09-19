import { describe, it, expect, vi, beforeEach } from "vitest";
import express from "express";
import { createCampaignLifecycleHandlers, setupCampaignThreadRoutes } from "./campaigns_routes";
import { createUgcLifecycleHandlers, setupUgcOrderRoutes } from "./ugc_routes";
import { setupDealsChatRoutes } from "./deals_chat_routes";
import { createUgcLifecycleService } from "./services/ugcLifecycleService";

describe("Option B: End-to-End Lifecycle Automated Testing", () => {
  let mockDb: any;
  let currentUser: any;

  beforeEach(() => {
    currentUser = {
      user_id: "brand_user_1",
      email: "brand@example.com",
      name: "Acme Brand",
      role: "brand",
    };

    mockDb = {
      users: [
        { user_id: "brand_user_1", name: "Acme Brand", role: "brand", email: "brand@example.com" },
        { user_id: "creator_user_1", name: "Jane Doe", role: "creator", email: "creator@example.com" },
      ],
      brand_profiles: [
        { user_id: "brand_user_1", company_name: "Acme Corp", verified: true }
      ],
      creator_profiles: [
        { user_id: "creator_user_1", name: "Jane Doe", verified: true }
      ],
      chat_threads: [],
      chat_messages: [],
      deals: [],
      ugc_orders: [],
      notifications: [],
      verifications: [],
    };
  });

  const getDb = () => mockDb;
  const saveDb = (newDb: any) => { mockDb = newDb; };
  const parseAuthUser = vi.fn().mockImplementation(async () => currentUser);
  const sendNotification = vi.fn().mockResolvedValue({});
  const serializeChatMessage = vi.fn().mockImplementation((m) => m);
  const insertChatMessageToSupabase = vi.fn().mockResolvedValue({});

  describe("1. Campaign Full Lifecycle E2E", () => {
    it("completes full campaign lifecycle: propose -> negotiate -> accept -> sign -> pay -> submit content -> approve content -> submit live link -> release escrow", async () => {
      const dealId = "11111111-2222-3333-4444-555555555555";
      const threadId = `thread_camp_${dealId}`;

      // Initialize campaign thread and deal
      const initialDeal = {
        id: dealId,
        brand_id: "brand_user_1",
        creator_id: "creator_user_1",
        campaign_title: "Summer Collection",
        status: "NEGOTIATING",
        agreed_amount: 15000,
        stage: "NEGOTIATING",
        created_at: new Date().toISOString(),
      };
      mockDb.deals.push(initialDeal);

      const initialThread = {
        id: threadId,
        deal_id: dealId,
        brand_id: "brand_user_1",
        creator_id: "creator_user_1",
        campaign_title: "Summer Collection",
        deal_type: "CAMPAIGN",
        status: "NEGOTIATING",
        agreed_amount: 15000,
        stage: "NEGOTIATING",
        messages: [],
      };
      mockDb.chat_threads.push(initialThread);

      // Create express router and wire handlers
      const app = express();
      const router = express.Router();
      app.use(express.json());

      const campaignHandlers = createCampaignLifecycleHandlers({
        supabase: null,
        privilegedSupabase: null,
        getDb,
        saveDb,
        parseAuthUser,
        insertChatMessageToSupabase,
      });

      setupCampaignThreadRoutes(app, router, {
        handleCampaignApprove: campaignHandlers.handleThreadApproveLiveLinks,
        handleCampaignApproveContent: campaignHandlers.handleThreadApproveContent,
        handleCampaignSubmitLiveLink: campaignHandlers.handleThreadSubmitLiveLink,
        handleCampaignRevision: campaignHandlers.handleCampaignRevision,
        handleCampaignDeclineRevisions: campaignHandlers.handleThreadDeclineLiveLinksResubmission,
        handleCampaignCancel: campaignHandlers.handleCampaignCancel,
      });

      setupDealsChatRoutes(app, router, {
        supabase: null,
        privilegedSupabase: null,
        getDb,
        saveDb,
        parseAuthUser,
        sendNotification,
        serializeChatMessage,
        insertChatMessageToSupabase,
        parseThreadState: (t: any) => ({ ...t }),
        updateThreadState: vi.fn(),
        enrichThread: (t: any) => t,
        handleThreadApproveLiveLinks: campaignHandlers.handleThreadApproveLiveLinks,
        handleThreadApproveContent: campaignHandlers.handleThreadApproveContent,
        handleThreadSubmitLiveLink: campaignHandlers.handleThreadSubmitLiveLink,
        handleThreadRejectLiveLinks: campaignHandlers.handleThreadRejectLiveLinks,
        handleThreadDeclineLiveLinksResubmission: campaignHandlers.handleThreadDeclineLiveLinksResubmission,
        getIsTestMode: () => true,
      });

      // Helper to dispatch Express route directly
      const dispatch = async (method: "get" | "post", path: string, body = {}) => {
        return new Promise<any>((resolve) => {
          const req: any = {
            method: method.toUpperCase(),
            url: path,
            path,
            params: {},
            body,
            app: { get: () => null },
          };
          const res: any = {
            statusCode: 200,
            status(code: number) { this.statusCode = code; return this; },
            json(data: any) { resolve({ status: this.statusCode, data }); },
            send(data: any) { resolve({ status: this.statusCode, data }); },
          };

          // Find route layer
          const layer = router.stack.find((l: any) => {
            if (!l.route) return false;
            const matchesMethod = l.route.methods[method];
            if (!matchesMethod) return false;
            const routePath = l.route.path;
            const pathPatterns = Array.isArray(routePath) ? routePath : [routePath];
            return pathPatterns.some((pattern: string) => {
              const regex = new RegExp("^" + pattern.replace(/:[a-zA-Z0-9_]+/g, "([^/]+)") + "$");
              const m = path.match(regex);
              if (m) {
                const keys = (pattern.match(/:[a-zA-Z0-9_]+/g) || []).map((k: string) => k.slice(1));
                keys.forEach((key: string, idx: number) => { req.params[key] = m[idx + 1]; });
                return true;
              }
              return false;
            });
          });

          if (layer) {
            layer.handle(req, res, (err: any) => {
              resolve({ status: 500, error: err });
            });
          } else {
            resolve({ status: 404, error: "Route not found" });
          }
        });
      };

      // STEP 1: Creator proposes Counter-Offer (₹15,000 -> ₹22,000)
      currentUser = { user_id: "creator_user_1", role: "creator" };
      const counterRes = await dispatch("post", `/campaign/threads/${threadId}/creator-negotiate`, {
        counter_amount: 22000,
        notes: "Increased scope to 2 reels",
      });
      expect(counterRes.status).toBe(200);
      expect(mockDb.chat_threads[0].counter_amount).toBe(22000);
      expect(mockDb.chat_threads[0].flow_state).toBe("NEGOTIATING_COUNTER");

      // STEP 2: Brand accepts Counter-Offer
      currentUser = { user_id: "brand_user_1", role: "brand" };
      const acceptRes = await dispatch("post", `/campaign/threads/${threadId}/brand-accept-counter`);
      expect(acceptRes.status).toBe(200);
      expect(mockDb.chat_threads[0].agreed_amount).toBe(22000);
      expect(mockDb.chat_threads[0].counter_amount).toBeNull();
      expect(mockDb.deals[0].agreed_amount).toBe(22000);

      // STEP 3: Creator signs agreement
      currentUser = { user_id: "creator_user_1", role: "creator" };
      const signRes = await dispatch("post", `/campaign/threads/${threadId}/sign`);
      expect(signRes.status).toBe(200);
      expect(mockDb.chat_threads[0].agreement_signed_creator).toBe(true);

      // STEP 4: Brand pays / funds escrow
      currentUser = { user_id: "brand_user_1", role: "brand" };
      const payRes = await dispatch("post", `/campaign/threads/${threadId}/pay`);
      expect(payRes.status).toBe(200);
      expect(mockDb.chat_threads[0].payment_funded).toBe(true);
      expect(mockDb.chat_threads[0].status).toBe("ACTIVE");
      expect(mockDb.deals[0].status).toBe("ACTIVE");
      expect(mockDb.deals[0].payment_status).toBe("ESCROW_HELD");

      // STEP 5: Brand requests revision on draft content
      currentUser = { user_id: "brand_user_1", role: "brand" };
      const revRes = await dispatch("post", `/campaign/threads/${threadId}/request-revision`, {
        feedback: "Please add brand logo in first 3 seconds",
      });
      expect(revRes.status).toBe(200);
      expect(mockDb.chat_threads[0].flow_state).toBe("CHANGES_REQUESTED");

      // STEP 6: Brand approves revised content
      currentUser = { user_id: "brand_user_1", role: "brand" };
      const approveContentRes = await dispatch("post", `/campaign/threads/${threadId}/approve-content`);
      expect(approveContentRes.status).toBe(200);
      expect(mockDb.chat_threads[0].flow_state).toBe("CONTENT_APPROVED");

      // STEP 7: Creator submits live Instagram post link
      currentUser = { user_id: "creator_user_1", role: "creator" };
      const liveLinkRes = await dispatch("post", `/campaign/threads/${threadId}/submit-live-link`, {
        links: ["https://instagram.com/reel/Cx123456789"],
      });
      expect(liveLinkRes.status).toBe(200);
      expect(mockDb.chat_threads[0].live_link).toBe("https://instagram.com/reel/Cx123456789");
      expect(mockDb.chat_threads[0].live_links_submitted).toBe(true);

      // STEP 8: Brand approves live link & releases escrow
      currentUser = { user_id: "brand_user_1", role: "brand" };
      const releaseRes = await dispatch("post", `/campaign/threads/${threadId}/approve-live-links`);
      expect(releaseRes.status).toBe(200);
      expect(mockDb.chat_threads[0].status).toBe("COMPLETED");
      expect(mockDb.chat_threads[0].flow_state).toBe("COMPLETED");
      expect(mockDb.deals[0].status).toBe("COMPLETED");
    });
  });

  describe("2. UGC Order Full Lifecycle E2E", () => {
    it("completes full UGC order lifecycle: order brief -> deliverable submit -> request revision -> approve deliverable -> mark complete", async () => {
      const ugcOrderId = "ugcord_987654_abc";
      const threadId = `thread_ugc_${ugcOrderId}`;

      const initialUgcOrder = {
        id: ugcOrderId,
        order_id: ugcOrderId,
        brand_id: "brand_user_1",
        creator_id: "creator_user_1",
        brief_title: "Product Unboxing UGC Video",
        order_amount: 8000,
        status: "IN_PROGRESS",
        deliverable_type: "raw_video",
        requires_live_link: false,
        is_collaboration: false,
        deliverables: [],
        revisions_used: 0,
        revision_count: 2,
        created_at: new Date().toISOString(),
      };
      mockDb.ugc_orders.push(initialUgcOrder);

      const ugcThread = {
        id: threadId,
        deal_id: ugcOrderId,
        ugc_order_id: ugcOrderId,
        brand_id: "brand_user_1",
        creator_id: "creator_user_1",
        deliverable_type: "raw_video",
        requires_live_link: false,
        is_collaboration: false,
        is_ugc: true,
        deal_type: "UGC",
        status: "IN_PROGRESS",
        messages: [],
      };
      mockDb.chat_threads.push(ugcThread);

      const app = express();
      const router = express.Router();
      app.use(express.json());

      const syncUgcLifecycleEvent = createUgcLifecycleService({
        supabase: null,
        privilegedSupabase: null,
        getDb,
        saveDb,
        getIsoNow: () => new Date().toISOString(),
        ensureUGCChatThread: vi.fn(),
        insertChatMessageToSupabase: vi.fn(),
      });

      const campaignHandlers = createCampaignLifecycleHandlers({
        supabase: null,
        privilegedSupabase: null,
        getDb,
        saveDb,
        parseAuthUser,
        insertChatMessageToSupabase,
      });

      const ugcHandlers = createUgcLifecycleHandlers({
        supabase: null,
        privilegedSupabase: null,
        getDb,
        parseAuthUser,
        syncUgcLifecycleEvent,
        handleThreadApproveLiveLinks: campaignHandlers.handleThreadApproveLiveLinks,
        handleThreadApproveContent: campaignHandlers.handleThreadApproveContent,
        handleCampaignRevision: campaignHandlers.handleCampaignRevision,
      });

      setupUgcOrderRoutes(app, router, {
        handleThreadApproveContent: ugcHandlers.handleUgcOrderApprove,
        handleUgcDeliverableSubmit: ugcHandlers.handleUgcDeliverableSubmit,
        handleUgcOrderApprove: ugcHandlers.handleUgcOrderApprove,
        handleUgcOrderRevision: ugcHandlers.handleUgcOrderRevision,
        handleUgcOrderDeclineRevisions: ugcHandlers.handleUgcOrderDeclineRevisions,
        handleUgcOrderCancel: ugcHandlers.handleUgcOrderCancel,
      });

      const dispatch = async (method: "get" | "post", path: string, body = {}) => {
        return new Promise<any>((resolve) => {
          const req: any = {
            method: method.toUpperCase(),
            url: path,
            path,
            params: {},
            body,
            app: { get: () => null },
          };
          const res: any = {
            statusCode: 200,
            status(code: number) { this.statusCode = code; return this; },
            json(data: any) { resolve({ status: this.statusCode, data }); },
            send(data: any) { resolve({ status: this.statusCode, data }); },
          };

          const layer = router.stack.find((l: any) => {
            if (!l.route) return false;
            const matchesMethod = l.route.methods[method];
            if (!matchesMethod) return false;
            const routePath = l.route.path;
            const pathPatterns = Array.isArray(routePath) ? routePath : [routePath];
            return pathPatterns.some((pattern: string) => {
              const regex = new RegExp("^" + pattern.replace(/:[a-zA-Z0-9_]+/g, "([^/]+)") + "$");
              const m = path.match(regex);
              if (m) {
                const keys = (pattern.match(/:[a-zA-Z0-9_]+/g) || []).map((k: string) => k.slice(1));
                keys.forEach((key: string, idx: number) => { req.params[key] = m[idx + 1]; });
                return true;
              }
              return false;
            });
          });

          if (layer) {
            layer.handle(req, res, (err: any) => {
              resolve({ status: 500, error: err });
            });
          } else {
            resolve({ status: 404, error: "Route not found" });
          }
        });
      };

      // STEP 1: Creator submits UGC deliverable video
      currentUser = { user_id: "creator_user_1", role: "creator" };
      const submitRes = await dispatch("post", `/ugc/orders/${ugcOrderId}/submit`, {
        video_url: "https://storage.googleapis.com/ybex/ugc_v1.mp4",
        notes: "Here is the raw unboxing cut",
      });
      expect(submitRes.status).toBe(200);
      expect(mockDb.ugc_orders[0].status).toBe("SUBMITTED");
      expect(mockDb.ugc_orders[0].video_url).toBe("https://storage.googleapis.com/ybex/ugc_v1.mp4");

      // STEP 2: Brand requests revision
      currentUser = { user_id: "brand_user_1", role: "brand" };
      const revRes = await dispatch("post", `/ugc/threads/${ugcOrderId}/request-revision`, {
        feedback: "Please trim the opening 5 seconds",
      });
      expect(revRes.status).toBe(200);
      expect(mockDb.ugc_orders[0].revisions_used).toBe(1);

      // STEP 3: Brand approves deliverable and marks completed
      currentUser = { user_id: "brand_user_1", role: "brand" };
      const approveRes = await dispatch("post", `/ugc/threads/${ugcOrderId}/approve`);
      expect(approveRes.status).toBe(200);
      expect(mockDb.ugc_orders[0].status).toBe("COMPLETED");
      expect(mockDb.ugc_orders[0].payment_status).toBe("RELEASED");
    });

    it("completes Collaboration UGC lifecycle: deliverable submit -> approve draft (CONTENT_APPROVED) -> submit live link -> approve live link (COMPLETED)", async () => {
      const ugcOrderId = "ugcord_collab_555";
      const threadId = `thread_ugc_${ugcOrderId}`;

      const initialUgcOrder = {
        id: ugcOrderId,
        order_id: ugcOrderId,
        brand_id: "brand_user_1",
        creator_id: "creator_user_1",
        brief_title: "Instagram Reel Collaboration",
        order_amount: 12000,
        status: "IN_PROGRESS",
        deliverable_type: "instagram_reel",
        requires_live_link: true,
        is_collaboration: true,
        deliverables: [],
        revisions_used: 0,
        revision_count: 2,
        created_at: new Date().toISOString(),
      };
      mockDb.ugc_orders.push(initialUgcOrder);

      const ugcThread = {
        id: threadId,
        deal_id: ugcOrderId,
        ugc_order_id: ugcOrderId,
        brand_id: "brand_user_1",
        creator_id: "creator_user_1",
        deliverable_type: "instagram_reel",
        requires_live_link: true,
        is_collaboration: true,
        is_ugc: true,
        deal_type: "UGC",
        status: "IN_PROGRESS",
        messages: [],
      };
      mockDb.chat_threads.push(ugcThread);

      const app = express();
      const router = express.Router();
      app.use(express.json());

      const syncUgcLifecycleEvent = createUgcLifecycleService({
        supabase: null,
        privilegedSupabase: null,
        getDb,
        saveDb,
        getIsoNow: () => new Date().toISOString(),
        ensureUGCChatThread: vi.fn(),
        insertChatMessageToSupabase: vi.fn(),
      });

      const campaignHandlers = createCampaignLifecycleHandlers({
        supabase: null,
        privilegedSupabase: null,
        getDb,
        saveDb,
        parseAuthUser,
        insertChatMessageToSupabase,
      });

      const ugcHandlers = createUgcLifecycleHandlers({
        supabase: null,
        privilegedSupabase: null,
        getDb,
        parseAuthUser,
        syncUgcLifecycleEvent,
        handleThreadApproveLiveLinks: campaignHandlers.handleThreadApproveLiveLinks,
        handleThreadApproveContent: campaignHandlers.handleThreadApproveContent,
        handleCampaignRevision: campaignHandlers.handleCampaignRevision,
      });

      setupUgcOrderRoutes(app, router, {
        handleThreadApproveContent: ugcHandlers.handleUgcOrderApprove,
        handleUgcDeliverableSubmit: ugcHandlers.handleUgcDeliverableSubmit,
        handleUgcOrderApprove: ugcHandlers.handleUgcOrderApprove,
        handleUgcOrderRevision: ugcHandlers.handleUgcOrderRevision,
        handleUgcOrderDeclineRevisions: ugcHandlers.handleUgcOrderDeclineRevisions,
        handleUgcOrderCancel: ugcHandlers.handleUgcOrderCancel,
      });

      const dispatch = async (method: "get" | "post", path: string, body = {}) => {
        return new Promise<any>((resolve) => {
          const req: any = {
            method: method.toUpperCase(),
            url: path,
            path,
            params: {},
            body,
            app: { get: () => null },
          };
          const res: any = {
            statusCode: 200,
            status(code: number) { this.statusCode = code; return this; },
            json(data: any) { resolve({ status: this.statusCode, data }); },
            send(data: any) { resolve({ status: this.statusCode, data }); },
          };

          const layer = router.stack.find((l: any) => {
            if (!l.route) return false;
            const matchesMethod = l.route.methods[method];
            if (!matchesMethod) return false;
            const routePath = l.route.path;
            const pathPatterns = Array.isArray(routePath) ? routePath : [routePath];
            return pathPatterns.some((pattern: string) => {
              const regex = new RegExp("^" + pattern.replace(/:[a-zA-Z0-9_]+/g, "([^/]+)") + "$");
              const m = path.match(regex);
              if (m) {
                const keys = (pattern.match(/:[a-zA-Z0-9_]+/g) || []).map((k: string) => k.slice(1));
                keys.forEach((key: string, idx: number) => { req.params[key] = m[idx + 1]; });
                return true;
              }
              return false;
            });
          });

          if (layer) {
            layer.handle(req, res, (err: any) => {
              resolve({ status: 500, error: err });
            });
          } else {
            resolve({ status: 404, error: "Route not found" });
          }
        });
      };

      // 1. Submit deliverable
      currentUser = { user_id: "creator_user_1", role: "creator" };
      const submitRes = await dispatch("post", `/ugc/orders/${ugcOrderId}/submit`, {
        video_url: "https://storage.googleapis.com/ybex/reel_v1.mp4",
        notes: "Draft collab video",
      });
      expect(submitRes.status).toBe(200);

      // 2. Brand approves draft -> For Collaboration, moves to CONTENT_APPROVED (waiting for live links)
      currentUser = { user_id: "brand_user_1", role: "brand" };
      const draftApproveRes = await dispatch("post", `/ugc/threads/${ugcOrderId}/approve`);
      expect(draftApproveRes.status).toBe(200);
      const targetCollabThread = mockDb.chat_threads.find((t: any) => t.id === threadId);
      expect(targetCollabThread.flow_state).toBe("CONTENT_APPROVED");

      // 3. Creator submits live links
      currentUser = { user_id: "creator_user_1", role: "creator" };
      targetCollabThread.live_links = ["https://instagram.com/reel/collab123"];
      targetCollabThread.live_links_submitted = true;

      // 4. Brand approves live links -> completes order & releases payment
      currentUser = { user_id: "brand_user_1", role: "brand" };
      const liveApproveRes = await dispatch("post", `/ugc/threads/${ugcOrderId}/approve`, {
        action: "approve_live_links",
      });
      expect(liveApproveRes.status).toBe(200);
      expect(targetCollabThread.status).toBe("COMPLETED");
      expect(targetCollabThread.flow_state).toBe("COMPLETED");
    });
  });

  describe("3. Security & Boundary Enforcement", () => {
    it("rejects unauthorized users trying to negotiate on a thread they do not belong to", async () => {
      const dealId = "99999999-8888-7777-6666-555555555555";
      const threadId = `thread_camp_${dealId}`;

      mockDb.deals.push({
        id: dealId,
        brand_id: "brand_user_1",
        creator_id: "creator_user_1",
        status: "NEGOTIATING",
      });
      mockDb.chat_threads.push({
        id: threadId,
        deal_id: dealId,
        brand_id: "brand_user_1",
        creator_id: "creator_user_1",
        deal_type: "CAMPAIGN",
        status: "NEGOTIATING",
      });

      const app = express();
      const router = express.Router();
      app.use(express.json());

      setupDealsChatRoutes(app, router, {
        supabase: null,
        privilegedSupabase: null,
        getDb,
        saveDb,
        parseAuthUser,
        sendNotification,
        serializeChatMessage,
        insertChatMessageToSupabase,
        parseThreadState: (t: any) => ({ ...t }),
        updateThreadState: vi.fn(),
        enrichThread: (t: any) => t,
        handleThreadApproveLiveLinks: vi.fn(),
        handleThreadApproveContent: vi.fn(),
        handleThreadSubmitLiveLink: vi.fn(),
        handleThreadRejectLiveLinks: vi.fn(),
        handleThreadDeclineLiveLinksResubmission: vi.fn(),
        getIsTestMode: () => true,
      });

      const req: any = {
        method: "POST",
        url: `/campaign/threads/${threadId}/creator-negotiate`,
        path: `/campaign/threads/${threadId}/creator-negotiate`,
        params: { threadId },
        body: { counter_amount: 30000 },
        app: { get: () => null },
      };

      // Attacker impersonating someone else
      currentUser = { user_id: "stranger_attacker", role: "creator" };
      const res: any = {
        statusCode: 200,
        status(code: number) { this.statusCode = code; return this; },
        json(data: any) { this.data = data; return this; },
      };

      // Find route layer
      const layer = router.stack.find((l: any) => l.route?.path?.includes?.("/campaign/threads/:threadId/creator-negotiate"));
      expect(layer).toBeDefined();

      await layer.handle(req, res, () => {});
      // Thread check: neither creator_id nor brand_id matches stranger_attacker
      expect(res.statusCode).toBe(403);
    });

    it("rejects unauthenticated requests on protected endpoints with 401/403", async () => {
      const dealId = "99999999-8888-7777-6666-555555555555";
      const threadId = `thread_camp_${dealId}`;

      const campaignHandlers = createCampaignLifecycleHandlers({
        supabase: null,
        privilegedSupabase: null,
        getDb,
        saveDb,
        parseAuthUser: async () => null, // No authenticated session
        insertChatMessageToSupabase,
      });

      const req: any = {
        method: "POST",
        url: `/campaign/threads/${threadId}/approve-live-links`,
        path: `/campaign/threads/${threadId}/approve-live-links`,
        params: { id: threadId },
        body: {},
        app: { get: () => null },
      };

      const res: any = {
        statusCode: 200,
        status(code: number) { this.statusCode = code; return this; },
        json(data: any) { this.data = data; return this; },
      };

      await campaignHandlers.handleThreadApproveLiveLinks(req, res);
      expect(res.statusCode).toBe(401);
    });
  });
});
