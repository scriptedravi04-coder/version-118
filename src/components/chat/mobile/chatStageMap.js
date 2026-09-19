import { isUgcThread as sharedIsUgcThread } from "../../../utils/dealFlow";

// Central place that turns a thread's real backend state (status / flow_state /
// ugc_order.status / signature flags) into what the mobile stage bar shows.
// Mirrors the same fields ChatBox.jsx already reads — nothing new is invented here,
// this just classifies the existing state machine for the mobile UI's "one grammar" spec.

export function getChatStage({ thread, isBrand, isUgcOrder, isMySignatureSigned, isOtherPartySigned }) {
  const status = String(thread?.status || thread?.ugc_order?.status || "").toUpperCase();
  const flow = String(thread?.flow_state || "").toUpperCase();
  const s = flow || status; // prefer flow_state when present, same precedence ChatBox uses

  // --- UGC order flow (no negotiation / no live-link step; approval = done) ---
  if (isUgcOrder) {
    if (["REVISION_REQUESTED", "REVISION_DECLINED"].includes(s)) {
      return {
        key: "ugc_revision",
      label: isBrand ? "Revision requested" : "Revision requested · resubmit",
        dot: "#D97706",
        bg: "#FFFBEB",
        text: "#92400E",
        action: isBrand ? null : { label: "Upload revised draft", key: "reupload" },
      };
    }
    if (["SUBMITTED", "CONTENT_SUBMITTED", "IN_REVIEW"].includes(s)) {
      return {
        key: "ugc_submitted",
      label: isBrand ? "Draft submitted · review it" : "Submitted · awaiting review",
        dot: "#7C3AED",
        bg: "#F5F0FF",
        text: "#5B21B6",
        action: isBrand ? { label: "Review draft", key: "review" } : null,
      };
    }
    if (["APPROVED", "CONTENT_APPROVED", "COMPLETED", "PAID", "RELEASED"].includes(s)) {
      return {
        key: "ugc_approved",
      label: "Approved & unlocked",
        dot: "#059669",
        bg: "#ECFDF5",
        text: "#065F46",
        action: null,
      };
    }
    // claimed / in progress / default
    return {
      key: "ugc_active",
      label: isBrand ? "In production" : "Claimed · working on it",
      dot: "#7C3AED",
      bg: "#F5F0FF",
      text: "#5B21B6",
      action: null,
    };
  }

  // --- Campaign Deal flow ---
  if (["NEGOTIATING", "NEGOTIATING_COUNTER"].includes(s) || (!isMySignatureSigned && !isOtherPartySigned && s !== "ACTIVE")) {
    const otherHasCountered = s === "NEGOTIATING_COUNTER";
    return {
      key: "negotiating",
      label: "Negotiating · no payment yet",
      dot: "#D97706",
      bg: "#FFFBEB",
      text: "#92400E",
      action: otherHasCountered ? { label: "Respond to counter", key: "respond_counter", pulse: true } : null,
    };
  }
  if (["AI_AGREEMENT_READY", "AGREEMENT_SIGNED", "SIGNED"].includes(s) && !(isMySignatureSigned && isOtherPartySigned)) {
    return {
      key: "contract",
      label: isMySignatureSigned ? "Waiting for the other party to sign" : "Contract ready · sign to continue",
      dot: "#7C3AED",
      bg: "#F5F0FF",
      text: "#5B21B6",
      action: isMySignatureSigned ? null : { label: "Sign contract", key: "sign" },
    };
  }
  if (["ESCROW_FUNDED", "ESCROW_HELD", "ESCROW_PAID", "ACTIVE", "IN_PROGRESS"].includes(s)) {
    return {
      key: "escrow_active",
      label: "Escrow secured · deal active",
      dot: "#059669",
      bg: "#ECFDF5",
      text: "#065F46",
      action: null,
    };
  }
  if (["CONTENT_SUBMITTED", "IN_REVIEW", "SUBMITTED", "DELIVERED_APPROVAL", "COMPLETED_APPROVAL"].includes(s)) {
    return {
      key: "draft_submitted",
      label: isBrand ? "Draft submitted · review it" : "Draft sent · awaiting review",
      dot: "#7C3AED",
      bg: "#F5F0FF",
      text: "#5B21B6",
      action: isBrand ? { label: "Review draft", key: "review" } : null,
    };
  }
  if (["REVISION_REQUESTED", "REVISION_REQ", "CHANGES_REQUESTED", "REVISION_DECLINED", "CHANGES_DECLINED"].includes(s)) {
    return {
      key: "changes_requested",
      label: isBrand ? "Changes requested · awaiting revision" : "Changes requested · resubmit",
      dot: "#D97706",
      bg: "#FFFBEB",
      text: "#92400E",
      action: isBrand ? null : { label: "Upload revised draft", key: "reupload" },
    };
  }
  if (["CONTENT_APPROVED", "APPROVED"].includes(s)) {
    return {
      key: "content_approved",
      label: isBrand ? "Approved · waiting on live link" : "Approved · submit your live link",
      dot: "#7C3AED",
      bg: "#F5F0FF",
      text: "#5B21B6",
      action: !isBrand ? { label: "Add live link", key: "live_link" } : null,
    };
  }
  if (["LIVE_LINKS_SUBMITTED"].includes(s)) {
    return {
      key: "live_link_submitted",
      label: isBrand ? "Live link submitted · approve it" : "Live link sent · awaiting approval",
      dot: "#7C3AED",
      bg: "#F5F0FF",
      text: "#5B21B6",
      action: isBrand ? { label: "Approve & release", key: "approve_live_link" } : null,
    };
  }
  if (["LIVE_LINK_REVISION", "REVISION_REQUESTED_LINKS", "REVISION_DECLINED_LINKS"].includes(s)) {
    return {
      key: "live_link_revision",
      label: isBrand ? "Live link revision requested" : "Fix live link · resubmit",
      dot: "#D97706",
      bg: "#FFFBEB",
      text: "#92400E",
      action: !isBrand ? { label: "Resubmit link", key: "live_link" } : null,
    };
  }
  if (["LIVE_LINKS_APPROVED", "RELEASED", "PAID"].includes(s)) {
    const hasUtr = Boolean(thread?.payout_utr || thread?.utr_number);
    return {
      key: "paid",
      label: hasUtr ? "Payment completed · UTR shared" : "Payout released · processing",
      dot: "#059669",
      bg: "#ECFDF5",
      text: "#065F46",
      action: null,
    };
  }
  if (["CLOSED", "RESOLVED", "COMPLETED"].includes(s)) {
    const alreadyRated = Boolean(thread?.rating_submitted || thread?.review_submitted);
    return {
      key: "completed",
      label: "Collaboration completed",
      dot: "#059669",
      bg: "#ECFDF5",
      text: "#065F46",
      action: alreadyRated ? null : { label: "Rate collaboration", key: "rate" },
    };
  }

  // Fallback — don't guess, just show a neutral chat state
  return { key: "chat", label: "Chat", dot: "#6B7280", bg: "#F2F2F7", text: "#6B7280", action: null };
}

