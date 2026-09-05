"use client";

import React, { useState } from "react";
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  Shield,
  Activity,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  RotateCcw,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { fetchWithAuth, getBackendUrl } from "@/lib/utils";

interface AccountExecutionHudProps {
  accountData?: {
    balance: number;
    equity: number;
    profit: number;
    margin_free?: number;
    server?: string;
  };
  todayStats?: {
    todayPnl: number;
    tradeCount: number;
    winRate: number;
  };
  positions?: any[];
  onOpenPeek: (type: string, data?: any) => void;
}

export const AccountExecutionHud: React.FC<AccountExecutionHudProps> = ({
  accountData = { balance: 35.18, equity: 35.18, profit: 0, server: "Exness-MT5Trial17" },
  todayStats = { todayPnl: 0, tradeCount: 0, winRate: 0 },
  positions = [],
  onOpenPeek,
}) => {
  const [closingTicket, setClosingTicket] = useState<number | null>(null);

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
    } catch (e) {
      toast.error("Network error executing close command");
    } finally {
      setClosingTicket(null);
    }
  };

  const isProfitableToday = todayStats.todayPnl >= 0;

  return (
    <div className="flex flex-col bg-[#101014] border border-[rgba(255,255,255,0.07)] rounded-xl overflow-hidden shadow-2xl">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-[rgba(255,255,255,0.07)] bg-[#141419]/80 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <Wallet className="w-3.5 h-3.5 text-[#20e0b2]" />
          <span className="text-[10px] font-black uppercase tracking-widest text-[#f4f4f5] font-mono">
            Account &amp; Execution HUD
          </span>
          <span className="text-[9px] px-1.5 py-0.2 rounded bg-[#20e0b2]/10 text-[#20e0b2] border border-[#20e0b2]/20 font-mono">
            {accountData.server || "Exness MT5"}
          </span>
        </div>
        <div className="flex items-center gap-2 text-[9px] font-mono">
          <Link
            href="/positions"
            className="text-[#71717a] hover:text-white transition-colors"
          >
            Positions Terminal ↗
          </Link>
          <span className="text-[rgba(255,255,255,0.1)]">|</span>
          <Link
            href="/performance"
            className="text-[#71717a] hover:text-white transition-colors"
          >
            Performance Desk ↗
          </Link>
        </div>
      </div>

      {/* Metric Tiles Bar */}
      <div className="grid grid-cols-2 md:grid-cols-5 divide-x divide-[rgba(255,255,255,0.06)] bg-[#09090b]/40">
        {/* Balance & Equity */}
        <div className="p-3 flex flex-col gap-0.5">
          <span className="text-[8px] uppercase tracking-widest text-[#71717a] font-mono font-bold">
            Live Equity
          </span>
          <div className="text-base font-black font-mono text-[#f4f4f5]">
            ${accountData.equity.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <span className="text-[9px] text-[#71717a] font-mono">
            Bal: ${accountData.balance.toFixed(2)}
          </span>
        </div>

        {/* Floating P&L */}
        <div className="p-3 flex flex-col gap-0.5">
          <span className="text-[8px] uppercase tracking-widest text-[#71717a] font-mono font-bold">
            Floating P&amp;L
          </span>
          <div
            className={`text-base font-black font-mono ${
              accountData.profit >= 0 ? "text-[#20e0b2]" : "text-[#ff5c73]"
            }`}
          >
            {accountData.profit >= 0 ? "+" : ""}${accountData.profit.toFixed(2)}
          </div>
          <span className="text-[9px] text-[#71717a] font-mono">
            {positions.length} active position{positions.length === 1 ? "" : "s"}
          </span>
        </div>

        {/* Today's Net P&L */}
        <div className="p-3 flex flex-col gap-0.5">
          <span className="text-[8px] uppercase tracking-widest text-[#71717a] font-mono font-bold">
            Today Net P&amp;L
          </span>
          <div
            className={`text-base font-black font-mono ${
              isProfitableToday ? "text-[#20e0b2]" : "text-[#ff5c73]"
            }`}
          >
            {isProfitableToday ? "+" : ""}${todayStats.todayPnl.toFixed(2)}
          </div>
          <span className="text-[9px] text-[#71717a] font-mono">
            {todayStats.tradeCount} trade{todayStats.tradeCount === 1 ? "" : "s"} today
          </span>
        </div>

        {/* Daily Risk Status */}
        <div className="p-3 flex flex-col gap-0.5">
          <span className="text-[8px] uppercase tracking-widest text-[#71717a] font-mono font-bold">
            Risk Exposure
          </span>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="text-xs font-black font-mono text-[#20e0b2]">LOW (1.0%)</span>
            <span className="w-1.5 h-1.5 rounded-full bg-[#20e0b2]" />
          </div>
          <span className="text-[9px] text-[#71717a] font-mono">
            Max Drawdown: 0.0%
          </span>
        </div>

        {/* Live Positions / Action Ticker */}
        <div className="p-2.5 col-span-2 md:col-span-1 flex flex-col justify-center gap-1">
          {positions.length === 0 ? (
            <div className="flex items-center justify-between text-xs font-mono text-[#71717a] px-1">
              <span>No open positions</span>
              <span className="text-[9px] text-[#20e0b2]">Ready</span>
            </div>
          ) : (
            <div className="flex flex-col gap-1 max-h-[50px] overflow-y-auto">
              {positions.slice(0, 2).map((p: any) => (
                <div
                  key={p.ticket}
                  className="flex items-center justify-between text-[9px] font-mono bg-[#141419] p-1 rounded border border-[rgba(255,255,255,0.06)]"
                >
                  <div className="flex items-center gap-1">
                    <span className="font-bold text-white">{p.pair || p.symbol}</span>
                    <span className={p.direction === "Long" || p.type === 0 ? "text-[#20e0b2]" : "text-[#ff5c73]"}>
                      {p.direction || (p.type === 0 ? "BUY" : "SELL")}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className={p.pnl >= 0 ? "text-[#20e0b2]" : "text-[#ff5c73]"}>
                      {p.pnl >= 0 ? "+" : ""}${Number(p.pnl).toFixed(2)}
                    </span>
                    <button
                      onClick={() => handleClosePosition(p.ticket)}
                      disabled={closingTicket === p.ticket}
                      className="px-1 py-0.2 rounded bg-[#ff5c73]/20 hover:bg-[#ff5c73]/30 text-[#ff5c73] font-bold text-[8px]"
                    >
                      Close
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
          <button
            onClick={() => onOpenPeek("quick_journal")}
            className="w-full text-center text-[8px] font-black uppercase tracking-wider text-[#71717a] hover:text-[#20e0b2] transition-colors font-mono"
          >
            + Quick Journal Reflection
          </button>
        </div>
      </div>
    </div>
  );
};
export default AccountExecutionHud;
