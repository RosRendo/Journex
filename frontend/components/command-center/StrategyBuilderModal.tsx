"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  X,
  SlidersHorizontal,
  CheckCircle2,
  AlertTriangle,
  Plus,
  Trash2,
  Sparkles,
  Layers,
  Clock,
  Target,
  Shield,
  RotateCcw,
} from "lucide-react";
import { toast } from "sonner";
import { StrategyProfile, ConfluenceCondition } from "./types";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  strategy?: StrategyProfile;
  onSaveStrategy?: (updated: StrategyProfile) => void;
}

const PRESETS: StrategyProfile[] = [
  {
    id: "silver-bullet",
    name: "ICT Silver Bullet Model",
    icon: "🎯",
    description: "High-probability M15 fair value gap retest following a liquidity pool purge during London or NY AM killzone.",
    minScore: 75,
    minRR: 2.5,
    targetMarkets: ["XAUUSD", "EURUSD", "GBPUSD", "NAS100", "US30"],
    activeSessions: ["London", "New York AM"],
    conditions: [
      { id: "sb-1", name: "Higher Timeframe Bias (H4/D1 Trend Concordance)", weight: 25, verified: true, required: true },
      { id: "sb-2", name: "Liquidity Sweep (Buyside / Sellside Liquidity Cleaned)", weight: 25, verified: true, required: true },
      { id: "sb-3", name: "Fair Value Gap (FVG) Displacement & Retest", weight: 20, verified: true, required: true },
      { id: "sb-4", name: "Institutional SMT Divergence (Correlation Asset)", weight: 15, verified: false, required: false },
      { id: "sb-5", name: "Killzone Session Window (02:00-05:00 or 08:30-11:00 EST)", weight: 10, verified: true, required: true },
      { id: "sb-6", name: "News Embargo Clear (No High-Impact Catalyst within 30m)", weight: 5, verified: true, required: false },
    ],
  },
  {
    id: "macro-swing",
    name: "Macro Trend Expansion",
    icon: "📈",
    description: "Multi-day trend-following structure driven by real carry divergence and daily market regime alignment.",
    minScore: 70,
    minRR: 3.0,
    targetMarkets: ["EURUSD", "USDJPY", "AUDUSD", "US500", "USOIL"],
    activeSessions: ["London", "New York AM", "New York PM"],
    conditions: [
      { id: "ms-1", name: "Central Bank Monetary Policy / Yield Spread Alignment", weight: 30, verified: true, required: true },
      { id: "ms-2", name: "D1/W1 Market Structure Break & Order Flow Expansion", weight: 25, verified: true, required: true },
      { id: "ms-3", name: "Cross-Asset Volatility Regime Compression (Subdued IV)", weight: 15, verified: false, required: false },
      { id: "ms-4", name: "Statistical Flow Momentum (Multi-Week Flow Consensus)", weight: 15, verified: true, required: false },
      { id: "ms-5", name: "High-Impact Economic Release Clearance (> 24h Window)", weight: 15, verified: true, required: false },
    ],
  },
  {
    id: "smt-reversal",
    name: "Institutional SMT Reversal",
    icon: "⚡",
    description: "Contrarian liquidity reversal identified by non-conforming highs/lows against correlated benchmark assets.",
    minScore: 80,
    minRR: 2.0,
    targetMarkets: ["XAUUSD", "EURUSD", "GBPUSD", "NAS100"],
    activeSessions: ["London", "New York AM"],
    conditions: [
      { id: "smt-1", name: "Confirmed SMT Divergence (Key High/Low Desynchronization)", weight: 35, verified: true, required: true },
      { id: "smt-2", name: "Turtle Soup Liquidity Sweep (Failed High/Low Auction)", weight: 25, verified: true, required: true },
      { id: "smt-3", name: "Market Structure Shift (MSS) with Energy Displacement", weight: 20, verified: true, required: true },
      { id: "smt-4", name: "Discount/Premium Array Pricing Alignment", weight: 10, verified: true, required: false },
      { id: "smt-5", name: "Immediate Trailing Invalidation Structure (< 15 pips)", weight: 10, verified: false, required: false },
    ],
  },
];

const AVAILABLE_SESSIONS = [
  { id: "Asian", label: "Asian Range (19:00 - 00:00 EST)" },
  { id: "London", label: "London Killzone (02:00 - 05:00 EST)" },
  { id: "New York AM", label: "New York AM (08:30 - 11:00 EST)" },
  { id: "New York PM", label: "New York PM (13:30 - 16:00 EST)" },
];

