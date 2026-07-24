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
    safe: { text: "text-[--bull]", bg: "bg-[--bull]", border: "border-[--bull]/30", glow: "shadow-[0_0_12px_rgba(0,220,130,0.4)]" },
    warning: { text: "text-yellow-400", bg: "bg-yellow-500", border: "border-yellow-500/30", glow: "shadow-[0_0_12px_rgba(234,179,8,0.4)]" },
    danger: { text: "text-[--bear]", bg: "bg-[--bear]", border: "border-[--bear]/30", glow: "shadow-[0_0_12px_rgba(239,68,68,0.4)]" },
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
    <div className="rounded-xl border border-[--border] bg-[--bg-card] p-6 shadow-lg animate-fade-in relative overflow-hidden group">
      <div
        className={`absolute top-0 right-0 w-[200px] h-[200px] blur-[80px] rounded-full pointer-events-none transition-colors ${
          dailyStatus === "danger"
            ? "bg-[--bear]/10"
            : dailyStatus === "warning"
            ? "bg-yellow-500/10"
            : "bg-[--bull]/5"
        }`}
      />

      {/* Header */}
      <div className="flex items-center gap-2 mb-5 relative z-10">
        <Shield className="w-4 h-4 text-gray-400" />
        <h2 className="text-sm font-bold uppercase tracking-widest text-white">Daily Risk Monitor</h2>
      </div>

      {/* Horizontal layout: PnL | Drawdown bars | Rules */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative z-10">

        {/* Col 1: Today P&L */}
        <div
          className={`px-4 py-4 rounded-lg border ${
            todayPnl >= 0
              ? "bg-[--bull]/10 border-[--bull]/20"
              : "bg-[--bear]/10 border-[--bear]/20"
          }`}
        >
          <div className="text-[10px] uppercase tracking-widest font-bold text-gray-400 mb-2">
            Today's Realized P&L
          </div>
          <div
            className={`text-3xl font-bold font-mono ${
              todayPnl >= 0 ? "text-[--bull]" : "text-[--bear]"
            }`}
          >
            {todayPnl >= 0 ? "+" : "-"}${Math.abs(todayPnl).toFixed(2)}
          </div>
          <div className={`text-sm mt-1 font-mono ${todayPnl >= 0 ? "text-[--bull]/70" : "text-[--bear]/70"}`}>
            {todayPnlPct.toFixed(2)}% of balance
          </div>
        </div>

      <div className="space-y-6 mb-6 relative z-10">
        {/* Daily Drawdown Bar */}
        <div>
          <div className="flex justify-between items-end mb-3">
            <div className="flex items-center gap-2">
              <TrendingDown className="w-4 h-4 text-gray-400" />
              <span className="text-xs font-bold text-gray-300 uppercase tracking-widest">
                Daily Drawdown
              </span>
            </div>
            <span
              className={`text-sm font-mono font-bold ${statusColors[dailyStatus].text}`}
            >
              {Math.abs(todayPnlPct).toFixed(2)}% <span className="text-gray-600 text-xs">/ {maxDailyDrawdownPct}%</span>
            </span>
          </div>
          <div className="w-full h-4 bg-black/40 rounded-full overflow-hidden border border-white/5 shadow-[inset_0_2px_4px_rgba(0,0,0,0.4)] relative">
            <div
              className={`absolute top-0 left-0 h-full rounded-full transition-all duration-1000 ease-out ${statusColors[dailyStatus].bg} ${statusColors[dailyStatus].glow}`}
              style={{ width: `${dailyUsed}%` }}
            />
            {/* Glossy overlay */}
            <div className="absolute inset-0 bg-gradient-to-b from-white/20 to-transparent pointer-events-none rounded-full" />
          </div>
        </div>

        {/* Total Drawdown Bar */}
        <div>
          <div className="flex justify-between items-end mb-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-gray-400" />
              <span className="text-xs font-bold text-gray-300 uppercase tracking-widest">
                Total Drawdown
              </span>
            </div>
            <span
              className={`text-sm font-mono font-bold ${statusColors[totalStatus].text}`}
            >
              {totalDrawdownPct.toFixed(2)}% <span className="text-gray-600 text-xs">/ {maxTotalDrawdownPct}%</span>
            </span>
          </div>
          <div className="w-full h-4 bg-black/40 rounded-full overflow-hidden border border-white/5 shadow-[inset_0_2px_4px_rgba(0,0,0,0.4)] relative">
            <div
              className={`absolute top-0 left-0 h-full rounded-full transition-all duration-1000 ease-out ${statusColors[totalStatus].bg} ${statusColors[totalStatus].glow}`}
              style={{ width: `${totalUsed}%` }}
            />
            {/* Glossy overlay */}
            <div className="absolute inset-0 bg-gradient-to-b from-white/20 to-transparent pointer-events-none rounded-full" />
          </div>
        </div>
      </div>

        {/* Col 3: Rule Checklist */}
        <div>
          <div className="text-[10px] uppercase tracking-widest font-bold text-gray-500 mb-4 flex items-center gap-2">
            <Target className="w-3 h-3" />
            Risk Rules
          </div>
          <div className="space-y-3">
            {ruleChecks.map((rule, i) => (
              <div key={i} className="flex items-center gap-3">
                {rule.pass ? (
                  <CheckCircle2 className="w-4 h-4 text-[--bull] flex-shrink-0" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-[--bear] flex-shrink-0 animate-pulse" />
                )}
                <span className={`text-xs font-medium ${rule.pass ? "text-gray-300" : "text-[--bear]"}`}>
                  {rule.label}
                </span>
                <span className={`ml-auto text-[10px] font-bold uppercase ${rule.pass ? "text-[--bull]" : "text-[--bear]"}`}>
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

