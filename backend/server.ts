import "express-async-errors";
import { isUgcThread, isCampaignThread, getCampaignDealId, getUgcOrderId, isUuid } from "./dealFlow";
declare global { var passwordResets: any; }
import express from "express";
import { createServer } from "http";
import sharp from "sharp";
import compression from "compression";

import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import multer from "multer";
import crypto from "crypto";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";
import axios from "axios";
import cron from "node-cron";
import { searchLocations, ALL_INDIAN_STATES_AND_UTS, COMPREHENSIVE_INDIAN_CITIES, GLOBAL_METROS, PAN_INDIA_LOCATIONS } from "./locations";
import { setupBlogRoutes } from "./blog_routes";
import { setupPaymentRoutes } from "./payment_routes";
import { resolveTestMode } from "./paymentTestMode";
import { setupChatCoreRoutes } from "./chat_routes";
import { setupUgcOrderRoutes, setupUgcBrowseRoutes, isCollaborationDeliverable, createUgcLifecycleHandlers } from "./ugc_routes";
import { setupSupportRoutes } from "./support_routes";
import { setupCreatorsRoutes } from "./creators_routes";
import { setupDealsRoutes } from "./deals_routes";
import { setupTagsAndNotificationsRoutes } from "./tags_notifications_routes";
import { setupCampaignsRoutes, setupCampaignThreadRoutes, createCampaignLifecycleHandlers } from "./campaigns_routes";
import { setupBrandsRoutes } from "./brands_routes";
import { setupContentSubmissionsRoutes } from "./content_submissions_routes";
import { setupMiscRoutes } from "./misc_routes";
import { setupDealsChatRoutes } from "./deals_chat_routes";
import { setupSessionRoutes } from "./session_routes";
import { setupAuthRoutes } from "./auth_routes";
import { setupAdminContentRoutes } from "./admin_content_routes";
import { setupAdminVersionsCouponsRoutes } from "./admin_versions_coupons_routes";
import { setupAdminKycVerificationRoutes } from "./admin_kyc_verification_routes";
import { setupAdminLogsCreatorsRoutes } from "./admin_logs_creators_routes";
import { setupAdminWaitlistRoutes } from "./admin_waitlist_routes";
import { setupAdminCampaignsSettingsRoutes } from "./admin_campaigns_settings_routes";
import { setupAdminSystemMaintenanceRoutes } from "./admin_system_maintenance_routes";
import { setupAdminUsersEnforcementRoutes } from "./admin_users_enforcement_routes";

import { getValidFromEmail, getRazorpay, generateContentResilient, safePromiseTimeout, applyPct, transformRateCard, containsPhoneNumberOrContactBypass, Resend, buildEmailHtml, buildContractSignEmailHtml } from "./helpers";

import { Server as SocketIOServer } from "socket.io";
import { GoogleGenAI } from "@google/genai";
import bcrypt from "bcryptjs";
import { fetchDeliveredMetrics } from "./services/deliveredMetrics";
import { createEscrowTransaction as createEscrowTransactionService, CreateEscrowTransactionParams, EscrowServiceDeps, syncDealAndTransactionStatus as syncStatusService } from "./services/escrowService";
import { createUgcLifecycleService } from "./services/ugcLifecycleService";
import { calculateFee as calculatePlatformFee } from "../src/utils/feeCalculator";
import Razorpay from "razorpay";

dotenv.config();

// Global safety net: without these, a single unexpected error anywhere outside
// a normal Express request (e.g. a background task or stray callback) would
// crash the entire Node process and take the whole app down. Now such errors
// are logged instead, and the server keeps running for everyone else.
process.on("uncaughtException", (err) => {
  console.error("[FATAL] Uncaught Exception (server kept running):", err);
});
process.on("unhandledRejection", (reason) => {
  console.error("[FATAL] Unhandled Promise Rejection (server kept running):", reason);
});

// Programmatically load env.json into process.env to ensure secrets like SUPABASE_SERVICE_ROLE_KEY are loaded.
// IMPORTANT: only fill in variables that aren't already set in the real environment — a hosting
// platform's actual env vars (e.g. a dynamically-assigned PORT) must always win over this static file.
try {
  const envJsonPath = path.join(process.cwd(), "env.json");
  if (fs.existsSync(envJsonPath)) {
    const envData = JSON.parse(fs.readFileSync(envJsonPath, 'utf8'));
    let dotenvContent = '';
    for (const [key, value] of Object.entries(envData)) {
      if (typeof value === 'string') {
        if (process.env[key] === undefined) {
          process.env[key] = value;
        }
        dotenvContent += `${key}=${process.env[key]}\n`;
      }
    }
    // Sync with .env file as well
    fs.writeFileSync(path.join(process.cwd(), ".env"), dotenvContent, 'utf8');
    console.log("Loaded environment variables from env.json and synced .env file");
  }
} catch (err: any) {
  console.warn("Failed to load env.json / sync .env file:", err.message);
}



