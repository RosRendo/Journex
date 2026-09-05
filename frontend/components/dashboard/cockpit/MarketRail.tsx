"use client";

import React from "react";
import { TrendingUp, TrendingDown, Minus, Flame, ShieldAlert, Zap } from "lucide-react";
import { motion } from "framer-motion";

export interface MarketItem {
  symbol: string;
  name: string;
  price: number;
  change_pct: number;
  bias: "BULLISH" | "BEARISH" | "NEUTRAL";
  volatility: "LOW" | "NORMAL" | "HIGH" | "EXPANSION";
  spread?: number;
  digits: number;
  hotkey: string;
}

interface MarketRailProps {
  selectedSymbol: string;
  onSelectSymbol: (symbol: string) => void;
  marketData?: Record<string, Partial<MarketItem>>;
}

const DEFAULT_PAIRS: MarketItem[] = [
  { symbol: "EURUSD", name: "Euro / US Dollar", price: 1.16105, change_pct: 0.28, bias: "BEARISH", volatility: "NORMAL", spread: 1.1, digits: 5, hotkey: "1" },
  { symbol: "GBPUSD", name: "British Pound", price: 1.35120, change_pct: 0.12, bias: "BULLISH", volatility: "NORMAL", spread: 1.4, digits: 5, hotkey: "2" },
  { symbol: "XAUUSD", name: "Gold / USD", price: 4424.80, change_pct: 0.84, bias: "BULLISH", volatility: "EXPANSION", spread: 1.8, digits: 2, hotkey: "3" },
  { symbol: "USDJPY", name: "US Dollar / Yen", price: 156.182, change_pct: -0.22, bias: "BEARISH", volatility: "NORMAL", spread: 1.2, digits: 3, hotkey: "4" },
  { symbol: "BTCUSD", name: "Bitcoin / USD", price: 79560.0, change_pct: 2.15, bias: "BULLISH", volatility: "HIGH", spread: 12.0, digits: 1, hotkey: "5" },
];

export const MarketRail: React.FC<MarketRailProps> = ({
  selectedSymbol,
  onSelectSymbol,
  marketData = {},
}) => {
  return (
    <div className="flex flex-col h-full bg-[#101014] border border-[rgba(255,255,255,0.07)] rounded-xl overflow-hidden shadow-2xl">
      {/* Rail Header */}
      <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-[rgba(255,255,255,0.07)] bg-[#141419]/60">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-[#20e0b2] animate-pulse" />
          <span className="text-[10px] font-black uppercase tracking-widest text-[#f4f4f5] font-mono">
            Market Rail
          </span>
        </div>
        <span className="text-[9px] font-bold text-[#71717a] font-mono">
          [1-5] Quick Switch
        </span>
      </div>

      {/* Symbol List */}
      <div className="flex-1 overflow-y-auto divide-y divide-[rgba(255,255,255,0.05)] p-1.5 space-y-1">
        {DEFAULT_PAIRS.map((item) => {
          const live = marketData[item.symbol];
          const price = live?.price ?? item.price;
          const change = live?.change_pct ?? item.change_pct;
          const bias = live?.bias ?? item.bias;
          const isSelected = selectedSymbol === item.symbol;
          const isUp = change >= 0;

          return (
            <motion.button
              key={item.symbol}
              onClick={() => onSelectSymbol(item.symbol)}
              whileHover={{ x: 2 }}
              whileTap={{ scale: 0.99 }}
              className={`w-full text-left p-2.5 rounded-lg transition-all flex flex-col gap-1.5 group relative ${
                isSelected
                  ? "bg-[#20e0b2]/10 border border-[#20e0b2]/40 shadow-[0_0_15px_rgba(32,224,178,0.12)]"
                  : "bg-[#101014]/40 hover:bg-[#141419] border border-transparent hover:border-[rgba(255,255,255,0.07)]"
              }`}
            >
              {/* Top Line: Symbol + Hotkey + Price */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span
                    className={`px-1.5 py-0.5 rounded text-[8px] font-black font-mono tracking-wider border ${
                      isSelected
                        ? "bg-[#20e0b2] text-[#09090b] border-[#20e0b2]"
                        : "bg-[#18181f] text-[#a1a1aa] border-[rgba(255,255,255,0.08)] group-hover:text-white"
                    }`}
                  >
                    {item.hotkey}
                  </span>
                  <span className="text-xs font-black font-mono tracking-tight text-[#f4f4f5] flex items-center gap-1">
                    {item.symbol}
                    {isSelected && (
                      <span className="relative flex h-1.5 w-1.5 ml-0.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#20e0b2] opacity-75" />
                        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[#20e0b2]" />
                      </span>
                    )}
                  </span>
                  {item.volatility === "EXPANSION" && (
                    <span className="flex items-center text-[#f5c451]" title="Expansion Volatility">
                      <Flame className="w-3 h-3 animate-pulse" />
                    </span>
                  )}
                </div>

                {/* Live Price */}
                <span className="text-xs font-black font-mono text-[#f4f4f5]">
                  {price.toFixed(item.digits)}
                </span>
              </div>

              {/* Bottom Line: Bias Pill + Change % + Spread */}
              <div className="flex items-center justify-between text-[10px] font-mono">
                <div className="flex items-center gap-1.5">
                  <span
                    className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider ${
                      bias === "BULLISH"
                        ? "bg-[#20e0b2]/15 text-[#20e0b2]"
                        : bias === "BEARISH"
                        ? "bg-[#ff5c73]/15 text-[#ff5c73]"
                        : "bg-[#71717a]/20 text-[#a1a1aa]"
                    }`}
                  >
                    {bias}
                  </span>
                  {item.spread && (
                    <span className="text-[9px] text-[#71717a]">
                      {item.spread}p
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1 font-bold">
                  {isUp ? (
                    <TrendingUp className="w-3 h-3 text-[#20e0b2]" />
                  ) : (
                    <TrendingDown className="w-3 h-3 text-[#ff5c73]" />
                  )}
                  <span className={isUp ? "text-[#20e0b2]" : "text-[#ff5c73]"}>
                    {isUp ? "+" : ""}
                    {change.toFixed(2)}%
                  </span>
                </div>
              </div>

              {/* Proximity & Confluence Micro-Bar */}
              <div className="w-full flex items-center justify-between gap-2 pt-0.5 border-t border-[rgba(255,255,255,0.03)] text-[8px] font-mono text-[#71717a]">
                <div className="flex items-center gap-1">
                  <span>PROX:</span>
                  <div className="w-16 h-1 bg-[rgba(255,255,255,0.07)] rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full ${
                        item.symbol === "XAUUSD" ? "w-[92%] bg-[#20e0b2]" :
                        item.symbol === "EURUSD" ? "w-[84%] bg-[#f5c451]" :
                        item.symbol === "BTCUSD" ? "w-[86%] bg-[#20e0b2]" : "w-[65%] bg-[#38bdf8]"
                      }`}
                    />
                  </div>
                </div>
                <span className={`font-black ${isSelected ? "text-[#20e0b2]" : "text-[#a1a1aa]"}`}>
                  {item.symbol === "XAUUSD" ? "92% A+" : item.symbol === "EURUSD" ? "84% A" : item.symbol === "BTCUSD" ? "86% A" : "74% B"}
                </span>
              </div>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
};
export default MarketRail;
