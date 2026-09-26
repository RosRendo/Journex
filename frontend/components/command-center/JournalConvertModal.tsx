"use client";

import React, { useState } from "react";
import { X, BookOpen, Camera, Check, Smile, AlertCircle, Save } from "lucide-react";
import { SetupSignalData, StrategyProfile } from "./types";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  symbol: string;
  signal: SetupSignalData;
  strategy: StrategyProfile;
}

export default function JournalConvertModal({
  isOpen,
  onClose,
  symbol,
  signal,
  strategy,
}: Props) {
  const [followedRules, setFollowedRules] = useState<boolean>(true);
  const [emotion, setEmotion] = useState<string>("Calm");
  const [notes, setNotes] = useState<string>("");
  const [captured, setCaptured] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleSaveToJournal = () => {
    setCaptured(true);
    setTimeout(() => {
      alert(`Trade observation for ${symbol} successfully recorded into Rendo Journal!`);
      onClose();
      setCaptured(false);
    }, 800);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="w-full max-w-xl bg-[#0f0f14] border border-white/15 rounded-2xl shadow-2xl overflow-hidden font-mono text-[11px] flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-4 border-b border-white/10 bg-[#14141a] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-white font-bold text-sm">Convert Setup to Journal</h2>
              <p className="text-zinc-500 text-[10px] font-sans">
                Automatically capture setup metrics, chart screenshot, and psychology.
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

        {/* Body */}
        <div className="p-5 space-y-4 overflow-y-auto flex-1">
          
          {/* Trade Snapshot Card */}
          <div className="bg-black/40 p-3 rounded-xl border border-white/5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-white font-bold text-xs">{symbol} {signal.bias}</span>
              <span className="text-amber-400 font-bold">{strategy.name}</span>
            </div>

            <div className="grid grid-cols-3 gap-2 text-[10px] pt-2 border-t border-white/[0.04]">
              <div>
                <span className="text-zinc-500 text-[9px] block">CONFLUENCE</span>
                <span className="text-emerald-400 font-bold">{signal.confidenceScore}/100</span>
              </div>
              <div>
                <span className="text-zinc-500 text-[9px] block">ENTRY LEVEL</span>
                <span className="text-white font-bold">{signal.entryPrice}</span>
              </div>
              <div>
                <span className="text-zinc-500 text-[9px] block">STOP LOSS</span>
                <span className="text-rose-400 font-bold">{signal.slPrice}</span>
              </div>
            </div>
          </div>

          {/* Auto Screenshot Simulation Card */}
          <div className="p-3 rounded-xl bg-white/[0.02] border border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Camera className="w-5 h-5 text-cyan-400" />
              <div>
                <span className="text-white font-bold text-[10.5px] block">Automatic Chart Snapshot</span>
                <span className="text-zinc-500 text-[9.5px]">Canvas coordinates & structural annotations saved</span>
              </div>
            </div>
            <span className="px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-bold text-[9px]">
              AUTO-CAPTURED
            </span>
          </div>

          {/* Psychology & Rule Adherence */}
          <div className="space-y-3">
            <div>
              <label className="text-zinc-400 text-[10px] block mb-1">Did you follow your strategy rules?</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setFollowedRules(true)}
                  className={`py-1.5 rounded-lg font-bold text-[10px] transition-all ${
                    followedRules
                      ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm"
                      : "bg-white/5 text-zinc-500 hover:text-white"
                  }`}
                >
                  YES, 100% STRICT
                </button>
                <button
                  onClick={() => setFollowedRules(false)}
                  className={`py-1.5 rounded-lg font-bold text-[10px] transition-all ${
                    !followedRules
                      ? "bg-rose-500/20 text-rose-300 border border-rose-500/40 shadow-sm"
                      : "bg-white/5 text-zinc-500 hover:text-white"
                  }`}
                >
                  NO, DEVIATED
                </button>
              </div>
            </div>

            <div>
              <label className="text-zinc-400 text-[10px] block mb-1">Trader Emotional State</label>
              <div className="grid grid-cols-4 gap-1.5">
                {["Calm", "Disciplined", "FOMO", "Anxious"].map((emo) => (
                  <button
                    key={emo}
                    onClick={() => setEmotion(emo)}
                    className={`py-1 rounded text-[9.5px] font-semibold transition-all ${
                      emotion === emo
                        ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                        : "bg-white/5 text-zinc-400 hover:text-white"
                    }`}
                  >
                    {emo}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-zinc-400 text-[10px] block mb-1">Observation Notes (Optional)</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Notes on HTF liquidity sweep, Asian session range, news reaction..."
                rows={2}
                className="w-full bg-zinc-900 border border-white/10 rounded-lg p-2 text-[10px] text-white outline-none focus:border-amber-500 font-sans"
              />
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/10 bg-[#14141a] flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg bg-white/5 text-zinc-400 font-bold text-[10px]"
          >
            Cancel
          </button>
          <button
            onClick={handleSaveToJournal}
            className="px-4 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-[10px] flex items-center gap-1.5 shadow-md"
          >
            <Save className="w-3.5 h-3.5" /> Save to Trade Journal
          </button>
        </div>

      </div>
    </div>
  );
}
