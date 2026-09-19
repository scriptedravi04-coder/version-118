import express from "express";
import crypto from "crypto";

const getIsoNow = () => new Date().toISOString();

// Admin "Platform Tools" routes: app version drafting/publishing (with an
// in-app + realtime broadcast notification to all users on publish), and
// promo coupon management (create/update/pause/delete + redemption history).
export function setupAdminVersionsCouponsRoutes(
  app: express.Application,
  router: express.Router,
  {
    supabase,
    privilegedSupabase,
    getDb,
    saveDb,
    parseAuthUser,
    logAdminAction,
  }: {
    supabase: any;
    privilegedSupabase: any;
    getDb: () => any;
    saveDb: (db: any) => void;
    parseAuthUser: (req: express.Request) => Promise<any>;
    logAdminAction: (user: any, action: any, targetType: any, targetId: any, detail: any) => Promise<any>;
  }
) {
  // FEATURE 2: App Versions (PlatformTools.jsx)
  router.get("/admin/versions", async (req, res) => {
    const user = await parseAuthUser(req);
    if (!user || (user.role !== 'admin' && user.role !== 'sub_admin' && user.team_role !== 'sub_admin')) {
      return res.status(403).json({ error: "Unauthorized. Admin access required." });
    }

    let versionsList: any[] = [];
    if (supabase) {
      try {
        const { data, error } = await (privilegedSupabase || supabase)
          .from('app_versions')
          .select('*')
          .order('created_at', { ascending: false });
        if (!error && data) {
          versionsList = data;
        }
      } catch (err: any) {
        console.warn("[Admin Versions] Supabase fetch notice:", err.message);
      }
    }

    const db = getDb();
    if (!db.app_versions) db.app_versions = [];

    if (versionsList.length === 0) {
      versionsList = [...db.app_versions];
    } else {
      // Merge any locally drafted versions not yet in Supabase
      for (const lv of db.app_versions) {
        const exists = versionsList.some((sv: any) =>
          (sv.version_id && sv.version_id === (lv.version_id || lv.id)) ||
          (sv.id && sv.id === (lv.id || lv.version_id))
        );
        if (!exists) {
          versionsList.push(lv);
        }
      }
    }

    const formatted = versionsList.map((v: any) => {
      const isPublished = Boolean(v.is_published || v.status === 'published');
      return {
        id: v.version_id || v.id,
        version_id: v.version_id || v.id,
        version_number: v.version_number,
        target_audience: v.target_audience || 'all',
        changelog: Array.isArray(v.changelog)
          ? v.changelog
          : (typeof v.changelog === 'string' ? [v.changelog] : []),
        status: isPublished ? 'published' : (v.status || 'draft'),
        is_published: isPublished,
        created_by: v.created_by || 'admin',
        created_at: v.created_at || getIsoNow(),
        published_at: v.published_at || null
      };
    });

    formatted.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    res.json(formatted);
  });

  router.post("/admin/versions", async (req, res) => {
    const user = await parseAuthUser(req);
    if (!user || (user.role !== 'admin' && user.role !== 'sub_admin' && user.team_role !== 'sub_admin')) {
      return res.status(403).json({ error: "Unauthorized. Admin access required." });
    }

    const { version_number, target_audience, changelog } = req.body || {};
    if (!version_number || !String(version_number).trim()) {
      return res.status(400).json({ error: "version_number is required" });
    }

    const changelogArr = Array.isArray(changelog)
      ? changelog.map(item => String(item).trim()).filter(Boolean)
      : (changelog && String(changelog).trim() ? [String(changelog).trim()] : []);

    const versionId = crypto.randomUUID();
    const now = getIsoNow();
    const newVersion = {
      id: versionId,
      version_id: versionId,
      version_number: String(version_number).trim(),
      target_audience: target_audience ? String(target_audience).trim() : 'all',
      changelog: changelogArr,
      status: 'draft',
      is_published: false,
      created_by: user.user_id || 'admin',
      created_at: now,
      published_at: null
    };

    const db = getDb();
    if (!db.app_versions) db.app_versions = [];
    db.app_versions.unshift(newVersion);
    saveDb(db);

    if (supabase) {
      try {
        await (privilegedSupabase || supabase).from('app_versions').insert({
          version_id: versionId,
          version_number: newVersion.version_number,
          changelog: changelogArr,
          is_published: false,
          created_by: newVersion.created_by,
          created_at: now,
          published_at: null
        });
      } catch (err: any) {
        console.warn("[Admin Versions] Supabase insert notice:", err.message);
      }
    }

    await logAdminAction(user, 'create_version_draft', 'app_version', versionId, {
      version_number: newVersion.version_number,
      target_audience: newVersion.target_audience,
      changelog: changelogArr
    });

    res.json({
      success: true,
      message: "Version draft created",
      version: newVersion
    });
  });

  router.post("/admin/versions/:id/publish", async (req, res) => {
    const user = await parseAuthUser(req);
    if (!user || (user.role !== 'admin' && user.role !== 'sub_admin' && user.team_role !== 'sub_admin')) {
      return res.status(403).json({ error: "Unauthorized. Admin access required." });
    }

    const versionId = req.params.id;
    const db = getDb();
    if (!db.app_versions) db.app_versions = [];
    let ver = db.app_versions.find((v: any) => v.id === versionId || v.version_id === versionId);

    if (!ver && supabase) {
      try {
        const { data: sVer } = await (privilegedSupabase || supabase)
          .from('app_versions')
          .select('*')
          .eq('version_id', versionId)
          .maybeSingle();
        if (sVer) {
          ver = {
            id: sVer.version_id,
            version_id: sVer.version_id,
            version_number: sVer.version_number,
            target_audience: 'all',
            changelog: Array.isArray(sVer.changelog) ? sVer.changelog : [],
            status: 'draft',
            is_published: false,
            created_by: sVer.created_by || 'admin',
            created_at: sVer.created_at,
            published_at: null
          };
          db.app_versions.push(ver);
        }
      } catch (e: any) {
        console.warn("[Admin Versions] Supabase lookup notice:", e.message || e);
      }
    }

    if (!ver) {
      return res.status(404).json({ error: "Version not found" });
    }

    const publishedAt = getIsoNow();
    ver.status = 'published';
    ver.is_published = true;
    ver.published_at = publishedAt;
    saveDb(db);

    if (supabase) {
      try {
        await (privilegedSupabase || supabase).from('app_versions').update({
          is_published: true,
          published_at: publishedAt
        }).eq('version_id', ver.version_id || versionId);
      } catch (e: any) {
        console.warn("[Admin Versions] Supabase publish update notice:", e.message || e);
      }
    }

    // Broadcast user notifications:
    // 1. In-app announcement
    const notifId = `notif_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const audience = ver.target_audience || 'all';
    const displayVer = String(ver.version_number).startsWith('v') || String(ver.version_number).startsWith('V')
      ? ver.version_number
      : `v${ver.version_number}`;
    const changelogSummary = Array.isArray(ver.changelog) && ver.changelog.length > 0
      ? ver.changelog.map((c: string) => `• ${c}`).join('\n')
      : 'New improvements, performance enhancements, and bug fixes.';

    const notifPayload = {
      notif_id: notifId,
      user_id: audience,
      title: `Ybex App Update ${displayVer} is Live!`,
      message: `What's new in ${displayVer}:\n${changelogSummary}`,
      type: "admin_broadcast",
      subtype: "version_update",
      read: false,
      acknowledged: false,
      created_at: publishedAt
    };

    if (!db.notifications) db.notifications = [];
    db.notifications.unshift(notifPayload);
    saveDb(db);

    if (supabase) {
      try {
        await (privilegedSupabase || supabase).from("notifications").insert(notifPayload);
      } catch (sErr: any) {
        console.warn("[Admin Version Broadcast Supabase Notice]", sErr.message || sErr);
      }
    }

    // 2. Realtime WebSocket broadcast to active sessions
    const ioInstance = req.app.get("io");
    if (ioInstance) {
      ioInstance.emit("bell_notification", notifPayload);
      ioInstance.emit("new_notification", notifPayload);
      ioInstance.emit("version_published", {
        version_id: ver.version_id || versionId,
        version_number: ver.version_number,
        changelog: ver.changelog,
        target_audience: audience,
        published_at: publishedAt
      });
    }

    // Log admin action
    await logAdminAction(user, 'publish_app_version', 'app_version', ver.version_id || versionId, {
      version_number: ver.version_number,
      target_audience: ver.target_audience,
      published_at: publishedAt
    });

    res.json({
      success: true,
      message: "Version published! Active users have been notified.",
      version: ver
    });
  });

  // ─── ADMIN COUPON MANAGEMENT ROUTES (PlatformTools.jsx) ───
  router.get("/admin/coupons", async (req, res) => {
    const user = await parseAuthUser(req);
    if (!user || (user.role !== 'admin' && user.role !== 'sub_admin' && user.team_role !== 'sub_admin')) {
      return res.status(403).json({ error: "Unauthorized. Admin access required." });
    }

    let couponsList: any[] = [];
    if (supabase) {
      try {
        const { data, error } = await (privilegedSupabase || supabase)
          .from('coupons')
          .select('*')
          .order('created_at', { ascending: false });
        if (!error && data) {
          couponsList = data;
        } else if (error) {
          console.warn("[Admin Coupons] Supabase fetch notice:", error.message);
        }
      } catch (err: any) {
        console.warn("[Admin Coupons] Supabase fetch error:", err.message);
      }
    }

    const db = getDb();
    if (!db.coupons) db.coupons = [];

    if (couponsList.length === 0) {
      couponsList = [...db.coupons];
    } else {
      for (const lc of db.coupons) {
        const exists = couponsList.some((sc: any) =>
          (sc.id && sc.id === lc.id) ||
          (sc.code && sc.code.toUpperCase() === (lc.code || "").toUpperCase())
        );
        if (!exists) {
          couponsList.push(lc);
        }
      }
    }

    const formatted = couponsList.map((c: any) => ({
      id: c.id,
      code: c.code,
      type: c.type || 'flat_discount',
      discount_amount: Number(c.discount_amount) || 0,
      override_fee_rate: c.override_fee_rate !== null && c.override_fee_rate !== undefined ? Number(c.override_fee_rate) : null,
      applies_to_first_n_payouts: Number(c.applies_to_first_n_payouts) || 1,
      applies_to: c.applies_to || 'all',
      usage_limit: Number(c.usage_limit) || 100,
      used_count: Number(c.used_count) || 0,
      per_user_limit: Number(c.per_user_limit) || 1,
      valid_from: c.valid_from || c.created_at || getIsoNow(),
      valid_until: c.valid_until || null,
      min_campaign_value: c.min_campaign_value !== null && c.min_campaign_value !== undefined ? Number(c.min_campaign_value) : null,
      status: c.status || 'active',
      created_by: c.created_by || 'admin',
      created_at: c.created_at || getIsoNow(),
      updated_at: c.updated_at || getIsoNow()
    }));

    formatted.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    res.json(formatted);
  });

  router.post("/admin/coupons", async (req, res) => {
    const user = await parseAuthUser(req);
    if (!user || (user.role !== 'admin' && user.role !== 'sub_admin' && user.team_role !== 'sub_admin')) {
      return res.status(403).json({ error: "Unauthorized. Admin access required." });
    }

    const body = req.body || {};
    const rawCode = (body.code || "").trim().toUpperCase();
    if (!rawCode) {
      return res.status(400).json({ error: "Coupon code is required." });
    }

    const db = getDb();
    if (!db.coupons) db.coupons = [];

    const localExists = db.coupons.some((c: any) => (c.code || "").toUpperCase() === rawCode);
    if (localExists) {
      return res.status(400).json({ error: `Coupon code "${rawCode}" already exists.` });
    }

    if (supabase) {
      try {
        const { data: existing } = await (privilegedSupabase || supabase)
          .from('coupons')
          .select('id, code')
          .ilike('code', rawCode)
          .maybeSingle();
        if (existing) {
          return res.status(400).json({ error: `Coupon code "${rawCode}" already exists.` });
        }
      } catch (e: any) {
        console.warn("[Admin Coupons] Supabase existence check notice:", e.message);
      }
    }

    const couponId = `cp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const nowIso = getIsoNow();

    const couponRecord: any = {
      id: couponId,
      code: rawCode,
      type: body.type || 'flat_discount',
      discount_amount: Number(body.discount_amount) || 0,
      override_fee_rate: body.override_fee_rate !== null && body.override_fee_rate !== undefined && body.override_fee_rate !== "" ? Number(body.override_fee_rate) : null,
      applies_to_first_n_payouts: Number(body.applies_to_first_n_payouts) || 1,
      applies_to: body.applies_to || 'all',
      usage_limit: Number(body.usage_limit) || 100,
      used_count: 0,
      per_user_limit: Number(body.per_user_limit) || 1,
      valid_from: body.valid_from ? new Date(body.valid_from).toISOString() : nowIso,
      valid_until: body.valid_until ? new Date(body.valid_until).toISOString() : null,
      min_campaign_value: body.min_campaign_value !== null && body.min_campaign_value !== undefined && body.min_campaign_value !== "" ? Number(body.min_campaign_value) : null,
      status: body.status || 'active',
      created_by: user.user_id || 'admin',
      created_at: nowIso,
      updated_at: nowIso
    };

    if (supabase) {
      try {
        const { data: inserted, error: insertErr } = await (privilegedSupabase || supabase)
          .from('coupons')
          .insert({
            code: couponRecord.code,
            type: couponRecord.type,
            discount_amount: couponRecord.discount_amount,
            override_fee_rate: couponRecord.override_fee_rate,
            applies_to_first_n_payouts: couponRecord.applies_to_first_n_payouts,
            applies_to: couponRecord.applies_to,
            usage_limit: couponRecord.usage_limit,
            used_count: 0,
            per_user_limit: couponRecord.per_user_limit,
            valid_from: couponRecord.valid_from,
            valid_until: couponRecord.valid_until,
            min_campaign_value: couponRecord.min_campaign_value,
            status: couponRecord.status,
            created_by: user.user_id || null
          })
          .select()
          .single();

        if (insertErr) {
          console.warn("[Admin Coupons] Supabase insert warning:", insertErr.message);
        } else if (inserted) {
          couponRecord.id = inserted.id;
          couponRecord.created_at = inserted.created_at || couponRecord.created_at;
          couponRecord.updated_at = inserted.updated_at || couponRecord.updated_at;
        }
      } catch (sErr: any) {
        console.warn("[Admin Coupons] Supabase insert catch:", sErr.message);
      }
    }

    db.coupons.unshift(couponRecord);
    saveDb(db);

    await logAdminAction(user, 'create_coupon', 'coupons', String(couponRecord.id), {
      code: couponRecord.code,
      type: couponRecord.type,
      discount_amount: couponRecord.discount_amount
    });

    res.status(201).json({
      success: true,
      ok: true,
      message: "Coupon created successfully",
      coupon: couponRecord
    });
  });

  router.put("/admin/coupons/:id", async (req, res) => {
    const user = await parseAuthUser(req);
    if (!user || (user.role !== 'admin' && user.role !== 'sub_admin' && user.team_role !== 'sub_admin')) {
      return res.status(403).json({ error: "Unauthorized. Admin access required." });
    }

    const couponId = req.params.id;
    const body = req.body || {};
    const nowIso = getIsoNow();

    const db = getDb();
    if (!db.coupons) db.coupons = [];

    const existingIndex = db.coupons.findIndex((c: any) => String(c.id) === String(couponId) || String(c.code).toUpperCase() === String(body.code || "").toUpperCase());
    
    const updateData: any = {
      type: body.type || 'flat_discount',
      discount_amount: Number(body.discount_amount) || 0,
      override_fee_rate: body.override_fee_rate !== null && body.override_fee_rate !== undefined && body.override_fee_rate !== "" ? Number(body.override_fee_rate) : null,
      applies_to_first_n_payouts: Number(body.applies_to_first_n_payouts) || 1,
      applies_to: body.applies_to || 'all',
      usage_limit: Number(body.usage_limit) || 100,
      per_user_limit: Number(body.per_user_limit) || 1,
      valid_from: body.valid_from ? new Date(body.valid_from).toISOString() : nowIso,
      valid_until: body.valid_until ? new Date(body.valid_until).toISOString() : null,
      min_campaign_value: body.min_campaign_value !== null && body.min_campaign_value !== undefined && body.min_campaign_value !== "" ? Number(body.min_campaign_value) : null,
      status: body.status || 'active',
      updated_at: nowIso
    };
    if (body.code) updateData.code = String(body.code).trim().toUpperCase();

    if (supabase) {
      try {
        await (privilegedSupabase || supabase)
          .from('coupons')
          .update(updateData)
          .eq('id', couponId);
      } catch (err: any) {
        console.warn("[Admin Coupons] Supabase update warning:", err.message);
      }
    }

    if (existingIndex >= 0) {
      db.coupons[existingIndex] = { ...db.coupons[existingIndex], ...updateData };
      saveDb(db);
    }

    res.json({
      success: true,
      ok: true,
      message: "Coupon updated successfully",
      coupon: { id: couponId, ...(existingIndex >= 0 ? db.coupons[existingIndex] : updateData) }
    });
  });

  router.patch("/admin/coupons/:id/status", async (req, res) => {
    const user = await parseAuthUser(req);
    if (!user || (user.role !== 'admin' && user.role !== 'sub_admin' && user.team_role !== 'sub_admin')) {
      return res.status(403).json({ error: "Unauthorized. Admin access required." });
    }

    const couponId = req.params.id;
    const { status } = req.body || {};
    if (!status || typeof status !== 'string') {
      return res.status(400).json({ error: "Valid status string is required (e.g. 'active' or 'paused')." });
    }

    const normalizedStatus = status.trim().toLowerCase();
    const nowIso = getIsoNow();

    const db = getDb();
    if (!db.coupons) db.coupons = [];

    const existing = db.coupons.find((c: any) => String(c.id) === String(couponId));
    if (existing) {
      existing.status = normalizedStatus;
      existing.updated_at = nowIso;
      saveDb(db);
    }

    if (supabase) {
      try {
        await (privilegedSupabase || supabase)
          .from('coupons')
          .update({ status: normalizedStatus, updated_at: nowIso })
          .eq('id', couponId);
      } catch (err: any) {
        console.warn("[Admin Coupons] Supabase patch status notice:", err.message);
      }
    }

    await logAdminAction(user, 'update_coupon_status', 'coupons', String(couponId), {
      status: normalizedStatus
    });

    res.json({
      success: true,
      ok: true,
      id: couponId,
      status: normalizedStatus,
      message: `Coupon status updated to ${normalizedStatus}`
    });
  });

  router.delete("/admin/coupons/:id", async (req, res) => {
    const user = await parseAuthUser(req);
    if (!user || (user.role !== 'admin' && user.role !== 'sub_admin' && user.team_role !== 'sub_admin')) {
      return res.status(403).json({ error: "Unauthorized. Admin access required." });
    }

    const couponId = req.params.id;

    if (supabase) {
      try {
        await (privilegedSupabase || supabase)
          .from('coupon_redemptions')
          .delete()
          .eq('coupon_id', couponId);

        const { error: delErr } = await (privilegedSupabase || supabase)
          .from('coupons')
          .delete()
          .eq('id', couponId);

        if (delErr) {
          console.warn("[Admin Coupons] Supabase delete warning:", delErr.message);
        }
      } catch (err: any) {
        console.warn("[Admin Coupons] Supabase delete notice:", err.message);
      }
    }

    const db = getDb();
    if (db.coupons) {
      db.coupons = db.coupons.filter((c: any) => String(c.id) !== String(couponId));
    }
    if (db.coupon_redemptions) {
      db.coupon_redemptions = db.coupon_redemptions.filter((r: any) => String(r.coupon_id) !== String(couponId));
    }
    saveDb(db);

    await logAdminAction(user, 'delete_coupon', 'coupons', String(couponId), {});

    res.json({
      success: true,
      ok: true,
      id: couponId,
      message: "Coupon deleted successfully"
    });
  });

  router.get("/admin/coupons/:id/redemptions", async (req, res) => {
    const user = await parseAuthUser(req);
    if (!user || (user.role !== 'admin' && user.role !== 'sub_admin' && user.team_role !== 'sub_admin')) {
      return res.status(403).json({ error: "Unauthorized. Admin access required." });
    }

    const couponId = req.params.id;
    let redemptionsList: any[] = [];

    if (supabase) {
      try {
        const { data, error } = await (privilegedSupabase || supabase)
          .from('coupon_redemptions')
          .select('*')
          .eq('coupon_id', couponId)
          .order('redeemed_at', { ascending: false });

        if (!error && data) {
          redemptionsList = data;
        } else if (error) {
          console.warn("[Admin Coupons] Supabase fetch redemptions notice:", error.message);
        }
      } catch (err: any) {
        console.warn("[Admin Coupons] Supabase redemptions error:", err.message);
      }
    }

    const db = getDb();
    if (!db.coupon_redemptions) db.coupon_redemptions = [];

    if (redemptionsList.length === 0) {
      redemptionsList = (db.coupon_redemptions || []).filter((r: any) => String(r.coupon_id) === String(couponId));
    }

    const userIds = [...new Set(redemptionsList.map((r: any) => r.user_id).filter(Boolean))];
    const userMap: Record<string, any> = {};

    if (userIds.length > 0 && supabase) {
      try {
        const { data: uData } = await (privilegedSupabase || supabase)
          .from('users')
          .select('user_id, name, email, picture')
          .in('user_id', userIds);
        if (uData) {
          uData.forEach((u: any) => { userMap[u.user_id] = u; });
        }
      } catch (e: any) {
        // ignore
      }
    }

    const enriched = redemptionsList.map((r: any) => {
      const u = userMap[r.user_id] || (db.users || []).find((usr: any) => usr.user_id === r.user_id) || null;
      return {
        ...r,
        user_name: u?.name || "User",
        user_email: u?.email || "",
        user: u
      };
    });

    res.json(enriched);
  });
}
