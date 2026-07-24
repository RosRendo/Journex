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
    if (l.includes("fomo") || l.includes("early")) return <TrendingDown size={14} className="text-[#ff4d6a]" />;
    if (l.includes("size") || l.includes("risk")) return <ShieldAlert size={14} className="text-[#ff4d6a]" />;
    if (l.includes("revenge")) return <AlertTriangle size={14} className="text-[#ff4d6a]" />;
    return <Crosshair size={14} className="text-[#ff4d6a]" />;
  };

  return (
    <div className="rounded-3xl p-6 relative overflow-visible backdrop-blur-xl shadow-2xl border transition-all duration-500 h-full flex flex-col group" 
         style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}>
      
      {/* Background Hover Glow */}
      <div className="absolute inset-0 opacity-[0.01] group-hover:opacity-[0.03] pointer-events-none rounded-3xl transition-opacity duration-1000" 
           style={{ background: "var(--loss)" }} />

      <div className="flex items-center justify-between mb-6 relative z-10">
         <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full flex items-center justify-center bg-[#ff4d6a]/10 border border-[#ff4d6a]/20">
              <AlertOctagon size={16} className="text-[#ff4d6a]" />
            </div>
            <div>
              <h3 className="text-[12px] font-bold uppercase tracking-widest" style={{ color: "var(--text-primary)" }}>Mistake Cost Analyzer</h3>
              <p className="text-[10px] uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>AI Edge Profiling</p>
            </div>
         </div>
         <div className="flex flex-col items-end">
           <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "var(--text-tertiary)" }}>Total Bleed</span>
           <span className="text-lg font-mono font-black text-[#ff4d6a]">
             {loading ? "..." : `-$${totalCost.toFixed(2)}`}
           </span>
         </div>
      </div>
      
      <div className="flex-1 overflow-y-auto pr-2 space-y-3 relative z-10 custom-scrollbar">
        <AnimatePresence>
          {loading ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex justify-center items-center h-full">
              <div className="w-5 h-5 border-2 border-[#ff4d6a] border-t-transparent rounded-full animate-spin" />
            </motion.div>
          ) : mistakes.length === 0 ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center h-full gap-2 opacity-50">
              <AlertOctagon size={24} className="text-[#00c896]" />
              <span className="text-xs font-bold text-[#00c896] uppercase tracking-widest">No Bleed Detected</span>
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
                  className="flex flex-col p-3 rounded-2xl border transition-colors hover:bg-white/[0.02]"
                  style={{ background: "var(--bg-elevated)", borderColor: "var(--border-strong)" }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {getIcon(mistake.tag)}
                      <span className="text-xs font-bold tracking-wide text-white">{mistake.tag}</span>
                    </div>
                    <span className="text-sm font-mono font-bold text-[#ff4d6a]">-${absCost.toFixed(2)}</span>
                  </div>
                  
                  {/* Progress Bar */}
                  <div className="h-1.5 w-full rounded-full overflow-hidden bg-black/40 mb-2">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${percentage}%` }}
                      transition={{ duration: 1, type: "spring" }}
                      className="h-full rounded-full bg-[#ff4d6a]"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono" style={{ color: "var(--text-tertiary)" }}>
                      {mistake.count} {mistake.count === 1 ? 'occurrence' : 'occurrences'}
                    </span>
                    <span className="text-[10px] font-mono" style={{ color: "var(--text-tertiary)" }}>
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
