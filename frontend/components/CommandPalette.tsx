"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useFavorites } from "@/hooks/useFavorites";
import {
  Search, LayoutDashboard, Terminal, Radar, BookOpen, BarChart3,
  ShieldAlert, Settings, Calculator, TrendingUp, Newspaper,
  Bell, Users, Wallet, LogOut, Zap, RotateCcw, Target,
  ChevronRight, Command, X, Activity, Cpu, Layers, DollarSign, Bot, FileText, Bookmark, CreditCard, Code, Star,
  LineChart, Eye, Microscope, Radio, BarChart2, Globe, Monitor, Gamepad2,
  PieChart, Gauge, List, Repeat, AlertOctagon, Lock, TrendingDown, CalendarDays
} from "lucide-react";

interface Command {
  id: string;
  label: string;
  description?: string;
  icon: any;
  category: string;
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

  const commands: Command[] = [
    // Navigation
    { 
      id: "dashboard", 
      label: "Go to Dashboard", 
      description: "Overview, KPIs, and aggregate trading logs", 
      icon: LayoutDashboard, 
      category: "Navigate", 
      action: () => navigate("/dashboard"), 
      keywords: ["home", "overview", "pnl", "ledger", "active positions"] 
    },
    { 
      id: "journal", 
      label: "Open Journal", 
      description: "Log entries, review past trades, and CSV import", 
      icon: BookOpen, 
      category: "Navigate", 
      action: () => navigate("/journal"), 
      keywords: ["log", "review", "history", "import csv", "screenshots", "ai journals"] 
    },
    { 
      id: "calendar", 
      label: "Economic Calendar", 
      description: "Monthly performance tiles and high-impact macro news events", 
      icon: Newspaper, 
      category: "Navigate", 
      action: () => navigate("/calendar"), 
      keywords: ["economic", "calendar", "news", "fomc", "nfp", "events", "pnl calendar"] 
    },
    { 
      id: "risk", 
      label: "Risk & Compliance Desk", 
      description: "Drawdown guard limits, pre-trade checkmarks, and prop firm verification", 
      icon: ShieldAlert, 
      category: "Navigate", 
      action: () => navigate("/risk"), 
      keywords: ["risk hub", "drawdown guard", "exposure", "funded rules", "validation checklist", "compliance", "panic mode", "lock terminal"] 
    },
    { 
      id: "calculators", 
      label: "Calculators Hub", 
      description: "Lot sizer calculators, pip contracts, and win-rate rr simulators", 
      icon: Calculator, 
      category: "Navigate", 
      action: () => navigate("/calculators"), 
      keywords: ["lot sizer", "pip reference", "expectancy simulator", "wrandrr", "risk table", "broker terminal"] 
    },
    { 
      id: "practice", 
      label: "Practice Terminal", 
      description: "Simulator workspace for standard, fixed, and flexible gold trading rules", 
      icon: Terminal, 
      category: "Navigate", 
      action: () => navigate("/practice"), 
      keywords: ["gold simulator", "fixed rules", "flexible margin", "backtesting", "simulators", "tick chart"] 
    },
    { 
      id: "playbook", 
      label: "Playbook & AI Coach", 
      description: "AI coach feedback chat, strategy performance, and whiteboard lessons", 
      icon: Cpu, 
      category: "Navigate", 
      action: () => navigate("/playbook"), 
      keywords: ["ai desk", "ai coach", "ai report", "strategies library", "lessons ledger", "whiteboard", "trading plan editor", "plan forge"] 
    },
    { 
      id: "settings", 
      label: "Settings", 
      description: "Configure system preferences and broker bridges", 
      icon: Settings, 
      category: "Navigate", 
      action: () => navigate("/settings"), 
      keywords: ["config", "broker", "mt5", "api keys", "dark mode"] 
    },

    // Auxiliary / External Links
    { id: "community", label: "Community", description: "Shared setups & discussion", icon: Users, category: "Navigate", action: () => navigate("/community"), keywords: ["social", "chat"] },
    { id: "bot", label: "Trading Bot", description: "Automated trading EA configurations", icon: Bot, category: "Navigate", action: () => navigate("/bot"), keywords: ["ea", "bot", "auto"] },
    { id: "pricing", label: "Pricing", description: "Subscription plans & billing limits", icon: CreditCard, category: "Navigate", action: () => navigate("/pricing") },
    { id: "profile", label: "User Profile", description: "Manage avatar and active stats", icon: Users, category: "Navigate", action: () => navigate("/profile") },
    { id: "script", label: "MT5 Scripts", description: "Run automated execution scripts", icon: Code, category: "Navigate", action: () => navigate("/script") },
    
    // Quick Actions
    { id: "new-trade", label: "New Trade", description: "Open terminal execution", icon: Terminal, category: "Quick Actions", action: () => navigate("/terminal"), keywords: ["buy", "sell", "execute"] },
    { id: "panic", label: "Panic Lock Trigger", description: "Trigger panic mode visual overlay on risk desk", icon: ShieldAlert, category: "Quick Actions", action: () => navigate("/risk"), keywords: ["panic", "lock", "close all", "tilt"] },

    // ── ALL PAGES ─────────────────────────────────────────────────────
    // Analytics & Performance
    { id: "analytics", label: "Analytics", description: "Deep trade analytics and statistics", icon: BarChart3, category: "All Pages", action: () => navigate("/analytics"), keywords: ["stats", "analytics", "charts"] },
    { id: "performance", label: "Performance", description: "Account-level performance breakdown", icon: LineChart, category: "All Pages", action: () => navigate("/performance"), keywords: ["performance", "return", "pnl breakdown"] },
    { id: "sentiment", label: "Market Sentiment", description: "Retail sentiment gauges and bias indicators", icon: Gauge, category: "All Pages", action: () => navigate("/sentiment"), keywords: ["sentiment", "retail", "cot", "bias"] },
    { id: "signals", label: "Signals", description: "Trade signal scanner and alerts", icon: Radio, category: "All Pages", action: () => navigate("/signals"), keywords: ["signals", "scanner", "alert", "entry"] },
    { id: "indicator", label: "Indicator Hub", description: "Custom indicator tools and references", icon: Activity, category: "All Pages", action: () => navigate("/indicator"), keywords: ["indicator", "rsi", "macd", "atr"] },
    { id: "macro", label: "Macro Desk", description: "Macro pair analysis and correlation viewer", icon: Globe, category: "All Pages", action: () => navigate("/macro/XAUUSD"), keywords: ["macro", "correlation", "pair analysis", "fundamental"] },
    { id: "backtesting", label: "Backtesting", description: "Strategy backtesting engine", icon: Repeat, category: "All Pages", action: () => navigate("/backtesting"), keywords: ["backtest", "historical", "strategy test"] },
    { id: "tradingstyle", label: "Trading Style", description: "Identify and track your trading style metrics", icon: PieChart, category: "All Pages", action: () => navigate("/tradingstyle"), keywords: ["style", "scalp", "swing", "trend"] },
    
    // Journal & Review
    { id: "journals", label: "Journals Archive", description: "All journal entries and session logs", icon: BookOpen, category: "All Pages", action: () => navigate("/journals"), keywords: ["journal list", "archive", "entries"] },
    { id: "review", label: "Trade Review", description: "Structured trade review and grading desk", icon: Eye, category: "All Pages", action: () => navigate("/review"), keywords: ["review", "grade", "trade audit"] },
    { id: "review-daily", label: "Daily Review", description: "End-of-day review and session debrief", icon: CalendarDays, category: "All Pages", action: () => navigate("/review/daily"), keywords: ["daily review", "debrief", "eod"] },
    { id: "progress", label: "Progress Tracker", description: "Skill progression and trader development", icon: TrendingUp, category: "All Pages", action: () => navigate("/progress"), keywords: ["progress", "skill", "growth", "development"] },

    // Monitoring & Alerts
    { id: "alerts", label: "Alerts Manager", description: "Price alerts, risk alerts and notifications", icon: Bell, category: "All Pages", action: () => navigate("/alerts"), keywords: ["alerts", "notify", "price alert"] },
    { id: "notificationandmonitor", label: "Market Monitor", description: "Real-time market monitoring dashboard", icon: Monitor, category: "All Pages", action: () => navigate("/notificationandmonitor"), keywords: ["monitor", "live", "real-time", "watch"] },
    { id: "positions", label: "Live Positions", description: "Open position tracker and exposure view", icon: List, category: "All Pages", action: () => navigate("/positions"), keywords: ["positions", "open trades", "exposure", "live"] },
    { id: "news", label: "News Feed", description: "Market news aggregator and live feed", icon: Newspaper, category: "All Pages", action: () => navigate("/news"), keywords: ["news", "headlines", "market news"] },
    
    // Account & Subscription
    { id: "accounts", label: "MT5 Accounts", description: "Manage linked MT5 broker accounts", icon: Wallet, category: "All Pages", action: () => navigate("/accounts"), keywords: ["accounts", "mt5", "broker", "linked"] },
    { id: "subscription", label: "Subscription", description: "Manage your Journex subscription plan", icon: CreditCard, category: "All Pages", action: () => navigate("/subscription"), keywords: ["subscription", "plan", "billing", "upgrade"] },
    { id: "terminal", label: "Execution Terminal", description: "Direct MT5 order execution terminal", icon: Terminal, category: "All Pages", action: () => navigate("/terminal"), keywords: ["terminal", "execute", "order", "mt5 terminal"] },
  ];

