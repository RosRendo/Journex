"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Search, X, Star, Compass, Check, ArrowRight,
  Terminal, BarChart3, Globe, BookOpen, ShieldAlert,
  Radio, LayoutDashboard, List, Lock, Workflow
} from "lucide-react";
import {
  NAV_PILLARS, NavItem, NavPillar, PRIMARY_CORE_IDS, TRADE_LIFECYCLE_STEPS, DEFAULT_QUICK_ACCESS_IDS, visiblePillars
} from "@/components/layout/navigation";
import { useIsAdmin } from "@/lib/role";
import { useFavorites } from "@/hooks/useFavorites";

interface EcosystemMapModalProps {
  open: boolean;
  onClose: () => void;
}

export default function EcosystemMapModal({ open, onClose }: EcosystemMapModalProps) {
  const router = useRouter();
  const { favorites, toggleFavorite, isFavorite } = useFavorites();
  const isAdmin = useIsAdmin();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPillar, setSelectedPillar] = useState<string>("all");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setSearchQuery("");
      setSelectedPillar("all");
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  // Handle ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && open) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  // Filter items
  const filteredPillars = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return visiblePillars(NAV_PILLARS, isAdmin).map((pillar) => {
      if (selectedPillar !== "all" && pillar.id !== selectedPillar) {
        return { ...pillar, items: [] };
      }

      const items = pillar.items.filter((item) => {
        if (!query) return true;
        return (
          item.label.toLowerCase().includes(query) ||
          item.role.toLowerCase().includes(query) ||
          item.description.toLowerCase().includes(query) ||
          item.badge?.toLowerCase().includes(query) ||
          item.href.toLowerCase().includes(query)
        );
      });

      return { ...pillar, items };
    }).filter((pillar) => pillar.items.length > 0);
  }, [searchQuery, selectedPillar, isAdmin]);

  const handleNavigate = (href: string) => {
    router.push(href);
    onClose();
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/85 backdrop-blur-md" />

      {/* Modal Window */}
      <div
        className="relative w-full max-w-6xl max-h-[92vh] flex flex-col rounded-2xl border border-white/10 shadow-[0_25px_70px_rgba(0,0,0,0.95)] overflow-hidden animate-in zoom-in-95 duration-200"
        style={{ background: "#0c0e14" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header */}
        <div className="px-6 py-5 border-b border-white/[0.08] bg-white/[0.02] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center flex-shrink-0 text-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.2)]">
              <Compass className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white tracking-tight">AdaptiveICT Ecosystem Blueprint</h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-white/10 text-zinc-300 border border-white/10">
                  Trade Lifecycle & Roles
                </span>
              </div>
              <p className="text-xs text-zinc-400">
                Every screen has an operational role. Click any card to jump, or star tools into your daily Quick Access.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-white/10 border border-transparent hover:border-white/10 transition-colors"
              title="Close (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Trade Lifecycle Pipeline Banner */}
        <div className="px-6 py-3 border-b border-white/[0.06] bg-black/40 overflow-x-auto scrollbar-none">
          <div className="flex items-center gap-1.5 min-w-[750px]">
            <div className="flex items-center gap-1 text-[11px] font-bold text-zinc-400 uppercase tracking-wider mr-2 flex-shrink-0">
              <Workflow className="w-3.5 h-3.5 text-blue-400" />
              <span>Lifecycle:</span>
            </div>
            {TRADE_LIFECYCLE_STEPS.map((step, idx) => {
              const StepIcon = step.icon;
              return (
                <React.Fragment key={step.id}>
                  <button
                    onClick={() => handleNavigate(step.href)}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-white/5 hover:border-white/20 bg-zinc-900/80 hover:bg-zinc-800 transition-all group flex-shrink-0"
                  >
                    <span className="text-[10px] font-mono font-bold text-zinc-500 group-hover:text-white">
                      0{step.step}
                    </span>
                    <StepIcon className="w-3 h-3" style={{ color: step.color }} />
                    <span className="text-xs font-semibold text-zinc-300 group-hover:text-white">
                      {step.label}
                    </span>
                    <span className="text-[9px] font-mono text-zinc-500">({step.role})</span>
                  </button>
                  {idx < TRADE_LIFECYCLE_STEPS.length - 1 && (
                    <ArrowRight className="w-3 h-3 text-zinc-700 flex-shrink-0" />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>

        {/* Controls: Search & Category Filter */}
        <div className="px-6 py-3 border-b border-white/[0.06] bg-black/20 flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              ref={inputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by tool name, role (e.g. Decide, Execute), or description..."
              className="w-full bg-zinc-900/90 border border-white/10 rounded-xl pl-10 pr-9 py-2 text-xs text-white placeholder:text-zinc-500 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Pillar Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-1">
            <button
              onClick={() => setSelectedPillar("all")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                selectedPillar === "all"
                  ? "bg-white/15 text-white border border-white/20 shadow-sm"
                  : "text-zinc-400 hover:text-zinc-200 hover:bg-white/5 border border-transparent"
              }`}
            >
              All Pillars
            </button>
            {visiblePillars(NAV_PILLARS, isAdmin).map((pillar) => {
              const Icon = pillar.icon;
              const isSelected = selectedPillar === pillar.id;
              return (
                <button
                  key={pillar.id}
                  onClick={() => setSelectedPillar(pillar.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                    isSelected
                      ? "text-white border shadow-sm"
                      : "text-zinc-400 hover:text-zinc-200 hover:bg-white/5 border border-transparent"
                  }`}
                  style={{
                    backgroundColor: isSelected ? `${pillar.color}25` : undefined,
                    borderColor: isSelected ? `${pillar.color}60` : undefined,
                  }}
                >
                  <Icon className="w-3.5 h-3.5" style={{ color: pillar.color }} />
                  <span>{pillar.shortLabel}</span>
                  <span className="text-[10px] opacity-60 font-mono">({pillar.items.length})</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Modal Body: Cards Grid */}
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-8 scrollbar-thin">
          {filteredPillars.length === 0 ? (
            <div className="py-20 flex flex-col items-center justify-center text-center">
              <div className="w-12 h-12 rounded-2xl bg-zinc-900 border border-white/10 flex items-center justify-center text-zinc-600 mb-3">
                <Search className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-zinc-300 mb-1">No tools found</h3>
              <p className="text-xs text-zinc-500 max-w-sm">
                No matching tools or roles found for "{searchQuery}". Try searching for "Decide", "Execute", "Macro", or select All Pillars.
              </p>
            </div>
          ) : (
            filteredPillars.map((pillar) => {
              const PillarIcon = pillar.icon;
              return (
                <section key={pillar.id} className="space-y-3">
                  {/* Pillar Section Header */}
                  <div className="flex items-center justify-between pb-2 border-b border-white/[0.06]">
                    <div className="flex items-center gap-2.5">
                      <div
                        className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: `${pillar.color}20`, border: `1px solid ${pillar.color}40` }}
                      >
                        <PillarIcon className="w-4 h-4" style={{ color: pillar.color }} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-bold text-white uppercase tracking-wider">{pillar.label}</h3>
                          <span
                            className="px-2 py-0.2 rounded-full text-[9px] font-bold font-mono"
                            style={{ backgroundColor: `${pillar.color}15`, color: pillar.color }}
                          >
                            {pillar.items.length} tools
                          </span>
                        </div>
                        <p className="text-[11px] text-zinc-500">{pillar.description}</p>
                      </div>
                    </div>
                  </div>

                  {/* Cards Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {pillar.items.map((item) => {
                      const ItemIcon = item.icon;
                      const isCore = PRIMARY_CORE_IDS.includes(item.id);
                      const pinned = isFavorite(item.id) || isCore;

                      return (
                        <div
                          key={item.id}
                          onClick={() => handleNavigate(item.href)}
                          className="group relative flex flex-col justify-between p-4 rounded-xl border border-white/[0.08] bg-zinc-900/50 hover:bg-zinc-800/80 hover:border-white/20 transition-all duration-150 cursor-pointer shadow-sm hover:shadow-md"
                        >
                          {/* Card Top Row */}
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div className="flex items-center gap-2.5">
                              <div
                                className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform"
                                style={{ backgroundColor: `${pillar.color}15`, border: `1px solid ${pillar.color}30` }}
                              >
                                <ItemIcon className="w-4 h-4" style={{ color: pillar.color }} />
                              </div>
                              <div>
                                <h4 className="text-sm font-bold text-white group-hover:text-blue-400 transition-colors flex items-center gap-1.5">
                                  {item.label}
                                  <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 -translate-x-1 group-hover:translate-x-0 transition-all text-blue-400" />
                                </h4>
                                <span className="text-[10px] font-mono text-zinc-500">{item.href}</span>
                              </div>
                            </div>

                            {/* Pin / Star Toggle */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (!isCore) toggleFavorite(item.id);
                              }}
                              className={`p-1.5 rounded-lg border transition-all ${
                                isCore
                                  ? "bg-blue-500/10 border-blue-500/20 text-blue-400 cursor-default"
                                  : pinned
                                  ? "bg-yellow-500/15 border-yellow-500/30 text-yellow-400 hover:bg-yellow-500/25"
                                  : "bg-zinc-800/80 border-white/5 text-zinc-500 hover:text-zinc-200 hover:bg-zinc-700"
                              }`}
                              title={
                                isCore
                                  ? "Primary core tool (Permanent)"
                                  : pinned
                                  ? "Unpin from Quick Access"
                                  : "Pin to Quick Access"
                              }
                            >
                              {isCore ? (
                                <Lock className="w-3.5 h-3.5" />
                              ) : (
                                <Star className={`w-3.5 h-3.5 ${pinned ? "fill-yellow-400" : ""}`} />
                              )}
                            </button>
                          </div>

                          {/* Role Tag & Description */}
                          <div className="mb-3 space-y-1.5">
                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded border border-blue-500/20">
                                Role: {item.role}
                              </span>
                            </div>
                            <p className="text-xs text-zinc-400 line-clamp-2 leading-relaxed">
                              {item.description}
                            </p>
                          </div>

                          {/* Card Footer */}
                          <div className="flex items-center justify-between pt-2 border-t border-white/[0.04]">
                            {item.badge ? (
                              <span
                                className="px-2 py-0.5 rounded text-[9px] font-mono font-bold tracking-wider uppercase"
                                style={{ backgroundColor: `${pillar.color}15`, color: pillar.color }}
                              >
                                {item.badge}
                              </span>
                            ) : (
                              <span className="text-[10px] text-zinc-600 font-mono">TOOL</span>
                            )}

                            <span
                              className={`text-[10px] font-medium flex items-center gap-1 ${
                                isCore
                                  ? "text-blue-400 font-semibold"
                                  : pinned
                                  ? "text-yellow-400 font-semibold"
                                  : "text-zinc-500 group-hover:text-zinc-300"
                              }`}
                            >
                              {isCore ? (
                                <>
                                  <Check className="w-2.5 h-2.5" /> Primary Core
                                </>
                              ) : pinned ? (
                                <>
                                  <Check className="w-2.5 h-2.5" /> Quick Access
                                </>
                              ) : (
                                "Open Tool →"
                              )}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>
              );
            })
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 border-t border-white/[0.08] bg-black/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-zinc-500">
          <div className="flex items-center gap-2">
            <span className="font-mono text-zinc-400">⚡ Core Workflow:</span>
            <span>Live Radar (Decide) → Scanner (Find) → Execution (Do) → Positions (Manage).</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                localStorage.setItem("tradeos-favorites", JSON.stringify(DEFAULT_QUICK_ACCESS_IDS));
                window.dispatchEvent(new Event("favorites-updated"));
              }}
              className="text-xs text-zinc-400 hover:text-white underline underline-offset-2 transition-colors"
            >
              Reset Quick Access (5)
            </button>
            <button
              onClick={onClose}
              className="px-4 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-medium transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
