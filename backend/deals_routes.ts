import express from "express";
import crypto from "crypto";

// Remaining Campaign Deal routes: fetching a single deal, the dual-
// signature /sign route, the initial content draft submission
// (submit-draft), and adding a live collab/post-performance record
// (add-collab). Plus one thin wrapper: /deals/:id/proof/verify, which
// just forwards to handleThreadApproveLiveLinks (the real approve-and-
// pay logic, which still lives in server.ts alongside the rest of the
// Deal-negotiation chat actions in deals_chat_routes.ts).
export function setupDealsRoutes(
  app: express.Application,
  router: express.Router,
  {
    supabase,
    privilegedSupabase,
    getDb,
    saveDb,
    parseAuthUser,
    insertChatMessageToSupabase,
    handleThreadApproveLiveLinks,
  }: {
    supabase: any;
    privilegedSupabase: any;
    getDb: () => any;
    saveDb: (db: any) => void;
    parseAuthUser: (req: express.Request) => Promise<any>;
    insertChatMessageToSupabase: (payload: any) => Promise<any>;
    handleThreadApproveLiveLinks: (req: express.Request, res: express.Response) => any;
  }
) {
  const getIsoNow = () => new Date().toISOString();

  router.get("/deals/:id", async (req, res) => {
    const user = await parseAuthUser(req);
    if (!user) return res.status(403).json({ detail: "Not authenticated", _status: 403 });
    const { id } = req.params;

    let deal: any = null;
    let submissions: any[] = [];

    if (supabase) {
      try {
        const { data: dData } = await supabase
          .from('deals')
          .select('*')
          .eq('id', id)
          .maybeSingle();
        if (dData) deal = dData;

        if (!deal) {
          const { data: cData } = await supabase
            .from('collabs')
            .select('*')
            .eq('collab_id', id)
            .maybeSingle();
          if (cData) deal = cData;
        }
      } catch (e) {
        console.error("Error fetching deal from Supabase:", e);
      }
    }

    if (!deal) {
      const db = getDb();
      deal = (db.deals && db.deals.find((d: any) => d.id === id || d.deal_id === id)) ||
             (db.collabs && db.collabs.find((c: any) => c.collab_id === id || c.id === id));
    }

    if (!deal) {
      return res.status(404).json({ error: "Deal not found" });
    }

    const creatorId = deal.creator_id || deal.to_user_id;
    const brandId = deal.brand_id || deal.from_user_id;

    if (user.role !== 'admin' && user.user_id !== creatorId && user.user_id !== brandId) {
      return res.status(403).json({ error: "Unauthorized access to deal" });
    }

    // Note: No foreign key exists between deals and content_submissions in postgres,
    // so we fetch submissions in a separate query instead of embedded join.
    if (supabase) {
      try {
        const { data: subs } = await supabase
          .from('content_submissions')
          .select('*')
          .eq('deal_id', id)
          .order('submitted_at', { ascending: false });
        if (subs && subs.length > 0) submissions = subs;
      } catch (e) {
        console.error("Error fetching content_submissions from Supabase:", e);
      }
    }

    if (submissions.length === 0) {
      const db = getDb();
      submissions = (db.content_submissions || []).filter((s: any) => s.deal_id === id);
    }

    const latestSub = submissions[0] || null;

    // Calculate stage based on signatures and latest submission
    let stage = "SIGNING";
    const brandSigned = Boolean(deal.agreement_signed_brand);
    const creatorSigned = Boolean(deal.agreement_signed_creator);

    if (!brandSigned || !creatorSigned) {
      stage = "SIGNING";
    } else if (deal.status === 'COMPLETED' || deal.stage === 'COMPLETED') {
      stage = "COMPLETED";
    } else if (deal.status === 'PROOF_SUBMITTED' || deal.stage === 'PROOF_SUBMITTED' || deal.proof_url || deal.instagram_post_url) {
      stage = "PROOF_SUBMITTED";
    } else if (latestSub && (latestSub.status === 'APPROVED' || deal.status === 'CONTENT_APPROVED')) {
      stage = "CONTENT_APPROVED";
    } else if (latestSub && latestSub.status === 'PENDING_REVIEW') {
      stage = "CONTENT_SUBMITTED";
    } else {
      stage = deal.stage || "ACTIVE";
    }

    const formattedDeal = {
      ...deal,
      id: deal.id || deal.collab_id,
      collab_id: deal.collab_id || deal.id,
      creator_id: creatorId,
      to_user_id: creatorId,
      brand_id: brandId,
      from_user_id: brandId,
      deliverable: deal.deliverables ? (typeof deal.deliverables === 'string' ? deal.deliverables : JSON.stringify(deal.deliverables)) : (deal.deliverable || "Campaign Deliverables"),
      proposed_amount: deal.agreed_amount || deal.proposed_amount || deal.rate || deal.payout || 0,
      agreement_signed_brand: brandSigned,
      agreement_signed_creator: creatorSigned,
      agreement_signed_at: deal.agreement_signed_at,
      stage,
      status: deal.status || 'NEGOTIATING',
      feedback: latestSub?.brand_feedback || deal.feedback || deal.revision_notes || null,
      submission: latestSub ? {
        id: latestSub.id,
        video_url: latestSub.video_url,
        caption: latestSub.caption,
        notes: latestSub.notes_to_brand || latestSub.notes || "",
        status: latestSub.status,
        brand_feedback: latestSub.brand_feedback
      } : null,
      content_submissions: submissions.map((s: any) => ({
        ...s,
        notes: s.notes_to_brand || s.notes || ""
      }))
    };

    return res.json(formattedDeal);
  });


  router.post("/deals/:id/sign", async (req, res) => {
    const user = await parseAuthUser(req);
    if (!user) return res.status(403).json({ detail: "Not authenticated", _status: 403 });
    const { id } = req.params;

    let deal: any = null;
    let isCollabTable = false;

    if (supabase) {
      try {
        const { data: dData } = await supabase.from('deals').select('*').eq('id', id).maybeSingle();
        if (dData) deal = dData;
        if (!deal) {
          const { data: cData } = await supabase.from('collabs').select('*').eq('collab_id', id).maybeSingle();
          if (cData) {
            deal = cData;
            isCollabTable = true;
          }
        }
      } catch (e) {}
    }

    const db = getDb();
    if (!deal) {
      deal = (db.deals && db.deals.find((d: any) => d.id === id || d.deal_id === id)) ||
             (db.collabs && db.collabs.find((c: any) => c.collab_id === id || c.id === id));
      if (deal && !db.deals?.find((d: any) => d.id === id)) isCollabTable = true;
    }

    if (!deal) return res.status(404).json({ error: "Deal not found" });

    const creatorId = deal.creator_id || deal.to_user_id;
    const brandId = deal.brand_id || deal.from_user_id;
    const isCreator = user.user_id === creatorId || user.role === 'creator';
    const isBrand = user.user_id === brandId || user.role === 'brand';

    if (!isCreator && !isBrand && user.role !== 'admin') {
      return res.status(403).json({ error: "Unauthorized to sign this deal" });
    }

    if (isCreator) deal.agreement_signed_creator = true;
    if (isBrand) deal.agreement_signed_brand = true;

    if (deal.agreement_signed_creator && deal.agreement_signed_brand) {
      deal.agreement_signed_at = new Date().toISOString();
      deal.status = 'ACTIVE';
      deal.stage = 'ACTIVE';
    }

    if (supabase) {
      try {
        if (!isCollabTable) {
          await (privilegedSupabase || supabase)
            .from('deals')
            .update({
              agreement_signed_creator: deal.agreement_signed_creator,
              agreement_signed_brand: deal.agreement_signed_brand,
              agreement_signed_at: deal.agreement_signed_at,
              status: deal.status,
              updated_at: new Date().toISOString()
            })
            .eq('id', id);
        } else {
          await (privilegedSupabase || supabase)
            .from('collabs')
            .update({
              status: deal.status
            })
            .eq('collab_id', id);
        }
      } catch (e) {
        console.error("Error updating deal sign in Supabase:", e);
      }
    }

    // Also update mock db
    if (db.deals) {
      const idx = db.deals.findIndex((d: any) => d.id === id || d.deal_id === id);
      if (idx !== -1) db.deals[idx] = { ...db.deals[idx], ...deal };
    }
    if (db.collabs) {
      const cIdx = db.collabs.findIndex((c: any) => c.collab_id === id || c.id === id);
      if (cIdx !== -1) db.collabs[cIdx] = { ...db.collabs[cIdx], ...deal };
    }
    saveDb(db);

    return res.json({ success: true, deal });
  });


  router.post("/deals/:id/submit-draft", async (req, res) => {
    const io = req.app.get("io");
    const user = await parseAuthUser(req);
    if (!user) return res.status(403).json({ detail: "Not authenticated", _status: 403 });
    const { id } = req.params;
    const { video_url, caption, notes } = req.body;

    if (!video_url) {
      return res.status(400).json({ error: "video_url is required" });
    }

    const subId = crypto.randomUUID();
    const now = new Date().toISOString();

    // Actual columns in content_submissions: id, deal_id, creator_id, submission_type, video_url, caption, notes_to_brand, status, submitted_at
    const submissionRecord = {
      id: subId,
      deal_id: id,
      creator_id: user.user_id,
      submission_type: 'draft',
      video_url,
      caption: caption || "",
      notes_to_brand: notes || req.body.notes_to_brand || "",
      status: 'PENDING_REVIEW',
      submitted_at: now
    };

    if (supabase) {
      try {
        await (privilegedSupabase || supabase).from('content_submissions').insert(submissionRecord);
        await (privilegedSupabase || supabase)
          .from('deals')
          .update({
            status: 'CONTENT_SUBMITTED',
            updated_at: now
          })
          .eq('id', id);
      } catch (e) {
        console.error("Error submitting draft to Supabase:", e);
      }
    }

    let dealRecord: any = null;
    let threadRecord: any = null;
    if (supabase) {
      try {
        const { data: dData } = await (privilegedSupabase || supabase)
          .from('deals')
          .select('*')
          .eq('id', id)
          .maybeSingle();
        if (dData) dealRecord = dData;

        const { data: thrData } = await (privilegedSupabase || supabase)
          .from('chat_threads')
          .select('*')
          .or(`deal_id.eq.${id},id.eq.${id},id.eq.thread_camp_${id},id.eq.thread_ugc_${id},id.eq.thread_${id}`)
          .limit(1)
          .maybeSingle();
        if (thrData) threadRecord = thrData;
      } catch (e) {
        console.warn("[deals/submit-draft] Error fetching deal/thread:", e);
      }
    }

    const db = getDb();
    if (!db.content_submissions) db.content_submissions = [];
    db.content_submissions.push(submissionRecord);

    if (db.deals) {
      const idx = db.deals.findIndex((d: any) => d.id === id || d.deal_id === id);
      if (idx !== -1) {
        db.deals[idx].status = 'CONTENT_SUBMITTED';
        db.deals[idx].stage = 'CONTENT_SUBMITTED';
      }
    }
    if (db.collabs) {
      const cIdx = db.collabs.findIndex((c: any) => c.collab_id === id || c.id === id);
      if (cIdx !== -1) {
        db.collabs[cIdx].status = 'CONTENT_SUBMITTED';
        db.collabs[cIdx].stage = 'CONTENT_SUBMITTED';
      }
    }

    const localDeal = (db.deals || []).find((d: any) => d.id === id || d.deal_id === id) ||
      (db.collabs || []).find((c: any) => c.id === id || c.collab_id === id);
    const localThread = (db.chat_threads || []).find((t: any) =>
      t.deal_id === id || t.id === id || t.id === `thread_camp_${id}` || t.id === `thread_ugc_${id}` || t.id === `thread_${id}`
    );

    const brandUserId = threadRecord?.brand_id || dealRecord?.brand_id || localThread?.brand_id || localDeal?.brand_id || localDeal?.brand_user_id || "";
    const targetThreadId = threadRecord?.id || localThread?.id || `thread_camp_${id}`;
    const cleanNotes = (notes || req.body.notes_to_brand || "").trim();
    const actorName = user.name || user.full_name || "Creator";

    // Create content_proof_submitted chat message
    const msgId = crypto.randomUUID();
    const msgType = 'content_proof_submitted';
    const msgText = `🎥 UGC Deliverable Draft Submitted for Review!\n\nDeliverable URL: ${video_url}${cleanNotes ? `\n\nNotes: ${cleanNotes}` : ''}`;
    const msgMetadata = {
      video_url,
      content_url: video_url,
      notes: cleanNotes,
      feedback: cleanNotes,
      creator_notes: cleanNotes,
      action: 'deliverable_submitted'
    };

    const isUuid = (val: any) => typeof val === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);
    const senderUid = isUuid(user.user_id) ? user.user_id : null;
    const receiverUid = isUuid(brandUserId) ? brandUserId : null;

    const msgPayload = {
      message_id: msgId,
      thread_id: targetThreadId,
      sender_user_id: senderUid,
      receiver_user_id: receiverUid,
      text: msgText,
      from_name: actorName,
      message_type: msgType,
      metadata: msgMetadata,
      created_at: now,
      read: false
    };

    if (supabase) {
      try {
        await insertChatMessageToSupabase(msgPayload);
        if (targetThreadId) {
          await (privilegedSupabase || supabase)
            .from('chat_threads')
            .update({
              status: 'ACTIVE',
              flow_state: 'SUBMITTED',
              updated_at: now
            })
            .eq('id', targetThreadId);
        }
      } catch (e) {
        console.error("[deals/submit-draft] Error inserting chat message to Supabase:", e);
      }
    }

    const localMsgObj = {
      ...msgPayload,
      id: msgId,
      content: msgText,
      sender_id: user.user_id,
      receiver_id: brandUserId,
      sender_role: 'creator',
      message_type: msgType,
      media_url: video_url,
      content_url: video_url,
      video_url: video_url,
      metadata: msgMetadata
    };

    if (!db.chat_messages) db.chat_messages = [];
    db.chat_messages.push(localMsgObj);

    if (db.chat_threads) {
      const tIdx = db.chat_threads.findIndex((t: any) => t.id === targetThreadId || t.deal_id === id);
      if (tIdx !== -1) {
        db.chat_threads[tIdx].status = 'ACTIVE';
        db.chat_threads[tIdx].flow_state = 'SUBMITTED';
        db.chat_threads[tIdx].submitted_video_url = video_url;
      }
    }

    // Create Notification for the brand
    let notifObj: any = null;
    if (brandUserId) {
      const notifId = `notif_${crypto.randomUUID().replace(/-/g, '').substring(0, 10)}`;
      notifObj = {
        notif_id: notifId,
        user_id: brandUserId,
        type: 'ugc_deliverable_submitted',
        title: 'Deliverable Submitted',
        message: '🎥 UGC Deliverable submitted! Creator has uploaded content for your review.',
        event_type: 'ugc_deliverable_submitted',
        event_ref_id: id,
        role_context: 'brand',
        subtype: 'general',
        read: false,
        created_at: now,
        link: `/deals/${id}`
      };

      if (supabase) {
        try {
          const { link: _l, ...supaNotif } = notifObj;
          await (privilegedSupabase || supabase).from('notifications').insert(supaNotif);
        } catch (e) {
          console.warn("[deals/submit-draft] Notification insert warning:", e);
        }
      }

      if (!db.notifications) db.notifications = [];
      db.notifications.unshift(notifObj);
    }

    if (io && targetThreadId) {
      io.to(targetThreadId).emit("new_message", localMsgObj);
      io.to(targetThreadId).emit("thread_updated", {
        threadId: targetThreadId,
        status: 'ACTIVE',
        flow_state: 'SUBMITTED',
        submitted_video_url: video_url
      });
      io.emit("thread_updated", { threadId: targetThreadId, status: 'ACTIVE', flow_state: 'SUBMITTED' });

      if (brandUserId) {
        io.to(brandUserId).to(`user_${brandUserId}`).emit("notification", {
          type: 'ugc_deliverable_submitted',
          title: 'Deliverable Submitted',
          message: '🎥 UGC Deliverable submitted! Creator has uploaded content for your review.',
          notif_id: notifObj?.notif_id
        });
      }
    }
    saveDb(db);

    return res.json({ success: true, submission: submissionRecord });
  });


  router.post("/deals/:id/add-collab", async (req, res) => {
    const io = req.app.get("io");
    const user = await parseAuthUser(req);
    if (!user) return res.status(403).json({ detail: "Not authenticated", _status: 403 });
    const { id } = req.params;
    const { instagram_post_url, fetched_views, fetched_likes, fetched_reach, manual_screenshot_url } = req.body;
    const now = new Date().toISOString();

    const proofData = {
      instagram_post_url,
      fetched_views: fetched_views || 0,
      fetched_likes: fetched_likes || 0,
      fetched_reach: fetched_reach || 0,
      manual_screenshot_url,
      submitted_at: now
    };

    if (supabase) {
      try {
        await (privilegedSupabase || supabase)
          .from('deals')
          .update({
            status: 'PROOF_SUBMITTED',
            updated_at: now
          })
          .eq('id', id);
      } catch (e) {}
    }

    const db = getDb();
    if (db.deals) {
      const d = db.deals.find((x: any) => x.id === id || x.deal_id === id);
      if (d) {
        d.status = 'PROOF_SUBMITTED';
        d.stage = 'PROOF_SUBMITTED';
        d.proof = proofData;
        d.instagram_post_url = instagram_post_url;
      }
    }
    if (db.collabs) {
      const c = db.collabs.find((x: any) => x.collab_id === id || x.id === id);
      if (c) {
        c.status = 'PROOF_SUBMITTED';
        c.stage = 'PROOF_SUBMITTED';
        c.proof = proofData;
        c.instagram_post_url = instagram_post_url;
      }
    }

    // Sync corresponding chat_thread if present
    const threadId = `thread_camp_${id}`;
    if (supabase) {
      try {
        await (privilegedSupabase || supabase)
          .from('chat_threads')
          .update({
            flow_state: 'PROOF_SUBMITTED',
            status: 'ACTIVE',
            updated_at: now
          })
          .or(`id.eq.${threadId},deal_id.eq.${id}`);
      } catch (e) {}
    }
    if (db.chat_threads) {
      const t = db.chat_threads.find((x: any) => x.id === threadId || x.deal_id === id);
      if (t) {
        t.flow_state = 'PROOF_SUBMITTED';
        t.status = 'ACTIVE';
        t.live_links_submitted = true;
        t.live_link = instagram_post_url;
        t.updated_at = now;
      }
    }

    // Insert live_links_submitted message if not already present
    const recentMsgs = (db.chat_messages || []).filter((m: any) => 
      (m.thread_id === threadId || m.thread_id === id) && 
      m.message_type === 'live_links_submitted' &&
      new Date(m.created_at).getTime() > Date.now() - 30000
    );
    if (recentMsgs.length === 0) {
      const msgId = crypto.randomUUID();
      const msgText = `🚀 Live Post Link Submitted!\n\nLink: ${instagram_post_url}`;
      const msgRecord: any = {
        message_id: msgId,
        id: msgId,
        thread_id: threadId,
        sender_user_id: user?.user_id || user?.id,
        receiver_user_id: null,
        sender_id: user?.user_id || user?.id,
        receiver_id: null,
        sender_role: 'creator',
        text: msgText,
        content: msgText,
        from_name: user?.name || user?.full_name || 'Creator',
        message_type: 'live_links_submitted',
        metadata: {
          action: 'live_link_submitted',
          status: 'PROOF_SUBMITTED',
          link: instagram_post_url,
          links: [instagram_post_url]
        },
        read: false,
        created_at: now
      };
      if (supabase) {
        try {
          await insertChatMessageToSupabase(msgRecord);
        } catch (e) {}
      }
      if (!db.chat_messages) db.chat_messages = [];
      db.chat_messages.push(msgRecord);

      if (io) {
        io.to(threadId).emit("new_message", msgRecord);
        io.emit("thread_updated", {
          threadId,
          status: 'ACTIVE',
          flow_state: 'PROOF_SUBMITTED'
        });
      }
    }

    saveDb(db);

    return res.json({ success: true, proof: proofData });
  });

  router.post("/deals/:id/proof/verify", async (req, res) => {
    return handleThreadApproveLiveLinks(req, res);
  });
}
