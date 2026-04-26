import {
  LayoutDashboard, BookOpen, CalendarDays, BarChart3, Wallet, Users, Library, Bell,
  Settings, ShieldAlert, Calculator, Percent, Grid, Award, Zap, Eye, BellRing, MapPin,
  Newspaper, Crosshair, FlipHorizontal2, RotateCcw, Code, Activity, TrendingUp, BarChart2, Target,
  Shield, CheckCircle2, TrendingDown, AlertTriangle
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

// Only keep CORE in the Left Sidebar
export const SIDEBAR_GROUPS: NavGroup[] = [
  {
    id: "core",
    label: "CORE",
    items: [
      { id: "dashboard", label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
      { id: "ai-journals", label: "AI Journals", href: "/journals", icon: BookOpen },
      { id: "journal", label: "Manual Journal", href: "/journal", icon: BookOpen },
      { id: "calendar", label: "Calendar", href: "/calendar", icon: CalendarDays },
      { id: "analytics", label: "Analytics", href: "/analytics", icon: BarChart3 },
      { id: "accounts", label: "Accounts", href: "/accounts", icon: Wallet },
      { id: "community", label: "Community", href: "/community", icon: Users },
      { id: "strategies", label: "Strategies", href: "/strategies", icon: Library },
      { id: "alerts", label: "Alerts", href: "/notificationandmonitor", icon: Bell },
      { id: "livemonitor", label: "Live Monitor", href: "/livemonitorchart", icon: Activity },
      { id: "news", label: "Macro Desk", href: "/news", icon: Newspaper },
      { id: "settings", label: "Settings", href: "/settings", icon: Settings },
    ],
  }
];

// Move RISK, TOOLS, SIMULATION, VALIDATION to Header Dropdowns
export const HEADER_GROUPS: NavGroup[] = [
  {
    id: "validation",
    label: "Validation",
    items: [
      { id: "pretrade", label: "Pre-Trade Checks", href: "/validation", icon: Shield },
      { id: "tradereview", label: "Trade Review", href: "/review", icon: CheckCircle2 },
      { id: "dailyreview", label: "Daily Review", href: "/review/daily", icon: TrendingDown },
      { id: "challengetracker", label: "Challenge Tracker", href: "/progress", icon: AlertTriangle },
    ],
  },
  {
    id: "risk",
    label: "Risk",
    items: [
      { id: "risk-calc", label: "Calculate Risk", href: "/risk", icon: Calculator },
      { id: "wrandrr", label: "Winrate & RR", href: "/wrandrr", icon: Percent },
      { id: "loteachpair", label: "Lot Each Pair", href: "/loteachpair", icon: Grid },
      { id: "risktable", label: "Risk Table", href: "/RiskTableCalculation", icon: BarChart2 },
    ],
  },
  {
    id: "tools",
    label: "Tools",
    items: [
      { id: "funded", label: "Funded Account", href: "/fundedrequire", icon: Award },
      { id: "bots", label: "Trading Bots", href: "/bot", icon: Zap },
      { id: "sentiment", label: "Mood Tracker", href: "/sentiment", icon: Activity },
      { id: "pipmovement", label: "Pip Movement", href: "/pipreference", icon: TrendingUp },
      { id: "tradingstyle", label: "Trading Style", href: "/tradingstyle", icon: Target },
      { id: "indicators", label: "Indicators", href: "/indicator", icon: BarChart2 },
    ],
  },
  {
    id: "simulation",
    label: "Simulation",
    items: [
      { id: "goldsim", label: "Gold Simulator", href: "/GoldTradingSimulator", icon: Crosshair },
      { id: "flexsim", label: "Flex Simulator", href: "/FlexibleGoldSimulator", icon: FlipHorizontal2 },
      { id: "fixedsim", label: "Fixed Simulator", href: "/FixedGoldSimulator", icon: Crosshair },
      { id: "backtesting", label: "Backtesting", href: "/backtesting", icon: RotateCcw },
      { id: "scripts", label: "Scripts", href: "/script", icon: Code },
    ],
  },
];

// LIVE group is removed as it is now represented by the Right Sidebar.

// Legacy flat navigation for backwards compat (combine both for legacy routes if needed)
export const NAVIGATION: NavItem[] = [...SIDEBAR_GROUPS, ...HEADER_GROUPS].flatMap((g) => g.items);
