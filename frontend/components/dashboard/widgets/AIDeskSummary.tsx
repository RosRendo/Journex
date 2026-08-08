"use client";

import React, { useState, useEffect } from "react";
import { Sparkles, ArrowRight, Loader2 } from "lucide-react";
import Link from "next/link";
import { getBackendUrl, fetchWithAuth } from "@/lib/utils";

export function AIDeskSummary({ borderless = false }: { borderless?: boolean }) {
  const [insight, setInsight] = useState<{ title: string; message: string; type: string } | null>(null);
  const [biasText, setBiasText] = useState("Neutral");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetchWithAuth(`${getBackendUrl()}/api/ai/coach`).then(r => r.json()),
      fetchWithAuth(`${getBackendUrl()}/api/bridge/api/dailybias`).then(r => r.json())
    ]).then(([aiData, biasData]) => {
      if (aiData.success && aiData.insights && aiData.insights.length > 0) {
        setInsight(aiData.insights[0]);
      } else {
        setInsight({ title: "Standing By", message: "No immediate threats detected in your recent trading patterns.", type: "success" });
      }
      if (biasData.success && biasData.bias) {
        setBiasText(biasData.bias);
      }
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  const content = (
    <div className="flex-1 flex flex-col justify-center relative z-10 space-y-3 font-mono text-[10px]">
      {loading ? (
        <div className="flex flex-col items-center justify-center flex-1 text-zinc-500 py-6">
           <Loader2 className="w-4 h-4 animate-spin mb-2" />
           <span className="text-[9px] font-bold uppercase tracking-widest">Analyzing Behavior...</span>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between text-[11px]">
             <span className="text-zinc-500 uppercase font-bold text-[9px] tracking-wider">Market Bias</span>
             <span className="font-bold text-white uppercase">{biasText}</span>
          </div>

          <div className="flex items-center justify-between text-[11px]">
             <span className="text-zinc-500 uppercase font-bold text-[9px] tracking-wider">Behavioral Risk</span>
             <span className={`font-bold px-2 py-0.5 rounded text-[10px] ${insight?.type === 'danger' ? 'bg-red-500/10 text-red-400' : insight?.type === 'warning' ? 'bg-amber-500/10 text-amber-400' : 'bg-emerald-500/10 text-emerald-400'}`}>
               {insight?.title || "Monitoring"}
             </span>
          </div>

          <div className="p-3 bg-black/25 border border-zinc-800/40 rounded-lg mt-1 font-sans">
             <p className="text-[9px] font-bold text-emerald-400 uppercase tracking-widest mb-1 font-mono">Recommendation</p>
             <p className="text-xs font-semibold text-zinc-300 leading-relaxed">{insight?.message}</p>
          </div>
        </>
      )}
    </div>
  );

  if (borderless) {
    return content;
  }

  return (
    <div className="bg-[#111118] border border-zinc-800/40 min-h-[200px] flex flex-col shadow-xl overflow-hidden h-full relative group">
      {/* Background glow */}
      <div className="absolute top-0 right-0 w-[200px] h-[200px] bg-emerald-500/5 blur-[60px] rounded-full pointer-events-none group-hover:bg-emerald-500/10 transition-colors" />

      <div className="px-5 py-3 border-b border-zinc-800/40 flex items-center justify-between bg-black/20 relative z-10">
        <div className="flex items-center gap-2">
           <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
           <h2 className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 font-mono">AI Desk</h2>
        </div>
        <Link href="/ai-desk" className="text-[9px] uppercase font-bold tracking-widest text-emerald-400 hover:text-white transition-colors flex items-center font-mono">
          Open Desk <ArrowRight className="w-3 h-3 ml-0.5" />
        </Link>
      </div>

      <div className="p-4 flex-1 flex flex-col justify-center relative z-10">
        {content}
      </div>
    </div>
  );
}