export default function StrategyBuilderModal({
  isOpen,
  onClose,
  strategy,
  onSaveStrategy,
}: Props) {
  const [activePresetId, setActivePresetId] = useState<string>(strategy?.id || "silver-bullet");
  const [name, setName] = useState<string>(strategy?.name || PRESETS[0].name);
  const [description, setDescription] = useState<string>(strategy?.description || PRESETS[0].description);
  const [minScore, setMinScore] = useState<number>(strategy?.minScore || 70);
  const [minRR, setMinRR] = useState<number>(strategy?.minRR || 2.0);
  const [sessions, setSessions] = useState<string[]>(strategy?.activeSessions || ["London", "New York AM"]);
  const [conditions, setConditions] = useState<ConfluenceCondition[]>(
    strategy?.conditions && strategy.conditions.length > 0
      ? strategy.conditions
      : PRESETS[0].conditions
  );

  // Sync state whenever opened with a new incoming strategy
  useEffect(() => {
    if (strategy) {
      setName(strategy.name);
      setDescription(strategy.description);
      setMinScore(strategy.minScore);
      setMinRR(strategy.minRR);
      setSessions(strategy.activeSessions || ["London", "New York AM"]);
      setConditions(strategy.conditions);
      setActivePresetId(strategy.id);
    }
  }, [strategy, isOpen]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Load a preset
  const handleLoadPreset = (presetId: string) => {
    const p = PRESETS.find((x) => x.id === presetId);
    if (!p) return;
    setActivePresetId(p.id);
    setName(p.name);
    setDescription(p.description);
    setMinScore(p.minScore);
    setMinRR(p.minRR);
    setSessions([...p.activeSessions]);
    setConditions(p.conditions.map((c) => ({ ...c })));
    toast.info(`Loaded "${p.name}" preset`);
  };

  // Weight total
  const totalWeight = useMemo(() => {
    return conditions.reduce((acc, c) => acc + (Number(c.weight) || 0), 0);
  }, [conditions]);

  const toggleSession = (sessId: string) => {
    if (sessions.includes(sessId)) {
      if (sessions.length === 1) {
        toast.warning("At least one trading session must remain active");
        return;
      }
      setSessions(sessions.filter((s) => s !== sessId));
    } else {
      setSessions([...sessions, sessId]);
    }
  };

  const handleUpdateCondition = (index: number, updates: Partial<ConfluenceCondition>) => {
    setConditions((prev) =>
      prev.map((c, i) => (i === index ? { ...c, ...updates } : c))
    );
  };

  const handleRemoveCondition = (index: number) => {
    if (conditions.length <= 1) {
      toast.warning("A strategy requires at least one confluence condition");
      return;
    }
    setConditions((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAddCondition = () => {
    const newId = `c-${Date.now()}`;
    setConditions((prev) => [
      ...prev,
      {
        id: newId,
        name: "New Confluence Factor",
        weight: 10,
        verified: false,
        required: false,
      },
    ]);
  };

  const handleSave = () => {
    if (!name.trim()) {
      toast.error("Please enter a valid strategy name");
      return;
    }

    const updatedStrategy: StrategyProfile = {
      id: activePresetId || `strat-${Date.now()}`,
      name: name.trim(),
      icon: "🎯",
      description: description.trim(),
      minScore,
      minRR,
      targetMarkets: strategy?.targetMarkets || ["XAUUSD", "EURUSD"],
      activeSessions: sessions,
      conditions,
    };

    if (onSaveStrategy) {
      onSaveStrategy(updatedStrategy);
    }

    toast.success(`Confluence Model "${updatedStrategy.name}" Saved & Activated!`);
    onClose();
  };

  if (!isOpen) return null;

  const scoreGrade =
    minScore >= 85
      ? { label: "A+ Institutional Grade", color: "text-[#20e0b2] bg-[#20e0b2]/10 border-[#20e0b2]/30" }
      : minScore >= 75
      ? { label: "A High Probability", color: "text-[#38bdf8] bg-[#38bdf8]/10 border-[#38bdf8]/30" }
      : minScore >= 65
      ? { label: "B Standard Setup", color: "text-[#f5c451] bg-[#f5c451]/10 border-[#f5c451]/30" }
      : { label: "C Low Confidence", color: "text-[#ff5c73] bg-[#ff5c73]/10 border-[#ff5c73]/30" };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-[#0c0c11] border border-white/10 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden font-mono"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── HEADER ── */}
        <div className="px-5 py-3.5 border-b border-white/[0.08] bg-[#111117] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#20e0b2]/10 border border-[#20e0b2]/30 flex items-center justify-center text-[#20e0b2]">
              <SlidersHorizontal className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white tracking-wide">
                  Confluence Model Architect
                </h3>
                <span className="text-[8px] font-bold px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-zinc-400 uppercase">
                  Engine v2.4
                </span>
              </div>
              <p className="text-[10px] text-zinc-500 font-sans">
                Fine-tune quantitative parameters, condition thresholds, and scoring weights
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

        {/* ── PRESETS BAR ── */}
        <div className="px-5 py-2.5 bg-black/40 border-b border-white/[0.06] flex items-center gap-2 overflow-x-auto shrink-0">
          <span className="text-[9px] uppercase font-bold text-zinc-500 shrink-0">
            Presets:
          </span>
          {PRESETS.map((p) => {
            const isSelected = activePresetId === p.id;
            return (
              <button
                key={p.id}
                onClick={() => handleLoadPreset(p.id)}
                className={`text-[9.5px] font-bold px-2.5 py-1 rounded-md transition-all flex items-center gap-1.5 shrink-0 ${
                  isSelected
                    ? "bg-[#20e0b2]/15 text-[#20e0b2] border border-[#20e0b2]/30 shadow-sm"
                    : "bg-white/[0.03] text-zinc-400 hover:text-white hover:bg-white/[0.07] border border-white/5"
                }`}
              >
                <span>{p.icon}</span>
                <span>{p.name}</span>
              </button>
            );
          })}
        </div>

        {/* ── SCROLLABLE BODY ── */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5 text-xs">
          {/* 1. Name & Description */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2 space-y-1">
              <label className="text-[9px] uppercase font-bold text-zinc-400 tracking-wider">
                Strategy Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-white text-xs outline-none focus:border-[#20e0b2]/50 transition-colors"
                placeholder="e.g. ICT Silver Bullet"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[9px] uppercase font-bold text-zinc-400 tracking-wider">
                Minimum R:R Target
              </label>
              <select
                value={minRR}
                onChange={(e) => setMinRR(parseFloat(e.target.value))}
                className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-white text-xs outline-none focus:border-[#20e0b2]/50 transition-colors"
              >
                <option value={1.5}>1.5 : 1 (Conservative)</option>
                <option value={2.0}>2.0 : 1 (Standard)</option>
                <option value={2.5}>2.5 : 1 (High Quality)</option>
                <option value={3.0}>3.0 : 1 (Swing)</option>
                <option value={4.0}>4.0 : 1 (Sniper Extension)</option>
              </select>
            </div>
            <div className="sm:col-span-3 space-y-1">
              <label className="text-[9px] uppercase font-bold text-zinc-400 tracking-wider">
                Model Thesis & Description
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-zinc-300 text-xs outline-none focus:border-[#20e0b2]/50 transition-colors"
                placeholder="Core thesis, HTF invalidation, and execution mechanics..."
              />
            </div>
          </div>

          {/* 2. Passing Score Threshold Slider */}
          <div className="p-3.5 rounded-xl bg-black/30 border border-white/[0.06] space-y-2.5">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[9px] uppercase font-bold text-zinc-400 tracking-wider block">
                  Minimum Confluence Passing Gate
                </span>
                <p className="text-[10px] text-zinc-500 font-sans">
                  Signals scoring below this threshold are blocked from execution
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-[8.5px] font-bold px-2 py-0.5 rounded border ${scoreGrade.color}`}>
                  {scoreGrade.label}
                </span>
                <span className="text-base font-bold text-white tabular-nums">
                  {minScore} <span className="text-zinc-600 text-xs">/ 100</span>
                </span>
              </div>
            </div>
            <input
              type="range"
              min={50}
              max={95}
              step={1}
              value={minScore}
              onChange={(e) => setMinScore(parseInt(e.target.value))}
              className="w-full accent-[#20e0b2] cursor-pointer"
            />
          </div>

          {/* 3. Active Session Gate */}
          <div className="space-y-1.5">
            <label className="text-[9px] uppercase font-bold text-zinc-400 tracking-wider flex items-center gap-1.5">
              <Clock className="w-3 h-3 text-[#38bdf8]" />
              Authorized Trading Killzones
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {AVAILABLE_SESSIONS.map((sess) => {
                const isActive = sessions.includes(sess.id);
                return (
                  <button
                    key={sess.id}
                    onClick={() => toggleSession(sess.id)}
                    className={`flex items-center justify-between p-2 rounded-lg border text-left transition-all ${
                      isActive
                        ? "bg-[#38bdf8]/10 border-[#38bdf8]/30 text-white"
                        : "bg-white/[0.02] border-white/5 text-zinc-500 hover:text-zinc-300"
                    }`}
                  >
                    <span className="text-xs font-medium">{sess.label}</span>
                    <span
                      className={`text-[8px] font-bold px-1.5 py-0.5 rounded ${
                        isActive
                          ? "bg-[#38bdf8]/20 text-[#38bdf8]"
                          : "bg-white/5 text-zinc-600"
                      }`}
                    >
                      {isActive ? "ACTIVE" : "MUTED"}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 4. Confluence Factors & Weight Allocation */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-[9px] uppercase font-bold text-zinc-400 tracking-wider flex items-center gap-1.5">
                <Target className="w-3 h-3 text-[#20e0b2]" />
                Confluence Weight Allocation Matrix
              </label>
              <div className="flex items-center gap-2">
                <span
                  className={`text-[9px] font-bold px-2 py-0.5 rounded border tabular-nums ${
                    totalWeight === 100
                      ? "text-[#20e0b2] bg-[#20e0b2]/10 border-[#20e0b2]/30"
                      : "text-amber-400 bg-amber-400/10 border-amber-400/30"
                  }`}
                >
                  Total Weight: {totalWeight} / 100 pts
                </span>
                <button
                  onClick={handleAddCondition}
                  className="flex items-center gap-1 px-2 py-0.5 rounded bg-white/5 hover:bg-white/10 text-zinc-300 text-[9px] font-bold border border-white/10"
                >
                  <Plus className="w-2.5 h-2.5" />
                  Add Factor
                </button>
              </div>
            </div>

            <div className="space-y-2">
              {conditions.map((cond, idx) => (
                <div
                  key={cond.id || idx}
                  className="p-3 rounded-xl bg-black/40 border border-white/[0.06] space-y-2 hover:border-white/15 transition-all"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-[#20e0b2] w-5">
                      #{idx + 1}
                    </span>
                    <input
                      type="text"
                      value={cond.name}
                      onChange={(e) => handleUpdateCondition(idx, { name: e.target.value })}
                      className="flex-1 bg-transparent text-white text-xs outline-none border-b border-transparent focus:border-[#20e0b2]/40 pb-0.5"
                    />
                    <button
                      onClick={() => handleRemoveCondition(idx)}
                      className="text-zinc-600 hover:text-[#ff5c73] transition-colors p-1"
                      title="Delete Condition"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-white/[0.04]">
                    <div className="flex items-center gap-3">
                      {/* Required Toggle */}
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={cond.required}
                          onChange={(e) => handleUpdateCondition(idx, { required: e.target.checked })}
                          className="accent-[#20e0b2] cursor-pointer"
                        />
                        <span
                          className={`text-[9px] font-bold ${
                            cond.required ? "text-[#f5c451]" : "text-zinc-500"
                          }`}
                        >
                          {cond.required ? "MANDATORY GATE" : "OPTIONAL BONUS"}
                        </span>
                      </label>
                    </div>

                    {/* Weight Slider */}
                    <div className="flex items-center gap-2 w-48">
                      <span className="text-[9px] text-zinc-500">Weight:</span>
                      <input
                        type="range"
                        min={0}
                        max={50}
                        step={5}
                        value={cond.weight}
                        onChange={(e) =>
                          handleUpdateCondition(idx, { weight: parseInt(e.target.value) || 0 })
                        }
                        className="flex-1 accent-[#20e0b2] cursor-pointer"
                      />
                      <span className="text-xs font-bold text-white tabular-nums w-8 text-right">
                        {cond.weight}p
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── FOOTER ACTIONS ── */}
        <div className="px-5 py-3.5 border-t border-white/[0.08] bg-[#111117] flex items-center justify-between shrink-0">
          <button
            onClick={() => handleLoadPreset(activePresetId)}
            className="flex items-center gap-1.5 text-zinc-400 hover:text-white text-[10px] font-bold transition-colors"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset Weights</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-300 text-xs font-bold transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-1.5 rounded-lg bg-[#20e0b2] hover:bg-[#1bc9a0] text-[#09090b] text-xs font-black uppercase tracking-wider transition-all shadow-[0_0_15px_rgba(32,224,178,0.25)] flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Save &amp; Apply Model</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
