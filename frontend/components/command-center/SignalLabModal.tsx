"use client";

import React from "react";
import { X, FlaskConical, CheckCircle2, XCircle, AlertTriangle, Clock, Layers, ArrowUpRight } from "lucide-react";
import { SetupSignalData } from "./types";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  signal: SetupSignalData;
  symbol: string;
}

export default function SignalLabModal({
  isOpen,
  onClose,
  signal,
  symbol,
}: Props) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="w-full max-w-2xl bg-[#0f0f14] border border-white/15 rounded-2xl shadow-2xl overflow-hidden font-mono text-[11px] flex flex-col max-h-[90vh]">
        
        {/* Modal Header */}
        <div className="p-4 border-b border-white/10 bg-[#14141a] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-purple-500/15 border border-purple-500/30 text-purple-400">
              <FlaskConical className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-white font-bold text-sm">Signal Lab & Invalidation Matrix</h2>
                <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  {symbol} {signal.bias} SETUP
                </span>
              </div>
              <p className="text-zinc-500 text-[10px] font-sans">
                Full chronological evidence trail and explicit invalidation criteria.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-5 overflow-y-auto flex-1">
          
          {/* Top Score Banner */}
          <div className="bg-black/40 p-3.5 rounded-xl border border-white/5 flex items-center justify-between">
            <div>
              <span className="text-zinc-500 text-[9.5px] uppercase font-bold block">
                Calculated Confluence
              </span>
              <span className="text-white font-bold text-lg tabular-nums">
                {signal.confidenceScore} <span className="text-zinc-600 text-xs">/ 100</span>
              </span>
            </div>

            <div className="flex items-center gap-3">
              <div className="text-right">
                <span className="text-zinc-500 text-[9.5px] uppercase font-bold block">Status</span>
                <span className="text-emerald-400 font-bold">{signal.readinessState}</span>
              </div>
              <div className="w-10 h-10 rounded-full border-2 border-purple-500/40 bg-purple-500/10 flex items-center justify-center font-bold text-purple-300 text-xs">
                ICT
              </div>
            </div>
          </div>

          {/* Chronological Evidence Log */}
          <div>
            <span className="text-white font-bold text-xs uppercase tracking-wider block mb-2 flex items-center gap-2">
              <Clock className="w-3.5 h-3.5 text-cyan-400" />
              Chronological Evidence Trail
            </span>

            <div className="space-y-1.5 bg-black/20 p-3 rounded-xl border border-white/5">
              {signal.evidenceLog.map((ev, idx) => (
                <div key={idx} className="flex items-start gap-3 py-1 border-b border-white/[0.04] last:border-0">
                  <span className="text-cyan-400 font-bold text-[10px] tabular-nums shrink-0 mt-0.5">
                    {ev.time}
                  </span>
                  <div className="flex-1">
                    <span className="text-zinc-200 text-[10.5px] font-sans block">{ev.event}</span>
                    <span className="text-zinc-500 text-[9px] uppercase font-bold">
                      TAG: {ev.type} &bull; Validated
                    </span>
                  </div>
                  <span className="text-emerald-400 text-xs font-bold shrink-0">✓</span>
                </div>
              ))}
            </div>
          </div>

          {/* Explicit Invalidation Matrix */}
          <div>
            <span className="text-white font-bold text-xs uppercase tracking-wider block mb-2 flex items-center gap-2">
              <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
              Invalidation Rules (When is this thesis dead?)
            </span>

            <div className="space-y-1.5 bg-rose-500/5 p-3 rounded-xl border border-rose-500/20">
              {signal.invalidationRules.map((rule, idx) => (
                <div key={idx} className="flex items-center gap-2 py-1 text-rose-300 text-[10px]">
                  <XCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                  <span className="font-sans">{rule}</span>
                </div>
              ))}
            </div>
          </div>

          {/* SMT & Multi-Timeframe Alignment Preview */}
          <div className="bg-black/30 p-3 rounded-xl border border-white/5">
            <span className="text-zinc-400 text-[9.5px] uppercase font-bold block mb-2">
              SMT Divergence & Macro Correlation
            </span>
            <div className="grid grid-cols-2 gap-2 text-[10px]">
              <div className="p-2 rounded bg-white/5 flex items-center justify-between">
                <span className="text-zinc-400">XAUUSD vs DXY</span>
                <span className="text-emerald-400 font-bold">Inverted (Normal)</span>
              </div>
              <div className="p-2 rounded bg-white/5 flex items-center justify-between">
                <span className="text-zinc-400">SMT Sweep Divergence</span>
                <span className="text-cyan-400 font-bold">M15 SMT Confirmed</span>
              </div>
            </div>
          </div>

        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-white/10 bg-[#14141a] flex items-center justify-between">
          <span className="text-zinc-500 text-[9.5px]">
            Glass-box transparency eliminates emotional guesswork.
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-white font-bold text-[10px]"
          >
            Close Lab
          </button>
        </div>

      </div>
    </div>
  );
}
