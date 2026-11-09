"use client";

import React, { useState } from "react";
import { Calculator } from "lucide-react";

export function VisualPositionSizer({ balance }: { balance?: number }) {
  const [riskPct, setRiskPct] = useState(1.0);
  const [stopLossPips, setStopLossPips] = useState(20);
  const [customBalance, setCustomBalance] = useState<number>(10000);

  const hasBrokerBalance = Boolean(balance && balance > 0);
  const currentBalance = hasBrokerBalance ? balance! : customBalance;
  const riskAmount = currentBalance * (riskPct / 100);
  
  // Standard approximation: 1 lot = $10 per pip for most major pairs
  const pipValuePerLot = 10; 
  const lotSize = stopLossPips > 0 ? riskAmount / (stopLossPips * pipValuePerLot) : 0;

  return (
    <div className="bg-[#0c0c0d]/90 border border-white/5 rounded-xl p-5 h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Calculator className="w-5 h-5 text-blue-400" />
          <h3 className="text-sm font-bold text-gray-200 tracking-wide uppercase">Position Sizer</h3>
        </div>
        <span className={`text-[9px] font-mono px-2 py-0.5 rounded border ${
          hasBrokerBalance
            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
            : "bg-amber-500/10 text-amber-400 border-amber-500/20"
        }`}>
          {hasBrokerBalance ? "Broker Sync" : "Manual Input"}
        </span>
      </div>

      {!hasBrokerBalance && (
        <div className="mb-3 p-2 rounded bg-black/40 border border-white/5 flex items-center justify-between text-[11px] font-mono">
          <span className="text-zinc-500">Test Balance:</span>
          <div className="flex items-center gap-1">
            <span className="text-zinc-500">$</span>
            <input
              type="number"
              value={customBalance}
              onChange={(e) => setCustomBalance(Math.max(1, parseFloat(e.target.value) || 0))}
              className="w-24 bg-zinc-900 border border-zinc-700 px-1.5 py-0.5 rounded text-white text-right outline-none"
            />
          </div>
        </div>
      )}

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

