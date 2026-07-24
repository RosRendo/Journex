"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import {
  LayoutDashboard, Terminal, Radar, BarChart3, ShieldAlert,
  Settings, Calculator, Activity, ChevronDown, ChevronRight,
  BookOpen, CalendarDays, TrendingUp, CheckCircle2, AlertTriangle,
  Percent, BarChart2, Grid, Target, Zap, RotateCcw, Code, Newspaper,
  Bell, Users, Wallet, Eye, Crosshair, Shield, Command, Maximize2,
} from "lucide-react";
import { useFocusMode } from "./providers/FocusModeProvider";

interface NavChild { href: string; label: string; }
interface NavItem {
  id: string;
  label: string;
  icon: any;
  href?: string;
  badge?: string;
  children?: NavChild[];
}

// TOP-LEVEL: 8 items max
const TOP_NAV: NavItem[] = [
  { id: "dashboard", label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { id: "terminal", label: "Terminal", href: "/terminal", icon: Terminal },
  { id: "signals", label: "Scanner", href: "/signals", icon: Radar },
  {
    id: "performance",
    label: "Performance",
    icon: BarChart3,
    children: [
      { href: "/analytics", label: "Analytics" },
      { href: "/journal", label: "Trade Journal" },
      { href: "/journals", label: "AI Journals" },
      { href: "/review", label: "Trade Review" },
      { href: "/review/daily", label: "Daily Review" },
      { href: "/progress", label: "Challenge Tracker" },
      { href: "/strategies", label: "Strategies" },
      { href: "/wrandrr", label: "Win Rate & RR" },
    ],
  },
  {
    id: "risk",
    label: "Risk",
    icon: ShieldAlert,
    children: [
      { href: "/risk", label: "Risk Calculator" },
      { href: "/RiskTableCalculation", label: "Risk Table" },
      { href: "/loteachpair", label: "Lot Per Pair" },
      { href: "/fundedrequire", label: "Funded Rules" },
      { href: "/validation", label: "Pre-Trade Check" },
    ],
  },
  {
    id: "analysis",
    label: "Analysis",
    icon: Activity,
    children: [
      { href: "/sentiment", label: "Market Sentiment" },
      { href: "/news", label: "Macro Desk" },
      { href: "/calendar", label: "Economic Calendar" },
      { href: "/indicator", label: "Indicators" },
      { href: "/tradingstyle", label: "Trading Style" },
    ],
  },
  {
    id: "tools",
    label: "Tools",
    icon: Zap,
    children: [
      { href: "/backtesting", label: "Backtesting" },
      { href: "/GoldTradingSimulator", label: "Gold Simulator" },
      { href: "/bot", label: "Trading Bots" },
      { href: "/accounts", label: "Accounts" },
      { href: "/community", label: "Community" },
      { href: "/alerts", label: "Alerts" },
      { href: "/script", label: "Scripts" },
    ],
  },
  { id: "settings", label: "Settings", href: "/settings", icon: Settings },
];

interface SidebarProps {
  onOpenCommandPalette?: () => void;
}

const Sidebar = ({ onOpenCommandPalette }: SidebarProps) => {
  const pathname = usePathname();
  const { focusMode, toggleFocusMode } = useFocusMode();
  const [expanded, setExpanded] = useState<string[]>([]);

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
    <aside className={`w-[220px] h-screen bg-[#0A0C10] border-r border-zinc-800/60 flex flex-col flex-shrink-0 transition-all duration-300 ${focusMode ? "opacity-30 pointer-events-none" : ""}`}>
      {/* Logo */}
      <div className="px-5 py-4 border-b border-zinc-800/60">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-blue-500/20 border border-blue-500/40 flex items-center justify-center">
            <span className="text-blue-400 text-xs font-bold">T</span>
          </div>
          <div>
            <p className="text-sm font-bold text-white tracking-tight">TradeZella</p>
            <p className="text-[10px] text-zinc-500">Institutional Terminal</p>
          </div>
        </div>
      </div>

      {/* Ctrl+K Search Bar */}
      <div className="px-3 pt-3 pb-2">
        <button
          onClick={onOpenCommandPalette}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-500 text-xs hover:border-zinc-600 hover:text-zinc-300 transition-all group"
        >
          <Command className="w-3.5 h-3.5" />
          <span className="flex-1 text-left">Search or jump to...</span>
          <kbd className="px-1.5 py-0.5 text-[9px] font-mono bg-zinc-800 border border-zinc-700 rounded opacity-70 group-hover:opacity-100">⌘K</kbd>
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-2 py-1 space-y-0.5">
        {TOP_NAV.map(item => {
          const Icon = item.icon;
          const active = item.href ? isActive(item.href) : false;
          const groupActive = isGroupActive(item.children);
          const isExpanded = expanded.includes(item.id);

          if (item.href && !item.children) {
            // Simple link
            return (
              <Link
                key={item.id}
                href={item.href}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium transition-all duration-150 ${
                  active
                    ? "bg-blue-500/15 text-blue-300 border border-blue-500/25"
                    : "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/60"
                }`}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                <span>{item.label}</span>
                {active && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-400 flex-shrink-0" />}
              </Link>
            );
          }

          // Group with children
          return (
            <div key={item.id}>
              <button
                onClick={() => toggle(item.id)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium transition-all duration-150 ${
                  groupActive
                    ? "text-blue-300 bg-blue-500/10"
                    : "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/60"
                }`}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                <span className="flex-1 text-left">{item.label}</span>
                {groupActive && !isExpanded && <span className="w-1.5 h-1.5 rounded-full bg-blue-400 flex-shrink-0" />}
                <ChevronDown className={`w-3.5 h-3.5 flex-shrink-0 text-zinc-600 transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`} />
              </button>

              {isExpanded && (
                <div className="ml-3 mt-0.5 mb-1 pl-3 border-l border-zinc-800 space-y-0.5">
                  {item.children?.map(child => (
                    <Link
                      key={child.href}
                      href={child.href}
                      className={`block px-2.5 py-1.5 rounded-md text-[12px] transition-all duration-150 ${
                        isActive(child.href)
                          ? "text-blue-300 bg-blue-500/15 font-medium"
                          : "text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800/50"
                      }`}
                    >
                      {child.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* Footer Actions */}
      <div className="border-t border-zinc-800/60 p-3 space-y-1">
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
