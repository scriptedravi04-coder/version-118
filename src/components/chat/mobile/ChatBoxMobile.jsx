import React, { useState, useRef, useEffect } from "react";
import { ChevronLeft, MoreVertical, Plus, Send, ShieldCheck } from "lucide-react";
import useChatThreadMobile from "./useChatThreadMobile";
import { getChatStage } from "./chatStageMap";
import MobileMessageRow from "./MobileMessageRow";
import MobileRequestChangesSheet from "./MobileRequestChangesSheet";
import MobileEscrowSheet from "./MobileEscrowSheet";
import MobileRatingSheet from "./MobileRatingSheet";
import MobileLiveLinkSheet from "./MobileLiveLinkSheet";
import MobileUploadSheet from "./MobileUploadSheet";
import { MobileBriefCard, MobileClaimedCard } from "./MobileBriefCards";
import MobileContractSheet from "./MobileContractSheet";

const getPartnerPic = (partner, partnerIsBrand) => {
  if (!partner) return "";
  if (partnerIsBrand) {
    return (
      partner.profile?.logo || partner.logo || partner.logo_url || partner.profile?.logo_url ||
      partner.photo || partner.picture || partner.avatar || partner.avatar_url ||
      partner.profile_picture_url || partner.profile?.photo || partner.profile?.picture || partner.profile?.avatar || ""
    );
  }
  return (
    partner.photo || partner.picture || partner.avatar || partner.avatar_url ||
    partner.profile_picture_url || partner.profile?.photo || partner.profile?.picture || partner.profile?.avatar ||
    partner.logo || partner.logo_url || partner.profile?.logo || partner.profile?.logo_url || ""
  );
};

const getDealAmount = (t) =>
  t?.agreed_amount || t?.amount_fixed || t?.campaign?.budget || t?.campaign_budget ||
  t?.ugc_order?.amount || t?.ugc_order?.creator_payout || t?.ugc_order?.agreed_amount || 0;

