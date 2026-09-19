import express from "express";
import { safePromiseTimeout } from "./helpers";

// Admin campaign moderation (approve/reject a submitted campaign, delete),
// a legacy user delete/restore/ban/unban path (separate from the newer
// enforcement-panel warn/suspend/ban flow), platform-wide settings
// (markup/deduction percentages, AI review toggle), and fee/referral config
// (reads/writes go through the shared getSettings / getFullFeeAndReferralConfig
// helpers so the single source of truth for these values stays in server.ts).
export function setupAdminCampaignsSettingsRoutes(
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
    getSettings,
    getFullFeeAndReferralConfig,
  }: {
    supabase: any;
    privilegedSupabase: any;
    getDb: () => any;
    saveDb: (db: any) => void;
    parseAuthUser: (req: express.Request) => Promise<any>;
    logAdminAction: (user: any, action: any, targetType: any, targetId: any, detail: any) => Promise<any>;
    sendNotification: (db: any, userId: any, type: any, message: any) => Promise<any>;
    getSettings: (db: any) => any;
    getFullFeeAndReferralConfig: () => Promise<any>;
  }
) {
  const getIsoNow = () => new Date().toISOString();

  router.get("/admin/campaigns", async (req, res) => {
    const user = await parseAuthUser(req);
    if (!user || (user.role !== 'admin' && user.role !== 'sub_admin' && user.team_role !== 'sub_admin')) {
      return res.status(403).json({ detail: "Admin only", _status: 403 });
    }
    if (supabase) {
      const { data, error } = await (privilegedSupabase || supabase).from('campaigns').select('*').order('created_at', { ascending: false });
      if (!error && data) {
        return res.json(data);
      }
    }
    const db = getDb();
    res.json((db.campaigns || []).slice().reverse());
  });

  router.post("/admin/campaigns/:campaign_id/status", async (req, res) => {
    const user = await parseAuthUser(req);
    if (!user || (user.role !== 'admin' && user.role !== 'sub_admin' && user.team_role !== 'sub_admin')) {
      return res.status(403).json({ detail: "Admin only", _status: 403 });
    }
    const db = getDb();
    const campaignId = req.params.campaign_id;
    const stage = req.body.stage; // Live, Rejected, etc.
    const status = stage === "Live" ? "live" : stage === "Rejected" ? "rejected" : "under_review";
    const reason = req.body.reason || "";

    if (supabase) {
       try {
         const { data: campData } = await (privilegedSupabase || supabase).from('campaigns').select('brand_user_id, title').eq('campaign_id', campaignId).maybeSingle();
         const { error } = await (privilegedSupabase || supabase).from('campaigns').update({
           status: status
         }).eq('campaign_id', campaignId);
         if (error) {
           console.error("Supabase campaign status update failed:", error);
         }
         if (campData && campData.brand_user_id) {
           if (stage === "Live") {
             await sendNotification(db, campData.brand_user_id, "CAMPAIGN_LIVE", `Your campaign '${campData.title}' is now LIVE! Creators can apply.`);
           } else if (stage === "Rejected" || stage === "Review Failed") {
             await sendNotification(db, campData.brand_user_id, "CAMPAIGN_REJECTED", `Campaign '${campData.title}' rejected: ${reason || "Policy non-compliance"}.`);
           }
         }
       } catch (syncErr) {
         console.error("Error in Supabase campaign status flow:", syncErr);
       }
    }

    const campaign = (db.campaigns || []).find(c => c.campaign_id === campaignId);
    if (campaign) {
      campaign.stage = stage;
      campaign.status = status;
      campaign.rejectReason = reason;
      
      if (stage === "Live" && campaign.brand_user_id) {
        await sendNotification(db, campaign.brand_user_id, "CAMPAIGN_LIVE", `Your campaign '${campaign.title}' is now LIVE! Creators can apply.`);
      } else if ((stage === "Rejected" || stage === "Review Failed") && campaign.brand_user_id) {
        await sendNotification(db, campaign.brand_user_id, "CAMPAIGN_REJECTED", `Campaign '${campaign.title}' rejected: ${reason || "Policy non-compliance"}.`);
      }

      saveDb(db);
      res.json({ ok: true, campaign });
    } else {
      res.json({ ok: true });
    }
  });

  router.post("/admin/users/:user_id/delete", async (req, res) => {
    const user = await parseAuthUser(req);
    if (!user || (user.role !== 'admin' && user.role !== 'sub_admin' && user.team_role !== 'sub_admin')) {
      return res.status(403).json({ detail: "Admin only", _status: 403 });
    }

    const activeClient = privilegedSupabase || supabase;
    if (activeClient) {
      const { error } = await activeClient.from('users').update({ is_deleted: true, banned: true }).eq('user_id', req.params.user_id);
      if (error) {
        return res.status(500).json({ error: "Failed to delete user in Supabase: " + error.message });
      }
      await activeClient.from('creator_profiles').update({ is_deleted: true }).eq('user_id', req.params.user_id);
      await activeClient.from('brand_profiles').update({ is_deleted: true }).eq('user_id', req.params.user_id);

      await logAdminAction(user, 'delete_user', 'user', req.params.user_id, { reason: "Deleted and sent to bin" });
    }

    const db = getDb();
    const dbUser = db.users.find((u) => u.user_id === req.params.user_id);
    if (dbUser) {
      dbUser.is_deleted = true;
      dbUser.banned = true;
      saveDb(db);
    }
    res.json({ ok: true });
  });

  router.post("/admin/users/:user_id/restore", async (req, res) => {
    const user = await parseAuthUser(req);
    if (!user || (user.role !== 'admin' && user.role !== 'sub_admin' && user.team_role !== 'sub_admin')) {
      return res.status(403).json({ detail: "Admin only", _status: 403 });
    }

    const activeClient = privilegedSupabase || supabase;
    if (activeClient) {
      const { error } = await activeClient.from('users').update({ is_deleted: false, banned: false }).eq('user_id', req.params.user_id);
      if (error) {
        return res.status(500).json({ error: "Failed to restore user in Supabase: " + error.message });
      }
      await activeClient.from('creator_profiles').update({ is_deleted: false }).eq('user_id', req.params.user_id);
      await activeClient.from('brand_profiles').update({ is_deleted: false }).eq('user_id', req.params.user_id);

      await logAdminAction(user, 'restore_user', 'user', req.params.user_id, { reason: "Restored from bin" });
    }

    const db = getDb();
    const dbUser = db.users.find((u) => u.user_id === req.params.user_id);
    if (dbUser) {
      dbUser.is_deleted = false;
      dbUser.banned = false;
      saveDb(db);
    }
    res.json({ ok: true });
  });

  router.post("/admin/users/:user_id/unban", async (req, res) => {
    const user = await parseAuthUser(req);
    if (!user || (user.role !== 'admin' && user.role !== 'sub_admin' && user.team_role !== 'sub_admin')) {
      return res.status(403).json({ detail: "Admin only", _status: 403 });
    }

    const activeClient = privilegedSupabase || supabase;
    if (activeClient) {
      const { error } = await activeClient.from('users').update({ banned: false }).eq('user_id', req.params.user_id);
      if (error) {
        return res.status(500).json({ error: "Failed to unban user in Supabase: " + error.message });
      }
      await logAdminAction(user, 'reinstate_user', 'user', req.params.user_id, {});
    }

    const db = getDb();
    const dbUser = db.users.find((u) => u.user_id === req.params.user_id);
    if (dbUser) {
      dbUser.banned = false;
      saveDb(db);
    }
    res.json({ ok: true });
  });

  router.delete("/admin/campaigns/:campaign_id", async (req, res) => {
    const user = await parseAuthUser(req);
    if (!user || (user.role !== 'admin' && user.role !== 'sub_admin' && user.team_role !== 'sub_admin')) {
      return res.status(403).json({ detail: "Admin only", _status: 403 });
    }
    if (!supabase) {
      return res.status(500).json({ error: "Supabase client not initialized" });
    }

    const { error } = await supabase
      .from('campaigns')
      .delete()
      .eq('campaign_id', req.params.campaign_id);

    if (error) {
      return res.status(500).json({ error: "Failed to delete campaign from Supabase: " + error.message });
    }

    await logAdminAction(user, 'delete_campaign', 'campaign', req.params.campaign_id, {});
    res.json({ ok: true });
  });

  // Settings
  router.get("/admin/settings", async (req, res) => {
    const user = await parseAuthUser(req);
    if (!user || (user.role !== 'admin' && user.role !== 'sub_admin' && user.team_role !== 'sub_admin')) {
      return res.status(403).json({ detail: "Admin only", _status: 403 });
    }
    const db = getDb();
    res.json(getSettings(db));
  });

  router.put("/admin/settings", async (req, res) => {
    const user = await parseAuthUser(req);
    if (!user || (user.role !== 'admin' && user.role !== 'sub_admin' && user.team_role !== 'sub_admin')) {
      return res.status(403).json({ detail: "Admin only", _status: 403 });
    }
    const db = getDb();
    if (!db.platform_settings) {
      db.platform_settings = {
        brand_markup_pct: 2.0,
        creator_deduction_pct: 2.0,
        agency_markup_pct: 5.0,
        agency_deduction_pct: 5.0,
        ai_review_enabled: false,
      };
    }
    const { brand_markup_pct, creator_deduction_pct, agency_markup_pct, agency_deduction_pct, ai_review_enabled } = req.body;

    if (typeof brand_markup_pct === "number") db.platform_settings.brand_markup_pct = Math.max(0, Math.min(50, brand_markup_pct));
    if (typeof creator_deduction_pct === "number") db.platform_settings.creator_deduction_pct = Math.max(0, Math.min(50, creator_deduction_pct));
    if (typeof agency_markup_pct === "number") db.platform_settings.agency_markup_pct = Math.max(0, Math.min(50, agency_markup_pct));
    if (typeof agency_deduction_pct === "number") db.platform_settings.agency_deduction_pct = Math.max(0, Math.min(50, agency_deduction_pct));
    if (typeof ai_review_enabled === "boolean") db.platform_settings.ai_review_enabled = ai_review_enabled;

    saveDb(db);
    res.json(getSettings(db));
  });

  // FEATURE 1: Fee & Referral Config Routes
  router.get("/admin/fee-config", async (req, res) => {
    const user = await parseAuthUser(req);
    if (!user || (user.role !== 'admin' && user.role !== 'sub_admin' && user.team_role !== 'sub_admin')) {
      return res.status(403).json({ error: "Unauthorized. Admin access required." });
    }
    const combined = await getFullFeeAndReferralConfig();
    res.json(combined);
  });

  router.put("/admin/fee-config", async (req, res) => {
    const user = await parseAuthUser(req);
    if (!user || (user.role !== 'admin' && user.role !== 'sub_admin' && user.team_role !== 'sub_admin')) {
      return res.status(403).json({ error: "Unauthorized. Admin access required." });
    }

    const db = getDb();
    if (!db.fee_configs || !Array.isArray(db.fee_configs) || db.fee_configs.length === 0) {
      db.fee_configs = [{ id: 1 }];
    }

    const body = req.body || {};
    const current = db.fee_configs[0] || { id: 1 };

    if (body.threshold_amount !== undefined) current.threshold_amount = Math.max(0, Number(body.threshold_amount));
    if (body.below_threshold_rate !== undefined) current.below_threshold_rate = Math.max(0, Math.min(100, Number(body.below_threshold_rate)));
    if (body.above_threshold_rate !== undefined) current.above_threshold_rate = Math.max(0, Math.min(100, Number(body.above_threshold_rate)));
    if (body.gst_rate !== undefined) current.gst_rate = Math.max(0, Math.min(100, Number(body.gst_rate)));
    if (body.platform_gst_registered !== undefined) current.platform_gst_registered = Boolean(body.platform_gst_registered);
    if (body.platform_gstin !== undefined) current.platform_gstin = String(body.platform_gstin || '').trim();
    if (body.ugc_commission_pct !== undefined) current.ugc_commission_pct = Math.max(0, Math.min(100, Number(body.ugc_commission_pct)));
    if (body.min_withdrawal_amount !== undefined) current.min_withdrawal_amount = Math.max(0, Number(body.min_withdrawal_amount));
    if (body.withdrawal_fee_rate !== undefined) current.withdrawal_fee_rate = Math.max(0, Math.min(100, Number(body.withdrawal_fee_rate)));
    if (body.payout_freeze_all !== undefined) current.payout_freeze_all = Boolean(body.payout_freeze_all);
    if (body.dispute_refund_window_days !== undefined) current.dispute_refund_window_days = Math.max(0, Number(body.dispute_refund_window_days));
    if (body.min_campaign_budget !== undefined) current.min_campaign_budget = Math.max(0, Number(body.min_campaign_budget));
    if (body.max_campaign_budget !== undefined) current.max_campaign_budget = Math.max(0, Number(body.max_campaign_budget));
    current.updated_at = getIsoNow();

    db.fee_configs[0] = current;
    db.platform_fee_config = current;
    saveDb(db);

    if (supabase) {
      try {
        await (privilegedSupabase || supabase)
          .from('platform_fee_config')
          .upsert({
            id: 1,
            threshold_amount: current.threshold_amount,
            below_threshold_rate: current.below_threshold_rate,
            above_threshold_rate: current.above_threshold_rate,
            gst_rate: current.gst_rate,
            platform_gst_registered: current.platform_gst_registered,
            platform_gstin: current.platform_gstin,
            ugc_commission_pct: current.ugc_commission_pct,
            updated_at: current.updated_at
          });
      } catch (err) {
        console.error("Failed to sync fee config to Supabase:", err);
      }
    }

    await logAdminAction(user, 'edited_fees', 'platform_settings', 'fee-config', current);

    const full = await getFullFeeAndReferralConfig();
    res.json(full);
  });

  router.post("/admin/fee-config", async (req, res) => {
    const user = await parseAuthUser(req);
    if (!user || (user.role !== 'admin' && user.role !== 'sub_admin' && user.team_role !== 'sub_admin')) {
      return res.status(403).json({ error: "Unauthorized. Admin access required." });
    }

    const body = req.body || {};
    const creator_referral_reward = body.creator_referral_reward !== undefined ? Number(body.creator_referral_reward) : 500;
    const brand_referral_reward = body.brand_referral_reward !== undefined ? Number(body.brand_referral_reward) : 1000;
    const referral_trigger_action = body.referral_trigger_action ? String(body.referral_trigger_action) : 'first_completed_collab';
    const referral_monthly_cap = body.referral_monthly_cap !== undefined ? Number(body.referral_monthly_cap) : 10;
    const referral_enabled = body.referral_enabled !== undefined ? Boolean(body.referral_enabled) : true;

    const refObj = {
      creator_referral_reward,
      brand_referral_reward,
      referral_trigger_action,
      referral_monthly_cap,
      referral_enabled,
      updated_at: getIsoNow()
    };

    const db = getDb();
    db.referral_config = refObj;

    // Also sync with fee_configs[0]
    if (db.fee_configs && db.fee_configs[0]) {
      db.fee_configs[0] = { ...db.fee_configs[0], ...refObj };
    }
    saveDb(db);

    // Save to Supabase referral_config if available
    if (supabase) {
      try {
        const dbTriggerCondition = 'first_paid_collab_completed';
        await safePromiseTimeout(
          (privilegedSupabase || supabase)
            .from('referral_config')
            .upsert({
              id: 'singleton',
              creator_referral_reward,
              brand_referral_reward,
              trigger_condition: dbTriggerCondition,
              monthly_cap_per_user: referral_monthly_cap,
              is_active: referral_enabled,
              updated_at: getIsoNow()
            }, { onConflict: 'id' }),
          5000,
          null
        );
      } catch (err) {
        console.error("Supabase referral_config upsert error:", err);
      }
    }

    await logAdminAction(user, 'edited_referrals', 'platform_settings', 'referral-config', refObj);

    res.json({
      success: true,
      message: "Referral program configuration updated!",
      config: refObj
    });
  });

  router.get("/admin/referrals", async (req, res) => {
    const user = await parseAuthUser(req);
    if (!user || (user.role !== 'admin' && user.role !== 'sub_admin' && user.team_role !== 'sub_admin')) {
      return res.status(403).json({ error: "Unauthorized. Admin access required." });
    }
    const full = await getFullFeeAndReferralConfig();
    const db = getDb();
    res.json({
      config: full.config,
      activity: db.referrals || []
    });
  });
}
