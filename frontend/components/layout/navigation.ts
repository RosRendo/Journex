import {
  LayoutDashboard, Terminal, List, Radio, Bot, Code,
  BarChart3, LineChart, PieChart, Repeat,
  CalendarDays, Newspaper, Eye, Globe, Monitor, Activity, Bell,
  BookOpen, CheckCircle2, Cpu, TrendingUp, ShieldAlert,
  Calculator, Wallet, Settings, Users, CreditCard, Shield,
  Layers, DollarSign, Target, Sparkles, Compass
} from "lucide-react";

export type NavItem = {
  id: string;
  label: string;
  role: string;
  description: string;
  href: string;
  icon: any;
  badge?: string;
  isPrimaryCore?: boolean;
  category: "execution" | "analytics" | "intel" | "journal" | "risk_system";
  children?: { href: string; label: string }[];
};

export type NavPillar = {
  id: "execution" | "analytics" | "intel" | "journal" | "risk_system";
  label: string;
  shortLabel: string;
  description: string;
  icon: any;
  color: string;
  items: NavItem[];
};

export type LifecycleStep = {
  step: number;
  label: string;
  role: string;
  id: string;
  href: string;
  icon: any;
  color: string;
};

export const TRADE_LIFECYCLE_STEPS: LifecycleStep[] = [
  { step: 1, label: "Environment", role: "Understand context", id: "macro", href: "/macro/XAUUSD", icon: Globe, color: "#f59e0b" },
  { step: 2, label: "Opportunity", role: "Find setups", id: "signals", href: "/signals", icon: Radio, color: "#3b82f6" },
  { step: 3, label: "Decide", role: "What now?", id: "dashboard", href: "/dashboard", icon: LayoutDashboard, color: "#10b981" },
  { step: 4, label: "Size & Risk", role: "How much?", id: "risk", href: "/risk", icon: ShieldAlert, color: "#ef4444" },
  { step: 5, label: "Execute", role: "Do it", id: "terminal", href: "/terminal", icon: Terminal, color: "#3b82f6" },
  { step: 6, label: "Manage", role: "Manage trade", id: "positions", href: "/positions", icon: List, color: "#06b6d4" },
  { step: 7, label: "Learn", role: "Audit & grow", id: "journal", href: "/journal", icon: BookOpen, color: "#a855f7" },
];

