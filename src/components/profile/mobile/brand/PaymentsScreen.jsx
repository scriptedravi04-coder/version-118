import React, { useState, useEffect } from "react";
import { Wallet, ShieldCheck, Check } from "lucide-react";
import { api } from "../../../../lib/api";
import { useAuth } from "../../../../contexts/AuthContext";
import InvoiceModal from "../../../payments/InvoiceModal";
import { MobileScreen, Section, Card, Loader, Pill, EmptyState } from "./brandMobileUi";

// Screen 1h — payments & escrow. Reads GET escrow-transactions (the same endpoint
// BrandPayments.jsx calls) and uses the same status buckets for the totals and the
// same four-step milestone derivation TransactionCard.jsx uses, so the mobile and
// desktop ledgers can't disagree.

const HELD_STATUSES = ["deposited", "held", "in_escrow", "video_submitted", "pending", "escrow_held", "active", "approved"];
const SETTLED_STATUSES = ["released", "completed", "paid", "success"];

const STEPS = ["Deposited", "In escrow", "Submitted", "Released"];

function milestoneFor(tx) {
  const status = String(tx.status || "").toUpperCase();
  const payout = String(tx.payout_status || "").toUpperCase();
  const dealStatus = String(tx.deal_status || "").toUpperCase();
  const utr = tx.payout_reference || tx.utr_number;

  const released = Boolean(
    payout === "RELEASED" || payout === "PAID" || status === "RELEASED" ||
    (status === "COMPLETED" && (payout === "PAID" || payout === "RELEASED" || utr)) || utr
  );
  if (released) return 4;

  const submitted = Boolean(
    tx.is_content_submitted === true ||
    ["VIDEO_SUBMITTED", "SUBMITTED", "IN_REVIEW", "APPROVED", "CONTENT_APPROVED", "PAYOUT_REQUESTED", "COMPLETED", "LIVE_LINKS_SUBMITTED"].includes(status) ||
    ["VIDEO_SUBMITTED", "SUBMITTED", "IN_REVIEW", "APPROVED", "CONTENT_APPROVED", "PAYOUT_REQUESTED", "COMPLETED", "LIVE_LINKS_SUBMITTED"].includes(dealStatus) ||
    tx.video_url || tx.submission_link
  );
  if (submitted) return 3;

  const inEscrow = Boolean(
    tx.escrow_hold === true ||
    ["HELD", "IN_ESCROW", "ESCROW_HELD", "ACTIVE", "IN_PROGRESS", "SUCCESS"].includes(status) ||
    ["HELD", "IN_ESCROW", "ESCROW_HELD", "ACTIVE", "IN_PROGRESS"].includes(dealStatus)
  );
  return inEscrow ? 2 : 1;
}

