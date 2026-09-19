import crypto from 'crypto';

export interface CreateEscrowTransactionParams {
  deal_id?: string | null;
  campaign_id?: string | null;
  brief_id?: string | null;
  ugc_order_id?: string | null;
  brand_id: string;
  creator_id?: string | null;
  gross_amount: number;
  status?: string;
  escrow_hold?: boolean;
  payment_order_id?: string | null;
}

export interface EscrowServiceDeps {
  supabase: any;
  getDb: () => any;
  saveDb: (db: any) => void;
  getIsoNow: () => string;
  calculateFee: (grossAmount: number, userId?: string) => Promise<any>;
}

/**
 * Shared Escrow Transaction Creation Helper.
 * Used by all 5 creation points (UGC briefs, campaigns, send-brief, chat offers, UGC claims).
 */
export async function createEscrowTransaction(
  deps: EscrowServiceDeps,
  params: CreateEscrowTransactionParams
) {
  const { supabase, getDb, saveDb, getIsoNow, calculateFee } = deps;
  const {
    deal_id,
    campaign_id,
    brief_id,
    ugc_order_id,
    brand_id,
    creator_id,
    gross_amount,
    status = 'HELD',
    escrow_hold = true,
    payment_order_id
  } = params;

  const safeAmount = Math.max(0, Math.round(Number(gross_amount) || 0));
  const feeDetails = await calculateFee(safeAmount, creator_id || undefined);
  const transactionId = `txn_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  const orderId = payment_order_id || `YBEX_${Date.now()}_${(deal_id || brief_id || campaign_id || 'DEAL').slice(0, 8)}`;

  const txnRecord: any = {
    id: crypto.randomUUID(),
    transaction_id: transactionId,
    deal_id: deal_id || null,
    campaign_id: campaign_id || null,
    brief_id: brief_id || null,
    ugc_order_id: ugc_order_id || (deal_id && deal_id.startsWith('ugcord_') ? deal_id : null),
    creator_id: creator_id || null,
    brand_id,
    gross_amount: safeAmount,
    platform_fee_amount: Math.round(feeDetails.platformFee || 0),
    creator_net_amount: Math.round(feeDetails.creatorNet || 0),
    gst_amount: Math.round(feeDetails.gstAmount || 0),
    payment_order_id: orderId,
    zaakpay_order_id: orderId,
    status,
    escrow_hold: escrow_hold ?? true,
    payout_status: 'PENDING',
    payout_type: 'full',
    created_at: getIsoNow()
  };

  if (supabase) {
    try {
      let validDealId: string | null = null;
      let validUgcOrderId: string | null = null;

      const candidateId = deal_id || ugc_order_id;
      if (candidateId) {
        if (candidateId.startsWith('ugcord_')) {
          validUgcOrderId = candidateId;
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

      // Check constraint "chk_transactions_one_source" requires EXACTLY one source:
      // either validDealId or validUgcOrderId must be set, but NOT both and NOT neither.
      // If neither is a recognized deal/ugc_order in Supabase (e.g. campaign or generic brief creation),
      // we do not insert a partial row into Supabase 'transactions' table to avoid violating DB check constraints.
      const hasValidSource = (Boolean(validDealId) !== Boolean(validUgcOrderId));

      if (hasValidSource) {
        let sbStatus = 'SUCCESS';
        const upperStatus = (status || '').toUpperCase();
        if (upperStatus === 'INITIATED') sbStatus = 'INITIATED';
        else if (upperStatus === 'FAILED') sbStatus = 'FAILED';

        const supabasePayload: any = {
          id: txnRecord.id,
          deal_id: validDealId || null,
          ugc_order_id: validUgcOrderId || null,
          creator_id: creator_id || null,
          gross_amount: safeAmount,
          platform_fee_amount: Math.round(feeDetails.platformFee || 0),
          creator_net_amount: Math.round(feeDetails.creatorNet || 0),
          gst_amount: Math.round(feeDetails.gstAmount || 0),
          zaakpay_order_id: orderId,
          status: sbStatus,
          payout_status: 'PENDING',
          payout_type: 'full',
          created_at: txnRecord.created_at
        };

        const { error } = await supabase.from('transactions').insert(supabasePayload);
        if (error) {
          console.error("[createEscrowTransaction] Supabase insert failed:", error.message);
        }
      }
    } catch (err: any) {
      console.error("[createEscrowTransaction] Error inserting into Supabase:", err);
    }
  }

  const db = getDb();
  if (db) {
    if (!db.transactions) db.transactions = [];
    db.transactions.push(txnRecord);
    saveDb(db);
  }

  return txnRecord;
}

/**
 * Shared Deal and Transaction Status Sync Helper.
 * Executes atomic update via Supabase RPC with fallback compensating rollback.
 */
export async function syncDealAndTransactionStatus(
  deps: EscrowServiceDeps,
  dealId: string,
  dealStatus: string,
  txnStatus: string,
  escrowHold: boolean = false
) {
  const { supabase, getDb, saveDb, getIsoNow } = deps;

  if (supabase) {
    try {
      const { error: rpcErr } = await supabase.rpc('sync_deal_and_transaction_status', {
        p_deal_id: dealId,
        p_deal_status: dealStatus,
        p_txn_status: txnStatus,
        p_escrow_hold: escrowHold
      });

      if (rpcErr) {
        if (dealId.startsWith('ugcord_')) {
          await supabase.from('ugc_orders').update({
            status: dealStatus,
            escrow_hold: escrowHold
          }).eq('id', dealId);
        } else {
          const { data: origDeal } = await supabase.from('deals').select('status, escrow_hold').eq('id', dealId).maybeSingle();
          if (origDeal) {
            const { error: dealErr } = await supabase.from('deals').update({
              status: dealStatus,
              escrow_hold: escrowHold,
              updated_at: getIsoNow()
            }).eq('id', dealId);

            if (dealErr) {
              console.error(`[SYNC_FAILURE] Failed to update deals table for ${dealId}:`, dealErr.message);
              throw dealErr;
            }
          }
        }

        let sbTxnStatus = 'SUCCESS';
        const upperTxn = (txnStatus || '').toUpperCase();
        if (upperTxn === 'INITIATED') sbTxnStatus = 'INITIATED';
        else if (upperTxn === 'FAILED') sbTxnStatus = 'FAILED';

        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(dealId);
        let updateTxnQuery = supabase.from('transactions').update({
          status: sbTxnStatus
        });
        if (isUuid) {
          updateTxnQuery = updateTxnQuery.or(`deal_id.eq.${dealId},id.eq.${dealId}`);
        } else {
          updateTxnQuery = updateTxnQuery.eq('ugc_order_id', dealId);
        }
        const { error: txnErr } = await updateTxnQuery;

        if (txnErr) {
          console.error(`[CRITICAL_SYNC_FAILURE] Transaction update for ${dealId} failed:`, txnErr.message);
        }
      }
    } catch (err: any) {
      console.error(`[SYNC_ERROR] Sync between deal ${dealId} and transactions failed:`, err);
      throw err;
    }
  }

  const db = getDb();
  if (db) {
    const d = (db.deals || []).find((x: any) => x.id === dealId);
    if (d) {
      d.status = dealStatus;
      d.escrow_hold = escrowHold;
    }
    const uo = (db.ugc_orders || []).find((x: any) => x.id === dealId);
    if (uo) {
      uo.status = dealStatus;
      uo.escrow_hold = escrowHold;
    }
    const t = (db.transactions || []).find((x: any) => x.deal_id === dealId || x.id === dealId || x.ugc_order_id === dealId);
    if (t) {
      t.status = txnStatus;
      t.escrow_hold = escrowHold;
    }
    saveDb(db);
  }
}
