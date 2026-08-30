"use client";

import React, { useState, useEffect } from "react";
import { TrendingUp, TrendingDown, Loader2, Activity } from "lucide-react";
import { getBackendUrl, fetchWithAuth } from "@/lib/utils";

const INITIAL_PAIRS = [
  { pair: "XAUUSD", change: 0, price: 0 },
  { pair: "EURUSD", change: 0, price: 0 },
  { pair: "GBPUSD", change: 0, price: 0 },
  { pair: "USDJPY", change: 0, price: 0 },
  { pair: "AUDUSD", change: 0, price: 0 },
];

export function MarketHeatmapWidget() {
  const [data, setData] = useState(INITIAL_PAIRS);
  const [loading, setLoading] = useState(true);

  const fetchHeatmap = async () => {
    try {
      const res = await fetchWithAuth(`${getBackendUrl()}/api/bridge/api/heatmap`);
      const json = await res.json();
      if (json.success && json.data) {
        // map json.data into expected format
        const formatted = json.data.map((item: any) => ({
          pair: item.pair,
          price: item.price,
          change: item.change24h
        }));
        setData(formatted);
        setLoading(false);
      }
    } catch (e) {
      console.error("Heatmap fetch error:", e);
    }
  };

  useEffect(() => {
    fetchHeatmap();
    const interval = setInterval(fetchHeatmap, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="bg-[#050505] border border-[--border] rounded-lg shadow-2xl overflow-hidden relative group">
      
      {/* Subtle ambient background glow */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent pointer-events-none" />

      {/* Header */}
      <div className="px-5 py-4 flex items-center justify-between border-b border-[--border] bg-white/[0.01]">
        <div className="flex items-center gap-2">
           <Activity className="w-4 h-4 text-gray-400 group-hover:text-white transition-colors duration-500" />
           <h3 className="text-xs font-bold uppercase tracking-widest text-gray-200">Market Heatmap</h3>
        </div>
        {loading && (
          <div className="flex items-center gap-2 text-[10px] uppercase font-bold tracking-widest text-emerald-400 animate-pulse">
            <Loader2 className="w-3 h-3 animate-spin" />
            Syncing
          </div>
        )}
      </div>

      <div className="p-3">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 min-h-[80px]">
          {data.map((item) => {
            const isPositive = item.change >= 0;
            const absChange = Math.abs(item.change);
            
            // Calculate intensity based on change (capped at 1.5% for visual scaling)
            const intensity = Math.min(1, absChange / 1.5);
            
            // Determine exact gradient and border based on polarity and intensity
            const gradientStyle = isPositive
              ? `linear-gradient(135deg, rgba(0, 220, 130, ${0.1 + (intensity * 0.2)}) 0%, rgba(0, 220, 130, ${0.05 + (intensity * 0.1)}) 100%)`
              : `linear-gradient(135deg, rgba(239, 68, 68, ${0.1 + (intensity * 0.2)}) 0%, rgba(239, 68, 68, ${0.05 + (intensity * 0.1)}) 100%)`;

            const borderColor = isPositive
              ? `rgba(0, 220, 130, ${0.2 + (intensity * 0.3)})`
              : `rgba(239, 68, 68, ${0.2 + (intensity * 0.3)})`;

            return (
              <div 
                key={item.pair} 
                className="relative rounded-xl flex flex-col justify-between p-3 overflow-hidden cursor-default transition-all duration-300 hover:scale-[1.02] hover:-translate-y-0.5 hover:shadow-xl group/tile"
                style={{ 
                  background: gradientStyle,
                  borderColor: borderColor,
                  borderWidth: "1px",
                  borderStyle: "solid",
                  boxShadow: `inset 0 1px 1px rgba(255,255,255,0.05), inset 0 -5px 15px rgba(0,0,0,0.2)`
                }}
              >
                {/* Tile Header */}
                <div className="flex items-start justify-between mb-2">
                  <span className="text-xs font-bold text-white tracking-wide">{item.pair}</span>
                  <div className={`flex items-center gap-1 font-mono text-[10px] font-bold ${isPositive ? "text-[--bull]" : "text-[--bear]"}`}>
                    {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                    {isPositive ? "+" : ""}{item.change.toFixed(2)}%
                  </div>
                </div>

                {/* Price */}
                <div className="text-sm font-mono font-medium text-gray-300 group-hover/tile:text-white transition-colors">
                  {item.price.toFixed(item.price > 100 ? 2 : 4)}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}