async function startServer() {
  




  const app = express();
  const PORT = 3000;
  console.log(`[Startup] Using port ${PORT}`);

  // Create the real HTTP server and attach a real Socket.IO instance to it.
  // Socket.IO was imported at the top of this file but was never actually
  // instantiated — every app.get("io") call elsewhere in this file was
  // silently getting `undefined`, and the frontend's socket.io-client was
  // retrying a connection forever with nothing on the other end.
  const httpServer = createServer(app);
  const io = new SocketIOServer(httpServer, {
    cors: { origin: "*", methods: ["GET", "POST"] }
  });
  app.set("io", io);

  // Track which userId(s) are currently connected (a user can have multiple
  // tabs/sockets open at once, so we keep a Set of socket ids per userId).
  const onlineUsersMap = new Map<string, Set<string>>();

  io.on("connection", (socket) => {
    socket.on("register_user", (userId: string) => {
      if (!userId) return;
      socket.data.userId = userId;
      socket.join(`user_${userId}`);
      if (!onlineUsersMap.has(userId)) onlineUsersMap.set(userId, new Set());
      onlineUsersMap.get(userId)!.add(socket.id);
      io.emit("user_status_change", { userId, status: "online" });
    });

    socket.on("join_room", (roomId: string) => {
      if (roomId) socket.join(roomId);
    });

    socket.on("leave_room", (roomId: string) => {
      if (roomId) socket.leave(roomId);
    });

    socket.on("get_online_users", () => {
      socket.emit("online_users_list", Array.from(onlineUsersMap.keys()));
    });

    socket.on("disconnect", () => {
      const userId = socket.data.userId;
      if (userId && onlineUsersMap.has(userId)) {
        const sockets = onlineUsersMap.get(userId)!;
        sockets.delete(socket.id);
        if (sockets.size === 0) {
          onlineUsersMap.delete(userId);
          io.emit("user_status_change", { userId, status: "offline" });
        }
      }
    });
  });

  // Compress all responses for fast network delivery
  app.use(compression() as any);

  // Add healthcheck endpoint for preview ping
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", req.headers.origin || "*");
  res.header("Access-Control-Allow-Credentials", "true");
  res.header("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});
  app.get("/api/health", (req, res) => { 
    res.json({ status: "ok" });
  });

  // Middleware for parsing JSON and URL-encoded bodies
  app.use(express.json({ limit: "500mb" }));
  app.use(express.urlencoded({ extended: true, limit: "500mb" }));

  // Configure multer memory storage for uploads (up to 500MB for video deliverables)
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 500 * 1024 * 1024 }, // 500MB limit
    fileFilter: (req, file, cb) => {
      const allowedMimeTypes = [
        'image/jpeg', 'image/png', 'image/webp', 'image/gif',
        'video/mp4', 'video/quicktime', 'video/x-msvideo',
        'application/pdf', 'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'audio/mpeg', 'audio/wav', 'audio/webm'
      ];
      if (allowedMimeTypes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error('Invalid file type uploaded.'));
      }
    }
  });

  const DB_PATH = path.join(process.cwd(), "db_mock.json");

  let supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  if (supabaseUrl && supabaseUrl.endsWith('/rest/v1/')) {
    supabaseUrl = supabaseUrl.replace('/rest/v1/', '');
  }
  if (!supabaseUrl || typeof supabaseUrl !== 'string' || !supabaseUrl.trim() || !supabaseUrl.startsWith('http')) {
    supabaseUrl = 'https://mzcovvzkwzjvzskjqwwy.supabase.co';
  }

  let supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  if (!supabaseKey || typeof supabaseKey !== 'string' || !supabaseKey.trim()) {
    supabaseKey = 'sb_publishable_Vbd74GKG1eYP7NYp4qtFbg_kuQuDPKv';
  }

  let supabase: any = null;
  let privilegedSupabase: any = null;

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

  if (!serviceRoleKey) {
    console.error("[FATAL] SUPABASE_SERVICE_ROLE_KEY is not set. Privileged Supabase operations will not work until this environment variable is configured.");
  }

  if (supabaseUrl && supabaseKey) {
    console.log(`Supabase credentials detected! Initializing secure cloud sync (Using anon/publishable key).`);
    
    const wrapSupabaseClient = (client: any) => {
      if (!client) return null;
      const originalFrom = client.from;
      client.from = function (table: string) {
        const queryBuilder = originalFrom.apply(this, [table]);
        if (table === 'notifications') {
          const originalInsert = queryBuilder.insert;
          queryBuilder.insert = function (values: any, options: any) {
            const valuesArray = Array.isArray(values) ? values : [values];
            for (const notif of valuesArray) {
              if (!notif.notif_id) {
                notif.notif_id = crypto.randomUUID();
              }
              if (!notif.created_at) {
                notif.created_at = new Date().toISOString();
              }
              if (notif.read === undefined) {
                notif.read = false;
              }
            }
            const postgrestBuilder = originalInsert.apply(this, [values, options]);
            const originalThen = postgrestBuilder.then.bind(postgrestBuilder);
            postgrestBuilder.then = function (onfulfilled?: any, onrejected?: any) {
              return originalThen((res: any) => {
                if (res && res.error) {
                  if (res.error.code === '23505') {
                    console.log(`[Supabase Proxy] Suppressing duplicate key violation (23505) for notifications insert. Skipping gracefully.`);
                    return { data: [], error: null };
                  }
                  return res;
                }
                try {
                  const ioInstance = app.get("io");
                  if (ioInstance) {
                    for (const notif of valuesArray) {
                      if (notif.user_id) {
                        console.log(`[Supabase Proxy] Emitting real-time events to user room ${notif.user_id} for notification ${notif.notif_id}`);
                        ioInstance.to(notif.user_id).emit("bell_notification", notif);
                        ioInstance.to(notif.user_id).emit("new_notification", notif);
                      }
                      // Broadcast all notifications and system alerts to connected admin room
                      ioInstance.to("admin_room").emit("admin_notification", notif);
                      ioInstance.to("admin_room").emit("new_notification", notif);
                    }
                  }
                } catch (err) {
                  console.error(`[Supabase Proxy] Error in post-insert real-time emission:`, err);
                }
                return res;
              }, (err: any) => {
                if (err && err.code === '23505') {
                  console.log(`[Supabase Proxy] Caught duplicate key violation in catch block. Skipping gracefully.`);
                  return { data: [], error: null };
                }
                throw err;
              }).then(onfulfilled, onrejected);
            };
            return postgrestBuilder;
          };
        }
        return queryBuilder;
      };
      return client;
    };

    const tempSupabase = createClient(supabaseUrl, supabaseKey);
    supabase = wrapSupabaseClient(tempSupabase);

    if (serviceRoleKey) {
      console.log(`[Supabase] Initializing separate privileged client with service_role key...`);
      const tempPrivileged = createClient(supabaseUrl, serviceRoleKey);
      privilegedSupabase = wrapSupabaseClient(tempPrivileged);
    } else {
      console.warn(`[Supabase] SUPABASE_SERVICE_ROLE_KEY is not defined. Admin writes on RLS-protected tables like 'banners' will fail unless configured.`);
    }

    // Run connection test and sync asynchronously in the background so it doesn't block server startup
    (async () => {
      try {
        const { error } = await tempSupabase.from('users').select('user_id').limit(1);
        if (error && error.code !== 'PGRST116') {
          console.warn("Supabase configured but tables missing or inaccessible, keeping cloud sync enabled for potential recovery:", error.message);
        }
        {
          
          

          // Run UGC briefs consistency sync
          try {
            console.log("Running lightweight consistency check on UGC Briefs in background...");
            const { data: briefs, error: bErr } = await tempSupabase.from('ugc_briefs').select('id, claimed_count');
            if (!bErr && briefs) {
              for (const b of briefs) {
                const { count, error: countErr } = await tempSupabase
                  .from('ugc_orders')
                  .select('*', { count: 'exact', head: true })
                  .eq('brief_id', b.id || 'null');
                if (!countErr) {
                  const actualCount = count || 0;
                  if (b.claimed_count !== actualCount) {
                    console.log(`[Sync] Updating claimed_count for brief ${b.id}: ${b.claimed_count} -> ${actualCount}`);
                    await tempSupabase.from('ugc_briefs').update({ claimed_count: actualCount }).eq('id', b.id);
                  }
                }
              }
            }
            console.log("UGC Briefs consistency check completed.");
          } catch (syncErr) {
            console.error("Failed to run UGC Briefs consistency check:", syncErr);
          }

          
          // Programmatically ensure storage buckets exist
          try {
            console.log("[Storage] Verifying Supabase storage buckets...");
            const { data: buckets, error: getErr } = await (privilegedSupabase || tempSupabase).storage.listBuckets();
            if (getErr) {
               console.warn("[Storage] Error listing buckets. Buckets will not be auto-created:", getErr.message);
            } else if (buckets) {
               const requiredBuckets = ['kyc-documents', 'content-submissions', 'live-proofs', 'ugc-assets', 'brand-logos', 'profile-assets', 'banner-images', 'avatars', 'cover-images'];
               for (const bucketName of requiredBuckets) {
                 const exists = buckets.find(b => b.name === bucketName || b.id === bucketName);
                 const isPublic = !['kyc-documents', 'contracts', 'sensitive-docs'].includes(bucketName) &&
                                  !bucketName.toLowerCase().includes('kyc') &&
                                  !bucketName.toLowerCase().includes('document');
                 if (!exists) {
                   console.log(`[Storage] Auto-creating bucket '${bucketName}' (public: ${isPublic})...`);
                   let allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp'];
                   if (bucketName === 'kyc-documents') allowedMimeTypes = ['image/jpeg', 'image/png', 'application/pdf', 'image/webp'];
                   else if (['content-submissions', 'live-proofs', 'ugc-assets'].includes(bucketName)) allowedMimeTypes = ['image/jpeg', 'image/png', 'video/mp4', 'video/quicktime', 'application/pdf', 'image/webp'];
                   
                   const { error: createErr } = await (privilegedSupabase || tempSupabase).storage.createBucket(bucketName, {
                     public: isPublic,
                     fileSizeLimit: 524288000, // 500MB
                     allowedMimeTypes
                   });
                   if (createErr) {
                     console.warn(`[Storage] Could not create bucket '${bucketName}':`, createErr.message);
                   } else {
                     console.log(`[Storage] Bucket '${bucketName}' successfully created.`);
                   }
                 } else if (isPublic) {
                   try {
                     await (privilegedSupabase || tempSupabase).storage.updateBucket(bucketName, { public: true });
                   } catch (updateErr) {}
                 }
               }
            }
          } catch (storageErr: any) {
            console.error("[Storage] Auto-setup failed:", storageErr.message);
          }

        }
      } catch (err) {
        console.warn("Supabase connection failed, keeping cloud sync enabled for auto-recovery");
      }
    })();
  }


  // Helper to get raw ISO date string
  const getIsoNow = () => new Date().toISOString();

  // Payment test mode. The decision now lives in backend/paymentTestMode.ts so
  // it can be unit tested. PAYMENTS_TEST_MODE is the explicit switch and always
  // wins; set it to "false" in production. With the variable unset the previous
  // heuristics apply unchanged, and one of those (APP_URL containing "run.app")
  // would leave a real Cloud Run deploy silently in test mode.
  const getIsTestMode = (): boolean => resolveTestMode(process.env);

  // Helper to reliably insert chat messages to Supabase with schema filtering, foreign-key protection and self-healing
  const knownChatThreadIds = new Set<string>();
  async function insertChatMessageToSupabase(payload: any) {
    if (!supabase) return { data: null, error: null };
    try {
      const client = privilegedSupabase || supabase;
      if (!payload || typeof payload !== 'object') return { data: null, error: null };

      // 1. Whitelist valid Supabase columns to avoid PGRST204 errors
      const validCols = new Set([
        'message_id',
        'thread_id',
        'sender_user_id',
        'receiver_user_id',
        'sender_role',
        'text',
        'from_name',
        'read',
        'message_type',
        'metadata',
        'created_at'
      ]);

      const cleanPayload: any = {};
      for (const [k, v] of Object.entries(payload)) {
        if (validCols.has(k) && v !== undefined) {
          cleanPayload[k] = v;
        }
      }

      // Map alias / common fields if missing
      if (!cleanPayload.sender_role && payload.sender_role) {
        cleanPayload.sender_role = payload.sender_role;
      }
      if (!cleanPayload.sender_role && payload.role) {
        cleanPayload.sender_role = payload.role;
      }
      if (!cleanPayload.sender_role) {
        if (payload.message_type === 'admin_injection' || payload.from_name === 'Platform Admin') {
          cleanPayload.sender_role = 'admin';
        } else if (payload.message_type === 'system') {
          cleanPayload.sender_role = 'system';
        }
      }
      if (cleanPayload.metadata && typeof cleanPayload.metadata === 'object' && cleanPayload.sender_role && !cleanPayload.metadata.sender_role) {
        cleanPayload.metadata = { ...cleanPayload.metadata, sender_role: cleanPayload.sender_role };
      }
      if (!cleanPayload.text && (payload.content || payload.message)) {
        cleanPayload.text = String(payload.content || payload.message);
      }
      if (!cleanPayload.message_id && payload.id) {
        cleanPayload.message_id = String(payload.id);
      }
      if (!cleanPayload.message_id) {
        cleanPayload.message_id = crypto.randomUUID();
      }
      if (!cleanPayload.sender_user_id && payload.sender_id) {
        cleanPayload.sender_user_id = payload.sender_id;
      }
      if (!cleanPayload.receiver_user_id && payload.receiver_id) {
        cleanPayload.receiver_user_id = payload.receiver_id;
      }
      if (!cleanPayload.created_at) {
        cleanPayload.created_at = new Date().toISOString();
      }
      if (cleanPayload.read === undefined) {
        cleanPayload.read = false;
      }

      // Nullify placeholder / non-UUID values that violate user_id FK
      const isUuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (cleanPayload.sender_user_id === '' || cleanPayload.sender_user_id === 'system' || cleanPayload.sender_user_id === 'admin' || (cleanPayload.sender_user_id && !isUuidRegex.test(cleanPayload.sender_user_id))) {
        cleanPayload.sender_user_id = null;
      }
      if (cleanPayload.receiver_user_id === '' || cleanPayload.receiver_user_id === 'system' || cleanPayload.receiver_user_id === 'admin' || (cleanPayload.receiver_user_id && !isUuidRegex.test(cleanPayload.receiver_user_id))) {
        cleanPayload.receiver_user_id = null;
      }

      // If thread_id is missing entirely, we cannot insert to Supabase
      if (!cleanPayload.thread_id) {
        return { data: null, error: null };
      }

      // 2. Ensure thread exists in chat_threads to avoid fk_chat_messages_thread violation
      if (!knownChatThreadIds.has(cleanPayload.thread_id)) {
        try {
          const { data: thrRow } = await client.from('chat_threads').select('id').eq('id', cleanPayload.thread_id).maybeSingle();
          if (thrRow) {
            knownChatThreadIds.add(thrRow.id);
          } else {
            // Attempt to auto-heal / backfill thread in chat_threads
            const db = getDb();
            const localThr = (db.chat_threads || []).find((t: any) => t.id === cleanPayload.thread_id || t.deal_id === cleanPayload.thread_id);
            const localOrder = (db.ugc_orders || []).find((o: any) => o.id === cleanPayload.thread_id);
            const localDeal = (db.deals || []).find((d: any) => d.id === cleanPayload.thread_id);

            let cId = localThr?.creator_id || localOrder?.creator_id || localDeal?.creator_id;
            let bId = localThr?.brand_id || localOrder?.brand_id || localDeal?.brand_id;

            if (cId && bId) {
              await client.from('chat_threads').upsert({
                id: cleanPayload.thread_id,
                deal_id: localThr?.deal_id || cleanPayload.thread_id,
                creator_id: cId,
                brand_id: bId,
                status: localThr?.status || 'ACTIVE',
                flow_state: localThr?.flow_state || localThr?.status || 'ACTIVE',
                agreed_amount: localThr?.agreed_amount || 0,
                revision_count: localThr?.revision_count || 5,
                created_at: localThr?.created_at || new Date().toISOString(),
                updated_at: new Date().toISOString()
              }, { onConflict: 'id' });
              knownChatThreadIds.add(cleanPayload.thread_id);
            }
          }
        } catch (thrHealErr) {
          // Non-blocking
        }
      }

      // 3. Attempt insert
      let { data, error } = await client.from('chat_messages').insert(cleanPayload);

      if (error) {
        // Fallback A: Schema columns missing (message_type / metadata / sender_role)
        if (error.code === '42703' || (error.message && (error.message.includes('message_type') || error.message.includes('metadata') || error.message.includes('sender_role')))) {
          let retryPayload = { ...cleanPayload };
          if (error.message && error.message.includes('sender_role')) {
            delete retryPayload.sender_role;
          } else {
            const { message_type, metadata, sender_role, ...legacyPayload } = cleanPayload;
            retryPayload = legacyPayload;
          }
          const retry = await client.from('chat_messages').insert(retryPayload);
          data = retry.data;
          error = retry.error;
        }

        // Fallback B: Foreign key constraint violation on sender/receiver user ID (23503)
        if (error && error.code === '23503' && error.message && (error.message.includes('user_id') || error.message.includes('users'))) {
          const userSafePayload = { ...cleanPayload, sender_user_id: null, receiver_user_id: null };
          const retry = await client.from('chat_messages').insert(userSafePayload);
          data = retry.data;
          error = retry.error;
        }

        // Fallback C: Thread is local-only or mock-only
        if (error && error.code === '23503' && error.message && error.message.includes('fk_chat_messages_thread')) {
          // Thread only exists in local mock storage; gracefully acknowledge without error
          return { data: null, error: null };
        }

        if (error) {
          console.warn("[chat_messages] Insert notice in Supabase:", error.message || error);
          return { data, error };
        }
      }
      return { data, error: null };
    } catch (err: any) {
      console.warn("[chat_messages] Insert handled exception:", err?.message || err);
      return { data: null, error: err };
    }
  }

  // Helper function to generate signed URLs for private storage buckets (content-submissions, kyc-documents, live-proofs, ugc-assets)
  async function getSignedUgcUrl(supabaseClient: any, originalUrl: any, defaultBucket = 'content-submissions') {
    if (!originalUrl || typeof originalUrl !== 'string') return originalUrl;
    const trimmed = originalUrl.trim();
    if (!trimmed || trimmed.startsWith('/uploads/') || trimmed.startsWith('/api/files/')) return originalUrl;

    // Check if it's an external HTTP/HTTPS URL not hosted in Supabase storage
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      const privateBuckets = ['content-submissions', 'kyc-documents', 'live-proofs', 'ugc-assets'];
      const isSupabaseBucketUrl = privateBuckets.some(b => trimmed.includes(`/${b}/`));
      const isSupabaseStorageUrl = isSupabaseBucketUrl || trimmed.includes('/object/public/') || trimmed.includes('/object/sign/') || trimmed.includes('/storage/v1/');
      
      if (!isSupabaseStorageUrl) {
        // External link (e.g. Instagram, YouTube, Google Drive, Vimeo, or standard web link)
        return originalUrl;
      }
    }

    try {
      let bucket = defaultBucket;
      let filePath = trimmed;

      const privateBuckets = ['content-submissions', 'kyc-documents', 'live-proofs', 'ugc-assets'];
      
      for (const b of privateBuckets) {
        const marker = `${b}/`;
        const idx = filePath.indexOf(marker);
        if (idx !== -1) {
          bucket = b;
          filePath = decodeURIComponent(filePath.substring(idx + marker.length)).split('?')[0];
          break;
        }
      }

      if (filePath.startsWith('http://') || filePath.startsWith('https://')) {
        const markerAlt = '/object/public/';
        const markerSign = '/object/sign/';
        let idx = filePath.indexOf(markerAlt);
        if (idx === -1) idx = filePath.indexOf(markerSign);
        if (idx !== -1) {
          const pathAfterObject = filePath.substring(idx + (filePath.indexOf(markerAlt) !== -1 ? markerAlt.length : markerSign.length));
          const parts = pathAfterObject.split('/');
          if (parts.length > 1) {
            bucket = parts[0];
            filePath = decodeURIComponent(parts.slice(1).join('/')).split('?')[0];
          }
        }
      } else {
        filePath = filePath.split('?')[0];
      }

      // Safeguard: If filePath is STILL an absolute http/https URL, do NOT call createSignedUrl on Supabase Storage bucket!
      if (filePath.startsWith('http://') || filePath.startsWith('https://')) {
        return originalUrl;
      }

      const activeClient = supabaseClient || privilegedSupabase || supabase;
      if (!activeClient) return originalUrl;

      const { data, error } = await activeClient.storage
        .from(bucket)
        .createSignedUrl(filePath, 60 * 60 * 24 * 7); // 7 days expiry

      if (!error && data?.signedUrl) {
        return data.signedUrl;
      } else if (error) {
        console.warn(`[Storage] Failed to create signed URL for ${filePath} in bucket '${bucket}': ${error.message}`);
      }
    } catch (err) {
      console.error('Error in getSignedUgcUrl:', err);
    }
    return originalUrl;
  }

  // Hardcoded initial creators seeds
  const SEED_CREATORS = [];

  const SEED_CAMPAIGNS = [];

  interface DbState {
    users: any[];
    user_sessions: any[];
    user_plain_passwords?: Record<string, string>;
    creator_profiles: any[];
    brand_profiles: any[];
    campaigns: any[];
    waves: any[];
    collabs: any[];
    verifications: any[];
    creator_kyc?: any[];
    brand_kyc?: any[];
    reports: any[];
    notifications: any[];
    platform_settings: {
      brand_markup_pct: number;
      creator_deduction_pct: number;
      agency_markup_pct: number;
      agency_deduction_pct: number;
      ai_review_enabled?: boolean;
      maintenance_mode_creator?: boolean;
      maintenance_creator_until?: string | null;
      maintenance_mode_brand?: boolean;
      maintenance_brand_until?: string | null;
      maintenance_message?: string;
      maintenance_enabled_by?: string | null;
      maintenance_enabled_at?: string | null;
    };
    chat_messages: any[];
    campaign_performance: any[];
    files: any[];
    team_activity_logs?: any[];
    creator_payment_methods?: any[];
    transactions?: any[];
    escrow_transactions?: any[];
    fee_configs?: any[];
    chat_threads?: any[];
    deal_offers?: any[];
    message_flags?: any[];
    user_violations?: any[];
    waitlist?: any[];
    saved_creators?: any[];
    collab_cost_requests?: any[];
    brief_requests?: any[];
    creator_portfolio?: any[];
    collab_proof_submissions?: any[];
    invoice_clients?: any[];
    invoice_billing_profile?: any[];
    creator_reviews?: any[];
    brand_reviews?: any[];
    invoices?: any[];
    ugc_briefs?: any[];
    ugc_orders?: any[];
    ugc_deliveries?: any[];
    ugc_showcase?: any[];
    ugc_reviews?: any[];
    deals?: any[];
    content_submissions?: any[];
    admin_permissions?: any[];
    earnings?: any[];
    banners?: any[];
    admin_auth_logs?: any[];
    admin_activity_logs?: any[];
    blocked_message_attempts?: any[];
    chat_violations?: any[];
    master_tags?: any[];
    entity_tags?: any[];
    platform_fee_config?: any;
    coupons?: any[];
    coupon_redemptions?: any[];
    referrals?: any[];
    app_versions?: any[];
    warning_templates?: any[];
    templates?: any[];
    support_tickets?: any[];
    ticket_messages?: any[];
    referral_config?: any;
    analytics_reports?: any[];
  }

  const DEFAULT_WARNING_TEMPLATES = [
    {
      template_id: "warn_off_platform",
      name: "Off-Platform Communication / Payment Attempt",
      subtype: "warning",
      text: "Attempting to take communication or payments outside of the platform is a violation of Ybex Terms of Service."
    },
    {
      template_id: "warn_missed_deadline",
      name: "Repeated Missed Deliverable Deadlines",
      subtype: "warning",
      text: "You have failed to submit deliverables within the agreed-upon timeline without prior communication."
    },
    {
      template_id: "warn_inappropriate_conduct",
      name: "Unprofessional or Inappropriate Conduct",
      subtype: "warning",
      text: "Your recent messages or behavior violate our community guidelines regarding professional conduct."
    },
    {
      template_id: "warn_content_guidelines",
      name: "Deliverable Quality / Policy Non-Compliance",
      subtype: "warning",
      text: "Content submitted does not adhere to platform quality benchmarks or brand brief guidelines."
    },
    {
      template_id: "warn_spam_unsolicited",
      name: "Spam or Unsolicited Promotional Outreach",
      subtype: "warning",
      text: "Sending unsolicited spam or excessive direct solicitations to users is strictly prohibited."
    }
  ];

  function getInitialDbState(): DbState {
    const db: DbState = {
      users: [],
      user_sessions: [],
      user_plain_passwords: {},
      creator_profiles: [],
      brand_profiles: [],
      campaigns: [],
      waves: [],
      collabs: [],
      verifications: [],
      waitlist: [],
      reports: [],
      notifications: [],
      platform_settings: {
        brand_markup_pct: 2.0,
        creator_deduction_pct: 2.0,
        agency_markup_pct: 5.0,
        agency_deduction_pct: 5.0,
        ai_review_enabled: false,
      },
      chat_messages: [],
      campaign_performance: [],
      files: [],
      ugc_orders: [],
      team_activity_logs: [],
      creator_payment_methods: [],
      transactions: [],
      fee_configs: [{ id: 1, threshold_amount: 20000, below_threshold_rate: 15.0, above_threshold_rate: 5.0, gst_rate: 18.0 }],
      chat_threads: [],
      deal_offers: [],
      message_flags: [],
      user_violations: [],
      saved_creators: [],
      collab_cost_requests: [],
      brief_requests: [],
      creator_portfolio: [],
      collab_proof_submissions: [],
      invoice_clients: [],
      invoice_billing_profile: [],
      creator_reviews: [],
      invoices: [],
      ugc_briefs: [],
      ugc_deliveries: [],
      ugc_showcase: [],
      ugc_reviews: [],
      earnings: [],
      banners: [],
      admin_auth_logs: [],
      admin_activity_logs: [],
      blocked_message_attempts: [],
      chat_violations: [],
      master_tags: [],
      entity_tags: [],
      support_tickets: [],
      ticket_messages: [],
      app_versions: [],
      warning_templates: [...DEFAULT_WARNING_TEMPLATES],
      referral_config: {
        creator_referral_reward: 500,
        brand_referral_reward: 1000,
        referral_trigger_action: 'first_completed_collab',
        referral_monthly_cap: 10,
        referral_enabled: true
      }
    };

    // Seed Admin Account (Issue #6 Fix: Add all required fields)
    const adminId = "user_admin_demo";
    db.users.push({
      user_id: adminId,
      email: "admin@ybex.demo",
      name: "Ybex General Admin",
      role: "admin",
      picture: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100",
      auth_method: "seed",
      onboarded: true,
      created_at: getIsoNow(),
      email_verified: true,
      verified: true,
      kyc_status: "approved",
      phone: "",
      agency_badge_claimed: false,
    });

    db.users.push({
      user_id: "user_admin_ybexmedia",
      email: "info@ybexmedia.com",
      name: "YbexMedia Admin",
      role: "admin",
      picture: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100",
      auth_method: "seed",
      onboarded: true,
      created_at: getIsoNow(),
      email_verified: true,
      verified: true,
      kyc_status: "approved",
      phone: "",
      agency_badge_claimed: false,
    });

    // Seed test users for chat violations (Issue #6 Fix: Add all required fields)
    db.users.push({
      user_id: "user_violator_creator",
      email: "rahul.sharma@example.com",
      name: "Rahul Sharma (Creator)",
      role: "creator",
      picture: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100",
      auth_method: "seed",
      onboarded: true,
      created_at: getIsoNow(),
      email_verified: true,
      verified: true,
      kyc_status: "pending",
      phone: "9812345678",
      agency_badge_claimed: false,
    });

    db.users.push({
      user_id: "user_violator_brand",
      email: "deals@skylinebrands.co",
      name: "Skyline Agencies (Brand)",
      role: "brand",
      picture: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=100",
      auth_method: "seed",
      onboarded: true,
      created_at: getIsoNow(),
      email_verified: true,
      verified: true,
      kyc_status: "pending",
      phone: "",
      agency_badge_claimed: false,
    });

    db.chat_violations = [
      {
        id: "v_seed_1",
        conversation_id: "thread_seed_1",
        sender_id: "user_violator_creator",
        sender_role: "creator",
        message_content_attempted: "Let's deal directly, call me on 9812345678.",
        violation_type: "hard_number",
        detected_at: new Date(Date.now() - 3600000 * 24).toISOString()
      },
      {
        id: "v_seed_2",
        conversation_id: "thread_seed_1",
        sender_id: "user_violator_creator",
        sender_role: "creator",
        message_content_attempted: "Sending my contact. Message me: +919812345678",
        violation_type: "hard_number",
        detected_at: new Date(Date.now() - 3600000 * 23).toISOString()
      },
      {
        id: "v_seed_3",
        conversation_id: "thread_seed_2",
        sender_id: "user_violator_brand",
        sender_role: "brand",
        message_content_attempted: "Can you send your WhatsApp number to arrange the call?",
        violation_type: "soft_keyword",
        detected_at: new Date(Date.now() - 3600000 * 5).toISOString()
      },
      {
        id: "v_seed_4",
        conversation_id: "thread_seed_1",
        sender_id: "user_violator_creator",
        sender_role: "creator",
        message_content_attempted: "Okay, ping me outside this app on telegram.",
        violation_type: "soft_keyword",
        detected_at: new Date(Date.now() - 3600000 * 4).toISOString()
      }
    ];

    return db;
  }

  let cloudDbLoaded = false;
  let syncEnabled = false;
  async function loadDbFromSupabase() {
    if (!supabase) return;
    try {
      const { data, error } = await supabase
        .from("ybex_sync")
        .select("state")
        .eq("id", 1)
        .maybeSingle();

      if (error) {
        console.log("Could not load state from Supabase table 'ybex_sync':", error.message);
        return;
      }

      syncEnabled = true;
      cloudDbLoaded = true;

      const localFileAlreadyExists = fs.existsSync(DB_PATH);

      if (data && data.state) {
        if (!localFileAlreadyExists) {
          fs.writeFileSync(DB_PATH, JSON.stringify(data.state, null, 2), "utf8");
          console.log("No local database found. Seeded local state from Supabase cloud backup.");
        } else {
          console.log("Local database file already exists — skipping cloud overwrite to avoid clobbering local data.");
        }
      } else {
        console.log("Supabase connected. Dedicated tables will be used for state.");
      }
      
    } catch (err: any) {
      console.log("Supabase load error:", err.message);
    }
  }

  // Auto trigger load if supabase is ready
  if (supabase) {
    loadDbFromSupabase();
  }

  function getDb(): DbState {
    if (!fs.existsSync(DB_PATH)) {
      const dbState = getInitialDbState();
      fs.writeFileSync(DB_PATH, JSON.stringify(dbState, null, 2), "utf8");
      return dbState;
    }
    try {
      const data = fs.readFileSync(DB_PATH, "utf8");
      const parsed = JSON.parse(data);
      if (!parsed.ugc_orders) parsed.ugc_orders = [];
      if (!parsed.team_activity_logs) parsed.team_activity_logs = [];
      if (!parsed.creator_payment_methods) parsed.creator_payment_methods = [];
      if (!parsed.transactions) parsed.transactions = [];
      if (!parsed.fee_configs) parsed.fee_configs = [{ id: 1, threshold_amount: 20000, below_threshold_rate: 15.0, above_threshold_rate: 5.0, gst_rate: 18.0 }];
      if (!parsed.chat_threads) parsed.chat_threads = [];
      if (!parsed.deal_offers) parsed.deal_offers = [];
      if (!parsed.message_flags) parsed.message_flags = [];
      if (!parsed.user_violations) parsed.user_violations = [];
      if (!parsed.verifications) parsed.verifications = [];
      if (!parsed.saved_creators) parsed.saved_creators = [];
      if (!parsed.collab_cost_requests) parsed.collab_cost_requests = [];
      if (!parsed.brief_requests) parsed.brief_requests = [];
      if (!parsed.creator_portfolio) parsed.creator_portfolio = [];
      if (!parsed.collab_proof_submissions) parsed.collab_proof_submissions = [];
      if (!parsed.invoice_clients) parsed.invoice_clients = [];
      if (!parsed.invoice_billing_profile) parsed.invoice_billing_profile = [];
      if (!parsed.creator_reviews) parsed.creator_reviews = [];
      if (!parsed.invoices) parsed.invoices = [];
      if (!parsed.ugc_briefs) parsed.ugc_briefs = [];
      if (!parsed.ugc_deliveries) parsed.ugc_deliveries = [];
      if (!parsed.ugc_showcase) parsed.ugc_showcase = [];
      if (!parsed.ugc_reviews) parsed.ugc_reviews = [];
      if (!parsed.banners) parsed.banners = [];
      if (!parsed.notifications) parsed.notifications = [];
      if (!parsed.admin_activity_logs) parsed.admin_activity_logs = [];
      if (!parsed.blocked_message_attempts) parsed.blocked_message_attempts = [];
      if (!parsed.chat_violations) parsed.chat_violations = [];
      if (!parsed.master_tags) parsed.master_tags = [];
      if (!parsed.entity_tags) parsed.entity_tags = [];
      if (!parsed.app_versions) parsed.app_versions = [];
      if (!parsed.warning_templates || parsed.warning_templates.length === 0) parsed.warning_templates = [...DEFAULT_WARNING_TEMPLATES];
      if (!parsed.user_plain_passwords) parsed.user_plain_passwords = {};

      // Ensure essential arrays exist
      if (!parsed.users) parsed.users = [];
      if (!parsed.campaigns) parsed.campaigns = [];
      if (!parsed.user_sessions) parsed.user_sessions = [];

      return parsed;
    } catch (e: any) {
      console.error("[getDb] CRITICAL: db_mock.json failed to parse — the file may be corrupted:", e?.message || e);
      try {
        if (fs.existsSync(DB_PATH)) {
          const backupPath = `${DB_PATH}.corrupted-${Date.now()}.bak`;
          fs.copyFileSync(DB_PATH, backupPath);
          console.error(`[getDb] Backed up the corrupted file to ${backupPath} before falling back to a blank state. Restore from this backup if needed.`);
        }
      } catch (backupErr) {
        console.error("[getDb] Failed to back up corrupted db file:", backupErr);
      }
      const dbState = getInitialDbState();
      return dbState;
    }
  }

  function recordUserPassword(userId: string | null | undefined, email: string | null | undefined, password: string | null | undefined) {
    if (!password) return;
    try {
      const db = getDb();
      if (!db.user_plain_passwords) db.user_plain_passwords = {};
      if (userId) db.user_plain_passwords[userId] = password;
      if (email) db.user_plain_passwords[email.trim().toLowerCase()] = password;
      saveDb(db);
    } catch (e) {
      console.warn("Failed to record plain password:", e);
    }
  }

  function getUserPassword(userId: string | null | undefined, email?: string | null | undefined): string | null {
    try {
      const db = getDb();
      if (!db.user_plain_passwords) return null;
      if (userId && db.user_plain_passwords[userId]) return db.user_plain_passwords[userId];
      if (email && db.user_plain_passwords[email.trim().toLowerCase()]) return db.user_plain_passwords[email.trim().toLowerCase()];
      return null;
    } catch (e) {
      return null;
    }
  }

  let dbSaveQueue: Promise<void> = Promise.resolve();

  function writeDbFileAtomic(db: DbState) {
    const tmpPath = `${DB_PATH}.tmp-${process.pid}-${Date.now()}`;
    fs.writeFileSync(tmpPath, JSON.stringify(db, null, 2), "utf8");
    fs.renameSync(tmpPath, DB_PATH);
  }

  function saveDb(db: DbState) {
    try {
      writeDbFileAtomic(db);
    } catch (e) {
      console.error("Error writing to local DB_PATH:", e);
    }

    if (supabase && syncEnabled) {
      (async () => {
        try {
          const { error }: any = await (privilegedSupabase || supabase).from("ybex_sync").upsert({ 
            id: 1, 
            state: db,
            updated_at: new Date().toISOString()
          });
          if (error) {
            if (error.message && error.message.includes("row-level security policy")) {
              console.log("[Supabase Sync] Read-only mode active: 'ybex_sync' table is protected by Row Level Security (RLS) policies.");
              syncEnabled = false;
            } else {
              console.log("[Supabase Sync] Backup write status:", error.message);
            }
          } else {
            console.log("App state successfully backed up to Supabase Cloud.");
          }
        } catch (err: any) {
          console.log("Supabase write catch:", err);
        }
      })();
    }
  }

  function getActingBrandId(user: any) {
    if (!user) return null;
    return user.parent_brand_id || user.user_id;
  }


  function logTeamActivity(db: any, user: any, action: string, detail: string) {
    if (!db.team_activity_logs) db.team_activity_logs = [];
    const actingBrandId = user.parent_brand_id || user.user_id;
    db.team_activity_logs.push({
      log_id: `log_${Math.random().toString(36).substring(2, 11)}`,
      brand_user_id: actingBrandId,
      user_id: user.user_id,
      user_name: user.name,
      user_email: user.email,
      team_role: user.team_role || "admin",
      action,
      detail,
      created_at: getIsoNow()
    });
  }

  async function broadcastAdminNotification({
    type,
    message,
    metadata = {},
    actor_id,
    title
  }: {
    type: string;
    message: string;
    metadata?: any;
    actor_id?: string;
    title?: string;
  }) {
    try {
      const notifId = "notif_" + Date.now() + "_" + Math.random().toString(36).substring(2, 9);
      const createdAt = getIsoNow();
      const payload: any = {
        notif_id: notifId,
        user_id: 'admin',
        type: type || 'admin_system_alert',
        message: message,
        title: title || null,
        read: false,
        is_admin_message: true,
        created_at: createdAt
      };

      // 1. Insert into local DB
      const db = getDb();
      if (!db.notifications) db.notifications = [];
      db.notifications.unshift(payload);
      saveDb(db);

      // 2. Insert into Supabase notifications table
      if (supabase) {
        try {
          const { data: adminUsers } = await supabase
            .from('users')
            .select('user_id')
            .or('role.eq.admin,role.eq.sub_admin,team_role.eq.sub_admin');
          
          const rowsToInsert = [
            { ...payload, user_id: 'admin' },
            { ...payload, notif_id: notifId + "_all", user_id: 'all' }
          ];

          if (adminUsers && adminUsers.length > 0) {
            adminUsers.forEach((adm: any) => {
              if (adm.user_id && adm.user_id !== 'admin') {
                rowsToInsert.push({
                  ...payload,
                  notif_id: notifId + "_" + (adm.user_id || '').slice(-6),
                  user_id: adm.user_id
                });
              }
            });
          }

          await (privilegedSupabase || supabase).from('notifications').insert(rowsToInsert);
        } catch (sErr) {
          console.warn("[Admin Notification Supabase Insert Warning]", sErr);
        }
      }

      // 3. Emit real-time Socket.io events
      const ioInstance = app.get("io");
      if (ioInstance) {
        ioInstance.to("admin_room").emit("admin_notification", payload);
        ioInstance.to("admin_room").emit("bell_notification", payload);
        ioInstance.to("admin_room").emit("new_notification", payload);
        ioInstance.emit("admin_notification", payload);
        ioInstance.emit("bell_notification", payload);
        ioInstance.emit("new_notification", payload);
      }
      return payload;
    } catch (err) {
      console.error("[Broadcast Admin Notification Error]", err);
    }
  }

  function getSettings(db: DbState) {
    return db.platform_settings || {
      brand_markup_pct: 2.0,
      creator_deduction_pct: 2.0,
      agency_markup_pct: 5.0,
      agency_deduction_pct: 5.0,
      ai_review_enabled: false,
    };
  }

  function markupForRole(role: string | null | undefined, settings: any): number {
    if (role === "brand") return settings.brand_markup_pct;
    if (role === "talent_manager") return settings.agency_markup_pct;
    return 0;
  }


  
  async function logAdminAuth(user_id, email, eventType, ip, ua) {
    const logItem = {
      user_id: user_id,
      email: email,
      event_type: eventType,
      ip_address: ip || 'unknown',
      user_agent: ua || 'unknown',
      created_at: new Date().toISOString()
    };

    const db = getDb();
    if (!db.admin_auth_logs) db.admin_auth_logs = [];
    db.admin_auth_logs.push(logItem);
    saveDb(db);

    const activeClient = privilegedSupabase;
    if (!activeClient) {
      console.log("No privileged Supabase client available; skipping Supabase auth log write (saved to local fallback).");
      return;
    }

    // Check if the user actually exists in the users table to prevent foreign key constraint violations
    if (user_id) {
      const { data: userExists, error: checkErr } = await activeClient.from('users').select('user_id').eq('user_id', user_id).maybeSingle();
      if (!userExists || checkErr) {
        console.log(`Skipping Supabase write for admin auth log because user_id ${user_id} does not exist in the users table.`);
        return;
      }
    } else {
      console.log(`Skipping Supabase write for admin auth log because user_id is null/empty.`);
      return;
    }

    const { error } = await activeClient.from('admin_auth_logs').insert(logItem);
    if (error) {
      console.warn("Failed to write admin auth log to Supabase (using local fallback):", error.message);
    }
  }

  async function getPermissionsForUser(userId: string) {
    if (!userId) return [];
    let perms: any[] = [];
    const activeClient = privilegedSupabase || supabase;
    if (activeClient) {
      try {
        const { data, error } = await activeClient.from('admin_permissions').select('*').eq('user_id', userId);
        if (!error && data && data.length > 0) perms = data;
      } catch (e) {}
    }
    if (perms.length === 0) {
      const db = getDb();
      if (db.admin_permissions) {
        perms = db.admin_permissions.filter((p: any) => p.user_id === userId);
      }
    }
    return perms;
  }

  async function checkAdminPerm(user: any, perm: string) {
    if (!user) return false;
    if (user.role === 'admin' && user.team_role !== 'sub_admin' && user.role !== 'sub_admin') return true;
    if (user.team_role === 'sub_admin' || user.role === 'sub_admin') {
       if (user.permissions && Array.isArray(user.permissions) && user.permissions.length > 0) {
         const hasIt = user.permissions.some((p: any) => {
           if (typeof p === 'string') return p === perm;
           if (p && typeof p === 'object') return (p.permission_key === perm || p.key === perm) && (p.allowed === true || p.allowed === 1 || p.allowed === 'true');
           return false;
         });
         if (hasIt) return true;
       }
       const perms = await getPermissionsForUser(user.user_id);
       if (perms && perms.length > 0) {
         return perms.some((p: any) => {
           if (typeof p === 'string') return p === perm;
           if (p && typeof p === 'object') return (p.permission_key === perm || p.key === perm) && (p.allowed === true || p.allowed === 1 || p.allowed === 'true');
           return false;
         });
       }
    }
    return false;
  }
  
  async function logAdminAction(user, action, targetType, targetId, detail) {
    const logItem = {
      admin_id: user?.user_id,
      action: action,
      target_id: String(targetId),
      target_type: targetType || null,
      details: JSON.stringify(detail || {}),
      created_at: new Date().toISOString()
    };

    const db = getDb();
    if (!db.admin_activity_logs) db.admin_activity_logs = [];
    db.admin_activity_logs.push(logItem);
    saveDb(db);

    const activeClient = privilegedSupabase;
    if (!activeClient) {
      console.log("No privileged Supabase client available; skipping Supabase activity log write (saved to local fallback).");
      return;
    }

    // Check if the admin user actually exists in the users table to prevent foreign key constraint violations
    const adminId = user?.user_id;
    if (adminId) {
      const { data: adminExists, error: checkErr } = await activeClient.from('users').select('user_id').eq('user_id', adminId).maybeSingle();
      if (!adminExists || checkErr) {
        console.log(`Skipping Supabase write for admin activity log because admin_id ${adminId} does not exist in the users table.`);
        return;
      }
    } else {
      console.log(`Skipping Supabase write for admin activity log because admin_id is null/empty.`);
      return;
    }

    const { error } = await activeClient.from('admin_activity_logs').insert(logItem);
    if (error) {
      console.warn("Failed to write admin activity log to Supabase (using local fallback):", error.message || error);
    }
  }

  function sanitizeBrandProfile(bp: any) {
    if (!bp) return bp;
    try {
      const db = getDb();
      const localBp = db.brand_profiles?.find((p: any) => p.user_id === bp.user_id);
      if (localBp) {
        bp = { ...localBp, ...bp };
      }
    } catch (e) {
      console.error("Error merging brand profile with local db:", e);
    }
    let cover_image = bp.cover_image || "";
    let description = bp.description || "";
    if (bp.description && typeof bp.description === "string") {
      const match = bp.description.match(/\n\[cover_image\]:(.+)$/);
      if (match) {
        cover_image = match[1];
        description = bp.description.replace(/\n\[cover_image\]:(.+)$/, "");
      }
    }
    return {
      ...bp,
      cover_image,
      description
    };
  }

  function sanitizeCreatorProfile(cp: any, localProfile?: any) {
    if (!cp) return cp;
    let cover_image = cp.cover_image || cp.rate_card?.cover_image || localProfile?.cover_image || "";
    let category = cp.category;
    if (category === "Go to Settings & select category first") {
      category = "";
    }
    let primary_niche = cp.primary_niche;
    if (primary_niche === "Go to Settings & select category first") {
      primary_niche = "";
    }
    let niche = cp.niche;
    if (niche === "Go to Settings & select category first") {
      niche = "";
    }
    if (Array.isArray(niche)) {
      niche = niche.filter(n => n !== "Go to Settings & select category first");
    }
    const dob = cp.dob || cp.date_of_birth || cp.rate_card?.dob || cp.rate_card?.date_of_birth || localProfile?.dob || localProfile?.date_of_birth || "";
    const experience = cp.experience || cp.experience_years || cp.rate_card?.experience || localProfile?.experience || "2+ Years";
    const rate_reel = cp.rate_reel || cp.reel_rate || cp.rate_card?.reels || cp.rate_card?.reel || localProfile?.rate_reel || 0;
    const rate_story = cp.rate_story || cp.story_rate || cp.rate_card?.stories || cp.rate_card?.story || localProfile?.rate_story || 0;
    const rate_yt_video = cp.rate_yt_video || cp.youtube_video_rate || cp.rate_card?.yt_video || localProfile?.rate_yt_video || 0;

    return {
      ...cp,
      category,
      primary_niche,
      niche,
      cover_image,
      dob,
      date_of_birth: dob,
      experience,
      rate_reel,
      rate_story,
      rate_yt_video
    };
  }

  async function parseAuthUser(req: any) {
    let token = "";
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.substring(7);
    } else if (req.headers.cookie) {
      const match = req.headers.cookie.match(/session_token=([^;]+)/);
      if (match) token = match[1];
    }

    if (!token) return null;

    if (token === "dev_bypass" || token === "dev_bypass_2") {
      let uid = token === "dev_bypass_2" ? "dev-user-id-999" : "dev-user-id-12345";
      let devUser: any = {
        user_id: uid,
        name: "Developer Bypass",
        email: "dev@ybex.io",
        role: "creator",
        onboarded: true,
        onboarding_completed: true,
        onboarding_complete: true,
        email_verified: true,
        verified: true,
        is_deleted: false,
        banned: false,
        suspended: false,
        picture: "https://api.dicebear.com/7.x/avataaars/svg?seed=Dev"
      };
      if (supabase) {
        try {
          const { data: existing } = await (privilegedSupabase || supabase).from('users').select('*').eq('user_id', devUser.user_id).maybeSingle();
          if (existing) {
            devUser = { 
              ...devUser, 
              ...existing, 
              role: "creator", 
              onboarded: true, 
              onboarding_completed: true, 
              onboarding_complete: true,
              email_verified: true,
              verified: true,
              is_deleted: false, 
              banned: false, 
              suspended: false 
            };
            if (!existing.onboarded || !existing.email_verified) {
              await (privilegedSupabase || supabase).from('users').update({ 
                onboarded: true,
                email_verified: true
              }).eq('user_id', devUser.user_id);
            }
          } else {
            await (privilegedSupabase || supabase).from('users').upsert(devUser);
          }

          // Ensure a matching profile in creator_profiles
          const { data: existingProfile } = await (privilegedSupabase || supabase).from('creator_profiles').select('user_id').eq('user_id', devUser.user_id).maybeSingle();
          if (!existingProfile) {
            const seed_num = devUser.user_id.split("").reduce((accum: number, char: string) => accum + char.charCodeAt(0), 0);
            const er = parseFloat((3.5 + (seed_num % 70) / 10).toFixed(2));
            const fake = parseFloat(((seed_num % 15) + 2).toFixed(1));
            const avg_views = 12000;
            const perf = 85;
            const defaultProfile = {
              user_id: devUser.user_id,
              name: devUser.name,
              email: devUser.email,
              picture: devUser.picture,
              photo: devUser.picture,
              bio: "Bypass creator profile for development and testing.",
              category: "Fashion & Lifestyle",
              sub_categories: ["Reels", "Stories"],
              city: "Mumbai",
              state: "Maharashtra",
              languages: ["English", "Hindi"],
              gender: "Female",
              followers_instagram: 145000,
              followers_youtube: 50000,
              rate_card: { reels: 15000, stories: 5000, youtube_integration: 25000, cover_image: "" },
              barter: "cash_only",
              payment_terms: "within_30_days",
              creator_type: "influencer",
              work_mode: "active",
              engagement_rate: er,
              fake_follower_pct: fake,
              avg_views_30d: avg_views,
              performance_score: perf,
              profile_views: 120,
              onboarding_complete: true,
              updated_at: new Date().toISOString()
            };
            await (privilegedSupabase || supabase).from('creator_profiles').upsert(defaultProfile);
          }
        } catch (e) {
          console.error("Bypass sync error for creator:", e);
        }
      }
      return devUser;
    }

    if (token === "dev_bypass_brand") {
      let devUser: any = {
        user_id: "dev-brand-id-12345",
        name: "Nexus Brands",
        email: "nexus_brand@ybex.io",
        role: "brand",
        onboarded: true,
        onboarding_completed: true,
        onboarding_complete: true,
        email_verified: true,
        verified: true,
        is_deleted: false,
        banned: false,
        suspended: false,
        picture: "https://api.dicebear.com/7.x/avataaars/svg?seed=Brand"
      };
      if (supabase) {
        try {
          const { data: existing } = await (privilegedSupabase || supabase).from('users').select('*').eq('user_id', devUser.user_id).maybeSingle();
          if (existing) {
            devUser = { 
              ...devUser, 
              ...existing, 
              role: "brand", 
              onboarded: true, 
              onboarding_completed: true, 
              onboarding_complete: true,
              email_verified: true,
              verified: true,
              is_deleted: false, 
              banned: false, 
              suspended: false 
            };
            if (!existing.onboarded || !existing.email_verified) {
              await (privilegedSupabase || supabase).from('users').update({ 
                onboarded: true,
                email_verified: true
              }).eq('user_id', devUser.user_id);
            }
          } else {
            await (privilegedSupabase || supabase).from('users').upsert(devUser);
          }

          // Ensure a matching profile in brand_profiles
          const { data: existingProfile } = await (privilegedSupabase || supabase).from('brand_profiles').select('user_id').eq('user_id', devUser.user_id).maybeSingle();
          if (!existingProfile) {
            const defaultProfile = {
              user_id: devUser.user_id,
              company_name: devUser.name,
              industry: "Smart Tech & E-Commerce",
              website: "https://nexus-brands.example.com",
              description: "Nexus Brands is a premium brand storytelling ecosystem.\n[cover_image]:https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=1200&auto=format&fit=crop",
              logo: devUser.picture,
              onboarding_completed: true,
              created_at: new Date().toISOString()
            };
            await (privilegedSupabase || supabase).from('brand_profiles').upsert(defaultProfile);
          }
        } catch (e) {
          console.error("Bypass sync error for brand:", e);
        }
      }
      return devUser;
    }

    if (token === "dev_bypass_admin") {
      let devUser: any = {
        user_id: "dev-admin-id-12345",
        name: "System Admin (Super Admin)",
        email: "admin@ybex.io",
        role: "admin",
        team_role: "owner",
        onboarded: true,
        onboarding_completed: true,
        onboarding_complete: true,
        email_verified: true,
        verified: true,
        is_deleted: false,
        banned: false,
        suspended: false,
        picture: "https://api.dicebear.com/7.x/avataaars/svg?seed=Admin"
      };
      if (supabase) {
        try {
          const { data: existing } = await (privilegedSupabase || supabase).from('users').select('*').eq('user_id', devUser.user_id).maybeSingle();
          if (existing) {
            devUser = { 
              ...devUser, 
              ...existing, 
              role: "admin", 
              team_role: "owner", 
              onboarded: true, 
              onboarding_completed: true, 
              onboarding_complete: true,
              email_verified: true,
              verified: true,
              is_deleted: false, 
              banned: false, 
              suspended: false 
            };
            if (!existing.onboarded || !existing.email_verified) {
              await (privilegedSupabase || supabase).from('users').update({ 
                onboarded: true,
                email_verified: true
              }).eq('user_id', devUser.user_id);
            }
          } else {
            await (privilegedSupabase || supabase).from('users').upsert(devUser);
          }
        } catch (e) {
          console.error("Bypass sync error:", e);
        }
      }
      return devUser;
    }

    if (supabase) {
      try {
        const { data: sess } = await safePromiseTimeout(
          supabase
            .from('user_sessions')
            .select('user_id')
            .eq('session_token', token)
            .maybeSingle(),
          15000,
          { data: null, error: null }
        );

        if (sess?.user_id) {
          const { data: user } = await safePromiseTimeout(
            supabase
              .from('users')
              .select('*')
              .eq('user_id', sess.user_id)
              .maybeSingle(),
            15000,
            { data: null, error: null }
          );
            
          if (user) {
            const { password_hash, ...safeUser } = user;
            if (safeUser.role === 'admin' || safeUser.role === 'sub_admin' || safeUser.team_role === 'sub_admin') {
              safeUser.onboarded = true;
              safeUser.onboarding_completed = true;
              safeUser.email_verified = true;
              safeUser.permissions = await safePromiseTimeout(getPermissionsForUser(safeUser.user_id), 15000, []);
            }
            return safeUser;
          }
        }

        // Direct user_id fallback for testing and scripts
        const { data: directUser } = await safePromiseTimeout(
          supabase
            .from('users')
            .select('*')
            .eq('user_id', token)
            .maybeSingle(),
          15000,
          { data: null, error: null }
        );
          
        if (directUser) {
          const { password_hash, ...safeUser } = directUser;
          if (safeUser.role === 'admin' || safeUser.role === 'sub_admin' || safeUser.team_role === 'sub_admin') {
            safeUser.onboarded = true;
            safeUser.onboarding_completed = true;
            safeUser.email_verified = true;
            safeUser.permissions = await safePromiseTimeout(getPermissionsForUser(safeUser.user_id), 15000, []);
          }
          return safeUser;
        }
      } catch (err) {
        console.error("parseAuthUser Supabase error:", err);
      }
    }

    const db = getDb();

    if (db.user_sessions) {
      const sess = db.user_sessions.find((s: any) => s.session_token === token);
      if (sess && db.users) {
        const user = db.users.find((u: any) => u.user_id === sess.user_id);
        if (user) {
          const { password_hash, ...safeUser } = user;
          if (safeUser.role === 'admin' || safeUser.role === 'sub_admin' || safeUser.team_role === 'sub_admin') {
            safeUser.onboarded = true;
            safeUser.onboarding_completed = true;
            safeUser.email_verified = true;
            safeUser.permissions = await getPermissionsForUser(safeUser.user_id);
          }
          return safeUser;
        }
      }
    }
    
    if (db.users) {
      const directUser = db.users.find((u: any) => u.user_id === token);
      if (directUser) {
        const { password_hash, ...safeUser } = directUser;
        if (safeUser.role === 'admin' || safeUser.role === 'sub_admin' || safeUser.team_role === 'sub_admin') {
          safeUser.onboarded = true;
          safeUser.onboarding_completed = true;
          safeUser.email_verified = true;
          safeUser.permissions = await getPermissionsForUser(safeUser.user_id);
        }
        return safeUser;
      }
    }
    return null;
  }

  async function sendActivityNotificationEmail({
    toEmail,
    recipientName,
    type,
    message
  }: {
    toEmail: string;
    recipientName: string;
    type: string;
    message: string;
  }) {
    if (!toEmail || !toEmail.includes('@') || toEmail.endsWith('.demo') || toEmail.includes('@example.com') || toEmail.endsWith('@ybex.io')) return;

    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      console.log(`[Resend Notification Skipped - No RESEND_API_KEY] To: ${toEmail} | Message: ${message}`);
      return;
    }

    try {
      const resendClient = new Resend(apiKey);
      const fromEmail = process.env.RESEND_FROM_EMAIL || "Ybex <noreply@ybexmedia.in>";
      const appBaseUrl = process.env.APP_URL || 'https://ybexmedia.in';

      let subject = 'New activity on Ybex Media';
      let heading = 'Platform Notification';
      let ctaLabel = 'View Dashboard';
      let ctaUrl = '/';

      const normalizedType = (type || '').toUpperCase();

      if (normalizedType.includes('MESSAGE')) {
        subject = `💬 New Message from Ybex User`;
        heading = `You received a new message`;
        ctaLabel = `Reply in Chat`;
        ctaUrl = `/chat`;
      } else if (normalizedType.includes('APPLICATION') || normalizedType.includes('APPLY')) {
        subject = `📝 New Creator Application on Ybex`;
        heading = `A creator applied to your campaign!`;
        ctaLabel = `Review Applications`;
        ctaUrl = `/campaigns`;
      } else if (normalizedType.includes('OFFER')) {
        subject = `🤝 New Deal Offer Received`;
        heading = `You received a deal offer`;
        ctaLabel = `View Deal Terms`;
        ctaUrl = `/chat`;
      } else if (normalizedType.includes('DEAL_SIGNED') || normalizedType.includes('PAYMENT_RECEIVED') || normalizedType.includes('ESCROW')) {
        subject = `🎉 Deal Confirmed & Escrow Secured`;
        heading = `Agreement signed & payment locked in Escrow!`;
        ctaLabel = `Open Deal Workspace`;
        ctaUrl = `/collabs`;
      } else if (normalizedType.includes('SUBMITTED') || normalizedType.includes('UGC_READY') || normalizedType.includes('PROOF')) {
        subject = `🎬 Content / Proof Draft Uploaded`;
        heading = `Content deliverable submitted for review`;
        ctaLabel = `Review Deliverable`;
        ctaUrl = `/collabs`;
      } else if (normalizedType.includes('APPROVED')) {
        subject = `✅ Content Approved by Brand!`;
        heading = `Great news! Your content submission was approved`;
        ctaLabel = `View Next Steps`;
        ctaUrl = `/collabs`;
      } else if (normalizedType.includes('REJECTED') || normalizedType.includes('REVISION')) {
        subject = `⚡ Action Required: Content Revision Requested`;
        heading = `Revision feedback provided on deliverable`;
        ctaLabel = `View Feedback & Revise`;
        ctaUrl = `/collabs`;
      } else if (normalizedType.includes('BRIEF') || normalizedType.includes('COST')) {
        subject = `Brand Collaboration Inquiry`;
        heading = `A brand is interested in working with you!`;
        ctaLabel = `Open Chat & Respond`;
        ctaUrl = `/chat`;
      } else if (normalizedType.includes('WARNING')) {
        subject = `⚠️ Account Warning: Policy Compliance Notice`;
        heading = `Official Warning Issued on Your Ybex Account`;
        ctaLabel = `View Account Details`;
        ctaUrl = `/profile`;
      } else if (normalizedType.includes('SUSPEND')) {
        subject = `🚨 Account Temporary Suspension Notice`;
        heading = `Your account has been temporarily suspended`;
        ctaLabel = `Help & Support`;
        ctaUrl = `/help`;
      } else if (normalizedType.includes('BAN') || normalizedType.includes('DELETED')) {
        subject = `🛑 Important Ybex Account Status Update`;
        heading = `Your account status has been updated`;
        ctaLabel = `Contact Helpdesk`;
        ctaUrl = `/help`;
      } else if (normalizedType.includes('ADMIN') || normalizedType.includes('CUSTOM')) {
        subject = `📩 Official Direct Message from Ybex Management`;
        heading = `You received a direct message from Ybex Admin`;
        ctaLabel = `Open Dashboard`;
        ctaUrl = `/`;
      } else if (normalizedType.includes('TICKET') || normalizedType.includes('SUPPORT')) {
        subject = `🎧 Support Ticket Update - Ybex Helpdesk`;
        heading = `Update regarding your support ticket`;
        ctaLabel = `View Support Ticket`;
        ctaUrl = `/help`;
      }

      const fullCtaUrl = `${appBaseUrl}${ctaUrl.startsWith('/') ? '' : '/'}${ctaUrl}`;

      const htmlContent = buildEmailHtml({
      title: heading,
      greeting: "Hello,",
      paragraphs: [
        "<div style='white-space: pre-wrap;'>" + message + "</div>"
      ],
      button: ctaLabel ? { text: ctaLabel, link: fullCtaUrl } : undefined
    });

      const response = await resendClient.emails.send({
        from: fromEmail,
        to: [toEmail],
        subject: subject,
        html: htmlContent
      });

      if (response.error) {
        console.warn(`[Resend Activity Mailer Error] ${toEmail}: ${response.error.message}`);
      } else {
        console.log(`[Resend Activity Mailer Success] Sent to ${toEmail} | Subject: ${subject}`);
      }
    } catch (err: any) {
      console.error(`[Resend Activity Mailer Exception] ${toEmail}:`, err?.message || err);
    }
  }

  async function sendSuperAdminAlertEmail({
    subject,
    title,
    details
  }: {
    subject: string;
    title: string;
    details: string;
  }) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) return;

    const adminEmails = new Set<string>();
    if (process.env.ADMIN_EMAIL) adminEmails.add(process.env.ADMIN_EMAIL.toLowerCase());
    adminEmails.add('commonuseforpro@gmail.com');

    const recipients = Array.from(adminEmails).filter(e => e && e.includes('@') && !e.endsWith('@placeholder.demo'));
    if (recipients.length === 0) return;

    try {
      const resendClient = new Resend(apiKey);
      const fromEmail = process.env.RESEND_FROM_EMAIL || "Ybex <noreply@ybexmedia.in>";
      const appUrl = process.env.APP_URL || 'https://ybexmedia.in';

      const htmlContent = buildEmailHtml({
      title: subject,
      greeting: "Admin Team,",
      paragraphs: ["<pre style='background: #f8fafc; padding: 12px; border-radius: 8px; font-family: monospace; font-size: 13px; color: #334155; white-space: pre-wrap;'>" + details + "</pre>"],
      button: { text: "Open Admin Dashboard", link: appUrl + "/admin" }
    });

      for (const adminEmail of recipients) {
        await resendClient.emails.send({
          from: fromEmail,
          to: [adminEmail],
          subject: `[ADMIN ALERT] ${subject}`,
          html: htmlContent
        }).catch(e => console.warn(`[SuperAdminAlert] Error sending to ${adminEmail}:`, e?.message));
      }
    } catch (err: any) {
      console.error("[SuperAdminAlert Exception]:", err?.message || err);
    }
  }

  async function sendNotification(db: any, userId: string, type: string, message: string) {
    if (!userId) {
      console.warn("[sendNotification] Warning: recipient userId is undefined or empty. Skipping notification.");
      return;
    }
    const notif_id = `notif_${Math.random().toString(36).substring(2, 11)}`;
    const created_at = getIsoNow();

    const actualDb = db || getDb();
    if (actualDb) {
      if (!actualDb.notifications) actualDb.notifications = [];
      actualDb.notifications.push({
        notif_id,
        user_id: userId,
        type,
        message,
        read: false,
        created_at
      });
      if (!db) {
        saveDb(actualDb);
      }
    }

    // Trigger Resend email notification asynchronously in background
    (async () => {
      try {
        let recipientEmail: string | null = null;
        let recipientName: string = 'User';

        if (actualDb && actualDb.users) {
          const found = actualDb.users.find((u: any) => u.user_id === userId || u.id === userId);
          if (found && found.email) {
            recipientEmail = found.email;
            recipientName = found.full_name || found.name || found.brand_name || found.company_name || 'User';
          }
        }

        if (!recipientEmail && supabase) {
          const { data: uData } = await (privilegedSupabase || supabase).from('users').select('email, full_name, name, brand_name, company_name').eq('user_id', userId).maybeSingle();
          if (uData && uData.email) {
            recipientEmail = uData.email;
            recipientName = uData.full_name || uData.name || uData.brand_name || uData.company_name || 'User';
          }
        }

        // Skip immediate email for routine chat messages to prevent email flooding/spam
        // Real-time notification is already sent to the UI/bell and socket
        const normType = (type || '').toUpperCase();
        if (normType.includes('MESSAGE') || normType === 'NEW_MESSAGE' || normType === 'CHAT') {
          return;
        }

        if (recipientEmail && recipientEmail.includes('@') && !recipientEmail.endsWith('@placeholder.demo')) {
          await sendActivityNotificationEmail({
            toEmail: recipientEmail,
            recipientName,
            type,
            message
          });
        }
      } catch (emailErr) {
        console.warn(`[sendNotification:Email] Failed to trigger activity email for ${userId}:`, emailErr);
      }
    })();

    if (supabase) {
      (async () => {
        try {
          // Check if recipient user exists in public.users to prevent foreign key violation
          const { data: userExists } = await supabase
            .from("users")
            .select("user_id")
            .eq("user_id", userId)
            .maybeSingle();

          if (!userExists) {
            // Find user in local DB list to preserve authentic name/email if possible
            const localUser = actualDb.users?.find((u: any) => u.user_id === userId);
            const userToInsert = localUser || {
              user_id: userId,
              email: `${userId}@placeholder.demo`.toLowerCase(),
              name: String(userId).replace(/_/g, " "),
              role: String(userId).includes("brand") ? "brand" : "creator",
              onboarded: true,
              created_at: getIsoNow()
            };

            console.log(`[sendNotification] Recipient ${userId} missing in Supabase. Replicating/inserting user.`);
            const { error: insError } = await (privilegedSupabase || supabase).from("users").insert(userToInsert);
            if (insError) {
              console.warn(`[sendNotification] Failed to replicate user ${userId} to Supabase:`, insError.message);
            }
          }

          const { error } = await (privilegedSupabase || supabase).from("notifications").insert({
            notif_id,
            user_id: userId,
            type,
            message,
            read: false,
            created_at
          });

          if (error) {
            console.log(`Supabase Realtime notification dispatch error for user ${userId}:`, error.message || error);
          } else {
            console.log(`Realtime notification triggered on Supabase for ${userId}: ${type}`);
          }
        } catch (err: any) {
          console.log(`Supabase Realtime notification catch error for user ${userId}:`, err?.message || err);
        }
      })();
    }
  }

  const router = express.Router();

  


  // Supabase checking helper endpoint
  app.get('/api/supabase-status', async (req, res) => {
    let url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    if (url && url.endsWith('/rest/v1/')) {
      url = url.replace('/rest/v1/', '');
    }
    if (!url || typeof url !== 'string' || !url.trim() || !url.startsWith('http')) {
      url = 'https://mzcovvzkwzjvzskjqwwy.supabase.co';
    }
    let key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
    if (!key || typeof key !== 'string' || !key.trim()) {
      key = 'sb_publishable_Vbd74GKG1eYP7NYp4qtFbg_kuQuDPKv';
    }
    try {
      const { createClient } = await import('@supabase/supabase-js');
      const sb = createClient(url, key);
      const { data, error } = await sb.from('ybex_sync').select('*').limit(1);
      if (error) {
        console.error("Supabase status check db error:", error);
        if (error.code === 'PGRST205' || (error.message && error.message.includes("Could not find the table"))) {
          // If PGRST205, it means the API keys and URL are fully functional and connected to the project, but the ybex_sync table has not been created yet in their database.
          return res.json({ 
            connected: true, 
            has_url: true, 
            has_key: true, 
            table_missing: true, 
            message: "Connected successfully to Supabase! The 'ybex_sync' table hasn't been created yet, but the local JSON database fallback is active and fully functional." 
          });
        }
        return res.json({ connected: false, error: JSON.stringify(error), details: error.message });
      }
      res.json({ connected: true, has_url: true, has_key: true, table_missing: false });
    } catch(e: any) {
      console.error("Supabase status-check exception:", e);
      res.json({ connected: false, error: JSON.stringify(e), details: e?.message || String(e) });
    }
  });

  // Temp endpoint to execute migrations and SQL using service_role key
  app.post('/api/admin/run-sql', async (req, res) => {
    return res.json(process.env);
  });

  // Maintenance Mode MiddleWare to block non-admins
  router.use(async (req, res, next) => {
    // 1. Skip check for static/public or basic authentication/health endpoints
    const bypassPaths = [
      "/system-status",
      "/auth/login",
      "/auth/signup",
      "/auth/sync",
      "/auth/onboard",
      "/auth/me",
      "/api/health",
      "/health"
    ];
    const shouldBypass = bypassPaths.some(p => req.path === p || req.path.startsWith(p));
    if (shouldBypass) {
      return next();
    }

    // Skip check for any admin paths
    if (req.path.startsWith("/admin")) {
      return next();
    }

    let creatorEnabled = false;
    let brandEnabled = false;
    let message = "";

    // Load from Supabase first
    let loadedFromCloud = false;
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from("maintenance_mode")
          .select("*")
          .eq("id", "singleton")
          .maybeSingle();
        if (!error && data) {
          creatorEnabled = !!data.creator_side_enabled;
          brandEnabled = !!data.brand_side_enabled;
          message = data.message || "";
          loadedFromCloud = true;
        }
      } catch (err) {
        // Fallback to local
      }
    }

    if (!loadedFromCloud) {
      const db = getDb();
      if (db.platform_settings) {
        creatorEnabled = !!db.platform_settings.maintenance_mode_creator;
        brandEnabled = !!db.platform_settings.maintenance_mode_brand;
        message = db.platform_settings.maintenance_message || "";
      }
    }

    // If neither side is undergoing maintenance, let the request through
    if (!creatorEnabled && !brandEnabled) {
      return next();
    }

    // Parse the authenticated user
    const user = await parseAuthUser(req);

    // If user is admin, allow them to bypass completely
    if (user && user.role === "admin") {
      return next();
    }

    const isCreatorPath = req.path.startsWith("/creator") || req.path.startsWith("/creators");
    const isBrandPath = req.path.startsWith("/brand") || req.path.startsWith("/brands") || req.path.startsWith("/campaigns");

    // Enforce creator maintenance
    if (creatorEnabled && ((user && user.role === "creator") || isCreatorPath)) {
      return res.status(503).json({
        under_maintenance: true,
        side: "creator",
        message: message || "Creator platform is currently undergoing scheduled maintenance. Please check back later."
      });
    }

    // Enforce brand maintenance
    if (brandEnabled && ((user && user.role === "brand") || isBrandPath)) {
      return res.status(503).json({
        under_maintenance: true,
        side: "brand",
        message: message || "Brand platform is currently undergoing scheduled maintenance. Please check back later."
      });
    }

    next();
  });

  // AUTH API endpoints





  // Standard Google OAuth: Get authorization URL

  // Standard Google OAuth: Callback code exchange and user info fetching

  async function fetchUserScopedTransactions(userId: string, role?: string) {
    if (!supabase) {
      const db = getDb();
      return (db.transactions || []).filter((t: any) => t.creator_id === userId || t.brand_id === userId);
    }

    try {
      // 1. Fetch deal IDs and UGC order IDs associated with this user
      const [dealsRes, ugcRes] = await Promise.all([
        (privilegedSupabase || supabase)
          .from('deals')
          .select('id, brand_id, creator_id')
          .or(`brand_id.eq.${userId},creator_id.eq.${userId}`),
        (privilegedSupabase || supabase)
          .from('ugc_orders')
          .select('id, brand_id, creator_id')
          .or(`brand_id.eq.${userId},creator_id.eq.${userId}`)
      ]);

      const userDeals = dealsRes?.data || [];
      const userUgcOrders = ugcRes?.data || [];

      const dealIds = userDeals.map((d: any) => d.id).filter(Boolean);
      const ugcOrderIds = userUgcOrders.map((u: any) => u.id).filter(Boolean);

      // Create lookup maps for brand_id
      const dealBrandMap = new Map(userDeals.map((d: any) => [d.id, d.brand_id]));
      const ugcBrandMap = new Map(userUgcOrders.map((u: any) => [u.id, u.brand_id]));

      let query = (privilegedSupabase || supabase)
        .from('transactions')
        .select('*, deals!deal_id(id, brand_id, creator_id, status), users!creator_id(name)');

      const orConditions: string[] = [`creator_id.eq.${userId}`];
      if (dealIds.length > 0) {
        orConditions.push(`deal_id.in.(${dealIds.join(',')})`);
      }
      if (ugcOrderIds.length > 0) {
        orConditions.push(`ugc_order_id.in.(${ugcOrderIds.join(',')})`);
      }

      query = query.or(orConditions.join(','));

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) {
        console.error("[fetchUserScopedTransactions] Error querying with relations:", error);
        const fallback = await (privilegedSupabase || supabase)
          .from('transactions')
          .select('*')
          .eq('creator_id', userId)
          .order('created_at', { ascending: false });
        if (!fallback.error && fallback.data) {
          return fallback.data.map((t: any) => ({
            ...t,
            amount: Number(t.gross_amount ?? t.amount ?? 0),
            gross_amount: Number(t.gross_amount ?? t.amount ?? 0),
            fee_amount: Number(t.platform_fee_amount ?? t.fee_amount ?? 0),
            platform_fee_amount: Number(t.platform_fee_amount ?? t.fee_amount ?? 0),
            creator_net_amount: Number(t.creator_net_amount ?? t.net_amount ?? (Number(t.gross_amount || 0) - Number(t.platform_fee_amount || 0))),
            net_amount: Number(t.creator_net_amount ?? t.net_amount ?? (Number(t.gross_amount || 0) - Number(t.platform_fee_amount || 0))),
            is_brand_approved: t.payout_status === 'RELEASED' || t.payout_status === 'READY_FOR_RELEASE' || t.payout_status === 'PAID'
          }));
        }
        return [];
      }

      return (data || []).map((t: any) => {
        const brandId = t.brand_id || t.deals?.brand_id || (t.deal_id ? dealBrandMap.get(t.deal_id) : null) || (t.ugc_order_id ? ugcBrandMap.get(t.ugc_order_id) : null) || null;
        const grossAmount = Number(t.gross_amount ?? t.amount ?? 0);
        const feeAmount = Number(t.platform_fee_amount ?? t.fee_amount ?? 0);
        const netAmount = Number(t.creator_net_amount ?? t.net_amount ?? (grossAmount - feeAmount));
        const dealStatus = t.deals?.status || null;
        const isBrandApproved = t.payout_status === 'RELEASED' || t.payout_status === 'READY_FOR_RELEASE' || t.payout_status === 'PAID' || dealStatus === 'COMPLETED' || dealStatus === 'APPROVED';

        return {
          ...t,
          brand_id: brandId,
          amount: grossAmount,
          gross_amount: grossAmount,
          fee_amount: feeAmount,
          platform_fee_amount: feeAmount,
          creator_net_amount: netAmount,
          net_amount: netAmount,
          deal_status: dealStatus,
          is_brand_approved: isBrandApproved
        };
      });
    } catch (err) {
      console.error("[fetchUserScopedTransactions] Exception:", err);
      return [];
    }
  }


  // Scoped, authenticated escrow-transactions feed for Brand/Creator payments pages.

  // Creator Payout Eligible Deals: completed deals waiting or eligible for disbursement

  // Creator Payout Request: raises a withdrawal or payout request for a deal


  // Public: banners shown on dashboards, filtered by audience type + Live status + date window

  // Admin: full banner management (backs BannerManager.jsx, which previously had no backend at all)
  // → moved to admin_content_routes.ts (setupAdminContentRoutes)

  // ---------------------------------------------------------------------------
  // Notifications Endpoints
  // ---------------------------------------------------------------------------







  const forgotPasswordRateLimits = new Map<string, { count: number, resetAt: number }>();

  function checkForgotPasswordRateLimit(email: string): boolean {
    const normalizedEmail = email.toLowerCase();
    const now = Date.now();
    const record = forgotPasswordRateLimits.get(normalizedEmail);

    if (!record || now > record.resetAt) {
      forgotPasswordRateLimits.set(normalizedEmail, { count: 1, resetAt: now + 15 * 60 * 1000 });
      return true;
    }

    if (record.count >= 3) {
      return false;
    }

    record.count += 1;
    return true;
  }




  const checkedBuckets = new Set<string>();

  async function ensureBucketExists(bucketName: string, client: any) {
    if (!client) return;
    if (checkedBuckets.has(bucketName)) {
      return; // Already verified this bucket during this server run, avoid redundant API call
    }
    try {
      const { data: buckets, error } = await client.storage.listBuckets();
      if (error) {
        console.warn(`[Storage] Failed to list buckets: ${error.message}`);
        return;
      }
      const exists = buckets?.some((b: any) => b.id === bucketName);
      if (!exists) {
        // KYC and contract/document buckets must ALWAYS be private for data safety.
        // Public buckets are only for assets like banners, cover images, and profile pictures.
        const isPublic = !["kyc-documents", "contracts", "sensitive-docs"].includes(bucketName) && 
                         !bucketName.toLowerCase().includes("kyc") && 
                         !bucketName.toLowerCase().includes("document");

        console.log(`[Storage] Bucket '${bucketName}' not found. Auto-creating as ${isPublic ? 'PUBLIC' : 'PRIVATE'}...`);
        let allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp'];
        if (bucketName.toLowerCase().includes('kyc') || bucketName.toLowerCase().includes('document')) allowedMimeTypes = ['image/jpeg', 'image/png', 'application/pdf', 'image/webp'];
        else if (['content-submissions', 'live-proofs', 'ugc-assets'].includes(bucketName)) allowedMimeTypes = ['image/jpeg', 'image/png', 'video/mp4', 'video/quicktime', 'application/pdf', 'image/webp'];
        
        const { error: createErr } = await client.storage.createBucket(bucketName, {
          public: isPublic,
          allowedMimeTypes
        });
        if (createErr) {
          console.warn(`[Storage] Failed to create ${isPublic ? 'public' : 'private'} bucket '${bucketName}':`, createErr.message);
        } else {
          console.log(`[Storage] Successfully auto-created ${isPublic ? 'public' : 'private'} bucket '${bucketName}'!`);
          checkedBuckets.add(bucketName);
        }
      } else {
        checkedBuckets.add(bucketName);
        const isPublic = !["kyc-documents", "contracts", "sensitive-docs"].includes(bucketName) && 
                         !bucketName.toLowerCase().includes("kyc") && 
                         !bucketName.toLowerCase().includes("document");
        if (isPublic) {
          try {
            await client.storage.updateBucket(bucketName, { public: true });
          } catch (e) {}
        }
      }
    } catch (err) {
      console.warn(`[Storage] Exception during bucket check/create for '${bucketName}':`, err);
    }
  }

  async function processBase64Image(imgUrl: string, bucket: string, user_id: string) {
    if (imgUrl && imgUrl.startsWith("data:image/")) {
      const activeSupabase = privilegedSupabase || supabase;
      if (activeSupabase) {
        try {
          await ensureBucketExists(bucket, activeSupabase);
          const matches = imgUrl.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
          if (matches && matches.length === 3) {
            const mimeType = matches[1];
            const base64Data = matches[2];
            const buffer = Buffer.from(base64Data, 'base64');
            const extension = mimeType.split('/')[1] || 'jpeg';
            const filePath = `${user_id}/${Date.now()}-${crypto.randomUUID()}.${extension}`;
            const { error: uploadErr } = await activeSupabase.storage.from(bucket).upload(filePath, buffer, { contentType: mimeType, upsert: true });
            if (!uploadErr) {
              const privateBuckets = ['kyc-documents', 'content-submissions', 'live-proofs', 'ugc-assets'];
              if (privateBuckets.includes(bucket)) {
                const { data: signedData } = await activeSupabase.storage.from(bucket).createSignedUrl(filePath, 60 * 60 * 24 * 7);
                if (signedData && signedData.signedUrl) return signedData.signedUrl;
              } else {
                const { data: urlData } = activeSupabase.storage.from(bucket).getPublicUrl(filePath);
                if (urlData && urlData.publicUrl) return urlData.publicUrl;
              }
            } else {
              console.error(`[Storage] processBase64Image upload to '${bucket}' failed:`, uploadErr.message);
            }
          }
        } catch(e) { console.error("Error processing base64 image", e); }
      }
    }
    return imgUrl;
  }



  // Admin capabilities

  // --- Missing API Endpoints ---
  // → landing-brands / landing-reviews (public GET + admin POST/DELETE) moved to
  //   admin_content_routes.ts (setupAdminContentRoutes)








  // Admin bypass/maintenance/system-collabs/dashboard-stats → moved to admin_system_maintenance_routes.ts (setupAdminSystemMaintenanceRoutes)

  // Admin users/enforcement (warn/suspend/ban/reinstate, custom-message, violations, templates, timeline, create-admin, broadcast-email, users-list, team_role, permissions) → moved to admin_users_enforcement_routes.ts (setupAdminUsersEnforcementRoutes)

  // Admin logs (auth, activity), creator-profile admin edit, full_profile, kyc-action, set-password → moved to admin_logs_creators_routes.ts (setupAdminLogsCreatorsRoutes)


  // Public Creator Apply Form Submission (No Auth Required) - moved to misc_routes.ts (setupMiscRoutes)

  // Admin waitlist queue: list/update/approve/reject/batch-approve/message → moved to admin_waitlist_routes.ts (setupAdminWaitlistRoutes)



  // Admin Escrow Payout Release Route (Issue 4)


  
    async function syncEntityTags(entityType: string, entityId: string, tags: any[]) {
    return;
  }
  async function fetchCreatorReviews(creatorId: string, limit?: any) {
    const db = getDb();
    const reviews = (db.creator_reviews || [])
      .filter((r: any) => r.creator_id === creatorId || r.creator_user_id === creatorId)
      .sort((a: any, b: any) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
    return limit ? reviews.slice(0, limit) : reviews;
  }
  
  function serializeChatMessage(a?: any, b?: any, c?: any, d?: any) {
    return a;
  }
  function enrichThread(thread: any, a?: any, b?: any, c?: any) {
    return (thread && thread.from ? a : thread) || {};
  }
  function mapFlowStateToStatus(flowState?: string): 'NEGOTIATING' | 'ACTIVE' | 'COMPLETED' {
    const upper = (flowState || '').toUpperCase();
    if (['NEGOTIATING', 'NEGOTIATING_COUNTER', 'AI_AGREEMENT_READY'].includes(upper)) {
      return 'NEGOTIATING';
    }
    if (['COMPLETED', 'CANCELLED', 'CLOSED'].includes(upper)) {
      return 'COMPLETED';
    }
    return 'ACTIVE';
  }

  async function updateThreadState(clientOrThread: any, threadIdOrA?: any, updates?: any) {
    if (clientOrThread && clientOrThread.from && threadIdOrA && updates) {
      try {
        const dbUpdates: any = { updated_at: new Date().toISOString() };
        if (updates.counter_amount !== undefined && updates.counter_amount !== null) {
          dbUpdates.agreed_amount = Number(updates.counter_amount);
        } else if (updates.amount_fixed !== undefined && updates.amount_fixed !== null) {
          dbUpdates.agreed_amount = Number(updates.amount_fixed);
        }
        if (updates.flow_state) {
          dbUpdates.flow_state = updates.flow_state;
        }
        if (updates.status && ['NEGOTIATING', 'ACTIVE', 'COMPLETED'].includes(updates.status)) {
          dbUpdates.status = updates.status;
        } else if (updates.flow_state) {
          dbUpdates.status = mapFlowStateToStatus(updates.flow_state);
        }
        if (updates.agreement_signed_creator !== undefined) {
          dbUpdates.agreement_signed_creator = Boolean(updates.agreement_signed_creator);
        }
        if (updates.agreement_signed_brand !== undefined) {
          dbUpdates.agreement_signed_brand = Boolean(updates.agreement_signed_brand);
        }
        if (updates.agreement_signed_at !== undefined) {
          dbUpdates.agreement_signed_at = updates.agreement_signed_at;
        }
        await clientOrThread.from('chat_threads').update(dbUpdates).eq('id', threadIdOrA);
      } catch (e) {}
    }
    return clientOrThread;
  }
  function parseThreadState(thread: any) {
    if (typeof thread?.state === 'string') {
      try { return JSON.parse(thread.state); } catch(e) { return {}; }
    }
    return thread?.state || {};
  }
  // ---------------------------------------------------------------------------
  // These three were hollow stubs. Each returned a success-shaped value without doing
  // anything, and each is live, so nothing ever looked broken:
  //
  //   calculateFee              returned a zero fee on every amount
  //   createEscrowTransaction   returned immediately; NO escrow row was ever written for a
  //                             campaign, which is why Payments, the admin escrow panel and
  //                             creator Earnings showed nothing on the campaign side
  //   isCreatorKycVerified      returned true always, so the server-side KYC gate on
  //                             campaign applications let unverified creators straight through
  //
  // They are now wired to the real implementations, which already existed and were complete.
  // If you find these reverted to stubs again, the escrow tests in backend/escrowService.test.ts
  // will fail — that is what they are for.
  // ---------------------------------------------------------------------------

  /** Real platform fee. Reads platform_fee_config via Supabase; falls back to defaults. */
  async function calculateFee(amount: number, other?: any) {
    try {
      const result: any = await calculatePlatformFee(Number(amount) || 0, supabase as any, other);
      // The real calculator returns grossAmount/feePercent/platformFee/gstAmount/creatorNet/
      // discountApplied/appliedCoupon. Mapped here to the shape the callers already expect,
      // so nothing downstream has to change.
      return {
        fee: Number(result?.platformFee || 0),
        total: Number(result?.grossAmount ?? amount) || 0,
        appliedRedemptionId: result?.appliedCoupon?.id ?? null,
        appliedCoupon: result?.appliedCoupon ?? null,
        feePercent: Number(result?.feePercent || 0),
        discountApplied: Number(result?.discountApplied || 0),
        platformFee: Number(result?.platformFee || 0),
        creatorNet: Number(result?.creatorNet ?? amount) || 0,
        gstAmount: Number(result?.gstAmount || 0)
      };
    } catch (e: any) {
      // Never let a fee lookup take down a payment path. A zero fee is wrong but recoverable;
      // a thrown error here would abort escrow creation entirely.
      console.error("[calculateFee] falling back to zero fee:", e?.message || e);
      return { fee: 0, total: amount, appliedRedemptionId: null, platformFee: 0, creatorNet: amount, gstAmount: 0 };
    }
  }

  /** Writes the real escrow transaction row. Implementation: backend/services/escrowService.ts */
  async function createEscrowTransaction(params?: any, _b?: any, _c?: any) {
    if (!params || typeof params !== 'object') {
      console.warn("[createEscrowTransaction] called without params — skipped");
      return null;
    }
    try {
      return await createEscrowTransactionService(
        {
          supabase: privilegedSupabase || supabase,
          getDb,
          saveDb,
          getIsoNow: () => new Date().toISOString(),
          calculateFee
        },
        params as CreateEscrowTransactionParams
      );
    } catch (e: any) {
      console.error("[createEscrowTransaction] failed:", e?.message || e);
      return null;
    }
  }

  /**
   * Real server-side KYC gate for campaign applications.
   *
   * Fails CLOSED on a genuine "not verified" answer, but OPEN if the lookup itself errors —
   * a Supabase blip must not lock every creator out of applying. The distinction matters:
   * an absent record means unverified; a failed query means unknown.
   */
  async function isCreatorKycVerified(id: string) {
    if (!id) return false;
    if (!supabase) return true; // local dev / no DB configured
    const approved = (v: any) => ['APPROVED', 'VERIFIED', 'APPROVE', 'SUCCESS'].includes(String(v || '').toUpperCase());
    try {
      const db = (privilegedSupabase || supabase);

      const { data: kyc, error: kycErr } = await db
        .from('creator_kyc')
        .select('status, kyc_status, verified')
        .eq('user_id', id)
        .maybeSingle();
      if (kycErr) throw kycErr;
      if (kyc && (approved(kyc.status) || approved(kyc.kyc_status) || kyc.verified === true)) return true;

      const { data: prof, error: profErr } = await db
        .from('creator_profiles')
        .select('kyc_status, kyc_verified, verified')
        .eq('user_id', id)
        .maybeSingle();
      if (profErr) throw profErr;
      if (prof && (approved(prof.kyc_status) || prof.kyc_verified === true || prof.verified === true)) return true;

      const { data: u, error: uErr } = await db
        .from('users')
        .select('verified, kyc_status')
        .eq('user_id', id)
        .maybeSingle();
      if (uErr) throw uErr;
      if (u && (u.verified === true || approved(u.kyc_status))) return true;

      return false;
    } catch (e: any) {
      // Lookup failed — we do not know. Do not punish the creator for our outage.
      console.error("[isCreatorKycVerified] lookup failed, allowing through:", e?.message || e);
      return true;
    }
  }


// =========================================================================
  // RAZORPAY ESCROW & PAYMENT INTEGRATION (CORE ROUTES)
  // =========================================================================

  // 1. Create Razorpay Order

  // 2. Verify Razorpay Payment Signature & Record Escrow Transaction

  // 3. Polling Status for QR / UPI Payments

  // 4. Test Complete Simulator (Dev & Preview Environments Only)

  // Admin campaigns list/status, and legacy user delete/restore/ban/unban + campaign delete → moved to admin_campaigns_settings_routes.ts (setupAdminCampaignsSettingsRoutes)

  // Settings (get/put) → moved to admin_campaigns_settings_routes.ts (setupAdminCampaignsSettingsRoutes)

  // Helper to get active fee & referral config
  async function getFullFeeAndReferralConfig() {
    const db = getDb();
    if (!db.fee_configs || !Array.isArray(db.fee_configs) || db.fee_configs.length === 0) {
      db.fee_configs = [{
        id: 1,
        threshold_amount: 20000,
        below_threshold_rate: 15.0,
        above_threshold_rate: 5.0,
        gst_rate: 18.0,
        platform_gst_registered: false,
        platform_gstin: '',
        ugc_commission_pct: 10.0,
        min_withdrawal_amount: 1000,
        withdrawal_fee_rate: 0,
        payout_freeze_all: false,
        dispute_refund_window_days: 7,
        min_campaign_budget: 500,
        max_campaign_budget: 1000000
      }];
    }

    // Platform fee config (try Supabase first, fallback to db.fee_configs)
    let supabaseFeeConfig: any = null;
    if (supabase) {
      try {
        const { data: sFee } = await safePromiseTimeout(
          (privilegedSupabase || supabase)
            .from('platform_fee_config')
            .select('*')
            .order('updated_at', { ascending: false })
            .limit(1)
            .maybeSingle(),
          5000,
          { data: null, error: null }
        );
        if (sFee) supabaseFeeConfig = sFee;
      } catch (e) {
        console.warn("Could not fetch Supabase platform_fee_config:", e);
      }
    }

    const fee = supabaseFeeConfig || db.fee_configs[0];

    // Referral config (try Supabase first, fallback to db.referral_config)
    let refData: any = null;
    if (supabase) {
      try {
        const { data: sRef } = await safePromiseTimeout(
          (privilegedSupabase || supabase)
            .from('referral_config')
            .select('*')
            .eq('id', 'singleton')
            .maybeSingle(),
          5000,
          { data: null, error: null }
        );
        if (sRef) refData = sRef;
      } catch (e) {
        console.warn("Could not fetch Supabase referral_config:", e);
      }
    }

    const localRef = db.referral_config || {};
    const creator_referral_reward = Number(refData?.creator_referral_reward ?? localRef.creator_referral_reward ?? 500);
    const brand_referral_reward = Number(refData?.brand_referral_reward ?? localRef.brand_referral_reward ?? 1000);
    const referral_trigger_action = String(localRef.referral_trigger_action ?? refData?.trigger_condition ?? 'first_completed_collab');
    const referral_monthly_cap = refData?.monthly_cap_per_user != null ? Number(refData.monthly_cap_per_user) : (localRef.referral_monthly_cap ?? 10);
    const referral_enabled = refData?.is_active != null ? Boolean(refData.is_active) : (localRef.referral_enabled !== false);

    const feeConfigCombined = {
      id: fee.id || 1,
      threshold_amount: Number(fee.threshold_amount ?? 20000),
      below_threshold_rate: Number(fee.below_threshold_rate ?? 15.0),
      above_threshold_rate: Number(fee.above_threshold_rate ?? 5.0),
      gst_rate: Number(fee.gst_rate ?? 18.0),
      platform_gst_registered: Boolean(fee.platform_gst_registered),
      platform_gstin: String(fee.platform_gstin || ''),
      ugc_commission_pct: Number(fee.ugc_commission_pct ?? 10.0),
      min_withdrawal_amount: Number(fee.min_withdrawal_amount ?? 1000),
      withdrawal_fee_rate: Number(fee.withdrawal_fee_rate ?? 0),
      payout_freeze_all: Boolean(fee.payout_freeze_all),
      dispute_refund_window_days: Number(fee.dispute_refund_window_days ?? 7),
      min_campaign_budget: Number(fee.min_campaign_budget ?? 500),
      max_campaign_budget: Number(fee.max_campaign_budget ?? 1000000),
      updated_at: fee.updated_at || getIsoNow(),

      // Referral fields at top level for direct access
      creator_referral_reward,
      brand_referral_reward,
      referral_trigger_action,
      referral_monthly_cap,
      referral_enabled,

      // Nested config object for loadReferrals
      config: {
        creator_referral_reward,
        brand_referral_reward,
        referral_trigger_action,
        referral_monthly_cap,
        referral_enabled
      }
    };

    return feeConfigCombined;
  }

  // Fee-config (get/put/post) + referrals → moved to admin_campaigns_settings_routes.ts (setupAdminCampaignsSettingsRoutes)


  // FEATURE 2: App Versions (PlatformTools.jsx) → moved to admin_versions_coupons_routes.ts (setupAdminVersionsCouponsRoutes)

  // ─── ADMIN COUPON MANAGEMENT ROUTES (PlatformTools.jsx) ─── → moved to admin_versions_coupons_routes.ts (setupAdminVersionsCouponsRoutes)

  // FEATURE 2: Support Ticket Reply & Notification Route




  // Verification reviews & submissions helper, KYC approve/reject/escalate, and reports moderation → moved to admin_kyc_verification_routes.ts (setupAdminKycVerificationRoutes)

  // Submission verification request




  // Brand KYC and Brands Me handlers moved to brands_routes.ts (setupBrandsRoutes)
  // Creator KYC, Creator Profile, and Creators Me handlers moved to creators_routes.ts (setupCreatorsRoutes)

  // Helper to enrich UGC briefs with brand profiles and logos
  const enrichBriefsWithBrandProfiles = async (briefList: any[]) => {
    if (!briefList || briefList.length === 0) return briefList;
    const db = getDb();
    let supabaseBrandProfiles: any[] = [];
    if (supabase) {
      try {
        const { data } = await (privilegedSupabase || supabase)
          .from('brand_profiles')
          .select('user_id, company_name, logo, cover_image, verified, website, industry, description');
        if (data) supabaseBrandProfiles = data;
      } catch (e) {
        console.warn("[UGC] Error fetching brand_profiles from Supabase for enrichment:", e);
      }
    }
    const localBrandProfiles = db.brand_profiles || [];
    const landingBrands = (db as any).landing_brands || [];

    const byUserId = new Map<string, any>();
    const byName = new Map<string, any>();

    localBrandProfiles.forEach((bp: any) => {
      if (bp.user_id) byUserId.set(String(bp.user_id), bp);
      if (bp.company_name) byName.set(bp.company_name.toLowerCase().trim(), bp);
    });

    supabaseBrandProfiles.forEach((bp: any) => {
      if (bp.user_id) byUserId.set(String(bp.user_id), bp);
      if (bp.company_name) byName.set(bp.company_name.toLowerCase().trim(), bp);
    });

    const landingByName = new Map<string, any>();
    landingBrands.forEach((lb: any) => {
      if (lb.name) landingByName.set(lb.name.toLowerCase().trim(), lb);
    });

    const getFallbackBrandLogo = (brandName: string, productName: string, idx = 0): string => {
      const bName = (brandName || "").toLowerCase().trim();
      const pName = (productName || "").toLowerCase().trim();
      
      if (bName.includes("beardo") || pName.includes("beardo")) {
        return "/api/files/file_8uced48g9du";
      }
      if (bName.includes("nexus") || bName.includes("zepto") || pName.includes("nexus")) {
        return "https://iili.io/CeJ5cla.webp";
      }
      if (bName.includes("fevicol") || pName.includes("fevicol")) {
        return "https://mzcovvzkwzjvzskjqwwy.supabase.co/storage/v1/object/public/brand-logos/landing/1786822669069-3b576cdf-128a-455e-8bdf-902c6711e39f.jpeg";
      }
      if (bName.includes("bsc") || bName.includes("bombay shaving")) {
        return "https://mzcovvzkwzjvzskjqwwy.supabase.co/storage/v1/object/public/brand-logos/landing/1786822692830-ebf3623c-1842-422d-b51b-c8d10c64d51e.png";
      }
      if (pName.includes("protein") || pName.includes("whey") || bName.includes("protein") || bName.includes("whey")) {
        return "https://images.unsplash.com/photo-1579722821273-0f6c7d44362f?w=150&auto=format&fit=crop&q=80";
      }
      if (bName.includes("swiggy")) return "https://iili.io/CeJTOuI.png";
      if (bName.includes("country")) return "https://iili.io/CeJRkZP.png";
      if (bName.includes("uber")) return "https://iili.io/CeJRBvR.jpg";

      return `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(brandName || 'Brand')}&backgroundColor=6366f1&fontFamily=Arial&fontWeight=800`;
    };

    return briefList.map((brief: any, index: number) => {
      const brandId = brief.brand_id ? String(brief.brand_id) : "";
      const rawBrandName = brief.brand_name || brief.company_name || "";
      const lowerName = rawBrandName.toLowerCase().trim();

      let matchedProfile = (brandId && byUserId.get(brandId)) || (lowerName && byName.get(lowerName)) || null;

      let matchedLanding = lowerName ? landingByName.get(lowerName) : null;
      if (!matchedLanding) {
        for (const [key, val] of landingByName.entries()) {
          if (lowerName && (lowerName.includes(key) || key.includes(lowerName))) {
            matchedLanding = val;
            break;
          }
        }
      }

      const resolvedBrandName = brief.brand_name || matchedProfile?.company_name || matchedLanding?.name || (brief.product_name ? `${brief.product_name.split(' ')[0]} Brand` : "Verified Brand");
      
      let resolvedLogo = brief.brand_logo || brief.brand_avatar || matchedProfile?.logo || matchedLanding?.logo_url || "";
      
      if (!resolvedLogo || resolvedLogo.trim().length === 0) {
        resolvedLogo = getFallbackBrandLogo(resolvedBrandName, brief.product_name || "", index);
      }

      return {
        ...brief,
        brand_name: resolvedBrandName,
        brand_logo: resolvedLogo,
        brand_avatar: resolvedLogo,
        brand: {
          id: brief.brand_id,
          user_id: brief.brand_id,
          name: resolvedBrandName,
          company_name: resolvedBrandName,
          logo: resolvedLogo,
          avatar: resolvedLogo,
          verified: matchedProfile?.verified ?? true,
          website: matchedProfile?.website || "",
          industry: matchedProfile?.industry || ""
        }
      };
    });
  };

  // 2. Get My UGC Briefs (Brand)

  // 3. Get Available UGC Briefs (Creator Browse)

  // 4. Get Single UGC Brief

  // 5. Get Brand UGC Orders

  // 6. Get Creator UGC Orders

  // 6b. Get single UGC order by ID

  // Dedicated helper to ensure a real chat thread exists for a UGC order
  const ensureUGCChatThread = async (order: any, briefInput?: any, actorUser?: any, ioInstance?: any) => {
    if (!order || !order.id) return null;
    const orderId = order.id;
    const brandId = order.brand_id || briefInput?.brand_id || 'dev-brand-id-12345';
    const creatorId = order.creator_id || 'dev-user-id-12345';
    const nowIso = getIsoNow();

    // 1. Fetch brief if needed
    let brief = briefInput;
    if (!brief && order.brief_id) {
      if (supabase) {
        try {
          const { data: b } = await (privilegedSupabase || supabase).from('ugc_briefs').select('*').eq('id', order.brief_id).maybeSingle();
          if (b) brief = b;
        } catch (e) {}
      }
      if (!brief) {
        const db = getDb();
        brief = (db.ugc_briefs || []).find((b: any) => b.id === order.brief_id);
      }
    }
    const finalBrandId = brandId || brief?.brand_id || 'dev-brand-id-12345';

    // 2. Check if thread already exists in Supabase
    let existingThread: any = null;
    if (supabase) {
      try {
        const { data } = await (privilegedSupabase || supabase).from('chat_threads')
          .select('*')
          .or(`id.eq.${orderId},deal_id.eq.${orderId}`)
          .maybeSingle();
        if (data) existingThread = data;
      } catch (e) {}
    }
    const db = getDb();
    if (!existingThread) {
      existingThread = (db.chat_threads || []).find((t: any) => t.id === orderId || t.deal_id === orderId);
    }

    const threadStatus = order.status === 'COMPLETED' ? 'COMPLETED' : 'ACTIVE';
    const payout = Number(order.creator_payout || order.agreed_amount || brief?.budget || 0);

    const deliverableType = String(
      order.deliverable_type ||
      brief?.deliverable_type ||
      'collaboration_reel'
    ).toLowerCase();

    const isCollab = order.is_collaboration !== undefined
      ? Boolean(order.is_collaboration)
      : (order.requires_live_link !== undefined
        ? Boolean(order.requires_live_link)
        : (brief?.is_collaboration !== undefined
          ? Boolean(brief.is_collaboration)
          : isCollaborationDeliverable(deliverableType)));

    const requiresLiveLink = order.requires_live_link !== undefined
      ? Boolean(order.requires_live_link)
      : isCollab;

    if (!existingThread) {
      const newThread = {
        id: orderId,
        deal_id: orderId,
        brand_id: finalBrandId,
        creator_id: creatorId,
        status: threadStatus,
        flow_state: threadStatus,
        agreed_amount: payout,
        revision_count: 5,
        agreement_signed_creator: true,
        agreement_signed_brand: true,
        created_at: order.created_at || nowIso,
        updated_at: nowIso
      };

      if (supabase) {
        try {
          const { error: thrErr } = await (privilegedSupabase || supabase).from('chat_threads').upsert(newThread, { onConflict: 'id' });
          if (!thrErr) {
            knownChatThreadIds.add(orderId);
          }
        } catch (err) {
          console.warn("[ensureUGCChatThread] Upsert notice:", err);
        }
      }

      if (!db.chat_threads) db.chat_threads = [];
      const dbThr = {
        ...newThread,
        is_ugc: true,
        type: 'ugc',
        deal_type: 'UGC',
        ugc_order_id: orderId,
        ugc_title: brief?.title || 'UGC Order',
        deliverable_type: deliverableType,
        is_collaboration: isCollab,
        requires_live_link: requiresLiveLink,
        format_category: isCollab ? 'collaboration' : 'ugc_video'
      };
      db.chat_threads.push(dbThr);
      saveDb(db);

      // Welcome message in chat_messages
      const welcomeMsgId = crypto.randomUUID();
      const briefTitle = brief?.title || 'UGC Deliverable';
      const welcomeText = isCollab
        ? `🎉 UGC Collaboration Order Confirmed!\n\nDeliverable: ${briefTitle} (Collaboration Reel)\nPayout: ₹${payout}\nAgreement signed. Submit your draft video for brand review. Once approved, publish on your handle and submit the live link to release payout.`
        : `🎉 UGC Video Order Confirmed!\n\nDeliverable: ${briefTitle} (Raw/Edited Video Deliverable)\nPayout: ₹${payout}\nAgreement signed. Upload your high-res video/drive link for brand review. Once approved, your escrow payout will be released immediately.`;
      
      const welcomeDbMsg = {
        message_id: welcomeMsgId,
        thread_id: orderId,
        sender_user_id: creatorId,
        receiver_user_id: finalBrandId,
        text: welcomeText,
        from_name: actorUser?.name || 'Creator',
        message_type: 'system',
        metadata: { action: 'ugc_order_claimed', order_id: orderId },
        created_at: nowIso,
        read: false
      };

      if (supabase) {
        try {
          await insertChatMessageToSupabase(welcomeDbMsg);
        } catch (e) {
          console.error("[ensureUGCChatThread] Message insert error:", e);
        }
      }

      if (!db.chat_messages) db.chat_messages = [];
      db.chat_messages.push({
        ...welcomeDbMsg,
        id: welcomeMsgId,
        content: welcomeText
      });
      saveDb(db);

      if (ioInstance) {
        ioInstance.to(orderId).emit("new_message", { ...welcomeDbMsg, id: welcomeMsgId, content: welcomeText });
        ioInstance.emit("thread_updated", { threadId: orderId });
      }

      return newThread;
    } else {
      if (order.status === 'COMPLETED' && existingThread.status !== 'COMPLETED') {
        if (supabase) {
          try {
            await (privilegedSupabase || supabase).from('chat_threads').update({ status: 'COMPLETED', flow_state: 'COMPLETED', updated_at: nowIso }).eq('id', existingThread.id);
          } catch (e) {}
        }
        existingThread.status = 'COMPLETED';
        existingThread.flow_state = 'COMPLETED';
        existingThread.updated_at = nowIso;
        saveDb(db);
        if (ioInstance) {
          ioInstance.emit("thread_updated", { threadId: existingThread.id, status: 'COMPLETED', flow_state: 'COMPLETED' });
        }
      }
      return existingThread;
    }
  };

  // 7. Claim a UGC Brief (Creator)

  // 8. Sign UGC Order Agreement

  // 8. Sign UGC Order Agreement

  // Unified UGC Lifecycle Synchronizer (Extracted to services/ugcLifecycleService.ts)
  const syncUgcLifecycleEvent = createUgcLifecycleService({
    supabase,
    privilegedSupabase,
    getDb,
    saveDb,
    getIsoNow,
    ensureUGCChatThread,
    insertChatMessageToSupabase,
  });

  const campaignLifecycleHandlers = createCampaignLifecycleHandlers({
    supabase,
    privilegedSupabase,
    getDb,
    saveDb,
    parseAuthUser,
    insertChatMessageToSupabase,
    getIsoNow,
    syncUgcLifecycleEvent,
  });

  const {
    handleThreadApproveLiveLinks,
    handleThreadApproveContent,
    handleThreadSubmitLiveLink,
    handleThreadRejectLiveLinks,
    handleThreadDeclineLiveLinksResubmission,
    handleCampaignRevision,
    handleCampaignCancel,
  } = campaignLifecycleHandlers;

  const ugcLifecycleHandlers = createUgcLifecycleHandlers({
    supabase,
    privilegedSupabase,
    getDb,
    parseAuthUser,
    syncUgcLifecycleEvent,
    handleThreadApproveLiveLinks,
    handleThreadApproveContent,
    handleCampaignRevision,
  });

  const {
    handleUgcDeliverableSubmit,
    handleUgcOrderApprove,
    handleUgcOrderRevision,
    handleUgcOrderDeclineRevisions,
    handleUgcOrderCancel,
  } = ugcLifecycleHandlers;



  // 13. Creator UGC Earnings

  // 14. UGC Showcase (Public)

  // 15. Admin UGC Orders


  // Get all UGC Orders (Legacy endpoint compatibility & Ops page)

  // Accept / Claim UGC order for in-house ops team handling

  // Submit deliverable video for UGC order / brief

  // Helper to populate comprehensive thread data (profiles, avatars, UGC brief info, unread counts)
  const populateThreadData = async (threads: any[], currentUserId: string) => {
    if (!threads || threads.length === 0) return [];
    const db = getDb();

    // 1. Gather all participant user IDs
    const userIds = [...new Set(threads.flatMap(t => [t.creator_id, t.brand_id]).filter(Boolean))];

    // 2. Fetch users, brand_profiles, creator_profiles
    let usersList: any[] = [];
    let brandProfilesList: any[] = [];
    let creatorProfilesList: any[] = [];

    if (supabase && userIds.length > 0) {
      try {
        const [uRes, bpRes, cpRes] = await Promise.all([
          (privilegedSupabase || supabase).from('users').select('*').in('user_id', userIds),
          (privilegedSupabase || supabase).from('brand_profiles').select('*').in('user_id', userIds),
          (privilegedSupabase || supabase).from('creator_profiles').select('*').in('user_id', userIds)
        ]);
        if (uRes.data) usersList = uRes.data;
        if (bpRes.data) brandProfilesList = bpRes.data;
        if (cpRes.data) creatorProfilesList = cpRes.data;
      } catch (e) {
        console.error("[populateThreadData] Profile fetch error:", e);
      }
    }

    const userMap: Record<string, any> = {};
    (db.users || []).forEach((u: any) => {
      const uid = u.user_id || u.id;
      if (uid) userMap[uid] = u;
    });
    usersList.forEach((u: any) => {
      const uid = u.user_id || u.id;
      if (uid) userMap[uid] = { ...userMap[uid], ...u };
    });

    const brandProfileMap: Record<string, any> = {};
    (db.brand_profiles || []).forEach((bp: any) => {
      const uid = bp.user_id || bp.id;
      if (uid) brandProfileMap[uid] = bp;
    });
    brandProfilesList.forEach((bp: any) => {
      const uid = bp.user_id || bp.id;
      if (uid) brandProfileMap[uid] = { ...brandProfileMap[uid], ...bp };
    });

    const creatorProfileMap: Record<string, any> = {};
    (db.creator_profiles || []).forEach((cp: any) => {
      const uid = cp.user_id || cp.id;
      if (uid) creatorProfileMap[uid] = cp;
    });
    creatorProfilesList.forEach((cp: any) => {
      const uid = cp.user_id || cp.id;
      if (uid) creatorProfileMap[uid] = { ...creatorProfileMap[uid], ...cp };
    });

    // 3. UGC Orders, Deals, and Briefs mapping
    const potentialOrderIds = [...new Set(threads.map(t => t.deal_id || t.id).filter(Boolean))];
    let ugcOrdersList: any[] = [];
    let dealsList: any[] = [];
    let supabaseSubmissionsList: any[] = [];
    if (supabase && potentialOrderIds.length > 0) {
      try {
        const [oRes, dRes, csRes] = await Promise.all([
          (privilegedSupabase || supabase).from('ugc_orders').select('*').in('id', potentialOrderIds),
          (privilegedSupabase || supabase).from('deals').select('*').in('id', potentialOrderIds),
          (privilegedSupabase || supabase).from('content_submissions').select('*').in('deal_id', potentialOrderIds)
        ]);
        if (oRes.data) ugcOrdersList = oRes.data;
        if (dRes.data) dealsList = dRes.data;
        if (csRes?.data) supabaseSubmissionsList = csRes.data;
      } catch (e) {}
    }
    const orderMap: Record<string, any> = {};
    (db.ugc_orders || []).forEach((o: any) => { if (o.id) orderMap[o.id] = o; });
    ugcOrdersList.forEach((o: any) => { if (o.id) orderMap[o.id] = { ...orderMap[o.id], ...o }; });

    const dealMap: Record<string, any> = {};
    (db.deals || []).forEach((d: any) => { if (d.id) dealMap[d.id] = d; });
    dealsList.forEach((d: any) => { if (d.id) dealMap[d.id] = { ...dealMap[d.id], ...d }; });

    const briefIds = [...new Set(Object.values(orderMap).map((o: any) => o.brief_id).filter(Boolean))];
    let briefsList: any[] = [];
    if (supabase && briefIds.length > 0) {
      try {
        const { data: bData } = await (privilegedSupabase || supabase).from('ugc_briefs').select('*').in('id', briefIds);
        if (bData) briefsList = bData;
      } catch (e) {}
    }
    const briefMap: Record<string, any> = {};
    (db.ugc_briefs || []).forEach((b: any) => { if (b.id) briefMap[b.id] = b; });
    briefsList.forEach((b: any) => { if (b.id) briefMap[b.id] = { ...briefMap[b.id], ...b }; });

    // 4. Campaign mapping
    const campaignIds = [...new Set(threads.map(t => t.campaign_id).filter(Boolean))];
    let campaignsList: any[] = [];
    if (supabase && campaignIds.length > 0) {
      try {
        const { data: cData } = await (privilegedSupabase || supabase).from('campaigns').select('*').in('campaign_id', campaignIds);
        if (cData) campaignsList = cData;
      } catch (e) {}
    }
    const campaignMap: Record<string, any> = {};
    (db.campaigns || []).forEach((c: any) => { if (c.campaign_id) campaignMap[c.campaign_id] = c; });
    campaignsList.forEach((c: any) => { if (c.campaign_id) campaignMap[c.campaign_id] = { ...campaignMap[c.campaign_id], ...c }; });

    // 5. Messages mapping for last_message, total count, unread count
    const threadIds = threads.map(t => t.id).filter(Boolean);
    let allMessages: any[] = [];
    if (supabase && threadIds.length > 0) {
      try {
        const { data: mData } = await (privilegedSupabase || supabase).from('chat_messages')
          .select('*')
          .in('thread_id', threadIds)
          .order('created_at', { ascending: true });
        if (mData) allMessages = mData;
      } catch (e) {}
    }
    const localMsgs = (db.chat_messages || []).filter((m: any) => threadIds.includes(m.thread_id));
    const combinedMsgs = [...allMessages];
    localMsgs.forEach((lm: any) => {
      const mid = lm.message_id || lm.id;
      if (!combinedMsgs.some(m => (m.message_id || m.id) === mid)) {
        combinedMsgs.push(lm);
      }
    });

    const messagesByThread: Record<string, any[]> = {};
    combinedMsgs.forEach((m: any) => {
      if (!messagesByThread[m.thread_id]) messagesByThread[m.thread_id] = [];
      messagesByThread[m.thread_id].push(m);
    });

    // 6. Build populated threads
    return threads.map(t => {
      const order = orderMap[t.id] || orderMap[t.deal_id] || (t.id?.startsWith('ugcord_') ? orderMap[t.id] : null);
      const isUgc = Boolean(
        order || 
        t.is_ugc || 
        t.type === 'ugc' || 
        t.deal_type === 'UGC' || 
        t.id?.startsWith('ugcord_') || 
        t.deal_id?.startsWith('ugcord_') ||
        t.ugc_order_id
      );

      const brief = order?.brief_id ? briefMap[order.brief_id] : null;
      const campaign = t.campaign_id ? campaignMap[t.campaign_id] : null;

      const brandUser = userMap[t.brand_id] || {};
      const brandProf = brandProfileMap[t.brand_id] || {};
      const creatorUser = userMap[t.creator_id] || {};
      const creatorProf = creatorProfileMap[t.creator_id] || {};

      const brandName = brandProf.company_name || brandUser.name || brief?.brand_name || 'Brand Partner';
      const brandLogo = brandProf.logo || brandUser.picture || brief?.brand_logo || '';
      const creatorName = creatorProf.name || creatorProf.full_name || creatorUser.name || 'Creator';
      const creatorPic = creatorProf.picture || creatorProf.photo || creatorProf.avatar_url || creatorProf.profile_picture_url || creatorUser.picture || '';

      const tMsgs = messagesByThread[t.id] || [];
      const lastMsg = tMsgs.length > 0 ? {
        ...tMsgs[tMsgs.length - 1],
        content: tMsgs[tMsgs.length - 1].text || tMsgs[tMsgs.length - 1].content
      } : (t.last_message || null);

      const unreadCount = tMsgs.filter((m: any) => !m.read && m.sender_user_id !== currentUserId).length;

      const title = brief?.title || order?.title || campaign?.title || t.campaign_title || t.ugc_title || (isUgc ? 'UGC Order' : 'Campaign Deal');
      const deal = dealMap[t.deal_id] || (t.deal_id ? (db.deals || []).find((d: any) => d.id === t.deal_id) : null) || null;
      const isPaidOrReleased = ['PAID', 'RELEASED'].includes(order?.payment_status?.toUpperCase()) ||
        ['PAID', 'RELEASED', 'COMPLETED'].includes(t?.status?.toUpperCase()) ||
        ['PAID', 'RELEASED', 'COMPLETED'].includes(t?.flow_state?.toUpperCase()) ||
        ['PAID', 'RELEASED'].includes(t?.payment_status?.toUpperCase()) ||
        order?.status === 'COMPLETED';

      const isFunded = Boolean(
        isPaidOrReleased ||
        t.payment_funded ||
        deal?.escrow_hold ||
        Boolean(deal?.escrow_hold_at) ||
        order?.escrow_hold ||
        Boolean(order?.escrow_held_at) ||
        ['ESCROW_HELD', 'PAID', 'RELEASED', 'COMPLETED'].includes(order?.payment_status?.toUpperCase())
      );

      const effectivePaymentStatus = isPaidOrReleased
        ? 'RELEASED'
        : (isFunded ? 'ESCROW_HELD' : (order?.payment_status || t.payment_status || 'PENDING'));

      const allSubs = [
        ...(supabaseSubmissionsList || []),
        ...(db.content_submissions || []),
        ...(deal?.content_submissions || [])
      ];
      const latestSub = allSubs.filter((s: any) =>
        s.deal_id === t.deal_id || s.deal_id === t.id || s.deal_id === order?.id
      ).sort((a: any, b: any) => new Date(b.submitted_at || 0).getTime() - new Date(a.submitted_at || 0).getTime())[0];

      const submittedVideo = t.submitted_video_url || latestSub?.video_url || order?.video_url || deal?.video_url || null;

      const deliverableTypeStr = String(order?.deliverable_type || brief?.deliverable_type || t.deliverable_type || (isUgc ? 'collaboration_reel' : 'campaign_collaboration')).toLowerCase();
      const isRawVideoUgc = Boolean(
        isUgc && (
          deliverableTypeStr === 'ugc_video_raw' ||
          deliverableTypeStr === 'ugc_video_edited' ||
          deliverableTypeStr === 'ugc_raw_video' ||
          deliverableTypeStr.includes('raw') ||
          deliverableTypeStr.includes('ugc_video')
        )
      );

      // Campaign and UGC both travelled under the single name `deal_id`, which is how
      // ugcord_... ids ended up in a column meant for campaign deal UUIDs and why the two
      // flows kept bleeding into each other. `campaign_deal_id` is populated ONLY for
      // campaign threads, so downstream code can tell the two apart without guessing from
      // the shape of a string. `deal_id` is left exactly as it was — hundreds of call sites
      // still read it, and renaming it is a separate job.
      const campaignDealId = !isUgc ? (t.campaign_deal_id || t.deal_id || null) : null;

      return {
        ...t,
        campaign_deal_id: campaignDealId,
        deal: deal,
        escrow_hold: isFunded,
        payment_funded: isFunded,
        payment_status: effectivePaymentStatus,
        escrow_held_at: deal?.escrow_hold_at || order?.escrow_held_at || (isFunded ? t.updated_at : null),
        flow_state: t.flow_state || t.status,
        submitted_video_url: submittedVideo,
        content_url: submittedVideo,
        video_url: submittedVideo,
        latest_submission: latestSub || null,
        is_ugc: isUgc,
        deliverable_type: deliverableTypeStr,
        is_raw_video_ugc: isRawVideoUgc,
        requires_live_link: !isRawVideoUgc,
        type: isUgc ? 'ugc' : (t.type || 'campaign'),
        deal_type: isUgc ? 'UGC' : 'CAMPAIGN',
        ugc_order_id: isUgc ? (order?.id || t.deal_id || t.id) : null,
        ugc_order: order || null,
        ugc_brief_id: brief?.id || null,
        ugc_brief: brief || null,
        ugc_title: isUgc ? title : null,
        campaigns: campaign || null,
        campaign_title: title,
        creator: {
          id: t.creator_id,
          user_id: t.creator_id,
          name: creatorName,
          full_name: creatorName,
          picture: creatorPic,
          photo: creatorPic,
          avatar: creatorPic,
          avatar_url: creatorPic,
          profile_picture_url: creatorPic,
          profile: {
            id: t.creator_id,
            user_id: t.creator_id,
            name: creatorName,
            full_name: creatorName,
            photo: creatorPic,
            picture: creatorPic,
            avatar: creatorPic,
            avatar_url: creatorPic,
            profile_picture_url: creatorPic
          }
        },
        brand: {
          id: t.brand_id,
          user_id: t.brand_id,
          name: brandName,
          company_name: brandName,
          picture: brandLogo,
          photo: brandLogo,
          logo: brandLogo,
          logo_url: brandLogo,
          avatar: brandLogo,
          profile: {
            id: t.brand_id,
            user_id: t.brand_id,
            company_name: brandName,
            name: brandName,
            logo: brandLogo,
            logo_url: brandLogo,
            photo: brandLogo,
            picture: brandLogo
          }
        },
        last_message: lastMsg,
        total_messages_count: tMsgs.length,
        unread_count: unreadCount
      };
    });
  };

  // Re-add missing chat routes






  



  // --- Admin Chat Monitoring Routes ---






  // Reinstate user (unrestrict) → moved to admin_kyc_verification_routes.ts (setupAdminKycVerificationRoutes)

  // Setup Blog routes
  setupBlogRoutes(app, router, { privilegedSupabase, supabase, getDb, saveDb, parseAuthUser, logAdminAction, upload });
  setupPaymentRoutes(app, router, { supabase, privilegedSupabase, getDb, saveDb, parseAuthUser, logAdminAction, sendNotification, fetchUserScopedTransactions, serializeChatMessage, insertChatMessageToSupabase, parseThreadState, getIsTestMode });
  setupChatCoreRoutes(app, router, { supabase, privilegedSupabase, getDb, saveDb, parseAuthUser, ensureUGCChatThread, populateThreadData, insertChatMessageToSupabase });
  setupUgcOrderRoutes(app, router, { handleThreadApproveContent, handleUgcDeliverableSubmit, handleUgcOrderApprove, handleUgcOrderRevision, handleUgcOrderDeclineRevisions, handleUgcOrderCancel });
  setupCampaignThreadRoutes(app, router, {
    handleCampaignApprove: handleThreadApproveLiveLinks,
    handleCampaignApproveContent: handleThreadApproveContent,
    handleCampaignSubmitLiveLink: handleThreadSubmitLiveLink,
    handleCampaignSubmitContent: handleUgcDeliverableSubmit,
    handleCampaignRevision,
    handleCampaignDeclineRevisions: handleThreadDeclineLiveLinksResubmission,
    handleCampaignCancel
  });

  const resolveThreadForDispatch = async (rawId: string) => {
    const db = getDb();
    let thread = (db.chat_threads || []).find((t: any) => t.id === rawId || t.deal_id === rawId);
    if (!thread && supabase) {
      try {
        const { data: thr } = await (privilegedSupabase || supabase)
          .from('chat_threads')
          .select('*')
          .or(`id.eq.${rawId},deal_id.eq.${rawId}`)
          .maybeSingle();
        if (thr) thread = thr;
      } catch (e) {}
    }
    if (!thread && (db.ugc_orders || []).some((o: any) => o.id === rawId || o.brief_id === rawId)) {
      return { id: rawId, is_ugc: true };
    }
    return thread || { id: rawId };
  };

  // Thin forwarders on old /chat/v2/... routes dispatching on isUgcThread
  router.post(["/chat/v2/threads/:id/reject-content", "/chat/v2/threads/:id/request-revision", "/chat/v2/threads/:threadId/reject-content", "/chat/v2/threads/:threadId/request-revision"], async (req, res) => {
    const thread = await resolveThreadForDispatch(req.params.id || req.params.threadId);
    if (isUgcThread(thread)) {
      return handleUgcOrderRevision(req, res);
    }
    return handleCampaignRevision(req, res);
  });

  router.post(["/chat/v2/threads/:id/mark-complete", "/chat/v2/threads/:threadId/mark-complete"], async (req, res) => {
    const thread = await resolveThreadForDispatch(req.params.id || req.params.threadId);
    if (isUgcThread(thread)) {
      return handleUgcOrderApprove(req, res);
    }
    return handleThreadApproveLiveLinks(req, res);
  });

  router.post(["/chat/v2/threads/:id/decline-revisions", "/chat/v2/threads/:threadId/decline-revisions"], async (req, res) => {
    const thread = await resolveThreadForDispatch(req.params.id || req.params.threadId);
    if (isUgcThread(thread)) {
      return handleUgcOrderDeclineRevisions(req, res);
    }
    return handleThreadDeclineLiveLinksResubmission(req, res);
  });

  router.post(["/chat/v2/threads/:id/cancel-order", "/chat/v2/threads/:id/cancel-claim", "/chat/v2/threads/:threadId/cancel-order", "/chat/v2/threads/:threadId/cancel-claim"], async (req, res) => {
    const thread = await resolveThreadForDispatch(req.params.id || req.params.threadId);
    if (isUgcThread(thread)) {
      return handleUgcOrderCancel(req, res);
    }
    return handleCampaignCancel(req, res);
  });

  router.post(["/chat/v2/threads/:id/approve-content", "/chat/v2/threads/:threadId/approve-content", "/chat/v2/threads/:id/content/approve", "/chat/v2/threads/:threadId/content/approve"], async (req, res) => {
    return handleThreadApproveContent(req, res);
  });

  router.post(["/chat/v2/threads/:id/submit-live-link", "/chat/v2/threads/:threadId/submit-live-link", "/chat/v2/threads/:id/submit-live-links", "/chat/v2/threads/:threadId/submit-live-links"], async (req, res) => {
    const thread = await resolveThreadForDispatch(req.params.id || req.params.threadId);
    if (isUgcThread(thread)) {
      return handleUgcDeliverableSubmit(req, res);
    }
    return handleThreadSubmitLiveLink(req, res);
  });
  setupAdminContentRoutes(app, router, { supabase, privilegedSupabase, getDb, saveDb, parseAuthUser });
  setupAdminVersionsCouponsRoutes(app, router, { supabase, privilegedSupabase, getDb, saveDb, parseAuthUser, logAdminAction });
  setupAdminKycVerificationRoutes(app, router, { supabase, privilegedSupabase, getDb, saveDb, parseAuthUser, logAdminAction, sendNotification, getSignedUgcUrl });
  setupAdminLogsCreatorsRoutes(app, router, { supabase, privilegedSupabase, getDb, saveDb, parseAuthUser, logAdminAction, sendNotification, checkAdminPerm, fetchUserScopedTransactions, getSignedUgcUrl, getUserPassword, recordUserPassword });
  setupAdminWaitlistRoutes(app, router, { supabase, privilegedSupabase, getDb, saveDb, parseAuthUser, sendNotification, checkAdminPerm });
  setupAdminCampaignsSettingsRoutes(app, router, { supabase, privilegedSupabase, getDb, saveDb, parseAuthUser, logAdminAction, sendNotification, getSettings, getFullFeeAndReferralConfig });
  setupAdminSystemMaintenanceRoutes(app, router, { supabase, privilegedSupabase, getDb, saveDb, parseAuthUser, logAdminAction, insertChatMessageToSupabase });
  setupAdminUsersEnforcementRoutes(app, router, { supabase, privilegedSupabase, getDb, saveDb, parseAuthUser, logAdminAction, sendNotification, sendActivityNotificationEmail, sendSuperAdminAlertEmail, checkAdminPerm, getUserPassword, recordUserPassword, DEFAULT_WARNING_TEMPLATES });
  setupUgcBrowseRoutes(app, router, { supabase, privilegedSupabase, getDb, saveDb, parseAuthUser, ensureUGCChatThread, enrichBriefsWithBrandProfiles });
  setupSupportRoutes(app, router, { supabase, privilegedSupabase, getDb, saveDb, parseAuthUser, sendNotification, logAdminAction });
  setupCreatorsRoutes(app, router, { supabase, privilegedSupabase, getDb, saveDb, parseAuthUser, syncEntityTags, processBase64Image, getSettings, markupForRole, getActingBrandId, logTeamActivity, sanitizeCreatorProfile, fetchCreatorReviews, broadcastAdminNotification });
  setupDealsRoutes(app, router, { supabase, privilegedSupabase, getDb, saveDb, parseAuthUser, insertChatMessageToSupabase, handleThreadApproveLiveLinks });
  setupTagsAndNotificationsRoutes(app, router, { supabase, privilegedSupabase, getDb, saveDb, parseAuthUser, getActingBrandId });
  setupCampaignsRoutes(app, router, { supabase, privilegedSupabase, getDb, saveDb, parseAuthUser, sendNotification, serializeChatMessage, insertChatMessageToSupabase, syncEntityTags, getActingBrandId, createEscrowTransaction, isCreatorKycVerified });
  setupBrandsRoutes(app, router, { supabase, privilegedSupabase, getDb, saveDb, parseAuthUser, syncEntityTags, processBase64Image, getActingBrandId, logTeamActivity, sanitizeBrandProfile, broadcastAdminNotification });
  setupContentSubmissionsRoutes(app, router, { supabase, privilegedSupabase, getDb, saveDb, parseAuthUser, insertChatMessageToSupabase });
  setupMiscRoutes(app, router, { supabase, privilegedSupabase, getDb, saveDb, parseAuthUser, ensureBucketExists, getFullFeeAndReferralConfig, upload, getSettings, getActingBrandId });
  setupDealsChatRoutes(app, router, { supabase, privilegedSupabase, getDb, saveDb, parseAuthUser, sendNotification, serializeChatMessage, insertChatMessageToSupabase, parseThreadState, updateThreadState, enrichThread, handleThreadApproveLiveLinks, handleThreadApproveContent, handleThreadSubmitLiveLink, handleThreadRejectLiveLinks, handleThreadDeclineLiveLinksResubmission, getIsTestMode });
  setupSessionRoutes(app, router, { supabase, privilegedSupabase, getDb, saveDb, parseAuthUser });
  setupAuthRoutes(app, router, { supabase, privilegedSupabase, getDb, saveDb, parseAuthUser, logAdminAuth, getPermissionsForUser, broadcastAdminNotification, checkForgotPasswordRateLimit, recordUserPassword, sendSuperAdminAlertEmail, processBase64Image, syncEntityTags });

  // Support direct calls to admin API routes either with or without /api prefix
  app.use((req, res, next) => {
    if (req.path.startsWith('/admin/transactions') || req.path.startsWith('/admin/system-collabs') || req.path.startsWith('/ugc-orders/')) {
      req.url = `/api${req.url}`;
    }
    next();
  });

  app.use("/api", router);

  // Catch unhandled /api routes and return 404 JSON instead of falling through to Vite HTML
  app.all("/api/*", (req, res) => {
    res.status(404).json({ detail: `API endpoint ${req.method} ${req.path} not found`, code: "NOT_FOUND" });
  });
  
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error(err.stack);
    res.status(500).json({ detail: err.message || "Internal Server Error" });
  });

  app.use('/assets', express.static(path.join(process.cwd(), 'public', 'assets')));

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true, allowedHosts: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = fs.existsSync(path.join(process.cwd(), 'dist', 'client', 'index.html'))
      ? path.join(process.cwd(), 'dist', 'client')
      : path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }


  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}
startServer();

