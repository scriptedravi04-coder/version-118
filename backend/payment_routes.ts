import express from "express";
import crypto from "crypto";
import Razorpay from "razorpay";
import { getRazorpay } from "./helpers";
import { calculateFee as calculatePlatformFee } from "../src/utils/feeCalculator";
import { decideSignatureCheck } from "./paymentTestMode";

// All payment, escrow, and payout-related routes: Razorpay order creation
// and verification, admin transaction/refund management, admin escrow
// overview and manual payout release, and creator-facing transaction/
// payout-eligibility endpoints.
//
// Extracted from server.ts as part of an ongoing, incremental effort to
// split the single giant startServer() function into smaller, focused
// files. Every dependency this code needs from the outer server.ts scope
// (the Supabase clients, in-memory db helpers, auth, notifications, etc.)
// is passed in explicitly rather than relied on via closure, so this file
// has no hidden coupling to server.ts beyond what's listed below.
export function setupPaymentRoutes(
  app: express.Application,
  router: express.Router,
  {
    supabase,
    privilegedSupabase,
    getDb,
    saveDb,
    parseAuthUser,
    logAdminAction,
    sendNotification,
    fetchUserScopedTransactions,
    serializeChatMessage,
    insertChatMessageToSupabase,
    parseThreadState,
    getIsTestMode,
  }: {
    supabase: any;
    privilegedSupabase: any;
    getDb: () => any;
    saveDb: (db: any) => void;
    parseAuthUser: (req: express.Request) => Promise<any>;
    logAdminAction: (user: any, action: string, targetType: string, targetId: string, details?: any) => Promise<any>;
    sendNotification: (db: any, userId: string, type: string, message: string) => Promise<any>;
    fetchUserScopedTransactions: (userId: string, role?: string) => Promise<any[]>;
    serializeChatMessage: (a?: any, b?: any, c?: any, d?: any) => any;
    insertChatMessageToSupabase: (payload: any) => Promise<any>;
    parseThreadState: (thread: any) => any;
    getIsTestMode: () => boolean;
  }
) {
  const getIsoNow = () => new Date().toISOString();
  const threadAlertCooldowns = new Map<string, number>();

  router.get("/transactions", async (req, res) => {
    const user = await parseAuthUser(req);
    if (!user) return res.status(403).json({ detail: "Not authenticated", _status: 403 });

    try {
      const txns = await fetchUserScopedTransactions(user.user_id, user.role);
      return res.json(txns);
    } catch (err) {
      console.error("[/transactions] Exception fetching transactions:", err);
      return res.json([]);
    }
  });


  router.get("/escrow-transactions", async (req, res) => {
    const user = await parseAuthUser(req);
    if (!user) return res.status(403).json({ detail: "Not authenticated", _status: 403 });

    try {
      const data = await fetchUserScopedTransactions(user.user_id, user.role);

      const mapped = (data || []).map((e: any, idx: number) => ({
        id: e.id || `et-${idx}`,
        contract_id: e.contract_id || `CTR-${String(e.deal_id || e.id || "0000").slice(0, 8).toUpperCase()}`,
        brand_id: e.brand_id,
        creator_id: e.creator_id,
        creator_name: e.users?.name || e.creator_name || "Creator Pro",
        amount: Number(e.gross_amount || e.amount || 0),
        gross_amount: Number(e.gross_amount || 0),
        creator_net_amount: Number(e.creator_net_amount || 0),
        status: (e.payout_status === 'RELEASED' || e.payout_status === 'PAID')
          ? "released"
          : ["COMPLETED"].includes((e.status || "").toUpperCase())
            ? "released"
            : ["SUCCESS", "ACTIVE", "ESCROW_HELD"].includes((e.status || "").toUpperCase())
              ? "held"
              : (e.status || "held").toLowerCase(),
        payout_status: e.payout_status,
        payout_reference: e.payout_reference,
        escrow_hold: e.escrow_hold,
        created_at: e.created_at || new Date().toISOString(),
        payout_completed_at: e.payout_completed_at || null,
        payout_released_at: e.payout_released_at || e.payout_completed_at || null,
        is_brand_approved: e.is_brand_approved,
        deal_status: e.deal_status
      }));

      res.json(mapped);
    } catch (err) {
      console.error("[/escrow-transactions] Exception:", err);
      res.json([]);
    }
  });


  router.get("/creator/payout-eligible-deals", async (req, res) => {
    const user = await parseAuthUser(req);
    if (!user) return res.status(403).json({ error: "Unauthorized" });

    try {
      const userId = user.user_id || user.id;
      let eligible: any[] = [];

      if (supabase) {
        try {
          const { data: dealsData } = await (privilegedSupabase || supabase)
            .from('deals')
            .select('*, campaigns(title), transactions(*)')
            .eq('creator_id', userId)
            .in('status', ['COMPLETED', 'APPROVED', 'PROOF_SUBMITTED'])
            .order('updated_at', { ascending: false });

          if (dealsData) {
            eligible = dealsData.map((d: any) => {
              const tx = Array.isArray(d.transactions) ? d.transactions[0] : d.transactions;
              return {
                id: d.id,
                deal_id: d.id,
                campaign_title: d.campaigns?.title || d.campaign_title || 'Collab Campaign',
                agreed_amount: Number(d.agreed_amount || d.budget || 5000),
                status: d.status,
                payout_status: tx?.payout_status || (d.status === 'COMPLETED' ? 'RELEASED' : 'PENDING'),
                net_amount: Number(tx?.creator_net_amount || (Number(d.agreed_amount || 5000) * 0.85)),
                created_at: d.created_at,
                updated_at: d.updated_at
              };
            });
          }
        } catch (e) {
          console.warn("[payout-eligible-deals] Supabase error:", e);
        }
      }

      if (eligible.length === 0) {
        const db = getDb();
        const localDeals = (db.deals || []).filter((d: any) => 
          (d.creator_id === userId || d.creatorId === userId) && 
          ['COMPLETED', 'APPROVED'].includes(d.status)
        );
        eligible = localDeals.map((d: any) => {
          const tx = (db.transactions || []).find((t: any) => t.deal_id === d.id);
          return {
            id: d.id,
            deal_id: d.id,
            campaign_title: d.campaign_title || 'Collab Campaign',
            agreed_amount: Number(d.agreed_amount || 5000),
            status: d.status,
            payout_status: tx?.payout_status || 'RELEASED',
            net_amount: Number(tx?.creator_net_amount || (Number(d.agreed_amount || 5000) * 0.85)),
            created_at: d.created_at,
            updated_at: d.updated_at
          };
        });
      }

      return res.json(eligible);
    } catch (err: any) {
      console.error("[/creator/payout-eligible-deals] Exception:", err);
      return res.json([]);
    }
  });



  router.get("/creator/payment-methods", async (req, res) => {
    try {
      const user = await parseAuthUser(req);
      if (!user || user.role !== "creator") {
        return res.status(403).json({ error: "Only creators can access payment methods" });
      }

      const db = getDb();
      db.creator_payment_methods = db.creator_payment_methods || [];
      const methods = db.creator_payment_methods.filter((m: any) => m.user_id === user.user_id);
      
      res.json(methods);
    } catch (e: any) {
      console.error("Error fetching payment methods:", e);
      res.status(500).json({ error: e.message || "Failed to fetch payment methods" });
    }
  });

  router.post("/creator/payment-methods", async (req, res) => {
    try {
      const user = await parseAuthUser(req);
      if (!user || user.role !== "creator") {
        return res.status(403).json({ error: "Only creators can modify payment methods" });
      }

      let bank_account_number, bank_ifsc, upi_id, account_holder_name;
      
      if (req.body.method_type) {
        // Handling { method_type, account_details } payload from frontend
        if (req.body.method_type === 'UPI') {
           upi_id = req.body.account_details?.upi_id;
        } else {
           bank_account_number = req.body.account_details?.account_no;
           bank_ifsc = req.body.account_details?.ifsc;
           account_holder_name = req.body.account_details?.holder_name;
        }
      } else {
        // Handling flat payload
        ({ bank_account_number, bank_ifsc, upi_id, account_holder_name } = req.body);
      }
      const db = getDb();
      db.creator_payment_methods = db.creator_payment_methods || [];
      
      // Upsert method (assuming one active method per user for now)
      let method = db.creator_payment_methods.find((m: any) => m.user_id === user.user_id);
      if (method) {
        method.bank_account_number = bank_account_number;
        method.bank_ifsc = bank_ifsc;
        method.upi_id = upi_id;
        method.account_holder_name = account_holder_name;
        method.updated_at = new Date().toISOString();
      } else {
        method = {
          id: "pm_" + Date.now() + "_" + Math.random().toString(36).substring(2,7),
          user_id: user.user_id,
          bank_account_number,
          bank_ifsc,
          upi_id,
          account_holder_name,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        db.creator_payment_methods.push(method);
      }
      saveDb(db);
      
      if (privilegedSupabase) {
        await privilegedSupabase.from('creator_payment_methods').upsert({
          user_id: user.user_id,
          bank_account_number,
          bank_ifsc,
          upi_id,
          account_holder_name,
          updated_at: new Date().toISOString()
        }, { onConflict: 'user_id' });
      }

      res.json({ success: true, method });
    } catch (e: any) {
      console.error("Error saving payment method:", e);
      res.status(500).json({ error: e.message || "Failed to save payment method" });
    }
  });

  router.post("/creator/payout-request", async (req, res) => {
    const user = await parseAuthUser(req);
    if (!user) return res.status(403).json({ error: "Unauthorized" });

    const { deal_id, note } = req.body || {};
    if (!deal_id) return res.status(400).json({ error: "deal_id is required" });

    const nowIso = getIsoNow();
    try {
      if (supabase) {
        try {
          await (privilegedSupabase || supabase)
            .from('transactions')
            .update({
              payout_status: 'PROCESSING',
              notes: note || undefined,
              updated_at: nowIso
            })
            .eq('deal_id', deal_id);
        } catch (e) {
          console.warn("[payout-request] transactions update warning:", e);
        }
      }

      const db = getDb();
      if (db.transactions) {
        const tx = db.transactions.find((t: any) => t.deal_id === deal_id);
        if (tx) {
          tx.payout_status = 'PROCESSING';
          tx.updated_at = nowIso;
        }
      }
      saveDb(db);

      return res.json({
        success: true,
        message: "Payment request submitted to Admin! You will receive updates shortly.",
        deal_id,
        payout_status: 'PROCESSING'
      });
    } catch (err: any) {
      console.error("[/creator/payout-request] Exception:", err);
      return res.status(500).json({ error: "Failed to raise payout request" });
    }
  });


  router.get("/admin/transactions", async (req, res) => {
    const user = await parseAuthUser(req);
    if (!user || (user.role !== "admin" && user.role !== "sub_admin" && user.team_role !== "sub_admin")) {
      return res.status(403).json({ detail: "Admin only", _status: 403 });
    }

    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('transactions')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) {
          console.error("[/admin/transactions] Error fetching transactions:", error);
          return res.status(500).json({ detail: "Database error fetching transactions" });
        }
        return res.json(data || []);
      } catch (err) {
        console.error("[/admin/transactions] Exception fetching transactions:", err);
        return res.status(500).json({ detail: "Internal server error" });
      }
    } else {
      const db = getDb();
      return res.json(db.transactions || []);
    }
  });


  router.post("/admin/transactions/:id/refund", async (req, res) => {
    const user = await parseAuthUser(req);
    if (!user || (user.role !== 'admin' && user.role !== 'sub_admin' && user.team_role !== 'sub_admin')) {
      return res.status(403).json({ error: "Unauthorized. Admin privileges required." });
    }

    const { id } = req.params;
    const {
      refund_amount,
      refund_reason,
      refund_reference,
      refund_status,
      fee_correction_note
    } = req.body;

    const amountNum = Number(refund_amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      return res.status(400).json({ error: "Please enter a valid refund amount greater than 0." });
    }

    const targetStatus = (refund_status || 'PROCESSED').toUpperCase();
    if (targetStatus === 'PROCESSED' && (!refund_reference || !String(refund_reference).trim())) {
      return res.status(400).json({ error: "Reference / UTR number is required when marking a refund as PROCESSED." });
    }

    const cleanRef = refund_reference ? String(refund_reference).trim() : null;
    const cleanReason = refund_reason ? String(refund_reason).trim() : null;
    const cleanFeeNote = fee_correction_note ? String(fee_correction_note).trim() : null;
    const nowIso = getIsoNow();

    let updatedTx: any = null;

    if (supabase) {
      try {
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
        let findQuery = supabase.from('transactions').select('*');
        if (isUuid) {
          findQuery = findQuery.or(`id.eq.${id},zaakpay_order_id.eq.${id}`);
        } else {
          findQuery = findQuery.eq('zaakpay_order_id', id);
        }
        const { data: matched, error: findErr } = await findQuery;
        if (findErr) {
          console.error("[Admin Refund] Error finding transaction:", findErr);
        }

        const existingTx = matched && matched.length > 0 ? matched[0] : null;

        const updatePayload: any = {
          refund_amount: amountNum,
          refund_status: targetStatus,
          refund_reason: cleanReason,
          refund_reference: cleanRef,
          fee_correction_note: cleanFeeNote
        };

        if (targetStatus === 'PROCESSED') {
          updatePayload.refunded_at = nowIso;
          updatePayload.refunded_by = user.user_id;
        }

        if (existingTx) {
          let { data: updatedRows, error: updateErr } = await (privilegedSupabase || supabase)
            .from('transactions')
            .update({
              ...updatePayload,
              ...(targetStatus === 'PROCESSED' ? { status: 'REFUNDED' } : { status: 'REFUND_PENDING' })
            })
            .eq('id', existingTx.id)
            .select('*');

          if (updateErr && updateErr.message && updateErr.message.includes('transactions_status_check')) {
            const retryRes = await (privilegedSupabase || supabase)
              .from('transactions')
              .update(updatePayload)
              .eq('id', existingTx.id)
              .select('*');
            updatedRows = retryRes.data;
            updateErr = retryRes.error;
          }

          if (updateErr) {
            console.error("[Admin Refund] Supabase update error:", updateErr);
            return res.status(500).json({ error: updateErr.message || "Failed to update transaction refund record." });
          }
          updatedTx = updatedRows && updatedRows[0] ? updatedRows[0] : { ...existingTx, ...updatePayload };

          // If linked to a deal, release escrow hold on refund processing
          if (existingTx.deal_id && targetStatus === 'PROCESSED') {
            try {
              await (privilegedSupabase || supabase)
                .from('deals')
                .update({
                  escrow_hold: false,
                  updated_at: nowIso
                })
                .eq('id', existingTx.deal_id);
            } catch (dealErr) {
              console.warn("[Admin Refund] Could not update linked deal escrow_hold:", dealErr);
            }
          }
        }
      } catch (err: any) {
        console.error("[Admin Refund] Exception:", err);
      }
    }

    // Sync with mock database if transaction exists locally
    const db = getDb();
    if (!db.transactions) db.transactions = [];
    const localIdx = db.transactions.findIndex((t: any) => t.id === id || t.transaction_id === id || t.zaakpay_order_id === id);
    if (localIdx >= 0) {
      db.transactions[localIdx] = {
        ...db.transactions[localIdx],
        refund_amount: amountNum,
        refund_status: targetStatus,
        refund_reason: cleanReason,
        refund_reference: cleanRef,
        fee_correction_note: cleanFeeNote,
        status: targetStatus === 'PROCESSED' ? 'REFUNDED' : 'REFUND_PENDING',
        refunded_at: targetStatus === 'PROCESSED' ? nowIso : undefined,
        refunded_by: targetStatus === 'PROCESSED' ? user.user_id : undefined,
        updated_at: nowIso
      };
      if (!updatedTx) updatedTx = db.transactions[localIdx];
      saveDb(db);
    } else if (!updatedTx) {
      updatedTx = {
        id,
        refund_amount: amountNum,
        refund_status: targetStatus,
        refund_reason: cleanReason,
        refund_reference: cleanRef,
        fee_correction_note: cleanFeeNote,
        status: targetStatus === 'PROCESSED' ? 'REFUNDED' : 'REFUND_PENDING',
        refunded_at: targetStatus === 'PROCESSED' ? nowIso : undefined
      };
    }

    await logAdminAction(user, 'REFUND_TRANSACTION', 'TRANSACTION', id, {
      refund_amount: amountNum,
      refund_status: targetStatus,
      refund_reference: cleanRef,
      refund_reason: cleanReason
    });

    return res.json({
      success: true,
      transaction: updatedTx
    });
  });


  router.get("/admin/escrow/overview", async (req, res) => {
    const user = await parseAuthUser(req);
    if (!user || (user.role !== 'admin' && user.team_role !== 'sub_admin')) {
      return res.status(403).json({ error: "Unauthorized" });
    }
    if (!supabase) return res.status(500).json({ error: "DB not initialized" });

    try {
      const { data: txns, error } = await supabase
        .from('transactions')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;

      // Fetch related data with correct column names.
      //
      // These lookups are what turn the ledger into readable rows. Their errors used to be
      // dropped on the floor: one wrong column name here returns null, every map comes out
      // empty, and the panel quietly renders "Brand" / "Creator" / "UGC Content Deal"
      // placeholders with no clue why. Each one is now checked and named in the log.
      const [
        { data: deals, error: dealsErr },
        { data: ugcOrders, error: ugcOrdersErr },
        { data: ugcBriefs, error: ugcBriefsErr },
        { data: campaigns, error: campaignsErr },
        { data: users, error: usersErr },
        { data: brandProfiles, error: brandProfilesErr },
        { data: creatorProfiles, error: creatorProfilesErr }
      ] = await Promise.all([
        supabase.from('deals').select('id, status, campaign_id, brand_id, creator_id'),
        supabase.from('ugc_orders').select('id, brief_id, status, brand_id, creator_id'),
        supabase.from('ugc_briefs').select('id, title, product_name, brand_name, brand_id'),
        supabase.from('campaigns').select('campaign_id, title, brand_name, brand_user_id'),
        supabase.from('users').select('user_id, name, email'),
        supabase.from('brand_profiles').select('user_id, company_name'),
        supabase.from('creator_profiles').select('user_id, name, upi_id, vpa, bank_name, bank_account_number, account_number, bank_ifsc, ifsc_code, beneficiary_name, account_holder_name, payout_verified, bank_verified')
      ]);

      const lookupErrors: string[] = [];
      const noteLookupError = (label: string, err: any) => {
        if (!err) return;
        lookupErrors.push(label);
        console.error(`[admin/escrow/overview] ${label} lookup failed — names will fall back to placeholders:`, err.message || err);
      };
      noteLookupError('deals', dealsErr);
      noteLookupError('ugc_orders', ugcOrdersErr);
      noteLookupError('ugc_briefs', ugcBriefsErr);
      noteLookupError('campaigns', campaignsErr);
      noteLookupError('users', usersErr);
      noteLookupError('brand_profiles', brandProfilesErr);
      noteLookupError('creator_profiles', creatorProfilesErr);

      const dealsMap = new Map<string, any>((deals || []).map((d: any) => [d.id, d]));
      const ugcOrdersMap = new Map<string, any>((ugcOrders || []).map((u: any) => [u.id, u]));
      const ugcBriefsMap = new Map<string, any>((ugcBriefs || []).map((b: any) => [b.id, b]));
      const campaignsMap = new Map<string, any>((campaigns || []).map((c: any) => [c.campaign_id, c]));
      const usersMap = new Map<string, any>((users || []).map((u: any) => [u.user_id, u]));
      const brandProfilesMap = new Map<string, string>((brandProfiles || []).map((bp: any) => [bp.user_id, bp.company_name]));
      // The whole row, not just the name — the admin payout modal needs the UPI/bank fields
      // off the same record. creator_profiles is the source of truth for these; the copy
      // sometimes embedded on the transaction row is a snapshot that goes stale.
      const creatorProfilesMap = new Map<string, any>((creatorProfiles || []).map((cp: any) => [cp.user_id, cp]));

      const payoutAccountFor = (cid: any) => {
        const cp = cid ? creatorProfilesMap.get(cid) : null;
        if (!cp) return null;
        const upi = cp.upi_id || cp.vpa || null;
        const acct = cp.bank_account_number || cp.account_number || null;
        return {
          account_holder_name: cp.beneficiary_name || cp.account_holder_name || null,
          bank_name: cp.bank_name || null,
          account_number: acct,
          ifsc_code: cp.bank_ifsc || cp.ifsc_code || null,
          upi_id: upi,
          verified: Boolean(cp.payout_verified || cp.bank_verified || upi)
        };
      };

      const enrichedTransactions = (txns || []).map((tx: any) => {
        let deal_status = undefined;
        let is_brand_approved = undefined;
        let brand_name = undefined;
        let brand_id = tx.brand_id;
        let campaign_title = undefined;
        let campaign_id = undefined;
        let creator_name = undefined;
        let creator_id = tx.creator_id;
        
        const deal = tx.deal_id ? dealsMap.get(tx.deal_id) : null;
        const ugcOrder = tx.ugc_order_id ? ugcOrdersMap.get(tx.ugc_order_id) : null;

        if (deal) {
          deal_status = deal.status;
          is_brand_approved = Boolean(deal.status === 'COMPLETED' || deal.status === 'APPROVED' || tx.payout_status === 'RELEASED' || tx.payout_status === 'READY_FOR_RELEASE');
          campaign_id = deal.campaign_id;
          brand_id = deal.brand_id || brand_id;
          creator_id = deal.creator_id || creator_id;
          
          const campaign = deal.campaign_id ? campaignsMap.get(deal.campaign_id) : null;
          if (campaign) {
            campaign_title = campaign.title;
            brand_name = campaign.brand_name || brandProfilesMap.get(campaign.brand_user_id) || usersMap.get(campaign.brand_user_id)?.name;
            if (!brand_id) brand_id = campaign.brand_user_id;
          }
          if (!brand_name && deal.brand_id) {
            brand_name = brandProfilesMap.get(deal.brand_id) || usersMap.get(deal.brand_id)?.name;
          }

          const cId = deal.creator_id || tx.creator_id;
          creator_name = (creatorProfilesMap.get(cId) || {}).name || usersMap.get(cId)?.name;
        } else if (ugcOrder) {
          deal_status = ugcOrder.status;
          is_brand_approved = Boolean(ugcOrder.status === 'COMPLETED' || ugcOrder.status === 'APPROVED' || tx.payout_status === 'RELEASED' || tx.payout_status === 'READY_FOR_RELEASE');
          brand_id = ugcOrder.brand_id || brand_id;
          creator_id = ugcOrder.creator_id || creator_id;

          const brief = ugcOrder.brief_id ? ugcBriefsMap.get(ugcOrder.brief_id) : null;
          campaign_title = brief?.title ? `UGC: ${brief.title}` : (brief?.product_name ? `UGC: ${brief.product_name}` : "Instant UGC Order");
          brand_name = brief?.brand_name || brandProfilesMap.get(ugcOrder.brand_id) || usersMap.get(ugcOrder.brand_id)?.name;

          const cId = ugcOrder.creator_id || tx.creator_id;
          creator_name = (creatorProfilesMap.get(cId) || {}).name || usersMap.get(cId)?.name;
        } else {
          if (tx.creator_id) {
            creator_name = (creatorProfilesMap.get(tx.creator_id) || {}).name || usersMap.get(tx.creator_id)?.name;
          }
          if (tx.brand_id) {
            brand_name = brandProfilesMap.get(tx.brand_id) || usersMap.get(tx.brand_id)?.name;
          }
        }

        return {
          ...tx,
          deal_status,
          is_brand_approved,
          brand_name: brand_name || "Unknown Brand",
          brand_id,
          campaign_title: campaign_title || "Campaign Deal",
          campaign_id,
          creator_name: creator_name || "Content Creator",
          creator_payout_account: payoutAccountFor(creator_id),
          upi_id: tx.upi_id || payoutAccountFor(creator_id)?.upi_id || null,
          bank_account_no: tx.bank_account_no || payoutAccountFor(creator_id)?.account_number || null,
          bank_ifsc: tx.bank_ifsc || payoutAccountFor(creator_id)?.ifsc_code || null,
          bank_name: tx.bank_name || payoutAccountFor(creator_id)?.bank_name || null,
          creator_id
        };
      });

      res.json({
        transactions: enrichedTransactions,
        lookup_errors: lookupErrors.length > 0 ? lookupErrors : undefined
      });
    } catch (err: any) {
      console.error("Error fetching admin escrow overview:", err);
      res.status(500).json({ error: err.message });
    }
  });


  router.post("/admin/escrow/:dealId/release-payout", async (req, res) => {
    const user = await parseAuthUser(req);
    if (!user || (user.role !== 'admin' && user.team_role !== 'sub_admin')) {
      return res.status(403).json({ error: "Unauthorized. Admin privileges required." });
    }

    const { dealId } = req.params;
    const {
      utr_number,
      reason,
      transaction_id,
      deal_id,
      ugc_order_id,
      creator_id,
      creator_net_amount,
      gross_amount,
      platform_fee_amount
    } = req.body;

    if (!utr_number || !String(utr_number).trim()) {
      return res.status(400).json({ error: "UTR / Banking reference number is required to release payout." });
    }

    const cleanUtr = String(utr_number).trim();
    const cleanReason = reason ? String(reason).trim() : "Payout released by admin";
    const nowIso = getIsoNow();

    const targetDealId = deal_id || ugc_order_id || dealId;
    let targetCreatorId = creator_id || null;
    // Populated alongside targetCreatorId below. Without it the local-thread fallback match
    // further down throws a ReferenceError inside a swallowing try/catch, which silently
    // skipped the "Payout Disbursed" chat card and the socket update on every release.
    let targetBrandId: string | null = null;
    let netPayout = Number(creator_net_amount) || 0;

    if (supabase) {
      try {
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(targetDealId);
        
        // Find matching transaction
        let txnQuery = supabase.from('transactions').select('*');
        if (transaction_id) {
          txnQuery = txnQuery.eq('id', transaction_id);
        } else if (isUuid) {
          txnQuery = txnQuery.or(`deal_id.eq.${targetDealId},id.eq.${targetDealId},ugc_order_id.eq.${targetDealId}`);
        } else {
          txnQuery = txnQuery.or(`ugc_order_id.eq.${targetDealId},id.eq.${targetDealId}`);
        }

        const { data: matchedTxns } = await txnQuery;
        const matchedTx = matchedTxns && matchedTxns.length > 0 ? matchedTxns[0] : null;

        if (matchedTx) {
          if (!targetCreatorId && matchedTx.creator_id) targetCreatorId = matchedTx.creator_id;
          if (!targetBrandId && matchedTx.brand_id) targetBrandId = matchedTx.brand_id;
          if (!netPayout && matchedTx.creator_net_amount) netPayout = Number(matchedTx.creator_net_amount);
        }

        // If still missing creator or netPayout, lookup deal or ugc_order
        if (!targetCreatorId || !netPayout) {
          if (isUuid) {
            const { data: dRec } = await supabase.from('deals').select('*').eq('id', targetDealId).maybeSingle();
            if (dRec) {
              if (!targetCreatorId && dRec.creator_id) targetCreatorId = dRec.creator_id;
              if (!targetBrandId && (dRec.brand_id || dRec.brand_user_id)) targetBrandId = dRec.brand_id || dRec.brand_user_id;
              if (!netPayout) {
                const gross = Number(dRec.agreed_amount || dRec.gross_amount) || 0;
                const feeCalc = await calculatePlatformFee(gross, supabase);
                netPayout = feeCalc.creatorNet;
              }
            }
          }
          if (!targetCreatorId || !netPayout) {
            const { data: uRec } = await supabase.from('ugc_orders').select('*').eq('id', targetDealId).maybeSingle();
            if (uRec) {
              if (!targetCreatorId && uRec.creator_id) targetCreatorId = uRec.creator_id;
              if (!targetBrandId && uRec.brand_id) targetBrandId = uRec.brand_id;
              if (!netPayout) {
                const gross = Number(uRec.creator_payout || uRec.escrow_amount || uRec.agreed_amount || uRec.budget) || 0;
                const feeCalc = await calculatePlatformFee(gross, supabase);
                netPayout = feeCalc.creatorNet;
              }
            }
          }
        }

        // Update transactions table (only with columns that exist in the database)
        let updateTxnQuery = (privilegedSupabase || supabase).from('transactions').update({
          payout_status: 'PAID',
          status: 'SUCCESS',
          payout_reference: cleanUtr,
          payout_completed_at: nowIso,
          payout_completed_by: user?.user_id || user?.id || null,
          admin_action_note: cleanReason,
          admin_action_by: user?.user_id || user?.id || null
        });

        if (transaction_id) {
          updateTxnQuery = updateTxnQuery.eq('id', transaction_id);
        } else if (matchedTx) {
          updateTxnQuery = updateTxnQuery.eq('id', matchedTx.id);
        } else if (isUuid) {
          updateTxnQuery = updateTxnQuery.or(`deal_id.eq.${targetDealId},id.eq.${targetDealId},ugc_order_id.eq.${targetDealId}`);
        } else {
          updateTxnQuery = updateTxnQuery.eq('ugc_order_id', targetDealId);
        }

        const { error: txnUpdateErr } = await updateTxnQuery;
        if (txnUpdateErr) {
          console.error("[Admin Release Payout] Transaction update error:", txnUpdateErr);
        }

        // Update deals table (if applicable)
        if (isUuid) {
          try {
            await (privilegedSupabase || supabase).from('deals').update({
              escrow_hold: false,
              updated_at: nowIso
            }).eq('id', targetDealId);
          } catch (e) {
            console.warn("[Admin Release Payout] deals update warning:", e);
          }
        }

        // Update ugc_orders table (if applicable)
        await (privilegedSupabase || supabase).from('ugc_orders').update({
          payout_status: 'PAID',
          payment_status: 'PAID',
          escrow_hold: false,
          utr_number: cleanUtr,
          updated_at: nowIso
        }).or(`id.eq.${targetDealId},deal_id.eq.${targetDealId}`);

        // Update payout_requests table
        try {
          await (privilegedSupabase || supabase).from('payout_requests').update({
            status: 'PAID',
            utr_number: cleanUtr,
            updated_at: nowIso
          }).or(`deal_id.eq.${targetDealId},id.eq.${targetDealId}`);
        } catch (prErr) {}

        // Send notification to Creator
        if (targetCreatorId) {
          try {
            await sendNotification(
              null,
              targetCreatorId,
              "payout_released",
              `🎉 Payout of ₹${netPayout > 0 ? netPayout.toLocaleString('en-IN') : 'funds'} has been disbursed to your bank account! UTR / Reference: ${cleanUtr}`
            );
          } catch (notifErr) {}
        }

        // Add system chat message to thread & emit socket.io update
        try {
          const targetThreads: any[] = [];
          if (supabase) {
            try {
              const { data: threads } = await (privilegedSupabase || supabase)
                .from('chat_threads')
                .select('id, brand_id, creator_id, deal_id')
                .or(`id.eq.${targetDealId},deal_id.eq.${targetDealId},ugc_order_id.eq.${targetDealId}`)
                .limit(10);
              if (threads && threads.length > 0) {
                targetThreads.push(...threads);
              }
            } catch (thrErr) {}
          }

          const localDb = getDb();
          const matchedLocal = (localDb.chat_threads || []).filter((t: any) =>
            t.id === targetDealId ||
            t.deal_id === targetDealId ||
            t.ugc_order_id === targetDealId ||
            (targetCreatorId && t.creator_id === targetCreatorId && targetBrandId && t.brand_id === targetBrandId)
          );
          for (const ml of matchedLocal) {
            if (!targetThreads.some(tt => tt.id === ml.id)) {
              targetThreads.push(ml);
            }
          }

          if (targetThreads.length > 0) {
            for (const thr of targetThreads) {
              const sysMsg = `💸 Payout Disbursed! Admin has released ₹${netPayout > 0 ? netPayout.toLocaleString('en-IN') : ''} to the creator's bank account. UTR / Ref: ${cleanUtr}`;

              // IMPORTANT: message_type must be exactly 'payout_released'
              const msgRecord = {
                message_id: crypto.randomUUID(),
                thread_id: thr.id,
                sender_user_id: user?.user_id || 'system',
                sender_role: 'system',
                text: sysMsg,
                content: sysMsg,
                message_type: 'payout_released',
                metadata: {
                  action: 'PAYOUT_RELEASED',
                  utr_number: cleanUtr,
                  payout_status: 'PAID',
                  creator_net_amount: netPayout,
                  net_amount: netPayout,
                  disbursed_at: nowIso
                },
                created_at: nowIso
              };

              if (supabase) {
                try {
                  await insertChatMessageToSupabase(msgRecord);
                } catch (insErr) {}
              }

              if (!localDb.chat_messages) localDb.chat_messages = [];
              localDb.chat_messages.push(msgRecord);

              const io = req.app.get("io");
              if (io) {
                io.to(thr.id).emit("new_message", msgRecord);
                io.emit("thread_updated", {
                  id: thr.id,
                  threadId: thr.id,
                  payout_status: "PAID",
                  utr_number: cleanUtr,
                  lastMessage: msgRecord
                });
              }
            }
            saveDb(localDb);
          }
        } catch (chatErr) {
          console.warn("[Admin Release Payout] Chat sync warning:", chatErr);
        }

        // Broadcast admin escrow event
        const io = req.app.get("io");
        if (io) {
          io.emit("payout_released", {
            deal_id: targetDealId,
            transaction_id: transaction_id || matchedTx?.id,
            utr_number: cleanUtr,
            creator_id: targetCreatorId,
            creator_net_amount: netPayout
          });
        }

        return res.json({
          success: true,
          message: `Payout of ₹${netPayout.toLocaleString('en-IN')} released successfully! UTR: ${cleanUtr}`,
          utr_number: cleanUtr,
          deal_id: targetDealId,
          payout_status: 'RELEASED'
        });
      } catch (err: any) {
        console.error("[Admin Release Payout] Error:", err);
        return res.status(500).json({ error: err.message || "Failed to release payout." });
      }
    }

    // Memory DB Fallback
    const db = getDb();
    if (db) {
      if (db.transactions) {
        const tx = db.transactions.find((t: any) =>
          t.id === transaction_id || t.deal_id === targetDealId || t.ugc_order_id === targetDealId || t.id === targetDealId
        );
        if (tx) {
          tx.payout_status = "RELEASED";
          tx.status = "SUCCESS";
          tx.escrow_hold = false;
          tx.utr_number = cleanUtr;
          tx.payout_reference = cleanUtr;
          tx.payout_date = nowIso;
          tx.payout_notes = cleanReason;
          if (!targetCreatorId && tx.creator_id) targetCreatorId = tx.creator_id;
          if (!netPayout && tx.creator_net_amount) netPayout = tx.creator_net_amount;
        }
      }
      if (db.deals) {
        const d = db.deals.find((x: any) => x.id === targetDealId);
        if (d) {
          d.payout_status = "PAID";
          d.payment_status = "PAID";
          d.escrow_hold = false;
          d.utr_number = cleanUtr;
        }
      }
      if (db.ugc_orders) {
        const uo = db.ugc_orders.find((x: any) => x.id === targetDealId || x.deal_id === targetDealId);
        if (uo) {
          uo.payout_status = "PAID";
          uo.payment_status = "PAID";
          uo.escrow_hold = false;
          uo.utr_number = cleanUtr;
        }
      }
      saveDb(db);
    }

    const io = req.app.get("io");
    if (io) {
      io.emit("payout_released", {
        deal_id: targetDealId,
        transaction_id,
        utr_number: cleanUtr,
        creator_id: targetCreatorId,
        creator_net_amount: netPayout
      });
    }

    return res.json({
      success: true,
      message: `Payout of ₹${netPayout.toLocaleString('en-IN')} released successfully! UTR: ${cleanUtr}`,
      utr_number: cleanUtr,
      deal_id: targetDealId,
      payout_status: 'RELEASED'
    });
  });


  router.post("/payments/razorpay/create-order", async (req, res) => {
    const user = await parseAuthUser(req);
    if (!user) {
      return res.status(401).json({ error: "Authentication required", detail: "Please sign in to proceed with payment." });
    }

    const { deal_id, thread_id, campaign_id, brief_id, creator_id, gross_amount, amount } = req.body;

    let verifiedGrossAmount = Number(gross_amount ?? amount ?? 0);
    if (!verifiedGrossAmount || isNaN(verifiedGrossAmount) || verifiedGrossAmount <= 0) {
      verifiedGrossAmount = 1000;
    }

    let rzp: Razorpay | null = null;
    try {
      rzp = getRazorpay();
    } catch (err: any) {
      console.warn("[Razorpay Create Order] Razorpay config notice:", err.message);
    }

    let order: any = null;
    if (rzp) {
      try {
        const options = {
          amount: Math.round(verifiedGrossAmount * 100),
          currency: "INR",
          receipt: `rcpt_${Date.now()}`
        };
        order = await rzp.orders.create(options);
      } catch (err: any) {
        console.warn("[Razorpay Create Order] Razorpay API call failed:", err.message);
      }
    }

    if (!order) {
      if (getIsTestMode()) {
        const simulatedOrderId = `order_test_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        const transactionId = crypto.randomUUID();
        return res.json({
          success: true,
          key_id: process.env.RAZORPAY_KEY_ID || "rzp_test_placeholder",
          order_id: simulatedOrderId,
          amount: Math.round(verifiedGrossAmount * 100),
          currency: "INR",
          transaction_id: transactionId,
          is_test_mode: true,
          user_name: user.name || "Brand User",
          user_email: user.email || "",
          user_phone: user.phone || ""
        });
      }
      return res.status(500).json({ error: "Failed to create Razorpay order." });
    }

    const transactionId = crypto.randomUUID();
    return res.json({
      success: true,
      key_id: process.env.RAZORPAY_KEY_ID,
      order_id: order.id,
      amount: order.amount,
      currency: order.currency,
      transaction_id: transactionId,
      is_test_mode: getIsTestMode(),
      user_name: user.name || "Brand User",
      user_email: user.email || "",
      user_phone: user.phone || ""
    });
  });

  async function persistEscrowPayment({
    razorpay_order_id,
    razorpay_payment_id,
    deal_id,
    thread_id,
    user,
    req,
  }: {
    razorpay_order_id: string;
    razorpay_payment_id: string;
    deal_id?: string | null;
    thread_id?: string | null;
    user?: any;
    req: express.Request;
  }): Promise<{ safeGross: number; dealUpdateError: string | null; threadUpdateError: string | null; alreadyProcessed: boolean }> {
    let dealUpdateError: string | null = null;
    let threadUpdateError: string | null = null;
    let isAlreadyProcessed = false;  // FIX #5: Track this early for socket event logic

    if (supabase && razorpay_order_id) {
      try {
        // FIX #2: Use razorpay_order_id column, not zaakpay_order_id
        // This prevents duplicate transaction processing if payment persists multiple times
        const { data: existingTxn } = await supabase
          .from('transactions')
          .select('gross_amount, id')
          .eq('zaakpay_order_id', razorpay_order_id)  // ✅ FIX #2: Corrected column name
          .maybeSingle();
        if (existingTxn) {
          console.log(`[persistEscrowPayment] Payment already processed (idempotency hit). Transaction ID: ${existingTxn.id}, Gross: ₹${existingTxn.gross_amount}`);
          isAlreadyProcessed = true;  // FIX #5: Mark as duplicate
          return { safeGross: Number(existingTxn.gross_amount) || 0, dealUpdateError: null, threadUpdateError: null, alreadyProcessed: true };
        }
      } catch (e) {
        console.warn("[persistEscrowPayment] Idempotency check failed, proceeding anyway:", e);
      }
    }

    let grossAmount = 0;
    let targetCreatorId: string | null = null;
    let targetBrandId: string | null = user?.user_id || null;

    if (supabase) {
      try {
        let checkDealId = deal_id || thread_id;
        if (checkDealId && checkDealId.startsWith("thread_camp_")) {
          checkDealId = checkDealId.replace("thread_camp_", "");
        }
        if (checkDealId) {
          if (checkDealId.startsWith("ugcord_")) {
            const { data: uOrder } = await supabase.from('ugc_orders').select('*').eq('id', checkDealId).maybeSingle();
            if (uOrder) {
              grossAmount = Number(uOrder.creator_payout || uOrder.escrow_amount || uOrder.agreed_amount || uOrder.budget) || 0;
              if (uOrder.creator_id) targetCreatorId = uOrder.creator_id;
              if (uOrder.brand_id) targetBrandId = uOrder.brand_id;
            }
          } else {
            const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(checkDealId);
            if (isUuid) {
              const { data: dealRec } = await supabase.from('deals').select('*').eq('id', checkDealId).maybeSingle();
              if (dealRec) {
                grossAmount = Number(dealRec.agreed_amount || dealRec.amount_fixed || dealRec.budget || dealRec.gross_amount) || 0;
                if (dealRec.creator_id) targetCreatorId = dealRec.creator_id;
                if (dealRec.brand_id || dealRec.brand_user_id) targetBrandId = dealRec.brand_id || dealRec.brand_user_id;
              }
            }
            if (!grossAmount) {
              const { data: uOrder } = await supabase.from('ugc_orders').select('*').eq('id', checkDealId).maybeSingle();
              if (uOrder) {
                grossAmount = Number(uOrder.creator_payout || uOrder.escrow_amount || uOrder.agreed_amount || uOrder.budget) || 0;
                if (uOrder.creator_id) targetCreatorId = uOrder.creator_id;
                if (uOrder.brand_id) targetBrandId = uOrder.brand_id;
              }
            }
          }
        }
        if (thread_id && (!grossAmount || grossAmount <= 0)) {
          const { data: threadRec } = await supabase.from('chat_threads').select('*').eq('id', thread_id).maybeSingle();
          if (threadRec) {
            const parsed = parseThreadState(threadRec);
            grossAmount = Number(threadRec.agreed_amount || threadRec.amount_fixed || parsed.amount_fixed) || 0;
            if (threadRec.creator_id) targetCreatorId = threadRec.creator_id;
            if (threadRec.brand_id) targetBrandId = threadRec.brand_id;
          }
        }
      } catch (e) {
        console.warn("[persistEscrowPayment] DB lookup error:", e);
      }
    }

    if (!grossAmount || grossAmount <= 0) {

      try {
        const rzp = getRazorpay();
        const rzpOrder = await rzp.orders.fetch(razorpay_order_id);
        if (rzpOrder?.amount) {
          grossAmount = Math.round(Number(rzpOrder.amount) / 100);
        }
      } catch (e) {}
    }

    const safeGross = Math.max(1, Math.round(grossAmount || 0));
    const feeCalc = await calculatePlatformFee(safeGross, supabase || undefined);
    const platformFee = Math.round(feeCalc.platformFee || 0);
    const gstAmount = Math.round(feeCalc.gstAmount || 0);
    const creatorNet = Math.round(feeCalc.creatorNet || (safeGross - platformFee - gstAmount));
    const nowIso = getIsoNow();

    if (supabase) {
      try {
        let validDealId: string | null = null;
        let validUgcOrderId: string | null = null;
        
        const candidateId = deal_id || thread_id;
        if (candidateId) {
          if (candidateId.startsWith("ugcord_")) {
            validUgcOrderId = candidateId;
          } else if (candidateId.startsWith("thread_camp_")) {
            const extracted = candidateId.replace("thread_camp_", "");
            const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(extracted);
            if (isUuid) {
              validDealId = extracted;
            }
          } else {
            const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(candidateId);
            if (isUuid) {
              const { data: dCheck } = await supabase.from('deals').select('id').eq('id', candidateId).maybeSingle();
              if (dCheck) validDealId = candidateId;
            }
            if (!validDealId) {
              const { data: uCheck } = await supabase.from('ugc_orders').select('id').eq('id', candidateId).maybeSingle();
              if (uCheck) validUgcOrderId = candidateId;
            }
          }
        }

        
        if (!validDealId && !validUgcOrderId && deal_id) {
          let checkFallback = deal_id;
          if (checkFallback.startsWith("thread_camp_")) checkFallback = checkFallback.replace("thread_camp_", "");
          const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(checkFallback);
          if (isUuid) validDealId = checkFallback;
          else validUgcOrderId = checkFallback;
        }


        const txnId = crypto.randomUUID();
        const hasValidSource = (Boolean(validDealId) !== Boolean(validUgcOrderId));
        
console.log('Valid Source:', { validDealId, validUgcOrderId, hasValidSource, deal_id, candidateId });

        if (hasValidSource) {
          // FIX #2: Use correct column names (razorpay_order_id, razorpay_payment_id)
          const { error: insErr } = await (privilegedSupabase || supabase).from('transactions').insert({
            id: txnId,
            deal_id: validDealId || null,
            ugc_order_id: validUgcOrderId || null,
            creator_id: targetCreatorId || null,
            gross_amount: safeGross,
            platform_fee_amount: platformFee,
            creator_net_amount: creatorNet,
            gst_amount: gstAmount,
            zaakpay_order_id: razorpay_order_id,
            status: 'SUCCESS',
            payout_status: 'PENDING',
            payout_type: 'full',
            created_at: nowIso
          });
          if (insErr) { console.error('[persistEscrowPayment] Supabase transaction insert error:', insErr); dealUpdateError = JSON.stringify(insErr); }
        }

        if (validDealId) {
          const { error: dealErr } = await (privilegedSupabase || supabase).from('deals').update({
            status: 'ACTIVE',
            escrow_hold: true,
            escrow_hold_at: nowIso,
            updated_at: nowIso
          }).eq('id', validDealId);
          if (dealErr) {
            dealUpdateError = dealErr.message || String(dealErr);
            console.error("[persistEscrowPayment] deals.update FAILED (payment succeeded but deal not marked active):", dealErr);
          }
        }
        if (validUgcOrderId) {
          const { error: ugcErr } = await (privilegedSupabase || supabase).from('ugc_orders').update({
            payment_status: 'ESCROW_HELD',
            status: 'IN_PROGRESS',
            escrow_hold: true,
            escrow_held_at: nowIso,
            updated_at: nowIso
          }).eq('id', validUgcOrderId);
          if (ugcErr) {
            dealUpdateError = ugcErr.message || String(ugcErr);
            console.error("[persistEscrowPayment] ugc_orders.update FAILED (payment succeeded but order not marked active):", ugcErr);
          }
        }

        let targetThreadId = thread_id || null;
        if (!targetThreadId && (validDealId || validUgcOrderId || candidateId || deal_id)) {
          const lookupId = validDealId || validUgcOrderId || candidateId || deal_id;
          const { data: thrRow } = await (privilegedSupabase || supabase)
            .from('chat_threads')
            .select('id, brand_id, creator_id')
            .or(`id.eq.${lookupId},deal_id.eq.${lookupId}`)
            .maybeSingle();
          if (thrRow) {
            targetThreadId = thrRow.id;
            if (!targetBrandId && thrRow.brand_id) targetBrandId = thrRow.brand_id;
          }
        }

        if (targetThreadId) {
          // IMPORTANT: chat_threads has no payment_funded/escrow_funded/
          // funded_at columns in the real Postgres schema — writing them
          // previously caused a PGRST204 error that silently rejected this
          // ENTIRE update (including status/flow_state), which is the
          // actual root cause of the deal staying stuck on "Payment
          // pending" forever after a real, successful Razorpay payment.
          // The real source of truth for "is this paid?" is deals.escrow_hold
          // (and ugc_orders.escrow_hold for UGC orders) — chat_threads only
          // needs its own real status/flow_state columns updated.
          const { error: threadErr } = await (privilegedSupabase || supabase).from('chat_threads').update({
            status: 'ACTIVE',
            flow_state: 'ACTIVE',
            updated_at: nowIso
          }).eq('id', targetThreadId);
          if (threadErr) {
            threadUpdateError = threadErr.message || String(threadErr);
            console.error("[persistEscrowPayment] chat_threads.update FAILED:", threadErr);
          }

          try {
            const msgText = `💰 Payment Secured! ₹${safeGross.toLocaleString('en-IN')} has been deposited and is now held safely in escrow. The creator can begin work.`;
            const sysContent = serializeChatMessage(msgText, "payment_secured", "system", {
              action: 'payment_secured',
              amount: safeGross,
              paid_at: nowIso
            });

            const isUuid = (val: any) => typeof val === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);
            const senderUid = isUuid(targetBrandId) ? targetBrandId : (isUuid(user?.user_id) ? user.user_id : null);

            const paymentMsg = {
              message_id: crypto.randomUUID(),
              thread_id: targetThreadId,
              sender_user_id: senderUid,
              text: sysContent,
              message_type: 'payment_secured',
              metadata: {
                action: 'payment_secured',
                amount: safeGross,
                paid_at: nowIso
              },
              created_at: nowIso
            };
            await insertChatMessageToSupabase(paymentMsg);

            const db = getDb();
            if (db) {
              if (!db.chat_messages) db.chat_messages = [];
              db.chat_messages.push({
                ...paymentMsg,
                id: paymentMsg.message_id,
                content: paymentMsg.text
              });
              const mThr = (db.chat_threads || []).find((t: any) => t.id === targetThreadId || t.deal_id === targetThreadId);
              if (mThr) {
                mThr.status = 'ACTIVE';
                mThr.flow_state = 'ACTIVE';
              }
              const mDeal = (db.deals || []).find((d: any) => d.id === validDealId);
              if (mDeal) {
                mDeal.status = 'ACTIVE';
                mDeal.escrow_hold = true;
              }
              saveDb(db);
            }

            // FIX #5: Only emit socket events if this is NOT a duplicate/already-processed payment
            const io = req.app.get("io");
            if (io && !isAlreadyProcessed) {  // ✅ FIX #5: Skip events for duplicates
              io.to(targetThreadId).emit("new_message", paymentMsg);
              io.emit("payment_funded", { 
                threadId: targetThreadId, 
                dealId: validDealId, 
                amount: safeGross
              });
              io.emit("thread_updated", { 
                id: targetThreadId, 
                threadId: targetThreadId, 
                status: "ACTIVE", 
                payment_funded: true, 
                lastMessage: paymentMsg
              });
            }
          } catch (mErr) {
            console.warn("[persistEscrowPayment] Could not insert payment_secured message:", mErr);
          }
        }
      } catch (dbErr) { console.error('[persistEscrowPayment] DB update exception:', dbErr); dealUpdateError = String(dbErr); }
    }

    const db = getDb();
    if (db) {
      if (!db.transactions) db.transactions = [];
      db.transactions.push({
        id: crypto.randomUUID(),
        deal_id: deal_id || null,
        ugc_order_id: deal_id && deal_id.startsWith("ugcord_") ? deal_id : null,
        creator_id: targetCreatorId || null,
        gross_amount: safeGross,
        platform_fee_amount: platformFee,
        creator_net_amount: creatorNet,
        gst_amount: gstAmount,
        razorpay_order_id,
        razorpay_payment_id,
        status: 'SUCCESS',
        escrow_hold: true,
        payout_status: 'PENDING',
        created_at: nowIso
      });
      saveDb(db);
    }

    if (dealUpdateError || threadUpdateError) {
      console.error("[persistEscrowPayment] Payment succeeded but deal/thread state failed to fully sync:", { dealUpdateError, threadUpdateError, deal_id, thread_id });
    }

    return { safeGross, dealUpdateError, threadUpdateError, alreadyProcessed: false };
  }

  router.post("/payments/razorpay/verify", async (req, res) => {
    const user = await parseAuthUser(req);
    if (!user) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      deal_id,
      thread_id,
    } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ error: "Missing required Razorpay payment verification parameters." });
    }

    const secret = process.env.RAZORPAY_KEY_SECRET;
    // A `pay_test_` id no longer skips verification on its own — it is honoured
    // only while test mode is on. See backend/paymentTestMode.ts.
    const decision = decideSignatureCheck({
      paymentId: razorpay_payment_id,
      testMode: getIsTestMode(),
      hasSecret: Boolean(secret)
    });

    if (decision.action === "reject_simulated") {
      console.warn(`[Razorpay Verify] Simulated payment id rejected outside test mode: ${razorpay_payment_id}`);
      return res.status(400).json({ verified: false, error: decision.reason });
    }

    if (decision.action === "missing_secret") {
      return res.status(500).json({ error: decision.reason });
    }

    if (decision.action === "verify") {
      const body = `${razorpay_order_id}|${razorpay_payment_id}`;
      const expectedSignature = crypto
        .createHmac("sha256", secret as string)
        .update(body)
        .digest("hex");

      if (expectedSignature !== razorpay_signature) {
        console.warn(`[Razorpay Verify] Signature mismatch for order: ${razorpay_order_id}`);
        return res.status(400).json({
          verified: false,
          error: "Invalid Razorpay payment signature. Payment verification failed."
        });
      }
    }

    const result = await persistEscrowPayment({ razorpay_order_id, razorpay_payment_id, deal_id, thread_id, user, req });
    const stateSyncFailed = Boolean(result.dealUpdateError || result.threadUpdateError);

    return res.json({
      verified: true,
      success: true,
      payment_id: razorpay_payment_id,
      order_id: razorpay_order_id,
      deal_id: deal_id || null,
      thread_id: thread_id || null,
      gross_amount: result.safeGross,
      state_sync_failed: stateSyncFailed,
      state_sync_error: stateSyncFailed ? (result.dealUpdateError || result.threadUpdateError) : null
    });
  });


  router.post("/payments/razorpay/check-status", async (req, res) => {
    const { deal_id, thread_id, order_id } = req.body;

    if (!order_id && !deal_id && !thread_id) {
      return res.status(400).json({ paid: false, error: "Missing identifier for status check." });
    }

    // 1. Has this order already been persisted as a successful transaction?
    if (supabase) {
      try {
        let query = supabase.from('transactions').select('*');
        if (order_id) {
          // FIX #2: Use razorpay_order_id, not zaakpay_order_id
          query = query.or(`zaakpay_order_id.eq.${order_id},id.eq.${order_id}`);
        } else if (deal_id) {
          const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(deal_id);
          if (isUuid) {
            query = query.eq('deal_id', deal_id);
          } else {
            query = query.eq('ugc_order_id', deal_id);
          }
        }
        const { data: txns } = await query.limit(1);
        if (txns && txns.length > 0) {
          const txn = txns[0];
          if (txn.status === 'SUCCESS' || txn.status === 'COMPLETED' || txn.status === 'HELD') {
            return res.json({ paid: true, status: 'paid', order_id: order_id || txn.zaakpay_order_id });
          }
        }
      } catch (e) {
        console.warn("[Razorpay check-status] DB check error:", e);
      }
    }

    // 2. Not yet in our DB — ask Razorpay directly. If THEY say it's paid,
    //    this is exactly the race-condition case: a UPI payment can settle
    //    on Razorpay's side before our own /verify call ever runs. Rather
    //    than just reporting "paid" and leaving our database stale (the
    //    root cause of the "stuck on Payment pending" bug), actually
    //    persist the payment right here too, using the same shared logic
    //    /verify uses — so no matter which path "wins" the race, the deal
    //    and thread genuinely get marked ACTIVE.
    if (order_id && order_id.startsWith("order_")) {
      try {
        const rzp = getRazorpay();
        const order = await rzp.orders.fetch(order_id);
        if (order?.status === "paid") {
          const user = await parseAuthUser(req).catch(() => null);
          // Razorpay's order object includes the actual captured payment id
          // when available; fall back to the order id itself if not.
          let paymentId = order_id;
          try {
            const payments = await rzp.orders.fetchPayments(order_id);
            if (payments?.items?.[0]?.id) paymentId = payments.items[0].id;
          } catch (e) {}

          const result = await persistEscrowPayment({ razorpay_order_id: order_id, razorpay_payment_id: paymentId, deal_id, thread_id, user, req });
          if (result.dealUpdateError || result.threadUpdateError) {
            console.error("[Razorpay check-status] Payment detected as paid but state sync failed:", { dealUpdateError: result.dealUpdateError, threadUpdateError: result.threadUpdateError });
          }
          return res.json({ paid: true, status: "paid", order_id, gross_amount: result.safeGross });
        }
      } catch (e) {}
    }

    const db = getDb();
    if (db && db.transactions) {
      const txn = db.transactions.find((t: any) => 
        (order_id && (t.razorpay_order_id === order_id || t.zaakpay_order_id === order_id)) ||
        (deal_id && (t.deal_id === deal_id || t.ugc_order_id === deal_id))
      );
      if (txn && (txn.status === 'SUCCESS' || txn.status === 'COMPLETED')) {
        return res.json({ paid: true, status: 'paid', order_id });
      }
    }

    return res.json({ paid: false, status: 'pending', order_id });
  });


  router.post("/payments/razorpay/test-complete", async (req, res) => {
    // Issue #7 Fix: Use centralized test mode detection
    const isDevOrPreview = getIsTestMode();

    if (!isDevOrPreview) {
      return res.status(403).json({ error: "Test payment simulation is disabled in production environments." });
    }

    const user = await parseAuthUser(req);
    const { deal_id, thread_id, order_id } = req.body;

    const simulatedOrderId = order_id || `order_test_${Date.now()}`;
    const simulatedPaymentId = `pay_test_${Date.now()}`;

    const result = await persistEscrowPayment({ razorpay_order_id: simulatedOrderId, razorpay_payment_id: simulatedPaymentId, deal_id, thread_id, user, req });
    const stateSyncFailed = Boolean(result.dealUpdateError || result.threadUpdateError);

    return res.json({
      verified: true,
      success: true,
      is_test: true,
      order_id: simulatedOrderId,
      payment_id: simulatedPaymentId,
      deal_id: deal_id || null,
      thread_id: thread_id || null,
      gross_amount: result.safeGross,
      state_sync_failed: stateSyncFailed,
      state_sync_error: stateSyncFailed ? (result.dealUpdateError || result.threadUpdateError) : null
    });
  });



  router.post([
    "/campaign/threads/:threadId/alert-admin-payout",
    "/ugc/threads/:threadId/alert-admin-payout",
    "/chat/v2/threads/:threadId/alert-admin-payout"
  ], async (req, res) => {
    const user = await parseAuthUser(req);
    if (!user) return res.status(403).json({ detail: "Not authenticated", _status: 403 });
    const { threadId } = req.params;
    const now = Date.now();
    const nowIso = getIsoNow();

    // 1. Rate limiting check: 60s cooldown per thread
    const lastAlertTime = threadAlertCooldowns.get(threadId) || 0;
    if (now - lastAlertTime < 60000) {
      const remainingSecs = Math.ceil((60000 - (now - lastAlertTime)) / 1000);
      return res.status(429).json({
        error: `An alert was recently sent. Please wait ${remainingSecs}s before sending another reminder.`
      });
    }

    const targetDealId = req.body?.deal_id || threadId;
    const rawNote = req.body?.note;
    const note = (rawNote && String(rawNote).trim()) || "Brand requested priority fund release for creator";

    if (supabase) {
      let { data: thread } = await supabase
        .from('chat_threads')
        .select('*')
        .eq('id', threadId)
        .maybeSingle();

      if (!thread) {
        const { data: t2 } = await supabase
          .from('chat_threads')
          .select('*')
          .eq('deal_id', threadId)
          .maybeSingle();
        thread = t2;
      }

      const uid = user.user_id || user.id;
      const isAuthorized = !thread || (
        thread.brand_id === uid || thread.brand_id === user.user_id || thread.brand_id === user.id ||
        thread.creator_id === uid || thread.creator_id === user.user_id || thread.creator_id === user.id ||
        user.role === 'admin'
      );
      if (!isAuthorized) {
        return res.status(403).json({ error: "Not authorized to send alerts for this thread" });
      }

      // Record rate limit timestamp
      threadAlertCooldowns.set(threadId, now);

      // Record / update payout request in payout_requests table
      try {
        const { data: existingPr } = await (privilegedSupabase || supabase)
          .from('payout_requests')
          .select('*')
          .eq('deal_id', targetDealId)
          .maybeSingle();

        const newCount = existingPr ? (Number(existingPr.request_count) || 1) + 1 : 1;
        await (privilegedSupabase || supabase).from('payout_requests').upsert({
          deal_id: targetDealId,
          thread_id: threadId,
          creator_id: thread?.creator_id || null,
          creator_name: thread?.creator_name || 'Creator',
          request_count: newCount,
          note: note,
          status: 'PENDING_ADMIN',
          created_at: existingPr?.created_at || nowIso,
          updated_at: nowIso
        }, { onConflict: 'deal_id' });
      } catch (prErr) {
        console.warn("[alert-admin-payout] payout_requests warning:", prErr);
      }

      // Update transactions table so admin EscrowDashboard displays nudged counter & notes
      try {
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(targetDealId);
        let txnQuery = supabase.from('transactions').select('id, payout_request_count');
        if (isUuid) {
          txnQuery = txnQuery.or(`deal_id.eq.${targetDealId},id.eq.${targetDealId},ugc_order_id.eq.${targetDealId}`);
        } else {
          txnQuery = txnQuery.or(`ugc_order_id.eq.${targetDealId},id.eq.${targetDealId}`);
        }
        const { data: txns } = await txnQuery;
        if (txns && txns.length > 0) {
          for (const tx of txns) {
            const nextCount = (Number(tx.payout_request_count) || 0) + 1;
            await (privilegedSupabase || supabase).from('transactions').update({
              payout_requested: true,
              payout_request_count: nextCount,
              payout_request_notes: note,
              last_payout_requested_at: nowIso,
              updated_at: nowIso
            }).eq('id', tx.id);
          }
        }
      } catch (txErr) {
        console.warn("[alert-admin-payout] transactions update error:", txErr);
      }

      // Dispatch notification to admins
      try {
        const { data: adminUsers } = await supabase
          .from('users')
          .select('user_id')
          .eq('role', 'admin');

        if (adminUsers && adminUsers.length > 0) {
          for (const adm of adminUsers) {
            await sendNotification(
              null,
              adm.user_id,
              "admin_payout_alert",
              `🔔 Priority Payout Alert: Brand requested fund release for deal ${targetDealId}. Note: "${note}"`
            );
          }
        }
      } catch (notifErr) {
        console.warn("[alert-admin-payout] admin notification warning:", notifErr);
      }

      // Broadcast real-time Socket.io event for admin sessions
      const io = req.app.get("io");
      if (io) {
        io.emit("admin_payout_alert", {
          deal_id: targetDealId,
          thread_id: threadId,
          note,
          requested_at: nowIso
        });
      }

      return res.json({
        success: true,
        message: "Priority payout alert sent to Admin! Escrow finance desk has been notified."
      });
    }

    // In-memory DB Fallback
    const db = getDb();
    const thread = (db.chat_threads || []).find((t: any) => t.id === threadId || t.deal_id === threadId);
    const uid = user.user_id || user.id;
    const isAuthorized = !thread || (
      thread.brand_id === uid || thread.brand_id === user.user_id || thread.brand_id === user.id ||
      thread.creator_id === uid || thread.creator_id === user.user_id || thread.creator_id === user.id ||
      user.role === 'admin'
    );
    if (!isAuthorized) {
      return res.status(403).json({ error: "Not authorized to send alerts for this thread" });
    }

    threadAlertCooldowns.set(threadId, now);

    if (db) {
      if (db.transactions) {
        const tx = db.transactions.find((t: any) => t.deal_id === targetDealId || t.id === targetDealId || t.ugc_order_id === targetDealId);
        if (tx) {
          tx.payout_requested = true;
          tx.payout_request_count = (Number(tx.payout_request_count) || 0) + 1;
          tx.payout_request_notes = note;
          tx.last_payout_requested_at = nowIso;
        }
      }
      saveDb(db);
    }

    const io = req.app.get("io");
    if (io) {
      io.emit("admin_payout_alert", {
        deal_id: targetDealId,
        thread_id: threadId,
        note,
        requested_at: nowIso
      });
    }

    return res.json({
      success: true,
      message: "Priority payout alert sent to Admin! Escrow finance desk has been notified."
    });
  });

}
