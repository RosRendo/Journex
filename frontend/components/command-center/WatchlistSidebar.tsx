"use client";

import React, { useState } from "react";
import { Plus, Search, TrendingUp, TrendingDown, Zap, ShieldCheck } from "lucide-react";
import { StrategyProfile } from "./types";

interface WatchlistItem {
  symbol: string;
  name: string;
  price: number;
  changePct: number;
  score: number;
  bias: "LONG" | "SHORT" | "NO_SETUP";
  spread: number;
}

interface Props {
  activeSymbol: string;
  onSelectSymbol: (symbol: string) => void;
  activeStrategy: StrategyProfile;
}

const DEFAULT_WATCHLIST: WatchlistItem[] = [
  { symbol: "XAUUSD", name: "Gold / USD", price: 1842.32, changePct: 0.65, score: 82, bias: "LONG", spread: 1.2 },
  { symbol: "EURUSD", name: "Euro / USD", price: 1.0874, changePct: -0.18, score: 78, bias: "SHORT", spread: 0.8 },
  { symbol: "GBPUSD", name: "Pound / USD", price: 1.2945, changePct: 0.24, score: 54, bias: "NO_SETUP", spread: 1.1 },
  { symbol: "USDJPY", name: "USD / Yen", price: 154.62, changePct: -0.42, score: 86, bias: "SHORT", spread: 0.9 },
  { symbol: "NAS100", name: "Nasdaq 100", price: 19842.10, changePct: 1.12, score: 72, bias: "LONG", spread: 2.0 },
  { symbol: "BTCUSD", name: "Bitcoin / USD", price: 67840.00, changePct: 2.45, score: 68, bias: "LONG", spread: 15.0 },
];

