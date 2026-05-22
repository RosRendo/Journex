"use client";

import { useEffect, useState } from "react";
import { fetchJournalStats } from "../../lib/terminalApi";

interface EquityPoint {
  equity: number;
}

interface EquityCurveProps {
  curve: EquityPoint[];
}

function EquitySpark({ curve }: EquityCurveProps) {
  if (!curve || curve.length === 0) return null;
  const w = 600, h = 110, pad = 8;
  const xs = curve.map((_, i) => i);
  const ys = curve.map((p) => p.equity);
  const minY = Math.min(...ys), maxY = Math.max(...ys);
  const sx = (i: number) => pad + (i / Math.max(1, xs.length - 1)) * (w - 2 * pad);
  const sy = (y: number) => h - pad - ((y - minY) / Math.max(1, maxY - minY)) * (h - 2 * pad);
  const d = xs.map((i) => `${i === 0 ? "M" : "L"}${sx(i).toFixed(1)},${sy(ys[i]).toFixed(1)}`).join(" ");
  const fill = `${d} L${sx(xs.length - 1).toFixed(1)},${h - pad} L${sx(0).toFixed(1)},${h - pad} Z`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-28">
      <defs>
        <linearGradient id="eqfill" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#10b981" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={fill} fill="url(#eqfill)" />
      <path d={d} stroke="#10b981" strokeWidth="1.5" fill="none" />
    </svg>
  );
}

export default function PerformanceTab() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchJournalStats()
      .then(setStats)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div data-testid="performance-tab" className="h-full px-3 py-2 text-[11px] text-zinc-500 font-mono">
        Loading performance stats…
      </div>
    );
  }
  if (!stats || stats.trades_count === 0) {
    return (
      <div data-testid="performance-tab" className="h-full px-3 py-2 text-[11px] text-zinc-500 font-mono">
        No closed trades yet.
      </div>
    );
  }

  const kpis = [
    { label: "Trades", value: stats.trades_count, cls: "text-zinc-100" },
    { label: "Win Rate", value: `${stats.win_rate}%`, cls: stats.win_rate >= 50 ? "text-emerald-500" : "text-red-500" },
    { label: "Profit Factor", value: stats.profit_factor, cls: stats.profit_factor >= 1.5 ? "text-emerald-500" : "text-amber-500" },
    { label: "Total P&L", value: (stats.total_pnl >= 0 ? "+" : "") + "$" + stats.total_pnl.toLocaleString(), cls: stats.total_pnl >= 0 ? "text-emerald-500" : "text-red-500" },
    { label: "Avg Win", value: `+$${stats.avg_win}`, cls: "text-emerald-500" },
    { label: "Avg Loss", value: `$${stats.avg_loss}`, cls: "text-red-500" },
    { label: "Best Trade", value: `+$${stats.best_trade}`, cls: "text-emerald-500" },
    { label: "Worst Trade", value: `$${stats.worst_trade}`, cls: "text-red-500" },
  ];

  return (
    <div data-testid="performance-tab" className="h-full overflow-y-auto scroll-thin grid grid-cols-[1fr_auto] gap-px bg-zinc-800">
      <div className="bg-black p-3">
        <div className="text-[9px] uppercase tracking-widest text-amber-500 mb-1">
          Equity Curve · since first trade
        </div>
        <EquitySpark curve={stats.equity_curve} />
        <div className="mt-3 grid grid-cols-4 gap-px bg-zinc-800">
          {kpis.map((k) => (
            <div key={k.label} className="bg-black px-2 py-1.5 flex flex-col">
              <span className="text-[9px] uppercase tracking-widest text-zinc-500">{k.label}</span>
              <span className={`font-mono text-[13px] tabular-nums ${k.cls}`}>{k.value}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="bg-black w-72 p-3">
        <div className="text-[9px] uppercase tracking-widest text-amber-500 mb-1">
          Monthly Breakdown
        </div>
        <table className="w-full text-[11px]">
          <thead>
            <tr className="text-[9px] uppercase tracking-widest text-zinc-500">
              <th className="text-left py-1 font-normal">Month</th>
              <th className="text-right py-1 font-normal">Trades</th>
              <th className="text-right py-1 font-normal">P&amp;L</th>
            </tr>
          </thead>
          <tbody>
            {stats.monthly.map((m: any) => (
              <tr key={m.month} className="border-t border-zinc-900">
                <td className="py-1 font-mono text-zinc-400">{m.month}</td>
                <td className="py-1 text-right font-mono text-zinc-300">{m.trades}</td>
                <td className={`py-1 text-right font-mono ${m.pnl >= 0 ? "text-emerald-500" : "text-red-500"}`}>
                  {m.pnl >= 0 ? "+" : ""}${m.pnl.toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
