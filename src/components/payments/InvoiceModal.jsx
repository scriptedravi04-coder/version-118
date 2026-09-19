import React, { useEffect } from 'react';
import { t } from "@/lib/typography";
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { Download } from 'lucide-react';
import { downloadInvoicePDF } from '../../utils/invoicePdf';

export default function InvoiceModal({ transaction, isBrand, creatorName, brandName, onClose }) {
  if (!transaction) return null;

  const amount = Number(transaction.gross_amount ?? transaction.amount ?? 0);
  const platformFee = Number(
    transaction.platform_fee_amount !== undefined && transaction.platform_fee_amount !== null && Number(transaction.platform_fee_amount) > 0
      ? transaction.platform_fee_amount
      : (transaction.gross_amount && transaction.creator_net_amount && Number(transaction.gross_amount) > Number(transaction.creator_net_amount)
          ? Math.round((Number(transaction.gross_amount) - Number(transaction.creator_net_amount)) * 100) / 100
          : Math.round(((amount * 15) / 100) * 100) / 100)
  );
  const feePercentage = transaction.platform_fee_percent !== undefined && transaction.platform_fee_percent !== null && Number(transaction.platform_fee_percent) > 0
    ? Number(transaction.platform_fee_percent)
    : (amount > 0 && platformFee > 0 ? Math.round((platformFee / amount) * 100) : 15);
  const netAmount = Number(
    transaction.creator_net_amount !== undefined && transaction.creator_net_amount !== null && Number(transaction.creator_net_amount) > 0
      ? transaction.creator_net_amount
      : Math.round((amount - platformFee) * 100) / 100
  );

  const formatMoney = (n) => {
    const num = Number(n) || 0;
    return num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const campaignName = transaction.campaign_title || (transaction.deals && transaction.deals.campaigns ? transaction.deals.campaigns.title : "Campaign Partnership");
  const receiptId = (transaction.id || "direct").toString().toUpperCase().replace('TXN_', '');
  
  const txDate = transaction.payout_completed_at || transaction.payout_released_at || transaction.updated_at || transaction.created_at;
  const dateStr = txDate 
    ? new Date(txDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
    : new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

  const payer = brandName || "Brand Partner";
  const payee = creatorName || "Content Creator";

  const handleDownload = () => {
    downloadInvoicePDF(transaction, isBrand, payee);
  };

  return createPortal(
    <div className="fixed inset-0 z-[99999] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        transition={{ type: "spring", duration: 0.4, bounce: 0 }}
        className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden relative font-sans"
      >
        <div className="p-6 sm:p-8 relative">
          <div className="absolute top-0 right-0 w-32 h-32 bg-[#9D7CFF]/5 rounded-bl-[100px] -z-10" />
          
          {/* Header */}
          <div className="flex justify-between items-start mb-8">
            <div>
              <div className="flex items-center gap-2.5 mb-1.5">
                <span className="font-display font-extrabold text-2xl text-slate-900 tracking-tight">Ybex</span>
                <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-[#9D7CFF]/10 text-[#9D7CFF] border border-[#9D7CFF]/30 uppercase tracking-wider">
                  {isBrand ? "PAYMENT RECEIPT" : "TRANSFER RECEIPT"}
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">Ybex Media Technologies Pvt Ltd</p>
              <p className="text-xs text-slate-500 mt-0.5">
                Official Transaction Statement
              </p>
            </div>
            <div className="text-right">
              <div className="text-[10px] text-slate-400 uppercase font-semibold tracking-wider">RECEIPT NO</div>
              <div className="font-mono text-sm font-bold text-[#9D7CFF]">
                {receiptId.slice(0, 10)}...
              </div>
              <div className="text-xs text-slate-500 mt-1">
                Date: {dateStr}
              </div>
            </div>
          </div>

          {/* Billed To / Beneficiary */}
          <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl text-xs border border-slate-200">
            <div>
              <div className="font-semibold text-slate-400 uppercase tracking-wider text-[10px] mb-1">PAYER (BRAND)</div>
              <div className="font-bold text-sm text-slate-900">{payer}</div>
              <div className="text-slate-500 mt-1 font-mono text-[11px]">
                Platform Escrow Account
              </div>
            </div>
            <div>
              <div className="font-semibold text-slate-400 uppercase tracking-wider text-[10px] mb-1">PAYEE (CREATOR)</div>
              <div className="font-bold text-sm text-slate-900">{payee}</div>
              <div className="text-slate-500 mt-1 font-mono text-[11px]">
                Transaction ID: {receiptId.slice(0, 8)}...
              </div>
            </div>
          </div>

          {/* Transaction Summary Table */}
          <div className="border border-slate-200 rounded-xl overflow-hidden mt-6">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-semibold text-[10px]">
                  <th className="p-3">ITEM DESCRIPTION</th>
                  <th className="p-3 text-right">AMOUNT</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 font-mono text-slate-800">
                <tr>
                  <td className="p-3 font-sans">
                    <div className="font-semibold text-slate-900">
                      {campaignName}
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      UGC Content Deliverables & Production Rate
                    </div>
                  </td>
                  <td className="p-3 text-right">₹{amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                </tr>
                <tr>
                  <td className="p-3 font-sans">
                    <div className="font-semibold text-slate-900">
                      Ybex Protection & Escrow Insurance
                    </div>
                  </td>
                  <td className="p-3 text-right text-emerald-600 font-bold">Included (100% Secured)</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2 text-xs mt-6">
            <div className="flex justify-between">
              <span className="text-slate-500 font-medium">Total Paid (Gross):</span>
              <span className="font-mono font-semibold text-slate-900">₹{formatMoney(amount)}</span>
            </div>
            {isBrand ? (
              <>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Escrow Protection & Coverage:</span>
                  <span className="font-semibold text-emerald-600">Included (100% Secured)</span>
                </div>
                <div className="flex justify-between pt-2.5 border-t border-slate-200 text-sm font-extrabold">
                  <span className="text-slate-900">Total Billed Amount:</span>
                  <span className="font-mono text-slate-900">₹{formatMoney(amount)}</span>
                </div>
              </>
            ) : (
              <>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Ybex Platform Fee ({feePercentage}%):</span>
                  <span className="font-mono font-semibold text-rose-500">-₹{formatMoney(platformFee)}</span>
                </div>
                <div className="flex justify-between pt-2.5 border-t border-slate-200 text-sm font-extrabold">
                  <span className="text-slate-900">Net Disbursable Creator Payout:</span>
                  <span className="font-mono text-[#027A48]">₹{formatMoney(netAmount)}</span>
                </div>
              </>
            )}
          </div>

          <div className="text-[11px] text-slate-400 text-center pt-4 italic">
            This is a computer-generated transaction receipt issued by Ybex Media.
          </div>
        </div>

        <div className="no-print flex items-center justify-end gap-3 p-4 bg-slate-50 border-t border-slate-200">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-all"
          >
            Close
          </button>
          <button
            type="button"
            onClick={handleDownload}
            className="px-5 py-2.5 bg-[#9D7CFF] hover:bg-[#8B6CEB] text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-sm transition-all"
          >
            <Download size={14} /> Print / Save PDF
          </button>
        </div>
      </motion.div>
    </div>,
    document.body
  );
}
