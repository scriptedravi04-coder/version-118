import React, { useState } from "react";
import { api } from "../../lib/api";
import { toast } from "sonner";
import { downloadCampaignPDFReport, downloadAnalyticsPDFReport } from "../../utils/analyticsPdfReport";
import { FileText, Loader2 } from "lucide-react";

/**
 * Single-click presentation-ready PDF report export button
 * tailored specifically for Campaign Briefs & Manager / Client presentations.
 */
export default function ExportAnalyticsPdfButton({ 
  campaign = null,
  applicants = [],
  aiRoi = null,
  brandName = "", 
  userRole = "brand", 
  variant = "secondary", 
  size = "sm",
  buttonText = "Export PDF Report"
}) {
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    setExporting(true);
    try {
      // Log report creation in backend if available
      api.post("/analytics/pdf-report", {
        entity_name: brandName || campaign?.brand_name,
        entity_type: userRole,
        campaign_id: campaign?.campaign_id || campaign?.id
      }).catch(err => console.warn("Backend report log skipped:", err));

      if (campaign) {
        downloadCampaignPDFReport({
          campaign,
          applicants,
          brandName,
          userRole,
          aiRoi
        });
      } else {
        downloadAnalyticsPDFReport({
          brand_name: brandName || "Client Partner",
          user_role: userRole
        });
      }

      toast.success("Campaign PDF Report exported successfully!", {
        description: "Your report is saved and ready to share with your manager or client."
      });
    } catch (error) {
      console.error("Failed to export campaign PDF:", error);
      toast.error("Could not export PDF report. Please try again.");
    } finally {
      setExporting(false);
    }
  };

  const sizeClasses = {
    sm: "px-3.5 py-2 text-xs gap-1.5 rounded-xl font-bold",
    md: "px-4 py-2.5 text-xs sm:text-sm gap-2 rounded-xl font-bold",
    lg: "px-5 py-3 text-sm gap-2.5 rounded-xl font-bold"
  };

  const variantClasses = {
    primary: "bg-gradient-to-r from-[var(--violet)] to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white shadow-lg shadow-[var(--violet)]/20 active:scale-95 transition-all cursor-pointer border border-white/10",
    secondary: "bg-[var(--bg-elevated)] hover:bg-[var(--bg-card)] text-[var(--text-primary)] border border-[var(--border-default)] shadow-sm active:scale-95 transition-all cursor-pointer font-bold",
    outline: "border border-[var(--violet)] text-[var(--violet)] hover:bg-[var(--violet)]/10 active:scale-95 transition-all cursor-pointer font-bold",
    box: "bg-[var(--bg-card)] hover:bg-[var(--bg-elevated)] text-[var(--text-primary)] border border-[var(--border-default)] hover:border-[var(--violet)]/50 active:scale-95 transition-all cursor-pointer shadow-sm w-full h-full text-left justify-start"
  };

  if (variant === "box") {
    return (
      <button
        onClick={handleExport}
        disabled={exporting}
        title="Generate Client / Manager Presentation PDF Report"
        className={`flex items-center gap-3 px-4 py-2.5 rounded-2xl ${variantClasses.box} disabled:opacity-50 disabled:cursor-not-allowed`}
      >
        <div className="flex items-center justify-center shrink-0">
          {exporting ? <Loader2 size={18} className="animate-spin text-[var(--violet)]" /> : <FileText size={18} className="text-[var(--violet)]" />}
        </div>
        <div className="flex flex-col text-left font-sans">
          <div className="text-[10px] text-[var(--text-tertiary)] uppercase font-semibold">Report</div>
          <div className="text-sm font-bold text-[var(--text-primary)] mt-0.5">{exporting ? "Generating..." : buttonText}</div>
        </div>
      </button>
    );
  }

  return (
    <button
      onClick={handleExport}
      disabled={exporting}
      title="Generate Client / Manager Presentation PDF Report"
      className={`inline-flex items-center justify-center shrink-0 ${sizeClasses[size] || sizeClasses.sm} ${variantClasses[variant] || variantClasses.secondary} disabled:opacity-50 disabled:cursor-not-allowed`}
    >
      {exporting ? (
        <>
          <Loader2 size={15} className="animate-spin text-current" />
          <span>Generating PDF...</span>
        </>
      ) : (
        <>
          <FileText size={15} className="shrink-0 text-[var(--violet)]" />
          <span>{buttonText}</span>
        </>
      )}
    </button>
  );
}
