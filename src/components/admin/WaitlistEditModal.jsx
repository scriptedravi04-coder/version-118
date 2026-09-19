import React, { useState } from 'react';
import { X, Save, FileText, UserX } from 'lucide-react';
import { api } from '../../lib/api';
import { toast } from 'sonner';

export default function WaitlistEditModal({ item, onClose, onSaveSuccess }) {
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    name: item?.name || item?.company_name || '',
    email: item?.email || '',
    mobile: item?.mobile || item?.phone || '',
    city: item?.city || item?.location || '',
    gender: item?.gender || '',
    social_handle: item?.social_handle || item?.handle || '',
    instagram_link: item?.instagram_link || '',
    followers: item?.followers || 0,
    avg_reach: item?.avg_reach || '',
    charges: item?.charges || '',
    niche: item?.niche || item?.category || '',
    collab_types: Array.isArray(item?.collab_types) 
      ? item.collab_types.join(', ') 
      : (item?.collab_types || ''),
    ugc_rating: item?.ugc_rating || 7,
    sample_links: Array.isArray(item?.sample_links) 
      ? item.sample_links.join('\n') 
      : (item?.sample_links || ''),
    notes: item?.notes || item?.about || '',
    profile_photo_url: item?.profile_photo_url || item?.photo || ''
  });

  const isNotRegistered = item?.is_registered_user === false;

  const handleSubmit = async (e) => {
    e.preventDefault();
    const itemId = item?.id || item?.user_id;
    if (!itemId) return toast.error("Waitlist item ID missing");

    setSaving(true);
    try {
      const payload = {
        name: formData.name,
        email: formData.email,
        mobile: formData.mobile,
        phone: formData.mobile,
        city: formData.city,
        location: formData.city,
        gender: formData.gender,
        social_handle: formData.social_handle,
        handle: formData.social_handle,
        instagram_link: formData.instagram_link,
        followers: Number(formData.followers) || 0,
        avg_reach: formData.avg_reach,
        charges: formData.charges,
        niche: formData.niche,
        category: formData.niche,
        collab_types: formData.collab_types.split(',').map(s => s.trim()).filter(Boolean),
        ugc_rating: Number(formData.ugc_rating) || 7,
        sample_links: formData.sample_links.split('\n').map(s => s.trim()).filter(Boolean),
        notes: formData.notes,
        about: formData.notes,
        profile_photo_url: formData.profile_photo_url,
        photo: formData.profile_photo_url
      };

      const res = await api.patch(`admin/waitlist/${itemId}`, payload);
      if (res.data?.ok) {
        toast.success("Waitlist application updated successfully!");
        if (onSaveSuccess) onSaveSuccess({ ...item, ...payload });
        onClose();
      } else {
        throw new Error(res.data?.error || "Failed to update application");
      }
    } catch (err) {
      toast.error(err.response?.data?.error || err.message || "Error updating waitlist application");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl w-full max-w-2xl my-8 border border-gray-100 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-6 bg-gradient-to-r from-violet-50 via-purple-50 to-white border-b border-gray-100 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[var(--violet)] text-white flex items-center justify-center font-bold">
              <FileText size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-extrabold text-gray-900">Edit Pending Application</h3>
                {isNotRegistered && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                    Not Registered User
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-500 font-medium mt-0.5">Modify questionnaire fields before approving</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-700 hover:bg-white rounded-xl transition-all cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1">Full Name *</label>
              <input 
                type="text"
                required
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[var(--violet)]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1">Email Address *</label>
              <input 
                type="email"
                required
                value={formData.email}
                onChange={e => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[var(--violet)]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1">Contact Mobile Number</label>
              <input 
                type="text"
                value={formData.mobile}
                onChange={e => setFormData({ ...formData, mobile: e.target.value })}
                placeholder="+91 9876543210"
                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[var(--violet)]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1">City / Location</label>
              <input 
                type="text"
                value={formData.city}
                onChange={e => setFormData({ ...formData, city: e.target.value })}
                placeholder="Mumbai, India"
                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[var(--violet)]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1">Gender</label>
              <select 
                value={formData.gender}
                onChange={e => setFormData({ ...formData, gender: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[var(--violet)]"
              >
                <option value="">Select Gender</option>
                <option value="Female">Female</option>
                <option value="Male">Male</option>
                <option value="Non-binary">Non-binary</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1">Instagram Handle</label>
              <input 
                type="text"
                value={formData.social_handle}
                onChange={e => setFormData({ ...formData, social_handle: e.target.value })}
                placeholder="@username"
                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[var(--violet)]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1">Instagram Profile Link</label>
              <input 
                type="text"
                value={formData.instagram_link}
                onChange={e => setFormData({ ...formData, instagram_link: e.target.value })}
                placeholder="https://instagram.com/username"
                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[var(--violet)]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1">Followers Count</label>
              <input 
                type="number"
                value={formData.followers}
                onChange={e => setFormData({ ...formData, followers: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[var(--violet)]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1">Average Reach</label>
              <input 
                type="text"
                value={formData.avg_reach}
                onChange={e => setFormData({ ...formData, avg_reach: e.target.value })}
                placeholder="25K - 50K per reel"
                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[var(--violet)]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1">UGC Video Charge</label>
              <input 
                type="text"
                value={formData.charges}
                onChange={e => setFormData({ ...formData, charges: e.target.value })}
                placeholder="₹3,500 per video"
                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[var(--violet)]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1">Content Niche / Category</label>
              <input 
                type="text"
                value={formData.niche}
                onChange={e => setFormData({ ...formData, niche: e.target.value })}
                placeholder="Fashion & Lifestyle"
                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[var(--violet)]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1">UGC Rating (1 - 10)</label>
              <input 
                type="number"
                min={1}
                max={10}
                value={formData.ugc_rating}
                onChange={e => setFormData({ ...formData, ugc_rating: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[var(--violet)]"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-gray-500 mb-1">Preferred Collab Types (Comma-separated)</label>
              <input 
                type="text"
                value={formData.collab_types}
                onChange={e => setFormData({ ...formData, collab_types: e.target.value })}
                placeholder="UGC Video, Paid Review, Barter Gifting"
                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[var(--violet)]"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-gray-500 mb-1">Sample Work Links (One per line)</label>
              <textarea 
                rows={2}
                value={formData.sample_links}
                onChange={e => setFormData({ ...formData, sample_links: e.target.value })}
                placeholder="https://instagram.com/p/...\nhttps://drive.google.com/..."
                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[var(--violet)]"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-gray-500 mb-1">Additional Notes / Bio</label>
              <textarea 
                rows={2}
                value={formData.notes}
                onChange={e => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Any special notes or bio from creator..."
                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[var(--violet)]"
              />
            </div>
          </div>

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
              className="px-6 py-2.5 bg-[var(--violet)] hover:opacity-90 text-white font-extrabold text-sm rounded-xl transition-all shadow-md flex items-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              {saving ? (
                <span>Saving...</span>
              ) : (
                <>
                  <Save size={16} />
                  <span>Save Application</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
