"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useFavorites } from "@/hooks/useFavorites";
import { NAV_PILLARS } from "@/components/layout/navigation";
import {
  Search, Terminal, ShieldAlert, ChevronRight, Command, Star,
  Compass, Zap, Calculator, Radio, BookOpen, Globe, List, CheckCircle2
} from "lucide-react";

interface CommandItem {
  id: string;
  label: string;
  description?: string;
  icon: any;
  category: "ACTIONS (DO)" | string;
  action: () => void;
  keywords?: string[];
}

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
}

export default function CommandPalette({ open, onClose }: CommandPaletteProps) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const { favorites, toggleFavorite } = useFavorites();

  const navigate = useCallback((href: string) => {
    router.push(href);
    onClose();
  }, [router, onClose]);

  const commands = useMemo<CommandItem[]>(() => {
    // Action layer (DO)
    const actionLayer: CommandItem[] = [
      {
        id: "act-trade",
        label: "Execute Order / Open Terminal",
        description: "Direct MT5 institutional execution desk",
        icon: Terminal,
        category: "ACTIONS (DO)",
        action: () => navigate("/terminal"),
        keywords: ["buy", "sell", "order", "execute", "trade", "mt5", "terminal"],
      },
      {
        id: "act-scan",
        label: "Scan for A+ Confluences & Setups",
        description: "Run algorithmic ICT scanner for FVG, sweeps, and structure shifts",
        icon: Radio,
        category: "ACTIONS (DO)",
        action: () => navigate("/signals"),
        keywords: ["scan", "signals", "setup", "fvg", "sweep", "confluence", "opportunities"],
      },
      {
        id: "act-calc",
        label: "Calculate 1% Risk & Lot Size",
        description: "Instant contract sizing based on stop loss distance and account balance",
        icon: Calculator,
        category: "ACTIONS (DO)",
        action: () => navigate("/calculators"),
        keywords: ["calculate", "lot size", "risk", "1%", "contracts", "pips", "sizer"],
      },
      {
        id: "act-manage",
        label: "Manage Live Positions & Floating PnL",
        description: "Inspect open tickets, trailing stops, and active exposure",
        icon: List,
        category: "ACTIONS (DO)",
        action: () => navigate("/positions"),
        keywords: ["positions", "tickets", "pnl", "floating", "close", "partial", "manage"],
      },
      {
        id: "act-guard",
        label: "Verify Drawdown Guard & Prop Firm Limits",
        description: "Check daily loss limits, trailing drawdown room, and compliance checklist",
        icon: ShieldAlert,
        category: "ACTIONS (DO)",
        action: () => navigate("/risk"),
        keywords: ["panic", "risk", "drawdown", "lockout", "funded", "compliance", "guard"],
      },
      {
        id: "act-macro",
        label: "Check Environment: XAUUSD & Macro Desk",
        description: "Multi-asset correlation, bond yields, DXY, and higher timeframe bias",
        icon: Globe,
        category: "ACTIONS (DO)",
        action: () => navigate("/macro/XAUUSD"),
        keywords: ["macro", "gold", "xauusd", "dxy", "environment", "yields", "bias"],
      },
      {
        id: "act-journal",
        label: "Log Trade to Daily Journal",
        description: "Create new entry: log entry price, chart screenshot, and psychological state",
        icon: BookOpen,
        category: "ACTIONS (DO)",
        action: () => navigate("/journal"),
        keywords: ["journal", "log", "diary", "new trade", "screenshot", "mistake"],
      },
      {
        id: "act-review",
        label: "Audit Session & Grade Trades (A+, B, C)",
        description: "Post-session execution review and mistake analysis",
        icon: CheckCircle2,
        category: "ACTIONS (DO)",
        action: () => navigate("/review"),
        keywords: ["review", "grade", "audit", "debrief", "score"],
      },
      {
        id: "act-ecosystem",
        label: "Open Ecosystem Blueprint / Sitemap",
        description: "Bird's-eye view of all 30 screens and their lifecycle roles",
        icon: Compass,
        category: "ACTIONS (DO)",
        action: () => {
          onClose();
          window.dispatchEvent(new KeyboardEvent("keydown", { key: "m", ctrlKey: true }));
        },
        keywords: ["map", "blueprint", "sitemap", "all pages", "explore", "ecosystem"],
      },
    ];

    // Navigation layer (WHERE)
    const pillarCommands: CommandItem[] = NAV_PILLARS.flatMap((pillar) =>
      pillar.items.map((item) => ({
        id: item.id,
        label: `${item.label} — ${item.role}`,
        description: item.description,
        icon: item.icon,
        category: `Pillar: ${pillar.label}`,
        action: () => navigate(item.href),
        keywords: [
          item.badge?.toLowerCase(),
          item.href,
          item.role.toLowerCase(),
          pillar.shortLabel.toLowerCase(),
        ].filter(Boolean) as string[],
      }))
    );

    return [...actionLayer, ...pillarCommands];
  }, [navigate, onClose]);

  const filtered = useMemo(() => {
    if (query.trim() === "") return commands;
    const q = query.toLowerCase();
    return commands.filter((cmd) => {
      return (
        cmd.label.toLowerCase().includes(q) ||
        cmd.description?.toLowerCase().includes(q) ||
        cmd.keywords?.some((k) => k.includes(q))
      );
    });
  }, [commands, query]);

  const grouped = useMemo(() => {
    return filtered.reduce<Record<string, CommandItem[]>>((acc, cmd) => {
      if (!acc[cmd.category]) acc[cmd.category] = [];
      acc[cmd.category].push(cmd);
      return acc;
    }, {});
  }, [filtered]);

  const flatFiltered = useMemo(() => Object.values(grouped).flat(), [grouped]);

  useEffect(() => {
    if (open) {
      setQuery("");
      setSelected(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  useEffect(() => {
    setSelected(0);
  }, [query]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (!open) return;
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelected((s) => Math.min(s + 1, flatFiltered.length - 1));
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelected((s) => Math.max(s - 1, 0));
      }
      if (e.key === "Enter") {
        e.preventDefault();
        flatFiltered[selected]?.action();
      }
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open, flatFiltered, selected, onClose]);

  if (!open) return null;

  let globalIndex = 0;

  return (
    <div className="fixed inset-0 z-[9999] flex items-start justify-center pt-[12vh]" onClick={onClose}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" />

      {/* Modal Container */}
      <div
        className="relative w-full max-w-2xl mx-4 bg-[#0E1117] border border-white/10 rounded-xl shadow-[0_25px_60px_rgba(0,0,0,0.95)] overflow-hidden animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Bar */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-white/[0.08] bg-white/[0.02]">
          <Zap className="w-5 h-5 text-blue-400 flex-shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type an action (e.g. Execute, 1% Risk, Scan, Journal) or search screens..."
            className="flex-1 bg-transparent text-sm text-white placeholder:text-zinc-500 outline-none"
          />
          <div className="flex items-center gap-1.5">
            <kbd className="px-1.5 py-0.5 text-[10px] font-mono text-zinc-400 bg-zinc-800 border border-white/10 rounded">
              ESC
            </kbd>
          </div>
        </div>

        {/* Results */}
        <div className="max-h-[60vh] overflow-y-auto py-2 scrollbar-thin">
          {flatFiltered.length === 0 && (
            <div className="py-12 text-center text-zinc-500 text-sm">No actions found for "{query}"</div>
          )}
          {Object.entries(grouped).map(([category, items]) => (
            <div key={category}>
              <div className="px-4 pt-3 pb-1 flex items-center justify-between">
                <span className={`text-[10px] font-bold uppercase tracking-widest ${category.startsWith("ACTIONS") ? "text-blue-400" : "text-zinc-500"}`}>
                  {category}
                </span>
                {category.startsWith("ACTIONS") && (
                  <span className="text-[9px] font-mono text-blue-400/80 bg-blue-500/10 px-1.5 py-0.2 rounded">
                    DO LAYER
                  </span>
                )}
              </div>
              {items.map((cmd) => {
                const idx = globalIndex++;
                const isSelected = idx === selected;
                const Icon = cmd.icon;
                const isAction = cmd.category.startsWith("ACTIONS");

                return (
                  <div
                    key={cmd.id}
                    onClick={cmd.action}
                    onMouseEnter={() => setSelected(idx)}
                    className={`w-full flex items-center cursor-pointer gap-3 px-4 py-2.5 text-sm transition-colors ${
                      isSelected
                        ? "bg-blue-500/15 text-blue-300 border-l-2 border-blue-400"
                        : "text-zinc-300 hover:bg-zinc-800/40 border-l-2 border-transparent"
                    }`}
                  >
                    <div
                      className={`w-7 h-7 rounded flex items-center justify-center flex-shrink-0 ${
                        isAction
                          ? isSelected ? "bg-blue-500/25 text-blue-300" : "bg-blue-500/10 text-blue-400"
                          : isSelected ? "bg-zinc-700 text-white" : "bg-zinc-800/80 text-zinc-400"
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <div className="flex flex-col flex-1 min-w-0">
                      <span className="text-[13px] font-medium text-white truncate">{cmd.label}</span>
                      {cmd.description && (
                        <span className="text-[11px] text-zinc-500 truncate">{cmd.description}</span>
                      )}
                    </div>

                    <ChevronRight
                      className={`w-4 h-4 flex-shrink-0 ${isSelected ? "text-blue-400" : "text-zinc-700"}`}
                    />
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        {/* Footer Hint */}
        <div className="border-t border-white/[0.08] px-4 py-2.5 bg-black/40 flex items-center justify-between text-[11px] text-zinc-500">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <kbd className="px-1 py-0.5 bg-zinc-800 border border-white/10 rounded text-[10px] font-mono text-zinc-300">
                ↑↓
              </kbd>{" "}
              navigate
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1 py-0.5 bg-zinc-800 border border-white/10 rounded text-[10px] font-mono text-zinc-300">
                ↵
              </kbd>{" "}
              execute
            </span>
          </div>

          <span className="text-[10px] font-mono text-zinc-500">Action & Navigation Layer</span>
        </div>
      </div>
    </div>
  );
}
