"use client";
import { useState, useEffect } from "react";
import { AlertTriangle, Shield, TrendingDown, TrendingUp, DollarSign, Percent, Activity, Clock, Ban, Zap } from "lucide-react";
import { Card } from "@/components/ui/card";

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
    const blocked = false;

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
      if (usage >= 100) return "var(--bear)";
      if (usage >= 80) return "#f97316";
      return "var(--bull)";
    }
    return current >= limit ? "var(--bull)" : "var(--accent)";
  };

  const getStatusIcon = (limit: RiskLimit) => {
    const usage = (limit.current / limit.limit) * 100;
    const isLoss = limit.label.includes("Loss");
    const isTrades = limit.unit === "trades";
    const isTarget = limit.label.includes("Target");

    if (isTrades) {
      if (limit.current >= limit.limit) return <Ban className="w-4 h-4" style={{ color: "var(--bear)" }} />;
      if (limit.current >= limit.limit - 1) return <AlertTriangle className="w-4 h-4" style={{ color: "#f97316" }} />;
      return <Activity className="w-4 h-4" style={{ color: "var(--bull)" }} />;
    }

    if (isLoss) {
      if (usage >= 100) return <Ban className="w-4 h-4" style={{ color: "var(--bear)" }} />;
      if (usage >= 80) return <AlertTriangle className="w-4 h-4" style={{ color: "#f97316" }} />;
      return <Shield className="w-4 h-4" style={{ color: "var(--bull)" }} />;
    }

    if (isTarget) {
      if (limit.current >= limit.limit) return <Zap className="w-4 h-4" style={{ color: "var(--bull)" }} />;
      return <TrendingUp className="w-4 h-4" style={{ color: "var(--accent)" }} />;
    }

    return <Activity className="w-4 h-4" style={{ color: "var(--text-tertiary)" }} />;
  };

  const dailyLimits = limits.filter(l => l.type === "daily");
  const weeklyLimits = limits.filter(l => l.type === "weekly");
  const monthlyLimits = limits.filter(l => l.type === "monthly");

  const renderLimitGroup = (group: RiskLimit[], title: string) => (
    <div className="mb-4">
      <div className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: "var(--text-tertiary)" }}>
        {title}
      </div>
      <div className="space-y-2">
        {group.map(limit => {
          const isLoss = limit.label.includes("Loss");
          const usage = (limit.current / limit.limit) * 100;
          
          return (
            <div
              key={limit.id}
              className="p-2 rounded-lg"
              style={{ 
                background: "var(--bg-input)",
                opacity: limit.enabled ? 1 : 0.5
              }}
            >
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1.5">
                  {getStatusIcon(limit)}
                  <span className="text-xs font-medium" style={{ color: "var(--text-primary)" }}>
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
              <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "var(--bg-primary)" }}>
                <div
                  className="h-full rounded-full transition-all duration-500"
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
    <Card className="p-4" style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)" }}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5" style={{ color: isBlocked ? "var(--bear)" : "var(--bull)" }} />
          <h3 className="font-bold text-sm" style={{ color: "var(--text-primary)" }}>Risk Limit Guard</h3>
        </div>
        <div className="flex items-center gap-1">
          <DollarSign className="w-3 h-3" style={{ color: "var(--text-tertiary)" }} />
          <span className="text-xs font-mono" style={{ color: "var(--text-tertiary)" }}>
            ${mockAccountBalance.toLocaleString()}
          </span>
        </div>
      </div>

      {isBlocked && (
        <div className="mb-4 p-4 rounded-xl flex flex-col items-center text-center" style={{ background: "rgba(239, 68, 68, 0.15)", border: "2px solid var(--bear)" }}>
          <Ban className="w-8 h-8 mb-2" style={{ color: "var(--bear)" }} />
          <span className="text-sm font-bold" style={{ color: "var(--bear)" }}>TRADING BLOCKED</span>
          <span className="text-xs mt-1" style={{ color: "var(--text-tertiary)" }}>
            Risk limit breached - Take a break
          </span>
        </div>
      )}

      {activeWarnings.filter(w => !w.includes("BLOCKED") && !w.includes("CRITICAL")).length > 0 && (
        <div className="mb-4 p-3 rounded-lg" style={{ background: "rgba(249, 115, 22, 0.1)", border: "1px solid #f97316" }}>
          {activeWarnings.filter(w => !w.includes("BLOCKED") && !w.includes("CRITICAL")).map((warning, i) => (
            <div key={i} className="flex items-center gap-2 text-xs" style={{ color: "#f97316" }}>
              <AlertTriangle className="w-3 h-3" />
              {warning}
            </div>
          ))}
        </div>
      )}

      {!isBlocked && activeWarnings.filter(w => w.includes("TARGET HIT")).length > 0 && (
        <div className="mb-4 p-3 rounded-lg flex items-center gap-2" style={{ background: "rgba(34, 197, 94, 0.1)", border: "1px solid var(--bull)" }}>
          <Zap className="w-4 h-4" style={{ color: "var(--bull)" }} />
          <span className="text-xs font-medium" style={{ color: "var(--bull)" }}>Profit target achieved!</span>
        </div>
      )}

      {renderLimitGroup(dailyLimits, "Daily Limits")}
      {renderLimitGroup(weeklyLimits, "Weekly Limits")}
      {renderLimitGroup(monthlyLimits, "Monthly Limits")}

      <button
        className={`w-full py-2 rounded-lg text-xs font-semibold transition-colors ${
          isBlocked ? "opacity-50 cursor-not-allowed" : "hover:opacity-80"
        }`}
        style={{ 
          background: isBlocked ? "var(--bear)" : "var(--bull)",
          color: "white"
        }}
        disabled={isBlocked}
      >
        {isBlocked ? "Trading Disabled" : "Execute Trade"}
      </button>
    </Card>
  );
}