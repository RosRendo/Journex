"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import {
  LayoutDashboard, Terminal, Radar, BarChart3, ShieldAlert,
  Settings, Calculator, Activity, ChevronDown,
  BookOpen, CalendarDays, TrendingUp, CheckCircle2, AlertTriangle,
  Percent, BarChart2, Grid, Target, RotateCcw, Code, Newspaper,
  Bell, Users, Wallet, Eye, Crosshair, Shield, Command, Maximize2, Library,
  Bot, Globe, GraduationCap, Cpu
} from "lucide-react";
import { useFocusMode } from "./providers/FocusModeProvider";
import { useFavorites } from "@/hooks/useFavorites";
import { NAVIGATION } from "./layout/navigation";

interface NavChild { href: string; label: string; }
interface NavItem {
  id: string;
  label: string;
  icon: any;
  href?: string;
  badge?: string;
  children?: NavChild[];
}

// TOP-LEVEL OS NAVIGATION
const TOP_NAV: NavItem[] = [
  { id: "dashboard", label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { id: "journal", label: "Journal", href: "/journal", icon: BookOpen },
  { id: "calendar", label: "Calendar", href: "/calendar", icon: CalendarDays },
  { id: "risk", label: "Risk Desk", href: "/risk", icon: ShieldAlert },
  { id: "calculators", label: "Calculators", href: "/calculators", icon: Calculator },
  { id: "practice", label: "Practice Terminal", href: "/practice", icon: Terminal },
  { id: "playbook", label: "Playbook & AI", href: "/playbook", icon: Cpu },
  { id: "settings", label: "Settings", href: "/settings", icon: Settings },
];

interface SidebarProps {
  onOpenCommandPalette?: () => void;
}

const Sidebar = ({ onOpenCommandPalette }: SidebarProps) => {
  const pathname = usePathname();
  const { focusMode, toggleFocusMode } = useFocusMode();
  const { favorites } = useFavorites();
  const [expanded, setExpanded] = useState<string[]>([]);
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Auto-expand the group that contains the current route
  useEffect(() => {
    TOP_NAV.forEach(item => {
      if (item.children?.some(c => c.href === pathname)) {
        setExpanded(prev => prev.includes(item.id) ? prev : [...prev, item.id]);
      }
    });
  }, [pathname]);

  const toggle = (id: string) => {
    setExpanded(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const isActive = (href: string) => pathname === href;
  const isGroupActive = (children?: NavChild[]) => children?.some(c => pathname === c.href);

  return (
    <aside className={`${isCollapsed ? "w-[72px]" : "w-[220px]"} h-screen bg-[#0A0C10] border-r border-[rgba(255,255,255,0.07)] flex flex-col flex-shrink-0 transition-all duration-300 relative ${focusMode ? "opacity-30 pointer-events-none" : ""}`}>
      {/* Collapse Toggle Button */}
      <button 
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute -right-3 top-6 bg-zinc-800 border border-[rgba(255,255,255,0.1)] rounded-full p-1 text-zinc-400 hover:text-white hover:bg-zinc-700 z-50 transition-colors"
      >
        <ChevronDown className={`w-3 h-3 transition-transform duration-300 ${isCollapsed ? "-rotate-90" : "rotate-90"}`} />
      </button>

      {/* Logo */}
      <div className={`px-5 py-4 border-b border-[rgba(255,255,255,0.07)] flex items-center ${isCollapsed ? 'justify-center px-0' : ''}`}>
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-blue-500/20 border border-blue-500/40 flex items-center justify-center flex-shrink-0">
            <span className="text-blue-400 text-xs font-bold">T</span>
          </div>
          {!isCollapsed && (
            <div className="overflow-hidden whitespace-nowrap">
              <p className="text-sm font-bold text-white tracking-tight">TradeZella</p>
              <p className="text-[10px] text-zinc-500">Institutional Terminal</p>
            </div>
          )}
        </div>
      </div>

      {/* Ctrl+K Search Bar */}
      <div className="px-3 pt-3 pb-2">
        <button
          onClick={onOpenCommandPalette}
          className={`w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-zinc-900 border border-[rgba(255,255,255,0.07)] text-zinc-500 text-xs hover:border-zinc-600 hover:text-zinc-300 transition-all group ${!isCollapsed ? "px-3" : "px-0"}`}
          title={isCollapsed ? "Search (⌘K)" : ""}
        >
          <Command className="w-3.5 h-3.5 flex-shrink-0" />
          {!isCollapsed && (
            <>
              <span className="flex-1 text-left whitespace-nowrap overflow-hidden">Search or jump to...</span>
              <kbd className="px-1.5 py-0.5 text-[9px] font-mono bg-zinc-800 border border-[rgba(255,255,255,0.1)] rounded opacity-70 group-hover:opacity-100 flex-shrink-0">⌘K</kbd>
            </>
          )}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-2 py-1 space-y-0.5">
        {/* Core Nav */}
        <div className="mb-4">
          {!isCollapsed && <p className="px-3 text-[10px] font-bold text-zinc-600 tracking-wider mb-2 mt-2 whitespace-nowrap overflow-hidden">CORE OS</p>}
          {isCollapsed && <div className="h-4"></div>}
          {TOP_NAV.map(item => {
            const Icon = item.icon;
            const active = item.href ? isActive(item.href) : false;
            return (
              <Link
                key={item.id}
                href={item.href || "#"}
                title={isCollapsed ? item.label : ""}
                className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-[13px] font-medium transition-all duration-150 ${isCollapsed ? "justify-center" : ""} ${
                  active
                    ? "bg-blue-500/15 text-blue-300 border border-blue-500/25"
                    : "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/60 border border-transparent"
                }`}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                {!isCollapsed && <span className="whitespace-nowrap">{item.label}</span>}
                {!isCollapsed && active && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-400 flex-shrink-0" />}
              </Link>
            );
          })}
        </div>

        {/* Dynamic Favorites */}
        {favorites.length > 0 && (
          <div className="mb-4">
            {!isCollapsed && <p className="px-3 text-[10px] font-bold text-zinc-600 tracking-wider mb-2 whitespace-nowrap overflow-hidden">PINNED TOOLS</p>}
            {isCollapsed && <div className="h-4 border-t border-[rgba(255,255,255,0.07)]/30 mx-2 mt-2 mb-4"></div>}
            {favorites.map(favId => {
              const navItem = NAVIGATION.find(n => n.id === favId);
              if (!navItem || !navItem.href) return null;
              const Icon = navItem.icon;
              const active = isActive(navItem.href);
              
              return (
                <Link
                  key={navItem.id}
                  href={navItem.href}
                  title={isCollapsed ? navItem.label : ""}
                  className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-[13px] font-medium transition-all duration-150 ${isCollapsed ? "justify-center" : ""} ${
                    active
                      ? "bg-blue-500/15 text-blue-300 border border-blue-500/25"
                      : "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/60 border border-transparent"
                  }`}
                >
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  {!isCollapsed && <span className="whitespace-nowrap">{navItem.label}</span>}
                  {!isCollapsed && active && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-400 flex-shrink-0" />}
                </Link>
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
          <span>{focusMode ? "Exit Focus Mode" : "Focus Mode"}</span>
          <kbd className="ml-auto text-[9px] font-mono text-zinc-600 bg-zinc-800/80 px-1 py-0.5 rounded">⌃⇧F</kbd>
        </button>

        <div className="px-3 py-1.5 text-[10px] text-zinc-700 text-center">TradeZella v1.0</div>
      </div>
    </aside>
  );
};

export default Sidebar;

