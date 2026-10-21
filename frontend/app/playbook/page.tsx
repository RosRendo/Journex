"use client";

import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import {
  Send, Bot, User, Sparkles, Zap, ChevronRight, Activity, ShieldAlert, Cpu,
  BookOpen, UploadCloud, X, Maximize2, Trash2, Plus, Calendar, Tag, FileText,
  ImageIcon, Search, Check, Edit2, Loader2, TrendingUp, TrendingDown, BarChart3,
  Trophy, ChevronDown, ChevronUp, Clock, RotateCcw, ShieldCheck, Printer, AlertTriangle,
  SlidersHorizontal, Target
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell
} from "recharts";
import { fetchWithAuth, getBackendUrl } from "@/lib/utils";
import { api } from "@/lib/terminalApi";
import { useCsvTrades } from "@/hooks/useCsvTrades";
import type { TradeData } from "@/hooks/useCsvTrades";
import { WhiteboardModal } from "@/components/WhiteboardModal";

// --- MAIN PLAYBOOK CONTAINER ---
export default function PlaybookPage() {
  const [activeTab, setActiveTab] = useState<"ai_coach" | "performance" | "lessons" | "plan">("ai_coach");

  return (
    <div className="min-h-screen w-full bg-[#09090b] text-[#f4f4f5] flex flex-col pb-12 font-sans">

      {/* ── TOPBAR ── */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-[rgba(255,255,255,0.07)] sticky top-0 z-20 bg-[#09090b]">
        <div>
          <h1 className="text-sm font-bold tracking-tight text-[#f4f4f5]">Playbook &amp; AI Desk</h1>
          <p className="text-[9px] font-bold uppercase tracking-widest font-mono text-[#71717a] mt-0.5">AI Coach · Strategy stats · Lessons · Plan forge</p>
        </div>
        <div className="flex gap-0 border-l border-[rgba(255,255,255,0.07)]">
          {(["ai_coach", "performance", "lessons", "plan"] as const).map((tab) => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`py-3 px-4 text-[9px] uppercase tracking-widest font-bold font-mono transition-all border-b-2 whitespace-nowrap ${
                activeTab === tab ? "border-[#20e0b2] text-[#20e0b2]" : "border-transparent text-[#71717a] hover:text-[#a1a1aa]"
              }`}>
              {tab === "ai_coach" ? "AI Coach" : tab === "performance" ? "Strategies" : tab === "lessons" ? "Lessons" : "Plan"}
            </button>
          ))}
        </div>
      </div>

      {/* ── WORKSPACE ── */}
      <div className="flex-1 w-full p-6">
        {activeTab === "ai_coach" && <AICoachDesk />}
        {activeTab === "performance" && <StrategyStats />}
        {activeTab === "lessons" && <LessonsLedger />}
        {activeTab === "plan" && <PlanForge />}
      </div>
    </div>
  );
}

// ── SUB-COMPONENT 1: AI COACH DESK ──
interface Message {
  id: string;
  role: "user" | "ai";
  content: string;
  type?: "text" | "report" | "opportunity";
}

const INITIAL_MESSAGES: Message[] = [
  {
    id: "1",
    role: "ai",
    type: "report",
    content: "Good morning, Ros. Let's align on today's trading plan."
  }
];

