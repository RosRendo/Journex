"use client";

import React, { useState } from "react";
import { Zap, FlaskConical, BookOpen, ShieldAlert, ArrowUp, ArrowDown, Target, CheckCircle2, Clock } from "lucide-react";
import { SetupSignalData } from "./types";

interface Props {
  signal: SetupSignalData;
  onOpenSignalLab: () => void;
  onOpenJournalConvert: () => void;
  onExecuteTrade: () => void;
}

function PriceLevel({ label, value, color, bg, border }: {
  label: string; value: number; color: string; bg: string; border: string;
}) {
  const fmt = value > 100 ? value.toFixed(2) : value.toFixed(5);
  return (
    <div className={`flex flex-col items-center justify-center py-2.5 px-3 rounded-xl border ${bg} ${border}`}>
      <span className={`text-[8.5px] font-bold uppercase tracking-widest mb-1 ${color} opacity-70`}>{label}</span>
      <span className={`font-bold text-[13px] tabular-nums font-mono ${color}`}>{fmt}</span>
    </div>
  );
}

function ReadinessBar({ label, pct, color }: { label: string; pct: number; color: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-zinc-500 text-[9px] w-24 shrink-0">{label}</span>
      <div className="flex-1 h-1.5 bg-zinc-900 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-700 ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className={`text-[9px] font-bold w-7 text-right ${color.includes("emerald") ? "text-emerald-400" : "text-amber-400"}`}>{pct}%</span>
    </div>
  );
}