  const filtered = query.trim() === ""
    ? commands
    : commands.filter(cmd => {
        const q = query.toLowerCase();
        return (
          cmd.label.toLowerCase().includes(q) ||
          cmd.description?.toLowerCase().includes(q) ||
          cmd.keywords?.some(k => k.includes(q))
        );
      });

  const grouped = filtered.reduce<Record<string, Command[]>>((acc, cmd) => {
    if (!acc[cmd.category]) acc[cmd.category] = [];
    acc[cmd.category].push(cmd);
    return acc;
  }, {});

  const flatFiltered = Object.values(grouped).flat();

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
      if (e.key === "ArrowDown") { e.preventDefault(); setSelected(s => Math.min(s + 1, flatFiltered.length - 1)); }
      if (e.key === "ArrowUp") { e.preventDefault(); setSelected(s => Math.max(s - 1, 0)); }
      if (e.key === "Enter") { e.preventDefault(); flatFiltered[selected]?.action(); }
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open, flatFiltered, selected, onClose]);

  if (!open) return null;

  let globalIndex = 0;

  return (
    <div className="fixed inset-0 z-[9999] flex items-start justify-center pt-[15vh]" onClick={onClose}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60" />

      {/* Modal */}
      <div
        className="relative w-full max-w-2xl mx-4 bg-[#0E1117] border border-[rgba(255,255,255,0.1)]/60 rounded-lg shadow-black/80 overflow-hidden"
        style={{ boxShadow: "0 0 0 1px rgba(255,255,255,0.06), 0 25px 50px rgba(0,0,0,0.8)" }}
        onClick={e => e.stopPropagation()}
      >
        {/* Search Bar */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-[rgba(255,255,255,0.07)]">
          <Search className="w-5 h-5 text-zinc-400 flex-shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search pages, actions, or type a command..."
            className="flex-1 bg-transparent text-sm text-white placeholder:text-zinc-500 outline-none"
          />
          <div className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 text-[10px] font-mono text-zinc-500 bg-zinc-800 border border-[rgba(255,255,255,0.1)] rounded">ESC</kbd>
          </div>
        </div>

        {/* Results */}
        <div className="max-h-[60vh] overflow-y-auto py-2">
          {flatFiltered.length === 0 && (
            <div className="py-12 text-center text-zinc-500 text-sm">No results for "{query}"</div>
          )}
          {Object.entries(grouped).map(([category, items]) => (
            <div key={category}>
              <div className="px-4 pt-3 pb-1">
                <span className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500">{category}</span>
              </div>
              {items.map(cmd => {
                const idx = globalIndex++;
                const isSelected = idx === selected;
                const Icon = cmd.icon;
                return (
                  <div
                    key={cmd.id}
                    onClick={cmd.action}
                    onMouseEnter={() => setSelected(idx)}
                    className={`w-full flex items-center cursor-pointer gap-3 px-4 py-2.5 text-sm transition-colors ${
                      isSelected
                        ? "bg-[rgba(32,224,178,0.08)] text-[#20e0b2]"
                        : "text-zinc-300 hover:bg-zinc-800/40"
                    }`}
                  >
                    <div className={`w-7 h-7 rounded flex items-center justify-center flex-shrink-0 ${isSelected ? "bg-[rgba(32,224,178,0.15)]" : "bg-zinc-800/80"}`}>
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <div className="flex flex-col flex-1">
                      <span className="text-[13px] font-medium text-white">{cmd.label}</span>
                      {cmd.description && <span className="text-[11px] text-zinc-500">{cmd.description}</span>}
                    </div>
                    
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleFavorite(cmd.id);
                      }}
                      className="p-1.5 rounded hover:bg-zinc-700/50 transition-colors cursor-pointer z-10"
                    >
                      <Star className={`w-4 h-4 ${favorites.includes(cmd.id) ? "fill-yellow-500 text-yellow-500" : "text-zinc-600 hover:text-zinc-400"}`} />
                    </button>
                    
                    <ChevronRight className={`w-4 h-4 ${isSelected ? "text-zinc-400" : "text-zinc-700"}`} />
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        {/* Footer hint */}
        <div className="border-t border-[rgba(255,255,255,0.07)] px-4 py-2 flex items-center gap-4 text-[11px] text-zinc-600">
          <span className="flex items-center gap-1"><kbd className="px-1 py-0.5 bg-zinc-800 border border-[rgba(255,255,255,0.1)] rounded text-[10px] font-mono">↑↓</kbd> navigate</span>
          <span className="flex items-center gap-1"><kbd className="px-1 py-0.5 bg-zinc-800 border border-[rgba(255,255,255,0.1)] rounded text-[10px] font-mono">↵</kbd> open</span>
          <span className="flex items-center gap-1"><Command className="w-3 h-3" /><kbd className="px-1 py-0.5 bg-zinc-800 border border-[rgba(255,255,255,0.1)] rounded text-[10px] font-mono">K</kbd> toggle</span>
        </div>
      </div>
    </div>
  );
}

