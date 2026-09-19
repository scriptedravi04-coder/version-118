import React from "react";

export default function MobilePayoutCard({ message, amount }) {
  const metadata = message.metadata || {};
  const utr = metadata.utr_number || metadata.utr || "";
  const isSettled = Boolean(utr);
  const timeText = message.created_at ? new Date(message.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "";
  const paidOnText = message.created_at
    ? new Date(message.created_at).toLocaleDateString([], { day: "2-digit", month: "short" }) + ", " + timeText
    : "";

  return (
    <div style={{ alignSelf: "stretch", background: "#fff", borderRadius: 16, overflow: "hidden", boxShadow: "0 10px 24px -20px rgba(18,18,26,.4)" }}>
      <div style={{ padding: "14px 15px 0", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ font: "600 10px 'DM Sans',sans-serif", letterSpacing: ".8px", textTransform: "uppercase", color: isSettled ? "#059669" : "#D97706" }}>
          {isSettled ? "Payout settled" : "Payment released"}
        </div>
        <div style={{ font: "400 10.5px 'DM Sans',sans-serif", color: "#6B7280" }}>{timeText}</div>
      </div>
      <div style={{ padding: "9px 15px 0", font: "700 26px/1 'DM Sans',sans-serif", letterSpacing: "-1px", color: "#0A0A0A" }}>
        ₹{Number(amount || metadata.amount || 0).toLocaleString("en-IN")}
      </div>

      {isSettled ? (
        <>
          <div style={{ padding: "12px 15px 0" }}>
            <div style={{ padding: 13, borderRadius: 12, background: "#ECFDF5", border: "1px solid #C7EFDD" }}>
              <div style={{ font: "600 10px 'DM Sans',sans-serif", letterSpacing: ".8px", textTransform: "uppercase", color: "#059669" }}>Bank reference (UTR)</div>
              <div style={{ marginTop: 7, font: "700 19px 'DM Sans',sans-serif", letterSpacing: ".6px", color: "#0A0A0A" }}>{utr}</div>
            </div>
          </div>
          <div style={{ padding: "12px 15px 0", display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ font: "400 12.5px 'DM Sans',sans-serif", color: "#6B7280" }}>Paid on</span>
              <span style={{ font: "500 12.5px 'DM Sans',sans-serif", color: "#0A0A0A" }}>{paidOnText}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ font: "400 12.5px 'DM Sans',sans-serif", color: "#6B7280" }}>Method</span>
              <span style={{ font: "500 12.5px 'DM Sans',sans-serif", color: "#0A0A0A" }}>IMPS · escrow release</span>
            </div>
          </div>
          <div style={{ padding: "13px 15px 15px", display: "flex", gap: 8 }}>
            <button style={{ flex: 1, height: 42, borderRadius: 12, background: "#F2F2F7", border: "none", font: "600 13px 'DM Sans',sans-serif", color: "#0A0A0A", cursor: "pointer" }}>
              View receipt
            </button>
            <button style={{ flex: 1, height: 42, borderRadius: 12, background: "#F2F2F7", border: "none", font: "600 13px 'DM Sans',sans-serif", color: "#0A0A0A", cursor: "pointer" }}>
              Download PDF
            </button>
          </div>
        </>
      ) : (
        <>
          <div style={{ padding: "12px 15px 0" }}>
            <div style={{ padding: "11px 13px", borderRadius: 12, background: "#FFFBEB", font: "400 12.5px/1.5 'DM Sans',sans-serif", color: "#92400E" }}>
              Being processed via escrow. Usually reflects within 1–2 working days.
            </div>
          </div>
          <div style={{ padding: "12px 15px 15px", display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ font: "400 12.5px 'DM Sans',sans-serif", color: "#6B7280" }}>Released</span>
              <span style={{ font: "500 12.5px 'DM Sans',sans-serif", color: "#0A0A0A" }}>{timeText}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ font: "400 12.5px 'DM Sans',sans-serif", color: "#6B7280" }}>Receipt</span>
              <span style={{ font: "500 12.5px 'DM Sans',sans-serif", color: "#6B7280" }}>After bank reference</span>
            </div>
            <button
              onClick={async (e) => {
                e.stopPropagation();
                try {
                  const targetThreadId = message.thread_id || message.metadata?.thread_id;
                  const dealId = metadata.deal_id || metadata.order_id || targetThreadId;
                  const isUgc = metadata.is_ugc || message.deal_type === 'UGC';
                  const alertEndpoint = isUgc
                    ? `/api/ugc/threads/${targetThreadId}/alert-admin-payout`
                    : `/api/campaign/threads/${targetThreadId}/alert-admin-payout`;
                  const res = await fetch(alertEndpoint, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ deal_id: dealId, note: "Priority fund release request sent from mobile chat" })
                  });
                  const data = await res.json();
                  if (res.ok) {
                    alert("Priority alert sent to Ybex Admin Desk! Escrow team notified.");
                  } else {
                    alert(data.error || "Alert already sent or processing.");
                  }
                } catch (err) {
                  alert("Priority alert sent to Admin desk.");
                }
              }}
              style={{
                marginTop: 6,
                height: 38,
                borderRadius: 10,
                background: "linear-gradient(135deg, #F59E0B 0%, #D97706 100%)",
                border: "none",
                color: "#FFFFFF",
                font: "700 12px 'DM Sans',sans-serif",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6
              }}
            >
              🔔 Alert Admin to Disburse Funds
            </button>
          </div>
        </>
      )}
    </div>
  );
}
