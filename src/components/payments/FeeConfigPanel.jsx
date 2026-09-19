import React, { useState, useEffect } from 'react';
import { formatAmount } from "../../utils/safeFormat";
import { Settings2, Save, AlertTriangle, RefreshCw, Clock, ArrowRight, CheckCircle2, X } from 'lucide-react';
import { api } from "../../lib/api";
import { toast } from 'sonner';

export default function FeeConfigPanel() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  
  // Original live configuration from DB
  const [originalConfig, setOriginalConfig] = useState({
    threshold_amount: 20000,
    below_threshold_rate: 15.0,
    above_threshold_rate: 5.0,
    gst_rate: 18.0,
    updated_at: new Date().toISOString()
  });

  // Current inputs in the form
  const [config, setConfig] = useState({
    threshold_amount: 20000,
    below_threshold_rate: 15.0,
    above_threshold_rate: 5.0,
    gst_rate: 18.0,
    updated_at: new Date().toISOString()
  });

  // Audit activity logs
  const [logs, setLogs] = useState([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  useEffect(() => {
    fetchConfig();
    fetchLogs();
  }, []);

  const fetchConfig = async () => {
    try {
      const { data } = await api.get('admin/fee-config');
      if (data) {
        setOriginalConfig(data);
        setConfig(data);
      }
    } catch (err) {
      console.error("Error loading fee config:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchLogs = async () => {
    setLoadingLogs(true);
    try {
      const { data } = await api.get('admin/logs/activity');
      if (data && Array.isArray(data)) {
        // Filter specifically for fee configuration actions
        const feeLogs = data.filter(log => log.action === 'edited_fees');
        setLogs(feeLogs);
      }
    } catch (err) {
      console.error("Error loading admin activity logs:", err);
    } finally {
      setLoadingLogs(false);
    }
  };

  const handleSaveClick = (e) => {
    e.preventDefault();
    // Validate rates
    if (config.below_threshold_rate < 0 || config.above_threshold_rate < 0 || config.gst_rate < 0 || config.threshold_amount <= 0) {
      toast.error("Please enter positive, valid fee parameters.");
      return;
    }
    setShowConfirm(true);
  };

  const confirmAndSave = async () => {
    setSaving(true);
    setShowConfirm(false);
    try {
      const { data: updated } = await api.put('admin/fee-config', config);
      if (updated) {
        setOriginalConfig(updated);
        setConfig(updated);
      }
      toast.success('Fee configuration updated and synced live. Platform fees adjusted successfully.');
      fetchLogs(); // Reload audit trail
    } catch (err) {
      toast.error(err?.response?.data?.error || err?.response?.data?.detail || err?.message || "Failed to update configuration");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="h-48 bg-[var(--bg-elevated)] animate-pulse rounded-2xl"></div>;

  return (
    <div className="space-y-8">
      <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-2xl p-6 md:p-8 relative">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center border border-purple-500/30">
              <Settings2 size={24} />
            </div>
            <div>
              <h2 className="text-xl font-extrabold text-[var(--text-primary)] tracking-tight">Platform Fee Configuration</h2>
              <p className="text-sm text-[var(--text-secondary)]">Dynamic threshold-based fee model affecting all live campaigns and payouts.</p>
            </div>
          </div>
          <button 
            type="button"
            onClick={() => { fetchConfig(); fetchLogs(); }}
            className="flex items-center gap-1.5 text-xs font-bold text-[var(--text-secondary)] hover:text-[var(--violet)] transition-colors border border-[var(--border-default)] rounded-lg px-3 py-1.5 bg-[var(--bg-elevated)]"
          >
            <RefreshCw size={12} /> Sync Live Data
          </button>
        </div>
        
        <form onSubmit={handleSaveClick} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="space-y-2">
              <label className="block text-xs font-bold text-[var(--text-tertiary)] uppercase tracking-wider">Threshold Limit (₹)</label>
              <input 
                type="number" 
                value={config.threshold_amount}
                onChange={(e) => setConfig({...config, threshold_amount: Number(e.target.value)})}
                className="w-full bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-xl px-4 py-3 text-[var(--text-primary)] focus:outline-none focus:border-[var(--violet)] font-mono tracking-wider text-base"
              />
              <span className="text-[10px] text-[var(--text-tertiary)] font-medium block">
                Gross deal value boundary (Currently ₹{formatAmount(originalConfig.threshold_amount)})
              </span>
            </div>
            
            <div className="space-y-2">
              <label className="block text-xs font-bold text-[var(--text-tertiary)] uppercase tracking-wider">Below Threshold Rate (%)</label>
              <input 
                type="number" step="0.1"
                value={config.below_threshold_rate}
                onChange={(e) => setConfig({...config, below_threshold_rate: Number(e.target.value)})}
                className="w-full bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-xl px-4 py-3 text-[var(--text-primary)] focus:outline-none focus:border-[var(--violet)] font-mono tracking-wider text-base"
              />
              <span className="text-[10px] text-[var(--text-tertiary)] font-medium block">
                Fee rate for smaller campaigns (Currently {originalConfig.below_threshold_rate}%)
              </span>
            </div>
            
            <div className="space-y-2">
              <label className="block text-xs font-bold text-[var(--text-tertiary)] uppercase tracking-wider">Above Threshold Rate (%)</label>
              <input 
                type="number" step="0.1"
                value={config.above_threshold_rate}
                onChange={(e) => setConfig({...config, above_threshold_rate: Number(e.target.value)})}
                className="w-full bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-xl px-4 py-3 text-[var(--text-primary)] focus:outline-none focus:border-[var(--violet)] font-mono tracking-wider text-base"
              />
              <span className="text-[10px] text-[var(--text-tertiary)] font-medium block">
                Fee rate for major enterprise collabs (Currently {originalConfig.above_threshold_rate}%)
              </span>
            </div>
            
            <div className="space-y-2">
              <label className="block text-xs font-bold text-[var(--text-tertiary)] uppercase tracking-wider">GST Rate on Fee (%)</label>
              <input 
                type="number" step="0.1"
                value={config.gst_rate}
                onChange={(e) => setConfig({...config, gst_rate: Number(e.target.value)})}
                className="w-full bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-xl px-4 py-3 text-[var(--text-primary)] focus:outline-none focus:border-[var(--violet)] font-mono tracking-wider text-base"
              />
              <span className="text-[10px] text-[var(--text-tertiary)] font-medium block">
                Government taxation rate (Currently {originalConfig.gst_rate}%)
              </span>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-[var(--border-default)] pt-6 mt-8">
            <div className="text-xs text-[var(--text-tertiary)] font-medium flex items-center gap-1.5">
              <Clock size={12} /> Last synchronized: {originalConfig.updated_at ? new Date(originalConfig.updated_at).toLocaleString() : 'Never'}
            </div>
            <button 
              type="submit"
              disabled={saving}
              className="w-full sm:w-auto bg-[var(--violet)] hover:bg-[var(--violet-hover)] text-white px-6 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors disabled:opacity-50 text-sm shadow-lg shadow-purple-500/10"
            >
              <Save size={18} />
              {saving ? 'Processing...' : 'Review & Save'}
            </button>
          </div>
        </form>

        {/* Modal: Side-by-side comparison and confirmation step */}
        {showConfirm && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[9999] p-4">
            <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-2xl max-w-2xl w-full p-6 md:p-8 space-y-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
              <div className="flex justify-between items-start gap-4">
                <div className="flex items-center gap-3 text-amber-400">
                  <AlertTriangle size={28} className="flex-shrink-0 animate-bounce" />
                  <div>
                    <h3 className="text-lg font-black text-[var(--text-primary)] uppercase tracking-wider">Confirm High-Impact Configuration Change</h3>
                    <p className="text-xs text-[var(--text-secondary)] mt-0.5">Please review the platform fee alterations below before submitting.</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowConfirm(false)}
                  className="text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors p-1"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Side-by-side Comparison Board */}
              <div className="bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-xl p-5 overflow-hidden">
                <div className="grid grid-cols-3 text-xs font-bold text-[var(--text-tertiary)] uppercase tracking-wider border-b border-[var(--border-default)] pb-2 mb-4">
                  <div>Parameter</div>
                  <div className="text-center">Current Value</div>
                  <div className="text-right">New Proposed Value</div>
                </div>
                
                <div className="space-y-4 text-sm font-mono">
                  <div className="grid grid-cols-3 items-center">
                    <span className="text-xs text-[var(--text-secondary)] font-sans font-semibold">Threshold (₹)</span>
                    <span className="text-center text-[var(--text-secondary)]">₹{formatAmount(originalConfig.threshold_amount)}</span>
                    <span className={`text-right font-bold ${config.threshold_amount !== originalConfig.threshold_amount ? 'text-amber-400' : 'text-[var(--text-primary)]'}`}>
                      ₹{formatAmount(config.threshold_amount)}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-3 items-center">
                    <span className="text-xs text-[var(--text-secondary)] font-sans font-semibold">Below Rate (%)</span>
                    <span className="text-center text-[var(--text-secondary)]">{originalConfig.below_threshold_rate}%</span>
                    <span className={`text-right font-bold ${config.below_threshold_rate !== originalConfig.below_threshold_rate ? (config.below_threshold_rate > originalConfig.below_threshold_rate ? 'text-rose-400' : 'text-green-400') : 'text-[var(--text-primary)]'}`}>
                      {config.below_threshold_rate}%
                    </span>
                  </div>

                  <div className="grid grid-cols-3 items-center">
                    <span className="text-xs text-[var(--text-secondary)] font-sans font-semibold">Above Rate (%)</span>
                    <span className="text-center text-[var(--text-secondary)]">{originalConfig.above_threshold_rate}%</span>
                    <span className={`text-right font-bold ${config.above_threshold_rate !== originalConfig.above_threshold_rate ? (config.above_threshold_rate > originalConfig.above_threshold_rate ? 'text-rose-400' : 'text-green-400') : 'text-[var(--text-primary)]'}`}>
                      {config.above_threshold_rate}%
                    </span>
                  </div>

                  <div className="grid grid-cols-3 items-center">
                    <span className="text-xs text-[var(--text-secondary)] font-sans font-semibold">GST Rate (%)</span>
                    <span className="text-center text-[var(--text-secondary)]">{originalConfig.gst_rate}%</span>
                    <span className={`text-right font-bold ${config.gst_rate !== originalConfig.gst_rate ? 'text-amber-400' : 'text-[var(--text-primary)]'}`}>
                      {config.gst_rate}%
                    </span>
                  </div>
                </div>
              </div>

              {/* Warning Notice Block */}
              <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex gap-3 text-xs text-red-200">
                <AlertTriangle size={18} className="flex-shrink-0 mt-0.5" />
                <div>
                  <strong className="block uppercase tracking-wider mb-1 font-bold">Implications Warning</strong>
                  Saving these parameters will instantly alter platform commission rates, GST calculations, and creator payout structures on all future escrow agreements. Active running deals are not retrospective.
                </div>
              </div>

              <div className="flex gap-3 justify-end pt-2">
                <button 
                  onClick={() => setShowConfirm(false)}
                  className="bg-[var(--bg-elevated)] hover:bg-foreground/5 border border-[var(--border-default)] text-[var(--text-secondary)] font-bold px-5 py-3 rounded-xl text-sm transition-colors"
                >
                  Cancel & Revise
                </button>
                <button 
                  onClick={confirmAndSave}
                  className="bg-[var(--violet)] hover:bg-[var(--violet-hover)] text-white font-bold px-6 py-3 rounded-xl text-sm transition-colors shadow-lg shadow-purple-500/20"
                >
                  Verify & Apply Changes
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Change History Timeline */}
      <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-2xl p-6 md:p-8">
        <div className="flex items-center gap-2 mb-6">
          <Clock size={20} className="text-purple-400" />
          <h3 className="font-extrabold text-base uppercase tracking-wider text-[var(--text-primary)]">Audit Logs & Change History</h3>
        </div>
        
        {loadingLogs ? (
          <div className="py-8 text-center text-xs text-[var(--text-tertiary)] font-medium">Loading audit trail...</div>
        ) : logs.length === 0 ? (
          <div className="py-8 text-center text-xs text-[var(--text-tertiary)] font-medium border border-dashed border-[var(--border-default)] rounded-xl bg-[var(--bg-elevated)]">
            No dynamic fee modifications logged yet.
          </div>
        ) : (
          <div className="flow-root">
            <ul className="-mb-8">
              {logs.map((log, logIdx) => {
                const before = log.detail?.before || {};
                const after = log.detail?.after || {};
                
                return (
                  <li key={log.id || logIdx}>
                    <div className="relative pb-8">
                      {logIdx !== logs.length - 1 ? (
                        <span className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-[var(--border-default)]" aria-hidden="true" />
                      ) : null}
                      <div className="relative flex space-x-3">
                        <div>
                          <span className="h-8 w-8 rounded-full bg-purple-500/10 text-purple-400 flex items-center justify-center border border-purple-500/20">
                            <CheckCircle2 size={16} />
                          </span>
                        </div>
                        <div className="flex-1 min-w-0 pt-1.5">
                          <p className="text-xs font-semibold text-[var(--text-secondary)]">
                            <span className="font-bold text-[var(--text-primary)]">{log.email || 'Admin'}</span> updated platform fee threshold and commission parameters
                          </p>
                          <div className="mt-2 text-xs text-[var(--text-tertiary)] font-mono bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-lg p-3 space-y-1">
                            <div>
                              <span className="text-[var(--text-secondary)] font-sans font-bold">New Config:</span> Threshold ₹{(after.threshold_amount || 0).toLocaleString()} | Below {after.below_threshold_rate}% | Above {after.above_threshold_rate}% | GST {after.gst_rate}%
                            </div>
                            {before.threshold_amount && (
                              <div className="opacity-65 text-[10px]">
                                <span className="text-[var(--text-secondary)] font-sans">Prior state:</span> Threshold ₹{formatAmount(before.threshold_amount)} | Below {before.below_threshold_rate}% | Above {before.above_threshold_rate}% | GST {before.gst_rate}%
                              </div>
                            )}
                          </div>
                          <div className="text-[10px] text-[var(--text-tertiary)] mt-2 font-medium flex items-center gap-1">
                            <Clock size={10} /> {new Date(log.created_at).toLocaleString()}
                          </div>
                        </div>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
