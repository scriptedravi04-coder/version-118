import { checkComprehensiveDisallowedContent, FilterOptions, FilterResult } from "./contactSecurityFilter";
// Pure, standalone helper functions extracted from server.ts.
// These functions have no dependency on the app's internal state
// (database, Supabase client, in-memory db, etc.) — they only depend
// on their own arguments and process.env, so they're safe to import
// from anywhere without needing to pass in extra context.

import Razorpay from "razorpay";

/**
 * Resolves the "from" email address to use for outgoing emails,
 * falling back to the configured env var, then a hardcoded default.
 */
import { Resend as OriginalResend } from "resend";

/**
 * A thin wrapper around the real Resend email client that automatically
 * filters out mock/test email addresses (example.com, .demo, @ybex.io)
 * before actually sending, so test data never triggers a real email send.
 */
export class Resend extends OriginalResend {
  constructor(key: string) {
    super(key);
    const originalSend = this.emails.send.bind(this.emails);
    this.emails.send = async (options: any) => {
      let toEmails = Array.isArray(options.to) ? options.to : [options.to];
      toEmails = toEmails.filter((e: string) => e && !e.includes('@example.com') && !e.endsWith('.demo') && !e.endsWith('@ybex.io'));
      if (toEmails.length === 0) {
        console.log("[Resend Intercept] Skipped sending to mock emails:", options.to);
        return { data: { id: 'mocked_id' }, error: null };
      }
      options.to = toEmails;
      options.from = getValidFromEmail(options.from);
      return await originalSend(options);
    };
  }
}

/**
 * Builds the standard branded HTML email template used across all
 * transactional emails (welcome, verification, password reset, etc.).
 */
export function buildEmailHtml({ title, greeting, paragraphs, button, signatureHtml }: any) {
  return `
<div style="background-color: #f4f5f7; padding: 40px 20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol';">
  <div style="max-width: 600px; margin: 0 auto;">
    <div style="text-align: center; margin-bottom: 24px;">
      <h2 style="margin: 0; color: #374151; font-weight: 700; font-size: 22px; letter-spacing: -0.5px;">Ybex</h2>
    </div>
    
    <div style="background: #ffffff; border-radius: 8px; padding: 40px; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05); border: 1px solid #e5e7eb; color: #4b5563; font-size: 15px; line-height: 1.6;">
      ${title ? `<h3 style="color: #111827; margin-top: 0; margin-bottom: 24px; font-size: 18px; font-weight: 600;">${title}</h3>` : ''}
      
      ${greeting ? `<p style="margin-top: 0; margin-bottom: 20px;">${greeting}</p>` : ''}
      
      ${paragraphs.map((p) => `<p style="margin-top: 0; margin-bottom: 20px;">${p}</p>`).join('')}

      ${button ? `<div style="margin-top: 30px; margin-bottom: 30px;"><a href="${button.link}" style="display: inline-block; background-color: #4f46e5; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 14px;">${button.text}</a></div>` : ''}

      ${signatureHtml ? signatureHtml : `
        <div style="margin-top: 30px; padding-top: 20px;">
          <p style="margin: 0;">Cheers,</p>
          <p style="margin: 0; margin-top: 4px; font-weight: 600; color: #111827;">Team Ybex</p>
        </div>
      `}
    </div>
    
    <div style="text-align: center; margin-top: 30px; font-size: 12px; color: #9ca3af;">
      <p style="margin: 0;">&copy; ${new Date().getFullYear()} Ybex. All rights reserved.</p>
    </div>
  </div>
</div>
`;
}

/**
 * Deterministically generates plausible "applied"/"views" display numbers
 * for a campaign, seeded from its id/title so the same campaign always
 * shows the same numbers (used where real applicant/view counts aren't
 * tracked yet).
 */
