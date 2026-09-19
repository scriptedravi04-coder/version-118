import React, { useState } from 'react';
import { CreditCard, CheckCircle2 } from 'lucide-react';
import { processRazorpayPayment } from "../../lib/razorpay";
import { toast } from 'sonner';

export default function PayNow({ dealId, creatorId, grossAmount }) {
  const [loading, setLoading] = useState(false);

  const handlePay = async () => {
    setLoading(true);
    await processRazorpayPayment({
      dealId,
      creatorId,
      grossAmount,
      onSuccess: () => {
        setLoading(false);
        setTimeout(() => {
          window.location.reload();
        }, 1200);
      },
      onError: () => {
        setLoading(false);
      }
    });
  };

  return (
    <div className="bg-[var(--bg-elevated)]/60 border border-[var(--border-default)] rounded-2xl p-6 md:p-8 max-w-lg mx-auto backdrop-blur-xl">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 rounded-xl bg-[var(--violet)]/20 flex items-center justify-center text-[var(--violet)]">
          <CreditCard size={24} />
        </div>
        <div>
          <h2 className="text-xl font-bold text-[var(--text-primary)] tracking-tight">Campaign Payment</h2>
          <p className="text-sm text-[var(--text-secondary)] relative top-0.5">Secure payment via platform</p>
        </div>
      </div>

      <div className="mb-8 bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-xl p-5">
        <div className="flex justify-between items-center text-lg">
          <span className="text-[var(--text-primary)]/80">Total Amount to Pay</span>
          <span className="font-bold text-[var(--text-primary)] tracking-tight">₹{grossAmount.toLocaleString('en-IN')}</span>
        </div>
      </div>

      <div className="flex items-center gap-2 mb-6 text-xs text-[var(--text-tertiary)] bg-[var(--bg-elevated)] p-3 rounded-xl border border-[var(--border-default)]">
        <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
        <p>Your payment is kept in secure escrow. The creator is paid after deliverables are approved.</p>
      </div>

      <button 
        onClick={handlePay}
        disabled={loading}
        className="w-full bg-[var(--violet)] hover:bg-[var(--violet-hover)] disabled:bg-[var(--bg-elevated)] disabled:text-[var(--text-tertiary)] text-[var(--text-primary)] font-bold py-4 rounded-xl shadow-lg shadow-[var(--violet)]/20 transition-all flex items-center justify-center gap-2"
      >
        {loading ? 'Processing...' : `Pay ₹${grossAmount.toLocaleString('en-IN')} via Razorpay (100% Escrow Protected)`}
      </button>

      <div className="mt-4 flex justify-center opacity-50 grayscale gap-4 items-center">
        <div className="text-[10px] font-bold tracking-widest uppercase flex items-center gap-1">Secured by <span className="text-[var(--text-primary)]">Escrow</span></div>
      </div>
    </div>
  );
}
