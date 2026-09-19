import crypto from "crypto";
import { isCampaignThread, getCampaignDealId } from "../dealFlow";
import { calculateFee as calculatePlatformFee } from "../../src/utils/feeCalculator";

export interface SyncUgcLifecycleOptions {
  rawId: string;
  action: 'SUBMIT_DELIVERABLE' | 'REQUEST_REVISION' | 'APPROVE' | 'DECLINE_REVISION' | 'CANCEL';
  actorUser: any;
  notes?: string;
  videoUrl?: string;
  io?: any;
}

export interface UgcLifecycleServiceDeps {
  supabase: any;
  privilegedSupabase: any;
  getDb: () => any;
  saveDb: (db: any) => void;
  getIsoNow: () => string;
  ensureUGCChatThread: (order: any, briefInput?: any, actorUser?: any, ioInstance?: any) => Promise<any>;
  insertChatMessageToSupabase: (payload: any) => Promise<any>;
}

export function createUgcLifecycleService({
  supabase,
  privilegedSupabase,
  getDb,
  saveDb,
  getIsoNow,
  ensureUGCChatThread,
  insertChatMessageToSupabase,
}: UgcLifecycleServiceDeps) {
  return async function syncUgcLifecycleEvent({
    rawId,
    action,
    actorUser,
    notes = "",
    videoUrl = "",
    io,
  }: SyncUgcLifecycleOptions) {
    const nowIso = getIsoNow();
    const db = getDb();
    const cleanNotes = (notes || "").trim();
    const cleanVideoUrl = (videoUrl || "").trim();

    // 1. Resolve UGC Order & Chat Thread
    let order: any = null;
    let thread: any = null;

    if (supabase) {
      try {
        const { data: o1 } = await (privilegedSupabase || supabase)
          .from('ugc_orders')
          .select('*')
          .or(`id.eq.${rawId},brief_id.eq.${rawId}`)
          .maybeSingle();
        if (o1) order = o1;
      } catch (e) {}

      try {
        const { data: thr } = await (privilegedSupabase || supabase)
          .from('chat_threads')
          .select('*')
          .or(`id.eq.${rawId},deal_id.eq.${rawId}`)
          .maybeSingle();
        if (thr) {
          thread = thr;
          if (!order && thr.deal_id) {
            const { data: o2 } = await (privilegedSupabase || supabase)
              .from('ugc_orders')
              .select('*')
              .eq('id', thr.deal_id)
              .maybeSingle();
            if (o2) order = o2;
          }
        }
      } catch (e) {}
    }

    const localOrderRecord = (db.ugc_orders || []).find((o: any) => o.id === rawId || o.brief_id === rawId);
    if (!order && localOrderRecord) {
      order = localOrderRecord;
    } else if (order && localOrderRecord) {
      order = { ...localOrderRecord, ...order };
    }

    if (!thread && db.chat_threads) {
      thread = db.chat_threads.find((t: any) => t.id === rawId || t.deal_id === rawId);
    }
    if (!order && thread) {
      order = (db.ugc_orders || []).find((o: any) => o.id === thread.deal_id || o.id === thread.id);
    }
    if (!thread && order) {
      thread = (db.chat_threads || []).find((t: any) => t.id === order.id || t.deal_id === order.id);
    }

    // Ensure thread exists if order exists
    if (!thread && order) {
      try {
        thread = await ensureUGCChatThread(order, null, actorUser, io);
      } catch (e) {
        console.warn("[syncUgcLifecycleEvent] ensureUGCChatThread error:", e);
      }
    }

    const isUuid = (val: any) => typeof val === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);
    const targetOrderId = order?.id || thread?.deal_id || rawId;
    const targetThreadId = thread?.id || order?.id || rawId;
    const creatorId = order?.creator_id || thread?.creator_id || (actorUser?.role === 'creator' ? actorUser?.user_id : null);
    const brandId = order?.brand_id || thread?.brand_id || (actorUser?.role === 'brand' ? actorUser?.user_id : null);
    const targetDealId = thread?.deal_id || (isUuid(targetOrderId) ? targetOrderId : null) || (isUuid(rawId) ? rawId : null);
    const subDealId = targetDealId || targetOrderId || thread?.deal_id || rawId;

    const isUgc = Boolean(
      order ||
      localOrderRecord ||
      thread?.is_ugc ||
      thread?.type === 'ugc' ||
      thread?.deal_type === 'UGC' ||
      String(rawId).startsWith('ugcord_') ||
      String(rawId).startsWith('thread_ugc_') ||
      String(thread?.id).startsWith('ugcord_') ||
      String(thread?.id).startsWith('thread_ugc_') ||
      String(thread?.deal_id).startsWith('ugcord_')
    );

    const actorRole = actorUser?.role || (actorUser?.user_id === brandId ? 'brand' : 'creator');
    const actorName = actorUser?.name || (actorRole === 'brand' ? 'Brand' : 'Creator');
    const receiverId = (actorRole === 'brand' ? creatorId : brandId) || '';
    const receiverRole = (actorRole === 'brand' ? 'creator' : 'brand');

    let orderStatus = '';
    let threadStatus = '';
    let orderUpdates: any = { updated_at: nowIso };
    let threadUpdates: any = { updated_at: nowIso };
    let msgType = '';
    let msgText = '';
    let msgMetadata: any = {};
    let notifType = '';
    let notifTitle = '';
    let notifMessage = '';
    let notifLink = (receiverRole === 'brand' ? '/brand/ugc/orders' : '/creator/ugc/orders');

    // Pre-action guards
    if (action === 'CANCEL') {
      const isCompleted = order?.status === 'COMPLETED' || order?.brand_status === 'COMPLETED' || order?.creator_status === 'COMPLETED';
      if (isCompleted) {
        return {
          error: "Cannot cancel an already completed order",
          _status: 400,
          status: 'COMPLETED'
        };
      }
    }

    // APPROVE must be idempotent
    if (action === 'APPROVE') {
      const alreadyApproved =
        String(order?.status || '').toUpperCase() === 'COMPLETED' ||
        String(order?.brand_status || '').toUpperCase() === 'COMPLETED' ||
        ['RELEASED', 'PAID'].includes(String(order?.payment_status || '').toUpperCase());
      if (alreadyApproved) {
        return {
          already_approved: true,
          status: 'COMPLETED',
          payment_status: order?.payment_status || 'RELEASED',
          order_id: order?.id || targetOrderId,
          message: "This order was already approved — payout is in progress."
        };
      }
    }

    let currentUsed = 0;
    let maxRevisions = 5;
    if (action === 'REQUEST_REVISION') {
      currentUsed = Math.max(Number(order?.revisions_used || 0), Number(localOrderRecord?.revisions_used || 0));
      maxRevisions = Number(order?.revision_count || localOrderRecord?.revision_count || 5);
      if (currentUsed >= maxRevisions) {
        return {
          error: `Revision limit reached (${maxRevisions}/${maxRevisions}). Please approve the current draft or cancel this order — contact support if further changes are needed.`,
          _status: 400,
          revisions_used: currentUsed,
          revision_count: maxRevisions
        };
      }
    }

    switch (action) {
      case 'SUBMIT_DELIVERABLE': {
        orderStatus = 'SUBMITTED';
        threadStatus = 'ACTIVE';
        orderUpdates = {
          ...orderUpdates,
          video_url: cleanVideoUrl,
          creator_notes: cleanNotes,
          status: 'SUBMITTED',
          delivered_at: nowIso
        };
        threadUpdates = {
          ...threadUpdates,
          status: 'ACTIVE',
          flow_state: 'SUBMITTED',
          submitted_video_url: cleanVideoUrl,
          revision_notes: null,
          revision_feedback: null
        };
        msgType = 'content_proof_submitted';
        msgText = `🎥 ${isUgc ? 'UGC' : 'Content'} Deliverable Draft Submitted for Review!\n\nDeliverable URL: ${cleanVideoUrl}${cleanNotes ? `\n\nNotes: ${cleanNotes}` : ''}`;
        msgMetadata = {
          video_url: cleanVideoUrl,
          content_url: cleanVideoUrl,
          media_url: cleanVideoUrl,
          notes: cleanNotes,
          feedback: cleanNotes,
          action: 'deliverable_submitted'
        };
        notifType = isUgc ? 'ugc_deliverable_submitted' : 'deal_deliverable_submitted';
        notifTitle = isUgc ? 'UGC Deliverable Submitted' : 'Content Deliverable Submitted';
        notifMessage = `🎥 Deliverable submitted! Creator has uploaded content for your review.`;
        notifLink = isUgc ? '/brand/ugc/orders' : `/messages/${targetThreadId}`;
        break;
      }

      case 'REQUEST_REVISION': {
        const nextUsed = currentUsed + 1;
        orderStatus = 'REVISION_REQ';
        threadStatus = 'ACTIVE';
        orderUpdates = {
          ...orderUpdates,
          status: 'REVISION_REQ',
          revisions_used: nextUsed,
          creator_notes: cleanNotes ? `Revision feedback: ${cleanNotes}` : undefined,
          revision_feedback: cleanNotes
        };
        threadUpdates = {
          ...threadUpdates,
          status: 'ACTIVE',
          flow_state: 'REVISION_REQ',
          revision_notes: cleanNotes
        };
        msgType = 'revision_requested';
        msgText = `Brand requested a revision: ${cleanNotes || 'Please review feedback and upload an updated draft.'}`;
        msgMetadata = {
          feedback: cleanNotes,
          notes: cleanNotes,
          revision_notes: cleanNotes,
          revisions_used: nextUsed,
          action: 'revision_requested'
        };
        notifType = 'ugc_revision_requested';
        notifTitle = 'Revision Requested';
        const displaySnippet = cleanNotes && cleanNotes.length > 80 ? cleanNotes.substring(0, 77) + '...' : (cleanNotes || 'Please review feedback');
        notifMessage = `📝 Brand requested a revision: "${displaySnippet}"`;
        notifLink = '/creator/ugc/orders';
        break;
      }

      case 'APPROVE': {
        orderStatus = 'COMPLETED';
        threadStatus = 'COMPLETED';
        orderUpdates = {
          ...orderUpdates,
          status: 'COMPLETED',
          payment_status: 'RELEASED',
          escrow_released_at: nowIso
        };
        threadUpdates = {
          ...threadUpdates,
          status: 'COMPLETED',
          flow_state: 'COMPLETED'
        };
        msgType = 'content_approved';
        msgText = `🎉 UGC Deliverable Approved!\n\nThe brand has approved your deliverable. Escrow payout has been released to your account.`;
        msgMetadata = {
          action: 'approved',
          status: 'COMPLETED'
        };
        notifType = 'ugc_deliverable_approved';
        notifTitle = 'Deliverable Approved';
        notifMessage = '🎉 Congratulations! Your UGC deliverable has been approved and escrow payout released.';
        notifLink = '/creator/ugc/orders';
        break;
      }

      case 'DECLINE_REVISION': {
        orderStatus = 'DISPUTED';
        threadStatus = 'ACTIVE';
        orderUpdates = {
          ...orderUpdates,
          status: 'DISPUTED',
          creator_notes: cleanNotes ? `Revision declined: ${cleanNotes}` : 'Creator declined revision request'
        };
        threadUpdates = {
          ...threadUpdates,
          status: 'ACTIVE',
          flow_state: 'REVISION_DECLINED',
          revision_notes: cleanNotes
        };
        msgType = 'revision_declined';
        msgText = `⚠️ Creator Declined Revision Request\n\nReason: ${cleanNotes || 'Creator is unable to accommodate the requested changes.'}`;
        msgMetadata = {
          feedback: cleanNotes,
          notes: cleanNotes,
          action: 'revision_declined'
        };
        notifType = 'ugc_revision_declined';
        notifTitle = 'Revision Declined by Creator';
        const displaySnippet = cleanNotes && cleanNotes.length > 80 ? cleanNotes.substring(0, 77) + '...' : (cleanNotes || 'Unable to accommodate changes');
        notifMessage = `⚠️ Creator declined revision: "${displaySnippet}"`;
        notifLink = '/brand/ugc/orders';
        break;
      }

      case 'CANCEL': {
        orderStatus = 'CANCELLED';
        threadStatus = 'COMPLETED';
        const refundAmount = Number(order?.escrow_amount || order?.creator_payout || order?.agreed_amount || 0);
        orderUpdates = {
          ...orderUpdates,
          status: 'CANCELLED',
          brand_status: 'CANCELLED',
          creator_status: 'CANCELLED',
          payment_status: 'REFUNDED',
          escrow_hold: false,
          escrow_released_at: nowIso,
          cancelled_at: nowIso,
          refunded_at: nowIso
        };
        threadUpdates = {
          ...threadUpdates,
          status: 'COMPLETED',
          flow_state: 'CANCELLED'
        };
        const actorLabel = actorRole === 'brand' ? 'Brand' : 'Creator';
        msgType = 'order_cancelled';
        msgText = `🚫 UGC Order Cancelled\n\n${actorLabel} has cancelled the order.${cleanNotes ? `\nReason: ${cleanNotes}` : ''}\nEscrow funds of ₹${refundAmount.toLocaleString('en-IN')} have been refunded.`;
        msgMetadata = {
          reason: cleanNotes,
          notes: cleanNotes,
          refund_amount: refundAmount,
          action: 'order_cancelled'
        };
        notifType = 'ugc_order_cancelled';
        notifTitle = 'UGC Order Cancelled & Escrow Refunded';
        notifMessage = `🚫 UGC Order was cancelled by ${actorLabel.toLowerCase()}. Escrow refunded.`;
        notifLink = (receiverRole === 'brand' ? '/brand/ugc/orders' : '/creator/ugc/orders');
        break;
      }
    }

    let supabaseOrderWriteFailed = false;
    let supabaseOrderWriteReason = "";
    
    if (!db.ugc_orders) db.ugc_orders = [];
    let localOrder = db.ugc_orders.find((o: any) => o.id === targetOrderId || o.id === rawId || o.brief_id === rawId);

    // 2. Persist to Supabase
    if (supabase) {
      if (action === 'APPROVE') {
        const grossAmount = Number(
          order?.escrow_amount ?? localOrder?.escrow_amount ??
          order?.creator_payout ?? localOrder?.creator_payout ??
          order?.agreed_amount ?? localOrder?.agreed_amount ?? 0
        );
        let feePercentage = 15;
        let platformFee = Math.round(((grossAmount * feePercentage) / 100) * 100) / 100;
        let netAmount = Math.max(0, Math.round((grossAmount - platformFee) * 100) / 100);
        try {
          const feeCalc = await calculatePlatformFee(grossAmount, (privilegedSupabase || supabase));
          if (feeCalc) {
            feePercentage = Number(feeCalc.feePercent ?? feePercentage);
            platformFee = Number(feeCalc.platformFee ?? platformFee);
            netAmount = Number(feeCalc.creatorNet ?? netAmount);
          }
        } catch (e) {
          console.warn("[syncUgcLifecycleEvent] calculatePlatformFee failed, using 15% default:", e);
        }

        const releaseFields = {
          status: 'SUCCESS',
          payout_status: 'PAID',
          payout_type: 'full',
          gross_amount: grossAmount,
          platform_fee_amount: platformFee,
          creator_net_amount: netAmount,
          payout_completed_at: nowIso
        };

        const { data: released, error: relErr } = await (privilegedSupabase || supabase)
          .from('transactions')
          .update(releaseFields)
          .eq('ugc_order_id', targetOrderId)
          .select('id');

        if (relErr) {
          console.error("[syncUgcLifecycleEvent] transactions release error:", relErr);
          return { error: `Failed to update transaction: ${relErr.message}`, _status: 500 };
        } else if (!released || released.length === 0) {
          const { error: insErr } = await (privilegedSupabase || supabase)
            .from('transactions')
            .insert({
              id: crypto.randomUUID(),
              ugc_order_id: targetOrderId,
              creator_id: creatorId,
              gst_amount: 0,
              created_at: nowIso,
              ...releaseFields
            });
          if (insErr) {
            console.error("[syncUgcLifecycleEvent] transactions release insert error:", insErr);
            return { error: `Failed to insert transaction: ${insErr.message}`, _status: 500 };
          }
        }

        if (!db.transactions) db.transactions = [];
        const localTxn = db.transactions.find((t: any) =>
          t.ugc_order_id === targetOrderId || t.deal_id === targetOrderId
        );
        if (localTxn) {
          Object.assign(localTxn, releaseFields);
        } else {
          db.transactions.unshift({
            id: crypto.randomUUID(),
            ugc_order_id: targetOrderId,
            creator_id: creatorId,
            gst_amount: 0,
            created_at: nowIso,
            ...releaseFields
          });
        }

        msgMetadata = {
          ...msgMetadata,
          amount: grossAmount,
          gross_amount: grossAmount,
          platform_fee_percent: feePercentage,
          platform_fee_amount: platformFee,
          creator_net_amount: netAmount,
          payout_status: 'RELEASED'
        };
      }

      const SUPABASE_UGC_ORDER_COLS = new Set([
        'id', 'brief_id', 'brand_id', 'creator_id', 'status', 'creator_payout',
        'video_url', 'thumbnail_url', 'creator_notes', 'payment_status', 'created_at',
        'internal_deadline', 'agreement_signed_creator', 'escrow_hold', 'escrow_amount',
        'escrow_held_at', 'escrow_released_at', 'revision_count', 'revisions_used',
        'agreed_amount', 'delivered_at', 'cancelled_at'
      ]);

      const FEEDBACK_ONLY_ORDER_COLS = ['revision_feedback', 'revision_notes'];
      const FEEDBACK_ONLY_THREAD_COLS = ['revision_notes', 'revision_feedback'];
      const supaOrderUpdates: any = {};
      for (const [k, v] of Object.entries(orderUpdates)) {
        if (SUPABASE_UGC_ORDER_COLS.has(k) && v !== undefined) {
          supaOrderUpdates[k] = v;
        }
      }

      const SUPABASE_CHAT_THREAD_COLS = new Set([
        'id', 'deal_id', 'campaign_id', 'creator_id', 'brand_id', 'status', 'flow_state',
        'agreed_amount', 'deliverables', 'deadline', 'revision_count',
        'agreement_signed_creator', 'agreement_signed_brand', 'agreement_signed_at',
        'created_at', 'updated_at'
      ]);
      const supaThreadUpdates: any = {};
      for (const [k, v] of Object.entries(threadUpdates)) {
        if (SUPABASE_CHAT_THREAD_COLS.has(k) && v !== undefined) {
          supaThreadUpdates[k] = v;
        }
      }

      const isExplicitCampaign = isCampaignThread(thread || { id: rawId });

      if (!isExplicitCampaign) {
        try {
          const { data: updatedRows, error: oErr } = await (privilegedSupabase || supabase)
            .from('ugc_orders')
            .update(supaOrderUpdates)
            .or(`id.eq.${targetOrderId},brief_id.eq.${rawId}`)
            .select('id');
          if (oErr) {
            console.error("[syncUgcLifecycleEvent] Supabase ugc_orders update error:", oErr);
            supabaseOrderWriteFailed = true;
            supabaseOrderWriteReason = oErr.message || String(oErr);
          } else if (!updatedRows || updatedRows.length === 0) {
            const { data: retryRows, error: retryErr } = await (privilegedSupabase || supabase)
              .from('ugc_orders')
              .update(supaOrderUpdates)
              .eq('id', targetOrderId)
              .select('id');
            if (retryErr || !retryRows || retryRows.length === 0) {
              console.error(
                "[syncUgcLifecycleEvent] ugc_orders update matched 0 rows.",
                { targetOrderId, rawId, action, retryError: retryErr?.message || null }
              );
              supabaseOrderWriteFailed = true;
              supabaseOrderWriteReason = retryErr?.message
                || `No ugc_orders row matched id=${targetOrderId}`;
            }
          }
        } catch (e: any) {
          console.error("[syncUgcLifecycleEvent] Supabase ugc_orders update error:", e);
          supabaseOrderWriteFailed = true;
          supabaseOrderWriteReason = e?.message || String(e);
        }
      } else {
        const campaignDealId = getCampaignDealId(thread || { id: rawId, deal_id: targetDealId });
        if (campaignDealId) {
          try {
            const dealStatusUpdate = action === 'SUBMIT_DELIVERABLE' ? 'CONTENT_SUBMITTED'
              : action === 'REQUEST_REVISION' ? 'ACTIVE'
              : action === 'APPROVE' ? 'CONTENT_APPROVED'
              : action === 'CANCEL' ? 'CANCELLED' : undefined;
            if (dealStatusUpdate) {
              const dealPayload: any = {
                status: dealStatusUpdate,
                updated_at: nowIso
              };
              if (action === 'REQUEST_REVISION') {
                dealPayload.revisions_used = currentUsed + 1;
              }
              await (privilegedSupabase || supabase)
                .from('deals')
                .update(dealPayload)
                .eq('id', campaignDealId);
            }
          } catch (e) {
            console.warn("[syncUgcLifecycleEvent] Supabase deals update warning:", e);
          }
        }
      }

      try {
        const { error: tErr } = await (privilegedSupabase || supabase)
          .from('chat_threads')
          .update(supaThreadUpdates)
          .or(`id.eq.${targetThreadId},deal_id.eq.${targetOrderId}`);
        if (tErr) console.error("[syncUgcLifecycleEvent] Supabase chat_threads update error:", tErr);
      } catch (e) {
        console.error("[syncUgcLifecycleEvent] Supabase chat_threads update error:", e);
      }

      if (action === 'REQUEST_REVISION' || action === 'SUBMIT_DELIVERABLE') {
        const feedbackValue = action === 'REQUEST_REVISION' ? cleanNotes : null;

        const orderFeedback: any = {};
        for (const col of FEEDBACK_ONLY_ORDER_COLS) {
          if (orderUpdates[col] !== undefined || action === 'SUBMIT_DELIVERABLE') {
            orderFeedback[col] = feedbackValue;
          }
        }
        if (Object.keys(orderFeedback).length > 0 && !isExplicitCampaign) {
          try {
            const { error: fErr } = await (privilegedSupabase || supabase)
              .from('ugc_orders')
              .update(orderFeedback)
              .eq('id', targetOrderId);
            if (fErr) {
              console.warn("[syncUgcLifecycleEvent] revision feedback columns not written on ugc_orders:", fErr.message || fErr);
            }
          } catch (e: any) {
            console.warn("[syncUgcLifecycleEvent] revision feedback write skipped (ugc_orders):", e?.message || e);
          }
        }

        const threadFeedback: any = {};
        for (const col of FEEDBACK_ONLY_THREAD_COLS) {
          threadFeedback[col] = feedbackValue;
        }
        try {
          const { error: tfErr } = await (privilegedSupabase || supabase)
            .from('chat_threads')
            .update(threadFeedback)
            .eq('id', targetThreadId);
          if (tfErr) {
            console.warn("[syncUgcLifecycleEvent] revision feedback columns not written on chat_threads:", tfErr.message || tfErr);
          }
        } catch (e: any) {
          console.warn("[syncUgcLifecycleEvent] revision feedback write skipped (chat_threads):", e?.message || e);
        }
      }

      if (action === 'SUBMIT_DELIVERABLE') {
        try {
          await (privilegedSupabase || supabase).from('content_submissions').insert({
            id: crypto.randomUUID(),
            deal_id: subDealId,
            creator_id: creatorId,
            submission_type: 'draft',
            video_url: cleanVideoUrl,
            caption: "",
            notes_to_brand: cleanNotes,
            status: 'PENDING_REVIEW',
            submitted_at: nowIso
          });
        } catch (e) {
          console.warn("[syncUgcLifecycleEvent] content_submissions insert warning:", e);
        }
      }

      if (action === 'CANCEL') {
        const refundAmount = Number(order?.escrow_amount || order?.creator_payout || order?.agreed_amount || 0);
        try {
          const { error: txnErr } = await (privilegedSupabase || supabase).from('transactions').insert({
            id: crypto.randomUUID(),
            deal_id: isUuid(targetOrderId) ? targetOrderId : null,
            ugc_order_id: targetOrderId,
            creator_id: creatorId,
            gross_amount: refundAmount,
            platform_fee_amount: 0,
            creator_net_amount: 0,
            gst_amount: 0,
            status: 'SUCCESS',
            refund_amount: refundAmount,
            refund_status: 'PROCESSED',
            refund_reason: cleanNotes ? `Order cancelled: ${cleanNotes}` : 'Order cancelled by user',
            refund_reference: `REFUND_${Date.now()}`,
            created_at: nowIso,
            refunded_at: nowIso
          });
          if (txnErr) console.warn("[syncUgcLifecycleEvent] Supabase transaction refund insert error:", txnErr);
        } catch (e) {
          console.warn("[syncUgcLifecycleEvent] Supabase transaction refund insert warning:", e);
        }

        try {
          const briefId = order?.brief_id;
          if (briefId) {
            const { data: b } = await (privilegedSupabase || supabase).from('ugc_briefs').select('claimed_count').eq('id', briefId).maybeSingle();
            const newCount = Math.max(0, (b?.claimed_count || 1) - 1);
            await (privilegedSupabase || supabase).from('ugc_briefs').update({
              claimed_count: newCount,
              status: 'OPEN'
            }).eq('id', briefId);
          }
        } catch (e) {}
      }

      if (action === 'APPROVE') {
        try {
          const briefId = order?.brief_id || localOrder?.brief_id;
          if (briefId) {
            const { data: siblingOrders } = await (privilegedSupabase || supabase)
              .from('ugc_orders')
              .select('id, status, payment_status')
              .eq('brief_id', briefId);

            const allOrdersCompleted = (siblingOrders || []).every((so: any) =>
              so.id === targetOrderId ||
              ['COMPLETED', 'PAID', 'RELEASED'].includes(String(so.status).toUpperCase()) ||
              ['RELEASED', 'PAID'].includes(String(so.payment_status).toUpperCase())
            );

            if (allOrdersCompleted) {
              await (privilegedSupabase || supabase)
                .from('ugc_briefs')
                .update({ status: 'COMPLETED' })
                .eq('id', briefId);
            }
          }
        } catch (e) {
          console.warn("[syncUgcLifecycleEvent] Brief status COMPLETED update error:", e);
        }
      }
    }

    if (isUgc && supabaseOrderWriteFailed) {
      return {
        error: `Failed to update order in database: ${supabaseOrderWriteReason}`,
        _status: 500
      };
    }

    // 3. Persist to Local DB
    if (isUgc) {
      if (localOrder) {
        Object.assign(localOrder, orderUpdates);
      } else if (order) {
        localOrder = { ...order, ...orderUpdates };
        db.ugc_orders.push(localOrder);
      }
    } else if (targetDealId) {
      if (db.deals) {
        const d = db.deals.find((x: any) => x.id === targetDealId || x.deal_id === targetDealId);
        if (d) {
          if (action === 'SUBMIT_DELIVERABLE') {
            d.status = 'CONTENT_SUBMITTED';
            d.stage = 'CONTENT_SUBMITTED';
          }
          d.updated_at = nowIso;
        }
      }
      if (db.collabs) {
        const c = db.collabs.find((x: any) => x.collab_id === targetDealId || x.id === targetDealId);
        if (c) {
          if (action === 'SUBMIT_DELIVERABLE') {
            c.status = 'CONTENT_SUBMITTED';
            c.stage = 'CONTENT_SUBMITTED';
          }
          c.updated_at = nowIso;
        }
      }
    }

    if (!db.chat_threads) db.chat_threads = [];
    let localThread = db.chat_threads.find((t: any) => t.id === targetThreadId || t.deal_id === targetOrderId || t.id === targetOrderId);
    if (localThread) {
      Object.assign(localThread, threadUpdates);
      if (action === 'SUBMIT_DELIVERABLE') {
        delete localThread.revision_notes;
        delete localThread.revision_feedback;
      }
      if (localThread.ugc_order) {
        Object.assign(localThread.ugc_order, orderUpdates);
        if (action === 'SUBMIT_DELIVERABLE') {
          delete localThread.ugc_order.revision_notes;
          delete localThread.ugc_order.revision_feedback;
        }
      }
    } else if (thread) {
      localThread = { ...thread, ...threadUpdates };
      if (action === 'SUBMIT_DELIVERABLE') {
        delete localThread.revision_notes;
        delete localThread.revision_feedback;
      }
      db.chat_threads.push(localThread);
    }

    if (action === 'SUBMIT_DELIVERABLE') {
      if (!db.content_submissions) db.content_submissions = [];
      db.content_submissions.push({
        id: crypto.randomUUID(),
        deal_id: subDealId,
        creator_id: creatorId,
        submission_type: 'draft',
        video_url: cleanVideoUrl,
        caption: "",
        notes_to_brand: cleanNotes,
        status: 'PENDING_REVIEW',
        submitted_at: nowIso
      });
    }

    if (action === 'CANCEL') {
      const refundAmount = Number(order?.escrow_amount || localOrder?.escrow_amount || order?.creator_payout || localOrder?.creator_payout || order?.agreed_amount || localOrder?.agreed_amount || 0);
      const refundTxnId = `txn_ref_${Date.now()}_${crypto.randomUUID().slice(0, 6)}`;
      const refundTxnPayload = {
        id: crypto.randomUUID(),
        transaction_id: refundTxnId,
        deal_id: null,
        ugc_order_id: targetOrderId,
        brief_id: order?.brief_id || localOrder?.brief_id || null,
        brand_id: brandId,
        creator_id: creatorId,
        gross_amount: refundAmount,
        platform_fee_amount: 0,
        creator_net_amount: 0,
        gst_amount: 0,
        status: 'REFUNDED',
        escrow_hold: false,
        payout_status: 'REFUNDED',
        payout_type: 'refund',
        refund_amount: refundAmount,
        refund_status: 'PROCESSED',
        refund_reason: cleanNotes ? `Order cancelled: ${cleanNotes}` : 'Order cancelled by user',
        refund_reference: `REFUND_${Date.now()}`,
        created_at: nowIso,
        refunded_at: nowIso
      };

      if (!db.transactions) db.transactions = [];
      db.transactions.unshift(refundTxnPayload);

      const priorTxn = db.transactions.find((t: any) => 
        (t.ugc_order_id && t.ugc_order_id === targetOrderId) || 
        (t.deal_id && t.deal_id === targetOrderId) || 
        ((order?.brief_id || localOrder?.brief_id) && t.brief_id === (order?.brief_id || localOrder?.brief_id))
      );
      if (priorTxn && priorTxn !== refundTxnPayload) {
        priorTxn.escrow_hold = false;
        priorTxn.status = 'REFUNDED';
        priorTxn.refund_status = 'PROCESSED';
        priorTxn.refund_amount = refundAmount;
        priorTxn.refunded_at = nowIso;
      }

      const briefId = order?.brief_id || localOrder?.brief_id;
      if (briefId && db.ugc_briefs) {
        const brief = db.ugc_briefs.find((b: any) => b.id === briefId);
        if (brief) {
          brief.claimed_count = Math.max(0, (brief.claimed_count || 1) - 1);
          brief.status = 'OPEN';
        }
      }
    }

    if (action === 'APPROVE') {
      const briefId = order?.brief_id || localOrder?.brief_id;
      if (briefId && db.ugc_briefs) {
        const brief = db.ugc_briefs.find((b: any) => b.id === briefId);
        if (brief) {
          const siblingOrders = (db.ugc_orders || []).filter((o: any) => o.brief_id === briefId);
          const allOrdersCompleted = siblingOrders.every((so: any) =>
            so.id === targetOrderId ||
            ['COMPLETED', 'PAID', 'RELEASED'].includes(String(so.status).toUpperCase()) ||
            ['RELEASED', 'PAID'].includes(String(so.payment_status).toUpperCase())
          );
          if (allOrdersCompleted) {
            brief.status = 'COMPLETED';
          }
        }
      }
    }

    // 4. Create and persist Chat Message
    const msgId = crypto.randomUUID();
    const senderUserId = actorUser?.user_id || (actorRole === 'brand' ? brandId : creatorId) || '';
    const msgPayload = {
      message_id: msgId,
      thread_id: targetThreadId,
      sender_user_id: senderUserId,
      receiver_user_id: receiverId,
      text: msgText,
      from_name: actorName,
      message_type: msgType,
      metadata: msgMetadata,
      created_at: nowIso,
      read: false
    };

    if (supabase) {
      try {
        await insertChatMessageToSupabase(msgPayload);
      } catch (e) {
        console.error("[syncUgcLifecycleEvent] Chat message insert error:", e);
      }
    }

    const localMsgObj = {
      ...msgPayload,
      id: msgId,
      content: msgText,
      sender_id: senderUserId,
      receiver_id: receiverId,
      sender_role: actorRole,
      message_type: msgType,
      media_url: cleanVideoUrl || undefined,
      content_url: cleanVideoUrl || undefined,
      metadata: msgMetadata
    };

    if (!db.chat_messages) db.chat_messages = [];
    db.chat_messages.push(localMsgObj);

    let localPayoutMsgObj: any = null;
    if (action === 'APPROVE') {
      const payoutMsgId = `msg_${crypto.randomUUID().replace(/-/g, '').slice(0, 12)}`;
      const payoutGross = Number(msgMetadata?.gross_amount || orderUpdates?.agreed_amount || order?.creator_payout || 0);
      const payoutFee = Number(msgMetadata?.platform_fee_amount || 0);
      const payoutNet = Number(msgMetadata?.creator_net_amount || (payoutGross - payoutFee));
      const payoutFeePct = Number(msgMetadata?.platform_fee_percent || 15);
      const payoutText = `💸 Payout Released! ₹${payoutNet.toLocaleString('en-IN')} (₹${payoutGross.toLocaleString('en-IN')} gross minus ${payoutFeePct}% platform fee of ₹${payoutFee.toLocaleString('en-IN')}) has been released from escrow to the creator.`;
      
      const payoutPayload = {
        message_id: payoutMsgId,
        thread_id: targetThreadId,
        sender_user_id: senderUserId,
        receiver_user_id: receiverId,
        text: payoutText,
        from_name: 'System',
        sender_role: 'system',
        message_type: 'payout_released',
        metadata: {
          action: 'payout_released',
          status: 'RELEASED',
          payout_status: 'RELEASED',
          gross_amount: payoutGross,
          amount: payoutGross,
          platform_fee_percent: payoutFeePct,
          platform_fee_amount: payoutFee,
          creator_net_amount: payoutNet,
          net_amount: payoutNet,
          is_ugc: true,
          order_id: targetOrderId,
          disbursed_at: nowIso
        },
        created_at: new Date(Date.now() + 500).toISOString(),
        read: false
      };

      if (supabase) {
        try {
          await insertChatMessageToSupabase(payoutPayload);
        } catch (e) {
          console.error("[syncUgcLifecycleEvent] Payout message insert error:", e);
        }
      }

      localPayoutMsgObj = {
        ...payoutPayload,
        id: payoutMsgId,
        content: payoutText,
        sender_id: senderUserId,
        receiver_id: receiverId,
        sender_role: 'system',
        message_type: 'payout_released'
      };

      db.chat_messages.push(localPayoutMsgObj);
    }

    // 5. Create and persist Notification
    let notifObj: any = null;
    if (receiverId) {
      const notifId = `notif_${crypto.randomUUID().replace(/-/g, '').substring(0, 10)}`;
      notifObj = {
        notif_id: notifId,
        user_id: receiverId,
        type: notifType,
        title: notifTitle,
        message: notifMessage,
        event_type: notifType,
        event_ref_id: targetOrderId,
        role_context: receiverRole,
        subtype: 'general',
        read: false,
        created_at: nowIso,
        link: notifLink
      };

      if (supabase) {
        try {
          const { link: _l, ...supaNotif } = notifObj;
          await (privilegedSupabase || supabase).from('notifications').insert(supaNotif);
        } catch (e) {
          console.warn("[syncUgcLifecycleEvent] Notification insert warning:", e);
        }
      }

      if (!db.notifications) db.notifications = [];
      db.notifications.unshift(notifObj);
    }

    saveDb(db);

    // 6. Broadcast Realtime Socket.io events
    if (io) {
      io.to(targetThreadId).emit("new_message", localMsgObj);
      if (localPayoutMsgObj) {
        io.to(targetThreadId).emit("new_message", localPayoutMsgObj);
      }
      const socketThreadPayload = {
        threadId: targetThreadId,
        id: targetThreadId,
        deal_id: targetOrderId,
        status: threadStatus,
        flow_state: threadUpdates.flow_state,
        revision_notes: action === 'REQUEST_REVISION' ? cleanNotes : null,
        revision_feedback: action === 'REQUEST_REVISION' ? cleanNotes : null,
        submitted_video_url: action === 'SUBMIT_DELIVERABLE' ? cleanVideoUrl : (thread?.submitted_video_url || undefined),
        content_url: action === 'SUBMIT_DELIVERABLE' ? cleanVideoUrl : undefined,
        video_url: action === 'SUBMIT_DELIVERABLE' ? cleanVideoUrl : undefined,
        creator_notes: action === 'SUBMIT_DELIVERABLE' ? cleanNotes : undefined,
        ugc_order: {
          ...(order || localOrder || {}),
          ...orderUpdates,
          id: targetOrderId,
          status: orderStatus,
          revision_notes: action === 'REQUEST_REVISION' ? cleanNotes : null,
          revision_feedback: action === 'REQUEST_REVISION' ? cleanNotes : null,
          payment_status: orderUpdates.payment_status || (action === 'APPROVE' ? 'RELEASED' : (order?.payment_status || 'PENDING'))
        }
      };
      io.to(targetThreadId).emit("thread_updated", socketThreadPayload);
      io.emit("thread_updated", socketThreadPayload);
      io.emit("ugc_order_updated", {
        orderId: targetOrderId,
        status: orderStatus,
        stage: orderStatus === 'COMPLETED' ? 'COMPLETED' : orderStatus,
        payment_status: orderUpdates.payment_status || (action === 'APPROVE' ? 'RELEASED' : (order?.payment_status || 'PENDING')),
        order: {
          ...(order || localOrder || {}),
          ...orderUpdates,
          id: targetOrderId,
          status: orderStatus,
          payment_status: orderUpdates.payment_status || (action === 'APPROVE' ? 'RELEASED' : (order?.payment_status || 'PENDING'))
        }
      });

      if (receiverId) {
        io.to(receiverId).to(`user_${receiverId}`).emit("notification", {
          type: notifType,
          title: notifTitle,
          message: notifMessage,
          link: notifLink,
          order_id: targetOrderId,
          thread_id: targetThreadId
        });
      }
    }

    return {
      ok: true,
      success: true,
      action,
      order_id: targetOrderId,
      thread_id: targetThreadId,
      status: orderStatus,
      message_id: msgId,
      message_text: msgText,
      chat_message: localMsgObj,
      notification: notifObj,
      order: { ...(order || {}), ...(localOrder || {}), ...orderUpdates }
    };
  };
}
