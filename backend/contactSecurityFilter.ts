// Anti-disintermediation filter: stops people moving a deal off the platform by swapping
// phone numbers, emails or social handles in chat.
//
// DESIGN NOTE — why bare keywords do not block on their own.
//
// The obvious implementation is a word blacklist: ban "phone", "contact", "mobile". That
// was tried and it is unusable, because those words carry ordinary meanings in exactly the
// conversations this platform exists to host:
//
//     "Is this for iPhone or Android?"
//     "Who should I contact about shipping?"
//     "My phone broke so I was offline"
//     "Shoot it in mobile portrait, not landscape"
//
// Blocking those trains users to distrust the chat, and they route around it — which is the
// opposite of what the filter is for. So a contact-word only counts as evidence when it
// appears NEAR something that could actually be a contact detail: digits, an @handle, a
// messaging domain. "contact me on 98765 43210" is blocked; "who should I contact" is not.
//
// Set STRICT_KEYWORD_MODE to true to go back to blocking bare keywords.

export const STRICT_KEYWORD_MODE = false;

export type FilterResult = {
  blocked: boolean;
  reason?: string;
  code?: string;
  message?: string;
};

export type FilterOptions = {
  threadId?: string;
  senderId?: string;
  /** Revision feedback, brief text and support tickets are never filtered. */
  exempt?: boolean;
  /** Test hook: overrides Date.now() for the chunking window. */
  now?: number;
};

// ---------------------------------------------------------------------------
// Normalisation
// ---------------------------------------------------------------------------

const LEET_MAP: Record<string, string> = {
  o: "0", q: "0", i: "1", l: "1", z: "2", e: "3", a: "4", s: "5", b: "8", g: "9", t: "7"
};

/** Turns 9I23O4578 into 912304578 so leetspeak digits are countable. */
export function decodeLeet(text: string): string {
  return text.replace(/[oqilzeasbgt]/gi, (ch) => LEET_MAP[ch.toLowerCase()] ?? ch);
}

const WORD_DIGITS: Record<string, string> = {
  // English
  zero: "0", one: "1", two: "2", three: "3", four: "4",
  five: "5", six: "6", seven: "7", eight: "8", nine: "9",
  oh: "0", nought: "0", double: "", triple: "",
  // Hindi / Hinglish
  shunya: "0", sunya: "0", zerro: "0",
  ek: "1", do: "2", teen: "3", tin: "3", char: "4", chaar: "4",
  panch: "5", paanch: "5", chah: "6", chhah: "6", chhe: "6", che: "6",
  saat: "7", sat: "7", aath: "8", ath: "8", nau: "9", no: "9"
};

/** "nine eight seven..." / "nau aath saat..." -> "987..." */
export function wordsToDigits(text: string): string {
  const tokens = text.toLowerCase().split(/[^a-z]+/).filter(Boolean);
  let out = "";
  let run = "";
  for (const tok of tokens) {
    const d = WORD_DIGITS[tok];
    if (d !== undefined) {
      run += d;
    } else {
      if (run.length > out.length) out = run;
      run = "";
    }
  }
  if (run.length > out.length) out = run;
  return out;
}

/** Every real digit in the message, separators removed. No leet decoding — see below. */
export function extractDigits(text: string): string {
  return text.replace(/\D/g, "");
}

/**
 * Leet decoding is applied PER TOKEN, and only to tokens that already look like a
 * disguised number.
 *
 * Running decodeLeet over a whole sentence is catastrophic: every o/i/l/s/b/e in ordinary
 * prose becomes a digit, so "we need better mobility in the shot" turns into a long digit
 * run and gets blocked as a phone number. It has to be scoped to tokens that are already
 * mostly digits and long enough to be a number in the first place.
 */
export function leetDigitCandidates(text: string): string[] {
  const out: string[] = [];
  for (const raw of text.split(/[\s,;]+/)) {
    const token = raw.replace(/[-().+]/g, "");
    if (token.length < 8 || token.length > 16) continue;
    const realDigits = (token.match(/\d/g) || []).length;
    const leetish = (token.match(/[oqilzeasbgt]/gi) || []).length;
    // must be predominantly digits already, with only a few letters standing in
    if (realDigits < 4) continue;
    if (realDigits + leetish < token.length) continue;
    out.push(decodeLeet(token).replace(/\D/g, ""));
  }
  return out;
}

