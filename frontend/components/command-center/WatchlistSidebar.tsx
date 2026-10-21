"use client";

import React, { useState, useEffect, useRef } from "react";
import { Plus, Search, TrendingUp, TrendingDown, Zap, ShieldCheck, PanelLeftClose } from "lucide-react";
import { StrategyProfile } from "./types";
import { useWebSocket } from "@/components/providers/WebSocketProvider";

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
  onCollapse?: () => void;
  embedded?: boolean;
  activePrice?: number;
}

const DEFAULT_WATCHLIST: WatchlistItem[] = [
  // ── Metals ──────────────────────────────────────────────
  { symbol: "XAUUSD", name: "Gold / USD",      price: 4152.00, changePct:  0.85, score: 82, bias: "LONG",     spread: 1.8 },
  { symbol: "XAGUSD", name: "Silver / USD",    price:   32.50, changePct: -0.40, score: 58, bias: "NO_SETUP", spread: 2.2 },

  // ── Majors ──────────────────────────────────────────────
  { symbol: "EURUSD", name: "EUR / USD",       price:  1.1610, changePct: -0.12, score: 78, bias: "SHORT",    spread: 0.8 },
  { symbol: "GBPUSD", name: "GBP / USD",       price:  1.3510, changePct:  0.18, score: 54, bias: "NO_SETUP", spread: 1.1 },
  { symbol: "USDJPY", name: "USD / JPY",       price: 156.10,  changePct: -0.32, score: 86, bias: "SHORT",    spread: 0.9 },
  { symbol: "AUDUSD", name: "AUD / USD",       price:  0.6550, changePct:  0.22, score: 61, bias: "LONG",     spread: 1.2 },
  { symbol: "NZDUSD", name: "NZD / USD",       price:  0.5890, changePct: -0.08, score: 44, bias: "NO_SETUP", spread: 1.5 },
  { symbol: "USDCHF", name: "USD / CHF",       price:  0.8920, changePct:  0.15, score: 50, bias: "NO_SETUP", spread: 1.0 },
  { symbol: "USDCAD", name: "USD / CAD",       price:  1.3850, changePct:  0.10, score: 55, bias: "NO_SETUP", spread: 1.1 },

  // ── Crosses ─────────────────────────────────────────────
  { symbol: "EURJPY", name: "EUR / JPY",       price: 181.20,  changePct: -0.20, score: 63, bias: "SHORT",    spread: 1.4 },
  { symbol: "AUDJPY", name: "AUD / JPY",       price: 102.30,  changePct:  0.14, score: 48, bias: "NO_SETUP", spread: 1.8 },
  { symbol: "GBPJPY", name: "GBP / JPY",       price: 210.50,  changePct: -0.28, score: 70, bias: "SHORT",    spread: 2.0 },
  { symbol: "EURGBP", name: "EUR / GBP",       price:  0.8590, changePct:  0.05, score: 42, bias: "NO_SETUP", spread: 1.2 },
  { symbol: "GBPCHF", name: "GBP / CHF",       price:  1.2040, changePct:  0.12, score: 46, bias: "NO_SETUP", spread: 1.6 },
  { symbol: "CADCHF", name: "CAD / CHF",       price:  0.6440, changePct: -0.07, score: 38, bias: "NO_SETUP", spread: 1.9 },

  // ── Crypto ──────────────────────────────────────────────
  { symbol: "BTCUSD", name: "Bitcoin / USD",   price: 79500.00, changePct:  1.75, score: 68, bias: "LONG",    spread: 12.0 },
  { symbol: "ETHUSD", name: "Ethereum / USD",  price:  3100.00, changePct:  2.10, score: 62, bias: "LONG",    spread:  5.0 },

  // ── Indices ─────────────────────────────────────────────
  { symbol: "NAS100", name: "Nasdaq 100",      price: 20120.00, changePct:  0.95, score: 72, bias: "LONG",    spread:  2.0 },
  { symbol: "US30",   name: "Dow Jones 30",    price: 42800.00, changePct:  0.40, score: 60, bias: "LONG",    spread:  3.0 },
  { symbol: "US500",  name: "S&P 500",         price:  5680.00, changePct:  0.55, score: 65, bias: "LONG",    spread:  0.5 },
];

