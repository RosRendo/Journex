"use client";

import React, { useEffect, useState } from "react";
import { BrainCircuit, AlertOctagon, Activity } from "lucide-react";

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

  // Animation state for meter
  const [meterValue, setMeterValue] = useState(0);
  useEffect(() => {
    // Delay setting the value for a smooth fill animation on mount
    const timeout = setTimeout(() => setMeterValue(tiltProbability), 100);
    return () => clearTimeout(timeout);
  }, [tiltProbability]);

  // SVG Arc Math
  const radius = 60;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (meterValue / 100) * circumference;

  return (
    <div className={`bg-[#050505] border rounded-2xl shadow-2xl p-6 relative overflow-hidden transition-all duration-1000 group ${isTilting ? 'border-red-500/50 shadow-[0_0_30px_rgba(239,68,68,0.15)]' : 'border-[--border]'}`}>
      
      {/* Dynamic Background Glow */}
      <div className={`absolute top-0 right-0 w-[200px] h-[200px] blur-[80px] rounded-full pointer-events-none transition-colors duration-1000 ${
        isTilting ? 'bg-red-500/10 animate-pulse' : 'bg-purple-500/5'
      }`} />

      {/* Header */}
      <div className="flex items-center justify-between mb-6 relative z-10 border-b border-white/5 pb-4">
        <div className="flex items-center gap-2">
           <Activity className={`w-4 h-4 ${isTilting ? 'text-red-500' : 'text-purple-500'}`} />
           <h3 className="text-xs font-bold text-gray-200 tracking-widest uppercase">Psychology</h3>
        </div>
        <span className={`text-[10px] font-mono font-bold px-2 py-1 rounded-md transition-colors ${isTilting ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-purple-500/10 text-purple-400 border border-purple-500/20'}`}>
           TILT RISK: {tiltProbability.toFixed(0)}%
        </span>
      </div>

      <div className="flex flex-col items-center justify-center relative z-10 pt-2">
        {/* Arc Meter */}
        <div className="relative w-[140px] h-[140px] flex items-center justify-center">
          <svg className="transform -rotate-90 w-[140px] h-[140px]">
            {/* Background Track */}
            <circle
              cx="70"
              cy="70"
              r={radius}
              stroke="rgba(255,255,255,0.05)"
              strokeWidth="12"
              fill="none"
            />
            {/* Active Fill */}
            <circle
              cx="70"
              cy="70"
              r={radius}
              stroke={isTilting ? "#ef4444" : "#a855f7"}
              strokeWidth="12"
              fill="none"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              className="transition-all duration-1000 ease-out"
              style={{ filter: isTilting ? 'drop-shadow(0 0 8px rgba(239,68,68,0.6))' : 'drop-shadow(0 0 6px rgba(168,85,247,0.4))' }}
            />
          </svg>
          
          {/* Center Icon */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            {isTilting ? (
              <AlertOctagon className="w-8 h-8 text-red-500 animate-pulse drop-shadow-[0_0_10px_rgba(239,68,68,0.8)]" />
            ) : (
              <BrainCircuit className="w-8 h-8 text-purple-500 opacity-80" />
            )}
          </div>
        </div>

        {/* Status Text */}
        <div className="text-center mt-6 h-[80px]">
          {isTilting ? (
            <>
              <h4 className="text-sm font-bold text-red-400 mb-2 uppercase tracking-widest">Critical Tension</h4>
              <p className="text-xs text-gray-400 leading-relaxed px-2">You have <strong className="text-red-400">{consecutiveLosses}</strong> consecutive losses. The algorithm strongly recommends a 1-hour screen break.</p>
            </>
          ) : (
            <>
              <h4 className="text-sm font-bold text-purple-400 mb-2 uppercase tracking-widest">Clear Mind</h4>
              <p className="text-xs text-gray-500 leading-relaxed px-2">Trading psychology is stable. Stick to your defined setups.</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

