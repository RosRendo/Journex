"use client";

import React, { useState } from "react";
import { Calculator } from "lucide-react";

export function VisualPositionSizer({ balance }: { balance?: number }) {
  const [riskPct, setRiskPct] = useState(1.0);
  const [stopLossPips, setStopLossPips] = useState(20);

  const currentBalance = balance || 10000; // default to 10k if unconnected
  const riskAmount = currentBalance * (riskPct / 100);
  
  // Standard approximation: 1 lot = $10 per pip for most major pairs
  const pipValuePerLot = 10; 
  const lotSize = stopLossPips > 0 ? riskAmount / (stopLossPips * pipValuePerLot) : 0;

  return (
    <div className="bg-[#0c0c0d]/90 border border-white/5 rounded-xl p-5 h-full flex flex-col">
      <div className="flex items-center gap-2 mb-4">
         <Calculator className="w-5 h-5 text-blue-400" />
         <h3 className="text-sm font-bold text-gray-200 tracking-wide uppercase">Position Sizer</h3>
      </div>

      <div className="space-y-4 flex-1">
         <div>
            <div className="flex justify-between text-xs text-gray-400 font-bold mb-1">
               <label>Risk %</label>
               <span>{riskPct.toFixed(2)}% (${riskAmount.toFixed(2)})</span>
            </div>
            <input 
              type="range" 
              min="0.1" max="5.0" step="0.1" 
              value={riskPct}
              onChange={(e) => setRiskPct(parseFloat(e.target.value))}
              className="w-full accent-blue-500"
            />
         </div>

         <div>
            <div className="flex justify-between text-xs text-gray-400 font-bold mb-1">
               <label>Stop Loss (Pips)</label>
            </div>
            <input 
              type="number" 
              value={stopLossPips}
              onChange={(e) => setStopLossPips(parseFloat(e.target.value))}
              className="w-full bg-[#18181b] border border-white/10 rounded-lg p-2 text-white outline-none focus:border-blue-500/50 font-mono"
            />
         </div>

         <div className="mt-6 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg text-center">
            <span className="text-xs text-blue-400 font-bold uppercase tracking-widest block mb-1">Recommended Lot Size</span>
            <span className="text-3xl font-mono font-bold text-white">{lotSize.toFixed(2)}</span>
            <span className="text-xs text-gray-500 block mt-1">Based on ${currentBalance.toFixed(2)} balance</span>
         </div>
      </div>
    </div>
  );
}

