import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../../lib/api";
import { processRazorpayPayment } from "../../lib/razorpay";
import { toast } from "sonner";
import { Check, ChevronRight, Video, Tag, CheckCircle2, AlertCircle, Film, Camera } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import useIsMobile from "../../hooks/useIsMobile";
import BrandUGCMobile from "./BrandUGCMobile";

function BrandUGCPostDesktop() {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    title: "",
    detailed_requirements: "",
    product_name: "",
    product_description: "",
    product_url: "",
    sample_content_url: "",
    deliverable_type: "collaboration_reel",
    video_duration: "30s",
    dos: [""],
    donts: [""],
    budget: 1,
    max_creators: 1
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPosted, setIsPosted] = useState(false);

  useEffect(() => {
    const draft = localStorage.getItem('ugc_draft');
    if (draft) {
      try {
        const parsed = JSON.parse(draft);
        if (parsed.formData && parsed.step) {
          setFormData(parsed.formData);
          setStep(parsed.step);
        }
      } catch (e) {
        console.error("Failed to parse UGC draft:", e);
      }
    }
  }, []);

  useEffect(() => {
    if (!isPosted && (formData.title || formData.product_name || step > 1)) {
      localStorage.setItem('ugc_draft', JSON.stringify({ formData, step }));
    }
  }, [formData, step, isPosted]);

  const getMinBudget = (type) => {
    // Testing mode: allow starting from ₹1 for testing
    return 1;
  };

  const getFormatLabel = (type) => {
    if (type === 'collaboration_reel') return 'COLLABORATION REEL';
    if (type === 'ugc_video_raw') return 'UGC VIDEO — RAW';
    if (type === 'ugc_video_edited') return 'UGC VIDEO — EDITED';
    return 'UGC BRIEF';
  };

  const handleFormatChange = (newType) => {
    const minB = getMinBudget(newType);
    setFormData(prev => ({
      ...prev,
      deliverable_type: newType,
      budget: Math.max(prev.budget, minB),
      video_duration: newType === 'ugc_video_raw' ? 'Raw Clips' : (prev.video_duration === 'Raw Clips' ? '30s' : prev.video_duration)
    }));
  };

  const handlePost = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    const minB = getMinBudget(formData.deliverable_type);
    const finalBudget = Math.max(formData.budget, minB);
    const numCreators = Math.max(1, Number(formData.max_creators) || 1);
    const totalEscrowAmount = finalBudget * numCreators;

    await processRazorpayPayment({
      grossAmount: totalEscrowAmount,
      onSuccess: async () => {
        try {
          await api.post("ugc/briefs", {
            title: formData.title || `Review of ${formData.product_name}`,
            ...formData,
            budget: finalBudget,
            min_budget: minB,
            max_creators: numCreators,
            total_budget: totalEscrowAmount,
            dos: formData.dos?.filter(d => !!d.trim()),
            donts: formData.donts?.filter(d => !!d.trim()),
          });
          setIsPosted(true);
          localStorage.removeItem('ugc_draft');
          toast.success("Brief posted and payment held in Escrow!");
          navigate("/brand/ugc/briefs");
        } catch (err) {
          toast.error(err?.response?.data?.error || err?.response?.data?.detail || err?.message || "Failed to post brief.");
          setIsSubmitting(false);
        }
      },
      onError: () => {
        setIsSubmitting(false);
      }
    });
  };

  const countWords = (str = "") => str.trim() ? str.trim().split(/\s+/).filter(Boolean).length : 0;

  const Step1 = () => {
    const reqWords = countWords(formData.detailed_requirements || "");
    const reqChars = (formData.detailed_requirements || "").length;
    const isOverWordLimit = reqWords > 200;

    return (
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
        <div>
          <label className="block text-xs font-bold text-[var(--text-tertiary)] uppercase tracking-widest mb-2">
            Campaign Title <span className="text-rose-500">*</span>
          </label>
          <input 
            type="text" 
            maxLength={100} 
            className="w-full bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-xl px-4 py-4 text-[var(--text-primary)] focus:border-[var(--violet)] transition-colors outline-none font-medium" 
            placeholder="e.g. Summer Skincare Unboxing & Routine (Min 5 chars)" 
            value={formData.title} 
            onChange={e => setFormData({...formData, title: e.target.value})} 
          />
          {formData.title.trim().length > 0 && formData.title.trim().length < 5 && (
            <p className="text-amber-500 text-[11px] font-semibold mt-1.5 flex items-center gap-1">
              <AlertCircle size={12} /> Campaign title must be at least 5 characters long.
            </p>
          )}
        </div>

        <div>
          <div className="flex justify-between items-center mb-2">
            <label className="block text-xs font-bold text-[var(--text-tertiary)] uppercase tracking-widest">
              Detailed Requirements <span className="text-rose-500">*</span>
            </label>
            <span className={`text-[11px] font-mono font-medium ${isOverWordLimit ? 'text-red-400 font-bold' : reqWords > 160 ? 'text-amber-400' : 'text-[var(--text-tertiary)]'}`}>
              {reqWords} / 200 words ({reqChars} / 1000 chars)
            </span>
          </div>
          <textarea 
            rows={5} 
            maxLength={1000}
            className={`w-full bg-[var(--bg-elevated)] border rounded-xl px-4 py-4 text-[var(--text-primary)] focus:border-[var(--violet)] transition-colors outline-none font-medium leading-relaxed ${isOverWordLimit ? 'border-red-500' : 'border-[var(--border-default)]'}`} 
            placeholder="Describe what you expect from the creator: tone, key product benefits to highlight, call to action (Min 10 chars, Max 200 words)..." 
            value={formData.detailed_requirements || ''} 
            onChange={e => {
              const val = e.target.value;
              setFormData({...formData, detailed_requirements: val});
            }} 
          />
          {formData.detailed_requirements.trim().length > 0 && formData.detailed_requirements.trim().length < 10 && (
            <p className="text-amber-500 text-[11px] font-semibold mt-1.5 flex items-center gap-1">
              <AlertCircle size={12} /> Detailed requirements must be at least 10 characters long.
            </p>
          )}
          {isOverWordLimit && (
            <p className="text-red-400 text-xs mt-1.5 font-semibold flex items-center gap-1">
              <AlertCircle size={13} /> Description is too long. Please keep it under 200 words.
            </p>
          )}
        </div>

        <button 
          onClick={() => {
            if (formData.title.trim().length < 5) {
              toast.error("Campaign Title must be at least 5 characters long.");
              return;
            }
            if ((formData.detailed_requirements || "").trim().length < 10) {
              toast.error("Detailed Requirements must be at least 10 characters long.");
              return;
            }
            if (isOverWordLimit) {
              toast.error("Detailed requirements exceed 200 words limit. Please shorten it.");
              return;
            }
            setStep(2);
          }} 
          className="w-full bg-[var(--violet)] hover:bg-[var(--violet-hover)] text-white font-bold py-4 rounded-xl mt-4 active:scale-95 transition-all shadow-xl cursor-pointer"
        >
          Next: Product Info
        </button>
      </div>
    );
  };

  const Step2 = () => {
    const descWords = countWords(formData.product_description || "");
    const descChars = (formData.product_description || "").length;
    const isOverDescLimit = descWords > 100;

    return (
      <div className="space-y-5 animate-in fade-in slide-in-from-bottom-4">
        <div>
          <label className="block text-xs font-bold text-[var(--text-tertiary)] uppercase tracking-widest mb-2">
            Product Name <span className="text-rose-500">*</span>
          </label>
          <input 
            type="text" 
            maxLength={80} 
            className="w-full bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-xl px-4 py-3.5 text-[var(--text-primary)] focus:border-[var(--violet)] transition-colors outline-none font-medium" 
            placeholder="e.g. Glowing Face Serum 50ml (Min 2 chars)" 
            value={formData.product_name} 
            onChange={e => setFormData({...formData, product_name: e.target.value})} 
          />
          {formData.product_name.trim().length > 0 && formData.product_name.trim().length < 2 && (
            <p className="text-amber-500 text-[11px] font-semibold mt-1 flex items-center gap-1">
              <AlertCircle size={12} /> Product Name must be at least 2 characters.
            </p>
          )}
        </div>

        <div>
          <label className="block text-xs font-bold text-[var(--text-tertiary)] uppercase tracking-widest mb-2">Sample Content URL (Optional)</label>
          <input type="url" className="w-full bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-xl px-4 py-3.5 text-[var(--text-primary)] focus:border-[var(--violet)] transition-colors outline-none font-mono text-xs" placeholder="https://instagram.com/p/... or moodboard link" value={formData.sample_content_url || ''} onChange={e => setFormData({...formData, sample_content_url: e.target.value})} />
        </div>

        <div>
          <div className="flex justify-between items-end mb-2">
            <div className="flex items-center gap-2">
              <label className="block text-xs font-bold text-[var(--text-tertiary)] uppercase tracking-widest">
                Product Description <span className="text-rose-500">*</span>
              </label>
              <span className={`text-[10px] font-mono font-medium ${isOverDescLimit ? 'text-red-400 font-bold' : 'text-[var(--text-tertiary)]'}`}>
                {descWords}/100 words ({descChars}/500 chars)
              </span>
            </div>
          </div>
          
          <textarea 
            rows={3} 
            maxLength={500}
            className={`w-full bg-[var(--bg-elevated)] border rounded-xl px-4 py-3 text-[var(--text-primary)] focus:border-[var(--violet)] transition-colors outline-none font-medium leading-relaxed ${isOverDescLimit ? 'border-red-500' : 'border-[var(--border-default)]'}`} 
            placeholder="What makes it special? Key ingredients, features, or selling points (Min 10 chars, Max 100 words)..." 
            value={formData.product_description} 
            onChange={e => setFormData({...formData, product_description: e.target.value})} 
          />
          {formData.product_description.trim().length > 0 && formData.product_description.trim().length < 10 && (
            <p className="text-amber-500 text-[11px] font-semibold mt-1 flex items-center gap-1">
              <AlertCircle size={12} /> Product Description must be at least 10 characters.
            </p>
          )}
          {isOverDescLimit && (
            <p className="text-red-400 text-xs mt-1 font-semibold flex items-center gap-1">
              <AlertCircle size={12} /> Product description is too long (Max 100 words).
            </p>
          )}
        </div>

        <div>
          <label className="block text-xs font-bold text-[var(--text-tertiary)] uppercase tracking-widest mb-2">Product URL (Optional)</label>
          <input type="url" className="w-full bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-xl px-4 py-3.5 text-[var(--text-primary)] focus:border-[var(--violet)] transition-colors outline-none font-mono text-xs" placeholder="https://yourbrand.com/product" value={formData.product_url} onChange={e => setFormData({...formData, product_url: e.target.value})} />
        </div>

        <div className="flex gap-3 pt-2">
           <button onClick={() => setStep(1)} className="flex-1 bg-[var(--bg-elevated)] hover:bg-[var(--bg-elevated)] text-[var(--text-primary)] font-bold py-3.5 rounded-xl active:scale-95 transition-all mb-4 border border-[var(--border-default)] cursor-pointer">Back</button>
           <button 
             onClick={() => {
               if (formData.product_name.trim().length < 2) {
                 toast.error("Product Name must be at least 2 characters.");
                 return;
               }
               if ((formData.product_description || "").trim().length < 10) {
                 toast.error("Product Description must be at least 10 characters.");
                 return;
               }
               if (isOverDescLimit) {
                 toast.error("Product description exceeds 100 words limit.");
                 return;
               }
               setStep(3);
             }} 
             className="w-2/3 bg-[var(--violet)] hover:bg-[var(--violet-hover)] text-white font-bold py-3.5 rounded-xl active:scale-95 transition-all mb-4 shadow-xl cursor-pointer"
           >
             Next: Deliverables
           </button>
        </div>
      </div>
    );
  };

  const Step3 = () => {
    const isRaw = formData.deliverable_type === 'ugc_video_raw';
    const isCollabReel = formData.deliverable_type === 'collaboration_reel';
    const isUgcVideo = formData.deliverable_type === 'ugc_video_raw' || formData.deliverable_type === 'ugc_video_edited';

    return (
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
        <div>
          <label className="block text-xs font-bold text-[var(--text-tertiary)] uppercase tracking-widest mb-3">
            Select Campaign Format
          </label>

          {/* TWO TOP-LEVEL CARDS */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Card 1: Collaboration Reel */}
            <div 
              onClick={() => handleFormatChange('collaboration_reel')}
              className={`p-5 rounded-2xl border-2 transition-all cursor-pointer relative ${
                isCollabReel 
                  ? 'border-[#5438FF] bg-[#F5F0FF]/80 ring-2 ring-[#5438FF]/20 shadow-md shadow-[#5438FF]/10' 
                  : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/80 shadow-xs'
              }`}
            >
              {isCollabReel && (
                <div className="absolute top-3.5 right-3.5 w-6 h-6 rounded-full bg-[#5438FF] text-white flex items-center justify-center shadow-sm">
                  <Check size={14} strokeWidth={3} />
                </div>
              )}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${isCollabReel ? 'bg-[#5438FF] text-white shadow-md shadow-[#5438FF]/25' : 'bg-purple-50 text-purple-600 border border-purple-100'}`}>
                    <Film size={20} />
                  </div>
                </div>
                <h4 className={`text-base font-black mb-1 ${isCollabReel ? 'text-[#5438FF]' : 'text-[var(--text-primary)]'}`}>
                  Collaboration Reel
                </h4>
                <p className="text-xs text-[var(--text-secondary)] font-medium leading-relaxed">
                  Creator edits content & publishes directly on their own Instagram/social handle with brand collaboration tag.
                </p>
              </div>
            </div>

            {/* Card 2: UGC Video */}
            <div 
              onClick={() => {
                if (!isUgcVideo) {
                  handleFormatChange('ugc_video_edited');
                }
              }}
              className={`p-5 rounded-2xl border-2 transition-all cursor-pointer relative ${
                isUgcVideo 
                  ? 'border-[#5438FF] bg-[#F5F0FF]/80 ring-2 ring-[#5438FF]/20 shadow-md shadow-[#5438FF]/10' 
                  : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/80 shadow-xs'
              }`}
            >
              {isUgcVideo && (
                <div className="absolute top-3.5 right-3.5 w-6 h-6 rounded-full bg-[#5438FF] text-white flex items-center justify-center shadow-sm">
                  <Check size={14} strokeWidth={3} />
                </div>
              )}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${isUgcVideo ? 'bg-[#5438FF] text-white shadow-md shadow-[#5438FF]/25' : 'bg-blue-50 text-blue-600 border border-blue-100'}`}>
                    <Camera size={20} />
                  </div>
                </div>
                <h4 className={`text-base font-black mb-1 ${isUgcVideo ? 'text-[#5438FF]' : 'text-[var(--text-primary)]'}`}>
                  UGC Video
                </h4>
                <p className="text-xs text-[var(--text-secondary)] font-medium leading-relaxed">
                  Creator shoots video footage and uploads via Google Drive. Brand reviews & approves before payment.
                </p>
              </div>
            </div>
          </div>

          {/* SECONDARY SUB-TOGGLE FOR UGC VIDEO */}
          {isUgcVideo && (
            <div className="mt-4 p-4.5 rounded-2xl bg-slate-50/80 border border-slate-200 animate-in fade-in slide-in-from-top-2">
              <label className="block text-[11px] font-black text-[var(--text-tertiary)] uppercase tracking-widest mb-3">
                UGC Video Sub-Format
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => handleFormatChange('ugc_video_raw')}
                  className={`py-3.5 px-4 rounded-xl border-2 text-xs transition-all flex flex-col items-center justify-center gap-1 cursor-pointer relative ${
                    formData.deliverable_type === 'ugc_video_raw'
                      ? 'border-[#5438FF] bg-white text-[#5438FF] ring-2 ring-[#5438FF]/20 shadow-md shadow-[#5438FF]/10'
                      : 'border-slate-200 bg-white text-gray-600 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  {formData.deliverable_type === 'ugc_video_raw' && (
                    <span className="absolute top-2.5 right-2.5 w-4 h-4 rounded-full bg-[#5438FF] text-white flex items-center justify-center">
                      <Check size={10} strokeWidth={3} />
                    </span>
                  )}
                  <span className="font-black uppercase tracking-wider text-[11px]">Completely Raw</span>
                  <span className={`text-[10px] font-bold ${formData.deliverable_type === 'ugc_video_raw' ? 'text-[#5438FF]/90' : 'text-gray-400'}`}>No editing</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleFormatChange('ugc_video_edited')}
                  className={`py-3.5 px-4 rounded-xl border-2 text-xs transition-all flex flex-col items-center justify-center gap-1 cursor-pointer relative ${
                    formData.deliverable_type === 'ugc_video_edited'
                      ? 'border-[#5438FF] bg-white text-[#5438FF] ring-2 ring-[#5438FF]/20 shadow-md shadow-[#5438FF]/10'
                      : 'border-slate-200 bg-white text-gray-600 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  {formData.deliverable_type === 'ugc_video_edited' && (
                    <span className="absolute top-2.5 right-2.5 w-4 h-4 rounded-full bg-[#5438FF] text-white flex items-center justify-center">
                      <Check size={10} strokeWidth={3} />
                    </span>
                  )}
                  <span className="font-black uppercase tracking-wider text-[11px]">Edited</span>
                  <span className={`text-[10px] font-bold ${formData.deliverable_type === 'ugc_video_edited' ? 'text-[#5438FF]/90' : 'text-gray-400'}`}>Fully edited</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* DURATION SELECTOR (HIDDEN FOR RAW CLIPS) */}
        {!isRaw ? (
          <div>
            <label className="block text-xs font-bold text-[var(--text-tertiary)] uppercase tracking-widest mb-3">
              Video Duration
            </label>
            <div className="flex flex-wrap gap-2.5">
              {['15s', '30s', '60s', '90s'].map(dur => (
                <button 
                  key={dur} 
                  type="button"
                  onClick={() => setFormData({...formData, video_duration: dur})} 
                  className={`px-6 py-3 rounded-xl border-2 text-xs font-black uppercase tracking-wider transition-all cursor-pointer relative ${
                    formData.video_duration === dur 
                      ? 'border-[#5438FF] bg-[#F5F0FF] text-[#5438FF] ring-2 ring-[#5438FF]/20 shadow-md shadow-[#5438FF]/10 scale-105' 
                      : 'border-slate-200 text-gray-600 bg-white hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  {dur}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="py-2 text-xs text-[var(--text-primary)] font-medium flex items-start gap-1.5">
            <span className="text-sm leading-none">🚨</span>
            <span className="leading-snug">Duration selector is disabled for <strong>Completely Raw UGC Clips</strong> (creators upload raw unedited video footage).</span>
          </div>
        )}

        {/* MUST DO */}
        <div className="pt-2">
          <label className="flex items-center gap-2 text-xs font-bold text-emerald-400 uppercase tracking-widest mb-3">
            <CheckCircle2 size={16}/> Must DO
          </label>
          {formData.dos?.map((v, i) => (
            <input 
              key={"do"+i} 
              type="text" 
              className="w-full mb-2 bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-xl px-4 py-2.5 text-[var(--text-primary)] focus:border-emerald-500 outline-none text-sm font-medium" 
              placeholder="e.g. Show product texture clearly in natural lighting" 
              value={v} 
              onChange={e => {
                const newDos = [...formData.dos];
                newDos[i] = e.target.value;
                setFormData({...formData, dos: newDos});
              }}
            />
          ))}
          <button 
            type="button" 
            onClick={() => setFormData({...formData, dos: [...formData.dos, ""]})} 
            className="text-emerald-400 text-xs font-bold transition-all hover:text-emerald-300 cursor-pointer"
          >
            + Add Rule
          </button>
        </div>

        {/* MUST NOT DO */}
        <div className="pt-2">
          <label className="flex items-center gap-2 text-xs font-bold text-red-400 uppercase tracking-widest mb-3">
            <AlertCircle size={16}/> Must NOT DO (DON'Ts)
          </label>
          {formData.donts?.map((v, i) => (
            <input 
              key={"dont"+i} 
              type="text" 
              className="w-full mb-2 bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-xl px-4 py-2.5 text-[var(--text-primary)] focus:border-red-500 outline-none text-sm font-medium" 
              placeholder="e.g. Do not mention competitor brand names or prices" 
              value={v} 
              onChange={e => {
                const newDonts = [...formData.donts];
                newDonts[i] = e.target.value;
                setFormData({...formData, donts: newDonts});
              }}
            />
          ))}
          <button 
            type="button" 
            onClick={() => setFormData({...formData, donts: [...formData.donts, ""]})} 
            className="text-red-400 text-xs font-bold transition-all hover:text-red-300 cursor-pointer"
          >
            + Add Rule
          </button>
        </div>

        <div className="flex gap-3 pt-4">
           <button onClick={() => setStep(2)} className="flex-1 bg-[var(--bg-elevated)] hover:bg-[var(--bg-elevated)] text-[var(--text-primary)] font-bold py-3.5 rounded-xl active:scale-95 transition-all border border-[var(--border-default)] cursor-pointer">Back</button>
           <button onClick={() => setStep(4)} className="w-2/3 bg-[var(--violet)] hover:bg-[var(--violet-hover)] text-white font-bold py-3.5 rounded-xl active:scale-95 transition-all shadow-xl cursor-pointer">Next: Budget</button>
        </div>
      </div>
    );
  };

  const Step4 = () => {
    const minBudget = getMinBudget(formData.deliverable_type);

    return (
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
        <div>
          <div className="flex justify-between items-center mb-2">
            <label className="block text-xs font-bold text-[var(--text-tertiary)] uppercase tracking-widest">
              Budget per Video (₹)
            </label>
            <span className="text-[10px] font-bold text-[var(--violet)] uppercase tracking-wider bg-[var(--violet)]/10 px-2.5 py-1 rounded-full border border-[var(--violet)]/20">
              Minimum: ₹{minBudget.toLocaleString()}
            </span>
          </div>

          <div className="flex items-center gap-1.5 mb-2">
            <span className="text-4xl md:text-5xl font-black text-[var(--text-primary)] tracking-tighter">₹</span>
            <input 
              type="number"
              min={minBudget}
              max="500000"
              value={formData.budget === 0 ? '' : formData.budget}
              onChange={e => {
                const val = e.target.value === '' ? 0 : Number(e.target.value);
                setFormData({...formData, budget: val});
              }}
              onBlur={() => {
                if (!formData.budget || formData.budget < minBudget) {
                  setFormData({...formData, budget: minBudget});
                }
              }}
              className="text-4xl md:text-5xl font-black text-[var(--text-primary)] tracking-tighter bg-transparent border-b-2 border-dashed border-[var(--border-default)] focus:border-[var(--violet)] outline-none w-full max-w-[280px]"
            />
          </div>
          <p className="text-xs text-[var(--text-tertiary)] font-medium mb-6">
            Minimum required for {getFormatLabel(formData.deliverable_type)} is ₹{minBudget.toLocaleString()}
          </p>

          <input 
            type="range" 
            min={minBudget} 
            max="50000" 
            step="1" 
            value={formData.budget < minBudget ? minBudget : formData.budget} 
            onChange={e => {
              const val = Number(e.target.value);
              setFormData({...formData, budget: Math.max(val, minBudget)});
            }} 
            className="w-full accent-[var(--violet)]" 
          />
        </div>

        <div className="pt-4">
          <label className="block text-xs font-bold text-[var(--text-tertiary)] uppercase tracking-widest mb-3">
            Number of Creators Needed
          </label>
          <div className="flex gap-2.5">
            {[1, 2, 3, 5, 10].map(num => (
              <button 
                key={num} 
                type="button"
                onClick={() => setFormData({...formData, max_creators: num})} 
                className={`w-12 h-12 rounded-xl border-2 font-black text-sm transition-all cursor-pointer ${
                  formData.max_creators === num 
                    ? 'border-[#5438FF] bg-[#F5F0FF] text-[#5438FF] ring-2 ring-[#5438FF]/20 shadow-md shadow-[#5438FF]/10 scale-105' 
                    : 'border-slate-200 text-gray-600 bg-white hover:border-slate-300'
                }`}
              >
                {num}
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-3 pt-8">
           <button onClick={() => setStep(3)} className="flex-1 bg-[var(--bg-elevated)] hover:bg-[var(--bg-elevated)] text-[var(--text-primary)] font-bold py-3.5 rounded-xl border border-[var(--border-default)] active:scale-95 transition-all cursor-pointer">Back</button>
           <button onClick={() => setStep(5)} className="w-2/3 bg-[var(--violet)] hover:bg-[var(--violet-hover)] text-white font-bold py-3.5 rounded-xl active:scale-95 transition-all shadow-xl cursor-pointer">Review & Pay</button>
        </div>
      </div>
    );
  };

  const Step5 = () => {
    const minBudget = getMinBudget(formData.deliverable_type);
    const finalBudget = Math.max(formData.budget, minBudget);
    const totalEscrow = finalBudget * formData.max_creators;

    return (
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
        <div className="bg-[var(--bg-card)] rounded-3xl p-6 border border-[var(--border-default)] shadow-xl">
          <h3 className="text-xl font-bold text-[var(--text-primary)] mb-1">{formData.title || `Review of ${formData.product_name}`}</h3>
          <p className="text-sm text-[var(--text-tertiary)] mb-6">{formData.product_name}</p>

          <div className="space-y-3 text-sm text-[var(--text-tertiary)] font-medium pb-6 border-b border-[var(--border-default)] mb-6">
            <div className="flex justify-between">
              <span className="text-[var(--text-secondary)] uppercase tracking-widest text-[10px] font-bold">Format</span>
              <span className="uppercase tracking-wider font-bold text-[var(--violet)]">{getFormatLabel(formData.deliverable_type)} · {formData.video_duration}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--text-secondary)] uppercase tracking-widest text-[10px] font-bold">Quantity</span>
              <span className="font-bold">{formData.max_creators} Creator{formData.max_creators > 1 ? 's' : ''}</span>
            </div>
            <div className="flex justify-between text-[var(--text-primary)] font-bold">
              <span className="text-[var(--text-secondary)] uppercase tracking-widest text-[10px] font-bold">Total Budget Escrow</span>
              <span className="text-[var(--violet)] font-black text-lg">₹{totalEscrow.toLocaleString()}</span>
            </div>
          </div>

          <div className="bg-[var(--violet-soft)] border border-[var(--violet-border)] rounded-xl p-4 flex gap-4">
             <div className="mt-1 flex-shrink-0 text-[var(--violet)]"><Check size={20}/></div>
             <div>
               <h4 className="font-bold text-[var(--violet)] text-[11px] uppercase tracking-widest mb-1.5">⚡ Delivery Promise</h4>
               <p className="text-sm text-[var(--violet)]/80 font-medium leading-relaxed">
                 {formData.deliverable_type === 'collaboration_reel' 
                   ? "Creator publishes directly with live link submission. Escrow automatically releases upon live link verification."
                   : "Creator delivers video files via Google Drive link within 24 hours. Brand has full approval before payment release."}
               </p>
             </div>
          </div>
        </div>

        <div className="flex gap-3">
           <button disabled={isSubmitting} onClick={() => setStep(4)} className="bg-[var(--bg-elevated)] hover:bg-[var(--bg-elevated)] text-[var(--text-primary)] font-bold py-3.5 px-6 rounded-xl border border-[var(--border-default)] active:scale-95 transition-all disabled:opacity-50 cursor-pointer">Back</button>
           <button disabled={isSubmitting} onClick={handlePost} className="flex-1 bg-[var(--violet)] hover:bg-[var(--violet-hover)] text-white font-black uppercase tracking-wider py-3.5 rounded-xl active:scale-95 transition-all shadow-[0_0_20px_rgba(124,58,237,0.3)] disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer">
             {isSubmitting ? <span className="animate-pulse">Processing...</span> : "Secure Brief & Pay"}
           </button>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-[calc(100vh-80px)] w-full max-w-[1200px] mx-auto md:py-12 flex flex-col justify-center relative">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-24 items-center">
      {/* LEFT COLUMN: FORM & STEPPER */}
      <div className="w-full flex-col flex h-full justify-center max-w-xl mx-auto lg:mx-0">
        <h1 className="text-3xl font-display font-bold text-[var(--text-primary)] mb-8 tracking-tight">Post UGC Brief</h1>
        {/* Stepper Header */}
        <div className="flex items-center gap-2 w-full mb-10 overflow-hidden">
          {[1,2,3,4,5].map(num => (
            <React.Fragment key={num}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-colors shadow-lg ${step === num ? 'bg-[var(--violet)] text-white' : step > num ? 'bg-white/20 text-[var(--text-primary)]' : 'bg-[var(--bg-elevated)] text-[var(--text-secondary)] border border-[var(--border-default)]'}`}>
                {step > num ? <Check size={14}/> : num}
              </div>
              {num < 5 && <div className={`h-1 flex-1 rounded-full bg-[var(--bg-elevated)] ${step > num ? 'bg-white/20' : ''}`} />}
            </React.Fragment>
          ))}
        </div>

        {step === 1 && Step1()}
        {step === 2 && Step2()}
        {step === 3 && Step3()}
        {step === 4 && Step4()}
        {step === 5 && Step5()}
      </div>

      {/* RIGHT COLUMN: LIVE PREVIEW */}
      <div className="w-full hidden lg:flex justify-center xl:justify-end items-center">
         <div className="w-full max-w-[360px]">
           {/* Brief Live Preview Card - Compact Video Style */}
           <div className="w-full rounded-[2.5rem] overflow-hidden relative shadow-2xl bg-[var(--bg-card)] border border-[var(--border-default)] aspect-[9/16]">
              {/* Fake Video Background */}
              <div className="absolute inset-0 bg-gradient-to-br from-[var(--violet)]/30 border-none to-[#3B82F6]/10 mix-blend-screen opacity-50"></div>
              <div className="absolute inset-0 bg-[var(--bg-card)] opacity-90 -z-10 text-[var(--text-primary)]"></div>
              
              {/* Centered Content */}
              <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center z-10">
                 <Video size={48} className="mx-auto mb-4 text-[var(--text-tertiary)] drop-shadow-xl" strokeWidth={1.5} />
                 <h3 className="text-2xl font-bold text-[var(--text-primary)] mb-3 tracking-tight">{formData.title || `Review of ${formData.product_name || 'Product'}`}</h3>
                 <p className="text-[var(--text-secondary)] text-sm font-medium line-clamp-3 px-4">{formData.product_description || 'Product description goes here'}</p>
              </div>

              {/* Bottom Tags Overlay */}
              <div className="absolute bottom-0 left-0 right-0 p-8 bg-gradient-to-t from-[var(--bg-card)] via-[var(--bg-card)]/80 to-transparent z-20">
                 <div className="flex flex-wrap items-center gap-2 mb-4">
                    <div className="bg-[var(--violet)] text-white px-3.5 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider shadow-[0_0_15px_rgba(124,58,237,0.4)]">
                       {getFormatLabel(formData.deliverable_type)}
                    </div>
                    <div className="bg-[var(--bg-elevated)] border border-[var(--border-default)] text-[var(--text-primary)] px-3.5 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider">
                       {formData.video_duration || 'DURATION'}
                    </div>
                 </div>
                 <div className="flex justify-between items-end mt-2 border-t border-[var(--border-default)] pt-4">
                    <div className="text-[var(--text-primary)] w-full">
                      {step < 4 ? (
                        <>
                          <p className="text-[10px] text-[var(--text-secondary)] font-bold uppercase tracking-widest mb-1">Price level (Per shoot)</p>
                          <div className="flex items-center gap-2 mt-1 animate-pulse">
                            <span className="text-2xl font-bold text-[var(--text-tertiary)]">₹</span>
                            <span className="text-2xl font-bold text-[var(--text-tertiary)]">₹</span>
                            <span className="text-2xl font-bold text-[var(--text-tertiary)]">₹</span>
                            <span className="text-2xl font-bold text-[var(--text-tertiary)]">₹</span>
                            <span className="text-2xl font-bold text-[var(--text-tertiary)]">₹</span>
                          </div>
                        </>
                      ) : (
                        <>
                          <p className="text-[10px] text-[var(--text-secondary)] font-bold uppercase tracking-widest mb-1">Budget</p>
                          <p className="font-display font-black text-2xl tracking-tight">₹{(formData.budget || 0).toLocaleString()}</p>
                        </>
                      )}
                    </div>
                 </div>
              </div>
           </div>
         </div>
      </div>
      </div>
    </div>
  );
}

export default function BrandUGCPost() {
  const isMobile = useIsMobile();
  if (isMobile) {
    return <BrandUGCMobile initialTab="briefs" initialView="post" />;
  }
  return <BrandUGCPostDesktop />;
}

