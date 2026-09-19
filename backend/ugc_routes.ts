import express from "express";
import { GoogleGenAI } from "@google/genai";
import { isCampaignThread } from "./dealFlow";

// Supabase and the local JSON db can both hold the same UGC order. The old merge always
// preferred the Supabase copy and only fell back to the local one when Supabase had no row
// at all — so whenever a lifecycle write landed locally but not in Supabase, the stale
// Supabase row masked the fresh local one and the UI showed the pre-action state. Prefer
// whichever copy was written last, and merge the local fields on top of it so nothing an
// action recorded is lost.
export function getOrderTimestamp(record: any): number {
  if (!record) return 0;
  return Math.max(
    Date.parse(record.updated_at || '') || 0,
    Date.parse(record.delivered_at || '') || 0,
    Date.parse(record.escrow_released_at || '') || 0,
    Date.parse(record.cancelled_at || '') || 0,
    Date.parse(record.created_at || '') || 0
  );
}

// Distinguish Collaboration formats (requires creator to publish to their social profile & submit a live link)
// vs Normal UGC video formats (raw or edited video deliverable for the brand to download/use; creator does not post to own profile).
export function isCollaborationDeliverable(deliverableType?: string): boolean {
  if (!deliverableType) return true;
  const norm = String(deliverableType).toLowerCase().trim();
  if (
    norm.startsWith('ugc_video') ||
    norm.includes('raw') ||
    norm.includes('edited') ||
    norm.startsWith('video_') ||
    norm === 'ugc_video_raw' ||
    norm === 'ugc_video_edited' ||
    norm === 'ugc_raw_video'
  ) {
    return false;
  }
  if (
    norm.includes('collab') ||
    norm.includes('reel') ||
    norm === 'collaboration_reel' ||
    norm === 'instagram_reel'
  ) {
    return true;
  }
  return false;
}

export function mergeOrderRecords(remote: any, local: any) {
  if (!remote) return local;
  if (!local) return remote;
  const isCompleted = remote.status === 'COMPLETED' || local.status === 'COMPLETED' ||
    remote.payment_status === 'RELEASED' || local.payment_status === 'RELEASED' ||
    remote.payment_status === 'PAID' || local.payment_status === 'PAID';
  const remoteAt = getOrderTimestamp(remote);
  const localAt = getOrderTimestamp(local);
  const merged = localAt > remoteAt ? { ...remote, ...local } : { ...local, ...remote };

  // Preserve revision notes / feedback across merges if present on either copy
  const revisionNotes = remote.revision_notes || local.revision_notes || remote.revision_feedback || local.revision_feedback || null;
  if (revisionNotes && !merged.revision_notes) {
    merged.revision_notes = revisionNotes;
  }
  if (revisionNotes && !merged.revision_feedback) {
    merged.revision_feedback = revisionNotes;
  }

  // If remote has a deliverable submitted that is newer or matches latest delivered_at, ensure status is SUBMITTED
  if (remote.status === 'SUBMITTED' && remote.video_url && (Date.parse(remote.delivered_at || '') >= Date.parse(local.delivered_at || '') || !local.video_url)) {
    merged.status = 'SUBMITTED';
    merged.video_url = remote.video_url;
    merged.delivered_at = remote.delivered_at || merged.delivered_at;
  }

  if (isCompleted) {
    merged.status = 'COMPLETED';
    merged.payment_status = 'RELEASED';
  }
  return merged;
}


// UGC Lifecycle Handlers (Approve, Submit, Revision, Decline, Cancel)
export function createUgcLifecycleHandlers({
  supabase,
  privilegedSupabase,
  getDb,
  parseAuthUser,
  syncUgcLifecycleEvent,
  handleThreadApproveLiveLinks,
  handleThreadApproveContent,
  handleCampaignRevision,
}: {
  supabase: any;
  privilegedSupabase: any;
  getDb: () => any;
  parseAuthUser: (req: any) => Promise<any>;
  syncUgcLifecycleEvent: (opts: any) => Promise<any>;
  handleThreadApproveLiveLinks: (req: any, res: any) => Promise<any>;
  handleThreadApproveContent: (req: any, res: any) => Promise<any>;
  handleCampaignRevision: (req: any, res: any) => Promise<any>;
}) {
  const handleUgcDeliverableSubmit = async (req: any, res: any) => {
    const user = await parseAuthUser(req);
    if (!user) return res.status(401).json({ error: "Unauthorized" });
    const rawId = req.params.id || req.params.threadId;

    let finalVideoUrl = (
      req.body?.videoUrl ||
      req.body?.video_url ||
      req.body?.content_url ||
      req.body?.contentUrl ||
      req.body?.driveUrl ||
      req.body?.drive_url ||
      req.body?.link ||
      req.body?.url ||
      req.body?.fileUrl ||
      ""
    ).trim();

    const notes = (
      req.body?.notes ||
      req.body?.creator_notes ||
      req.body?.contentNotes ||
      req.body?.notes_to_brand ||
      req.body?.feedback ||
      ""
    ).trim();

    if (!finalVideoUrl) {
      return res.status(400).json({ error: "A video file or link is required" });
    }

    const result = await syncUgcLifecycleEvent({
      rawId,
      action: 'SUBMIT_DELIVERABLE',
      actorUser: user,
      notes,
      videoUrl: finalVideoUrl,
      io: req.app.get("io")
    });

    if (result.error) {
      return res.status(result._status || 500).json(result);
    }

    return res.json({
      ...result,
      message: "Deliverable submitted successfully! Brand has been notified.",
      video_url: finalVideoUrl,
      notes: notes,
      status: 'SUBMITTED'
    });
  };

  const handleUgcOrderApprove = async (req: any, res: any) => {
    const user = await parseAuthUser(req);
    if (!user) return res.status(401).json({ error: "Unauthorized" });
    const id = req.params.id || req.params.threadId;
    const notes = req.body?.notes || req.body?.feedback || "";

    const db = getDb();
    let thread = (db.chat_threads || []).find((t: any) => t.id === id || t.deal_id === id);
    if (!thread && supabase) {
      try {
        const { data: thr } = await (privilegedSupabase || supabase)
          .from('chat_threads')
          .select('*')
          .or(`id.eq.${id},deal_id.eq.${id}`)
          .maybeSingle();
        if (thr) thread = thr;
      } catch (e) {}
    }

    const targetOrderId = thread?.deal_id || thread?.id || id;
    let ugcOrder = (db.ugc_orders || []).find((o: any) => o.id === id || o.id === targetOrderId || o.brief_id === id);
    if (!ugcOrder && supabase) {
      try {
        const { data: o } = await (privilegedSupabase || supabase)
          .from('ugc_orders')
          .select('*')
          .or(`id.eq.${id},id.eq.${targetOrderId},brief_id.eq.${id}`)
          .maybeSingle();
        if (o) ugcOrder = o;
      } catch (e) {}
    }

    const targetThreadForFlow = thread || { id, deal_id: targetOrderId, ugc_order: ugcOrder };
    if (isCampaignThread(targetThreadForFlow)) {
      return handleThreadApproveLiveLinks(req, res);
    }

    const isLiveLinkApproval = Boolean(
      req.body?.action === 'approve_live_links' ||
      (req.body?.action !== 'approve_draft' && (
        thread?.flow_state === 'PROOF_SUBMITTED' ||
        thread?.live_links_submitted ||
        Boolean(ugcOrder?.live_link) ||
        Boolean(req.body?.live_link)
      ))
    );

    const briefId = ugcOrder?.brief_id || thread?.ugc_brief_id;
    let brief = (db.ugc_briefs || []).find((b: any) => b.id === briefId);
    if (!brief && supabase && briefId) {
      try {
        const { data: b } = await (privilegedSupabase || supabase)
          .from('ugc_briefs')
          .select('*')
          .eq('id', briefId)
          .maybeSingle();
        if (b) brief = b;
      } catch (e) {}
    }

    const deliverableType = String(
      ugcOrder?.deliverable_type ||
      brief?.deliverable_type ||
      thread?.deliverable_type ||
      ""
    ).toLowerCase();

    const isCollab = ugcOrder?.is_collaboration !== undefined
      ? Boolean(ugcOrder.is_collaboration)
      : (ugcOrder?.requires_live_link !== undefined
        ? Boolean(ugcOrder.requires_live_link)
        : (brief?.is_collaboration !== undefined
          ? Boolean(brief.is_collaboration)
          : isCollaborationDeliverable(deliverableType)));

    const requiresLiveLink = ugcOrder?.requires_live_link !== undefined
      ? Boolean(ugcOrder.requires_live_link)
      : isCollab;

    // If it's a Collaboration UGC and live links are submitted, approve live links & release payout!
    if (requiresLiveLink && isLiveLinkApproval) {
      return handleThreadApproveLiveLinks(req, res);
    }

    // If it's a Collaboration UGC and live links are NOT yet submitted, approve draft ONLY (do not release payout)!
    if (requiresLiveLink && !isLiveLinkApproval) {
      return handleThreadApproveContent(req, res);
    }

    // Otherwise, this is a Normal UGC Video (requiresLiveLink === false): draft approval directly releases payout!
    const result = await syncUgcLifecycleEvent({
      rawId: id,
      action: 'APPROVE',
      actorUser: user,
      notes,
      io: req.app.get("io")
    });

    if (result?.error) {
      return res.status(result._status || 500).json(result);
    }

    return res.json({
      ...result,
      message: result.message || "Deliverable approved! Escrow payout released to creator."
    });
  };

  const handleUgcOrderRevision = async (req: any, res: any) => {
    const user = await parseAuthUser(req);
    if (!user) return res.status(401).json({ error: "Unauthorized" });
    const id = req.params.id || req.params.threadId;
    const notes = (
      req.body?.notes ||
      req.body?.feedback ||
      req.body?.revision_notes ||
      req.body?.comments ||
      ""
    ).trim();

    const db = getDb();
    let thread = (db.chat_threads || []).find((t: any) => t.id === id || t.deal_id === id);
    if (!thread && supabase) {
      try {
        const { data: thr } = await (privilegedSupabase || supabase)
          .from('chat_threads')
          .select('*')
          .or(`id.eq.${id},deal_id.eq.${id}`)
          .maybeSingle();
        if (thr) thread = thr;
      } catch (e) {}
    }

    const targetOrderId = thread?.deal_id || thread?.id || id;
    let ugcOrder = (db.ugc_orders || []).find((o: any) => o.id === id || o.id === targetOrderId || o.brief_id === id);
    if (!ugcOrder && supabase) {
      try {
        const { data: o } = await (privilegedSupabase || supabase)
          .from('ugc_orders')
          .select('*')
          .or(`id.eq.${id},id.eq.${targetOrderId},brief_id.eq.${id}`)
          .maybeSingle();
        if (o) ugcOrder = o;
      } catch (e) {}
    }

    const targetThreadForFlow = thread || { id, deal_id: targetOrderId, ugc_order: ugcOrder };
    if (isCampaignThread(targetThreadForFlow)) {
      return handleCampaignRevision(req, res);
    }

    // UGC Order Revision: targetOrderId resolves to the UGC order id
    const result = await syncUgcLifecycleEvent({
      rawId: targetOrderId,
      action: 'REQUEST_REVISION',
      actorUser: user,
      notes,
      io: req.app.get("io")
    });

    if (result?.error) {
      return res.status(result._status || 400).json({ error: result.error });
    }

    return res.json({
      ...result,
      message: "Revision request submitted"
    });
  };

  const handleUgcOrderDeclineRevisions = async (req: any, res: any) => {
    const user = await parseAuthUser(req);
    if (!user) return res.status(401).json({ error: "Unauthorized" });
    const id = req.params.id || req.params.threadId;
    const notes = (
      req.body?.feedback ||
      req.body?.notes ||
      req.body?.reason ||
      req.body?.declineReason ||
      ""
    ).trim();

    const result = await syncUgcLifecycleEvent({
      rawId: id,
      action: 'DECLINE_REVISION',
      actorUser: user,
      notes,
      io: req.app.get("io")
    });

    if (result?.error) {
      return res.status(result._status || 400).json({ error: result.error });
    }

    return res.json({
      ...result,
      message: "Revisions declined"
    });
  };

  const handleUgcOrderCancel = async (req: any, res: any) => {
    const user = await parseAuthUser(req);
    if (!user) return res.status(401).json({ error: "Unauthorized" });
    const id = req.params.id || req.params.threadId;
    const notes = (
      req.body?.reason ||
      req.body?.notes ||
      req.body?.feedback ||
      ""
    ).trim();

    const result = await syncUgcLifecycleEvent({
      rawId: id,
      action: 'CANCEL',
      actorUser: user,
      notes,
      io: req.app.get("io")
    });

    if (result?.error) {
      return res.status(result._status || 400).json({ error: result.error });
    }

    return res.json({
      ...result,
      message: "Claim cancelled and escrow refunded"
    });
  };

  return {
    handleUgcDeliverableSubmit,
    handleUgcOrderApprove,
    handleUgcOrderRevision,
    handleUgcOrderDeclineRevisions,
    handleUgcOrderCancel
  };
}

