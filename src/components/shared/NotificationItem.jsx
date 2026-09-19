import React from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { t } from "@/lib/typography";
import { formatEnglishNotification } from "../../utils/translateNotification";

const NOTI_ICONS = {
  KYC_APPROVED: '✅',
  KYC_REJECTED: '❌',
  CAMPAIGN_LIVE: '🚀',
  CAMPAIGN_REJECTED: '❌',
  NEW_APPLICATION: '📩',
  SHORTLISTED: '⭐',
  CHAT_UNLOCKED: '💬',
  OFFER_RECEIVED: '💰',
  DEAL_SIGNED: '🤝',
  CONTENT_SUBMITTED: '🎬',
  CONTENT_APPROVED: '✅',
  REVISION_REQUESTED: '✏️',
  PROOF_SUBMITTED: '📊',
  PAYMENT_RECEIVED: '💸',
  PAYMENT_PENDING: '⏳',
  PAYMENT_METHOD_APPROVED: '🏦',
  PAYMENT_METHOD_REJECTED: '🚫',
  WARNING_ISSUED: '⚠️',
  ACCOUNT_RESTRICTED: '🔒',
  campaign_application_approved: '✅',
  campaign_application_declined: '❌',
  collab_action: '🤝',
  wave: '👋',
  collab_request: '💼'
};

function formatTimeAgo(dateString) {
  try {
    const now = new Date();
    const past = new Date(dateString);
    const ms = now.getTime() - past.getTime();
    if (isNaN(ms)) return "just now";
    
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (seconds < 60) return "just now";
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days === 1) return "yesterday";
    if (days < 30) return `${days}d ago`;
    
    return past.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  } catch (e) {
    return "recently";
  }
}

