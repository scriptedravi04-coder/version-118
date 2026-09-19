import express from "express";
import crypto from "crypto";
import { GoogleGenAI } from "@google/genai";

// Campaign Deal negotiation & agreement-signing chat actions: the brand
// proposing formal terms (approve-request, generating the AI agreement
// text), escrow payment (pay), agreement signing (both the legacy
// creator-approve-agreement shortcut and the real dual-signature /sign
// route), and the counter-offer negotiation flow (creator-negotiate,
// brand-accept-counter).
//
// These are more involved than the plain chat-CRUD routes (chat_routes.ts)
// because they carry real Deal-lifecycle business logic — status/flow_state
// transitions, escrow bookkeeping, and chat-message side effects — so each
// dependency this code touches from server.ts's shared scope is passed in
// explicitly below.
// A signed partnership contract is final. Once a party has signed, they may VIEW the
// negotiation table but must not be able to move the numbers — otherwise signing costs
// nothing: sign, then re-open the table, propose new rates (which wipes both signatures
// in creator-negotiate below) and the agreed terms quietly change underneath the other
// party. The lock is enforced here on the server; the UI lock alone is only cosmetic
// because these endpoints can be called directly.
//
// CAMPAIGN THREADS ONLY. Instant UGC orders have no signature stage and are deliberately
// left untouched by this guard.
export function isCampaignThreadRecord(thread: any): boolean {
  if (!thread) return false;
  const isUgcThread = Boolean(
    thread.is_ugc ||
    thread.ugc_order_id ||
    thread.ugc_brief_id ||
    String(thread.deal_type || '').toUpperCase() === 'UGC' ||
    String(thread.type || '').toLowerCase() === 'ugc' ||
    String(thread.id || '').startsWith('thread_ugc_') ||
    String(thread.id || '').startsWith('ugcord_') ||
    String(thread.deal_id || '').startsWith('ugcord_')
  );
  if (isUgcThread) return false;
  return Boolean(
    thread.campaign_id ||
    String(thread.deal_type || '').toUpperCase() === 'CAMPAIGN' ||
    String(thread.type || '').toLowerCase() === 'campaign' ||
    String(thread.id || '').startsWith('thread_camp_')
  );
}

export function negotiationLockedFor(thread: any, user: any): boolean {
  if (!isCampaignThreadRecord(thread)) return false;
  if (user?.role === 'admin') return false;
  // If ANY party has signed the agreement, negotiation is locked for both brand and creator
  if (Boolean(thread?.agreement_signed_brand) || Boolean(thread?.agreement_signed_creator)) {
    return true;
  }
  // Once an agreement is ready or workflow progressed beyond negotiation, negotiation is locked for both parties
  const flow = String(thread?.flow_state || '').toUpperCase();
  if (['AI_AGREEMENT_READY', 'AWAITING_SIGNATURE', 'AGREEMENT_PENDING', 'CONTRACT_READY', 'CONTRACT_SIGNED', 'PROOF_SUBMITTED', 'ACTIVE', 'COMPLETED'].includes(flow)) {
    return true;
  }
  return false;
}

export const NEGOTIATION_LOCKED_MESSAGE =
  "You have already signed this partnership contract, so the negotiation is now view-only. Contact support if the agreed terms genuinely need to change.";