export default function WatchlistSidebar({
  activeSymbol,
  onSelectSymbol,
  activeStrategy,
  onCollapse,
  embedded = false,
  activePrice,
}: Props) {
  const [items, setItems] = useState<WatchlistItem[]>(DEFAULT_WATCHLIST);
  const [search, setSearch] = useState("");
  const [newPairSymbol, setNewPairSymbol] = useState("");
  const [showAddInput, setShowAddInput] = useState(false);
  const [flashMap, setFlashMap] = useState<Record<string, "up" | "down">>({});

  const { livePrices } = useWebSocket();

  // 1. Initial real-prices fetch from Terminal Snapshot API
  useEffect(() => {
    let cancelled = false;
    fetch("/api/terminal/snapshot")
      .then((r) => r.json())
      .then((data) => {
        if (cancelled || !data?.watchlist) return;
        setItems((prev) =>
          prev.map((item) => {
            const found = data.watchlist.find(
              (w: any) => w.symbol.replace("/", "").toUpperCase() === item.symbol.replace("/", "").toUpperCase()
            );
            if (found && found.price) {
              return {
                ...item,
                price: found.price,
                changePct:
                  typeof found.change_pips === "number" && found.price > 0
                    ? Number(((found.change_pips / (found.price > 100 ? 100 : 10000)) * 100).toFixed(2))
                    : item.changePct,
              };
            }
            return item;
          })
        );
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  // 2. Real-time Live Price Streaming from WebSocket
  useEffect(() => {
    if (!livePrices || Object.keys(livePrices).length === 0) return;

    setItems((prev) =>
      prev.map((item) => {
        const norm = item.symbol.replace("/", "").toUpperCase();
        const tick = livePrices[norm] || livePrices[item.symbol];
        if (!tick) return item;

        const currentP = tick.mid || tick.bid;
        if (!currentP) return item;

        if (Math.abs(currentP - item.price) > 0.00001) {
          const dir = currentP > item.price ? "up" : "down";
          setFlashMap((f) => ({ ...f, [item.symbol]: dir }));
          setTimeout(() => {
            setFlashMap((f) => {
              const copy = { ...f };
              delete copy[item.symbol];
              return copy;
            });
          }, 600);

          const isJpy    = item.symbol.includes("JPY");
          const isMetal  = ["XAUUSD", "XAGUSD"].includes(item.symbol);
          const isBigNum = ["BTCUSD", "ETHUSD", "NAS100", "US30", "US500"].includes(item.symbol);
          const pipScale = isJpy ? 0.01 : isMetal ? 0.1 : isBigNum ? 1.0 : 0.0001;
          const spread = tick.ask && tick.bid ? Math.abs(tick.ask - tick.bid) / pipScale : item.spread;

          return {
            ...item,
            price: currentP,
            spread: Number(spread.toFixed(1)),
          };
        }
        return item;
      })
    );
  }, [livePrices]);

  // 3. Synchronize Active Symbol Price with parent liveBid immediately
  useEffect(() => {
    if (!activePrice || activePrice <= 0) return;
    setItems((prev) =>
      prev.map((item) => {
        if (item.symbol.toUpperCase() === activeSymbol.toUpperCase() && item.price !== activePrice) {
          const dir = activePrice > item.price ? "up" : "down";
          setFlashMap((f) => ({ ...f, [item.symbol]: dir }));
          setTimeout(() => {
            setFlashMap((f) => {
              const copy = { ...f };
              delete copy[item.symbol];
              return copy;
            });
          }, 600);
          return {
            ...item,
            price: activePrice,
          };
        }
        return item;
      })
    );
  }, [activePrice, activeSymbol]);

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
    <aside
      className={`flex flex-col font-mono text-[11px] overflow-hidden ${
        embedded
          ? "w-full h-full bg-[#09090d] border-none rounded-none shadow-none"
          : "w-full lg:w-64 bg-[#0c0c10] border border-white/[0.08] rounded-xl shadow-lg"
      }`}
    >
      {/* Sidebar Header */}
      <div className="h-10 px-3 border-b border-white/[0.08] bg-[#0c0c11] flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          <span className="font-bold text-white text-[11px] uppercase tracking-wider">Watchlist</span>
          <span className="px-1.5 py-0.2 rounded text-[9px] bg-white/10 text-zinc-400 font-mono">
            {items.length}
          </span>
        </div>
        
        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowAddInput(!showAddInput)}
            className="p-1 rounded bg-white/5 hover:bg-white/15 text-zinc-400 hover:text-white transition-colors"
            title="Add Pair"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
          {onCollapse && (
            <button
              onClick={onCollapse}
              className="p-1 rounded bg-white/5 hover:bg-white/15 text-zinc-400 hover:text-white transition-colors"
              title="Collapse Watchlist"
            >
              <PanelLeftClose className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
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
        <div className="p-2 border-b border-white/10 bg-white/[0.03] flex items-center gap-1.5 animate-in fade-in">
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
            className="px-2.5 py-1 rounded bg-white/20 hover:bg-white/30 text-white font-bold text-[10px]"
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
                  ? "bg-white/[0.09] border border-white/20 text-white shadow-sm"
                  : "hover:bg-white/[0.04] text-zinc-300 border border-transparent"
              }`}
            >
              <div className="flex items-center gap-2">
                {/* Bias Indicator Dot */}
                <div
                  className={`w-1.5 h-1.5 rounded-full ${
                    item.bias === "LONG"
                      ? "bg-emerald-400"
                      : item.bias === "SHORT"
                      ? "bg-rose-400"
                      : "bg-zinc-600"
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
                <div
                  className={`font-bold tabular-nums text-[11px] transition-colors duration-300 ${
                    flashMap[item.symbol] === "up"
                      ? "text-emerald-400"
                      : flashMap[item.symbol] === "down"
                      ? "text-rose-400"
                      : "text-white"
                  }`}
                >
                  {(() => {
                    const sym = item.symbol;
                    if (["BTCUSD", "ETHUSD", "NAS100", "US30", "US500"].includes(sym))
                      return item.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                    if (["XAUUSD"].includes(sym))
                      return item.price.toFixed(2);
                    if (["XAGUSD"].includes(sym))
                      return item.price.toFixed(3);
                    if (sym.includes("JPY"))
                      return item.price.toFixed(3);
                    return item.price.toFixed(4);
                  })()}
                </div>
                <div className="flex items-center justify-end gap-1.5 text-[9.5px]">
                  <span
                    className={`font-semibold tabular-nums ${
                      isUp ? "text-emerald-400" : "text-rose-400"
                    }`}
                  >
                    {isUp ? "+" : ""}{item.changePct.toFixed(2)}%
                  </span>
                  <span className="px-1 py-0.2 rounded font-mono font-medium text-[8.5px] bg-white/[0.05] text-zinc-400 border border-white/[0.05]">
                    {item.score}
                  </span>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Active Strategy Mini Card at bottom of sidebar */}
      <div className="p-3 border-t border-white/[0.08] bg-[#0d0d12] text-[10px]">
        <div className="flex items-center justify-between text-zinc-400 mb-1">
          <span className="uppercase text-[9px] font-bold tracking-wider text-zinc-500">Active Model</span>
          <span className="text-zinc-200 font-bold">{activeStrategy.name}</span>
        </div>
        <div className="text-zinc-500 text-[9.5px] line-clamp-1 mb-2 font-sans">
          {activeStrategy.description}
        </div>
        <div className="flex items-center justify-between text-[9px] text-zinc-400 pt-1.5 border-t border-white/[0.04]">
          <span className="text-zinc-500">Min Confluence:</span>
          <span className="font-bold text-white tabular-nums">{activeStrategy.minScore}%</span>
        </div>
        <div className="flex items-center justify-between text-[9px] text-zinc-400 mt-0.5">
          <span className="text-zinc-500">Min Risk:Reward:</span>
          <span className="font-bold text-zinc-200 tabular-nums">1 : {activeStrategy.minRR}</span>
        </div>
      </div>

    </aside>
  );
}
