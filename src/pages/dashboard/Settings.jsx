import React, { useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import CreatorSettings from "../creator/CreatorSettings";
import BrandSettings from "../brand/BrandSettings";
import { api } from "../../lib/api";
import { toast } from "sonner";
import { User, Mail, Shield, Camera, Save, Loader2 } from "lucide-react";

function AdminProfileSettings() {
  const { user, refreshUser } = useAuth();
  const [name, setName] = useState(user?.name || "");
  const [picture, setPicture] = useState(user?.picture || "");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const handleImageUpload = async (file) => {
    if (!file) return;
    setUploading(true);
    const toastId = toast.loading("Uploading image...");
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await api.post("upload?bucket=profile-assets", formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      if (res.data?.url) {
        setPicture(res.data.url);
        toast.success("Profile image uploaded successfully!", { id: toastId });
      } else {
        throw new Error("Invalid response");
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to upload image.", { id: toastId });
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    const toastId = toast.loading("Saving settings...");
    try {
      await api.post("users/profile/update", { name, picture });
      await refreshUser();
      toast.success("Profile updated successfully!", { id: toastId });
    } catch (err) {
      console.error(err);
      toast.error("Failed to update profile.", { id: toastId });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto py-10 px-4">
      <div className="bg-white rounded-3xl border border-slate-100 p-8 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center border border-red-100">
            <Shield className="text-red-500" size={20} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-800">Admin Account Profile</h2>
            <p className="text-xs text-slate-500">Manage your administrative identity on Ybex.</p>
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-6">
          {/* Avatar Section */}
          <div className="flex items-center gap-4">
            <div className="relative">
              {picture ? (
                <img src={picture} alt="" className="w-20 h-20 rounded-full object-cover border border-slate-100" />
              ) : (
                <div className="w-20 h-20 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center text-2xl font-bold">
                  {name.charAt(0).toUpperCase()}
                </div>
              )}
              <label className="absolute bottom-0 right-0 p-1.5 bg-violet-600 hover:bg-violet-700 text-white rounded-full cursor-pointer shadow-md transition-all">
                <Camera size={12} />
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleImageUpload(e.target.files?.[0])}
                  className="hidden"
                  disabled={uploading}
                />
              </label>
            </div>
            <div>
              <span className="text-xs font-semibold text-slate-400 block mb-1">ROLE</span>
              <span className="px-2.5 py-1 bg-red-50 border border-red-100 text-red-600 text-[10px] font-bold rounded-lg tracking-wider uppercase">
                System Administrator
              </span>
            </div>
          </div>

          {/* Form Inputs */}
          <div className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1.5">Full Name</label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 hover:bg-slate-50/50 border border-slate-200/80 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all"
                  required
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1.5">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input
                  type="email"
                  value={user?.email || ""}
                  disabled
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-100/80 border border-slate-200/50 rounded-xl text-sm font-medium text-slate-400 cursor-not-allowed focus:outline-none"
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={saving || uploading}
            className="w-full py-3 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-200 text-white font-bold text-xs rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            {saving ? "Saving Changes..." : "Save Admin Profile"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function Settings() {
  const { user } = useAuth();

  if (user?.role === "brand") {
    return <BrandSettings />;
  }

  if (user?.role === "admin") {
    return <AdminProfileSettings />;
  }

  return <CreatorSettings />;
}
