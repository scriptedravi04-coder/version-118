import React, { useState } from 'react';
import { safeUpper } from "../../utils/safeFormat";
import { api } from "../../lib/api";
import { toast } from "sonner";
import { Tag, CheckCircle2, XCircle, Loader2 } from "lucide-react";

export default function PromoCodeInput({ amount, role = 'brand', onCouponApplied, onCouponRemoved }) {
  const [code, setCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleApply = async (e) => {
    if (e) e.preventDefault();
    const cleanCode = code.trim().toUpperCase();
    if (!cleanCode) {
      toast.error("Please enter a promo code");
      return;
    }

    setLoading(true);
    setErrorMsg('');
    try {
      const { data } = await api.post('coupons/validate', {
        code: cleanCode,
        campaign_amount: Number(amount) || 0,
        role
      });

      if (data && data.valid) {
        setAppliedCoupon(data);
        toast.success(`Promo code "${data.code}" applied successfully!`);
        if (onCouponApplied) onCouponApplied(data);
      } else {
        throw new Error("Invalid promo code");
      }
    } catch (err) {
      const msg = err.response?.data?.error || err.message || "Failed to validate coupon";
      setErrorMsg(msg);
      toast.error(msg);
      setAppliedCoupon(null);
      if (onCouponRemoved) onCouponRemoved();
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = () => {
    setCode('');
    setAppliedCoupon(null);
    setErrorMsg('');
    if (onCouponRemoved) onCouponRemoved();
    toast.info("Promo code removed");
  };

  return (
    <div className="space-y-2">
      <label className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-1.5">
        <Tag size={14} className="text-indigo-400" />
        Have a Promo / Coupon Code?
      </label>

      {!appliedCoupon ? (
        <div className="space-y-1">
          <div className="flex gap-2">
            <input
              type="text"
              value={code}
              onChange={(e) => {
                setCode(safeUpper(e.target.value));
                if (errorMsg) setErrorMsg('');
              }}
              placeholder="e.g. WELCOME100, ZEROFEE, FLAT500"
              className="flex-1 bg-[var(--bg-elevated)] border border-[var(--border-default)] px-3 py-2 rounded-xl text-xs font-mono font-bold uppercase tracking-wider text-[var(--text-primary)] focus:outline-none focus:border-indigo-500"
            />
            <button
              type="button"
              onClick={handleApply}
              disabled={loading || !code.trim()}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white font-extrabold text-xs rounded-xl transition-all flex items-center gap-1 cursor-pointer"
            >
              {loading ? <Loader2 size={13} className="animate-spin" /> : "Apply"}
            </button>
          </div>
          {errorMsg && (
            <p className="text-[11px] font-semibold text-rose-400 flex items-center gap-1 mt-1">
              <XCircle size={12} /> {errorMsg}
            </p>
          )}
        </div>
      ) : (
        <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
            <div>
              <span className="font-mono font-black text-xs uppercase tracking-wider">{appliedCoupon.code}</span>
              <p className="text-[10px] text-emerald-300/80">
                {appliedCoupon.type === 'zero_fee' && '100% Platform Fee Waiver'}
                {(appliedCoupon.type === 'fee_rate_override' || appliedCoupon.type === 'override_fee_rate') && `${appliedCoupon.override_fee_rate ?? 0}% Special Platform Fee Rate`}
                {appliedCoupon.type === 'flat_discount' && `₹${appliedCoupon.discount_amount} Flat Discount`}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleRemove}
            className="text-xs font-bold text-rose-400 hover:text-rose-300 underline cursor-pointer"
          >
            Remove
          </button>
        </div>
      )}
    </div>
  );
}
