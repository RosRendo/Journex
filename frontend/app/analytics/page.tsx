"use client";

import { useCsvTrades } from "@/hooks/useCsvTrades";
import type { TradeData } from "@/hooks/useCsvTrades";
import { useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
  AreaChart,
  Area,
} from "recharts";

function MetricRow({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <div className="flex justify-between items-center py-2 border-b border-border/50">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span
        className={`text-sm font-mono-nums font-semibold ${color || "text-foreground"}`}
      >
        {value}
      </span>
    </div>
  );
}

const tooltipStyle = {
  contentStyle: {
    background: "hsl(220,18%,12%)",
    border: "1px solid hsl(220,14%,18%)",
    borderRadius: 8,
    fontSize: 12,
  },
};

export default function Analytics() {
  const { trades, analytics, loading, error } = useCsvTrades();

  // Win / Loss pie data
  const winLossData = useMemo(() => {
    return [
      { name: "Wins", value: trades.filter((t: TradeData) => t.profit > 0).length },
      { name: "Losses", value: trades.filter((t: TradeData) => t.profit < 0).length },
      { name: "Break Even", value: trades.filter((t: TradeData) => t.profit === 0).length },
    ].filter((d) => d.value > 0);
  }, [trades]);

  // Cumulative P&L
  const cumPnl = useMemo(() => {
    let cum = 0;
    return [...trades]
      .sort(
        (a: TradeData, b: TradeData) =>
          new Date(a.date).getTime() - new Date(b.date).getTime(),
      )
      .slice(-60)
      .map((t: TradeData) => {
        cum += t.profit;
        return {
          date: new Date(t.date).toLocaleDateString(),
          cumPnl: Math.round(cum * 100) / 100,
        };
      });
  }, [trades]);

  // Daily P&L
  const dailyPnl = useMemo(() => {
    const map = new Map<string, number>();
    trades.forEach((t: TradeData) => {
      const date = new Date(t.date).toLocaleDateString();
      map.set(date, (map.get(date) || 0) + t.profit);
    });
    return Array.from(map.entries())
      .map(([date, pnl]) => ({ date, pnl: Math.round(pnl * 100) / 100 }))
      .slice(-30);
  }, [trades]);

  // Symbol performance
  const symbolPerf = useMemo(() => {
    const map = new Map<
      string,
      { pnl: number; trades: number; wins: number }
    >();
    trades.forEach((t: TradeData) => {
      const symbol = t.pair;
      if (!map.has(symbol)) {
        map.set(symbol, { pnl: 0, trades: 0, wins: 0 });
      }
      const stat = map.get(symbol)!;
      stat.pnl += t.profit;
      stat.trades++;
      if (t.profit > 0) stat.wins++;
    });
    return Array.from(map.entries())
      .map(([symbol, stat]) => ({
        symbol,
        pnl: stat.pnl,
        trades: stat.trades,
        winRate: (stat.wins / stat.trades) * 100,
      }))
      .sort((a, b) => b.pnl - a.pnl);
  }, [trades]);

  // Direction breakdown
  const directionStats = useMemo(() => {
    const longs = trades.filter((t) => t.direction === "Long");
    const shorts = trades.filter((t) => t.direction === "Short");
    return {
      longs: {
        count: longs.length,
        wins: longs.filter((t) => t.profit > 0).length,
        pnl: longs.reduce((s, t) => s + t.profit, 0),
      },
      shorts: {
        count: shorts.length,
        wins: shorts.filter((t) => t.profit > 0).length,
        pnl: shorts.reduce((s, t) => s + t.profit, 0),
      },
    };
  }, [trades]);

  if (loading) {
    return (
              <div className="flex items-center justify-center h-96">
          <div className="animate-spin">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full"></div>
          </div>
        </div>
    );
  }

  return (
          <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Analytics</h1>
          <p className="text-muted-foreground">
            Performance analytics from your CSV-imported trades
          </p>
        </div>

        {error && (
          <div className="p-4 bg-loss/10 border border-loss/20 rounded text-loss text-sm">
            {error}
          </div>
        )}

        {trades.length === 0 && !loading && (
          <div className="p-8 text-center border border-dashed border-border rounded-lg text-muted-foreground">
            No trade data. Upload a CSV from the{" "}
            <a href="/journal" className="text-primary hover:underline">
              Journal page
            </a>{" "}
            to see analytics.
          </div>
        )}

        {/* Top Row: Metrics */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          {/* Key Metrics */}
          <div className="rounded-lg border border-border bg-card p-4">
            <h3 className="text-sm font-medium text-muted-foreground mb-3">
              Key Metrics
            </h3>
            <MetricRow
              label="Win Rate"
              value={`${analytics?.winRate.toFixed(1) || 0}%`}
              color={(analytics?.winRate || 0) >= 50 ? "text-profit" : "text-loss"}
            />
            <MetricRow
              label="Profit Factor"
              value={`${analytics?.profitFactor.toFixed(2) || 0}`}
              color={(analytics?.profitFactor || 0) >= 1 ? "text-profit" : "text-loss"}
            />
            <MetricRow
              label="Total Trades"
              value={`${analytics?.totalTrades || 0}`}
            />
            <MetricRow
              label="Winning Trades"
              value={`${analytics?.winningTrades || 0}`}
              color="text-profit"
            />
            <MetricRow
              label="Losing Trades"
              value={`${analytics?.losingTrades || 0}`}
              color="text-loss"
            />
            <MetricRow
              label="Avg Win"
              value={`$${analytics?.avgWin.toFixed(2) || 0}`}
              color="text-profit"
            />
            <MetricRow
              label="Avg Loss"
              value={`-$${Math.abs(analytics?.avgLoss || 0).toFixed(2)}`}
              color="text-loss"
            />
            <MetricRow
              label="Best Trade"
              value={`$${analytics?.bestTrade.toFixed(2) || 0}`}
              color="text-profit"
            />
            <MetricRow
              label="Worst Trade"
              value={`$${analytics?.worstTrade.toFixed(2) || 0}`}
              color="text-loss"
            />
          </div>

          {/* Win/Loss Pie */}
          <div className="rounded-lg border border-border bg-card p-4">
            <h3 className="text-sm font-medium text-muted-foreground mb-3">
              Outcome Distribution
            </h3>
            {winLossData.length > 0 && (
              <>
                <ResponsiveContainer width="100%" height={160}>
                  <PieChart>
                    <Pie
                      data={winLossData}
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={70}
                      dataKey="value"
                      strokeWidth={0}
                    >
                      <Cell fill="hsl(142,72%,50%)" />
                      <Cell fill="hsl(0,72%,55%)" />
                      <Cell fill="hsl(215,14%,50%)" />
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex justify-center gap-4 mt-3 flex-wrap">
                  {winLossData.map((d, i) => (
                    <div key={d.name} className="flex items-center gap-1.5">
                      <div
                        className="w-2.5 h-2.5 rounded-full"
                        style={{
                          background:
                            i === 0 ? "hsl(142,72%,50%)" : i === 1 ? "hsl(0,72%,55%)" : "hsl(215,14%,50%)",
                        }}
                      />
                      <span className="text-xs text-muted-foreground">
                        {d.value} {d.name}
                      </span>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* Direction Breakdown */}
            <div className="mt-4 space-y-2">
              <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Direction</div>
              <div className="flex justify-between text-xs">
                <span className="text-profit">Long: {directionStats.longs.count} trades</span>
                <span className={directionStats.longs.pnl >= 0 ? "text-profit" : "text-loss"}>
                  ${directionStats.longs.pnl.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-loss">Short: {directionStats.shorts.count} trades</span>
                <span className={directionStats.shorts.pnl >= 0 ? "text-profit" : "text-loss"}>
                  ${directionStats.shorts.pnl.toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          {/* Cumulative P&L */}
          <div className="lg:col-span-2 rounded-lg border border-border bg-card p-4">
            <h3 className="text-sm font-medium text-muted-foreground mb-3">
              Cumulative P&L
            </h3>
            {cumPnl.length > 0 && (
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={cumPnl}>
                  <defs>
                    <linearGradient id="cumGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop
                        offset="0%"
                        stopColor="hsl(142,72%,50%)"
                        stopOpacity={0.3}
                      />
                      <stop
                        offset="100%"
                        stopColor="hsl(142,72%,50%)"
                        stopOpacity={0}
                      />
                    </linearGradient>
                  </defs>
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 9, fill: "hsl(215,14%,50%)" }}
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
                    {...tooltipStyle}
                    formatter={(v: number) => [`$${v.toFixed(2)}`, "Cum. P&L"]}
                  />
                  <Area
                    type="monotone"
                    dataKey="cumPnl"
                    stroke="hsl(142,72%,50%)"
                    strokeWidth={2}
                    fill="url(#cumGrad)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Daily P&L Chart */}
        <div className="rounded-lg border border-border bg-card p-4">
          <h3 className="text-sm font-medium text-muted-foreground mb-3">
            Daily P&L (Last 30 Days)
          </h3>
          {dailyPnl.length > 0 && (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={dailyPnl}>
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 9, fill: "hsl(215,14%,50%)" }}
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
                  {...tooltipStyle}
                  formatter={(v: number) => [`$${v.toFixed(2)}`, "P&L"]}
                />
                <Bar dataKey="pnl" radius={[2, 2, 0, 0]}>
                  {dailyPnl.map(
                    (d: { date: string; pnl: number }, i: number) => (
                      <Cell
                        key={i}
                        fill={
                          d.pnl >= 0 ? "hsl(142,72%,50%)" : "hsl(0,72%,55%)"
                        }
                      />
                    ),
                  )}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Symbol Performance */}
        <div className="rounded-lg border border-border bg-card p-4">
          <h3 className="text-sm font-medium text-muted-foreground mb-3">
            Performance by Symbol
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[400px] overflow-y-auto">
            {symbolPerf.map((s) => (
              <div
                key={s.symbol}
                className="p-3 rounded border border-border/50 hover:border-primary/30 transition-colors"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold">{s.symbol}</span>
                  <span
                    className={`text-sm font-bold ${s.pnl >= 0 ? "text-profit" : "text-loss"}`}
                  >
                    {s.pnl >= 0 ? "+" : ""}${s.pnl.toFixed(2)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{s.trades} trades</span>
                  <span className={s.winRate >= 50 ? "text-profit" : "text-loss"}>
                    {s.winRate.toFixed(0)}% wins
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
  );
}