export const NAV_PILLARS: NavPillar[] = [
  {
    id: "execution",
    label: "Live Trading & Execution",
    shortLabel: "Execution",
    description: "Real-time decision making, scanner, execution terminal, and positions",
    icon: Terminal,
    color: "#3b82f6", // Blue
    items: [
      {
        id: "dashboard",
        label: "Live Radar",
        role: "Decide (What now?)",
        description: "Core operating system: identify best setups, trading window, and tradeability",
        href: "/dashboard",
        icon: LayoutDashboard,
        badge: "DECISION OS",
        isPrimaryCore: true,
        category: "execution",
      },
      {
        id: "signals",
        label: "Setup Scanner",
        role: "Find opportunities",
        description: "Algorithmic ICT scanner: FVG, sweeps, market structure shifts, and confluences",
        href: "/signals",
        icon: Radio,
        badge: "ICT SCAN",
        isPrimaryCore: true,
        category: "execution",
      },
      {
        id: "terminal",
        label: "Execution",
        role: "Execute",
        description: "Full-screen institutional MT5 order placement, hotkeys, and chart entries",
        href: "/terminal",
        icon: Terminal,
        badge: "LIVE MT5",
        isPrimaryCore: true,
        category: "execution",
      },
      {
        id: "positions",
        label: "Positions",
        role: "Manage",
        description: "Open positions manager: trailing stops, partial closes, and real-time floating PnL",
        href: "/positions",
        icon: List,
        badge: "EXPOSURE",
        isPrimaryCore: true,
        category: "execution",
      },
      {
        id: "bot",
        label: "Trading Bot EA",
        role: "Automate",
        description: "Automated trading EA configurations, live status telemetry, and parameters",
        href: "/bot",
        icon: Bot,
        badge: "AUTOMATION",
        category: "execution",
      },
      {
        id: "script",
        label: "MT5 Scripts",
        role: "Emergency actions",
        description: "One-click execution hotkeys, close-all scripts, and emergency risk overrides",
        href: "/script",
        icon: Code,
        category: "execution",
      },
    ],
  },
  {
    id: "intel",
    label: "Market Intel & Macro",
    shortLabel: "Market Intel",
    description: "Macro correlations, high-impact news calendar, and retail positioning",
    icon: Globe,
    color: "#f59e0b", // Amber
    items: [
      {
        id: "macro",
        label: "Macro Desk",
        role: "Understand environment",
        description: "Multi-asset correlation matrices, DXY, bond yields, and higher-timeframe bias",
        href: "/macro/XAUUSD",
        icon: Globe,
        badge: "MACRO",
        category: "intel",
      },
      {
        id: "calendar",
        label: "Economic Calendar",
        role: "Timing & events",
        description: "High-impact news events (CPI, FOMC, NFP) and monthly PnL calendar breakdown",
        href: "/calendar",
        icon: CalendarDays,
        badge: "NEWS CLEAR",
        category: "intel",
      },
      {
        id: "news",
        label: "Market News",
        role: "Context & volatility",
        description: "Institutional real-time headline feed with volatility impact indicators",
        href: "/news",
        icon: Newspaper,
        badge: "LIVE FEED",
        category: "intel",
      },
      {
        id: "sentiment",
        label: "Market Sentiment",
        role: "Retail bias",
        description: "Retail trader long/short positioning ratios and contrarian fade indicators",
        href: "/sentiment",
        icon: Eye,
        category: "intel",
      },
      {
        id: "notificationandmonitor",
        label: "Market Monitor",
        role: "Watch",
        description: "Real-time symbol watchlist and continuous technical condition monitor",
        href: "/notificationandmonitor",
        icon: Monitor,
        category: "intel",
      },
      {
        id: "indicator",
        label: "Custom Indicators",
        role: "Reference",
        description: "Indicator engine and technical parameter reference desk",
        href: "/indicator",
        icon: Activity,
        category: "intel",
      },
      {
        id: "alerts",
        label: "Alerts Manager",
        role: "Notify",
        description: "Price level breach triggers, drawdown threshold alerts, and audio notifications",
        href: "/alerts",
        icon: Bell,
        category: "intel",
      },
    ],
  },
  {
    id: "analytics",
    label: "Quant & Analytics",
    shortLabel: "Analytics",
    description: "Statistical edge verification, equity curve drawdown metrics, and backtest testing",
    icon: BarChart3,
    color: "#10b981", // Emerald
    items: [
      {
        id: "analytics",
        label: "Analytics",
        role: "Verify edge",
        description: "Deep win rate, profit factor, MAE/MFE payoff curves, and edge expectancy",
        href: "/analytics",
        icon: BarChart3,
        badge: "QUANT",
        category: "analytics",
      },
      {
        id: "performance",
        label: "Performance",
        role: "Track capital",
        description: "Account growth trajectories, drawdown recoveries, and monthly benchmarks",
        href: "/performance",
        icon: LineChart,
        category: "analytics",
      },
      {
        id: "tradingstyle",
        label: "Trading Profile",
        role: "Archetype",
        description: "Measure whether your statistical edge favors scalping, intraday, or swing trading",
        href: "/tradingstyle",
        icon: PieChart,
        category: "analytics",
      },
      {
        id: "backtesting",
        label: "Backtest Lab",
        role: "Simulate",
        description: "Historical tick replay and rule-based strategy backtest laboratory",
        href: "/backtesting",
        icon: Repeat,
        badge: "LAB",
        category: "analytics",
      },
    ],
  },
  {
    id: "journal",
    label: "Journal & Coaching",
    shortLabel: "Journal",
    description: "Trade reflection, trade grading audit, rulebook lessons, and AI feedback",
    icon: BookOpen,
    color: "#a855f7", // Purple
    items: [
      {
        id: "journal",
        label: "Daily Journal",
        role: "Learn",
        description: "Structured trade diary: psychology tags, mistake tracking, and MT5 screenshots",
        href: "/journal",
        icon: BookOpen,
        badge: "CORE",
        category: "journal",
      },
      {
        id: "review",
        label: "Trade Review",
        role: "Audit",
        description: "Post-session trade quality grading (A+, B, C, Tilt) and execution quality checks",
        href: "/review",
        icon: CheckCircle2,
        category: "journal",
      },
      {
        id: "review-daily",
        label: "Daily Debrief",
        role: "Reflect",
        description: "End-of-day debrief questionnaire and discipline compliance audit",
        href: "/review?tab=daily",
        icon: CalendarDays,
        category: "journal",
      },
      {
        id: "playbook",
        label: "Playbook & AI Coach",
        role: "Rules & lessons",
        description: "Strategy model blueprints, whiteboard lessons, and interactive AI coach reviews",
        href: "/playbook",
        icon: Cpu,
        badge: "AI DESK",
        category: "journal",
      },
      {
        id: "progress",
        label: "Progress Tracker",
        role: "Milestones",
        description: "Trader skill progression ladder and funded prop challenge compliance criteria",
        href: "/review?tab=challenges",
        icon: TrendingUp,
        category: "journal",
      },
    ],
  },
  {
    id: "risk_system",
    label: "Risk Desk & System",
    shortLabel: "Risk & System",
    description: "Drawdown guard, lot calculators, MT5 account connections, and preferences",
    icon: ShieldAlert,
    color: "#ef4444", // Rose/Red
    items: [
      {
        id: "risk",
        label: "Risk Desk",
        role: "Protect capital",
        description: "Daily drawdown ceiling, prop rule protection, tilt lockout, and panic mode",
        href: "/risk",
        icon: ShieldAlert,
        badge: "GUARD",
        category: "risk_system",
      },
      {
        id: "calculators",
        label: "Risk Calculator",
        role: "Size & calculate",
        description: "Dynamic lot sizing calculators, pip contract values, and risk/reward simulator",
        href: "/calculators",
        icon: Calculator,
        category: "risk_system",
      },
      {
        id: "practice",
        label: "Practice Lab",
        role: "Train",
        description: "Execution training sandbox for fixed and flexible gold trading rules",
        href: "/practice",
        icon: Terminal,
        badge: "SANDBOX",
        category: "risk_system",
      },
      {
        id: "accounts",
        label: "MT5 Accounts",
        role: "Bridges",
        description: "Manage connected MT5 broker terminals, balance sync, and login credentials",
        href: "/accounts",
        icon: Wallet,
        badge: "BROKERS",
        category: "risk_system",
      },
      {
        id: "settings",
        label: "Settings",
        role: "Configure",
        description: "System preferences, API bridge tokens, webhook endpoints, and UI themes",
        href: "/settings",
        icon: Settings,
        category: "risk_system",
      },
      {
        id: "profile",
        label: "User Profile",
        role: "Identity",
        description: "Personal account profile, trader avatar, and active achievements",
        href: "/profile",
        icon: Users,
        category: "risk_system",
      },
      {
        id: "community",
        label: "Community",
        role: "Network",
        description: "Shared trade setups, social chat streams, and trader leaderboards",
        href: "/community",
        icon: Users,
        category: "risk_system",
      },
      {
        id: "subscription",
        label: "Subscription",
        role: "Tier",
        description: "Manage Journex billing plan, tier limits, and feature unlocks",
        href: "/subscription",
        icon: CreditCard,
        category: "risk_system",
      },
      {
        id: "pricing",
        label: "Pricing",
        role: "Plans",
        description: "Tier comparison and pro feature plans",
        href: "/pricing",
        icon: CreditCard,
        category: "risk_system",
      },
    ],
  },
];

