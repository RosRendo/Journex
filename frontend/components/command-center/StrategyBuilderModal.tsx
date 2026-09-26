"use client";

import React, { useState } from "react";
import { X, SlidersHorizontal, Plus, Trash2, Check, Save, RotateCcw, Sparkles } from "lucide-react";
import { StrategyProfile, ConfluenceCondition } from "./types";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  strategy: StrategyProfile;
  onSaveStrategy: (updated: StrategyProfile) => void;
}

export default function StrategyBuilderModal({
  isOpen,
  onClose,
  strategy,
  onSaveStrategy,
}: Props) {
  const [name, setName] = useState(strategy.name);
  const [minScore, setMinScore] = useState(strategy.minScore);
  const [minRR, setMinRR] = useState(strategy.minRR);
  const [conditions, setConditions] = useState<ConfluenceCondition[]>(strategy.conditions);
  const [newConditionName, setNewConditionName] = useState("");
  const [newConditionWeight, setNewConditionWeight] = useState(10);

  if (!isOpen) return null;

  const totalWeight = conditions.reduce((acc, c) => acc + c.weight, 0);

  const handleUpdateWeight = (id: string, weight: number) => {
    setConditions(conditions.map((c) => (c.id === id ? { ...c, weight: Math.max(1, weight) } : c)));
  };

  const handleToggleRequired = (id: string) => {
    setConditions(conditions.map((c) => (c.id === id ? { ...c, required: !c.required } : c)));
  };

  const handleRemoveCondition = (id: string) => {
    setConditions(conditions.filter((c) => c.id !== id));
  };

  const handleAddCondition = () => {
    if (!newConditionName.trim()) return;
    const newCond: ConfluenceCondition = {
      id: `cond_${Date.now()}`,
      name: newConditionName.trim(),
      weight: newConditionWeight,
      verified: true,
      required: false,
    };
    setConditions([...conditions, newCond]);
    setNewConditionName("");
    setNewConditionWeight(10);
  };

  const handleSave = () => {
    onSaveStrategy({
      ...strategy,
      name,
      minScore,
      minRR,
      conditions,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="w-full max-w-2xl bg-[#0f0f14] border border-white/15 rounded-2xl shadow-2xl overflow-hidden font-mono text-[11px] flex flex-col max-h-[90vh]">
        
        {/* Modal Header */}
        <div className="p-4 border-b border-white/10 bg-[#14141a] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-400">
              <SlidersHorizontal className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-white font-bold text-sm">Strategy & Confluence Builder</h2>
              <p className="text-zinc-500 text-[10px] font-sans">
                Visually configure your quantitative model without hardcoded assumptions.
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
          
          {/* Strategy Meta: Name, Min Score, Min RR */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-black/40 p-3.5 rounded-xl border border-white/5">
            <div>
              <label className="text-zinc-400 text-[10px] block mb-1">Strategy Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-zinc-900 border border-white/15 rounded px-2.5 py-1.5 text-white font-bold outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <div className="flex justify-between text-[10px] mb-1">
                <span className="text-zinc-400">Minimum Confluence</span>
                <span className="text-amber-400 font-bold">{minScore}%</span>
              </div>
              <input
                type="range"
                min="50"
                max="95"
                step="5"
                value={minScore}
                onChange={(e) => setMinScore(Number(e.target.value))}
                className="w-full accent-amber-500 cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-[10px] mb-1">
                <span className="text-zinc-400">Minimum Risk:Reward</span>
                <span className="text-emerald-400 font-bold">1 : {minRR}</span>
              </div>
              <input
                type="range"
                min="1.5"
                max="5.0"
                step="0.5"
                value={minRR}
                onChange={(e) => setMinRR(Number(e.target.value))}
                className="w-full accent-emerald-500 cursor-pointer"
              />
            </div>
          </div>

          {/* Condition Weight Allocation */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-white font-bold text-xs uppercase tracking-wider">
                Confluence Weight Matrix
              </span>
              <span className={`font-bold text-[10px] ${
                totalWeight === 100 ? "text-emerald-400" : "text-amber-400"
              }`}>
                Total Weight: {totalWeight}% {totalWeight !== 100 && "(Adjust to 100%)"}
              </span>
            </div>

            <div className="space-y-2 bg-black/20 p-2.5 rounded-xl border border-white/5 max-h-[220px] overflow-y-auto">
              {conditions.map((cond) => (
                <div
                  key={cond.id}
                  className="flex items-center justify-between p-2 rounded-lg bg-zinc-900/80 border border-white/5 text-[10px]"
                >
                  <div className="flex items-center gap-2 flex-1">
                    <button
                      onClick={() => handleToggleRequired(cond.id)}
                      className={`px-1.5 py-0.5 rounded text-[8.5px] font-bold uppercase transition-colors ${
                        cond.required
                          ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                          : "bg-white/5 text-zinc-500 hover:text-zinc-300"
                      }`}
                      title="Toggle Required vs Optional condition"
                    >
                      {cond.required ? "Required" : "Optional"}
                    </button>
                    <span className="text-zinc-200 font-bold">{cond.name}</span>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5">
                      <input
                        type="number"
                        min="1"
                        max="50"
                        value={cond.weight}
                        onChange={(e) => handleUpdateWeight(cond.id, Number(e.target.value))}
                        className="w-12 bg-black border border-white/20 rounded px-1.5 py-0.5 text-center text-amber-300 font-bold tabular-nums"
                      />
                      <span className="text-zinc-500 text-[9px]">pts</span>
                    </div>

                    <button
                      onClick={() => handleRemoveCondition(cond.id)}
                      className="text-zinc-600 hover:text-rose-400 transition-colors p-1"
                      title="Remove condition"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Add Custom Condition Form */}
          <div className="p-3 rounded-xl bg-white/[0.02] border border-dashed border-white/15">
            <span className="text-zinc-400 text-[10px] block mb-2 font-bold">
              + Add Custom Condition Node
            </span>
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="e.g. SMT Divergence, Asian Range High"
                value={newConditionName}
                onChange={(e) => setNewConditionName(e.target.value)}
                className="flex-1 bg-zinc-900 border border-white/10 rounded px-2.5 py-1.5 text-[10px] text-white outline-none"
              />
              <input
                type="number"
                min="5"
                max="30"
                value={newConditionWeight}
                onChange={(e) => setNewConditionWeight(Number(e.target.value))}
                className="w-16 bg-zinc-900 border border-white/10 rounded px-2 py-1.5 text-[10px] text-amber-300 font-bold text-center"
              />
              <button
                onClick={handleAddCondition}
                className="px-3 py-1.5 rounded bg-amber-500 hover:bg-amber-400 text-black font-bold text-[10px] flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> Add
              </button>
            </div>
          </div>

        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-white/10 bg-[#14141a] flex items-center justify-between">
          <button
            onClick={() => {
              setConditions(strategy.conditions);
              setMinScore(strategy.minScore);
            }}
            className="flex items-center gap-1 text-zinc-500 hover:text-zinc-300 text-[10px]"
          >
            <RotateCcw className="w-3 h-3" /> Reset Defaults
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-300 font-bold text-[10px]"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-bold text-[10px] flex items-center gap-1.5 shadow-md"
            >
              <Save className="w-3.5 h-3.5" /> Save Strategy Profile
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