// ---------------------------------------------------------------------------
// Allow-list — these are the links creators legitimately send
// ---------------------------------------------------------------------------

const ALLOWED_URL_PATTERNS = [
  /instagram\.com\/(p|reel|reels|tv)\//i,
  /youtube\.com\/(watch|shorts)/i,
  /youtu\.be\//i,
  /drive\.google\.com\//i,
  /docs\.google\.com\//i,
  /vimeo\.com\/\d/i,
  /dropbox\.com\//i,
  /ybex\./i
];

function stripAllowedUrls(text: string): string {
  let out = text;
  for (const re of ALLOWED_URL_PATTERNS) {
    out = out.replace(new RegExp(`\\S*${re.source}\\S*`, "gi"), " ");
  }
  return out;
}

// ---------------------------------------------------------------------------
// Hard signals — these block on their own, no keyword needed
// ---------------------------------------------------------------------------

const EMAIL_RE = /[a-z0-9._%+-]+\s*(?:@|\[at\]|\(at\)|\s+at\s+)\s*[a-z0-9.-]+\s*(?:\.|\[dot\]|\(dot\)|\s+dot\s+)\s*[a-z]{2,}/i;

const MESSAGING_DOMAIN_RE = /\b(?:wa\.me|whatsapp\.com|t\.me|telegram\.me|telegram\.org|signal\.me|m\.me|snapchat\.com\/add)\b/i;

/** ig: handle, insta id @foo, tg: @foo, snap: foo */
const HANDLE_RE = /\b(?:ig|insta|instagram|fb|facebook|tg|telegram|snap|snapchat|wa|whatsapp|discord)\s*(?:id|handle|username|user)?\s*[:=\-]\s*@?[a-z0-9._]{3,}/i;

/** Does this single run of digits contain a 10-digit Indian mobile? */
function hasIndianMobile(digits: string): boolean {
  if (digits.length < 10 || digits.length > 15) return false;
  for (let i = 0; i + 10 <= digits.length; i++) {
    if (/^[6-9]\d{9}$/.test(digits.slice(i, i + 10))) return true;
  }
  return false;
}

/**
 * Digit runs, where a run may span spaces/dashes/dots/brackets but NEVER letters.
 *
 * Concatenating every digit in a message is too greedy: "890000 followers, avg reach
 * 2300000" becomes one 13-digit string containing "9000023000", which looks like a mobile
 * number and is not. Separate numbers in a sentence are separate numbers.
 */
export function digitRuns(text: string): string[] {
  const runs: string[] = [];
  for (const m of text.matchAll(/\d[\d\s\-.()]*\d|\d/g)) {
    const only = m[0].replace(/\D/g, "");
    if (only) runs.push(only);
  }
  return runs;
}

function anyRunIsMobile(text: string): boolean {
  return digitRuns(text).some(hasIndianMobile);
}

// ---------------------------------------------------------------------------
// Soft signals — contact words. Only count when near a contact-shaped thing.
// ---------------------------------------------------------------------------

const CONTACT_WORDS = [
  "phone", "mobile", "mob", "cell", "contact", "whatsapp", "whats app", "wapp",
  "telegram", "insta", "instagram", "snapchat", "signal", "email", "mail", "gmail",
  "call me", "ping me", "text me", "dm me", "number", "no.", "ph no", "contact no",
  "sampark", "number de", "baat karte", "call kar", "message kar"
];

function contactWordIn(lower: string): string | null {
  for (const w of CONTACT_WORDS) {
    // word-boundary match so "mob" does not fire inside "mobility"
    const re = new RegExp(`(^|[^a-z])${w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([^a-z]|$)`, "i");
    if (re.test(lower)) return w;
  }
  return null;
}

/** 6+ digits, or an @handle, or a bare domain — something a contact detail could hide in. */
function hasContactShape(text: string, digits: string): boolean {
  if (digits.length >= 6) return true;
  if (/@[a-z0-9._]{3,}/i.test(text)) return true;
  if (/\b[a-z0-9-]+\.(com|in|me|net|org|io|co)\b/i.test(text)) return true;
  return false;
}