// Same signature-flag derivation useChatThreadMobile.js uses. Kept here so the inbox
// list (which never mounts the chat hook) classifies a thread exactly like the chat
// screen does — one grammar, one source.
export function getSignatureFlags(thread, isBrand) {
  const isCreatorSigned = Boolean(
    thread?.agreement_signed_creator ||
    thread?.is_signed_creator ||
    thread?.creator_signed ||
    thread?.contract_signed_creator
  );
  const isBrandSigned = Boolean(
    thread?.agreement_signed_brand ||
    thread?.is_signed_brand ||
    thread?.brand_signed ||
    thread?.contract_signed_brand
  );
  return {
    isMySignatureSigned: isBrand ? isBrandSigned : isCreatorSigned,
    isOtherPartySigned: isBrand ? isCreatorSigned : isBrandSigned,
  };
}

// Same fields populateThreadData() sets on every thread in GET /chat/v2/threads.
export function getIsUgcThread(thread) {
  // Kept as a named export because the mobile inbox already imports it, but the decision
  // itself now comes from the shared detector so mobile can never disagree with desktop.
  return sharedIsUgcThread(thread);
}

// Short forms of the chat stage labels, for the inbox list row where the chip sits
// next to a name, a campaign title and a timestamp. Keyed off getChatStage()'s `key`
// so the two can't drift: if a stage is added to the map above and no short label is
// listed here, the chip falls back to the full stage label rather than a raw enum.
const INBOX_LABELS = {
  ugc_revision:        { brand: "Awaiting revision",   creator: "Your turn · reupload" },
  ugc_submitted:       { brand: "Awaiting your review", creator: "Waiting on brand" },
  ugc_approved:        { brand: "Approved",            creator: "Approved" },
  ugc_active:          { brand: "In production",       creator: "In production" },
  negotiating:         { brand: "Negotiating",         creator: "Offer received" },
  escrow_active:       { brand: "In production",       creator: "In production" },
  draft_submitted:     { brand: "Awaiting your review", creator: "Waiting on brand" },
  changes_requested:   { brand: "Awaiting revision",   creator: "Your turn · reupload" },
  content_approved:    { brand: "Awaiting live link",  creator: "Add live link" },
  live_link_submitted: { brand: "Review live link",    creator: "Waiting on brand" },
  live_link_revision:  { brand: "Revision requested",  creator: "Fix live link" },
  completed:           { brand: "Payout released",     creator: "Payout released" },
  chat:                { both: "Active" },
};

