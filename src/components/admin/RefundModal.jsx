import React, { useState, useEffect } from 'react';
import { 
  X, 
  RotateCcw, 
  AlertCircle, 
  CheckCircle2, 
  Copy, 
  User, 
  Building2, 
  DollarSign, 
  FileText, 
  ShieldAlert,
  HelpCircle
} from 'lucide-react';
import { api } from '../../lib/api';
import { toast } from 'sonner';

export default function RefundModal({ transaction, onClose, onSuccess }) {
  if (!transaction) return null;

  const isPending = transaction.refund_status === 'PENDING';
  const isProcessed = transaction.refund_status === 'PROCESSED';

  const defaultAmount = transaction.refund_amount 
    ? Number(transaction.refund_amount) 
    : Number(transaction.gross_amount || transaction.creator_net_amount || transaction.platform_fee_amount || 0);

  const defaultReason = transaction.refund_reason || transaction.fee_correction_note || '';
  const defaultReference = transaction.refund_reference || '';

  const [refundAmount, setRefundAmount] = useState(defaultAmount);
  const [refundReason, setRefundReason] = useState(defaultReason);
  const [refundReference, setRefundReference] = useState(defaultReference);
  const [targetStatus, setTargetStatus] = useState(isPending || !isProcessed ? 'PROCESSED' : 'PROCESSED');
  const [submitting, setSubmitting] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);

  const copyToClipboard = (text, label) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    toast.success(`${label || 'Text'} copied to clipboard!`);
  };

  const validateForm = () => {
    const amount = Number(refundAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error("Please enter a valid refund amount greater than 0.");
      return false;
    }
    if (targetStatus === 'PROCESSED' && !refundReference.trim()) {
      toast.error("Reference / UTR Number is required when marking a refund as PROCESSED.");
      return false;
    }
    return true;
  };

  const handleInitialSubmit = (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    
    if (targetStatus === 'PROCESSED') {
      setShowConfirmation(true);
    } else {
      executeRefund();
    }
  };

  const executeRefund = async () => {
    setSubmitting(true);
    try {
      const txId = transaction.id || transaction.transaction_id;
      const res = await api.post(`admin/transactions/${txId}/refund`, {
        refund_amount: Number(refundAmount),
        refund_reason: refundReason,
        refund_reference: refundReference.trim(),
        refund_status: targetStatus,
        fee_correction_note: transaction.fee_correction_note || null
      });

      if (res.data && (res.data.success || res.data.transaction)) {
        toast.success(
          targetStatus === 'PROCESSED'
            ? `Refund of ₹${Number(refundAmount).toLocaleString('en-IN')} marked as PROCESSED with UTR ${refundReference}!`
            : `Refund queued as PENDING!`
        );
        if (onSuccess) onSuccess(res.data.transaction);
        onClose();
      } else {
        toast.error("Failed to update refund state");
      }
    } catch (err) {
      console.error("Error processing refund:", err);
      toast.error(err?.response?.data?.error || err?.message || "Failed to process refund action.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-2xl max-w-xl w-full p-6 sm:p-8 space-y-6 shadow-2xl relative my-8 text-[var(--text-primary)]">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-[var(--border-default)] pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#9D7CFF]/15 text-[#9D7CFF] flex items-center justify-center font-bold shrink-0 border border-[#9D7CFF]/30">
              <RotateCcw size={20} />
            </div>
            <div>
              <h3 className="font-display font-bold text-lg text-[var(--text-primary)]">
                {isPending ? 'Process Pending Refund / Fee Adjustment' : isProcessed ? 'Update Refund Record' : 'Issue Manual Refund'}
              </h3>
              <p className="text-xs text-[var(--text-tertiary)]">
                Manual ledger adjustment & UTR transfer tracking (No gateway API call)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-[var(--text-tertiary)] hover:text-[var(--text-primary)] p-1.5 rounded-lg bg-[var(--bg-elevated)] transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Transaction Meta Card */}
        <div className="bg-[var(--bg-elevated)]/60 border border-[var(--border-default)] rounded-xl p-4 space-y-3 text-xs">
          <div className="flex items-center justify-between pb-2 border-b border-[var(--border-default)]">
            <span className="text-[var(--text-tertiary)] font-medium">Transaction ID</span>
            <div className="flex items-center gap-1.5 font-mono font-semibold text-[var(--text-primary)]">
              <span>{transaction.id || transaction.transaction_id}</span>
              <button
                onClick={() => copyToClipboard(transaction.id || transaction.transaction_id, 'Transaction ID')}
                className="text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
                title="Copy Tx ID"
              >
                <Copy size={12} />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <span className="text-[var(--text-tertiary)] block mb-0.5">Creator</span>
              <div className="font-semibold text-[var(--text-primary)] flex items-center gap-1">
                <User size={12} className="text-emerald-500" />
                <span>{transaction.creator_name || 'Creator'}</span>
              </div>
              <div className="text-[10px] font-mono text-[var(--text-tertiary)] truncate mt-0.5" title={transaction.creator_id}>
                ID: {transaction.creator_id || 'N/A'}
              </div>
            </div>

            <div>
              <span className="text-[var(--text-tertiary)] block mb-0.5">Brand / Campaign</span>
              <div className="font-semibold text-[var(--text-primary)] flex items-center gap-1">
                <Building2 size={12} className="text-blue-500" />
                <span>{transaction.brand_name || 'Brand'}</span>
              </div>
              <div className="text-[10px] text-[var(--text-tertiary)] truncate mt-0.5" title={transaction.campaign_title}>
                {transaction.campaign_title || 'Deal'}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 pt-2 border-t border-[var(--border-default)] text-center font-mono">
            <div className="bg-[var(--bg-card)] p-2 rounded-lg border border-[var(--border-default)]">
              <span className="text-[10px] text-[var(--text-tertiary)] block font-sans uppercase">Agreed GMV</span>
              <span className="font-bold">₹{Number(transaction.gross_amount || 0).toLocaleString('en-IN')}</span>
            </div>
            <div className="bg-[var(--bg-card)] p-2 rounded-lg border border-[var(--border-default)]">
              <span className="text-[10px] text-[#9D7CFF] block font-sans uppercase">Fee Charged</span>
              <span className="font-bold text-[#9D7CFF]">₹{Number(transaction.platform_fee_amount || 0).toLocaleString('en-IN')}</span>
            </div>
            <div className="bg-[var(--bg-card)] p-2 rounded-lg border border-[var(--border-default)]">
              <span className="text-[10px] text-emerald-500 block font-sans uppercase">Creator Net</span>
              <span className="font-bold text-[#027A48]">₹{Number(transaction.creator_net_amount || 0).toLocaleString('en-IN')}</span>
            </div>
          </div>
        </div>

        {/* Fee Correction Warning / Info Banner */}
        {transaction.fee_correction_note && (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3.5 flex items-start gap-3">
            <AlertCircle size={18} className="text-amber-500 shrink-0 mt-0.5" />
            <div className="text-xs space-y-1">
              <span className="font-bold text-amber-500 block uppercase tracking-wide">
                Fee Correction Note (Overcharge Audit)
              </span>
              <p className="text-[var(--text-secondary)] leading-relaxed">
                {transaction.fee_correction_note}
              </p>
              {transaction.correct_fee_amount !== null && transaction.correct_fee_amount !== undefined && (
                <div className="text-[11px] font-mono text-amber-400/90 font-medium pt-0.5">
                  Recalculated Correct Fee: ₹{Number(transaction.correct_fee_amount).toLocaleString('en-IN')} | Overcharge Refund: ₹{Number(transaction.refund_amount || 0).toLocaleString('en-IN')}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Confirmation State View */}
        {showConfirmation ? (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-5 space-y-4">
            <div className="flex items-center gap-2 text-amber-500 font-bold text-sm">
              <ShieldAlert size={20} />
              <span>Confirm Financial Action (No Undo)</span>
            </div>
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
              You are about to mark a manual refund of <strong className="text-[#027A48] font-mono text-sm">₹{Number(refundAmount).toLocaleString('en-IN')}</strong> to creator <strong className="text-[var(--text-primary)]">{transaction.creator_name || 'Creator'}</strong> as <strong className="text-[#027A48]">PROCESSED</strong> with reference UTR <strong className="font-mono text-[var(--text-primary)] bg-black/30 px-1.5 py-0.5 rounded">{refundReference}</strong>.
            </p>
            <p className="text-[11px] text-[var(--text-tertiary)] italic">
              Note: The money must be sent manually via UPI or net banking to the creator outside the application. This action records the transaction permanently in the platform audit log with your admin ID.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowConfirmation(false)}
                className="px-4 py-2 bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-xl text-xs font-semibold hover:bg-[var(--bg-card)] transition-colors"
                disabled={submitting}
              >
                Back to Edit
              </button>
              <button
                type="button"
                onClick={executeRefund}
                disabled={submitting}
                className="px-5 py-2 bg-emerald-500 hover:bg-emerald-600 text-black font-bold text-xs rounded-xl flex items-center gap-2 shadow-lg shadow-emerald-500/20 transition-all"
              >
                {submitting ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
                    <span>Processing...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={15} />
                    <span>Confirm & Mark as Processed</span>
                  </>
                )}
              </button>
            </div>
          </div>
        ) : (
          /* Form Controls */
          <form onSubmit={handleInitialSubmit} className="space-y-4 text-xs">
            {/* Refund Amount */}
            <div className="space-y-1.5">
              <label className="font-semibold text-[var(--text-primary)] flex items-center justify-between">
                <span>Refund Amount (₹) <span className="text-red-400">*</span></span>
                <span className="text-[11px] text-[var(--text-tertiary)] font-normal">
                  (Pre-filled from calculated overcharge / fee)
                </span>
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)] font-bold">₹</span>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  value={refundAmount}
                  onChange={(e) => setRefundAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full pl-8 pr-4 py-2.5 bg-[var(--bg-card)] border border-[var(--border-default)] rounded-xl font-mono text-sm font-bold text-[var(--text-primary)] focus:border-[#9D7CFF] focus:outline-none"
                />
              </div>
            </div>

            {/* Refund Reason */}
            <div className="space-y-1.5">
              <label className="font-semibold text-[var(--text-primary)]">
                Refund Reason / Audit Note
              </label>
              <textarea
                rows={2}
                value={refundReason}
                onChange={(e) => setRefundReason(e.target.value)}
                placeholder="Enter reason for refund or fee adjustment..."
                className="w-full p-3 bg-[var(--bg-card)] border border-[var(--border-default)] rounded-xl text-xs text-[var(--text-primary)] focus:border-[#9D7CFF] focus:outline-none resize-none"
              />
            </div>

            {/* Reference / UTR Number */}
            <div className="space-y-1.5">
              <label className="font-semibold text-[var(--text-primary)] flex items-center justify-between">
                <span>Payment Reference / UTR Number <span className="text-red-400">*</span></span>
                <span className="text-[10px] text-[var(--text-tertiary)] font-normal">
                  (Bank/UPI transfer reference id)
                </span>
              </label>
              <input
                type="text"
                required={targetStatus === 'PROCESSED'}
                value={refundReference}
                onChange={(e) => setRefundReference(e.target.value)}
                placeholder="e.g. UPI/602910481234 or BANK/REF98765"
                className="w-full px-3.5 py-2.5 bg-[var(--bg-card)] border border-[var(--border-default)] rounded-xl font-mono text-xs text-[var(--text-primary)] focus:border-[#9D7CFF] focus:outline-none"
              />
            </div>

            {/* Target Status Selection */}
            <div className="space-y-2 pt-1">
              <label className="font-semibold text-[var(--text-primary)] block">
                Refund Action Status
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label
                  onClick={() => setTargetStatus('PROCESSED')}
                  className={`p-3 rounded-xl border flex items-center gap-2.5 cursor-pointer transition-all ${
                    targetStatus === 'PROCESSED'
                      ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-400 font-semibold'
                      : 'bg-[var(--bg-card)] border-[var(--border-default)] text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]'
                  }`}
                >
                  <input
                    type="radio"
                    name="refund_status"
                    checked={targetStatus === 'PROCESSED'}
                    onChange={() => setTargetStatus('PROCESSED')}
                    className="accent-emerald-500"
                  />
                  <div>
                    <span className="block text-xs text-[var(--text-primary)] font-bold">Mark PROCESSED</span>
                    <span className="text-[10px] opacity-80 block">Money paid manually</span>
                  </div>
                </label>

                <label
                  onClick={() => setTargetStatus('PENDING')}
                  className={`p-3 rounded-xl border flex items-center gap-2.5 cursor-pointer transition-all ${
                    targetStatus === 'PENDING'
                      ? 'bg-amber-500/10 border-amber-500/50 text-amber-500 font-semibold'
                      : 'bg-[var(--bg-card)] border-[var(--border-default)] text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]'
                  }`}
                >
                  <input
                    type="radio"
                    name="refund_status"
                    checked={targetStatus === 'PENDING'}
                    onChange={() => setTargetStatus('PENDING')}
                    className="accent-amber-500"
                  />
                  <div>
                    <span className="block text-xs text-[var(--text-primary)] font-bold">Save as PENDING</span>
                    <span className="text-[10px] opacity-80 block">Queue for review</span>
                  </div>
                </label>
              </div>
            </div>

            {/* Existing Refund Audit Info if already processed */}
            {isProcessed && transaction.refunded_at && (
              <div className="p-3 bg-foreground/5 rounded-xl border border-[var(--border-default)] text-[11px] text-[var(--text-tertiary)] space-y-1 font-mono">
                <div>Processed Date: {new Date(transaction.refunded_at).toLocaleString('en-IN')}</div>
                <div>Processed By Admin: {transaction.refunded_by || 'Admin'}</div>
                <div>Existing UTR: {transaction.refund_reference || 'N/A'}</div>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-[var(--border-default)]">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-xl text-xs font-semibold hover:bg-[var(--bg-card)] transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className={`px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
                  targetStatus === 'PROCESSED'
                    ? 'bg-emerald-500 hover:bg-emerald-600 text-black shadow-md shadow-emerald-500/20'
                    : 'bg-amber-500 hover:bg-amber-600 text-black shadow-md shadow-amber-500/20'
                }`}
              >
                <RotateCcw size={14} />
                <span>{targetStatus === 'PROCESSED' ? 'Review & Process Refund' : 'Save Pending Refund'}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
