// THE one place that decides whether something is a UGC order or a Campaign deal.
//
// Why this file exists
// --------------------
// This question used to be answered inline, separately, in at least six places — ChatBox,
// Chat.jsx, InboxMobile, useChatThreadMobile, ContentProofNotice, syncUgcLifecycleEvent —
// and every copy checked a slightly different set of fields. For example one of them did
// not check the `ugcord_` prefix at all, so a UGC thread whose `is_ugc` flag was missing
// got filed under CAMPAIGN in the inbox while the chat screen treated it as UGC. The two
// halves of the app disagreed about the same row.
//
// Note that `is_ugc` is NOT reliably set in the database — most chat_threads rows have it
// empty — so any check that trusts that flag alone is wrong. Detection has to consider
// every signal, which is exactly why it must live in one function instead of six.
//
// RULE FOR NEW CODE: never write `thread.is_ugc || thread.deal_type === 'UGC' || ...`
// inline. Import isUgcThread / isCampaignThread from here. If detection needs to change,
// it changes once, here, and both flows stay in agreement.

export type ThreadLike = Record<string, any> | null | undefined;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** True for a canonical Supabase UUID. Campaign ids are UUIDs; UGC ids are not. */
export function isUuid(value: any): boolean {
  return typeof value === "string" && UUID_RE.test(value);
}

const str = (v: any) => (typeof v === "string" ? v : "");
const upper = (v: any) => str(v).toUpperCase();
const lower = (v: any) => str(v).toLowerCase();

/** UGC ids and thread ids carry a prefix; campaign ones are bare UUIDs. */
export function looksLikeUgcId(value: any): boolean {
  const s = str(value);
  return s.startsWith("ugcord_") || s.startsWith("thread_ugc_") || s.startsWith("ugc_");
}

export function looksLikeCampaignId(value: any): boolean {
  const s = str(value);
  if (s.startsWith("thread_camp_")) return true;
  return isUuid(s);
}

/**
 * Is this thread / order / deal a UGC order?
 *
 * This is the union of every check that previously existed anywhere in the codebase, so
 * switching a call site over to it can only widen detection, never narrow it. That matters:
 * a narrower check would silently reclassify existing rows.
 */
export function isUgcThread(thread: ThreadLike): boolean {
  if (!thread) return false;
  return Boolean(
    thread.is_ugc ||
    thread.ugc_order_id ||
    thread.ugc_order_id_text ||
    thread.ugc_brief_id ||
    thread.ugc_order ||
    thread.ugc_brief ||
    upper(thread.deal_type) === "UGC" ||
    lower(thread.type) === "ugc" ||
    looksLikeUgcId(thread.id) ||
    looksLikeUgcId(thread.deal_id) ||
    looksLikeUgcId(thread.thread_id) ||
    looksLikeUgcId(thread.order_id) ||
    looksLikeUgcId(thread.ugc_order_id_text)
  );
}

/**
 * Is this a Campaign deal?
 *
 * UGC is checked first and wins outright — a thread that carries any UGC signal is never
 * treated as a campaign even if it also has a campaign_id, because a UGC order created
 * from a campaign brief would otherwise be routed down the campaign path.
 *
 * Anything with no signal either way falls through to campaign, which is the behaviour the
 * app already had. Do not "improve" this to return false for unknowns without checking what
 * reads it — several screens rely on campaign being the default.
 */
export function isCampaignThread(thread: ThreadLike): boolean {
  if (!thread) return false;
  if (isUgcThread(thread)) return false;
  return Boolean(
    thread.campaign_deal_id ||
    thread.campaign_id ||
    thread.campaign ||
    thread.campaigns ||
    upper(thread.deal_type) === "CAMPAIGN" ||
    lower(thread.type) === "campaign" ||
    looksLikeCampaignId(thread.id) ||
    looksLikeCampaignId(thread.deal_id) ||
    // no signal at all -> campaign, matching existing behaviour
    (!thread.id && !thread.deal_id)
  );
}

export type DealFlow = "ugc" | "campaign";

export function getDealFlow(thread: ThreadLike): DealFlow {
  return isUgcThread(thread) ? "ugc" : "campaign";
}

/**
 * The UGC order id for a thread, or null if it is not a UGC thread.
 * Never returns a campaign UUID.
 */
export function getUgcOrderId(thread: ThreadLike): string | null {
  if (!thread || !isUgcThread(thread)) return null;
  const candidates = [
    thread.ugc_order_id,
    thread.ugc_order_id_text,
    thread.ugc_order?.id,
    thread.order_id,
    looksLikeUgcId(thread.deal_id) ? thread.deal_id : null,
    looksLikeUgcId(thread.id) ? str(thread.id).replace(/^thread_ugc_/, "") : null
  ];
  for (const c of candidates) {
    if (c && typeof c === "string") return c;
  }
  return null;
}

/**
 * The campaign deal id for a thread, or null if it is not a campaign thread.
 *
 * Always a UUID or null — never a `ugcord_` string. This is the guard that stops a UGC id
 * being handed to a Supabase UUID column, which fails the whole statement (error 22P02),
 * not just the offending row.
 */
export function getCampaignDealId(thread: ThreadLike): string | null {
  if (!thread || !isCampaignThread(thread)) return null;
  const candidates = [
    thread.campaign_deal_id,
    isUuid(thread.deal_id) ? thread.deal_id : null,
    isUuid(thread.id) ? thread.id : null,
    str(thread.id).startsWith("thread_camp_") ? str(thread.id).replace("thread_camp_", "") : null
  ];
  for (const c of candidates) {
    if (c && isUuid(c)) return c;
  }
  return null;
}

/**
 * Safe to send to a Supabase UUID column? Use before every `.eq('id', x)` on deals,
 * campaigns or any other UUID-keyed table.
 */
export function safeUuidOrNull(value: any): string | null {
  return isUuid(value) ? value : null;
}

export default {
  isUgcThread,
  isCampaignThread,
  getDealFlow,
  getUgcOrderId,
  getCampaignDealId,
  isUuid,
  safeUuidOrNull,
  looksLikeUgcId,
  looksLikeCampaignId
};
