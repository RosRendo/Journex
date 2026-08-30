"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Activity, ArrowRight, AlertTriangle } from "lucide-react";
import { getBackendUrl, fetchWithAuth, getWebSocketUrl } from "@/lib/utils";

interface PairState {
  symbol: string;
  name: string;
  price: number;
  change: number;
  bias: "BULLISH" | "BEARISH" | "NEUTRAL";
  volume: number; // 0-100%
  hasNews: boolean;
}

export function AllPairsGrid() {
  const router = useRouter();
  const [pairs, setPairs] = useState<PairState[]>([
    { symbol: "XAUUSD", name: "Gold / US Dollar", price: 2515.42, change: 0.35, bias: "BULLISH", volume: 85, hasNews: true },
    { symbol: "EURUSD", name: "Euro / US Dollar", price: 1.1082, change: -0.12, bias: "NEUTRAL", volume: 62, hasNews: false },
    { symbol: "GBPUSD", name: "Pound / US Dollar", price: 1.3125, change: 0.18, bias: "BULLISH", volume: 74, hasNews: true },
    { symbol: "USDJPY", name: "US Dollar / Yen", price: 144.35, change: -0.42, bias: "BEARISH", volume: 91, hasNews: false },
    { symbol: "AUDUSD", name: "Aussie / US Dollar", price: 0.6765, change: -0.05, bias: "NEUTRAL", volume: 48, hasNews: false },
    { symbol: "USDCAD", name: "US Dollar / Loonie", price: 1.3485, change: 0.08, bias: "NEUTRAL", volume: 55, hasNews: false },
  ]);

  // Fetch initial change and bias stats on mount
  useEffect(() => {
    fetchWithAuth(`${getBackendUrl()}/api/bridge/api/heatmap`)
      .then(res => res.json())
      .then(json => {
        if (json.success && json.data) {
          setPairs(prev =>
            prev.map(p => {
              const match = json.data.find((item: any) => item.pair.toUpperCase() === p.symbol.toUpperCase());
              if (match) {
                return {
                  ...p,
                  change: match.change24h ?? p.change
                };
              }
              return p;
            })
          );
        }
      }).catch(() => {});
  }, []);

  // Connect to live WebSocket price feeds
  useEffect(() => {
    const wsUrl = getWebSocketUrl("api/ws/prices");
    const socket = new WebSocket(wsUrl);

    socket.onmessage = (event) => {
      try {
        const tick = JSON.parse(event.data);
        if (tick && tick.type === "tick" && tick.symbol) {
          setPairs(prev =>
            prev.map(p => {
              if (p.symbol.toUpperCase() === tick.symbol.toUpperCase()) {
                const mid = tick.mid ?? ((tick.bid + tick.ask) / 2);
                return {
                  ...p,
                  price: mid
                };
              }
              return p;
            })
          );
        }
      } catch (e) {
        // Ignore parse error
      }
    };

    return () => {
      socket.close();
    };
  }, []);

  return (
    <div className="bg-[#101014] border border-[rgba(255,255,255,0.07)] rounded-lg overflow-hidden">
      {/* Title */}
      <div className="px-5 py-3 border-b border-[rgba(255,255,255,0.07)] flex items-center justify-between bg-black/10">
        <span className="text-[9px] uppercase tracking-widest font-bold text-[#71717a] font-mono flex items-center gap-1.5">
          <Activity className="w-3.5 h-3.5 text-[#20e0b2]" /> Multi-Asset Intelligence Matrix
        </span>
        <span className="text-[8px] text-[#71717a] font-mono uppercase">Live MT5 Feed</span>
      </div>

      {/* Grid List */}
      <div className="divide-y divide-[rgba(255,255,255,0.05)]">
        {pairs.map((p) => {
          const isBull = p.bias === "BULLISH";
          const isBear = p.bias === "BEARISH";
          
          return (
            <div 
              key={p.symbol}
              onClick={() => router.push(`/macro/${p.symbol}`)}
              className="flex items-center justify-between px-5 py-3 hover:bg-[rgba(255,255,255,0.02)] transition-colors cursor-pointer group"
            >
              {/* Asset Identifiers */}
              <div className="flex items-center gap-3 w-1/4">
                <div className="w-1.5 h-7 rounded-sm" style={{ background: isBull ? "#20e0b2" : isBear ? "#ff5c73" : "#71717a" }} />
                <div>
                  <div className="text-xs font-mono font-bold text-[#f4f4f5] group-hover:text-[#20e0b2] transition-colors">{p.symbol}</div>
                  <div className="text-[9px] text-[#71717a] font-mono leading-none mt-1">{p.name}</div>
                </div>
              </div>

              {/* Price Quotes */}
              <div className="w-1/5 text-right font-mono">
                <div className="text-[11px] font-black text-[#f4f4f5]">
                  {p.symbol === "XAUUSD" ? p.price.toFixed(2) : p.symbol === "USDJPY" ? p.price.toFixed(3) : p.price.toFixed(5)}
                </div>
                <div className={`text-[8.5px] font-bold mt-0.5 leading-none ${p.change >= 0 ? "text-[#20e0b2]" : "text-[#ff5c73]"}`}>
                  {p.change >= 0 ? "+" : ""}{p.change.toFixed(2)}%
                </div>
              </div>

              {/* Daily Bias Pill */}
              <div className="w-1/6 flex justify-center">
                <span 
                  className={`text-[7.5px] font-black uppercase tracking-wider px-2 py-0.5 rounded-sm font-mono ${
                    isBull 
                      ? "bg-[rgba(32,224,178,0.08)] text-[#20e0b2] border border-[rgba(32,224,178,0.15)]" 
                      : isBear 
                        ? "bg-[rgba(255,92,115,0.08)] text-[#ff5c73] border border-[rgba(255,92,115,0.15)]" 
                        : "bg-[rgba(255,255,255,0.03)] text-[#71717a] border border-[rgba(255,255,255,0.05)]"
                  }`}
                >
                  {p.bias}
                </span>
              </div>

              {/* Volume Index Meter */}
              <div className="w-1/5 hidden md:block">
                <div className="flex justify-between text-[7.5px] text-[#71717a] font-mono mb-1 font-bold">
                  <span>VOL INDEX</span>
                  <span>{p.volume}%</span>
                </div>
                <div className="w-full h-1 bg-zinc-900 rounded-full overflow-hidden border border-[rgba(255,255,255,0.07)]">
                  <div className="h-full bg-zinc-500" style={{ width: `${p.volume}%` }} />
                </div>
              </div>

              {/* Alert & Action */}
              <div className="flex items-center gap-4 justify-end w-12 shrink-0">
                {p.hasNews && (
                  <span title="High impact economic release today">
                    <AlertTriangle className="w-3.5 h-3.5 text-[#f5c451] animate-pulse" />
                  </span>
                )}
                <ArrowRight className="w-3.5 h-3.5 text-[#71717a] group-hover:text-[#20e0b2] group-hover:translate-x-0.5 transition-all" />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
