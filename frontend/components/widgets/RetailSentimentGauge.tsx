"use client";

import React, { useState, useEffect } from "react";
import { Users, Loader2, TrendingUp, TrendingDown, ChevronDown } from "lucide-react";
import { motion } from "framer-motion";
import { getBackendUrl, fetchWithAuth } from "@/lib/utils";

const PAIRS = ["XAUUSD", "EURUSD", "GBPUSD", "USDJPY", "US30", "NAS100"];

export function RetailSentimentGauge() {
  const [symbol, setSymbol] = useState("XAUUSD");
  const [longPct, setLongPct] = useState(50);
  const [source, setSource] = useState("AI Trend Analysis");
  const [loading, setLoading] = useState(true);
  const [showDropdown, setShowDropdown] = useState(false);

  const fetchSentiment = async (currentSymbol: string) => {
    setLoading(true);
    try {
      const res = await fetchWithAuth(`${getBackendUrl()}/api/bridge/api/sentiment?symbol=${currentSymbol}`);
      const json = await res.json();
      if (json.success) {
        setLongPct(json.long_pct);
        setSource(json.source || "AI Trend Analysis");
      }
    } catch (e) {
      console.error("Sentiment fetch error:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSentiment(symbol);
    const timer = setInterval(() => fetchSentiment(symbol), 30000); // 30 sec refresh
    return () => clearInterval(timer);
  }, [symbol]);

  const shortPct = 100 - longPct;
  const isExtreme = longPct > 75 || shortPct > 75;

  return (
    <div className="rounded-3xl p-6 relative overflow-visible backdrop-blur-xl shadow-2xl border transition-all duration-500 h-full flex flex-col" 
         style={{ background: "var(--bg-card)", borderColor: isExtreme ? "rgba(255,77,106,0.3)" : "var(--border)" }}>
      
      {loading && (
        <div className="absolute inset-0 z-20 flex justify-center items-center rounded-3xl backdrop-blur-sm" style={{ background: "rgba(12,12,13,0.5)" }}>
          <Loader2 className="w-6 h-6 animate-spin text-gray-500" />
        </div>
      )}
      
      {/* Background Glow */}
      <div className="absolute inset-0 opacity-[0.02] pointer-events-none rounded-3xl transition-colors duration-1000" 
           style={{ background: longPct > 50 ? "var(--bull)" : "var(--bear)" }} />

      <div className="flex items-center justify-between mb-8 relative z-10">
         <div className="flex items-center gap-2">
           <Users size={18} style={{ color: "var(--accent)" }} />
           <h3 className="text-[12px] font-bold uppercase tracking-widest" style={{ color: "var(--text-primary)" }}>Retail Sentiment</h3>
         </div>
         
         {/* Dropdown */}
         <div className="relative">
           <button 
             onClick={() => setShowDropdown(!showDropdown)}
             className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border"
             style={{ background: "var(--bg-elevated)", borderColor: "var(--border-strong)", color: "var(--text-primary)" }}>
             {symbol} <ChevronDown size={14} />
           </button>
           {showDropdown && (
             <motion.div 
               initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
               className="absolute right-0 mt-2 w-32 rounded-xl border shadow-2xl overflow-hidden z-50"
               style={{ background: "var(--bg-card)", borderColor: "var(--border-strong)" }}>
               {PAIRS.map(p => (
                 <button key={p} 
                   onClick={() => { setSymbol(p); setShowDropdown(false); }}
                   className="w-full text-left px-4 py-2 text-xs font-bold hover:bg-white/5 transition-colors"
                   style={{ color: p === symbol ? "var(--accent)" : "var(--text-secondary)" }}>
                   {p}
                 </button>
               ))}
             </motion.div>
           )}
         </div>
      </div>
      
      <div className="flex-1 flex flex-col justify-center gap-6 relative z-10">
        <div className="flex justify-between items-end px-2">
          <div className="flex flex-col">
             <span className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: "var(--text-tertiary)" }}>Longs</span>
             <span className="text-3xl font-mono font-black" style={{ color: "var(--bull)" }}>{longPct.toFixed(1)}%</span>
          </div>
          <div className="flex flex-col items-end">
             <span className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: "var(--text-tertiary)" }}>Shorts</span>
             <span className="text-3xl font-mono font-black" style={{ color: "var(--bear)" }}>{shortPct.toFixed(1)}%</span>
          </div>
        </div>

        {/* Bar */}
        <div className="h-4 w-full rounded-full flex overflow-hidden border shadow-inner" style={{ borderColor: "var(--border-strong)", background: "var(--bg-elevated)" }}>
           <motion.div 
             initial={{ width: "50%" }}
             animate={{ width: `${longPct}%` }}
             transition={{ type: "spring", stiffness: 50 }}
             className="h-full relative overflow-hidden" 
             style={{ background: "var(--bull)" }}>
               <div className="absolute inset-0 opacity-30" style={{ backgroundImage: "linear-gradient(45deg, rgba(255,255,255,0.2) 25%, transparent 25%, transparent 50%, rgba(255,255,255,0.2) 50%, rgba(255,255,255,0.2) 75%, transparent 75%, transparent)", backgroundSize: "20px 20px" }} />
           </motion.div>
           <motion.div 
             initial={{ width: "50%" }}
             animate={{ width: `${shortPct}%` }}
             transition={{ type: "spring", stiffness: 50 }}
             className="h-full relative overflow-hidden" 
             style={{ background: "var(--bear)" }}>
               <div className="absolute inset-0 opacity-30" style={{ backgroundImage: "linear-gradient(45deg, rgba(0,0,0,0.2) 25%, transparent 25%, transparent 50%, rgba(0,0,0,0.2) 50%, rgba(0,0,0,0.2) 75%, transparent 75%, transparent)", backgroundSize: "20px 20px" }} />
           </motion.div>
        </div>

        <div className="flex items-center justify-between px-2 pt-2">
           <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "var(--text-tertiary)" }}>
             Bias: <span style={{ color: longPct > 50 ? "var(--bear)" : "var(--bull)" }}>{longPct > 50 ? "Look for Shorts" : "Look for Longs"}</span>
           </span>
           <span className="text-[10px] font-bold" style={{ color: "var(--text-tertiary)" }}>Source: {source}</span>
        </div>
      </div>
    </div>
  );
}
