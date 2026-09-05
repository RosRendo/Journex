"use client";

import React, { useState, useEffect } from "react";
import { 
  ShieldCheck, 
  Activity, 
  Clock, 
  Wallet, 
  Flame, 
  AlertTriangle, 
  TrendingUp, 
  TrendingDown,
  Layers,
  ChevronRight
} from "lucide-react";
import { motion } from "framer-motion";

interface EcosystemPulseBarProps {
  accountData: {
    balance: number;
    equity: number;
    profit: number;
    margin_free?: number;
    server?: string;
    connected?: boolean;
  };
  todayStats: {
    todayPnl: number;
    tradeCount: number;
    winRate: number;
  };
  positions: any[];
  onOpenPeek?: (type: string, data?: any) => void;
}

export const EcosystemPulseBar: React.FC<EcosystemPulseBarProps> = ({
  accountData,
  todayStats,
  positions,
  onOpenPeek,
}) => {
  // Session countdown calculation
  const [sessionTime, setSessionTime] = useState<{
    name: string;
    state: "ACTIVE" | "OVERLAP" | "CLOSED";
    timeLeft: string;
    progressPct: number;
  }>({
    name: "London / NY Overlap",
    state: "OVERLAP",
    timeLeft: "02:14:40",
    progressPct: 68,
  });

  useEffect(() => {
    const updateSession = () => {
      const now = new Date();
      const utcHour = now.getUTCHours();
      const utcMinute = now.getUTCMinutes();
      const utcSecond = now.getUTCSeconds();
      const totalMinutes = utcHour * 60 + utcMinute;

      // London: 08:00 - 17:00 UTC (480 - 1020)
      // NY: 13:00 - 22:00 UTC (780 - 1320)
      // Overlap: 13:00 - 17:00 UTC (780 - 1020)
      // Asian: 00:00 - 09:00 UTC (0 - 540)
      let name = "Asian Session";
      let state: "ACTIVE" | "OVERLAP" | "CLOSED" = "ACTIVE";
      let endMinute = 540;
      let startMinute = 0;

      if (totalMinutes >= 780 && totalMinutes < 1020) {
        name = "London / NY Overlap";
        state = "OVERLAP";
        startMinute = 780;
        endMinute = 1020;
      } else if (totalMinutes >= 480 && totalMinutes < 1020) {
        name = "London Session";
        state = "ACTIVE";
        startMinute = 480;
        endMinute = 1020;
      } else if (totalMinutes >= 780 && totalMinutes < 1320) {
        name = "New York Session";
        state = "ACTIVE";
        startMinute = 780;
        endMinute = 1320;
      } else if (totalMinutes < 540) {
        name = "Tokyo / Asian Session";
        state = "ACTIVE";
        startMinute = 0;
        endMinute = 540;
      } else {
        name = "Market Pre-Asia";
        state = "CLOSED";
        startMinute = 1320;
        endMinute = 1440;
      }

      const sessionDuration = endMinute - startMinute;
      const elapsed = Math.max(0, Math.min(sessionDuration, totalMinutes - startMinute));
      const progress = Math.min(100, Math.round((elapsed / sessionDuration) * 100));

      const remainingMinutes = Math.max(0, endMinute - totalMinutes);
      const remH = Math.floor(remainingMinutes / 60);
      const remM = remainingMinutes % 60;
      const remS = 60 - utcSecond === 60 ? 0 : 60 - utcSecond;
      const pad = (n: number) => n.toString().padStart(2, "0");

      setSessionTime({
        name,
        state,
        timeLeft: `${pad(remH)}:${pad(remM)}:${pad(remS)}`,
        progressPct: progress,
      });
    };

    updateSession();
    const interval = setInterval(updateSession, 1000);
    return () => clearInterval(interval);
  }, []);

  // Risk calculation (assuming max daily risk 3% of account balance)
  const maxDailyRiskAmount = (accountData.balance * 0.03) || 1.05;
  const currentRiskUsed = Math.max(0, -todayStats.todayPnl);
  const riskPctUsed = Math.min(100, Math.round((currentRiskUsed / maxDailyRiskAmount) * 100));

  // Portfolio exposure calculation
  const openLots = positions.reduce((acc, p) => acc + (p.lots || p.volume || 0.02), 0);
  const marginUsedPct = accountData.balance > 0 
    ? Math.min(100, Math.round(((accountData.balance - (accountData.margin_free ?? accountData.balance)) / accountData.balance) * 100))
    : 0;

  // Donut circumference helper
  const radius = 18;
  const circumference = 2 * Math.PI * radius;

  return (
    <div className="bg-[#0b0b0e] border border-[rgba(255,255,255,0.07)] rounded-xl overflow-hidden shadow-2xl backdrop-blur-md">
      {/* 5 Compact Universal Donut Dials */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 divide-x divide-y sm:divide-y-0 divide-[rgba(255,255,255,0.06)]">
        
        {/* 1. EQUITY PULSE */}
        <div 
          onClick={() => onOpenPeek?.("account_telemetry")}
          className="p-3.5 flex items-center gap-3.5 hover:bg-[#121217] transition-all cursor-pointer group relative"
        >
          <div className="relative w-11 h-11 shrink-0">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 44 44">
              <circle cx="22" cy="22" r={radius} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="3" />
              <circle
                cx="22"
                cy="22"
                r={radius}
                fill="none"
                stroke={accountData.equity >= accountData.balance ? "#20e0b2" : "#ff5c73"}
                strokeWidth="3.5"
                strokeDasharray={circumference}
                strokeDashoffset={circumference * (1 - Math.min(1, accountData.equity / Math.max(accountData.balance, 1)))}
                strokeLinecap="round"
                className="transition-all duration-700"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <Wallet className="w-3.5 h-3.5 text-[#20e0b2] group-hover:scale-110 transition-transform" />
            </div>
          </div>
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-[9px] font-black uppercase tracking-widest text-[#71717a] font-mono">
                Equity Pulse
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-[#20e0b2] animate-pulse" />
            </div>
            <div className="text-sm font-black font-mono text-[#f4f4f5] tracking-tight truncate">
              ${accountData.equity.toFixed(2)}
            </div>
            <div className="flex items-center gap-1 text-[9px] font-mono">
              <span className={accountData.profit >= 0 ? "text-[#20e0b2]" : "text-[#ff5c73]"}>
                {accountData.profit >= 0 ? "+" : ""}${accountData.profit.toFixed(2)}
              </span>
              <span className="text-[#52525b]">flt</span>
            </div>
          </div>
        </div>

        {/* 2. DAILY RISK BUDGET */}
        <div 
          onClick={() => onOpenPeek?.("daily_risk")}
          className="p-3.5 flex items-center gap-3.5 hover:bg-[#121217] transition-all cursor-pointer group relative"
        >
          <div className="relative w-11 h-11 shrink-0">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 44 44">
              <circle cx="22" cy="22" r={radius} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="3" />
              <circle
                cx="22"
                cy="22"
                r={radius}
                fill="none"
                stroke={riskPctUsed > 70 ? "#ff5c73" : riskPctUsed > 40 ? "#f5c451" : "#20e0b2"}
                strokeWidth="3.5"
                strokeDasharray={circumference}
                strokeDashoffset={circumference * (1 - Math.max(0.05, riskPctUsed / 100))}
                strokeLinecap="round"
                className="transition-all duration-700"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center text-[9px] font-black font-mono text-[#f4f4f5]">
              {riskPctUsed}%
            </div>
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-[9px] font-black uppercase tracking-widest text-[#71717a] font-mono">
              Daily Risk Cap
            </span>
            <div className="text-sm font-black font-mono text-[#f4f4f5] tracking-tight">
              {riskPctUsed > 70 ? "HIGH RISK" : riskPctUsed > 40 ? "MODERATE" : "SAFE / LOW"}
            </div>
            <span className="text-[9px] font-mono text-[#71717a]">
              3.0% Max (${maxDailyRiskAmount.toFixed(2)})
            </span>
          </div>
        </div>

        {/* 3. PORTFOLIO EXPOSURE */}
        <div 
          onClick={() => onOpenPeek?.("open_positions")}
          className="p-3.5 flex items-center gap-3.5 hover:bg-[#121217] transition-all cursor-pointer group relative"
        >
          <div className="relative w-11 h-11 shrink-0">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 44 44">
              <circle cx="22" cy="22" r={radius} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="3" />
              <circle
                cx="22"
                cy="22"
                r={radius}
                fill="none"
                stroke={positions.length > 0 ? "#20e0b2" : "rgba(255,255,255,0.2)"}
                strokeWidth="3.5"
                strokeDasharray={circumference}
                strokeDashoffset={circumference * (1 - Math.min(1, Math.max(0.08, (positions.length * 25) / 100)))}
                strokeLinecap="round"
                className="transition-all duration-700"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center text-[10px] font-black font-mono text-[#f4f4f5]">
              {positions.length}
            </div>
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-[9px] font-black uppercase tracking-widest text-[#71717a] font-mono">
              Exposure
            </span>
            <div className="text-sm font-black font-mono text-[#f4f4f5] tracking-tight">
              {positions.length === 0 ? "FLAT" : `${openLots.toFixed(2)} Lots`}
            </div>
            <span className="text-[9px] font-mono text-[#71717a]">
              {positions.length} Active {positions.length === 1 ? "Trade" : "Trades"}
            </span>
          </div>
        </div>

        {/* 4. ECOSYSTEM REGIME / VOLATILITY */}
        <div 
          onClick={() => onOpenPeek?.("volatility_radar")}
          className="p-3.5 flex items-center gap-3.5 hover:bg-[#121217] transition-all cursor-pointer group relative"
        >
          <div className="relative w-11 h-11 shrink-0">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 44 44">
              <circle cx="22" cy="22" r={radius} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="3" />
              <circle
                cx="22"
                cy="22"
                r={radius}
                fill="none"
                stroke="#f5c451"
                strokeWidth="3.5"
                strokeDasharray={circumference}
                strokeDashoffset={circumference * (1 - 0.72)}
                strokeLinecap="round"
                className="transition-all duration-700"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <Flame className="w-3.5 h-3.5 text-[#f5c451]" />
            </div>
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-[9px] font-black uppercase tracking-widest text-[#71717a] font-mono">
              Market Regime
            </span>
            <div className="text-sm font-black font-mono text-[#f5c451] tracking-tight">
              HIGH VOL
            </div>
            <span className="text-[9px] font-mono text-[#71717a]">
              ATR 1.8x Expansion
            </span>
          </div>
        </div>

        {/* 5. SESSION & TIMING CLOCK */}
        <div 
          onClick={() => onOpenPeek?.("session_breakdown")}
          className="p-3.5 col-span-2 sm:col-span-1 flex items-center gap-3.5 hover:bg-[#121217] transition-all cursor-pointer group relative"
        >
          <div className="relative w-11 h-11 shrink-0">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 44 44">
              <circle cx="22" cy="22" r={radius} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="3" />
              <circle
                cx="22"
                cy="22"
                r={radius}
                fill="none"
                stroke="#38bdf8"
                strokeWidth="3.5"
                strokeDasharray={circumference}
                strokeDashoffset={circumference * (1 - sessionTime.progressPct / 100)}
                strokeLinecap="round"
                className="transition-all duration-700"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <Clock className="w-3.5 h-3.5 text-[#38bdf8]" />
            </div>
          </div>
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-[9px] font-black uppercase tracking-widest text-[#71717a] font-mono">
                Session Clock
              </span>
              <span className={`w-1.5 h-1.5 rounded-full ${sessionTime.state === "OVERLAP" ? "bg-[#38bdf8] animate-ping" : "bg-[#20e0b2]"}`} />
            </div>
            <div className="text-sm font-black font-mono text-[#f4f4f5] tracking-tight truncate">
              {sessionTime.timeLeft}
            </div>
            <span className="text-[9px] font-mono text-[#38bdf8] truncate font-bold">
              {sessionTime.name}
            </span>
          </div>
        </div>

      </div>
    </div>
  );
};

export default EcosystemPulseBar;
