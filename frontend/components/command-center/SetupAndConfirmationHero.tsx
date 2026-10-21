"use client";

import React, { useState } from "react";
import { Zap, FlaskConical, BookOpen, ArrowUp, ArrowDown, Target, CheckCircle2, Clock } from "lucide-react";
import { SetupSignalData } from "./types";

interface Props {
  signal: SetupSignalData;
  onOpenSignalLab: () => void;
  onOpenJournalConvert: () => void;
  onExecuteTrade: () => void;
  compact?: boolean;
}

function PriceLevel({
  label,
  value,
  color,
  bg,
  border,
}: {
  label: string;
  value: number;
  color: string;
  bg: string;
  border: string;
}) {
  const fmt = value > 100 ? value.toFixed(2) : value.toFixed(4);
  return (
    <div className={`flex flex-col justify-center px-3 py-2 rounded-xl border ${bg} ${border} min-w-0 overflow-hidden`}>
      <span className={`text-[8.5px] font-bold uppercase tracking-wider mb-0.5 ${color} opacity-80 truncate`}>
        {label}
      </span>
      <span className={`font-black text-[13px] tabular-nums font-mono ${color} truncate`}>
        {fmt}
      </span>
    </div>
  );
}

function ReadinessBar({ label, pct, color }: { label: string; pct: number; color: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-zinc-500 text-[9px] w-20 shrink-0">{label}</span>
      <div className="flex-1 h-1.5 bg-zinc-900 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-700 ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className={`text-[9px] font-bold w-7 text-right ${color.includes("emerald") ? "text-emerald-400" : "text-amber-400"}`}>
        {pct}%
      </span>
    </div>
  );
}

