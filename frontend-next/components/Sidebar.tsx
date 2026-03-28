"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  LayoutDashboard,
  BookOpen,
  CalendarDays,
  BarChart3,
  Wallet,
  Crosshair,
  Settings,
  TrendingUp,
  PieChart,
  Eye,
  Bell,
  Zap,
  Code,
  RotateCcw,
  LucideIcon,
  ChevronDown,
  Users,
} from "lucide-react";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

interface NavGroup {
  title: string;
  icon: LucideIcon;
  items: Array<{ href: string; label: string }>;
}

const Sidebar = () => {
  const pathname = usePathname();

  const [expandedGroups, setExpandedGroups] = useState<string[]>([
    "Trading Bots",
    "Risk Management",
    "Live Monitoring",
    "Analysis & Trading",
    "Funded Account",
  ]);

  const toggleGroup = (groupId: string) => {
    setExpandedGroups((prev) =>
      prev.includes(groupId)
        ? prev.filter((id) => id !== groupId)
        : [...prev, groupId],
    );
  };

  // Auto-expand the group that contains the current route
  const isActiveHref = (href: string) => pathname === href;
  const isActiveGroup = (items: Array<{ href: string }>) =>
    items.some((item) => pathname === item.href);

  // Main Quick Navigation
  const mainNav: NavItem[] = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/journal", label: "Journal", icon: BookOpen },
    { href: "/calendar", label: "Calendar", icon: CalendarDays },
    { href: "/analytics", label: "Analytics", icon: BarChart3 },
    { href: "/accounts", label: "Accounts", icon: Wallet },
    { href: "/community", label: "Community", icon: Users },
    { href: "/strategies", label: "Strategies", icon: Crosshair },
    { href: "/alerts", label: "Alerts", icon: Bell },
    { href: "/settings", label: "Settings", icon: Settings },
  ];

  // Trading Tools Groups
  const tradingTools: NavGroup[] = [
    {
      title: "Risk Management",
      icon: PieChart,
      items: [
        { href: "/risk", label: "Calculate Risk" },
        { href: "/wrandrr", label: "Win Rate & RR Analysis" },
        { href: "/loteachpair", label: "Lot Each Pair" },
        { href: "/RiskTableCalculation", label: "Risk Table Calculation" },
      ],
    },
    {
      title: "Funded Account",
      icon: Wallet,
      items: [{ href: "/fundedrequire", label: "Funded Requirements" }],
    },
    {
      title: "Trading Bots",
      icon: Zap,
      items: [
        { href: "/bot", label: "BOT (Trading)" },
      ],
    },
    {
      title: "Analysis & Trading",
      icon: TrendingUp,
      items: [
        { href: "/sentiment", label: "Sentiment Data" },
        { href: "/pipreference", label: "PIP Movement Table" },
        { href: "/tradingstyle", label: "Trading Style & Planning" },
        { href: "/indicator", label: "Indicators & Tools" },
      ],
    },
    {
      title: "Live Monitoring",
      icon: Eye,
      items: [
        { href: "/livemonitorchart", label: "Live Monitor Chart" },
        { href: "/notificationandmonitor", label: "Notifications & Alerts" },
        { href: "/positions", label: "Active Positions" },
        { href: "/news", label: "News & Macro Insights" },
      ],
    },
    {
      title: "Trading Simulators",
      icon: Crosshair,
      items: [
        { href: "/GoldTradingSimulator", label: "Gold Simulator" },
        { href: "/FlexibleGoldSimulator", label: "Flexible Simulator" },
      ],
    },
    {
      title: "Advanced Tools",
      icon: Code,
      items: [
        { href: "/script", label: "Scripts" },
        { href: "/layout", label: "Custom Layout" },
      ],
    },
    {
      title: "Backtesting",
      icon: RotateCcw,
      items: [{ href: "/backtesting", label: "Backtesting & Replay" }],
    },
  ];

  return (
    <aside className="w-72 h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 text-foreground overflow-y-auto border-r border-slate-700 dark:border-border flex flex-col flex-shrink-0">
      {/* Header */}
      <div className="sticky top-0 bg-slate-900/95 dark:bg-gray-950/95 p-6 border-b border-slate-700 dark:border-border backdrop-blur-sm z-10">
        <h1 className="text-2xl font-bold tracking-wide flex items-center gap-2">
          📊 TradeZella
        </h1>
        <p className="text-xs text-slate-400 dark:text-muted-foreground mt-1">
          Trading Journal & Tools
        </p>
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 overflow-y-auto">
        {/* Quick Access */}
        <div className="p-4 border-b border-slate-700 dark:border-border">
          <p className="text-xs font-semibold text-slate-400 dark:text-muted-foreground mb-3 px-2 uppercase tracking-wider">
            Quick Access
          </p>
          <div className="space-y-1">
            {mainNav.map(({ href, label, icon: Icon }) => {
              const active = isActiveHref(href);
              return (
                <Link
                  key={href}
                  href={href}
                  className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm transition-all duration-200 ${active
                    ? "bg-blue-600/20 text-blue-400 border border-blue-500/30"
                    : "text-slate-300 dark:text-muted-foreground hover:text-blue-400 dark:hover:text-blue-300 hover:bg-slate-700/50 dark:hover:bg-muted border border-border/50 text-foreground/30"
                    }`}
                >
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  <span className="truncate">{label}</span>
                  {active && (
                    <span className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-400" />
                  )}
                </Link>
              );
            })}
          </div>
        </div>

        {/* Trading Tools Groups */}
        <div className="p-4 space-y-1">
          <p className="text-xs font-semibold text-slate-400 dark:text-muted-foreground mb-3 px-2 uppercase tracking-wider">
            Trading Tools
          </p>
          {tradingTools.map((group) => {
            const groupActive = isActiveGroup(group.items);
            const isExpanded = expandedGroups.includes(group.title);

            return (
              <div key={group.title} className="mb-1">
                {/* Group Header */}
                <button
                  onClick={() => toggleGroup(group.title)}
                  className={`w-full flex items-center justify-between px-4 py-2.5 rounded-lg transition-colors duration-200 text-sm font-semibold ${groupActive
                    ? "bg-blue-600/10 text-blue-400"
                    : "text-slate-200 dark:text-foreground/80 hover:text-blue-400 dark:hover:text-blue-400 hover:bg-slate-700/50 dark:hover:bg-muted border border-border/50 text-foreground/30"
                    }`}
                >
                  <span className="flex items-center gap-2">
                    <group.icon className="w-4 h-4 flex-shrink-0" />
                    <span className="truncate">{group.title}</span>
                  </span>
                  <ChevronDown
                    className={`w-4 h-4 flex-shrink-0 transition-transform duration-200 ${isExpanded ? "rotate-180" : ""
                      }`}
                  />
                </button>

                {/* Group Items */}
                {isExpanded && (
                  <div className="ml-4 mt-1 space-y-0.5 border-l-2 border-slate-700 dark:border-border pl-3">
                    {group.items.map(({ href, label }) => {
                      const active = isActiveHref(href);
                      return (
                        <Link
                          key={href}
                          href={href}
                          className={`block px-4 py-2 rounded-md text-sm transition-all duration-150 ${active
                            ? "bg-blue-600/20 text-blue-400 border-l-2 border-blue-500 -ml-px pl-[calc(1rem-1px)]"
                            : "text-slate-300 dark:text-muted-foreground hover:text-blue-400 dark:hover:text-blue-300 hover:bg-slate-700/50 dark:hover:bg-muted border border-border/50 text-foreground/30 hover:translate-x-0.5"
                            }`}
                        >
                          {label}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </nav>

      {/* Footer */}
      <div className="border-t border-slate-700 dark:border-border p-4 bg-slate-900/50 dark:bg-gray-950/50">
        <p className="text-xs text-slate-500 dark:text-gray-600 text-center">
          🚀 TradeZella v1.0
        </p>
      </div>
    </aside>
  );
};

export default Sidebar;