export default function SetupAndConfirmationHero({ signal, onOpenSignalLab, onOpenJournalConvert, onExecuteTrade }: Props) {
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
    <div className="bg-[#0b0b0f] border border-white/[0.07] rounded-xl p-4 shadow-lg font-mono text-[11px]">

      {/* ── Header Row ── */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${isBull ? "bg-emerald-500/15 border border-emerald-500/30" : "bg-rose-500/15 border border-rose-500/30"}`}>
            {isBull ? <ArrowUp className="w-4 h-4 text-emerald-400" /> : <ArrowDown className="w-4 h-4 text-rose-400" />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className={`font-bold text-[13px] ${isBull ? "text-emerald-400" : "text-rose-400"}`}>{signal.bias}</span>
              <span className="text-zinc-300 font-bold text-[11px] uppercase tracking-wider">{signal.headline.replace(/LONG|SHORT|SETUP DETECTED/gi, "").trim()}</span>
            </div>
            <div className="text-zinc-600 text-[9px] mt-0.5">ICT · Smart Money Concept · {signal.rrRatio} R:R</div>
          </div>
        </div>

        {/* Confidence Badge */}
        <div className="flex items-center gap-2">
          <div className={`text-center px-3 py-1.5 rounded-xl border ${signal.confidenceScore >= 70 ? "bg-emerald-500/10 border-emerald-500/25" : "bg-amber-500/10 border-amber-500/25"}`}>
            <div className={`font-bold text-[16px] tabular-nums ${signal.confidenceScore >= 70 ? "text-emerald-400" : "text-amber-400"}`}>{signal.confidenceScore}</div>
            <div className="text-zinc-600 text-[8px]">SCORE</div>
          </div>
        </div>
      </div>

      {/* ── Main 3-Column Grid ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">

        {/* Col 1: Setup Checks */}
        <div className="bg-black/25 rounded-xl border border-white/[0.05] p-3 flex flex-col gap-2">
          <span className="text-zinc-400 text-[9px] uppercase font-bold tracking-widest">Setup Checklist</span>
          <div className="flex flex-col gap-1.5">
            {signal.setupChecks.map((c, i) => (
              <div key={i} className="flex items-center gap-2">
                {c.passed
                  ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  : <Clock className="w-3.5 h-3.5 text-zinc-600 shrink-0" />}
                <span className={`text-[9.5px] leading-snug line-clamp-1 ${c.passed ? "text-zinc-200" : "text-zinc-600"}`}>{c.label}</span>
              </div>
            ))}
          </div>
          <div className="mt-auto pt-2 border-t border-white/[0.05]">
            <div className="flex flex-col gap-1.5">
              {signal.confirmationChecks.map((c, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className={`w-3.5 h-3.5 rounded border flex items-center justify-center text-[8px] font-bold shrink-0 ${c.passed ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-400" : "bg-white/[0.03] border-white/10 text-zinc-600"}`}>
                    {c.passed ? "✓" : "·"}
                  </span>
                  <span className={`text-[9.5px] leading-snug line-clamp-1 ${c.passed ? "text-zinc-300" : "text-zinc-600"}`}>{c.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Col 2: Price Levels */}
        <div className="bg-black/25 rounded-xl border border-white/[0.05] p-3 flex flex-col gap-2">
          <span className="text-zinc-400 text-[9px] uppercase font-bold tracking-widest">Levels</span>
          <div className="grid grid-cols-2 gap-2 flex-1">
            <PriceLevel label="Entry" value={signal.entryPrice} color="text-white" bg="bg-white/[0.04]" border="border-white/[0.08]" />
            <PriceLevel label="Stop Loss" value={signal.slPrice} color="text-rose-400" bg="bg-rose-500/[0.05]" border="border-rose-500/20" />
            <PriceLevel label="TP 1" value={signal.tp1Price} color="text-emerald-400" bg="bg-emerald-500/[0.05]" border="border-emerald-500/20" />
            <PriceLevel label="TP 2" value={signal.tp2Price} color="text-emerald-300" bg="bg-emerald-500/[0.08]" border="border-emerald-500/25" />
          </div>
          <div className="flex items-center justify-between pt-2 border-t border-white/[0.05]">
            <span className="text-zinc-500 text-[9px]">Risk : Reward</span>
            <span className="text-emerald-400 font-bold text-[11px]">{signal.rrRatio}</span>
          </div>
        </div>

        {/* Col 3: Readiness + Invalidation */}
        <div className="bg-black/25 rounded-xl border border-white/[0.05] p-3 flex flex-col gap-3">
          <span className="text-zinc-400 text-[9px] uppercase font-bold tracking-widest">Readiness</span>
          <div className="flex flex-col gap-2.5">
            <ReadinessBar label="Market" pct={signal.readinessBars.market} color="bg-emerald-500" />
            <ReadinessBar label="Setup" pct={signal.readinessBars.setup} color="bg-emerald-500" />
            <ReadinessBar
              label="Trigger"
              pct={signal.readinessBars.confirmation}
              color={signal.readinessBars.confirmation >= 80 ? "bg-emerald-500" : "bg-amber-500"}
            />
          </div>
          {/* Overall ring */}
          <div className={`flex items-center justify-between px-2.5 py-2 rounded-xl border mt-auto ${overallReadiness >= 75 ? "bg-emerald-500/10 border-emerald-500/25" : "bg-amber-500/10 border-amber-500/25"}`}>
            <span className="text-zinc-400 text-[9px]">Overall</span>
            <span className={`font-bold text-[12px] ${overallReadiness >= 75 ? "text-emerald-400" : "text-amber-400"}`}>{overallReadiness}%</span>
          </div>

          {/* Top invalidation */}
          <div className="border-t border-white/[0.05] pt-2">
            <span className="text-zinc-600 text-[8.5px] uppercase font-bold block mb-1.5">Invalidation</span>
            {signal.invalidationRules.slice(0, 2).map((r, i) => (
              <div key={i} className="flex items-start gap-1.5 text-[9px] text-rose-400 mb-1">
                <span className="shrink-0 mt-0.5">✕</span>
                <span className="line-clamp-1 text-rose-300/70">{r}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Action Bar ── */}
      <div className="flex items-center justify-between gap-2 pt-3 border-t border-white/[0.06]">
        <div className="flex items-center gap-2">
          <button
            onClick={onOpenSignalLab}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/25 text-purple-300 font-bold text-[9.5px] transition-all"
          >
            <FlaskConical className="w-3 h-3" /> Signal Lab
          </button>
          <button
            onClick={onOpenJournalConvert}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-zinc-400 hover:text-zinc-200 font-bold text-[9.5px] transition-all"
          >
            <BookOpen className="w-3 h-3" /> Journal
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => alert("Setup rejected.")}
            className="px-3 py-1.5 rounded-lg bg-white/[0.03] hover:bg-rose-500/10 border border-white/[0.07] text-zinc-500 hover:text-rose-400 font-bold text-[9.5px] transition-all"
          >
            Reject
          </button>
          <button
            onClick={handleExecute}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg font-bold text-[9.5px] tracking-wider uppercase transition-all ${
              executed
                ? "bg-emerald-600 text-white"
                : isReady
                ? "bg-emerald-500 hover:bg-emerald-400 text-black shadow-[0_0_18px_rgba(16,185,129,0.35)]"
                : "bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30"
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            {executed ? "Dispatched ✓" : isReady ? "1-Click Execute" : "Awaiting Trigger"}
          </button>
        </div>
      </div>
    </div>
  );
}