const fs = require('fs');

let content = fs.readFileSync('backend/server.ts', 'utf8');

// 1. Remove the old APPROVE transaction block
const oldApproveBlockStart = content.indexOf('    // On approve, release the escrow in the `transactions` table.');
const oldApproveBlockEnd = content.indexOf('    // 4. Create and persist Chat Message');

if (oldApproveBlockStart !== -1 && oldApproveBlockEnd !== -1) {
    content = content.substring(0, oldApproveBlockStart) + content.substring(oldApproveBlockEnd);
} else {
    console.error('Could not find old APPROVE block');
    process.exit(1);
}

// 2. Insert the new APPROVE transaction block at the beginning of the `if (supabase)` block
const supabaseBlockStart = content.indexOf('    // 2. Persist to Supabase\n    if (supabase) {\n');

if (supabaseBlockStart !== -1) {
    const insertPosition = supabaseBlockStart + '    // 2. Persist to Supabase\n    if (supabase) {\n'.length;
    
    const newApproveBlock = `      if (action === 'APPROVE') {
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
          payout_status: 'RELEASED',
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
          return { error: \`Failed to update transaction: \${relErr.message}\`, _status: 500 };
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
            return { error: \`Failed to insert transaction: \${insErr.message}\`, _status: 500 };
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

        // Surface the real numbers in the chat card instead of a bare "payout released".
        msgMetadata = {
          ...msgMetadata,
          amount: grossAmount,
          gross_amount: grossAmount,
          platform_fee_percent: feePercentage,
          platform_fee_amount: platformFee,
          creator_net_amount: netAmount,
          payout_status: 'RELEASED'
        };
      }\n\n`;
      
    content = content.substring(0, insertPosition) + newApproveBlock + content.substring(insertPosition);
} else {
    console.error('Could not find supabase block start');
    process.exit(1);
}

fs.writeFileSync('backend/server.ts', content);
console.log('Successfully updated server.ts');
