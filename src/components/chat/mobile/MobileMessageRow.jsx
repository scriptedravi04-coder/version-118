import React from "react";
import MobileEventRow from "./MobileEventRow";
import MobileOfferCard from "./MobileOfferCard";
import MobileDeliverableCard from "./MobileDeliverableCard";
import MobileLiveLinksCard from "./MobileLiveLinksCard";
import MobilePayoutCard from "./MobilePayoutCard";
import MobileEscrowFundedCard from "./MobileEscrowFundedCard";

const SYSTEM_TYPES = new Set([
  "system", "creator_signed", "brand_signed", "agreement_executed",
  "contract_signing", "live_links_submitted", "live_links_resubmit_request",
  "live_links_resubmit_declined", "chat_closed", "order_cancelled", "content_approved",
]);

const CONTENT_PROOF_TYPES = new Set(["content_proof_submitted", "CHANGES_REQUESTED", "revision_requested", "revision_declined"]);
const LIVE_LINK_TYPES = new Set(["live_links_submitted", "live_links_resubmit_request"]);
const PAYOUT_TYPES = new Set(["payment_trigger", "payment_released", "payout_released", "live_links_approved"]);

export default function MobileMessageRow({
  message, isMine, isBrand, isUgcOrder, thread, amount, campaignTitle,
  onAcceptOffer, onCounterOffer,
  onApproveDeliverable, onOpenRequestChanges, onOpenReupload,
  onApproveLiveLinks, onOpenRejectLiveLinks,
}) {
  const msgType = message.message_type || message.type || message.metadata?.action || "";
  const isOffer = msgType === "offer" || msgType === "negotiation_offer";
  const isContentProof = CONTENT_PROOF_TYPES.has(msgType);
  const isLiveLink = LIVE_LINK_TYPES.has(msgType);
  const isPayout = PAYOUT_TYPES.has(msgType) || message.content?.includes("Payment Released") || message.content?.includes("payout is being processed");
  const isEscrowFunded = msgType === "payment_secured" || msgType === "payment_funded" || message.content?.toLowerCase().includes("escrow funded");
  const isSystem = SYSTEM_TYPES.has(msgType) || message.sender_role === "system";

  if (isOffer) {
    return <MobileOfferCard message={message} isMine={isMine} isBrand={isBrand} onAccept={onAcceptOffer} onCounter={onCounterOffer} />;
  }
  if (isContentProof) {
    return (
      <MobileDeliverableCard
        message={message} thread={thread} isBrand={isBrand} isUgcOrder={isUgcOrder}
        onApprove={onApproveDeliverable} onOpenRequestChanges={onOpenRequestChanges} onOpenReupload={onOpenReupload}
      />
    );
  }
  if (isLiveLink) {
    return <MobileLiveLinksCard message={message} isBrand={isBrand} onApprove={onApproveLiveLinks} onOpenReject={onOpenRejectLiveLinks} />;
  }
  if (isPayout) {
    return <MobilePayoutCard message={message} amount={amount} />;
  }
  if (isEscrowFunded) {
    return <MobileEscrowFundedCard message={message} amount={amount} campaignTitle={campaignTitle} />;
  }
  if (isSystem) {
    return <MobileEventRow message={message} />;
  }

  // Plain chat bubble
  const timeText = message.created_at ? new Date(message.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "";
  const content = message.content || message.text || "";
  const failed = message.status === "failed";

  return (
    <div
      style={{
        alignSelf: isMine ? "flex-end" : "flex-start",
        maxWidth: 270,
        background: isMine ? "#7C3AED" : "#fff",
        borderRadius: isMine ? "16px 16px 5px 16px" : "16px 16px 16px 5px",
        padding: isMine ? "10px 14px" : "11px 14px",
        opacity: message.status === "sending" ? 0.6 : 1,
      }}
    >
      <div style={{ font: "400 14px/1.5 'DM Sans',sans-serif", color: isMine ? "#fff" : "#0A0A0A" }}>{content}</div>
      <div
        style={{
          marginTop: isMine ? 4 : 5,
          textAlign: isMine ? "right" : "left",
          font: "400 10.5px 'DM Sans',sans-serif",
          color: failed ? "#DC2626" : isMine ? "rgba(255,255,255,.7)" : "#6B7280",
        }}
      >
        {failed ? "Failed to send" : timeText}
      </div>
    </div>
  );
}