export default function ChatBoxMobile({ thread, user, onlineUsers = [], onBack }) {
  const {
    currentThread,
    messages,
    isBrand,
    isUgcOrder,
    isMySignatureSigned,
    isOtherPartySigned,
    sendText,
    acceptCounter,
    sendCounter,
    approveDeliverable,
    requestChanges,
    submitLiveLink,
    approveLiveLinks,
    rejectLiveLinks,
    uploadDeliverable,
    submitReview,
    sendSignOtp,
    signAgreement,
  } = useChatThreadMobile(thread, user);

  const [text, setText] = useState("");
  const [activeSheet, setActiveSheet] = useState(null); // 'requestChanges' | 'rejectLiveLinks' | 'escrow' | 'rating' | 'liveLink' | 'upload' | 'contract'
  const listEndRef = useRef(null);

  useEffect(() => {
    setTimeout(() => listEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
  }, [messages.length, currentThread?.id]);

  if (!thread) return null;

  const partnerName = isBrand
    ? thread.creator?.profile?.full_name || thread.creator?.profile?.name || thread.creator?.full_name || thread.creator?.name || "Creator"
    : thread.brand?.profile?.company_name || thread.brand?.company_name || thread.brand?.name || "Brand";
  const partnerPic = getPartnerPic(isBrand ? thread.creator : thread.brand, !isBrand);
  const partnerId = isBrand ? thread?.creator_id : thread?.brand_id;
  const isPartnerOnline = partnerId && onlineUsers.includes(partnerId);
  const campaignTitle = currentThread?.campaign_title || currentThread?.ugc_order?.title || thread?.campaign_title || "Collaboration";
  const isVerified = Boolean((isBrand ? thread.creator : thread.brand)?.profile?.is_verified || (isBrand ? thread.creator : thread.brand)?.is_verified);
  const amount = getDealAmount(currentThread);

  const stage = getChatStage({ thread: currentThread, isBrand, isUgcOrder, isMySignatureSigned, isOtherPartySigned });

  // Heuristic: show a pinned claimed/brief card only before any deliverable has been submitted yet
  const hasSubmission = messages.some((m) =>
    ["content_proof_submitted", "CHANGES_REQUESTED", "revision_requested", "revision_declined"].includes(m.message_type)
  );
  const showPinnedBrief = isUgcOrder && !hasSubmission;
  const brief = currentThread?.ugc_order?.brief || currentThread?.brief || null;

  const handleSend = () => {
    if (!text.trim()) return;
    sendText(text);
    setText("");
  };

  const handleContextAction = () => {
    if (!stage.action) return;
    const key = stage.action.key;
    if (key === "reupload") return setActiveSheet("upload");
    if (key === "live_link") return setActiveSheet("liveLink");
    if (key === "rate") return setActiveSheet("rating");
    if (key === "review" || key === "approve_live_link") {
      listEndRef.current?.scrollIntoView({ behavior: "smooth" });
      return;
    }
    if (key === "sign") return setActiveSheet("contract");
  };

  const closeSheet = () => setActiveSheet(null);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: "#F2F2F7", fontFamily: "'DM Sans',sans-serif", position: "relative" }}>
      {/* Header */}
      <div style={{ background: "#fff", padding: "0 16px 12px", flexShrink: 0, borderBottom: "1px solid #ECECF0" }}>
        <div style={{ height: 52, display: "flex", alignItems: "center", gap: 11 }}>
          <button onClick={onBack} style={{ background: "none", border: "none", padding: 4, flexShrink: 0, cursor: "pointer" }}>
            <ChevronLeft size={22} color="#0A0A0A" />
          </button>
          <div style={{ width: 36, height: 36, borderRadius: 18, flexShrink: 0, overflow: "hidden", background: "linear-gradient(135deg,#F3D9C7,#C89B7B)", position: "relative" }}>
            {partnerPic && <img src={partnerPic} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />}
            {isPartnerOnline && (
              <span style={{ position: "absolute", bottom: 0, right: 0, width: 9, height: 9, borderRadius: 5, background: "#059669", border: "2px solid #fff" }} />
            )}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <div style={{ font: "600 15px/1.1 'DM Sans',sans-serif", color: "#0A0A0A", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {partnerName}
              </div>
              {isVerified && <ShieldCheck size={13} color="#059669" fill="#059669" strokeWidth={0} />}
            </div>
            <div style={{ marginTop: 3, font: "400 12px/1.1 'DM Sans',sans-serif", color: "#6B7280", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {campaignTitle}
            </div>
          </div>
          <button style={{ width: 34, height: 34, borderRadius: 11, background: "#F2F2F7", border: "none", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 3, flexShrink: 0, cursor: "pointer" }}>
            <MoreVertical size={16} color="#0A0A0A" />
          </button>
        </div>

        {/* Stage strip */}
        <div
          onClick={() => amount > 0 && setActiveSheet("escrow")}
          style={{ height: 34, borderRadius: 10, background: stage.bg, display: "flex", alignItems: "center", gap: 8, padding: "0 12px", cursor: amount > 0 ? "pointer" : "default" }}
        >
          <span style={{ width: 6, height: 6, borderRadius: 3, background: stage.dot, flexShrink: 0 }} />
          <div style={{ flex: 1, font: "500 12px 'DM Sans',sans-serif", color: stage.text }}>{stage.label}</div>
          {amount > 0 && <div style={{ font: "600 11px 'DM Sans',sans-serif", color: stage.text }}>Details</div>}
        </div>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, padding: "16px 16px 0", display: "flex", flexDirection: "column", gap: 12, overflowY: "auto" }}>
        <div style={{ alignSelf: "center", font: "500 11px 'DM Sans',sans-serif", letterSpacing: ".4px", color: "#6B7280" }}>Today</div>

        {showPinnedBrief && (
          isBrand ? (
            <MobileBriefCard brief={brief} timeText="" />
          ) : (
            <MobileClaimedCard brief={brief} deadlineIso={currentThread?.ugc_order?.internal_deadline} onOpenUpload={() => setActiveSheet("upload")} />
          )
        )}

        {messages.map((m, idx) => (
          <MobileMessageRow
            key={m.id || m.message_id || idx}
            message={m}
            isMine={String(m.sender_user_id || m.sender_id) === String(user?.user_id || user?.id)}
            isBrand={isBrand}
            isUgcOrder={isUgcOrder}
            thread={currentThread}
            amount={amount}
            campaignTitle={campaignTitle}
            onAcceptOffer={acceptCounter}
            onCounterOffer={sendCounter}
            onApproveDeliverable={approveDeliverable}
            onOpenRequestChanges={() => setActiveSheet("requestChanges")}
            onOpenReupload={() => setActiveSheet("upload")}
            onApproveLiveLinks={approveLiveLinks}
            onOpenRejectLiveLinks={() => setActiveSheet("rejectLiveLinks")}
          />
        ))}
        <div ref={listEndRef} style={{ height: 1 }} />
      </div>

      {/* Composer */}
      <div style={{ background: "#fff", borderTop: "1px solid #ECECF0", padding: "10px 16px 12px", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, paddingBottom: 10 }}>
          <div style={{ height: 38, padding: "0 14px", borderRadius: 12, background: "#0A0A0A", display: "flex", alignItems: "center", gap: 7, flexShrink: 0 }}>
            <span style={{ font: "600 13px 'DM Sans',sans-serif", color: "#fff" }}>Chat</span>
          </div>
          {stage.action && (
            <button
              onClick={handleContextAction}
              style={{ flex: 1, height: 38, borderRadius: 12, background: "#F5F0FF", border: "1px solid #E2D6FF", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, cursor: "pointer" }}
            >
              <span style={{ font: "600 13px 'DM Sans',sans-serif", color: "#7C3AED" }}>{stage.action.label}</span>
              {stage.action.pulse && <span style={{ width: 7, height: 7, borderRadius: 4, background: "#7C3AED" }} />}
            </button>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
          <button style={{ width: 40, height: 40, borderRadius: 20, background: "#F5F0FF", border: "none", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, cursor: "pointer" }}>
            <Plus size={17} color="#7C3AED" />
          </button>
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder="Message"
            style={{ flex: 1, height: 44, borderRadius: 22, background: "#F2F2F7", border: "none", padding: "0 16px", font: "400 14px 'DM Sans',sans-serif", color: "#0A0A0A" }}
          />
          <button
            onClick={handleSend}
            style={{ width: 44, height: 44, borderRadius: 22, background: "#7C3AED", border: "none", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, cursor: "pointer" }}
          >
            <Send size={17} color="#fff" />
          </button>
        </div>
      </div>

      {/* Bottom sheets */}
      {activeSheet === "requestChanges" && <MobileRequestChangesSheet onClose={closeSheet} onSubmit={requestChanges} />}
      {activeSheet === "rejectLiveLinks" && (
        <MobileRequestChangesSheet
          onClose={closeSheet}
          onSubmit={rejectLiveLinks}
          title="What's wrong with the link?"
          subtitle="This asks the creator to resubmit their live link."
          placeholder="The YouTube link opens a private video."
          submitLabel="Request resubmission"
        />
      )}
      {activeSheet === "contract" && (
        <MobileContractSheet
          thread={currentThread}
          user={user}
          isBrand={isBrand}
          amount={amount}
          campaignTitle={campaignTitle}
          onSendOtp={sendSignOtp}
          onSign={signAgreement}
          onClose={closeSheet}
        />
      )}
      {activeSheet === "escrow" && <MobileEscrowSheet onClose={closeSheet} amount={amount} />}
      {activeSheet === "rating" && <MobileRatingSheet onClose={closeSheet} onSubmit={submitReview} partnerName={partnerName} />}
      {activeSheet === "liveLink" && <MobileLiveLinkSheet onClose={closeSheet} onSubmit={submitLiveLink} />}
      {activeSheet === "upload" && (
        <MobileUploadSheet onClose={closeSheet} onSubmit={uploadDeliverable} title={isUgcOrder ? "Upload deliverable" : "Re-upload video"} />
      )}
    </div>
  );
}
