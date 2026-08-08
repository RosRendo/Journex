"use client";

import React, { useState, useEffect } from "react";
import { Activity, Target, Zap, ChevronRight } from "lucide-react";
import { getBackendUrl, fetchWithAuth } from "@/lib/utils";

export function MarketWatchWidget({ borderless = false }: { borderless?: boolean }) {
  const [heatmap, setHeatmap] = useState<any[]>([]);
  const [biasText, setBiasText] = useState("Neutral");
  const [bestSignal, setBestSignal] = useState<{ pair: string; type: string } | null>(null);

  useEffect(() => {
    // Fetch Heatmap
    fetchWithAuth(`${getBackendUrl()}/api/bridge/api/heatmap`)
      .then(res => res.json())
      .then(json => {
        if (json.success && json.data) {
          setHeatmap(json.data.slice(0, 3));
        }
      }).catch(() => {});

    // Fetch Bias
    fetchWithAuth(`${getBackendUrl()}/api/bridge/api/dailybias`)
      .then(res => res.json())
      .then(data => {
        if (data.success && data.bias) {
          setBiasText(data.bias);
        }
      }).catch(() => {});

    // Fetch Signals
    fetchWithAuth(`${getBackendUrl()}/api/bridge/api/signals`)
      .then(res => res.json())
      .then(data => {
        if (data.success && data.signals && data.signals.length > 0) {
          setBestSignal({ pair: data.signals[0].symbol, type: data.signals[0].type });
        }
      }).catch(() => {});
  }, []);

  const content = (
    <div className="flex flex-col gap-4 font-mono text-[10px]">
      {/* Bias Section */}
      <div>
        <div className="flex items-center gap-1.5 mb-1.5 text-[9px] text-zinc-500 font-bold uppercase tracking-widest font-mono">
          <Target className="w-3 h-3" /> Daily Bias
        </div>
        <div className="text-xs font-bold text-white bg-black/25 p-2.5 rounded-lg border border-zinc-850 font-mono">
          {biasText || "Pending Market Open..."}
        </div>
      </div>

      {/* Heatmap Section */}
      <div>
        <div className="flex items-center gap-1.5 mb-1.5 text-[9px] text-zinc-500 font-bold uppercase tracking-widest font-mono">
          <Activity className="w-3 h-3" /> Top Movers
        </div>
        <div className="space-y-1.5">
          {heatmap.length > 0 ? heatmap.map((item, i) => (
            <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-black/15 border border-zinc-900/30">
              <span className="font-bold text-xs text-zinc-200 font-mono">#{item.pair}</span>
              <span className={`text-[9px] font-bold px-2 py-0.5 rounded font-mono ${item.change24h >= 0 ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"}`}>
                {item.change24h >= 0 ? "+" : ""}{item.change24h?.toFixed(2)}%
              </span>
            </div>
          )) : (
            <div className="text-xs text-zinc-500 italic p-1 font-mono">Syncing heatmap...</div>
          )}
        </div>
      </div>

      {/* Best Signal */}
      <div className="mt-auto pt-3 border-t border-zinc-800/40">
         <div className="flex items-center gap-1.5 mb-1.5 text-[9px] text-zinc-500 font-bold uppercase tracking-widest font-mono">
           <Zap className="w-3 h-3 text-amber-400" /> Best Signal
         </div>
         <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
               <span className="font-bold text-white text-xs font-mono">#{bestSignal ? bestSignal.pair : "Scanning..."}</span>
               {bestSignal && (
                 <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded font-mono ${bestSignal.type === "BUY" ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"}`}>
                   {bestSignal.type}
                 </span>
               )}
            </div>
            <button className="text-[9px] uppercase font-bold tracking-widest text-amber-400 hover:text-amber-300 flex items-center font-mono">
              Analyze <ChevronRight className="w-3 h-3 ml-0.5" />
            </button>
         </div>
      </div>
    </div>
  );

  if (borderless) {
    return content;
  }

  return (
    <div className="bg-[#111118] border border-zinc-800/40 rounded-xl flex flex-col shadow-xl overflow-hidden h-full">
      <div className="px-5 py-3 border-b border-zinc-800/40 flex items-center justify-between bg-black/20">
        <div className="flex items-center gap-2">
           <Activity className="w-3.5 h-3.5 text-purple-400" />
           <h2 className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 font-mono">Market Watch</h2>
        </div>
      </div>
      <div className="p-4 flex-1 flex flex-col justify-between">
        {content}
      </div>
    </div>
  );
}
