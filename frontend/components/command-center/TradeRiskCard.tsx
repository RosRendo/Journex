"use client";

import React, { useState } from "react";
import { ShieldCheck, Shield, Zap, DollarSign, Target } from "lucide-react";
import { SetupSignalData, StrategyProfile } from "./types";
import { RealAccountData, RealPosition } from "@/hooks/useCommandCenterRealData";

interface Props {
  symbol: string;
  signal: SetupSignalData;
  strategy: StrategyProfile;
  account: RealAccountData | null;
  positions: RealPosition[];
  onExecute: () => void;
  onMarkSetup: () => void;
}

function StatTile({ label, value, sub, color = "text-white" }: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <div className="bg-black/30 border border-white/[0.05] rounded-xl p-2.5 flex flex-col gap-0.5">
      <span className="text-zinc-500 text-[9px] font-semibold uppercase tracking-wide">{label}</span>
      <span className={`font-bold text-[12px] tabular-nums font-mono ${color}`}>{value}</span>
      {sub && <span className="text-zinc-600 text-[8.5px]">{sub}</span>}
    </div>
  );
}

export default function TradeRiskCard({ symbol, signal, strategy, account, positions, onExecute, onMarkSetup }: Props) {
  const [riskPct, setRiskPct] = useState(0.5);

  const hasAccount = account !== null && account !== undefined && account.balance > 0;
  const balance = hasAccount ? account.balance : null;
  const equity = hasAccount ? account.equity : null;
  const floating = hasAccount ? account.profit : null;
  const dollarRisk = balance !== null ? (balance * riskPct) / 100 : null;
  const slDist = Math.max(1, Math.abs(signal.entryPrice - signal.slPrice));
  const tickValue = symbol === "XAUUSD" ? 1.0 : 10.0;
  const calcLots = dollarRisk !== null ? Math.max(0.01, Number((dollarRisk / (slDist * tickValue)).toFixed(2))) : null;

  const activePos = positions.find((p) => p.pair.toUpperCase().includes(symbol.replace("/", "")));
  const equityPct = (balance && balance > 0 && equity !== null) ? ((equity / balance - 1) * 100).toFixed(2) : "--";

  const handleCloseTrade = async (ticket: number) => {
    try {
      const res = await fetch("/api/bridge/api/close-position", {
        method: "POST",
        headers: { "Content-Type": "application/json", "ngrok-skip-browser-warning": "true" },
        body: JSON.stringify({ ticket }),
      });
      const d = await res.json();
      alert(d.success ? `Position #${ticket} closed.` : `Status: ${d.message}`);
    } catch { alert("Bridge error."); }
  };

  const handleBE = async (ticket: number, entry: number) => {
    try {
      await fetch("/api/bridge/api/modify-position", {
        method: "POST",
        headers: { "Content-Type": "application/json", "ngrok-skip-browser-warning": "true" },
        body: JSON.stringify({ ticket, sl: entry, tp: signal.tp2Price }),
      });
      alert(`Breakeven set @ ${entry}`);
    } catch { alert("Bridge error."); }
  };

  return (
    <div className="bg-[#0b0b0f] border border-white/[0.07] rounded-xl p-3.5 shadow-lg flex flex-col gap-3 font-mono text-[11px]">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-3.5 h-3.5 text-zinc-400" />
          <span className="text-white font-bold text-[11px] uppercase tracking-widest">Risk Allocation</span>
        </div>
        <span className={`text-[9px] px-2 py-0.5 rounded-md border font-mono ${
          hasAccount
            ? "bg-emerald-500/10 border-emerald-500/25 text-emerald-400"
            : "bg-rose-500/10 border-rose-500/25 text-rose-400"
        }`}>
          {hasAccount ? (account?.server || "MT5 Connected") : "MT5 Offline"}
        </span>
      </div>

      {/* Disconnected Alert Banner */}
      {!hasAccount && (
        <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-2.5 flex items-center justify-between text-[10px]">
          <span className="text-rose-300">Broker Disconnected · No Account Telemetry</span>
          <button
            onClick={() => window.location.reload()}
            className="text-white bg-rose-500/20 hover:bg-rose-500/30 px-2 py-0.5 rounded border border-rose-500/30 font-bold transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      {/* Account Stats Grid */}
      <div className="grid grid-cols-3 gap-2">
        <StatTile
          label="Balance"
          value={balance !== null ? `$${balance.toFixed(0)}` : "--"}
          sub={hasAccount ? (account?.currency || "USD") : "NO FEED"}
          color="text-white"
        />
        <StatTile
          label="Equity"
          value={equity !== null ? `$${equity.toFixed(0)}` : "--"}
          sub={hasAccount ? `${equityPct}%` : "OFFLINE"}
          color={floating !== null ? (floating >= 0 ? "text-emerald-400" : "text-rose-400") : "text-zinc-500"}
        />
        <StatTile
          label="Floating"
          value={floating !== null ? `${floating >= 0 ? "+" : ""}$${floating.toFixed(2)}` : "--"}
          sub="Open P&L"
          color={floating !== null ? (floating >= 0 ? "text-emerald-400" : "text-rose-400") : "text-zinc-500"}
        />
      </div>

      {/* Risk Selector */}
      <div className="bg-black/20 border border-white/[0.05] rounded-xl p-2.5">
        <div className="flex items-center justify-between mb-2">
          <span className="text-zinc-400 text-[10px] flex items-center gap-1">
            <Target className="w-3 h-3 text-zinc-500" /> Risk Sizing
          </span>
          <div className="flex gap-1">
            {[0.25, 0.5, 1.0].map((r) => (
              <button
                key={r}
                onClick={() => setRiskPct(r)}
                className={`px-2 py-0.5 rounded text-[9px] font-bold transition-all ${
                  riskPct === r
                    ? "bg-white/20 text-white border border-white/20"
                    : "bg-white/[0.03] text-zinc-400 hover:text-white border border-transparent"
                }`}
              >
                {r}%
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <span className="text-zinc-500 text-[9px] block">Risk Amount</span>
            <span className="text-zinc-200 font-bold text-[11px] tabular-nums">
              {dollarRisk !== null ? `$${dollarRisk.toFixed(2)}` : "--"}
            </span>
          </div>
          <div className="w-px h-6 bg-white/10" />
          <div>
            <span className="text-zinc-500 text-[9px] block">Calc Volume</span>
            <span className="text-white font-bold text-[13px] tabular-nums">
              {calcLots !== null ? `${calcLots} Lots` : "--"}
            </span>
          </div>
          <div className="w-px h-6 bg-white/10" />
          <div>
            <span className="text-zinc-500 text-[9px] block">Model R:R</span>
            <span className="text-zinc-200 font-bold text-[11px] tabular-nums">{signal.rrRatio}</span>
          </div>
        </div>
      </div>

      {/* Active Position Panel */}
      {activePos ? (
        <div className="bg-white/[0.03] border border-white/10 rounded-xl p-2.5 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-zinc-300 font-bold text-[10px] flex items-center gap-1.5 font-mono">
              <Shield className="w-3 h-3 text-zinc-400" /> #{activePos.ticket}
            </span>
            <span className={`font-bold tabular-nums text-[11px] ${activePos.pnl >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
              {activePos.pnl >= 0 ? "+" : ""}${activePos.pnl.toFixed(2)}
            </span>
          </div>
          <div className="text-zinc-400 text-[9px]">
            {activePos.direction} · {activePos.volume}L · Entry @ {activePos.entry}
          </div>
          <div className="flex gap-1.5">
            <button
              onClick={() => handleBE(activePos.ticket, activePos.entry)}
              className="flex-1 py-1.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.10] border border-white/10 text-zinc-200 font-bold text-[9px] transition-colors"
            >
              Set BE
            </button>
            <button
              onClick={() => handleCloseTrade(activePos.ticket)}
              className="flex-1 py-1.5 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 font-bold text-[9px] transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-center py-3 text-[9.5px] text-zinc-500 gap-2 bg-white/[0.02] rounded-xl border border-white/[0.04]">
          <DollarSign className="w-3.5 h-3.5 text-zinc-600" />
          <span>No open exposure · Risk cleared</span>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-2 pt-1 border-t border-white/[0.05]">
        <button
          onClick={onMarkSetup}
          className="flex-1 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-zinc-300 hover:text-white font-bold text-[10px] transition-colors"
        >
          Mark Setup
        </button>
        <button
          onClick={onExecute}
          disabled={!hasAccount}
          className={`flex-1 py-2 rounded-xl border font-bold text-[10px] transition-all flex items-center justify-center gap-1.5 ${
            hasAccount
              ? "bg-white/10 hover:bg-white/15 border-white/15 text-white cursor-pointer"
              : "bg-zinc-800/40 border-white/5 text-zinc-500 cursor-not-allowed"
          }`}
        >
          <Zap className="w-3.5 h-3.5 text-zinc-300" />
          {hasAccount ? `Execute ${calcLots}L` : "Execute (MT5 Required)"}
        </button>
      </div>
    </div>
  );
}