export function setupDealsChatRoutes(
  app: express.Application,
  router: express.Router,
  {
    supabase,
    privilegedSupabase,
    getDb,
    saveDb,
    parseAuthUser,
    sendNotification,
    serializeChatMessage,
    insertChatMessageToSupabase,
    parseThreadState,
    updateThreadState,
    enrichThread,
    handleThreadApproveLiveLinks,
    handleThreadApproveContent,
    handleThreadSubmitLiveLink,
    handleThreadRejectLiveLinks,
    handleThreadDeclineLiveLinksResubmission,
    getIsTestMode,
  }: {
    supabase: any;
    privilegedSupabase: any;
    getDb: () => any;
    saveDb: (db: any) => void;
    parseAuthUser: (req: express.Request) => Promise<any>;
    sendNotification: (db: any, userId: string, type: string, message: string) => Promise<any>;
    serializeChatMessage: (a?: any, b?: any, c?: any, d?: any) => any;
    insertChatMessageToSupabase: (payload: any) => Promise<any>;
    parseThreadState: (thread: any) => any;
    updateThreadState: (clientOrThread: any, threadIdOrA?: any, updates?: any) => Promise<any>;
    enrichThread: (thread: any, a?: any, b?: any, c?: any) => any;
    handleThreadApproveLiveLinks: (req: express.Request, res: express.Response) => any;
    handleThreadApproveContent: (req: express.Request, res: express.Response) => any;
    handleThreadSubmitLiveLink: (req: express.Request, res: express.Response) => any;
    handleThreadRejectLiveLinks: (req: express.Request, res: express.Response) => any;
    handleThreadDeclineLiveLinksResubmission: (req: express.Request, res: express.Response) => any;
    getIsTestMode: () => boolean;
  }
) {
  const getIsoNow = () => new Date().toISOString();

  router.post([
    "/campaign/threads/:threadId/approve-request",
    "/chat/v2/threads/:threadId/approve-request"
  ], async (req, res) => {
    const user = await parseAuthUser(req);
    if (!user) return res.status(403).json({ detail: "Not authenticated", _status: 403 });
    const { threadId } = req.params;

    if (supabase) {
      const { data: thread, error: fetchErr } = await supabase
        .from('chat_threads')
        .select('*')
        .eq('id', threadId)
        .maybeSingle();
        
      if (fetchErr || !thread) return res.status(404).json({ error: "Thread not found" });
      if (thread.brand_id !== user.user_id && thread.creator_id !== user.user_id && user.role !== "admin") return res.status(403).json({ error: "Not authorized to modify this thread" });
      
      const parsed = await enrichThread(supabase, thread);
      
      const creatorName = parsed.creator_name || "Creator";
      const brandName = parsed.brand?.name || parsed.campaigns?.brand_name || "Brand Partner";
      const dueDate = parsed.due_date || "2026-07-25";
      const amountFixed = parsed.amount_fixed || thread.agreed_amount || 5000;
      const termsAndConditions = parsed.campaigns?.requirements || parsed.campaigns?.deliverables || "Deliver campaign requirements.";

      let agreementContent = "";
      try {
        if (process.env.GEMINI_API_KEY) {
          const ai = new GoogleGenAI({
            apiKey: process.env.GEMINI_API_KEY,
            httpOptions: {
              headers: {
                'User-Agent': 'aistudio-build',
              }
            }
          });
          const promptString = `You are an expert marketing manager at ${brandName}.
Generate a clear, formal, and professional sponsorship campaign agreement between ${brandName} and the creator ${creatorName}.

Details:
- Brand: ${brandName}
- Creator: ${creatorName}
- Work Location: Mumbai, India (or Creator's location)
- Project Due Date: ${dueDate}
- Fixed Payment Amount: INR ${amountFixed}
- Scope of Work: ${termsAndConditions}

The agreement must read like a formal yet simple contract. Break it down into clear numbered sections with clean bullet points. Avoid any mention of AI or machine/humanized descriptors. Make it look like a normal, plain text contract. Ensure the payment of INR ${amountFixed} is clearly presented, but explicitly state that this amount is subject to a standard platform fee deduction from the creator's final payout.`;

          const response = await ai.models.generateContent({
            model: "gemini-3.1-flash-lite",
            contents: promptString,
          });
          agreementContent = response.text || "";
        }
      } catch (err) {
        console.error("Gemini API error during agreement generation:", err);
      }

      if (!agreementContent) {
        agreementContent = `### CAMPAIGN COLLABORATION AGREEMENT

This agreement is entered into between **${brandName}** ("Brand") and **${creatorName}** ("Creator").

**1. Project Deliverables & Due Date**
The Creator agrees to deliver high-quality content as specified below by **${dueDate}**:
* ${termsAndConditions}

**2. Compensation**
Upon successful completion, review, and publication of the content, the Brand shall pay the Creator a fixed sum of **INR ${amountFixed}** (subject to standard platform fee deductions from the final payout).

**3. Location of Work**
All production and creative styling will take place remotely at Creator's designated location.

We are pleased to partner with you to bring this campaign to life!`;
      }

      await updateThreadState(supabase, threadId, {
        flow_state: "AI_AGREEMENT_READY",
        ai_generated_agreement: agreementContent,
        amount_fixed: amountFixed,
        agreement_signed_creator: false,
        agreement_signed_brand: false,
        agreement_signed_at: null
      });

      const msgContent = serializeChatMessage(
        `Hello ${creatorName}! We've approved your application and prepared the sponsorship agreement for you. Please review the terms and let me know if you are ready to sign or would like to propose a counter offer!`,
        "text",
        "brand",
        null
      );

      await insertChatMessageToSupabase({
        message_id: crypto.randomUUID(),
        thread_id: threadId,
        sender_user_id: thread.brand_id,
        text: msgContent,
        message_type: 'system',
        metadata: { action: 'sponsorship_agreement_prepared', amount_fixed: amountFixed },
        created_at: new Date().toISOString()
      });

      const updatedThread = await (privilegedSupabase || supabase).from('chat_threads').select('*').eq('id', threadId).maybeSingle();
      return res.json({ success: true, thread: await enrichThread(supabase, updatedThread.data) });
    }

    const db = getDb();
    const thread = db.chat_threads?.find(t => t.id === threadId);
    if (!thread) return res.status(404).json({ error: "Thread not found" });

    // Transition state
    thread.flow_state = "APPROVED";
    
    // Now generate the formal agreement!
    const creatorName = thread.creator_name || "Creator";
    const brandName = thread.brand_name || "Brand Partner";
    const dueDate = thread.due_date || "2026-07-25";
    const amountFixed = thread.amount_fixed || thread.agreed_amount || 5000;
    const termsAndConditions = thread.terms_and_conditions || "Deliver 1 high-quality Instagram Reel and 1 Story promoting the campaign. Ensure clear visuals and tag the brand account.";

    let agreementContent = "";
    try {
      if (process.env.GEMINI_API_KEY) {
        const ai = new GoogleGenAI({
          apiKey: process.env.GEMINI_API_KEY,
          httpOptions: {
            headers: {
              'User-Agent': 'aistudio-build',
            }
          }
        });
        const promptString = `You are an expert marketing manager at ${brandName}.
Generate a clear, formal, and professional sponsorship campaign agreement between ${brandName} and the creator ${creatorName}.

Details:
- Brand: ${brandName}
- Creator: ${creatorName}
- Work Location: Mumbai, India (or Creator's location)
- Project Due Date: ${dueDate}
- Fixed Payment Amount: INR ${amountFixed}
- Scope of Work: ${termsAndConditions}

The agreement must read like a formal yet simple contract. Break it down into clear numbered sections with clean bullet points. Avoid any mention of AI or machine/humanized descriptors. Make it look like a normal, plain text contract. Ensure the payment of INR ${amountFixed} is clearly presented, but explicitly state that this amount is subject to a standard platform fee deduction from the creator's final payout.`;

        const response = await ai.models.generateContent({
          model: "gemini-3.1-flash-lite",
          contents: promptString,
        });
        agreementContent = response.text || "";
      }
    } catch (err) {
      console.error("Gemini API error during agreement generation:", err);
    }

    // Fallback if Gemini fails or is not configured
    if (!agreementContent) {
      agreementContent = `### CAMPAIGN COLLABORATION AGREEMENT

This agreement is entered into between **${brandName}** ("Brand") and **${creatorName}** ("Creator").

**1. Project Deliverables & Due Date**
The Creator agrees to deliver high-quality content as specified below by **${dueDate}**:
* ${termsAndConditions}

**2. Compensation**
Upon successful completion, review, and publication of the content, the Brand shall pay the Creator a fixed sum of **INR ${amountFixed}** (subject to standard platform fee deductions from the final payout).

**3. Location of Work**
All production and creative styling will take place remotely at Creator's designated location.

We are pleased to partner with you to bring this campaign to life!`;
    }

    thread.ai_generated_agreement = agreementContent;
    thread.flow_state = "AI_AGREEMENT_READY";

    // Add default initial message from brand
    db.chat_messages.push({
      id: `msg_${Math.random().toString(36).substring(2, 10)}`,
      message_id: `msg_${Math.random().toString(36).substring(2, 10)}`,
      thread_id: threadId,
      sender_id: thread.brand_id,
      sender_role: "brand",
      message_type: "text",
      content: `Hello ${creatorName}! We've approved your application and prepared the sponsorship agreement for you. Please review the terms and let me know if you are ready to sign or would like to propose a counter offer!`,
      created_at: new Date().toISOString()
    });

    saveDb(db);
    res.json({ success: true, thread });
  });


  router.post([
    "/campaign/threads/:threadId/pay",
    "/chat/v2/threads/:threadId/pay"
  ], async (req, res) => {
    const user = await parseAuthUser(req);
    if (!user) return res.status(403).json({ detail: "Not authenticated", _status: 403 });
    const { threadId } = req.params;
    const nowIso = getIsoNow();

    if (supabase) {
      const { data: thread, error: fetchErr } = await supabase
        .from('chat_threads')
        .select('*')
        .eq('id', threadId)
        .maybeSingle();

      if (fetchErr || !thread) return res.status(404).json({ error: "Thread not found" });
      if (thread.brand_id !== user.user_id && thread.creator_id !== user.user_id && user.role !== "admin") {
        return res.status(403).json({ error: "Not authorized to modify this thread" });
      }

      // Verify that a matching valid transaction exists
      const targetDealId = thread.deal_id || threadId;
      let hasVerifiedPayment = false;
      let verifiedAmount = Number(thread.agreed_amount || thread.amount_fixed) || 0;

      try {
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(targetDealId);
        let txnQuery = supabase.from('transactions').select('*');
        if (isUuid) {
          txnQuery = txnQuery.or(`deal_id.eq.${targetDealId},id.eq.${targetDealId},ugc_order_id.eq.${targetDealId},deal_id.eq.${threadId},ugc_order_id.eq.${threadId}`);
        } else {
          txnQuery = txnQuery.or(`ugc_order_id.eq.${targetDealId},ugc_order_id.eq.${threadId}`);
        }
        const { data: txns } = await txnQuery;
        if (txns && txns.length > 0) {
          const validTx = txns.find((t: any) => 
            t.status === 'SUCCESS' || t.status === 'COMPLETED' || t.status === 'HELD' || t.escrow_hold === true || t.payout_status === 'PENDING'
          );
          if (validTx) {
            hasVerifiedPayment = true;
            if (validTx.gross_amount) verifiedAmount = Number(validTx.gross_amount);
          }
        }
      } catch (txErr) {
        console.warn("[Thread Pay Callback] Txn lookup error:", txErr);
      }

      // Check if thread was previously marked funded or in dev test mode (Issue #7 Fix: Use centralized test mode detection)
      if (!hasVerifiedPayment && (thread.payment_funded || getIsTestMode())) {
        hasVerifiedPayment = true;
      }

      if (!hasVerifiedPayment) {
        return res.status(400).json({ error: "No verified escrow payment found for this thread/deal. Please complete payment first." });
      }

      const parsed = parseThreadState(thread);
      const amountVal = verifiedAmount || parsed.amount_fixed || Number(thread.agreed_amount) || 5000;

      // Update thread state to ACTIVE and funded
      await updateThreadState(supabase, threadId, {
        flow_state: "COMPLETED",
        payment_funded: true,
        escrow_funded: true,
        funded_at: nowIso
      });

      await (privilegedSupabase || supabase).from('chat_threads').update({
        status: 'ACTIVE',
        flow_state: 'ACTIVE',
        payment_funded: true,
        agreed_amount: amountVal,
        updated_at: nowIso
      }).eq('id', threadId);

      // Update related deal or ugc_order
      if (parsed.is_ugc && parsed.ugc_order_id) {
        await (privilegedSupabase || supabase).from('ugc_orders').update({
          status: 'IN_PROGRESS',
          payment_status: 'ESCROW_HELD',
          escrow_hold: true,
          updated_at: nowIso
        }).eq('id', parsed.ugc_order_id);
      } else if (thread.deal_id) {
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(thread.deal_id);
        if (isUuid) {
          await (privilegedSupabase || supabase).from('deals').update({
            status: 'ACTIVE',
            escrow_hold: true,
            escrow_hold_at: nowIso,
            updated_at: nowIso
          }).eq('id', thread.deal_id);
        } else {
          await (privilegedSupabase || supabase).from('ugc_orders').update({
            status: 'IN_PROGRESS',
            payment_status: 'ESCROW_HELD',
            escrow_hold: true,
            escrow_held_at: nowIso,
            updated_at: nowIso
          }).eq('id', thread.deal_id);
        }
      }

      // Insert system message into chat if not already inserted
      let hasRecentPaymentMsg = false;
      if (supabase) {
        try {
          const { data: recentMsgs } = await (privilegedSupabase || supabase)
            .from('chat_messages')
            .select('id, message_type, metadata, created_at')
            .eq('thread_id', threadId)
            .order('created_at', { ascending: false })
            .limit(5);
          if (recentMsgs && recentMsgs.some((m: any) => 
            m.message_type === 'payment_secured' || 
            m.message_type === 'payment_funded' || 
            m.metadata?.action === 'payment_secured' || 
            m.metadata?.action === 'escrow_funded'
          )) {
            hasRecentPaymentMsg = true;
          }
        } catch (chkErr) {}
      }

      let msgRecord: any = null;
      if (!hasRecentPaymentMsg) {
        const msgText = `💰 Payment Secured! ₹${amountVal.toLocaleString('en-IN')} has been deposited and is now held safely in escrow. The creator can begin work.`;
        const sysContent = serializeChatMessage(
          msgText,
          "payment_secured",
          "system",
          { action: 'payment_secured', amount: amountVal, paid_at: nowIso }
        );

        const isUuid = (val: any) => typeof val === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);
        const senderUid = isUuid(thread.brand_id) ? thread.brand_id : (isUuid(user?.user_id) ? user.user_id : null);

        msgRecord = {
          message_id: crypto.randomUUID(),
          thread_id: threadId,
          sender_user_id: senderUid,
          text: sysContent,
          message_type: 'payment_secured',
          metadata: { action: 'payment_secured', amount: amountVal, paid_at: nowIso },
          created_at: nowIso
        };

        await insertChatMessageToSupabase(msgRecord);
      }

      // Send notification to creator
      if (thread.creator_id) {
        try {
          await sendNotification(
            null,
            thread.creator_id,
            "payment_funded",
            `💳 Escrow funds of ₹${amountVal.toLocaleString('en-IN')} secured for your collaboration! You can now start work.`
          );
        } catch (notifErr) {}
      }

      // Emit Socket.io event in real time
      const io = req.app.get("io");
      if (io) {
        if (msgRecord) {
          io.to(threadId).emit("new_message", msgRecord);
        }
        io.emit("thread_updated", {
          id: threadId,
          threadId: threadId,
          status: "ACTIVE",
          payment_funded: true,
          ...(msgRecord ? { lastMessage: msgRecord } : {})
        });
      }

      const updatedThread = await (privilegedSupabase || supabase).from('chat_threads').select('*').eq('id', threadId).maybeSingle();
      return res.json({ success: true, message: "Payment recorded and thread activated", thread: await enrichThread(supabase, updatedThread.data) });
    }

    // Memory DB Fallback
    const db = getDb();
    const thread = db.chat_threads?.find((t: any) => t.id === threadId);
    if (!thread) return res.status(404).json({ error: "Thread not found" });

    thread.status = "ACTIVE";
    thread.payment_funded = true;
    thread.flow_state = "COMPLETED";
    const amountVal = Number(thread.agreed_amount || thread.amount_fixed) || 5000;

    const msgRecord = {
      id: `msg_${Math.random().toString(36).substring(2, 10)}`,
      message_id: `msg_${Math.random().toString(36).substring(2, 10)}`,
      thread_id: threadId,
      sender_id: "system",
      sender_role: "system",
      message_type: "system",
      content: `💳 Escrow Payment Secured! The funds of ₹${amountVal.toLocaleString('en-IN')} have been safely deposited into Ybex Escrow. Work can now proceed!`,
      created_at: nowIso
    };

    if (!db.chat_messages) db.chat_messages = [];
    db.chat_messages.push(msgRecord);

    if (thread.deal_id) {
      const d = (db.deals || []).find((x: any) => x.id === thread.deal_id);
      if (d) {
        d.status = "ACTIVE";
        d.payment_status = "ESCROW_HELD";
        d.payment_funded = true;
      }
      const uo = (db.ugc_orders || []).find((x: any) => x.id === thread.deal_id);
      if (uo) {
        uo.status = "IN_PROGRESS";
        uo.payment_status = "ESCROW_HELD";
      }
    }

    saveDb(db);

    const io = req.app.get("io");
    if (io) {
      io.to(threadId).emit("new_message", msgRecord);
      io.emit("thread_updated", {
        id: threadId,
        threadId: threadId,
        status: "ACTIVE",
        payment_funded: true,
        lastMessage: msgRecord
      });
    }

    res.json({ success: true, message: "Payment recorded and thread activated", thread });
  });


  router.post([
    "/campaign/threads/:threadId/creator-approve-agreement",
    "/chat/v2/threads/:threadId/creator-approve-agreement"
  ], async (req, res) => {
    const user = await parseAuthUser(req);
    if (!user) return res.status(403).json({ detail: "Not authenticated", _status: 403 });
    const { threadId } = req.params;

    if (supabase) {
      const { data: thread, error: fetchErr } = await supabase
        .from('chat_threads')
        .select('*')
        .eq('id', threadId)
        .maybeSingle();
        
      if (fetchErr || !thread) return res.status(404).json({ error: "Thread not found" });
      if (thread.brand_id !== user.user_id && thread.creator_id !== user.user_id && user.role !== "admin") return res.status(403).json({ error: "Not authorized to modify this thread" });
      
      const parsed = parseThreadState(thread);

      // Save signed status
      await updateThreadState(supabase, threadId, {
        flow_state: "ACTIVE",
        agreement_signed_creator: true,
        agreement_signed_brand: true,
        agreement_signed_at: new Date().toISOString()
      });

      // Update actual status to ACTIVE and sync agreed_amount and updated_at
      await (privilegedSupabase || supabase).from('chat_threads').update({
        status: 'ACTIVE',
        flow_state: 'ACTIVE',
        agreed_amount: parsed.amount_fixed,
        updated_at: new Date().toISOString()
      }).eq('id', threadId);

      // Update related records
      if (parsed.is_ugc && parsed.ugc_order_id) {
        // Update ugc_orders to IN_PROGRESS
        await (privilegedSupabase || supabase).from('ugc_orders').update({ status: 'IN_PROGRESS' }).eq('id', parsed.ugc_order_id);
      } else if (thread.deal_id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(thread.deal_id)) {
        // Update campaign deals to ACTIVE
        await (privilegedSupabase || supabase).from('deals').update({
          status: 'ACTIVE',
          agreed_amount: parsed.amount_fixed,
          agreement_signed_creator: true,
          agreement_signed_brand: true,
          agreement_signed_at: new Date().toISOString()
        }).eq('id', thread.deal_id);
      }

      const sysContent = serializeChatMessage(
        `🎉 Agreement Approved! The sponsorship contract of ₹${parsed.amount_fixed.toLocaleString('en-IN')} is signed and locked. Chats are now fully activated.`,
        "system",
        "system",
        null
      );

      await insertChatMessageToSupabase({
        message_id: crypto.randomUUID(),
        thread_id: threadId,
        sender_user_id: thread.creator_id,
        text: sysContent,
        message_type: 'system',
        metadata: { action: 'agreement_approved', amount_fixed: parsed.amount_fixed },
        created_at: new Date().toISOString()
      });

      const updatedThread = await (privilegedSupabase || supabase).from('chat_threads').select('*').eq('id', threadId).maybeSingle();
      return res.json({ success: true, thread: await enrichThread(supabase, updatedThread.data) });
    }

    const db = getDb();
    const thread = db.chat_threads?.find(t => t.id === threadId);
    if (!thread) return res.status(404).json({ error: "Thread not found" });

    thread.flow_state = "COMPLETED";
    thread.status = "ACTIVE"; // Mark thread active
    thread.agreed_amount = thread.amount_fixed;

    db.chat_messages.push({
      id: `msg_${Math.random().toString(36).substring(2, 10)}`,
      message_id: `msg_${Math.random().toString(36).substring(2, 10)}`,
      thread_id: threadId,
      sender_id: "system",
      sender_role: "system",
      message_type: "system",
      content: `🎉 Agreement Approved! The sponsorship contract of ₹${thread.amount_fixed.toLocaleString('en-IN')} is signed and locked in escrow. Chats are now fully activated.`,
      created_at: new Date().toISOString()
    });

    saveDb(db);
    res.json({ success: true, thread });
  });


  router.post([
    "/campaign/threads/:threadId/sign",
    "/ugc/threads/:threadId/sign",
    "/chat/v2/threads/:threadId/sign"
  ], async (req, res) => {
    const user = await parseAuthUser(req);
    if (!user) return res.status(403).json({ detail: "Not authenticated", _status: 403 });
    const { threadId } = req.params;
    const { offer_id, signatureText } = req.body || {};

    let thread: any = null;

    if (supabase) {
      try {
        const { data: tData, error: fetchErr } = await (privilegedSupabase || supabase)
          .from('chat_threads')
          .select('*')
          .eq('id', threadId)
          .maybeSingle();
        if (tData) thread = tData;
      } catch (e) {}
    }

    const db = getDb();
    if (!thread && db.chat_threads) {
      thread = db.chat_threads.find((t: any) => t.id === threadId || t.thread_id === threadId);
    }

    if (!thread) return res.status(404).json({ error: "Thread not found" });

    const creatorId = thread.creator_id || thread.creator?.id;
    const brandId = thread.brand_id || thread.brand?.id || thread.brand_user_id;

    const isCreator = user.user_id === creatorId || (user.role === 'creator' && (!brandId || user.user_id !== brandId));
    const isBrand = user.user_id === brandId || (user.role === 'brand' && (!creatorId || user.user_id !== creatorId));

    if (!isCreator && !isBrand && user.role !== 'admin') {
      return res.status(403).json({ error: "Not authorized to sign this agreement" });
    }

    let signedCreator = Boolean(thread.agreement_signed_creator);
    let signedBrand = Boolean(thread.agreement_signed_brand);

    if (isCreator) {
      signedCreator = true;
    } else if (isBrand) {
      signedBrand = true;
    } else if (user.role === 'admin') {
      if (!signedCreator) signedCreator = true;
      else if (!signedBrand) signedBrand = true;
      else { signedCreator = true; signedBrand = true; }
    }

    const parsed = parseThreadState(thread);
    const bothSigned = parsed.is_ugc ? signedCreator : (signedCreator && signedBrand);

    const signedAt = (bothSigned && !thread.agreement_signed_at)
      ? new Date().toISOString()
      : (thread.agreement_signed_at || (bothSigned ? new Date().toISOString() : null));

    const resolvedAmount = Number(thread.agreed_amount || thread.amount_fixed || parsed.amount_fixed || parsed.agreed_amount || 0);

    const specificMessageType = bothSigned
      ? 'agreement_executed'
      : (isCreator ? 'creator_signed' : 'brand_signed');

    const msgText = bothSigned
      ? (parsed.is_ugc 
          ? `🎉 Agreement Executed! Creator has signed the UGC contract${resolvedAmount ? ` of ₹${resolvedAmount.toLocaleString('en-IN')}` : ''}. The deal is now ACTIVE. Brand can proceed to secure payment in escrow to begin work.`
          : `🎉 Agreement Executed! Both parties have signed the contract${resolvedAmount ? ` of ₹${resolvedAmount.toLocaleString('en-IN')}` : ''}. The deal is now ACTIVE. Brand can proceed to secure payment in escrow to begin work.`)
      : isCreator
        ? `✍️ Creator has signed the partnership agreement. Awaiting Brand signature to execute contract.`
        : `✍️ Brand has signed the partnership agreement. Awaiting Creator signature to execute contract.`;

    const agreementMsgId = crypto.randomUUID();

    if (supabase) {
      try {
        const threadUpdates: any = {
          agreement_signed_creator: signedCreator,
          agreement_signed_brand: signedBrand,
          updated_at: new Date().toISOString()
        };
        if (signedAt) threadUpdates.agreement_signed_at = signedAt;
        if (bothSigned) {
          threadUpdates.status = 'ACTIVE';
          threadUpdates.flow_state = 'ACTIVE';
        } else {
          threadUpdates.flow_state = 'AGREEMENT_SIGNED';
        }
        if (resolvedAmount > 0) {
          threadUpdates.agreed_amount = resolvedAmount;
        }

        await (privilegedSupabase || supabase).from('chat_threads').update(threadUpdates).eq('id', threadId);

        const stateUpdates: any = {
          agreement_signed_creator: signedCreator,
          agreement_signed_brand: signedBrand
        };
        if (bothSigned) {
          stateUpdates.flow_state = "ACTIVE";
          stateUpdates.agreement_signed_at = signedAt;
        } else {
          stateUpdates.flow_state = "AGREEMENT_SIGNED";
        }
        await updateThreadState(supabase, threadId, stateUpdates);

        // Update related deal / collabs if linked
        const isUuidDeal = thread.deal_id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(thread.deal_id);
        if (isUuidDeal) {
          const dealUpdates: any = {
            agreement_signed_creator: signedCreator,
            agreement_signed_brand: signedBrand,
            updated_at: new Date().toISOString()
          };
          if (signedAt) dealUpdates.agreement_signed_at = signedAt;
          if (bothSigned) {
            dealUpdates.status = 'ACTIVE';
          }
          if (resolvedAmount > 0) {
            dealUpdates.agreed_amount = resolvedAmount;
          }

          await (privilegedSupabase || supabase).from('deals').update(dealUpdates).eq('id', thread.deal_id);

          try {
            await (privilegedSupabase || supabase).from('collabs').update({
              status: bothSigned ? 'ACTIVE' : thread.status
            }).eq('collab_id', thread.deal_id);
          } catch (e) {}
        }

        if (bothSigned && (parsed.is_ugc || threadId.startsWith('ugcord_') || thread.ugc_order_id)) {
          const ugcId = thread.ugc_order_id || (threadId.startsWith('ugcord_') ? threadId : null);
          if (ugcId) {
            await (privilegedSupabase || supabase).from('ugc_orders').update({ status: 'IN_PROGRESS' }).eq('id', ugcId);
          }
        }

        const sysContent = serializeChatMessage(msgText, "system", "system", null);
        await insertChatMessageToSupabase({
          message_id: agreementMsgId,
          thread_id: threadId,
          sender_user_id: user.user_id,
          text: sysContent,
          message_type: specificMessageType,
          metadata: { action: 'agreement_signed', signer_id: user.user_id, offer_id, message_type: specificMessageType },
          created_at: new Date().toISOString()
        });
      } catch (err) {
        console.error("Error persisting agreement signature in Supabase:", err);
      }
    }

    // Mock DB synchronization
    const mockT = db.chat_threads?.find((t: any) => t.id === threadId || t.thread_id === threadId);
    if (mockT) {
      mockT.agreement_signed_creator = signedCreator;
      mockT.agreement_signed_brand = signedBrand;
      if (signedAt) mockT.agreement_signed_at = signedAt;
      if (bothSigned) {
        mockT.status = 'ACTIVE';
        mockT.flow_state = 'ACTIVE';
      } else {
        mockT.flow_state = 'AGREEMENT_SIGNED';
      }
      if (resolvedAmount > 0) mockT.agreed_amount = resolvedAmount;
    }

    if (thread.deal_id) {
      const mockDeal = db.deals?.find((d: any) => d.id === thread.deal_id || d.deal_id === thread.deal_id);
      if (mockDeal) {
        mockDeal.agreement_signed_creator = signedCreator;
        mockDeal.agreement_signed_brand = signedBrand;
        if (signedAt) mockDeal.agreement_signed_at = signedAt;
        if (bothSigned) {
          mockDeal.status = 'ACTIVE';
          mockDeal.stage = 'ACTIVE';
        }
        if (resolvedAmount > 0) mockDeal.agreed_amount = resolvedAmount;
      }
      const mockCollab = db.collabs?.find((c: any) => c.collab_id === thread.deal_id || c.id === thread.deal_id);
      if (mockCollab && bothSigned) {
        mockCollab.status = 'ACTIVE';
        mockCollab.stage = 'ACTIVE';
      }
    }

    if (bothSigned) {
      const ugcId = thread.ugc_order_id || (threadId.startsWith('ugcord_') ? threadId : null);
      if (ugcId && db.ugc_orders) {
        const uo = db.ugc_orders.find((o: any) => o.id === ugcId);
        if (uo) uo.status = 'IN_PROGRESS';
      }
    }

    if (db.chat_messages) {
      db.chat_messages.push({
        id: agreementMsgId,
        message_id: agreementMsgId,
        thread_id: threadId,
        sender_id: user.user_id,
        sender_role: "system",
        message_type: specificMessageType,
        content: msgText,
        metadata: { action: 'agreement_signed', signer_id: user.user_id, offer_id, message_type: specificMessageType },
        created_at: new Date().toISOString()
      });
    }
    saveDb(db);

    try {
      const ioInstance = req.app.get("io") || null;
      if (ioInstance) {
        const msgRecord = {
          id: agreementMsgId,
          message_id: agreementMsgId,
          thread_id: threadId,
          sender_id: user.user_id,
          sender_user_id: user.user_id,
          sender_role: "system",
          message_type: specificMessageType,
          content: msgText,
          text: msgText,
          metadata: { action: 'agreement_signed', signer_id: user.user_id, offer_id, message_type: specificMessageType },
          created_at: new Date().toISOString()
        };

        const threadUpdatePayload = {
          id: threadId,
          threadId: threadId,
          thread_id: threadId,
          status: bothSigned ? 'ACTIVE' : thread.status,
          flow_state: bothSigned ? 'ACTIVE' : 'AGREEMENT_SIGNED',
          agreement_signed_creator: signedCreator,
          agreement_signed_brand: signedBrand,
          agreement_signed_at: signedAt,
          agreed_amount: resolvedAmount > 0 ? resolvedAmount : thread.agreed_amount,
          both_signed: bothSigned,
          signed_by: isCreator ? "creator" : (isBrand ? "brand" : "admin")
        };

        ioInstance.to(threadId).emit("new_message", msgRecord);
        ioInstance.to(`thread_${threadId}`).emit("new_message", msgRecord);

        ioInstance.to(threadId).emit("thread_updated", threadUpdatePayload);
        ioInstance.to(`thread_${threadId}`).emit("thread_updated", threadUpdatePayload);
        ioInstance.emit("thread_updated", threadUpdatePayload);

        ioInstance.to(threadId).emit("agreement_signed", threadUpdatePayload);
        ioInstance.to(`thread_${threadId}`).emit("agreement_signed", threadUpdatePayload);
      }
    } catch (e) {
      console.error("Error broadcasting agreement_signed socket event:", e);
    }

    const updatedThreadRecord = {
      ...thread,
      agreement_signed_creator: signedCreator,
      agreement_signed_brand: signedBrand,
      agreement_signed_at: signedAt,
      status: bothSigned ? 'ACTIVE' : thread.status,
      flow_state: bothSigned ? 'ACTIVE' : 'AGREEMENT_SIGNED',
      agreed_amount: resolvedAmount > 0 ? resolvedAmount : thread.agreed_amount
    };

    return res.json({
      success: true,
      signed_by: isCreator ? "creator" : (isBrand ? "brand" : "admin"),
      both_signed: bothSigned,
      thread: updatedThreadRecord
    });
  });


  router.post([
    "/campaign/threads/:threadId/creator-negotiate",
    // Instant UGC has price negotiation too (the mobile chat calls this path), so the UGC
    // namespace has to be registered or every UGC counter-offer 404s.
    "/ugc/threads/:threadId/creator-negotiate",
    "/chat/v2/threads/:threadId/creator-negotiate"
  ], async (req, res) => {
    const user = await parseAuthUser(req);
    if (!user) return res.status(403).json({ detail: "Not authenticated", _status: 403 });
    const { threadId } = req.params;
    const { counter_amount } = req.body;

    const counterNum = Number(counter_amount);
    if (!counterNum || isNaN(counterNum) || counterNum <= 0) {
      return res.status(400).json({ error: "Invalid counter_amount provided" });
    }

    if (supabase) {
      const { data: thread, error: fetchErr } = await supabase
        .from('chat_threads')
        .select('*')
        .eq('id', threadId)
        .maybeSingle();
        
      if (fetchErr || !thread) return res.status(404).json({ error: "Thread not found" });
      if (thread.brand_id !== user.user_id && thread.creator_id !== user.user_id && user.role !== "admin") return res.status(403).json({ error: "Not authorized to modify this thread" });
      if (negotiationLockedFor(thread, user)) {
        return res.status(409).json({ error: NEGOTIATION_LOCKED_MESSAGE, negotiation_locked: true });
      }

      await updateThreadState(supabase, threadId, {
        flow_state: "NEGOTIATING_COUNTER",
        status: "NEGOTIATING",
        counter_amount: counterNum,
        agreement_signed_creator: false,
        agreement_signed_brand: false,
        agreement_signed_at: null
      });

      // Save counter_amount in local cache
      const db = getDb();
      if (!db.chat_threads) db.chat_threads = [];
      let localThr = db.chat_threads.find((t: any) => t.id === threadId);
      if (!localThr) {
        localThr = { ...thread };
        db.chat_threads.push(localThr);
      }
      localThr.counter_amount = counterNum;
      localThr.flow_state = "NEGOTIATING_COUNTER";
      localThr.status = "NEGOTIATING";
      saveDb(db);

      const isSenderCreator = user.user_id === thread.creator_id;
      const senderRoleLabel = isSenderCreator ? "creator" : "brand";

      const counterContent = serializeChatMessage(
        `I would like to negotiate the offer to ₹${counterNum.toLocaleString('en-IN')}.`,
        "negotiation_offer",
        senderRoleLabel,
        { proposed_amount: counterNum }
      );

      await insertChatMessageToSupabase({
        message_id: crypto.randomUUID(),
        thread_id: threadId,
        sender_user_id: user.user_id,
        text: counterContent,
        message_type: 'negotiation_offer',
        metadata: { action: 'negotiation_offer', proposed_amount: counterNum },
        created_at: new Date().toISOString()
      });

      const updatedThread = await (privilegedSupabase || supabase).from('chat_threads').select('*').eq('id', threadId).maybeSingle();
      const enriched = await enrichThread(supabase, updatedThread.data);
      if (enriched) {
        enriched.counter_amount = counterNum;
        enriched.flow_state = "NEGOTIATING_COUNTER";
        enriched.status = "NEGOTIATING";
      }
      return res.json({ success: true, thread: enriched });
    }

    const db = getDb();
    const thread = db.chat_threads?.find(t => t.id === threadId);
    if (!thread) return res.status(404).json({ error: "Thread not found" });
    if (thread.brand_id !== user.user_id && thread.creator_id !== user.user_id && user.role !== "admin") {
      return res.status(403).json({ error: "Not authorized to modify this thread" });
    }
    if (negotiationLockedFor(thread, user)) {
      return res.status(409).json({ error: NEGOTIATION_LOCKED_MESSAGE, negotiation_locked: true });
    }

    // Save the negotiation
    thread.flow_state = "NEGOTIATING_COUNTER";
    thread.status = "NEGOTIATING";
    thread.counter_amount = counterNum;

    const isSenderCreatorLocal = user.user_id === thread.creator_id;
    db.chat_messages.push({
      id: `msg_${Math.random().toString(36).substring(2, 10)}`,
      message_id: `msg_${Math.random().toString(36).substring(2, 10)}`,
      thread_id: threadId,
      sender_id: user.user_id,
      sender_role: isSenderCreatorLocal ? "creator" : "brand",
      message_type: "negotiation_offer",
      content: `I would like to negotiate the offer to ₹${counterNum.toLocaleString('en-IN')}.`,
      metadata: { proposed_amount: counterNum },
      created_at: new Date().toISOString()
    });

    saveDb(db);
    res.json({ success: true, thread });
  });


  router.post([
    "/campaign/threads/:threadId/brand-accept-counter",
    "/ugc/threads/:threadId/brand-accept-counter",
    "/chat/v2/threads/:threadId/brand-accept-counter"
  ], async (req, res) => {
    const user = await parseAuthUser(req);
    if (!user) return res.status(403).json({ detail: "Not authenticated", _status: 403 });
    const { threadId } = req.params;

    if (supabase) {
      const { data: thread, error: fetchErr } = await supabase
        .from('chat_threads')
        .select('*')
        .eq('id', threadId)
        .maybeSingle();
        
      if (fetchErr || !thread) return res.status(404).json({ error: "Thread not found" });
      if (thread.brand_id !== user.user_id && thread.creator_id !== user.user_id && user.role !== "admin") return res.status(403).json({ error: "Not authorized to modify this thread" });
      if (negotiationLockedFor(thread, user)) {
        const isCounterPending = String(thread.flow_state || '').toUpperCase() === 'NEGOTIATING_COUNTER';
        const isFullyExecuted = Boolean(thread.agreement_signed_brand && thread.agreement_signed_creator);
        if (!isCounterPending || isFullyExecuted) {
          return res.status(409).json({ error: NEGOTIATION_LOCKED_MESSAGE, negotiation_locked: true });
        }
      }

      const parsed = await enrichThread(supabase, thread);

      // Determine proposed counter amount from body, thread, local cache, or latest chat message
      let proposedCounter: number | null = null;
      if (req.body && (req.body.counter_amount || req.body.amount)) {
        proposedCounter = Number(req.body.counter_amount || req.body.amount);
      }
      if (!proposedCounter && parsed.counter_amount) {
        proposedCounter = Number(parsed.counter_amount);
      }
      if (!proposedCounter && thread.counter_amount) {
        proposedCounter = Number(thread.counter_amount);
      }
      const db = getDb();
      let localThr = (db.chat_threads || []).find((t: any) => t.id === threadId);
      if (!proposedCounter && localThr?.counter_amount) {
        proposedCounter = Number(localThr.counter_amount);
      }

      if (!proposedCounter) {
        let msgs: any[] = [];
        try {
          const { data } = await (privilegedSupabase || supabase)
            .from('chat_messages')
            .select('*')
            .eq('thread_id', threadId)
            .order('created_at', { ascending: false });
          if (data) msgs = data;
        } catch (e) {}
        const localMsgs = (db.chat_messages || []).filter((m: any) => m.thread_id === threadId);
        const allMsgs = [...msgs, ...localMsgs];
        for (const m of allMsgs) {
          if (m.metadata?.proposed_amount) {
            proposedCounter = Number(m.metadata.proposed_amount);
            if (proposedCounter > 0) break;
          }
          const txt = m.text || m.content || "";
          if (txt.includes("negotiate") || txt.includes("negotiation") || txt.includes("offer to") || m.message_type === "negotiation_offer") {
            const match = txt.match(/₹([0-9,]+)/);
            if (match) {
              const parsedAmt = Number(match[1].replace(/,/g, ''));
              if (parsedAmt > 0) {
                proposedCounter = parsedAmt;
                break;
              }
            }
          }
        }
      }

      const finalAmount = proposedCounter || parsed.amount_fixed || parsed.agreed_amount || thread.agreed_amount || 0;

      const creatorName = parsed.creator_name || "Creator";
      const brandName = parsed.brand?.name || parsed.campaigns?.brand_name || "Brand Partner";
      const dueDate = parsed.due_date || "2026-07-25";
      const termsAndConditions = parsed.campaigns?.requirements || parsed.campaigns?.deliverables || "Deliver campaign requirements.";

      const agreementContent = `### CAMPAIGN COLLABORATION AGREEMENT

This agreement is entered into between **${brandName}** ("Brand") and **${creatorName}** ("Creator").

**1. Project Deliverables & Due Date**
The Creator agrees to deliver high-quality content as specified below by **${dueDate}**:
* ${termsAndConditions}

**2. Compensation**
Upon successful completion, review, and publication of the content, the Brand shall pay the Creator a fixed sum of **INR ${finalAmount}** (subject to standard platform fee deductions).

**3. Location of Work**
All production and creative styling will take place remotely at Creator's designated location.

We are pleased to partner with you to bring this campaign to life!`;

      // 1. Update chat_threads in Supabase
      await (privilegedSupabase || supabase).from('chat_threads').update({
        agreed_amount: finalAmount,
        status: 'NEGOTIATING',
        flow_state: 'AI_AGREEMENT_READY',
        agreement_signed_creator: false,
        agreement_signed_brand: false,
        agreement_signed_at: null,
        updated_at: new Date().toISOString()
      }).eq('id', threadId);

      // 2. Also update underlying deals table if deal_id exists and is a valid UUID
      const dealId = thread.deal_id || threadId;
      const isUuidDeal = dealId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(dealId);
      if (isUuidDeal) {
        try {
          await (privilegedSupabase || supabase).from('deals').update({
            agreed_amount: finalAmount,
            updated_at: new Date().toISOString()
          }).eq('id', dealId);
        } catch (e) {}
      }

      // 3. Update local cache
      if (!localThr) {
        localThr = { ...thread, id: threadId };
        if (!db.chat_threads) db.chat_threads = [];
        db.chat_threads.push(localThr);
      }
      if (localThr) {
        localThr.agreed_amount = finalAmount;
        localThr.amount_fixed = finalAmount;
        localThr.counter_amount = null;
        localThr.flow_state = "AI_AGREEMENT_READY";
        localThr.status = "NEGOTIATING";
        localThr.ai_generated_agreement = agreementContent;
      }
      const localDeal = (db.deals || []).find((d: any) => d.id === dealId || d.id === thread.deal_id);
      if (localDeal) {
        localDeal.agreed_amount = finalAmount;
      }
      saveDb(db);

      const sysContent = serializeChatMessage(
        `🎉 Counter offer of ₹${finalAmount.toLocaleString('en-IN')} accepted by the Brand! The sponsorship agreement has been updated. Creator, please review and sign to activate the campaign.`,
        "system",
        "system",
        null
      );

      await insertChatMessageToSupabase({
        message_id: crypto.randomUUID(),
        thread_id: threadId,
        sender_user_id: thread.brand_id,
        text: sysContent,
        message_type: 'system',
        metadata: { action: 'counter_offer_accepted', final_amount: finalAmount },
        created_at: new Date().toISOString()
      });

      const updatedThread = await (privilegedSupabase || supabase).from('chat_threads').select('*').eq('id', threadId).maybeSingle();
      const enriched = await enrichThread(supabase, updatedThread.data);
      if (enriched) {
        enriched.agreed_amount = finalAmount;
        enriched.amount_fixed = finalAmount;
        enriched.flow_state = "AI_AGREEMENT_READY";
        enriched.status = "NEGOTIATING";
        enriched.counter_amount = null;
      }
      return res.json({ success: true, thread: enriched });
    }

    const db = getDb();
    const thread = db.chat_threads?.find(t => t.id === threadId);
    if (!thread) return res.status(404).json({ error: "Thread not found" });
    if (thread.brand_id !== user.user_id && thread.creator_id !== user.user_id && user.role !== "admin") {
      return res.status(403).json({ error: "Not authorized to modify this thread" });
    }
    if (negotiationLockedFor(thread, user)) {
      const isCounterPending = String(thread.flow_state || '').toUpperCase() === 'NEGOTIATING_COUNTER';
      const isFullyExecuted = Boolean(thread.agreement_signed_brand && thread.agreement_signed_creator);
      if (!isCounterPending || isFullyExecuted) {
        return res.status(409).json({ error: NEGOTIATION_LOCKED_MESSAGE, negotiation_locked: true });
      }
    }

    let proposedCounter: number | null = null;
    if (req.body && (req.body.counter_amount || req.body.amount)) {
      proposedCounter = Number(req.body.counter_amount || req.body.amount);
    }
    if (!proposedCounter && thread.counter_amount) {
      proposedCounter = Number(thread.counter_amount);
    }
    if (!proposedCounter) {
      const localMsgs = (db.chat_messages || []).filter((m: any) => m.thread_id === threadId);
      for (let i = localMsgs.length - 1; i >= 0; i--) {
        const m = localMsgs[i];
        if (m.metadata?.proposed_amount) {
          proposedCounter = Number(m.metadata.proposed_amount);
          break;
        }
        const txt = m.text || m.content || "";
        if (txt.includes("negotiate") || txt.includes("offer to") || m.message_type === "negotiation_offer") {
          const match = txt.match(/₹([0-9,]+)/);
          if (match) {
            const parsedAmt = Number(match[1].replace(/,/g, ''));
            if (parsedAmt > 0) {
              proposedCounter = parsedAmt;
              break;
            }
          }
        }
      }
    }

    const finalAmount = proposedCounter || thread.counter_amount || thread.agreed_amount || thread.amount_fixed || 0;
    thread.amount_fixed = finalAmount;
    thread.agreed_amount = finalAmount;
    thread.counter_amount = null;
    thread.flow_state = "AI_AGREEMENT_READY";
    thread.status = "NEGOTIATING";

    const dealId = thread.deal_id || threadId;
    if (dealId && db.deals) {
      const localDeal = db.deals.find((d: any) => d.id === dealId || d.id === thread.deal_id);
      if (localDeal) {
        localDeal.agreed_amount = finalAmount;
      }
    }

    // Generate the formal agreement with the negotiated price
    const creatorName = thread.creator_name || "Creator";
    const brandName = thread.brand_name || "Brand Partner";
    const dueDate = thread.due_date || "2026-07-25";
    const termsAndConditions = thread.terms_and_conditions || "Deliver 1 high-quality Instagram Reel and 1 Story promoting the campaign. Ensure clear visuals and tag the brand account.";

    let agreementContent = `### CAMPAIGN COLLABORATION AGREEMENT

This agreement is entered into between **${brandName}** ("Brand") and **${creatorName}** ("Creator").

**1. Project Deliverables & Due Date**
The Creator agrees to deliver high-quality content as specified below by **${dueDate}**:
* ${termsAndConditions}

**2. Compensation**
Upon successful completion, review, and publication of the content, the Brand shall pay the Creator a fixed sum of **INR ${finalAmount}** (subject to standard platform fee deductions).

**3. Location of Work**
All production and creative styling will take place remotely at Creator's designated location.

We are pleased to partner with you to bring this campaign to life!`;

    thread.ai_generated_agreement = agreementContent;

    db.chat_messages.push({
      id: `msg_${Math.random().toString(36).substring(2, 10)}`,
      message_id: `msg_${Math.random().toString(36).substring(2, 10)}`,
      thread_id: threadId,
      sender_id: "system",
      sender_role: "system",
      message_type: "system",
      content: `🎉 Counter offer of ₹${finalAmount.toLocaleString('en-IN')} accepted by the Brand! The sponsorship agreement has been updated. Creator, please review and sign to activate the campaign.`,
      created_at: new Date().toISOString()
    });

    saveDb(db);
    res.json({ success: true, thread });
  });


  router.post([
    "/chat/v2/threads/:id/approve-live-links",
    "/chat/v2/threads/:threadId/approve-live-links",
    "/chat/v2/threads/:id/approve-live-link",
    "/chat/v2/threads/:threadId/approve-live-link"
  ], handleThreadApproveLiveLinks);
  router.post([
    "/chat/v2/threads/:id/approve-content",
    "/chat/v2/threads/:threadId/approve-content",
    "/chat/v2/threads/:id/content/approve",
    "/chat/v2/threads/:threadId/content/approve"
  ], handleThreadApproveContent);
  router.post([
    "/chat/v2/threads/:id/submit-live-link",
    "/chat/v2/threads/:threadId/submit-live-link",
    "/chat/v2/threads/:id/submit-live-links",
    "/chat/v2/threads/:threadId/submit-live-links"
  ], handleThreadSubmitLiveLink);
  router.post([
    // SystemMessage.jsx posts here on the campaign namespace; only the legacy paths were
    // registered, so "ask creator to resubmit live links" 404'd on every campaign deal.
    "/campaign/threads/:id/reject-live-links",
    "/campaign/threads/:threadId/reject-live-links",
    "/chat/v2/threads/:id/reject-live-links",
    "/chat/v2/threads/:threadId/reject-live-links"
  ], handleThreadRejectLiveLinks);
  router.post([
    "/chat/v2/threads/:id/decline-live-links-resubmission",
    "/chat/v2/threads/:threadId/decline-live-links-resubmission"
  ], handleThreadDeclineLiveLinksResubmission);
}