export default function WatchlistSidebar({
  activeSymbol,
  onSelectSymbol,
  activeStrategy,
}: Props) {
  const [items, setItems] = useState<WatchlistItem[]>(DEFAULT_WATCHLIST);
  const [search, setSearch] = useState("");
  const [newPairSymbol, setNewPairSymbol] = useState("");
  const [showAddInput, setShowAddInput] = useState(false);

  const filteredItems = items.filter(
    (i) => i.symbol.toLowerCase().includes(search.toLowerCase()) || i.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleAddPair = () => {
    if (!newPairSymbol.trim()) return;
    const sym = newPairSymbol.trim().toUpperCase();
    if (!items.some((i) => i.symbol === sym)) {
      setItems([
        ...items,
        {
          symbol: sym,
          name: sym,
          price: 100.0,
          changePct: 0.0,
          score: 60,
          bias: "NO_SETUP",
          spread: 1.0,
        },
      ]);
    }
    setNewPairSymbol("");
    setShowAddInput(false);
  };

  return (
    <aside className="w-full lg:w-64 flex flex-col bg-[#0c0c10] border border-white/[0.08] rounded-xl overflow-hidden font-mono text-[11px] shadow-lg">
      
      {/* Sidebar Header */}
      <div className="p-3 border-b border-white/[0.08] bg-[#111116] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-amber-400" />
          <span className="font-bold text-white text-xs uppercase tracking-wider">Watchlist</span>
          <span className="px-1.5 py-0.2 rounded text-[9px] bg-white/10 text-zinc-300">
            {items.length}
          </span>
        </div>
        
        <button
          onClick={() => setShowAddInput(!showAddInput)}
          className="p-1 rounded bg-white/5 hover:bg-white/15 text-zinc-300 hover:text-white transition-colors"
          title="Add Pair"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Search Input */}
      <div className="px-2.5 py-2 border-b border-white/[0.06] bg-black/20">
        <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-white/5 border border-white/10 text-zinc-400">
          <Search className="w-3 h-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search pair..."
            className="w-full bg-transparent text-[10px] text-zinc-200 outline-none placeholder:text-zinc-600 font-sans"
          />
        </div>
      </div>

      {/* Add Pair Field (Expandable) */}
      {showAddInput && (
        <div className="p-2 border-b border-amber-500/20 bg-amber-500/5 flex items-center gap-1.5 animate-in fade-in">
          <input
            type="text"
            value={newPairSymbol}
            onChange={(e) => setNewPairSymbol(e.target.value)}
            placeholder="e.g. US30, ETHUSD"
            className="flex-1 bg-black/50 border border-white/20 rounded px-2 py-1 text-[10px] text-white outline-none"
            onKeyDown={(e) => e.key === "Enter" && handleAddPair()}
          />
          <button
            onClick={handleAddPair}
            className="px-2.5 py-1 rounded bg-amber-500 hover:bg-amber-400 text-black font-bold text-[10px]"
          >
            Add
          </button>
        </div>
      )}

      {/* Pair List */}
      <div className="flex-1 overflow-y-auto divide-y divide-white/[0.04] p-1 space-y-0.5">
        {filteredItems.map((item) => {
          const isActive = activeSymbol.toUpperCase() === item.symbol;
          const isUp = item.changePct >= 0;

          return (
            <button
              key={item.symbol}
              onClick={() => onSelectSymbol(item.symbol)}
              className={`w-full flex items-center justify-between p-2 rounded-lg text-left transition-all ${
                isActive
                  ? "bg-amber-500/10 border border-amber-500/40 text-white shadow-sm"
                  : "hover:bg-white/[0.04] text-zinc-300 border border-transparent"
              }`}
            >
              <div className="flex items-center gap-2">
                {/* Bias Indicator Dot */}
                <div
                  className={`w-2 h-2 rounded-full ${
                    item.bias === "LONG"
                      ? "bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.7)]"
                      : item.bias === "SHORT"
                      ? "bg-rose-400 shadow-[0_0_6px_rgba(251,113,133,0.7)]"
                      : "bg-zinc-500"
                  }`}
                  title={`Setup: ${item.bias}`}
                />
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-white text-[11px]">{item.symbol}</span>
                    <span className="text-[9px] text-zinc-500 font-sans">{item.name}</span>
                  </div>
                  <div className="text-[9px] text-zinc-500">
                    Spread: {item.spread.toFixed(1)}p
                  </div>
                </div>
              </div>

              <div className="text-right">
                <div className="font-bold tabular-nums text-white text-[11px]">
                  {item.price > 100 ? item.price.toLocaleString(undefined, { minimumFractionDigits: 2 }) : item.price.toFixed(4)}
                </div>
                <div className="flex items-center justify-end gap-1 text-[9.5px]">
                  <span
                    className={`font-semibold ${
                      isUp ? "text-emerald-400" : "text-rose-400"
                    }`}
                  >
                    {isUp ? "+" : ""}{item.changePct.toFixed(2)}%
                  </span>
                  <span className={`px-1 py-0.2 rounded font-bold text-[8.5px] ${
                    item.score >= 80 ? "bg-emerald-500/20 text-emerald-300" :
                    item.score >= 70 ? "bg-amber-500/20 text-amber-300" :
                    "bg-zinc-800 text-zinc-400"
                  }`}>
                    {item.score}
                  </span>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Active Strategy Mini Card at bottom of sidebar */}
      <div className="p-3 border-t border-white/[0.08] bg-[#111116]/80 text-[10px]">
        <div className="flex items-center justify-between text-zinc-400 mb-1">
          <span className="uppercase text-[9px] font-bold tracking-wider">Active Model</span>
          <span className="text-amber-400 font-bold">{activeStrategy.name}</span>
        </div>
        <div className="text-zinc-500 text-[9.5px] line-clamp-1 mb-2 font-sans">
          {activeStrategy.description}
        </div>
        <div className="flex items-center justify-between text-[9px] text-zinc-400 pt-1.5 border-t border-white/[0.04]">
          <span>Min Confluence:</span>
          <span className="font-bold text-white">{activeStrategy.minScore}%</span>
        </div>
        <div className="flex items-center justify-between text-[9px] text-zinc-400 mt-0.5">
          <span>Min Risk:Reward:</span>
          <span className="font-bold text-emerald-400">1 : {activeStrategy.minRR}</span>
        </div>
      </div>

    </aside>
  );
}
