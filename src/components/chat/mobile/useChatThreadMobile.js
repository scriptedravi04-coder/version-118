import { useState, useEffect, useRef, useCallback } from "react";
import { isUgcThread as sharedIsUgcThread } from "../../../utils/dealFlow";
import { io } from "socket.io-client";
import { api } from "../../../lib/api";
import { toast } from "sonner";

// Same endpoints ChatBox.jsx uses (backend/deals_chat_routes.ts, chat_routes.ts) —
// intentionally not shared code with ChatBox.jsx yet, to avoid risking the
// battle-tested desktop chat while the mobile UI is being built out screen by screen.
export default function useChatThreadMobile(thread, user) {
  const [localThread, setLocalThread] = useState(thread);
  const [messages, setMessages] = useState([]);
  const [loadError, setLoadError] = useState(null);
  const [sending, setSending] = useState(false);
  const sendingRef = useRef(false);

  const currentThread =
    localThread && (localThread.id === thread?.id || localThread.deal_id === thread?.id)
      ? localThread
      : thread;

  const isBrand = user?.role === "brand" || user?.user_type === "brand";

  const isUgcOrder = sharedIsUgcThread(currentThread);

  const isCreatorSigned = Boolean(
    currentThread?.agreement_signed_creator ||
    currentThread?.is_signed_creator ||
    currentThread?.creator_signed ||
    currentThread?.contract_signed_creator
  );
  const isBrandSigned = Boolean(
    currentThread?.agreement_signed_brand ||
    currentThread?.is_signed_brand ||
    currentThread?.brand_signed ||
    currentThread?.contract_signed_brand
  );
  const isMySignatureSigned = isBrand ? isBrandSigned : isCreatorSigned;
  const isOtherPartySigned = isBrand ? isCreatorSigned : isBrandSigned;

  const refreshThread = useCallback(async () => {
    if (!thread?.id) return;
    try {
      const { data } = await api.get(`/chat/v2/threads/${thread.id}`, { bypassCache: true });
      if (data) setLocalThread(data);
    } catch (err) {
      console.error("[mobile chat] refreshThread failed:", err);
    }
  }, [thread?.id]);

  const loadMessages = useCallback(async () => {
    if (!thread?.id) return;
    try {
      const { data } = await api.get(`/chat/v2/threads/${thread.id}/messages`, { bypassCache: true });
      if (Array.isArray(data)) {
        setMessages(data.filter((m) => m.content !== "⏳ Waiting for the other party to sign."));
        setLoadError(null);
      }
    } catch (err) {
      console.error("[mobile chat] loadMessages failed:", err);
      setLoadError(err?.response?.data?.detail || err?.message || "Failed to load messages");
    }
  }, [thread?.id]);

  // Initial load + on thread switch
  useEffect(() => {
    setLocalThread(thread);
    setMessages([]);
    if (thread?.id && !thread?.isNew) {
      refreshThread();
      loadMessages();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [thread?.id]);

  // Socket — same event/room names as desktop ChatBox.jsx (register_user / join_room /
  // leave_room), plus the same 6s polling safety-net it uses, so behaviour matches exactly.
  useEffect(() => {
    if (!thread?.id) return;
    const socket = io(window.location.origin, { transports: ["websocket"] });

    socket.on("connect", () => {
      socket.emit("register_user", user?.user_id || user?.id);
      socket.emit("join_room", thread.id);
    });

    socket.on("new_message", (newMessage) => {
      if (!newMessage || (newMessage.thread_id !== thread.id && newMessage.conversation_id !== thread.id)) return;
      setMessages((prev) => {
        const newId = newMessage.id || newMessage.message_id;
        if (prev.some((m) => m.id === newId)) {
          return prev.filter((m) => !(String(m.id).startsWith("temp_") && m.content === newMessage.content));
        }
        const tempIdx = prev.findIndex((m) => String(m.id).startsWith("temp_") && m.content === newMessage.content);
        if (tempIdx !== -1) {
          const copy = [...prev];
          copy[tempIdx] = newMessage;
          return copy;
        }
        return [...prev.filter((m) => !(String(m.id).startsWith("temp_") && m.content === newMessage.content)), newMessage];
      });
    });

    socket.on("thread_updated", (updatedThread) => {
      const tId = updatedThread?.id || updatedThread?.threadId || updatedThread?.thread_id || updatedThread?.deal_id;
      if (!updatedThread || (tId !== thread.id && tId !== thread.deal_id)) return;
      setLocalThread((prev) => {
        const merged = { ...prev, ...updatedThread };
        if (prev?.ugc_order && updatedThread.ugc_order) {
          merged.ugc_order = { ...prev.ugc_order, ...updatedThread.ugc_order };
        }
        return merged;
      });
      loadMessages();
    });

    socket.on("agreement_signed", (payload) => {
      const tId = payload?.id || payload?.threadId || payload?.thread_id || payload?.deal_id;
      if (!payload || (tId !== thread.id && tId !== thread.deal_id)) return;
      setLocalThread((prev) => ({
        ...prev,
        ...payload,
        status: payload.both_signed ? "ACTIVE" : prev?.status || payload.status,
        flow_state: payload.both_signed ? "ACTIVE" : payload.flow_state || "AGREEMENT_SIGNED",
        agreement_signed_creator: payload.agreement_signed_creator ?? prev?.agreement_signed_creator,
        agreement_signed_brand: payload.agreement_signed_brand ?? prev?.agreement_signed_brand,
      }));
      loadMessages();
      refreshThread();
    });

    socket.on("payment_funded", (payload) => {
      if (!payload || (payload.threadId !== thread.id && payload.thread_id !== thread.id && payload.deal_id !== thread.deal_id && payload.dealId !== thread.deal_id)) return;
      setLocalThread((prev) => ({ ...prev, payment_funded: true, status: "ACTIVE" }));
      loadMessages();
      refreshThread();
      toast.success("Payment received & confirmed in Ybex Escrow!");
    });

    socket.on("order_updated", (payload) => {
      if (payload && (payload.id === thread.deal_id || payload.id === thread.id)) {
        refreshThread();
        loadMessages();
      }
    });
    socket.on("deal_updated", (payload) => {
      if (payload && (payload.id === thread.deal_id || payload.id === thread.id)) {
        refreshThread();
        loadMessages();
      }
    });

    // Same polling safety-net as desktop, in case a socket event is missed
    const interval = setInterval(() => {
      loadMessages();
      refreshThread();
    }, 6000);

    return () => {
      socket.emit("leave_room", thread.id);
      socket.disconnect();
      clearInterval(interval);
    };
  }, [thread?.id, user?.user_id, refreshThread, loadMessages]);

  const sendText = useCallback(
    async (text) => {
      const msg = (text || "").trim();
      if (!msg || !thread?.id || sendingRef.current) return;
      sendingRef.current = true;
      setSending(true);

      const tempId = `temp_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      const effectiveMyId =
        user?.user_id || user?.id || (isBrand ? currentThread?.brand_id : currentThread?.creator_id);
      const optimistic = {
        id: tempId,
        thread_id: thread.id,
        sender_id: effectiveMyId,
        sender_user_id: effectiveMyId,
        sender_role: isBrand ? "brand" : "creator",
        content: msg,
        message_type: "text",
        created_at: new Date().toISOString(),
        status: "sending",
      };
      setMessages((prev) => [...prev, optimistic]);

      try {
        const { data } = await api.post(`/chat/v2/threads/${thread.id}/messages`, {
          content: msg,
          message_type: "text",
        });
        setMessages((prev) => {
          const withoutTemp = prev.filter((m) => m.id !== tempId);
          if (data && withoutTemp.some((m) => m.id === data.id)) return withoutTemp;
          return data ? [...withoutTemp, data] : withoutTemp;
        });
      } catch (err) {
        setMessages((prev) => prev.map((m) => (m.id === tempId ? { ...m, status: "failed" } : m)));
        if (err?.response?.data?.blocked) {
          toast.error(err.response.data.error || "Contact details can't be shared in chat.");
        } else {
          toast.error("Message failed to send: " + (err?.response?.data?.error || err?.message || "unknown error"));
        }
      } finally {
        sendingRef.current = false;
        setSending(false);
      }
    },
    [thread?.id, user, isBrand, currentThread]
  );

  const acceptCounter = useCallback(async () => {
    if (!thread?.id) return;
    try {
      const acceptEndpoint = (thread?.is_ugc || thread?.deal_type === 'UGC')
        ? `/ugc/threads/${thread.id}/brand-accept-counter`
        : `/campaign/threads/${thread.id}/brand-accept-counter`;
      const res = await api.post(acceptEndpoint);
      const data = res.data;
      toast.success("Counter offer accepted! 🤝");
      if (data) setLocalThread((prev) => ({ ...prev, ...data }));
      refreshThread();
      loadMessages();
    } catch (err) {
      toast.error(err?.response?.data?.error || err?.response?.data?.detail || "Failed to accept offer");
    }
  }, [thread?.id, thread?.is_ugc, thread?.deal_type, refreshThread, loadMessages]);

  const sendCounter = useCallback(
    async (amount) => {
      const amountNum = Number(amount);
      if (!amountNum || amountNum <= 0) {
        toast.error("Please enter a valid amount.");
        return;
      }
      if (amountNum < 3000) {
        toast.error("Minimum offer amount on the platform is ₹3,000.");
        return;
      }
      try {
        const negotiateEndpoint = (thread?.is_ugc || thread?.deal_type === 'UGC')
          ? `/ugc/threads/${thread.id}/creator-negotiate`
          : `/campaign/threads/${thread.id}/creator-negotiate`;
        const res = await api.post(negotiateEndpoint, {
          counter_amount: amountNum,
        });
        const data = res.data;
        toast.success(`Counter offer of ₹${amountNum.toLocaleString("en-IN")} sent.`);
        if (data) setLocalThread((prev) => ({ ...prev, ...data }));
        refreshThread();
        loadMessages();
      } catch (err) {
        toast.error(err?.response?.data?.error || err?.response?.data?.detail || "Failed to send counter offer");
      }
    },
    [thread?.id, thread?.is_ugc, thread?.deal_type, refreshThread, loadMessages]
  );

  // ---- Draft / deliverable review (campaign uses approve-content, UGC uses /ugc/orders/:id/approve) ----
  const getUgcOrderId = useCallback(() => {
    return (
      currentThread?.ugc_order_id ||
      currentThread?.ugc_order?.id ||
      (currentThread?.id?.startsWith("ugcord_") ? currentThread.id : null) ||
      (currentThread?.deal_id?.startsWith("ugcord_") ? currentThread.deal_id : null) ||
      (currentThread?.id?.startsWith("thread_ugc_") ? currentThread.id.replace("thread_ugc_", "") : null)
    );
  }, [currentThread]);

  const approveDeliverable = useCallback(async () => {
    try {
      if (isUgcOrder) {
        const orderId = getUgcOrderId() || thread.id;
        await api.post(`/ugc/orders/${orderId}/approve`);
        toast.success("Approved! Payout released to the creator. 🎉");
      } else {
        await api.post(`/campaign/threads/${thread.id}/approve-content`);
        toast.success("Draft approved — creator can now post it live.");
      }
      refreshThread();
      loadMessages();
    } catch (err) {
      toast.error(err?.response?.data?.error || err?.response?.data?.detail || "Failed to approve");
    }
  }, [thread?.id, isUgcOrder, getUgcOrderId, refreshThread, loadMessages]);

  const requestChanges = useCallback(
    async (feedback) => {
      const fb = (feedback || "").trim();
      if (!fb) {
        toast.error("Please describe what should change.");
        return false;
      }
      try {
        const endpoint = isUgcOrder
          ? `/ugc/threads/${thread.id}/reject-content`
          : `/campaign/threads/${thread.id}/reject-content`;
        await api.post(endpoint, { feedback: fb });
        toast.success("Revision request sent.");
        refreshThread();
        loadMessages();
        return true;
      } catch (err) {
        toast.error(err?.response?.data?.error || err?.response?.data?.detail || "Failed to send revision request");
        return false;
      }
    },
    [thread?.id, isUgcOrder, refreshThread, loadMessages]
  );

  // ---- Live links (campaign deal only) ----
  const submitLiveLink = useCallback(
    async (link, notes) => {
      const rawLink = (link || "").trim();
      if (!rawLink) {
        toast.error("Please paste your live post link.");
        return false;
      }
      try {
        const endpoint = isUgcOrder
          ? `/ugc/threads/${thread.id}/submit-live-link`
          : `/campaign/threads/${thread.id}/submit-live-link`;
        await api.post(endpoint, {
          link: rawLink,
          links: [rawLink],
          notes: notes || "",
        });
        const dealId =
          currentThread?.deal_id ||
          (thread.id?.startsWith("thread_camp_") ? thread.id.replace("thread_camp_", "") : thread.id);
        if (dealId && !dealId.startsWith("ugcord_")) {
          try {
            await api.post(`/deals/${dealId}/add-collab`, { instagram_post_url: rawLink, notes: notes || "" });
          } catch (e) {
            console.warn("[mobile chat] add-collab fallback failed:", e);
          }
        }
        toast.success("Live link submitted! 🚀");
        refreshThread();
        loadMessages();
        return true;
      } catch (err) {
        toast.error(err?.response?.data?.error || err?.response?.data?.detail || "Failed to submit live link");
        return false;
      }
    },
    [thread?.id, currentThread, refreshThread, loadMessages]
  );

  const approveLiveLinks = useCallback(async () => {
    try {
      const endpoint = isUgcOrder
        ? `/ugc/threads/${thread.id}/mark-complete`
        : `/campaign/threads/${thread.id}/approve-live-links`;
      await api.post(endpoint);
      toast.success("Live links approved — payout released! 🎉");
      refreshThread();
      loadMessages();
    } catch (err) {
      toast.error(err?.response?.data?.error || err?.response?.data?.detail || "Failed to approve live links");
    }
  }, [thread?.id, isUgcOrder, refreshThread, loadMessages]);

  const rejectLiveLinks = useCallback(
    async (feedback) => {
      const fb = (feedback || "").trim();
      if (!fb) {
        toast.error("Please describe what's wrong with the link.");
        return false;
      }
      try {
        const endpoint = isUgcOrder
          ? `/ugc/threads/${thread.id}/reject-content`
          : `/campaign/threads/${thread.id}/reject-content`;
        await api.post(endpoint, { feedback: fb });
        toast.success("Resubmission requested.");
        refreshThread();
        loadMessages();
        return true;
      } catch (err) {
        toast.error(err?.response?.data?.error || err?.response?.data?.detail || "Failed to request resubmission");
        return false;
      }
    },
    [thread?.id, isUgcOrder, refreshThread, loadMessages]
  );

  // ---- Deliverable upload (draft submit / revised re-upload), campaign or UGC ----
  const uploadDeliverable = useCallback(
    async (file, notes) => {
      if (!file || !thread?.id) return false;
      try {
        const fileExt = file.name.split(".").pop();
        const fileName = `${thread.id}-${Date.now()}.${fileExt}`;
        const filePath = `chat-attachments/${fileName}`;
        const { data: signedData } = await api.post("/upload/signed-url", {
          bucket: "content-submissions",
          path: filePath,
          contentType: file.type || "application/octet-stream",
        });
        const { supabase } = await import("../../../lib/supabase");
        const { error: uploadError } = await supabase.storage
          .from("content-submissions")
          .uploadToSignedUrl(signedData.path, signedData.token, file);
        if (uploadError) throw uploadError;

        const submitPayload = { videoUrl: filePath, notes: notes || "" };
        if (isUgcOrder) {
          const orderId = getUgcOrderId() || thread.id;
          await api.post(`/ugc/orders/${orderId}/submit`, submitPayload);
        } else {
          await api.post(`/campaign/threads/${thread.id}/submit-content`, submitPayload);
        }
        toast.success("Deliverable submitted!");
        refreshThread();
        loadMessages();
        return true;
      } catch (err) {
        toast.error(err?.response?.data?.error || err?.response?.data?.detail || err?.message || "Upload failed");
        return false;
      }
    },
    [thread?.id, isUgcOrder, getUgcOrderId, refreshThread, loadMessages]
  );

  // ---- Rating ----
  const submitReview = useCallback(
    async ({ rating, communication, timeliness, quality, comment }) => {
      if (!rating || rating < 1 || rating > 5) {
        toast.error("Please give an overall rating.");
        return false;
      }
      try {
        const reviewEndpoint = (thread?.is_ugc || thread?.deal_type === 'UGC')
          ? `/ugc/threads/${thread.id}/submit-review`
          : `/campaign/threads/${thread.id}/submit-review`;
        await api.post(reviewEndpoint, {
          rating,
          communication_rating: communication ?? rating,
          timeliness_rating: timeliness ?? rating,
          quality_rating: quality ?? rating,
          comment: comment || "",
        });
        toast.success("Thanks for the feedback!");
        refreshThread();
        return true;
      } catch (err) {
        toast.error(err?.response?.data?.error || err?.response?.data?.detail || "Failed to submit review");
        return false;
      }
    },
    [thread?.id, thread?.is_ugc, thread?.deal_type, refreshThread]
  );

  // ---- Contract signing ----
  // Same two calls the desktop ContractModal.jsx makes: a real OTP to the signer's
  // registered email (backend/session_routes.ts has a dedicated `contract_sign`
  // email template), then POST .../sign once the code verifies.
  const sendSignOtp = useCallback(
    async (email) => {
      const value = String(email || "").trim();
      if (!value || !value.includes("@")) {
        toast.error("No verified email on this account to send the code to.");
        return false;
      }
      try {
        await api.post("/otp/send", {
          value,
          target: "email",
          purpose: "contract_sign",
          recipientName: user?.name || user?.full_name || (isBrand ? "Brand Partner" : "Creator Partner"),
          brandName: currentThread?.brand?.name || currentThread?.brand?.company_name || "Brand Partner",
          creatorName: currentThread?.creator?.name || currentThread?.creator?.full_name || "Creator Partner",
          campaignTitle: currentThread?.campaign_title || currentThread?.ugc_title || "Influencer Partnership Agreement",
          dealAmount: currentThread?.agreed_amount || currentThread?.amount_fixed || "",
        });
        toast.success(`Verification code sent to ${value}`);
        return true;
      } catch (err) {
        toast.error(err?.response?.data?.detail || err?.response?.data?.error || "Failed to send the code.");
        return false;
      }
    },
    [user, isBrand, currentThread]
  );

  const signAgreement = useCallback(
    async ({ email, code }) => {
      const value = String(email || "").trim();
      const otp = String(code || "").trim();
      if (otp.length < 4) {
        toast.error("Enter the 6-digit code from your email.");
        return false;
      }
      try {
        await api.post("/otp/verify", { value, code: otp });
      } catch (err) {
        toast.error(err?.response?.data?.detail || err?.response?.data?.error || "Incorrect or expired code.");
        return false;
      }
      try {
        await api.post(`/campaign/threads/${thread.id}/sign`, { offer_id: thread?.id });
        toast.success("Contract signed.");
        refreshThread();
        loadMessages();
        return true;
      } catch (err) {
        toast.error(err?.response?.data?.detail || err?.response?.data?.error || "Failed to execute the agreement.");
        return false;
      }
    },
    [thread?.id, refreshThread, loadMessages]
  );

  return {
    currentThread,
    messages,
    loadError,
    sending,
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
    refreshThread,
    loadMessages,
  };
}
