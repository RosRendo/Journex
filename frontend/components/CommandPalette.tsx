"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Search, LayoutDashboard, Terminal, Radar, BookOpen, BarChart3,
  ShieldAlert, Settings, Calculator, TrendingUp, Newspaper,
  Bell, Users, Wallet, LogOut, Zap, RotateCcw, Target,
  ChevronRight, Command, X, Activity
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

  const navigate = useCallback((href: string) => {
    router.push(href);
    onClose();
  }, [router, onClose]);

  const commands: Command[] = [
    // Navigation
    { id: "dashboard", label: "Go to Dashboard", description: "Overview & KPIs", icon: LayoutDashboard, category: "Navigate", action: () => navigate("/dashboard"), keywords: ["home", "overview", "pnl"] },
    { id: "terminal", label: "Open Terminal", description: "Bloomberg-style trading terminal", icon: Terminal, category: "Navigate", action: () => navigate("/terminal"), keywords: ["trade", "execute", "chart"] },
    { id: "signals", label: "Market Scanner", description: "Live algorithmic signals", icon: Radar, category: "Navigate", action: () => navigate("/signals"), keywords: ["scan", "buy", "sell", "signal"] },
    { id: "journal", label: "Open Journal", description: "Log and review trades", icon: BookOpen, category: "Navigate", action: () => navigate("/journal"), keywords: ["log", "review", "history"] },
    { id: "analytics", label: "Analytics", description: "Performance statistics", icon: BarChart3, category: "Navigate", action: () => navigate("/analytics"), keywords: ["stats", "performance", "winrate"] },
    { id: "risk", label: "Risk Calculator", description: "Calculate position size & risk", icon: Calculator, category: "Navigate", action: () => navigate("/risk"), keywords: ["lot", "size", "risk", "calculate"] },
    { id: "news", label: "Macro Desk", description: "News & economic calendar", icon: Newspaper, category: "Navigate", action: () => navigate("/news"), keywords: ["news", "nfp", "fomc", "macro"] },
    { id: "alerts", label: "Alerts Center", description: "Price & risk notifications", icon: Bell, category: "Navigate", action: () => navigate("/alerts"), keywords: ["notify", "price alert", "discord"] },
    { id: "settings", label: "Settings", description: "Configure broker & keys", icon: Settings, category: "Navigate", action: () => navigate("/settings"), keywords: ["config", "broker", "mt5", "api"] },
    { id: "strategies", label: "Strategies Library", description: "Your trading strategies", icon: Target, category: "Navigate", action: () => navigate("/strategies") },
    { id: "community", label: "Community", description: "Shared setups & discussion", icon: Users, category: "Navigate", action: () => navigate("/community") },
    { id: "accounts", label: "Accounts", description: "Manage your trading accounts", icon: Wallet, category: "Navigate", action: () => navigate("/accounts") },
    { id: "sentiment", label: "Sentiment", description: "Market mood & bias", icon: Activity, category: "Navigate", action: () => navigate("/sentiment") },
    { id: "backtesting", label: "Backtesting", description: "Replay & test strategies", icon: RotateCcw, category: "Navigate", action: () => navigate("/backtesting") },
    // Quick Actions
    { id: "validation", label: "Pre-Trade Checklist", description: "Run setup quality score", icon: ShieldAlert, category: "Quick Actions", action: () => navigate("/validation"), keywords: ["check", "validate", "setup"] },
    { id: "daily-review", label: "Daily Review", description: "Grade today's trading session", icon: TrendingUp, category: "Quick Actions", action: () => navigate("/review/daily"), keywords: ["review", "grade", "today"] },
    { id: "progress", label: "Challenge Tracker", description: "Funded account progress", icon: Zap, category: "Quick Actions", action: () => navigate("/progress"), keywords: ["ftmo", "funded", "challenge", "phase"] },
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
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Modal */}
      <div
        className="relative w-full max-w-2xl mx-4 bg-[#0E1117] border border-zinc-700/60 rounded-2xl shadow-2xl shadow-black/80 overflow-hidden"
        style={{ boxShadow: "0 0 0 1px rgba(255,255,255,0.06), 0 25px 50px rgba(0,0,0,0.8)" }}
        onClick={e => e.stopPropagation()}
      >
        {/* Search Bar */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-zinc-800">
          <Search className="w-5 h-5 text-zinc-400 flex-shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search pages, actions, or type a command..."
            className="flex-1 bg-transparent text-sm text-white placeholder:text-zinc-500 outline-none"
          />
          <div className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 text-[10px] font-mono text-zinc-500 bg-zinc-800 border border-zinc-700 rounded">ESC</kbd>
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
                  <button
                    key={cmd.id}
                    onClick={cmd.action}
                    onMouseEnter={() => setSelected(idx)}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
                      isSelected
                        ? "bg-blue-600/20 text-blue-300"
                        : "text-zinc-300 hover:bg-zinc-800/60"
                    }`}
                  >
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${isSelected ? "bg-blue-500/30" : "bg-zinc-800"}`}>
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <div className="flex-1 text-left">
                      <div className="font-medium">{cmd.label}</div>
                      {cmd.description && <div className="text-xs text-zinc-500">{cmd.description}</div>}
                    </div>
                    {isSelected && <ChevronRight className="w-4 h-4 text-blue-400 flex-shrink-0" />}
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        {/* Footer hint */}
        <div className="border-t border-zinc-800 px-4 py-2 flex items-center gap-4 text-[11px] text-zinc-600">
          <span className="flex items-center gap-1"><kbd className="px-1 py-0.5 bg-zinc-800 border border-zinc-700 rounded text-[10px] font-mono">↑↓</kbd> navigate</span>
          <span className="flex items-center gap-1"><kbd className="px-1 py-0.5 bg-zinc-800 border border-zinc-700 rounded text-[10px] font-mono">↵</kbd> open</span>
          <span className="flex items-center gap-1"><Command className="w-3 h-3" /><kbd className="px-1 py-0.5 bg-zinc-800 border border-zinc-700 rounded text-[10px] font-mono">K</kbd> toggle</span>
        </div>
      </div>
    </div>
  );
}
