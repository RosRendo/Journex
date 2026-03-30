"use client";
import { useMemo, useState, useEffect } from "react";
import {
  TrendingUp,
  TrendingDown,
  Target,
  BarChart3,
  Activity,
  Upload,
  Wifi,
  DollarSign,
  PieChart as PieChartIcon,
  Sparkles,
  ArrowRight
} from "lucide-react";
import { useCsvTrades } from "@/hooks/useCsvTrades";
import { calculateMetrics, getStrategyStats } from "@/lib/calculations";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  PieChart,
  Pie
} from "recharts";
import Link from "next/link";
import { SessionTimeline } from "@/components/ui/SessionTimeline";
import { CapitalFlow } from "@/components/ui/CapitalFlow";
import { AIMacroDeskSection } from "@/components/ui/MacroDeskCard";
import { ConditionMeter } from "@/components/ui/ConditionMeter";

function StatCard({
  label,
  value,
  icon: Icon,
  variant = "default",
}: {
  label: string;
  value: string;
  icon: React.ElementType;
  variant?: "default" | "profit" | "loss";
}) {
  return (
    <div
      className="rounded-xl border p-4 animate-fade-up"
      style={{
        background: "var(--bg-card)",
        borderColor: "var(--border)",
      }}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-[10px] font-bold uppercase tracking-[0.1em]" style={{ color: "var(--text-tertiary)" }}>
          {label}
        </span>
        <Icon className="w-3.5 h-3.5" style={{ color: "var(--text-tertiary)" }} />
      </div>
      <div
        className="text-xl font-bold font-mono"
        style={{
          color: variant === "profit" ? "var(--bull)" : variant === "loss" ? "var(--bear)" : "var(--text-primary)",
          fontFamily: "'Syne', sans-serif"
        }}
      >
        {value}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { trades, analytics, loading, error } = useCsvTrades();
  const [mt5Data, setMt5Data] = useState<{
    connected?: boolean;
    balance?: number;
    equity?: number;
    profit?: number;
    margin_level?: number;
  } | null>(null);

  useEffect(() => {
    const BRIDGE_URL = process.env.NEXT_PUBLIC_BRIDGE_URL ?? "http://localhost:5003";
    // Poll the MT5 Python bridge /health endpoint
    const fetchMT5 = async () => {
      try {
        const res = await fetch(`${BRIDGE_URL}/health`, { headers: { "ngrok-skip-browser-warning": "true" } });
        if (res.ok) {
          const data = await res.json();
          // /health gives us connected + balance, try /api/account for full stats
          if (data.connected) {
            try {
              const accRes = await fetch(`${BRIDGE_URL}/api/account`, { headers: { "ngrok-skip-browser-warning": "true" } });
              if (accRes.ok) {
                const acc = await accRes.json();
                setMt5Data({
                  connected: true,
                  balance: acc.balance,
                  equity: acc.equity,
                  profit: acc.profit,
                  margin_level: acc.margin_level,
                });
                return;
              }
            } catch (_) {}
          }
          setMt5Data({ connected: data.connected, balance: data.balance });
        }
      } catch (e) {
        setMt5Data({ connected: false });
      }
    };
    fetchMT5();
    const int = setInterval(fetchMT5, 5000);
    return () => clearInterval(int);
  }, []);

  // Fallback metrics from local calculations if analytics not yet available
  const metrics = useMemo(() => {
    if (analytics) return analytics;
    return {
      totalTrades: 0,
      winningTrades: 0,
      losingTrades: 0,
      breakEvenTrades: 0,
      winRate: 0,
      totalProfit: 0,
      profitFactor: 0,
      avgWin: 0,
      avgLoss: 0,
      bestTrade: 0,
      worstTrade: 0,
    };
  }, [analytics]);

  // Recent 8 trades
  const recentTrades = useMemo(() => {
    return [...trades]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 8);
  }, [trades]);

  // Equity curve from CSV trades
  const equityCurve = useMemo(() => {
    const sorted = [...trades].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
    );
    let balance = 0;
    return sorted.slice(-30).map((t) => {
      balance += t.profit;
      return {
        date: new Date(t.date).toLocaleDateString(),
        balance: Math.round(balance * 100) / 100,
      };
    });
  }, [trades]);

  // Strategy/symbol stats
  const strategyStats = useMemo(() => {
    const map = new Map<string, { pnl: number; trades: number; wins: number }>();
    for (const t of trades) {
      const key = t.pair;
      if (!map.has(key)) map.set(key, { pnl: 0, trades: 0, wins: 0 });
      const s = map.get(key)!;
      s.pnl += t.profit;
      s.trades++;
      if (t.profit > 0) s.wins++;
    }
    return Array.from(map.entries())
      .map(([name, s]) => ({ name, pnl: s.pnl, trades: s.trades, winRate: (s.wins / s.trades) * 100 }))
      .sort((a, b) => Math.abs(b.pnl) - Math.abs(a.pnl))
      .slice(0, 8);
  }, [trades]);

  return (
    <div className="space-y-8 animate-fade-in pb-20 max-w-[1600px] mx-auto">
      
      {/* ── HEADER / WELCOME ── */}
      <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight" style={{ fontFamily: "'Syne', sans-serif", color: "var(--accent)" }}>
            Good afternoon, Trader.
          </h1>
          <p className="text-sm mt-1 flex items-center gap-2" style={{ color: "var(--text-secondary)" }}>
            <Sparkles className="w-4 h-4" style={{ color: "var(--accent)" }} />
            Your personal trading command center
          </p>
        </div>
        
        <div className="flex-1 w-full xl:w-auto xl:max-w-3xl">
          <SessionTimeline />
        </div>
      </div>

      {/* ── AI MACRO DESK & FOR YOU ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
         {/* Left Col (AI Macro Cards) - Spans 8 cols */}
         <div className="lg:col-span-8 flex flex-col gap-4">
            <AIMacroDeskSection />
         </div>

         {/* Right Col (For You & Capital Flow) - Spans 4 cols */}
         <div className="lg:col-span-4 flex flex-col gap-4">
            {/* For You Briefing */}
            <div className="bg-[#0c0c0d]/90 border border-white/5 rounded-xl p-5 shadow-2xl backdrop-blur">
               <div className="flex justify-between items-center mb-4">
                 <div className="flex items-center gap-2">
                    <div className="p-1 bg-white/10 rounded"><BarChart3 className="w-4 h-4 text-white"/></div>
                    <span className="font-bold text-white tracking-wide">For You</span>
                 </div>
                 <div className="flex items-center gap-3 text-xs">
                    <span className="text-gray-500 font-mono">Wed, 11 Mar</span>
                    <div className="flex items-center gap-1 bg-white/5 rounded-full px-2 py-0.5 border border-white/10">
                       <span className="text-gray-400">Mood</span> 
                       <span className="text-red-400 font-bold ml-1 flex items-center gap-1">Cautious <ArrowRight className="w-3 h-3"/></span>
                    </div>
                 </div>
               </div>
               
               <h3 className="text-sm font-bold text-white leading-snug mb-3">
                 Dollar softens into London as Copper drags the metals complex
               </h3>
               <p className="text-xs text-gray-400 leading-relaxed font-medium">
                 The Dollar is seeing some early pressure with a -16 flow score, though Copper is the real outlier this morning, sliding toward a 23rd percentile low (z=-0.42) that signals some underlying nerves. While the London open shows a slight risk appetite for the Dow Jones and Nasdaq 100, our Macro Desk remains cautious.
               </p>
               <button className="text-[#00dc82] hover:text-[#00c574] text-xs font-bold mt-2 hover:underline">Read more</button>
            </div>

            {/* Capital Flow Container */}
            <div className="flex-1 min-h-[300px]">
               <CapitalFlow />
            </div>
         </div>
      </div>

      {/* ── MARKET CONDITIONS ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
         <ConditionMeter type="flow" />
         <ConditionMeter type="bearing" />
         <ConditionMeter type="pulse" />
      </div>

      <div className="h-px w-full bg-gradient-to-r from-transparent via-white/10 to-transparent my-8"></div>

      {/* ── ZONE 3 - ACCOUNT PULSE (From Previous Design) ── */}
      <div>
         <div className="flex items-center gap-3 mb-4">
            <Target className="w-5 h-5 text-gray-400" />
            <h2 className="text-lg font-semibold text-gray-200">Account Pulse <span className="text-xs text-gray-500 font-normal block">Live execution metrics</span></h2>
         </div>
         <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
           {/* Legacy account cards ported to new dark aesthetic */}
           <div className="p-4 bg-[#0c0c0d]/90 border border-white/5 rounded-xl shadow-lg relative overflow-hidden group hover:border-blue-500/30 transition-colors">
              <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 blur-[20px] rounded-full pointer-events-none"></div>
              <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider relative z-10 flex items-center justify-between">
                Balance <span className={`w-2 h-2 rounded-full ${mt5Data?.connected ? "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.8)] animate-pulse" : "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]"}`}></span>
              </div>
              <div className="relative z-10 mt-3 text-2xl font-bold font-mono text-white">${mt5Data?.connected && mt5Data?.balance != null ? mt5Data.balance.toFixed(2) : "—"}</div>
           </div>

           <div className="p-4 bg-[#0c0c0d]/90 border border-white/5 rounded-xl shadow-lg relative overflow-hidden group hover:border-green-500/30 transition-colors">
               <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider z-10 relative">Floating P&L</div>
               <div className="mt-3 relative z-10 flex items-baseline gap-2">
                 {mt5Data?.connected ? (
                   <>
                     <span className={`text-2xl font-bold font-mono ${(mt5Data?.profit ?? 0) >= 0 ? 'text-[#00dc82]' : 'text-red-400'}`}>
                       {(mt5Data?.profit ?? 0) >= 0 ? '+' : ''}${(mt5Data?.profit ?? 0).toFixed(2)}
                     </span>
                     {mt5Data?.balance && mt5Data.balance > 0 && (
                       <span className={`text-[11px] font-mono ${(mt5Data?.profit ?? 0) >= 0 ? 'text-[#00dc82]/70' : 'text-red-400/70'}`}>
                         {(((mt5Data.profit ?? 0) / mt5Data.balance) * 100).toFixed(2)}%
                       </span>
                     )}
                   </>
                 ) : (
                   <span className="text-xl font-bold font-mono text-gray-500">—</span>
                 )}
               </div>
            </div>

           <div className="p-4 bg-[#0c0c0d]/90 border border-white/5 rounded-xl shadow-lg group hover:border-yellow-500/30 transition-colors">
             <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Margin Level</div>
             <div className="mt-3 text-2xl font-bold font-mono text-white">
               {mt5Data?.connected && mt5Data?.margin_level != null
                 ? `${mt5Data.margin_level.toFixed(1)}%`
                 : <span className="text-gray-500">—</span>}
             </div>
           </div>

           <div className="p-4 bg-[#0c0c0d]/90 border border-white/5 rounded-xl shadow-lg group hover:border-red-500/30 transition-colors">
             <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Drawdown (Eq-Bal)</div>
             <div className="mt-3 flex items-center justify-between font-mono">
               {mt5Data?.connected && mt5Data?.balance && mt5Data?.equity != null ? (
                 <>
                   <span className={`text-2xl font-bold ${((mt5Data.balance - mt5Data.equity) / mt5Data.balance * 100) > 3 ? 'text-red-400' : 'text-white'}`}>
                     {((mt5Data.balance - mt5Data.equity) / mt5Data.balance * 100).toFixed(2)}%
                   </span>
                   <span className="text-gray-500 text-xs">/ 10%</span>
                 </>
               ) : (
                 <span className="text-2xl font-bold text-gray-500">—</span>
               )}
             </div>
           </div>

           {/* Small Donut Winrate */}
           <div className="p-4 bg-[#0c0c0d]/90 border border-white/5 rounded-xl flex items-center gap-4 shadow-lg group hover:border-white/20 transition-colors">
              <div className="w-14 h-14 relative flex-shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                   <PieChart><Pie data={[{name: 'W', value: metrics.winningTrades || 1, fill: '#00dc82'}, {name: 'L', value: metrics.losingTrades || 0, fill: '#ef4444'}]} dataKey="value" startAngle={90} endAngle={-270} innerRadius="70%" outerRadius="100%" stroke="none"/></PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex flex-col">
                 <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Win Rate</span>
                 <span className="text-xl font-bold font-mono text-white">{metrics.winRate.toFixed(0)}%</span>
              </div>
           </div>
         </div>
      </div>
    </div>
  );
}
