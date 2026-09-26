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

  const balance = account?.balance ?? 865.65;
  const equity = account?.equity ?? 914.44;
  const floating = account?.profit ?? 48.79;
  const dollarRisk = (balance * riskPct) / 100;
  const slDist = Math.max(1, Math.abs(signal.entryPrice - signal.slPrice));
  const tickValue = symbol === "XAUUSD" ? 1.0 : 10.0;
  const calcLots = Math.max(0.01, Number((dollarRisk / (slDist * tickValue)).toFixed(2)));

  const activePos = positions.find((p) => p.pair.toUpperCase().includes(symbol.replace("/", "")));
  const equityPct = balance > 0 ? ((equity / balance - 1) * 100).toFixed(2) : "0.00";

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
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span className="text-white font-bold text-[11px] uppercase tracking-widest">Risk Check</span>
        </div>
        <span className="text-[9px] px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-bold">
          {account?.server || "Exness Live"}
        </span>
      </div>

      {/* Account Stats Grid */}
      <div className="grid grid-cols-3 gap-2">
        <StatTile label="Balance" value={`$${balance.toFixed(0)}`} sub="USD" color="text-white" />
        <StatTile
          label="Equity"
          value={`$${equity.toFixed(0)}`}
          sub={`${equityPct}%`}
          color={floating >= 0 ? "text-emerald-400" : "text-rose-400"}
        />
        <StatTile
          label="Floating"
          value={`${floating >= 0 ? "+" : ""}$${floating.toFixed(2)}`}
          sub="Open P&L"
          color={floating >= 0 ? "text-emerald-400" : "text-rose-400"}
        />
      </div>

      {/* Risk Selector */}
      <div className="bg-black/20 border border-white/[0.05] rounded-xl p-2.5">
        <div className="flex items-center justify-between mb-2">
          <span className="text-zinc-400 text-[10px] flex items-center gap-1">
            <Target className="w-3 h-3" /> Risk Allocation
          </span>
          <div className="flex gap-1">
            {[0.25, 0.5, 1.0].map((r) => (
              <button
                key={r}
                onClick={() => setRiskPct(r)}
                className={`px-2 py-0.5 rounded text-[9px] font-bold transition-all ${
                  riskPct === r
                    ? "bg-emerald-500 text-black"
                    : "bg-white/[0.05] text-zinc-400 hover:text-white"
                }`}
              >
                {r}%
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <span className="text-zinc-500 text-[9px] block">Dollar Risk</span>
            <span className="text-rose-400 font-bold text-[11px]">${dollarRisk.toFixed(2)}</span>
          </div>
          <div className="w-px h-6 bg-white/10" />
          <div>
            <span className="text-zinc-500 text-[9px] block">Suggested Lots</span>
            <span className="text-emerald-400 font-bold text-[13px] tabular-nums">{calcLots}L</span>
          </div>
          <div className="w-px h-6 bg-white/10" />
          <div>
            <span className="text-zinc-500 text-[9px] block">R:R Ratio</span>
            <span className="text-amber-400 font-bold text-[11px]">{signal.rrRatio}</span>
          </div>
        </div>
      </div>

      {/* Active Position Panel */}
      {activePos ? (
        <div className="bg-emerald-950/20 border border-emerald-500/25 rounded-xl p-2.5 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-emerald-300 font-bold text-[10px] flex items-center gap-1.5">
              <Shield className="w-3 h-3" /> #{activePos.ticket}
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
        <div className="flex items-center justify-center py-3 text-[9.5px] text-zinc-600 gap-2 bg-white/[0.02] rounded-xl border border-white/[0.04]">
          <DollarSign className="w-3.5 h-3.5" />
          <span>No open exposure · Ready for entry</span>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-2 pt-1 border-t border-white/[0.05]">
        <button
          onClick={onMarkSetup}
          className="flex-1 py-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.09] border border-white/[0.08] text-zinc-300 font-bold text-[10px] transition-colors"
        >
          Mark Setup
        </button>
        <button
          onClick={onExecute}
          className="flex-1 py-2 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 font-bold text-[10px] transition-all flex items-center justify-center gap-1.5"
        >
          <Zap className="w-3.5 h-3.5" />
          Execute {calcLots}L
        </button>
      </div>
    </div>
  );
}