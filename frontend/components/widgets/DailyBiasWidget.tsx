"use client";

import React, { useState, useEffect } from "react";
import { Target, Save, CheckCircle2, ChevronRight, PenTool } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { getBackendUrl, fetchWithAuth } from "@/lib/utils";

export function DailyBiasWidget() {
  const [biasText, setBiasText] = useState("");
  const [saved, setSaved] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    fetchWithAuth(`${getBackendUrl()}/api/bridge/api/dailybias`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.bias) {
          setBiasText(data.bias);
        }
      })
      .catch((err) => console.error("Failed to fetch daily bias:", err));
  }, []);

  const handleSave = async () => {
    try {
      await fetchWithAuth(`${getBackendUrl()}/api/bridge/api/dailybias`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bias: biasText }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      console.error("Failed to save daily bias:", err);
    }
  };

  return (
    <div className="rounded-3xl p-6 relative overflow-hidden backdrop-blur-xl shadow-2xl border transition-all duration-500 flex flex-col group" 
         style={{ background: "var(--bg-card)", borderColor: isFocused ? "var(--accent)" : "var(--border)" }}>
      
      {/* Background Hover Glow */}
      <div className="absolute inset-0 opacity-[0.02] group-hover:opacity-[0.05] pointer-events-none rounded-3xl transition-opacity duration-1000" 
           style={{ background: "var(--accent)" }} />

      <div className="flex items-center justify-between mb-4 relative z-10">
         <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full flex items-center justify-center bg-[var(--accent)]/10 border border-[var(--accent)]/20">
              <Target size={16} style={{ color: "var(--accent)" }} />
            </div>
            <div>
              <h3 className="text-[12px] font-bold uppercase tracking-widest" style={{ color: "var(--text-primary)" }}>Daily Bias</h3>
              <p className="text-[10px] uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>Pre-Session Playbook</p>
            </div>
         </div>
         <button 
           onClick={handleSave}
           className="relative flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-bold transition-all border overflow-hidden"
           style={{ 
             background: saved ? "rgba(0,200,150,0.1)" : "var(--bg-elevated)", 
             borderColor: saved ? "rgba(0,200,150,0.3)" : "var(--border-strong)", 
             color: saved ? "#00c896" : "var(--text-primary)" 
           }}
         >
           <AnimatePresence mode="wait">
             {saved ? (
               <motion.div key="saved" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="flex items-center gap-1.5">
                 <CheckCircle2 size={14} /> Saved
               </motion.div>
             ) : (
               <motion.div key="save" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="flex items-center gap-1.5 group-hover:text-[var(--accent)] transition-colors">
                 <Save size={14} /> Update
               </motion.div>
             )}
           </AnimatePresence>
         </button>
      </div>
      
      <div className="flex-1 relative z-10 flex flex-col group/input">
        <div className="absolute top-3 left-3 opacity-50 transition-opacity group-focus-within/input:opacity-100" style={{ color: "var(--accent)" }}>
          <ChevronRight size={16} />
        </div>
        <textarea
          className="flex-1 w-full bg-transparent border border-transparent rounded-2xl resize-none outline-none p-4 pl-9 text-sm leading-relaxed transition-all"
          style={{ 
            color: "var(--text-secondary)", 
            background: isFocused ? "var(--bg-elevated)" : "rgba(0,0,0,0.1)",
            borderColor: isFocused ? "var(--border-strong)" : "transparent"
          }}
          placeholder="E.g. Expecting a sweep of Asia Highs before London open. If we reject 1.2550, looking for shorts down to the 1H Fair Value Gap..."
          value={biasText}
          onChange={(e) => setBiasText(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
        />
        {!biasText && !isFocused && (
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none opacity-40 gap-2">
            <PenTool size={24} style={{ color: "var(--text-tertiary)" }} />
            <span className="text-xs font-mono" style={{ color: "var(--text-tertiary)" }}>Draft your playbook</span>
          </div>
        )}
      </div>
    </div>
  );
}
