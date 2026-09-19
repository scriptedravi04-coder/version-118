import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Building2, Smartphone, AlertCircle, CheckCircle2 } from 'lucide-react';
import { api } from "../../lib/api";
import { toast } from 'sonner';

export default function AddPaymentMethod({ onAdded, onCancel }) {
  const [methodType, setMethodType] = useState('UPI');
  const [loading, setLoading] = useState(false);
  
  // States
  const [upiId, setUpiId] = useState('');
  const [bankDetails, setBankDetails] = useState({
    account_no: '',
    ifsc: '',
    holder_name: '',
    bank_name: ''
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const details = methodType === 'UPI' ? { upi_id: upiId } : bankDetails;
      await api.post('creator/payment-methods', {
        method_type: methodType,
        account_details: details
      });
      toast.success('Payment method added and pending approval.');
      if (onAdded) onAdded();
    } catch (err) {
      toast.error(err.message || 'Failed to add payment method');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-2xl p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold text-[var(--text-primary)]">Add Payment Method</h3>
        {onCancel && (
          <button onClick={onCancel} className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-sm">Cancel</button>
        )}
      </div>

      <div className="flex items-center gap-2 mb-6 p-1 bg-[var(--bg-elevated)] rounded-xl">
        <button
          onClick={() => setMethodType('UPI')}
          className={`flex-1 py-2.5 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 transition-all ${methodType === 'UPI' ? 'bg-[var(--violet)] text-[var(--text-primary)] shadow-lg' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]'}`}
        >
          <Smartphone size={16} /> UPI
        </button>
        <button
          onClick={() => setMethodType('BANK')}
          className={`flex-1 py-2.5 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 transition-all ${methodType === 'BANK' ? 'bg-[var(--violet)] text-[var(--text-primary)] shadow-lg' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]'}`}
        >
          <Building2 size={16} /> Bank Account
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <AnimatePresence mode="wait">
          {methodType === 'UPI' ? (
            <motion.div
              key="upi"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4"
            >
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">UPI ID</label>
                <input
                  type="text"
                  required
                  placeholder="name@upi"
                  value={upiId}
                  onChange={(e) => setUpiId(e.target.value)}
                  className="w-full bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-xl px-4 py-3 text-[var(--text-primary)] focus:outline-none focus:border-[var(--violet)]"
                />
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="bank"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4"
            >
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Account Number</label>
                <input
                  type="text"
                  required
                  value={bankDetails.account_no}
                  onChange={(e) => setBankDetails({...bankDetails, account_no: e.target.value})}
                  className="w-full bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-xl px-4 py-3 text-[var(--text-primary)] focus:outline-none focus:border-[var(--violet)]"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">IFSC Code</label>
                  <input
                    type="text"
                    required
                    value={bankDetails.ifsc}
                    onChange={(e) => setBankDetails({...bankDetails, ifsc: e.target.value})}
                    className="w-full bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-xl px-4 py-3 text-[var(--text-primary)] focus:outline-none focus:border-[var(--violet)]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Bank Name</label>
                  <input
                    type="text"
                    required
                    value={bankDetails.bank_name}
                    onChange={(e) => setBankDetails({...bankDetails, bank_name: e.target.value})}
                    className="w-full bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-xl px-4 py-3 text-[var(--text-primary)] focus:outline-none focus:border-[var(--violet)]"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Account Holder Name</label>
                <input
                  type="text"
                  required
                  value={bankDetails.holder_name}
                  onChange={(e) => setBankDetails({...bankDetails, holder_name: e.target.value})}
                  className="w-full bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-xl px-4 py-3 text-[var(--text-primary)] focus:outline-none focus:border-[var(--violet)]"
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 mt-6">
          <div className="flex items-start gap-3">
            <AlertCircle size={20} className="text-amber-500 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-200/80 leading-relaxed">
              New payment methods require admin verification to prevent fraud. This usually takes 24 hours. You won't be able to receive payouts until approved.
            </p>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-[var(--violet)] hover:bg-[var(--violet-hover)] text-[var(--text-primary)] font-bold py-3.5 rounded-xl transition-colors mt-4 flex items-center justify-center gap-2"
        >
          {loading ? 'Submitting...' : 'Submit for Verification'} 
        </button>
      </form>
    </div>
  );
}
