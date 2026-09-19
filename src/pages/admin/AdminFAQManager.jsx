import React, { useState, useEffect } from "react";
import { safeLower } from "../../utils/safeFormat";
import { supabase } from "../../lib/supabase";
import { Edit2, Trash2, Plus, X, Search } from "lucide-react";
import { toast } from "sonner";

export default function AdminFAQManager() {
  const [faqs, setFaqs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingFaq, setEditingFaq] = useState(null);
  const [search, setSearch] = useState("");

  const [formData, setFormData] = useState({
    title: "",
    content: "",
    category: "payments",
    target_role: "both",
    is_active: true
  });

  useEffect(() => {
    fetchFaqs();
  }, []);

  const fetchFaqs = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("faq_articles")
      .select("*")
      .order("view_count", { ascending: false });
    
    if (error) {
      toast.error("Failed to fetch FAQs");
    } else {
      setFaqs(data || []);
    }
    setLoading(false);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.title || !formData.content) {
      toast.error("Title and content are required");
      return;
    }

    try {
      if (editingFaq) {
        await supabase
          .from("faq_articles")
          .update(formData)
          .eq("id", editingFaq.id);
        toast.success("FAQ updated");
      } else {
        await supabase
          .from("faq_articles")
          .insert({
            id: `faq_${crypto.randomUUID().substring(0,8)}`,
            ...formData,
            view_count: 0
          });
        toast.success("FAQ created");
      }
      
      setIsFormOpen(false);
      setEditingFaq(null);
      fetchFaqs();
    } catch (err) {
      toast.error(err?.response?.data?.error || err?.response?.data?.detail || err?.message || "Failed to save FAQ");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this article?")) return;
    try {
      await supabase.from("faq_articles").delete().eq("id", id);
      toast.success("FAQ deleted");
      fetchFaqs();
    } catch (err) {
      toast.error(err?.response?.data?.error || err?.response?.data?.detail || err?.message || "Failed to delete FAQ");
    }
  };

  const openEdit = (faq) => {
    setEditingFaq(faq);
    setFormData({
      title: faq.title,
      content: faq.content,
      category: faq.category,
      target_role: faq.target_role,
      is_active: faq.is_active
    });
    setIsFormOpen(true);
  };

  const filteredFaqs = faqs?.filter(f => safeLower(f.title).includes(search.toLowerCase()));

  if (isFormOpen) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex justify-between items-center mb-6 border-b border-gray-100 pb-4">
          <h2 className="text-xl font-bold">{editingFaq ? "Edit Article" : "New Article"}</h2>
          <button onClick={() => { setIsFormOpen(false); setEditingFaq(null); }} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({...formData, title: e.target.value})}
              className="w-full border border-gray-300 rounded-lg p-2.5 outline-none focus:border-[var(--violet)]"
              required
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({...formData, category: e.target.value})}
                className="w-full border border-gray-300 rounded-lg p-2.5 outline-none focus:border-[var(--violet)]"
              >
                <option value="payments">Payments & Earnings</option>
                <option value="campaigns">Campaigns & Deals</option>
                <option value="kyc">Profile & KYC</option>
                <option value="trust_safety">Trust & Safety</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Target Role</label>
              <select
                value={formData.target_role}
                onChange={(e) => setFormData({...formData, target_role: e.target.value})}
                className="w-full border border-gray-300 rounded-lg p-2.5 outline-none focus:border-[var(--violet)]"
              >
                <option value="both">Both</option>
                <option value="creator">Creator Only</option>
                <option value="brand">Brand Only</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Content (Supports Markdown format)</label>
            <textarea
              value={formData.content}
              onChange={(e) => setFormData({...formData, content: e.target.value})}
              className="w-full border border-gray-300 rounded-lg p-2.5 h-64 outline-none focus:border-[var(--violet)] resize-y"
              required
            />
          </div>

          <div className="flex items-center space-x-2 pt-2">
            <input
              type="checkbox"
              id="is_active"
              checked={formData.is_active}
              onChange={(e) => setFormData({...formData, is_active: e.target.checked})}
              className="rounded text-[var(--violet)] focus:ring-[var(--violet)]"
            />
            <label htmlFor="is_active" className="text-sm font-medium text-gray-700">Article is active (visible to users)</label>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={() => { setIsFormOpen(false); setEditingFaq(null); }}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-[var(--violet)] text-white rounded-lg hover:bg-purple-700"
            >
              Save Article
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
        <div className="relative max-w-sm w-full">
          <input
            type="text"
            placeholder="Search articles..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg outline-none focus:border-[var(--violet)] text-sm"
          />
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
        </div>
        <button
          onClick={() => {
            setEditingFaq(null);
            setFormData({ title: "", content: "", category: "payments", target_role: "both", is_active: true });
            setIsFormOpen(true);
          }}
          className="flex items-center space-x-1 bg-[var(--violet)] text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-purple-700"
        >
          <Plus className="w-4 h-4" />
          <span>New Article</span>
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 text-gray-500 uppercase text-[10px] tracking-wider border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 font-semibold">Title</th>
              <th className="px-4 py-3 font-semibold">Category</th>
              <th className="px-4 py-3 font-semibold">Target</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 font-semibold text-right">Views</th>
              <th className="px-4 py-3 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredFaqs?.map((faq, faqIdx) => (
              <tr key={faq.id || faqIdx} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-900">{faq.title}</td>
                <td className="px-4 py-3 text-gray-500">{faq.category}</td>
                <td className="px-4 py-3">
                  <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded text-xs">
                    {faq.target_role}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {faq.is_active ? (
                    <span className="text-green-600 font-medium text-xs bg-green-50 px-2 py-1 rounded">Active</span>
                  ) : (
                    <span className="text-gray-500 font-medium text-xs bg-gray-100 px-2 py-1 rounded">Draft</span>
                  )}
                </td>
                <td className="px-4 py-3 text-right text-gray-500">{faq.view_count || 0}</td>
                <td className="px-4 py-3 text-right space-x-2">
                  <button onClick={() => openEdit(faq)} className="text-blue-600 hover:text-blue-800 p-1">
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleDelete(faq.id)} className="text-red-600 hover:text-red-800 p-1">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
            {filteredFaqs.length === 0 && (
              <tr>
                <td colSpan="6" className="text-center py-8 text-gray-500">No articles found</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
