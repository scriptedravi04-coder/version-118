import express from "express";
import crypto from "crypto";
import { calculateCampaignStats } from "./helpers";
import { isUgcThread, isCampaignThread, getUgcOrderId, getCampaignDealId, isUuid } from "./dealFlow";
import { isCollaborationDeliverable } from "./ugc_routes";
import { calculateFee as calculatePlatformFee } from "../src/utils/feeCalculator";

// Campaign CRUD and application routes: updating/submitting a draft
// campaign, creating and listing campaigns, viewing a single campaign
// (two variants for different URL shapes), tracking a view, listing/
// acting on applications, and a creator applying to a campaign.
export function setupCampaignsRoutes(
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
    syncEntityTags,
    getActingBrandId,
    createEscrowTransaction,
    isCreatorKycVerified,
  }: {
    supabase: any;
    privilegedSupabase: any;
    getDb: () => any;
    saveDb: (db: any) => void;
    parseAuthUser: (req: express.Request) => Promise<any>;
    sendNotification: (db: any, userId: string, type: string, message: string) => Promise<any>;
    serializeChatMessage: (a?: any, b?: any, c?: any, d?: any) => any;
    insertChatMessageToSupabase: (payload: any) => Promise<any>;
    syncEntityTags: (entityType: string, entityId: string, tags: any[]) => Promise<any>;
    getActingBrandId: (user: any) => any;
    createEscrowTransaction: (a?: any, b?: any, c?: any) => Promise<any>;
    isCreatorKycVerified: (id: string) => Promise<boolean>;
  }
) {
  const getIsoNow = () => new Date().toISOString();

  router.post("/campaigns/:id/update", async (req, res) => {
    const user = await parseAuthUser(req);
    if (!user || user.role !== "brand") return res.status(403).json({ detail: "Not authorized", _status: 403 });
    const actingId = getActingBrandId(user);
    const campaignId = req.params.id;

    if (supabase) {
      const { data: existing, error: fetchErr } = await (privilegedSupabase || supabase).from('campaigns').select('*').eq('campaign_id', campaignId).single();
      if (fetchErr || !existing) return res.status(404).json({ detail: "Campaign not found" });
      if (existing.brand_user_id !== actingId) return res.status(403).json({ detail: "Not authorized to edit this campaign" });

      const updates = {
        title: req.body.title,
        description: req.body.description,
        budget_min: Number(req.body.budget_min) || 2000,
        budget_max: Number(req.body.budget_max) || 5000,
        deliverables: req.body.deliverables || [],
        categories: req.body.categories || [],
        platforms: req.body.platforms || [],
        deadline: req.body.deadline || null,
        language: req.body.language || "Hindi",
        status: req.body.status === "draft" ? "draft" : "under_review"
      };

      const { error } = await (privilegedSupabase || supabase).from('campaigns').update(updates).eq('campaign_id', campaignId);
      if (error) {
        console.error("Error updating campaign:", error);
        return res.status(500).json({ error: error.message });
      }
      
      const db = getDb();
      try {
        const reviewMsg = `Your updated campaign '${updates.title || existing.title}' has been submitted for re-review. It will be live again shortly.`;
        await sendNotification(db, actingId, "CAMPAIGN_UNDER_REVIEW", reviewMsg);
      } catch (notifErr) {
        console.error("Error sending notification:", notifErr);
      }
      
      if (Array.isArray(updates.categories)) {
        (async () => {
          try {
            const tags = updates.categories.map((c: string) => ({ name: c, type: 'niche' as const }));
            await syncEntityTags('campaign_brief', campaignId, tags);
          } catch (e) {
            console.error("Error syncing campaign update tags:", e);
          }
        })();
      }
      return res.json({ success: true, ...updates });
    } else {
      const db = getDb();
      const existing = db.campaigns?.find(c => String(c.campaign_id) === String(campaignId) || String(c.id) === String(campaignId));
      if (!existing) return res.status(404).json({ detail: "Campaign not found" });
      if (existing.brand_user_id !== actingId) return res.status(403).json({ detail: "Not authorized", _status: 403 });

      Object.assign(existing, {
        title: req.body.title,
        description: req.body.description,
        budget_min: Number(req.body.budget_min) || 2000,
        budget_max: Number(req.body.budget_max) || 5000,
        deliverables: req.body.deliverables || [],
        categories: req.body.categories || [],
        platforms: req.body.platforms || [],
        deadline: req.body.deadline || null,
        language: req.body.language || "Hindi",
        status: req.body.status === "draft" ? "draft" : "under_review",
        stage: "Pending"
      });
      saveDb(db);
      if (Array.isArray(existing.categories)) {
        (async () => {
          try {
            const tags = existing.categories.map((c: string) => ({ name: c, type: 'niche' as const }));
            await syncEntityTags('campaign_brief', campaignId, tags);
          } catch (e) {
            console.error("Error syncing campaign fallback update tags:", e);
          }
        })();
      }
      return res.json({ success: true, ...existing });
    }
  });


  router.post("/campaigns/:id/submit-draft", async (req, res) => {
    const user = await parseAuthUser(req);
    if (!user || user.role !== "brand") return res.status(403).json({ detail: "Not authorized", _status: 403 });
    const actingId = getActingBrandId(user);
    const campaignId = req.params.id;

    // Check brand KYC status
    let isApproved = Boolean(user?.kyc_verified || user?.kyc_status === "approved" || user?.kyc_status === "APPROVED");
    if (!isApproved && supabase) {
      const { data: bKyc } = await supabase
        .from('brand_kyc')
        .select('status')
        .eq('brand_id', actingId)
        .maybeSingle();
      if (bKyc && (bKyc.status === "approved" || bKyc.status === "APPROVED")) {
        isApproved = true;
      }
    }
    if (!isApproved) {
      return res.status(403).json({ 
        error: "KYC_REQUIRED", 
        detail: "Please complete your corporate KYC verification before launching campaign drafts." 
      });
    }

    if (supabase) {
      const { data: existing, error: fetchErr } = await (privilegedSupabase || supabase).from('campaigns').select('*').eq('campaign_id', campaignId).single();
      if (fetchErr || !existing) return res.status(404).json({ detail: "Campaign not found" });
      if (existing.brand_user_id !== actingId) return res.status(403).json({ detail: "Not authorized to launch this campaign" });

      const { error } = await (privilegedSupabase || supabase).from('campaigns').update({ status: 'live' }).eq('campaign_id', campaignId);
      if (error) return res.status(500).json({ error: error.message });
      
      return res.json({ success: true, status: 'live' });
    } else {
      const db = getDb();
      const existing = db.campaigns?.find(c => String(c.campaign_id) === String(campaignId) || String(c.id) === String(campaignId));
      if (!existing) return res.status(404).json({ detail: "Campaign not found" });
      if (existing.brand_user_id !== actingId) return res.status(403).json({ detail: "Not authorized", _status: 403 });

      existing.status = 'live';
      saveDb(db);
      return res.json({ success: true, status: 'live' });
    }
  });


  router.post("/campaigns", async (req, res) => {
    const user = await parseAuthUser(req);
    if (!user || user.role !== "brand") return res.status(403).json({ detail: "Only brands can post campaigns" });
    const actingId = getActingBrandId(user);
    
    // If not draft, enforce KYC verification
    if (req.body.status !== "draft") {
      let isApproved = Boolean(user?.kyc_verified || user?.kyc_status === "approved" || user?.kyc_status === "APPROVED");
      if (!isApproved && supabase) {
        const { data: bKyc } = await supabase
          .from('brand_kyc')
          .select('status')
          .eq('brand_id', actingId)
          .maybeSingle();
        if (bKyc && (bKyc.status === "approved" || bKyc.status === "APPROVED")) {
          isApproved = true;
        }
      }
      if (!isApproved) {
        return res.status(403).json({ 
          error: "KYC_REQUIRED", 
          detail: "Please complete your corporate KYC verification before creating or publishing campaigns." 
        });
      }
    }
    
    let bp = null;
    if (supabase) {
      const { data } = await (privilegedSupabase || supabase).from('brand_profiles').select('*').eq('user_id', actingId).maybeSingle();
      bp = data;
    }
    
    const cid = crypto.randomUUID();
    const campaign = {
      campaign_id: cid,
      brand_user_id: actingId,
      brand_name: bp?.company_name || user.name,
      brand_logo: bp?.logo || user.picture || "",
      title: req.body.title,
      description: req.body.description,
      budget_min: Number(req.body.budget_min) || 2000,
      budget_max: Number(req.body.budget_max) || 5000,
      deliverables: req.body.deliverables || [],
      categories: req.body.categories || [],
      platforms: req.body.platforms || [],
      deadline: req.body.deadline || null,
      language: req.body.language || "Hindi",
      status: req.body.status === "draft" ? "draft" : "under_review"
    };

    if (supabase) {
      const { error } = await (privilegedSupabase || supabase).from('campaigns').insert(campaign);
      if (error) {
        console.error("Error creating campaign:", error);
        return res.status(500).json({ error: error.message });
      }
    } else {
      const db = getDb();
      if (!db.campaigns) db.campaigns = [];
      db.campaigns.push(campaign);
      saveDb(db);
    }

    // Sync campaign tags
    (async () => {
      try {
        if (Array.isArray(campaign.categories)) {
          const tags = campaign.categories.map((c: string) => ({ name: c, type: 'niche' as const }));
          await syncEntityTags('campaign_brief', cid, tags);
        }
      } catch (err) {
        console.error("Error syncing campaign tags:", err);
      }
    })();

    try {
      const db = getDb();
      const reviewMsg = `Your campaign '${campaign.title || 'New Campaign'}' has been submitted successfully and is currently under review. It will be live in 2-3 hours.`;
      await sendNotification(db, actingId, "CAMPAIGN_UNDER_REVIEW", reviewMsg);
    } catch (notifErr) {
      console.error("Error sending campaign under review notification:", notifErr);
    }

    // Auto-create initial escrow transaction record
    await createEscrowTransaction({
      campaign_id: cid,
      brand_id: actingId,
      gross_amount: campaign.budget_max || campaign.budget_min || 5000,
      status: 'HELD',
      escrow_hold: true
    }).catch(err => console.error("[createEscrowTransaction Error campaigns]", err));

    res.json(campaign);
  });


  router.get("/campaigns", async (req, res) => {

    const viewer = await parseAuthUser(req);
    if (!viewer) return res.status(401).json({ error: "Unauthorized" });
    const { category, platform, city, budget, mine } = req.query;
    
    if (supabase) {
      let query = supabase.from('campaigns').select('*, applicants:campaign_applications(application_id)');
      
      if (mine && viewer) {
        const actingId = getActingBrandId(viewer);
        query = query.eq('brand_user_id', actingId);
      } else {
        query = query.eq('status', 'live');
      }
      
      const { data, error } = await query.order('created_at', { ascending: false });
      if (error) {
        console.warn("Supabase campaigns table missing or error, falling back to local JSON DB");
      } else {
        let list = data || [];
        try {
          const { data: profiles } = await (privilegedSupabase || supabase).from('brand_profiles').select('user_id, company_name, logo, is_agency');
          if (profiles && profiles.length > 0) {
            const profileMap = new Map();
            profiles.forEach((p: any) => {
              profileMap.set(p.user_id, p);
            });
            list = list.map((c: any) => {
              const bp = profileMap.get(c.brand_user_id);
              if (bp) {
                return {
                  ...c,
                  brand_name: bp.company_name || c.brand_name || "Brand Name",
                  brand_logo: bp.logo || c.brand_logo || "",
                  is_agency: Boolean(bp.is_agency || c.is_agency)
                };
              }
              return c;
            });
          }
        } catch (e) {
          console.error("Error enriching campaigns with brand profiles:", e);
        }

        if (category) list = list.filter((c) => c.categories && c.categories.includes(category));
        if (platform) list = list.filter((c) => c.platforms && c.platforms.includes(platform));
        if (budget) {
          const pBudget = parseInt(budget as string);
          if (pBudget === 10000) list = list.filter((c) => c.budget_min <= 10000);
          else if (pBudget === 30000) list = list.filter((c) => c.budget_min >= 10000 && c.budget_min <= 30000);
          else if (pBudget === 50000) list = list.filter((c) => c.budget_min >= 30000 && c.budget_min <= 50000);
          else if (pBudget === 100000) list = list.filter((c) => c.budget_min > 50000);
        }
        const enrichedList = list.map((item: any) => {
          const stats = calculateCampaignStats(item);
          return { ...item, views: stats.views, applied: stats.applied };
        });
        return res.json(enrichedList);
      }
      

    }

    // Fallback
    const db = getDb();
    let list = db.campaigns || [];
    if (mine && viewer) list = list.filter(c => c.brand_user_id === getActingBrandId(viewer));
    const enrichedFallback = list.slice().reverse().map((item: any) => {
      const stats = calculateCampaignStats(item);
      return { ...item, views: stats.views, applied: stats.applied };
    });
    res.json(enrichedFallback);

  });


  router.get("/campaigns/:id", async (req, res) => {
    const id = req.params.id;
    if (supabase) {
      const { data, error } = await supabase
        .from('campaigns')
        .select('*')
        .eq('campaign_id', id)
        .maybeSingle();

      if (data) {
        let enriched = { ...data };
        try {
          const { data: bp } = await (privilegedSupabase || supabase)
            .from('brand_profiles')
            .select('user_id, company_name, logo, is_agency')
            .eq('user_id', data.brand_user_id)
            .maybeSingle();
          if (bp) {
            enriched.brand_name = bp.company_name || data.brand_name || "Brand Name";
            enriched.brand_logo = bp.logo || data.brand_logo || "";
            enriched.is_agency = Boolean(bp.is_agency || data.is_agency);
            enriched.brand_is_agency = Boolean(bp.is_agency);
          }
        } catch (e) {
          console.error("Error enriching campaign details:", e);
        }
        const stats = calculateCampaignStats(enriched);
        enriched.views = stats.views;
        enriched.applied = stats.applied;
        return res.json(enriched);
      }
    }

    const db = getDb();
    const c = (db.campaigns || []).find((x: any) => String(x.campaign_id) === String(id) || String(x.id) === String(id));
    if (c) {
      const bp = (db.brand_profiles || []).find((b: any) => String(b.user_id) === String(c.brand_user_id));
      const stats = calculateCampaignStats(c);
      return res.json({
        ...c,
        views: stats.views,
        applied: stats.applied,
        is_agency: Boolean(bp?.is_agency || c.is_agency),
        brand_is_agency: Boolean(bp?.is_agency)
      });
    }
    return res.status(404).json({ detail: "Campaign not found" });
  });


  router.post("/campaigns/:id/track-view", async (req, res) => {
    const db = getDb();
    db.campaigns = db.campaigns || [];
    const idx = db.campaigns.findIndex(c => c.campaign_id === req.params.id);
    if (idx >= 0) {
      db.campaigns[idx].views = (db.campaigns[idx].views || 0) + 1;
      saveDb(db);
      res.json({ ok: true, views: db.campaigns[idx].views });
    } else {
      res.json({ ok: false, detail: "Campaign not found" });
    }
  });


  router.get("/campaigns/:campaign_id/applications", async (req, res) => {
    const user = await parseAuthUser(req);
    if (!user) return res.status(403).json({ detail: "Not authenticated", _status: 403 });
    if (supabase) {
      const { data, error } = await supabase
        .from('campaign_applications')
        .select('*, users(name, picture)')
        .eq('campaign_id', req.params.campaign_id)
        .order('created_at', { ascending: false });
        
      if (error) return res.status(500).json({ error: error.message });

      const creatorIds = (data || []).map(a => a.creator_id).filter(Boolean);
      let kycMap: Record<string, any> = {};
      let profileMap: Record<string, any> = {};

      if (creatorIds.length > 0) {
        const [{ data: kycData }, { data: profileData }] = await Promise.all([
          supabase.from('creator_kyc').select('*').in('creator_id', creatorIds),
          supabase.from('creator_profiles').select('*').in('user_id', creatorIds)
        ]);

        if (kycData) {
          kycData.forEach(k => {
            kycMap[k.creator_id] = k;
          });
        }
        if (profileData) {
          profileData.forEach(p => {
            profileMap[p.user_id] = p;
          });
        }
      }
      
      const mapped = (data || []).map(a => {
        const kyc = kycMap[a.creator_id] || {};
        const cp = profileMap[a.creator_id] || {};

        // Resolve followers count from all possible places
        let rawFollowers = 0;
        if (cp.followers_instagram !== undefined && cp.followers_instagram !== null && Number(cp.followers_instagram) > 0) {
          rawFollowers = Number(cp.followers_instagram);
        } else if (cp.follower_count !== undefined && cp.follower_count !== null && Number(cp.follower_count) > 0) {
          rawFollowers = Number(cp.follower_count);
        } else if (cp.ig_followers !== undefined && cp.ig_followers !== null && Number(cp.ig_followers) > 0) {
          rawFollowers = Number(cp.ig_followers);
        } else if (cp.followers !== undefined && cp.followers !== null && Number(cp.followers) > 0) {
          rawFollowers = Number(cp.followers);
        } else if (cp.instagram_followers !== undefined && cp.instagram_followers !== null && Number(cp.instagram_followers) > 0) {
          rawFollowers = Number(cp.instagram_followers);
        } else if (kyc.follower_count !== undefined && kyc.follower_count !== null && Number(kyc.follower_count) > 0) {
          rawFollowers = Number(kyc.follower_count);
        } else if (cp.total_reach !== undefined && cp.total_reach !== null && Number(cp.total_reach) > 0) {
          rawFollowers = Number(cp.total_reach);
        } else if (cp.followers_youtube !== undefined && cp.followers_youtube !== null && Number(cp.followers_youtube) > 0) {
          rawFollowers = Number(cp.followers_youtube);
        }

        let followersStr = "0";
        if (rawFollowers >= 1000000) {
          followersStr = (rawFollowers / 1000000).toFixed(1).replace(/\.0$/, '') + "M";
        } else if (rawFollowers >= 1000) {
          followersStr = (rawFollowers / 1000).toFixed(1).replace(/\.0$/, '') + "K";
        } else if (rawFollowers > 0) {
          followersStr = rawFollowers.toLocaleString();
        }

        // Clean handle if full URL was provided
        let rawHandle = kyc.instagram_handle || cp.instagram_handle || cp.instagram || cp.handle || a.users?.name?.toLowerCase().replace(/\s+/g, '_') || "creator";
        if (rawHandle.includes("instagram.com/")) {
          rawHandle = rawHandle.split("instagram.com/")[1]?.split("/")[0]?.split("?")[0] || rawHandle;
        } else if (rawHandle.startsWith("http://") || rawHandle.startsWith("https://")) {
          try {
            const urlObj = new URL(rawHandle);
            rawHandle = urlObj.pathname.replace(/^\/+|\/+$/g, '').split("/")[0] || (a.users?.name || "creator").toLowerCase().replace(/\s+/g, '_');
          } catch(e) {
            rawHandle = (a.users?.name || "creator").toLowerCase().replace(/\s+/g, '_');
          }
        }
        rawHandle = rawHandle.replace(/^@+/, '') || (a.users?.name || "creator").toLowerCase().replace(/\s+/g, '_');
        
        let city = a.creator_location || cp.city || cp.location || kyc.address || "India";
        if (city && city.includes(",")) {
          city = city.split(",")[0].trim();
        }

        const category = (cp.categories && Array.isArray(cp.categories) && cp.categories.length > 0 ? cp.categories.join(", ") : cp.category) ||
          (kyc.niche && Array.isArray(kyc.niche) && kyc.niche.length > 0 ? kyc.niche.join(", ") : (kyc.niche || "Lifestyle"));

        return {
          application_id: a.application_id,
          campaign_id: a.campaign_id,
          creator_id: a.creator_id,
          full_name: a.creator_name || cp.name || kyc.full_name || a.users?.name || "Creator",
          profile_photo_url: a.users?.picture || cp.profile_image_url || cp.photo_url,
          pitch_text: a.pitch,
          proposed_amount: a.proposed_amount,
          creator_location: city,
          status: a.status,
          applied_at: a.created_at,
          followers_count: followersStr,
          raw_followers: rawFollowers,
          instagram_handle: rawHandle,
          category: category,
          city: city,
          kyc_details: kyc
        };
      });
      return res.json(mapped);
    }
    
    // Local DB fallback
    const db = getDb();
    const camp = (db.campaigns || []).find((c: any) => c.campaign_id === req.params.campaign_id);
    if (!camp) return res.json([]);
    const apps = camp.applicants || [];
    const mapped = apps.map((a: any) => {
      const creatorId = a.creator_user_id || a.creator_id;
      const creatorUser = (db.users || []).find((u: any) => u.user_id === creatorId);
      const cp = (db.creator_profiles || []).find((p: any) => p.user_id === creatorId) || {};
      const kyc = ((db as any).creator_kyc || []).find((k: any) => k.creator_id === creatorId) || {};

      let rawFollowers = Number(cp.followers_instagram || cp.follower_count || cp.ig_followers || cp.followers || kyc.follower_count || 0);
      let followersStr = "0";
      if (rawFollowers >= 1000000) followersStr = (rawFollowers / 1000000).toFixed(1).replace(/\.0$/, '') + "M";
      else if (rawFollowers >= 1000) followersStr = (rawFollowers / 1000).toFixed(1).replace(/\.0$/, '') + "K";
      else if (rawFollowers > 0) followersStr = rawFollowers.toLocaleString();

      return {
        application_id: a.application_id,
        campaign_id: req.params.campaign_id,
        creator_id: creatorId,
        full_name: a.creator_name || cp.name || creatorUser?.name || "Creator",
        profile_photo_url: creatorUser?.picture,
        pitch_text: a.pitch || a.cover_letter,
        proposed_amount: a.proposed_amount || a.rate,
        creator_location: cp.city || "India",
        status: a.status || "PENDING",
        applied_at: a.created_at || new Date().toISOString(),
        followers_count: followersStr,
        raw_followers: rawFollowers,
        instagram_handle: cp.instagram_handle || cp.handle || "creator",
        category: cp.category || "Lifestyle",
        city: cp.city || "India"
      };
    });
    return res.json(mapped);
  });


  router.post("/campaigns/:campaign_id/applications/:application_id/action", async (req, res) => {
    const user = await parseAuthUser(req);
    if (!user) return res.status(403).json({ detail: "Not authenticated", _status: 403 });
    const { campaign_id, application_id } = req.params;
    const { action } = req.body;

    if (supabase) {
      // 1. Get the application
      const { data: app, error: appErr } = await supabase
        .from('campaign_applications')
        .select('*')
        .eq('application_id', application_id)
        .maybeSingle();

      if (appErr || !app) return res.status(404).json({ error: "Application not found" });

      const newStatus = action === 'accept' ? 'ACCEPTED' : 'REJECTED';

      // 2. Update application status
      const { error: updErr } = await supabase
        .from('campaign_applications')
        .update({ status: newStatus })
        .eq('application_id', application_id);

      if (updErr) return res.status(500).json({ error: updErr.message });

      if (action === 'accept') {
        // 3. Create or find chat thread
        const { data: existingThread } = await supabase
          .from('chat_threads')
          .select('id')
          .eq('campaign_id', campaign_id)
          .eq('creator_id', app.creator_id)
          .eq('brand_id', user.user_id)
          .maybeSingle();

        let threadId = existingThread?.id;

        if (!threadId) {
          const generatedDealId = crypto.randomUUID();
          threadId = `thread_camp_${generatedDealId}`;
          
          const agreedAmt = app.proposed_amount || 5000;

          // Insert into deals table
          const { error: dealErr } = await (privilegedSupabase || supabase).from('deals').insert({
            id: generatedDealId,
            application_id,
            campaign_id,
            creator_id: app.creator_id,
            brand_id: user.user_id,
            agreed_amount: agreedAmt,
            revision_count: 5,
            revisions_used: 0,
            status: 'NEGOTIATING'
          });

          // Insert into chat_threads
          const { error: threadErr } = await (privilegedSupabase || supabase).from('chat_threads').insert({
            id: threadId,
            campaign_id,
            creator_id: app.creator_id,
            brand_id: user.user_id,
            deal_id: generatedDealId,
            agreed_amount: agreedAmt,
            revision_count: 5,
            status: 'NEGOTIATING',
            flow_state: 'NEGOTIATING'
          });

          if (threadErr) return res.status(500).json({ error: threadErr.message });

          // 4. Send the "negotiation started" welcome message!
          // We pass a proper message_type string 'campaign_approved' instead of user.user_id
          const welcomeMessageText = `Congratulations! You've been selected. Let's negotiate the terms.`;
          const welcomeContent = serializeChatMessage(
            welcomeMessageText,
            'campaign_approved',
            'system',
            null
          );

          await insertChatMessageToSupabase({
            message_id: crypto.randomUUID(),
            thread_id: threadId,
            sender_user_id: user.user_id,
            text: welcomeContent,
            message_type: 'campaign_approved',
            metadata: { action: 'campaign_approved', thread_id: threadId },
            created_at: new Date().toISOString()
          });

          // Also insert a notification
          await (privilegedSupabase || supabase).from('notifications').insert({
            notif_id: crypto.randomUUID(),
            user_id: app.creator_id,
            type: 'chat_unlocked',
            message: `Congratulations! Your campaign application has been approved.`
          });
        }

        return res.json({ ok: true, thread_id: threadId });
      }

      return res.json({ ok: true });
    }

    // Local DB fallback
    const db = getDb();
    const camp = db.campaigns?.find(c => c.campaign_id === campaign_id);
    if (!camp) return res.status(404).json({ detail: "Campaign not found" });

    const applicant = camp.applicants?.find(a => a.application_id === application_id);
    if (!applicant) return res.status(404).json({ detail: "Applicant not found" });

    applicant.status = action === 'accept' ? 'accepted' : 'rejected';

    if (action === 'accept') {
      let thread = db.chat_threads?.find(t => t.campaign_id === campaign_id && t.creator_id === applicant.creator_user_id);
      if (!thread) {
        const threadId = `thread_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
        thread = {
          id: threadId,
          campaign_id,
          creator_id: applicant.creator_user_id,
          brand_id: user.user_id,
          status: 'NEGOTIATING',
          creator_name: applicant.creator_name,
          brand_name: user.name
        };
        if (!db.chat_threads) db.chat_threads = [];
        db.chat_threads.push(thread);

        const welcomeMessageText = `👋 Campaign Application APPROVED!\n\nNegotiations have been unlocked for campaign. Please review the details and confirm terms!`;
        const welcomeContent = serializeChatMessage(
          welcomeMessageText,
          'campaign_approved',
          'system',
          null
        );

        if (!db.chat_messages) db.chat_messages = [];
        db.chat_messages.push({
          id: crypto.randomUUID(),
          thread_id: threadId,
          sender_id: 'system',
          sender_role: 'system',
          message_type: 'campaign_approved',
          content: welcomeMessageText,
          text: welcomeContent,
          created_at: new Date().toISOString()
        });
      }
      saveDb(db);
      return res.json({ ok: true, thread_id: thread.id });
    }

    saveDb(db);
    return res.json({ ok: true });
  });


  router.get("/campaigns/:campaign_id", async (req, res) => {

    if (supabase) {
      const { data, error } = await supabase
        .from('campaigns')
        .select('*')
        .eq('campaign_id', req.params.campaign_id)
        .maybeSingle();
      if (error) {
        console.error("Error fetching campaign:", error);
        return res.status(500).json({ error: error.message });
      }
      if (!data) return res.status(404).json({ detail: "Campaign not found" });

      try {
        const { data: bp } = await (privilegedSupabase || supabase).from('brand_profiles').select('company_name, logo').eq('user_id', data.brand_user_id).maybeSingle();
        if (bp) {
          data.brand_name = bp.company_name || data.brand_name || "Brand Name";
          data.brand_logo = bp.logo || data.brand_logo || "";
        }
      } catch (e) {
        console.error("Error enriching campaign brand profile:", e);
      }

      return res.json(data);
    }

    const db = getDb();
    const c = db.campaigns.find((x) => x.campaign_id === req.params.campaign_id);
    if (!c) {
      return res.status(404).json({ detail: "Campaign not found" });
    }
    res.json(c);

  });


  router.post("/campaigns/apply", async (req, res) => {

    const user = await parseAuthUser(req);
    if (!user) return res.status(403).json({ detail: "Not authenticated", _status: 403 });
    const campaignId = req.body.campaign_id;
    const creatorId = user.user_id;

    // Server-side KYC Gating Check
    const verified = await isCreatorKycVerified(creatorId);
    if (!verified) {
      return res.status(403).json({ 
        error: "Complete KYC verification to apply.", 
        detail: "Complete KYC verification to apply." 
      });
    }

    if (supabase) {
      const { data: existing } = await supabase
        .from('campaign_applications')
        .select('application_id')
        .eq('campaign_id', campaignId)
        .eq('creator_id', creatorId)
        .maybeSingle();

      if (existing) return res.status(400).json({ error: 'Already applied' });

      const payload = { 
        application_id: crypto.randomUUID(), 
        campaign_id: campaignId, 
        creator_id: creatorId, 
        status: 'PENDING',
        pitch: req.body.pitch,
        proposed_amount: Number(req.body.proposed_amount),
        creator_location: req.body.creator_location || null,
        creator_name: req.body.creator_name || null
      };
      
      const { data, error } = await supabase
        .from('campaign_applications')
        .insert(payload);
      
      if (error) {
         return res.status(500).json({ PAYLOAD: payload, ERROR: error });
      }
      
      const { data: camp } = await (privilegedSupabase || supabase).from('campaigns').select('brand_user_id, title').eq('campaign_id', campaignId).maybeSingle();
      if (camp) {
        await (privilegedSupabase || supabase).from('notifications').insert({
          notif_id: crypto.randomUUID(),
          user_id: camp.brand_user_id,
          type: 'new_application',
          message: `${user.name} applied to your campaign "${camp.title}"!`
        });
      }
      return res.json({ ok: true });
    }

    const db = getDb();
    const c = db.campaigns.find((x) => x.campaign_id === campaignId);
    if (!c) return res.status(404).json({ detail: "Campaign not found" });
    if (!c.applicants) c.applicants = [];
    if (c.applicants.find((a) => a.creator_user_id === user.user_id)) return res.status(400).json({ detail: "Already applied" });
    
    c.applicants.push({
      application_id: crypto.randomUUID(),
      creator_user_id: user.user_id,
      creator_name: user.name,
      proposed_amount: req.body.proposedRate || 0,
      pitch: req.body.pitch || "",
      portfolio_links: req.body.portfolioLinks || "",
      est_delivery: req.body.estDelivery || "",
      status: "applied",
      created_at: getIsoNow()
    });
    saveDb(db);
    res.json({ ok: true });

  });

}

export function createCampaignLifecycleHandlers({
  supabase,
  privilegedSupabase,
  getDb,
  saveDb,
  parseAuthUser,
  insertChatMessageToSupabase,
  getIsoNow = () => new Date().toISOString(),
  syncUgcLifecycleEvent,
}: {
  supabase: any;
  privilegedSupabase: any;
  getDb: () => any;
  saveDb: (db: any) => void;
  parseAuthUser: (req: any) => Promise<any>;
  insertChatMessageToSupabase: (payload: any) => Promise<any>;
  getIsoNow?: () => string;
  syncUgcLifecycleEvent?: (opts: any) => Promise<any>;
}) {
  // 10c. Approve Live Links & Release Payment (Deal Completion)
  const handleThreadApproveLiveLinks = async (req: any, res: any) => {
    const user = await parseAuthUser(req);
    if (!user) return res.status(401).json({ error: "Unauthorized" });

    const rawId = req.params.id || req.params.threadId;
    const db = getDb();
    const nowIso = getIsoNow ? getIsoNow() : new Date().toISOString();
    const io = req.app.get("io");

    let targetThread: any = (db.chat_threads || []).find((t: any) => t.id === rawId || t.deal_id === rawId);
    if (!targetThread && supabase) {
      try {
        const { data: threadRow } = await (privilegedSupabase || supabase)
          .from('chat_threads')
          .select('*')
          .or(`id.eq.${rawId},deal_id.eq.${rawId}`)
          .maybeSingle();
        if (threadRow) targetThread = threadRow;
      } catch (e) {}
    }

    const targetThreadId = targetThread?.id || rawId;
    const dealId = targetThread?.deal_id || (targetThread?.metadata && targetThread.metadata.deal_id) || (rawId.startsWith('thread_camp_') ? rawId.replace('thread_camp_', '') : rawId);

    // Canonical flow separation via dealFlow helpers
    const isUgcOrder = isUgcThread(targetThread || { id: targetThreadId, deal_id: dealId });
    const ugcOrderId = getUgcOrderId(targetThread || { id: targetThreadId, deal_id: dealId });
    const campaignDealId = getCampaignDealId(targetThread || { id: targetThreadId, deal_id: dealId });

    let dealObj = !isUgcOrder ? (db.deals || []).find((d: any) => d.id === campaignDealId || d.id === dealId || d.id === targetThreadId) : null;
    let ugcOrderObj = isUgcOrder ? (db.ugc_orders || []).find((o: any) => o.id === ugcOrderId || o.id === dealId || o.id === targetThreadId) : null;

    let creatorId = targetThread?.creator_id || dealObj?.creator_id || ugcOrderObj?.creator_id;
    let brandId = targetThread?.brand_id || dealObj?.brand_id || ugcOrderObj?.brand_id || user?.user_id;

    if (!isUgcOrder && (!creatorId || !brandId || !dealObj) && supabase && campaignDealId) {
      try {
        const { data: dRec } = await (privilegedSupabase || supabase)
          .from('deals')
          .select('*')
          .eq('id', campaignDealId)
          .maybeSingle();
        if (dRec) {
          if (!creatorId) creatorId = dRec.creator_id;
          if (!brandId) brandId = dRec.brand_id;
          if (!dealObj) dealObj = dRec;
        }
      } catch (e) {}
    }

    if (isUgcOrder && (!creatorId || !brandId || !ugcOrderObj) && supabase && ugcOrderId) {
      try {
        const { data: uRec } = await (privilegedSupabase || supabase)
          .from('ugc_orders')
          .select('*')
          .eq('id', ugcOrderId)
          .maybeSingle();
        if (uRec) {
          if (!creatorId) creatorId = uRec.creator_id;
          if (!brandId) brandId = uRec.brand_id;
          if (!ugcOrderObj) ugcOrderObj = uRec;
        }
      } catch (e) {}
    }

    const canonicalBrandId = isUuid(brandId) ? brandId : (isUuid(user?.user_id) ? user.user_id : (isUuid(user?.id) ? user.id : brandId));
    const canonicalCreatorId = isUuid(creatorId) ? creatorId : (targetThread?.creator_id || dealObj?.creator_id || ugcOrderObj?.creator_id || creatorId);

    const dealAmount = Number(dealObj?.agreed_amount || ugcOrderObj?.creator_payout || ugcOrderObj?.agreed_amount || targetThread?.agreed_amount || targetThread?.amount_fixed || 5000);
    const feeCalc = await calculatePlatformFee(dealAmount, (privilegedSupabase || supabase));
    const feePercentage = Number(feeCalc?.feePercent ?? 15);
    const platformFee = Number(feeCalc?.platformFee ?? Math.round(((dealAmount * feePercentage) / 100) * 100) / 100);
    const netAmount = Number(feeCalc?.creatorNet ?? Math.max(0, Math.round((dealAmount - platformFee) * 100) / 100));

    // 1. Update Deals table: status = 'COMPLETED' (only for campaign deals with valid UUID, NOT UGC orders)
    if (!isUgcOrder && supabase && campaignDealId) {
      try {
        const { error: dealsErr } = await (privilegedSupabase || supabase)
          .from('deals')
          .update({
            status: 'COMPLETED',
            updated_at: nowIso
          })
          .eq('id', campaignDealId);
        if (dealsErr) {
          console.error("[handleThreadApproveLiveLinks] deals update error:", dealsErr?.message || JSON.stringify(dealsErr));
        }
      } catch (e: any) {
        console.warn("[handleThreadApproveLiveLinks] deals update error:", e?.message || e);
      }
    }
    if (!isUgcOrder && dealObj) {
      dealObj.status = 'COMPLETED';
      dealObj.stage = 'COMPLETED';
      dealObj.flow_state = 'COMPLETED';
      dealObj.updated_at = nowIso;
    }
    if (!isUgcOrder && db.collabs) {
      const c = db.collabs.find((x: any) => x.collab_id === dealId || x.id === dealId);
      if (c) {
        c.status = 'COMPLETED';
        c.stage = 'COMPLETED';
        c.updated_at = nowIso;
      }
    }

    // 1c. Update ugc_orders table if this thread is associated with a UGC order
    if (isUgcOrder || ugcOrderId) {
      const targetUgcId = ugcOrderId || dealId || targetThreadId;
      if (supabase && targetUgcId) {
        try {
          await (privilegedSupabase || supabase)
            .from('ugc_orders')
            .update({
              status: 'COMPLETED',
              payment_status: 'RELEASED',
              escrow_released_at: nowIso,
              updated_at: nowIso
            })
            .eq('id', targetUgcId);
        } catch (e: any) {
          console.warn("[handleThreadApproveLiveLinks] ugc_orders update error:", e?.message || e);
        }
      }
      if (db.ugc_orders) {
        const u = db.ugc_orders.find((x: any) => x.id === targetUgcId || x.id === dealId || x.brief_id === dealId || x.brief_id === targetUgcId);
        if (u) {
          u.status = 'COMPLETED';
          u.payment_status = 'RELEASED';
          u.escrow_released_at = nowIso;
          u.updated_at = nowIso;
        }
      }
    }

    // 1b. Update transactions table: status = 'SUCCESS', payout_status = 'RELEASED'
    if (supabase) {
      try {
        if (isUgcOrder && ugcOrderId) {
          const { data: ugcTxns } = await (privilegedSupabase || supabase)
            .from('transactions')
            .select('id, ugc_order_id')
            .eq('ugc_order_id', ugcOrderId);

          if (ugcTxns && ugcTxns.length > 0) {
            for (const tx of ugcTxns) {
              const { error: txErr } = await (privilegedSupabase || supabase)
                .from('transactions')
                .update({
                  payout_status: 'RELEASED',
                  status: 'SUCCESS',
                  platform_fee_amount: platformFee,
                  creator_net_amount: netAmount,
                  payout_completed_at: nowIso
                })
                .eq('id', tx.id);
              if (txErr) {
                console.error("[handleThreadApproveLiveLinks] transactions update error:", txErr?.message || JSON.stringify(txErr));
              }
            }
          } else {
            await (privilegedSupabase || supabase)
              .from('transactions')
              .insert({
                id: crypto.randomUUID(),
                ugc_order_id: ugcOrderId,
                creator_id: canonicalCreatorId || null,
                gross_amount: dealAmount,
                platform_fee_amount: platformFee,
                creator_net_amount: netAmount,
                gst_amount: 0,
                status: 'SUCCESS',
                payout_status: 'RELEASED',
                payout_type: 'full',
                created_at: nowIso,
                payout_completed_at: nowIso
              });
          }
        } else if (!isUgcOrder && campaignDealId) {
          let existingTxns: any[] = [];
          const { data } = await (privilegedSupabase || supabase)
            .from('transactions')
            .select('id, deal_id, campaign_deal_id')
            .or(`campaign_deal_id.eq.${campaignDealId},deal_id.eq.${campaignDealId},id.eq.${campaignDealId}`);
          if (data && data.length > 0) existingTxns = data;

          if (existingTxns.length > 0) {
            for (const tx of existingTxns) {
              const { error: txErr } = await (privilegedSupabase || supabase)
                .from('transactions')
                .update({
                  payout_status: 'RELEASED',
                  status: 'SUCCESS',
                  campaign_deal_id: campaignDealId,
                  platform_fee_amount: platformFee,
                  creator_net_amount: netAmount,
                  payout_completed_at: nowIso
                })
                .eq('id', tx.id);
              if (txErr) {
                console.error("[handleThreadApproveLiveLinks] transactions update error:", txErr?.message || JSON.stringify(txErr));
              }
            }
          } else {
            const { error: directErr, count } = await (privilegedSupabase || supabase)
              .from('transactions')
              .update({
                payout_status: 'RELEASED',
                status: 'SUCCESS',
                campaign_deal_id: campaignDealId,
                platform_fee_amount: platformFee,
                creator_net_amount: netAmount,
                payout_completed_at: nowIso
              })
              .eq('campaign_deal_id', campaignDealId);

            if (count === 0 || directErr) {
              await (privilegedSupabase || supabase)
                .from('transactions')
                .insert({
                  id: crypto.randomUUID(),
                  deal_id: campaignDealId,
                  campaign_deal_id: campaignDealId,
                  creator_id: canonicalCreatorId || null,
                  gross_amount: dealAmount,
                  platform_fee_amount: platformFee,
                  creator_net_amount: netAmount,
                  gst_amount: 0,
                  status: 'SUCCESS',
                  payout_status: 'RELEASED',
                  payout_type: 'full',
                  created_at: nowIso,
                  payout_completed_at: nowIso
                });
            }
          }
        }
      } catch (e: any) {
        console.warn("[handleThreadApproveLiveLinks] transactions update error:", e?.message || e);
      }
    }

    // Local DB transactions fallback
    if (db.transactions) {
      const tx = db.transactions.find((x: any) => x.campaign_deal_id === campaignDealId || (campaignDealId && x.deal_id === campaignDealId) || (isUgcOrder && ugcOrderId && x.ugc_order_id === ugcOrderId));
      if (tx) {
        tx.payout_status = 'RELEASED';
        tx.status = 'SUCCESS';
        tx.platform_fee_amount = platformFee;
        tx.creator_net_amount = netAmount;
        tx.payout_completed_at = nowIso;
      }
    }

    // 2. Update Chat Thread: status = 'COMPLETED', flow_state = 'COMPLETED'
    if (supabase) {
      try {
        await (privilegedSupabase || supabase)
          .from('chat_threads')
          .update({
            status: 'COMPLETED',
            flow_state: 'COMPLETED',
            updated_at: nowIso
          })
          .eq('id', targetThreadId);
      } catch (e: any) {
        console.warn("[handleThreadApproveLiveLinks] chat_threads update error:", e?.message || e);
      }
    }

    if (db.chat_threads) {
      const thread = db.chat_threads.find((t: any) => t.id === targetThreadId || t.deal_id === dealId);
      if (thread) {
        thread.status = 'COMPLETED';
        thread.flow_state = 'COMPLETED';
        thread.updated_at = nowIso;
      }
    }

    // 3. Insert system message in chat
    const msgId = crypto.randomUUID();
    const msgText = `🎉 Deliverables & Live Links Approved!\n\nEscrow payment of ₹${dealAmount.toLocaleString('en-IN')} has been released. The deal is now complete! Creator will receive payout of ₹${netAmount.toLocaleString('en-IN')} after platform fee.`;
    const msgMetadata = {
      action: 'live_links_approved',
      status: 'COMPLETED',
      amount: dealAmount,
      creator_net_amount: netAmount,
      platform_fee: platformFee,
      sender_role: 'brand'
    };

    const msgRecord: any = {
      message_id: msgId,
      id: msgId,
      thread_id: targetThreadId,
      sender_user_id: canonicalBrandId,
      receiver_user_id: canonicalCreatorId || null,
      sender_id: canonicalBrandId,
      receiver_id: canonicalCreatorId || null,
      sender_role: 'brand',
      text: msgText,
      content: msgText,
      from_name: user?.name || user?.full_name || 'Brand',
      message_type: 'live_links_approved',
      metadata: msgMetadata,
      read: false,
      created_at: nowIso
    };

    if (supabase) {
      try {
        await insertChatMessageToSupabase(msgRecord);
      } catch (e) {
        console.error("[handleThreadApproveLiveLinks] Chat message insert error:", e);
      }
    }
    if (!db.chat_messages) db.chat_messages = [];
    db.chat_messages.push(msgRecord);

    // 4. Notification for creator
    if (canonicalCreatorId) {
      const notifId = `notif_${crypto.randomUUID().slice(0, 10)}`;
      const notifData = {
        id: notifId,
        user_id: canonicalCreatorId,
        type: 'deal_live_links_approved',
        title: 'Work Approved & Payment Released! 🎉',
        message: `Brand approved your deliverables for ₹${dealAmount.toLocaleString('en-IN')}. Escrow payout processing in 1–2 working days.`,
        link: `/messages/${targetThreadId}`,
        read: false,
        created_at: nowIso
      };
      if (supabase) {
        try {
          await (privilegedSupabase || supabase).from('notifications').insert(notifData);
        } catch (e) {}
      }
      if (!db.notifications) db.notifications = [];
      db.notifications.push(notifData);
    }

    // 5. Socket emit
    if (io) {
      io.to(targetThreadId).emit("new_message", msgRecord);
      io.emit("thread_updated", {
        threadId: targetThreadId,
        status: 'COMPLETED',
        flow_state: 'COMPLETED'
      });
    }

    saveDb(db);

    return res.json({
      ok: true,
      success: true,
      thread_id: targetThreadId,
      deal_id: dealId,
      status: 'COMPLETED',
      flow_state: 'COMPLETED',
      amount: dealAmount,
      creator_net_amount: netAmount,
      message: "Live links approved and payment released! Creator payout processing via Escrow in 1-2 working days."
    });
  };

  const handleThreadSubmitLiveLink = async (req: any, res: any) => {
    const user = await parseAuthUser(req);
    if (!user) return res.status(401).json({ error: "Unauthorized" });

    const targetThreadId = req.params.threadId || req.params.id;
    const { link, links, live_link, instagram_post_url, notes, content_notes } = req.body || {};
    const rawUrl = (
      link ||
      (Array.isArray(links)
        ? (links.map((l: any) => (typeof l === 'string' ? l : l?.url || '')).find((u: string) => u.trim() !== '') || '')
        : (typeof links === 'string' ? links : (links?.url || ''))) ||
      live_link ||
      instagram_post_url ||
      ""
    ).trim();
    const finalNotes = (notes || content_notes || "").trim();

    // Validate that link is a valid URL with http(s):// and a recognizable domain
    const isValidLiveUrl = (urlStr: string): boolean => {
      if (!urlStr || typeof urlStr !== 'string') return false;
      const trimmed = urlStr.trim();
      if (!trimmed || /\s/.test(trimmed)) return false;
      try {
        const toTest = trimmed.startsWith("http://") || trimmed.startsWith("https://") ? trimmed : `https://${trimmed}`;
        const parsed = new URL(toTest);
        if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return false;
        const hostParts = parsed.hostname.split('.');
        if (hostParts.length < 2) return false;
        const tld = hostParts[hostParts.length - 1];
        if (!tld || tld.length < 2) return false;
        return true;
      } catch (e) {
        return false;
      }
    };

    if (!isValidLiveUrl(rawUrl)) {
      return res.status(400).json({
        error: "A valid live post link (URL) is required to submit live links proof.",
        detail: "Please provide a valid web link starting with http:// or https://"
      });
    }

    const finalUrl = rawUrl.startsWith("http://") || rawUrl.startsWith("https://") ? rawUrl : `https://${rawUrl}`;

    const db = getDb();
    let targetThread: any = (db.chat_threads || []).find((t: any) => t.id === targetThreadId || t.deal_id === targetThreadId);

    if (!targetThread && supabase) {
      try {
        const { data: threadRow } = await (privilegedSupabase || supabase)
          .from('chat_threads')
          .select('*')
          .eq('id', targetThreadId)
          .maybeSingle();
        if (threadRow) targetThread = threadRow;
      } catch (e) {}
    }

    const dealId = targetThread?.deal_id || targetThreadId;
    const nowIso = new Date().toISOString();

    const isUgcOrder = isUgcThread(targetThread || { id: targetThreadId, deal_id: dealId });
    const campaignDealId = getCampaignDealId(targetThread || { id: targetThreadId, deal_id: dealId });

    // 1. Update deal in Supabase & Local DB (skip if it's a UGC order)
    let dealObj = !isUgcOrder ? (db.deals || []).find((d: any) => d.id === (campaignDealId || dealId) || d.id === targetThreadId) : null;
    if (dealObj) {
      dealObj.flow_state = 'PROOF_SUBMITTED';
      dealObj.status = 'ACTIVE';
      dealObj.live_links_submitted = true;
      dealObj.live_link = finalUrl;
      dealObj.updated_at = nowIso;
    }

    if (!isUgcOrder && supabase && campaignDealId) {
      try {
        await (privilegedSupabase || supabase)
          .from('deals')
          .update({
            flow_state: 'PROOF_SUBMITTED',
            status: 'ACTIVE',
            live_links_submitted: true,
            live_link: finalUrl,
            updated_at: nowIso
          })
          .eq('id', campaignDealId);
      } catch (e: any) {
        console.warn("[handleThreadSubmitLiveLink] Supabase deals update error:", e?.message || e);
      }
    }

    // 2. Insert or update content_submission
    const canonicalCreatorId = isUuid(targetThread?.creator_id) ? targetThread.creator_id : (isUuid(user?.user_id) ? user.user_id : (dealObj?.creator_id || user.user_id));
    const brandId = targetThread?.brand_id || dealObj?.brand_id;

    if (supabase) {
      try {
        await (privilegedSupabase || supabase)
          .from('content_submissions')
          .insert({
            id: crypto.randomUUID(),
            deal_id: isUgcOrder ? null : campaignDealId,
            creator_id: canonicalCreatorId,
            submission_type: 'live_link',
            video_url: finalUrl,
            notes_to_brand: finalNotes || null,
            status: 'PENDING_REVIEW',
            submitted_at: nowIso
          });
      } catch (e) {
        console.warn("[handleThreadSubmitLiveLink] content_submissions insert warning:", e);
      }
    }

    // 3. Update chat_threads
    if (supabase) {
      try {
        await (privilegedSupabase || supabase)
          .from('chat_threads')
          .update({
            status: 'ACTIVE',
            flow_state: 'PROOF_SUBMITTED',
            updated_at: nowIso
          })
          .eq('id', targetThreadId);
      } catch (e) {
        console.warn("[handleThreadSubmitLiveLink] Supabase chat_threads update error:", e);
      }
    }

    if (db.chat_threads) {
      const t = db.chat_threads.find((x: any) => x.id === targetThreadId || x.deal_id === dealId);
      if (t) {
        t.status = 'ACTIVE';
        t.flow_state = 'PROOF_SUBMITTED';
        t.live_links_submitted = true;
        t.live_link = finalUrl;
        t.updated_at = nowIso;
      }
    }

    // 4. Insert chat message for thread
    const msgId = crypto.randomUUID();
    const msgText = `🚀 Live Post Link Submitted!\n\nLink: ${finalUrl}${finalNotes ? `\n\nNotes: ${finalNotes}` : ''}`;
    const msgMetadata = {
      action: 'live_link_submitted',
      status: 'PROOF_SUBMITTED',
      link: finalUrl,
      links: [finalUrl],
      notes: finalNotes || undefined,
      sender_role: 'creator',
      sender_id: canonicalCreatorId,
      creator_id: canonicalCreatorId
    };

    const msgRecord: any = {
      message_id: msgId,
      id: msgId,
      thread_id: targetThreadId,
      sender_user_id: canonicalCreatorId,
      receiver_user_id: brandId || null,
      sender_id: canonicalCreatorId,
      receiver_id: brandId || null,
      sender_role: 'creator',
      text: msgText,
      content: msgText,
      from_name: user?.name || user?.full_name || 'Creator',
      message_type: 'live_links_submitted',
      metadata: msgMetadata,
      read: false,
      created_at: nowIso
    };

    if (supabase) {
      try {
        await insertChatMessageToSupabase(msgRecord);
      } catch (e) {
        console.error("[handleThreadSubmitLiveLink] Chat message insert error:", e);
      }
    }
    if (!db.chat_messages) db.chat_messages = [];
    db.chat_messages.push(msgRecord);

    // 5. Notification for brand
    if (brandId) {
      const notifId = `notif_${crypto.randomUUID().slice(0, 10)}`;
      const notifData = {
        id: notifId,
        user_id: brandId,
        type: 'deal_live_links_submitted',
        title: 'Live Link Submitted! 🚀',
        message: 'The creator submitted their live post link. Review the post and release payout.',
        link: `/messages/${targetThreadId}`,
        read: false,
        created_at: nowIso
      };
      if (supabase) {
        try {
          await (privilegedSupabase || supabase).from('notifications').insert(notifData);
        } catch (e) {}
      }
      if (!db.notifications) db.notifications = [];
      db.notifications.push(notifData);
    }

    // 6. Socket emit
    const io = req.app.get("io");
    if (io) {
      io.to(targetThreadId).emit("new_message", msgRecord);
      io.emit("thread_updated", {
        threadId: targetThreadId,
        status: 'ACTIVE',
        flow_state: 'PROOF_SUBMITTED'
      });
    }

    saveDb(db);

    return res.json({
      ok: true,
      success: true,
      deal_id: dealId,
      thread_id: targetThreadId,
      status: 'PROOF_SUBMITTED',
      flow_state: 'PROOF_SUBMITTED',
      link: finalUrl,
      message: "Live link submitted successfully! Brand has been notified."
    });
  };

  // Reject live links / Request resubmission of live links by Brand
  const handleThreadRejectLiveLinks = async (req: any, res: any) => {
    const user = await parseAuthUser(req);
    if (!user) return res.status(401).json({ error: "Unauthorized" });

    const rawId = req.params.id || req.params.threadId;
    const feedback = (req.body?.feedback || req.body?.notes || req.body?.reason || req.body?.comments || "").trim() || "Please resubmit correct live links.";

    const db = getDb();
    let targetThread: any = (db.chat_threads || []).find((t: any) => t.id === rawId || t.deal_id === rawId);

    if (!targetThread && supabase) {
      try {
        const { data: threadRow } = await (privilegedSupabase || supabase)
          .from('chat_threads')
          .select('*')
          .eq('id', rawId)
          .maybeSingle();
        if (threadRow) targetThread = threadRow;
      } catch (e) {}
    }

    const targetThreadId = targetThread?.id || rawId;
    const dealId = targetThread?.deal_id || (targetThread?.metadata && targetThread.metadata.deal_id) || rawId;
    const nowIso = new Date().toISOString();

    const isUgcOrder = isUgcThread(targetThread || { id: targetThreadId, deal_id: dealId });
    const campaignDealId = getCampaignDealId(targetThread || { id: targetThreadId, deal_id: dealId });

    // Find deal
    let dealObj = !isUgcOrder ? (db.deals || []).find((d: any) => d.id === (campaignDealId || dealId) || d.id === targetThreadId) : null;
    if (dealObj) {
      dealObj.flow_state = 'REVISION_REQUESTED_LINKS';
      dealObj.status = 'ACTIVE';
      dealObj.revision_notes_links = feedback;
      dealObj.updated_at = nowIso;
    }

    if (!isUgcOrder && supabase && campaignDealId) {
      try {
        await (privilegedSupabase || supabase)
          .from('deals')
          .update({
            status: 'ACTIVE',
            updated_at: nowIso
          })
          .eq('id', campaignDealId);
      } catch (e: any) {
        console.warn("[handleThreadRejectLiveLinks] Supabase deals update error:", e?.message || e);
      }
    }

    // Update chat_thread
    if (supabase) {
      try {
        await (privilegedSupabase || supabase)
          .from('chat_threads')
          .update({
            flow_state: 'REVISION_REQUESTED_LINKS',
            status: 'ACTIVE',
            revision_notes_links: feedback,
            updated_at: nowIso
          })
          .eq('id', targetThreadId);
      } catch (e) {
        console.warn("[handleThreadRejectLiveLinks] Supabase chat_threads update error:", e);
      }
    }

    if (db.chat_threads) {
      const t = db.chat_threads.find((x: any) => x.id === targetThreadId || x.deal_id === dealId);
      if (t) {
        t.status = 'ACTIVE';
        t.flow_state = 'REVISION_REQUESTED_LINKS';
        t.revision_notes_links = feedback;
        t.updated_at = nowIso;
      }
    }

    const creatorId = targetThread?.creator_id || dealObj?.creator_id;
    const brandId = targetThread?.brand_id || dealObj?.brand_id || user.user_id;

    // Chat message
    const msgId = crypto.randomUUID();
    const msgText = `❌ Resubmission requested by Brand: ${feedback}`;
    const msgMetadata = {
      action: 'live_links_resubmit_requested',
      status: 'REVISION_REQUESTED_LINKS',
      feedback
    };

    const msgRecord: any = {
      message_id: msgId,
      id: msgId,
      thread_id: targetThreadId,
      sender_user_id: user?.user_id || brandId,
      receiver_user_id: creatorId || null,
      sender_id: user?.user_id || brandId,
      receiver_id: creatorId || null,
      sender_role: 'brand',
      text: msgText,
      content: msgText,
      from_name: user?.name || user?.full_name || 'Brand',
      message_type: 'live_links_resubmit_request',
      metadata: msgMetadata,
      read: false,
      created_at: nowIso
    };

    if (supabase) {
      try {
        await insertChatMessageToSupabase(msgRecord);
      } catch (e) {
        console.error("[handleThreadRejectLiveLinks] Chat message insert error:", e);
      }
    }
    if (!db.chat_messages) db.chat_messages = [];
    db.chat_messages.push(msgRecord);

    // Notification for creator
    if (creatorId) {
      const notifId = `notif_${crypto.randomUUID().slice(0, 10)}`;
      const notifData = {
        id: notifId,
        user_id: creatorId,
        type: 'deal_live_links_resubmit',
        title: 'Correction Requested for Live Links ⚠️',
        message: `Brand requested resubmission: "${feedback}"`,
        link: `/messages/${targetThreadId}`,
        read: false,
        created_at: nowIso
      };
      if (supabase) {
        try {
          await (privilegedSupabase || supabase).from('notifications').insert(notifData);
        } catch (e) {}
      }
      if (!db.notifications) db.notifications = [];
      db.notifications.push(notifData);
    }

    // Socket emit
    const io = req.app.get("io");
    if (io) {
      io.to(targetThreadId).emit("new_message", msgRecord);
      io.emit("thread_updated", {
        threadId: targetThreadId,
        status: 'ACTIVE',
        flow_state: 'REVISION_REQUESTED_LINKS',
        revision_notes_links: feedback
      });
    }

    saveDb(db);

    return res.json({
      ok: true,
      success: true,
      thread_id: targetThreadId,
      deal_id: dealId,
      status: 'ACTIVE',
      flow_state: 'REVISION_REQUESTED_LINKS',
      feedback
    });
  };

  // Creator declines resubmission request for live links
  const handleThreadDeclineLiveLinksResubmission = async (req: any, res: any) => {
    const user = await parseAuthUser(req);
    if (!user) return res.status(401).json({ error: "Unauthorized" });

    const rawId = req.params.id || req.params.threadId;
    const feedback = (req.body?.feedback || req.body?.reason || "").trim() || "Creator declined the resubmission request.";

    const db = getDb();
    let targetThread: any = (db.chat_threads || []).find((t: any) => t.id === rawId || t.deal_id === rawId);

    if (!targetThread && supabase) {
      try {
        const { data: threadRow } = await (privilegedSupabase || supabase)
          .from('chat_threads')
          .select('*')
          .eq('id', rawId)
          .maybeSingle();
        if (threadRow) targetThread = threadRow;
      } catch (e) {}
    }

    const targetThreadId = targetThread?.id || rawId;
    const dealId = targetThread?.deal_id || (targetThread?.metadata && targetThread.metadata.deal_id) || rawId;
    const nowIso = new Date().toISOString();

    const isUgcOrder = isUgcThread(targetThread || { id: targetThreadId, deal_id: dealId });
    const campaignDealId = getCampaignDealId(targetThread || { id: targetThreadId, deal_id: dealId });

    let dealObj = !isUgcOrder ? (db.deals || []).find((d: any) => d.id === (campaignDealId || dealId) || d.id === targetThreadId) : null;
    if (dealObj) {
      dealObj.flow_state = 'REVISION_DECLINED_LINKS';
      dealObj.decline_notes_links = feedback;
      dealObj.updated_at = nowIso;
    }

    if (!isUgcOrder && supabase && campaignDealId) {
      try {
        await (privilegedSupabase || supabase)
          .from('deals')
          .update({
            updated_at: nowIso
          })
          .eq('id', campaignDealId);
      } catch (e: any) {
        console.warn("[handleThreadDeclineLiveLinksResubmission] Supabase deals update error:", e?.message || e);
      }
    }

    if (supabase) {
      try {
        await (privilegedSupabase || supabase)
          .from('chat_threads')
          .update({
            flow_state: 'REVISION_DECLINED_LINKS',
            decline_notes_links: feedback,
            updated_at: nowIso
          })
          .eq('id', targetThreadId);
      } catch (e) {
        console.warn("[handleThreadDeclineLiveLinksResubmission] Supabase chat_threads update error:", e);
      }
    }

    if (db.chat_threads) {
      const t = db.chat_threads.find((x: any) => x.id === targetThreadId || x.deal_id === dealId);
      if (t) {
        t.flow_state = 'REVISION_DECLINED_LINKS';
        t.decline_notes_links = feedback;
        t.updated_at = nowIso;
      }
    }

    const creatorId = targetThread?.creator_id || dealObj?.creator_id || user.user_id;
    const brandId = targetThread?.brand_id || dealObj?.brand_id;

    // Chat message
    const msgId = crypto.randomUUID();
    const msgText = `⚠️ Creator declined live links resubmission: ${feedback}`;
    const msgMetadata = {
      action: 'live_links_resubmit_declined',
      status: 'REVISION_DECLINED_LINKS',
      feedback
    };

    const msgRecord: any = {
      message_id: msgId,
      id: msgId,
      thread_id: targetThreadId,
      sender_user_id: user?.user_id || creatorId,
      receiver_user_id: brandId || null,
      sender_id: user?.user_id || creatorId,
      receiver_id: brandId || null,
      sender_role: 'creator',
      text: msgText,
      content: msgText,
      from_name: user?.name || user?.full_name || 'Creator',
      message_type: 'live_links_resubmit_declined',
      metadata: msgMetadata,
      read: false,
      created_at: nowIso
    };

    if (supabase) {
      try {
        await insertChatMessageToSupabase(msgRecord);
      } catch (e) {
        console.error("[handleThreadDeclineLiveLinksResubmission] Chat message insert error:", e);
      }
    }
    if (!db.chat_messages) db.chat_messages = [];
    db.chat_messages.push(msgRecord);

    // Socket emit
    const io = req.app.get("io");
    if (io) {
      io.to(targetThreadId).emit("new_message", msgRecord);
      io.emit("thread_updated", {
        threadId: targetThreadId,
        status: 'ACTIVE',
        flow_state: 'REVISION_DECLINED_LINKS',
        decline_notes_links: feedback
      });
    }

    saveDb(db);

    return res.json({
      ok: true,
      success: true,
      thread_id: targetThreadId,
      deal_id: dealId,
      status: 'ACTIVE',
      flow_state: 'REVISION_DECLINED_LINKS',
      feedback
    });
  };

  // Campaign Draft Revision Handler
  const handleCampaignRevision = async (req: any, res: any) => {
    const user = await parseAuthUser(req);
    if (!user) return res.status(401).json({ error: "Unauthorized" });

    const id = req.params.id || req.params.threadId;
    const notes = (
      req.body?.notes ||
      req.body?.feedback ||
      req.body?.revision_notes ||
      req.body?.comments ||
      ""
    ).trim();

    const db = getDb();
    let thread = (db.chat_threads || []).find((t: any) => t.id === id || t.deal_id === id);
    if (!thread && supabase) {
      try {
        const { data: thr } = await (privilegedSupabase || supabase)
          .from('chat_threads')
          .select('*')
          .or(`id.eq.${id},deal_id.eq.${id}`)
          .maybeSingle();
        if (thr) thread = thr;
      } catch (e) {}
    }

    const dealId = thread?.deal_id || (typeof id === 'string' && id.startsWith('thread_camp_') ? id.replace('thread_camp_', '') : id);
    const campaignDealId = getCampaignDealId(thread || { id, deal_id: dealId });
    const now = new Date().toISOString();
    let dealRecord: any = null;
    let submission: any = null;

    if (supabase && campaignDealId) {
      try {
        const { data: dData } = await (privilegedSupabase || supabase)
          .from('deals')
          .select('*')
          .eq('id', campaignDealId)
          .maybeSingle();
        if (dData) dealRecord = dData;

        const { data: sByDeal } = await (privilegedSupabase || supabase)
          .from('content_submissions')
          .select('*')
          .eq('deal_id', campaignDealId)
          .order('submitted_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        if (sByDeal) submission = sByDeal;
      } catch (e) {
        console.error("[handleCampaignRevision] Error fetching campaign deal/submission:", e);
      }
    }

    const localDeal = (db.deals || []).find((x: any) => x.id === (campaignDealId || dealId) || x.deal_id === (campaignDealId || dealId))
      || (db.collabs || []).find((x: any) => x.collab_id === (campaignDealId || dealId) || x.id === (campaignDealId || dealId));
    const currentUsed = Math.max(Number(dealRecord?.revisions_used || 0), Number(localDeal?.revisions_used || 0));
    const maxRevisions = Number(dealRecord?.revision_count || localDeal?.revision_count || 5);

    if (currentUsed >= maxRevisions) {
      return res.status(400).json({
        error: `Revision limit reached (${maxRevisions}/${maxRevisions}).`,
        detail: `Revision limit reached (${maxRevisions}/${maxRevisions}).`,
        _status: 400,
        revisions_used: currentUsed,
        revision_count: maxRevisions
      });
    }

    const nextUsed = currentUsed + 1;

    if (supabase) {
      try {
        if (submission) {
          await (privilegedSupabase || supabase)
            .from('content_submissions')
            .update({
              status: 'CHANGES_REQUESTED',
              brand_feedback: notes || "",
              reviewed_at: now
            })
            .eq('id', submission.id);
        }

        if (campaignDealId) {
          await (privilegedSupabase || supabase)
            .from('deals')
            .update({
              status: 'ACTIVE',
              revisions_used: nextUsed,
              updated_at: now
            })
            .eq('id', campaignDealId);
        }

        if (thread?.id) {
          await (privilegedSupabase || supabase)
            .from('chat_threads')
            .update({
              flow_state: 'CHANGES_REQUESTED',
              status: 'ACTIVE',
              updated_at: now
            })
            .eq('id', thread.id);
        }
      } catch (e) {
        console.error("[handleCampaignRevision] Error updating deal revision in Supabase:", e);
      }
    }

    if (db.content_submissions) {
      const sub = db.content_submissions.find((s: any) => s.id === id || s.deal_id === dealId);
      if (sub) {
        sub.status = 'CHANGES_REQUESTED';
        sub.brand_feedback = notes || "";
        sub.reviewed_at = now;
      }
    }

    if (localDeal) {
      localDeal.status = 'ACTIVE';
      localDeal.revisions_used = nextUsed;
      localDeal.updated_at = now;
    }

    if (thread) {
      thread.flow_state = 'CHANGES_REQUESTED';
      thread.status = 'ACTIVE';
      thread.updated_at = now;
      thread.revision_notes = notes;
    }

    const targetThreadId = thread?.id || id;
    const creatorId = thread?.creator_id || dealRecord?.creator_id || localDeal?.creator_id;
    const msgId = `msg_${Date.now()}_${crypto.randomUUID().slice(0, 6)}`;
    const msgPayload = {
      message_id: msgId,
      thread_id: targetThreadId,
      sender_user_id: user.user_id,
      receiver_user_id: creatorId || '',
      text: `Brand requested changes: ${notes || 'Please review feedback and upload an updated draft.'}`,
      from_name: user.name || 'Brand',
      message_type: 'revision_requested',
      metadata: {
        feedback: notes,
        notes,
        revision_notes: notes,
        revisions_used: nextUsed,
        action: 'revision_requested'
      },
      created_at: now,
      read: false
    };

    if (supabase) {
      try {
        await insertChatMessageToSupabase(msgPayload);
      } catch (e) {}
    }

    if (!db.chat_messages) db.chat_messages = [];
    db.chat_messages.push({
      ...msgPayload,
      id: msgId,
      content: msgPayload.text,
      sender_id: user.user_id,
      receiver_id: creatorId || '',
      sender_role: 'brand'
    });

    saveDb(db);

    const io = req.app.get("io");
    if (io) {
      io.to(targetThreadId).emit("new_message", msgPayload);
      io.to(targetThreadId).emit("thread_updated", {
        threadId: targetThreadId,
        id: targetThreadId,
        deal_id: dealId,
        status: 'ACTIVE',
        flow_state: 'CHANGES_REQUESTED',
        revision_notes: notes,
        revision_feedback: notes
      });
    }

    return res.json({
      success: true,
      message: "Revision request submitted for campaign draft",
      flow_state: 'CHANGES_REQUESTED',
      revisions_used: nextUsed
    });
  };

  const handleCampaignCancel = async (req: any, res: any) => {
    return res.status(400).json({
      error: "Campaign deals cannot be cancelled via this endpoint",
      detail: "Campaign deals cannot be cancelled via this endpoint",
      _status: 400
    });
  };

  // 10b. Approve Content for Thread (separates Campaign Deals & UGC Collab from Raw Video UGC)
  const handleThreadApproveContent = async (req: any, res: any) => {
    const user = await parseAuthUser(req);
    if (!user) return res.status(401).json({ error: "Unauthorized" });
    const id = req.params.id || req.params.threadId;
    const notes = req.body?.notes || req.body?.feedback || "";
    const nowIso = getIsoNow ? getIsoNow() : new Date().toISOString();
    const db = getDb();

    // 1. Resolve thread and check whether it belongs to a Deal vs UGC Order
    let thread: any = null;
    if (supabase) {
      try {
        const { data: thr } = await (privilegedSupabase || supabase)
          .from('chat_threads')
          .select('*')
          .or(`id.eq.${id},deal_id.eq.${id}`)
          .maybeSingle();
        if (thr) thread = thr;
      } catch (e) {
        console.warn("[handleThreadApproveContent] Error resolving thread:", e);
      }
    }
    if (!thread && db.chat_threads) {
      thread = db.chat_threads.find((t: any) => t.id === id || t.deal_id === id);
    }

    const targetOrderId = thread?.deal_id || thread?.id || id;
    let ugcOrder: any = null;
    if (supabase) {
      try {
        const { data: o } = await (privilegedSupabase || supabase)
          .from('ugc_orders')
          .select('*')
          .or(`id.eq.${id},id.eq.${targetOrderId},brief_id.eq.${id}`)
          .maybeSingle();
        if (o) ugcOrder = o;
      } catch (e) {
        console.warn("[handleThreadApproveContent] Error checking ugc_orders:", e);
      }
    }
    if (!ugcOrder && db.ugc_orders) {
      ugcOrder = db.ugc_orders.find((o: any) => o.id === id || o.id === targetOrderId || o.brief_id === id);
    }

    // Check whether this thread belongs to a UGC order or a Deal
    const isUgcOrder = isUgcThread(thread || { id, deal_id: targetOrderId, ugc_order: ugcOrder });

    const briefId = ugcOrder?.brief_id || thread?.ugc_brief_id;
    let brief: any = null;
    if (supabase && briefId) {
      try {
        const { data: b } = await (privilegedSupabase || supabase)
          .from('ugc_briefs')
          .select('*')
          .eq('id', briefId)
          .maybeSingle();
        if (b) brief = b;
      } catch (e) {}
    }
    if (!brief && db.ugc_briefs && briefId) {
      brief = db.ugc_briefs.find((b: any) => b.id === briefId);
    }

    const deliverableType = String(
      ugcOrder?.deliverable_type ||
      brief?.deliverable_type ||
      thread?.deliverable_type ||
      ""
    ).toLowerCase();

    const isCollab = ugcOrder?.is_collaboration !== undefined
      ? Boolean(ugcOrder.is_collaboration)
      : (ugcOrder?.requires_live_link !== undefined
        ? Boolean(ugcOrder.requires_live_link)
        : (brief?.is_collaboration !== undefined
          ? Boolean(brief.is_collaboration)
          : isCollaborationDeliverable(deliverableType)));

    const requiresLiveLink = ugcOrder?.requires_live_link !== undefined
      ? Boolean(ugcOrder.requires_live_link)
      : isCollab;

    // If it's a Normal UGC order thread (requiresLiveLink === false), draft approval IS the final approval: releases payout
    if (isUgcOrder && !requiresLiveLink && syncUgcLifecycleEvent) {
      const result = await syncUgcLifecycleEvent({
        rawId: id,
        action: 'APPROVE',
        actorUser: user,
        notes,
        io: req.app.get("io")
      });
      return res.json({
        ...result,
        message: "Order approved! Escrow payout released to creator."
      });
    }

    // Otherwise, this is a Collaboration (Campaign Deal or UGC Collaboration Reel)!
    // In collaboration flow, draft approval ONLY approves the draft, does NOT release escrow payout,
    // and asks creator to post to their handle and submit live links.
    const dealId = thread?.deal_id || id;
    const campaignDealId = getCampaignDealId(thread || { id, deal_id: dealId });
    const targetThreadId = thread?.id || id;
    let creatorId = thread?.creator_id;
    let brandId = thread?.brand_id || user?.user_id;

    if ((!creatorId || !brandId) && supabase && campaignDealId) {
      try {
        const { data: dRec } = await (privilegedSupabase || supabase)
          .from('deals')
          .select('creator_id, brand_id')
          .eq('id', campaignDealId)
          .maybeSingle();
        if (dRec) {
          if (!creatorId) creatorId = dRec.creator_id;
          if (!brandId) brandId = dRec.brand_id;
        }
      } catch (e) {}
    }

    // A. Update latest content_submission for this deal to APPROVED
    if (supabase && campaignDealId) {
      try {
        const { data: sByDeal } = await (privilegedSupabase || supabase)
          .from('content_submissions')
          .select('*')
          .eq('deal_id', campaignDealId)
          .order('submitted_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        if (sByDeal) {
          await (privilegedSupabase || supabase)
            .from('content_submissions')
            .update({
              status: 'APPROVED',
              brand_feedback: notes || null,
              reviewed_at: nowIso
            })
            .eq('id', sByDeal.id);
        }
      } catch (e) {
        console.warn("[handleThreadApproveContent] content_submissions update error:", e);
      }
    }
    if (db.content_submissions) {
      const sub = db.content_submissions.slice().reverse().find((s: any) => s.deal_id === (campaignDealId || dealId) || s.id === (campaignDealId || dealId));
      if (sub) {
        sub.status = 'APPROVED';
        sub.reviewed_at = nowIso;
        if (notes) sub.brand_feedback = notes;
      }
    }

    // B. Update deals & ugc_orders table: status = 'CONTENT_APPROVED' (do NOT touch escrow_hold)
    if (supabase) {
      try {
        if (campaignDealId) {
          await (privilegedSupabase || supabase)
            .from('deals')
            .update({
              status: 'CONTENT_APPROVED',
              updated_at: nowIso
            })
            .eq('id', campaignDealId);
        }
        if (ugcOrder?.id || isUgcOrder) {
          const uId = ugcOrder?.id || id;
          await (privilegedSupabase || supabase)
            .from('ugc_orders')
            .update({
              status: 'CONTENT_APPROVED',
              reviewed_at: nowIso,
              updated_at: nowIso
            })
            .eq('id', uId);
        }
      } catch (e) {
        console.warn("[handleThreadApproveContent] deals/ugc_orders update error:", e);
      }
    }
    if (db.deals && dealId) {
      const d = db.deals.find((x: any) => x.id === dealId || x.deal_id === dealId);
      if (d) {
        d.status = 'CONTENT_APPROVED';
        d.stage = 'CONTENT_APPROVED';
        d.updated_at = nowIso;
      }
    }
    if (db.collabs && dealId) {
      const c = db.collabs.find((x: any) => x.collab_id === dealId || x.id === dealId);
      if (c) {
        c.status = 'CONTENT_APPROVED';
        c.stage = 'CONTENT_APPROVED';
        c.updated_at = nowIso;
      }
    }
    if (db.ugc_orders && (ugcOrder || isUgcOrder)) {
      const uId = ugcOrder?.id || id;
      const ord = db.ugc_orders.find((o: any) => o.id === uId || o.brief_id === id);
      if (ord) {
        ord.status = 'CONTENT_APPROVED';
        ord.reviewed_at = nowIso;
        ord.updated_at = nowIso;
      }
    }

    // C. Update chat_threads: status = 'ACTIVE', flow_state = 'CONTENT_APPROVED' (do NOT set COMPLETED)
    if (supabase) {
      try {
        await (privilegedSupabase || supabase)
          .from('chat_threads')
          .update({
            status: 'ACTIVE',
            flow_state: 'CONTENT_APPROVED',
            updated_at: nowIso
          })
          .eq('id', targetThreadId);
      } catch (e) {
        console.warn("[handleThreadApproveContent] chat_threads update error:", e);
      }
    }
    if (db.chat_threads) {
      const t = db.chat_threads.find((x: any) => x.id === targetThreadId || x.deal_id === dealId);
      if (t) {
        t.status = 'ACTIVE';
        t.flow_state = 'CONTENT_APPROVED';
        t.content_approved = true;
        t.updated_at = nowIso;
      }
    }

    // D. Insert accurate chat message
    const msgId = crypto.randomUUID();
    const msgText = "🎉 Content Approved! The brand has approved your draft. Please submit your live post link to complete this deal.";
    const msgMetadata = {
      action: 'draft_approved',
      status: 'CONTENT_APPROVED',
      notes: notes || undefined
    };
    const msgRecord: any = {
      message_id: msgId,
      id: msgId,
      thread_id: targetThreadId,
      sender_user_id: user?.user_id || brandId,
      receiver_user_id: creatorId || null,
      sender_id: user?.user_id || brandId,
      receiver_id: creatorId || null,
      sender_role: 'brand',
      text: msgText,
      content: msgText,
      from_name: user?.name || user?.full_name || 'Brand',
      message_type: 'content_approved',
      metadata: msgMetadata,
      read: false,
      created_at: nowIso
    };

    if (supabase) {
      try {
        await insertChatMessageToSupabase(msgRecord);
      } catch (e) {
        console.error("[handleThreadApproveContent] Chat message insert error:", e);
      }
    }
    if (!db.chat_messages) db.chat_messages = [];
    db.chat_messages.push(msgRecord);

    // E. Notification for creator
    if (creatorId) {
      const notifId = `notif_${crypto.randomUUID().slice(0, 10)}`;
      const notifData = {
        id: notifId,
        user_id: creatorId,
        type: 'deal_content_approved',
        title: 'Draft Approved! 🚀',
        message: 'The brand approved your content draft. Please submit your live post link to proceed.',
        link: `/messages/${targetThreadId}`,
        read: false,
        created_at: nowIso
      };
      if (supabase) {
        try {
          await (privilegedSupabase || supabase).from('notifications').insert(notifData);
        } catch (e) {}
      }
      if (!db.notifications) db.notifications = [];
      db.notifications.push(notifData);
    }

    // F. Socket emission
    const io = req.app.get("io");
    if (io) {
      io.to(targetThreadId).emit("new_message", msgRecord);
      io.emit("thread_updated", {
        threadId: targetThreadId,
        status: 'ACTIVE',
        flow_state: 'CONTENT_APPROVED'
      });
    }

    saveDb(db);

    return res.json({
      ok: true,
      success: true,
      deal_id: dealId,
      thread_id: targetThreadId,
      status: 'CONTENT_APPROVED',
      flow_state: 'CONTENT_APPROVED',
      message: "Draft content approved! Notification sent to creator to submit live link."
    });
  };

  return {
    handleThreadApproveLiveLinks,
    handleThreadApproveContent,
    handleThreadSubmitLiveLink,
    handleThreadRejectLiveLinks,
    handleThreadDeclineLiveLinksResubmission,
    handleCampaignRevision,
    handleCampaignCancel
  };
}

export function setupCampaignThreadRoutes(
  app: express.Application,
  router: express.Router,
  {
    handleCampaignApprove,
    handleCampaignApproveContent,
    handleCampaignSubmitLiveLink,
    handleCampaignSubmitContent,
    handleCampaignRevision,
    handleCampaignDeclineRevisions,
    handleCampaignCancel,
  }: {
    handleCampaignApprove: (req: express.Request, res: express.Response) => any;
    handleCampaignApproveContent?: (req: express.Request, res: express.Response) => any;
    handleCampaignSubmitLiveLink?: (req: express.Request, res: express.Response) => any;
    handleCampaignSubmitContent?: (req: express.Request, res: express.Response) => any;
    handleCampaignRevision: (req: express.Request, res: express.Response) => any;
    handleCampaignDeclineRevisions: (req: express.Request, res: express.Response) => any;
    handleCampaignCancel: (req: express.Request, res: express.Response) => any;
  }
) {
  // Campaign thread routes namespace
  router.post(["/campaign/threads/:id/mark-complete", "/campaign/threads/:id/approve-live-links"], handleCampaignApprove);
  if (handleCampaignApproveContent) {
    router.post(["/campaign/threads/:id/approve-content", "/campaign/threads/:id/content/approve"], handleCampaignApproveContent);
  }
  if (handleCampaignSubmitLiveLink) {
    router.post(["/campaign/threads/:id/submit-live-link", "/campaign/threads/:id/submit-live-links"], handleCampaignSubmitLiveLink);
  }
  if (handleCampaignSubmitContent) {
    router.post(["/campaign/threads/:id/submit-content", "/campaign/threads/:id/submit-draft"], handleCampaignSubmitContent);
  }
  router.post(["/campaign/threads/:id/reject-content", "/campaign/threads/:id/request-revision"], handleCampaignRevision);
  router.post(["/campaign/threads/:id/decline-revisions", "/campaign/threads/:id/decline-live-links-resubmission"], handleCampaignDeclineRevisions);
  router.post("/campaign/threads/:id/cancel-order", handleCampaignCancel);
}
