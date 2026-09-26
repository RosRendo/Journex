"use client";

import React from "react";
import {
  Globe,
  Radio,
  Terminal,
  List,
  Bot,
  ShieldAlert,
  Calculator,
  Code,
  CalendarDays,
  Cpu,
  BookOpen,
  CheckCircle2,
  BarChart3,
  Bell,
  Sparkles,
  ExternalLink,
} from "lucide-react";
import Link from "next/link";

interface ToolItem {
  id: string;
  name: string;
  category: "Execution" | "Intel" | "Risk" | "Audit";
  icon: any;
  peekType: string;
  href: string;
  badge?: string;
  accent: string;
  status?: string;
}

interface EcosystemContextLauncherProps {
  onOpenPeek: (type: string, data?: any) => void;
  activeSymbol?: string;
}

export const ECOSYSTEM_TOOLS: ToolItem[] = [
  {
    id: "macro",
    name: "Macro Desk",
    category: "Intel",
    icon: Globe,
    peekType: "macro_deck",
    href: "/macro/XAUUSD",
    badge: "BIAS",
    accent: "#f59e0b",
    status: "Bullish D1",
  },
  {
    id: "signals",
    name: "Scanner",
    category: "Execution",
    icon: Radio,
    peekType: "setup_inspector",
    href: "/signals",
    badge: "SETUPS",
    accent: "#3b82f6",
    status: "A+ Setup",
  },
  {
    id: "terminal",
    name: "Terminal",
    category: "Execution",
    icon: Terminal,
    peekType: "stage_order",
    href: "/terminal",
    badge: "MT5",
    accent: "#20e0b2",
    status: "1-Click",
  },
  {
    id: "positions",
    name: "Positions",
    category: "Execution",
    icon: List,
    peekType: "open_positions",
    href: "/positions",
    accent: "#06b6d4",
    status: "Exposure",
  },
  {
    id: "bot",
    name: "Bot EA",
    category: "Execution",
    icon: Bot,
    peekType: "bot_telemetry",
    href: "/bot",
    badge: "AUTO",
    accent: "#8b5cf6",
    status: "Active",
  },
  {
    id: "script",
    name: "Scripts",
    category: "Execution",
    icon: Code,
    peekType: "script_runner",
    href: "/script",
    badge: "PANIC",
    accent: "#ef4444",
    status: "Hotkeys",
  },
  {
    id: "risk",
    name: "Risk Guard",
    category: "Risk",
    icon: ShieldAlert,
    peekType: "risk_guard",
    href: "/risk",
    badge: "1% CAP",
    accent: "#10b981",
    status: "Safe",
  },
  {
    id: "calculators",
    name: "Calculator",
    category: "Risk",
    icon: Calculator,
    peekType: "risk_calculator",
    href: "/calculators",
    accent: "#f5c451",
    status: "Lot Sizer",
  },
  {
    id: "calendar",
    name: "News & Events",
    category: "Intel",
    icon: CalendarDays,
    peekType: "calendar_detail",
    href: "/calendar",
    badge: "CPI",
    accent: "#ff5c73",
    status: "13:30 UTC",
  },
  {
    id: "journal",
    name: "Journal",
    category: "Audit",
    icon: BookOpen,
    peekType: "quick_journal",
    href: "/journal",
    accent: "#38bdf8",
    status: "Reflect",
  },
  {
    id: "review",
    name: "Review Hub",
    category: "Audit",
    icon: CheckCircle2,
    peekType: "review_hub",
    href: "/review",
    accent: "#20e0b2",
    status: "Debrief",
  },
  {
    id: "analytics",
    name: "Analytics",
    category: "Audit",
    icon: BarChart3,
    peekType: "trades_log",
    href: "/analytics",
    accent: "#10b981",
    status: "Edge 68%",
  },
  {
    id: "alerts",
    name: "Alerts",
    category: "Intel",
    icon: Bell,
    peekType: "alerts_monitor",
    href: "/alerts",
    accent: "#f59e0b",
    status: "4 Armed",
  },
];

export const EcosystemContextLauncher: React.FC<EcosystemContextLauncherProps> = ({
  onOpenPeek,
  activeSymbol = "XAUUSD",
}) => {
  return (
    <div className="bg-[#0e0e12] border border-[rgba(255,255,255,0.07)] rounded-xl p-2.5 shadow-xl overflow-hidden">
      <div className="flex items-center justify-between pb-2 mb-2 border-b border-[rgba(255,255,255,0.06)] px-1">
        <div className="flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-[#20e0b2]" />
          <span className="text-[10px] font-black uppercase tracking-widest text-[#f4f4f5] font-mono">
            Ecosystem Context Strip
          </span>
          <span className="text-[9px] text-[#71717a] font-mono hidden md:inline">
            · 1-Click slide-over peek into any platform tool without leaving Cockpit
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-[9px] font-mono text-[#71717a]">
          <span className="w-1.5 h-1.5 rounded-full bg-[#20e0b2]" />
          <span>{ECOSYSTEM_TOOLS.length} Connected Modules</span>
        </div>
      </div>

      {/* Horizontal Scrollable Quick-Peek Chips */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-[rgba(255,255,255,0.1)]">
        {ECOSYSTEM_TOOLS.map((tool) => {
          const Icon = tool.icon;
          return (
            <div
              key={tool.id}
              className="flex items-center shrink-0 rounded-lg bg-[#141419] hover:bg-[#181820] border border-[rgba(255,255,255,0.06)] hover:border-[rgba(255,255,255,0.15)] transition-all group p-1 pr-2"
            >
              {/* Peek Trigger (Opens Drawer Context) */}
              <button
                onClick={() => onOpenPeek(tool.peekType, { symbol: activeSymbol, toolId: tool.id })}
                className="flex items-center gap-2 text-left px-1.5 py-1"
                title={`Quick Peek: ${tool.name}`}
              >
                <div
                  className="w-6 h-6 rounded-md flex items-center justify-center transition-transform group-hover:scale-105"
                  style={{ backgroundColor: `${tool.accent}18`, color: tool.accent }}
                >
                  <Icon className="w-3.5 h-3.5" />
                </div>
                <div className="flex flex-col">
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] font-black text-[#f4f4f5] font-mono group-hover:text-white transition-colors">
                      {tool.name}
                    </span>
                    {tool.badge && (
                      <span
                        className="text-[7px] font-black px-1 rounded uppercase tracking-wider font-mono leading-none py-0.5"
                        style={{ backgroundColor: `${tool.accent}20`, color: tool.accent }}
                      >
                        {tool.badge}
                      </span>
                    )}
                  </div>
                  <span className="text-[8px] text-[#71717a] font-mono leading-tight">
                    {tool.status}
                  </span>
                </div>
              </button>

              {/* Direct Route Link */}
              <Link
                href={tool.href}
                className="p-1 text-[#52525b] hover:text-[#20e0b2] transition-colors rounded hover:bg-[rgba(255,255,255,0.05)] ml-1"
                title={`Navigate to full ${tool.name} page`}
              >
                <ExternalLink className="w-3 h-3" />
              </Link>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default EcosystemContextLauncher;
