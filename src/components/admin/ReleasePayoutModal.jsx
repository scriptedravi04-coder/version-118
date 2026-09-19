import React, { useState, useMemo, useEffect } from 'react';
import { safeLower } from "../../utils/safeFormat";
import { 
  ArrowLeft, 
  X, 
  Send, 
  CheckCircle2, 
  AlertTriangle, 
  Copy, 
  Check, 
  Building2, 
  QrCode, 
  Smartphone, 
  Search, 
  ExternalLink, 
  ArrowRight, 
  ShieldCheck, 
  ChevronDown, 
  ChevronUp, 
  Info, 
  Sparkles,
  CreditCard,
  Hash,
  Wallet,
  Receipt,
  Layers,
  ChevronRight
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { toast } from 'sonner';

// Full list of Indian UPI Apps with authentic vector logos and deep link schemas
export const UPI_APPS_CONFIG = [
  {
    id: 'phonepe',
    name: 'PhonePe',
    shortName: 'PhonePe',
    category: 'popular',
    badge: 'Popular',
    color: '#5F259F',
    bgLight: 'bg-purple-500/10',
    deepLinkScheme: 'phonepe://pay',
    icon: (
      <svg className="w-8 h-8 shrink-0" viewBox="0 0 48 48" fill="none">
        <rect width="48" height="48" rx="12" fill="#5F259F" />
        <path d="M24 10C16.27 10 10 16.27 10 24C10 31.73 16.27 38 24 38C31.73 38 38 31.73 38 24C38 16.27 31.73 10 24 10ZM29.2 26.8L25.8 28.8V33H22.2V15H25.8V23.2L28.8 21.4L31 24.2L29.2 26.8Z" fill="white"/>
        <path d="M17 21H22V24H17V21Z" fill="white"/>
      </svg>
    )
  },
  {
    id: 'paytm',
    name: 'Paytm UPI',
    shortName: 'Paytm',
    category: 'popular',
    badge: 'Fastest',
    color: '#00BAF2',
    bgLight: 'bg-sky-500/10',
    deepLinkScheme: 'paytmmp://pay',
    icon: (
      <svg className="w-8 h-8 shrink-0" viewBox="0 0 48 48" fill="none">
        <rect width="48" height="48" rx="12" fill="#002970" />
        <path d="M12 18H18C20.2 18 22 19.8 22 22C22 24.2 20.2 26 18 26H15.5V31H12V18Z" fill="#00BAF2"/>
        <path d="M24 22H27.5V31H31V22H34.5V18H24V22Z" fill="#00BAF2"/>
        <path d="M35 18H38.5V31H35V18Z" fill="#00BAF2"/>
      </svg>
    )
  },
  {
    id: 'supermoney',
    name: 'super.money',
    shortName: 'Super Money',
    category: 'fintech',
    badge: 'Flipkart UPI',
    color: '#E82467',
    bgLight: 'bg-pink-500/10',
    deepLinkScheme: 'supermoney://upi/pay',
    icon: (
      <svg className="w-8 h-8 shrink-0" viewBox="0 0 48 48" fill="none">
        <rect width="48" height="48" rx="12" fill="#0F1016" />
        <circle cx="20" cy="24" r="8" fill="#E82467" />
        <circle cx="28" cy="24" r="8" fill="#00E599" fillOpacity="0.85" />
        <circle cx="34" cy="18" r="3" fill="#FFE500" />
      </svg>
    )
  },
  {
    id: 'popupi',
    name: 'Pop UPI (POPclub)',
    shortName: 'Pop UPI',
    category: 'fintech',
    badge: 'Top Rewards',
    color: '#8A2BE2',
    bgLight: 'bg-violet-500/10',
    deepLinkScheme: 'popclub://pay',
    icon: (
      <svg className="w-8 h-8 shrink-0" viewBox="0 0 48 48" fill="none">
        <rect width="48" height="48" rx="12" fill="#8A2BE2" />
        <path d="M15 16H25C28.3 16 31 18.7 31 22C31 25.3 28.3 28 25 28H19V34H15V16ZM19 24H24.5C25.9 24 27 22.9 27 21.5C27 20.1 25.9 19 24.5 19H19V24Z" fill="#FFF066"/>
      </svg>
    )
  },
  {
    id: 'airtel',
    name: 'Airtel Pay',
    shortName: 'Airtel',
    category: 'banks',
    badge: 'Payments Bank',
    color: '#FF0000',
    bgLight: 'bg-red-500/10',
    deepLinkScheme: 'myairtel://upi/pay',
    icon: (
      <svg className="w-8 h-8 shrink-0" viewBox="0 0 48 48" fill="none">
        <rect width="48" height="48" rx="12" fill="#E60000" />
        <path d="M24 13C17.9 13 13 17.9 13 24C13 30.1 17.9 35 24 35C30.1 35 35 30.1 35 24C35 17.9 30.1 13 24 13ZM24 31C20.1 31 17 27.9 17 24C17 20.1 20.1 17 24 17C27.9 17 31 20.1 31 24C31 27.9 27.9 31 24 31Z" fill="#FFFFFF"/>
        <path d="M22 21H26V27H22V21Z" fill="#FFFFFF"/>
      </svg>
    )
  },
  // Additional UPI apps for "View All"
  {
    id: 'gpay',
    name: 'Google Pay',
    shortName: 'GPay',
    category: 'popular',
    badge: 'Popular',
    color: '#1A73E8',
    bgLight: 'bg-blue-500/10',
    deepLinkScheme: 'tez://upi/pay',
    icon: (
      <svg className="w-8 h-8 shrink-0" viewBox="0 0 48 48" fill="none">
        <path fill="#4285F4" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
        <path fill="#34A853" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
        <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
        <path fill="#EA4335" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
      </svg>
    )
  },
  {
    id: 'cred',
    name: 'CRED Pay',
    shortName: 'CRED',
    category: 'popular',
    badge: 'Zero Bounce',
    color: '#121212',
    bgLight: 'bg-neutral-500/10',
    deepLinkScheme: 'credpay://upi/pay',
    icon: (
      <svg className="w-8 h-8 shrink-0" viewBox="0 0 48 48" fill="none">
        <rect width="48" height="48" rx="12" fill="#121212" />
        <path d="M14 16C14 14.9 14.9 14 16 14H32C33.1 14 34 14.9 34 16V26C34 31.5 29.5 36 24 36C18.5 36 14 31.5 14 26V16Z" stroke="#FFFFFF" strokeWidth="3"/>
        <path d="M20 20H28M20 25H28M24 25V30" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round"/>
      </svg>
    )
  },
  {
    id: 'bhim',
    name: 'BHIM UPI',
    shortName: 'BHIM',
    category: 'popular',
    badge: 'Govt NPCI',
    color: '#007A3D',
    bgLight: 'bg-emerald-500/10',
    deepLinkScheme: 'bhim://pay',
    icon: (
      <svg className="w-8 h-8 shrink-0" viewBox="0 0 48 48" fill="none">
        <rect width="48" height="48" rx="12" fill="#0A3A60" />
        <path d="M16 14H24C28 14 31 17 31 21C31 23.5 29.5 25.5 27.5 26.5C30 27.5 32 30 32 33C32 37.5 28.5 41 24 41H16V14Z" fill="#F37021"/>
        <path d="M22 20H24C25.5 20 26.5 21 26.5 22.5C26.5 24 25.5 25 24 25H22V20ZM22 30H24.5C26.2 30 27.5 31.2 27.5 33C27.5 34.8 26.2 36 24.5 36H22V30Z" fill="#007A3D"/>
      </svg>
    )
  },
  {
    id: 'navi',
    name: 'Navi UPI',
    shortName: 'Navi',
    category: 'fintech',
    badge: 'Zero Fee',
    color: '#00C896',
    bgLight: 'bg-emerald-500/10',
    deepLinkScheme: 'naviapp://upi/pay',
    icon: (
      <svg className="w-8 h-8 shrink-0" viewBox="0 0 48 48" fill="none">
        <rect width="48" height="48" rx="12" fill="#032D60" />
        <path d="M14 32V16L24 26L34 16V32" stroke="#00C896" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    )
  },
  {
    id: 'kotak',
    name: 'Kotak 811',
    shortName: 'Kotak',
    category: 'banks',
    badge: 'Bank App',
    color: '#ED1C24',
    bgLight: 'bg-red-500/10',
    deepLinkScheme: 'kotakbank://pay',
    icon: (
      <svg className="w-8 h-8 shrink-0" viewBox="0 0 48 48" fill="none">
        <rect width="48" height="48" rx="12" fill="#ED1C24" />
        <circle cx="24" cy="24" r="14" fill="#003366"/>
        <path d="M18 24C18 20.6863 20.6863 18 24 18C27.3137 18 30 20.6863 30 24C30 27.3137 27.3137 30 24 30C20.6863 30 18 27.3137 18 24Z" fill="white"/>
        <path d="M24 15V33M15 24H33" stroke="#ED1C24" strokeWidth="2.5"/>
      </svg>
    )
  },
  {
    id: 'famapp',
    name: 'FamApp (FamPay)',
    shortName: 'FamApp',
    category: 'fintech',
    badge: 'Gen-Z UPI',
    color: '#FFD700',
    bgLight: 'bg-amber-500/10',
    deepLinkScheme: 'fampay://upi/pay',
    icon: (
      <svg className="w-8 h-8 shrink-0" viewBox="0 0 48 48" fill="none">
        <rect width="48" height="48" rx="12" fill="#1C1C1E" />
        <path d="M28 12L16 26H24L20 36L32 22H24L28 12Z" fill="#FFC800" stroke="#FFC800" strokeWidth="1.5" strokeLinejoin="round"/>
      </svg>
    )
  },
  {
    id: 'slice',
    name: 'Slice UPI',
    shortName: 'Slice',
    category: 'fintech',
    badge: 'Credit UPI',
    color: '#7B2CBF',
    bgLight: 'bg-purple-500/10',
    deepLinkScheme: 'slicepay://pay',
    icon: (
      <svg className="w-8 h-8 shrink-0" viewBox="0 0 48 48" fill="none">
        <rect width="48" height="48" rx="12" fill="#5A189A" />
        <path d="M16 24C16 19.5817 19.5817 16 24 16H32V24C32 28.4183 28.4183 32 24 32C19.5817 32 16 28.4183 16 24Z" fill="#FF5470"/>
        <circle cx="22" cy="22" r="3" fill="#FFFFFF" />
      </svg>
    )
  },
  {
    id: 'kiwi',
    name: 'Kiwi UPI',
    shortName: 'Kiwi',
    category: 'fintech',
    badge: 'Axis RuPay',
    color: '#00E599',
    bgLight: 'bg-emerald-500/10',
    deepLinkScheme: 'kiwipay://upi/pay',
    icon: (
      <svg className="w-8 h-8 shrink-0" viewBox="0 0 48 48" fill="none">
        <rect width="48" height="48" rx="12" fill="#111B24" />
        <circle cx="24" cy="24" r="11" fill="#00E599"/>
        <circle cx="24" cy="24" r="7" fill="#111B24"/>
        <circle cx="24" cy="24" r="3" fill="#FFE500"/>
      </svg>
    )
  },
  {
    id: 'amazonpay',
    name: 'Amazon Pay UPI',
    shortName: 'Amazon Pay',
    category: 'popular',
    badge: 'Amazon',
    color: '#FF9900',
    bgLight: 'bg-amber-500/10',
    deepLinkScheme: 'amazonpay://pay',
    icon: (
      <svg className="w-8 h-8 shrink-0" viewBox="0 0 48 48" fill="none">
        <rect width="48" height="48" rx="12" fill="#232F3E" />
        <path d="M14 30C20 33 28 33 34 30" stroke="#FF9900" strokeWidth="3" strokeLinecap="round"/>
        <path d="M32 28L35 30L33 33" stroke="#FF9900" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M20 18H28M24 18V26" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round"/>
      </svg>
    )
  },
  {
    id: 'whatsapp',
    name: 'WhatsApp Pay',
    shortName: 'WhatsApp',
    category: 'popular',
    badge: 'Instant',
    color: '#25D366',
    bgLight: 'bg-green-500/10',
    deepLinkScheme: 'whatsapp://pay',
    icon: (
      <svg className="w-8 h-8 shrink-0" viewBox="0 0 48 48" fill="none">
        <rect width="48" height="48" rx="12" fill="#25D366" />
        <path d="M24 12C17.4 12 12 17.4 12 24C12 26.3 12.7 28.5 13.9 30.3L12 36L17.9 34.2C19.7 35.3 21.8 36 24 36C30.6 36 36 30.6 36 24C36 17.4 30.6 12 24 12Z" fill="#FFFFFF"/>
        <path d="M28.8 27.5C28.6 28.1 27.5 28.6 27 28.7C26.5 28.8 25.8 28.8 23.8 28C21.3 26.9 19.6 24.4 19.5 24.2C19.4 24.1 18.5 22.9 18.5 21.6C18.5 20.3 19.1 19.7 19.4 19.4C19.6 19.1 19.9 19.1 20.2 19.1C20.4 19.1 20.6 19.1 20.8 19.1C21.1 19.1 21.3 19 21.5 19.4C21.7 19.9 22.2 21.2 22.3 21.3C22.4 21.4 22.4 21.6 22.3 21.7C22.2 21.9 22.1 22 22 22.1C21.9 22.2 21.8 22.4 21.6 22.5C21.5 22.7 21.3 22.8 21.5 23.1C21.7 23.4 22.3 24.4 23.2 25.2C24.4 26.2 25.3 26.6 25.6 26.7C25.9 26.8 26.1 26.8 26.3 26.6C26.5 26.4 27.1 25.6 27.3 25.3C27.5 25 27.7 25 28 25.1C28.3 25.2 29.8 26 30.1 26.1C30.4 26.3 30.6 26.4 30.7 26.5C30.8 26.8 30.8 27.3 28.8 27.5Z" fill="#25D366"/>
      </svg>
    )
  }
];

// Top 4 Featured UPI apps on main screen (PhonePe removed from top 4 as requested, accessible via View All)
export const TOP_FOUR_UPI_APPS = [
  {
    id: 'airtel',
    name: 'Airtel Pay',
    shortName: 'Airtel',
    category: 'banks',
    badge: 'Payments Bank',
    color: '#FF0000',
    bgLight: 'bg-red-500/10',
    deepLinkScheme: 'myairtel://upi/pay',
    icon: (
      <svg className="w-8 h-8 shrink-0" viewBox="0 0 48 48" fill="none">
        <rect width="48" height="48" rx="12" fill="#E60000" />
        <path d="M24 13C17.9 13 13 17.9 13 24C13 30.1 17.9 35 24 35C30.1 35 35 30.1 35 24C35 17.9 30.1 13 24 13ZM24 31C20.1 31 17 27.9 17 24C17 20.1 20.1 17 24 17C27.9 17 31 20.1 31 24C31 27.9 27.9 31 24 31Z" fill="#FFFFFF"/>
        <path d="M22 21H26V27H22V21Z" fill="#FFFFFF"/>
      </svg>
    )
  },
  {
    id: 'paytm',
    name: 'Paytm UPI',
    shortName: 'Paytm',
    category: 'popular',
    badge: 'Fastest',
    color: '#00BAF2',
    bgLight: 'bg-sky-500/10',
    deepLinkScheme: 'paytmmp://pay',
    icon: (
      <svg className="w-8 h-8 shrink-0" viewBox="0 0 48 48" fill="none">
        <rect width="48" height="48" rx="12" fill="#002970" />
        <path d="M12 18H18C20.2 18 22 19.8 22 22C22 24.2 20.2 26 18 26H15.5V31H12V18Z" fill="#00BAF2"/>
        <path d="M24 22H27.5V31H31V22H34.5V18H24V22Z" fill="#00BAF2"/>
        <path d="M35 18H38.5V31H35V18Z" fill="#00BAF2"/>
      </svg>
    )
  },
  {
    id: 'supermoney',
    name: 'super.money',
    shortName: 'Supermoney',
    category: 'fintech',
    badge: 'Flipkart UPI',
    color: '#E82467',
    bgLight: 'bg-pink-500/10',
    deepLinkScheme: 'supermoney://upi/pay',
    icon: (
      <svg className="w-8 h-8 shrink-0" viewBox="0 0 48 48" fill="none">
        <rect width="48" height="48" rx="12" fill="#0F1016" />
        <circle cx="20" cy="24" r="8" fill="#E82467" />
        <circle cx="28" cy="24" r="8" fill="#00E599" fillOpacity="0.85" />
        <circle cx="34" cy="18" r="3" fill="#FFE500" />
      </svg>
    )
  },
  {
    id: 'popupi',
    name: 'Pop UPI',
    shortName: 'Pop UPI',
    category: 'fintech',
    badge: 'Top Rewards',
    color: '#8A2BE2',
    bgLight: 'bg-violet-500/10',
    deepLinkScheme: 'popclub://pay',
    icon: (
      <svg className="w-8 h-8 shrink-0" viewBox="0 0 48 48" fill="none">
        <rect width="48" height="48" rx="12" fill="#8A2BE2" />
        <path d="M15 16H25C28.3 16 31 18.7 31 22C31 25.3 28.3 28 25 28H19V34H15V16ZM19 24H24.5C25.9 24 27 22.9 27 21.5C27 20.1 25.9 19 24.5 19H19V24Z" fill="#FFF066"/>
      </svg>
    )
  }
];

export default function ReleasePayoutModal({
  tx,
  onClose,
  onConfirmRelease,
  releasing = false,
  isTxApprovedByBrand = () => true,
}) {
  const [copiedKey, setCopiedKey] = useState(null);
  const [showBreakdown, setShowBreakdown] = useState(false);
  const [showBankDetails, setShowBankDetails] = useState(false);
  const [showAllAppsModal, setShowAllAppsModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedApp, setSelectedApp] = useState(null);
  const [utrInput, setUtrInput] = useState('');
  const [disbursalNote, setDisbursalNote] = useState('');

  // Lock body scroll while modal is active
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  if (!tx) return null;

  const netAmount = Number(tx.creator_net_amount || tx.net_amount || tx.agreed_amount || tx.amount || 0);
  const grossAmount = Number(tx.gross_amount || tx.amount || netAmount || 0);
  const feeAmount = Number(tx.platform_fee_amount || Math.max(0, grossAmount - netAmount) || 0);
  const tdsAmount = Number(tx.tds_amount || 0);

  const creatorName = tx.bank_holder_name || tx.creator_name || tx.creator_username || 'Beneficiary';
  const upiId = (tx.upi_id || '').trim();
  const bankAccount = (tx.bank_account_no || '').trim();
  const bankIfsc = (tx.bank_ifsc || '').trim();
  const bankName = (tx.bank_name || '').trim();
  const dealId = tx.deal_id || tx.ugc_order_id || tx.transaction_id || tx.id || 'N/A';

  // Standard UPI URI format for Indian Payment Gateways & UPI Apps
  const upiPayloadUri = useMemo(() => {
    if (!upiId) return '';
    const pa = encodeURIComponent(upiId);
    const pn = encodeURIComponent(creatorName);
    const am = netAmount > 0 ? netAmount.toFixed(2) : '0.00';
    const tn = encodeURIComponent(`Ybex Escrow Payout ${dealId}`.slice(0, 45));
    return `upi://pay?pa=${pa}&pn=${pn}&am=${am}&cu=INR&tn=${tn}`;
  }, [upiId, creatorName, netAmount, dealId]);

  const copyToClipboard = (text, keyName, label = 'Copied') => {
    if (!text) return;
    navigator.clipboard.writeText(String(text).trim());
    setCopiedKey(keyName);
    toast.success(`${label} copied to clipboard!`);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Immediate 1-Tap launch and deep-link redirection
  const handleLaunchApp = (app) => {
    setSelectedApp(app);
    if (!upiId) {
      toast.error('No UPI ID on record. Please use Bank Account beneficiary details.');
      return;
    }

    const pa = encodeURIComponent(upiId);
    const pn = encodeURIComponent(creatorName);
    const am = netAmount > 0 ? netAmount.toFixed(2) : '0.00';
    const tn = encodeURIComponent(`Ybex Escrow Payout ${dealId}`.slice(0, 45));
    const baseParams = `pa=${pa}&pn=${pn}&am=${am}&tn=${tn}&cu=INR`;

    let targetUri = `upi://pay?${baseParams}`;
    if (app?.deepLinkScheme) {
      targetUri = `${app.deepLinkScheme}?${baseParams}`;
    }

    // Always copy UPI ID as a safety fallback
    navigator.clipboard.writeText(upiId);
    toast.success(`Launching ${app.name || app.shortName}...`, {
      description: `Amount ₹${netAmount.toLocaleString('en-IN')} prefilled & UPI ID copied.`
    });

    try {
      window.location.href = targetUri;
    } catch (err) {
      console.warn('Deep link error:', err);
    }
  };

  // Filtered list when searching in "View All"
  const filteredApps = useMemo(() => {
    if (!searchQuery.trim()) return UPI_APPS_CONFIG;
    return UPI_APPS_CONFIG.filter((app) =>
      safeLower(app.name).includes(searchQuery.toLowerCase()) ||
      safeLower(app.shortName).includes(searchQuery.toLowerCase()) ||
      safeLower(app.badge).includes(searchQuery.toLowerCase())
    );
  }, [searchQuery]);

  const handleSubmit = (e) => {
    if (e) e.preventDefault();
    if (!utrInput || !utrInput.trim()) {
      toast.error('Please enter the 12-Digit UTR / Bank Reference Number.');
      return;
    }
    onConfirmRelease({
      utr: utrInput.trim(),
      note: disbursalNote.trim(),
      appUsed: selectedApp?.name || 'UPI Direct'
    });
  };

  const isApproved = isTxApprovedByBrand(tx);

  return (
    <div className="fixed inset-0 z-50 bg-[var(--bg-base)] overflow-y-auto flex flex-col animate-in fade-in duration-150">
      
      {/* Top Sticky Header */}
      <header className="sticky top-0 z-30 bg-[var(--bg-surface)]/95 backdrop-blur-md border-b border-[var(--border-default)] px-4 sm:px-6 py-3 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            className="p-2 -ml-2 rounded-xl text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] active:scale-95 transition-all cursor-pointer flex items-center gap-1.5"
            aria-label="Back"
          >
            <ArrowLeft size={18} className="stroke-[2.5]" />
            <span className="text-sm font-bold hidden sm:inline">Back</span>
          </button>

          <div>
            <h1 className="text-base sm:text-lg font-bold text-[var(--text-primary)] leading-tight">
              Disburse Payout
            </h1>
            <p className="text-[11px] text-[var(--text-secondary)] hidden xs:block">
              100% Escrow Protected Settlement
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
            <ShieldCheck size={13} className="shrink-0" />
            <span>Safe Escrow</span>
          </span>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] transition-colors cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>
      </header>

      {/* Main Full-Width Single-Page Content Area */}
      <main className="flex-1 w-full max-w-6xl mx-auto p-3.5 sm:p-6 lg:p-8">
        
        {/* Brand Approval Warning if pending */}
        {!isApproved && (
          <div className="mb-4 bg-amber-500/10 border border-amber-500/25 rounded-2xl p-3.5 flex items-center gap-2.5 text-xs text-amber-800 dark:text-amber-300">
            <AlertTriangle size={16} className="text-amber-600 shrink-0" />
            <span>
              <strong>Brand Review Pending:</strong> Releasing now performs an authoritative Admin Escrow override.
            </span>
          </div>
        )}

        {/* 2-Column Responsive Layout for Desktop / Single Stream for Mobile */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-6 items-start">
          
          {/* ========================================================= */}
          {/* LEFT COLUMN: Amount in Top Left + QR Code + Bank Details */}
          {/* ========================================================= */}
          <div className="lg:col-span-6 space-y-4">
            
            {/* 1. TOP LEFT CORNER: Net Payment Amount & Beneficiary Box */}
            <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-2xl sm:rounded-3xl p-4.5 sm:p-6 shadow-xs">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                      Net Payment Amount
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-[10px] font-black font-mono">
                      100% SECURE
                    </span>
                  </div>
                  
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-3xl sm:text-4xl font-black font-mono tracking-tight text-emerald-700 dark:text-emerald-400">
                      ₹{netAmount.toLocaleString('en-IN')}
                    </span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(netAmount, 'amount', 'Amount')}
                      className="text-xs font-bold text-[var(--text-secondary)] hover:text-emerald-700 dark:hover:text-emerald-400 p-1.5 rounded-lg hover:bg-[var(--bg-elevated)] transition-colors cursor-pointer"
                      title="Copy Net Amount"
                    >
                      {copiedKey === 'amount' ? <Check size={16} className="text-emerald-600" /> : <Copy size={16} />}
                    </button>
                  </div>
                </div>

                {/* Beneficiary Badge */}
                <div className="text-right">
                  <div className="text-xs font-bold text-[var(--text-primary)] flex items-center justify-end gap-1.5">
                    <span className="text-[var(--text-secondary)] font-normal">To:</span>
                    <span className="truncate max-w-[150px] sm:max-w-[200px]">{creatorName}</span>
                  </div>
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md mt-1">
                    <CheckCircle2 size={11} /> Verified KYC
                  </span>
                </div>
              </div>

              {/* Amount Breakdown Collapsible Toggle */}
              <div className="pt-3 mt-3 border-t border-[var(--border-default)]/60">
                <button
                  type="button"
                  onClick={() => setShowBreakdown(!showBreakdown)}
                  className="w-full flex items-center justify-between text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] py-1 transition-colors cursor-pointer"
                >
                  <span className="flex items-center gap-1.5">
                    <Receipt size={13} className="text-emerald-600 dark:text-emerald-400" />
                    <span>Amount Breakdown</span>
                  </span>
                  <span className="flex items-center gap-1 text-[11px] text-emerald-700 dark:text-emerald-400 font-bold">
                    {showBreakdown ? 'Hide' : 'View'} Breakdown
                    {showBreakdown ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </span>
                </button>

                {/* Collapsible Breakdown Details */}
                {showBreakdown && (
                  <div className="mt-2.5 bg-[var(--bg-elevated)] rounded-xl p-3.5 border border-[var(--border-default)] space-y-2 text-xs animate-in fade-in duration-200">
                    <div className="flex justify-between items-center text-[var(--text-secondary)]">
                      <span>Gross Deal Amount:</span>
                      <span className="font-mono font-semibold text-[var(--text-primary)]">
                        ₹{grossAmount.toLocaleString('en-IN')}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-[var(--text-secondary)]">
                      <span>Ybex Platform Fee:</span>
                      <span className="font-mono font-semibold text-rose-600 dark:text-rose-400">
                        - ₹{feeAmount.toLocaleString('en-IN')}
                      </span>
                    </div>
                    {tdsAmount > 0 && (
                      <div className="flex justify-between items-center text-[var(--text-secondary)]">
                        <span>TDS Deductions:</span>
                        <span className="font-mono font-semibold text-amber-600 dark:text-amber-400">
                          - ₹{tdsAmount.toLocaleString('en-IN')}
                        </span>
                      </div>
                    )}
                    <div className="pt-2 border-t border-[var(--border-default)] flex justify-between items-center font-bold text-[var(--text-primary)]">
                      <span>Final Net Creator Payout:</span>
                      <span className="font-mono text-emerald-700 dark:text-emerald-400 font-black text-sm">
                        ₹{netAmount.toLocaleString('en-IN')}
                      </span>
                    </div>
                    <div className="text-[10px] text-[var(--text-secondary)] pt-1 flex justify-between">
                      <span>Deal Reference: <strong className="font-mono text-[var(--text-primary)]">{dealId}</strong></span>
                      <span className="text-emerald-600 dark:text-emerald-400 font-medium">0% Hidden Charges</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* 2. QR CODE & UPI ID CARD (Desktop View or Scrollable on Mobile) */}
            <div className="hidden lg:block bg-[var(--bg-card)] border border-[var(--border-default)] rounded-2xl sm:rounded-3xl p-4.5 sm:p-6 shadow-xs space-y-3.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 flex items-center justify-center font-bold">
                    <QrCode size={14} />
                  </div>
                  <h4 className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider">
                    QR Code & UPI ID
                  </h4>
                </div>

                {upiPayloadUri && (
                  <button
                    type="button"
                    onClick={() => copyToClipboard(upiPayloadUri, 'upiUri', 'UPI Payment Link')}
                    className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    {copiedKey === 'upiUri' ? <Check size={12} /> : <Copy size={12} />}
                    <span>{copiedKey === 'upiUri' ? 'Link Copied' : 'Copy Pay Link'}</span>
                  </button>
                )}
              </div>

              {upiPayloadUri ? (
                <div className="bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-2xl p-4 flex items-center gap-4">
                  <div className="p-2.5 bg-white rounded-xl shadow-xs shrink-0">
                    <QRCodeSVG 
                      value={upiPayloadUri}
                      size={110}
                      level="M"
                      includeMargin={false}
                    />
                  </div>

                  <div className="flex-1 min-w-0 space-y-1.5">
                    <span className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider block">
                      Primary UPI ID (VPA)
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-xs sm:text-sm text-indigo-600 dark:text-indigo-400 select-all truncate">
                        {upiId}
                      </span>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(upiId, 'upi', 'UPI ID')}
                        className="p-1 text-[var(--text-secondary)] hover:text-indigo-600 dark:hover:text-indigo-400 rounded-md hover:bg-[var(--bg-card)] transition-colors shrink-0 cursor-pointer"
                        title="Copy UPI ID"
                      >
                        {copiedKey === 'upi' ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                      </button>
                    </div>
                    <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">
                      Scan with any camera or UPI app to transfer ₹{netAmount.toLocaleString('en-IN')} instantly.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="bg-[var(--bg-elevated)] border border-dashed border-[var(--border-default)] rounded-xl p-3.5 text-center text-xs text-[var(--text-secondary)]">
                  UPI ID not provided. Please use Bank Details below.
                </div>
              )}
            </div>

            {/* 3. BANK DETAILS OPTION (Dropdown / Accordion on Desktop) */}
            <div className="hidden lg:block bg-[var(--bg-card)] border border-[var(--border-default)] rounded-2xl sm:rounded-3xl p-4.5 sm:p-6 shadow-xs">
              <button
                type="button"
                onClick={() => setShowBankDetails(!showBankDetails)}
                className="w-full flex items-center justify-between text-left cursor-pointer group"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
                    <Building2 size={15} />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                      Bank Account Details
                    </h4>
                    <span className="text-[11px] text-[var(--text-secondary)]">
                      {bankAccount ? `${bankName || 'Bank'} (••••${bankAccount.slice(-4)})` : 'View beneficiary details'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1 text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 px-2.5 py-1 rounded-lg">
                  <span>{showBankDetails ? 'Hide Details' : 'View Details'}</span>
                  {showBankDetails ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </div>
              </button>

              {/* Bank Details Content when Dropdown opened */}
              {showBankDetails && (
                <div className="mt-3.5 pt-3.5 border-t border-[var(--border-default)] space-y-2.5 animate-in fade-in duration-200">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    {/* Account Holder Name */}
                    <div className="bg-[var(--bg-elevated)] p-2.5 rounded-xl border border-[var(--border-default)] flex items-center justify-between">
                      <div className="truncate pr-2">
                        <span className="text-[10px] font-bold text-[var(--text-secondary)] uppercase block">
                          Account Holder Name
                        </span>
                        <span className="font-bold text-[var(--text-primary)] text-xs select-all truncate block">
                          {creatorName}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(creatorName, 'holder', 'Holder Name')}
                        className="p-1 text-[var(--text-secondary)] hover:text-[var(--text-primary)] rounded-md hover:bg-[var(--bg-card)] transition-colors shrink-0 cursor-pointer"
                      >
                        {copiedKey === 'holder' ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
                      </button>
                    </div>

                    {/* Bank Account No */}
                    <div className="bg-[var(--bg-elevated)] p-2.5 rounded-xl border border-[var(--border-default)] flex items-center justify-between">
                      <div className="truncate pr-2">
                        <span className="text-[10px] font-bold text-[var(--text-secondary)] uppercase block">
                          Bank Account No {bankName ? `(${bankName})` : ''}
                        </span>
                        <span className="font-mono font-bold text-[var(--text-primary)] text-xs select-all truncate block">
                          {bankAccount || 'Not provided'}
                        </span>
                      </div>
                      {bankAccount && (
                        <button
                          type="button"
                          onClick={() => copyToClipboard(bankAccount, 'bankAccount', 'Account No')}
                          className="p-1 text-[var(--text-secondary)] hover:text-[var(--text-primary)] rounded-md hover:bg-[var(--bg-card)] transition-colors shrink-0 cursor-pointer"
                        >
                          {copiedKey === 'bankAccount' ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
                        </button>
                      )}
                    </div>

                    {/* IFSC Code */}
                    <div className="bg-[var(--bg-elevated)] p-2.5 rounded-xl border border-[var(--border-default)] flex items-center justify-between sm:col-span-2">
                      <div className="truncate pr-2">
                        <span className="text-[10px] font-bold text-[var(--text-secondary)] uppercase block">
                          Bank IFSC Code
                        </span>
                        <span className="font-mono font-bold text-[var(--text-primary)] text-xs select-all">
                          {bankIfsc || 'Not provided'}
                        </span>
                      </div>
                      {bankIfsc && (
                        <button
                          type="button"
                          onClick={() => copyToClipboard(bankIfsc, 'ifsc', 'IFSC Code')}
                          className="p-1 text-[var(--text-secondary)] hover:text-[var(--text-primary)] rounded-md hover:bg-[var(--bg-card)] transition-colors shrink-0 cursor-pointer"
                        >
                          {copiedKey === 'ifsc' ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

          </div>


          {/* ========================================================= */}
          {/* RIGHT COLUMN (Desktop) / TOP STREAM (Mobile): */}
          {/* UPI Apps (4 Main) + View All + UTR Option + Submit */}
          {/* ========================================================= */}
          <div className="lg:col-span-6 space-y-4">
            
            {/* UPI APPS SECTION */}
            <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-2xl sm:rounded-3xl p-4.5 sm:p-6 shadow-xs space-y-3.5">
              
              {/* Header with "View All" */}
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs sm:text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
                    <Smartphone size={16} className="text-indigo-600 dark:text-indigo-400" />
                    Select Payout UPI App
                  </h3>
                  <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">
                    1-Tap instant launch (₹{netAmount.toLocaleString('en-IN')})
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setShowAllAppsModal(true)}
                  className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 shrink-0 cursor-pointer px-2.5 py-1 rounded-lg hover:bg-indigo-500/10 transition-colors"
                >
                  <span>View All</span>
                  <ChevronRight size={14} />
                </button>
              </div>

              {/* MOBILE ONLY: Logo-Only 4-App Row (Airtel, Paytm, Supermoney, Pop UPI) */}
              <div className="grid grid-cols-4 gap-2.5 lg:hidden">
                {TOP_FOUR_UPI_APPS.map((app) => {
                  const isSelected = selectedApp?.id === app.id;
                  return (
                    <button
                      key={`mob-${app.id}`}
                      type="button"
                      onClick={() => handleLaunchApp(app)}
                      className={`flex flex-col items-center justify-center p-2.5 rounded-2xl border transition-all cursor-pointer active:scale-95 ${
                        isSelected
                          ? 'border-indigo-500 bg-indigo-500/10 ring-2 ring-indigo-500/25 shadow-xs'
                          : 'border-[var(--border-default)] bg-[var(--bg-elevated)] hover:bg-[var(--bg-surface)]'
                      }`}
                      title={app.name}
                    >
                      <div className="p-1 rounded-xl bg-white shadow-xs">
                        {app.icon}
                      </div>
                      <span className="text-[10px] font-bold text-[var(--text-primary)] mt-1.5 truncate max-w-full">
                        {app.shortName}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* DESKTOP ONLY: 4 Main Options Card Grid (Airtel, Paytm, Supermoney, Pop UPI) */}
              <div className="hidden lg:grid grid-cols-2 gap-3">
                {TOP_FOUR_UPI_APPS.map((app) => {
                  const isSelected = selectedApp?.id === app.id;
                  return (
                    <button
                      key={`desk-${app.id}`}
                      type="button"
                      onClick={() => handleLaunchApp(app)}
                      className={`p-3 rounded-2xl border text-left flex items-center gap-3 transition-all relative group cursor-pointer active:scale-98 ${
                        isSelected 
                          ? 'border-indigo-500 bg-indigo-500/10 ring-2 ring-indigo-500/20 shadow-xs' 
                          : 'border-[var(--border-default)] bg-[var(--bg-elevated)] hover:bg-[var(--bg-surface)] hover:border-gray-300 dark:hover:border-neutral-700'
                      }`}
                    >
                      <div className="shrink-0 p-0.5 rounded-xl bg-white shadow-xs">
                        {app.icon}
                      </div>

                      <div className="truncate flex-1 min-w-0">
                        <div className="text-xs font-bold text-[var(--text-primary)] truncate block group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                          {app.shortName}
                        </div>
                        <span className="text-[10px] text-[var(--text-secondary)] block truncate">
                          {app.badge}
                        </span>
                      </div>

                      <ArrowRight size={14} className="text-[var(--text-secondary)] group-hover:text-indigo-600 dark:group-hover:text-indigo-400 group-hover:translate-x-0.5 transition-all shrink-0" />
                    </button>
                  );
                })}
              </div>

            </div>

            {/* DIRECTLY BELOW UPI APPS: UTR OPTION & SUBMIT PAYMENT */}
            <form onSubmit={handleSubmit} className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-2xl sm:rounded-3xl p-4.5 sm:p-6 shadow-xs space-y-4">
              
              {/* UTR Input Field */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)] flex items-center gap-1.5">
                    <Hash size={14} className="text-emerald-600 dark:text-emerald-400" />
                    12-Digit UTR / Bank Reference Number *
                  </label>
                  <span className="text-[10px] font-mono text-[var(--text-secondary)]">
                    Required
                  </span>
                </div>
                
                <div className="relative">
                  <input
                    type="text"
                    required
                    placeholder="e.g. 420918273645 or UPI Ref ID"
                    value={utrInput}
                    onChange={(e) => setUtrInput(e.target.value.trim())}
                    className="w-full bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-xl px-4 py-3 text-xs sm:text-sm font-mono font-bold text-[var(--text-primary)] placeholder:font-sans placeholder:font-normal placeholder:text-[var(--text-secondary)] focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/15 transition-all"
                  />
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        const text = await navigator.clipboard.readText();
                        if (text) {
                          setUtrInput(text.trim());
                          toast.success('Pasted UTR from clipboard!');
                        }
                      } catch {
                        toast.info('Paste your UTR directly into the input field.');
                      }
                    }}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 px-2.5 py-1 bg-[var(--bg-card)] hover:bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border-default)] rounded-lg text-[11px] font-bold transition-all cursor-pointer"
                  >
                    Paste
                  </button>
                </div>
                
                <p className="text-[11px] text-[var(--text-secondary)] mt-1.5 flex items-center gap-1">
                  <Info size={12} className="shrink-0 text-emerald-600 dark:text-emerald-400" />
                  Paste the 12-digit UTR number from your payment app receipt.
                </p>
              </div>

              {/* Optional Disbursal Note */}
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-1 block">
                  Disbursal Note / Remarks (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Paid via Airtel / Paytm / IMPS"
                  value={disbursalNote}
                  onChange={(e) => setDisbursalNote(e.target.value)}
                  className="w-full bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-xl px-3.5 py-2 text-xs text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:outline-none focus:border-indigo-500 transition-all"
                />
              </div>

              {/* SUBMIT OPTION DIRECTLY BELOW UTR */}
              <div className="pt-2 border-t border-[var(--border-default)] flex flex-col sm:flex-row items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full sm:w-auto px-5 py-2.5 bg-[var(--bg-elevated)] hover:bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-xl text-xs font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={releasing || !utrInput.trim()}
                  className="w-full sm:w-auto px-6 py-3 bg-emerald-600 hover:bg-emerald-700 active:scale-98 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 shadow-md shadow-emerald-600/25 transition-all cursor-pointer"
                >
                  {releasing ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Releasing Payout...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={16} />
                      <span>Confirm Payment (₹{netAmount.toLocaleString('en-IN')})</span>
                    </>
                  )}
                </button>
              </div>
            </form>

            {/* MOBILE ONLY: Scroll down to view QR Code and Bank Details */}
            <div className="block lg:hidden space-y-4 pt-2">
              
              {/* QR Code Card */}
              <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-2xl p-4.5 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 flex items-center justify-center font-bold">
                      <QrCode size={14} />
                    </div>
                    <h4 className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider">
                      QR Code & UPI ID
                    </h4>
                  </div>

                  {upiPayloadUri && (
                    <button
                      type="button"
                      onClick={() => copyToClipboard(upiPayloadUri, 'upiUriMob', 'Payment Link')}
                      className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      {copiedKey === 'upiUriMob' ? <Check size={12} /> : <Copy size={12} />}
                      <span>Copy Link</span>
                    </button>
                  )}
                </div>

                {upiPayloadUri ? (
                  <div className="bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-2xl p-3.5 flex flex-col sm:flex-row items-center gap-3.5">
                    <div className="p-2 bg-white rounded-xl shadow-xs shrink-0">
                      <QRCodeSVG 
                        value={upiPayloadUri}
                        size={100}
                        level="M"
                        includeMargin={false}
                      />
                    </div>
                    <div className="flex-1 text-center sm:text-left space-y-1">
                      <span className="text-[10px] font-bold text-[var(--text-secondary)] uppercase block">
                        Primary UPI ID (VPA)
                      </span>
                      <div className="flex items-center justify-center sm:justify-start gap-1.5">
                        <span className="font-mono font-bold text-xs text-indigo-600 dark:text-indigo-400 select-all truncate">
                          {upiId}
                        </span>
                        <button
                          type="button"
                          onClick={() => copyToClipboard(upiId, 'upiMob', 'UPI ID')}
                          className="p-1 text-[var(--text-secondary)] hover:text-indigo-600 dark:hover:text-indigo-400 rounded-md cursor-pointer"
                        >
                          {copiedKey === 'upiMob' ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
                        </button>
                      </div>
                      <p className="text-[10px] text-[var(--text-secondary)]">
                        Scan with any UPI app to transfer ₹{netAmount.toLocaleString('en-IN')}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="bg-[var(--bg-elevated)] border border-dashed border-[var(--border-default)] rounded-xl p-3 text-center text-xs text-[var(--text-secondary)]">
                    UPI ID not provided.
                  </div>
                )}
              </div>

              {/* Bank Details Dropdown on Mobile */}
              <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-2xl p-4.5 shadow-xs">
                <button
                  type="button"
                  onClick={() => setShowBankDetails(!showBankDetails)}
                  className="w-full flex items-center justify-between text-left cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
                      <Building2 size={14} />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider">
                        Bank Account Details
                      </h4>
                      <span className="text-[10px] text-[var(--text-secondary)]">
                        {bankAccount ? `A/C: ••••${bankAccount.slice(-4)}` : 'View details'}
                      </span>
                    </div>
                  </div>

                  <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
                    {showBankDetails ? 'Hide' : 'View'}
                    {showBankDetails ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </span>
                </button>

                {showBankDetails && (
                  <div className="mt-3 pt-3 border-t border-[var(--border-default)] space-y-2 text-xs animate-in fade-in duration-200">
                    <div className="bg-[var(--bg-elevated)] p-2.5 rounded-xl border border-[var(--border-default)] flex items-center justify-between">
                      <div className="truncate pr-2">
                        <span className="text-[10px] font-bold text-[var(--text-secondary)] uppercase block">Name</span>
                        <span className="font-bold text-[var(--text-primary)] truncate block">{creatorName}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(creatorName, 'holderMob', 'Name')}
                        className="p-1 text-[var(--text-secondary)] rounded-md hover:bg-[var(--bg-card)] cursor-pointer"
                      >
                        {copiedKey === 'holderMob' ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                      </button>
                    </div>

                    <div className="bg-[var(--bg-elevated)] p-2.5 rounded-xl border border-[var(--border-default)] flex items-center justify-between">
                      <div className="truncate pr-2">
                        <span className="text-[10px] font-bold text-[var(--text-secondary)] uppercase block">Account No</span>
                        <span className="font-mono font-bold text-[var(--text-primary)] truncate block">{bankAccount || 'Not provided'}</span>
                      </div>
                      {bankAccount && (
                        <button
                          type="button"
                          onClick={() => copyToClipboard(bankAccount, 'accMob', 'Account No')}
                          className="p-1 text-[var(--text-secondary)] rounded-md hover:bg-[var(--bg-card)] cursor-pointer"
                        >
                          {copiedKey === 'accMob' ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                        </button>
                      )}
                    </div>

                    <div className="bg-[var(--bg-elevated)] p-2.5 rounded-xl border border-[var(--border-default)] flex items-center justify-between">
                      <div className="truncate pr-2">
                        <span className="text-[10px] font-bold text-[var(--text-secondary)] uppercase block">IFSC Code</span>
                        <span className="font-mono font-bold text-[var(--text-primary)] truncate block">{bankIfsc || 'Not provided'}</span>
                      </div>
                      {bankIfsc && (
                        <button
                          type="button"
                          onClick={() => copyToClipboard(bankIfsc, 'ifscMob', 'IFSC')}
                          className="p-1 text-[var(--text-secondary)] rounded-md hover:bg-[var(--bg-card)] cursor-pointer"
                        >
                          {copiedKey === 'ifscMob' ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>

            </div>

          </div>

        </div>

      </main>

      {/* "View All UPI Apps" Modal Overlay */}
      {showAllAppsModal && (
        <div className="fixed inset-0 z-60 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
          <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-2xl sm:rounded-3xl max-w-lg w-full p-4 sm:p-6 space-y-4 shadow-2xl relative max-h-[85vh] flex flex-col">
            
            <div className="flex items-center justify-between border-b border-[var(--border-default)] pb-3 shrink-0">
              <div>
                <h3 className="text-sm sm:text-base font-bold text-[var(--text-primary)]">
                  All Indian UPI Apps
                </h3>
                <p className="text-[11px] text-[var(--text-secondary)]">
                  Select any app to launch 1-tap payment (₹{netAmount.toLocaleString('en-IN')})
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setShowAllAppsModal(false);
                  setSearchQuery('');
                }}
                className="p-1.5 rounded-xl text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Search Input */}
            <div className="relative shrink-0">
              <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]" />
              <input
                type="text"
                placeholder="Search UPI App (e.g. PhonePe, GPay, Paytm, CRED, BHIM)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-xl pl-9 pr-8 py-2 text-xs text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:outline-none focus:border-indigo-500 transition-all"
                autoFocus
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-[var(--text-secondary)]"
                >
                  Clear
                </button>
              )}
            </div>

            {/* Scrollable Apps Grid */}
            <div className="flex-1 overflow-y-auto pr-1 grid grid-cols-1 sm:grid-cols-2 gap-2.5 min-h-[240px]">
              {filteredApps.map((app) => {
                const isSelected = selectedApp?.id === app.id;
                return (
                  <button
                    key={`modal-${app.id}`}
                    type="button"
                    onClick={() => {
                      setShowAllAppsModal(false);
                      handleLaunchApp(app);
                    }}
                    className={`p-3 rounded-2xl border text-left flex items-center gap-3 transition-all relative group cursor-pointer active:scale-98 ${
                      isSelected 
                        ? 'border-indigo-500 bg-indigo-500/10 ring-2 ring-indigo-500/20 shadow-xs' 
                        : 'border-[var(--border-default)] bg-[var(--bg-elevated)] hover:bg-[var(--bg-surface)] hover:border-gray-300 dark:hover:border-neutral-700'
                    }`}
                  >
                    <div className="shrink-0 p-0.5 rounded-xl bg-white shadow-xs">
                      {app.icon}
                    </div>

                    <div className="truncate flex-1 min-w-0">
                      <div className="text-xs font-bold text-[var(--text-primary)] truncate block group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                        {app.shortName || app.name}
                      </div>
                      <span className="text-[10px] text-[var(--text-secondary)] block truncate">
                        {app.badge}
                      </span>
                    </div>

                    <ArrowRight size={14} className="text-[var(--text-secondary)] group-hover:text-indigo-600 dark:group-hover:text-indigo-400 group-hover:translate-x-0.5 transition-all shrink-0" />
                  </button>
                );
              })}

              {filteredApps.length === 0 && (
                <div className="col-span-2 py-8 text-center text-xs text-[var(--text-secondary)]">
                  No UPI apps found matching "{searchQuery}".
                </div>
              )}
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
