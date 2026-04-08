"use client";

import { useCsvTrades } from "@/hooks/useCsvTrades";
import type { TradeData } from "@/hooks/useCsvTrades";
import { useMemo } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie, AreaChart, Area, ScatterChart, Scatter, ZAxis
} from "recharts";
import Link from "next/link";

const TOOLTIP_STYLE = {
  contentStyle: {
    background: "#111118",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 10,
    fontSize: 12,
    color: "#e8e8f0",
  },
};

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border p-5" style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}>
      <div className="text-[10px] font-bold uppercase tracking-widest mb-4" style={{ color: "var(--text-tertiary)" }}>{title}</div>
      {children}
    </div>
  );
}

export default function Analytics() {
  const { trades, analytics, loading, error } = useCsvTrades();

  const winLossData = useMemo(() => [
    { name: "Wins", value: trades.filter((t: TradeData) => t.profit > 0).length },
    { name: "Losses", value: trades.filter((t: TradeData) => t.profit < 0).length },
    { name: "B/E", value: trades.filter((t: TradeData) => t.profit === 0).length },
  ].filter((d) => d.value > 0), [trades]);

  const { cumPnl, drawdownData } = useMemo(() => {
    let cum = 0;
    let hwm = 0;
    const cpArr: { date: string; cumPnl: number }[] = [];
    const ddArr: { date: string; drawdown: number; maxDrawdown: number }[] = [];
    
    [...trades].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(-60).forEach((t: TradeData) => { 
        cum += t.profit; 
        if (cum > hwm) hwm = cum;
        const dd = cum - hwm;
        const dateStr = new Date(t.date).toLocaleDateString("en-US", { month: "short", day: "numeric" });
        cpArr.push({ date: dateStr, cumPnl: Math.round(cum * 100) / 100 });
        ddArr.push({ date: dateStr, drawdown: Math.round(dd * 100) / 100, maxDrawdown: 0 });
      });
      
    // Calculate global Max DD for the set
    let absoluteMaxDd = 0;
    ddArr.forEach(d => { if (d.drawdown < absoluteMaxDd) absoluteMaxDd = d.drawdown; });
    ddArr.forEach(d => { d.maxDrawdown = absoluteMaxDd; });
      
    return { cumPnl: cpArr, drawdownData: ddArr };
  }, [trades]);

  const sharpeRatio = useMemo(() => {
    if (trades.length < 2) return 0;
    const profits = trades.map((t: TradeData) => t.profit);
    const mean = profits.reduce((a, b) => a + b, 0) / profits.length;
    const variance = profits.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / (profits.length - 1);
    const stdev = Math.sqrt(variance);
    // Multiply by sqrt(100) as a rough annualization factor for active traders, or just display raw.
    // We'll multiply by sqrt(100) to give a more standard 1.x-3.x look
    return stdev === 0 ? 0 : (mean / stdev) * Math.sqrt(100);
  }, [trades]);

  const dailyPnl = useMemo(() => {
    const map = new Map<string, number>();
    trades.forEach((t: TradeData) => { const d = new Date(t.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }); map.set(d, (map.get(d) || 0) + t.profit); });
    return Array.from(map.entries()).map(([date, pnl]) => ({ date, pnl: Math.round(pnl * 100) / 100 })).slice(-30);
  }, [trades]);

  const dayOfWeek = useMemo(() => {
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const map = new Map<string, { pnl: number; count: number }>();
    days.forEach((d) => map.set(d, { pnl: 0, count: 0 }));
    trades.forEach((t: TradeData) => { const d = days[new Date(t.date).getDay()]; const s = map.get(d)!; s.pnl += t.profit; s.count++; });
    return days.map((d) => ({ day: d, pnl: Math.round((map.get(d)?.pnl || 0) * 100) / 100, count: map.get(d)?.count || 0 }));
  }, [trades]);

  const symbolPerf = useMemo(() => {
    const map = new Map<string, { pnl: number; trades: number; wins: number }>();
    trades.forEach((t: TradeData) => {
      if (!map.has(t.pair)) map.set(t.pair, { pnl: 0, trades: 0, wins: 0 });
      const s = map.get(t.pair)!; s.pnl += t.profit; s.trades++; if (t.profit > 0) s.wins++;
    });
    return Array.from(map.entries()).map(([symbol, s]) => ({ symbol, pnl: s.pnl, trades: s.trades, winRate: (s.wins / s.trades) * 100 })).sort((a, b) => b.pnl - a.pnl);
  }, [trades]);

  const dirStats = useMemo(() => {
    const longs = trades.filter((t) => t.direction === "Long");
    const shorts = trades.filter((t) => t.direction === "Short");
    return {
      longs: { count: longs.length, wins: longs.filter((t) => t.profit > 0).length, pnl: longs.reduce((s, t) => s + t.profit, 0) },
      shorts: { count: shorts.length, wins: shorts.filter((t) => t.profit > 0).length, pnl: shorts.reduce((s, t) => s + t.profit, 0) },
    };
  }, [trades]);

  const timeOfDayData = useMemo(() => {
    const hours = Array.from({ length: 24 }, (_, i) => ({ hour: `${i.toString().padStart(2, "0")}:00`, pnl: 0, count: 0 }));
    trades.forEach((t: TradeData) => {
      const d = new Date(t.openTime || t.date);
      if(!isNaN(d.getTime())) {
        const h = d.getHours();
        hours[h].pnl += t.profit;
        hours[h].count++;
      }
    });
    return hours.map(h => ({ ...h, pnl: Math.round(h.pnl * 100) / 100 }));
  }, [trades]);

  const durationData = useMemo(() => {
    return trades
      .filter((t: TradeData) => t.openTime && t.openTime.length > 5)
      .map((t: TradeData) => {
        const start = new Date(t.openTime!).getTime();
        const end = new Date(t.date).getTime();
        const mins = Math.max(1, Math.round((end - start) / 60000));
        return { mins, profit: t.profit, pair: t.pair, id: t.id };
      })
      .filter((x) => x.mins < 10000 && !isNaN(x.mins) && !isNaN(x.profit));
  }, [trades]);

  const maxStreaks = useMemo(() => {
    let maxWins = 0, maxLosses = 0;
    let currWins = 0, currLosses = 0;
    [...trades].sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime()).forEach((t: TradeData) => {
      if (t.profit > 0) { currWins++; currLosses = 0; if (currWins > maxWins) maxWins = currWins; }
      else if (t.profit < 0) { currLosses++; currWins = 0; if (currLosses > maxLosses) maxLosses = currLosses; }
      else { currWins = 0; currLosses = 0; }
    });
    return { maxWins, maxLosses };
  }, [trades]);

  const expectancy = useMemo(() => {
    if(!analytics) return 0;
    const wr = analytics.winRate / 100;
    const lr = 1 - wr;
    return (wr * analytics.avgWin) + (lr * analytics.avgLoss);
  }, [analytics]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-10 h-10 border-2 border-[--accent] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || trades.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <div className="text-[--text-tertiary] text-center max-w-sm">
          <div className="text-[40px] mb-3">{error ? "⚠️" : "📊"}</div>
          <div className="font-bold text-[--text-primary] mb-1">{error ? "Bridge Connection Error" : "No live trade data"}</div>
          <div className="text-[13px]">
            {error ? (
              <span className="text-[--loss]">{error}</span>
            ) : (
              "Live MT5 synchronization is active, but your account has zero closed deals in the last 90 days."
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div>
        <h1 className="text-[28px] font-bold" style={{ fontFamily: "var(--font-display, Syne, sans-serif)", color: "var(--text-primary)" }}>
          Analytics
        </h1>
        <p className="text-[12px] mt-0.5" style={{ color: "var(--text-tertiary)" }}>
          {trades.length} trades imported · Performance breakdown from CSV data
        </p>
      </div>

      {/* Top KPI strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        {[
          { label: "Win Rate", value: `${(analytics?.winRate || 0).toFixed(1)}%`, color: (analytics?.winRate || 0) >= 50 ? "var(--bull)" : "var(--bear)" },
          { label: "Sharpe Ratio", value: `${sharpeRatio.toFixed(2)}`, color: sharpeRatio >= 1 ? "var(--bull)" : "var(--bear)" },
          { label: "Profit Factor", value: `${(analytics?.profitFactor || 0).toFixed(2)}`, color: (analytics?.profitFactor || 0) >= 1 ? "var(--bull)" : "var(--bear)" },
          { label: "Total Trades", value: `${analytics?.totalTrades || 0}`, color: "var(--text-primary)" },
          { label: "Avg Win", value: `$${(analytics?.avgWin || 0).toFixed(2)}`, color: "var(--bull)" },
          { label: "Avg Loss", value: `-$${Math.abs(analytics?.avgLoss || 0).toFixed(2)}`, color: "var(--bear)" },
          { label: "Expectancy", value: `$${expectancy.toFixed(2)}`, color: expectancy >= 0 ? "var(--bull)" : "var(--bear)" },
          { label: "Net P&L", value: `$${((analytics?.totalProfit || 0)).toFixed(2)}`, color: (analytics?.totalProfit || 0) >= 0 ? "var(--bull)" : "var(--bear)" },
        ].map((kpi) => (
          <div key={kpi.label} className="rounded-xl border p-3 flex flex-col justify-center" style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}>
            <div className="text-[9px] font-bold uppercase tracking-widest mb-1.5" style={{ color: "var(--text-tertiary)" }}>{kpi.label}</div>
            <div className="text-[18px] font-bold font-mono whitespace-nowrap" style={{ color: kpi.color }}>{kpi.value}</div>
          </div>
        ))}
      </div>

      {/* 2-col: Equity curve + Outcome pie */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <SectionCard title="Equity Curve (Cumulative P&L)">
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={cumPnl} syncId="analyticsCharts">
                <defs>
                  <linearGradient id="equityGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#00c896" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#00c896" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" tick={{ fontSize: 9, fill: "#555568" }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "#555568" }} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v}`} />
                <Tooltip {...TOOLTIP_STYLE} formatter={(v: number) => [`$${v.toFixed(2)}`, "Equity"]} />
                <Area type="monotone" dataKey="cumPnl" stroke="#00c896" strokeWidth={2} fill="url(#equityGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </SectionCard>
          <div className="mt-4" />
          <SectionCard title="Drawdown Curve">
            <ResponsiveContainer width="100%" height={160}>
              <AreaChart data={drawdownData} syncId="analyticsCharts">
                <defs>
                  <linearGradient id="ddGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#ff4d6a" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#ff4d6a" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" hide />
                <YAxis reversed={true} tick={{ fontSize: 10, fill: "#555568" }} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v}`} />
                <Tooltip {...TOOLTIP_STYLE} formatter={(v: number) => [`$${v.toFixed(2)}`, "Drawdown"]} />
                <Area type="monotone" dataKey="drawdown" stroke="#ff4d6a" strokeWidth={2} fill="url(#ddGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </SectionCard>
        </div>

        <SectionCard title="Outcome Distribution">
          {winLossData.length > 0 && (
            <>
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie data={winLossData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} dataKey="value" strokeWidth={0}>
                    <Cell fill="#00c896" />
                    <Cell fill="#ff4d6a" />
                    <Cell fill="#555568" />
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="flex justify-center gap-4 mt-2">
                {winLossData.map((d, i) => (
                  <div key={d.name} className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full" style={{ background: i === 0 ? "#00c896" : i === 1 ? "#ff4d6a" : "#555568" }} />
                    <span className="text-[11px]" style={{ color: "var(--text-secondary)" }}>{d.value} {d.name}</span>
                  </div>
                ))}
              </div>
              {/* Direction breakdown */}
              <div className="mt-4 pt-4 space-y-2" style={{ borderTop: "1px solid var(--border)" }}>
                <div className="text-[9px] font-bold uppercase tracking-widest mb-2" style={{ color: "var(--text-tertiary)" }}>Direction</div>
                {[
                  { label: "Long", stat: dirStats.longs, color: "var(--bull)" },
                  { label: "Short", stat: dirStats.shorts, color: "var(--bear)" },
                ].map((d) => (
                  <div key={d.label} className="flex justify-between text-[12px]">
                    <span style={{ color: d.color }}>{d.label}: {d.stat.count} trades</span>
                    <span style={{ color: d.stat.pnl >= 0 ? "var(--bull)" : "var(--bear)" }}>${d.stat.pnl.toFixed(2)}</span>
                  </div>
                ))}
              </div>
              <div className="mt-4 pt-4 space-y-2" style={{ borderTop: "1px solid var(--border)" }}>
                <div className="text-[9px] font-bold uppercase tracking-widest mb-2" style={{ color: "var(--text-tertiary)" }}>Consecutive Streaks</div>
                <div className="flex justify-between text-[12px]">
                  <span style={{ color: "var(--text-secondary)" }}>Max Wins In A Row</span>
                  <span style={{ color: "var(--bull)", fontWeight: "bold" }}>{maxStreaks.maxWins}</span>
                </div>
                <div className="flex justify-between text-[12px]">
                  <span style={{ color: "var(--text-secondary)" }}>Max Losses In A Row</span>
                  <span style={{ color: "var(--bear)", fontWeight: "bold" }}>{maxStreaks.maxLosses}</span>
                </div>
              </div>
            </>
          )}
        </SectionCard>
      </div>

      {/* Daily P&L bars */}
      <SectionCard title="Daily P&L (Last 30 Days)">
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={dailyPnl}>
            <XAxis dataKey="date" tick={{ fontSize: 9, fill: "#555568" }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fontSize: 10, fill: "#555568" }} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v}`} />
            <Tooltip {...TOOLTIP_STYLE} formatter={(v: number) => [`$${v.toFixed(2)}`, "P&L"]} />
            <Bar dataKey="pnl" radius={[2, 2, 0, 0]}>
              {dailyPnl.map((d, i) => <Cell key={i} fill={d.pnl >= 0 ? "#00c896" : "#ff4d6a"} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </SectionCard>

      {/* Day of week + Symbol performance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <SectionCard title="P&L by Day of Week">
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={dayOfWeek}>
              <XAxis dataKey="day" tick={{ fontSize: 10, fill: "#555568" }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 10, fill: "#555568" }} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v}`} />
              <Tooltip {...TOOLTIP_STYLE} formatter={(v: number) => [`$${v.toFixed(2)}`, "P&L"]} />
              <Bar dataKey="pnl" radius={[3, 3, 0, 0]}>
                {dayOfWeek.map((d, i) => <Cell key={i} fill={d.pnl >= 0 ? "#00c896" : "#ff4d6a"} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </SectionCard>

        <SectionCard title="Pair Performance">
          <div className="space-y-2 max-h-[200px] overflow-y-auto">
            {symbolPerf.map((s) => {
              const maxPnl = Math.max(...symbolPerf.map((x) => Math.abs(x.pnl)));
              const barW = maxPnl === 0 ? 0 : (Math.abs(s.pnl) / maxPnl) * 60;
              return (
                <div key={s.symbol} className="flex items-center gap-3 py-1">
                  <span className="w-[60px] text-[11px] font-bold font-mono flex-shrink-0" style={{ color: "var(--text-secondary)" }}>{s.symbol}</span>
                  <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
                    <div className="h-full rounded-full" style={{ width: `${barW}%`, background: s.pnl >= 0 ? "var(--bull)" : "var(--bear)" }} />
                  </div>
                  <span className="w-[60px] text-right text-[11px] font-mono font-bold flex-shrink-0" style={{ color: s.pnl >= 0 ? "var(--bull)" : "var(--bear)" }}>
                    {s.pnl >= 0 ? "+" : ""}${s.pnl.toFixed(0)}
                  </span>
                  <span className="text-[10px] w-[32px] text-right flex-shrink-0" style={{ color: s.winRate >= 50 ? "var(--bull)" : "var(--bear)" }}>
                    {s.winRate.toFixed(0)}%
                  </span>
                </div>
              );
            })}
          </div>
        </SectionCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <SectionCard title="Performance by Hour of Day">
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={timeOfDayData}>
              <XAxis dataKey="hour" tick={{ fontSize: 9, fill: "#555568" }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 10, fill: "#555568" }} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v}`} />
              <Tooltip {...TOOLTIP_STYLE} formatter={(v: number) => [`$${v.toFixed(2)}`, "P&L"]} />
              <Bar dataKey="pnl" radius={[2, 2, 0, 0]}>
                {timeOfDayData.map((d, i) => <Cell key={i} fill={d.pnl >= 0 ? "#00c896" : "#ff4d6a"} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </SectionCard>

        <SectionCard title="Trade Duration vs Profit">
          {durationData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                <XAxis type="number" dataKey="mins" name="Duration" unit="m" tick={{ fontSize: 10, fill: "#555568" }} tickLine={false} axisLine={false} />
                <YAxis type="number" dataKey="profit" name="P&L" unit="$" tick={{ fontSize: 10, fill: "#555568" }} tickLine={false} axisLine={false} />
                <ZAxis type="number" range={[40, 40]} />
                <Tooltip 
                  {...TOOLTIP_STYLE} 
                  cursor={{ strokeDasharray: '3 3' }} 
                  formatter={(value: number, name: string) => [name === 'P&L' ? `$${value}` : `${value}m`, name]} 
                />
                <Scatter name="Trades" data={durationData}>
                  {durationData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.profit >= 0 ? "#00c896" : "#ff4d6a"} fillOpacity={0.6} />
                  ))}
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[250px] text-[12px] opacity-60">
              No Open Time data available in this execution format
            </div>
          )}
        </SectionCard>
      </div>
    </div>
  );
}