export default function SetupAndConfirmationHero({
  signal,
  onOpenSignalLab,
  onOpenJournalConvert,
  onExecuteTrade,
  compact = false,
}: Props) {
  const [executed, setExecuted] = useState(false);
  const isReady = signal.readinessState === "READY";
  const isBull = signal.bias === "LONG";

  const handleExecute = async () => {
    await onExecuteTrade();
    setExecuted(true);
    setTimeout(() => setExecuted(false), 4000);
  };

  const overallReadiness = Math.round(
    (signal.readinessBars.market + signal.readinessBars.setup + signal.readinessBars.confirmation) / 3
  );

  return (
    <div className="bg-[#0b0b0f] border border-white/[0.07] rounded-xl p-3.5 shadow-lg font-mono text-[11px] flex flex-col gap-3">
      {/* ── Header Row ── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
              isBull ? "bg-emerald-500/15 border border-emerald-500/30" : "bg-rose-500/15 border border-rose-500/30"
            }`}
          >
            {isBull ? <ArrowUp className="w-3.5 h-3.5 text-emerald-400" /> : <ArrowDown className="w-3.5 h-3.5 text-rose-400" />}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className={`font-black text-[12px] ${isBull ? "text-emerald-400" : "text-rose-400"}`}>{signal.bias}</span>
              <span className="text-zinc-300 font-bold text-[10px] uppercase tracking-wider truncate">
                {signal.headline.replace(/LONG|SHORT|SETUP DETECTED/gi, "").trim()}
              </span>
            </div>
            <div className="text-zinc-500 text-[8.5px] truncate">ICT · Smart Money Concept</div>
          </div>
        </div>

        {/* Confidence Badge */}
        <div className="shrink-0 pl-2">
          <div className="text-center px-2.5 py-1 rounded-lg border bg-white/[0.05] border-white/10">
            <div className="font-bold text-[13px] tabular-nums text-white">
              {signal.confidenceScore}%
            </div>
            <div className="text-zinc-500 text-[7.5px] uppercase font-bold tracking-widest">Score</div>
          </div>
        </div>
      </div>

      {/* ── Price Levels Block (No horizontal collision, ample width for each pill) ── */}
      <div className="bg-black/30 rounded-xl border border-white/[0.05] p-3 flex flex-col gap-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-zinc-400" />
            <span className="text-zinc-400 text-[9px] uppercase font-bold tracking-widest">Execution Levels</span>
          </div>
          <span className="text-zinc-200 font-bold text-[9.5px] bg-white/[0.06] px-2 py-0.5 rounded border border-white/10 font-mono">
            R:R {signal.rrRatio}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <PriceLevel label="Entry" value={signal.entryPrice} color="text-zinc-100" bg="bg-white/[0.04]" border="border-white/10" />
          <PriceLevel label="Stop Loss" value={signal.slPrice} color="text-rose-400" bg="bg-rose-500/[0.06]" border="border-rose-500/20" />
          <PriceLevel label="TP 1" value={signal.tp1Price} color="text-emerald-400" bg="bg-emerald-500/[0.06]" border="border-emerald-500/20" />
          <PriceLevel label="TP 2" value={signal.tp2Price} color="text-emerald-300" bg="bg-emerald-500/[0.04]" border="border-emerald-500/20" />
        </div>

        {/* Risk & Target Distance Strip */}
        <div className="flex items-center justify-between pt-2 border-t border-white/[0.05] text-[9px] font-mono text-zinc-500">
          <span>Risk: <strong className="text-zinc-300 font-bold">{Math.abs(signal.entryPrice - signal.slPrice).toFixed(signal.entryPrice > 100 ? 2 : 4)}</strong></span>
          <span>·</span>
          <span>TP1 Dist: <strong className="text-zinc-300 font-bold">{Math.abs(signal.tp1Price - signal.entryPrice).toFixed(signal.entryPrice > 100 ? 2 : 4)}</strong></span>
          <span>·</span>
          <span>Bias: <strong className="text-white font-bold">{signal.bias}</strong></span>
        </div>
      </div>

      {/* ── Main Content Split (Stacked in compact sidebar, 2-col in desk) ── */}
      <div className={`grid gap-3 ${compact ? "grid-cols-1" : "grid-cols-1 xl:grid-cols-2"}`}>
        {/* Setup Checks */}
        <div className="bg-black/25 rounded-xl border border-white/[0.05] p-3 flex flex-col gap-2">
          <span className="text-zinc-400 text-[9px] uppercase font-bold tracking-widest">Setup Checklist</span>
          <div className="flex flex-col gap-1.5">
            {signal.setupChecks.map((c, i) => (
              <div key={i} className="flex items-center gap-2 min-w-0">
                {c.passed ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                ) : (
                  <Clock className="w-3.5 h-3.5 text-zinc-600 shrink-0" />
                )}
                <span className={`text-[9.5px] leading-snug truncate ${c.passed ? "text-zinc-200" : "text-zinc-500"}`}>
                  {c.label}
                </span>
              </div>
            ))}
          </div>

          <div className="pt-2 border-t border-white/[0.05]">
            <div className="flex flex-col gap-1.5">
              {signal.confirmationChecks.map((c, i) => (
                <div key={i} className="flex items-center gap-2 min-w-0">
                  <span
                    className={`w-3.5 h-3.5 rounded border flex items-center justify-center text-[8px] font-bold shrink-0 ${
                      c.passed ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-400" : "bg-white/[0.03] border-white/10 text-zinc-600"
                    }`}
                  >
                    {c.passed ? "✓" : "·"}
                  </span>
                  <span className={`text-[9.5px] leading-snug truncate ${c.passed ? "text-zinc-300" : "text-zinc-500"}`}>
                    {c.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Readiness & Invalidation */}
        <div className="bg-black/25 rounded-xl border border-white/[0.05] p-3 flex flex-col gap-2.5">
          <div className="flex items-center justify-between">
            <span className="text-zinc-400 text-[9px] uppercase font-bold tracking-widest">Readiness</span>
            <span className="font-bold text-[10px] text-zinc-200 tabular-nums">
              {overallReadiness}% Confirmed
            </span>
          </div>

          <div className="flex flex-col gap-2">
            <ReadinessBar label="Market" pct={signal.readinessBars.market} color="bg-zinc-300" />
            <ReadinessBar label="Setup" pct={signal.readinessBars.setup} color="bg-zinc-300" />
            <ReadinessBar
              label="Trigger"
              pct={signal.readinessBars.confirmation}
              color="bg-zinc-400"
            />
          </div>

          {/* Top Invalidation */}
          <div className="border-t border-white/[0.05] pt-2">
            <span className="text-zinc-500 text-[8.5px] uppercase font-bold block mb-1">Invalidation Rule</span>
            {signal.invalidationRules.slice(0, 1).map((r, i) => (
              <div key={i} className="flex items-start gap-1.5 text-[9px] text-rose-400">
                <span className="shrink-0 mt-0.5">✕</span>
                <span className="line-clamp-2 text-zinc-300">{r}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Action Bar ── */}
      <div className="flex items-center justify-between gap-2 pt-2.5 border-t border-white/[0.06]">
        <div className="flex items-center gap-1.5">
          <button
            onClick={onOpenSignalLab}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-zinc-300 hover:text-white font-mono text-[9px] transition-all"
          >
            <FlaskConical className="w-3 h-3 text-zinc-400" /> Signal Lab
          </button>
          <button
            onClick={onOpenJournalConvert}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-zinc-400 hover:text-zinc-200 font-mono text-[9px] transition-all"
          >
            <BookOpen className="w-3 h-3 text-zinc-400" /> Journal
          </button>
        </div>

        <button
          onClick={handleExecute}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg font-bold text-[9.5px] tracking-wider uppercase transition-all ${
            executed
              ? "bg-emerald-600 text-white"
              : isReady
              ? "bg-white hover:bg-zinc-200 text-black font-black shadow-md"
              : "bg-white/10 hover:bg-white/15 text-zinc-200 border border-white/15"
          }`}
        >
          <Zap className="w-3 h-3 text-zinc-400" />
          {executed ? "Dispatched ✓" : "1-Click Execute"}
        </button>
      </div>
    </div>
  );
}