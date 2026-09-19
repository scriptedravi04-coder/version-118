import express from "express";

const getIsoNow = () => new Date().toISOString();

// Admin KYC/verification review queue (creator + brand KYC submissions merged
// into one unified list with signed document URLs), approve/reject/escalate
// actions, user-reported content moderation ("reports"), and the account
// unrestrict action (undoes ban/suspend/violation flags in one shot).
export function setupAdminKycVerificationRoutes(
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
    getSignedUgcUrl,
  }: {
    supabase: any;
    privilegedSupabase: any;
    getDb: () => any;
    saveDb: (db: any) => void;
    parseAuthUser: (req: express.Request) => Promise<any>;
    logAdminAction: (user: any, action: any, targetType: any, targetId: any, detail: any) => Promise<any>;
    sendNotification: (db: any, userId: any, type: any, message: any) => Promise<any>;
    getSignedUgcUrl: (supabaseClient: any, originalUrl: any, defaultBucket?: string) => Promise<any>;
  }
) {
  // Verification reviews & submissions helper
  async function fetchAdminKycSubmissions(options: { status?: string; kind?: string } = {}) {
    const db = getDb();
    let submissions: any[] = [];

    if (supabase) {
      try {
        const { data: cData, error: cErr } = await (privilegedSupabase || supabase)
          .from('creator_kyc')
          .select('*')
          .order('updated_at', { ascending: false });
        const { data: bData, error: bErr } = await (privilegedSupabase || supabase)
          .from('brand_kyc')
          .select('*')
          .order('updated_at', { ascending: false });

        if (cErr) console.warn("[KYC Submissions] creator_kyc warning:", cErr.message);
        if (bErr) console.warn("[KYC Submissions] brand_kyc warning:", bErr.message);

        const creatorIds = (cData || []).map((c: any) => c.creator_id).filter(Boolean);
        const brandIds = (bData || []).map((b: any) => b.brand_id).filter(Boolean);
        const allUserIds = [...new Set([...creatorIds, ...brandIds])];

        const userMap: Record<string, any> = {};
        const creatorProfileMap: Record<string, any> = {};
        const brandProfileMap: Record<string, any> = {};

        if (allUserIds.length > 0) {
          try {
            const { data: uData } = await (privilegedSupabase || supabase)
              .from('users')
              .select('user_id, name, email, picture, phone, role, verified, is_deleted, created_at')
              .in('user_id', allUserIds);
            if (uData) {
              uData.forEach((u: any) => { userMap[u.user_id] = u; });
            }
          } catch (uErr: any) {
            console.warn("[KYC Submissions] users mapping notice:", uErr.message);
          }

          try {
            const { data: cpData } = await (privilegedSupabase || supabase)
              .from('creator_profiles')
              .select('*')
              .in('user_id', allUserIds);
            if (cpData) {
              cpData.forEach((cp: any) => { creatorProfileMap[cp.user_id] = cp; });
            }
          } catch (cpErr: any) {
            console.warn("[KYC Submissions] creator_profiles notice:", cpErr.message);
          }

          try {
            const { data: bpData } = await (privilegedSupabase || supabase)
              .from('brand_profiles')
              .select('*')
              .in('user_id', allUserIds);
            if (bpData) {
              bpData.forEach((bp: any) => { brandProfileMap[bp.user_id] = bp; });
            }
          } catch (bpErr: any) {
            console.warn("[KYC Submissions] brand_profiles notice:", bpErr.message);
          }
        }

        const creators = await Promise.all((cData || []).map(async (c: any) => {
          const panUrl = c.pan_card_url || c.pan_doc_url || c.pan_url || c.pan_image || "";
          const frontUrl = c.aadhaar_front_url || c.aadhaar_front || "";
          const backUrl = c.aadhaar_back_url || c.aadhaar_back || "";
          const upiQr = c.upi_qr_code_url || "";

          const pan = await getSignedUgcUrl(supabase, panUrl, 'kyc-documents');
          const front = await getSignedUgcUrl(supabase, frontUrl, 'kyc-documents');
          const back = await getSignedUgcUrl(supabase, backUrl, 'kyc-documents');
          const upiQrSigned = await getSignedUgcUrl(supabase, upiQr, 'kyc-documents');

          const u = userMap[c.creator_id] || (db.users || []).find((usr: any) => usr.user_id === c.creator_id) || null;
          const cp = creatorProfileMap[c.creator_id] || (db.creator_profiles || []).find((p: any) => p.user_id === c.creator_id) || null;

          const resolvedDob = c.dob || c.date_of_birth || cp?.dob || cp?.date_of_birth || cp?.rate_card?.dob || cp?.rate_card?.date_of_birth || u?.dob || u?.date_of_birth || "";
          const resolvedPhone = c.phone || cp?.phone || (u as any)?.phone || "";
          const resolvedNiche = c.niche || cp?.primary_niche || cp?.category || "Fashion & Lifestyle";
          const resolvedHandle = c.instagram_handle || cp?.instagram_handle || cp?.handle || (u?.name ? `@${u.name.toLowerCase().replace(/\s+/g, '')}` : "");
          const resolvedFollowers = c.follower_count || cp?.followers_instagram || cp?.follower_count || 0;
          const resolvedCity = c.city || cp?.city || "";
          const resolvedState = c.address || cp?.state || "";
          const resolvedExperience = cp?.experience || cp?.experience_years || cp?.rate_card?.experience || "2+ Years";

          const reelRate = Number(cp?.rate_reel || cp?.rate_card?.reels || cp?.rate_card?.reel || 0);
          const storyRate = Number(cp?.rate_story || cp?.rate_card?.stories || cp?.rate_card?.story || 0);
          const ytRate = Number(cp?.rate_yt_video || cp?.rate_card?.yt_video || 0);
          const chargesDisplay = cp?.charges || (reelRate > 0 ? `₹${reelRate.toLocaleString()}` : "");

          const panNum = c.pan_number || "";
          const aadhaarNum = c.aadhaar_number || "";
          const gstinNum = c.gstin || "";
          const bankAcc = c.bank_account_no || c.bank_account || "";
          const bankIfsc = c.bank_ifsc || "";
          const bankHolder = c.bank_holder_name || c.full_name || u?.name || "";
          const upiId = c.upi_id || "";

          const uploadedFiles = [pan || panUrl, front || frontUrl, back || backUrl, upiQrSigned || upiQr].filter(Boolean);

          const docsObj = {
            creator_name: c.full_name || u?.name,
            creator_pan: panNum,
            pan_number: panNum,
            identity_num: panNum,
            pan_photo_url: pan || panUrl,
            pan_card_url: pan || panUrl,
            aadhaar_number: aadhaarNum,
            creator_aadhaar: aadhaarNum,
            aadhaar_front_url: front || frontUrl,
            aadhaar_back_url: back || backUrl,
            gstin: gstinNum,
            gst_cert: gstinNum,
            address: resolvedState || resolvedCity || c.address || "",
            payout_method: bankAcc ? "bank" : (upiId ? "upi" : "bank"),
            bank_name: c.bank_name || (bankIfsc ? "Bank Account" : ""),
            bank_account: bankAcc,
            bank_account_no: bankAcc,
            bank_account_number: bankAcc,
            bank_ifsc: bankIfsc,
            bank_holder_name: bankHolder,
            upi_id: upiId,
            upi_qr_code_url: upiQrSigned || upiQr,
            uploaded_files: uploadedFiles,
            submitted_at: c.submitted_at || c.updated_at || c.created_at || getIsoNow()
          };

          return {
            ...c,
            id: c.creator_id,
            verification_id: c.id || c.creator_id,
            user_id: c.creator_id,
            name: c.full_name || u?.name || "Creator",
            full_name: c.full_name || u?.name,
            email: u?.email || "",
            photo: u?.picture || cp?.photo || "",
            kind: 'creator',
            type: 'creator',
            category: resolvedNiche,
            handle: resolvedHandle,
            followers: resolvedFollowers,
            status: (c.status || "PENDING").toUpperCase(),
            dob: resolvedDob,
            date_of_birth: resolvedDob,
            creator_dob: resolvedDob,
            phone: resolvedPhone,
            mobile: resolvedPhone,
            creator_phone: resolvedPhone,
            niche: resolvedNiche,
            primary_niche: resolvedNiche,
            instagram_handle: resolvedHandle,
            social_handle: resolvedHandle,
            follower_count: resolvedFollowers,
            city: resolvedCity,
            state: resolvedState,
            address: resolvedState || resolvedCity,
            bio: cp?.bio || "",
            languages: cp?.languages || [],
            gender: cp?.gender || "",
            rate_card: cp?.rate_card || { reels: reelRate, stories: storyRate, yt_video: ytRate },
            rate_reel: reelRate,
            rate_story: storyRate,
            rate_yt_video: ytRate,
            charges: chargesDisplay,
            experience: resolvedExperience,
            ugc_experience: resolvedExperience,
            experience_years: resolvedExperience,
            avg_reach: cp?.avg_views_30d || cp?.average_reach || 0,
            engagement_rate: cp?.engagement_rate || 0,
            barter_mode: cp?.barter_mode || cp?.barter || "Cash Only",
            pan_number: panNum,
            aadhaar_number: aadhaarNum,
            gstin: gstinNum,
            gst_number: gstinNum,
            bank_account_no: bankAcc,
            bank_account: bankAcc,
            bank_account_number: bankAcc,
            bank_ifsc: bankIfsc,
            bank_holder_name: bankHolder,
            upi_id: upiId,
            pan_card_url: pan || panUrl,
            pan_doc_url: pan || panUrl,
            aadhaar_front_url: front || frontUrl,
            aadhaar_back_url: back || backUrl,
            upi_qr_code_url: upiQrSigned || upiQr,
            doc_url: pan || panUrl || front || frontUrl,
            documents: docsObj,
            user: u,
            profile: cp,
            created_at: c.submitted_at || c.updated_at || c.created_at || getIsoNow(),
            data: { ...c, dob: resolvedDob, phone: resolvedPhone, niche: resolvedNiche, pan_doc_url: pan, pan_card_url: pan || panUrl, aadhaar_front_url: front || frontUrl, aadhaar_back_url: back || backUrl }
          };
        }));

        const brands = await Promise.all((bData || []).map(async (b: any) => {
          const rawGstUrl = b.gst_certificate_url || b.gst_doc_url || "";
          const rawIncUrl = b.incorporation_doc_url || b.business_proof_document_url || "";
          const rawPanCardUrl = b.pan_card_url || "";

          // Prevent duplicated URLs from being treated as distinct documents
          const incUrl = rawIncUrl;
          const gstUrl = (rawGstUrl && rawGstUrl !== incUrl) ? rawGstUrl : "";
          const panCardUrl = (rawPanCardUrl && rawPanCardUrl !== incUrl && rawPanCardUrl !== gstUrl) ? rawPanCardUrl : "";

          const gst = gstUrl ? await getSignedUgcUrl(supabase, gstUrl, 'kyc-documents') : "";
          const inc = incUrl ? await getSignedUgcUrl(supabase, incUrl, 'kyc-documents') : "";
          const panCard = panCardUrl ? await getSignedUgcUrl(supabase, panCardUrl, 'kyc-documents') : "";

          const u = userMap[b.brand_id] || (db.users || []).find((usr: any) => usr.user_id === b.brand_id) || null;
          const bp = brandProfileMap[b.brand_id] || (db.brand_profiles || []).find((p: any) => p.user_id === b.brand_id) || null;

          const companyName = b.company_name || bp?.company_name || u?.name || "Brand";
          const website = b.website_url || bp?.website || bp?.website_url || "";
          const pocName = b.authorized_person_name || bp?.representative_name || u?.name || "";
          const pocDesig = b.authorized_person_designation || bp?.representative_designation || "Manager";
          const pocEmail = b.work_email || bp?.email || u?.email || "";
          const pocPhone = b.phone || bp?.representative_mobile || bp?.phone || (u as any)?.phone || "";
          const gstNum = b.gst_number || "";
          const panNum = b.pan_number || "";
          const incType = b.incorporation_type || "Private Limited";

          const uploadedFiles = [gst || gstUrl, inc || incUrl, panCard || panCardUrl].filter(Boolean);

          const docsObj = {
            company_name: companyName,
            gst_cert: gstNum,
            gstin: gstNum,
            brand_pan: panNum,
            pan_number: panNum,
            incorporation_type: incType,
            business_proof_document_url: inc || incUrl || null,
            incorporation_proof: inc || incUrl || null,
            incorporation_doc_url: inc || incUrl || null,
            gst_cert_url: gst || gstUrl || null,
            gst_certificate_url: gst || gstUrl || null,
            pan_card_url: panCard || panCardUrl || null,
            brand_pan_url: panCard || panCardUrl || null,
            poc_name: pocName,
            poc_designation: pocDesig,
            poc_email: pocEmail,
            poc_phone: pocPhone,
            website: website,
            website_url: website,
            uploaded_files: uploadedFiles,
            submitted_at: b.submitted_at || b.updated_at || b.created_at || getIsoNow()
          };

          return {
            ...b,
            id: b.brand_id,
            verification_id: b.id || b.brand_id,
            user_id: b.brand_id,
            name: companyName,
            company_name: companyName,
            email: pocEmail || u?.email,
            photo: u?.picture || bp?.photo || bp?.logo || "",
            kind: 'brand',
            type: 'brand',
            category: 'Brand',
            handle: website,
            website: website,
            website_url: website,
            poc_name: pocName,
            poc_designation: pocDesig,
            poc_email: pocEmail,
            poc_phone: pocPhone,
            phone: pocPhone,
            status: (b.status || "PENDING").toUpperCase(),
            gst_number: gstNum,
            gstin: gstNum,
            pan_number: panNum,
            incorporation_type: incType,
            gst_certificate_url: gst || gstUrl,
            incorporation_doc_url: inc || incUrl,
            pan_card_url: panCard || panCardUrl,
            doc_url: gst || gstUrl || inc || incUrl,
            documents: docsObj,
            user: u,
            profile: bp,
            created_at: b.submitted_at || b.updated_at || b.created_at || getIsoNow(),
            data: { ...b, gst_certificate_url: gst || gstUrl, incorporation_doc_url: inc || incUrl }
          };
        }));

        const activeCreators = creators.filter((c: any) => !c.user || !c.user.is_deleted);
        const activeBrands = brands.filter((b: any) => !b.user || !b.user.is_deleted);
        submissions = [...activeCreators, ...activeBrands];
      } catch (err: any) {
        console.warn("[KYC Submissions] error:", err.message);
      }
    }

    // Merge any additional local/mock verifications if not already present in submissions
    const existingIds = new Set(submissions.map((s: any) => s.user_id || s.id));
    const rawLocal = [...((db as any).creator_kyc || []), ...((db as any).brand_kyc || []), ...(db.verifications || [])];
    const missingLocal = rawLocal.filter((item: any) => {
      const uid = item.user_id || item.creator_id || item.brand_id || item.id;
      return uid && !existingIds.has(uid);
    });

    if (missingLocal.length > 0) {
      const localMapped = missingLocal.map((item: any) => {
        const isBrand = item.kind === 'brand' || item.type?.toLowerCase() === 'brand';
        const uid = item.user_id || item.creator_id || item.brand_id || item.id;
        const u = (db.users || []).find((usr: any) => usr.user_id === uid);
        const cp = (db.creator_profiles || []).find((p: any) => p.user_id === uid);
        const docs = item.documents || {};
        const resolvedDob = item.dob || item.date_of_birth || cp?.dob || cp?.date_of_birth || cp?.rate_card?.dob || cp?.rate_card?.date_of_birth || u?.dob || u?.date_of_birth || "";
        const resolvedExp = cp?.experience || cp?.rate_card?.experience || "2+ Years";
        const rReel = Number(cp?.rate_reel || cp?.rate_card?.reels || cp?.rate_card?.reel || 0);
        const rStory = Number(cp?.rate_story || cp?.rate_card?.stories || cp?.rate_card?.story || 0);
        const rYt = Number(cp?.rate_yt_video || cp?.rate_card?.yt_video || 0);
        return {
          ...item,
          id: item.creator_id || item.brand_id || item.user_id || item.id,
          verification_id: item.verification_id || item.id || item.creator_id || item.brand_id,
          user_id: uid,
          name: item.full_name || item.name || docs.company_name || u?.name || (isBrand ? "Brand" : "Creator"),
          company_name: item.company_name || docs.company_name || item.name || u?.name,
          email: item.email || item.work_email || docs.poc_email || u?.email,
          kind: isBrand ? "brand" : "creator",
          type: isBrand ? "brand" : "creator",
          status: (item.status || "PENDING").toUpperCase(),
          dob: resolvedDob,
          date_of_birth: resolvedDob,
          creator_dob: resolvedDob,
          experience: resolvedExp,
          ugc_experience: resolvedExp,
          rate_reel: rReel,
          rate_story: rStory,
          rate_yt_video: rYt,
          rate_card: cp?.rate_card || { reels: rReel, stories: rStory, yt_video: rYt },
          charges: cp?.charges || (rReel > 0 ? `₹${rReel.toLocaleString()}` : ""),
          gst_number: item.gst_number || item.gstin || docs.gstin || docs.gst_cert || "",
          gstin: item.gst_number || item.gstin || docs.gstin || docs.gst_cert || "",
          pan_number: item.pan_number || docs.brand_pan || docs.creator_pan || "",
          documents: docs,
          user: u,
          created_at: item.submitted_at || item.created_at || getIsoNow()
        };
      });
      submissions = [...submissions, ...localMapped];
    }

    if (options.kind) {
      const k = String(options.kind).toLowerCase();
      submissions = submissions.filter((s: any) => String(s.kind || s.type).toLowerCase() === k);
    }

    if (options.status) {
      const st = String(options.status).toUpperCase();
      submissions = submissions.filter((s: any) => String(s.status).toUpperCase() === st);
    }

    submissions.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    return submissions;
  }

  // Verification reviews
  router.get("/admin/kyc", async (req, res) => {
    const user = await parseAuthUser(req);
    if (!user || user.role !== "admin") return res.status(403).json({ detail: "Admin only", _status: 403 });

    try {
      const submissions = await fetchAdminKycSubmissions();
      return res.json(submissions);
    } catch (err: any) {
      console.error("[Admin KYC Fetch Error]:", err);
      return res.status(500).json({ error: "Failed to fetch KYC records", detail: err.message });
    }
  });

  router.get("/admin/verifications", async (req, res) => {
    const user = await parseAuthUser(req);
    if (!user || (user.role !== 'admin' && user.role !== 'sub_admin' && user.team_role !== 'sub_admin')) {
      return res.status(403).json({ detail: "Admin only", _status: 403 });
    }
    const { status, kind } = req.query;

    try {
      const submissions = await fetchAdminKycSubmissions({
        status: status ? String(status) : undefined,
        kind: kind ? String(kind) : undefined
      });
      return res.json(submissions);
    } catch (err: any) {
      console.error("[Admin Verifications Fetch Error]:", err);
      return res.status(500).json({ error: "Failed to fetch verification records", detail: err.message });
    }
  });

  router.post("/admin/verifications/:verification_id/approve", async (req, res) => {
    const admin = await parseAuthUser(req);
    if (!admin || admin.role !== "admin") {
      return res.status(403).json({ detail: "Admin only", _status: 403 });
    }
    if (!supabase) {
      return res.status(500).json({ error: "Supabase client not initialized" });
    }

    const verificationId = req.params.verification_id;
    const { note } = req.body;
    const reviewedAt = getIsoNow();

    let v: any = null;
    const { data: vRow } = await supabase
      .from('verifications')
      .select('*')
      .eq('verification_id', verificationId)
      .maybeSingle();
    v = vRow;

    if (!v) {
      const { data: vRowUser } = await supabase
        .from('verifications')
        .select('*')
        .eq('user_id', verificationId)
        .maybeSingle();
      v = vRowUser;
    }

    if (!v) {
      const { data: cKyc } = await supabase
        .from('creator_kyc')
        .select('*')
        .or(`id.eq.${verificationId},creator_id.eq.${verificationId}`)
        .maybeSingle();
      if (cKyc) {
        v = {
          verification_id: cKyc.id || verificationId,
          user_id: cKyc.creator_id,
          kind: 'creator',
          status: cKyc.status
        };
      } else {
        const { data: bKyc } = await supabase
          .from('brand_kyc')
          .select('*')
          .or(`id.eq.${verificationId},brand_id.eq.${verificationId}`)
          .maybeSingle();
        if (bKyc) {
          v = {
            verification_id: bKyc.id || verificationId,
            user_id: bKyc.brand_id,
            kind: 'brand',
            status: bKyc.status
          };
        }
      }
    }

    if (!v) {
      return res.status(404).json({ detail: "Verification request not found" });
    }

    const normalizedKind = v.kind || (v.type?.toLowerCase() === "brand" ? "brand" : "creator");
    const target_user = v.user_id;

    // 1. Update verifications record if present
    try {
      await (privilegedSupabase || supabase).from('verifications').update({
        status: "approved",
        reviewed_by: admin.user_id,
        review_note: note || "",
        reviewed_at: reviewedAt
      }).or(`verification_id.eq.${v.verification_id},user_id.eq.${target_user}`);
    } catch (e: any) {
      console.warn("[Admin Approve] verifications update notice:", e.message);
    }

    if (target_user) {
      // 2. Update user verified status
      try {
        await (privilegedSupabase || supabase).from('users').update({ verified: true }).eq('user_id', target_user);
      } catch (uErr: any) {
        console.warn("[Admin Approve] users update notice:", uErr.message);
      }

      // 3. Update profile and kyc
      if (normalizedKind === "creator") {
        try {
          await (privilegedSupabase || supabase).from('creator_kyc').update({
            status: 'APPROVED',
            admin_reviewed_at: reviewedAt,
            admin_reviewed_by: admin.user_id,
            updated_at: reviewedAt
          }).eq('creator_id', target_user);
          await (privilegedSupabase || supabase).from('creator_profiles').update({ verified: true }).eq('user_id', target_user);
        } catch (cErr: any) {
          console.warn("[Admin Approve] creator_kyc update notice:", cErr.message);
        }
      } else {
        try {
          await (privilegedSupabase || supabase).from('brand_kyc').update({
            status: 'APPROVED',
            admin_reviewed_at: reviewedAt,
            admin_reviewed_by: admin.user_id,
            updated_at: reviewedAt
          }).eq('brand_id', target_user);
          await (privilegedSupabase || supabase).from('brand_profiles').update({ verified: true }).eq('user_id', target_user);
        } catch (bErr: any) {
          console.warn("[Admin Approve] brand_kyc update notice:", bErr.message);
        }
      }

      // Sync local db state if present
      const db = getDb();
      if (db) {
        if (db.brand_kyc) {
          const bk = db.brand_kyc.find((b: any) => b.brand_id === target_user || b.id === v.verification_id || b.id === verificationId);
          if (bk) {
            bk.status = "APPROVED";
            bk.admin_reviewed_at = reviewedAt;
            bk.admin_reviewed_by = admin.user_id;
            bk.updated_at = reviewedAt;
          }
        }
        if (db.creator_kyc) {
          const ck = db.creator_kyc.find((c: any) => c.creator_id === target_user || c.id === v.verification_id || c.id === verificationId);
          if (ck) {
            ck.status = "APPROVED";
            ck.admin_reviewed_at = reviewedAt;
            ck.admin_reviewed_by = admin.user_id;
            ck.updated_at = reviewedAt;
          }
        }
        if (db.verifications) {
          const vr = db.verifications.find((r: any) => r.verification_id === v.verification_id || r.user_id === target_user || r.id === verificationId);
          if (vr) {
            vr.status = "approved";
            vr.review_note = note || "";
            vr.reviewed_at = reviewedAt;
            vr.reviewed_by = admin.user_id;
          }
        }
        if (db.users) {
          const u = db.users.find((usr: any) => usr.user_id === target_user || usr.id === target_user);
          if (u) {
            u.verified = true;
            u.kyc_verified = true;
          }
        }
        saveDb(db);
      }

      // 4. Send notification
      const msg = normalizedKind === "brand"
        ? "Your KYC has been verified! You can now create campaigns."
        : "Your KYC is verified! Start applying to campaigns.";
      await sendNotification(db, target_user, "KYC_APPROVED", msg);
    }

    res.json({ ok: true, success: true, message: "KYC approved successfully" });
  });

  router.post("/admin/verifications/:verification_id/reject", async (req, res) => {
    const admin = await parseAuthUser(req);
    if (!admin || admin.role !== "admin") {
      return res.status(403).json({ detail: "Admin only", _status: 403 });
    }
    if (!supabase) {
      return res.status(500).json({ error: "Supabase client not initialized" });
    }

    const verificationId = req.params.verification_id;
    const rawReason = String(req.body.note || req.body.reason || req.body.rejection_reason || "").trim();
    const reviewedAt = getIsoNow();

    let v: any = null;
    const { data: vRow } = await supabase
      .from('verifications')
      .select('*')
      .eq('verification_id', verificationId)
      .maybeSingle();
    v = vRow;

    if (!v) {
      const { data: vRowUser } = await supabase
        .from('verifications')
        .select('*')
        .eq('user_id', verificationId)
        .maybeSingle();
      v = vRowUser;
    }

    if (!v) {
      const { data: cKyc } = await supabase
        .from('creator_kyc')
        .select('*')
        .or(`id.eq.${verificationId},creator_id.eq.${verificationId}`)
        .maybeSingle();
      if (cKyc) {
        v = {
          verification_id: cKyc.id || verificationId,
          user_id: cKyc.creator_id,
          kind: 'creator',
          status: cKyc.status
        };
      } else {
        const { data: bKyc } = await supabase
          .from('brand_kyc')
          .select('*')
          .or(`id.eq.${verificationId},brand_id.eq.${verificationId}`)
          .maybeSingle();
        if (bKyc) {
          v = {
            verification_id: bKyc.id || verificationId,
            user_id: bKyc.brand_id,
            kind: 'brand',
            status: bKyc.status
          };
        }
      }
    }

    if (!v) {
      return res.status(404).json({ detail: "Verification request not found" });
    }

    const normalizedKind = v.kind || (v.type?.toLowerCase() === "brand" ? "brand" : "creator");
    const target_user = v.user_id;

    // 1. Update verification record
    try {
      await (privilegedSupabase || supabase).from('verifications').update({
        status: "rejected",
        reviewed_by: admin.user_id,
        review_note: rawReason,
        reviewed_at: reviewedAt
      }).or(`verification_id.eq.${v.verification_id},user_id.eq.${target_user}`);
    } catch (e: any) {
      console.warn("[Admin Reject] verifications update notice:", e.message);
    }

    if (target_user) {
      // 2. Set verified to false on users row
      try {
        await (privilegedSupabase || supabase).from('users').update({ verified: false, kyc_verified: false }).eq('user_id', target_user);
      } catch (uErr: any) {
        console.warn("[Admin Reject] users update notice:", uErr.message);
      }

      // 3. Update profiles and kyc
      if (normalizedKind === "creator") {
        try {
          const { error: cErr } = await (privilegedSupabase || supabase).from('creator_kyc').update({
            status: 'REJECTED',
            rejection_reason: rawReason,
            admin_note: rawReason,
            admin_reviewed_at: reviewedAt,
            admin_reviewed_by: admin.user_id,
            updated_at: reviewedAt
          }).eq('creator_id', target_user);
          if (cErr) console.error("[Admin Reject] creator_kyc error:", cErr.message);
          await (privilegedSupabase || supabase).from('creator_profiles').update({ verified: false }).eq('user_id', target_user);
        } catch (cErr: any) {
          console.warn("[Admin Reject] creator_kyc update notice:", cErr.message);
        }
      } else {
        try {
          const { error: bErr } = await (privilegedSupabase || supabase).from('brand_kyc').update({
            status: 'REJECTED',
            rejection_reason: rawReason,
            admin_note: rawReason,
            admin_reviewed_at: reviewedAt,
            admin_reviewed_by: admin.user_id,
            updated_at: reviewedAt
          }).eq('brand_id', target_user);
          if (bErr) console.error("[Admin Reject] brand_kyc error:", bErr.message);
          await (privilegedSupabase || supabase).from('brand_profiles').update({ verified: false }).eq('user_id', target_user);
        } catch (bErr: any) {
          console.warn("[Admin Reject] brand_kyc update notice:", bErr.message);
        }
      }

      // Sync local db state if present
      const db = getDb();
      if (db) {
        if (db.brand_kyc) {
          const bk = db.brand_kyc.find((b: any) => b.brand_id === target_user || b.id === v.verification_id || b.id === verificationId);
          if (bk) {
            bk.status = "REJECTED";
            bk.rejection_reason = rawReason;
            bk.admin_note = rawReason;
            bk.admin_reviewed_at = reviewedAt;
            bk.admin_reviewed_by = admin.user_id;
            bk.updated_at = reviewedAt;
          }
        }
        if (db.creator_kyc) {
          const ck = db.creator_kyc.find((c: any) => c.creator_id === target_user || c.id === v.verification_id || c.id === verificationId);
          if (ck) {
            ck.status = "REJECTED";
            ck.rejection_reason = rawReason;
            ck.admin_note = rawReason;
            ck.admin_reviewed_at = reviewedAt;
            ck.admin_reviewed_by = admin.user_id;
            ck.updated_at = reviewedAt;
          }
        }
        if (db.verifications) {
          const vr = db.verifications.find((r: any) => r.verification_id === v.verification_id || r.user_id === target_user || r.id === verificationId);
          if (vr) {
            vr.status = "rejected";
            vr.review_note = rawReason;
            vr.reviewed_at = reviewedAt;
            vr.reviewed_by = admin.user_id;
          }
        }
        if (db.users) {
          const u = db.users.find((usr: any) => usr.user_id === target_user || usr.id === target_user);
          if (u) {
            u.verified = false;
            u.kyc_verified = false;
          }
        }
        saveDb(db);
      }

      // 4. Send notification with the exact custom reason text
      const isBrand = normalizedKind === "brand";
      const reasonDisplay = rawReason ? `: ${rawReason}` : "";
      const msg = isBrand
        ? `KYC rejected${reasonDisplay}. Please resubmit with correct documents.`
        : `KYC rejected${reasonDisplay}. Please resubmit.`;
      await sendNotification(db, target_user, "KYC_REJECTED", msg);
    }

    res.json({ ok: true, success: true, message: "KYC rejected successfully" });
  });

  router.post("/admin/verifications/:verification_id/escalate", async (req, res) => {
    const admin = await parseAuthUser(req);
    if (!admin || admin.role !== "admin") {
      return res.status(403).json({ detail: "Admin only", _status: 403 });
    }
    if (!supabase) {
      return res.status(500).json({ error: "Supabase client not initialized" });
    }

    const { note } = req.body;
    const { data: v, error: fetchErr } = await supabase
      .from('verifications')
      .select('*')
      .eq('verification_id', req.params.verification_id)
      .maybeSingle();

    if (fetchErr) {
      return res.status(500).json({ error: "Failed to fetch verification request: " + fetchErr.message });
    }
    if (!v) {
      return res.status(404).json({ detail: "Verification request not found" });
    }

    const normalizedKind = v.kind || (v.type?.toLowerCase() === "brand" ? "brand" : "creator");
    const reviewedAt = getIsoNow();

    // 1. Update verification record
    const { error: vErr } = await (privilegedSupabase || supabase).from('verifications').update({
      status: "escalated",
      reviewed_by: admin.user_id,
      review_note: note || "Escalated to Fraud Team",
      reviewed_at: reviewedAt
    }).eq('verification_id', req.params.verification_id);

    if (vErr) {
      return res.status(500).json({ error: "Supabase verification update failed: " + vErr.message });
    }

    const target_user = v.user_id;
    if (target_user) {
      if (normalizedKind === "creator") {
        await (privilegedSupabase || supabase).from('creator_kyc').update({ status: 'ESCALATED', admin_note: note || "" }).eq('creator_id', target_user);
      } else {
        await (privilegedSupabase || supabase).from('brand_kyc').update({ status: 'ESCALATED', admin_note: note || "" }).eq('brand_id', target_user);
      }

      // Send notification
      const db = getDb();
      await sendNotification(db, target_user, "verification", "Your verification request has been escalated for secondary fraud review.");
    }

    res.json({ ok: true });
  });

  // Report and moderations

  router.get("/admin/reports", async (req, res) => {
    const user = await parseAuthUser(req);
    if (!user || (user.role !== 'admin' && user.role !== 'sub_admin' && user.team_role !== 'sub_admin')) {
      return res.status(403).json({ detail: "Admin only", _status: 403 });
    }
    const { status } = req.query;

    if (supabase) {
      try {
        let query = supabase.from('reports').select('*');
        if (status) {
          query = query.eq('status', status);
        }
        const { data, error } = await query.order('created_at', { ascending: false }).limit(100);
        if (!error && data) {
          return res.json(data);
        }
        console.warn("Supabase reports fetch error, falling back:", error);
      } catch (err) {
        console.warn("Supabase reports exception, falling back:", err);
      }
    }

    const db = getDb();
    let list = db.reports || [];
    if (status) list = list.filter((r: any) => r.status === status);

    res.json(list.slice().reverse());
  });

  router.post("/admin/reports/:report_id/resolve", async (req, res) => {
    const admin = await parseAuthUser(req);
    if (!admin || admin.role !== "admin") {
      return res.status(403).json({ detail: "Admin only", _status: 403 });
    }

    if (supabase) {
       try {
         const { error } = await (privilegedSupabase || supabase).from('reports').update({
           status: "resolved"
         }).eq('report_id', req.params.report_id);
         if (error) {
           console.error("Supabase reports resolve error:", error);
         }
         await logAdminAction(admin, 'resolve_report', 'report', req.params.report_id, {});
       } catch (e) {
         console.error("Supabase reports resolve exception:", e);
       }
    }

    const db = getDb();
    const r = (db.reports || []).find((x: any) => x.report_id === req.params.report_id);
    if (r) {
      r.status = "resolved";
      r.resolved_by = admin.user_id;
      r.resolved_at = getIsoNow();
      saveDb(db);
    }
    res.json({ ok: true });
  });

  // Reinstate a user: lifts ban/suspension/restriction flags and clears any
  // recorded violations for that user. (Small, isolated action route kept
  // in this file since it shares the same admin/user-moderation concerns.)
  router.post("/admin/users/:id/unrestrict", async (req, res) => {
    const user = await parseAuthUser(req);
    if (!user || (user.role !== "admin" && user.role !== "sub_admin")) return res.status(403).json({ detail: "Admin only" });

    const targetId = req.params.id;
    const db = getDb();
    const activeClient = privilegedSupabase || supabase;

    // 1. Update local database
    const localUser = db.users?.find((u: any) => u.user_id === targetId || u.id === targetId);
    if (localUser) {
      localUser.banned = false;
      localUser.suspended = false;
      localUser.is_suspended = false;
      localUser.is_restricted = false;
      localUser.is_deleted = false;
    }

    if (db.user_violations) {
      db.user_violations = db.user_violations.filter((v: any) => v.user_id !== targetId);
    }

    if (db.chat_violations) {
      db.chat_violations.forEach((v: any) => {
        if (v.sender_id === targetId) {
          v.status = 'RESOLVED_SAFE';
          v.resolved_by = user.user_id;
          v.resolved_at = new Date().toISOString();
        }
      });
    }
    saveDb(db);

    // 2. Update Supabase if available
    if (activeClient) {
      try {
        await activeClient.from('users').update({
          banned: false,
          suspended: false,
          is_suspended: false,
          is_restricted: false,
          is_deleted: false
        }).eq('user_id', targetId);
        await activeClient.from('user_violations').delete().eq('user_id', targetId);
      } catch (err: any) {
        console.warn("[Admin Reinstate] Supabase error:", err.message);
      }
    }

    await logAdminAction(user, 'reinstate_user', 'user', targetId, {});
    res.json({ ok: true, message: "User account reinstated and all restrictions lifted." });
  });
}
