import express from "express";

const getIsoNow = () => new Date().toISOString();

// Admin waitlist / approval queue: merges raw `waitlist` table rows with any
// registered creator/brand profiles still sitting in `under_review`, so admins
// see one unified list. Approve either activates a registered profile, or —
// for a creator who applied via the public form and never signed up — creates
// an "unclaimed" shadow user + creator_profile so they show up in Explore
// Creators immediately (claimable later if they register with the same info).
export function setupAdminWaitlistRoutes(
  app: express.Application,
  router: express.Router,
  {
    supabase,
    privilegedSupabase,
    getDb,
    saveDb,
    parseAuthUser,
    sendNotification,
    checkAdminPerm,
  }: {
    supabase: any;
    privilegedSupabase: any;
    getDb: () => any;
    saveDb: (db: any) => void;
    parseAuthUser: (req: express.Request) => Promise<any>;
    sendNotification: (db: any, userId: any, type: any, message: any) => Promise<any>;
    checkAdminPerm: (user: any, perm: string) => Promise<boolean>;
  }
) {
  router.get("/admin/waitlist", async (req, res) => {
    const user = await parseAuthUser(req);
    if (!user || (user.role !== 'admin' && user.role !== 'sub_admin' && user.team_role !== 'sub_admin')) {
      return res.status(403).json({ detail: "Admin only", _status: 403 });
    }

    try {
      const activeClient = privilegedSupabase || supabase;
      let waitlistData: any[] = [];
      let creatorProfiles: any[] = [];
      let brandProfiles: any[] = [];
      let allUsers: any[] = [];
      let allCreatorKyc: any[] = [];

      if (activeClient) {
        const [wRes, cpRes, bpRes, uRes, ckRes] = await Promise.all([
          activeClient.from('waitlist').select('*').order('created_at', { ascending: false }),
          activeClient.from('creator_profiles').select('*').order('created_at', { ascending: false }),
          activeClient.from('brand_profiles').select('*').order('created_at', { ascending: false }),
          activeClient.from('users').select('user_id, email, name, phone, mobile, dob, date_of_birth, gender, city, state, picture, role, auth_method, is_claimed, is_unclaimed, created_at'),
          activeClient.from('creator_kyc').select('creator_id, full_name, dob, address, phone, instagram_handle, follower_count, niche, pan_number, aadhaar_number, bank_account_no, bank_ifsc, upi_id')
        ]);
        waitlistData = wRes.data || [];
        creatorProfiles = cpRes.data || [];
        brandProfiles = bpRes.data || [];
        allUsers = uRes.data || [];
        allCreatorKyc = ckRes.data || [];
      }

      const localDb = getDb();
      if (localDb.waitlist && Array.isArray(localDb.waitlist)) {
        const seenWIds = new Set(waitlistData.map((w: any) => String(w.id || '')));
        localDb.waitlist.forEach((w: any) => {
          const wId = String(w.id || '');
          if (!wId || !seenWIds.has(wId)) {
            waitlistData.push(w);
            if (wId) seenWIds.add(wId);
          }
        });
      }

      if (localDb.creator_profiles && Array.isArray(localDb.creator_profiles)) {
        const seenCpIds = new Set(creatorProfiles.map((c: any) => String(c.user_id || '')));
        localDb.creator_profiles.forEach((c: any) => {
          if (c.user_id && !seenCpIds.has(String(c.user_id))) {
            creatorProfiles.push(c);
            seenCpIds.add(String(c.user_id));
          }
        });
      }

      if (localDb.brand_profiles && Array.isArray(localDb.brand_profiles)) {
        const seenBpIds = new Set(brandProfiles.map((b: any) => String(b.user_id || '')));
        localDb.brand_profiles.forEach((b: any) => {
          if (b.user_id && !seenBpIds.has(String(b.user_id))) {
            brandProfiles.push(b);
            seenBpIds.add(String(b.user_id));
          }
        });
      }

      const userMap = new Map<string, any>();
      const userEmailMap = new Map<string, any>();
      (allUsers || []).forEach(u => {
        if (u.user_id) userMap.set(u.user_id, u);
        if (u.email) userEmailMap.set(u.email.toLowerCase().trim(), u);
      });
      (localDb.users || []).forEach((u: any) => {
        if (u.user_id && !userMap.has(u.user_id)) userMap.set(u.user_id, u);
        if (u.email && !userEmailMap.has(u.email.toLowerCase().trim())) userEmailMap.set(u.email.toLowerCase().trim(), u);
      });

      const kycMap = new Map<string, any>();
      (allCreatorKyc || []).forEach(k => {
        if (k.creator_id) kycMap.set(k.creator_id, k);
      });

      const mappedList: any[] = [];
      const seenKeys = new Set<string>();

      // 1. Process all entries from waitlist table (preserving all distinct creator applications)
      (waitlistData || []).forEach((w) => {
        const emailKey = (w.email || '').toLowerCase().trim();
        const idKey = String(w.id || '');
        if (idKey && seenKeys.has(idKey)) return;

        if (idKey) seenKeys.add(idKey);
        if (w.user_id && w.is_registered_user) seenKeys.add(String(w.user_id));
        if (w.linked_user_id) seenKeys.add(String(w.linked_user_id));

        const u = (w.linked_user_id ? userMap.get(w.linked_user_id) : null) || 
                  (w.user_id ? userMap.get(w.user_id) : null) || 
                  (w.is_registered_user && emailKey ? userEmailMap.get(emailKey) : null);
        const k = (w.linked_user_id ? kycMap.get(w.linked_user_id) : null) || (w.user_id ? kycMap.get(w.user_id) : null);

        const statusRaw = String(w.status || 'Pending').trim();
        let status = 'Pending';
        if (statusRaw.toLowerCase() === 'approved') status = 'Approved';
        else if (statusRaw.toLowerCase() === 'rejected') status = 'Rejected';

        const isBrand = w.role === 'brand' || Boolean(w.company_name);
        const isRegistered = w.is_registered_user === true || (u && u.auth_method !== 'unclaimed' && u.is_claimed !== false);

        const phoneVal = w.phone || w.mobile || u?.phone || u?.mobile || k?.phone || "";
        const dobVal = w.dob || w.date_of_birth || u?.dob || u?.date_of_birth || k?.dob || "";
        const genderVal = w.gender || u?.gender || "";
        const cityVal = w.city || u?.city || "";
        const stateVal = w.state || u?.state || "";
        const nicheVal = w.niche || w.category || w.primary_niche || (isBrand ? "Retail" : "Fashion & Lifestyle");
        const handleVal = w.social_handle || w.handle || w.instagram_handle || (w.name ? "@" + w.name.toLowerCase().replace(/\s+/g, '') : "");
        const followersCount = Number(w.followers || w.follower_count || 0);
        const photoVal = w.profile_photo_url || w.photo || w.picture || u?.picture || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400";

        mappedList.push({
          id: w.id || "wl_" + (emailKey || Math.random().toString(36).substring(2, 7)),
          user_id: w.linked_user_id || w.user_id || w.id,
          role: isBrand ? "brand" : "creator",
          name: isBrand ? (w.company_name || w.name || "Brand Representative") : (w.name || u?.name || "Creator"),
          company_name: w.company_name || (isBrand ? (w.name || "Brand") : ""),
          email: w.email || u?.email || "",
          handle: handleVal,
          social_handle: handleVal,
          instagram_link: w.instagram_link || (handleVal ? "https://instagram.com/" + handleVal.replace(/^@/, '') : ""),
          website: w.website || "",
          followers: followersCount,
          platform: w.platform || (w.youtube ? "YouTube" : "Instagram"),
          status,
          profile_status: status === 'Approved' ? 'approved' : (status === 'Rejected' ? 'rejected' : 'under_review'),
          created_at: w.created_at || getIsoNow(),
          date: w.created_at ? w.created_at.split("T")[0] : getIsoNow().split("T")[0],
          photo: photoVal,
          picture: photoVal,
          category: nicheVal,
          niche: nicheVal,
          city: cityVal,
          state: stateVal,
          location: cityVal ? cityVal + (stateVal ? ', ' + stateVal : '') : (stateVal || "India"),
          mobile: phoneVal,
          phone: phoneVal,
          dob: dobVal,
          date_of_birth: dobVal,
          gender: genderVal,
          charges: w.charges || "",
          pricing: w.pricing || {
            reel: Number(w.rate_reel || 0),
            story: Number(w.rate_story || 0),
            yt_video: Number(w.rate_yt_video || 0),
            ugc: Number(w.rate_reel || 0)
          },
          ugc_rating: Number(w.ugc_rating || 7),
          avg_reach: w.avg_reach || "",
          collab_types: Array.isArray(w.collab_types) ? w.collab_types : [],
          sample_links: Array.isArray(w.sample_links) ? w.sample_links : [],
          portfolio: Array.isArray(w.sample_links) ? w.sample_links : (w.portfolio || []),
          notes: w.notes || w.about || w.bio || "",
          about: w.about || w.notes || w.bio || "",
          is_registered_user: isRegistered,
          reject_reason: w.reject_reason || w.rejectReason || "",
          rejectReason: w.reject_reason || w.rejectReason || "",
          panel_message: w.panel_message || ""
        });
      });

      // 2. Add any registered creator profiles that are 'under_review' and NOT already in mapped waitlist
      (creatorProfiles || []).forEach((cp) => {
        if (cp.profile_status !== 'under_review') return;
        const emailKey = (cp.email || '').toLowerCase().trim();
        const idKey = String(cp.user_id || '');
        if (emailKey && seenKeys.has(emailKey)) return;
        if (idKey && seenKeys.has(idKey)) return;

        if (emailKey) seenKeys.add(emailKey);
        if (idKey) seenKeys.add(idKey);

        const u = userMap.get(cp.user_id) || (emailKey ? userEmailMap.get(emailKey) : null);
        const k = kycMap.get(cp.user_id);
        const phoneVal = cp.phone || cp.mobile || u?.phone || u?.mobile || k?.phone || "";
        const nicheVal = cp.primary_niche || cp.category || k?.niche || "Fashion & Lifestyle";
        const handleVal = cp.instagram_handle || cp.handle || (k?.instagram_handle ? "@" + k.instagram_handle.replace(/^@/, '') : "@" + (cp.name || "creator").toLowerCase().replace(/\s+/g, ''));
        const followersCount = Number(cp.followers_instagram || cp.follower_count || cp.followers || k?.follower_count || 0);
        const photoVal = cp.photo || cp.picture || u?.picture || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400";

        mappedList.push({
          id: cp.user_id,
          user_id: cp.user_id,
          role: "creator",
          name: cp.name || cp.full_name || u?.name || "Creator",
          email: cp.email || u?.email || "",
          handle: handleVal,
          social_handle: handleVal,
          instagram_link: handleVal ? "https://instagram.com/" + handleVal.replace(/^@/, '') : "",
          followers: followersCount,
          platform: cp.youtube ? "YouTube" : "Instagram",
          status: "Pending",
          profile_status: "under_review",
          created_at: cp.created_at || getIsoNow(),
          date: cp.created_at ? cp.created_at.split("T")[0] : getIsoNow().split("T")[0],
          photo: photoVal,
          picture: photoVal,
          category: nicheVal,
          niche: nicheVal,
          city: cp.city || u?.city || "",
          state: cp.state || u?.state || "",
          location: cp.city ? cp.city + (cp.state ? ', ' + cp.state : '') : (cp.state || "India"),
          mobile: phoneVal,
          phone: phoneVal,
          dob: cp.dob || u?.dob || "",
          gender: cp.gender || u?.gender || "",
          charges: cp.charges || (cp.rate_reel ? "₹" + cp.rate_reel : ""),
          pricing: {
            reel: Number(cp.rate_reel || 0),
            story: Number(cp.rate_story || 0),
            yt_video: Number(cp.rate_yt_video || 0),
            ugc: Number(cp.rate_reel || 0)
          },
          ugc_rating: Number(cp.ugc_rating || 7),
          avg_reach: cp.avg_views_30d || "",
          collab_types: cp.collab_types || [],
          sample_links: cp.portfolio || [],
          portfolio: cp.portfolio || [],
          notes: cp.bio || cp.about || "",
          about: cp.about || cp.bio || "",
          is_registered_user: true,
          reject_reason: "",
          rejectReason: "",
          panel_message: cp.panel_message || ""
        });
      });

      // 3. Add any registered brand profiles that are 'under_review' and NOT already in mapped waitlist
      (brandProfiles || []).forEach((bp) => {
        if (bp.profile_status !== 'under_review') return;
        const emailKey = (bp.email || '').toLowerCase().trim();
        const idKey = String(bp.user_id || '');
        if (emailKey && seenKeys.has(emailKey)) return;
        if (idKey && seenKeys.has(idKey)) return;

        if (emailKey) seenKeys.add(emailKey);
        if (idKey) seenKeys.add(idKey);

        const u = userMap.get(bp.user_id) || (emailKey ? userEmailMap.get(emailKey) : null);
        const photoVal = bp.logo || bp.photo || bp.picture || u?.picture || "https://images.unsplash.com/photo-1572021335469-31706a17aaef?w=400";

        mappedList.push({
          id: bp.user_id,
          user_id: bp.user_id,
          role: "brand",
          company_name: bp.company_name || bp.brand_name || u?.name || "Brand",
          name: bp.contact_person || bp.rep_name || u?.name || bp.company_name || "Brand Representative",
          email: bp.email || u?.email || "",
          website: bp.website || "",
          monthly_budget: bp.monthly_budget || bp.budget || "",
          company_size: bp.company_size || "",
          status: "Pending",
          profile_status: "under_review",
          created_at: bp.created_at || getIsoNow(),
          date: bp.created_at ? bp.created_at.split("T")[0] : getIsoNow().split("T")[0],
          photo: photoVal,
          picture: photoVal,
          category: bp.industry || bp.category || "Retail",
          niche: bp.industry || bp.category || "Retail",
          city: bp.city || u?.city || "",
          state: bp.state || u?.state || "",
          location: bp.city ? bp.city + (bp.state ? ', ' + bp.state : '') : (bp.state || "India"),
          mobile: bp.phone || u?.phone || "",
          phone: bp.phone || u?.phone || "",
          is_registered_user: true,
          reject_reason: "",
          rejectReason: "",
          panel_message: bp.panel_message || ""
        });
      });

      // Sort: Pending applications first, then by created_at descending
      mappedList.sort((a, b) => {
        if (a.status === "Pending" && b.status !== "Pending") return -1;
        if (a.status !== "Pending" && b.status === "Pending") return 1;
        return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
      });

      // Assign sequence position #1, #2, etc.
      mappedList.forEach((item, idx) => {
        item.position = idx + 1;
      });

      return res.json(mappedList);
    } catch (err: any) {
      console.error("Error fetching waitlist queue:", err);
      return res.status(500).json({ error: "Failed to fetch approval queue: " + err.message });
    }
  });

  router.patch("/admin/waitlist/:id", async (req, res) => {
    try {
      const user = await parseAuthUser(req);
      if (!user || !(await checkAdminPerm(user, 'manage_users'))) {
        if (user?.role !== 'admin') return res.status(403).json({ detail: "Admin only", _status: 403 });
      }

      const targetId = req.params.id;
      const updates = req.body;
      const activeClient = privilegedSupabase || supabase;

      if (activeClient) {
        await activeClient.from('waitlist').update(updates).eq('id', targetId);
      }

      const localDb = getDb();
      if (localDb.waitlist) {
        const wIdx = localDb.waitlist.findIndex((w: any) => String(w.id) === String(targetId) || String(w.user_id) === String(targetId));
        if (wIdx >= 0) {
          localDb.waitlist[wIdx] = { ...localDb.waitlist[wIdx], ...updates };
        }
      }
      saveDb(localDb);

      return res.json({ ok: true, message: "Waitlist entry updated successfully" });
    } catch (err: any) {
      console.error("Waitlist patch error:", err);
      return res.status(500).json({ error: err.message || "Failed to update waitlist entry" });
    }
  });

  // Admin Approve Waitlist Entry / Creator / Brand
  router.post("/admin/waitlist/:id/approve", async (req, res) => {
    const user = await parseAuthUser(req);
    if (!user || (user.role !== 'admin' && user.role !== 'sub_admin' && user.team_role !== 'sub_admin')) {
      return res.status(403).json({ detail: "Admin only", _status: 403 });
    }

    const targetId = req.params.id;
    const activeClient = privilegedSupabase || supabase;

    try {
      const localDb = getDb();
      if (!localDb.users) localDb.users = [];
      if (!localDb.creator_profiles) localDb.creator_profiles = [];
      if (!localDb.brand_profiles) localDb.brand_profiles = [];
      if (!localDb.waitlist) localDb.waitlist = [];

      // 1. Check if item exists in waitlist table
      let waitlistEntry: any = null;
      if (activeClient) {
        const { data } = await activeClient.from('waitlist').select('*').eq('id', targetId).maybeSingle();
        if (data) waitlistEntry = data;
        else {
          const { data: byUser } = await activeClient.from('waitlist').select('*').or("linked_user_id.eq." + targetId + ",user_id.eq." + targetId).maybeSingle();
          if (byUser) waitlistEntry = byUser;
        }
      }
      if (!waitlistEntry && localDb.waitlist) {
        waitlistEntry = localDb.waitlist.find((w: any) => String(w.id) === String(targetId) || String(w.linked_user_id) === String(targetId) || String(w.user_id) === String(targetId));
      }

      // 2. Check if item exists as a registered creator profile
      let existingCp: any = null;
      if (activeClient) {
        const { data } = await activeClient.from('creator_profiles').select('*').eq('user_id', targetId).maybeSingle();
        if (data) existingCp = data;
      }
      if (!existingCp && localDb.creator_profiles) {
        existingCp = localDb.creator_profiles.find((c: any) => String(c.user_id) === String(targetId));
      }

      // 3. Check if item exists as a registered brand profile
      let existingBp: any = null;
      if (activeClient) {
        const { data } = await activeClient.from('brand_profiles').select('*').eq('user_id', targetId).maybeSingle();
        if (data) existingBp = data;
      }
      if (!existingBp && localDb.brand_profiles) {
        existingBp = localDb.brand_profiles.find((b: any) => String(b.user_id) === String(targetId));
      }

      const defaultPhoto = "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80";

      // BRANCH 1: Brand Profile Approval
      if (existingBp || waitlistEntry?.role === 'brand') {
        const brandUserId = existingBp?.user_id || waitlistEntry?.linked_user_id || waitlistEntry?.user_id || targetId;
        if (activeClient) {
          await activeClient.from('brand_profiles').update({ profile_status: 'approved', reviewed_at: getIsoNow() }).eq('user_id', brandUserId);
          await activeClient.from('waitlist').update({ status: 'Approved' }).eq('id', targetId);
        }
        const bpIdx = localDb.brand_profiles.findIndex((b: any) => String(b.user_id) === String(brandUserId));
        if (bpIdx >= 0) localDb.brand_profiles[bpIdx].profile_status = 'approved';
        const wIdx = localDb.waitlist.findIndex((w: any) => String(w.id) === String(targetId));
        if (wIdx >= 0) localDb.waitlist[wIdx].status = 'Approved';
        saveDb(localDb);

        await sendNotification(null, brandUserId, 'profile_approved', 'Your brand profile is live. Start posting campaigns.');
        return res.json({ ok: true, message: 'Brand approved successfully' });
      }

      // BRANCH 2: Registered Creator Profile Approval (Already has regular auth user)
      if (existingCp && (existingCp.is_claimed !== false && existingCp.creator_type !== 'unclaimed') && waitlistEntry?.is_registered_user !== false) {
        if (activeClient) {
          await activeClient.from('creator_profiles').update({ profile_status: 'approved', reviewed_at: getIsoNow() }).eq('user_id', targetId);
          await activeClient.from('waitlist').update({ status: 'Approved' }).eq('id', targetId);
        }
        const cpIdx = localDb.creator_profiles.findIndex((c: any) => String(c.user_id) === String(targetId));
        if (cpIdx >= 0) localDb.creator_profiles[cpIdx].profile_status = 'approved';
        const wIdx = localDb.waitlist.findIndex((w: any) => String(w.id) === String(targetId));
        if (wIdx >= 0) localDb.waitlist[wIdx].status = 'Approved';
        saveDb(localDb);

        await sendNotification(null, targetId, 'profile_approved', 'Your profile is approved and live on Explore Creators.');
        return res.json({ ok: true, message: 'Creator approved successfully' });
      }

      // BRANCH 3: Unregistered Creator Application (Public Apply -> Approved -> Transitions to Unclaimed Creators Directory)
      const cleanEmail = String(waitlistEntry?.email || existingCp?.email || '').toLowerCase().trim();
      const cleanName = String(waitlistEntry?.name || existingCp?.name || 'Creator').trim();
      const cleanMobile = String(waitlistEntry?.phone || waitlistEntry?.mobile || existingCp?.phone || '').trim();
      const cleanHandle = String(waitlistEntry?.social_handle || waitlistEntry?.handle || existingCp?.instagram_handle || existingCp?.handle || ('@' + cleanName.toLowerCase().replace(/\s+/g, ''))).trim();
      const resolvedPhoto = waitlistEntry?.profile_photo_url || waitlistEntry?.photo || existingCp?.photo || existingCp?.picture || defaultPhoto;
      const parsedCharges = Number(String(waitlistEntry?.charges || existingCp?.rate_reel || '').replace(/[^0-9]/g, '')) || 2500;
      const followersCount = Number(waitlistEntry?.followers || waitlistEntry?.follower_count || existingCp?.follower_count || 0);
      const nicheVal = waitlistEntry?.niche || waitlistEntry?.category || existingCp?.primary_niche || 'Fashion & Lifestyle';
      const cityVal = waitlistEntry?.city || existingCp?.city || '';
      const genderVal = waitlistEntry?.gender || existingCp?.gender || '';

      const shadowUserId = waitlistEntry?.linked_user_id || existingCp?.user_id || ("CRTR_UNCLAIMED_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7));

      const shadowUser = {
        user_id: shadowUserId,
        email: cleanEmail || "unclaimed_" + shadowUserId + "@ybex.io",
        name: cleanName,
        phone: cleanMobile,
        picture: resolvedPhoto,
        role: 'creator',
        auth_method: 'unclaimed',
        is_claimed: false,
        is_unclaimed: true,
        created_at: getIsoNow()
      };

      const shadowProfile = {
        user_id: shadowUserId,
        name: cleanName,
        email: cleanEmail,
        photo: resolvedPhoto,
        picture: resolvedPhoto,
        avatar_url: resolvedPhoto,
        city: cityVal,
        gender: genderVal,
        instagram: waitlistEntry?.instagram_link || (cleanHandle ? "https://instagram.com/" + cleanHandle.replace(/^@/, '') : ""),
        instagram_handle: cleanHandle,
        handle: cleanHandle,
        followers_instagram: followersCount,
        follower_count: followersCount,
        followers: followersCount,
        primary_niche: nicheVal,
        category: nicheVal,
        rate_reel: parsedCharges,
        rate_story: Math.round(parsedCharges * 0.4),
        rate_yt_video: parsedCharges * 2,
        rate_card: {
          reels: parsedCharges,
          reel: parsedCharges,
          stories: Math.round(parsedCharges * 0.4),
          story: Math.round(parsedCharges * 0.4),
          yt_video: parsedCharges * 2,
          ugc: parsedCharges
        },
        charges: waitlistEntry?.charges || ("₹" + parsedCharges),
        ugc_rating: Number(waitlistEntry?.ugc_rating || 7),
        avg_views_30d: 10000,
        collab_types: Array.isArray(waitlistEntry?.collab_types) ? waitlistEntry.collab_types : [],
        sample_links: Array.isArray(waitlistEntry?.sample_links) ? waitlistEntry.sample_links : [],
        portfolio: Array.isArray(waitlistEntry?.sample_links) ? waitlistEntry.sample_links : [],
        bio: waitlistEntry?.notes || "Creator on Ybex Media",
        profile_status: 'approved',
        creator_type: 'influencer',
        work_mode: 'active',
        is_claimed: false,
        is_unclaimed: true,
        reviewed_at: getIsoNow(),
        created_at: getIsoNow()
      };

      if (activeClient) {
        try {
          await activeClient.from('users').upsert([shadowUser], { onConflict: 'user_id' });
          await activeClient.from('creator_profiles').upsert([shadowProfile], { onConflict: 'user_id' });
          await activeClient.from('waitlist').update({ status: 'Approved', linked_user_id: shadowUserId }).eq('id', targetId);
        } catch (dbErr: any) {
          console.warn('[Approve] Supabase sync warning:', dbErr.message);
        }
      }

      // Sync localDb (unique shadow profile per approved application)
      const uIdx = localDb.users.findIndex((u: any) => String(u.user_id) === String(shadowUserId));
      if (uIdx >= 0) localDb.users[uIdx] = { ...localDb.users[uIdx], ...shadowUser };
      else localDb.users.unshift(shadowUser);

      const cpIdx = localDb.creator_profiles.findIndex((c: any) => String(c.user_id) === String(shadowUserId));
      if (cpIdx >= 0) localDb.creator_profiles[cpIdx] = { ...localDb.creator_profiles[cpIdx], ...shadowProfile };
      else localDb.creator_profiles.unshift(shadowProfile);

      const wIdx = localDb.waitlist.findIndex((w: any) => String(w.id) === String(targetId));
      if (wIdx >= 0) {
        localDb.waitlist[wIdx].status = 'Approved';
        localDb.waitlist[wIdx].linked_user_id = shadowUserId;
      }
      saveDb(localDb);

      return res.json({ ok: true, status: 'Approved', message: 'Approved and added to Unclaimed Creators' });
    } catch (err: any) {
      console.error('Waitlist approve error:', err);
      return res.status(500).json({ error: 'Approval failed: ' + err.message });
    }
  });

  router.post("/admin/waitlist/:id/reject", async (req, res) => {
    const user = await parseAuthUser(req);
    if (!user || (user.role !== 'admin' && user.role !== 'sub_admin' && user.team_role !== 'sub_admin')) {
      return res.status(403).json({ detail: "Admin only", _status: 403 });
    }

    const targetId = req.params.id;
    const reason = req.body.reason || "Did not meet platform criteria";
    const activeClient = privilegedSupabase || supabase;

    try {
      if (activeClient) {
        await activeClient.from("creator_profiles").update({ profile_status: "rejected", reject_reason: reason, reviewed_at: getIsoNow() }).eq("user_id", targetId);
        await activeClient.from("brand_profiles").update({ profile_status: "rejected", reject_reason: reason, reviewed_at: getIsoNow() }).eq("user_id", targetId);
        await activeClient.from("waitlist").update({ status: "Rejected", reject_reason: reason }).eq("id", targetId);
      }

      const localDb = getDb();
      if (localDb.waitlist) {
        const wIdx = localDb.waitlist.findIndex((w: any) => String(w.id) === String(targetId) || String(w.user_id) === String(targetId) || String(w.linked_user_id) === String(targetId));
        if (wIdx >= 0) {
          localDb.waitlist[wIdx].status = "Rejected";
          localDb.waitlist[wIdx].rejectReason = reason;
          localDb.waitlist[wIdx].reject_reason = reason;
        }
      }
      if (localDb.creator_profiles) {
        const cpIdx = localDb.creator_profiles.findIndex((c: any) => String(c.user_id) === String(targetId));
        if (cpIdx >= 0) {
          localDb.creator_profiles[cpIdx].profile_status = "rejected";
          localDb.creator_profiles[cpIdx].reject_reason = reason;
        }
      }
      saveDb(localDb);

      return res.json({ ok: true, message: "Profile rejected." });
    } catch (err: any) {
      console.error("Waitlist reject error:", err);
      return res.status(500).json({ error: "Rejection failed: " + err.message });
    }
  });

  router.post("/admin/waitlist/batch-approve", async (req, res) => {
    const user = await parseAuthUser(req);
    if (!user || (user.role !== 'admin' && user.role !== 'sub_admin' && user.team_role !== 'sub_admin')) {
      return res.status(403).json({ detail: "Admin only", _status: 403 });
    }

    const ids: string[] = req.body.ids || [];
    const activeClient = privilegedSupabase || supabase;

    try {
      const localDb = getDb();
      if (!localDb.users) localDb.users = [];
      if (!localDb.creator_profiles) localDb.creator_profiles = [];
      if (!localDb.waitlist) localDb.waitlist = [];

      for (const targetId of ids) {
        let waitlistEntry = (localDb.waitlist || []).find((w: any) => String(w.id) === String(targetId) || String(w.linked_user_id) === String(targetId) || String(w.user_id) === String(targetId));
        if (!waitlistEntry && activeClient) {
          const { data } = await activeClient.from('waitlist').select('*').eq('id', targetId).maybeSingle();
          if (data) waitlistEntry = data;
        }

        const shadowUserId = waitlistEntry?.linked_user_id || ("CRTR_UNCLAIMED_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7));
        const cleanEmail = String(waitlistEntry?.email || '').toLowerCase().trim();
        const cleanName = String(waitlistEntry?.name || 'Creator').trim();
        const cleanMobile = String(waitlistEntry?.phone || waitlistEntry?.mobile || '').trim();
        const cleanHandle = String(waitlistEntry?.social_handle || waitlistEntry?.handle || ('@' + cleanName.toLowerCase().replace(/\s+/g, ''))).trim();
        const defaultPhoto = "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80";
        const resolvedPhoto = waitlistEntry?.profile_photo_url || waitlistEntry?.photo || defaultPhoto;
        const parsedCharges = Number(String(waitlistEntry?.charges || '').replace(/[^0-9]/g, '')) || 2500;
        const followersCount = Number(waitlistEntry?.followers || 0);

        const shadowUser = {
          user_id: shadowUserId,
          email: cleanEmail || ("unclaimed_" + shadowUserId + "@ybex.io"),
          name: cleanName,
          phone: cleanMobile,
          picture: resolvedPhoto,
          role: 'creator',
          auth_method: 'unclaimed',
          is_claimed: false,
          is_unclaimed: true,
          created_at: getIsoNow()
        };

        const shadowProfile = {
          user_id: shadowUserId,
          name: cleanName,
          email: cleanEmail,
          photo: resolvedPhoto,
          picture: resolvedPhoto,
          avatar_url: resolvedPhoto,
          city: waitlistEntry?.city || '',
          gender: waitlistEntry?.gender || '',
          instagram: waitlistEntry?.instagram_link || (cleanHandle ? "https://instagram.com/" + cleanHandle.replace(/^@/, '') : ""),
          instagram_handle: cleanHandle,
          handle: cleanHandle,
          followers_instagram: followersCount,
          follower_count: followersCount,
          followers: followersCount,
          primary_niche: waitlistEntry?.niche || 'Fashion & Lifestyle',
          category: waitlistEntry?.niche || 'Fashion & Lifestyle',
          rate_reel: parsedCharges,
          rate_story: Math.round(parsedCharges * 0.4),
          rate_yt_video: parsedCharges * 2,
          rate_card: {
            reels: parsedCharges,
            reel: parsedCharges,
            stories: Math.round(parsedCharges * 0.4),
            story: Math.round(parsedCharges * 0.4),
            yt_video: parsedCharges * 2,
            ugc: parsedCharges
          },
          charges: waitlistEntry?.charges || ("₹" + parsedCharges),
          profile_status: 'approved',
          creator_type: 'influencer',
          work_mode: 'active',
          is_claimed: false,
          is_unclaimed: true,
          reviewed_at: getIsoNow(),
          created_at: getIsoNow()
        };

        if (activeClient) {
          try {
            await activeClient.from('users').upsert([shadowUser], { onConflict: 'user_id' });
            await activeClient.from('creator_profiles').upsert([shadowProfile], { onConflict: 'user_id' });
            await activeClient.from('waitlist').update({ status: 'Approved', linked_user_id: shadowUserId }).eq('id', targetId);
          } catch (e) {}
        }

        const uIdx = localDb.users.findIndex((u: any) => String(u.user_id) === String(shadowUserId));
        if (uIdx >= 0) localDb.users[uIdx] = { ...localDb.users[uIdx], ...shadowUser };
        else localDb.users.unshift(shadowUser);

        const cpIdx = localDb.creator_profiles.findIndex((c: any) => String(c.user_id) === String(shadowUserId));
        if (cpIdx >= 0) localDb.creator_profiles[cpIdx] = { ...localDb.creator_profiles[cpIdx], ...shadowProfile };
        else localDb.creator_profiles.unshift(shadowProfile);

        const wIdx = localDb.waitlist.findIndex((w: any) => String(w.id) === String(targetId));
        if (wIdx >= 0) {
          localDb.waitlist[wIdx].status = 'Approved';
          localDb.waitlist[wIdx].linked_user_id = shadowUserId;
        }
      }

      saveDb(localDb);
      return res.json({ ok: true, count: ids.length });
    } catch (err: any) {
      console.error("Batch approve error:", err);
      return res.status(500).json({ error: "Batch approval failed: " + err.message });
    }
  });

  router.post("/admin/waitlist/:id/message", async (req, res) => {
    const user = await parseAuthUser(req);
    if (!user || (user.role !== 'admin' && user.role !== 'sub_admin' && user.team_role !== 'sub_admin')) {
      return res.status(403).json({ detail: "Admin only", _status: 403 });
    }
    if (!supabase) {
      return res.status(500).json({ error: "Supabase client not initialized" });
    }
    const targetId = req.params.id;
    const messageText = req.body.message || "";

    try {
      await (privilegedSupabase || supabase).from("creator_profiles").update({ panel_message: messageText }).eq("user_id", targetId);
      await (privilegedSupabase || supabase).from("brand_profiles").update({ panel_message: messageText }).eq("user_id", targetId);
      await (privilegedSupabase || supabase).from("waitlist").update({ panel_message: messageText }).eq("id", targetId);

      const localDb = getDb();
      if (localDb.waitlist) {
        const wIdx = localDb.waitlist.findIndex((w: any) => String(w.id) === String(targetId));
        if (wIdx >= 0) {
          localDb.waitlist[wIdx].panel_message = messageText;
          saveDb(localDb);
        }
      }

      await sendNotification(
        null,
        targetId,
        "admin_message",
        `Update from Ybex Admin: ${messageText}`
      );

      return res.json({ ok: true });
    } catch (err: any) {
      console.error("Waitlist message error:", err);
      return res.status(500).json({ error: "Failed to send message: " + err.message });
    }
  });
}