// Thin route-registration wiring for the UGC order lifecycle (and the one
// Campaign-Deal content-approval route that shares this naming pattern).
//
// This file intentionally does NOT contain any of the actual business
// logic — every route here just forwards to an already-existing handler
// function (handleUgcOrderApprove, handleUgcDeliverableSubmit, etc.) that
// still lives in server.ts, passed in as a dependency. This makes the
// move essentially zero-risk: we're only relocating *where a route path
// is registered*, never touching what it actually does.
//
// The handler functions themselves are much bigger and reach deep into
// server.ts's shared state (supabase, db, syncUgcLifecycleEvent, etc.) —
// extracting THEM safely is a separate, more involved task for later.
export function setupUgcOrderRoutes(
  app: express.Application,
  router: express.Router,
  {
    handleThreadApproveContent,
    handleUgcDeliverableSubmit,
    handleUgcOrderApprove,
    handleUgcOrderRevision,
    handleUgcOrderDeclineRevisions,
    handleUgcOrderCancel,
  }: {
    handleThreadApproveContent: (req: express.Request, res: express.Response) => any;
    handleUgcDeliverableSubmit: (req: express.Request, res: express.Response) => any;
    handleUgcOrderApprove: (req: express.Request, res: express.Response) => any;
    handleUgcOrderRevision: (req: express.Request, res: express.Response) => any;
    handleUgcOrderDeclineRevisions: (req: express.Request, res: express.Response) => any;
    handleUgcOrderCancel: (req: express.Request, res: express.Response) => any;
  }
) {
  // UGC thread routes namespace
  router.post(["/ugc/threads/:id/reject-content", "/ugc/threads/:id/request-revision"], handleUgcOrderRevision);
  router.post(["/ugc/threads/:id/mark-complete", "/ugc/threads/:id/approve"], handleUgcOrderApprove);
  router.post(["/ugc/threads/:id/approve-content", "/ugc/threads/:id/content/approve"], (req, res) => handleThreadApproveContent(req, res));
  router.post("/ugc/threads/:id/decline-revisions", handleUgcOrderDeclineRevisions);
  router.post(["/ugc/threads/:id/cancel-order", "/ugc/threads/:id/cancel-claim"], handleUgcOrderCancel);
  router.post(["/ugc/threads/:id/submit-live-link", "/ugc/threads/:id/submit-live-links"], handleUgcDeliverableSubmit);
  router.post(["/ugc/threads/:id/submit-content", "/ugc/threads/:id/submit-draft"], handleUgcDeliverableSubmit);

  // UGC order routes
  router.post(["/ugc/orders/:id/submit", "/ugc/order/:id/submit"], handleUgcDeliverableSubmit);
  router.post(["/ugc/orders/:id/approve", "/ugc/order/:id/approve"], handleUgcOrderApprove);
  router.post(["/ugc/orders/:id/revision", "/ugc/order/:id/revision"], handleUgcOrderRevision);
  router.post(["/ugc/orders/:id/decline-revisions", "/ugc/order/:id/decline-revisions"], handleUgcOrderDeclineRevisions);
  router.post(["/ugc/orders/:id/cancel-claim", "/ugc/order/:id/cancel-claim", "/ugc/orders/:id/cancel", "/ugc/order/:id/cancel"], handleUgcOrderCancel);

  // Legacy draft/content submit aliases
  router.post("/chat/v2/threads/:threadId/content/approve", (req, res) => handleThreadApproveContent(req, res));
  router.post([
    "/chat/v2/threads/:threadId/submit-content",
    "/chat/v2/threads/:threadId/submit-draft",
    "/chat/v2/threads/:id/submit-content",
    "/chat/v2/threads/:id/submit-draft"
  ], handleUgcDeliverableSubmit);
}

