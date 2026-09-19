// Precedence rules for the deliverable review states shown in chat.
//
// These were inline in ChatBox.jsx. They are extracted here only so they can be tested,
// because getting the ORDER of these three flags wrong is not a visible crash — it just
// silently shows the wrong card, and that has now broken the UGC revision flow once.
//
// The rule that matters:
//
//   A revision request updates the chat THREAD's flow_state immediately, but the
//   ugc_orders row can lag behind or fail to update entirely. So `ugcStatus` may still
//   read 'SUBMITTED' right after the brand has asked for changes. If "content submitted"
//   is allowed to win that tie, the chat stays stuck on "awaiting review" and the
//   revision card, the feedback text and the creator's re-upload option never appear.
//
//   Therefore revision/declined are resolved FIRST. The only thing that clears them is
//   the creator genuinely moving on — a fresh `content_proof_submitted` as the most
//   recent action message.
//
// Behaviour is identical for campaign threads and UGC threads; nothing here branches on
// deal type.

const REVISION_STATES = [
  "REVISION_REQUESTED",
  "REVISION_REQ",
  "REVISIONS_REQUESTED",
  "CHANGES_REQUESTED",
  "NEEDS_REVISION",
  "REVISION",
  "REVISION_REQUIRED",
  "REVISION_REQUEST",
  "UGC_ORDER_REVISION"
];

const DECLINED_STATES = ["REVISION_DECLINED", "DECLINED"];

const SUBMITTED_STATES = [
  "CONTENT_SUBMITTED",
  "SUBMITTED",
  "UNDER_REVIEW",
  "IN_REVIEW",
  "DELIVERED",
  "PENDING_REVIEW"
];

const SUBMITTED_FLOW_STATES = ["CONTENT_SUBMITTED", "SUBMITTED", "UNDER_REVIEW", "IN_REVIEW"];

export function resolveReviewFlags({
  isDealCompleted = false,
  isContentApproved = false,
  rawStatus = "",
  ugcStatus = "",
  flowState = "",
  latestActionType = null
} = {}) {
  const hasActiveSubmitMsg = latestActionType === "content_proof_submitted";
  const hasActiveRevisionMsg =
    latestActionType === "CHANGES_REQUESTED" || latestActionType === "revision_requested";
  const hasActiveDeclineMsg = latestActionType === "revision_declined";

  const isRevisionRequested =
    !isDealCompleted &&
    !isContentApproved &&
    !hasActiveSubmitMsg &&
    (REVISION_STATES.includes(rawStatus) ||
      REVISION_STATES.includes(ugcStatus) ||
      REVISION_STATES.includes(flowState) ||
      hasActiveRevisionMsg);

  const isRevisionDeclined =
    !isDealCompleted &&
    !isContentApproved &&
    !hasActiveSubmitMsg &&
    (DECLINED_STATES.includes(rawStatus) ||
      DECLINED_STATES.includes(ugcStatus) ||
      DECLINED_STATES.includes(flowState) ||
      hasActiveDeclineMsg);

  const isContentSubmitted =
    !isDealCompleted &&
    !isContentApproved &&
    !isRevisionRequested &&
    !isRevisionDeclined &&
    (SUBMITTED_STATES.includes(rawStatus) ||
      SUBMITTED_STATES.includes(ugcStatus) ||
      SUBMITTED_FLOW_STATES.includes(flowState) ||
      hasActiveSubmitMsg);

  return {
    hasActiveSubmitMsg,
    hasActiveRevisionMsg,
    hasActiveDeclineMsg,
    isRevisionRequested,
    isRevisionDeclined,
    isContentSubmitted
  };
}
