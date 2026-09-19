import express from "express";
import crypto from "crypto";
import { inspectContactLeakage } from "./helpers";

// Core chat/messaging routes: listing a user's threads, fetching a single
// thread, fetching/sending messages, and admin chat-moderation endpoints.
//
// NOTE: this deliberately covers only the "generic chat infrastructure"
// routes. UGC-order-specific and Campaign-Deal-specific chat ACTIONS (sign,
// negotiate, approve, submit-live-link, etc.) still live in server.ts for
// now, because they're tightly coupled to large UGC/Deals lifecycle
// handler functions (syncUgcLifecycleEvent and friends) that would need
// their own careful, separate extraction pass — moving them together with
// this file risked a much larger, riskier change. This split is
// intentionally incremental.
export function setupChatCoreRoutes(
  app: express.Application,
  router: express.Router,
  {
    supabase,
    privilegedSupabase,
    getDb,
    saveDb,
    parseAuthUser,
    ensureUGCChatThread,
    populateThreadData,
    insertChatMessageToSupabase,
  }: {
    supabase: any;
    privilegedSupabase: any;
    getDb: () => any;
    saveDb: (db: any) => void;
    parseAuthUser: (req: express.Request) => Promise<any>;
    ensureUGCChatThread: (order: any, brief: any, user: any, io: any) => Promise<any>;
    populateThreadData: (threads: any[], userId: string) => Promise<any[]>;
    insertChatMessageToSupabase: (payload: any) => Promise<any>;
  }
) {

  router.get("/chat/v2/threads", async (req, res) => {
    const user = await parseAuthUser(req);
    if (!user) return res.status(403).json({ detail: "Not authenticated", _status: 403 });

    // 1. Auto-heal: Ensure all UGC orders for this user have a thread
    try {
      let userOrders: any[] = [];
      if (supabase) {
        const { data: ords } = await (privilegedSupabase || supabase).from('ugc_orders')
          .select('*')
          .or(`creator_id.eq.${user.user_id},brand_id.eq.${user.user_id}`);
        if (ords) userOrders = ords;
      }
      const db = getDb();
      const localOrds = (db.ugc_orders || []).filter((o: any) => o.creator_id === user.user_id || o.brand_id === user.user_id);
      const combinedOrders = [...userOrders];
      localOrds.forEach((lo: any) => {
        if (!combinedOrders.some(o => o.id === lo.id)) combinedOrders.push(lo);
      });

      for (const ord of combinedOrders) {
        await ensureUGCChatThread(ord, null, user, req.app.get("io"));
      }
    } catch (e) {
      console.error("[GET /chat/v2/threads] Auto-heal UGC orders error:", e);
    }

    // 2. Fetch user's threads from Supabase & Local DB
    let threads: any[] = [];
    if (supabase) {
      try {
        const { data: dbThreads } = await (privilegedSupabase || supabase).from('chat_threads')
          .select('*')
          .or(`creator_id.eq.${user.user_id},brand_id.eq.${user.user_id}`)
          .order('updated_at', { ascending: false });
        if (dbThreads) threads = dbThreads;
      } catch (e) {
        console.error("[GET /chat/v2/threads] Supabase fetch error:", e);
      }
    }
    const db = getDb();
    const localThreads = (db.chat_threads || []).filter((t: any) => t.creator_id === user.user_id || t.brand_id === user.user_id);
    threads = threads.map(st => {
      const lt = localThreads.find((l: any) => l.id === st.id || (st.deal_id && st.deal_id === l.deal_id));
      if (lt) {
        const stUpdated = new Date(st.updated_at || st.created_at || 0).getTime();
        const ltUpdated = new Date(lt.updated_at || lt.created_at || 0).getTime();
        if (ltUpdated > stUpdated) {
          return { ...st, ...lt, flow_state: lt.flow_state || st.flow_state || st.status, status: lt.status || st.status };
        } else {
          return { ...lt, ...st, flow_state: st.flow_state || lt.flow_state || st.status, status: st.status || lt.status };
        }
      }
      return st;
    });
    localThreads.forEach((lt: any) => {
      if (!threads.some(t => t.id === lt.id || (t.deal_id && t.deal_id === lt.deal_id))) {
        threads.push(lt);
      }
    });

    // If dedicated test thread exists, ensure it is available for easy manual browser testing
    const dedicatedTestThread = (db.chat_threads || []).find((t: any) => t.id === 'thread_test_live_link_flow_v2');
    if (dedicatedTestThread && !threads.some(t => t.id === 'thread_test_live_link_flow_v2')) {
      threads.unshift(dedicatedTestThread);
    }

    // 3. Populate full thread metadata
    const populated = await populateThreadData(threads, user.user_id);
    return res.json(populated);
  });


  router.get("/chat/v2/threads/:threadId", async (req, res) => {
    const user = await parseAuthUser(req);
    if (!user) return res.status(403).json({ detail: "Not authenticated", _status: 403 });
    const { threadId } = req.params;

    // Check if this threadId is a UGC order or deal ID and ensure thread
    if (threadId.startsWith('ugcord_')) {
      let ord: any = null;
      if (supabase) {
        const { data } = await (privilegedSupabase || supabase).from('ugc_orders').select('*').eq('id', threadId).maybeSingle();
        if (data) ord = data;
      }
      if (!ord) {
        const db = getDb();
        ord = (db.ugc_orders || []).find((o: any) => o.id === threadId);
      }
      if (ord) {
        await ensureUGCChatThread(ord, null, user, req.app.get("io"));
      }
    }

    let thread: any = null;
    if (supabase) {
      try {
        const { data } = await (privilegedSupabase || supabase).from('chat_threads')
          .select('*')
          .or(`id.eq.${threadId},deal_id.eq.${threadId}`)
          .maybeSingle();
        if (data) thread = data;
      } catch (e) {}
    }
    const db = getDb();
    const localT = (db.chat_threads || []).find((t: any) => t.id === threadId || t.deal_id === threadId);
    if (!thread && localT) {
      thread = localT;
    } else if (thread) {
      // Trust Supabase data, but map agreed_amount back to counter_amount if negotiating
      if (thread.flow_state === 'NEGOTIATING_COUNTER' && thread.agreed_amount && !thread.counter_amount) {
        thread.counter_amount = thread.agreed_amount;
      }
    }
    
    if (!thread) return res.status(404).json({ error: "Thread not found" });

    const [populated] = await populateThreadData([thread], user.user_id);
    return res.json(populated);
  });


  router.get("/chat/v2/threads/:threadId/messages", async (req, res) => {
    const user = await parseAuthUser(req);
    if (!user) return res.status(403).json({ detail: "Not authenticated", _status: 403 });
    const { threadId } = req.params;

    let targetThreadId = threadId;
    let thrRecord: any = null;
    if (supabase) {
      try {
        const { data: thr } = await (privilegedSupabase || supabase).from('chat_threads')
          .select('id, creator_id, brand_id')
          .or(`id.eq.${threadId},deal_id.eq.${threadId}`)
          .maybeSingle();
        if (thr) {
          targetThreadId = thr.id;
          thrRecord = thr;
        }
      } catch (e) {}
    }
    const db = getDb();
    if (!thrRecord) {
      thrRecord = (db.chat_threads || []).find((t: any) => t.id === targetThreadId || t.id === threadId || t.deal_id === threadId);
    }

    let messages: any[] = [];
    if (supabase) {
      try {
        const { data: mData } = await (privilegedSupabase || supabase).from('chat_messages')
          .select('*')
          .or(`thread_id.eq.${targetThreadId},thread_id.eq.${threadId}`)
          .order('created_at', { ascending: true });
        if (mData) messages = mData;
      } catch (e) {}
    }
    const localMsgs = (db.chat_messages || []).filter((m: any) => m.thread_id === targetThreadId || m.thread_id === threadId);
    localMsgs.forEach((lm: any) => {
      const mid = lm.message_id || lm.id;
      const lContent = (lm.content || lm.text || "").trim();
      const alreadyExists = messages.some(m => {
        const mId = m.message_id || m.id;
        if (mId && mid && mId === mid) return true;
        const mContent = (m.content || m.text || "").trim();
        if (mContent && lContent && mContent === lContent) {
          return true;
        }
        return false;
      });
      if (!alreadyExists) {
        messages.push(lm);
      }
    });

    // Mark as read if user is receiver
    if (supabase && messages.length > 0) {
      try {
        await (privilegedSupabase || supabase).from('chat_messages')
          .update({ read: true })
          .eq('thread_id', targetThreadId)
          .eq('receiver_user_id', user.user_id)
          .eq('read', false);
      } catch (e) {}
    }

    return res.json(messages.map(m => {
      const mid = m.message_id || m.id;
      const localMatch = localMsgs.find((lm: any) => (lm.message_id || lm.id) === mid);
      let meta = m.metadata || localMatch?.metadata || {};
      let mType = m.message_type || localMatch?.message_type;
      let mUrl = m.media_url || m.content_url || meta.content_url || 
        meta.video_url || meta.media_url || 
        localMatch?.media_url || localMatch?.content_url;
      const txt = m.text || m.content || "";

      if (!mType || mType === "system") {
        if (txt.includes("Deliverables Approved & Payment Released") || txt.includes("Payment Released & Approved") || txt.includes("payout is being processed via Escrow")) {
          mType = "live_links_approved";
        } else if (txt.includes("Live Post Link Submitted") || txt.includes("Live link submitted")) {
          mType = "live_links_submitted";
        } else if (txt.includes("Creator has signed the partnership agreement")) {
          mType = "creator_signed";
        } else if (txt.includes("Brand has signed the partnership agreement")) {
          mType = "brand_signed";
        } else if (txt.includes("Agreement Executed! Both parties have signed") || txt.includes("Agreement Executed")) {
          mType = "agreement_executed";
        } else if (txt.includes("Payment Secured!") || txt.includes("Payment Secured") || txt.includes("Escrow Payment Secured") || txt.includes("held safely in escrow")) {
          mType = "payment_secured";
          if (!meta.action) {
            meta = { ...meta, action: 'payment_secured' };
          }
        } else if (txt.includes("Brand requested a revision") || txt.includes("Revision feedback:") || txt.includes("CHANGES_REQUESTED")) {
          mType = "revision_requested";
          if (!meta.feedback && txt.includes("revision: ")) {
            const fb = txt.split("revision: ")[1]?.trim();
            meta = {
              ...meta,
              feedback: fb,
              notes: fb,
              revision_notes: fb,
              action: 'revision_requested'
            };
          }
        } else if (txt.includes("UGC Deliverable Draft Submitted") || txt.includes("Deliverable URL:")) {
          mType = "content_proof_submitted";
          if (!mUrl && txt.includes("Deliverable URL: ")) {
            mUrl = txt.split("Deliverable URL: ")[1]?.split("\n")[0]?.trim();
          }
        } else if (txt.includes("Creator declined revision") || txt.includes("declined the revision") || txt.includes("Declined Revision Request")) {
          mType = "revision_declined";
        } else if (txt.includes("UGC Deliverable Approved") || txt.includes("Deliverable Approved") || txt.includes("Content Approved") || txt.includes("Content Draft Approved")) {
          mType = "content_approved";
        } else if (txt.includes("UGC Order Cancelled") || txt.includes("Order Cancelled")) {
          mType = "order_cancelled";
        }
      }

      let senderUid = m.sender_user_id || m.sender_id || meta.sender_id;
      const sRole = m.sender_role || meta.sender_role || (
        mType === 'live_links_submitted' || mType === 'content_proof_submitted' || mType === 'creator_signed' || mType === 'live_links_resubmit_declined'
          ? 'creator'
          : (mType === 'live_links_approved' || mType === 'live_links_resubmit_request' || mType === 'revision_requested' || mType === 'brand_signed'
            ? 'brand'
            : (thrRecord ? (String(thrRecord.creator_id) === String(senderUid) ? 'creator' : (String(thrRecord.brand_id) === String(senderUid) ? 'brand' : undefined)) : undefined))
      );

      if (!senderUid && sRole === 'creator' && thrRecord?.creator_id) {
        senderUid = thrRecord.creator_id;
      } else if (!senderUid && sRole === 'brand' && thrRecord?.brand_id) {
        senderUid = thrRecord.brand_id;
      }

      if (mUrl) {
        if (!meta.content_url) meta.content_url = mUrl;
        if (!meta.video_url) meta.video_url = mUrl;
      }

      return {
        ...m,
        id: mid,
        message_id: mid,
        sender_id: senderUid,
        receiver_id: m.receiver_user_id || m.receiver_id,
        sender_user_id: senderUid,
        receiver_user_id: m.receiver_user_id || m.receiver_id,
        sender_role: sRole,
        message_type: mType,
        metadata: meta,
        media_url: mUrl,
        content_url: mUrl,
        video_url: mUrl,
        content: txt,
        text: txt
      };
    }));
  });


  router.post("/chat/v2/threads/:threadId/messages", async (req, res) => {
    const user = await parseAuthUser(req);
    if (!user) return res.status(403).json({ detail: "Not authenticated", _status: 403 });
    const { threadId } = req.params;
    const { content, text, message_type } = req.body;
    const msgText = (content || text || "").trim();
    if (!msgText) return res.status(400).json({ error: "Message content cannot be empty" });
    // threadId + sender are what let the filter reassemble a number split across several
    // messages; without them only single-message detection works.
    if (message_type !== 'system') {
      const leak = inspectContactLeakage(msgText, { threadId, senderId: user.user_id });
      if (leak.blocked) {
        return res.status(400).json({
          blocked: true,
          error: leak.message || "Contact details cannot be shared in chat. Please keep all communications on-platform.",
          code: leak.code || "CONTACT_INFO_BLOCKED"
        });
      }
    }

    // 1. Find thread in Supabase or local DB
    let thread: any = null;
    if (supabase) {
      try {
        const { data } = await (privilegedSupabase || supabase).from('chat_threads')
          .select('*')
          .or(`id.eq.${threadId},deal_id.eq.${threadId}`)
          .maybeSingle();
        if (data) thread = data;
      } catch (e) {}
    }
    if (!thread) {
      const db = getDb();
      thread = (db.chat_threads || []).find((t: any) => t.id === threadId || t.deal_id === threadId);
    }

    // If still not found and looks like a UGC order, auto-heal thread creation
    if (!thread && threadId.startsWith('ugcord_')) {
      let ord: any = null;
      if (supabase) {
        const { data } = await (privilegedSupabase || supabase).from('ugc_orders').select('*').eq('id', threadId).maybeSingle();
        if (data) ord = data;
      }
      if (!ord) {
        const db = getDb();
        ord = (db.ugc_orders || []).find((o: any) => o.id === threadId);
      }
      if (ord) {
        thread = await ensureUGCChatThread(ord, null, user, req.app.get("io"));
      }
    }

    if (!thread) return res.status(404).json({ error: "Thread not found" });

    const receiverId = thread.creator_id === user.user_id ? thread.brand_id : thread.creator_id;
    const nowIso = new Date().toISOString();
    const msgId = crypto.randomUUID();
    const senderRole = thread && (String(thread.creator_id) === String(user.user_id)) ? 'creator' : 'brand';

    // 2. Insert into Supabase chat_messages (matching exact table schema)
    const dbMsg = {
      message_id: msgId,
      thread_id: thread.id,
      sender_user_id: user.user_id,
      receiver_user_id: receiverId,
      sender_role: senderRole,
      text: msgText,
      from_name: user.name,
      message_type: message_type || 'text',
      created_at: nowIso,
      read: false
    };

    if (supabase) {
      try {
        await insertChatMessageToSupabase(dbMsg);

        // Update updated_at on thread
        await (privilegedSupabase || supabase).from('chat_threads').update({ 
          updated_at: nowIso 
        }).eq('id', thread.id);
      } catch (err) {
        console.warn("[POST /chat/v2/threads/:threadId/messages] Supabase notice:", err);
      }
    }

    // 3. Update local DB
    const db = getDb();
    if (!db.chat_messages) db.chat_messages = [];
    const localMsg = {
      ...dbMsg,
      id: msgId,
      sender_id: user.user_id,
      sender_user_id: user.user_id,
      receiver_id: receiverId,
      receiver_user_id: receiverId,
      sender_role: senderRole,
      content: msgText,
      message_type: message_type || 'text'
    };
    db.chat_messages.push(localMsg);
    const localThr = (db.chat_threads || []).find((t: any) => t.id === thread.id || t.deal_id === thread.id);
    if (localThr) {
      localThr.updated_at = nowIso;
      localThr.last_message = localMsg;
    }
    saveDb(db);

    // 4. Socket notifications
    const io = req.app.get("io");
    if (io) {
      io.to(thread.id).emit("new_message", localMsg);
      io.to(threadId).emit("new_message", localMsg);
      io.emit("thread_updated", { threadId: thread.id, last_message: localMsg });
    }

    return res.json(localMsg);
  });


  router.get("/admin/chat/all", async (req, res) => {
    const admin = await parseAuthUser(req);
    if (!admin || (admin.role !== "admin" && admin.role !== "sub_admin")) return res.status(403).json({ detail: "Admin only" });
    const db = getDb();
    res.json(db.chat_threads || []);
  });


  router.get("/admin/chat/flagged", async (req, res) => {
    const admin = await parseAuthUser(req);
    if (!admin || (admin.role !== "admin" && admin.role !== "sub_admin")) return res.status(403).json({ detail: "Admin only" });
    const db = getDb();
    res.json(db.message_flags || []);
  });


  router.get("/admin/chat_guard_violations", async (req, res) => {
    const admin = await parseAuthUser(req);
    if (!admin || (admin.role !== "admin" && admin.role !== "sub_admin")) return res.status(403).json({ detail: "Admin only" });
    const db = getDb();
    res.json(db.blocked_message_attempts || []);
  });


  router.get("/admin/chat_violations", async (req, res) => {
    const admin = await parseAuthUser(req);
    if (!admin || (admin.role !== "admin" && admin.role !== "sub_admin")) return res.status(403).json({ detail: "Admin only" });
    const db = getDb();
    res.json(db.chat_violations || []);
  });


  router.post("/admin/chat/flagged/:id/resolve", async (req, res) => {
    const admin = await parseAuthUser(req);
    if (!admin || (admin.role !== "admin" && admin.role !== "sub_admin")) return res.status(403).json({ detail: "Admin only" });
    const db = getDb();
    const flag = (db.message_flags || []).find((f: any) => f.id === req.params.id);
    if (flag) {
      flag.status = req.body.action;
      saveDb(db);
    }
    res.json({ success: true });
  });


  router.post("/admin/chat_violations/:id/resolve", async (req, res) => {
    const admin = await parseAuthUser(req);
    if (!admin || (admin.role !== "admin" && admin.role !== "sub_admin")) return res.status(403).json({ detail: "Admin only" });
    const db = getDb();
    const v = (db.chat_violations || []).find((x: any) => x.id === req.params.id);
    if (v) {
      v.status = req.body.action === 'mark_safe' || req.body.action === 'unrestrict' ? 'RESOLVED_SAFE' : req.body.action;
      saveDb(db);
    }
    res.json({ success: true });
  });


  router.post([
    // The frontend posts reviews on the split namespaces; only the legacy path existed.
    "/ugc/threads/:threadId/submit-review",
    "/campaign/threads/:threadId/submit-review",
    "/chat/v2/threads/:threadId/submit-review"
  ], async (req, res) => {
    const user = await parseAuthUser(req);
    if (!user) return res.status(403).json({ error: "Unauthorized" });
    const { threadId } = req.params;
    const { rating, communication_rating, timeliness_rating, quality_rating, comment } = req.body;

    try {
      if (supabase) {
        // Find the thread
        const { data: thread } = await supabase.from('chat_threads').select('*').eq('id', threadId).single();
        
        let targetId = null;
        if (thread) {
          if ((user.user_id || user.id) === thread.creator_id) targetId = thread.brand_id;
          else if ((user.user_id || user.id) === thread.brand_id) targetId = thread.creator_id;
        }

        const reviewData = {
          reviewer_id: user.user_id || user.id,
          target_id: targetId,
          thread_id: threadId,
          deal_id: thread?.deal_id,
          ugc_order_id: thread?.ugc_order_id,
          rating,
          communication_rating,
          timeliness_rating,
          quality_rating,
          comment,
          created_at: new Date().toISOString()
        };
        await supabase.from('reviews').insert(reviewData).select();
        
        // Also update the thread to mark review as submitted if needed
      }

      res.json({ success: true });
    } catch (e) {
      console.error("[POST /chat/v2/threads/:threadId/submit-review] Error:", e);
      res.status(500).json({ error: "Failed to submit review" });
    }
  });
}