// 4 non-negotiable permanent core tools on My Desk (Cannot be unpinned)
export const PRIMARY_CORE_IDS = ["dashboard", "signals", "terminal", "positions"];

// Default quick-access tools pinned on My Desk
export const DEFAULT_QUICK_ACCESS_IDS = ["macro", "calendar", "risk", "journal", "analytics"];

// Combined default pinned list for backward compatibility
export const DEFAULT_PINNED_IDS = [...PRIMARY_CORE_IDS, ...DEFAULT_QUICK_ACCESS_IDS];

// Flattened list of all pages
export const ALL_PAGES: NavItem[] = NAV_PILLARS.flatMap((p) => p.items);

// Backward compatibility exports
export type NavGroup = {
  id: string;
  label: string;
  items: NavItem[];
};

export const SIDEBAR_GROUPS: NavGroup[] = NAV_PILLARS.map((p) => ({
  id: p.id,
  label: p.shortLabel.toUpperCase(),
  items: p.items,
}));

export const HIDDEN_PAGES: NavGroup[] = [];

export const HEADER_GROUPS: NavGroup[] = NAV_PILLARS.map((p) => ({
  id: p.id,
  label: p.shortLabel,
  items: p.items,
}));

export const NAVIGATION: NavItem[] = ALL_PAGES;
