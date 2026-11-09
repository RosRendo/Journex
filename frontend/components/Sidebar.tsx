"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect, useMemo } from "react";
import {
  ChevronDown, Command, Maximize2, Compass, Search, X
} from "lucide-react";
import { useFocusMode } from "./providers/FocusModeProvider";
import { ALL_PAGES, NavItem, filterForRole } from "./layout/navigation";
import { useIsAdmin } from "@/lib/role";
import { useSession } from "@/lib/useSession";

interface SidebarProps {
  onOpenCommandPalette?: () => void;
  onOpenEcosystemMap?: () => void;
}

const Sidebar = ({ onOpenCommandPalette, onOpenEcosystemMap }: SidebarProps) => {
  const pathname = usePathname();
  const { focusMode, toggleFocusMode } = useFocusMode();
  const isAdmin = useIsAdmin();
  const { data: session } = useSession();
  const user = session?.user as any;
  const isPro = user?.isPro || user?.plan === "pro" || user?.plan === "lifetime";
  const trialDaysLeft = user?.trialDaysLeft ?? 7;
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // Restore collapsed state; default is collapsed (true) if never saved
  useEffect(() => {
    try {
      const savedCollapsed = localStorage.getItem("sidebar-collapsed");
      if (savedCollapsed !== null) {
        setIsCollapsed(savedCollapsed === "true");
      }
    } catch (e) {}
  }, []);

  const isActive = (href: string) => {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname.startsWith(href);
  };

  // Filter accessible pages for current user role, completely ungrouped flat list
  const visiblePages = useMemo(() => {
    const list = filterForRole(ALL_PAGES, isAdmin);
    if (!searchQuery.trim()) return list;
    const q = searchQuery.toLowerCase();
    return list.filter(
      (item) =>
        item.label.toLowerCase().includes(q) ||
        item.role.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        item.href.toLowerCase().includes(q)
    );
  }, [isAdmin, searchQuery]);

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
        className="absolute -right-3 top-6 bg-zinc-800 border border-[rgba(255,255,255,0.1)] rounded-full p-1 text-zinc-400 hover:text-white hover:bg-zinc-700 z-50 transition-colors shadow-lg cursor-pointer"
        title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
      >
        <ChevronDown
          className={`w-3 h-3 transition-transform duration-300 ${
            isCollapsed ? "-rotate-90" : "rotate-90"
          }`}
        />
      </button>

      {/* Logo & Brand Header */}
      <div
        className={`px-4 py-4 border-b border-[rgba(255,255,255,0.07)] flex items-center ${
          isCollapsed ? "justify-center px-0" : "justify-between"
        }`}
      >
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-[#20e0b2]/20 border border-[#20e0b2]/40 flex items-center justify-center flex-shrink-0 shadow-[0_0_12px_rgba(32,224,178,0.25)]">
            <span className="text-[#20e0b2] text-xs font-black">J</span>
          </div>
          {!isCollapsed && (
            <div className="overflow-hidden whitespace-nowrap">
              <p className="text-sm font-bold text-white tracking-tight leading-tight">Journex Pro</p>
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
          className={`w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-zinc-900/90 border border-[rgba(255,255,255,0.07)] text-zinc-500 text-xs hover:border-zinc-600 hover:text-zinc-300 transition-all group cursor-pointer ${
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
          className={`w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-[#20e0b2]/10 border border-[#20e0b2]/25 text-[#20e0b2] text-xs hover:bg-[#20e0b2]/20 hover:border-[#20e0b2]/40 hover:text-white transition-all group cursor-pointer ${
            !isCollapsed ? "px-3" : "px-0"
          }`}
          title="Ecosystem Blueprint (⌘M)"
        >
          <Compass className="w-3.5 h-3.5 flex-shrink-0 text-[#20e0b2] group-hover:rotate-45 transition-transform duration-300" />
          {!isCollapsed && (
            <>
              <span className="flex-1 text-left font-medium whitespace-nowrap overflow-hidden">
                Ecosystem Map
              </span>
              <span className="px-1.5 py-0.2 rounded text-[9px] font-mono bg-[#20e0b2]/20 text-[#20e0b2] border border-[#20e0b2]/30">
                {visiblePages.length}
              </span>
            </>
          )}
        </button>
      </div>

      {/* Search Input Filter (When Expanded) */}
      {!isCollapsed && (
        <div className="px-3 py-1">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search tools..."
              className="w-full bg-zinc-900/90 border border-white/10 rounded-lg pl-8 pr-7 py-1.5 text-[11px] text-white placeholder:text-zinc-500 focus:outline-none focus:border-[#20e0b2]/40 transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Main Ungrouped Navigation Area */}
      <nav className="flex-1 overflow-y-auto px-2 py-2 space-y-1 scrollbar-thin">
        {visiblePages.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);

          return (
            <Link
              key={item.id}
              href={item.href}
              title={isCollapsed ? `${item.label} (${item.role})` : ""}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-[12.5px] font-medium transition-all duration-150 ${
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
                  {item.badge ? (
                    <span className="text-[8px] font-mono px-1 py-0.2 rounded bg-white/[0.06] text-zinc-400 border border-white/5 uppercase ml-1.5 flex-shrink-0">
                      {item.badge}
                    </span>
                  ) : (
                    <span className="text-[9.5px] font-mono text-zinc-500 uppercase ml-1.5 flex-shrink-0 truncate">
                      {item.role.split(" ")[0]}
                    </span>
                  )}
                </div>
              )}
              {!isCollapsed && active && (
                <span className="w-1.5 h-1.5 rounded-full bg-[#20e0b2] flex-shrink-0 ml-1.5" />
              )}
            </Link>
          );
        })}

        {visiblePages.length === 0 && (
          <div className="px-3 py-6 text-center text-zinc-500 text-xs">
            <p className="text-[11px]">No tools match "{searchQuery}"</p>
          </div>
        )}
      </nav>

      {/* Footer Actions */}
      <div className="border-t border-[rgba(255,255,255,0.07)] p-3 space-y-2">
        {/* Role & Subscription Tier Indicator */}
        {!isCollapsed && (
          <div>
            {isAdmin ? (
              <div className="px-2.5 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/25 flex items-center justify-between text-[10.5px] font-mono">
                <span className="text-amber-300 font-bold flex items-center gap-1.5">
                  <span>👑</span> Master Admin
                </span>
                <span className="text-[8px] text-amber-400 font-extrabold uppercase tracking-wider bg-amber-500/20 px-1 py-0.2 rounded border border-amber-500/30">
                  LIFETIME
                </span>
              </div>
            ) : isPro ? (
              <div className="px-2.5 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-between text-[10.5px] font-mono">
                <span className="text-emerald-300 font-bold flex items-center gap-1.5">
                  <span>⚡</span> Pro Trader
                </span>
                <span className="text-[8px] text-emerald-400 font-extrabold uppercase tracking-wider bg-emerald-500/20 px-1 py-0.2 rounded border border-emerald-500/30">
                  SUBSCRIBED
                </span>
              </div>
            ) : (
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-zinc-900 to-black border border-white/10 space-y-1.5">
                <div className="flex items-center justify-between text-[10px] font-mono">
                  <span className="text-zinc-400 flex items-center gap-1">
                    <span>👤</span> Free Trial
                  </span>
                  <span className="text-sky-400 font-bold">{trialDaysLeft}d left</span>
                </div>
                <Link
                  href="/subscription"
                  className="w-full py-1 rounded-lg bg-[#20e0b2] hover:bg-[#1bc79e] text-black text-[10px] font-bold text-center block transition-all shadow-sm"
                >
                  Upgrade to Pro ↗
                </Link>
              </div>
            )}
          </div>
        )}

        {/* Focus Mode Toggle */}
        <button
          onClick={toggleFocusMode}
          title="Focus Mode (Ctrl+Shift+F)"
          className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[12px] font-medium transition-all duration-150 cursor-pointer ${
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
          <div className="px-3 py-0.5 text-[10px] text-zinc-600 text-center flex items-center justify-center gap-1.5 font-mono">
            <span>Journex Pro</span>
            <span>•</span>
            <span className="text-zinc-500">Trading OS</span>
          </div>
        )}
      </div>
    </aside>
  );
};

export default Sidebar;