function AICoachDesk() {
  const [messages, setMessages] = useState<Message[]>(INITIAL_MESSAGES);
  const [input, setInput] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;
    const userMsg = input.trim();
    setMessages(prev => [...prev, { id: Date.now().toString(), role: "user", content: userMsg, type: "text" }]);
    setInput("");
    
    try {
      const res = await api.post("/ai/chat", {
        message: userMsg,
        history: messages
      });
      
      if (res.data && res.data.success) {
        setMessages(prev => [...prev, {
          id: Date.now().toString(),
          role: "ai",
          content: res.data.response,
          type: "text"
        }]);
      }
    } catch (e) {
      console.error("AI chat failed", e);
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: "ai",
        content: "I am having trouble connecting to my neural network. Please try again.",
        type: "text"
      }]);
    }
  };

  const QuickPills = [
    "Today's Outlook", "Today's Opportunity", "Today's Risk", 
    "Weekly Report", "Performance Analysis", "Improvement Recs"
  ];

  return (
    <div className="flex gap-6 animate-fade-in h-[calc(100vh-200px)]">
      {/* Quick Queries Sidebar */}
      <div className="hidden lg:flex w-[240px] flex-col gap-2 p-4 rounded-lg bg-[#101014] border border-[rgba(255,255,255,0.07)]">
        <div className="flex items-center gap-2 mb-3 px-1">
          <Cpu className="w-4 h-4 text-[#20e0b2]" />
          <h2 className="font-mono font-bold text-[10px] uppercase tracking-widest text-zinc-400">Assistant Menu</h2>
        </div>
        
        {QuickPills.map(pill => (
          <button 
            key={pill}
            onClick={() => setInput(`Show me ${pill}`)}
            className="flex items-center justify-between p-2 rounded-lg hover:bg-black/25 border border-transparent hover:border-zinc-850 transition-all text-left font-mono text-[10px]"
          >
            <span className="text-zinc-400 hover:text-zinc-200">{pill}</span>
            <ChevronRight className="w-3.5 h-3.5 text-zinc-600" />
          </button>
        ))}
        
        <div className="mt-auto p-3.5 rounded-xl bg-[#20e0b2]/5 border border-[#20e0b2]/10 font-mono text-[10px] leading-relaxed">
          <h3 className="text-[9px] font-bold text-[#20e0b2] uppercase tracking-widest mb-1.5 flex items-center gap-1">
             <Activity className="w-3 h-3 animate-pulse" /> Live Coach
          </h3>
          <p className="text-zinc-550">
            Monitoring active trade history for behavioral patterns and guidelines deviations.
          </p>
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col bg-[#101014] border border-[rgba(255,255,255,0.07)] rounded-lg overflow-hidden relative">
        <div className="flex-1 overflow-y-auto p-5 space-y-5 scrollbar-thin">
          {messages.map(msg => (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              key={msg.id} 
              className={`flex gap-3.5 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}
            >
              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 border ${
                msg.role === "user" ? "bg-black/35 border-[rgba(255,255,255,0.07)] text-zinc-300" : "bg-[#20e0b2]/10 text-[#20e0b2] border-[#20e0b2]/20"
              }`}>
                {msg.role === "user" ? <User size={13} /> : <Bot size={13} />}
              </div>
              
              <div className={`max-w-[75%] ${msg.role === "user" ? "text-right" : "text-left"}`}>
                {msg.type === "report" ? (
                  <div className="bg-[#0c0c10] border border-[rgba(255,255,255,0.07)] p-4 rounded-xl font-mono">
                    <div className="flex items-center gap-2 mb-2.5 border-b border-zinc-850 pb-2">
                      <Sparkles className="w-4 h-4 text-[#20e0b2]" />
                      <span className="text-[9px] font-bold uppercase tracking-widest text-[#20e0b2]">Morning Strategy Plan</span>
                    </div>
                    <p className="text-[11px] text-zinc-350 leading-relaxed">{msg.content}</p>
                    <div className="mt-4 grid grid-cols-2 gap-3 text-[9px] font-bold">
                      <div className="bg-black/25 p-3 rounded-lg border border-zinc-850">
                        <span className="block text-[8px] text-zinc-500 uppercase tracking-widest">Market Mood</span>
                        <span className="text-[#20e0b2] mt-1 block">Risk-On (Bullish)</span>
                      </div>
                      <div className="bg-black/25 p-3 rounded-lg border border-zinc-850">
                        <span className="block text-[8px] text-zinc-500 uppercase tracking-widest">Macro Event</span>
                        <span className="text-[#ff5c73] mt-1 block">NFP at 14:30</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className={`p-3.5 rounded-xl text-xs leading-relaxed whitespace-pre-wrap ${
                    msg.role === "user" 
                      ? "bg-[#20e0b2] text-[#101014] font-bold rounded-tr-none font-mono" 
                      : "bg-[#0c0c10] border border-zinc-850 text-zinc-200 rounded-tl-none font-sans"
                  }`}>
                    {msg.content}
                  </div>
                )}
              </div>
            </motion.div>
          ))}
          <div ref={endRef} />
        </div>

        {/* Input */}
        <div className="p-4 bg-black/15 border-t border-zinc-850">
          <div className="flex items-center gap-3 bg-black/30 border border-[rgba(255,255,255,0.07)] rounded-xl p-2.5 px-4 shadow-inner">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              placeholder="Ask AI for strategy suggestions or performance audits..."
              className="flex-1 bg-transparent border-none outline-none text-xs text-white placeholder:text-zinc-600 font-mono"
            />
            <button 
              onClick={handleSend}
              className="p-2 bg-[#20e0b2] text-[#101014] rounded-lg hover:bg-[#20e0b2]/80 transition-colors font-bold cursor-pointer"
            >
              <Send size={13} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── SUB-COMPONENT 2: STRATEGY STATS ──
type SortKey = "totalPnl" | "winRate" | "totalTrades" | "avgWin" | "profitFactor";
type Tab = "pairs" | "direction" | "overview";

function StrategyStats() {
  const { trades, loading } = useCsvTrades();
  const [sortKey, setSortKey] = useState<SortKey>("totalPnl");
  const [sortAsc, setSortAsc] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState<Tab>("pairs");

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
      <div className="flex items-center justify-center h-48 text-zinc-550 font-mono text-[10px] uppercase font-bold">
        <Activity className="w-4 h-4 animate-spin mr-2" /> Sorting calculations...
      </div>
    );
  }

  const customTooltip = ({ active, payload, label }: any) => {
    if (active && payload?.length) {
      const v = payload[0].value as number;
      return (
        <div className="bg-[#0c0c0d] border border-[rgba(255,255,255,0.07)] rounded-lg p-3 text-xs font-mono">
          <p className="text-zinc-550 mb-1 font-bold">{label}</p>
          <p className={`font-bold ${v >= 0 ? "text-[#20e0b2]" : "text-[#ff5c73]"}`}>
            {v >= 0 ? "+" : ""}${v.toFixed(0)}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center bg-[#101014] p-4 border border-zinc-850 rounded-lg">
        <div className="font-mono text-[10px] uppercase font-bold text-zinc-400">
          {symbolStats.length} instruments · {trades.length} executions parsed
        </div>
        <div className="flex bg-black/35 p-1 border border-zinc-850 rounded-xl gap-1">
          {(["pairs", "direction", "overview"] as Tab[]).map(tab => (
            <button key={tab} onClick={() => setActiveSubTab(tab)}
              className={`px-3 py-1.5 rounded-lg text-[9px] uppercase font-bold tracking-wider transition-all ${
                activeSubTab === tab ? "bg-white/10 text-white" : "text-zinc-500 hover:text-zinc-300"
              }`}>
              {tab}
            </button>
          ))}
        </div>
      </div>

      {bestPair && (
        <div className={`p-4 rounded-lg border flex items-center gap-4 ${
          bestPair.totalPnl >= 0 ? "bg-[#20e0b2]/5 border-[#20e0b2]/10" : "bg-[#ff5c73]/5 border-[#ff5c73]/10"
        }`}>
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center shrink-0 border border-purple-500/20">
            <Trophy className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <div className="text-[8px] uppercase tracking-widest font-black text-zinc-500 font-mono">Top Outperforming Asset</div>
            <div className="flex items-center gap-3 flex-wrap mt-0.5">
              <span className="text-base font-black text-white font-mono">{bestPair.symbol}</span>
              <span className={`text-sm font-black font-mono ${bestPair.totalPnl >= 0 ? "text-[#20e0b2]" : "text-[#ff5c73]"}`}>
                {bestPair.totalPnl >= 0 ? "+" : ""}${bestPair.totalPnl.toFixed(0)}
              </span>
              <span className="text-[9px] font-mono text-zinc-500 border border-zinc-850 rounded px-1.5 py-0.5">
                {bestPair.winRate.toFixed(0)}% WR · {bestPair.totalTrades} Trades · PF {bestPair.profitFactor.toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      )}

      {activeSubTab === "pairs" && (
        <div className="rounded-lg border border-[rgba(255,255,255,0.07)] bg-[#101014] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono whitespace-nowrap">
              <thead className="bg-black/20 text-zinc-500">
                <tr className="text-[9px] uppercase font-bold tracking-wider border-b border-zinc-850">
                  <th className="px-6 py-4">Symbol</th>
                  <th className="px-5 py-4 cursor-pointer hover:text-white" onClick={() => toggleSort("totalTrades")}>Trades<SortIcon col="totalTrades" /></th>
                  <th className="px-5 py-4 cursor-pointer hover:text-white" onClick={() => toggleSort("winRate")}>Win Rate<SortIcon col="winRate" /></th>
                  <th className="px-5 py-4 cursor-pointer hover:text-white" onClick={() => toggleSort("avgWin")}>Avg Win<SortIcon col="avgWin" /></th>
                  <th className="px-5 py-4">Avg Loss</th>
                  <th className="px-5 py-4 cursor-pointer hover:text-white" onClick={() => toggleSort("profitFactor")}>Prof. Factor<SortIcon col="profitFactor" /></th>
                  <th className="px-5 py-4">Streak</th>
                  <th className="px-6 py-4 cursor-pointer hover:text-white" onClick={() => toggleSort("totalPnl")}>Net P&L<SortIcon col="totalPnl" /></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-850/40">
                {sorted.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-16 text-center text-zinc-500 font-mono">
                      No Trades registered yet.
                    </td>
                  </tr>
                ) : sorted.map((s, i) => (
                  <tr key={s.symbol} className="hover:bg-white/[0.01] transition-colors">
                    <td className="px-6 py-4 font-bold text-white">{s.symbol}</td>
                    <td className="px-5 py-4 text-zinc-400">{s.totalTrades}</td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1 bg-white/5 rounded-full overflow-hidden">
                          <div className="h-full bg-[#20e0b2] rounded-full" style={{ width: `${s.winRate}%` }} />
                        </div>
                        <span className={`text-[10px] font-bold ${s.winRate >= 50 ? "text-[#20e0b2]" : "text-[#ff5c73]"}`}>
                          {s.winRate.toFixed(0)}%
                        </span>
                      </div>
                    </td>
                    <td className="text-[#20e0b2] px-5 py-4">+${s.avgWin.toFixed(0)}</td>
                    <td className="text-[#ff5c73] px-5 py-4">-${s.avgLoss.toFixed(0)}</td>
                    <td className="px-5 py-4">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${
                        s.profitFactor >= 2 ? "bg-[#20e0b2]/10 border-[#20e0b2]/20 text-[#20e0b2]" : "bg-zinc-850 text-zinc-450 border-[rgba(255,255,255,0.07)]"
                      }`}>{s.profitFactor === 999 ? "∞" : s.profitFactor.toFixed(2)}</span>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                        s.lastOutcome === "W" ? "bg-[#20e0b2]/10 text-[#20e0b2]" : "bg-[#ff5c73]/10 text-[#ff5c73]"
                      }`}>
                        {s.lastOutcome === "W" ? "Wins" : "Losses"} {s.streak}x
                      </span>
                    </td>
                    <td className={`px-6 py-4 font-bold ${s.totalPnl >= 0 ? "text-[#20e0b2]" : "text-[#ff5c73]"}`}>
                      {s.totalPnl >= 0 ? "+" : ""}${s.totalPnl.toFixed(0)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeSubTab === "direction" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[
            { label: "Long Profile", data: directionStats.long, icon: TrendingUp, color: "#20e0b2", bg: "bg-[#20e0b2]/5", border: "border-[#20e0b2]/10" },
            { label: "Short Profile", data: directionStats.short, icon: TrendingDown, color: "#ff5c73", bg: "bg-[#ff5c73]/5", border: "border-[#ff5c73]/10" },
          ].map(({ label, data, icon: Icon, color, bg, border }) => (
            <div key={label} className={`rounded-lg border ${border} ${bg} p-6 space-y-5`}>
              <div className="flex items-center gap-2.5">
                <Icon className="w-5 h-5" style={{ color }} />
                <h3 className="text-xs font-black uppercase tracking-wider text-white font-mono">{label}</h3>
              </div>
              <div className="grid grid-cols-2 gap-4 font-mono text-[10px]">
                <div className="bg-black/20 p-3 rounded-xl border border-zinc-850">
                  <div className="text-zinc-500 uppercase tracking-widest font-bold mb-1">Trades Count</div>
                  <div className="text-sm font-bold text-white">{data.trades}</div>
                </div>
                <div className="bg-black/20 p-3 rounded-xl border border-zinc-850">
                  <div className="text-zinc-500 uppercase tracking-widest font-bold mb-1">Win Rate</div>
                  <div className="text-sm font-bold text-white">{data.winRate.toFixed(0)}%</div>
                </div>
                <div className="bg-black/20 p-3 rounded-xl border border-zinc-850">
                  <div className="text-zinc-500 uppercase tracking-widest font-bold mb-1">Profit Factor</div>
                  <div className="text-sm font-bold text-white">{data.pf.toFixed(2)}</div>
                </div>
                <div className="bg-black/20 p-3 rounded-xl border border-zinc-850">
                  <div className="text-zinc-500 uppercase tracking-widest font-bold mb-1">Net Outcome</div>
                  <div className={`text-sm font-bold ${data.pnl >= 0 ? "text-[#20e0b2]" : "text-[#ff5c73]"}`}>{data.pnl >= 0 ? "+" : ""}${data.pnl.toFixed(0)}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeSubTab === "overview" && (
        <div className="rounded-lg border border-[rgba(255,255,255,0.07)] bg-[#101014] p-6 relative overflow-hidden">
          <h3 className="text-xs font-black uppercase tracking-widest text-white mb-6 flex items-center gap-2">
            <Zap className="w-4 h-4 text-[#20e0b2]" /> Setup Returns Grid
          </h3>
          <div className="w-full h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={sorted} margin={{ top: 10, right: 0, left: -25, bottom: 0 }}>
                <XAxis dataKey="symbol" tick={{ fontSize: 9, fill: "#555568", fontFamily: "monospace" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 9, fill: "#555568", fontFamily: "monospace" }} tickFormatter={v => `$${v}`} axisLine={false} tickLine={false} />
                <Tooltip content={customTooltip} cursor={{ fill: "rgba(255,255,255,0.01)" }} />
                <Bar dataKey="totalPnl" radius={[3, 3, 0, 0]}>
                  {sorted.map((s, i) => (
                    <Cell key={i} fill={s.totalPnl >= 0 ? "#20e0b2" : "#ff5c73"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}

// ── SUB-COMPONENT 3: LESSONS LEDGER ──
interface LessonImage {
  id: string;
  url: string;
  note: string;
  uploadedAt?: string;
  timeframe?: string;
  profit?: number;
  tradeDate?: string;
  pair?: string;
  direction?: string;
  strategy?: string;
  emotion?: string;
}

interface Lesson {
  id: number;
  title: string;
  concept: string | null;
  notes: string | null;
  images: LessonImage[];
  createdAt: string;
}

function LessonsLedger() {
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [newConcept, setNewConcept] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editConcept, setEditConcept] = useState("");

  const [viewingLesson, setViewingLesson] = useState<Lesson | null>(null);
  const [viewMode, setViewMode] = useState<"grid" | "detail">("grid");
  const [selectedImageIdx, setSelectedImageIdx] = useState<number | null>(null);
  const [showWhiteboard, setShowWhiteboard] = useState(false);
  const [whiteboardInitialUrl, setWhiteboardInitialUrl] = useState<string | undefined>();
  const [galleryFilter, setGalleryFilter] = useState<string>("All");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [notesUpdate, setNotesUpdate] = useState("");

  const TIMEFRAMES = ["1m", "5m", "15m", "1H", "4H", "D1", "W1"];

  const loadLessons = async () => {
    try {
      const res = await fetchWithAuth(`${getBackendUrl()}/api/lessons`);
      const data = await res.json();
      if (data.success) setLessons(data.lessons);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load lessons");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLessons();
  }, []);

  const handleCreate = async () => {
    if (!newTitle.trim()) {
      toast.error("Title is required to create a lesson");
      return;
    }
    setIsCreating(true);
    try {
      const payload = { title: newTitle, ...(newConcept ? { concept: newConcept } : {}) };
      const res = await fetchWithAuth(`${getBackendUrl()}/api/lessons`, {
        method: "POST",
        body: JSON.stringify(payload),
        headers: { "Content-Type": "application/json", "Accept": "application/json" }
      });
      const data = await res.json();
      if (data.success) {
        setLessons([data.lesson, ...lessons]);
        setNewTitle("");
        setNewConcept("");
        toast.success("Added new lesson to playbook");
      }
    } catch (err) {
      toast.error("An error occurred");
    } finally {
      setIsCreating(false);
    }
  };

  const startEditing = (lesson: Lesson, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(lesson.id);
    setEditTitle(lesson.title);
    setEditConcept(lesson.concept || "");
  };

  const saveInlineEdit = async (id: number) => {
    setEditingId(null);
    try {
      const payload = { title: editTitle, ...(editConcept ? { concept: editConcept } : {}) };
      const res = await fetchWithAuth(`${getBackendUrl()}/api/lessons/${id}`, {
        method: "PUT",
        body: JSON.stringify(payload),
        headers: { "Content-Type": "application/json", "Accept": "application/json" }
      });
      const data = await res.json();
      if (data.success) {
        setLessons(lessons.map(l => l.id === id ? data.lesson : l));
      }
    } catch (err) {
      toast.error("Failed to update lesson");
    }
  };

  const saveDetailsUpdate = async (id: number, newNotes?: string, newImages?: LessonImage[]) => {
    try {
      const payload: any = {};
      if (newNotes !== undefined) payload.notes = newNotes;
      if (newImages !== undefined) payload.images = newImages;

      const res = await fetchWithAuth(`${getBackendUrl()}/api/lessons/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", "Accept": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        setLessons(lessons.map(l => l.id === id ? data.lesson : l));
        setViewingLesson(data.lesson);
        toast.success("Lesson metadata synced");
      }
    } catch (err) {
      toast.error("Failed to update details");
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0 && viewingLesson) {
      setIsUploading(true);
      const newImages = [...(viewingLesson.images || [])];
      for (const file of Array.from(e.target.files)) {
        const formData = new FormData();
        formData.append("image", file);
        try {
          const uploadRes = await fetchWithAuth(`${getBackendUrl()}/api/upload`, {
            method: "POST",
            body: formData,
            headers: { "Accept": "application/json" }
          });
          if (uploadRes.ok) {
            const data = await uploadRes.json();
            newImages.push({
              id: Date.now().toString() + Math.random().toString(),
              url: data.data.url,
              note: "",
              uploadedAt: new Date().toISOString()
            });
          }
        } catch (e) {
          console.error(e);
        }
      }
      await saveDetailsUpdate(viewingLesson.id, undefined, newImages);
      setIsUploading(false);
    }
  };

  const handleDelete = async (id: number, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!confirm("Are you sure you want to delete this lesson?")) return;
    try {
      const res = await fetchWithAuth(`${getBackendUrl()}/api/lessons/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        setLessons(lessons.filter(l => l.id !== id));
        toast.success("Lesson deleted");
      }
    } catch (err) {
      toast.error("Failed to delete lesson");
    }
  };

  const getFullImageUrl = (url: string | null) => {
    if (!url) return "";
    return url;
  };

  const filteredLessons = lessons.filter(l => 
    l.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
    (l.concept && l.concept.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between p-3.5 bg-[#101014] border border-zinc-850 rounded-lg">
        <span className="font-mono text-[10px] uppercase font-bold text-zinc-500">Mistakes & Case Studies Playbook</span>
        <div className="relative font-mono text-[10px]">
          <Search className="w-3.5 h-3.5 text-zinc-600 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input 
            type="text" 
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Filter by concept..." 
            className="bg-black/35 border border-[rgba(255,255,255,0.07)] rounded-lg pl-8 pr-3 py-1 text-xs w-48 focus:border-purple-400 outline-none text-white font-mono placeholder:text-zinc-650"
          />
        </div>
      </div>

      <div className="bg-[#101014] border border-[rgba(255,255,255,0.07)] rounded-lg overflow-hidden">
        <div className="grid grid-cols-12 gap-4 px-5 py-3 border-b border-zinc-850 bg-black/20 text-[9px] uppercase font-bold tracking-widest text-zinc-500 font-mono">
          <div className="col-span-8">Lesson Title</div>
          <div className="col-span-2">Created</div>
          <div className="col-span-2 text-right">Actions</div>
        </div>

        <div className="divide-y divide-zinc-900/40 font-mono">
          {/* Fast Entry Row */}
          <div className="grid grid-cols-12 gap-4 px-5 py-3 items-center bg-purple-500/[0.01] text-xs">
            <div className="col-span-8 flex items-center gap-3">
              <Plus className="w-4 h-4 text-purple-500/50" />
              <input
                type="text"
                value={newTitle}
                onChange={e => setNewTitle(e.target.value)}
                placeholder="Log a new lesson learned..."
                className="w-full bg-transparent border-none outline-none text-xs font-bold text-white placeholder:text-zinc-600"
              />
            </div>
            <div className="col-span-2 text-[9px] text-zinc-600 uppercase font-bold tracking-wider">Today</div>
            <div className="col-span-2 flex justify-end">
              <button 
                onClick={handleCreate}
                disabled={!newTitle.trim() || isCreating}
                className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white text-[10px] font-bold uppercase rounded-lg disabled:opacity-30 transition-all cursor-pointer"
              >
                Sync
              </button>
            </div>
          </div>

          {/* Saved Lessons list */}
          {loading ? (
            <div className="py-12 flex justify-center"><div className="animate-spin w-5 h-5 border border-[rgba(255,255,255,0.07)] border-t-transparent rounded-full" /></div>
          ) : filteredLessons.length === 0 ? (
            <div className="py-16 text-center text-zinc-600 text-xs">No lessons logged yet.</div>
          ) : (
            filteredLessons.map((lesson) => (
              <div key={lesson.id} className="grid grid-cols-12 gap-4 px-5 py-3 items-center hover:bg-white/[0.01] transition-colors group">
                <div className="col-span-8 flex items-center gap-3">
                  <BookOpen className="w-4 h-4 text-zinc-600 group-hover:text-purple-400" />
                  <span className="font-bold text-xs text-zinc-300">{lesson.title}</span>
                </div>
                <div className="col-span-2 text-[10px] text-zinc-550">
                  {new Date(lesson.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                </div>
                <div className="col-span-2 flex items-center justify-end gap-2">
                  <button 
                    onClick={() => {
                      setViewingLesson(lesson);
                      setNotesUpdate(lesson.notes || "");
                      setViewMode("grid");
                    }}
                    className="px-2.5 py-1 bg-zinc-900 border border-[rgba(255,255,255,0.07)] text-zinc-300 rounded-lg text-[9px] font-bold uppercase hover:bg-zinc-850"
                  >
                    View
                  </button>
                  <button onClick={() => handleDelete(lesson.id)} className="p-1 text-zinc-600 hover:text-[#ff5c73]">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Details Modal */}
      <AnimatePresence>
        {viewingLesson && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/85" onClick={() => setViewingLesson(null)}>
            <motion.div 
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              onClick={e => e.stopPropagation()}
              className="w-full max-w-4xl h-full max-h-[75vh] bg-[#0A0C10] border border-[rgba(255,255,255,0.07)] rounded-lg flex flex-col overflow-hidden"
            >
              <div className="px-6 py-4 border-b border-zinc-850 flex justify-between items-center bg-black/10">
                <h2 className="text-xs font-black uppercase text-white font-mono">{viewingLesson.title}</h2>
                <button onClick={() => setViewingLesson(null)} className="p-1.5 rounded-lg bg-zinc-900 border border-[rgba(255,255,255,0.07)] text-zinc-400 hover:text-white cursor-pointer"><X className="w-4 h-4" /></button>
              </div>

              <div className="flex-1 p-6 overflow-y-auto scrollbar-thin flex flex-col gap-6">
                <div>
                  <label className="text-[9px] font-bold text-zinc-550 uppercase tracking-widest mb-1.5 block font-mono">Case study notes</label>
                  <textarea
                    value={notesUpdate}
                    onChange={e => setNotesUpdate(e.target.value)}
                    placeholder="Document mistakes, rules violations, and guidelines modifications..."
                    className="w-full bg-black/25 border border-[rgba(255,255,255,0.07)] rounded-xl p-3.5 text-xs font-mono text-zinc-350 focus:outline-none focus:border-purple-400 h-28 resize-none"
                  />
                  <button 
                    onClick={() => saveDetailsUpdate(viewingLesson.id, notesUpdate)}
                    className="px-4 py-1.5 mt-2 bg-purple-600 hover:bg-purple-500 rounded-lg text-[10px] font-bold uppercase tracking-wider text-white font-mono cursor-pointer"
                  >
                    Save Notes
                  </button>
                </div>

                <div>
                  <div className="flex justify-between items-center border-b border-zinc-850 pb-2 mb-3">
                    <label className="text-[9px] font-bold text-zinc-550 uppercase tracking-widest font-mono">Whiteboard Screenshots</label>
                    <button 
                      onClick={() => fileInputRef.current?.click()}
                      className="px-3 py-1.5 rounded-lg border border-purple-500/20 text-purple-400 hover:bg-purple-500/10 text-[9px] font-bold uppercase font-mono cursor-pointer"
                    >
                      Upload screenshot
                    </button>
                  </div>
                  <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />

                  <div className="grid grid-cols-4 gap-4">
                    {viewingLesson.images?.map((img, idx) => (
                      <div key={img.id} className="rounded-xl overflow-hidden border border-[rgba(255,255,255,0.07)] bg-black/40 aspect-video relative group">
                        <img src={getFullImageUrl(img.url)} alt="Playbook Screenshot" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity gap-2">
                          <a href={getFullImageUrl(img.url)} target="_blank" rel="noreferrer" className="p-1 bg-zinc-900 border border-[rgba(255,255,255,0.07)] rounded text-white"><Maximize2 className="w-3.5 h-3.5" /></a>
                          <button 
                            onClick={async () => {
                              const newImages = viewingLesson.images.filter((_, i) => i !== idx);
                              await saveDetailsUpdate(viewingLesson.id, undefined, newImages);
                            }}
                            className="p-1 bg-[#ff5c73]/10 border border-[#ff5c73]/20 text-[#ff5c73] rounded hover:bg-[#ff5c73]/20"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── SUB-COMPONENT 4: PLAN FORGE ──
interface PlanData {
  market: string;
  pairs: string[];
  timeframe: string;
  strategyType: string;
  session: string;
  accountSize: string;
  riskPerTrade: string;
  dailyLossLimit: string;
  goal: string;
}

function PlanForge() {
  const [step, setStep] = useState(1);
  const [isGenerating, setIsGenerating] = useState(false);
  const [planResult, setPlanResult] = useState<any>(null);
  const [savedPlans, setSavedPlans] = useState<any[]>([]);

  const [formData, setFormData] = useState<PlanData>({
    market: "",
    pairs: [],
    timeframe: "",
    strategyType: "",
    session: "",
    accountSize: "",
    riskPerTrade: "1",
    dailyLossLimit: "3",
    goal: "",
  });

  useEffect(() => {
    const savedDraft = localStorage.getItem("TRADOKILLER_DRAFT");
    if (savedDraft) {
      try {
        const parsed = JSON.parse(savedDraft);
        if (parsed) setFormData(prev => ({ ...prev, ...parsed }));
      } catch (e) {}
    }
    const history = localStorage.getItem("TRADOKILLER_HISTORY");
    if (history) {
      try {
        setSavedPlans(JSON.parse(history));
      } catch (e) {}
    }
  }, []);

  useEffect(() => {
    if (step < 4) localStorage.setItem("TRADOKILLER_DRAFT", JSON.stringify(formData));
  }, [formData, step]);

  const updateForm = (key: keyof PlanData, value: any) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const handleTogglePair = (pair: string) => {
    setFormData((prev) => {
      const exists = prev.pairs.includes(pair);
      return {
        ...prev,
        pairs: exists ? prev.pairs.filter((p) => p !== pair) : [...prev.pairs, pair],
      };
    });
  };

  const generatePlan = async () => {
    setIsGenerating(true);
    try {
      const res = await fetch(`${getBackendUrl()}/api/trading-plan/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          accountSize: parseFloat(formData.accountSize),
          riskPerTrade: parseFloat(formData.riskPerTrade),
          dailyLossLimit: parseFloat(formData.dailyLossLimit)
        }),
      });
      if (!res.ok) throw new Error("Failed to generate plan");
      const data = await res.json();
      setPlanResult(data);
      setStep(4);
      
      const newHistory = [{ date: new Date().toISOString(), plan: data.plan, config: formData }, ...savedPlans].slice(0, 10);
      setSavedPlans(newHistory);
      localStorage.setItem("TRADOKILLER_HISTORY", JSON.stringify(newHistory));
      localStorage.removeItem("TRADOKILLER_DRAFT");
      toast.success("Protocol forged!");
    } catch (err) {
      toast.error("Failed to generate plan");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 items-start animate-fade-in">
      <div className="flex-1 w-full space-y-6">
        <div className="rounded-lg overflow-hidden border border-[rgba(255,255,255,0.07)] bg-[#101014] p-6 md:p-8">
          
          {step < 4 && (
            <div className="h-1 w-full bg-white/5 mb-6 rounded-full overflow-hidden">
              <div className="h-full bg-[#20e0b2] transition-all duration-505" style={{ width: `${(step / 3) * 100}%` }} />
            </div>
          )}

          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div key="step1" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6">
                <h3 className="text-xs font-black uppercase text-white font-mono">{"// Phase 1: Market Foundation"}</h3>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-[9px] font-bold uppercase text-zinc-500 font-mono">Market Asset Class</label>
                    <div className="grid grid-cols-2 gap-3">
                      {["Forex", "Crypto", "Gold/Indices", "Stocks"].map((m) => (
                        <button key={m} onClick={() => updateForm("market", m)}
                          className={`p-3 rounded-xl border text-center transition-all font-bold text-xs ${
                            formData.market === m ? "bg-[#20e0b2]/10 border-[#20e0b2] text-[#20e0b2]" : "bg-black/20 border-[rgba(255,255,255,0.07)] text-zinc-400 hover:text-white"
                          }`}>{m}</button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[9px] font-bold uppercase text-zinc-500 font-mono">Target Instrument</label>
                    <div className="flex flex-wrap gap-2">
                      {["XAUUSD", "EURUSD", "GBPUSD", "BTCUSD", "NAS100", "US30", "GBPJPY"].map((pair) => (
                        <button key={pair} onClick={() => handleTogglePair(pair)}
                          className={`px-3 py-1.5 rounded-full border text-[10px] font-bold transition-all ${
                            formData.pairs.includes(pair) ? "bg-[#20e0b2]/10 border-[#20e0b2] text-[#20e0b2]" : "bg-black/20 border-[rgba(255,255,255,0.07)] text-zinc-400 hover:text-white"
                          }`}>{pair}</button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[9px] font-bold uppercase text-zinc-500 font-mono">Core Protocol Goal / Mission</label>
                    <textarea
                      value={formData.goal}
                      onChange={(e) => updateForm("goal", e.target.value)}
                      placeholder="Define your execution milestones..."
                      className="w-full bg-black/20 border border-[rgba(255,255,255,0.07)] rounded-xl p-3 text-xs text-white placeholder-zinc-700 focus:outline-none focus:border-[#20e0b2] h-20 resize-none font-mono"
                    />
                  </div>
                </div>
                <div className="flex justify-end pt-4 border-t border-zinc-850">
                  <button onClick={() => setStep(2)} disabled={!formData.market || formData.pairs.length === 0 || !formData.goal}
                    className="px-5 py-2.5 rounded-lg bg-[#20e0b2] text-[#101014] text-[10px] font-black uppercase tracking-wider disabled:opacity-40"
                  >Next Phase</button>
                </div>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div key="step2" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6">
                <h3 className="text-xs font-black uppercase text-white font-mono">{"// Phase 2: Execution Rules"}</h3>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-[9px] font-bold uppercase text-zinc-500 font-mono">Strategy Blueprint</label>
                    <div className="grid grid-cols-2 gap-3">
                      {["Trend Following", "Breakout", "Mean Reversion", "Scalping"].map((s) => (
                        <button key={s} onClick={() => updateForm("strategyType", s)}
                          className={`p-3 rounded-xl border text-center transition-all font-bold text-xs ${
                            formData.strategyType === s ? "bg-[#20e0b2]/10 border-[#20e0b2] text-[#20e0b2]" : "bg-black/20 border-[rgba(255,255,255,0.07)] text-zinc-400 hover:text-white"
                          }`}>{s}</button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[9px] font-bold uppercase text-zinc-500 font-mono">Execution Session</label>
                    <select value={formData.session} onChange={e => updateForm("session", e.target.value)}
                      className="w-full bg-black/20 border border-[rgba(255,255,255,0.07)] rounded-xl p-3 text-xs text-white focus:outline-none focus:border-[#20e0b2] cursor-pointer"
                    >
                      <option value="" disabled className="bg-zinc-950">Select session...</option>
                      <option value="London (Frankfurt Open)" className="bg-zinc-950">London Open (02:00 - 05:00 NY)</option>
                      <option value="New York Open" className="bg-zinc-950">New York Open (07:00 - 10:00 NY)</option>
                      <option value="Asian Range" className="bg-zinc-950">Asian Session (20:00 - 24:00 NY)</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[9px] font-bold uppercase text-zinc-500 font-mono">Execution Timeframe</label>
                    <select value={formData.timeframe} onChange={e => updateForm("timeframe", e.target.value)}
                      className="w-full bg-black/20 border border-[rgba(255,255,255,0.07)] rounded-xl p-3 text-xs text-white focus:outline-none focus:border-[#20e0b2] cursor-pointer"
                    >
                      <option value="" disabled className="bg-zinc-950">Select timeframe...</option>
                      <option value="1m / 5m" className="bg-zinc-950">1m / 5m (Scalping)</option>
                      <option value="15m / 1h" className="bg-zinc-950">15m / 1h (Day Trading)</option>
                      <option value="4h / Daily" className="bg-zinc-950">4h / Daily (Swing)</option>
                    </select>
                  </div>
                </div>
                <div className="flex justify-between pt-4 border-t border-zinc-850 text-[10px]">
                  <button onClick={() => setStep(1)} className="text-zinc-500 hover:text-white uppercase font-bold font-mono">Back</button>
                  <button onClick={() => setStep(3)} disabled={!formData.strategyType || !formData.session || !formData.timeframe}
                    className="px-5 py-2.5 rounded-lg bg-[#20e0b2] text-[#101014] font-black uppercase tracking-wider disabled:opacity-40"
                  >Next Phase</button>
                </div>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div key="step3" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6">
                <h3 className="text-xs font-black uppercase text-white font-mono">{"// Phase 3: Survival Limits"}</h3>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-[9px] font-bold uppercase text-zinc-500 font-mono">Account Balance ($)</label>
                    <input type="number" value={formData.accountSize} onChange={e => updateForm("accountSize", e.target.value)}
                      placeholder="e.g. 100000" className="w-full bg-black/20 border border-[rgba(255,255,255,0.07)] rounded-xl p-3 text-xs text-white focus:outline-none focus:border-[#20e0b2] font-mono" />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[9px] font-bold uppercase text-zinc-500 font-mono">Risk Per Trade</label>
                      <select value={formData.riskPerTrade} onChange={e => updateForm("riskPerTrade", e.target.value)}
                        className="w-full bg-black/20 border border-[rgba(255,255,255,0.07)] rounded-xl p-3 text-xs text-white focus:outline-none focus:border-[#20e0b2]"
                      >
                        <option value="0.25">0.25% (Safe)</option>
                        <option value="0.5">0.50% (Standard)</option>
                        <option value="1">1.00% (Normal)</option>
                        <option value="2">2.00% (High)</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[9px] font-bold uppercase text-zinc-500 font-mono">Daily Loss Limit</label>
                      <select value={formData.dailyLossLimit} onChange={e => updateForm("dailyLossLimit", e.target.value)}
                        className="w-full bg-black/20 border border-[rgba(255,255,255,0.07)] rounded-xl p-3 text-xs text-white focus:outline-none focus:border-[#20e0b2]"
                      >
                        <option value="1">1% Limit</option>
                        <option value="2">2% Limit</option>
                        <option value="3">3% Limit</option>
                        <option value="5">5% Limit</option>
                      </select>
                    </div>
                  </div>
                </div>
                <div className="flex justify-between pt-4 border-t border-zinc-850 text-[10px]">
                  <button onClick={() => setStep(2)} className="text-zinc-500 hover:text-white uppercase font-bold font-mono">Back</button>
                  <button onClick={generatePlan} disabled={isGenerating || !formData.accountSize}
                    className="px-5 py-2.5 rounded-lg bg-[#ff5c73] text-white font-black uppercase tracking-wider disabled:opacity-40"
                  >Forge Plan</button>
                </div>
              </motion.div>
            )}

            {step === 4 && planResult && (
              <motion.div key="step4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                <div className="p-4 rounded-xl bg-[#20e0b2]/5 border border-[#20e0b2]/10 flex items-start gap-3">
                  <ShieldCheck className="w-5 h-5 text-[#20e0b2] shrink-0" />
                  <div>
                    <h4 className="font-bold text-xs text-[#20e0b2] uppercase font-mono">Protocol Forged & Synced</h4>
                    <p className="text-[10px] text-zinc-500 mt-0.5 font-mono">This operational dossier has been compiled. Execution consistency is now your sole responsibility.</p>
                  </div>
                </div>

                <div className="p-6 rounded-xl border border-[rgba(255,255,255,0.07)] bg-black/35 font-mono text-[11px] space-y-6 leading-relaxed relative">
                  <div className="absolute top-0 right-0 p-3 text-[8px] font-black text-zinc-600 uppercase tracking-widest">TK-PROT-1.0</div>
                  {planResult.plan?.planSections?.map((section: any, idx: number) => (
                    <div key={idx} className="space-y-2">
                      <h4 className="text-[10px] font-black text-white uppercase border-b border-zinc-850 pb-1">{"// "}{section.title}</h4>
                      <p className="text-zinc-400 whitespace-pre-wrap text-[10px] leading-relaxed font-sans">{section.content}</p>
                    </div>
                  ))}
                </div>

                <div className="flex justify-center border-t border-zinc-850 pt-4">
                  <button onClick={() => setStep(1)} className="px-4 py-2 bg-zinc-900 border border-[rgba(255,255,255,0.07)] text-zinc-400 hover:text-white rounded-lg text-[9px] font-bold uppercase tracking-wider font-mono">Restart Forge</button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <div className="w-full lg:w-72 shrink-0">
        <div className="rounded-lg border border-[rgba(255,255,255,0.07)] bg-[#101014] p-5 space-y-4">
          <h3 className="font-mono font-bold uppercase text-[9px] text-zinc-500 tracking-wider flex items-center gap-1">
            <Clock size={12} className="text-[#20e0b2]" /> History Logs
          </h3>
          
          {savedPlans.length > 0 ? (
            <div className="space-y-2.5 max-h-[350px] overflow-y-auto pr-1">
              {savedPlans.map((sp, idx) => (
                <div key={idx} className="p-3 rounded-lg border border-zinc-850 hover:bg-white/[0.01] transition-all cursor-pointer font-mono"
                  onClick={() => {
                    setPlanResult({ plan: sp.plan });
                    setFormData(sp.config);
                    setStep(4);
                  }}
                >
                  <div className="text-[8px] text-zinc-650 mb-1">{new Date(sp.date).toLocaleDateString()}</div>
                  <div className="font-bold text-[10px] text-white truncate">{sp.config.goal || "Trading Protocol"}</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center p-6 border border-dashed border-zinc-850 rounded-xl text-[9px] uppercase font-bold text-zinc-650 tracking-wider font-mono">
              No saved logs.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