export function calculateCampaignStats(c: any) {
  const idStr = String(c.campaign_id || c.id || c.title || "campaign");
  let hash = 0;
  for (let i = 0; i < idStr.length; i++) {
    hash = (hash << 5) - hash + idStr.charCodeAt(i);
    hash |= 0;
  }
  const posHash = Math.abs(hash);

  // Natural varied applied count: 2, 3, 4, 5
  const baseApplied = 2 + (posHash % 4);
  let applied = baseApplied;
  if (Array.isArray(c.applicants) && c.applicants.length > 1) {
    applied = Math.min(8, Math.max(baseApplied, c.applicants.length));
  } else if (typeof c.applied === 'number' && c.applied > 1 && c.applied <= 15) {
    applied = c.applied;
  }

  // Views strictly 10 to 15 (always greater than applied)
  let views = Math.min(15, Math.max(10, 10 + (posHash % 6)));
  if (views <= applied) {
    views = applied + 5;
  }

  return { views, applied };
}

export function getValidFromEmail(from?: string): string {
  if (from && typeof from === 'string' && from.includes('@') && !from.startsWith('re_')) {
    return from.trim();
  }
  const envFrom = process.env.RESEND_FROM_EMAIL;
  if (envFrom && typeof envFrom === 'string' && envFrom.includes('@') && !envFrom.startsWith('re_')) {
    return envFrom.trim();
  }
  return "Ybex <noreply@ybexmedia.in>";
}

// Lazy Razorpay SDK Initialization — module-scoped singleton, same
// behavior as before (only created once, on first real use).
let razorpay: Razorpay | null = null;

export function getRazorpay(): Razorpay {
  if (!razorpay) {
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keyId || !keySecret) {
      throw new Error("Razorpay is not configured on the server. Please set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in environment variables.");
    }
    razorpay = new Razorpay({
      key_id: keyId,
      key_secret: keySecret,
    });
  }
  return razorpay;
}

/**
 * Robust helper to call Gemini with a backup/fallback model in case of
 * temporary 503 UNAVAILABLE or high demand spikes on the primary model.
 */
export async function generateContentResilient(ai: any, params: { model?: string; contents: any; systemInstruction?: string; config?: any }) {
  const primaryModel = params.model || "gemini-3.5-flash";
  const backupModel = primaryModel === "gemini-3.5-flash" ? "gemini-3.1-flash-lite" : "gemini-3.5-flash";

  try {
    return await ai.models.generateContent({
      ...params,
      model: primaryModel
    });
  } catch (err: any) {
    console.warn(`Primary Gemini model ${primaryModel} failed, trying backup ${backupModel}:`, err);
    try {
      return await ai.models.generateContent({
        ...params,
        model: backupModel
      });
    } catch (backupErr) {
      console.error(`Backup Gemini model ${backupModel} also failed:`, backupErr);
      throw err; // propagate the original error so that the route's try-catch can run its fallback
    }
  }
}

/**
 * Resilient Promise timeout wrapper to prevent long hanging queries
 * (e.g. Supabase cold-starts/network drops) from hanging a request forever.
 */
/**
 * Applies a percentage adjustment to a numeric value, either upward
 * (direction 1) or downward (direction -1). Used for role-based markup/
 * deduction on rate cards.
 */
export function applyPct(value: number, pct: number, direction: number): number {
  if (!value || !pct) return value;
  const factor = 1 + (direction * pct) / 100.0;
  return Math.round(value * factor);
}

/**
 * Applies a percentage markup to every numeric field of a rate-card
 * object, leaving non-numeric fields untouched.
 */
export function transformRateCard(rc: any, pct: number): any {
  if (!rc || !pct) return rc || {};
  const out: any = {};
  for (const k in rc) {
    if (typeof rc[k] === "number") {
      out[k] = applyPct(rc[k], pct, 1);
    } else {
      out[k] = rc[k];
    }
  }
  return out;
}

/**
 * Detects whether a chat message likely contains a phone number or other
 * attempt to move communication off-platform (WhatsApp, direct call, etc.).
 * This is a heuristic filter, not a perfect one — it's meant to catch the
 * common, straightforward cases (a 10-digit Indian mobile number, with or
 * without spaces/dashes/dots as separators, optionally with a +91/91/0
 * prefix), plus obvious "contact me directly" phrasing paired with any long
 * digit run.
 */
