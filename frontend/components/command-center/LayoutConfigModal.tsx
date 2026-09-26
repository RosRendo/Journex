"use client";

import React from "react";
import { X, LayoutGrid, Check, CheckSquare, Square, RotateCcw } from "lucide-react";
import { WorkspaceWidgets } from "./types";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  activeWorkspace: "SCALPING" | "SWING" | "NEWS";
  onWorkspaceChange: (ws: "SCALPING" | "SWING" | "NEWS") => void;
  widgets: WorkspaceWidgets;
  onToggleWidget: (key: keyof WorkspaceWidgets) => void;
  onResetWidgets: () => void;
}

export default function LayoutConfigModal({
  isOpen,
  onClose,
  activeWorkspace,
  onWorkspaceChange,
  widgets,
  onToggleWidget,
  onResetWidgets,
}: Props) {
  if (!isOpen) return null;

  const widgetLabels: { key: keyof WorkspaceWidgets; name: string; desc: string }[] = [
    { key: "watchlist", name: "Watchlist Sidebar", desc: "Real-time pair list and setup readiness dots" },
    { key: "chart", name: "Price & ICT Landmark Chart", desc: "Interactive candlestick canvas with FVG, OB, and sweeps" },
    { key: "marketState", name: "Market State Context", desc: "Multi-timeframe trend, session, volatility, and liquidity" },
    { key: "confluence", name: "Confluence Engine", desc: "Weighted strategy factors and 100-point score meter" },
    { key: "setupHero", name: "Setup Detection & Readiness Hero", desc: "Signal bias, confirmation checklist, and target levels" },
    { key: "news", name: "Contextual News Intelligence", desc: "Asset sensitivity matrix and lockout timers" },
    { key: "riskCheck", name: "Pre-Trade Risk Check", desc: "Exact lot sizing and daily circuit breaker guard" },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="w-full max-w-lg bg-[#0f0f14] border border-white/15 rounded-2xl shadow-2xl overflow-hidden font-mono text-[11px] flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-4 border-b border-white/10 bg-[#14141a] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-cyan-500/15 border border-cyan-500/30 text-cyan-400">
              <LayoutGrid className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-white font-bold text-sm">Modular Workspace Configurator</h2>
              <p className="text-zinc-500 text-[10px] font-sans">
                Customize visible widgets and active trading mode layout.
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
          
          {/* Workspace Presets */}
          <div>
            <label className="text-zinc-400 text-[10px] block mb-2 font-bold uppercase tracking-wider">
              Workspace Profile
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(["SCALPING", "SWING", "NEWS"] as const).map((ws) => (
                <button
                  key={ws}
                  onClick={() => onWorkspaceChange(ws)}
                  className={`p-2.5 rounded-xl border text-center transition-all ${
                    activeWorkspace === ws
                      ? "bg-amber-500/20 border-amber-500 text-amber-300 shadow-md font-bold"
                      : "bg-zinc-900 border-white/5 text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  <span className="block text-xs">{ws}</span>
                  <span className="text-[8.5px] text-zinc-500 font-sans block mt-0.5">
                    {ws === "SCALPING" ? "Fast M1/M5 Flow" : ws === "SWING" ? "HTF Structure" : "Economic Focus"}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Visible Widgets Checklist */}
          <div>
            <label className="text-zinc-400 text-[10px] block mb-2 font-bold uppercase tracking-wider">
              Active Dashboard Widgets
            </label>

            <div className="space-y-1.5 bg-black/20 p-2.5 rounded-xl border border-white/5">
              {widgetLabels.map((w) => {
                const isActive = widgets[w.key];
                return (
                  <button
                    key={w.key}
                    onClick={() => onToggleWidget(w.key)}
                    className="w-full flex items-center justify-between p-2 rounded-lg bg-zinc-900/60 hover:bg-zinc-900 border border-white/5 text-left transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      {isActive ? (
                        <CheckSquare className="w-4 h-4 text-emerald-400 shrink-0" />
                      ) : (
                        <Square className="w-4 h-4 text-zinc-600 shrink-0" />
                      )}
                      <div>
                        <span className={`text-[10.5px] font-bold block ${isActive ? "text-white" : "text-zinc-500"}`}>
                          {w.name}
                        </span>
                        <span className="text-[9px] text-zinc-500 font-sans">
                          {w.desc}
                        </span>
                      </div>
                    </div>

                    <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${
                      isActive ? "bg-emerald-500/20 text-emerald-300" : "bg-zinc-800 text-zinc-500"
                    }`}>
                      {isActive ? "ON" : "OFF"}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/10 bg-[#14141a] flex items-center justify-between">
          <button
            onClick={onResetWidgets}
            className="flex items-center gap-1 text-zinc-500 hover:text-zinc-300 text-[10px]"
          >
            <RotateCcw className="w-3 h-3" /> Reset to Default
          </button>

          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-white/15 hover:bg-white/20 text-white font-bold text-[10px]"
          >
            Apply Layout
          </button>
        </div>

      </div>
    </div>
  );
}
