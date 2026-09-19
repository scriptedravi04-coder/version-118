import { jsPDF } from "jspdf";

/**
 * Generates and downloads a presentation-ready single campaign PDF report for managers and client brands.
 * 
 * @param {Object} options Options containing campaign, applicants, brandName, userRole, aiRoi
 */
export const downloadCampaignPDFReport = ({ campaign, applicants = [], brandName = "", userRole = "brand", aiRoi = null }) => {
  if (!campaign) return;

  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4"
  });

  const entityName = brandName || campaign.brand_name || campaign.company_name || "Client Partner";
  const campaignTitle = campaign.title || campaign.campaign_title || "Campaign Brief";
  const campaignId = (campaign.campaign_id || campaign.id || `CMP-${Math.random().toString(36).substring(2, 8)}`).toString().toUpperCase();
  const dateStr = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase();

  const minBudget = Number(campaign.budget_min || campaign.budget || 0);
  const maxBudget = Number(campaign.budget_max || campaign.budget || minBudget);
  const budgetDisplay = maxBudget > minBudget && minBudget > 0
    ? `INR ${minBudget.toLocaleString('en-IN')} - INR ${maxBudget.toLocaleString('en-IN')}`
    : `INR ${(maxBudget || minBudget || 10000).toLocaleString('en-IN')}`;

  const statusText = (campaign.status || "ACTIVE").toUpperCase().replace("_", " ");
  const nicheText = campaign.niche || campaign.category || campaign.type || "Influencer UGC";
  const platformText = Array.isArray(campaign.platforms) ? campaign.platforms.join(", ") : (campaign.platform || "Instagram, YouTube");

  // Est reach calculation
  const budgetVal = maxBudget || minBudget || 15000;
  const estReach = aiRoi?.estimatedReach ? aiRoi.estimatedReach : Math.round(budgetVal * 12);
  const estEngagement = aiRoi?.estimatedEngagement ? aiRoi.estimatedEngagement : Math.round(estReach * 0.052);
  const roiMult = aiRoi?.roiMultiplier ? `${aiRoi.roiMultiplier}x` : "3.2x";

  // Render Header
  const renderHeader = () => {
    doc.setFillColor(124, 58, 237); // Ybex Violet #7C3AED
    doc.rect(0, 0, 210, 18, "F");

    doc.setFillColor(99, 102, 241); // Indigo
    doc.rect(0, 18, 210, 2, "F");

    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10.5);
    doc.text("YBEX MEDIA • CAMPAIGN BRIEF & PERFORMANCE REPORT", 12, 12);

    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text(`CLIENT / AGENCY: ${entityName.toUpperCase()}`, 135, 12);
  };

  const renderFooter = (pageNum = 1) => {
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.4);
    doc.line(12, 282, 198, 282);

    doc.setTextColor(148, 163, 184);
    doc.setFontSize(7.5);
    doc.setFont("helvetica", "normal");
    doc.text(`Campaign ID: ${campaignId} • Generated via Ybex Campaign Manager`, 12, 287);
    doc.text(`Page ${pageNum} • Manager & Client Presentation Document`, 138, 287);
  };

  renderHeader();

  // --- Campaign Title & Overview Header Box ---
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.3);
  doc.rect(12, 26, 186, 36, "FD");

  doc.setTextColor(124, 58, 237);
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.text(`CAMPAIGN DOSSIER • REF: ${campaignId}`, 18, 33);

  doc.setTextColor(15, 23, 42);
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  const displayTitle = campaignTitle.length > 40 ? campaignTitle.substring(0, 38) + "..." : campaignTitle;
  doc.text(displayTitle, 18, 41);

  doc.setTextColor(71, 85, 105);
  doc.setFontSize(8.5);
  doc.setFont("helvetica", "normal");
  doc.text(`Brand / Agency: ${entityName} (${userRole.toUpperCase()})   |   Status: ${statusText}`, 18, 48);

  doc.setTextColor(100, 116, 139);
  doc.setFontSize(8);
  doc.text(`Category: ${nicheText}   |   Platforms: ${platformText}   |   Generated: ${dateStr}`, 18, 54);

  // --- KPI Summary Grid (4 Cards) ---
  let currentY = 68;

  doc.setTextColor(15, 23, 42);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("CAMPAIGN FINANCIALS & ESTIMATED METRICS", 12, currentY);

  doc.setFillColor(124, 58, 237);
  doc.rect(12, currentY + 2, 20, 1.2, "F");

  currentY += 8;

  const cardW = 43.5;
  const cardH = 22;
  const startX = 12;
  const gapX = 4;

  const kpis = [
    { label: "ALLOCATED BUDGET", val: budgetDisplay, desc: "Locked Escrow Pool", color: [124, 58, 237] },
    { label: "APPLICANTS POOL", val: `${applicants.length} Creators`, desc: "Pitches Submitted", color: [236, 72, 153] },
    { label: "ESTIMATED REACH", val: `${(estReach / 1000).toFixed(0)}K+`, desc: "Audience Impressions", color: [16, 185, 129] },
    { label: "PREDICTED ROI", val: roiMult, desc: "Return on Media Spend", color: [99, 102, 241] }
  ];

  kpis.forEach((kpi, idx) => {
    const x = startX + idx * (cardW + gapX);

    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.3);
    doc.rect(x, currentY, cardW, cardH, "FD");

    doc.setFillColor(kpi.color[0], kpi.color[1], kpi.color[2]);
    doc.rect(x, currentY, 2, cardH, "F");

    doc.setTextColor(100, 116, 139);
    doc.setFontSize(6);
    doc.setFont("helvetica", "bold");
    doc.text(kpi.label, x + 4, currentY + 5.5);

    doc.setTextColor(15, 23, 42);
    doc.setFontSize(9.5);
    doc.setFont("helvetica", "bold");
    const valStr = kpi.val.length > 18 ? kpi.val.substring(0, 16) + ".." : kpi.val;
    doc.text(valStr, x + 4, currentY + 12.5);

    doc.setTextColor(148, 163, 184);
    doc.setFontSize(5.5);
    doc.setFont("helvetica", "normal");
    doc.text(kpi.desc, x + 4, currentY + 17.5);
  });

  currentY += cardH + 8;

  // --- Campaign Brief Requirements Box ---
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("CAMPAIGN BRIEF & EXECUTION SCOPE", 12, currentY);

  doc.setFillColor(124, 58, 237);
  doc.rect(12, currentY + 2, 20, 1.2, "F");

  currentY += 7;

  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.rect(12, currentY, 186, 22, "FD");

  doc.setTextColor(51, 65, 85);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  
  const descText = campaign.description || campaign.deliverables_info || campaign.requirements || "High-quality video UGC content creation with authentic product positioning and audience call to action.";
  const splitDesc = doc.splitTextToSize(descText, 178);
  doc.text(splitDesc.slice(0, 3), 16, currentY + 6);

  currentY += 28;

  // --- Creator Applicants & Pitch Table ---
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("CREATOR PERFORMANCE & ROI ANALYSIS", 12, currentY);

  doc.setFillColor(124, 58, 237);
  doc.rect(12, currentY + 2, 20, 1.2, "F");

  currentY += 7;

  // Table Header
  doc.setFillColor(124, 58, 237);
  doc.rect(12, currentY, 186, 7.5, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "bold");
  doc.text("CREATOR NAME", 16, currentY + 5);
  doc.text("PROMISED (AGREEMENT)", 60, currentY + 5);
  doc.text("DELIVERED", 110, currentY + 5);
  doc.text("EST. REACH", 145, currentY + 5);
  doc.text("ROI", 175, currentY + 5);

  currentY += 7.5;

  if (applicants.length === 0) {
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(241, 245, 249);
    doc.rect(12, currentY, 186, 12, "FD");

    doc.setTextColor(148, 163, 184);
    doc.setFontSize(8);
    doc.setFont("helvetica", "italic");
    doc.text("No creator agreements recorded yet for this active campaign briefing.", 16, currentY + 7.5);
    currentY += 12;
  } else {
    applicants.slice(0, 8).forEach((app, idx) => {
      const bgFill = idx % 2 === 0 ? [255, 255, 255] : [248, 250, 252];
      doc.setFillColor(bgFill[0], bgFill[1], bgFill[2]);
      doc.setDrawColor(241, 245, 249);
      doc.rect(12, currentY, 186, 9.5, "FD");

      // Creator name
      doc.setTextColor(15, 23, 42);
      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      const nameStr = app.full_name || app.name || `Creator #${idx + 1}`;
      doc.text(nameStr.length > 22 ? nameStr.substring(0, 20) + ".." : nameStr, 16, currentY + 6);

      // Promised (Agreement)
      doc.setTextColor(71, 85, 105);
      doc.setFont("helvetica", "normal");
      const rawPromised = app.promised_deliverables || app.deliverables || app.pitch_text || campaign.deliverables_info || "Standard Scope";
      const promisedStr = rawPromised.length > 25 ? rawPromised.substring(0, 23) + ".." : rawPromised;
      doc.text(promisedStr, 60, currentY + 6);

      // Delivered
      doc.setTextColor(15, 23, 42);
      doc.setFont("helvetica", "bold");
      const rawDelivered = app.delivered_assets || app.delivered || (app.status === 'completed' ? rawPromised : "Pending Delivery");
      const deliveredStr = rawDelivered.length > 25 ? rawDelivered.substring(0, 23) + ".." : rawDelivered;
      doc.text(deliveredStr, 110, currentY + 6);

      // Est Reach
      doc.setTextColor(100, 116, 139);
      doc.setFontSize(7);
      doc.setFont("helvetica", "normal");
      const rawFollowers = app.followers_count ?? app.follower_count ?? app.followers ?? app.followers_instagram ?? app.ig_followers ?? 15000;
      let reachNum = 15000;
      if (typeof rawFollowers === 'number') {
        reachNum = rawFollowers;
      } else if (rawFollowers) {
        let str = String(rawFollowers).toUpperCase().trim();
        let num = parseFloat(str.replace(/[^0-9.]/g, ''));
        if (!isNaN(num) && num > 0) {
          if (str.includes('M')) num *= 1000000;
          else if (str.includes('K')) num *= 1000;
          reachNum = num;
        }
      }
      const estReachStr = app.est_reach || `${reachNum >= 1000 ? (reachNum/1000).toFixed(1) + 'k' : reachNum} Reach`;
      doc.text(estReachStr, 145, currentY + 6);

      // ROI pill
      const proposedAmt = app.proposed_amount || 10000;
      const calcRoi = ((reachNum * 0.05) / (proposedAmt * 0.1)).toFixed(1);
      const roiVal = app.roi || `${Math.max(1.2, Math.min(8.5, parseFloat(calcRoi)))}x`;
      
      doc.setFillColor(16, 185, 129);
      doc.rect(173, currentY + 2.5, 20, 4.5, "F");
      
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(6);
      doc.setFont("helvetica", "bold");
      doc.text(roiVal, 175, currentY + 5.8);

      currentY += 9.5;
    });
  }

  // --- Executive Footer Strategic Note Box ---
  currentY += 6;

  doc.setFillColor(245, 243, 255);
  doc.setDrawColor(196, 181, 253);
  doc.setLineWidth(0.3);
  doc.rect(12, currentY, 186, 18, "FD");

  doc.setTextColor(109, 40, 217);
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.text("EXECUTIVE PRESENTATION & COMPLIANCE NOTICE", 16, currentY + 5.5);

  doc.setTextColor(71, 85, 105);
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.text("• This report is compiled for agency management oversight, brand approval, and budget allocation verification.", 16, currentY + 10.5);
  doc.text("• All campaign creator payouts are held in 100% verified Ybex Escrow until deliverable approval.", 16, currentY + 14.5);

  renderFooter(1);

  // Save / Download PDF
  try {
    const filename = `ybex_campaign_report_${campaignTitle.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${campaignId}.pdf`;
    const blob = doc.output("blob");
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.style.display = "none";
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    }, 100);
  } catch (err) {
    console.error("PDF Blob download failed, falling back to doc.save...", err);
    doc.save(`ybex_campaign_report_${campaignId}.pdf`);
  }
};

/**
 * Legacy/General analytics report downloader
 */
export const downloadAnalyticsPDFReport = (data) => {
  if (data?.campaign) {
    return downloadCampaignPDFReport({
      campaign: data.campaign,
      applicants: data.applicants || [],
      brandName: data.brand_name,
      userRole: data.user_role,
      aiRoi: data.aiRoi
    });
  }
  // Fallback
  return downloadCampaignPDFReport({
    campaign: {
      title: data.brand_name ? `${data.brand_name} Marketing Brief` : "Marketing Campaign Brief",
      budget: data.metrics?.total_spend || 25000,
      status: "Active"
    },
    applicants: data.top_creators || [],
    brandName: data.brand_name,
    userRole: data.user_role
  });
};
