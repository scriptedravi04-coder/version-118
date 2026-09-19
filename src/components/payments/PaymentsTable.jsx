import React from "react";
import TransactionCard from "./TransactionCard";
import { t } from "@/lib/typography";

export default function PaymentsTable({ transactions = [], onRelease }) {
  const list = transactions || [];

  if (list.length === 0) {
    return (
      <div className={`bg-[var(--bg-card)] border border-dashed border-[var(--border-default)] rounded-[12px] p-12 text-center text-[var(--text-secondary)] text-sm text-gray-500`}>
        No transactions yet — payments will appear here once a deal moves to escrow.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {list.map((tx, idx) => (
        <TransactionCard
          key={`tx-card-${tx.id || tx.transaction_id || tx.deal_id || tx.ugc_order_id || 'item'}-${idx}`}
          tx={tx}
          onRelease={onRelease}
        />
      ))}
    </div>
  );
}
