"use client";
import React, { useState, useEffect } from "react";
import { BrainCircuit, AlertTriangle, CheckCircle, Info, Loader2 } from "lucide-react";
import { getBackendUrl, fetchWithAuth } from "@/lib/utils";

interface Insight {
  type: "danger" | "warning" | "success" | "info";
  title: string;
  message: string;
}

export function AiCoachWidget() {
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchInsights = async () => {
      try {
        const res = await fetchWithAuth(`${getBackendUrl()}/api/ai/coach`);
        const json = await res.json();
        if (json.success && json.insights) {
          setInsights(json.insights);
        }
      } catch (e) {
        console.error("Failed to fetch AI insights", e);
      } finally {
        setLoading(false);
      }
    };
    
    fetchInsights();
  }, []);

  const getTypeStyles = (type: Insight["type"]) => {
    switch (type) {
      case "danger": return "bg-red-500/10 border-red-500/30 text-red-400";
      case "warning": return "bg-yellow-500/10 border-yellow-500/30 text-yellow-400";
      case "success": return "bg-green-500/10 border-green-500/30 text-green-400";
      case "info":
      default:
        return "bg-blue-500/10 border-blue-500/30 text-blue-400";
    }
  };

  const getIcon = (type: Insight["type"]) => {
    switch (type) {
      case "danger": return <AlertTriangle className="w-5 h-5" />;
      case "warning": return <AlertTriangle className="w-5 h-5" />;
      case "success": return <CheckCircle className="w-5 h-5" />;
      case "info": return <Info className="w-5 h-5" />;
    }
  };

  return (
    <div className="rounded-xl border p-5 flex flex-col h-full bg-[#0c0c0d] border-white/5 shadow-lg relative overflow-hidden group">
      {/* Background glow */}
      <div className="absolute -top-10 -right-10 w-40 h-40 bg-[var(--accent)] opacity-[0.05] blur-[50px] rounded-full pointer-events-none group-hover:opacity-[0.08] transition-opacity duration-1000" />
      
      {/* Header */}
      <div className="flex items-center justify-between mb-5 relative z-10">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full flex items-center justify-center bg-[var(--accent)]/10 border border-[var(--accent)]/20">
            <BrainCircuit className="w-4 h-4 text-[var(--accent)]" />
          </div>
          <div>
            <h3 className="text-[13px] font-bold text-white uppercase tracking-wider">AI Performance Coach</h3>
            <p className="text-[10px] text-gray-500 uppercase tracking-widest mt-0.5">Heuristic Analysis</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col gap-3 overflow-y-auto pr-2 relative z-10 custom-scrollbar">
        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center">
             <Loader2 className="w-6 h-6 text-gray-500 animate-spin mb-2" />
             <p className="text-xs text-gray-500 font-mono">Analyzing recent trades...</p>
          </div>
        ) : insights.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-xs text-gray-500 font-mono">
            No actionable insights found. Keep trading!
          </div>
        ) : (
          insights.map((insight, idx) => (
            <div key={idx} className={`p-4 rounded-lg border flex gap-4 ${getTypeStyles(insight.type)}`}>
              <div className="flex-shrink-0 mt-0.5">
                {getIcon(insight.type)}
              </div>
              <div>
                <h4 className="text-sm font-bold mb-1 tracking-wide">{insight.title}</h4>
                <p className="text-xs opacity-80 leading-relaxed font-medium">
                  {insight.message}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
      
      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.2); }
      `}} />
    </div>
  );
}
