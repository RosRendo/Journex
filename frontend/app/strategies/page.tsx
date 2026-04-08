"use client";

import { useCsvTrades } from "@/hooks/useCsvTrades";
import type { TradeData } from "@/hooks/useCsvTrades";
import { useMemo, useState } from "react";
import {
  TrendingUp, TrendingDown, BarChart3, Target, Zap, 
  ChevronDown, ChevronUp, Activity, Trophy, AlertTriangle
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell
} from "recharts";

type SortKey = "totalPnl" | "winRate" | "totalTrades" | "avgWin" | "profitFactor";
type Tab = "pairs" | "direction" | "overview";

export default function Strategies() {
  const { trades, loading } = useCsvTrades();
  const [sortKey, setSortKey] = useState<SortKey>("totalPnl");
  const [sortAsc, setSortAsc] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("pairs");

  const symbolStats = useMemo(() => {
    const map = new Map<string, {
      symbol: string; totalTrades: number; wins: number; losses: number;
      totalPnl: number; sumWin: number; sumLoss: number; streak: number;
      lastOutcome: "W" | "L" | null; currentStreak: number;
    }>();

    [...trades].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .forEach((t: TradeData) => {
        const sym = t.pair;
        if (!map.has(sym)) {
          map.set(sym, { symbol: sym, totalTrades: 0, wins: 0, losses: 0, totalPnl: 0, sumWin: 0, sumLoss: 0, streak: 0, lastOutcome: null, currentStreak: 0 });
        }
        const s = map.get(sym)!;
        s.totalTrades++;
        s.totalPnl += t.profit;
        if (t.profit > 0) {
          s.wins++;
          s.sumWin += t.profit;
          if (s.lastOutcome === "W") s.currentStreak++; else s.currentStreak = 1;
          s.lastOutcome = "W";
        } else {
          s.losses++;
          s.sumLoss += Math.abs(t.profit);
          if (s.lastOutcome === "L") s.currentStreak++; else s.currentStreak = 1;
          s.lastOutcome = "L";
        }
        s.streak = s.currentStreak;
      });

    return Array.from(map.values()).map(s => ({
      ...s,
      winRate: s.totalTrades > 0 ? (s.wins / s.totalTrades) * 100 : 0,
      avgWin: s.wins > 0 ? s.sumWin / s.wins : 0,
      avgLoss: s.losses > 0 ? s.sumLoss / s.losses : 0,
      profitFactor: s.sumLoss > 0 ? s.sumWin / s.sumLoss : s.sumWin > 0 ? 999 : 0,
    }));
  }, [trades]);

  const directionStats = useMemo(() => {
    const long = { trades: 0, wins: 0, losses: 0, pnl: 0, sumWin: 0, sumLoss: 0 };
    const short = { trades: 0, wins: 0, losses: 0, pnl: 0, sumWin: 0, sumLoss: 0 };
    trades.forEach(t => {
      const s = t.direction === "Long" ? long : short;
      s.trades++;
      s.pnl += t.profit;
      if (t.profit > 0) { s.wins++; s.sumWin += t.profit; } else { s.losses++; s.sumLoss += Math.abs(t.profit); }
    });
    return {
      long: { ...long, winRate: long.trades > 0 ? (long.wins / long.trades) * 100 : 0, pf: long.sumLoss > 0 ? long.sumWin / long.sumLoss : 0 },
      short: { ...short, winRate: short.trades > 0 ? (short.wins / short.trades) * 100 : 0, pf: short.sumLoss > 0 ? short.sumWin / short.sumLoss : 0 },
    };
  }, [trades]);

  const sorted = useMemo(() => {
    return [...symbolStats].sort((a, b) => {
      const diff = (a[sortKey] as number) - (b[sortKey] as number);
      return sortAsc ? diff : -diff;
    });
  }, [symbolStats, sortKey, sortAsc]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc(a => !a);
    else { setSortKey(key); setSortAsc(false); }
  };

  const SortIcon = ({ col }: { col: SortKey }) =>
    sortKey === col ? (sortAsc ? <ChevronUp className="w-3 h-3 inline ml-1" /> : <ChevronDown className="w-3 h-3 inline ml-1" />) : null;

  const maxPnlAbs = Math.max(...symbolStats.map(s => Math.abs(s.totalPnl)), 1);
  const bestPair = [...symbolStats].sort((a, b) => b.totalPnl - a.totalPnl)[0];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex flex-col items-center gap-4 text-gray-500">
          <Activity className="w-8 h-8 animate-spin" />
          <p className="text-sm uppercase tracking-widest font-bold">Loading Strategy Data...</p>
        </div>
      </div>
    );
  }

  const customTooltip = ({ active, payload, label }: any) => {
    if (active && payload?.length) {
      const v = payload[0].value as number;
      return (
        <div className="bg-[#0c0c0d] border border-white/10 rounded-lg p-3 shadow-xl text-xs">
          <p className="text-gray-400 mb-1 font-bold">{label}</p>
          <p className={`font-mono font-bold ${v >= 0 ? "text-[--bull]" : "text-[--bear]"}`}>
            {v >= 0 ? "+" : ""}${v.toFixed(2)}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-8 pb-12 text-[--text-primary] relative">
      {/* Ambient */}
      <div className="fixed top-[-10%] left-[-5%] w-[500px] h-[500px] bg-[--accent]/5 rounded-full blur-[120px] pointer-events-none" />

      {/* Header */}
      <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-white flex items-center gap-3" style={{ fontFamily: "'Syne', sans-serif" }}>
            <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-purple-400" />
            </div>
            Strategy Performance
          </h1>
          <p className="text-sm mt-2 text-[--text-secondary]">
            {symbolStats.length} pairs analyzed · {trades.length} trades total
          </p>
        </div>

        {/* Tabs */}
        <div className="flex p-1 rounded-xl bg-white/5 border border-white/10 gap-1">
          {(["pairs", "direction", "overview"] as Tab[]).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
                activeTab === tab ? "bg-white/10 text-white shadow" : "text-gray-500 hover:text-gray-300"
              }`}>
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Best Pair Banner */}
      {bestPair && (
        <div className={`p-5 rounded-xl border flex items-center gap-5 ${
          bestPair.totalPnl >= 0 ? "bg-[--bull]/5 border-[--bull]/20" : "bg-[--bear]/5 border-[--bear]/20"
        }`}>
          <div className="w-12 h-12 rounded-xl bg-[--accent]/20 flex items-center justify-center flex-shrink-0">
            <Trophy className="w-6 h-6 text-[--accent]" />
          </div>
          <div className="flex-1">
            <div className="text-[10px] uppercase tracking-widest font-bold text-gray-400 mb-1">Top Performing Pair</div>
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-xl font-black text-white">{bestPair.symbol}</span>
              <span className={`text-lg font-bold font-mono ${bestPair.totalPnl >= 0 ? "text-[--bull]" : "text-[--bear]"}`}>
                {bestPair.totalPnl >= 0 ? "+" : ""}${bestPair.totalPnl.toFixed(2)}
              </span>
              <span className="text-xs text-gray-400 border border-white/10 rounded px-2 py-0.5">
                {bestPair.winRate.toFixed(1)}% WR · {bestPair.totalTrades} trades · PF {bestPair.profitFactor.toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* PAIRS TAB */}
      {activeTab === "pairs" && (
        <div className="rounded-xl border border-[--border] bg-[--bg-card] overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead style={{ backgroundColor: "rgba(255,255,255,0.03)" }}>
                <tr className="text-[10px] uppercase font-bold text-gray-500 tracking-wider border-b border-[--border]">
                  <th className="px-6 py-4">Pair</th>
                  <th className="px-5 py-4 cursor-pointer hover:text-white" onClick={() => toggleSort("totalTrades")}>Trades<SortIcon col="totalTrades" /></th>
                  <th className="px-5 py-4 cursor-pointer hover:text-white" onClick={() => toggleSort("winRate")}>Win Rate<SortIcon col="winRate" /></th>
                  <th className="px-5 py-4 cursor-pointer hover:text-white" onClick={() => toggleSort("avgWin")}>Avg Win<SortIcon col="avgWin" /></th>
                  <th className="px-5 py-4">Avg Loss</th>
                  <th className="px-5 py-4 cursor-pointer hover:text-white" onClick={() => toggleSort("profitFactor")}>Prof. Factor<SortIcon col="profitFactor" /></th>
                  <th className="px-5 py-4">Streak</th>
                  <th className="px-6 py-4 cursor-pointer hover:text-white" onClick={() => toggleSort("totalPnl")}>Net P&L<SortIcon col="totalPnl" /></th>
                </tr>
              </thead>
              <tbody>
                {sorted.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-16 text-center text-gray-500">
                      <BarChart3 className="w-8 h-8 opacity-20 mx-auto mb-3" />
                      <p className="text-xs uppercase tracking-widest font-bold">No trade data yet</p>
                    </td>
                  </tr>
                ) : sorted.map((s, i) => (
                  <tr key={s.symbol} className={`border-b border-[--border] hover:bg-white/[0.02] transition-colors ${
                    s.totalPnl >= 0 ? "border-l-2 border-l-[--bull]" : "border-l-2 border-l-[--bear]"
                  }`}>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <span className="text-[10px] text-gray-600 w-5 font-mono">#{i + 1}</span>
                        <div>
                          <div className="font-bold text-white">{s.symbol}</div>
                          <div className="text-[10px] text-gray-500">{s.wins}W / {s.losses}L</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 font-mono text-gray-300">{s.totalTrades}</td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-20 h-1.5 bg-white/5 rounded-full overflow-hidden">
                          <div className="h-full bg-[--bull] rounded-full" style={{ width: `${Math.min(s.winRate, 100)}%` }} />
                        </div>
                        <span className={`text-xs font-bold font-mono ${s.winRate >= 50 ? "text-[--bull]" : "text-[--bear]"}`}>
                          {s.winRate.toFixed(1)}%
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-4 font-mono text-[--bull] text-xs">+${s.avgWin.toFixed(2)}</td>
                    <td className="px-5 py-4 font-mono text-[--bear] text-xs">-${s.avgLoss.toFixed(2)}</td>
                    <td className="px-5 py-4">
                      <span className={`px-2 py-0.5 rounded text-xs font-bold border ${
                        s.profitFactor >= 2 ? "bg-[--bull]/10 border-[--bull]/30 text-[--bull]" :
                        s.profitFactor >= 1 ? "bg-yellow-500/10 border-yellow-500/30 text-yellow-400" :
                        "bg-[--bear]/10 border-[--bear]/30 text-[--bear]"
                      }`}>{s.profitFactor === 999 ? "∞" : s.profitFactor.toFixed(2)}</span>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        s.lastOutcome === "W" ? "bg-[--bull]/10 text-[--bull]" : "bg-[--bear]/10 text-[--bear]"
                      }`}>
                        {s.lastOutcome === "W" ? "↑" : "↓"} {s.streak}x
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex-1 max-w-[80px] h-2 bg-white/5 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${s.totalPnl >= 0 ? "bg-[--bull]" : "bg-[--bear]"}`}
                            style={{ width: `${(Math.abs(s.totalPnl) / maxPnlAbs) * 100}%` }} />
                        </div>
                        <span className={`text-sm font-bold font-mono ${s.totalPnl >= 0 ? "text-[--bull]" : "text-[--bear]"}`}>
                          {s.totalPnl >= 0 ? "+" : ""}${s.totalPnl.toFixed(2)}
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* DIRECTION TAB */}
      {activeTab === "direction" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[
            { label: "Long / Buy", data: directionStats.long, icon: TrendingUp, color: "--bull", bg: "bg-[--bull]/10", border: "border-[--bull]/20" },
            { label: "Short / Sell", data: directionStats.short, icon: TrendingDown, color: "--bear", bg: "bg-[--bear]/10", border: "border-[--bear]/20" },
          ].map(({ label, data, icon: Icon, color, bg, border }) => (
            <div key={label} className={`rounded-xl border ${border} ${bg} p-6 space-y-5`}>
              <div className="flex items-center gap-3">
                <Icon className={`w-5 h-5 text-[${color}]`} />
                <h3 className="text-sm font-bold uppercase tracking-widest text-white">{label}</h3>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { label: "Trades", value: data.trades, mono: true },
                  { label: "Win Rate", value: `${data.winRate.toFixed(1)}%`, mono: true },
                  { label: "Net P&L", value: `${data.pnl >= 0 ? "+" : ""}$${data.pnl.toFixed(2)}`, mono: true },
                  { label: "Prof. Factor", value: data.pf.toFixed(2), mono: true },
                ].map(item => (
                  <div key={item.label} className="bg-white/5 rounded-lg p-3">
                    <div className="text-[10px] uppercase tracking-wider text-gray-400 mb-1">{item.label}</div>
                    <div className={`text-lg font-bold ${item.mono ? "font-mono" : ""} text-white`}>{item.value}</div>
                  </div>
                ))}
              </div>
              <div>
                <div className="flex justify-between text-[10px] text-gray-500 mb-1.5">
                  <span>{data.wins} Wins</span><span>{data.losses} Losses</span>
                </div>
                <div className="w-full h-2.5 bg-white/5 rounded-full overflow-hidden flex">
                  <div className="h-full bg-[--bull]" style={{ width: `${data.winRate}%` }} />
                  <div className="h-full bg-[--bear] flex-1" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* OVERVIEW TAB — Bar Chart */}
      {activeTab === "overview" && (
        <div className="rounded-xl border border-[--border] bg-[--bg-card] p-6 shadow-xl">
          <h3 className="text-sm font-bold uppercase tracking-widest text-white mb-6 flex items-center gap-2">
            <Zap className="w-4 h-4 text-[--accent]" /> Net P&L by Pair
          </h3>
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={sorted} margin={{ top: 10, right: 0, left: -10, bottom: 0 }}>
              <XAxis dataKey="symbol" tick={{ fontSize: 10, fill: "#6b7280", fontFamily: "monospace" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: "#6b7280", fontFamily: "monospace" }} tickFormatter={v => `$${v}`} axisLine={false} tickLine={false} />
              <Tooltip content={customTooltip} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
              <Bar dataKey="totalPnl" radius={[4, 4, 0, 0]}>
                {sorted.map((s, i) => (
                  <Cell key={i} fill={s.totalPnl >= 0 ? "var(--bull, #00dc82)" : "var(--bear, #ef4444)"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
