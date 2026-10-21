"use client";

import React, { useState, useEffect } from "react";
import {
  Wallet,
  ShieldCheck,
  Activity,
  Clock,
  TrendingUp,
  TrendingDown,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Plus,
  Compass,
  X,
  RefreshCw,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { fetchWithAuth, getBackendUrl } from "@/lib/utils";

interface UnifiedAccountHubProps {
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
  activeSymbol: string;
  onOpenPeek: (type: string, data?: any) => void;
}

export default function UnifiedAccountHub({
  accountData,
  todayStats,
  positions,
  activeSymbol,
  onOpenPeek,
}: UnifiedAccountHubProps) {
  const [showPositionsDropdown, setShowPositionsDropdown] = useState(false);
  const [closingTicket, setClosingTicket] = useState<number | null>(null);

  // Active Session Calculation
  const [sessionInfo, setSessionInfo] = useState({ name: "London Open", status: "Active", countdown: "3h 12m" });

  useEffect(() => {
    const updateSession = () => {
      const now = new Date();
      const utcH = now.getUTCHours();
      if (utcH >= 8 && utcH < 12) setSessionInfo({ name: "London Morning Killzone", status: "Active", countdown: `${12 - utcH}h left` });
      else if (utcH >= 12 && utcH < 17) setSessionInfo({ name: "London / NY Overlap", status: "High Volatility", countdown: `${17 - utcH}h left` });
      else if (utcH >= 13 && utcH < 16) setSessionInfo({ name: "New York AM Killzone", status: "Active", countdown: `${16 - utcH}h left` });
      else if (utcH >= 18 && utcH < 21) setSessionInfo({ name: "New York PM Session", status: "Active", countdown: `${21 - utcH}h left` });
      else setSessionInfo({ name: "Asian Range Accumulation", status: "Active", countdown: "Consolidation" });
    };
    updateSession();
    const interval = setInterval(updateSession, 60000);
    return () => clearInterval(interval);
  }, []);

  const handleClosePosition = async (ticket: number) => {
    try {
      setClosingTicket(ticket);
      const backend = getBackendUrl();
      const res = await fetchWithAuth(`${backend}/api/bridge/api/close-trade`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticket }),
      });
      if (res.ok) {
        toast.success(`Position #${ticket} closed successfully on MT5`);
      } else {
        toast.error("Failed to close position on MT5 bridge");
      }
    } catch {
      toast.error("Network error executing close command");
    } finally {
      setClosingTicket(null);
    }
  };

  const isTodayProfitable = todayStats.todayPnl >= 0;
  const isFloatingProfitable = accountData.profit >= 0;

  return (
    <div className="w-full bg-[#0c0c10] border-b border-[rgba(255,255,255,0.07)] px-5 py-3 flex flex-col gap-3">
      {/* ── TOP STATUS & CONTROLS ROW ────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Left: Account Connection Status & Server */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-[#141419] border border-[rgba(255,255,255,0.07)]">
            <span className="w-2 h-2 rounded-full bg-[#20e0b2] animate-pulse" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#f4f4f5] font-mono">
              {accountData.server || "Exness Live MT5"}
            </span>
          </div>

          {/* Session Pill */}
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#101014] border border-[rgba(255,255,255,0.05)] text-[9px] font-mono text-[#a1a1aa]">
            <Clock className="w-3 h-3 text-[#f5c451]" />
            <span className="text-[#f4f4f5] font-semibold">{sessionInfo.name}</span>
            <span className="text-[#71717a]">·</span>
            <span className="text-[#20e0b2]">{sessionInfo.countdown}</span>
          </div>
        </div>

        {/* Right: Quick Context Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => onOpenPeek("stage_order", { symbol: activeSymbol })}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#20e0b2]/10 border border-[#20e0b2]/30 text-[#20e0b2] hover:bg-[#20e0b2]/20 transition-all text-[9px] font-bold font-mono"
          >
            <Plus className="w-3 h-3" />
            <span>Order Ticket</span>
          </button>

          <button
            onClick={() => onOpenPeek("macro_desk")}
            className="hidden md:flex items-center gap-1 px-2.5 py-1 rounded bg-[#141419] border border-[rgba(255,255,255,0.07)] text-[#a1a1aa] hover:text-[#f4f4f5] transition-all text-[9px] font-mono"
          >
            <Compass className="w-3 h-3 text-[#38bdf8]" />
            <span>Macro Desk</span>
          </button>

          <button
            onClick={() => onOpenPeek("pine_strategy")}
            className="hidden lg:flex items-center gap-1 px-2.5 py-1 rounded bg-[#141419] border border-[rgba(255,255,255,0.07)] text-[#a1a1aa] hover:text-[#f4f4f5] transition-all text-[9px] font-mono"
          >
            <Zap className="w-3 h-3 text-[#f5c451]" />
            <span>Pine Confluence</span>
          </button>
        </div>
      </div>

      {/* ── METRICS GRID ROW ──────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {/* Card 1: Balance & Equity */}
        <div className="px-3.5 py-2.5 rounded-lg bg-[#121217] border border-[rgba(255,255,255,0.05)] flex flex-col justify-between">
          <div className="flex items-center justify-between text-[9px] uppercase tracking-wider font-bold text-[#71717a] font-mono">
            <span>Balance / Equity</span>
            <Wallet className="w-3 h-3 text-[#38bdf8]" />
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-base font-black font-mono text-[#f4f4f5]">
              ${accountData.balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
          <div className="text-[8px] text-[#71717a] font-mono mt-0.5">
            Equity: <span className="text-[#a1a1aa]">${accountData.equity.toFixed(2)}</span>
          </div>
        </div>

        {/* Card 2: Today's Realized P&L */}
        <div className="px-3.5 py-2.5 rounded-lg bg-[#121217] border border-[rgba(255,255,255,0.05)] flex flex-col justify-between">
          <div className="flex items-center justify-between text-[9px] uppercase tracking-wider font-bold text-[#71717a] font-mono">
            <span>Today's Realized P&L</span>
            {isTodayProfitable ? <TrendingUp className="w-3 h-3 text-[#20e0b2]" /> : <TrendingDown className="w-3 h-3 text-[#ff5c73]" />}
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className={`text-base font-black font-mono ${isTodayProfitable ? "text-[#20e0b2]" : "text-[#ff5c73]"}`}>
              {isTodayProfitable ? "+" : ""}${todayStats.todayPnl.toFixed(2)}
            </span>
          </div>
          <div className="text-[8px] text-[#71717a] font-mono mt-0.5">
            {todayStats.tradeCount} trades · <span className="text-[#a1a1aa]">{todayStats.winRate.toFixed(0)}% winrate</span>
          </div>
        </div>

        {/* Card 3: Floating P&L */}
        <div className="px-3.5 py-2.5 rounded-lg bg-[#121217] border border-[rgba(255,255,255,0.05)] flex flex-col justify-between">
          <div className="flex items-center justify-between text-[9px] uppercase tracking-wider font-bold text-[#71717a] font-mono">
            <span>Floating Exposure</span>
            <Activity className="w-3 h-3 text-[#a855f7]" />
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className={`text-base font-black font-mono ${isFloatingProfitable ? "text-[#20e0b2]" : "text-[#ff5c73]"}`}>
              {isFloatingProfitable ? "+" : ""}${accountData.profit.toFixed(2)}
            </span>
          </div>
          <div className="text-[8px] text-[#71717a] font-mono mt-0.5">
            Free Margin: <span className="text-[#a1a1aa]">${(accountData.margin_free ?? accountData.balance).toFixed(2)}</span>
          </div>
        </div>

        {/* Card 4: Open Positions Dock */}
        <div className="px-3.5 py-2.5 rounded-lg bg-[#121217] border border-[rgba(255,255,255,0.05)] flex flex-col justify-between">
          <div className="flex items-center justify-between text-[9px] uppercase tracking-wider font-bold text-[#71717a] font-mono">
            <span>Open Positions</span>
            <ShieldCheck className="w-3 h-3 text-[#20e0b2]" />
          </div>
          <div className="mt-1 flex items-center justify-between">
            <span className="text-base font-black font-mono text-[#f4f4f5]">
              {positions.length} Active
            </span>
            {positions.length > 0 && (
              <button
                onClick={() => setShowPositionsDropdown(!showPositionsDropdown)}
                className="text-[9px] font-bold font-mono text-[#20e0b2] hover:underline flex items-center gap-0.5"
              >
                <span>{showPositionsDropdown ? "Hide" : "Manage"}</span>
                {showPositionsDropdown ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>
            )}
          </div>
          <div className="text-[8px] text-[#71717a] font-mono mt-0.5">
            {positions.length === 0 ? "Capital strictly protected" : `${positions.length} market orders running`}
          </div>
        </div>
      </div>

      {/* ── EXPANDABLE OPEN POSITIONS DRAWER ─────────────────────── */}
      {showPositionsDropdown && positions.length > 0 && (
        <div className="mt-1 rounded-lg border border-[rgba(255,255,255,0.07)] bg-[#101014] p-3 space-y-2">
          <div className="flex items-center justify-between border-b border-[rgba(255,255,255,0.05)] pb-1.5 text-[8px] uppercase tracking-wider font-bold text-[#71717a] font-mono">
            <span>Ticket / Symbol</span>
            <span>Type & Lots</span>
            <span>Open Price</span>
            <span>Current P&L</span>
            <span>Action</span>
          </div>
          {positions.map((pos: any) => {
            const isWin = (pos.profit ?? 0) >= 0;
            return (
              <div
                key={pos.ticket}
                className="flex items-center justify-between py-1.5 border-b border-[rgba(255,255,255,0.03)] last:border-b-0 text-[10px] font-mono"
              >
                <div className="flex items-center gap-2">
                  <span className="text-[#a1a1aa]">#{pos.ticket}</span>
                  <span className="font-bold text-[#f4f4f5]">{pos.symbol}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold ${pos.type === 0 || pos.type === "BUY" ? "bg-[#20e0b2]/10 text-[#20e0b2]" : "bg-[#ff5c73]/10 text-[#ff5c73]"}`}>
                    {pos.type === 0 || pos.type === "BUY" ? "BUY" : "SELL"}
                  </span>
                  <span className="text-[#71717a]">{pos.volume} lot</span>
                </div>
                <div className="text-[#a1a1aa]">${pos.openPrice?.toFixed(2) || pos.price_open?.toFixed(2)}</div>
                <div className={`font-black ${isWin ? "text-[#20e0b2]" : "text-[#ff5c73]"}`}>
                  {isWin ? "+" : ""}${Number(pos.profit || 0).toFixed(2)}
                </div>
                <button
                  disabled={closingTicket === pos.ticket}
                  onClick={() => handleClosePosition(pos.ticket)}
                  className="px-2 py-0.5 rounded bg-[#ff5c73]/10 hover:bg-[#ff5c73]/20 text-[#ff5c73] border border-[#ff5c73]/30 text-[9px] font-bold transition-all disabled:opacity-50"
                >
                  {closingTicket === pos.ticket ? "Closing..." : "Close"}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
