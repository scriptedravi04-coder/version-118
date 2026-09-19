import React, { useState, useEffect } from 'react';
import { X, Save, AlertCircle, Check, UserX, Loader2, Upload } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { api } from '../../lib/api';
import { toast } from 'sonner';

export default function CreatorProfileEditModal({ creator, onClose, onSaveSuccess }) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  const [formData, setFormData] = useState({
    name: creator?.name || '',
    email: creator?.email || '',
    phone: creator?.phone || creator?.creator_profile?.phone || '',
    photo: creator?.picture || creator?.photo || creator?.creator_profile?.photo || creator?.creator_profile?.picture || '',
    bio: creator?.bio || creator?.creator_profile?.bio || '',
    city: creator?.city || creator?.creator_profile?.city || '',
    state: creator?.state || creator?.creator_profile?.state || '',
    gender: creator?.gender || creator?.creator_profile?.gender || '',
    
    primary_niche: creator?.primary_niche || creator?.category || creator?.creator_profile?.primary_niche || creator?.creator_profile?.category || 'Fashion & Lifestyle',
    sub_categories: Array.isArray(creator?.creator_profile?.sub_categories) 
      ? creator.creator_profile.sub_categories.join(', ') 
      : (creator?.sub_categories || creator?.creator_profile?.sub_categories || ''),
    languages: Array.isArray(creator?.creator_profile?.languages) 
      ? creator.creator_profile.languages.join(', ') 
      : (creator?.languages || creator?.creator_profile?.languages || 'Hindi, English'),
    
    instagram_handle: creator?.instagram_handle || creator?.handle || creator?.creator_profile?.instagram_handle || creator?.creator_profile?.handle || '',
    followers_instagram: creator?.followers_instagram || creator?.followers || creator?.creator_profile?.followers_instagram || creator?.creator_profile?.followers || 0,
    avg_reach: creator?.avg_reach || creator?.creator_profile?.avg_reach || creator?.avg_views_30d || creator?.creator_profile?.avg_views_30d || '',
    youtube: creator?.youtube || creator?.creator_profile?.youtube || '',
    twitter: creator?.twitter || creator?.creator_profile?.twitter || '',
    linkedin: creator?.linkedin || creator?.creator_profile?.linkedin || '',

    rate_reel: creator?.pricing?.reel || creator?.creator_profile?.pricing?.reel || creator?.rate_reel || '',
    rate_story: creator?.pricing?.story || creator?.creator_profile?.pricing?.story || creator?.rate_story || '',
    rate_yt: creator?.pricing?.youtube || creator?.creator_profile?.pricing?.youtube || creator?.rate_yt || '',
    barter_only: creator?.barter_only ?? creator?.creator_profile?.barter_only ?? false,
    work_mode: creator?.work_mode || creator?.creator_profile?.work_mode || 'active',

    creator_type: creator?.creator_type || creator?.creator_profile?.creator_type || 'ugc_creator',
    tier: creator?.tier || creator?.creator_profile?.tier || 'Silver',
    verified: creator?.verified ?? creator?.creator_profile?.verified ?? false,
    profile_status: creator?.profile_status || creator?.creator_profile?.profile_status || 'approved',
    
    portfolio: Array.isArray(creator?.portfolio || creator?.creator_profile?.portfolio)
      ? (creator?.portfolio || creator?.creator_profile?.portfolio).join('\n')
      : (creator?.portfolio || creator?.creator_profile?.portfolio || ''),
    past_brands: Array.isArray(creator?.past_brands || creator?.creator_profile?.past_brands)
      ? (creator?.past_brands || creator?.creator_profile?.past_brands).join(', ')
      : (creator?.past_brands || creator?.creator_profile?.past_brands || ''),
  });

  const isUnclaimed = creator?.is_claimed === false || creator?.creator_profile?.is_claimed === false || creator?.auth_method === 'unclaimed';

  useEffect(() => {
    // Fetch fresh full profile details if available
    const userId = creator?.user_id || creator?.id;
    if (userId) {
      setLoading(true);
      api.get(`admin/users/${userId}/full_profile`)
        .then(res => {
          const cp = res.data?.profile || res.data?.user?.creator_profile || {};
          const u = res.data?.user || {};
          if (cp || u) {
            setFormData(prev => ({
              ...prev,
              name: u.name || cp.name || prev.name,
              email: u.email || cp.email || prev.email,
              phone: cp.phone || u.phone || prev.phone,
              photo: cp.photo || cp.picture || u.picture || prev.photo,
              bio: cp.bio || prev.bio,
              city: cp.city || prev.city,
              state: cp.state || prev.state,
              gender: cp.gender || prev.gender,
              primary_niche: cp.primary_niche || cp.category || prev.primary_niche,
              sub_categories: Array.isArray(cp.sub_categories) ? cp.sub_categories.join(', ') : (cp.sub_categories || prev.sub_categories),
              languages: Array.isArray(cp.languages) ? cp.languages.join(', ') : (cp.languages || prev.languages),
              instagram_handle: cp.instagram_handle || cp.handle || prev.instagram_handle,
              followers_instagram: cp.followers_instagram || cp.followers || prev.followers_instagram,
              youtube: cp.youtube || prev.youtube,
              twitter: cp.twitter || prev.twitter,
              linkedin: cp.linkedin || prev.linkedin,
              rate_reel: cp.rate_reel || cp.rate_card?.reel || prev.rate_reel,
              rate_story: cp.rate_story || cp.rate_card?.story || prev.rate_story,
              rate_yt: cp.rate_yt_video || cp.rate_card?.yt_video || prev.rate_yt,
              barter_only: cp.barter_only ?? prev.barter_only,
              work_mode: cp.work_mode || prev.work_mode,
              creator_type: cp.creator_type || prev.creator_type,
              tier: cp.tier || prev.tier,
              verified: cp.verified ?? prev.verified,
              profile_status: cp.profile_status || prev.profile_status,
              portfolio: Array.isArray(cp.portfolio) ? cp.portfolio.join('\n') : (cp.portfolio || prev.portfolio),
              past_brands: Array.isArray(cp.past_brands) ? cp.past_brands.join(', ') : (cp.past_brands || prev.past_brands),
            }));
          }
        })
        .catch(err => console.warn("Could not load full profile for modal:", err))
        .finally(() => setLoading(false));
    }
  }, [creator]);

  
  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const localUrl = URL.createObjectURL(file);
    setFormData(prev => ({ ...prev, photo: localUrl }));
    setUploadingImage(true);

    try {
      const fileExt = file.name.split('.').pop() || 'jpg';
      const fileName = `profile_${creator?.user_id || Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `${creator?.user_id || 'admin_edit'}/${fileName}`;

      const { error: uploadError } = await supabase.storage.from("avatars").upload(filePath, file, { upsert: true });

      if (uploadError) {
        toast.error("Photo upload failed. Preview saved locally.");
        return;
      }

      const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(filePath);
      setFormData(prev => ({ ...prev, photo: publicUrl }));
      toast.success("Profile photo uploaded!");
    } catch (err) {
      console.error("Image upload error:", err);
      toast.error("Photo upload failed.");
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSubmit = async (e) => {

    e.preventDefault();
    const userId = creator?.user_id || creator?.id;
    if (!userId) return toast.error("User ID missing");

    setSaving(true);
    try {
      const payload = {
        name: formData.name,
        phone: formData.phone,
        photo: formData.photo,
        picture: formData.photo,
        bio: formData.bio,
        city: formData.city,
        state: formData.state,
        gender: formData.gender,
        primary_niche: formData.primary_niche,
        category: formData.primary_niche,
        sub_categories: formData.sub_categories.split(',').map(s => s.trim()).filter(Boolean),
        languages: formData.languages.split(',').map(s => s.trim()).filter(Boolean),
        instagram_handle: formData.instagram_handle,
        handle: formData.instagram_handle,
        followers_instagram: Number(formData.followers_instagram) || 0,
        followers: Number(formData.followers_instagram) || 0,
        avg_reach: formData.avg_reach,
        avg_views_30d: formData.avg_reach,
        youtube: formData.youtube,
        twitter: formData.twitter,
        linkedin: formData.linkedin,
        rate_reel: Number(formData.rate_reel) || 0,
        rate_story: Number(formData.rate_story) || 0,
        rate_yt_video: Number(formData.rate_yt) || 0,
        rate_card: {
          reel: Number(formData.rate_reel) || 0,
          story: Number(formData.rate_story) || 0,
          yt_video: Number(formData.rate_yt) || 0
        },
        barter_only: formData.barter_only,
        work_mode: formData.work_mode,
        creator_type: formData.creator_type,
        tier: formData.tier,
        verified: formData.verified,
        profile_status: formData.profile_status,
        portfolio: formData.portfolio.split('\n').map(s => s.trim()).filter(Boolean),
        past_brands: formData.past_brands.split(',').map(s => s.trim()).filter(Boolean),
      };

      const res = await api.patch(`admin/creators/${userId}`, payload);
      if (res.data?.ok) {
        toast.success("Creator profile updated successfully!");
        if (onSaveSuccess) onSaveSuccess();
        onClose();
      } else {
        throw new Error(res.data?.error || "Failed to update profile");
      }
    } catch (err) {
      toast.error(err.response?.data?.error || err.message || "Error updating creator profile");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl w-full max-w-3xl my-8 border border-gray-100 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-6 bg-gradient-to-r from-purple-50 via-indigo-50 to-white border-b border-gray-100 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-4">
            {formData.photo ? (
              <img src={formData.photo} alt="" className="w-12 h-12 rounded-2xl object-cover border-2 border-white shadow-sm" />
            ) : (
              <div className="w-12 h-12 rounded-2xl bg-[#A855F7] text-white flex items-center justify-center text-lg font-bold">
                {(formData.name || "C").charAt(0).toUpperCase()}
              </div>
            )}
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-extrabold text-gray-900">{formData.name || 'Creator Profile'}</h3>
                {isUnclaimed && (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300 flex items-center gap-1">
                    <UserX size={12} /> Unclaimed Profile
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-500 font-medium mt-0.5">Edit live creator directory profile details</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-700 hover:bg-white rounded-xl transition-all cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {isUnclaimed && (
            <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-3">
              <AlertCircle size={18} className="text-amber-600 shrink-0 mt-0.5" />
              <div className="text-xs text-amber-900 leading-relaxed">
                <strong>Unclaimed Shadow Profile:</strong> This creator was auto-approved from a public waitlist application. The account has not been claimed by a logged-in user yet. You can edit all public details here.
              </div>
            </div>
          )}

          {/* Section 1: Basic Identity & Contact */}
          <div>
            <h4 className="text-xs font-black uppercase tracking-wider text-[#7E22CE] mb-3 pb-1 border-b border-purple-100">
              1. Identity & Contact Details
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">Full Name *</label>
                <input 
                  type="text"
                  required
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#A855F7]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">Email Address (Read-Only)</label>
                <input 
                  type="email"
                  disabled
                  value={formData.email}
                  className="w-full px-3.5 py-2.5 bg-gray-100 border border-gray-200 rounded-xl text-sm font-semibold text-gray-500 cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">Mobile / Phone Number</label>
                <input 
                  type="text"
                  value={formData.phone}
                  onChange={e => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+91 9876543210"
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#A855F7]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">Profile Photo</label>
                <div className="flex items-center gap-4">
                  {formData.photo ? (
                    <img src={formData.photo} alt="Profile" className="w-12 h-12 rounded-xl object-cover border border-gray-200" />
                  ) : (
                    <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center text-gray-400">
                      <UserX size={20} />
                    </div>
                  )}
                  <div className="relative">
                    <button type="button" disabled={uploadingImage} className="px-4 py-2 bg-gray-50 border border-gray-200 text-gray-700 text-sm font-semibold rounded-xl flex items-center gap-2 hover:bg-gray-100 transition disabled:opacity-50">
                      {uploadingImage ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
                      {uploadingImage ? 'Uploading...' : 'Upload Image'}
                    </button>
                    <input 
                      type="file" 
                      accept="image/*" 
                      onChange={handleImageUpload} 
                      disabled={uploadingImage}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed" 
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">City</label>
                <input 
                  type="text"
                  value={formData.city}
                  onChange={e => setFormData({ ...formData, city: e.target.value })}
                  placeholder="Mumbai"
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#A855F7]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">State / Region</label>
                <input 
                  type="text"
                  value={formData.state}
                  onChange={e => setFormData({ ...formData, state: e.target.value })}
                  placeholder="Maharashtra"
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#A855F7]"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-gray-500 mb-1">Bio / Overview</label>
                <textarea 
                  rows={2}
                  value={formData.bio}
                  onChange={e => setFormData({ ...formData, bio: e.target.value })}
                  placeholder="Brief creator bio describing content style and experience..."
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#A855F7]"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Categories & Niche */}
          <div>
            <h4 className="text-xs font-black uppercase tracking-wider text-[#7E22CE] mb-3 pb-1 border-b border-purple-100">
              2. Niche & Language Classification
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">Primary Content Niche</label>
                <select 
                  value={formData.primary_niche}
                  onChange={e => setFormData({ ...formData, primary_niche: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#A855F7]"
                >
                  <option value="Fashion & Lifestyle">Fashion & Lifestyle</option>
                  <option value="Beauty & Personal Care">Beauty & Personal Care</option>
                  <option value="Tech & Electronics">Tech & Electronics</option>
                  <option value="Fitness & Health">Fitness & Health</option>
                  <option value="Food & Culinary">Food & Culinary</option>
                  <option value="Travel & Vlogging">Travel & Vlogging</option>
                  <option value="Gaming & Esports">Gaming & Esports</option>
                  <option value="Education & Finance">Education & Finance</option>
                  <option value="Entertainment & Comedy">Entertainment & Comedy</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">Sub-Categories (Comma-separated)</label>
                <input 
                  type="text"
                  value={formData.sub_categories}
                  onChange={e => setFormData({ ...formData, sub_categories: e.target.value })}
                  placeholder="Skincare, Streetwear, Unboxing"
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#A855F7]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">Languages (Comma-separated)</label>
                <input 
                  type="text"
                  value={formData.languages}
                  onChange={e => setFormData({ ...formData, languages: e.target.value })}
                  placeholder="Hindi, English, Hinglish"
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#A855F7]"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Social & Metrics */}
          <div>
            <h4 className="text-xs font-black uppercase tracking-wider text-[#7E22CE] mb-3 pb-1 border-b border-purple-100">
              3. Social Media & Audience Metrics
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">Instagram Handle</label>
                <input 
                  type="text"
                  value={formData.instagram_handle}
                  onChange={e => setFormData({ ...formData, instagram_handle: e.target.value })}
                  placeholder="@creator_handle"
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#A855F7]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">Instagram Followers Count</label>
                <input 
                  type="number"
                  value={formData.followers_instagram}
                  onChange={e => setFormData({ ...formData, followers_instagram: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#A855F7]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">Average Reach (Reels/Posts)</label>
                <input 
                  type="text"
                  value={formData.avg_reach}
                  onChange={e => setFormData({ ...formData, avg_reach: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#A855F7]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">YouTube Channel URL / Handle</label>
                <input 
                  type="text"
                  value={formData.youtube}
                  onChange={e => setFormData({ ...formData, youtube: e.target.value })}
                  placeholder="youtube.com/@channel"
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#A855F7]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">LinkedIn Profile</label>
                <input 
                  type="text"
                  value={formData.linkedin}
                  onChange={e => setFormData({ ...formData, linkedin: e.target.value })}
                  placeholder="linkedin.com/in/username"
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#A855F7]"
                />
              </div>
            </div>
          </div>

          {/* Section 4: Commercial Pricing & Rates */}
          <div>
            <h4 className="text-xs font-black uppercase tracking-wider text-[#7E22CE] mb-3 pb-1 border-b border-purple-100">
              4. Commercial Rate Card & Pricing
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">Single UGC Reel / Video Rate</label>
                <input 
                  type="text"
                  value={formData.rate_reel}
                  onChange={e => setFormData({ ...formData, rate_reel: e.target.value })}
                  placeholder="₹3,500"
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#A855F7]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">Story Post Rate</label>
                <input 
                  type="text"
                  value={formData.rate_story}
                  onChange={e => setFormData({ ...formData, rate_story: e.target.value })}
                  placeholder="₹1,200"
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#A855F7]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">YouTube Video Rate</label>
                <input 
                  type="text"
                  value={formData.rate_yt}
                  onChange={e => setFormData({ ...formData, rate_yt: e.target.value })}
                  placeholder="₹8,000"
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#A855F7]"
                />
              </div>

              <div className="md:col-span-3 flex items-center gap-3 pt-1">
                <input 
                  type="checkbox"
                  id="barter_only"
                  checked={formData.barter_only}
                  onChange={e => setFormData({ ...formData, barter_only: e.target.checked })}
                  className="w-4 h-4 text-[#A855F7] rounded focus:ring-[#A855F7]"
                />
                <label htmlFor="barter_only" className="text-xs font-bold text-gray-700 cursor-pointer">
                  Open to Barter / Gifting Collaborations (Barter Only)
                </label>
              </div>
            </div>
          </div>

          {/* Section 5: Badges & Status Controls */}
          <div>
            <h4 className="text-xs font-black uppercase tracking-wider text-[#7E22CE] mb-3 pb-1 border-b border-purple-100">
              5. Profile Status & Verification Badges
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">Profile Approval Status</label>
                <select 
                  value={formData.profile_status}
                  onChange={e => setFormData({ ...formData, profile_status: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#A855F7]"
                >
                  <option value="approved">Approved</option>
                  <option value="under_review">Under Review / Pending</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">Creator Tier</label>
                <select 
                  value={formData.tier}
                  onChange={e => setFormData({ ...formData, tier: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#A855F7]"
                >
                  <option value="Silver">Silver</option>
                  <option value="Gold">Gold</option>
                  <option value="Platinum">Platinum</option>
                  <option value="Elite">Elite</option>
                </select>
              </div>

              <div className="flex items-center gap-3 pt-6">
                <input 
                  type="checkbox"
                  id="verified_check"
                  checked={formData.verified}
                  onChange={e => setFormData({ ...formData, verified: e.target.checked })}
                  className="w-4 h-4 text-[#A855F7] rounded focus:ring-[#A855F7]"
                />
                <label htmlFor="verified_check" className="text-xs font-bold text-gray-700 cursor-pointer flex items-center gap-1.5">
                   Mark Profile Verified
                </label>
              </div>

              <div className="md:col-span-3">
                <label className="block text-xs font-bold text-gray-500 mb-1">Portfolio Links (One link per line)</label>
                <textarea 
                  rows={2}
                  value={formData.portfolio}
                  onChange={e => setFormData({ ...formData, portfolio: e.target.value })}
                  placeholder="https://drive.google.com/...\nhttps://instagram.com/p/..."
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#A855F7]"
                />
              </div>
            </div>
          </div>

          {/* Footer buttons inside form */}
          <div className="pt-4 border-t border-gray-100 flex items-center justify-end gap-3 shrink-0">
            <button 
              type="button" 
              onClick={onClose} 
              className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-sm rounded-xl transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              disabled={saving} 
              className="px-6 py-2.5 bg-[#A855F7] hover:bg-[#9333EA] text-white font-extrabold text-sm rounded-xl transition-all shadow-md flex items-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              {saving ? (
                <span>Saving Profile...</span>
              ) : (
                <>
                  <Save size={16} />
                  <span>Save Profile</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
