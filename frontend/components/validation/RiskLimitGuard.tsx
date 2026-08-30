"use client";
import { useState, useEffect } from "react";
import { AlertTriangle, Shield, TrendingDown, TrendingUp, DollarSign, Percent, Activity, Clock, Ban, Zap } from "lucide-react";

interface RiskLimit {
  id: string;
  label: string;
  type: "daily" | "weekly" | "monthly";
  current: number;
  limit: number;
  unit: "percent" | "dollars" | "trades";
  enabled: boolean;
}

const defaultLimits: RiskLimit[] = [
  { id: "1", label: "Daily Loss Limit", type: "daily", current: 1.8, limit: 4, unit: "percent", enabled: true },
  { id: "2", label: "Daily Profit Target", type: "daily", current: 2.1, limit: 3, unit: "percent", enabled: true },
  { id: "3", label: "Daily Trade Limit", type: "daily", current: 3, limit: 5, unit: "trades", enabled: true },
  { id: "4", label: "Weekly Loss Limit", type: "weekly", current: 4.2, limit: 10, unit: "percent", enabled: true },
  { id: "5", label: "Weekly Profit Target", type: "weekly", current: 6.8, limit: 8, unit: "percent", enabled: false },
  { id: "6", label: "Consecutive Losses", type: "daily", current: 2, limit: 3, unit: "trades", enabled: true },
  { id: "7", label: "Monthly Loss Limit", type: "monthly", current: 8.5, limit: 15, unit: "percent", enabled: true },
];

const mockAccountBalance = 10000;

