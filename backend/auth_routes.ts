import express from "express";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import axios from "axios";
import { Resend, getValidFromEmail, buildEmailHtml } from "./helpers";

// Authentication routes: signup, login, session/token sync, email
// verification, Google OAuth, password reset, logout, onboarding, and
// role assignment.
//
// This is sensitive, security-relevant code, so nothing about its actual
// logic was changed during this move — every check, every status code,
// every condition is byte-for-byte the same as it was in server.ts. Only
// the dependencies it needs from server.ts's shared scope are now passed
// in explicitly instead of relied on via closure.
export function setupAuthRoutes(
  app: express.Application,
  router: express.Router,
  {
    supabase,
    privilegedSupabase,
    getDb,
    saveDb,
    parseAuthUser,
    logAdminAuth,
    getPermissionsForUser,
    broadcastAdminNotification,
    checkForgotPasswordRateLimit,
    recordUserPassword,
    sendSuperAdminAlertEmail,
    processBase64Image,
    syncEntityTags,
  }: {
    supabase: any;
    privilegedSupabase: any;
    getDb: () => any;
    saveDb: (db: any) => void;
    parseAuthUser: (req: express.Request) => Promise<any>;
    logAdminAuth: (user_id: any, email: any, eventType: string, ip: any, ua: any) => Promise<any>;
    getPermissionsForUser: (userId: string) => Promise<any>;
    broadcastAdminNotification: (args: any) => Promise<any>;
    checkForgotPasswordRateLimit: (email: string) => boolean;
    recordUserPassword: (userId: string | null | undefined, email: string | null | undefined, password: string | null | undefined) => void;
    sendSuperAdminAlertEmail: (args: any) => Promise<any>;
    processBase64Image: (imgUrl: string, bucket: string, user_id: string) => Promise<any>;
    syncEntityTags: (entityType: string, entityId: string, tags: any[]) => Promise<any>;
  }
) {
  const getIsoNow = () => new Date().toISOString();

  router.post("/auth/sync", async (req, res) => {
    const { user_id, email, name, picture, role, onboarded } = req.body;
    if (!user_id || !email) {
      return res.status(400).json({ detail: "user_id and email are required for sync" });
    }

    const db = getDb();
    let user = db.users.find((u: any) => u.user_id === user_id || u.email.toLowerCase() === email.toLowerCase());

    if (user) {
      user.user_id = user_id; // map to Firebase UID
      user.email = email.toLowerCase();
      if (name) user.name = name;
      if (picture) user.picture = picture;
      if (role) user.role = role;
      if (typeof onboarded === "boolean") user.onboarded = onboarded;
    } else {
      user = {
        user_id,
        email: email.toLowerCase(),
        name: name || email.split("@")[0],
        picture: picture || "",
        role: role || "creator",
        auth_method: "firebase",
        created_at: getIsoNow(),
        onboarded: onboarded || false,
        // Issue #6 Fix: Ensure all required fields are initialized
        verified: false,
        phone: "",
      };
      db.users.push(user);

      // Broadcast new user notification to admins
      broadcastAdminNotification({
        type: 'user_registered',
        message: `New User Registered: ${user.name || user.email} (${user.role || 'creator'})`,
        title: 'New User Registered',
        actor_id: user_id,
        metadata: { userId: user_id, email: user.email, role: user.role }
      }).catch(e => console.warn("Failed to broadcast sync notification:", e));
    }

    saveDb(db);
    res.json({ success: true, user });
  });

  router.post("/auth/signup", async (req, res) => {
    const { name, email, password, role, phone, referral_code } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ detail: "Name, email, and password are required" });
    }

    try {
      const dbClient = privilegedSupabase || supabase;
      const { data: existingUser } = await dbClient
        .from('users')
        .select('user_id, verified')
        .ilike('email', email)
        .maybeSingle();

      if (existingUser) {
        if (existingUser.verified) {
          return res.status(400).json({ detail: "Email already registered" });
        } else {
          // If not verified, try to remove the old unverified attempt to allow a fresh signup
          const { error: delError } = await dbClient.from('users').delete().eq('user_id', existingUser.user_id);
          if (delError) {
             return res.status(400).json({ detail: "Email already registered but unverified. Please login to verify." });
          }
        }
      }

      const user_id = crypto.randomUUID();
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);
      const newUser = {
        user_id,
        email: email.toLowerCase(),
        name,
        password_hash: hashedPassword,
        role: role || null,
        phone: phone || "",
        picture: "",
        auth_method: "email",
        created_at: getIsoNow(),
        onboarded: false,
        verified: false,
        // Issue #6 Fix: Ensure all required fields are initialized
      };

      const { error: insertError } = await (privilegedSupabase || supabase).from('users').insert(newUser);
      if (insertError) {
        console.error("Signup insert error:", insertError);
        return res.status(500).json({ detail: "Failed to create user account"});
      }

      recordUserPassword(user_id, email, password);

      // Check for referral code and record pending referral
      if (referral_code && typeof referral_code === 'string' && referral_code.trim()) {
        try {
          const cleanCode = referral_code.trim();
          const dbClient = privilegedSupabase || supabase;
          const { data: allUsers } = await dbClient.from('users').select('user_id, name, email');
          let referrerId: string | null = null;

          if (allUsers && allUsers.length > 0) {
            const found = allUsers.find((u: any) => {
              if (!u.user_id || u.user_id === user_id) return false;
              const ybexCode = ("YBEX-" + u.user_id.slice(0, 6)).toUpperCase();
              if (ybexCode === cleanCode.toUpperCase()) return true;
              if (u.user_id === cleanCode) return true;
              const nameClean = (u.name || "").toLowerCase().replace(/[^a-z0-9]/g, "");
              const uniquePart = u.user_id.slice(-4).toLowerCase();
              if (nameClean && cleanCode.toLowerCase() === `${nameClean}${uniquePart}`) return true;
              if (cleanCode.toUpperCase() === u.user_id.slice(0, 6).toUpperCase()) return true;
              return false;
            });
            if (found) {
              referrerId = found.user_id;
            }
          }

          if (!referrerId) {
            // Also check memory db
            const db = getDb();
            const foundMem = (db.users || []).find((u: any) => {
              if (!u.user_id || u.user_id === user_id) return false;
              const ybexCode = ("YBEX-" + u.user_id.slice(0, 6)).toUpperCase();
              if (ybexCode === cleanCode.toUpperCase()) return true;
              if (u.user_id === cleanCode) return true;
              const nameClean = (u.name || "").toLowerCase().replace(/[^a-z0-9]/g, "");
              const uniquePart = u.user_id.slice(-4).toLowerCase();
              if (nameClean && cleanCode.toLowerCase() === `${nameClean}${uniquePart}`) return true;
              return false;
            });
            if (foundMem) referrerId = foundMem.user_id;
          }

          if (referrerId) {
            let activeTriggerAction = 'first_paid_collab_completed';
            if (dbClient) {
              try {
                const { data: refCfg } = await dbClient.from('referral_config').select('trigger_condition, trigger_action').limit(1).maybeSingle();
                if (refCfg) {
                  activeTriggerAction = refCfg.trigger_condition || refCfg.trigger_action || 'first_paid_collab_completed';
                }
              } catch (e) {}
            }

            const referralRecord = {
              id: crypto.randomUUID(),
              referrer_id: referrerId,
              referred_id: user_id,
              referred_user_id: user_id,
              status: 'pending',
              trigger_action: activeTriggerAction,
              referred_type: role || 'creator',
              created_at: getIsoNow()
            };

            try {
              await dbClient.from('referrals').insert(referralRecord);
            } catch (e: any) {
              console.warn("[Referral Insert Warning]", e.message);
            }
            const db = getDb();
            if (!db.referrals) db.referrals = [];
            db.referrals.push(referralRecord);
            saveDb(db);
            console.log(`[Referral] User ${user_id} registered using referral code from referrer ${referrerId}`);
          }
        } catch (refErr) {
          console.warn("[Referral Signup Exception]", refErr);
        }
      }

      const otp = crypto.randomInt(100000, 1000000).toString();
      const reset_token_expires = new Date(Date.now() + 15 * 60 * 1000).toISOString();
      const otpHash = await bcrypt.hash(otp, salt);

      const { error: resetError } = await dbClient.from('password_reset_tokens').insert({
        user_id,
        otp_hash: otpHash,
        purpose: 'signup_verification',
        expires_at: reset_token_expires,
        used: false,
        attempt_count: 0
      });

      if (resetError) {
         console.error("Signup token insert error:", resetError);
         // Rollback user creation
         await dbClient.from('users').delete().eq('user_id', user_id);
         return res.status(500).json({ detail: "Failed to initialize verification process. Please try again." });
      }

      console.log(`[Signup Verification] OTP for ${email} is ${otp}`);

      sendSuperAdminAlertEmail({
        subject: `New User Signup: ${name} (${role || 'creator'})`,
        title: `New Account Created on Ybex Media`,
        details: `Name: ${name}\nEmail: ${email}\nRole: ${role || 'creator'}\nPhone: ${phone || 'N/A'}\nUser ID: ${user_id}`
      }).catch(err => console.warn("Super admin alert failed on signup:", err));

      if (process.env.RESEND_API_KEY) {
        try {
          const resendClient = new Resend(process.env.RESEND_API_KEY);
          const fromEmail = process.env.RESEND_FROM_EMAIL || "Ybex <noreply@ybexmedia.in>";
          
  
  const resendResponse = await resendClient.emails.send({
  
            from: fromEmail,
            to: email,
            subject: 'Verify your email address - Ybex',
            html: buildEmailHtml({
    greeting: "Hi there,",
    paragraphs: [
      "Here is your 6-digit verification code to confirm your email address:",
      "<h1 style=\"font-size: 32px; letter-spacing: 4px; color: #4f46e5; background: #f3f4f6; padding: 12px 20px; display: inline-block; border-radius: 8px; margin: 0;\">" + otp + "</h1>",
      "This code will expire in 15 minutes."
    ]
  })
          });
          
          if (resendResponse.error) {
            console.error("Resend API error detail:", JSON.stringify(resendResponse.error));
            if (process.env.NODE_ENV === 'production' && !process.env.RESEND_ALLOW_FALLBACK) {
              return res.status(500).json({ detail: `Email error: ${resendResponse.error.message || 'Failed to send email via Resend'}` });
            }
          } else {
            console.log(`[Signup Verification] Email sent successfully via Resend to ${email}`);
          }
        } catch (emailErr: any) {
          console.error("Failed to execute Resend call:", emailErr?.message || emailErr);
          if (process.env.NODE_ENV === 'production' && !process.env.RESEND_ALLOW_FALLBACK) {
            return res.status(500).json({ detail: "Failed to send verification email" });
          }
        }
      } else {
        console.warn("RESEND_API_KEY not set. OTP logged to console above.");
      }

      // Broadcast new user notification to admins
      broadcastAdminNotification({
        type: 'user_registered',
        message: `New User Joined: ${name} (${email}) - ${role || 'User'}`,
        title: 'New User Signup',
        actor_id: user_id,
        metadata: { userId: user_id, name, email, role, phone }
      }).catch(e => console.warn("Failed to broadcast signup notification:", e));

      return res.json({ success: true, requiresVerification: true, email: email.toLowerCase() });
    } catch (err) {
      console.error("Signup error:", err);
      res.status(500).json({ detail: "Internal server error during signup" });
    }
  });

  router.post("/auth/login", async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ detail: "Email and password are required" });
    }

    try {
      const cleanInput = (email || '').trim().toLowerCase();
      let user: any = null;

      if (supabase) {
        try {
          const { data } = await (privilegedSupabase || supabase)
            .from('users')
            .select('*')
            .ilike('email', cleanInput)
            .maybeSingle();
          user = data;
          if (cleanInput === 'admin@ybex.io' && user) {
            user.banned = true;
          }
        } catch (e) {
          console.warn("[Auth Login Supabase Error]", e);
        }

        // Fallback: check brand_profiles / creator_profiles / phone if user not found directly
        if (!user) {
          try {
            const { data: bp } = await (privilegedSupabase || supabase)
              .from('brand_profiles')
              .select('user_id, email')
              .ilike('email', cleanInput)
              .maybeSingle();

            let foundUserId = bp?.user_id;

            if (!foundUserId) {
              const { data: cp } = await (privilegedSupabase || supabase)
                .from('creator_profiles')
                .select('user_id, email')
                .ilike('email', cleanInput)
                .maybeSingle();
              foundUserId = cp?.user_id;
            }

            if (!foundUserId) {
              const cleanPhone = cleanInput.replace(/\D/g, '');
              if (cleanPhone.length >= 10) {
                const { data: uByPhone } = await (privilegedSupabase || supabase)
                  .from('users')
                  .select('*')
                  .ilike('phone', `%${cleanPhone.slice(-10)}%`)
                  .maybeSingle();
                if (uByPhone) {
                  user = uByPhone;
                }
              }
            }

            if (foundUserId && !user) {
              const { data: uFound } = await (privilegedSupabase || supabase)
                .from('users')
                .select('*')
                .eq('user_id', foundUserId)
                .maybeSingle();
              if (uFound) {
                user = uFound;
                if (!user.email || user.email.trim() === '') {
                  try {
                    await (privilegedSupabase || supabase).from('users').update({ email: cleanInput.toLowerCase() }).eq('user_id', user.user_id);
                  } catch (e) {}
                  user.email = cleanInput.toLowerCase();
                }
              }
            }
          } catch (e) {
            console.warn("[Auth Search Fallback Error]", e);
          }
        }
      }

      // Check local DB if user not found in Supabase
      const db = getDb();
      if (!user && db.users) {
        user = db.users.find((u: any) => u.email && u.email.toLowerCase() === cleanInput);
      }

      let isAutoCreated = false;
      if (!user) {
        return res.status(401).json({ detail: "Invalid email or password", code: "INVALID_CREDENTIALS" });
      }

      if (user.is_deleted) {
        return res.status(401).json({ 
          detail: "Your profile is no longer available. Please contact support or mail us at support@ybex.io",
          code: "ACCOUNT_DELETED",
          user_id: user.user_id,
          role: user.role
        });
      }
      if (user.banned) {
        return res.status(401).json({ 
          detail: "Your account has been banned. Please contact support.",
          code: "ACCOUNT_BANNED",
          user_id: user.user_id,
          role: user.role
        });
      }
      if (user.suspended || user.is_suspended) {
        return res.status(401).json({ 
          detail: "We've suspended your account to protect our community. Please contact support.",
          code: "ACCOUNT_SUSPENDED",
          user_id: user.user_id,
          role: user.role
        });
      }

      // Validate password
      let isMatch = false;
      if (user.password_hash) {
        if (user.password_hash.startsWith("mock_hash_")) {
          isMatch = user.password_hash === "mock_hash_" + password;
        } else {
          try {
            isMatch = await bcrypt.compare(password, user.password_hash);
          } catch (e) {}
        }
      }

      // Fallback: check plain_passwords registry
      const anyDb = db as any;
      if (!isMatch && anyDb && (anyDb.plain_passwords || anyDb.user_plain_passwords)) {
        const plainMap = anyDb.plain_passwords || anyDb.user_plain_passwords;
        const recordedPlain = plainMap[cleanInput] || plainMap[user.user_id] || plainMap[user.email];
        if (recordedPlain && recordedPlain === password) {
          isMatch = true;
        }
      }

      // If user has no password set (e.g. they signed up with Google), they must use Google login or reset password
      if (!isMatch && !user.password_hash) {
        return res.status(401).json({ detail: "Please log in using Google, or reset your password.", code: "INVALID_CREDENTIALS" });
      }

      if (!isMatch) {
        return res.status(401).json({ detail: "Invalid email or password", code: "INVALID_CREDENTIALS" });
      }

      recordUserPassword(user.user_id, user.email, password);

      // Mark user as verified upon successful authentication
      if (user.verified === false || !user.verified) {
        if (supabase) {
          try {
            await (privilegedSupabase || supabase).from('users').update({ verified: true }).eq('user_id', user.user_id);
          } catch (e) {}
        }
        user.verified = true;
      }

      const session_token = `token_${Math.random().toString(36).substring(2, 15)}`;
      const sessionData = {
        user_id: user.user_id,
        session_token,
        expires_at: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString(),
        created_at: getIsoNow(),
      };
      
      if (supabase) {
        try {
          await (privilegedSupabase || supabase).from('user_sessions').insert(sessionData);
        } catch (e: any) {
          console.warn("[Session insert warning]:", e);
        }
      }

      // Save in local DB session store as well
      if (!db.user_sessions) db.user_sessions = [];
      db.user_sessions.push(sessionData);
      saveDb(db);

      res.cookie("session_token", session_token, { maxAge: 7 * 24 * 3600 * 1000, httpOnly: true });
      res.cookie("has_session", "true", { maxAge: 7 * 24 * 3600 * 1000, httpOnly: false });
      
      if (user.role === 'admin' || user.team_role === 'sub_admin' || user.team_role === 'admin') {
        await logAdminAuth(user.user_id, user.email, "login", req.headers['x-forwarded-for'] || req.connection?.remoteAddress, req.headers['user-agent']).catch(() => null);
      }
      const { password_hash, ...safeUser } = user;
      
      safeUser.profile_completed = safeUser.profile_completed || false;
      safeUser.bank_details_added = safeUser.bank_details_added || false;
      safeUser.bank_name = safeUser.bank_name || "";
      safeUser.bank_account = safeUser.bank_account || "";
      safeUser.bank_ifsc = safeUser.bank_ifsc || "";
      safeUser.kyc_verified = safeUser.kyc_verified || false;
      
      const currentPic = safeUser.picture || safeUser.photo || safeUser.avatar || "";
      safeUser.picture = currentPic;
      safeUser.photo = currentPic;
      safeUser.avatar = currentPic;
      
      if (safeUser.onboarding_completed || safeUser.onboarding_complete) {
        safeUser.onboarded = true;
      }
      if (safeUser.onboarded) {
        safeUser.onboarding_completed = true;
        safeUser.onboarding_complete = true;
      }
      
      if (safeUser.role === "creator") {
        let cp: any = null;
        if (supabase) {
          try {
            const { data } = await (privilegedSupabase || supabase).from('creator_profiles').select('*').eq('user_id', safeUser.user_id).maybeSingle();
            if (data) cp = data;
          } catch (e) {}
        }
        if (!cp && db.creator_profiles) {
          cp = db.creator_profiles.find((p: any) => p.user_id === safeUser.user_id);
        }
        if (cp) {
          safeUser.category = cp.category || "";
          safeUser.profile_status = cp.profile_status || "approved";
          safeUser.review_eta_hours = cp.review_eta_hours || 20;
          safeUser.created_at = cp.created_at || safeUser.created_at;
          if (cp.verified) safeUser.kyc_verified = true;
          const isCreatorOnboarded = Boolean(user.onboarded || user.onboarding_completed || user.onboarding_complete || cp.onboarding_complete || cp.onboarding_completed);
          safeUser.onboarded = isCreatorOnboarded;
          safeUser.onboarding_completed = isCreatorOnboarded;
          safeUser.onboarding_complete = isCreatorOnboarded;
        } else {
          safeUser.profile_status = "approved";
          safeUser.onboarded = Boolean(user.onboarded || user.onboarding_completed || user.onboarding_complete);
          safeUser.onboarding_completed = safeUser.onboarded;
          safeUser.onboarding_complete = safeUser.onboarded;
        }
      } else if (safeUser.role === "brand") {
        let bp: any = null;
        if (supabase) {
          try {
            const { data } = await (privilegedSupabase || supabase).from('brand_profiles').select('*').eq('user_id', safeUser.user_id).maybeSingle();
            if (data) bp = data;
          } catch (e) {}
        }
        if (!bp && db.brand_profiles) {
          bp = db.brand_profiles.find((p: any) => p.user_id === safeUser.user_id);
        }
        if (bp) {
          safeUser.industry = bp.industry || "";
          safeUser.profile_status = bp.profile_status || "approved";
          safeUser.review_eta_hours = bp.review_eta_hours || 20;
          safeUser.created_at = bp.created_at || safeUser.created_at;
          if (bp.verified) safeUser.kyc_verified = true;
          const isBrandOnboarded = Boolean(user.onboarded || user.onboarding_completed || user.onboarding_complete || bp.onboarding_completed || bp.onboarding_complete);
          safeUser.onboarded = isBrandOnboarded;
          safeUser.onboarding_completed = isBrandOnboarded;
          safeUser.onboarding_complete = isBrandOnboarded;
        } else {
          safeUser.profile_status = "approved";
          safeUser.onboarded = Boolean(user.onboarded || user.onboarding_completed || user.onboarding_complete);
          safeUser.onboarding_completed = safeUser.onboarded;
          safeUser.onboarding_complete = safeUser.onboarded;
        }
      }

      if (safeUser.role === 'admin' || safeUser.role === 'sub_admin' || safeUser.team_role === 'sub_admin' || safeUser.team_role === 'admin') {
        safeUser.onboarded = true;
        safeUser.onboarding_completed = true;
        safeUser.onboarding_complete = true;
        safeUser.email_verified = true;
        try {
          safeUser.permissions = await getPermissionsForUser(safeUser.user_id);
        } catch (e) {
          safeUser.permissions = ["all"];
        }
      }

      return res.json({ token: session_token, user: safeUser });
    } catch (err: any) {
      console.error("Login error details:", err?.stack || err?.message || err);
      return res.status(500).json({ detail: err?.message || "Internal server error during login" });
    }
  });

  router.post("/auth/verify-email", async (req, res) => {
    const { email, otp } = req.body;
    if (!email || !otp) {
      return res.status(400).json({ detail: "Email and OTP are required" });
    }
    
    try {
      const dbClient = privilegedSupabase || supabase;
      const { data: user } = await dbClient
        .from('users')
        .select('user_id, verified')
        .ilike('email', email.trim())
        .maybeSingle();
        
      if (!user) {
        return res.status(404).json({ detail: "User not found" });
      }

      if (user.verified) {
        const { data: fullUser } = await dbClient.from('users').select('*').eq('user_id', user.user_id).single();
        const session_token = `token_${Math.random().toString(36).substring(2, 15)}`;
        const sessionData = {
          user_id: user.user_id,
          session_token,
          expires_at: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString(),
          created_at: getIsoNow(),
        };
        await dbClient.from('user_sessions').insert(sessionData);

        res.cookie("session_token", session_token, { maxAge: 7 * 24 * 3600 * 1000, httpOnly: true });
        res.cookie("has_session", "true", { maxAge: 7 * 24 * 3600 * 1000, httpOnly: false });

        const { password_hash, ...safeUser } = fullUser || {};
        return res.json({ success: true, token: session_token, user: safeUser, message: "Email is already verified" });
      }

      const { data: tokens } = await dbClient
        .from('password_reset_tokens')
        .select('*')
        .eq('user_id', user.user_id)
        .eq('purpose', 'signup_verification')
        .eq('used', false)
        .order('created_at', { ascending: false })
        .limit(1);

      if (!tokens || tokens.length === 0) {
        return res.status(400).json({ detail: "No valid code found. Please click 'Resend' to get a new code." });
      }

      const token = tokens[0];

      if (new Date(token.expires_at).getTime() < Date.now()) {
        return res.status(400).json({ detail: "Verification code has expired. Please click 'Resend'." });
      }

      if (token.attempt_count >= 5) {
        await dbClient.from('password_reset_tokens').update({ used: true }).eq('id', token.id);
        return res.status(400).json({ detail: "Too many failed attempts. Please request a new code." });
      }

      const isMatch = await bcrypt.compare(otp.trim(), token.otp_hash);

      if (!isMatch) {
        await dbClient.from('password_reset_tokens').update({ attempt_count: token.attempt_count + 1 }).eq('id', token.id);
        return res.status(400).json({ detail: "Invalid 6-digit code. Please check and try again." });
      }

      await dbClient.from('password_reset_tokens').update({ used: true }).eq('id', token.id);
      await dbClient.from('users').update({ verified: true }).eq('user_id', user.user_id);

      // Now issue the session
      const { data: fullUser } = await dbClient.from('users').select('*').eq('user_id', user.user_id).single();
            try {
        const role = fullUser.role || 'creator';
        
        let paragraphs = [];
        
        if (role.toLowerCase() === 'brand') {
          paragraphs.push(`I built Ybex with one simple thought: to make influencer marketing simpler, more transparent, and genuinely valuable for brands.`);
          paragraphs.push(`My promise to you is simple: access to the right creators, transparent collaborations, and a platform that helps you build campaigns without unnecessary middlemen or complications.`);
          paragraphs.push(`If you ever have an issue, an idea, or simply want to share something with me, just reply to this email. I personally read every message.`);
          paragraphs.push(`Ybex is just getting started, and I'm really glad to have you here.`);
        } else if (role.toLowerCase() === 'agency') {
          paragraphs.push(`I started Ybex with one simple thought: to make influencer marketing easier for agencies and more valuable for their clients.`);
          paragraphs.push(`Whether you're managing multiple campaigns, looking for the right creators, or simply trying to get things done without the usual back-and-forth, Ybex is built to make that process smoother.`);
          paragraphs.push(`And if you ever have an idea, an issue, or simply want to share something with me, just reply to this email. I personally read every message.`);
          paragraphs.push(`Ybex is just getting started, and I'm genuinely glad to have you with us.`);
        } else {
          // Creator
          paragraphs.push(`I built Ybex with one simple thought: to create a space where your work is valued, your opportunities are genuine, and you always feel secure while working with brands.`);
          paragraphs.push(`My promise to you is simple: direct access to premium brands, zero middlemen eating into your hard-earned money, and a platform that truly respects your creative journey.`);
          paragraphs.push(`And if you ever have an issue, an idea, or simply want to share something with me, just reply to this email. I personally read these messages and will always try my best to get back to you.`);
          paragraphs.push(`Ybex is just getting started, and I'm really glad you're a part of it.`);
        }

        const signatureHtml = `
          <div style="margin-top: 32px; padding-top: 0;">
            <div style="display: flex; align-items: center;">
              <img src="https://i.ibb.co/j9vzxqbq/profile.jpg" alt="Ravi" style="width: 50px; height: 50px; border-radius: 50%; margin-right: 14px; object-fit: cover;" />
              <div>
                <p style="margin: 0; font-size: 15px; font-weight: 600; color: #111827;">Ravi</p>
                <p style="margin: 0; margin-top: 2px; font-size: 14px; color: #6b7280;">Founder, Ybex</p>
              </div>
            </div>
          </div>
        `;
        const welcomeHtml = buildEmailHtml({
          greeting: `Hey,`,
          paragraphs,
          signatureHtml,
          button: null
        });

        const subject = `Wanted to personally reach out`;
        const resendWelcome = new Resend(process.env.RESEND_API_KEY);
        await resendWelcome.emails.send({
          from: getValidFromEmail(),
          to: fullUser.email,
          subject: subject,
          html: welcomeHtml
        });
        console.log(`[Welcome Email] Sent to ${fullUser.email}`);
      } catch (err) {
        console.error("Failed to send welcome email:", err);
      }

      const session_token = `token_${Math.random().toString(36).substring(2, 15)}`;
      const sessionData = {
        user_id: user.user_id,
        session_token,
        expires_at: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString(),
        created_at: getIsoNow(),
      };
      await dbClient.from('user_sessions').insert(sessionData);

      res.cookie("session_token", session_token, { maxAge: 7 * 24 * 3600 * 1000, httpOnly: true });
      res.cookie("has_session", "true", { maxAge: 7 * 24 * 3600 * 1000, httpOnly: false });

      const { password_hash, ...safeUser } = fullUser;
      return res.json({ success: true, token: session_token, user: safeUser });
    } catch (err) {
      console.error("Verify email error:", err);
      return res.status(500).json({ detail: "Internal server error" });
    }
  });

  router.post("/auth/resend-verification-otp", async (req, res) => {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ detail: "Email is required" });
    }

    try {
      const dbClient = privilegedSupabase || supabase;
      const { data: user } = await dbClient
        .from('users')
        .select('user_id, verified')
        .ilike('email', email)
        .maybeSingle();

      if (!user) {
        return res.json({ success: true, message: "If this email is registered, we've sent a code." });
      }

      if (user.verified) {
        return res.status(400).json({ detail: "Email is already verified" });
      }

      // Check rate limit: max 3 requests in the last 15 minutes
      const fifteenMinsAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();
      const { data: recentTokens } = await dbClient
        .from('password_reset_tokens')
        .select('id')
        .eq('user_id', user.user_id)
        .eq('purpose', 'signup_verification')
        .gte('created_at', fifteenMinsAgo);

      if (recentTokens && recentTokens.length >= 3) {
        return res.status(429).json({ detail: "Too many requests. Please try again later." });
      }

      await dbClient
        .from('password_reset_tokens')
        .update({ used: true })
        .eq('user_id', user.user_id)
        .eq('purpose', 'signup_verification')
        .eq('used', false);

      const otp = crypto.randomInt(100000, 1000000).toString();
      const salt = await bcrypt.genSalt(10);
      const otpHash = await bcrypt.hash(otp, salt);
      const expires_at = new Date(Date.now() + 15 * 60 * 1000).toISOString();

      const { error: insertError } = await dbClient.from('password_reset_tokens').insert({
        user_id: user.user_id,
        otp_hash: otpHash,
        purpose: 'signup_verification',
        expires_at: expires_at,
        used: false,
        attempt_count: 0
      });

      if (insertError) {
        console.error("Resend OTP token insert error:", insertError);
        return res.status(500).json({ detail: "Failed to generate new verification code. Please try again." });
      }

      console.log(`[Resend Verification] OTP for ${email} is ${otp}`);

      if (process.env.RESEND_API_KEY) {
        try {
          const resendClient = new Resend(process.env.RESEND_API_KEY);
          const fromEmail = process.env.RESEND_FROM_EMAIL || "Ybex <noreply@ybexmedia.in>";
          const resendResponse = await resendClient.emails.send({
            from: fromEmail,
            to: email,
            subject: 'Verify your email address - Ybex',
            html: buildEmailHtml({
    greeting: "Hi there,",
    paragraphs: [
      "Here is your new 6-digit verification code to confirm your email address:",
      "<h1 style=\"font-size: 32px; letter-spacing: 4px; color: #4f46e5; background: #f3f4f6; padding: 12px 20px; display: inline-block; border-radius: 8px; margin: 0;\">" + otp + "</h1>",
      "This code will expire in 15 minutes."
    ]
  })
          });
          
          if (resendResponse.error) {
            console.error("Resend API error detail:", JSON.stringify(resendResponse.error));
            if (process.env.NODE_ENV === 'production' && !process.env.RESEND_ALLOW_FALLBACK) {
              return res.status(500).json({ detail: `Email error: ${resendResponse.error.message || 'Failed to send verification email'}` });
            }
          } else {
            console.log(`[Resend Verification] Email sent successfully via Resend to ${email}`);
          }
        } catch (emailErr: any) {
          console.error("Failed to send verification OTP:", emailErr?.message || emailErr);
          if (process.env.NODE_ENV === 'production' && !process.env.RESEND_ALLOW_FALLBACK) {
            return res.status(500).json({ detail: "Failed to send verification email" });
          }
        }
      } else {
        console.warn("RESEND_API_KEY not set. OTP logged to console above.");
      }

      return res.json({ success: true, message: "Code sent successfully" });
    } catch (err) {
      console.error("Resend OTP error:", err);
      return res.status(500).json({ detail: "Internal server error" });
    }
  });

  router.get("/auth/google/url", async (req, res) => {
    const client_id = process.env.GOOGLE_CLIENT_ID;
    if (!client_id) {
      return res.status(400).json({
        error: "Google OAuth Client ID is not configured on the server. Please configure GOOGLE_CLIENT_ID in the settings panel."
      });
    }

    const host = req.get("host") || "";
    const protocol = host.includes("localhost") || host.includes("127.0.0.1") ? "http" : "https";
    const default_redirect = `${protocol}://${host}/api/auth/google/callback`;

    const redirect_uri = (req.query.redirect_uri as string) || default_redirect;
    const params = new URLSearchParams({
      client_id,
      redirect_uri,
      response_type: "code",
      scope: "openid email profile",
      access_type: "offline",
      prompt: "consent"
    });

    const url = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
    res.json({ url, is_fallback: false });
  });

  router.get("/auth/google/callback", async (req, res) => {
    const { code, error } = req.query;

    if (error || !code) {
      console.error("Google Auth error returned to callback:", error);
      return res.send(`
        <html>
          <body>
            <script>
              if (window.opener) {
                window.opener.postMessage({ type: "OAUTH_FAILURE" }, "*");
                window.close();
              } else {
                window.location.href = "/login";
              }
            </script>
            <p>Authorization failed or was cancelled. Closing window...</p>
          </body>
        </html>
      `);
    }

    const client_id = process.env.GOOGLE_CLIENT_ID;
    const client_secret = process.env.GOOGLE_CLIENT_SECRET;

    if (!client_id || !client_secret) {
      return res.status(400).send("Google OAuth Client ID & Secret are not configured on the server.");
    }

    try {
      const host = req.get("host") || "";
      const protocol = host.includes("localhost") || host.includes("127.0.0.1") ? "http" : "https";
      const redirect_uri = `${protocol}://${host}/api/auth/google/callback`;

      // 1. Exchange authorization code for token
      const tokenResponse = await axios.post("https://oauth2.googleapis.com/token", {
        client_id,
        client_secret,
        code,
        redirect_uri,
        grant_type: "authorization_code"
      });

      const { access_token, id_token } = tokenResponse.data;

      // 2. Fetch user profile info from Google API
      const userinfoResponse = await axios.get("https://www.googleapis.com/oauth2/v3/userinfo", {
        headers: {
          Authorization: `Bearer ${access_token}`
        }
      });

      const profile = userinfoResponse.data;
      const { sub, email, name, picture } = profile;

      if (!email) {
        throw new Error("No email returned from Google profile scope.");
      }

      // Handle standard callback flow with Supabase Auth
      let supabaseSession: any = null;
      let supId = "";
      if (supabase && id_token) {
        try {
          const { data: authData, error: authError } = await supabase.auth.signInWithIdToken({
            provider: "google",
            token: id_token
          });
          if (authError) {
            console.error("Supabase signInWithIdToken failed:", authError.message);
          } else {
            console.log("Supabase Auth sign-in successful!");
            supabaseSession = authData.session;
            if (authData.user) {
              supId = authData.user.id;
            }
          }
        } catch (sErr: any) {
          console.error("Error executing supabase.auth.signInWithIdToken:", sErr.message || sErr);
        }
      }

      const db = getDb();
      let user_id = "";
      let existing = db.users.find((u) => u.email.toLowerCase() === email.toLowerCase());

      if (existing) {
        if (supId && !existing.user_id.includes("-")) {
          const old_id = existing.user_id;
          existing.user_id = supId;
          db.user_sessions.forEach((s) => {
            if (s.user_id === old_id) s.user_id = supId;
          });
        }
        user_id = existing.user_id;
        if (!existing.name) existing.name = name || email.split("@")[0];
        if (!existing.picture) existing.picture = picture;
        existing.auth_method = "google";
      } else {
        user_id = supId || `user_google_${sub || Math.random().toString(36).substring(2, 12)}`;
        const newUser = {
          user_id,
          email: email.toLowerCase(),
          name: name || email.split("@")[0],
          picture: picture || "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100",
          role: null,
          auth_method: "google",
          created_at: getIsoNow(),
          onboarded: false
        };
        db.users.push(newUser);
      }

      const session_token = `token_oauth_${Math.random().toString(36).substring(2, 15)}`;
      db.user_sessions.push({
        user_id,
        session_token,
        expires_at: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString(),
        created_at: getIsoNow()
      });

      saveDb(db);

      res.cookie("session_token", session_token, { maxAge: 7 * 24 * 3600 * 1000, httpOnly: true, secure: true, sameSite: "none" });
      res.cookie("has_session", "true", { maxAge: 7 * 24 * 3600 * 1000, httpOnly: false, secure: true, sameSite: "none" });

      return res.send(`
        <html>
          <body>
            <script>
              if (window.opener) {
                window.opener.postMessage({
                  type: "OAUTH_SUCCESS",
                  token: "${session_token}",
                  supabaseSession: ${JSON.stringify(supabaseSession || null)}
                }, "*");
                window.close();
              } else {
                window.location.href = "/dashboard";
              }
            </script>
            <p>Google signing in successful! Closing window...</p>
          </body>
        </html>
      `);
    } catch (err: any) {
      console.error("Google Auth Token Exchange/Userinfo Error:", err?.response?.data || err?.message || err);
      return res.send(`
        <html>
          <body>
            <script>
              if (window.opener) {
                window.opener.postMessage({ type: "OAUTH_FAILURE" }, "*");
                window.close();
              } else {
                window.location.href = "/login";
              }
            </script>
            <p>Google authentication failed. Please try again.</p>
          </body>
        </html>
      `);
    }
  });

  router.get("/auth/me", async (req, res) => {
    const user = await parseAuthUser(req);
    if (!user) {
      return res.status(403).json({ detail: "Not authenticated", _status: 403 });
    }

    if (user.is_deleted) {
      return res.status(401).json({ 
        detail: "Your profile is no longer available. Please contact support or mail us at support@ybex.io",
        code: "ACCOUNT_DELETED"
      });
    }
    if (user.banned) {
      return res.status(401).json({ 
        detail: "Your account has been banned. Please contact support.",
        code: "ACCOUNT_BANNED" 
      });
    }
    if (user.suspended || user.is_suspended) {
      return res.status(401).json({ 
        detail: "We've suspended your account to protect our community. Please contact support.",
        code: "ACCOUNT_SUSPENDED" 
      });
    }

    const db = getDb();
    let dbUser = db.users.find(u => u.user_id === user.user_id);
    if (!dbUser && supabase) {
      try {
        const { data } = await (privilegedSupabase || supabase).from('users').select('*').eq('user_id', user.user_id).maybeSingle();
        if (data) dbUser = data;
      } catch (err) {
        console.error("Error fetching dbUser from Supabase in /auth/me:", err);
      }
    }
    if (dbUser) {
      user.profile_completed = dbUser.profile_completed || false;
      user.bank_details_added = dbUser.bank_details_added || false;
      user.bank_name = dbUser.bank_name || "";
      user.bank_account = dbUser.bank_account || "";
      user.bank_ifsc = dbUser.bank_ifsc || "";
      user.kyc_verified = dbUser.kyc_verified || false;
      user.phone = dbUser.phone || dbUser.mobile || dbUser.phone_number || user.phone || "";
      if (dbUser.email) user.email = dbUser.email;
      
      // Ensure absolute compatibility across all frontend components (avatar vs picture vs photo)
      const currentPic = dbUser.picture || dbUser.photo || dbUser.avatar || user.picture || "";
      user.picture = currentPic;
      user.photo = currentPic;
      user.avatar = currentPic;
      user.onboarded = dbUser.onboarded !== undefined ? dbUser.onboarded : user.onboarded;
      if (dbUser.onboarding_completed || dbUser.onboarding_complete) {
        user.onboarded = true;
      }
    }

    if (user.onboarded) {
      user.onboarding_completed = true;
      user.onboarding_complete = true;
    }

    
    if (user.role === "creator") {
      let cp = null;
      if (supabase) {
        const { data } = await (privilegedSupabase || supabase).from('creator_profiles').select('*').eq('user_id', user.user_id).maybeSingle();
        if (data) cp = data;
      } else {
        cp = db.creator_profiles?.find(p => p.user_id === user.user_id);
      }
      if (cp) {
        user.category = cp.category || "";
        if (cp.phone || cp.mobile) user.phone = cp.phone || cp.mobile || user.phone;
        if (cp.verified) user.kyc_verified = true;
        if (cp.name || cp.full_name) {
          user.name = cp.name || cp.full_name;
        }
        const pic = cp.picture || cp.photo || cp.avatar_url || cp.profile_picture_url;
        if (pic) {
          user.picture = pic;
          user.photo = pic;
          user.avatar = pic;
        }
        const isCreatorOnboarded = Boolean(dbUser?.onboarded || user.onboarded || cp.onboarding_complete || cp.onboarding_completed);
        user.onboarded = isCreatorOnboarded;
        user.onboarding_completed = isCreatorOnboarded;
        user.onboarding_complete = isCreatorOnboarded;
      } else {
        const isCreatorOnboarded = Boolean(dbUser?.onboarded || user.onboarded);
        user.onboarded = isCreatorOnboarded;
        user.onboarding_completed = isCreatorOnboarded;
        user.onboarding_complete = isCreatorOnboarded;
      }
    } else if (user.role === "brand") {
      let bp = null;
      if (supabase) {
        const { data } = await (privilegedSupabase || supabase).from('brand_profiles').select('*').eq('user_id', user.user_id).maybeSingle();
        if (data) bp = data;
      } else {
        bp = db.brand_profiles?.find(p => p.user_id === user.user_id);
      }
      if (bp) {
        user.industry = bp.industry || "";
        if (bp.representative_mobile || bp.poc_phone || bp.phone) {
          user.phone = bp.representative_mobile || bp.poc_phone || bp.phone || user.phone;
        }
        if (bp.verified) user.kyc_verified = true;
        if (bp.company_name) {
          user.name = bp.company_name;
        }
        if (bp.logo) {
          user.picture = bp.logo;
          user.photo = bp.logo;
          user.avatar = bp.logo;
        }
        const isBrandOnboarded = Boolean(dbUser?.onboarded || user.onboarded || bp.onboarding_completed || bp.onboarding_complete);
        user.onboarded = isBrandOnboarded;
        user.onboarding_completed = isBrandOnboarded;
        user.onboarding_complete = isBrandOnboarded;
      } else {
        const isBrandOnboarded = Boolean(dbUser?.onboarded || user.onboarded);
        user.onboarded = isBrandOnboarded;
        user.onboarding_completed = isBrandOnboarded;
        user.onboarding_complete = isBrandOnboarded;
      }
    }


    if (user.role === "creator") {
      const db = getDb();
      db.collabs = db.collabs || [];
      db.chat_threads = db.chat_threads || [];
      db.chat_messages = db.chat_messages || [];
      db.invoices = db.invoices || [];
      db.ugc_briefs = db.ugc_briefs || [];
      db.ugc_orders = db.ugc_orders || [];
      db.earnings = db.earnings || [];
      db.banners = db.banners || [];

      const hasCollabs = db.collabs.some(c => c.creator_id === user.user_id || c.to_user_id === user.user_id || c.from_user_id === user.user_id);
      if (!hasCollabs) {
        const c1_id = `collab_demo_${user.user_id}_1`;
        const c2_id = `collab_demo_${user.user_id}_2`;
        const brand_id = "demo_brand";
        const thread1_id = `thread_demo_${user.user_id}`;
        
        if (!db.users.find(u => u.user_id === brand_id)) {
           db.users.push({ user_id: brand_id, name: "Nexus Brands", email: "nexus@example.com", role: "brand" });
        }
        if (!db.brand_profiles) db.brand_profiles = [];
        if (!db.brand_profiles.find(b => b.user_id === brand_id)) {
           db.brand_profiles.push({ user_id: brand_id, company_name: "Nexus Brands Inc.", industry: "Lifestyle" });
        }
        
        const d = new Date();
        db.collabs.push({
          collab_id: c1_id, to_user_id: user.user_id, from_user_id: brand_id, campaign_id: "c1", status: "active",
          rate: 15000, message: "Looking forward to this!", created_at: new Date(d.getTime() - 86400000*3).toISOString(),
          brand_name: "Nexus Brands Inc."
        });
        db.collabs.push({
          collab_id: c2_id, to_user_id: brand_id, from_user_id: user.user_id, campaign_id: "c2", status: "completed",
          rate: 25000, message: "Loved working on this.", created_at: new Date(d.getTime() - 86400000*10).toISOString(),
          brand_name: "Nexus Brands Inc."
        });

        if (db.campaigns && db.campaigns[0]) {
           db.campaigns[0].applicants = db.campaigns[0].applicants || [];
           db.campaigns[0].applicants.push({
               application_id: `app_seed_${user.user_id}_1`, creator_user_id: user.user_id, 
               pitch: "I'd love to work with you!", proposed_amount: 15000, status: "pending", applied_at: new Date().toISOString()
           });
        }
        if (db.campaigns && db.campaigns[1]) {
           db.campaigns[1].applicants = db.campaigns[1].applicants || [];
           db.campaigns[1].applicants.push({
               application_id: `app_seed_${user.user_id}_2`, creator_user_id: user.user_id, 
               pitch: "Here's my pitch for this campaign.", proposed_amount: 20000, status: "accepted", applied_at: new Date().toISOString()
           });
        }

        db.chat_threads.push({
          id: thread1_id, collab_id: c1_id, creator_id: user.user_id, brand_id,
          status: "active", created_at: new Date(d.getTime() - 86400000*3).toISOString(), updated_at: new Date().toISOString()
        });
        db.chat_messages.push({
          id: `m_d_${user.user_id}_1`, thread_id: thread1_id, sender_id: brand_id, content: "Hey! We accepted your application. Please send the draft link.", created_at: new Date(d.getTime() - 86400000).toISOString()
        });
        db.chat_messages.push({
          id: `m_d_${user.user_id}_2`, thread_id: thread1_id, sender_id: user.user_id, content: "Great! Working on it now.", created_at: new Date().toISOString()
        });

        db.invoices.push({
          id: "inv1", invoice_number: "INV-8001", creator_id: user.user_id, client_id: brand_id,
          client_name: "Nexus Brands Inc.", total_amount: 25000, status: "PAID",
          issue_date: new Date(d.getTime() - 86400000*10).toISOString(), due_date: new Date(d.getTime() + 86400000*10).toISOString(),
          items: [{description: "Instagram Reel", amount: 25000}]
        });
        db.invoices.push({
          id: "inv2", invoice_number: "INV-8002", creator_id: user.user_id, client_id: brand_id,
          client_name: "Nexus Brands Inc.", total_amount: 15000, status: "PENDING",
          issue_date: new Date().toISOString(), due_date: new Date(d.getTime() + 86400000*30).toISOString(),
          items: [{description: "YouTube Integration", amount: 15000}]
        });

        const brief_id = "brief_demo_1";
        const order_id = "ugc_ord_demo_1";
        if(!db.ugc_briefs.find(b => b.id === brief_id)) {
            db.ugc_briefs.push({
            id: brief_id, brand_id, title: "Quick Unboxing for Activewear", product_name: "Aura Leggings",
            product_description: "Premium high-waisted seamless leggings with side pockets.",
            detailed_requirements: "We are looking for a highly engaging, well-lit unboxing video showing the premium packaging and the stretchability of the leggings. Please highlight the side pockets and the seamless design.",
            sample_content_url: "https://example.com/sample-ugc-unboxing",
            budget: 15000, deliverable_type: "instagram_reel", dos: ["Show fabric stretch", "Mention 24h shipping"], donts: ["Mention price", "Show other brands"], status: "IN_PROGRESS",
            claimed_count: 1, max_creators: 1
            });
        }
        db.ugc_orders.push({
          id: order_id, brief_id, creator_id: user.user_id, brief: db.ugc_briefs.find(b => b.id === brief_id),
          brand_status: "IN_PROGRESS", creator_status: "CLAIMED", creator_payout: 3300, agreed_amount: 15000,
          internal_deadline: new Date(d.getTime() + 86400000).toISOString(), created_at: new Date().toISOString()
        });
        db.earnings.push({
          id: "earn_1", creator_id: user.user_id, brief: db.ugc_briefs.find(b => b.id === brief_id),
          creator_payout: 4200, created_at: new Date(d.getTime() - 86400000*5).toISOString()
        });

        // Add some available brief
        if(!db.ugc_briefs.find(b=>b.id==="brief_open_1")){
          db.ugc_briefs.push({
            id: "brief_open_1", brand_id, title: "Protein Powder review", product_name: "Pro Whey",
            product_description: "High-quality whey protein powder for muscle recovery.",
            detailed_requirements: "Show yourself mixing the powder with water or milk in a shaker. Take a sip and talk about the taste and how it helps you recover after a workout.",
            sample_content_url: "https://example.com/sample-ugc-review",
            budget: 5000, deliverable_type: "youtube_short", dos: ["Show mixing"], donts: [], status: "OPEN",
            claimed_count: 0, max_creators: 3
          });
        }

        saveDb(db);
      }
    } else if (user.role === "brand") {
      const db = getDb();
      db.ugc_briefs = db.ugc_briefs || [];
      db.ugc_orders = db.ugc_orders || [];
      db.collabs = db.collabs || [];

      const hasBrandData = db.ugc_briefs.some(b => b.brand_id === user.user_id);
      if (!hasBrandData) {
        const creator_id = "creator_demo_1";
        if (!db.users.find(u => u.user_id === creator_id)) {
           db.users.push({ user_id: creator_id, name: "Alice Creator", email: "alice@example.com", role: "creator" });
        }

        const brief_id = "brief_demo_brand_1";
        const order_id = "ugc_ord_demo_brand_1";
        db.ugc_briefs.push({
          id: brief_id, brand_id: user.user_id, title: "Quick Unboxing for Activewear", product_name: "Aura Leggings",
          detailed_requirements: "We are looking for a highly engaging, well-lit unboxing video showing the premium packaging and the stretchability of the leggings. Please highlight the side pockets and the seamless design.",
          sample_content_url: "https://example.com/sample-ugc-unboxing",
          product_description: "Premium high-waisted seamless leggings with side pockets.",
          budget: 15000, deliverable_type: "instagram_reel", dos: ["Show fabric stretch", "Mention 24h shipping"], donts: ["Mention price", "Show other brands"], status: "IN_PROGRESS",
          claimed_count: 1, max_creators: 1
        });
        
        const d = new Date();
        db.ugc_orders.push({
          id: order_id, brief_id, creator_id: creator_id, brief: db.ugc_briefs.find(b => b.id === brief_id),
          brand_status: "IN_PROGRESS", creator_status: "CLAIMED", creator_payout: 3300, agreed_amount: 15000,
          internal_deadline: new Date(d.getTime() + 86400000).toISOString(), created_at: new Date().toISOString()
        });

        db.collabs.push({
          collab_id: "collab_brand_1", to_user_id: creator_id, from_user_id: user.user_id, campaign_id: "c1", status: "active",
          rate: 15000, message: "Let's do this!", created_at: new Date(d.getTime() - 86400000*3).toISOString(),
          brand_name: "Nexus Brands Inc.", creator_name: "Alice Creator"
        });

        saveDb(db);
      }
    }

    if (user.role === 'admin' || user.role === 'sub_admin' || user.team_role === 'sub_admin') {
      user.permissions = await getPermissionsForUser(user.user_id);
    }

    res.json(user);
  });

  router.post("/auth/forgot-password", async (req, res) => {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ detail: "Email is required" });
    }
    
    if (!checkForgotPasswordRateLimit(email)) {
      return res.status(429).json({ detail: "Too many requests. Please try again in 15 minutes." });
    }

    try {
      const activeClient = privilegedSupabase || supabase;

      if (!activeClient) {
         return res.status(500).json({ detail: "Database connection unavailable" });
      }

      const { data: user } = await activeClient
        .from('users')
        .select('user_id')
        .ilike('email', email)
        .maybeSingle();

      if (!user) {
        return res.status(404).json({ detail: "No account found with this email address." });
      }

      // Generate a 6-digit OTP using crypto
      const otp = crypto.randomInt(100000, 1000000).toString();
      const reset_token_expires = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // 15 mins

      const salt = await bcrypt.genSalt(10);
      const otpHash = await bcrypt.hash(otp, salt);

      const { error } = await activeClient.from('password_reset_tokens').insert([
        {
          user_id: user.user_id,
          otp_hash: otpHash,
          purpose: 'password_reset',
          expires_at: reset_token_expires,
          used: false,
          attempt_count: 0
        }
      ]);
      
      if (error) {
        console.error("Failed to insert OTP:", error);
        return res.status(500).json({ detail: "Internal server error during password reset" });
      }

      console.log(`[Forgot Password] OTP for ${email} is ${otp}`);

      if (process.env.RESEND_API_KEY) {
        try {
          const resendClient = new Resend(process.env.RESEND_API_KEY);
          const fromEmail = process.env.RESEND_FROM_EMAIL || "Ybex <noreply@ybexmedia.in>";
          const resendResponse = await resendClient.emails.send({
            from: fromEmail,
            to: email,
            subject: 'Password Reset Code - Ybex',
            html: buildEmailHtml({
    greeting: "Hi there,",
    paragraphs: [
      "You recently requested to reset your password. Here is your 6-digit password reset code:",
      "<h1 style=\"font-size: 32px; letter-spacing: 4px; color: #4f46e5; background: #f3f4f6; padding: 12px 20px; display: inline-block; border-radius: 8px; margin: 0;\">" + otp + "</h1>",
      "This code will expire in 15 minutes. If you did not request this, please ignore this email."
    ]
  })
          });
          
          if (resendResponse.error) {
            console.error("Resend API error detail:", JSON.stringify(resendResponse.error));
            if (process.env.NODE_ENV === 'production' && !process.env.RESEND_ALLOW_FALLBACK) {
              return res.status(500).json({ detail: `Email error: ${resendResponse.error.message || 'Failed to send reset email'}` });
            }
          } else {
            console.log(`[Forgot Password] Email sent to ${email}. Resend response:`, resendResponse.data);
          }
        } catch (emailErr: any) {
          console.error("Failed to execute Resend call:", emailErr?.message || emailErr);
          if (process.env.NODE_ENV === 'production' && !process.env.RESEND_ALLOW_FALLBACK) {
            return res.status(500).json({ detail: "Failed to send reset email" });
          }
        }
      } else {
        console.warn("RESEND_API_KEY not set. OTP logged to console above.");
      }

      return res.json({ success: true, message: "If that email is in our database, we will send a password reset link." });
    } catch (err) {
      console.error("Forgot password error:", err);
      return res.status(500).json({ detail: "Internal server error" });
    }
  });

  router.post("/auth/reset-password", async (req, res) => {
    const { email, otp, newPassword } = req.body;
    if (!email || !otp || !newPassword) {
      return res.status(400).json({ detail: "Email, OTP, and new password are required" });
    }

    try {
      const { data: user } = await supabase
        .from('users')
        .select('user_id')
        .ilike('email', email)
        .maybeSingle();

      const activeClient = privilegedSupabase || supabase;

      if (!user || !activeClient) {
        return res.status(400).json({ detail: "Invalid or expired OTP" });
      }

      const { data: tokens, error } = await activeClient
        .from('password_reset_tokens')
        .select('*')
        .eq('user_id', user.user_id)
        .eq('purpose', 'password_reset')
        .gte('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(1);

      if (error || !tokens || tokens.length === 0) {
        return res.status(400).json({ detail: "Invalid or expired OTP" });
      }

      const resetData = tokens[0];
      
      if (resetData.attempt_count >= 5) {
        if (!resetData.used) {
          await activeClient.from('password_reset_tokens').update({ used: true }).eq('id', resetData.id);
        }
        return res.status(400).json({ detail: "Too many failed attempts. This OTP has been invalidated, please request a new code." });
      }

      if (resetData.used) {
        return res.status(400).json({ detail: "Invalid or expired OTP" });
      }

      const isValid = await bcrypt.compare(otp, resetData.otp_hash);
      if (!isValid) {
        const newAttemptCount = (resetData.attempt_count || 0) + 1;
        if (newAttemptCount >= 5) {
          await activeClient.from('password_reset_tokens').update({ attempt_count: newAttemptCount, used: true }).eq('id', resetData.id);
          return res.status(400).json({ detail: "Too many failed attempts. This OTP has been invalidated, please request a new code." });
        } else {
          await activeClient.from('password_reset_tokens').update({ attempt_count: newAttemptCount }).eq('id', resetData.id);
          return res.status(400).json({ detail: "Invalid or expired OTP" });
        }
      }

      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(newPassword, salt);
      await activeClient.from('users').update({ password_hash: hashedPassword }).eq('user_id', user.user_id);
      await activeClient.from('password_reset_tokens').update({ used: true }).eq('id', resetData.id);
      
      recordUserPassword(user.user_id, user.email, newPassword);

      return res.json({ success: true, message: "Password has been reset successfully." });
    } catch (err) {
      console.error("Reset password error:", err);
      return res.status(500).json({ detail: "Internal server error" });
    }
  });

  router.post("/auth/logout", async (req, res) => {
    const authHeader = req.headers.authorization;
    let token = "";
    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.substring(7);
    }
    const user = await parseAuthUser(req);
    if (user && (user.role === 'admin' || user.team_role === 'sub_admin')) {
      await logAdminAuth(user.user_id, user.email, "logout", req.headers['x-forwarded-for'] || req.connection?.remoteAddress, req.headers['user-agent']);
    }
    const db = getDb();
    if (token) {
      if (!db.user_sessions) db.user_sessions = [];
      db.user_sessions = db.user_sessions.filter((s) => s.session_token !== token);
    }
    saveDb(db);
    res.clearCookie("session_token");
    res.clearCookie("has_session");
    res.json({ ok: true });
  });

  router.post("/auth/onboard", async (req, res) => {
    const user = await parseAuthUser(req);
    if (!user) return res.status(403).json({ detail: "Not authenticated", _status: 403 });
    
    const { role, data } = req.body || {};
    
    if (supabase) {
      let updatePayload: any = { onboarded: true };
      let rawPicture = "";
      let rawLogo = "";

      if (role === 'creator') {
        rawPicture = data.avatar_url || data.photo || user.picture || "";
        rawPicture = await processBase64Image(rawPicture, "profile-assets", user.user_id);
        updatePayload.name = data.full_name || data.name || user.name;
        updatePayload.picture = rawPicture;
      } else if (role === 'brand') {
        rawLogo = data.logo_url || data.logo || "";
        if (rawLogo && rawLogo.startsWith("data:image/")) {
          rawLogo = await processBase64Image(rawLogo, "brand-logos", user.user_id);
        }
        updatePayload.name = data.company_name || user.name;
        updatePayload.picture = rawLogo;
      }

      const { error: userUpdateErr } = await (privilegedSupabase || supabase).from('users').update(updatePayload).eq('user_id', user.user_id);
      if (userUpdateErr) {
        console.error("Onboard user update error:", userUpdateErr);
        return res.status(500).json({ error: userUpdateErr.message });
      }

      if (role === 'creator') {
        const payload = {
          user_id: user.user_id,
          name: updatePayload.name,
          email: user.email,
          photo: rawPicture,
          picture: rawPicture,
          bio: data.bio,
          primary_niche: data.primary_niche || data.category,
          category: data.primary_niche || data.category,
          gender: data.gender,
          city: data.city,
          state: data.state,
          languages: data.languages,
          instagram_handle: data.instagram_handle,
          follower_count: Number(data.follower_count || data.ig_followers || 0),
          ig_followers: Number(data.follower_count || data.ig_followers || 0),
          followers_instagram: Number(data.follower_count || data.ig_followers || 0),
          avg_views_30d: Number(data.avg_views_30d || data.average_reach || 0),
          avg_likes_30d: Number(data.avg_likes_30d || 0),
          avg_comments_30d: Number(data.avg_comments_30d || 0),
          engagement_rate: (Number(data.follower_count || data.ig_followers || 0) > 0 && (Number(data.avg_likes_30d || 0) > 0 || Number(data.avg_comments_30d || 0) > 0))
            ? parseFloat((((Number(data.avg_likes_30d || 0) + Number(data.avg_comments_30d || 0)) / Number(data.follower_count || data.ig_followers || 1)) * 100).toFixed(2))
            : (data.engagement_rate || 0),
          barter_mode: data.barter_mode,
          rate_card: { reels: Number(data.rate_reel || 0), stories: Number(data.rate_story || 0) },
          rate_reel: Number(data.rate_reel) || 0,
          rate_story: Number(data.rate_story) || 0,
          rate_yt_video: Number(data.youtube_video_rate) || 0
        };
        const { error } = await (privilegedSupabase || supabase).from('creator_profiles').upsert(payload);
        if (error) {
          console.error("Onboard creator profile error:", error);
          return res.status(500).json({ error: error.message });
        }
        
        // Universal Category Sync
        const tagsToSync = [];
        if (payload.primary_niche) {
          tagsToSync.push({ name: payload.primary_niche, type: 'niche' as const });
        }
        if (tagsToSync.length > 0) {
          await syncEntityTags('creator_profile', user.user_id, tagsToSync);
        }
      } else if (role === 'brand') {
        const payload = {
          user_id: user.user_id,
          company_name: updatePayload.name || '', // DO NOT fallback to user.name
          is_agency: data.is_agency === true || data.isAgency === true,
          // agency_type removed from db schema
          representative_name: data.representative_name || '',
          representative_designation: data.representative_designation || '',
          representative_mobile: data.representative_mobile || '',
          email: user.email,
          industry: data.industry,
          description: data.description,
          gender_focus: data.gender_focus,
          website: data.website_url || data.website,
          team_size: data.team_size,
          campaign_types: data.campaign_types,
          budget_range: data.budget_range,
          preferred_creator_size: data.creator_size || data.preferred_creator_size,
          preferred_niches: data.preferred_niches,
          logo: rawLogo,
        };
        const { error } = await (privilegedSupabase || supabase).from('brand_profiles').upsert(payload);
        if (error) {
          console.error("Onboard brand profile error:", error);
          return res.status(500).json({ error: error.message });
        }
        
        // Also update users table with is_agency
        await (privilegedSupabase || supabase).from('users').update({
          is_agency: Boolean(data.is_agency || data.isAgency)
        }).eq('user_id', user.user_id);
        
        // Universal Category Sync
        const tagsToSync = [];
        if (payload.industry) {
          tagsToSync.push({ name: payload.industry, type: 'industry' as const });
        }
        if (payload.preferred_niches) {
          const nichesArray = Array.isArray(payload.preferred_niches)
            ? payload.preferred_niches
            : typeof payload.preferred_niches === 'string'
              ? payload.preferred_niches.split(',').map(s => s.trim())
              : [];
          nichesArray.forEach(n => {
            if (n) tagsToSync.push({ name: n, type: 'niche' as const });
          });
        }
        if (tagsToSync.length > 0) {
          await syncEntityTags('brand_profile', user.user_id, tagsToSync);
        }
      }
    }

    const db = getDb();
    const dbUser = db.users.find(u => u.user_id === user.user_id);
    if (dbUser) {
      dbUser.onboarded = true;
      dbUser.onboarding_completed = true;
      if (role === 'creator') {
        dbUser.name = data.full_name || data.name || user.name;
        dbUser.picture = data.avatar_url || data.photo || user.picture || "";
        dbUser.photo = dbUser.picture;
        dbUser.avatar = dbUser.picture;
      } else if (role === 'brand') {
        dbUser.name = data.company_name || user.name;
        dbUser.picture = data.logo_url || data.logo || "";
        dbUser.photo = dbUser.picture;
        dbUser.avatar = dbUser.picture;
      }
      if (role === "creator") {
        if (!db.creator_profiles) db.creator_profiles = [];
        let profile = db.creator_profiles.find(p => p.user_id === user.user_id);
        if (!profile) {
          profile = { user_id: user.user_id };
          db.creator_profiles.push(profile);
        }
        Object.assign(profile, data || {});
      } else if (role === "brand") {
        if (!db.brand_profiles) db.brand_profiles = [];
        let profile = db.brand_profiles.find(p => p.user_id === user.user_id);
        if (!profile) {
          profile = { user_id: user.user_id };
          db.brand_profiles.push(profile);
        }
        Object.assign(profile, data || {});
      }
      saveDb(db);
    }
    res.json({ ok: true, user: dbUser || user });
  });

  router.post("/auth/role", async (req, res) => {
    const user = await parseAuthUser(req);
    if (!user) {
      return res.status(403).json({ detail: "Not authenticated", _status: 403 });
    }
    const { role } = req.body;
    if (!["creator", "brand", "talent_manager"].includes(role)) {
      return res.status(400).json({ detail: "Invalid role" });
    }

    const db = getDb();
    const dbUser = db.users.find((u) => u.user_id === user.user_id);
    if (dbUser) {
      dbUser.role = role;
      saveDb(db);
    }
    res.json({ ok: true, role });
  });

  router.post("/auth/session", async (req, res) => {
    const { session_id } = req.body;
    const db = getDb();
    const user = db.users?.find((u: any) => u.user_id === session_id) || {
      user_id: session_id || "dev-user-id-12345",
      email: "user@example.com",
      name: "Authenticated User",
      role: "creator"
    };
    res.json({ ok: true, user, token: session_id || "demo-token" });
  });


}