// ---------------------------------------------------------------------------
// Cross-message chunking buffer
// ---------------------------------------------------------------------------

const WINDOW_MS = 5 * 60 * 1000;
const MIN_CHUNK = 3;

type BufferEntry = { digits: string; at: number };
const recentBuffer = new Map<string, BufferEntry[]>();

export function resetRecentMessageBuffer(): void {
  recentBuffer.clear();
}

/**
 * A phone number split across messages ("98765" then "43210") never contains ten digits
 * in any single message, so it has to be reassembled across the window.
 *
 * Only messages that are MOSTLY digits are buffered. A sentence that happens to contain a
 * number ("budget is 3500 for 2 reels") is not a chunk of anything, and treating it as one
 * is how a price discussion turns into a false block.
 */
function pushChunkAndCheck(key: string, text: string, digits: string, now: number): boolean {
  const compact = text.replace(/[\s\-().]/g, "");
  const isMostlyDigits = compact.length > 0 && digits.length / compact.length >= 0.8;
  if (!isMostlyDigits || digits.length < MIN_CHUNK || digits.length > 9) return false;

  const prior = (recentBuffer.get(key) || []).filter((e) => now - e.at < WINDOW_MS);
  prior.push({ digits, at: now });
  recentBuffer.set(key, prior);

  // try every contiguous run of recent chunks
  for (let start = 0; start < prior.length; start++) {
    let joined = "";
    for (let end = start; end < prior.length; end++) {
      joined += prior[end].digits;
      if (joined.length >= 10 && hasIndianMobile(joined)) return true;
      if (joined.length > 14) break;
    }
  }
  return false;
}

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

export function checkComprehensiveDisallowedContent(
  text: string,
  opts: FilterOptions = {}
): FilterResult {
  const allow: FilterResult = { blocked: false };
  if (opts.exempt) return allow;
  if (!text || typeof text !== "string") return allow;

  const cleaned = stripAllowedUrls(text);
  const lower = cleaned.toLowerCase();
  const digits = extractDigits(cleaned);
  const now = opts.now ?? Date.now();

  // --- hard signals ---
  if (EMAIL_RE.test(lower)) {
    return block("EMAIL", "Email addresses can't be shared in chat.");
  }
  if (MESSAGING_DOMAIN_RE.test(lower)) {
    return block("MESSAGING_LINK", "Links to outside messaging apps can't be shared in chat.");
  }
  if (HANDLE_RE.test(lower)) {
    return block("HANDLE", "Social handles can't be shared in chat.");
  }
  if (anyRunIsMobile(cleaned)) {
    return block("PHONE", "Phone numbers can't be shared in chat.");
  }
  for (const cand of leetDigitCandidates(cleaned)) {
    if (hasIndianMobile(cand)) {
      return block("PHONE_LEET", "Phone numbers can't be shared in chat, disguised or otherwise.");
    }
  }

  const spelled = wordsToDigits(lower);
  if (spelled.length >= 10 && hasIndianMobile(spelled)) {
    return block("PHONE_WORDS", "Phone numbers can't be shared in chat, spelled out or otherwise.");
  }

  // --- chunking across messages ---
  if (opts.threadId && opts.senderId) {
    const key = `${opts.threadId}:${opts.senderId}`;
    if (pushChunkAndCheck(key, cleaned, digits, now)) {
      return block("PHONE_CHUNKED", "That looks like a phone number split across messages.");
    }
  }

  // --- soft signal: contact word near something contact-shaped ---
  const word = contactWordIn(lower);
  if (word) {
    if (STRICT_KEYWORD_MODE || hasContactShape(cleaned, digits)) {
      return block(
        "CONTACT_INTENT",
        "It looks like you're sharing contact details. Please keep the conversation on Ybex — your payment is only protected here."
      );
    }
  }

  return allow;
}

function block(code: string, message: string): FilterResult {
  return { blocked: true, code, reason: code, message };
}

export default checkComprehensiveDisallowedContent;