export function getNotificationRedirectPath(notification, role) {
  if (!notification) return null;
  
  const event_type = notification.event_type || notification.type;
  const event_ref_id = notification.event_ref_id || notification.ref_id;
  const subtype = notification.subtype;
  
  if (subtype === 'announcement' || (subtype === 'general' && !event_type)) {
    return null;
  }
  
  switch (event_type) {
    case 'application_shortlisted':
    case 'application_accepted':
    case 'application_rejected':
      return role === 'brand' 
        ? `/brand/campaigns` 
        : (event_ref_id ? `/campaigns/${event_ref_id}` : `/collabs`);
        
    case 'new_application':
      return event_ref_id ? `/brand/campaigns/${event_ref_id}/applicants` : `/brand/campaigns`;
      
    case 'deliverable_submitted':
    case 'deliverable_approved':
    case 'deliverable_revision':
      return event_ref_id ? `/deals/${event_ref_id}` : (role === 'brand' ? `/brand/ugc/orders` : `/creator/ugc/orders`);
      
    case 'escrow_deposited':
    case 'payout_success':
      return role === 'brand' ? `/brand/payments` : `/earnings`;
      
    case 'new_message':
    case 'new_message_brand':
      return event_ref_id ? `/chat/${event_ref_id}` : (role === 'brand' ? `/brand/inbox` : `/chat`);
      
    case 'new_kyc_submission':
      return event_ref_id ? `/admin?tab=kyc&user_id=${event_ref_id}` : `/admin`;
      
    case 'dispute_raised':
      return event_ref_id ? `/admin?tab=disputes&dispute_id=${event_ref_id}` : `/admin`;
      
    case 'new_support_ticket':
      return event_ref_id ? `/support/tickets/${event_ref_id}` : `/help/tickets`;
      
    case 'kyc_approved':
    case 'kyc_rejected':
    case 'brand_kyc_approved':
    case 'brand_kyc_rejected':
    case 'KYC_APPROVED':
    case 'KYC_REJECTED':
      return `/kyc/status`;

    case 'CONTENT_REJECTED':
    case 'PROOF_REJECTED':
    case 'content_rejected':
    case 'proof_rejected':
      return event_ref_id ? `/deals/${event_ref_id}` : (role === 'brand' ? `/brand/ugc/orders` : `/creator/ugc/orders`);

    case 'PROFILE_SAVED':
    case 'profile_saved':
      return role === 'brand' ? `/brand/profile` : `/creator/profile`;

    case 'COST_REQUEST':
    case 'cost_request':
      return `/collabs`;

    case 'UGC_READY':
    case 'UGC_REMINDER':
    case 'UGC_CANCELLED_REFUND':
    case 'ugc_ready':
    case 'ugc_reminder':
    case 'ugc_cancelled_refund':
      return role === 'brand' ? `/brand/ugc/orders` : `/creator/ugc/orders`;
      
    default: {
      const message = (notification.message || "").toLowerCase();
      const type = notification.type;
      
      // 1. Chat / DMs
      if (type === "CHAT_UNLOCKED" || type === "message" || type === "chat" || message.includes("message") || message.includes("chat") || message.includes("dm") || message.includes("msg")) {
        return role === "brand" ? "/brand/inbox" : "/chat";
      }

      // 2. Deals / UGC Orders
      if (
        type === "SHORTLISTED" || 
        type === "OFFER_RECEIVED" || 
        type === "DEAL_SIGNED" || 
        type === "CONTENT_SUBMITTED" || 
        type === "CONTENT_APPROVED" || 
        type === "REVISION_REQUESTED" || 
        type === "collab_action" || 
        type === "collab_request" ||
        message.includes("deal") || 
        message.includes("collab") || 
        message.includes("contract") || 
        message.includes("brief") || 
        message.includes("order")
      ) {
        return role === "brand" ? "/brand/ugc/orders" : "/creator/ugc/orders";
      }

      // 3. Campaigns
      if (
        type === "CAMPAIGN_LIVE" || 
        type === "CAMPAIGN_REJECTED" || 
        type === "campaign_application_approved" || 
        type === "campaign_application_declined" ||
        message.includes("campaign") || 
        message.includes("applicant") || 
        message.includes("application")
      ) {
        return role === "brand" ? "/brand/campaigns" : "/collabs";
      }

      // 4. Payments
      if (
        type === "PAYMENT_RECEIVED" || 
        type === "PAYMENT_PENDING" || 
        type === "PROOF_SUBMITTED" ||
        message.includes("payment") || 
        message.includes("payout") || 
        message.includes("money") || 
        message.includes("earning") || 
        message.includes("rupees") || 
        message.includes("₹")
      ) {
        return role === "brand" ? "/brand/payments" : "/earnings";
      }

      // 5. KYC / Settings
      if (type === "KYC_APPROVED" || type === "KYC_REJECTED" || message.includes("kyc") || message.includes("verification")) {
        return "/settings?tab=kyc";
      }

      return null;
    }
  }
}

export default function NotificationItem({ notification, onRead }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const role = user?.role || "creator";

  const icon = NOTI_ICONS[notification.type] || '🔔';
  const timeAgo = formatTimeAgo(notification.created_at);
  const isRead = notification.read;

  const handleClick = () => {
    // Mark as read if unread
    if (!isRead) {
      onRead(notification.notif_id);
    }
    
    // Check if there is a redirection path
    const path = getNotificationRedirectPath(notification, role);
    if (path) {
      navigate(path);
    }
  };

  return (
    <div
      onClick={handleClick}
      className={`flex items-start gap-3 p-4 border-b border-foreground/5 hover:bg-foreground/5 cursor-pointer transition-colors ${
        !isRead ? 'bg-[var(--violet)]/5 border-l-2 border-l-[var(--violet)]' : ''
      }`}
    >
      {/* Icon */}
      <div className={`w-9 h-9 rounded-t-[14px] rounded-bl-[14px] rounded-br-[4px] flex items-center justify-center text-lg shrink-0 ${
        !isRead ? 'bg-[var(--violet)]/20 text-[var(--text-primary)]' : 'bg-foreground/5'
      }`}>
        {icon}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className={`text-sm leading-snug ${isRead ? 'text-sm text-gray-500' : 'font-bold text-sm'}`}>
          {formatEnglishNotification(notification.message)}
        </p>
        <p className={`font-mono font-medium tracking-tight text-[11px] mt-1`}>{timeAgo}</p>
      </div>

      {/* Unread dot */}
      {!isRead && (
        <div className="w-2 h-2 bg-[var(--violet)] rounded-full shrink-0 mt-1.5" />
      )}
    </div>
  );
}
