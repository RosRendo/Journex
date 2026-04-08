import { useMemo } from "react";
import { Bell, AlertTriangle, TrendingDown, CheckCircle2, Activity, Wifi, WifiOff } from "lucide-react";
import { TradeData } from "@/hooks/useCsvTrades";
import { Position } from "@/hooks/usePositions";

interface Alert {
  id: string;
  type: "warning" | "success" | "info" | "danger";
  title: string;
  detail: string;
  timestamp: Date;
}

interface AlertsWidgetProps {
  trades: TradeData[];
  positions: Position[];
  mt5Connected?: boolean;
  balance?: number;
  equity?: number;
  maxDailyDrawdownPct?: number;
}

export function AlertsWidget({ trades, positions, mt5Connected, balance, equity, maxDailyDrawdownPct = 5 }: AlertsWidgetProps) {
  const alerts = useMemo<Alert[]>(() => {
    const now = new Date();
    const result: Alert[] = [];

    // ─── MT5 Connection ────────────────────────────────────────
    if (mt5Connected === false) {
      result.push({
        id: "mt5-disconnected",
        type: "danger",
        title: "MT5 Bridge Offline",
        detail: "Cannot connect to the MetaTrader 5 terminal. Check your bridge is running.",
        timestamp: now,
      });
    } else if (mt5Connected === true) {
      result.push({
        id: "mt5-connected",
        type: "success",
        title: "MT5 Bridge Online",
        detail: "Live connection to MetaTrader 5 is active.",
        timestamp: now,
      });
    }

    // ─── Daily Drawdown ────────────────────────────────────────
    if (balance && equity) {
      const drawdownPct = ((balance - equity) / balance) * 100;
      if (drawdownPct >= maxDailyDrawdownPct * 0.9) {
        result.push({
          id: "drawdown-critical",
          type: "danger",
          title: "Drawdown Limit Critical",
          detail: `Equity drawdown is ${drawdownPct.toFixed(2)}%, approaching your ${maxDailyDrawdownPct}% daily limit.`,
          timestamp: now,
        });
      } else if (drawdownPct >= maxDailyDrawdownPct * 0.6) {
        result.push({
          id: "drawdown-warning",
          type: "warning",
          title: "Drawdown Warning",
          detail: `Equity is down ${drawdownPct.toFixed(2)}%. Monitor closely.`,
          timestamp: now,
        });
      }
    }

    // ─── Open Positions ────────────────────────────────────────
    const losingPositions = positions.filter(p => p.pnl < -50);
    if (losingPositions.length > 0) {
      result.push({
        id: "positions-losing",
        type: "warning",
        title: `${losingPositions.length} Position${losingPositions.length > 1 ? "s" : ""} in Loss`,
        detail: losingPositions.map(p => `${p.pair} ${p.direction}: ${p.pnl >= 0 ? '+' : ''}$${p.pnl.toFixed(2)}`).join(" · "),
        timestamp: now,
      });
    }

    const noSl = positions.filter(p => !p.sl || p.sl === 0);
    if (noSl.length > 0) {
      result.push({
        id: "positions-no-sl",
        type: "danger",
        title: "Positions Without Stop Loss",
        detail: `${noSl.map(p => p.pair).join(", ")} — No stop loss set. High risk of large loss!`,
        timestamp: now,
      });
    }

    // ─── Today's performance ───────────────────────────────────
    const today = new Date().toDateString();
    const todayTrades = trades.filter(t => new Date(t.date).toDateString() === today);
    const todayPnl = todayTrades.reduce((acc, t) => acc + t.profit, 0);
    if (todayTrades.length > 0) {
      result.push({
        id: "today-performance",
        type: todayPnl >= 0 ? "success" : "warning",
        title: `Today: ${todayPnl >= 0 ? "+" : ""}$${todayPnl.toFixed(2)} (${todayTrades.length} trades)`,
        detail: todayPnl >= 0
          ? "Positive session. Stay disciplined and protect profits."
          : "Negative session. Review entries and consider reducing lot size.",
        timestamp: now,
      });
    }

    // ─── No activity ──────────────────────────────────────────
    if (result.length === 0 || (result.length === 1 && result[0].id === "mt5-connected")) {
      result.push({
        id: "all-clear",
        type: "info",
        title: "All Systems Normal",
        detail: "No active alerts. Your risk metrics and positions are within bounds.",
        timestamp: now,
      });
    }

    return result.sort((a, b) => {
      const priority: Record<string, number> = { danger: 0, warning: 1, info: 2, success: 3 };
      return (priority[a.type] ?? 4) - (priority[b.type] ?? 4);
    });
  }, [trades, positions, mt5Connected, balance, equity, maxDailyDrawdownPct]);

  const iconMap = {
    danger: <AlertTriangle className="w-4 h-4 text-[--bear] flex-shrink-0" />,
    warning: <AlertTriangle className="w-4 h-4 text-yellow-400 flex-shrink-0" />,
    info: <Activity className="w-4 h-4 text-blue-400 flex-shrink-0" />,
    success: <CheckCircle2 className="w-4 h-4 text-[--bull] flex-shrink-0" />,
  };

  const bgMap = {
    danger: "bg-[--bear]/5 border-[--bear]/20",
    warning: "bg-yellow-500/5 border-yellow-500/20",
    info: "bg-blue-500/5 border-blue-500/20",
    success: "bg-[--bull]/5 border-[--bull]/20",
  };

  return (
    <div className="rounded-xl border border-[--border] bg-[--bg-card] h-full flex flex-col shadow-lg animate-fade-in relative overflow-hidden group">
      <div className="absolute top-0 right-0 w-[200px] h-[200px] bg-yellow-500/5 blur-[80px] rounded-full pointer-events-none" />

      {/* Header */}
      <div className="p-5 border-b border-[--border] flex items-center justify-between relative z-10" style={{ backgroundColor: "rgba(255,255,255,0.02)" }}>
        <div className="flex items-center gap-2">
          <Bell className="w-4 h-4 text-yellow-400" />
          <h2 className="text-sm font-bold uppercase tracking-widest text-white">Live Alerts</h2>
        </div>
        <div className="flex items-center gap-3">
          {mt5Connected ? (
            <div className="flex items-center gap-1.5 text-[10px] font-bold text-[--bull]">
              <Wifi className="w-3 h-3" /> Connected
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-[10px] font-bold text-[--bear]">
              <WifiOff className="w-3 h-3" /> Offline
            </div>
          )}
          <div className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${
            alerts.some(a => a.type === "danger")
              ? "bg-[--bear]/10 border-[--bear]/30 text-[--bear]"
              : alerts.some(a => a.type === "warning")
              ? "bg-yellow-500/10 border-yellow-500/30 text-yellow-400"
              : "bg-[--bull]/10 border-[--bull]/30 text-[--bull]"
          }`}>
            {alerts.length} Alert{alerts.length !== 1 ? "s" : ""}
          </div>
        </div>
      </div>

      {/* Alerts List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar relative z-10">
        {alerts.map(alert => (
          <div key={alert.id} className={`flex items-start gap-3 p-4 rounded-lg border ${bgMap[alert.type]} transition-all hover:brightness-110`}>
            <div className="mt-0.5">{iconMap[alert.type]}</div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-white mb-1">{alert.title}</p>
              <p className="text-[11px] text-gray-400 leading-relaxed">{alert.detail}</p>
            </div>
          </div>
        ))}
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 4px; }
        .custom-scrollbar:hover::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.2); }
      `}</style>
    </div>
  );
}
