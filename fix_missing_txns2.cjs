const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);
const crypto = require('crypto');

async function fixMissingTransactions() {
  const { data: orders, error: oErr } = await supabase
    .from('ugc_orders')
    .select('*')
    .eq('status', 'COMPLETED')
    .eq('payment_status', 'RELEASED');

  if (oErr) return console.error(oErr);

  const { data: txns, error: tErr } = await supabase
    .from('transactions')
    .select('ugc_order_id, id')
    .not('ugc_order_id', 'is', null);

  if (tErr) return console.error(tErr);

  const txnOrderIds = new Set(txns.map(t => t.ugc_order_id));
  const badOrders = orders.filter(o => !txnOrderIds.has(o.id));

  for (const order of badOrders) {
    const grossAmount = Number(
      order.escrow_amount ?? order.creator_payout ?? order.agreed_amount ?? 0
    );
    const platformFee = Math.round(((grossAmount * 15) / 100) * 100) / 100;
    const netAmount = Math.max(0, Math.round((grossAmount - platformFee) * 100) / 100);

    const { error: insErr } = await supabase.from('transactions').insert({
      id: crypto.randomUUID(),
      ugc_order_id: order.id,
      creator_id: order.creator_id,
      gst_amount: 0,
      created_at: new Date().toISOString(),
      status: 'SUCCESS',
      payout_status: 'PAID', // Fixed!
      payout_type: 'full',
      gross_amount: grossAmount,
      platform_fee_amount: platformFee,
      creator_net_amount: netAmount,
      payout_completed_at: new Date().toISOString()
    });

    if (insErr) {
      console.error(`Failed to fix order ${order.id}:`, insErr);
    } else {
      console.log(`Fixed order ${order.id} with amount ${grossAmount}`);
    }
  }
}
fixMissingTransactions().then(() => console.log('Done')).catch(console.error);
