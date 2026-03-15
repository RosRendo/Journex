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
  PieChart,
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
} from "recharts";
import Link from "next/link";

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
      className={`rounded-lg border p-4 ${variant === "profit"
        ? "border-profit/20 bg-profit-muted glow-profit"
        : variant === "loss"
          ? "border-loss/20 bg-loss-muted glow-loss"
          : "border-border bg-card"
        } animate-fade-in`}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          {label}
        </span>
        <Icon
          className={`w-4 h-4 ${variant === "profit"
            ? "text-profit"
            : variant === "loss"
              ? "text-loss"
              : "text-muted-foreground"
            }`}
        />
      </div>
      <div
        className={`text-2xl font-bold font-mono-nums ${variant === "profit"
          ? "text-profit"
          : variant === "loss"
            ? "text-loss"
            : "text-foreground"
          }`}
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
        const res = await fetch(`${BRIDGE_URL}/health`);
        if (res.ok) {
          const data = await res.json();
          // /health gives us connected + balance, try /api/account for full stats
          if (data.connected) {
            try {
              const accRes = await fetch(`${BRIDGE_URL}/api/account`);
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
          <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
            <p className="text-sm text-muted-foreground">
              {trades.length > 0
                ? `${trades.length} trades loaded from CSV imports`
                : "No trades yet – upload a broker CSV to get started"}
            </p>
          </div>

          {/* Upload CTA */}
          <Link
            href="/journal"
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-primary/40 bg-primary/10 hover:bg-primary/20 text-primary text-sm font-medium transition-colors"
          >
            <Upload className="w-4 h-4" />
            Import CSV
          </Link>
        </div>

        {/* Error */}
        {error && (
          <div className="p-3 bg-loss/10 border border-loss/20 rounded text-loss text-sm">
            {error}
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="text-sm text-muted-foreground animate-pulse">
            Loading trades...
          </div>
        )}

        {/* Live MT5 Status Widget */}
        <div className={`p-5 rounded-xl border ${mt5Data?.connected ? "border-green-500/30 bg-green-500/5" : "border-red-500/30 bg-red-500/5"} flex flex-col md:flex-row items-start md:items-center justify-between gap-4`}>
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-full ${mt5Data?.connected ? "bg-green-500/20 text-green-500" : "bg-red-500/20 text-red-500"}`}>
              <Wifi size={24} className={mt5Data?.connected ? "animate-pulse" : ""} />
            </div>
            <div>
              <h2 className="font-bold text-foreground flex items-center gap-2">
                Live Broker Connection
                <span className={`text-[10px] px-2 py-0.5 rounded-full ${mt5Data?.connected ? "bg-green-500 text-foreground" : "bg-gray-500 text-foreground"}`}>
                  {mt5Data?.connected ? "MT5 CONNECTED" : "OFFLINE"}
                </span>
              </h2>
              <p className="text-sm text-muted-foreground">Real-time data from local MetaTrader 5 Bridge</p>
            </div>
          </div>

          {mt5Data?.connected && (
            <div className="flex gap-6 overflow-x-auto w-full md:w-auto">
              <div>
                <div className="text-xs text-muted-foreground font-semibold flex items-center gap-1"><DollarSign size={12} /> Balance</div>
                <div className="text-lg font-bold font-mono">${mt5Data.balance?.toFixed(2)}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground font-semibold flex items-center gap-1"><PieChart size={12} /> Equity</div>
                <div className="text-lg font-bold font-mono">${mt5Data.equity?.toFixed(2)}</div>
              </div>
              <div className="pr-4 md:pr-0">
                <div className="text-xs text-muted-foreground font-semibold flex items-center gap-1">Live Profit</div>
                <div className={`text-lg font-bold font-mono ${mt5Data.profit && mt5Data.profit >= 0 ? "text-green-500" : "text-red-500"}`}>
                  ${mt5Data.profit?.toFixed(2)}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <StatCard
            label="Total P&L"
            value={`$${metrics.totalProfit.toFixed(0)}`}
            icon={metrics.totalProfit >= 0 ? TrendingUp : TrendingDown}
            variant={metrics.totalProfit >= 0 ? "profit" : "loss"}
          />
          <StatCard
            label="Win Rate"
            value={`${metrics.winRate.toFixed(1)}%`}
            icon={Target}
            variant={metrics.winRate >= 50 ? "profit" : "loss"}
          />
          <StatCard
            label="Profit Factor"
            value={
              metrics.profitFactor === Infinity
                ? "∞"
                : metrics.profitFactor.toFixed(2)
            }
            icon={BarChart3}
            variant={metrics.profitFactor >= 1 ? "profit" : "loss"}
          />
          <StatCard
            label="Total Trades"
            value={String(metrics.totalTrades)}
            icon={Activity}
          />
          <StatCard
            label="Best Trade"
            value={`$${metrics.bestTrade.toFixed(0)}`}
            icon={TrendingUp}
            variant="profit"
          />
          <StatCard
            label="Worst Trade"
            value={`$${metrics.worstTrade.toFixed(0)}`}
            icon={TrendingDown}
            variant="loss"
          />
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Equity Curve */}
          <div className="lg:col-span-2 rounded-lg border border-border bg-card p-4">
            <h3 className="text-sm font-medium text-muted-foreground mb-4">
              Cumulative P&L Curve
            </h3>
            {equityCurve.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={equityCurve}>
                  <defs>
                    <linearGradient id="equityGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop
                        offset="0%"
                        stopColor="hsl(210,100%,56%)"
                        stopOpacity={0.3}
                      />
                      <stop
                        offset="100%"
                        stopColor="hsl(210,100%,56%)"
                        stopOpacity={0}
                      />
                    </linearGradient>
                  </defs>
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 10, fill: "hsl(215,14%,50%)" }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: "hsl(215,14%,50%)" }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => `$${v}`}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "hsl(220,18%,12%)",
                      border: "1px solid hsl(220,14%,18%)",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                    labelStyle={{ color: "hsl(215,14%,50%)" }}
                    formatter={(v: number) => [`$${v.toFixed(2)}`, "P&L"]}
                  />
                  <Area
                    type="monotone"
                    dataKey="balance"
                    stroke="hsl(210,100%,56%)"
                    strokeWidth={2}
                    fill="url(#equityGrad)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[280px] text-muted-foreground text-sm">
                No trade data yet
              </div>
            )}
          </div>

          {/* Symbol Performance */}
          <div className="rounded-lg border border-border bg-card p-4">
            <h3 className="text-sm font-medium text-muted-foreground mb-4">
              P&L by Symbol
            </h3>
            {strategyStats.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={strategyStats} layout="vertical">
                  <XAxis
                    type="number"
                    tick={{ fontSize: 10, fill: "hsl(215,14%,50%)" }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => `$${v}`}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    tick={{ fontSize: 11, fill: "hsl(210,20%,85%)" }}
                    tickLine={false}
                    axisLine={false}
                    width={80}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "hsl(220,18%,12%)",
                      border: "1px solid hsl(220,14%,18%)",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                    formatter={(v: number) => [`$${v.toFixed(2)}`, "P&L"]}
                  />
                  <Bar dataKey="pnl" radius={[0, 4, 4, 0]}>
                    {strategyStats.map((entry, i) => (
                      <Cell
                        key={i}
                        fill={
                          entry.pnl >= 0 ? "hsl(142,72%,50%)" : "hsl(0,72%,55%)"
                        }
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[280px] text-muted-foreground text-sm">
                No data yet
              </div>
            )}
          </div>
        </div>

        {/* Recent Trades */}
        <div className="rounded-lg border border-border bg-card">
          <div className="p-4 border-b border-border">
            <h3 className="text-sm font-medium text-muted-foreground">
              Recent Trades
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-xs text-muted-foreground uppercase tracking-wider">
                  <th className="text-left p-3">Date</th>
                  <th className="text-left p-3">Pair</th>
                  <th className="text-left p-3">Direction</th>
                  <th className="text-right p-3">Lot</th>
                  <th className="text-right p-3">P&L</th>
                  <th className="text-center p-3">Result</th>
                </tr>
              </thead>
              <tbody>
                {recentTrades.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-muted-foreground">
                      No trades yet.{" "}
                      <Link href="/journal" className="text-primary hover:underline">
                        Upload a CSV
                      </Link>{" "}
                      to see your trades here.
                    </td>
                  </tr>
                ) : (
                  recentTrades.map((t) => (
                    <tr
                      key={t.id}
                      className="border-b border-border/50 hover:bg-secondary/30 transition-colors"
                    >
                      <td className="p-3 font-mono-nums text-muted-foreground">
                        {new Date(t.date).toLocaleDateString()}
                      </td>
                      <td className="p-3 font-medium">{t.pair}</td>
                      <td className="p-3">
                        <span
                          className={`px-2 py-0.5 rounded text-xs font-medium ${t.direction === "Long"
                            ? "bg-profit-muted text-profit"
                            : "bg-loss-muted text-loss"
                            }`}
                        >
                          {t.direction.toUpperCase()}
                        </span>
                      </td>
                      <td className="p-3 text-right font-mono-nums">
                        {t.lotSize?.toFixed(2) ?? "-"}
                      </td>
                      <td
                        className={`p-3 text-right font-mono-nums font-medium ${t.profit >= 0 ? "text-profit" : "text-loss"}`}
                      >
                        {t.profit >= 0 ? "+" : ""}${t.profit.toFixed(2)}
                      </td>
                      <td className="p-3 text-center">
                        <span
                          className={`px-2 py-0.5 rounded text-xs font-bold ${t.outcome === "W"
                            ? "bg-profit/10 text-profit"
                            : t.outcome === "L"
                              ? "bg-loss/10 text-loss"
                              : "bg-muted text-muted-foreground"
                            }`}
                        >
                          {t.outcome}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
  );
}
