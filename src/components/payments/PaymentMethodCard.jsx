import React from 'react';
import { Building2, Smartphone, AlertCircle, CheckCircle2, Clock, XCircle, Trash2 } from 'lucide-react';

export default function PaymentMethodCard({ method, onDelete }) {
  const isPending = method.verification_status === 'PENDING';
  const isApproved = method.verification_status === 'APPROVED';
  const isRejected = method.verification_status === 'REJECTED';

  const formatAccount = (account) => {
    if (account.length > 4) {
      return `•••• ${account.slice(-4)}`;
    }
    return account;
  };

  return (
    <div className={`p-5 rounded-2xl border ${isApproved ? 'border-emerald-500/30 bg-emerald-500/5' : isRejected ? 'border-rose-500/30 bg-rose-500/5' : 'border-amber-500/30 bg-amber-500/5'} relative`}>
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isApproved ? 'bg-emerald-500/20 text-emerald-400' : isRejected ? 'bg-rose-500/20 text-rose-400' : 'bg-amber-500/20 text-amber-400'}`}>
            {method.method_type === 'UPI' ? <Smartphone size={20} /> : <Building2 size={20} />}
          </div>
          <div>
            <h4 className="font-bold text-[var(--text-primary)] uppercase tracking-wider text-sm">{method.method_type}</h4>
            <p className="text-[var(--text-secondary)] text-sm font-mono mt-0.5">
              {method.method_type === 'UPI' ? method.account_details.upi_id : formatAccount(method.account_details.account_no)}
            </p>
          </div>
        </div>

        <div className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 ${isApproved ? 'bg-emerald-500/20 text-emerald-400' : isRejected ? 'bg-rose-500/20 text-rose-400' : 'bg-amber-500/20 text-amber-400'}`}>
          {isApproved && <CheckCircle2 size={12} />}
          {isPending && <Clock size={12} />}
          {isRejected && <XCircle size={12} />}
          {method.verification_status}
        </div>
      </div>

      {method.method_type === 'BANK' && (
        <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-[var(--text-secondary)]">
          <div><span className="opacity-60">Bank:</span> {method.account_details.bank_name}</div>
          <div><span className="opacity-60">IFSC:</span> {method.account_details.ifsc}</div>
          <div className="col-span-2"><span className="opacity-60">Name:</span> {method.account_details.holder_name}</div>
        </div>
      )}

      {isRejected && method.rejection_reason && (
        <div className="mt-4 p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-start gap-2">
          <AlertCircle size={16} className="text-rose-400 shrink-0 mt-0.5" />
          <p className="text-xs text-rose-200/80">{method.rejection_reason}</p>
        </div>
      )}

      {onDelete && isPending && (
        <button 
          onClick={onDelete}
          className="absolute top-4 right-4 text-[var(--text-tertiary)] hover:text-rose-400 transition-colors"
        >
          <Trash2 size={16} />
        </button>
      )}
    </div>
  );
}
