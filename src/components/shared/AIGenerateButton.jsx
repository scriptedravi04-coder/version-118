import React, { useState } from "react";
import GeminiIcon from "./GeminiIcon";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { api } from "../../lib/api";

export default function AIGenerateButton({ prompt, type, onGenerate, className = "", buttonText = "Generate with AI" }) {
  const [loading, setLoading] = useState(false);

  const handleGenerate = async () => {
    if (!prompt || prompt.trim() === "") {
      toast.error("Please provide some initial details to base the generation on.");
      return;
    }
    
    setLoading(true);
    try {
      const { data } = await api.post("ai/suggest", { prompt, type });
      if (data && data.text) {
        onGenerate(data.text);
        toast.success("AI Generation Complete!");
      } else {
        throw new Error("Empty response");
      }
    } catch (error) {
      console.error(error);
      toast.error(error?.response?.data?.error || error?.response?.data?.detail || error?.message || "AI generation failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleGenerate}
      disabled={loading || !prompt}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${loading || !prompt ? "bg-purple-500/10 text-purple-500/50 cursor-not-allowed" : "bg-purple-500/20 text-purple-500 hover:bg-purple-500/30"} ${className}`}
    >
      {loading ? <Loader2 size={14} className="animate-spin" /> : <GeminiIcon className="w-3.5 h-3.5" />}
      {loading ? "Generating..." : buttonText}
    </button>
  );
}