export default function PaymentsScreen({ onBack }) {
  const { user } = useAuth();
  const [txns, setTxns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [invoiceTx, setInvoiceTx] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await api.get("escrow-transactions", { bypassCache: true }).catch(() => ({ data: null }));
        if (!cancelled) setTxns(Array.isArray(data) ? data : []);
      } catch (e) {
        console.warn("Failed to load escrow transactions:", e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const amountOf = (t) => Number(t.amount || t.gross_amount || 0);
  const statusOf = (t) => String(t.status || "").toLowerCase();

  const held = txns.filter((t) => HELD_STATUSES.includes(statusOf(t))).reduce((a, t) => a + amountOf(t), 0);
  const settled = txns.filter((t) => SETTLED_STATUSES.includes(statusOf(t))).reduce((a, t) => a + amountOf(t), 0);
  const protectedCount = new Set(
    txns.filter((t) => !SETTLED_STATUSES.includes(statusOf(t)))
      .map((t) => t.contract_id || t.id || t.transaction_id)
  ).size;

  if (loading) {
    return (
      <MobileScreen title="Payments" onBack={onBack}>
        <Loader label="Loading your escrow ledger…" />
      </MobileScreen>
    );
  }

  return (
    <MobileScreen title="Payments" subtitle="Escrow & payouts" onBack={onBack}>
      <Section>
        <div className="rounded-2xl bg-violet-600 text-white p-5">
          <div className="flex items-center gap-1.5">
            <ShieldCheck size={13} />
            <span className="text-xs font-bold">Escrow secured</span>
          </div>
          <div className="text-xs text-white/80 mt-3">Held in escrow</div>
          <div className="text-3xl font-bold mt-0.5">₹{held.toLocaleString("en-IN")}</div>
          <p className="text-xs text-white/80 mt-3 leading-relaxed">
            Escrow is funded per campaign when you accept a deal in chat, so there's no
            separate wallet to top up.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 mt-3">
          <Card className="p-4">
            <div className="text-xs text-gray-500">Settled</div>
            <div className="text-xl font-bold text-gray-900 mt-0.5">₹{settled.toLocaleString("en-IN")}</div>
          </Card>
          <Card className="p-4">
            <div className="text-xs text-gray-500">Protected</div>
            <div className="text-xl font-bold text-gray-900 mt-0.5">
              {protectedCount} {protectedCount === 1 ? "contract" : "contracts"}
            </div>
          </Card>
        </div>
      </Section>

      <Section title="Transaction queue" className="pt-0 pb-8">
        {txns.length === 0 ? (
          <Card className="border-dashed">
            <EmptyState
              icon={Wallet}
              title="Nothing in escrow yet"
              body="Payments show up here once a campaign deal moves into escrow."
            />
          </Card>
        ) : (
          <div className="space-y-3">
            {txns.map((tx, idx) => {
              const step = milestoneFor(tx);
              const contractId = tx.contract_id || `CTR-${String(tx.id || tx.transaction_id || "0000").slice(0, 8).toUpperCase()}`;
              const creatorName = tx.creator_name
                || (tx.creator && typeof tx.creator === "object" ? tx.creator.name : tx.creator)
                || "Creator";
              const released = step === 4;

              return (
                <Card key={`${tx.id || tx.transaction_id || idx}`} className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-xs text-gray-500 font-mono">{contractId}</div>
                      <div className="text-sm font-bold text-gray-900 mt-0.5 truncate">{creatorName}</div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="text-base font-bold text-gray-900">
                        ₹{amountOf(tx).toLocaleString("en-IN")}
                      </div>
                      <Pill tone={released ? "green" : "violet"}>
                        {released ? "released" : "in escrow"}
                      </Pill>
                    </div>
                  </div>

                  {/* Milestone timeline */}
                  <div className="flex items-center mt-4">
                    {STEPS.map((label, i) => {
                      const n = i + 1;
                      const done = n <= step;
                      return (
                        <React.Fragment key={label}>
                          <div className="flex flex-col items-center gap-1.5 flex-shrink-0">
                            <div className={`w-5 h-5 rounded-full flex items-center justify-center ${
                              done ? "bg-violet-600" : "bg-gray-200"
                            }`}>
                              {done && <Check size={11} className="text-white" strokeWidth={3} />}
                            </div>
                            <span className={`text-[10px] ${done ? "text-gray-900 font-semibold" : "text-gray-400"}`}>
                              {label}
                            </span>
                          </div>
                          {i < STEPS.length - 1 && (
                            <div className={`flex-1 h-0.5 mx-1 -mt-4 ${n < step ? "bg-violet-600" : "bg-gray-200"}`} />
                          )}
                        </React.Fragment>
                      );
                    })}
                  </div>

                  <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100">
                    <span className="text-xs text-gray-500">
                      {tx.created_at
                        ? `Deposited ${new Date(tx.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}`
                        : "Deposited recently"}
                    </span>
                    <button
                      onClick={() => setInvoiceTx(tx)}
                      className="text-xs font-bold text-violet-600"
                    >
                      View receipt
                    </button>
                  </div>
                </Card>
              );
            })}
          </div>
        )}

        <p className="text-xs text-gray-500 mt-4 leading-relaxed">
          Escrow releases to the creator only after you approve the deliverable, or
          automatically when the SLA timer expires.
        </p>
      </Section>

      {invoiceTx && (
        <InvoiceModal
          transaction={invoiceTx}
          isBrand
          creatorName={invoiceTx.creator_name || "Creator"}
          brandName={user?.company_name || user?.name || "Brand"}
          onClose={() => setInvoiceTx(null)}
        />
      )}
    </MobileScreen>
  );
}