// Kept as the entry point every existing call site already uses. The detection itself now
// lives in contactSecurityFilter.ts, which handles what this regex pair could not: numbers
// split across separate messages, numbers spelled in words (English and Hindi), leetspeak
// digits, @handles, and messaging-app links. See that file for the keyword policy.
export function containsPhoneNumberOrContactBypass(
  text: string,
  opts: FilterOptions = {}
): boolean {
  return checkComprehensiveDisallowedContent(text, opts).blocked;
}

/** Same check, but returns the reason so callers can show a useful message. */
export function inspectContactLeakage(text: string, opts: FilterOptions = {}): FilterResult {
  return checkComprehensiveDisallowedContent(text, opts);
}

export function safePromiseTimeout<T>(promise: any, timeoutMs = 15000, fallback: T): Promise<T> {
  if (!promise || typeof promise.then !== 'function') {
    return Promise.resolve(promise || fallback);
  }
  let timeoutHandle: any;
  const timeoutPromise = new Promise<T>((resolve) => {
    timeoutHandle = setTimeout(() => resolve(fallback), timeoutMs);
  });
  return Promise.race([
    promise.then((res: any) => {
      if (timeoutHandle) clearTimeout(timeoutHandle);
      return res;
    }).catch((err: any) => {
      if (timeoutHandle) clearTimeout(timeoutHandle);
      console.warn(`[safePromiseTimeout error fallback]`, err?.message || err);
      return fallback;
    }),
    timeoutPromise
  ]);
}
export function buildContractSignEmailHtml({
  code,
  recipientName,
  brandName,
  creatorName,
  campaignTitle,
  dealAmount
}: {
  code: string;
  recipientName?: string;
  brandName?: string;
  creatorName?: string;
  campaignTitle?: string;
  dealAmount?: string | number;
}) {
  const brand = brandName || "Brand Partner";
  const creator = creatorName || "Creator Partner";
  const campaign = campaignTitle || "Influencer Collaboration Agreement";
  const name = recipientName || "there";
  const amountStr = dealAmount ? (typeof dealAmount === "number" ? `₹${dealAmount.toLocaleString('en-IN')}` : String(dealAmount)) : null;

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verify Your Signature - Ybex Secure Contract</title>
</head>
<body style="margin: 0; padding: 0; background-color: #F2F2F7; font-family: 'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; color: #0A0A0A;">

  <table border="0" cellpadding="0" cellspacing="0" width="100%" style="table-layout: fixed; background-color: #F2F2F7; padding: 36px 12px;">
    <tr>
      <td align="center">
        
        <!-- MAIN CARD -->
        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 540px; background-color: #FFFFFF; border-radius: 16px; overflow: hidden; border: 1px solid #E5E5E2; box-shadow: 0 4px 20px -2px rgba(0, 0, 0, 0.05);">
          
          <!-- BRAND HEADER -->
          <tr>
            <td style="padding: 24px 28px 20px 28px; border-bottom: 1px solid #F0F0F0;">
              <table border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td align="left" style="vertical-align: middle;">
                    <div style="font-size: 22px; font-weight: 800; color: #0A0A0A; letter-spacing: -0.5px;">
                      Ybex<span style="color: #7C3AED;">.</span>
                    </div>
                  </td>
                  <td align="right" style="vertical-align: middle;">
                    <span style="display: inline-block; background-color: #F5F0FF; color: #7C3AED; border: 1px solid #DDD6FE; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.6px; padding: 4px 10px; border-radius: 20px;">
                      Contract E-Sign
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- GREETING & CONTEXT -->
          <tr>
            <td style="padding: 28px 28px 12px 28px;">
              <h2 style="margin: 0 0 10px 0; font-size: 20px; font-weight: 700; color: #0A0A0A; letter-spacing: -0.3px;">
                Verify Your Signature
              </h2>
              <p style="margin: 0; font-size: 14px; line-height: 1.6; color: #4B5563;">
                Hello ${name},<br/>
                Please use the verification code below to digitally sign your partnership contract for <strong style="color: #0A0A0A;">${campaign}</strong>.
              </p>
            </td>
          </tr>

          <!-- CONTRACT DETAILS SUMMARY -->
          <tr>
            <td style="padding: 12px 28px;">
              <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #F9F9FB; border: 1px solid #F0F0F0; border-radius: 12px; padding: 14px 18px;">
                <tr>
                  <td style="padding-bottom: 8px;">
                    <div style="font-size: 11px; font-weight: 600; color: #6B7280; text-transform: uppercase; letter-spacing: 0.5px;">Agreement</div>
                    <div style="font-size: 14px; font-weight: 700; color: #0A0A0A; margin-top: 2px;">
                      ${campaign}
                    </div>
                  </td>
                </tr>
                <tr>
                  <td style="border-top: 1px solid #EFEFEF; padding-top: 8px;">
                    <table border="0" cellpadding="0" cellspacing="0" width="100%">
                      <tr>
                        <td align="left" style="vertical-align: middle;">
                          <div style="font-size: 11px; font-weight: 600; color: #6B7280; text-transform: uppercase; letter-spacing: 0.5px;">Parties</div>
                          <div style="font-size: 13px; font-weight: 600; color: #374151; margin-top: 2px;">
                            ${brand} ⟷ ${creator}
                          </div>
                        </td>
                        ${amountStr ? `
                        <td align="right" style="vertical-align: middle;">
                          <div style="font-size: 11px; font-weight: 600; color: #6B7280; text-transform: uppercase; letter-spacing: 0.5px;">Contract Payout</div>
                          <div style="font-size: 14px; font-weight: 800; color: #059669; margin-top: 2px;">
                            ${amountStr}
                          </div>
                        </td>
                        ` : `
                        <td align="right" style="vertical-align: middle;">
                          <div style="font-size: 11px; font-weight: 600; color: #6B7280; text-transform: uppercase; letter-spacing: 0.5px;">Escrow</div>
                          <div style="font-size: 12px; font-weight: 700; color: #7C3AED; margin-top: 2px;">
                            Protected
                          </div>
                        </td>
                        `}
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- OTP CODE BOX -->
          <tr>
            <td style="padding: 16px 28px;">
              <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #F5F0FF; border: 1px solid #DDD6FE; border-radius: 12px; text-align: center; padding: 22px 16px;">
                <tr>
                  <td>
                    <div style="font-size: 11px; font-weight: 700; color: #6D28D9; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px;">
                      Your Electronic Signature Code
                    </div>
                    
                    <div style="background-color: #FFFFFF; border: 1px solid #DDD6FE; border-radius: 8px; padding: 10px 24px; display: inline-block; box-shadow: 0 2px 6px rgba(124, 58, 237, 0.08); margin-bottom: 8px;">
                      <span style="font-family: 'DM Sans', -apple-system, sans-serif; font-size: 34px; font-weight: 800; letter-spacing: 6px; color: #7C3AED; line-height: 1;">
                        ${code}
                      </span>
                    </div>

                    <div style="font-size: 12px; font-weight: 600; color: #6D28D9;">
                      This code expires in 5 minutes
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- INSTRUCTION & SECURITY -->
          <tr>
            <td style="padding: 6px 28px 24px 28px;">
              <p style="margin: 0 0 14px 0; font-size: 13px; line-height: 1.5; color: #6B7280;">
                Enter this code in the Ybex agreement popup to sign and bind this agreement. Payouts are protected in Ybex Escrow until deliverables are completed and approved.
              </p>
              
              <div style="border-top: 1px solid #F0F0F0; padding-top: 12px; font-size: 11px; line-height: 1.5; color: #9CA3AF;">
                Never share this code with anyone. If you did not request this verification, please contact <a href="mailto:support@ybexmedia.in" style="color: #7C3AED; text-decoration: none;">support@ybexmedia.in</a>.
              </div>
            </td>
          </tr>

          <!-- FOOTER -->
          <tr>
            <td style="background-color: #F9F9FB; border-top: 1px solid #F0F0F0; padding: 18px 28px; text-align: center;">
              <div style="font-size: 12px; font-weight: 700; color: #374151;">
                Ybex Media
              </div>
              <div style="font-size: 11px; color: #9CA3AF; margin-top: 2px;">
                &copy; ${new Date().getFullYear()} Ybex. All rights reserved.
              </div>
            </td>
          </tr>

        </table>
        <!-- /MAIN CARD -->

      </td>
    </tr>
  </table>

</body>
</html>
`;
}