export default function RiskLimitGuard() {
  const [limits, setLimits] = useState<RiskLimit[]>(defaultLimits);
  const [isBlocked, setIsBlocked] = useState(false);
  const [activeWarnings, setActiveWarnings] = useState<string[]>([]);

  useEffect(() => {
    const warnings: string[] = [];

    limits.filter(l => l.enabled).forEach(limit => {
      const usage = (limit.current / limit.limit) * 100;
      
      if (limit.unit === "percent" && limit.label.includes("Loss")) {
        if (usage >= 100) {
          warnings.push(`CRITICAL: ${limit.label} reached!`);
        } else if (usage >= 80) {
          warnings.push(`WARNING: ${limit.label} at ${usage.toFixed(0)}%`);
        }
      } else if (limit.unit === "trades") {
        if (limit.current >= limit.limit) {
          warnings.push(`BLOCKED: ${limit.label} reached`);
        } else if (limit.current >= limit.limit - 1) {
          warnings.push(`WARNING: ${limit.label} at ${limit.current}/${limit.limit}`);
        }
      } else if (limit.label.includes("Target") && limit.current >= limit.limit) {
        warnings.push(`TARGET HIT: ${limit.label} achieved!`);
      }
    });

    setActiveWarnings(warnings);
    setIsBlocked(warnings.some(w => w.includes("BLOCKED") || w.includes("CRITICAL")));
  }, [limits]);

  const getUsageColor = (current: number, limit: number, isLoss: boolean) => {
    const usage = (current / limit) * 100;
    if (isLoss) {
      if (usage >= 100) return "#ff5c73";
      if (usage >= 80) return "#f97316";
      return "#10b981";
    }
    return current >= limit ? "#10b981" : "#71717a";
  };

  const getStatusIcon = (limit: RiskLimit) => {
    const usage = (limit.current / limit.limit) * 100;
    const isLoss = limit.label.includes("Loss");
    const isTrades = limit.unit === "trades";
    const isTarget = limit.label.includes("Target");

    if (isTrades) {
      if (limit.current >= limit.limit) return <Ban className="w-3.5 h-3.5 text-[#ff5c73]" />;
      if (limit.current >= limit.limit - 1) return <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />;
      return <Activity className="w-3.5 h-3.5 text-emerald-450" />;
    }

    if (isLoss) {
      if (usage >= 100) return <Ban className="w-3.5 h-3.5 text-[#ff5c73]" />;
      if (usage >= 80) return <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />;
      return <Shield className="w-3.5 h-3.5 text-emerald-450" />;
    }

    if (isTarget) {
      if (limit.current >= limit.limit) return <Zap className="w-3.5 h-3.5 text-emerald-455 text-[#20e0b2]" />;
      return <TrendingUp className="w-3.5 h-3.5 text-zinc-500" />;
    }

    return <Activity className="w-3.5 h-3.5 text-zinc-550" />;
  };

  const dailyLimits = limits.filter(l => l.type === "daily");
  const weeklyLimits = limits.filter(l => l.type === "weekly");
  const monthlyLimits = limits.filter(l => l.type === "monthly");

  const renderLimitGroup = (group: RiskLimit[], title: string) => (
    <div className="mb-4">
      <div className="text-[9px] font-bold uppercase tracking-widest text-zinc-500 mb-2">
        {title}
      </div>
      <div className="space-y-2">
        {group.map(limit => {
          const isLoss = limit.label.includes("Loss");
          const usage = (limit.current / limit.limit) * 100;
          
          return (
            <div
              key={limit.id}
              className="p-2.5 rounded-lg bg-black/25 border border-zinc-850"
              style={{ opacity: limit.enabled ? 1 : 0.4 }}
            >
              <div className="flex items-center justify-between mb-1.5 font-sans">
                <div className="flex items-center gap-1.5">
                  {getStatusIcon(limit)}
                  <span className="text-[11px] text-zinc-300 font-bold">
                    {limit.label}
                  </span>
                </div>
                <span 
                  className="text-xs font-mono font-bold"
                  style={{ color: getUsageColor(limit.current, limit.limit, isLoss) }}
                >
                  {limit.unit === "percent" 
                    ? `${limit.current.toFixed(1)}% / ${limit.limit}%`
                    : `${limit.current} / ${limit.limit}`
                  }
                </span>
              </div>
              <div className="h-1.5 rounded-full overflow-hidden bg-black/35 border border-zinc-850">
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{
                    width: `${Math.min(usage, 100)}%`,
                    background: getUsageColor(limit.current, limit.limit, isLoss)
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className="bg-[#101014] border border-[rgba(255,255,255,0.07)] rounded-xl p-5 font-mono text-[10px]">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-emerald-450" />
          <h3 className="font-bold uppercase tracking-widest text-zinc-300">Risk Limit Guard</h3>
        </div>
        <div className="flex items-center gap-1 font-bold">
          <DollarSign className="w-3.5 h-3.5 text-zinc-550" />
          <span className="text-xs text-zinc-400">
            ${mockAccountBalance.toLocaleString()}
          </span>
        </div>
      </div>

      {isBlocked && (
        <div className="mb-4 p-4 rounded-xl flex flex-col items-center text-center bg-[#ff5c73]/10 border border-[#ff5c73]/25 text-[#ff5c73] font-mono">
          <Ban className="w-6 h-6 mb-2" />
          <span className="text-[11px] font-black uppercase tracking-widest">TRADING BLOCKED</span>
          <span className="text-[9px] mt-1 text-zinc-550 leading-relaxed font-sans block">
            Risk limit breached - Take a mandated break
          </span>
        </div>
      )}

      {activeWarnings.filter(w => !w.includes("BLOCKED") && !w.includes("CRITICAL")).length > 0 && (
        <div className="mb-4 p-2.5 rounded-lg bg-orange-500/10 border border-orange-500/20 text-orange-400 font-sans">
          {activeWarnings.filter(w => !w.includes("BLOCKED") && !w.includes("CRITICAL")).map((warning, i) => (
            <div key={i} className="flex items-center gap-1.5 text-xs font-bold font-mono">
              <AlertTriangle className="w-3.5 h-3.5" />
              {warning}
            </div>
          ))}
        </div>
      )}

      {!isBlocked && activeWarnings.filter(w => w.includes("TARGET HIT")).length > 0 && (
        <div className="mb-4 p-2.5 rounded-lg flex items-center gap-2 bg-[#20e0b2]/10 border border-[#20e0b2]/20 text-[#20e0b2]">
          <Zap className="w-3.5 h-3.5 animate-pulse" />
          <span className="font-bold uppercase tracking-wider text-[9px]">Profit target achieved!</span>
        </div>
      )}

      {renderLimitGroup(dailyLimits, "Daily Limits")}
      {renderLimitGroup(weeklyLimits, "Weekly Limits")}
      {renderLimitGroup(monthlyLimits, "Monthly Limits")}

      <button
        className={`w-full py-2.5 rounded-lg font-black text-[10px] uppercase tracking-wider transition-all disabled:opacity-30 ${
          isBlocked ? "bg-red-505 bg-[#ff5c73] text-white cursor-not-allowed" : "bg-[#20e0b2] text-emerald-950 hover:bg-[#20e0b2] cursor-pointer"
        }`}
        disabled={isBlocked}
      >
        {isBlocked ? "Trading Disabled" : "Check Compliancy"}
      </button>
    </div>
  );
}

