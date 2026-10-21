"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect, useMemo } from "react";
import {
  ChevronDown, Command, Maximize2, Compass, Star, ChevronRight,
  Layers, Search, X, Shield, Lock
} from "lucide-react";
import { useFocusMode } from "./providers/FocusModeProvider";
import { useFavorites } from "@/hooks/useFavorites";
import {
  NAV_PILLARS, ALL_PAGES, NavItem, PRIMARY_CORE_IDS
} from "./layout/navigation";

interface SidebarProps {
  onOpenCommandPalette?: () => void;
  onOpenEcosystemMap?: () => void;
}

const Sidebar = ({ onOpenCommandPalette, onOpenEcosystemMap }: SidebarProps) => {
  const pathname = usePathname();
  const { focusMode, toggleFocusMode } = useFocusMode();
  const { favorites, toggleFavorite, isFavorite } = useFavorites();
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [viewMode, setViewMode] = useState<"desk" | "all">("desk");
  const [allPagesSearch, setAllPagesSearch] = useState("");
  const [expandedPillars, setExpandedPillars] = useState<string[]>(["execution"]);

  // Load saved view mode
  useEffect(() => {
    try {
      const saved = localStorage.getItem("sidebar-view-mode");
      if (saved === "desk" || saved === "all") {
        setViewMode(saved);
      }
      // Restore collapsed state; default is collapsed (true) if never saved
      const savedCollapsed = localStorage.getItem("sidebar-collapsed");
      if (savedCollapsed !== null) {
        setIsCollapsed(savedCollapsed === "true");
      }
    } catch (e) {}
  }, []);

  const handleSetViewMode = (mode: "desk" | "all") => {
    setViewMode(mode);
    try {
      localStorage.setItem("sidebar-view-mode", mode);
    } catch (e) {}
  };

  // Auto-expand pillar that contains current route
  useEffect(() => {
    NAV_PILLARS.forEach((pillar) => {
      if (pillar.items.some((item) => item.href === pathname)) {
        setExpandedPillars((prev) => (prev.includes(pillar.id) ? prev : [...prev, pillar.id]));
      }
    });
  }, [pathname]);

  const togglePillar = (id: string) => {
    setExpandedPillars((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  };

  const isActive = (href: string) => pathname === href;

  // 1. Primary permanent core tools (Never unpinned)
  const primaryCoreItems = useMemo(() => {
    return PRIMARY_CORE_IDS.map((id) => ALL_PAGES.find((p) => p.id === id)).filter(
      (item): item is NavItem => Boolean(item)
    );
  }, []);

  // 2. Quick-access customized pinned tools (excluding primary core to avoid duplication)
  const quickAccessItems = useMemo(() => {
    return favorites
      .filter((id) => !PRIMARY_CORE_IDS.includes(id))
      .map((id) => ALL_PAGES.find((p) => p.id === id))
      .filter((item): item is NavItem => Boolean(item));
  }, [favorites]);

  // Filtered pillars for "All Pages" search
  const filteredPillars = useMemo(() => {
    if (!allPagesSearch.trim()) return NAV_PILLARS;
    const q = allPagesSearch.toLowerCase();

    return NAV_PILLARS.map((pillar) => ({
      ...pillar,
      items: pillar.items.filter(
        (item) =>
          item.label.toLowerCase().includes(q) ||
          item.role.toLowerCase().includes(q) ||
          item.description.toLowerCase().includes(q) ||
          item.href.toLowerCase().includes(q)
      ),
    })).filter((pillar) => pillar.items.length > 0);
  }, [allPagesSearch]);

  return (
    <aside
      className={`${
        isCollapsed ? "w-[72px]" : "w-[230px]"
      } h-screen bg-[#0A0C10] border-r border-[rgba(255,255,255,0.07)] flex flex-col flex-shrink-0 transition-all duration-300 relative ${
        focusMode ? "opacity-30 pointer-events-none" : ""
      }`}
    >
      {/* Collapse Toggle Button */}
      <button
        onClick={() => {
          const next = !isCollapsed;
          setIsCollapsed(next);
          try { localStorage.setItem("sidebar-collapsed", String(next)); } catch (e) {}
        }}
        className="absolute -right-3 top-6 bg-zinc-800 border border-[rgba(255,255,255,0.1)] rounded-full p-1 text-zinc-400 hover:text-white hover:bg-zinc-700 z-50 transition-colors shadow-lg"
        title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
      >
        <ChevronDown
          className={`w-3 h-3 transition-transform duration-300 ${
            isCollapsed ? "-rotate-90" : "rotate-90"
          }`}
        />
      </button>

      {/* Logo */}
      <div
        className={`px-4 py-4 border-b border-[rgba(255,255,255,0.07)] flex items-center ${
          isCollapsed ? "justify-center px-0" : "justify-between"
        }`}
      >
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-blue-500/20 border border-blue-500/40 flex items-center justify-center flex-shrink-0 shadow-[0_0_12px_rgba(59,130,246,0.3)]">
            <span className="text-blue-400 text-xs font-black">A</span>
          </div>
          {!isCollapsed && (
            <div className="overflow-hidden whitespace-nowrap">
              <p className="text-sm font-bold text-white tracking-tight leading-tight">AdaptiveICT</p>
              <p className="text-[10px] text-zinc-500 font-mono">Trading Operating System</p>
            </div>
          )}
        </div>
      </div>

      {/* Action Bar: Search (⌘K) & Ecosystem Blueprint (⌘M) */}
      <div className="px-3 pt-3 pb-2 space-y-1.5">
        {/* Command Palette Button */}
        <button
          onClick={onOpenCommandPalette}
          className={`w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-zinc-900/90 border border-[rgba(255,255,255,0.07)] text-zinc-500 text-xs hover:border-zinc-600 hover:text-zinc-300 transition-all group ${
            !isCollapsed ? "px-3" : "px-0"
          }`}
          title={isCollapsed ? "Command Palette (⌘K)" : ""}
        >
          <Command className="w-3.5 h-3.5 flex-shrink-0 text-zinc-400 group-hover:text-white transition-colors" />
          {!isCollapsed && (
            <>
              <span className="flex-1 text-left whitespace-nowrap overflow-hidden">Command (DO)</span>
              <kbd className="px-1.5 py-0.5 text-[9px] font-mono bg-zinc-800 border border-[rgba(255,255,255,0.1)] rounded opacity-70 group-hover:opacity-100 flex-shrink-0">
                ⌘K
              </kbd>
            </>
          )}
        </button>

        {/* Ecosystem Blueprint Button */}
        <button
          onClick={onOpenEcosystemMap}
          className={`w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-blue-500/10 border border-blue-500/25 text-blue-300 text-xs hover:bg-blue-500/20 hover:border-blue-500/40 hover:text-white transition-all group ${
            !isCollapsed ? "px-3" : "px-0"
          }`}
          title="Ecosystem Blueprint (⌘M)"
        >
          <Compass className="w-3.5 h-3.5 flex-shrink-0 text-blue-400 group-hover:rotate-45 transition-transform duration-300" />
          {!isCollapsed && (
            <>
              <span className="flex-1 text-left font-medium whitespace-nowrap overflow-hidden">
                Ecosystem Map
              </span>
              <span className="px-1.5 py-0.2 rounded text-[9px] font-mono bg-blue-500/20 text-blue-300 border border-blue-500/30">
                {ALL_PAGES.length}
              </span>
            </>
          )}
        </button>
      </div>

      {/* Mode Switcher Tabs (My Desk vs All Pages) */}
      {!isCollapsed && (
        <div className="px-3 py-1">
          <div className="p-0.5 rounded-lg bg-zinc-900/90 border border-white/5 flex items-center text-[11px] font-medium">
            <button
              onClick={() => handleSetViewMode("desk")}
              className={`flex-1 py-1 rounded-md transition-all text-center flex items-center justify-center gap-1.5 ${
                viewMode === "desk"
                  ? "bg-zinc-800 text-white shadow-sm font-semibold border border-white/10"
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              <Star className={`w-3 h-3 ${viewMode === "desk" ? "fill-yellow-400 text-yellow-400" : ""}`} />
              <span>My Desk</span>
              <span className="text-[10px] font-mono text-zinc-500">
                ({primaryCoreItems.length + quickAccessItems.length})
              </span>
            </button>
            <button
              onClick={() => handleSetViewMode("all")}
              className={`flex-1 py-1 rounded-md transition-all text-center flex items-center justify-center gap-1.5 ${
                viewMode === "all"
                  ? "bg-zinc-800 text-white shadow-sm font-semibold border border-white/10"
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              <Layers className="w-3 h-3" />
              <span>All Pages</span>
              <span className="text-[10px] font-mono text-zinc-500">({ALL_PAGES.length})</span>
            </button>
          </div>
        </div>
      )}

      {/* Main Navigation Area */}
      <nav className="flex-1 overflow-y-auto px-2 py-2 space-y-3 scrollbar-thin">
        {/* MODE 1: MY DESK (Primary Stable Core + Quick Access Tools) */}
        {viewMode === "desk" && (
          <>
            {/* TIER 1: PRIMARY WORKFLOW (Stable, non-removable core) */}
            <div className="space-y-0.5">
              {!isCollapsed && (
                <div className="px-3 pb-1.5 flex items-center justify-between">
                  <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Primary Workflow
                  </span>
                  <span className="text-[9px] font-mono text-zinc-600">CORE</span>
                </div>
              )}

              {primaryCoreItems.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.href);

                return (
                  <Link
                    key={item.id}
                    href={item.href}
                    title={isCollapsed ? `${item.label} (${item.role})` : ""}
                    className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium transition-all duration-150 ${
                      isCollapsed ? "justify-center" : ""
                    } ${
                      active
                        ? "bg-blue-500/15 text-blue-300 border border-blue-500/25"
                        : "text-zinc-300 hover:text-white hover:bg-zinc-800/60 border border-transparent"
                    }`}
                  >
                    <Icon className="w-4 h-4 flex-shrink-0 text-blue-400" />
                    {!isCollapsed && (
                      <div className="flex-1 min-w-0 flex items-center justify-between">
                        <span className="whitespace-nowrap font-semibold truncate">{item.label}</span>
                        <span className="text-[10px] font-mono text-zinc-500 uppercase ml-2">{item.role.split(" ")[0]}</span>
                      </div>
                    )}
                    {!isCollapsed && active && (
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-400 flex-shrink-0 ml-1.5" />
                    )}
                  </Link>
                );
              })}
            </div>

            {/* TIER 2: QUICK ACCESS (User's Customized Pinned Tools) */}
            <div className="space-y-0.5 pt-2 border-t border-white/[0.06]">
              {!isCollapsed && (
                <div className="px-3 pb-1.5 flex items-center justify-between">
                  <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                    Quick Access Tools
                  </span>
                  <button
                    onClick={onOpenEcosystemMap}
                    className="text-[10px] text-blue-400 hover:text-blue-300 transition-colors"
                  >
                    + Pin
                  </button>
                </div>
              )}

              {quickAccessItems.length === 0 ? (
                <div className="px-3 py-4 text-center text-zinc-500 text-xs">
                  <p className="text-[11px] mb-1.5">No extra tools pinned.</p>
                  <button
                    onClick={onOpenEcosystemMap}
                    className="px-2.5 py-1 rounded bg-blue-500/15 text-blue-300 text-[10px] hover:bg-blue-500/25 transition-colors"
                  >
                    Browse & Pin
                  </button>
                </div>
              ) : (
                quickAccessItems.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.href);

                  return (
                    <div key={item.id} className="group relative flex items-center">
                      <Link
                        href={item.href}
                        title={isCollapsed ? `${item.label} (${item.role})` : ""}
                        className={`flex-1 flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all duration-150 ${
                          isCollapsed ? "justify-center" : ""
                        } ${
                          active
                            ? "bg-blue-500/15 text-blue-300 border border-blue-500/25"
                            : "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/60 border border-transparent"
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5 flex-shrink-0 text-zinc-400 group-hover:text-zinc-200" />
                        {!isCollapsed && (
                          <span className="whitespace-nowrap flex-1 truncate">{item.label}</span>
                        )}
                        {!isCollapsed && active && (
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-400 flex-shrink-0" />
                        )}
                      </Link>

                      {/* Unpin button on hover */}
                      {!isCollapsed && (
                        <button
                          onClick={() => toggleFavorite(item.id)}
                          className="opacity-0 group-hover:opacity-100 p-1 text-zinc-500 hover:text-yellow-400 transition-opacity absolute right-2"
                          title="Unpin from Quick Access"
                        >
                          <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
                        </button>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </>
        )}

        {/* MODE 2: ALL PAGES (Searchable 5-Pillar Directory) */}
        {viewMode === "all" && (
          <div className="space-y-2">
            {/* Inline Quick Search for All Pages */}
            {!isCollapsed && (
              <div className="px-2 pb-1">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={allPagesSearch}
                    onChange={(e) => setAllPagesSearch(e.target.value)}
                    placeholder="Search tools..."
                    className="w-full bg-zinc-900 border border-white/10 rounded-lg pl-8 pr-7 py-1 text-[11px] text-white placeholder:text-zinc-500 focus:outline-none focus:border-blue-500/50"
                  />
                  {allPagesSearch && (
                    <button
                      onClick={() => setAllPagesSearch("")}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            )}

            {filteredPillars.map((pillar) => {
              const PillarIcon = pillar.icon;
              const isExpanded = allPagesSearch.trim() !== "" || expandedPillars.includes(pillar.id);

              return (
                <div key={pillar.id} className="space-y-0.5">
                  {/* Pillar Category Accordion Header */}
                  {!isCollapsed ? (
                    <button
                      onClick={() => togglePillar(pillar.id)}
                      className="w-full flex items-center justify-between px-3 py-1.5 rounded-md text-[11px] font-bold tracking-wider text-zinc-400 hover:text-white hover:bg-zinc-800/40 transition-colors uppercase"
                    >
                      <div className="flex items-center gap-2">
                        <PillarIcon className="w-3.5 h-3.5" style={{ color: pillar.color }} />
                        <span>{pillar.shortLabel}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-mono text-zinc-600 font-normal">
                          {pillar.items.length}
                        </span>
                        <ChevronRight
                          className={`w-3 h-3 text-zinc-600 transition-transform duration-200 ${
                            isExpanded ? "rotate-90" : ""
                          }`}
                        />
                      </div>
                    </button>
                  ) : (
                    <div className="h-2" />
                  )}

                  {/* Pillar Items */}
                  {(isExpanded || isCollapsed) && (
                    <div className="space-y-0.5 pl-1">
                      {pillar.items.map((item) => {
                        const Icon = item.icon;
                        const active = isActive(item.href);
                        const isCore = PRIMARY_CORE_IDS.includes(item.id);
                        const pinned = isFavorite(item.id) || isCore;

                        return (
                          <div key={item.id} className="group relative flex items-center">
                            <Link
                              href={item.href}
                              title={isCollapsed ? `${item.label} (${item.role})` : ""}
                              className={`flex-1 flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all duration-150 ${
                                isCollapsed ? "justify-center" : ""
                              } ${
                                active
                                  ? "bg-blue-500/15 text-blue-300 border border-blue-500/25"
                                  : "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/60 border border-transparent"
                              }`}
                            >
                              <Icon className="w-3.5 h-3.5 flex-shrink-0 text-zinc-400 group-hover:text-zinc-200" />
                              {!isCollapsed && (
                                <span className="whitespace-nowrap flex-1 truncate">{item.label}</span>
                              )}
                              {!isCollapsed && active && (
                                <span className="w-1.5 h-1.5 rounded-full bg-blue-400 flex-shrink-0" />
                              )}
                            </Link>

                            {/* Pin/Unpin Toggle */}
                            {!isCollapsed && (
                              <button
                                onClick={() => !isCore && toggleFavorite(item.id)}
                                className={`p-1 transition-opacity absolute right-2 ${
                                  isCore
                                    ? "opacity-40 text-blue-400 cursor-default"
                                    : pinned
                                    ? "opacity-100 text-yellow-400 hover:text-yellow-300"
                                    : "opacity-0 group-hover:opacity-100 text-zinc-600 hover:text-yellow-400"
                                }`}
                                title={
                                  isCore
                                    ? "Primary core tool (permanent)"
                                    : pinned
                                    ? "Unpin from Quick Access"
                                    : "Pin to Quick Access"
                                }
                              >
                                {isCore ? (
                                  <Lock className="w-3 h-3" />
                                ) : (
                                  <Star className={`w-3 h-3 ${pinned ? "fill-yellow-400" : ""}`} />
                                )}
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </nav>

      {/* Footer Actions */}
      <div className="border-t border-[rgba(255,255,255,0.07)] p-3 space-y-1">
        {/* Focus Mode Toggle */}
        <button
          onClick={toggleFocusMode}
          title="Focus Mode (Ctrl+Shift+F)"
          className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[12px] font-medium transition-all duration-150 ${
            focusMode
              ? "bg-amber-500/15 text-amber-300 border border-amber-500/25"
              : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/60"
          }`}
        >
          <Maximize2 className="w-3.5 h-3.5 flex-shrink-0" />
          {!isCollapsed && <span>{focusMode ? "Exit Focus" : "Focus Mode"}</span>}
          {!isCollapsed && (
            <kbd className="ml-auto text-[9px] font-mono text-zinc-600 bg-zinc-800/80 px-1 py-0.5 rounded">
              ⌃⇧F
            </kbd>
          )}
        </button>

        {!isCollapsed && (
          <div className="px-3 py-1 text-[10px] text-zinc-600 text-center flex items-center justify-center gap-1.5">
            <span>AdaptiveICT</span>
            <span>•</span>
            <span className="text-zinc-500">3-Layer OS</span>
          </div>
        )}
      </div>
    </aside>
  );
};

export default Sidebar;
