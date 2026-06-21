"use client";

import React, { useState, useEffect } from "react";
import { TrendingUp, TrendingDown, Loader2 } from "lucide-react";
import { getBackendUrl } from "@/lib/utils";

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
      const res = await fetch(`${getBackendUrl()}/api/bridge/api/heatmap`);
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
    <div className="bg-[#0c0c0d]/90 border border-white/5 rounded-xl shadow-lg overflow-hidden backdrop-blur">
      <div className="flex flex-wrap items-center gap-1 p-2 min-h-[60px]">
        {loading && <div className="w-full flex justify-center text-gray-500 text-xs"><Loader2 className="w-4 h-4 animate-spin mr-2"/> Syncing with MT5...</div>}
        
        {!loading && data.map((item) => {
          const isPositive = item.change >= 0;
          return (
            <div 
              key={item.pair} 
              className={`flex-1 min-w-[120px] p-2 rounded-lg flex items-center justify-between border ${
                isPositive ? "bg-green-500/10 border-green-500/20" : "bg-red-500/10 border-red-500/20"
              } transition-colors duration-500`}
            >
              <div className="flex flex-col">
                <span className="text-xs font-bold text-gray-200">{item.pair}</span>
                <span className="text-[10px] font-mono text-gray-400">{item.price.toFixed(item.price > 100 ? 2 : 4)}</span>
              </div>
              <div className={`flex items-center gap-1 font-mono text-sm font-bold ${isPositive ? "text-green-400" : "text-red-400"}`}>
                {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                {isPositive ? "+" : ""}{item.change.toFixed(2)}%
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