export function getInboxChip(thread, isBrand) {
  const isUgcOrder = getIsUgcThread(thread);
  const { isMySignatureSigned, isOtherPartySigned } = getSignatureFlags(thread, isBrand);
  const stage = getChatStage({ thread, isBrand, isUgcOrder, isMySignatureSigned, isOtherPartySigned });

  let label;
  let bg = stage.bg;
  let text = stage.text;
  let dot = stage.dot;

  const statusStr = String(thread?.status || thread?.ugc_order?.status || thread?.flow_state || "").toUpperCase();

  if (statusStr.includes("EXPIRED")) {
    label = "Expired";
    dot = "#9CA3AF";
    bg = "#F3F4F6";
    text = "#4B5563";
  } else if (statusStr.includes("DECLINED") || statusStr.includes("REJECTED")) {
    label = isBrand ? "Declined by creator" : "Declined";
    dot = "#9CA3AF";
    bg = "#F3F4F6";
    text = "#4B5563";
  } else if (stage.key === "contract") {
    label = isMySignatureSigned ? "Waiting on brand" : (isBrand ? "Sign contract" : "Sign contract");
    dot = isMySignatureSigned ? "#7C3AED" : "#EF4444";
    bg = isMySignatureSigned ? "#F5F3FF" : "#FEE2E2";
    text = isMySignatureSigned ? "#6D28D9" : "#DC2626";
  } else if (stage.key === "paid" || stage.key === "completed" || stage.key === "ugc_approved") {
    const payoutAmt = thread?.agreed_amount || thread?.amount_fixed || thread?.ugc_order?.amount || thread?.amount;
    label = !isBrand && payoutAmt ? `₹${Number(payoutAmt).toLocaleString("en-IN")} received` : "Payout released";
    dot = "#10B981";
    bg = "#ECFDF5";
    text = "#059669";
  } else if (stage.key === "changes_requested" || stage.key === "ugc_revision") {
    if (!isBrand) {
      label = "Your turn · reupload";
      dot = "#EF4444";
      bg = "#FEE2E2";
      text = "#DC2626";
    } else {
      label = "Awaiting revision";
      dot = "#F59E0B";
      bg = "#FEF3C7";
      text = "#B45309";
    }
  } else if (stage.key === "draft_submitted" || stage.key === "ugc_submitted") {
    if (isBrand) {
      label = "Awaiting your review";
      dot = "#F59E0B";
      bg = "#FEF3C7";
      text = "#B45309";
    } else {
      label = "Waiting on brand";
      dot = "#7C3AED";
      bg = "#F5F3FF";
      text = "#6D28D9";
    }
  } else {
    const entry = INBOX_LABELS[stage.key];
    label = entry ? (entry.both || (isBrand ? entry.brand : entry.creator)) : stage.label;
  }

  return {
    key: stage.key,
    label,
    bg,
    text,
    dot,
    needsAction: Boolean(stage.action) || (!isBrand && label.includes("Your turn")) || (isBrand && label.includes("review")),
  };
}
