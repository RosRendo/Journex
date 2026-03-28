"use client";
import { useCsvTrades } from "@/hooks/useCsvTrades";
import type { TradeData } from "@/hooks/useCsvTrades";
import { useMemo } from "react";
import { TrendingUp, TrendingDown } from "lucide-react";

export default function Strategies() {
  const { trades, loading, error } = useCsvTrades();

  // Group trades by symbol and calculate stats
  const symbolStats = useMemo(() => {
    if (!trades) return [];

    const stats = new Map<
      string,
      {
        symbol: string;
        totalTrades: number;
        wins: number;
        losses: number;
        totalPnl: number;
        winRate: number;
        avgWin: number;
        avgLoss: number;
      }
    >();

    trades.forEach((t: TradeData) => {
      const symbol = t.pair;
      if (!stats.has(symbol)) {
        stats.set(symbol, {
          symbol,
          totalTrades: 0,
          wins: 0,
          losses: 0,
          totalPnl: 0,
          winRate: 0,
          avgWin: 0,
          avgLoss: 0,
        });
      }

      const stat = stats.get(symbol)!;
      stat.totalTrades++;
      stat.totalPnl += t.profit;

      if (t.profit > 0) {
        stat.wins++;
        stat.avgWin += t.profit;
      } else {
        stat.losses++;
        stat.avgLoss += Math.abs(t.profit);
      }
    });

    // Calculate averages and win rate
    const result = Array.from(stats.values()).map((s) => ({
      ...s,
      winRate: s.totalTrades > 0 ? (s.wins / s.totalTrades) * 100 : 0,
      avgWin: s.wins > 0 ? s.avgWin / s.wins : 0,
      avgLoss: s.losses > 0 ? s.avgLoss / s.losses : 0,
    }));

    return result.sort((a, b) => b.totalPnl - a.totalPnl);
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
          <h1 className="text-3xl font-bold">Trading Strategies (By Symbol)</h1>
          <p className="text-muted-foreground">
            Performance analysis by currency pair from MT5
          </p>
        </div>

        {error && (
          <div className="p-4 bg-loss/10 border border-loss/20 rounded text-loss text-sm">
            {error}
          </div>
        )}

        {symbolStats.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No trading data available</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {symbolStats.map((stat) => (
              <div
                key={stat.symbol}
                className={`rounded-lg border p-5 transition-all ${stat.totalPnl >= 0
                    ? "border-profit/20 bg-profit/5"
                    : "border-loss/20 bg-loss/5"
                  }`}
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold">{stat.symbol}</h3>
                  <div
                    className={`flex items-center gap-1 px-2 py-1 rounded ${stat.totalPnl >= 0
                        ? "bg-profit/10 text-profit"
                        : "bg-loss/10 text-loss"
                      }`}
                  >
                    {stat.totalPnl >= 0 ? (
                      <TrendingUp className="w-4 h-4" />
                    ) : (
                      <TrendingDown className="w-4 h-4" />
                    )}
                    <span className="text-sm font-semibold">
                      {stat.totalPnl >= 0 ? "+" : ""}
                      {stat.totalPnl.toFixed(2)}
                    </span>
                  </div>
                </div>

                <div className="space-y-3">
                  {/* Win Rate */}
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-xs text-muted-foreground">
                        Win Rate
                      </span>
                      <span className="text-sm font-semibold text-profit">
                        {stat.winRate.toFixed(1)}%
                      </span>
                    </div>
                    <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
                      <div
                        className="h-full bg-profit transition-all"
                        style={{ width: `${Math.min(stat.winRate, 100)}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* Trades */}
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">
                        Total
                      </p>
                      <p className="text-sm font-semibold">
                        {stat.totalTrades}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1 text-profit">
                        Wins
                      </p>
                      <p className="text-sm font-semibold text-profit">
                        {stat.wins}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1 text-loss">
                        Losses
                      </p>
                      <p className="text-sm font-semibold text-loss">
                        {stat.losses}
                      </p>
                    </div>
                  </div>

                  {/* Avg Win/Loss */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">
                        Avg Win
                      </p>
                      <p className="text-sm font-semibold text-profit">
                        ${stat.avgWin.toFixed(2)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">
                        Avg Loss
                      </p>
                      <p className="text-sm font-semibold text-loss">
                        -${stat.avgLoss.toFixed(2)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
  );
}
