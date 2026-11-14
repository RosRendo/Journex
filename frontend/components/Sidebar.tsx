"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect, useMemo, useRef } from "react";
import {
  ChevronDown,
  ChevronRight,
  Command,
  Maximize2,
  Compass,
  Settings as SettingsIcon,
  Layers,
  Sparkles,
} from "lucide-react";
import { useFocusMode } from "./providers/FocusModeProvider";
import { ALL_PAGES, NavItem, filterForRole } from "./layout/navigation";
import { useIsAdmin } from "@/lib/role";
import { useSession } from "@/lib/useSession";

interface SidebarProps {
  onOpenCommandPalette?: () => void;
  onOpenEcosystemMap?: () => void;
}

// 7 Non-negotiable Daily Core Tools
const CORE_NAV_IDS = [
  "dashboard",
  "signals",
  "terminal",
  "journal",
  "analytics",
  "macro",
  "accounts",
];

// Utility pages belonging in user menu / footer, not daily lists
const EXCLUDED_FROM_LISTS = new Set([
  "settings",
  "profile",
  "subscription",
  "pricing",
  "community",
]);

export default function Sidebar({
  onOpenCommandPalette,
  onOpenEcosystemMap,
}: SidebarProps) {
  const pathname = usePathname();
  const { focusMode, toggleFocusMode } = useFocusMode();
  const isAdmin = useIsAdmin();
  const { data: session } = useSession();
  const user = session?.user as any;
  const isPro = user?.isPro || user?.plan === "pro" || user?.plan === "lifetime";
  const trialDaysLeft = user?.trialDaysLeft ?? 7;

  const [isCollapsed, setIsCollapsed] = useState(true);
  const [toolsExpanded, setToolsExpanded] = useState(false);
  const [flyoutOpen, setFlyoutOpen] = useState(false);
  const flyoutRef = useRef<HTMLDivElement>(null);

  // Restore collapsed state; default is collapsed (72px)
  useEffect(() => {
    try {
      const savedCollapsed = localStorage.getItem("sidebar-collapsed");
      if (savedCollapsed !== null) {
        setIsCollapsed(savedCollapsed === "true");
      }
      const savedTools = localStorage.getItem("sidebar-tools-expanded");
      if (savedTools !== null) {
        setToolsExpanded(savedTools === "true");
      }
    } catch (_) {}
  }, []);

  const isActive = (href: string) => {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname.startsWith(href);
  };

  // Filter accessible pages based on role
  const roleFilteredPages = useMemo(() => {
    return filterForRole(ALL_PAGES, isAdmin);
  }, [isAdmin]);

  // Daily Primary Core Tools (6-7 items)
  const corePages = useMemo(() => {
    return roleFilteredPages.filter((item) => CORE_NAV_IDS.includes(item.id));
  }, [roleFilteredPages]);

  // Secondary Tools (Risk Desk, Calendar, Alerts, Backtesting, Labs, etc.)
  const secondaryPages = useMemo(() => {
    return roleFilteredPages.filter(
      (item) => !CORE_NAV_IDS.includes(item.id) && !EXCLUDED_FROM_LISTS.has(item.id)
    );
  }, [roleFilteredPages]);

  // Automatically expand tools accordion if user navigated to a secondary page
  useEffect(() => {
    const isCurrentInSecondary = secondaryPages.some((p) => isActive(p.href));
    if (isCurrentInSecondary && !toolsExpanded) {
      setToolsExpanded(true);
    }
  }, [pathname, secondaryPages, toolsExpanded]);

  // Close collapsed flyout on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (flyoutRef.current && !flyoutRef.current.contains(e.target as Node)) {
        setFlyoutOpen(false);
      }
    };
    if (flyoutOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [flyoutOpen]);

  const toggleTools = () => {
    const next = !toolsExpanded;
    setToolsExpanded(next);
    try {
      localStorage.setItem("sidebar-tools-expanded", String(next));
    } catch (_) {}
  };

  const handleToggleCollapse = () => {
    const next = !isCollapsed;
    setIsCollapsed(next);
    setFlyoutOpen(false);
    try {
      localStorage.setItem("sidebar-collapsed", String(next));
    } catch (_) {}
  };

  const isAnySecondaryActive = secondaryPages.some((p) => isActive(p.href));

  return (
    <aside
      className={`${
        isCollapsed ? "w-[72px]" : "w-[220px]"
      } h-screen bg-[#0A0C10] border-r border-[rgba(255,255,255,0.07)] flex flex-col flex-shrink-0 transition-all duration-300 relative select-none ${
        focusMode ? "opacity-30 pointer-events-none" : ""
      }`}
    >
      {/* Collapse / Expand Toggle Button */}
      <button
        onClick={handleToggleCollapse}
        className="absolute -right-3 top-5 bg-zinc-900 border border-[rgba(255,255,255,0.12)] rounded-full p-1 text-zinc-400 hover:text-white hover:bg-zinc-800 z-50 transition-colors shadow-lg cursor-pointer"
        title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
      >
        <ChevronDown
          className={`w-3 h-3 transition-transform duration-300 ${
            isCollapsed ? "-rotate-90" : "rotate-90"
          }`}
        />
      </button>

      {/* Brand Header */}
      <div
        className={`px-3 py-4 border-b border-[rgba(255,255,255,0.07)] flex items-center ${
          isCollapsed ? "justify-center" : "justify-between"
        }`}
      >
        <Link href="/dashboard" className="flex items-center gap-2.5 group">
          <div className="w-7 h-7 rounded-lg bg-[#20e0b2]/20 border border-[#20e0b2]/40 flex items-center justify-center flex-shrink-0 shadow-[0_0_12px_rgba(32,224,178,0.25)] group-hover:scale-105 transition-transform">
            <span className="text-[#20e0b2] text-xs font-black">J</span>
          </div>
          {!isCollapsed && (
            <div className="overflow-hidden whitespace-nowrap">
              <p className="text-sm font-bold text-white tracking-tight leading-tight flex items-center gap-1.5">
                Journex
                <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-[#20e0b2]/15 text-[#20e0b2] border border-[#20e0b2]/30 font-extrabold uppercase">
                  Pro
                </span>
              </p>
              <p className="text-[10px] text-zinc-500 font-mono">CFD & FX Terminal</p>
            </div>
          )}
        </Link>
      </div>

      {/* Quick Action: Command Palette (⌘K) */}
      <div className="px-2 pt-2.5 pb-1">
        <button
          onClick={onOpenCommandPalette}
          className={`w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-zinc-900/80 border border-white/5 text-zinc-400 text-xs hover:border-zinc-700 hover:text-white transition-all group cursor-pointer ${
            !isCollapsed ? "px-3" : "px-0"
          }`}
          title="Command Palette (⌘K / Ctrl+K)"
        >
          <Command className="w-3.5 h-3.5 flex-shrink-0 text-zinc-400 group-hover:text-[#20e0b2] transition-colors" />
          {!isCollapsed && (
            <>
              <span className="flex-1 text-left whitespace-nowrap overflow-hidden text-[11.5px]">
                Search & Actions
              </span>
              <kbd className="px-1.5 py-0.5 text-[9px] font-mono bg-zinc-800 border border-white/10 rounded text-zinc-400 group-hover:text-zinc-200">
                ⌘K
              </kbd>
            </>
          )}
        </button>
      </div>

      {/* Navigation Links Area */}
      <nav className="flex-1 overflow-y-auto px-2 py-2 space-y-1 scrollbar-none">
        {/* Section Label: Daily Trading */}
        {!isCollapsed && (
          <div className="px-2 pt-1 pb-1 text-[9px] font-bold uppercase tracking-wider text-zinc-500 font-mono">
            Trading Desk
          </div>
        )}

        {/* 1. Daily Core Pages */}
        {corePages.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);

          return (
            <Link
              key={item.id}
              href={item.href}
              title={isCollapsed ? `${item.label} • ${item.role}` : ""}
              className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[12px] font-medium transition-all duration-150 ${
                isCollapsed ? "justify-center px-0" : ""
              } ${
                active
                  ? "bg-[#20e0b2]/15 text-[#20e0b2] border border-[#20e0b2]/30 shadow-sm"
                  : "text-zinc-300 hover:text-white hover:bg-zinc-800/60 border border-transparent"
              }`}
            >
              <Icon
                className={`w-4 h-4 flex-shrink-0 ${
                  active ? "text-[#20e0b2]" : "text-zinc-400 group-hover:text-zinc-200"
                }`}
              />
              {!isCollapsed && (
                <div className="flex-1 min-w-0 flex items-center justify-between">
                  <span className="whitespace-nowrap font-semibold truncate">{item.label}</span>
                  {item.badge && (
                    <span className="text-[8px] font-mono px-1 py-0.2 rounded bg-white/[0.06] text-zinc-400 border border-white/5 uppercase ml-1 flex-shrink-0">
                      {item.badge}
                    </span>
                  )}
                </div>
              )}
              {!isCollapsed && active && (
                <span className="w-1.5 h-1.5 rounded-full bg-[#20e0b2] flex-shrink-0 ml-1" />
              )}
            </Link>
          );
        })}

        {/* 2. Secondary Tools & Labs (Collapsible Accordion) */}
        {secondaryPages.length > 0 && (
          <div className="pt-2">
            {!isCollapsed ? (
              <div>
                <button
                  onClick={toggleTools}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer ${
                    isAnySecondaryActive
                      ? "text-[#20e0b2] bg-white/[0.03]"
                      : "text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.02]"
                  }`}
                >
                  <span className="flex items-center gap-2 font-mono uppercase tracking-wider text-[9.5px]">
                    <Layers className="w-3.5 h-3.5 text-zinc-400" />
                    Tools & Labs
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-white/[0.06] text-zinc-400">
                      {secondaryPages.length}
                    </span>
                    <ChevronRight
                      className={`w-3 h-3 text-zinc-500 transition-transform duration-200 ${
                        toolsExpanded ? "rotate-90" : ""
                      }`}
                    />
                  </div>
                </button>

                {toolsExpanded && (
                  <div className="pl-2 pt-1 space-y-0.5 border-l border-white/5 ml-3 my-1">
                    {secondaryPages.map((item) => {
                      const Icon = item.icon;
                      const active = isActive(item.href);

                      return (
                        <Link
                          key={item.id}
                          href={item.href}
                          className={`flex items-center gap-2 px-2 py-1.5 rounded-lg text-[11.5px] transition-all ${
                            active
                              ? "bg-[#20e0b2]/15 text-[#20e0b2] font-semibold border border-[#20e0b2]/25"
                              : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40 border border-transparent"
                          }`}
                        >
                          <Icon
                            className={`w-3.5 h-3.5 flex-shrink-0 ${
                              active ? "text-[#20e0b2]" : "text-zinc-500"
                            }`}
                          />
                          <span className="truncate">{item.label}</span>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : (
              // Collapsed mode: Single trigger with popover flyout
              <div className="relative" ref={flyoutRef}>
                <button
                  onClick={() => setFlyoutOpen(!flyoutOpen)}
                  title={`More Tools (${secondaryPages.length})`}
                  className={`w-full flex items-center justify-center p-2 rounded-lg text-[12px] transition-all cursor-pointer ${
                    isAnySecondaryActive || flyoutOpen
                      ? "bg-[#20e0b2]/15 text-[#20e0b2] border border-[#20e0b2]/30"
                      : "text-zinc-400 hover:text-white hover:bg-zinc-800/60 border border-transparent"
                  }`}
                >
                  <Layers className="w-4 h-4" />
                </button>

                {flyoutOpen && (
                  <div className="absolute left-[76px] top-0 w-48 bg-[#0D0F14] border border-white/10 rounded-xl shadow-2xl p-2 z-50 space-y-1 animate-in fade-in zoom-in-95 duration-150">
                    <div className="px-2 py-1 text-[9px] font-mono uppercase tracking-wider text-zinc-500 border-b border-white/5">
                      Tools & Labs
                    </div>
                    {secondaryPages.map((item) => {
                      const Icon = item.icon;
                      const active = isActive(item.href);
                      return (
                        <Link
                          key={item.id}
                          href={item.href}
                          onClick={() => setFlyoutOpen(false)}
                          className={`flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs transition-all ${
                            active
                              ? "bg-[#20e0b2]/15 text-[#20e0b2] font-semibold"
                              : "text-zinc-300 hover:text-white hover:bg-zinc-800/60"
                          }`}
                        >
                          <Icon className="w-3.5 h-3.5 text-zinc-400" />
                          <span className="truncate">{item.label}</span>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </nav>

      {/* Footer & Preferences */}
      <div className="border-t border-[rgba(255,255,255,0.07)] p-2 space-y-1">
        {/* Settings Link */}
        <Link
          href="/settings"
          title={isCollapsed ? "System Settings" : ""}
          className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[12px] font-medium transition-all ${
            isCollapsed ? "justify-center px-0" : ""
          } ${
            isActive("/settings")
              ? "bg-[#20e0b2]/15 text-[#20e0b2] border border-[#20e0b2]/30"
              : "text-zinc-400 hover:text-white hover:bg-zinc-800/60 border border-transparent"
          }`}
        >
          <SettingsIcon className="w-4 h-4 flex-shrink-0 text-zinc-400 hover:text-white" />
          {!isCollapsed && <span>Settings</span>}
        </Link>

        {/* Focus Mode Toggle */}
        <button
          onClick={toggleFocusMode}
          title="Focus Mode (Ctrl+Shift+F)"
          className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[12px] font-medium transition-all cursor-pointer ${
            isCollapsed ? "justify-center px-0" : ""
          } ${
            focusMode
              ? "bg-amber-500/15 text-amber-300 border border-amber-500/25"
              : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60 border border-transparent"
          }`}
        >
          <Maximize2 className="w-3.5 h-3.5 flex-shrink-0" />
          {!isCollapsed && <span>{focusMode ? "Exit Focus" : "Focus Mode"}</span>}
        </button>

        {/* User Tier / Plan Badge */}
        {!isCollapsed && (
          <div className="pt-1">
            {isAdmin ? (
              <div className="px-2.5 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/25 flex items-center justify-between text-[10px] font-mono">
                <span className="text-amber-300 font-bold flex items-center gap-1">
                  <span>👑</span> Master Admin
                </span>
                <span className="text-[8px] text-amber-400 font-extrabold uppercase bg-amber-500/20 px-1 py-0.2 rounded border border-amber-500/30">
                  LIFETIME
                </span>
              </div>
            ) : isPro ? (
              <div className="px-2.5 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-between text-[10px] font-mono">
                <span className="text-emerald-300 font-bold flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-emerald-400" /> Pro Trader
                </span>
                <span className="text-[8px] text-emerald-400 font-extrabold uppercase bg-emerald-500/20 px-1 py-0.2 rounded border border-emerald-500/30">
                  ACTIVE
                </span>
              </div>
            ) : (
              <Link
                href="/subscription"
                className="p-2 rounded-xl bg-gradient-to-br from-zinc-900 to-black border border-white/10 block hover:border-[#20e0b2]/40 transition-colors"
              >
                <div className="flex items-center justify-between text-[10px] font-mono mb-1">
                  <span className="text-zinc-400">Trial Mode</span>
                  <span className="text-[#20e0b2] font-bold">{trialDaysLeft}d left</span>
                </div>
                <div className="text-[10px] text-center font-bold text-white bg-[#20e0b2]/20 hover:bg-[#20e0b2]/30 py-1 rounded-lg text-[#20e0b2] transition-colors">
                  Upgrade to Pro ↗
                </div>
              </Link>
            )}
          </div>
        )}
      </div>
    </aside>
  );
}
