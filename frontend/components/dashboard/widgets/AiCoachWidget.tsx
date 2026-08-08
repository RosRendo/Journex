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
      case "danger": return "bg-red-500/10 border-red-500/20 text-red-400";
      case "warning": return "bg-amber-500/10 border-amber-500/20 text-amber-400";
      case "success": return "bg-emerald-500/10 border-emerald-500/20 text-emerald-450";
      case "info":
      default:
        return "bg-blue-500/10 border-blue-500/20 text-blue-400";
    }
  };

  const getIcon = (type: Insight["type"]) => {
    switch (type) {
      case "danger": return <AlertTriangle className="w-4 h-4" />;
      case "warning": return <AlertTriangle className="w-4 h-4" />;
      case "success": return <CheckCircle className="w-4 h-4" />;
      case "info": return <Info className="w-4 h-4" />;
    }
  };

  return (
    <div className="rounded-xl border border-zinc-800/40 p-5 flex flex-col h-full bg-[#111118] shadow-xl relative overflow-hidden group font-mono text-[10px]">
      
      {/* Header */}
      <div className="flex items-center justify-between mb-5 relative z-10">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full flex items-center justify-center bg-emerald-500/10 border border-emerald-500/20">
            <BrainCircuit className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">AI Performance Coach</h3>
            <p className="text-[9px] text-zinc-550 uppercase tracking-widest mt-0.5">Heuristic Analysis</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col gap-3 overflow-y-auto pr-2 relative z-10 custom-scrollbar">
        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center">
             <Loader2 className="w-5 h-5 text-zinc-550 animate-spin mb-2" />
             <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider">Analyzing recent trades...</p>
          </div>
        ) : insights.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-zinc-550 italic">
            No actionable insights found. Keep trading!
          </div>
        ) : (
          insights.map((insight, idx) => (
            <div key={idx} className={`p-4 rounded-lg border flex gap-3 ${getTypeStyles(insight.type)}`}>
              <div className="flex-shrink-0 mt-0.5">
                {getIcon(insight.type)}
              </div>
              <div>
                <h4 className="text-xs font-bold mb-1 tracking-wide uppercase">{insight.title}</h4>
                <p className="text-[11px] opacity-90 leading-relaxed font-sans font-medium text-zinc-300">
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
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.05); border-radius: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.1); }
      `}} />
    </div>
  );
}
