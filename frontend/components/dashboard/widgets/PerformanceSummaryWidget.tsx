import { useMemo } from "react";
import { TradeData } from "@/hooks/useCsvTrades";

interface Props {
  trades: TradeData[];
}

export function PerformanceSummaryWidget({ trades }: Props) {
  const metrics = useMemo(() => {
    let wins = 0;
    let losses = 0;
    let totalWin = 0;
    let totalLoss = 0;

    trades.forEach((t) => {
      if (t.profit > 0) {
        wins++;
        totalWin += t.profit;
      } else if (t.profit < 0) {
        losses++;
        totalLoss += Math.abs(t.profit);
      }
    });

    const total = wins + losses;
    const winRate = total > 0 ? (wins / total) * 100 : 0;
    const avgWin = wins > 0 ? totalWin / wins : 0;
    const avgLoss = losses > 0 ? totalLoss / losses : 0;
    const profitFactor = totalLoss > 0 ? totalWin / totalLoss : 0;
    
    // Simplified Sharpe (Average Return / StdDev, assumes risk free rate 0)
    const returns = trades.map(t => t.profit);
    const avgReturn = returns.length > 0 ? returns.reduce((a, b) => a + b, 0) / returns.length : 0;
    const sqDiffs = returns.map(r => Math.pow(r - avgReturn, 2));
    const variance = sqDiffs.length > 0 ? sqDiffs.reduce((a, b) => a + b, 0) / sqDiffs.length : 0;
    const stdDev = Math.sqrt(variance);
    const sharpeRatio = stdDev > 0 ? avgReturn / stdDev : 0;

    const expectancy = (winRate / 100 * avgWin) - ((1 - winRate / 100) * avgLoss);

    return {
      winRate,
      avgWin,
      avgLoss,
      profitFactor,
      sharpeRatio,
      expectancy,
    };
  }, [trades]);

  const MetricBox = ({ label, value, color = "text-white" }: { label: string, value: string, color?: string }) => (
    <div className="flex flex-col p-4 bg-white/[0.02] border border-white/5 rounded-xl">
      <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-2">{label}</span>
      <span className={`text-xl font-bold font-mono ${color}`}>{value}</span>
    </div>
  );

  return (
    <div className="w-full bg-[#0c0c0d]/90 border border-white/5 rounded-xl p-5">
      <h3 className="text-sm font-bold uppercase tracking-widest text-white mb-4">Performance Summary</h3>
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        <MetricBox label="Win Rate" value={`${metrics.winRate.toFixed(1)}%`} color={metrics.winRate >= 50 ? "text-[#20e0b2]" : "text-[#ff5c73]"} />
        <MetricBox label="Avg Win" value={`$${metrics.avgWin.toFixed(2)}`} color="text-[#20e0b2]" />
        <MetricBox label="Avg Loss" value={`$${metrics.avgLoss.toFixed(2)}`} color="text-[#ff5c73]" />
        <MetricBox label="Profit Factor" value={`${metrics.profitFactor.toFixed(2)}`} color={metrics.profitFactor >= 1 ? "text-[#20e0b2]" : "text-[#ff5c73]"} />
        <MetricBox label="Sharpe Ratio" value={`${metrics.sharpeRatio.toFixed(2)}`} color={metrics.sharpeRatio >= 1 ? "text-[#20e0b2]" : "text-white"} />
        <MetricBox label="Expectancy" value={`$${metrics.expectancy.toFixed(2)}`} color={metrics.expectancy >= 0 ? "text-[#20e0b2]" : "text-[#ff5c73]"} />
      </div>
    </div>
  );
}

