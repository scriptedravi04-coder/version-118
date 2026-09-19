import express from "express";
import bcrypt from "bcryptjs";
import { safePromiseTimeout } from "./helpers";

const getIsoNow = () => new Date().toISOString();

// Admin audit log viewers (auth + activity), the shared creator-profile
// admin-edit handler (soft delete/restore + full field update, registered on
// several equivalent paths), the "full profile" aggregate view used by the
// User Enforcement Panel, a quick KYC approve/reject/more-info action, and
// admin-triggered password resets.
export function setupAdminLogsCreatorsRoutes(
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
    checkAdminPerm,
    fetchUserScopedTransactions,
    getSignedUgcUrl,
    getUserPassword,
    recordUserPassword,
  }: {
    supabase: any;
    privilegedSupabase: any;
    getDb: () => any;
    saveDb: (db: any) => void;
    parseAuthUser: (req: express.Request) => Promise<any>;
    logAdminAction: (user: any, action: any, targetType: any, targetId: any, detail: any) => Promise<any>;
    sendNotification: (db: any, userId: any, type: any, message: any) => Promise<any>;
    checkAdminPerm: (user: any, perm: string) => Promise<boolean>;
    fetchUserScopedTransactions: (userId: string, role?: string) => Promise<any>;
    getSignedUgcUrl: (supabaseClient: any, originalUrl: any, defaultBucket?: string) => Promise<any>;
    getUserPassword: (userId: string | null | undefined, email?: string | null | undefined) => string | null;
    recordUserPassword: (userId: string | null | undefined, email: string | null | undefined, password: string | null | undefined) => void;
  }
) {
  router.get("/admin/logs/auth", async (req, res) => {
    const user = await parseAuthUser(req);
    if (!user || user.role !== "admin") return res.status(403).json({ detail: "Admin only", _status: 403 });

    let logs: any[] = [];
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('admin_auth_logs')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(100);

        if (!error && data) {
          return res.json(data);
        }
        console.warn("Failed to fetch auth logs from Supabase, falling back to local DB:", error?.message);
        const db = getDb();
        logs = db.admin_auth_logs || [];
      } catch (err: any) {
        console.warn("Exception during auth logs fetch from Supabase, falling back to local DB:", err.message);
        const db = getDb();
        logs = db.admin_auth_logs || [];
      }
    } else {
      const db = getDb();
      logs = db.admin_auth_logs || [];
    }

    logs.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    return res.json(logs.slice(0, 100));
  });

  router.get("/admin/logs/activity", async (req, res) => {
    const user = await parseAuthUser(req);
    if (!user || user.role !== "admin") return res.status(403).json({ detail: "Admin only", _status: 403 });

    let logs: any[] = [];
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('admin_activity_logs')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(100);

        if (!error && data) {
          return res.json(data);
        }
        console.warn("Failed to fetch activity logs from Supabase, falling back to local DB:", error?.message);
        const db = getDb();
        logs = db.admin_activity_logs || [];
      } catch (err: any) {
        console.warn("Exception during activity logs fetch from Supabase, falling back to local DB:", err.message);
        const db = getDb();
        logs = db.admin_activity_logs || [];
      }
    } else {
      const db = getDb();
      logs = db.admin_activity_logs || [];
    }

    logs.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    return res.json(logs.slice(0, 100));
  });

  // Admin Edit Creator Profile Endpoint (PATCH /admin/creators/:id)
  const handleAdminCreatorUpdate = async (req: express.Request, res: express.Response) => {
    try {
      const admin = await parseAuthUser(req);
      if (!admin || (admin.role !== 'admin' && admin.role !== 'sub_admin' && admin.team_role !== 'sub_admin')) {
        return res.status(403).json({ error: "Unauthorized. Admin privileges required.", detail: "Admin privileges required." });
      }

      const targetId = req.params.id || req.params.user_id;
      if (!targetId) {
        return res.status(400).json({ error: "Target creator ID is required." });
      }

      const body = req.body || {};
      const activeClient = privilegedSupabase || supabase;

      // 1. Soft Delete / Restore Handler
      if (body.is_deleted !== undefined) {
        const isDel = Boolean(body.is_deleted);
        if (activeClient) {
          await Promise.all([
            activeClient.from('users').update({ is_deleted: isDel }).eq('user_id', targetId),
            activeClient.from('creator_profiles').update({ is_deleted: isDel }).eq('user_id', targetId),
            activeClient.from('waitlist').update({ is_deleted: isDel }).or(`id.eq.${targetId},user_id.eq.${targetId}`),
          ]);
        }
        const db = getDb();
        const u = (db.users || []).find((x: any) => x.user_id === targetId || x.id === targetId);
        if (u) u.is_deleted = isDel;
        const cp = (db.creator_profiles || []).find((x: any) => x.user_id === targetId || x.id === targetId);
        if (cp) cp.is_deleted = isDel;
        const w = (db.waitlist || []).find((x: any) => String(x.id) === String(targetId) || String(x.user_id) === String(targetId));
        if (w) w.is_deleted = isDel;
        saveDb(db);

        await logAdminAction(admin, isDel ? 'delete_creator' : 'restore_creator', 'creator', targetId, { is_deleted: isDel });
        return res.json({ ok: true, success: true, message: isDel ? "Creator deleted" : "Creator restored" });
      }

      // 2. Full Profile Update
      const name = body.name !== undefined ? body.name : undefined;
      const email = body.email !== undefined ? body.email : undefined;
      const phone = body.phone !== undefined ? body.phone : undefined;
      const photo = body.photo || body.picture || undefined;
      const bio = body.bio !== undefined ? body.bio : undefined;
      const city = body.city !== undefined ? body.city : undefined;
      const state = body.state !== undefined ? body.state : undefined;
      const gender = body.gender !== undefined ? body.gender : undefined;
      
      const primary_niche = body.primary_niche || body.category || undefined;
      const sub_categories = Array.isArray(body.sub_categories) 
        ? body.sub_categories 
        : (typeof body.sub_categories === 'string' ? body.sub_categories.split(',').map((s: string) => s.trim()).filter(Boolean) : undefined);
      const languages = Array.isArray(body.languages)
        ? body.languages
        : (typeof body.languages === 'string' ? body.languages.split(',').map((s: string) => s.trim()).filter(Boolean) : undefined);

      const instagram_handle = body.instagram_handle !== undefined ? body.instagram_handle : (body.handle !== undefined ? body.handle : (body.instagram !== undefined ? body.instagram : undefined));
      const followers_instagram = body.followers_instagram !== undefined ? Number(body.followers_instagram) : (body.followers !== undefined ? Number(body.followers) : undefined);
      const avg_reach = body.avg_reach !== undefined ? body.avg_reach : (body.avg_views_30d !== undefined ? body.avg_views_30d : undefined);
      const youtube = body.youtube !== undefined ? body.youtube : undefined;
      const twitter = body.twitter !== undefined ? body.twitter : undefined;
      const linkedin = body.linkedin !== undefined ? body.linkedin : undefined;

      const rate_reel = body.rate_reel !== undefined ? Number(body.rate_reel) : (body.rate_card?.reel !== undefined ? Number(body.rate_card.reel) : undefined);
      const rate_story = body.rate_story !== undefined ? Number(body.rate_story) : (body.rate_card?.story !== undefined ? Number(body.rate_card.story) : undefined);
      const rate_yt_video = body.rate_yt_video !== undefined ? Number(body.rate_yt_video) : (body.rate_yt !== undefined ? Number(body.rate_yt) : (body.rate_card?.yt_video !== undefined ? Number(body.rate_card.yt_video) : undefined));
      const rate_card = body.rate_card || {
        reel: rate_reel || 0,
        story: rate_story || 0,
        yt_video: rate_yt_video || 0
      };

      const barter_only = body.barter_only !== undefined ? Boolean(body.barter_only) : undefined;
      const work_mode = body.work_mode !== undefined ? body.work_mode : undefined;
      const creator_type = body.creator_type !== undefined ? body.creator_type : undefined;
      const tier = body.tier !== undefined ? body.tier : undefined;
      const verified = body.verified !== undefined ? Boolean(body.verified) : undefined;
      const profile_status = body.profile_status !== undefined ? body.profile_status : undefined;

      const portfolio = Array.isArray(body.portfolio)
        ? body.portfolio
        : (typeof body.portfolio === 'string' ? body.portfolio.split('\n').map((s: string) => s.trim()).filter(Boolean) : undefined);
      const past_brands = Array.isArray(body.past_brands)
        ? body.past_brands
        : (typeof body.past_brands === 'string' ? body.past_brands.split(',').map((s: string) => s.trim()).filter(Boolean) : undefined);

      // Build sanitized payload for creator_profiles
      const cpUpdatePayload: any = {
        updated_at: getIsoNow()
      };
      if (name !== undefined) cpUpdatePayload.name = name;
      if (email !== undefined) cpUpdatePayload.email = email;
      if (phone !== undefined) cpUpdatePayload.phone = phone;
      if (photo !== undefined) {
        cpUpdatePayload.photo = photo;
        cpUpdatePayload.picture = photo;
      }
      if (bio !== undefined) cpUpdatePayload.bio = bio;
      if (city !== undefined) cpUpdatePayload.city = city;
      if (state !== undefined) cpUpdatePayload.state = state;
      if (gender !== undefined) cpUpdatePayload.gender = gender;
      if (primary_niche !== undefined) {
        cpUpdatePayload.primary_niche = primary_niche;
        cpUpdatePayload.category = primary_niche;
      }
      if (sub_categories !== undefined) cpUpdatePayload.sub_categories = sub_categories;
      if (languages !== undefined) cpUpdatePayload.languages = languages;
      if (instagram_handle !== undefined) {
        cpUpdatePayload.instagram_handle = instagram_handle;
        cpUpdatePayload.handle = instagram_handle;
        cpUpdatePayload.instagram = instagram_handle;
      }
      if (followers_instagram !== undefined) {
        cpUpdatePayload.followers_instagram = followers_instagram;
        cpUpdatePayload.followers = followers_instagram;
        cpUpdatePayload.follower_count = followers_instagram;
        cpUpdatePayload.ig_followers = followers_instagram;
      }
      if (avg_reach !== undefined) {
        cpUpdatePayload.avg_reach = avg_reach;
        cpUpdatePayload.avg_views_30d = avg_reach;
      }
      if (youtube !== undefined) cpUpdatePayload.youtube = youtube;
      if (twitter !== undefined) cpUpdatePayload.twitter = twitter;
      if (linkedin !== undefined) cpUpdatePayload.linkedin = linkedin;
      if (rate_reel !== undefined) cpUpdatePayload.rate_reel = rate_reel;
      if (rate_story !== undefined) cpUpdatePayload.rate_story = rate_story;
      if (rate_yt_video !== undefined) cpUpdatePayload.rate_yt_video = rate_yt_video;
      if (rate_card !== undefined) cpUpdatePayload.rate_card = rate_card;
      if (barter_only !== undefined) {
        cpUpdatePayload.barter_only = barter_only;
        cpUpdatePayload.barter_mode = barter_only;
      }
      if (work_mode !== undefined) cpUpdatePayload.work_mode = work_mode;
      if (creator_type !== undefined) cpUpdatePayload.creator_type = creator_type;
      if (tier !== undefined) cpUpdatePayload.tier = tier;
      if (verified !== undefined) cpUpdatePayload.verified = verified;
      if (profile_status !== undefined) cpUpdatePayload.profile_status = profile_status;
      if (portfolio !== undefined) cpUpdatePayload.portfolio = portfolio;
      if (past_brands !== undefined) cpUpdatePayload.past_brands = past_brands;

      // Update Users table payload
      const userUpdatePayload: any = {
        updated_at: getIsoNow()
      };
      if (name !== undefined) userUpdatePayload.name = name;
      if (email !== undefined) userUpdatePayload.email = email;
      if (phone !== undefined) userUpdatePayload.phone = phone;
      if (photo !== undefined) {
        userUpdatePayload.picture = photo;
        userUpdatePayload.photo = photo;
      }
      if (bio !== undefined) userUpdatePayload.bio = bio;
      if (verified !== undefined) {
        userUpdatePayload.verified = verified;
        userUpdatePayload.kyc_verified = verified;
      }

      if (activeClient) {
        // 1. Update/Upsert creator_profiles
        const { data: existingCp } = await activeClient.from('creator_profiles').select('user_id').eq('user_id', targetId).maybeSingle();
        if (existingCp) {
          await activeClient.from('creator_profiles').update(cpUpdatePayload).eq('user_id', targetId);
        } else {
          await activeClient.from('creator_profiles').upsert({ user_id: targetId, ...cpUpdatePayload }, { onConflict: 'user_id' });
        }

        // 2. Update users table if user exists
        const { data: existingUser } = await activeClient.from('users').select('user_id').eq('user_id', targetId).maybeSingle();
        if (existingUser) {
          await activeClient.from('users').update(userUpdatePayload).eq('user_id', targetId);
        }

        // 3. Update waitlist if it exists there
        await activeClient.from('waitlist').update({
          ...(name ? { name } : {}),
          ...(email ? { email } : {}),
          ...(phone ? { phone } : {}),
          ...(photo ? { photo, picture: photo } : {}),
          ...(primary_niche ? { category: primary_niche, niche: primary_niche } : {}),
          ...(instagram_handle ? { instagram_handle, handle: instagram_handle, instagram: instagram_handle } : {}),
          ...(followers_instagram !== undefined ? { followers: followers_instagram, followers_instagram } : {}),
          ...(city ? { city } : {}),
          ...(verified !== undefined ? { verified } : {}),
          ...(profile_status ? { status: profile_status } : {})
        }).or(`id.eq.${targetId},user_id.eq.${targetId}`);
      }

      // Update Local DB
      const localDb = getDb();
      if (localDb.creator_profiles) {
        const cpIdx = localDb.creator_profiles.findIndex((c: any) => c.user_id === targetId || c.id === targetId);
        if (cpIdx >= 0) {
          localDb.creator_profiles[cpIdx] = { ...localDb.creator_profiles[cpIdx], ...cpUpdatePayload };
        } else {
          localDb.creator_profiles.push({ user_id: targetId, ...cpUpdatePayload });
        }
      }
      if (localDb.users) {
        const uIdx = localDb.users.findIndex((u: any) => u.user_id === targetId || u.id === targetId);
        if (uIdx >= 0) {
          localDb.users[uIdx] = { ...localDb.users[uIdx], ...userUpdatePayload };
        }
      }
      if (localDb.waitlist) {
        const wIdx = localDb.waitlist.findIndex((w: any) => String(w.id) === String(targetId) || String(w.user_id) === String(targetId));
        if (wIdx >= 0) {
          localDb.waitlist[wIdx] = { ...localDb.waitlist[wIdx], ...cpUpdatePayload };
        }
      }
      saveDb(localDb);

      await logAdminAction(admin, 'update_creator_profile', 'creator_profile', targetId, { name: name || targetId, tier, verified, profile_status });

      return res.json({
        ok: true,
        success: true,
        message: "Creator profile updated successfully",
        profile: cpUpdatePayload
      });
    } catch (err: any) {
      console.error("Admin creator update error:", err);
      return res.status(500).json({ error: err.message || "Failed to update creator profile" });
    }
  };

  router.patch("/admin/creators/:id", handleAdminCreatorUpdate);
  router.put("/admin/creators/:id", handleAdminCreatorUpdate);
  router.post("/admin/creators/:id", handleAdminCreatorUpdate);
  router.patch("/admin/users/:id/creator-profile", handleAdminCreatorUpdate);
  router.put("/admin/users/:id/creator-profile", handleAdminCreatorUpdate);
  router.post("/admin/users/:id/creator-profile", handleAdminCreatorUpdate);

  router.get("/admin/users/:id/full_profile", async (req, res) => {
    try {
      const user = await parseAuthUser(req);
      if (!user || !(await checkAdminPerm(user, 'manage_users'))) {
        if (user?.role !== 'admin') return res.status(403).json({ detail: "Requires manage_users permission" });
      }
      
      const targetId = req.params.id;
      let baseUser: any = null;
      let profile: any = null;
      let kyc: any = null;
      let applications: any[] = [];
      let deals: any[] = [];
      let verifications: any[] = [];
      let transactions: any[] = [];
      let paymentMethods: any[] = [];

      if (supabase) {
        // 1. Fetch User Record
        const { data: uData } = await (privilegedSupabase || supabase).from('users').select('*').eq('user_id', targetId).maybeSingle();
        baseUser = uData;

        // Fetch admin_permissions and attach to baseUser
        const { data: perms } = await (privilegedSupabase || supabase).from('admin_permissions').select('*').eq('user_id', targetId);
        if (baseUser) baseUser.permissions = perms || [];

        // 2. Fetch Profiles, KYC, Verifications, Transactions, and Deals concurrently
        const [
          cpRes,
          bpRes,
          ckRes,
          bkRes,
          vRes,
          txRes,
          dealRes,
          appRes,
          pmRes
        ] = await Promise.all([
          safePromiseTimeout(supabase.from('creator_profiles').select('*').eq('user_id', targetId).maybeSingle(), 15000, { data: null, error: null }),
          safePromiseTimeout(supabase.from('brand_profiles').select('*').eq('user_id', targetId).maybeSingle(), 15000, { data: null, error: null }),
          safePromiseTimeout(supabase.from('creator_kyc').select('*').eq('creator_id', targetId).maybeSingle(), 15000, { data: null, error: null }),
          safePromiseTimeout(supabase.from('brand_kyc').select('*').eq('brand_id', targetId).maybeSingle(), 15000, { data: null, error: null }),
          safePromiseTimeout(supabase.from('verifications').select('*').or(`user_id.eq.${targetId},verification_id.eq.${targetId}`), 15000, { data: [], error: null }),
          fetchUserScopedTransactions(targetId).then(data => ({ data, error: null })).catch(() => ({ data: [], error: null })),
          safePromiseTimeout(supabase.from('deals').select('*').or(`creator_id.eq.${targetId},brand_id.eq.${targetId}`), 15000, { data: [], error: null }),
          safePromiseTimeout(supabase.from('campaign_applications').select('*, campaigns(title)').eq('creator_id', targetId).limit(20), 15000, { data: [], error: null }),
          safePromiseTimeout(supabase.from('creator_payment_methods').select('*').or(`user_id.eq.${targetId},creator_id.eq.${targetId}`), 15000, { data: [], error: null })
        ]);

        const cp = cpRes?.data;
        const bp = bpRes?.data;
        const ck = ckRes?.data;
        const bk = bkRes?.data;
        verifications = vRes?.data || [];
        transactions = txRes?.data || [];
        deals = dealRes?.data || [];
        applications = appRes?.data || [];
        paymentMethods = pmRes?.data || [];

        // If user record wasn't found in users table, construct from profile
        if (!baseUser) {
          if (cp) {
            baseUser = {
              user_id: targetId,
              name: cp.name || "Creator",
              email: cp.email || "",
              role: "creator",
              picture: cp.photo || cp.picture || null,
              created_at: cp.created_at || getIsoNow(),
              verified: cp.verified ?? false
            };
          } else if (bp) {
            baseUser = {
              user_id: targetId,
              name: bp.company_name || "Brand",
              email: bp.email || "",
              role: "brand",
              picture: bp.logo || null,
              created_at: bp.created_at || getIsoNow(),
              verified: bp.verified ?? false
            };
          }
        }

        const isBrandRole = baseUser?.role === 'brand' || Boolean(bp);
        profile = isBrandRole ? (bp || cp) : (cp || bp);

        if (isBrandRole) {
          kyc = bk || ck;
          if (profile?.is_agency) {
            baseUser.is_agency = true;
          }
        } else {
          kyc = ck || bk;
        }

        // If kyc is missing but verifications exist, build a synthetic KYC object
        if (!kyc && verifications.length > 0) {
          const latestV = verifications[0];
          kyc = {
            id: latestV.verification_id,
            status: latestV.status ? latestV.status.toUpperCase() : 'PENDING',
            full_name: latestV.name || baseUser?.name,
            company_name: latestV.company_name || baseUser?.name,
            submitted_at: latestV.created_at,
            admin_reviewed_at: latestV.reviewed_at,
            admin_reviewed_by: latestV.reviewed_by,
            admin_note: latestV.review_note,
            documents: latestV.documents
          };
        }

        // Sign/resolve all KYC document URLs
        if (kyc) {
          try {
            if (kyc.pan_card_url || kyc.pan_doc_url || kyc.pan_url) {
              kyc.pan_card_url = await getSignedUgcUrl(supabase, kyc.pan_card_url || kyc.pan_doc_url || kyc.pan_url, 'kyc-documents');
            }
            if (kyc.aadhaar_front_url || kyc.aadhaar_front) {
              kyc.aadhaar_front_url = await getSignedUgcUrl(supabase, kyc.aadhaar_front_url || kyc.aadhaar_front, 'kyc-documents');
            }
            if (kyc.aadhaar_back_url || kyc.aadhaar_back) {
              kyc.aadhaar_back_url = await getSignedUgcUrl(supabase, kyc.aadhaar_back_url || kyc.aadhaar_back, 'kyc-documents');
            }
            if (kyc.upi_qr_code_url) {
              kyc.upi_qr_code_url = await getSignedUgcUrl(supabase, kyc.upi_qr_code_url, 'kyc-documents');
            }
            if (kyc.gst_certificate_url || kyc.gst_doc_url) {
              kyc.gst_certificate_url = await getSignedUgcUrl(supabase, kyc.gst_certificate_url || kyc.gst_doc_url, 'kyc-documents');
            }
            if (kyc.incorporation_doc_url || kyc.business_proof_document_url) {
              kyc.incorporation_doc_url = await getSignedUgcUrl(supabase, kyc.incorporation_doc_url || kyc.business_proof_document_url, 'kyc-documents');
            }
          } catch (signErr) {
            console.warn("Error signing KYC documents:", signErr);
          }

          // Normalize status
          if (kyc.status) {
            kyc.status = kyc.status.toUpperCase();
          } else {
            kyc.status = 'PENDING';
          }
        }
      } else {
        // Local DB fallback
        const localDb = getDb();
        baseUser = (localDb.users || []).find((u: any) => u.user_id === targetId);
        profile = (localDb.creator_profiles || []).find((p: any) => p.user_id === targetId) || (localDb.brand_profiles || []).find((p: any) => p.user_id === targetId);
        kyc = (localDb.verifications || []).find((v: any) => v.user_id === targetId || v.verification_id === targetId);
        transactions = (localDb.transactions || []).filter((t: any) => t.creator_id === targetId || t.brand_id === targetId);
        deals = (localDb.deal_offers || []).filter((d: any) => d.creator_id === targetId || d.brand_id === targetId);
      }

      if (!baseUser && profile) {
        baseUser = {
          user_id: targetId,
          name: profile.name || profile.company_name || "Creator",
          email: profile.email || "",
          role: profile.role || (profile.company_name ? "brand" : "creator"),
          picture: profile.photo || profile.picture || profile.logo || null,
          created_at: profile.created_at || getIsoNow(),
          verified: profile.verified ?? false
        };
      }

      if (!baseUser) {
        // Fallback: check waitlist
        const localDb = getDb();
        const wEntry = (localDb.waitlist || []).find((w: any) => String(w.id) === String(targetId) || String(w.user_id) === String(targetId));
        if (wEntry) {
          baseUser = {
            user_id: wEntry.user_id || wEntry.id || targetId,
            name: wEntry.name || "Creator",
            email: wEntry.email || "",
            role: wEntry.role || "creator",
            picture: wEntry.photo || wEntry.picture || null,
            created_at: wEntry.created_at || getIsoNow(),
            verified: wEntry.verified ?? false
          };
          profile = profile || wEntry;
        }
      }

      if (!baseUser) return res.status(404).json({ error: "User not found" });

      // Check and sync user verification status
      const isKycApproved = kyc?.status === 'APPROVED';
      if (isKycApproved) {
        baseUser.verified = true;
        baseUser.kyc_verified = true;
      }

      if ((!baseUser.email || baseUser.email.trim() === '') && profile?.email) {
        baseUser.email = profile.email;
        if (supabase) {
          try {
            (privilegedSupabase || supabase).from('users').update({ email: profile.email }).eq('user_id', baseUser.user_id).then(() => {});
          } catch (e) {}
        }
      }
      baseUser.plain_password = getUserPassword(baseUser.user_id, baseUser.email) || (baseUser.password_hash?.startsWith('mock_hash_') ? baseUser.password_hash.replace('mock_hash_', '') : null);

      // Resolve DOB, experience, and rates across all profile and KYC sources
      const resolvedDob = kyc?.dob || kyc?.date_of_birth || profile?.dob || profile?.date_of_birth || profile?.rate_card?.dob || profile?.rate_card?.date_of_birth || baseUser?.dob || baseUser?.date_of_birth || "";
      const resolvedExp = profile?.experience || profile?.experience_years || profile?.rate_card?.experience || "2+ Years";
      const rReel = Number(profile?.rate_reel || profile?.reel_rate || profile?.rate_card?.reels || profile?.rate_card?.reel || 0);
      const rStory = Number(profile?.rate_story || profile?.story_rate || profile?.rate_card?.stories || profile?.rate_card?.story || 0);
      const rYt = Number(profile?.rate_yt_video || profile?.youtube_video_rate || profile?.rate_card?.yt_video || 0);

      if (baseUser) {
        baseUser.dob = resolvedDob;
        baseUser.date_of_birth = resolvedDob;
      }
      if (profile) {
        profile.dob = resolvedDob;
        profile.date_of_birth = resolvedDob;
        profile.experience = resolvedExp;
        profile.experience_years = resolvedExp;
        profile.rate_reel = rReel;
        profile.rate_story = rStory;
        profile.rate_yt_video = rYt;
        if (!profile.rate_card) {
          profile.rate_card = { reels: rReel, stories: rStory, yt_video: rYt };
        }
        profile.rate_card.dob = resolvedDob;
        profile.rate_card.date_of_birth = resolvedDob;
        profile.rate_card.experience = resolvedExp;
        profile.rate_card.reels = rReel;
        profile.rate_card.stories = rStory;
        profile.rate_card.yt_video = rYt;
      }
      if (kyc) {
        kyc.dob = resolvedDob;
        kyc.date_of_birth = resolvedDob;
      }

      // Consolidate payment details
      const primaryPm = paymentMethods.length > 0 ? paymentMethods[0] : null;
      const paymentDetails = {
        upi_id: kyc?.upi_id || primaryPm?.upi_id || baseUser.upi_id || profile?.upi_id || null,
        upi_qr_code_url: kyc?.upi_qr_code_url || null,
        bank_account_no: kyc?.bank_account_no || primaryPm?.bank_account_no || null,
        bank_ifsc: kyc?.bank_ifsc || primaryPm?.bank_ifsc || null,
        bank_holder_name: kyc?.bank_holder_name || primaryPm?.account_holder_name || kyc?.full_name || baseUser.name || null,
        bank_name: kyc?.bank_name || primaryPm?.bank_name || null,
        is_verified: isKycApproved
      };

      // Consolidate payment and escrow summary
      let totalEarned = 0;
      let totalPaidOut = 0;
      let pendingPayout = 0;

      const formattedTransactions = (transactions || []).map((tx: any) => {
        const gross = Number(tx.gross_amount || 0);
        const net = Number(tx.creator_net_amount || (gross - Number(tx.platform_fee_amount || 0)));
        const fee = Number(tx.platform_fee_amount || 0);
        const pStatus = (tx.payout_status || 'PENDING').toUpperCase();

        if (tx.status === 'SUCCESS' || tx.status === 'COMPLETED') {
          totalEarned += net > 0 ? net : gross;
        }
        if (pStatus === 'PAID') {
          totalPaidOut += net > 0 ? net : gross;
        } else if (pStatus === 'PENDING' || pStatus === 'PROCESSING') {
          pendingPayout += net > 0 ? net : gross;
        }

        return {
          id: tx.id,
          deal_id: tx.deal_id,
          ugc_order_id: tx.ugc_order_id,
          gross_amount: gross,
          platform_fee_amount: fee,
          creator_net_amount: net,
          status: tx.status,
          payout_status: pStatus,
          payout_reference: tx.payout_reference || tx.utr_number || null,
          created_at: tx.created_at,
          payout_completed_at: tx.payout_completed_at || null,
          payout_completed_by: tx.payout_completed_by || null,
          zaakpay_order_id: tx.zaakpay_order_id || null
        };
      }).sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      const paymentSummary = {
        total_earned: totalEarned,
        total_paid_out: totalPaidOut,
        pending_payout: pendingPayout,
        transaction_count: formattedTransactions.length,
        completed_deals_count: deals.filter((d: any) => d.status === 'completed' || d.status === 'delivered').length
      };

      res.json({
        user: baseUser,
        profile,
        kyc,
        verifications,
        payment_details: paymentDetails,
        payment_summary: paymentSummary,
        escrow_transactions: formattedTransactions,
        applications,
        deals
      });
    } catch (err: any) {
      console.error("Error loading user full profile:", err);
      res.status(500).json({ error: err.message || "Failed to load profile" });
    }
  });

  // Direct KYC review endpoint from User Enforcement Panel
  router.post("/admin/users/:id/kyc-action", async (req, res) => {
    try {
      const admin = await parseAuthUser(req);
      if (!admin || (admin.role !== 'admin' && admin.role !== 'sub_admin' && admin.team_role !== 'sub_admin')) {
        return res.status(403).json({ detail: "Not authorized", _status: 403 });
      }

      const targetId = req.params.id;
      const { decision, reason, note } = req.body; // 'APPROVED' | 'REJECTED' | 'MORE_INFO_NEEDED'
      if (!decision) {
        return res.status(400).json({ error: "Decision is required" });
      }

      const upperDecision = decision.toUpperCase();
      const isApproved = upperDecision === 'APPROVED';
      const isRejected = upperDecision === 'REJECTED';

      if (supabase) {
        const client = privilegedSupabase || supabase;
        const reviewedAt = new Date().toISOString();

        // Update creator_kyc and brand_kyc
        await Promise.all([
          client.from('creator_kyc').update({
            status: upperDecision,
            rejection_reason: reason || null,
            admin_note: note || null,
            admin_reviewed_by: admin.user_id,
            admin_reviewed_at: reviewedAt
          }).eq('creator_id', targetId),
          client.from('brand_kyc').update({
            status: upperDecision,
            rejection_reason: reason || null,
            admin_note: note || null,
            admin_reviewed_by: admin.user_id,
            admin_reviewed_at: reviewedAt
          }).eq('brand_id', targetId)
        ]);

        // Update users table verified status
        await client.from('users').update({ 
          verified: isApproved, 
          kyc_verified: isApproved 
        }).eq('user_id', targetId);

        // Update profiles verified status
        await Promise.all([
          client.from('creator_profiles').update({ verified: isApproved }).eq('user_id', targetId),
          client.from('brand_profiles').update({ verified: isApproved }).eq('user_id', targetId)
        ]);

        // Update verifications table if any
        await client.from('verifications').update({
          status: isApproved ? 'approved' : (isRejected ? 'rejected' : 'pending'),
          review_note: reason || note || null,
          reviewed_by: admin.user_id,
          reviewed_at: reviewedAt
        }).or(`user_id.eq.${targetId},verification_id.eq.${targetId}`);

        // Log admin action
        await logAdminAction(admin, isApproved ? 'approved_kyc' : (isRejected ? 'rejected_kyc' : 'updated_kyc'), 'kyc', targetId, { decision: upperDecision, reason });

        // Send real-time notification to user
        const db = getDb();
        const msg = isApproved
          ? 'Congratulations! Your KYC verification has been approved. Your payout and account features are fully active.'
          : upperDecision === 'MORE_INFO_NEEDED'
          ? `KYC Update: Additional information needed. ${reason || note || 'Please update your details.'}`
          : `KYC Rejected: ${reason || note || 'Document verification failed. Please submit valid documents.'}`;
        await sendNotification(db, targetId, 'kyc_update', msg);
      }

      return res.json({ ok: true, status: upperDecision });
    } catch (err: any) {
      console.error("KYC Action Error:", err);
      return res.status(500).json({ error: err.message || "Failed to execute KYC action" });
    }
  });

  router.post("/admin/users/:id/set-password", async (req, res) => {
    try {
      const user = await parseAuthUser(req);
      if (!user || user.role !== 'admin' || user.team_role === 'sub_admin') {
        return res.status(403).json({ detail: "Only Super Admins can set or update user passwords" });
      }
      const { password } = req.body;
      if (!password || typeof password !== 'string' || password.trim().length < 6) {
        return res.status(400).json({ detail: "Password must be at least 6 characters" });
      }
      const targetUserId = req.params.id;
      const dbClient = privilegedSupabase || supabase;
      const { data: targetUser } = await dbClient.from('users').select('*').eq('user_id', targetUserId).maybeSingle();
      if (!targetUser) {
        return res.status(404).json({ detail: "User not found" });
      }
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password.trim(), salt);
      await dbClient.from('users').update({ password_hash: hashedPassword }).eq('user_id', targetUserId);
      recordUserPassword(targetUserId, targetUser.email, password.trim());

      await logAdminAction(user, 'update_user_password', 'user', targetUserId, { target_email: targetUser.email });

      return res.json({ 
        success: true, 
        plain_password: password.trim(),
        password_hash: hashedPassword,
        message: "Password updated successfully" 
      });
    } catch (err: any) {
      console.error("Set user password error:", err);
      return res.status(500).json({ detail: "Failed to set user password: " + (err.message || err) });
    }
  });
}
