import { useMemo } from "react";
import { Shield, TrendingDown, AlertTriangle, CheckCircle2, Target } from "lucide-react";
import { TradeData } from "@/hooks/useCsvTrades";

interface DailyRiskWidgetProps {
  trades: TradeData[];
  balance?: number;
  equity?: number;
  maxDailyDrawdownPct?: number;
  maxTotalDrawdownPct?: number;
}

export function DailyRiskWidget({
  trades,
  balance = 0,
  equity = 0,
  maxDailyDrawdownPct = 5,
  maxTotalDrawdownPct = 10,
}: DailyRiskWidgetProps) {
  const { todayPnl, todayPnlPct, totalDrawdownPct, todayTrades } = useMemo(() => {
    const today = new Date().toDateString();
    const todayTrades = trades.filter(t => new Date(t.date).toDateString() === today);
    const todayPnl = todayTrades.reduce((acc, t) => acc + t.profit, 0);
    const todayPnlPct = balance > 0 ? (todayPnl / balance) * 100 : 0;
    const totalDrawdownPct = balance > 0 && equity > 0
      ? ((balance - equity) / balance) * 100
      : 0;
    return { todayPnl, todayPnlPct, totalDrawdownPct, todayTrades };
  }, [trades, balance, equity]);

  const dailyUsed = Math.min(
    100,
    Math.abs(todayPnl < 0 ? Math.abs(todayPnlPct) / maxDailyDrawdownPct : 0) * 100
  );
  const totalUsed = Math.min(100, (Math.abs(totalDrawdownPct) / maxTotalDrawdownPct) * 100);

  const dailyStatus =
    dailyUsed >= 90 ? "danger" : dailyUsed >= 65 ? "warning" : "safe";
  const totalStatus =
    totalUsed >= 90 ? "danger" : totalUsed >= 65 ? "warning" : "safe";

  const statusColors = {
    safe: { text: "text-[#20e0b2]", bg: "bg-[#20e0b2]", border: "border-[rgba(32,224,178,0.2)]" },
    warning: { text: "text-[#f5c451]", bg: "bg-[#f5c451]", border: "border-[rgba(245,196,81,0.2)]" },
    danger: { text: "text-[#ff5c73]", bg: "bg-[#ff5c73]", border: "border-[rgba(255,92,115,0.2)]" },
  };

  const ruleChecks = [
    {
      label: "Daily loss < " + maxDailyDrawdownPct + "%",
      pass: todayPnlPct > -maxDailyDrawdownPct,
    },
    {
      label: "Total drawdown < " + maxTotalDrawdownPct + "%",
      pass: totalDrawdownPct < maxTotalDrawdownPct,
    },
    {
      label: "Positive day P&L",
      pass: todayPnl >= 0,
    },
    {
      label: "Trades recorded today",
      pass: todayTrades.length > 0,
    },
  ];

  return (
    <div className="bg-[#101014] border border-[rgba(255,255,255,0.07)] p-5 rounded-lg animate-fade-in relative overflow-hidden">

      {/* Header */}
      <div className="flex items-center gap-2 mb-4 relative z-10">
        <Shield className="w-3.5 h-3.5 text-zinc-400" />
        <h2 className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 font-mono">Daily Risk Monitor</h2>
      </div>

      <div className="flex flex-col gap-4 relative z-10 h-full font-mono text-[11px]">

        {/* Realized P&L */}
        <div
          className={`px-4 py-3.5 rounded-lg border ${
            todayPnl >= 0
              ? "bg-[#20e0b2]/5 border-[#20e0b2]/10"
              : "bg-[#ff5c73]/5 border-[#ff5c73]/10"
          }`}
        >
          <div className="text-[9px] uppercase tracking-widest font-bold text-zinc-500 mb-1.5">
            Today's Realized P&L
          </div>
          <div
            className={`text-2xl font-black ${
              todayPnl >= 0 ? "text-[#20e0b2]" : "text-[#ff5c73]"
            }`}
          >
            {todayPnl >= 0 ? "+" : "-"}${Math.abs(todayPnl).toFixed(2)}
          </div>
          <div className={`text-[10px] mt-0.5 ${todayPnl >= 0 ? "text-[#20e0b2]/80" : "text-[#ff5c73]/80"}`}>
            {todayPnlPct.toFixed(2)}% of balance
          </div>
        </div>

        <div className="space-y-4">
          {/* Daily Drawdown Bar */}
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <span className="text-[9px] font-bold text-zinc-300 uppercase tracking-widest">
                Daily Drawdown
              </span>
              <span className={`font-bold ${statusColors[dailyStatus].text}`}>
                {Math.abs(todayPnlPct).toFixed(2)}% <span className="text-zinc-500 text-[10px]">/ {maxDailyDrawdownPct}%</span>
              </span>
            </div>
            <div className="w-full h-1.5 bg-zinc-900 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-1000 ${
                  dailyStatus === "danger" ? "bg-[#ff5c73]" : dailyStatus === "warning" ? "bg-amber-450" : "bg-[#20e0b2]"
                }`}
                style={{ width: `${dailyUsed}%` }}
              />
            </div>
          </div>

          {/* Total Drawdown Bar */}
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <span className="text-[9px] font-bold text-zinc-300 uppercase tracking-widest">
                Total Drawdown
              </span>
              <span className={`font-bold ${statusColors[totalStatus].text}`}>
                {totalDrawdownPct.toFixed(2)}% <span className="text-zinc-500 text-[10px]">/ {maxTotalDrawdownPct}%</span>
              </span>
            </div>
            <div className="w-full h-1.5 bg-zinc-900 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-1000 ${
                  totalStatus === "danger" ? "bg-[#ff5c73]" : totalStatus === "warning" ? "bg-amber-450" : "bg-[#20e0b2]"
                }`}
                style={{ width: `${totalUsed}%` }}
              />
            </div>
          </div>
        </div>

        {/* Risk Rules */}
        <div>
          <div className="text-[9px] uppercase tracking-widest font-bold text-zinc-500 mb-2.5 flex items-center gap-1.5 border-t border-[rgba(255,255,255,0.07)] pt-3">
            <Target className="w-3 h-3" /> Risk Rules Parameters
          </div>
          <div className="space-y-2">
            {ruleChecks.map((rule, i) => (
              <div key={i} className="flex items-center justify-between text-[11px] py-0.5">
                <div className="flex items-center gap-2">
                  {rule.pass ? (
                    <div className="w-1.5 h-1.5 bg-[#20e0b2] rounded-full" />
                  ) : (
                    <div className="w-1.5 h-1.5 bg-[#ff5c73] rounded-full animate-pulse" />
                  )}
                  <span className={rule.pass ? "text-zinc-300" : "text-[#ff5c73] font-bold"}>
                    {rule.label}
                  </span>
                </div>
                <span className={`text-[9px] font-bold uppercase tracking-wider ${rule.pass ? "text-[#20e0b2]" : "text-[#ff5c73]"}`}>
                  {rule.pass ? "Pass" : "Fail"}
                </span>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}


