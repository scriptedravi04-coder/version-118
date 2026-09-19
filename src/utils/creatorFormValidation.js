export const parseNumberInput = (raw) => {
  if (!raw) return "";
  const txt = String(raw).trim().toUpperCase().replace(/,/g, '');
  if (!txt) return "";
  
  if (txt.includes('K')) return Math.round(parseFloat(txt.replace('K', '')) * 1000);
  if (txt.includes('L')) return Math.round(parseFloat(txt.replace('L', '')) * 100000);
  if (txt.includes('M')) return Math.round(parseFloat(txt.replace('M', '')) * 1000000);
  
  const num = parseInt(txt.replace(/[^0-9]/g, ''), 10);
  return isNaN(num) ? "" : num;
};

export const formatRupeesInput = (raw) => {
  if (!raw) return "";
  const num = parseInt(String(raw).replace(/[^0-9]/g, ''), 10);
  if (isNaN(num)) return "";
  return "₹" + num.toLocaleString('en-IN');
};

export const formatNumberDisplay = (raw) => {
  if (!raw && raw !== 0) return "";
  // don't format if it's already got K, M, L in it or if they are typing it
  if (String(raw).match(/[KkLmM]/)) return raw;
  const num = parseInt(String(raw).replace(/[^0-9]/g, ''), 10);
  if (isNaN(num)) return raw;
  return num.toLocaleString('en-IN');
};

export const validateCreatorForm = (fields) => {
  const errors = {};

  if (!fields.name || !fields.name.trim()) {
    errors.name = "Full name is required";
  }

  if (!fields.social_handle || !fields.social_handle.trim()) {
    errors.social_handle = "Instagram handle is required";
  }

  if (!fields.instagram_link || !fields.instagram_link.trim()) {
    errors.instagram_link = "Instagram profile link is required";
  } else if (!fields.instagram_link.includes("http")) {
    errors.instagram_link = "Must be a valid link";
  }

  const followersCount = parseNumberInput(fields.followers);
  if (followersCount === "") {
    errors.followers = "Followers count is required";
  }

  if (!fields.mobile || !/^\d{10}$/.test(fields.mobile)) {
    errors.mobile = "Mobile number must be exactly 10 digits";
  }

  if (!fields.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fields.email)) {
    errors.email = "Valid email is required (e.g., name@example.com)";
  }

  if (!fields.avg_reach || !fields.avg_reach.trim()) {
    errors.avg_reach = "Average reach is required";
  }

  if (!fields.charges) {
    errors.charges = "Charges are required";
  }

  if (!fields.niche || fields.niche.length === 0) {
    errors.niche = "Please select at least 1 content niche";
  }

  if (!fields.collab_types || fields.collab_types.length === 0) {
    errors.collab_types = "Please select at least 1 collab type";
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

export const checkChargesWarning = (reachStr, chargesRaw) => {
  if (!chargesRaw || !reachStr) return null;

  let reach = 0;
  const s = String(reachStr).trim().toLowerCase();
  if (/^[\d.]+k$/.test(s) || /([\d.]+)\s*k/.test(s)) {
    const match = s.match(/([\d.]+)\s*k/);
    reach = Math.round(parseFloat(match ? match[1] : s) * 1000);
  } else if (/^[\d.]+m$/.test(s) || /([\d.]+)\s*m/.test(s)) {
    const match = s.match(/([\d.]+)\s*m/);
    reach = Math.round(parseFloat(match ? match[1] : s) * 1000000);
  } else if (/^[\d.]+l$/.test(s) || /([\d.]+)\s*l/.test(s)) {
    const match = s.match(/([\d.]+)\s*l/);
    reach = Math.round(parseFloat(match ? match[1] : s) * 100000);
  } else {
    reach = parseInt(s.replace(/[^0-9]/g, ''), 10) || 0;
  }

  const charges = parseInt(String(chargesRaw).replace(/[^0-9]/g, ''), 10);
  if (!reach || !charges) return null;

  const benchmark = reach * 0.30;
  const fairRounded = Math.round(benchmark);

  if (charges > benchmark) {
    return {
      type: "warning",
      fair: fairRounded,
      reach,
      charges,
      message: `⚠️ Heads up! Based on your avg reach of ${reach.toLocaleString('en-IN')}, a competitive rate would be around ₹${fairRounded.toLocaleString('en-IN')} (₹0.30/view). Your quoted charges are higher — you can still submit, brands may negotiate.`
    };
  }

  return {
    type: "ok",
    fair: fairRounded,
    reach,
    charges,
    message: "✅ Your charges look justified for your reach. Brands will find this competitive."
  };
};
