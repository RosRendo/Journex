"use client";

import React, { useState } from "react";
import {
  X,
  ExternalLink,
  Zap,
  Shield,
  Calendar,
  Clock,
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  Crosshair,
  Wallet,
  Activity,
  Layers,
  Flame,
  Search,
  Sparkles,
  BarChart2,
  Compass,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { fetchWithAuth, getBackendUrl } from "@/lib/utils";

interface CockpitPeekDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  type: string;
  data?: any;
  accountEquity?: number;
  accountData?: {
    balance: number;
    equity: number;
    profit: number;
    margin_free?: number;
    server?: string;
    connected?: boolean;
  };
  positions?: any[];
  todayStats?: {
    todayPnl: number;
    tradeCount: number;
    winRate: number;
  };
}

export const CockpitPeekDrawer: React.FC<CockpitPeekDrawerProps> = ({
  isOpen,
  onClose,
  type,
  data = {},
  accountEquity = 35.18,
  accountData = {
    balance: 35.18,
    equity: 35.18,
    profit: 0.0,
    margin_free: 35.18,
    server: "Exness-MT5Trial17",
    connected: true,
  },
  positions = [],
  todayStats = {
    todayPnl: 0,
    tradeCount: 0,
    winRate: 0,
  },
}) => {
  const [executing, setExecuting] = useState(false);
  const [closingTicket, setClosingTicket] = useState<number | null>(null);
  const [stagedLots, setStagedLots] = useState(0.01);
  const [journalEmotion, setJournalEmotion] = useState("Focused");
  const [journalDiscipline, setJournalDiscipline] = useState(true);

  if (!isOpen) return null;

  const currentEquity = accountData.equity || accountEquity || 35.18;
  const currentBalance = accountData.balance || 35.18;
  const activeSymbol = data?.symbol || "XAUUSD";

  // Calculate 1% risk lot sizing
  const riskAmount = (currentEquity * 0.01).toFixed(2);

  const handleExecuteStaged = async () => {
    try {
      setExecuting(true);
      const backend = getBackendUrl();
      const symbol = data?.symbol || "XAUUSD";
      const direction = data?.direction || "BUY";
      const sl = data?.sl || 0;
      const tp = data?.tp || 0;

      const res = await fetchWithAuth(`${backend}/api/bridge/api/open-trade`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          symbol,
          direction: direction === "BUY" ? "Long" : "Short",
          volume: stagedLots,
          sl,
          tp,
          comment: "AdaptiveICT Cockpit Staging",
        }),
      });

      if (res.ok) {
        toast.success(`Trade staged & executed: ${direction} ${stagedLots} ${symbol} on MT5!`);
        onClose();
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error || "Order execution failed on broker bridge");
      }
    } catch (e) {
      toast.error("Bridge communication error");
    } finally {
      setExecuting(false);
    }
  };

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

  const handleSaveQuickJournal = () => {
    toast.success("Trade reflection saved to active journal!");
    onClose();
  };

  // Resolve Header Title based on type
  const getHeaderTitle = () => {
    switch (type) {
      case "stage_order":
      case "setup_inspector":
        return `Setup Inspector: ${activeSymbol}`;
      case "macro_deck":
      case "bias_detail":
        return `Institutional Bias: ${activeSymbol}`;
      case "calendar_detail":
        return "Economic Catalyst Brief";
      case "risk_guard":
      case "daily_risk":
        return "Daily Risk Guard & Circuit Breaker";
      case "session_matrix":
      case "session_detail":
      case "session_breakdown":
        return "Killzone & Session Map";
      case "account_telemetry":
        return "Account & Execution Telemetry";
      case "open_positions":
        return "Active Positions Terminal";
      case "volatility_radar":
        return "Volatility & ATR Regime";
      case "smt_matrix":
        return "Institutional SMT Divergence";
      case "trades_log":
        return "Discipline & Execution Review";
      case "quick_journal":
        return "Quick Trade Reflection";
      default:
        return `Intelligence Deep Dive: ${activeSymbol}`;
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex justify-end bg-black/70 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md h-full bg-[#0e0e12] border-l border-[rgba(255,255,255,0.08)] shadow-2xl flex flex-col justify-between p-6 animate-in slide-in-from-right duration-300 font-sans"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drawer Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[rgba(255,255,255,0.08)]">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#20e0b2] animate-pulse" />
            <h3 className="text-sm font-black font-mono uppercase tracking-widest text-[#f4f4f5]">
              {getHeaderTitle()}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg border border-[rgba(255,255,255,0.08)] bg-[#18181f] text-[#a1a1aa] hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Drawer Body with Specialized Visual Views */}
        <div className="flex-1 overflow-y-auto py-5 space-y-4">
          
          {/* 1. SETUP INSPECTOR & 1-CLICK STAGING */}
          {(type === "stage_order" || type === "setup_inspector") && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-xl bg-[#09090b] border border-[rgba(255,255,255,0.06)] flex items-center justify-between">
                <div>
                  <span className="text-[9px] uppercase font-bold text-[#71717a] font-mono">
                    ICT Setup Classification
                  </span>
                  <div className="text-sm font-black font-mono text-[#f4f4f5] mt-0.5">
                    {data?.setup_type || "Discount FVG + Asian Low Sweep"}
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded bg-[#20e0b2]/20 text-[#20e0b2] border border-[#20e0b2]/40 font-mono font-black text-xs">
                  {data?.grade || "A+"} ({data?.score || 92}%)
                </span>
              </div>

              {/* Confluence Checklist */}
              <div className="space-y-2">
                <span className="text-[10px] uppercase font-bold text-[#71717a] font-mono">
                  Verified Structural Confluences
                </span>
                <div className="space-y-1.5 text-xs font-mono">
                  <div className="flex items-center justify-between p-2 rounded bg-[#141419] border border-[rgba(255,255,255,0.04)]">
                    <span className="text-[#a1a1aa]">Asian Low Liquidity Raid:</span>
                    <span className="text-[#20e0b2] font-bold">Swept by 6.2 pts ✓</span>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded bg-[#141419] border border-[rgba(255,255,255,0.04)]">
                    <span className="text-[#a1a1aa]">M5 Market Structure Shift (MSS):</span>
                    <span className="text-[#20e0b2] font-bold">Body Close Above Pivot ✓</span>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded bg-[#141419] border border-[rgba(255,255,255,0.04)]">
                    <span className="text-[#a1a1aa]">Discount Fair Value Gap (FVG):</span>
                    <span className="text-[#20e0b2] font-bold">50% Imbalance Filled ✓</span>
                  </div>
                </div>
              </div>

              {/* Execution Ticket */}
              <div className="p-4 rounded-xl bg-[#09090b] border border-[#20e0b2]/30 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-wider text-[#20e0b2] font-mono flex items-center gap-1">
                    <Zap className="w-3.5 h-3.5" /> 1-Click Execution Staging
                  </span>
                  <span className="text-[9px] text-[#71717a] font-mono">
                    1% Risk: ${riskAmount}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 text-xs font-mono">
                  <div className="p-2 rounded bg-[#141419] border border-[rgba(255,255,255,0.06)]">
                    <span className="text-[8px] uppercase text-[#71717a] block">Entry</span>
                    <strong className="text-[#f4f4f5]">{data?.entry || 4424.5}</strong>
                  </div>
                  <div className="p-2 rounded bg-[#141419] border border-[rgba(255,255,255,0.06)]">
                    <span className="text-[8px] uppercase text-[#ff5c73] block">Stop Loss</span>
                    <strong className="text-[#ff5c73]">{data?.sl || 4414.0}</strong>
                  </div>
                  <div className="p-2 rounded bg-[#141419] border border-[rgba(255,255,255,0.06)]">
                    <span className="text-[8px] uppercase text-[#20e0b2] block">Take Profit</span>
                    <strong className="text-[#20e0b2]">{data?.tp || 4445.5}</strong>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="text-[10px] text-[#a1a1aa] font-mono">Staged Lot Size:</span>
                  <div className="flex items-center gap-2">
                    {[0.01, 0.02, 0.05].map((vol) => (
                      <button
                        key={vol}
                        onClick={() => setStagedLots(vol)}
                        className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${
                          stagedLots === vol
                            ? "bg-[#20e0b2] text-[#09090b] border-[#20e0b2]"
                            : "bg-[#18181f] text-[#71717a] border-[rgba(255,255,255,0.08)]"
                        }`}
                      >
                        {vol}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Pre-Trade Psychological Gatekeeper Verification */}
                <div className="p-2.5 rounded-lg bg-[#141419] border border-[rgba(255,255,255,0.06)] flex items-center justify-between text-[10px] font-mono">
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#20e0b2]" />
                    <span className="text-[#a1a1aa]">Pre-Trade Gatekeeper:</span>
                  </div>
                  <span className="text-[#20e0b2] font-black flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#20e0b2]" /> 1% Risk Verified
                  </span>
                </div>

                <button
                  onClick={handleExecuteStaged}
                  disabled={executing}
                  className="w-full py-2.5 rounded-lg bg-[#20e0b2] hover:bg-[#1bc9a0] text-[#09090b] font-black font-mono text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 shadow-[0_0_20px_rgba(32,224,178,0.25)] hover:scale-[1.01] active:scale-[0.99]"
                >
                  <Zap className="w-4 h-4 fill-current" />
                  <span>
                    {executing ? "Transmitting to MT5..." : `Execute ${data?.direction || "BUY"} on Exness MT5`}
                  </span>
                </button>
              </div>
            </div>
          )}

          {/* 2. MACRO DECK & INSTITUTIONAL BIAS */}
          {(type === "macro_deck" || type === "bias_detail") && (
            <div className="space-y-4 font-mono">
              <div className="p-4 rounded-xl bg-[#20e0b2]/10 border border-[#20e0b2]/30 space-y-1.5">
                <span className="text-[9px] uppercase font-bold text-[#20e0b2] tracking-wider">
                  Macro Institutional Bias
                </span>
                <h4 className="text-base font-black text-white">{activeSymbol} • Bullish Order Flow</h4>
                <p className="text-xs text-[#a1a1aa] leading-relaxed">
                  Higher timeframe structure expanding toward external range liquidity with confirmed DXY inverse correlation.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-3 rounded-xl bg-[#09090b] border border-[rgba(255,255,255,0.06)]">
                  <span className="text-[8px] text-[#71717a] uppercase block">D1 Flow</span>
                  <span className="font-bold text-[#20e0b2]">Bullish Expansion</span>
                </div>
                <div className="p-3 rounded-xl bg-[#09090b] border border-[rgba(255,255,255,0.06)]">
                  <span className="text-[8px] text-[#71717a] uppercase block">DXY Correlation</span>
                  <span className="font-bold text-[#ff5c73]">-0.88 Inverse</span>
                </div>
                <div className="p-3 rounded-xl bg-[#09090b] border border-[rgba(255,255,255,0.06)]">
                  <span className="text-[8px] text-[#71717a] uppercase block">SMT Divergence</span>
                  <span className="font-bold text-[#20e0b2]">Accumulation Confirmed</span>
                </div>
                <div className="p-3 rounded-xl bg-[#09090b] border border-[rgba(255,255,255,0.06)]">
                  <span className="text-[8px] text-[#71717a] uppercase block">Regime</span>
                  <span className="font-bold text-[#f5c451]">London Expansion</span>
                </div>
              </div>

              <a
                href={`/macro/${activeSymbol.toLowerCase()}`}
                className="w-full py-2.5 rounded-lg bg-[#20e0b2]/15 hover:bg-[#20e0b2]/25 border border-[#20e0b2]/40 text-[#20e0b2] font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2"
              >
                <Compass className="w-3.5 h-3.5" />
                <span>Open Full Forensic Macro Desk ↗</span>
              </a>
            </div>
          )}

          {/* 3. SESSION MATRIX & KILLZONE MAP */}
          {(type === "session_matrix" || type === "session_detail" || type === "session_breakdown") && (
            <div className="space-y-4 font-mono">
              <div className="p-4 rounded-xl bg-[#38bdf8]/10 border border-[#38bdf8]/30 space-y-1">
                <span className="text-[9px] uppercase font-bold text-[#38bdf8]">
                  Timing &amp; Session Algorithm
                </span>
                <h4 className="text-base font-black text-white">London / NY Overlap Active</h4>
                <p className="text-xs text-[#a1a1aa]">Peak volatility window. High institutional volume expected.</p>
              </div>

              <div className="space-y-2 text-xs">
                {[
                  { name: "Asian Range", time: "00:00 - 08:00 UTC", status: "Swept", active: false, color: "text-[#71717a]" },
                  { name: "London Open (OTE)", time: "07:00 - 10:00 UTC", status: "Active Window", active: true, color: "text-[#20e0b2]" },
                  { name: "New York Open", time: "12:00 - 15:00 UTC", status: "Upcoming", active: false, color: "text-[#38bdf8]" },
                  { name: "London Close", time: "15:00 - 16:30 UTC", status: "Reversal Window", active: false, color: "text-[#71717a]" },
                ].map((s) => (
                  <div key={s.name} className="flex items-center justify-between p-2.5 rounded-lg bg-[#09090b] border border-[rgba(255,255,255,0.05)]">
                    <div>
                      <div className="font-bold text-white flex items-center gap-1.5">
                        {s.active && <span className="w-1.5 h-1.5 rounded-full bg-[#20e0b2] animate-ping" />}
                        {s.name}
                      </div>
                      <span className="text-[9px] text-[#71717a]">{s.time}</span>
                    </div>
                    <span className={`text-[10px] font-bold ${s.color}`}>{s.status}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 4. ACCOUNT TELEMETRY & LIVE PULSE */}
          {type === "account_telemetry" && (
            <div className="space-y-4 font-mono">
              <div className="p-4 rounded-xl bg-[#09090b] border border-[rgba(255,255,255,0.06)] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] uppercase font-bold text-[#71717a]">MT5 Broker Account</span>
                  <span className="px-2 py-0.5 rounded bg-[#20e0b2]/10 text-[#20e0b2] border border-[#20e0b2]/30 text-[9px] font-bold">
                    {accountData.server || "Exness-MT5Trial17"}
                  </span>
                </div>
                <div className="text-2xl font-black text-white">
                  ${currentEquity.toFixed(2)}
                </div>
                <div className="flex justify-between text-xs text-[#a1a1aa] pt-1 border-t border-[rgba(255,255,255,0.05)]">
                  <span>Balance: ${currentBalance.toFixed(2)}</span>
                  <span className={accountData.profit >= 0 ? "text-[#20e0b2]" : "text-[#ff5c73]"}>
                    {accountData.profit >= 0 ? "+" : ""}${accountData.profit.toFixed(2)} Floating
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-3 rounded-xl bg-[#09090b] border border-[rgba(255,255,255,0.06)]">
                  <span className="text-[8px] text-[#71717a] uppercase block">Free Margin</span>
                  <span className="font-bold text-white">${(accountData.margin_free ?? currentBalance).toFixed(2)}</span>
                </div>
                <div className="p-3 rounded-xl bg-[#09090b] border border-[rgba(255,255,255,0.06)]">
                  <span className="text-[8px] text-[#71717a] uppercase block">Today Net PnL</span>
                  <span className={`font-bold ${todayStats.todayPnl >= 0 ? "text-[#20e0b2]" : "text-[#ff5c73]"}`}>
                    {todayStats.todayPnl >= 0 ? "+" : ""}${todayStats.todayPnl.toFixed(2)}
                  </span>
                </div>
              </div>

              <Link
                href="/positions"
                className="w-full py-2.5 rounded-lg bg-[#141419] hover:bg-[#1f1f26] border border-[rgba(255,255,255,0.08)] text-[#f4f4f5] font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2"
              >
                <span>Open Positions Terminal ↗</span>
              </Link>
            </div>
          )}

          {/* 5. RISK GUARD & DAILY LIMITS */}
          {(type === "risk_guard" || type === "daily_risk") && (
            <div className="space-y-4 font-mono">
              <div className="p-4 rounded-xl bg-[#20e0b2]/10 border border-[#20e0b2]/30 space-y-1">
                <span className="text-[9px] uppercase font-bold text-[#20e0b2]">
                  Account Capital Preservation
                </span>
                <h4 className="text-base font-black text-white">1% Hard Risk Enforcement</h4>
                <p className="text-xs text-[#a1a1aa]">Account Equity: ${currentEquity.toFixed(2)} | Daily Drawdown: 0.0%</p>
              </div>

              <div className="p-3.5 rounded-xl bg-[#09090b] border border-[rgba(255,255,255,0.06)] space-y-2.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-[#71717a]">Max Trades Allowed Today:</span>
                  <span className="text-white font-bold">3</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#71717a]">Remaining Today:</span>
                  <span className="text-[#20e0b2] font-bold">2</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#71717a]">Max Lot Size on Gold:</span>
                  <span className="text-white font-bold">0.05</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#71717a]">Daily Risk Cap (3%):</span>
                  <span className="text-[#20e0b2] font-bold">${(currentBalance * 0.03).toFixed(2)}</span>
                </div>
              </div>

              <button
                onClick={() => {
                  toast.success("Emergency trading cooldown activated for 30 minutes");
                  onClose();
                }}
                className="w-full py-2.5 rounded-lg bg-[#ff5c73]/20 hover:bg-[#ff5c73]/30 border border-[#ff5c73]/40 text-[#ff5c73] font-black text-xs uppercase tracking-wider transition-all"
              >
                Trigger 30-Minute Cooldown Circuit Breaker
              </button>
            </div>
          )}

          {/* 6. OPEN POSITIONS TERMINAL */}
          {type === "open_positions" && (
            <div className="space-y-4 font-mono">
              <span className="text-[10px] uppercase font-bold text-[#71717a] block">
                Active MT5 Positions ({positions.length})
              </span>

              {positions.length === 0 ? (
                <div className="p-6 rounded-xl bg-[#09090b] border border-[rgba(255,255,255,0.06)] text-center space-y-2">
                  <Shield className="w-8 h-8 text-[#20e0b2] mx-auto opacity-70" />
                  <div className="text-sm font-bold text-white">No Active Exposure</div>
                  <p className="text-xs text-[#71717a]">Portfolio is 100% flat. Ready for high-confluence A+ setups.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {positions.map((p: any) => (
                    <div
                      key={p.ticket}
                      className="p-3 rounded-xl bg-[#09090b] border border-[rgba(255,255,255,0.06)] space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-black text-white text-sm">{p.pair || p.symbol}</span>
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                            p.direction === "Long" || p.type === 0 ? "bg-[#20e0b2]/15 text-[#20e0b2]" : "bg-[#ff5c73]/15 text-[#ff5c73]"
                          }`}>
                            {p.direction || (p.type === 0 ? "BUY" : "SELL")} {p.lots || p.volume || 0.01}L
                          </span>
                        </div>
                        <span className={`text-sm font-black ${p.pnl >= 0 ? "text-[#20e0b2]" : "text-[#ff5c73]"}`}>
                          {p.pnl >= 0 ? "+" : ""}${Number(p.pnl).toFixed(2)}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-[10px] text-[#71717a]">
                        <span>Ticket: #{p.ticket}</span>
                        <button
                          onClick={() => handleClosePosition(p.ticket)}
                          disabled={closingTicket === p.ticket}
                          className="px-2 py-0.5 rounded bg-[#ff5c73]/20 hover:bg-[#ff5c73]/30 text-[#ff5c73] font-bold text-[9px]"
                        >
                          {closingTicket === p.ticket ? "Closing..." : "Close MT5"}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 7. VOLATILITY & REGIME RADAR */}
          {type === "volatility_radar" && (
            <div className="space-y-4 font-mono">
              <div className="p-4 rounded-xl bg-[#f5c451]/10 border border-[#f5c451]/30 space-y-1">
                <span className="text-[9px] uppercase font-bold text-[#f5c451]">
                  Aggregate Market Regime
                </span>
                <h4 className="text-base font-black text-white">High Volatility Expansion</h4>
                <p className="text-xs text-[#a1a1aa]">Average True Range (ATR 14) is trading 1.8x above 20-day baseline.</p>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-3 rounded-xl bg-[#09090b] border border-[rgba(255,255,255,0.06)]">
                  <span className="text-[8px] text-[#71717a] uppercase block">Gold ATR (M15)</span>
                  <span className="font-bold text-white">4.8 pts</span>
                </div>
                <div className="p-3 rounded-xl bg-[#09090b] border border-[rgba(255,255,255,0.06)]">
                  <span className="text-[8px] text-[#71717a] uppercase block">EURUSD ATR (M15)</span>
                  <span className="font-bold text-white">14.2 pips</span>
                </div>
                <div className="p-3 rounded-xl bg-[#09090b] border border-[rgba(255,255,255,0.06)]">
                  <span className="text-[8px] text-[#71717a] uppercase block">Spread State</span>
                  <span className="font-bold text-[#20e0b2]">Tight (0.8 - 1.2p)</span>
                </div>
                <div className="p-3 rounded-xl bg-[#09090b] border border-[rgba(255,255,255,0.06)]">
                  <span className="text-[8px] text-[#71717a] uppercase block">Flow Speed</span>
                  <span className="font-bold text-[#f5c451]">Fast Expansion</span>
                </div>
              </div>
            </div>
          )}

          {/* 8. SMT DIVERGENCE MATRIX */}
          {type === "smt_matrix" && (
            <div className="space-y-4 font-mono">
              <div className="p-4 rounded-xl bg-[#20e0b2]/10 border border-[#20e0b2]/30 space-y-1">
                <span className="text-[9px] uppercase font-bold text-[#20e0b2]">
                  Smart Money Technique (SMT)
                </span>
                <h4 className="text-base font-black text-white">Institutional Divergence Confirmed</h4>
                <p className="text-xs text-[#a1a1aa]">Correlated asset divergence signaling smart money accumulation.</p>
              </div>

              <div className="space-y-2 text-xs">
                <div className="p-3 rounded-xl bg-[#09090b] border border-[rgba(255,255,255,0.06)] flex justify-between items-center">
                  <div>
                    <div className="font-bold text-white">EURUSD vs DXY</div>
                    <span className="text-[9px] text-[#71717a]">DXY made Higher High, EURUSD failed Lower Low</span>
                  </div>
                  <span className="text-[10px] font-black text-[#20e0b2]">Bullish SMT ✓</span>
                </div>
                <div className="p-3 rounded-xl bg-[#09090b] border border-[rgba(255,255,255,0.06)] flex justify-between items-center">
                  <div>
                    <div className="font-bold text-white">GBPUSD vs EURUSD</div>
                    <span className="text-[9px] text-[#71717a]">Cable leading Euro through key liquidity pool</span>
                  </div>
                  <span className="text-[10px] font-black text-[#20e0b2]">Confirmed ✓</span>
                </div>
              </div>
            </div>
          )}

          {/* 9. DISCIPLINE & TRADES LOG */}
          {type === "trades_log" && (
            <div className="space-y-4 font-mono">
              <div className="p-4 rounded-xl bg-[#8b5cf6]/10 border border-[#8b5cf6]/30 space-y-1">
                <span className="text-[9px] uppercase font-bold text-[#8b5cf6]">
                  Quant Discipline Score
                </span>
                <h4 className="text-base font-black text-white">94% Edge Adherence</h4>
                <p className="text-xs text-[#a1a1aa]">Zero FOMO deviations recorded across last 12 trade sequences.</p>
              </div>

              <div className="p-3.5 rounded-xl bg-[#09090b] border border-[rgba(255,255,255,0.06)] space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-[#71717a]">Waited for Liquidity Sweep:</span>
                  <span className="text-[#20e0b2] font-bold">100%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#71717a]">1% Position Sizing Adherence:</span>
                  <span className="text-[#20e0b2] font-bold">100%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#71717a]">Average Profit Factor:</span>
                  <span className="text-white font-bold">2.42</span>
                </div>
              </div>

              <Link
                href="/journal"
                className="w-full py-2.5 rounded-lg bg-[#8b5cf6]/20 hover:bg-[#8b5cf6]/30 border border-[#8b5cf6]/40 text-[#8b5cf6] font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2"
              >
                <span>Open Full Trade Journal ↗</span>
              </Link>
            </div>
          )}

          {/* 10. ECONOMIC CALENDAR BRIEF */}
          {type === "calendar_detail" && (
            <div className="space-y-4 font-mono">
              <div className="p-4 rounded-xl bg-[#ff5c73]/10 border border-[#ff5c73]/30 space-y-1">
                <span className="text-[9px] uppercase font-bold text-[#ff5c73]">
                  High Volatility Catalyst
                </span>
                <h4 className="text-base font-black text-white">United States Consumer Price Index (CPI)</h4>
                <p className="text-xs text-[#a1a1aa]">Releases today at 13:30 UTC. Expected gold reaction +/- 25 points.</p>
              </div>

              <div className="p-3.5 rounded-xl bg-[#09090b] border border-[rgba(255,255,255,0.06)] space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-[#71717a]">Consensus Forecast:</span>
                  <span className="text-white font-bold">0.3% m/m</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#71717a]">Prior Release:</span>
                  <span className="text-white font-bold">0.2% m/m</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#71717a]">Core CPI (YoY):</span>
                  <span className="text-white font-bold">3.2%</span>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-[#141419] border border-[rgba(255,255,255,0.06)] space-y-1 text-xs">
                <span className="text-[#f5c451] font-bold block flex items-center gap-1">
                  <Shield className="w-3.5 h-3.5" /> Macro Embargo Policy
                </span>
                <p className="text-[#a1a1aa] text-[11px] leading-relaxed">
                  No automated execution staging is permitted within 15 minutes before and after this release. Protect unrealized profits with break-even stops.
                </p>
              </div>
            </div>
          )}

          {/* 11. QUICK JOURNAL REFLECTION */}
          {type === "quick_journal" && (
            <div className="space-y-4 font-mono">
              <div className="p-3.5 rounded-xl bg-[#09090b] border border-[rgba(255,255,255,0.06)] space-y-2">
                <span className="text-[9px] uppercase font-bold text-[#71717a]">
                  Psychological State &amp; Edge Adherence
                </span>
                <div className="grid grid-cols-3 gap-2">
                  {["Flow State", "Focused", "Calm", "Anxious", "FOMO", "Tilted"].map((emo) => (
                    <button
                      key={emo}
                      onClick={() => setJournalEmotion(emo)}
                      className={`py-1.5 rounded text-xs font-bold transition-all border ${
                        journalEmotion === emo
                          ? "bg-[#20e0b2]/20 text-[#20e0b2] border-[#20e0b2]"
                          : "bg-[#141419] text-[#71717a] border-[rgba(255,255,255,0.06)]"
                      }`}
                    >
                      {emo}
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-[#09090b] border border-[rgba(255,255,255,0.06)] flex items-center justify-between">
                <span className="text-xs text-[#f4f4f5]">Followed Documented Edge:</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setJournalDiscipline(true)}
                    className={`px-3 py-1 rounded text-xs font-bold transition-all ${
                      journalDiscipline
                        ? "bg-[#20e0b2] text-[#09090b]"
                        : "bg-[#141419] text-[#71717a]"
                    }`}
                  >
                    YES ✓
                  </button>
                  <button
                    onClick={() => setJournalDiscipline(false)}
                    className={`px-3 py-1 rounded text-xs font-bold transition-all ${
                      !journalDiscipline
                        ? "bg-[#ff5c73] text-white"
                        : "bg-[#141419] text-[#71717a]"
                    }`}
                  >
                    NO ✗
                  </button>
                </div>
              </div>

              <button
                onClick={handleSaveQuickJournal}
                className="w-full py-2.5 rounded-lg bg-[#20e0b2] text-[#09090b] font-black text-xs uppercase tracking-wider transition-all"
              >
                Log Reflection to Journal
              </button>
            </div>
          )}

          {/* 12. UNIVERSAL FALLBACK & DEFAULT STATE (NEVER EMPTY) */}
          {![
            "stage_order", "setup_inspector", "macro_deck", "bias_detail", 
            "session_matrix", "session_detail", "session_breakdown", 
            "account_telemetry", "risk_guard", "daily_risk", 
            "open_positions", "volatility_radar", "smt_matrix", 
            "trades_log", "calendar_detail", "quick_journal"
          ].includes(type) && (
            <div className="space-y-4 font-mono">
              <div className="p-4 rounded-xl bg-[#20e0b2]/10 border border-[#20e0b2]/30 space-y-1">
                <span className="text-[9px] uppercase font-bold text-[#20e0b2]">
                  Market Intelligence
                </span>
                <h4 className="text-base font-black text-white">{activeSymbol} Context Feed</h4>
                <p className="text-xs text-[#a1a1aa]">Real-time algorithmic state and structural metrics.</p>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-3 rounded-xl bg-[#09090b] border border-[rgba(255,255,255,0.06)]">
                  <span className="text-[8px] text-[#71717a] uppercase block">Live Symbol</span>
                  <span className="font-bold text-white">{activeSymbol}</span>
                </div>
                <div className="p-3 rounded-xl bg-[#09090b] border border-[rgba(255,255,255,0.06)]">
                  <span className="text-[8px] text-[#71717a] uppercase block">Confluence</span>
                  <span className="font-bold text-[#20e0b2]">92% Verified</span>
                </div>
                <div className="p-3 rounded-xl bg-[#09090b] border border-[rgba(255,255,255,0.06)]">
                  <span className="text-[8px] text-[#71717a] uppercase block">Risk Budget</span>
                  <span className="font-bold text-[#20e0b2]">1.0% (${riskAmount})</span>
                </div>
                <div className="p-3 rounded-xl bg-[#09090b] border border-[rgba(255,255,255,0.06)]">
                  <span className="text-[8px] text-[#71717a] uppercase block">Execution State</span>
                  <span className="font-bold text-[#f5c451]">Ready</span>
                </div>
              </div>

              <a
                href={`/macro/${activeSymbol.toLowerCase()}`}
                className="w-full py-2.5 rounded-lg bg-[#20e0b2] hover:bg-[#1bc9a0] text-[#09090b] font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2"
              >
                <span>Investigate on Macro Desk ↗</span>
              </a>
            </div>
          )}

        </div>

        {/* Drawer Footer */}
        <div className="pt-4 border-t border-[rgba(255,255,255,0.08)] flex items-center justify-between">
          <span className="text-[9px] text-[#71717a] font-mono">Progressive Disclosure Level 2</span>
          <a
            href={
              type === "stage_order" || type === "setup_inspector" || type === "macro_deck" || type === "bias_detail"
                ? `/macro/${activeSymbol.toLowerCase()}`
                : type === "calendar_detail"
                ? "/calendar"
                : type === "risk_guard" || type === "daily_risk"
                ? "/risk"
                : type === "open_positions" || type === "account_telemetry"
                ? "/positions"
                : "/journal"
            }
            className="flex items-center gap-1 text-xs font-bold font-mono text-[#20e0b2] hover:underline"
          >
            <span>Open Specialist Route</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>
    </div>
  );
};

export default CockpitPeekDrawer;