// UGC brief browsing, order claiming/signing, brand/creator order listing,
// UGC-specific earnings/showcase views, and the internal ops-team pages
// (admin/ugc/orders, and the hyphenated /ugc-orders/... internal team
// flow). This is the "browse and discover" half of the UGC domain — the
// lifecycle-action routes (approve/revision/decline/cancel) already live
// in setupUgcOrderRoutes below, in this same file.
export function setupUgcBrowseRoutes(
  app: express.Application,
  router: express.Router,
  {
    supabase,
    privilegedSupabase,
    getDb,
    saveDb,
    parseAuthUser,
    ensureUGCChatThread,
    enrichBriefsWithBrandProfiles,
  }: {
    supabase: any;
    privilegedSupabase: any;
    getDb: () => any;
    saveDb: (db: any) => void;
    parseAuthUser: (req: express.Request) => Promise<any>;
    ensureUGCChatThread: (order: any, brief: any, user: any, io: any) => Promise<any>;
    enrichBriefsWithBrandProfiles: (briefs: any[]) => Promise<any[]>;
  }
) {
  const getIsoNow = () => new Date().toISOString();

  router.post("/ugc-orders/:orderId/in-house", async (req, res) => {
    const { orderId } = req.params;
    const db = getDb();
    let order = (db.ugc_orders || []).find((o: any) => o.id === orderId || o.brief_id === orderId);
    if (order) {
      order.in_house_assigned = true;
      order.status = "IN_HOUSE_ASSIGNED";
      saveDb(db);
    } else {
      const brief = (db.ugc_briefs || []).find((b: any) => b.id === orderId);
      if (brief) {
        const newOrder = {
          id: 'ugcord_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 7),
          brief_id: brief.id,
          brand_id: brief.brand_id,
          creator_id: '8ebacafb-aa65-4b4b-a046-1e1bea9cc3dc',
          creator_payout: brief.budget || 50000,
          agreed_amount: brief.budget || 50000,
          status: "IN_HOUSE_ASSIGNED",
          in_house_assigned: true,
          created_at: getIsoNow()
        };
        if (!db.ugc_orders) db.ugc_orders = [];
        db.ugc_orders.unshift(newOrder);
        saveDb(db);
      }
    }
    res.json({ ok: true, message: "In-house SLA override triggered" });
  });

  router.post("/ugc/ai-generate-brief", async (req, res) => {
    const { product_name, category, target_audience, focus_area, current_title, current_requirements } = req.body || {};

    if (process.env.GEMINI_API_KEY) {
      try {
        const ai = new GoogleGenAI({
          apiKey: process.env.GEMINI_API_KEY,
          httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
        });

        const prompt = `You are a high-performing D2C UGC (User Generated Content) Creative Director.
Generate a structured, authentic, high-converting UGC campaign brief based on this input:
- Product Name: ${product_name || "D2C Brand Product"}
- Category: ${category || "Lifestyle, Beauty, D2C, Tech or Fitness"}
- Target Audience: ${target_audience || "Gen Z & Millennial consumers"}
- Focus/Hook: ${focus_area || "High-converting authentic proof and lifestyle integration"}
- Current Title: ${current_title || "None"}
- Current Requirements: ${current_requirements || "None"}

Respond with ONLY a valid raw JSON object (no markdown, no backticks, no code fence) matching this schema:
{
  "title": "<Catchy concise campaign title, e.g. 30s Honest Skin Texture & Glow Routine>",
  "product_name": "<Refined product name>",
  "product_description": "<Compelling 1-2 sentence product description under 40 words>",
  "detailed_requirements": "<Actionable creator instructions: 3s hook, key benefit in use, natural daylight demonstration, and crisp CTA. Under 100 words>",
  "dos": [
    "<Direct rule 1>",
    "<Direct rule 2>",
    "<Direct rule 3>"
  ],
  "donts": [
    "<Restriction 1>",
    "<Restriction 2>"
  ],
  "recommended_format": "collaboration_reel",
  "recommended_duration": "30s"
}`;

        const aiCallPromise = ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents: prompt,
        });

        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error("AI generation timeout")), 5000)
        );

        const aiRes: any = await Promise.race([aiCallPromise, timeoutPromise]);
        const rawText = (aiRes.text || "").trim().replace(/^```json\s*|```$/g, "");
        const parsed = JSON.parse(rawText);
        return res.json({ ok: true, data: parsed });
      } catch (err: any) {
        console.error("[POST /ugc/ai-generate-brief] Gemini error, using fallback:", err?.message || err);
      }
    }

    const pName = product_name || "Premium Everyday Essential";
    return res.json({
      ok: true,
      data: {
        title: `${pName} Real Life Review & Demo`,
        product_name: pName,
        product_description: "High-performance formula designed for noticeable everyday results and authentic social proof.",
        detailed_requirements: "Hook viewers in the first 3 seconds with a relatable problem. Show product unboxing, close-up texture in natural daylight, real application, and conclude with a crisp CTA to check the link.",
        dos: [
          "Shoot vertical 9:16 format in bright natural daylight",
          "Highlight close-up product texture and immediate reaction",
          "Include high-contrast captions during the hook"
        ],
        donts: [
          "Do not mention competitor brand names or comparison pricing",
          "Avoid artificial skin smoothing filters or distorted lighting"
        ],
        recommended_format: "collaboration_reel",
        recommended_duration: "30s"
      }
    });
  });

  router.post("/ugc/briefs", async (req, res) => {
    const user = await parseAuthUser(req);
    if (!user) {
      return res.status(401).json({ error: "Authentication required", detail: "Please log in to post a UGC brief." });
    }

    const body = req.body || {};
    const briefId = `brief_${Date.now().toString(36)}_${crypto.randomUUID().slice(0, 6)}`;
    const deliverableType = body.deliverable_type || body.format || "collaboration_reel";
    const isCollab = body.is_collaboration !== undefined
      ? Boolean(body.is_collaboration)
      : (body.requires_live_link !== undefined
        ? Boolean(body.requires_live_link)
        : isCollaborationDeliverable(deliverableType));
    const requiresLiveLink = body.requires_live_link !== undefined
      ? Boolean(body.requires_live_link)
      : isCollab;
    const budget = Math.max(1, Number(body.budget) || 1);
    const maxCreators = Math.max(1, Number(body.max_creators) || 1);
    const totalBudget = Number(body.total_budget) || (budget * maxCreators);
    const brandName = user.name || user.company_name || body.brand_name || "Brand Partner";

    const newBrief = {
      id: briefId,
      brand_id: user.user_id,
      brand_name: brandName,
      title: body.title || `Review of ${body.product_name || "Product"}`,
      product_name: body.product_name || "",
      product_description: body.product_description || "",
      detailed_requirements: body.detailed_requirements || "",
      sample_content_url: body.sample_content_url || "",
      deliverable_type: deliverableType,
      is_collaboration: isCollab,
      requires_live_link: requiresLiveLink,
      format_category: isCollab ? 'collaboration' : 'ugc_video',
      video_duration: body.video_duration || "30s",
      budget: budget,
      max_creators: maxCreators,
      claimed_count: 0,
      status: 'OPEN',
      dos: Array.isArray(body.dos) ? body.dos.filter((d: any) => typeof d === 'string' && d.trim().length > 0) : [],
      donts: Array.isArray(body.donts) ? body.donts.filter((d: any) => typeof d === 'string' && d.trim().length > 0) : [],
      created_at: getIsoNow()
    };

    if (supabase) {
      try {
        const supaPayload = {
          id: briefId,
          brand_id: user.user_id,
          brand_name: brandName,
          title: newBrief.title,
          product_name: newBrief.product_name,
          product_description: newBrief.product_description,
          detailed_requirements: newBrief.detailed_requirements,
          sample_content_url: newBrief.sample_content_url,
          deliverable_type: deliverableType,
          video_duration: newBrief.video_duration,
          budget: budget,
          max_creators: maxCreators,
          claimed_count: 0,
          status: 'OPEN',
          dos: newBrief.dos,
          donts: newBrief.donts,
          created_at: newBrief.created_at
        };
        const { error } = await (privilegedSupabase || supabase).from('ugc_briefs').insert(supaPayload);
        if (error) {
          console.error("[POST /ugc/briefs] Supabase insert error:", error);
        }
      } catch (err) {
        console.error("[POST /ugc/briefs] Supabase insert caught error:", err);
      }
    }

    const db = getDb();
    if (!db.ugc_briefs) db.ugc_briefs = [];
    db.ugc_briefs.unshift(newBrief);

    // Record Escrow transaction in db.transactions
    if (!db.transactions) db.transactions = [];
    db.transactions.unshift({
      id: crypto.randomUUID(),
      transaction_id: `txn_${Date.now()}_${crypto.randomUUID().slice(0, 6)}`,
      brief_id: briefId,
      brand_id: user.user_id,
      gross_amount: totalBudget,
      platform_fee_amount: 0,
      creator_net_amount: totalBudget,
      gst_amount: 0,
      status: 'SUCCESS',
      escrow_hold: true,
      payout_status: 'PENDING',
      payout_type: 'full',
      created_at: getIsoNow()
    });
    saveDb(db);

    return res.json({ ok: true, brief: newBrief, message: "Brief posted and payment held in Escrow!" });
  });


  router.get("/ugc/briefs/my", async (req, res) => {
    const user = await parseAuthUser(req);
    if (!user) return res.status(401).json({ error: "Unauthorized" });

    let briefs: any[] = [];
    if (supabase) {
      try {
        const { data, error } = await (privilegedSupabase || supabase)
          .from('ugc_briefs')
          .select('*')
          .eq('brand_id', user.user_id)
          .order('created_at', { ascending: false });
        if (!error && data) {
          briefs = data;
        }
      } catch (e) {
        console.error("[GET /ugc/briefs/my] Supabase query error:", e);
      }
    }

    const db = getDb();
    const localBriefs = (db.ugc_briefs || []).filter((b: any) => b.brand_id === user.user_id);
    const combinedMap = new Map();
    briefs.forEach((b: any) => combinedMap.set(b.id, b));
    localBriefs.forEach((b: any) => {
      if (!combinedMap.has(b.id)) combinedMap.set(b.id, b);
    });
    const finalBriefs = Array.from(combinedMap.values());

    // Fetch matching orders for applications count
    let allOrders: any[] = [];
    if (supabase) {
      try {
        const { data: ords } = await (privilegedSupabase || supabase)
          .from('ugc_orders')
          .select('*')
          .eq('brand_id', user.user_id);
        if (ords) allOrders = ords;
      } catch (e) {}
    }
    const localOrders = (db.ugc_orders || []).filter((o: any) => o.brand_id === user.user_id);
    const allOrdersMap = new Map();
    allOrders.forEach((o: any) => allOrdersMap.set(o.id, o));
    localOrders.forEach((o: any) => {
      if (!allOrdersMap.has(o.id)) allOrdersMap.set(o.id, o);
    });
    const mergedOrders = Array.from(allOrdersMap.values());

    // Gather creator details for all orders to ensure real creator data is returned
    const creatorIds = Array.from(new Set(mergedOrders.map((o: any) => o.creator_id).filter(Boolean)));
    const creatorMap = new Map<string, any>();
    if (supabase && creatorIds.length > 0) {
      try {
        const [uRes, cpRes] = await Promise.all([
          (privilegedSupabase || supabase)
            .from('users')
            .select('user_id, name, picture, email')
            .in('user_id', creatorIds),
          (privilegedSupabase || supabase)
            .from('creator_profiles')
            .select('user_id, name, picture, photo, avatar_url, instagram_handle')
            .in('user_id', creatorIds)
        ]);
        const usersList = uRes?.data || [];
        const profilesList = cpRes?.data || [];
        creatorIds.forEach((cid: string) => {
          const u = usersList.find((x: any) => x.user_id === cid);
          const cp = profilesList.find((x: any) => x.user_id === cid);
          if (u || cp) {
            const resolvedName = u?.name || cp?.name || "Verified UGC Creator";
            const resolvedAvatar = cp?.picture || cp?.photo || cp?.avatar_url || u?.picture || null;
            creatorMap.set(cid, {
              id: cid,
              user_id: cid,
              name: resolvedName,
              full_name: resolvedName,
              avatar: resolvedAvatar,
              picture: resolvedAvatar,
              photo: resolvedAvatar,
              email: u?.email || null,
              instagram_handle: cp?.instagram_handle || null
            });
          }
        });
      } catch (e) {
        console.error("[GET /ugc/briefs/my] Error loading creator info:", e);
      }
    }

    const populatedBriefs = finalBriefs.map((b: any) => {
      const matching = mergedOrders.filter((o: any) => o.brief_id === b.id);
      const isEveryOrderCompleted = matching.length > 0 && matching.every((o: any) => 
        ['COMPLETED', 'PAID', 'RELEASED'].includes(String(o.status || '').toUpperCase()) ||
        ['RELEASED', 'PAID'].includes(String(o.payment_status || '').toUpperCase())
      );
      const isCompleted = b.status === 'COMPLETED' || isEveryOrderCompleted;
      const statusToReturn = isCompleted ? 'COMPLETED' : b.status;

      if (isCompleted && b.status !== 'COMPLETED') {
        b.status = 'COMPLETED';
        if (supabase) {
          (privilegedSupabase || supabase).from('ugc_briefs').update({ status: 'COMPLETED' }).eq('id', b.id).then().catch(() => {});
        }
        const localBriefRecord = (db.ugc_briefs || []).find((lb: any) => lb.id === b.id);
        if (localBriefRecord) localBriefRecord.status = 'COMPLETED';
      }

      // Populate creator inside matching orders
      const matchingPopulated = matching.map((o: any) => {
        const cr = creatorMap.get(o.creator_id) || (db.users || []).find((u: any) => u.user_id === o.creator_id || u.id === o.creator_id);
        const crName = cr?.name || o.creator_name || "Verified UGC Creator";
        const crAvatar = cr?.avatar || cr?.picture || cr?.photo || o.creator_avatar || null;
        return {
          ...o,
          creator: cr ? { ...cr, name: crName, avatar: crAvatar, picture: crAvatar } : { name: crName, avatar: crAvatar },
          creator_name: crName,
          creator_avatar: crAvatar
        };
      });

      return {
        ...b,
        status: statusToReturn,
        orders: matchingPopulated,
        applications: matchingPopulated.map((o: any) => ({
          creator_id: o.creator_id,
          creator_name: o.creator_name || "Verified UGC Creator",
          creator_avatar: o.creator_avatar || null,
          creator_picture: o.creator_avatar || null,
          creator_username: o.creator?.instagram_handle || null,
          status: o.status,
          order_id: o.id
        }))
      };
    });

    const enriched = await enrichBriefsWithBrandProfiles(populatedBriefs);
    return res.json(enriched);
  });


  router.get("/ugc/briefs/available", async (req, res) => {
    let briefs: any[] = [];
    if (supabase) {
      try {
        const { data, error } = await (privilegedSupabase || supabase)
          .from('ugc_briefs')
          .select('*')
          .eq('status', 'OPEN')
          .order('created_at', { ascending: false });
        if (!error && data) {
          briefs = data;
        }
      } catch (e) {
        console.error("[GET /ugc/briefs/available] Supabase error:", e);
      }
    }

    const db = getDb();
    const localBriefs = (db.ugc_briefs || []).filter((b: any) => (b.status || 'OPEN') === 'OPEN');
    const combinedMap = new Map();
    briefs.forEach((b: any) => combinedMap.set(b.id, b));
    localBriefs.forEach((b: any) => {
      if (!combinedMap.has(b.id)) combinedMap.set(b.id, b);
    });
    const finalBriefs = Array.from(combinedMap.values()).filter((b: any) => {
      const maxC = Number(b.max_creators) || 1;
      const claimedC = Number(b.claimed_count) || 0;
      return claimedC < maxC;
    });

    const enriched = await enrichBriefsWithBrandProfiles(finalBriefs);
    return res.json(enriched);
  });


  router.get("/ugc/briefs/:id", async (req, res) => {
    const { id } = req.params;
    let brief: any = null;
    if (supabase) {
      try {
        const { data } = await (privilegedSupabase || supabase).from('ugc_briefs').select('*').eq('id', id).maybeSingle();
        if (data) brief = data;
      } catch (e) {}
    }
    if (!brief) {
      const db = getDb();
      brief = (db.ugc_briefs || []).find((b: any) => b.id === id);
    }
    if (!brief) return res.status(404).json({ error: "UGC Brief not found" });

    const [enriched] = await enrichBriefsWithBrandProfiles([brief]);
    return res.json(enriched || brief);
  });


  router.get("/ugc/orders/brand", async (req, res) => {
    const user = await parseAuthUser(req);
    if (!user) return res.status(401).json({ error: "Unauthorized" });

    let orders: any[] = [];
    if (supabase) {
      try {
        const { data } = await (privilegedSupabase || supabase)
          .from('ugc_orders')
          .select('*')
          .eq('brand_id', user.user_id)
          .order('created_at', { ascending: false });
        if (data) orders = data;
      } catch (e) {}
    }

    const db = getDb();
    const localOrders = (db.ugc_orders || []).filter((o: any) => o.brand_id === user.user_id);
    const combinedMap = new Map();
    orders.forEach((o: any) => combinedMap.set(o.id, o));
    localOrders.forEach((o: any) => {
      combinedMap.set(o.id, mergeOrderRecords(combinedMap.get(o.id), o));
    });
    const finalOrders = Array.from(combinedMap.values());

    const populated = await Promise.all(finalOrders.map(async (o: any) => {
      let brief = null;
      if (supabase && o.brief_id) {
        try {
          const { data: b } = await (privilegedSupabase || supabase).from('ugc_briefs').select('*').eq('id', o.brief_id).maybeSingle();
          if (b) brief = b;
        } catch(e) {}
      }
      if (!brief) {
        brief = (db.ugc_briefs || []).find((b: any) => b.id === o.brief_id);
      }
      let creator: any = null;
      if (supabase && o.creator_id) {
        try {
          const [uRes, cpRes] = await Promise.all([
            (privilegedSupabase || supabase).from('users').select('user_id, name, picture, email').eq('user_id', o.creator_id).maybeSingle(),
            (privilegedSupabase || supabase).from('creator_profiles').select('user_id, name, picture, photo, avatar_url, instagram_handle').eq('user_id', o.creator_id).maybeSingle()
          ]);
          const u = uRes?.data;
          const cp = cpRes?.data;
          if (u || cp) {
            const resolvedName = u?.name || cp?.name || "Verified UGC Creator";
            const resolvedAvatar = cp?.picture || cp?.photo || cp?.avatar_url || u?.picture || null;
            creator = {
              id: o.creator_id,
              user_id: o.creator_id,
              name: resolvedName,
              full_name: resolvedName,
              avatar: resolvedAvatar,
              picture: resolvedAvatar,
              photo: resolvedAvatar,
              email: u?.email || null,
              instagram_handle: cp?.instagram_handle || null
            };
          }
        } catch(e) {
          console.warn("[ugc/orders/brand] Creator query warning:", e);
        }
      }
      if (!creator) {
        const localUser = (db.users || []).find((u: any) => u.user_id === o.creator_id || u.id === o.creator_id);
        if (localUser) {
          creator = {
            id: localUser.user_id || localUser.id,
            user_id: localUser.user_id || localUser.id,
            name: localUser.name || "Verified UGC Creator",
            avatar: localUser.picture || localUser.avatar || null,
            picture: localUser.picture || localUser.avatar || null,
            email: localUser.email || null
          };
        }
      }

      // Check chat thread state to ensure order status and revision notes are synchronized with chat
      let thr: any = null;
      if (supabase) {
        try {
          const { data: tData } = await (privilegedSupabase || supabase)
            .from('chat_threads')
            .select('status, flow_state, revision_notes, revision_feedback, updated_at')
            .or(`id.eq.${o.id},deal_id.eq.${o.id}`)
            .maybeSingle();
          if (tData) thr = tData;
        } catch(e) {}
      }
      if (!thr) {
        thr = (db.chat_threads || []).find((t: any) => t.id === o.id || t.deal_id === o.id);
      }

      let resolvedRevisionNotes = o.revision_notes || o.revision_feedback || null;
      if (!resolvedRevisionNotes && typeof o.creator_notes === 'string' && o.creator_notes.includes('Revision feedback:')) {
        resolvedRevisionNotes = o.creator_notes.replace(/^Revision feedback:\s*/i, '').trim();
      }
      if (!resolvedRevisionNotes && (thr?.revision_notes || thr?.revision_feedback)) {
        resolvedRevisionNotes = thr.revision_notes || thr.revision_feedback;
      }

      // If creator resubmitted deliverable in chat or thread flow_state is SUBMITTED, sync to SUBMITTED
      let activeStatus = o.status;
      if (thr?.flow_state === 'SUBMITTED' && (activeStatus === 'REVISION_REQ' || activeStatus === 'REVISION_REQUESTED')) {
        activeStatus = 'SUBMITTED';
      }
      if (activeStatus !== 'COMPLETED') {
        if (thr?.flow_state === 'PROOF_SUBMITTED' || thr?.live_links_submitted || o.live_link || thr?.live_link) {
          activeStatus = 'PROOF_SUBMITTED';
        } else if (thr?.flow_state === 'CONTENT_APPROVED' || o.status === 'CONTENT_APPROVED') {
          activeStatus = 'CONTENT_APPROVED';
        }
      }

      const resolvedLiveLink = o.live_link || thr?.live_link || null;
      const resolvedDeliverableType = o.deliverable_type || brief?.deliverable_type || 'collaboration_reel';
      const isCollab = o.is_collaboration !== undefined
        ? Boolean(o.is_collaboration)
        : (brief?.is_collaboration !== undefined
          ? Boolean(brief.is_collaboration)
          : isCollaborationDeliverable(resolvedDeliverableType));
      const requiresLiveLink = o.requires_live_link !== undefined
        ? Boolean(o.requires_live_link)
        : (brief?.requires_live_link !== undefined
          ? Boolean(brief.requires_live_link)
          : isCollab);

      return {
        ...o,
        status: activeStatus,
        live_link: resolvedLiveLink,
        deliverable_type: resolvedDeliverableType,
        is_collaboration: isCollab,
        requires_live_link: requiresLiveLink,
        format_category: isCollab ? 'collaboration' : 'ugc_video',
        flow_state: thr?.flow_state || o.flow_state || (activeStatus === 'CONTENT_APPROVED' ? 'CONTENT_APPROVED' : null),
        thread_id: o.id,
        threadId: o.id,
        brief: brief || { title: "UGC Brief", budget: o.creator_payout || 0, deliverable_type: resolvedDeliverableType },
        creator: creator || { name: "Verified UGC Creator" },
        creator_name: creator?.name || "Verified UGC Creator",
        creator_avatar: creator?.avatar || creator?.picture || null,
        revision_notes: resolvedRevisionNotes,
        revision_feedback: resolvedRevisionNotes,
        // NOTE: brand_status must stay a raw, underscore-style status token (e.g. 'SUBMITTED',
        // 'REVISION_REQUESTED') identical to `status` — the frontend's stage classifier
        // (BrandUGCOrders.jsx / BrandInstantUGC.jsx) matches against these exact tokens.
        brand_status: activeStatus
      };
    }));

    return res.json(populated);
  });


  router.get("/ugc/orders/creator", async (req, res) => {
    const user = await parseAuthUser(req);
    if (!user) return res.status(401).json({ error: "Unauthorized" });

    let orders: any[] = [];
    if (supabase) {
      try {
        const { data } = await (privilegedSupabase || supabase)
          .from('ugc_orders')
          .select('*')
          .eq('creator_id', user.user_id)
          .order('created_at', { ascending: false });
        if (data) orders = data;
      } catch (e) {}
    }

    const db = getDb();
    const localOrders = (db.ugc_orders || []).filter((o: any) => o.creator_id === user.user_id);
    const combinedMap = new Map();
    orders.forEach((o: any) => combinedMap.set(o.id, o));
    localOrders.forEach((o: any) => {
      combinedMap.set(o.id, mergeOrderRecords(combinedMap.get(o.id), o));
    });
    const finalOrders = Array.from(combinedMap.values());

    const populated = await Promise.all(finalOrders.map(async (o: any) => {
      let brief = null;
      if (supabase && o.brief_id) {
        try {
          const { data: b } = await (privilegedSupabase || supabase).from('ugc_briefs').select('*').eq('id', o.brief_id).maybeSingle();
          if (b) brief = b;
        } catch(e) {}
      }
      if (!brief) {
        brief = (db.ugc_briefs || []).find((b: any) => b.id === o.brief_id);
      }
      if (brief) {
        const [enrichedBrief] = await enrichBriefsWithBrandProfiles([brief]);
        if (enrichedBrief) brief = enrichedBrief;
      }
      let brand = null;
      if (supabase && o.brand_id) {
        try {
          const { data: br } = await (privilegedSupabase || supabase).from('brand_profiles').select('*').eq('user_id', o.brand_id).maybeSingle();
          if (br) brand = br;
        } catch(e) {}
      }

      // Check chat thread state to ensure order status is synchronized with chat
      let thr: any = null;
      if (supabase) {
        try {
          const { data: tData } = await (privilegedSupabase || supabase).from('chat_threads').select('status, flow_state').or(`id.eq.${o.id},deal_id.eq.${o.id}`).maybeSingle();
          if (tData) thr = tData;
        } catch(e) {}
      }
      if (!thr) {
        thr = (db.chat_threads || []).find((t: any) => t.id === o.id || t.deal_id === o.id);
      }

      let resolvedRevisionNotes = o.revision_notes || o.revision_feedback || null;
      if (!resolvedRevisionNotes && typeof o.creator_notes === 'string' && o.creator_notes.includes('Revision feedback:')) {
        resolvedRevisionNotes = o.creator_notes.replace(/^Revision feedback:\s*/i, '').trim();
      }
      if (!resolvedRevisionNotes && (thr?.revision_notes || thr?.revision_feedback)) {
        resolvedRevisionNotes = thr.revision_notes || thr.revision_feedback;
      }

      const isCompleted = o.status === 'COMPLETED' ||
        o.payment_status === 'RELEASED' ||
        o.payment_status === 'PAID' ||
        thr?.status === 'COMPLETED' ||
        thr?.flow_state === 'COMPLETED';

      let finalStatus = isCompleted ? 'COMPLETED' : o.status;
      if (!isCompleted && thr?.flow_state === 'SUBMITTED' && (finalStatus === 'REVISION_REQ' || finalStatus === 'REVISION_REQUESTED')) {
        finalStatus = 'SUBMITTED';
      }
      if (!isCompleted) {
        if (thr?.flow_state === 'PROOF_SUBMITTED' || thr?.live_links_submitted || o.live_link || thr?.live_link) {
          finalStatus = 'PROOF_SUBMITTED';
        } else if (thr?.flow_state === 'CONTENT_APPROVED' || o.status === 'CONTENT_APPROVED') {
          finalStatus = 'CONTENT_APPROVED';
        }
      }
      const finalPaymentStatus = isCompleted ? 'RELEASED' : (o.payment_status || 'PENDING');
      const resolvedLiveLink = o.live_link || thr?.live_link || null;
      const resolvedDeliverableType = o.deliverable_type || brief?.deliverable_type || 'collaboration_reel';
      const isCollab = o.is_collaboration !== undefined
        ? Boolean(o.is_collaboration)
        : (brief?.is_collaboration !== undefined
          ? Boolean(brief.is_collaboration)
          : isCollaborationDeliverable(resolvedDeliverableType));
      const requiresLiveLink = o.requires_live_link !== undefined
        ? Boolean(o.requires_live_link)
        : (brief?.requires_live_link !== undefined
          ? Boolean(brief.requires_live_link)
          : isCollab);

      const bLogo = brief?.brand_logo || brand?.logo || null;
      let creatorStage = 'IN_PROGRESS';
      if (isCompleted) {
        creatorStage = 'COMPLETED';
      } else if (finalStatus === 'PROOF_SUBMITTED') {
        creatorStage = 'LIVE_LINK_SUBMITTED';
      } else if (finalStatus === 'CONTENT_APPROVED') {
        creatorStage = 'COMPLETED_APPROVAL';
      } else if (finalStatus === 'SUBMITTED') {
        creatorStage = 'IN_REVIEW';
      } else if (finalStatus === 'ACCEPTED') {
        creatorStage = 'IN_PROGRESS';
      } else {
        creatorStage = finalStatus;
      }

      return {
        ...o,
        status: finalStatus,
        payment_status: finalPaymentStatus,
        creator_status: isCompleted ? 'COMPLETED' : finalStatus,
        live_link: resolvedLiveLink,
        deliverable_type: resolvedDeliverableType,
        is_collaboration: isCollab,
        requires_live_link: requiresLiveLink,
        format_category: isCollab ? 'collaboration' : 'ugc_video',
        thread_status: thr?.status || finalStatus,
        thread_flow_state: thr?.flow_state || finalStatus,
        thread_id: o.id,
        threadId: o.id,
        revision_notes: resolvedRevisionNotes,
        revision_feedback: resolvedRevisionNotes,
        brief: brief || { title: "UGC Brief", budget: o.creator_payout || 0, brand_logo: bLogo },
        brand: brand || { company_name: brief?.brand_name || "Brand Partner", logo: bLogo },
        brand_name: brand?.company_name || brief?.brand_name || "Brand Partner",
        brand_logo: bLogo,
        stage: creatorStage
      };
    }));

    return res.json(populated);
  });


  router.get(["/ugc/orders/:id", "/ugc/order/:id"], async (req, res) => {
    const user = await parseAuthUser(req);
    if (!user) return res.status(401).json({ error: "Unauthorized" });
    const { id } = req.params;
    let order: any = null;
    if (supabase) {
      try {
        const { data } = await (privilegedSupabase || supabase)
          .from('ugc_orders')
          .select('*')
          .or(`id.eq.${id},brief_id.eq.${id}`)
          .maybeSingle();
        if (data) order = data;
      } catch (e) {}
    }
    const db = getDb();
    const localOrder = (db.ugc_orders || []).find((o: any) => o.id === id || o.brief_id === id);
    if (!order && localOrder) order = localOrder;
    else if (order && localOrder) order = { ...localOrder, ...order };

    if (!order) return res.status(404).json({ error: "Order not found" });

    let brief = (db.ugc_briefs || []).find((b: any) => b.id === order.brief_id);
    const resolvedDeliverableType = order.deliverable_type || brief?.deliverable_type || 'collaboration_reel';
    const isCollab = order.is_collaboration !== undefined
      ? Boolean(order.is_collaboration)
      : (brief?.is_collaboration !== undefined
        ? Boolean(brief.is_collaboration)
        : isCollaborationDeliverable(resolvedDeliverableType));
    const requiresLiveLink = order.requires_live_link !== undefined
      ? Boolean(order.requires_live_link)
      : (brief?.requires_live_link !== undefined
        ? Boolean(brief.requires_live_link)
        : isCollab);

    return res.json({
      ...order,
      deliverable_type: resolvedDeliverableType,
      is_collaboration: isCollab,
      requires_live_link: requiresLiveLink,
      format_category: isCollab ? 'collaboration' : 'ugc_video'
    });
  });


  router.post("/ugc/orders/claim", async (req, res) => {
    const user = await parseAuthUser(req);
    if (!user) return res.status(401).json({ error: "Authentication required" });

    const { brief_id, signature } = req.body;
    if (!brief_id) return res.status(400).json({ error: "brief_id is required" });

    let brief: any = null;
    if (supabase) {
      try {
        const { data } = await (privilegedSupabase || supabase).from('ugc_briefs').select('*').eq('id', brief_id).maybeSingle();
        if (data) brief = data;
      } catch(e) {}
    }
    const db = getDb();
    if (!brief) {
      brief = (db.ugc_briefs || []).find((b: any) => b.id === brief_id);
    }
    if (!brief) return res.status(404).json({ error: "Brief not found" });

    if (brief.brand_id === user.user_id) {
      return res.status(400).json({ error: "You cannot claim your own brief." });
    }

    const maxC = Number(brief.max_creators) || 1;
    const claimedC = Number(brief.claimed_count) || 0;
    if (claimedC >= maxC || brief.status !== 'OPEN') {
      return res.status(400).json({ error: "This brief has already reached creator capacity." });
    }

    const orderId = `ugcord_${Date.now().toString(36)}_${crypto.randomUUID().slice(0, 6)}`;
    const nowIso = getIsoNow();
    const payout = Number(brief.budget) || 1;

    // Detect if this is a Collaboration (requires live link) vs Normal UGC (draft approval only)
    const deliverableType = brief.deliverable_type || "collaboration_reel";
    const isCollab = brief.is_collaboration !== undefined
      ? Boolean(brief.is_collaboration)
      : (brief.requires_live_link !== undefined
        ? Boolean(brief.requires_live_link)
        : isCollaborationDeliverable(deliverableType));
    const requiresLiveLink = brief.requires_live_link !== undefined
      ? Boolean(brief.requires_live_link)
      : isCollab;

    const newOrder = {
      id: orderId,
      brief_id: brief.id,
      brand_id: brief.brand_id,
      creator_id: user.user_id,
      status: 'ACCEPTED',
      deliverable_type: deliverableType,
      is_collaboration: isCollab,
      requires_live_link: requiresLiveLink,
      format_category: isCollab ? 'collaboration' : 'ugc_video',
      creator_payout: payout,
      agreed_amount: payout,
      escrow_amount: payout,
      escrow_hold: true,
      escrow_held_at: nowIso,
      payment_status: 'ESCROW_HELD',
      agreement_signed_creator: true,
      internal_deadline: new Date(Date.now() + 22 * 3600 * 1000).toISOString(),
      revision_count: 5,
      revisions_used: 0,
      created_at: nowIso
    };

    if (supabase) {
      try {
        const supaPayload = {
          id: orderId,
          brief_id: brief.id,
          brand_id: brief.brand_id,
          creator_id: user.user_id,
          status: 'ACCEPTED',
          creator_payout: payout,
          agreed_amount: payout,
          escrow_amount: payout,
          escrow_hold: true,
          escrow_held_at: nowIso,
          payment_status: 'ESCROW_HELD',
          agreement_signed_creator: true,
          internal_deadline: newOrder.internal_deadline,
          revision_count: 5,
          revisions_used: 0,
          created_at: nowIso
        };
        await (privilegedSupabase || supabase).from('ugc_orders').insert(supaPayload);
        const newClaimCount = claimedC + 1;
        const newStatus = newClaimCount >= maxC ? 'CLAIMED' : 'OPEN';
        await (privilegedSupabase || supabase).from('ugc_briefs').update({
          claimed_count: newClaimCount,
          status: newStatus
        }).eq('id', brief.id);
      } catch(e) {
        console.error("[POST /ugc/orders/claim] Supabase error:", e);
      }
    }

    if (!db.ugc_orders) db.ugc_orders = [];
    db.ugc_orders.unshift(newOrder);
    const localBrief = (db.ugc_briefs || []).find((b: any) => b.id === brief.id);
    if (localBrief) {
      localBrief.claimed_count = (localBrief.claimed_count || 0) + 1;
      if (localBrief.claimed_count >= (localBrief.max_creators || 1)) {
        localBrief.status = 'CLAIMED';
      }
    }
    saveDb(db);

    // Create dedicated UGC chat thread immediately
    await ensureUGCChatThread(newOrder, brief, user, req.app.get("io"));

    return res.json({ ok: true, order_id: orderId, thread_id: orderId, order: newOrder, message: "Brief successfully claimed!" });
  });


  router.post("/ugc/orders/:id/sign", async (req, res) => {
    const user = await parseAuthUser(req);
    if (!user) return res.status(401).json({ error: "Unauthorized" });
    const { id } = req.params;
    const { signature } = req.body;

    if (supabase) {
      try {
        await (privilegedSupabase || supabase).from('ugc_orders').update({
          agreement_signed_creator: true,
          status: 'ACCEPTED'
        }).eq('id', id);
      } catch(e) {}
    }
    const db = getDb();
    const order = (db.ugc_orders || []).find((o: any) => o.id === id);
    if (order) {
      order.agreement_signed_creator = true;
      order.status = 'ACCEPTED';
      saveDb(db);
    }

    // Ensure dedicated chat thread is created on signing
    let fullOrder = order;
    if (!fullOrder && supabase) {
      try {
        const { data } = await (privilegedSupabase || supabase).from('ugc_orders').select('*').eq('id', id).maybeSingle();
        if (data) fullOrder = data;
      } catch (e) {}
    }
    if (fullOrder) {
      await ensureUGCChatThread(fullOrder, null, user, req.app.get("io"));
    }

    return res.json({ ok: true, order_id: id, thread_id: id, message: "Agreement signed" });
  });


  router.get("/ugc/earnings", async (req, res) => {
    const user = await parseAuthUser(req);
    if (!user) return res.status(401).json({ error: "Unauthorized" });

    let orders: any[] = [];
    if (supabase) {
      try {
        const { data } = await (privilegedSupabase || supabase)
          .from('ugc_orders')
          .select('*')
          .eq('creator_id', user.user_id)
          .eq('status', 'COMPLETED');
        if (data) orders = data;
      } catch(e) {}
    }
    const db = getDb();
    const localOrders = (db.ugc_orders || []).filter((o: any) => o.creator_id === user.user_id && o.status === 'COMPLETED');
    const combinedMap = new Map();
    orders.forEach((o: any) => combinedMap.set(o.id, o));
    localOrders.forEach((o: any) => {
      combinedMap.set(o.id, mergeOrderRecords(combinedMap.get(o.id), o));
    });
    const finalOrders = Array.from(combinedMap.values());

    return res.json(finalOrders);
  });


  router.get("/ugc/showcase", async (req, res) => {
    let briefs: any[] = [];
    if (supabase) {
      try {
        const { data } = await (privilegedSupabase || supabase).from('ugc_briefs').select('*').limit(12);
        if (data) briefs = data;
      } catch(e) {}
    }
    const db = getDb();
    if (briefs.length === 0) {
      briefs = (db.ugc_briefs || []).slice(0, 12);
    }
    return res.json(briefs);
  });


  router.get("/admin/ugc/orders", async (req, res) => {
    let orders: any[] = [];
    if (supabase) {
      try {
        const { data } = await (privilegedSupabase || supabase).from('ugc_orders').select('*').order('created_at', { ascending: false });
        if (data) orders = data;
      } catch(e) {}
    }
    const db = getDb();
    const localOrders = db.ugc_orders || [];
    const combinedMap = new Map();
    orders.forEach((o: any) => combinedMap.set(o.id, o));
    localOrders.forEach((o: any) => {
      combinedMap.set(o.id, mergeOrderRecords(combinedMap.get(o.id), o));
    });
    return res.json(Array.from(combinedMap.values()));
  });


  router.post("/admin/ugc/orders/:id/team-upload", async (req, res) => {
    const { id } = req.params;
    const { videoUrl, notes } = req.body;
    const nowIso = getIsoNow();
    if (supabase) {
      try {
        await (privilegedSupabase || supabase).from('ugc_orders').update({
          video_url: videoUrl,
          creator_notes: notes || "Team SLA Upload",
          status: 'SUBMITTED',
          delivered_at: nowIso
        }).eq('id', id);
      } catch(e) {}
    }
    const db = getDb();
    const order = (db.ugc_orders || []).find((o: any) => o.id === id);
    if (order) {
      order.video_url = videoUrl;
      order.creator_notes = notes || "Team SLA Upload";
      order.status = 'SUBMITTED';
      order.delivered_at = nowIso;
      saveDb(db);
    }
    return res.json({ ok: true, message: "Team upload saved" });
  });


  router.get("/ugc-orders", async (req, res) => {
    const viewer = await parseAuthUser(req);
    if (!viewer) return res.status(401).json({ error: "Unauthorized" });

    const db = getDb();
    let briefs: any[] = [];
    let orders: any[] = [];
    let brands: any[] = [];
    let creators: any[] = [];

    if (supabase) {
      try {
        const [rawBriefs, rawOrders, rawBrands, rawCreators] = await Promise.all([
          (privilegedSupabase || supabase).from('ugc_briefs').select('*'),
          (privilegedSupabase || supabase).from('ugc_orders').select('*'),
          (privilegedSupabase || supabase).from('brand_profiles').select('*'),
          (privilegedSupabase || supabase).from('users').select('user_id, name').eq('role', 'creator')
        ]);
        if (rawBriefs.data) briefs = rawBriefs.data;
        if (rawOrders.data) orders = rawOrders.data;
        if (rawBrands.data) brands = rawBrands.data;
        if (rawCreators.data) creators = rawCreators.data;
      } catch (e: any) {
        console.warn("[ugc-orders] Supabase fetch error:", e);
      }
    }

    // Merge with local db briefs
    const briefMap = new Map(briefs.map((b: any) => [b.id, b]));
    (db.ugc_briefs || []).forEach((lb: any) => {
      if (!briefMap.has(lb.id)) {
        briefMap.set(lb.id, lb);
        briefs.push(lb);
      }
    });

    // Map orders by brief_id and id, prioritizing newest and local updates
    const orderMap = new Map<string, any>();
    orders.forEach((o: any) => {
      if (o.brief_id) orderMap.set(o.brief_id, o);
      if (o.id) orderMap.set(o.id, o);
    });
    (db.ugc_orders || []).forEach((lo: any) => {
      if (lo.brief_id) {
        const existing = orderMap.get(lo.brief_id);
        orderMap.set(lo.brief_id, existing ? { ...existing, ...lo } : lo);
      }
      if (lo.id) {
        const existing = orderMap.get(lo.id);
        orderMap.set(lo.id, existing ? { ...existing, ...lo } : lo);
      }
    });

    const brandMap = new Map(brands.map((b: any) => [b.user_id, b]));
    const creatorMap = new Map(creators.map((c: any) => [c.user_id, c.name]));

    const processed = briefs.map((brief: any) => {
      const order = orderMap.get(brief.id) as any;
      const brand = brandMap.get(brief.brand_id) as any;
      const creatorName = order ? (creatorMap.get(order.creator_id) || order.accepted_by_creator_name) : null;
      
      const rawStatus = order?.status || "Open";
      const normalizedStatus = order
        ? (order.in_house_assigned && (rawStatus === 'IN_HOUSE_ASSIGNED' || rawStatus === 'in_house_backup')
            ? 'in_house_backup'
            : rawStatus.toLowerCase())
        : "open";

      return {
        order_id: brief.id,
        brief_id: brief.id,
        brand_user_id: brief.brand_id,
        brand_name: brand?.company_name || brief.brand_name || "Unknown Brand",
        brand_logo: brand?.logo_url || null,
        product_name: brief.product_name || brief.title || "UGC Product",
        instructions: brief.detailed_requirements || brief.product_description || "",
        category: brief.deliverable_type || "Fashion",
        video_length: brief.video_duration || "30s",
        ref_link: brief.sample_content_url || null,
        budget: brief.budget || 0,
        amount: brief.budget || 0,
        creator_name: creatorName || "Unknown Creator",
        accepted_by_creator_id: order?.creator_id || order?.accepted_by_creator_id || null,
        accepted_by_creator_name: creatorName || "Vetted Creator",
        submitted_video_url: order?.video_url || null,
        video_url: order?.video_url || null,
        status: normalizedStatus,
        raw_status: rawStatus,
        in_house_assigned: !!order?.in_house_assigned,
        date: brief.created_at || new Date().toISOString(),
        content_type: brief.content_type || brief.deliverable_type || "Video",
        title: brief.title || brief.product_name || "UGC Campaign"
      };
    });
    return res.json(processed);
  });


  router.post("/ugc-orders/:orderId/accept", async (req, res) => {
    const viewer = await parseAuthUser(req);
    const { orderId } = req.params;
    const nowIso = getIsoNow();

    const db = getDb();
    let order: any = (db.ugc_orders || []).find((o: any) => o.id === orderId || o.brief_id === orderId);
    let brief: any = (db.ugc_briefs || []).find((b: any) => b.id === orderId || (order && b.id === order.brief_id));

    if (supabase) {
      try {
        if (!order) {
          const { data: supaOrder } = await (privilegedSupabase || supabase)
            .from('ugc_orders')
            .select('*')
            .or(`id.eq.${orderId},brief_id.eq.${orderId}`)
            .maybeSingle();
          if (supaOrder) order = supaOrder;
        }
        if (!brief) {
          const targetBriefId = order?.brief_id || orderId;
          const { data: supaBrief } = await (privilegedSupabase || supabase)
            .from('ugc_briefs')
            .select('*')
            .eq('id', targetBriefId)
            .maybeSingle();
          if (supaBrief) brief = supaBrief;
        }
      } catch (e) {
        console.warn("[POST /ugc-orders/:orderId/accept] Supabase lookup error:", e);
      }
    }

    // Determine creator ID for in-house assignment
    const candidateCreatorId = viewer?.user_id;
    const briefBrandId = brief?.brand_id || order?.brand_id;
    // Ensure creator_id != brand_id to satisfy check constraint and foreign key
    const assignedCreatorId = (candidateCreatorId && candidateCreatorId !== briefBrandId)
      ? candidateCreatorId
      : '8ebacafb-aa65-4b4b-a046-1e1bea9cc3dc'; // valid verified creator
    const creatorName = viewer?.name || 'In-House Ops';

    if (!order && !brief) {
      // In-house ops convention: create order record if neither order nor brief exists
      const deliverableType = brief?.deliverable_type || 'collaboration_reel';
      const isCollab = brief?.is_collaboration !== undefined
        ? Boolean(brief.is_collaboration)
        : (brief?.requires_live_link !== undefined
          ? Boolean(brief.requires_live_link)
          : isCollaborationDeliverable(deliverableType));
      const requiresLiveLink = brief?.requires_live_link !== undefined
        ? Boolean(brief.requires_live_link)
        : isCollab;

      const newOrderId = orderId.startsWith('ugcord_') ? orderId : 'ugcord_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 7);
      const newOrder: any = {
        id: newOrderId,
        brief_id: orderId,
        brand_id: 'dev-user-id-12345',
        creator_id: assignedCreatorId,
        deliverable_type: deliverableType,
        is_collaboration: isCollab,
        requires_live_link: requiresLiveLink,
        format_category: isCollab ? 'collaboration' : 'ugc_video',
        creator_payout: 50000,
        agreed_amount: 50000,
        status: 'ACCEPTED',
        in_house_assigned: true,
        agreement_signed_creator: true,
        revision_count: 5,
        revisions_used: 0,
        created_at: nowIso,
        accepted_at: nowIso,
        accepted_by_creator_id: viewer?.user_id || assignedCreatorId,
        accepted_by_creator_name: creatorName
      };
      if (!db.ugc_orders) db.ugc_orders = [];
      db.ugc_orders.unshift(newOrder);
      saveDb(db);
      order = newOrder;
    }

    if (order) {
      // Existing order -> update status and in-house assignment
      if (supabase) {
        try {
          await (privilegedSupabase || supabase).from('ugc_orders').update({
            status: 'ACCEPTED',
            agreement_signed_creator: true
          }).eq('id', order.id);
        } catch (e) {
          console.warn("[POST /ugc-orders/:orderId/accept] Supabase update error:", e);
        }
      }

      order.status = 'ACCEPTED';
      order.in_house_assigned = true;
      order.agreement_signed_creator = true;
      order.accepted_at = nowIso;
      order.accepted_by_creator_id = viewer?.user_id || assignedCreatorId;
      order.accepted_by_creator_name = creatorName;

      // Update local db
      if (!db.ugc_orders) db.ugc_orders = [];
      const locIdx = db.ugc_orders.findIndex((o: any) => o.id === order.id || o.brief_id === order.brief_id);
      if (locIdx >= 0) {
        db.ugc_orders[locIdx] = { ...db.ugc_orders[locIdx], ...order };
      } else {
        db.ugc_orders.unshift(order);
      }
      saveDb(db);
    } else if (brief) {
      // Create new ugc_orders record for this brief
      const deliverableType = brief.deliverable_type || 'collaboration_reel';
      const isCollab = brief.is_collaboration !== undefined
        ? Boolean(brief.is_collaboration)
        : (brief.requires_live_link !== undefined
          ? Boolean(brief.requires_live_link)
          : isCollaborationDeliverable(deliverableType));
      const requiresLiveLink = brief.requires_live_link !== undefined
        ? Boolean(brief.requires_live_link)
        : isCollab;

      const newOrderId = 'ugcord_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 7);
      const newOrder: any = {
        id: newOrderId,
        brief_id: brief.id,
        brand_id: brief.brand_id,
        creator_id: assignedCreatorId,
        deliverable_type: deliverableType,
        is_collaboration: isCollab,
        requires_live_link: requiresLiveLink,
        format_category: isCollab ? 'collaboration' : 'ugc_video',
        creator_payout: brief.budget || 50000,
        agreed_amount: brief.budget || 50000,
        status: 'ACCEPTED',
        in_house_assigned: true,
        agreement_signed_creator: true,
        revision_count: 5,
        revisions_used: 0,
        created_at: nowIso,
        accepted_at: nowIso,
        accepted_by_creator_id: viewer?.user_id || assignedCreatorId,
        accepted_by_creator_name: creatorName
      };

      if (supabase) {
        try {
          const supaPayload = {
            id: newOrderId,
            brief_id: brief.id,
            brand_id: brief.brand_id,
            creator_id: assignedCreatorId,
            creator_payout: brief.budget || 50000,
            agreed_amount: brief.budget || 50000,
            status: 'ACCEPTED',
            agreement_signed_creator: true,
            revision_count: 5,
            revisions_used: 0,
            created_at: nowIso
          };
          await (privilegedSupabase || supabase).from('ugc_orders').insert(supaPayload);
          await (privilegedSupabase || supabase).from('ugc_briefs').update({
            claimed_count: (brief.claimed_count || 0) + 1,
            status: 'CLAIMED'
          }).eq('id', brief.id);
        } catch (e) {
          console.warn("[POST /ugc-orders/:orderId/accept] Supabase insert error:", e);
        }
      }

      if (!db.ugc_orders) db.ugc_orders = [];
      db.ugc_orders.unshift(newOrder);

      const localBrief = (db.ugc_briefs || []).find((b: any) => b.id === brief.id);
      if (localBrief) {
        localBrief.claimed_count = (localBrief.claimed_count || 0) + 1;
        localBrief.status = 'CLAIMED';
      }
      saveDb(db);
      order = newOrder;
    }

    return res.json({
      ok: true,
      success: true,
      order_id: order?.id || orderId,
      brief_id: brief?.id || order?.brief_id || orderId,
      status: 'ACCEPTED',
      in_house_assigned: true,
      order,
      message: "Order claimed/accepted for in-house handling"
    });
  });


  router.post("/ugc-orders/:orderId/submit", async (req, res) => {
    const viewer = await parseAuthUser(req);
    const { orderId } = req.params;
    const { video_url, videoUrl, notes } = req.body || {};
    const url = (video_url || videoUrl || "").toString().trim();

    if (!url) {
      return res.status(400).json({ error: "video_url is required" });
    }

    const nowIso = getIsoNow();
    const db = getDb();
    let order: any = (db.ugc_orders || []).find((o: any) => o.id === orderId || o.brief_id === orderId);
    let brief: any = (db.ugc_briefs || []).find((b: any) => b.id === orderId || (order && b.id === order.brief_id));

    if (supabase) {
      try {
        if (!order) {
          const { data: supaOrder } = await (privilegedSupabase || supabase)
            .from('ugc_orders')
            .select('*')
            .or(`id.eq.${orderId},brief_id.eq.${orderId}`)
            .maybeSingle();
          if (supaOrder) order = supaOrder;
        }
        if (!brief) {
          const targetBriefId = order?.brief_id || orderId;
          const { data: supaBrief } = await (privilegedSupabase || supabase)
            .from('ugc_briefs')
            .select('*')
            .eq('id', targetBriefId)
            .maybeSingle();
          if (supaBrief) brief = supaBrief;
        }
      } catch (e) {
        console.warn("[POST /ugc-orders/:orderId/submit] Supabase lookup error:", e);
      }
    }

    if (!order && !brief) {
      // In-house ops convention: create order record if neither order nor brief exists
      const newOrderId = orderId.startsWith('ugcord_') ? orderId : 'ugcord_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 7);
      const assignedCreatorId = (viewer?.user_id && viewer.user_id !== 'dev-user-id-12345')
        ? viewer.user_id
        : '8ebacafb-aa65-4b4b-a046-1e1bea9cc3dc';
      const newOrder: any = {
        id: newOrderId,
        brief_id: orderId,
        brand_id: 'dev-user-id-12345',
        creator_id: assignedCreatorId,
        creator_payout: 50000,
        agreed_amount: 50000,
        video_url: url,
        status: 'SUBMITTED',
        in_house_assigned: true,
        delivered_at: nowIso,
        created_at: nowIso,
        creator_notes: notes || "Deliverable submitted"
      };
      if (!db.ugc_orders) db.ugc_orders = [];
      db.ugc_orders.unshift(newOrder);
      saveDb(db);
      order = newOrder;
    }

    if (order) {
      if (supabase) {
        try {
          await (privilegedSupabase || supabase).from('ugc_orders').update({
            video_url: url,
            status: 'SUBMITTED',
            delivered_at: nowIso,
            creator_notes: notes || order.creator_notes || "Deliverable submitted"
          }).eq('id', order.id);
        } catch (e) {
          console.warn("[POST /ugc-orders/:orderId/submit] Supabase update error:", e);
        }
      }

      order.video_url = url;
      order.status = 'SUBMITTED';
      order.delivered_at = nowIso;
      order.creator_notes = notes || order.creator_notes || "Deliverable submitted";

      if (!db.ugc_orders) db.ugc_orders = [];
      const locIdx = db.ugc_orders.findIndex((o: any) => o.id === order.id || o.brief_id === order.brief_id);
      if (locIdx >= 0) {
        db.ugc_orders[locIdx] = { ...db.ugc_orders[locIdx], ...order };
      } else {
        db.ugc_orders.unshift(order);
      }
      saveDb(db);
    } else if (brief) {
      const newOrderId = 'ugcord_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 7);
      const assignedCreatorId = (viewer?.user_id && viewer.user_id !== brief.brand_id)
        ? viewer.user_id
        : '8ebacafb-aa65-4b4b-a046-1e1bea9cc3dc';

      const newOrder: any = {
        id: newOrderId,
        brief_id: brief.id,
        brand_id: brief.brand_id,
        creator_id: assignedCreatorId,
        creator_payout: brief.budget || 50000,
        agreed_amount: brief.budget || 50000,
        video_url: url,
        status: 'SUBMITTED',
        in_house_assigned: true,
        delivered_at: nowIso,
        created_at: nowIso,
        creator_notes: notes || "Deliverable submitted"
      };

      if (supabase) {
        try {
          const supaPayload = {
            id: newOrderId,
            brief_id: brief.id,
            brand_id: brief.brand_id,
            creator_id: assignedCreatorId,
            creator_payout: brief.budget || 50000,
            agreed_amount: brief.budget || 50000,
            video_url: url,
            status: 'SUBMITTED',
            delivered_at: nowIso,
            created_at: nowIso
          };
          await (privilegedSupabase || supabase).from('ugc_orders').insert(supaPayload);
        } catch (e) {
          console.warn("[POST /ugc-orders/:orderId/submit] Supabase insert error:", e);
        }
      }

      if (!db.ugc_orders) db.ugc_orders = [];
      db.ugc_orders.unshift(newOrder);
      saveDb(db);
      order = newOrder;
    }

    return res.json({
      ok: true,
      success: true,
      order_id: order?.id || orderId,
      brief_id: brief?.id || order?.brief_id || orderId,
      status: 'SUBMITTED',
      video_url: url,
      order,
      message: "Deliverable video submitted successfully"
    });
  });

}
