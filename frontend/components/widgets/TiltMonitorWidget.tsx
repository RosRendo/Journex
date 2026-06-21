"use client";

import React from "react";
import { BrainCircuit, AlertOctagon } from "lucide-react";

export function TiltMonitorWidget({ trades }: { trades: any[] }) {
  // Analyze last few trades for consecutive losses
  const recentClosed = trades.filter(t => t.profit !== undefined).slice(0, 5);
  let consecutiveLosses = 0;
  for (const t of recentClosed) {
    if (t.profit < 0) consecutiveLosses++;
    else break;
  }

  const tiltProbability = Math.min(100, consecutiveLosses * 33.3);
  const isTilting = tiltProbability >= 66;

  return (
    <div className={`bg-[#0c0c0d]/90 border rounded-xl shadow-lg p-5 h-full flex flex-col transition-all duration-500 ${isTilting ? 'border-red-500/50 shadow-[0_0_20px_rgba(239,68,68,0.15)]' : 'border-white/5'}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
           <BrainCircuit className={`w-5 h-5 ${isTilting ? 'text-red-500' : 'text-purple-500'}`} />
           <h3 className="text-sm font-bold text-gray-200 tracking-wide uppercase">Psychology Monitor</h3>
        </div>
        <span className={`text-xs font-mono font-bold px-2 py-1 rounded ${isTilting ? 'bg-red-500/20 text-red-400' : 'bg-green-500/10 text-green-400'}`}>
           Tilt Risk: {tiltProbability.toFixed(0)}%
        </span>
      </div>

      <div className="flex-1 flex flex-col justify-center items-center text-center">
         {isTilting ? (
           <>
             <AlertOctagon className="w-12 h-12 text-red-500 mb-3 animate-pulse" />
             <h4 className="text-lg font-bold text-white mb-1">High Tilt Probability</h4>
             <p className="text-sm text-gray-400">You have {consecutiveLosses} consecutive losses. The algorithm strongly recommends a 1-hour screen break.</p>
           </>
         ) : (
           <>
             <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center mb-3">
               <BrainCircuit className="w-6 h-6 text-green-500" />
             </div>
             <h4 className="text-lg font-bold text-white mb-1">Clear Mind</h4>
             <p className="text-sm text-gray-400">Trading psychology is stable. Stick to your defined setups.</p>
           </>
         )}
      </div>
    </div>
  );
}
