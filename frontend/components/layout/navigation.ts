import {
  LayoutDashboard, BookOpen, CalendarDays, BarChart3, Wallet, Users, Library, Bell,
  Settings, ShieldAlert, Calculator, Percent, Grid, Award, Zap, Eye, BellRing, MapPin,
  Newspaper, Crosshair, FlipHorizontal2, RotateCcw, Code, Activity, TrendingUp, BarChart2, Target,
  Shield, CheckCircle2, TrendingDown, AlertTriangle, Terminal, Radar, Cpu, Layers, DollarSign,
  Bot, Search, FileText, Bookmark, CreditCard, Globe2
} from "lucide-react";

export type NavItem = {
  id: string;
  label: string;
  icon: any;
  href?: string;
  children?: { href: string; label: string }[];
};

export type NavGroup = {
  id: string;
  label: string;
  items: NavItem[];
};

export const SIDEBAR_GROUPS: NavGroup[] = [
  {
    id: "core",
    label: "CORE",
    items: [
      { id: "dashboard", label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
      { id: "terminal", label: "Terminal", href: "/terminal", icon: Terminal },
      { id: "signals", label: "Scanner", href: "/signals", icon: Radar },
      { id: "ai-desk", label: "AI Desk", href: "/ai-desk", icon: Cpu },
    ],
  },
  {
    id: "hubs",
    label: "HUBS",
    items: [
      { id: "performance", label: "Performance", href: "/performance", icon: TrendingUp },
      { id: "risk-hub", label: "Risk", href: "/risk-hub", icon: ShieldAlert },
    ],
  },
  {
    id: "favorites",
    label: "PINNED TOOLS",
    items: [
      { id: "calendar", label: "Calendar", href: "/calendar", icon: CalendarDays },
      { id: "calculator", label: "Calculator", href: "/risk", icon: Calculator },
      { id: "validation", label: "Validation", href: "/validation", icon: ShieldAlert },
      { id: "journal", label: "Journal", href: "/journal", icon: BookOpen },
      { id: "lessons", label: "Lessons", href: "/lessons", icon: Library },
    ],
  },
  {
    id: "system",
    label: "SYSTEM",
    items: [
      { id: "settings", label: "Settings", href: "/settings", icon: Settings },
    ],
  }
];

export const HIDDEN_PAGES: NavGroup[] = [
  {
    id: "tools",
    label: "TOOLS & UTILITIES (Ctrl+K)",
    items: [
      { id: "ai-journals", label: "AI Journals", href: "/journals", icon: Cpu },
      { id: "analytics", label: "Analytics", href: "/analytics", icon: BarChart3 },
      { id: "review", label: "Trade Review", href: "/review", icon: CheckCircle2 },
      { id: "daily", label: "Daily Review", href: "/review/daily", icon: CalendarDays },
      { id: "progress", label: "Challenge Tracker", href: "/progress", icon: AlertTriangle },
      { id: "strategies", label: "Strategies", href: "/strategies", icon: Target },
      { id: "replay", label: "Trade Replay", href: "/backtesting", icon: RotateCcw },
      { id: "ai-report", label: "AI Report", href: "/ai-report", icon: Cpu },
      { id: "table", label: "Risk Table", href: "/RiskTableCalculation", icon: Grid },
      { id: "lot-pair", label: "Lot Per Pair", href: "/loteachpair", icon: Layers },
      { id: "wrandrr", label: "Win Rate & RR", href: "/wrandrr", icon: BarChart2 },
      { id: "exposure", label: "Portfolio Exposure", href: "/exposure", icon: DollarSign },
      { id: "drawdown", label: "Drawdown Guard", href: "/drawdown", icon: TrendingDown },
      { id: "funded", label: "Funded Rules", href: "/fundedrequire", icon: ShieldAlert },
      { id: "alerts", label: "Risk Alerts", href: "/alerts", icon: Bell },
      
      // Found extra pages
      { id: "accounts", label: "Accounts Manager", href: "/accounts", icon: Wallet },
      { id: "bot", label: "Trading Bot", href: "/bot", icon: Bot },
      { id: "community", label: "Community", href: "/community", icon: Users },
      { id: "fixed-gold", label: "Fixed Gold Simulator", href: "/FixedGoldSimulator", icon: Activity },
      { id: "flex-gold", label: "Flexible Gold Simulator", href: "/FlexibleGoldSimulator", icon: Activity },
      { id: "gold-sim", label: "Gold Simulator", href: "/GoldTradingSimulator", icon: Activity },
      { id: "indicator", label: "Custom Indicators", href: "/indicator", icon: Search },
      { id: "macro", label: "Macro Dashboard", href: "/macro/XAUUSD", icon: Globe2 },
      { id: "news", label: "Market News", href: "/news", icon: Newspaper },
      { id: "notifications", label: "Notifications & Monitor", href: "/notificationandmonitor", icon: BellRing },
      { id: "pip", label: "Pip Reference", href: "/pipreference", icon: Percent },
      { id: "positions", label: "Positions Log", href: "/positions", icon: Library },
      { id: "pricing", label: "Pricing", href: "/pricing", icon: CreditCard },
      { id: "profile", label: "User Profile", href: "/profile", icon: Users },
      { id: "script", label: "MT5 Scripts", href: "/script", icon: Code },
      { id: "sentiment", label: "Market Sentiment", href: "/sentiment", icon: Eye },
      { id: "subscription", label: "Subscription", href: "/subscription", icon: CreditCard },
      { id: "trading-plan", label: "Trading Plan", href: "/trading-plan", icon: FileText },
      { id: "tradingstyle", label: "Trading Style", href: "/tradingstyle", icon: Bookmark },
    ],
  }
];

// Deprecated, kept for backward compatibility if any component maps over it
export const HEADER_GROUPS: NavGroup[] = [];

// Combine both for the Command Palette (Ctrl+K search)
export const NAVIGATION: NavItem[] = [...SIDEBAR_GROUPS, ...HIDDEN_PAGES].flatMap((g) => g.items);
