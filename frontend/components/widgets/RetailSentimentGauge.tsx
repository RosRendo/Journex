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
    <div className="rounded-lg p-5 border flex flex-col h-full bg-[#101014] border-[rgba(255,255,255,0.07)]" >
      
      {loading && (
        <div className="absolute inset-0 z-20 flex justify-center items-center rounded backdrop-blur-sm bg-black/40">
          <Loader2 className="w-4 h-4 animate-spin text-zinc-550" />
        </div>
      )}

      <div className="flex items-center justify-between mb-6 relative z-10 font-mono">
         <div className="flex items-center gap-2">
            <div>
              <h3 className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Retail Sentiment</h3>
              <p className="text-[8px] uppercase tracking-wider text-zinc-650">Order Book Ratios</p>
            </div>
         </div>
         
         {/* Dropdown */}
         <div className="relative">
           <button 
             onClick={() => setShowDropdown(!showDropdown)}
             className="flex items-center gap-1.5 px-2 py-1 rounded text-[10px] font-bold transition-all border border-[rgba(255,255,255,0.07)] bg-[#141419] text-white">
             {symbol} <ChevronDown size={12} />
           </button>
           {showDropdown && (
             <motion.div 
               initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
               className="absolute right-0 mt-2 w-28 rounded border shadow-2xl overflow-hidden z-50 bg-[#101014] border-[rgba(255,255,255,0.07)]">
               {PAIRS.map(p => (
                 <button key={p} 
                   onClick={() => { setSymbol(p); setShowDropdown(false); }}
                   className="w-full text-left px-3 py-1.5 text-[10px] font-bold hover:bg-white/5 transition-colors"
                   style={{ color: p === symbol ? "#20e0b2" : "#71717a" }}>
                   {p}
                 </button>
               ))}
             </motion.div>
           )}
         </div>
      </div>
      
      <div className="flex-1 flex flex-col justify-center gap-6 relative z-10 font-mono">
        <div className="flex justify-between items-end px-2">
          <div className="flex flex-col">
             <span className="text-[9px] font-bold uppercase tracking-widest mb-1 text-zinc-600">Longs</span>
             <span className="text-xl font-mono font-black text-[#20e0b2]">{longPct.toFixed(1)}%</span>
          </div>
          <div className="flex flex-col items-end">
             <span className="text-[9px] font-bold uppercase tracking-widest mb-1 text-zinc-600">Shorts</span>
             <span className="text-xl font-mono font-black text-[#ff5c73]">{shortPct.toFixed(1)}%</span>
          </div>
        </div>

        {/* Bar */}
        <div className="h-3 w-full rounded flex overflow-hidden border border-[rgba(255,255,255,0.07)] bg-[#141419]">
           <motion.div 
             initial={{ width: "50%" }}
             animate={{ width: `${longPct}%` }}
             transition={{ type: "spring", stiffness: 50 }}
             className="h-full relative overflow-hidden bg-[#20e0b2]" 
           />
           <motion.div 
             initial={{ width: "50%" }}
             animate={{ width: `${shortPct}%` }}
             transition={{ type: "spring", stiffness: 50 }}
             className="h-full relative overflow-hidden bg-[#ff5c73]" 
           />
        </div>

        <div className="flex items-center justify-between px-2 pt-2 text-[9px] font-bold text-zinc-600">
           <span>
             Bias: <span className={longPct > 50 ? "text-[#ff5c73]" : "text-[#20e0b2]"}>{longPct > 50 ? "Look for Shorts" : "Look for Longs"}</span>
           </span>
           <span>Source: {source}</span>
        </div>
      </div>
    </div>
  );
}
