"use client";

import React, { useState, useEffect } from "react";
import { AlertOctagon, TrendingDown, Crosshair, AlertTriangle, ShieldAlert } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { getBackendUrl, fetchWithAuth } from "@/lib/utils";

interface Mistake {
  tag: string;
  count: number;
  cost: number;
}

export function MistakeCostAnalyzer() {
  const [mistakes, setMistakes] = useState<Mistake[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchWithAuth(`${getBackendUrl()}/api/bridge/api/mistakes`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.mistakes) {
          // Sort by highest cost first
          setMistakes(data.mistakes.sort((a: Mistake, b: Mistake) => Math.abs(b.cost) - Math.abs(a.cost)));
        }
      })
      .catch((err) => console.error("Failed to fetch mistakes:", err))
      .finally(() => setLoading(false));
  }, []);

  const totalCost = mistakes.reduce((sum, m) => sum + Math.abs(m.cost), 0);
  const maxCost = Math.max(...mistakes.map(m => Math.abs(m.cost)), 1); // Avoid division by zero

  const getIcon = (tag: string) => {
    const l = tag.toLowerCase();
    if (l.includes("fomo") || l.includes("early")) return <TrendingDown size={12} className="text-[#ff5c73]" />;
    if (l.includes("size") || l.includes("risk")) return <ShieldAlert size={12} className="text-[#ff5c73]" />;
    if (l.includes("revenge")) return <AlertTriangle size={12} className="text-[#ff5c73]" />;
    return <Crosshair size={12} className="text-[#ff5c73]" />;
  };

  return (
    <div className="rounded-lg p-5 border flex flex-col h-full bg-[#101014] border-[rgba(255,255,255,0.07)]" >
      <div className="flex items-center justify-between mb-4 font-mono">
         <div className="flex items-center gap-2">
            <div>
              <h3 className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Mistake Cost Analyzer</h3>
              <p className="text-[8px] uppercase tracking-wider text-zinc-650">AI Edge Profiling</p>
            </div>
         </div>
         <div className="flex flex-col items-end">
           <span className="text-[8px] font-bold uppercase tracking-widest text-zinc-600">Total Bleed</span>
           <span className="text-[14px] font-mono font-black text-[#ff5c73]">
             {loading ? "..." : `-$${totalCost.toFixed(2)}`}
           </span>
         </div>
      </div>
      
      <div className="flex-1 overflow-y-auto pr-2 space-y-3 relative z-10 custom-scrollbar">
        <AnimatePresence>
          {loading ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex justify-center items-center h-full">
              <div className="w-4 h-4 border-2 border-[#ff5c73] border-t-transparent rounded-full animate-spin" />
            </motion.div>
          ) : mistakes.length === 0 ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center h-full gap-2 opacity-50">
              <AlertOctagon size={20} className="text-[#20e0b2]" />
              <span className="text-[10px] font-bold text-[#20e0b2] uppercase tracking-widest">No Bleed Detected</span>
            </motion.div>
          ) : (
            mistakes.map((mistake, i) => {
              const absCost = Math.abs(mistake.cost);
              const percentage = (absCost / maxCost) * 100;
              
              return (
                <motion.div 
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1 }}
                  key={mistake.tag} 
                  className="flex flex-col p-3 rounded border transition-colors hover:bg-white/[0.02]"
                  style={{ background: "#141419", borderColor: "rgba(255,255,255,0.07)" }}
                >
                  <div className="flex items-center justify-between mb-2 font-mono">
                    <div className="flex items-center gap-2">
                      {getIcon(mistake.tag)}
                      <span className="text-[10px] font-bold tracking-wide text-white">{mistake.tag}</span>
                    </div>
                    <span className="text-[11px] font-mono font-bold text-[#ff5c73]">-${absCost.toFixed(2)}</span>
                  </div>
                  
                  {/* Progress Bar */}
                  <div className="h-1 w-full rounded overflow-hidden bg-black/40 mb-2">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${percentage}%` }}
                      transition={{ duration: 1, type: "spring" }}
                      className="h-full rounded bg-[#ff5c73]"
                    />
                  </div>
 
                  <div className="flex items-center justify-between font-mono">
                    <span className="text-[8px] text-zinc-550" >
                      {mistake.count} {mistake.count === 1 ? 'occurrence' : 'occurrences'}
                    </span>
                    <span className="text-[8px] text-zinc-550" >
                      Avg: -${(absCost / mistake.count).toFixed(2)}
                    </span>
                  </div>
                </motion.div>
              );
            })
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

