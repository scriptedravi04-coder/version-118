import React, { useEffect, useState } from "react";
import { formatAmount } from "../../utils/safeFormat";
import { api } from "../../lib/api";
import { useLoading } from "../../contexts/LoadingContext";
import { Wallet, Download, Activity } from "lucide-react";
import { toast } from "sonner";
import InvoiceModal from "../../components/payments/InvoiceModal";
import { useAuth } from "../../contexts/AuthContext";

export default function CreatorUGCEarnings() {
  const [earnings, setEarnings] = useState([]);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const { user } = useAuth();
  const { startLoading, stopLoading } = useLoading();

  useEffect(() => {
    startLoading();
    api.get("ugc/earnings").then(res => {
      setEarnings(res.data);
    }).catch((err) => {
      console.error(err);
      toast.error("Failed to load your earnings. Please try again.");
    }).finally(() => stopLoading());
  }, []);

  const handleDownloadCSV = () => {
    if (!earnings.length) {
      toast.error("No earnings data to download.");
      return;
    }
    const headers = ["Brief Title,Completed Date,Payout"];
    const rows = earnings.map(o => {
      const title = `"${(o.brief?.title || "UGC Order").replace(/"/g, '""')}"`;
      const date = `"${new Date(o.approved_at || o.created_at).toLocaleDateString()}"`;
      const payout = o.creator_payout || 0;
      return `${title},${date},${payout}`;
    });
    const csvContent = headers.concat(rows).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "creator_ugc_earnings.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const total = earnings.reduce((acc, o) => acc + o.creator_payout, 0);

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-black text-[var(--text-primary)] mb-2">UGC Earnings</h1>
          <p className="text-[var(--text-tertiary)] font-medium">Track your fast payouts from 22-hour turnaround orders.</p>
        </div>
        <button onClick={handleDownloadCSV} className="bg-[var(--bg-elevated)] hover:bg-[var(--bg-elevated)] text-[var(--text-primary)] border border-[var(--border-default)] font-bold px-4 py-2 rounded-xl text-sm flex items-center gap-2 transition-colors cursor-pointer">
          <Download size={16} /> Download CSV
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        <div className="bg-[var(--bg-card)] border border-[var(--border-default)] p-6 rounded-3xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl" />
          <Wallet className="text-emerald-400 mb-4" size={28}/>
          <span className="text-xs text-[var(--text-tertiary)] font-bold uppercase tracking-widest block mb-2">Total UGC Earnings</span>
          <span className="text-5xl font-black num-black text-[var(--text-primary)]">₹{total.toLocaleString()}</span>
        </div>
        <div className="bg-[var(--bg-card)] border border-[var(--border-default)] p-6 rounded-3xl relative overflow-hidden flex flex-col justify-center">
          <Activity className="text-[var(--violet)] mb-4" size={28}/>
          <span className="text-xs text-[var(--text-tertiary)] font-bold uppercase tracking-widest block mb-2">Completed Orders</span>
          <span className="text-5xl font-black num-black text-[var(--text-primary)]">{earnings.length}</span>
        </div>
      </div>
      <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-3xl overflow-hidden mt-8">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-[var(--text-secondary)]">
            <thead className="bg-[var(--bg-elevated)] text-[10px] uppercase font-bold text-[var(--text-tertiary)] tracking-wider">
              <tr>
                <th className="px-6 py-4">Brief</th>
                <th className="px-6 py-4">Completed Date</th>
                <th className="px-6 py-4">Payout</th>
                <th className="px-6 py-4">Invoice</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {earnings.length === 0 ? (
                <tr>
                  <td colSpan="4" className="px-6 py-10 text-center text-[var(--text-secondary)]">No earnings yet. Start claiming briefs!</td>
                </tr>
              ) : earnings?.map((o) => {
                 const txData = {
                   ...o,
                   id: o.id || `txn-${o.brief_id}`,
                   amount: o.creator_payout,
                   created_at: o.approved_at || o.created_at,
                   brand_name: o.brief?.brand_name || "Brand",
                   payout_status: 'PAID'
                 };
                 return (
                <tr key={o.id} className="hover:bg-[var(--bg-elevated)] transition-colors">
                  <td className="px-6 py-5 font-bold text-[var(--text-primary)] max-w-[200px] truncate">{o.brief?.title || "UGC Order"}</td>
                  <td className="px-6 py-5">{new Date(o.approved_at || o.created_at).toLocaleDateString()}</td>
                  <td className="px-6 py-5 font-black num-black text-[#027A48]">₹{formatAmount(o.creator_payout)}</td>
                  <td className="px-6 py-5">
                    <button onClick={() => setSelectedInvoice(txData)} className="text-[var(--violet)] hover:text-[var(--text-primary)] transition-colors font-bold text-xs uppercase tracking-widest border border-[var(--violet)]/20 px-3 py-1 rounded-md bg-[var(--violet)]/10 cursor-pointer">View</button>
                  </td>
                </tr>
              )})}
            </tbody>
          </table>
        </div>
      </div>
      
      {selectedInvoice && (
        <InvoiceModal
          transaction={selectedInvoice}
          isBrand={false}
          creatorName={user?.name || "Creator Pro"}
          brandName={selectedInvoice.brand_name || "Brand"}
          onClose={() => setSelectedInvoice(null)}
        />
      )}
    </div>
  );
}
