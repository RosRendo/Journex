# Complete Implementation Guide - All Widgets, Functions & Empty Pages

**Last Updated**: April 8, 2026  
**Purpose**: One-stop prompt document for complete feature implementation  
**Scope**: Widgets + Functions + Empty Pages + Full Specifications

---

## 📋 MASTER TABLE OF CONTENTS

1. [Quick Start](#quick-start)
2. [Dashboard Widgets (8 New)](#dashboard-widgets-8-new)
3. [Core Functions to Build](#core-functions-to-build)
4. [Empty Pages to Fill (7 Pages)](#empty-pages-to-fill-7-pages)
5. [Enhanced Features](#enhanced-features)
6. [Complete API Integration Map](#complete-api-integration-map)
7. [Implementation Checklist](#implementation-checklist)

---

## QUICK START

**What needs to be done:**

```
TIER 1 - CRITICAL (Do First)
├─ 8 Dashboard Widgets ← HIGH IMPACT
├─ 7 Empty Pages Fill ← FEATURE COMPLETE
└─ Core Utility Functions ← BLOCKING

TIER 2 - IMPORTANT (Then Do)
├─ Enhanced Features
├─ Missing UI Enhancements
└─ Data Integration

TIER 3 - POLISH (Finally)
├─ Performance optimization
├─ Error handling
└─ Testing & validation

ESTIMATED TOTAL: 250-300 hours
```

---

# SECTION 1: DASHBOARD WIDGETS (8 NEW)

## 📊 Widget #1: RECENT TRADES TABLE

**File**: `frontend/components/dashboard/widgets/RecentTradesTable.tsx`

**Purpose**: Display last 8-12 trades with sorting and filtering

**Component Structure**:

```typescript
interface RecentTradesTableProps {
  trades: Trade[];
  loading?: boolean;
  onTradeClick?: (tradeId: number) => void;
  maxRows?: number;
}

export function RecentTradesTable({
  trades,
  loading,
  onTradeClick,
  maxRows = 8,
}: RecentTradesTableProps);
```

**Features Required**:

- ✅ Sort by: date (newest first), profit, pair
- ✅ Filter by: outcome (Win/Loss/All)
- ✅ Pagination: show 8 or 12 trades
- ✅ Columns: Date, Pair, Direction, Entry, SL, TP, Profit, Status
- ✅ Color coding: Green for wins, Red for losses
- ✅ Click row → expand details
- ✅ 3-dot menu → Edit/Delete/Copy
- ✅ Hover effects & animations
- ✅ Loading skeleton state
- ✅ Empty state message

**Data Source**:

```typescript
// From useCsvTrades hook
const { trades } = useCsvTrades();
// Pick last 8-12
const recentTrades = trades.sort(...).slice(0, 8);
```

**Styling**:

```css
Background: var(--bg-card)
Border: 1px solid var(--border)
Header: rgba(255, 255, 255, 0.03)
Row hover: rgba(255, 255, 255, 0.05)
Profit text: var(--bull) #00dc82 (win)
Loss text: var(--bear) #ef4444 (loss)
Font: IBM Plex Mono for prices
```

**Responsive Design**:

- Desktop: Full table
- Tablet: Stack columns, horizontal scroll for prices
- Mobile: Card layout per trade

**Integration**:

```typescript
// In dashboard/page.tsx
import { RecentTradesTable } from "@/components/dashboard/widgets/RecentTradesTable";

<RecentTradesTable
  trades={recentTrades}
  loading={loading}
  onTradeClick={(id) => router.push(`/journal/${id}`)}
/>
```

---

## 📈 Widget #2: EQUITY CURVE CHART

**File**: `frontend/components/dashboard/widgets/EquityCurveChart.tsx`

**Purpose**: Visualize account balance progression over 30 trades

**Component Structure**:

```typescript
interface EquityCurveChartProps {
  trades: Trade[];
  loading?: boolean;
  className?: string;
}

export function EquityCurveChart({
  trades,
  loading,
  className,
}: EquityCurveChartProps);
```

**Features Required**:

- ✅ Area chart (Recharts)
- ✅ 30-day window (last 30 trades)
- ✅ Calculate cumulative balance
- ✅ X-axis: dates (MM/DD format)
- ✅ Y-axis: auto-scale balance
- ✅ Gradient fill: green tint
- ✅ Line color: #00dc82 (bull)
- ✅ Hover tooltip: date + balance + daily change
- ✅ Responsive width
- ✅ Stats display: Max, Min, Current

**Calculation Logic**:

```typescript
const equityCurve = useMemo(() => {
  let balance = 0;
  return trades
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(-30)
    .map((t) => {
      balance += t.profit;
      return {
        date: new Date(t.date).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        }),
        balance: Math.round(balance * 100) / 100,
        profit: t.profit,
      };
    });
}, [trades]);
```

**Chart Configuration**:

```typescript
<AreaChart data={equityCurve} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
  <defs>
    <linearGradient id="colorEquity" x1="0" y1="0" x2="0" y2="1">
      <stop offset="5%" stopColor="#00dc82" stopOpacity={0.3}/>
      <stop offset="95%" stopColor="#00dc82" stopOpacity={0}/>
    </linearGradient>
  </defs>
  <XAxis dataKey="date" />
  <YAxis />
  <Tooltip formatter={(value) => `$${value.toFixed(2)}`} />
  <Area
    type="monotone"
    dataKey="balance"
    stroke="#00dc82"
    fillOpacity={1}
    fill="url(#colorEquity)"
  />
</AreaChart>
```

**Stats Display**:

```
Equity Curve
├─ Max: $12,500
├─ Min: $8,200
├─ Current: $11,250
└─ Peak-to-Trough: -34%
```

**Responsive**:

- Height: 280px fixed
- Width: 100% responsive
- Mobile: Stack below other widgets

---

## 🎯 Widget #3: STRATEGY PERFORMANCE

**File**: `frontend/components/dashboard/widgets/StrategyPerformance.tsx`

**Purpose**: Horizontal bar chart showing P&L by strategy

**Component Structure**:

```typescript
interface StrategyPerformanceProps {
  trades: Trade[];
  maxStrategies?: number;
}

export function StrategyPerformance({
  trades,
  maxStrategies = 8,
}: StrategyPerformanceProps);
```

**Features Required**:

- ✅ Horizontal bar chart (Recharts)
- ✅ Group trades by strategy
- ✅ Calculate: P&L, Trade count, Win rate
- ✅ Sort by P&L descending
- ✅ Max 8 strategies shown
- ✅ Green bar for profit, Red for loss
- ✅ Tooltip on hover with full stats
- ✅ Click bar → filter trades table
- ✅ Legend showing Win/Loss/Breakeven

**Data Calculation**:

```typescript
const strategyStats = useMemo(() => {
  const map = new Map<string, { pnl: number; trades: number; wins: number }>();

  trades.forEach((t) => {
    const key = t.strategy || "Unclassified";
    if (!map.has(key)) map.set(key, { pnl: 0, trades: 0, wins: 0 });
    const s = map.get(key)!;
    s.pnl += t.profit;
    s.trades++;
    if (t.profit > 0) s.wins++;
  });

  return Array.from(map.entries())
    .map(([name, s]) => ({
      name,
      pnl: s.pnl,
      trades: s.trades,
      winRate: (s.wins / s.trades) * 100,
    }))
    .sort((a, b) => Math.abs(b.pnl) - Math.abs(a.pnl))
    .slice(0, maxStrategies);
}, [trades, maxStrategies]);
```

**Chart Styling**:

```
Bar width: 28px gap 8px
Positive: gradient(#00dc82 → #00b570)
Negative: gradient(#ef4444 → #dc2626)
Bar height: extends based on P&L value
Normalized to max value
```

**Display Format**:

```
Strategy Name | Bar | P&L | Trades | Win Rate %
Support/Resistance | ████ | +$2,500 | 15 | 73.3%
Breakout | ███ | +$1,800 | 12 | 66.7%
Scalp | ██ | -$300 | 8 | 37.5%
```

---

## 👁️ Widget #4: OPEN POSITIONS LIST

**File**: `frontend/components/dashboard/widgets/OpenPositionsList.tsx`

**Purpose**: Display active trades from MT5 in real-time

**Component Structure**:

```typescript
interface Position {
  ticket: number;
  pair: string;
  direction: "Long" | "Short";
  lotSize: number;
  entry: number;
  current: number;
  sl: number;
  tp: number;
  pnl: number;
  openTime: string;
}

interface OpenPositionsListProps {
  positions: Position[];
  loading?: boolean;
  onRefresh?: () => void;
}

export function OpenPositionsList({
  positions,
  loading,
  onRefresh,
}: OpenPositionsListProps);
```

**Features Required**:

- ✅ Real-time position display
- ✅ Auto-refresh every 5 seconds
- ✅ Columns: Ticket, Pair, Type, Entry, Current, SL, TP, P&L
- ✅ Color-coded border: Green (profit), Red (loss)
- ✅ P&L % display
- ✅ Sort by P&L desc
- ✅ Filter by pair
- ✅ Hover tooltip → Commission, Time open, R-multiple
- ✅ Click row → Position details modal
- ✅ Connection status badge
- ✅ Empty state message

**Data Source**:

```typescript
// From MT5 Bridge
const positions = await fetch("/bridge/accounts/:id/positions")
  .then((r) => r.json())
  .then((d) => d.positions);

// Real-time polling
useEffect(() => {
  const interval = setInterval(fetchPositions, 5000);
  return () => clearInterval(interval);
}, []);
```

**Styling**:

```
Border-left: 4px colored
├─ Green: #00dc82 (profit)
├─ Red: #ef4444 (loss)
└─ Gray: breakeven

P&L text color:
├─ Green for +
└─ Red for -

Connection badge:
├─ Green: Connected (updating)
├─ Yellow: Reconnecting
└─ Red: Disconnected
```

**Connection States**:

```
✅ Connected - 3 positions (last update: now)
⏳ Connecting... (data stale)
❌ Disconnected - last update: 2m ago
```

---

## 📰 Widget #5: ECONOMIC NEWS TICKER

**File**: `frontend/components/dashboard/widgets/EconomicNewsTicker.tsx`

**Purpose**: Scrolling feed of upcoming events + breaking news

**Component Structure**:

```typescript
interface TickerItem {
  type: "event" | "news";
  id: string;
  title: string;
  time: string;
  importance?: "high" | "medium" | "low";
  sentiment?: "bullish" | "bearish" | "neutral";
  pair?: string;
  source?: string;
}

interface EconomicNewsTickerProps {
  items: TickerItem[];
  autoScroll?: boolean;
  scrollInterval?: number;
}

export function EconomicNewsTicker({
  items,
  autoScroll = true,
  scrollInterval = 5000,
}: EconomicNewsTickerProps);
```

**Features Required**:

- ✅ Vertical scrolling feed
- ✅ Auto-advance every 5 seconds
- ✅ Manual scroll (arrows)
- ✅ Pause on hover
- ✅ Two item types: Event & News
- ✅ Event countdown timer
- ✅ Sentiment badges (Bullish/Bearish/Neutral)
- ✅ Importance color: 🔴 High, 🟡 Medium, 🟢 Low
- ✅ Click event → calendar view
- ✅ Click news → open link (new tab)
- ✅ Timeline connecting line

**Item Layout - Event**:

```
┌─────────────────────┐
│ 🔴 HIGH             │
│ 22:30 UTC / 5h 14m  │
│ ECB Interest Rate   │
│ Decision            │
│ EUR | 4.25% Forecast│
│ Sentiment: 🟢Bullish│
└─────────────────────┘
```

**Item Layout - News**:

```
┌─────────────────────┐
│ 📰 MARKET NEWS      │
│ 14:22 UTC           │
│ Dollar softens...   │
│ 🟢 Bullish EURUSD   │
│ [Read More]         │
└─────────────────────┘
```

**Auto-scroll Logic**:

```typescript
useEffect(() => {
  if (!autoScroll) return;

  const interval = setInterval(() => {
    setCurrentIndex((prev) => (prev + 1) % items.length);
  }, scrollInterval);

  return () => clearInterval(interval);
}, [autoScroll, items.length, scrollInterval]);
```

**Controls**:

- Left/Right arrows to navigate
- Pause auto-scroll on hover
- Timeline indicators (dots)

---

## ⚖️ Widget #6: DAILY RISK DASHBOARD

**File**: `frontend/components/dashboard/widgets/DailyRiskDashboard.tsx`

**Purpose**: Display risk usage and account heat for today

**Component Structure**:

```typescript
interface DailyRiskDashboardProps {
  dailyRiskUsed: number;
  dailyRiskLimit: number;
  tradesToday: number;
  accountHeat: number;
  nextTradeRiskAdvice: number;
}

export function DailyRiskDashboard({
  dailyRiskUsed,
  dailyRiskLimit,
  tradesToday,
  accountHeat,
  nextTradeRiskAdvice,
}: DailyRiskDashboardProps);
```

**Features Required**:

- ✅ Progress bar: Risk used vs limit
- ✅ Color gradient: Green (0-50%), Yellow (50-75%), Red (75%+)
- ✅ Percentage display
- ✅ Remaining amount in $
- ✅ Account Heat gauge (0-100)
- ✅ Heat zones: Cold (<30%), Warm (30-70%), Hot (70-90%), Danger (>90%)
- ✅ Risk breakdown: Today's trades count
- ✅ Next trade recommendation
- ✅ Quick access to lot calculator

**Layout**:

```
Risk Used Today
████░░░░ 45% ($450 / $1,000)

Remaining: $550
Trades Today: 3

Account Heat: WARM (65°)
├─ Cold: <30%
├─ Warm: 30-70% ← YOU ARE HERE
├─ Hot: 70-90%
└─ Danger: >90%

Next Trade Recommendation
├─ Recommended Risk: 1.5% = $15
├─ Recommended Lot: 0.50
├─ Safe to Enter: ✅ YES
└─ [Open Calculator]
```

**Color Schema**:

```
Progress bar:
├─ 0-50%: gradient-green
├─ 50-75%: gradient-yellow
└─ 75%+: gradient-red

Heat:
├─ Cold: blue
├─ Warm: yellow
├─ Hot: orange
└─ Danger: red
```

**Data Source**:

```typescript
// From backend /api/risk/dashboard
const riskData = await fetch("/api/risk/dashboard").then((r) => r.json());

// Calculate from trades
const dailyRiskUsed = trades
  .filter((t) => new Date(t.date) === today)
  .reduce((sum, t) => sum + Math.abs(t.profit), 0);
```

---

## ✍️ Widget #7: QUICK TRADE ENTRY

**File**: `frontend/components/dashboard/widgets/QuickTradeEntry.tsx`

**Purpose**: Fast trade logging without leaving dashboard

**Component Structure**:

```typescript
interface QuickTradeEntryProps {
  onTradeLogged?: (trade: Partial<TradeData>) => void;
  pairs?: string[];
}

export function QuickTradeEntry({
  onTradeLogged,
  pairs = ["EURUSD", "GBPUSD", "USDJPY"],
}: QuickTradeEntryProps);
```

**Features Required**:

- ✅ 3 rows × 4 input fields
- ✅ Pair autocomplete
- ✅ Direction toggle (Long/Short)
- ✅ Entry price input
- ✅ SL and TP inputs
- ✅ Notes textarea
- ✅ Auto-calculate RR ratio
- ✅ LOG button → submit
- ✅ CALC RR button → auto-fill TP
- ✅ CLEAR button → reset form
- ✅ Success notification
- ✅ Form validation with errors

**Form Layout**:

```
Row 1:
[EURUSD ▼] [📈 Long] [📉 Short]

Row 2:
[Entry: 1.0850] [SL: 1.0820] [TP: 1.0900]

Row 3:
[Notes: Quick SMA bounce] [RR: 1:2] [LOG]
```

**Validation Rules**:

```typescript
const validate = (data) => {
  const errors: Record<string, string> = {};

  if (!data.pair) errors.pair = "Pair required";
  if (!data.entry) errors.entry = "Entry required";
  if (!data.sl) errors.sl = "Stop loss required";
  if (!data.tp) errors.tp = "Take profit required";
  if (!data.direction) errors.direction = "Direction required";

  if (data.entry <= 0) errors.entry = "Entry must be > 0";

  // Validate SL/TP based on direction
  if (data.direction === "Long") {
    if (data.sl >= data.entry) errors.sl = "SL must be < Entry";
    if (data.tp <= data.entry) errors.tp = "TP must be > Entry";
  } else {
    if (data.sl <= data.entry) errors.sl = "SL must be > Entry";
    if (data.tp >= data.entry) errors.tp = "TP must be < Entry";
  }

  return errors;
};
```

**RR Calculation**:

```typescript
const calculateRR = (entry, sl, tp) => {
  const slDist = Math.abs(entry - sl);
  const tpDist = Math.abs(tp - entry);
  const rr = tpDist / slDist;
  return rr.toFixed(2);
};
```

**Success Flow**:

```
1. User enters: EURUSD, Long, 1.0850 SL, 1.0820, TP 1.0900
2. Click LOG
3. Validate form
4. Calculate RR (1:2.5)
5. Submit to API
6. Show toast: "✅ Trade logged"
7. Clear form
8. Update recent trades table
9. "View in journal" link
```

---

## 🔔 Widget #8: ACTIVE ALERTS PANEL

**File**: `frontend/components/dashboard/widgets/ActiveAlertsPanel.tsx`

**Purpose**: Show pending alerts and recent notifications

**Component Structure**:

```typescript
interface Alert {
  id: string;
  type: "TP_HIT" | "SL_HIT" | "POSITION_OPEN" | "IMPORT_DONE" | "EVENT";
  message: string;
  pair?: string;
  profit?: number;
  timestamp: string;
  severity: "info" | "success" | "warning" | "error";
  actionUrl?: string;
}

interface ActiveAlertsPanelProps {
  alerts: Alert[];
  onDismiss?: (alertId: string) => void;
  onAction?: (alertId: string) => void;
}

export function ActiveAlertsPanel({
  alerts,
  onDismiss,
  onAction,
}: ActiveAlertsPanelProps);
```

**Features Required**:

- ✅ Timeline format (vertical)
- ✅ 3 active alerts min
- ✅ Alert history (7-day log)
- ✅ Color-coded severity icons
- ✅ Dismiss button per alert
- ✅ Action button (Replay/View/Details)
- ✅ Timestamp (relative: "2m ago")
- ✅ Auto-refresh every 10 seconds
- ✅ Filter by type (Position/Account/System)
- ✅ Empty state message

**Alert Types & Colors**:

```
🔴 CRITICAL (SL hit, margin low):
   └─ bg-red-900/20, text-red-400, left-border red

🟡 WARNING (TP hit, import done):
   └─ bg-yellow-900/20, text-yellow-400, left-border yellow

🟢 SUCCESS (Position opened):
   └─ bg-green-900/20, text-green-400, left-border green

⚪ INFO (News event):
   └─ bg-gray-900/20, text-gray-400, left-border gray
```

**Timeline Layout**:

```
┌──────────────────────────────┐
│ ACTIVE ALERTS (3)            │
├──────────────────────────────┤
│ ● [Timeline dot]             │
│ 🔴 EURUSD TP Hit             │
│ 14:32 | +$250 | Trade Closed │
│ [Dismiss] [Replay]           │
├──────────────────────────────┤
│ ● [Timeline dot]             │
│ 🟡 Margin Level: 250%        │
│ 14:28 | Risk Medium          │
│ [Dismiss] [View Account]     │
├──────────────────────────────┤
│ ● [Timeline dot]             │
│ 🟢 CSV Import Complete       │
│ 14:15 | 125 trades imported  │
│ [Dismiss] [View Details]     │
└──────────────────────────────┘

📋 ALERT HISTORY (Last 7 days)
├─ 45 position alerts
├─ 8 account alerts
└─ 3 system alerts
```

**Data Source**:

```typescript
// Fetch active alerts
const fetchAlerts = async () => {
  const res = await fetch("/api/alerts/active");
  const data = await res.json();
  setAlerts(data.alerts);
};

// Auto-refresh
useEffect(() => {
  fetchAlerts();
  const interval = setInterval(fetchAlerts, 10000);
  return () => clearInterval(interval);
}, []);
```

---

# SECTION 2: CORE FUNCTIONS TO BUILD

## 🔧 UTILITY FUNCTIONS

### 1. Trade Calculations

**File**: `frontend/lib/tradeCalculations.ts`

```typescript
/**
 * Calculate Risk/Reward Ratio
 */
export function calculateRR(
  entry: number,
  stopLoss: number,
  takeProfit: number,
  direction: "Long" | "Short",
): number {
  let riskDistance = 0;
  let rewardDistance = 0;

  if (direction === "Long") {
    riskDistance = entry - stopLoss;
    rewardDistance = takeProfit - entry;
  } else {
    riskDistance = stopLoss - entry;
    rewardDistance = entry - takeProfit;
  }

  if (riskDistance === 0) return 0;
  return rewardDistance / riskDistance;
}

/**
 * Calculate Lot Size based on risk parameters
 */
export function calculateLotSize(
  accountBalance: number,
  riskPercent: number,
  stopLossPips: number,
  pipValue: number,
): number {
  const riskAmount = (riskPercent / 100) * accountBalance;
  const totalRisk = stopLossPips * pipValue;

  if (totalRisk === 0) return 0;
  return riskAmount / totalRisk;
}

/**
 * Calculate Maximum Drawdown
 */
export function calculateMaxDrawdown(trades: TradeData[]): number {
  if (trades.length === 0) return 0;

  let peak = 0;
  let maxDrawdown = 0;
  let balance = 0;

  trades.forEach((trade) => {
    balance += trade.profit;
    peak = Math.max(peak, balance);
    const drawdown = peak - balance;
    maxDrawdown = Math.max(maxDrawdown, drawdown);
  });

  return maxDrawdown;
}

/**
 * Calculate Win Rate
 */
export function calculateWinRate(trades: TradeData[]): number {
  if (trades.length === 0) return 0;
  const wins = trades.filter((t) => t.profit > 0).length;
  return (wins / trades.length) * 100;
}

/**
 * Calculate Profit Factor
 */
export function calculateProfitFactor(trades: TradeData[]): number {
  const grossProfit = trades
    .filter((t) => t.profit > 0)
    .reduce((sum, t) => sum + t.profit, 0);

  const grossLoss = Math.abs(
    trades.filter((t) => t.profit < 0).reduce((sum, t) => sum + t.profit, 0),
  );

  if (grossLoss === 0) return grossProfit > 0 ? Infinity : 0;
  return grossProfit / grossLoss;
}

/**
 * Calculate Average Win/Loss
 */
export function calculateAverageWinLoss(trades: TradeData[]): {
  avgWin: number;
  avgLoss: number;
} {
  const wins = trades.filter((t) => t.profit > 0);
  const losses = trades.filter((t) => t.profit < 0);

  const avgWin =
    wins.length > 0
      ? wins.reduce((sum, t) => sum + t.profit, 0) / wins.length
      : 0;

  const avgLoss =
    losses.length > 0
      ? losses.reduce((sum, t) => sum + t.profit, 0) / losses.length
      : 0;

  return { avgWin, avgLoss };
}

/**
 * Calculate Expectancy (Expected value per trade)
 */
export function calculateExpectancy(trades: TradeData[]): number {
  if (trades.length === 0) return 0;

  const winRate = calculateWinRate(trades) / 100;
  const { avgWin, avgLoss } = calculateAverageWinLoss(trades);

  return winRate * avgWin - (1 - winRate) * Math.abs(avgLoss);
}

/**
 * Calculate Sharpe Ratio
 */
export function calculateSharpeRatio(
  trades: TradeData[],
  riskFreeRate: number = 0.02,
): number {
  if (trades.length < 2) return 0;

  const returns = trades.map((t) => t.profit);
  const meanReturn = returns.reduce((a, b) => a + b, 0) / returns.length;

  const variance =
    returns.reduce((sum, r) => sum + Math.pow(r - meanReturn, 2), 0) /
    returns.length;

  const stdDev = Math.sqrt(variance);

  if (stdDev === 0) return 0;
  return (meanReturn - riskFreeRate) / stdDev;
}

/**
 * Calculate Sortino Ratio (downside volatility only)
 */
export function calculateSortinoRatio(
  trades: TradeData[],
  targetReturn: number = 0,
): number {
  if (trades.length < 2) return 0;

  const returns = trades.map((t) => t.profit);
  const meanReturn = returns.reduce((a, b) => a + b, 0) / returns.length;

  const downsideReturns = returns.filter((r) => r < targetReturn);

  if (downsideReturns.length === 0) return 0;

  const downsideVariance =
    downsideReturns.reduce(
      (sum, r) => sum + Math.pow(Math.min(r - targetReturn, 0), 2),
      0,
    ) / downsideReturns.length;

  const downsideStdDev = Math.sqrt(downsideVariance);

  if (downsideStdDev === 0) return 0;
  return (meanReturn - targetReturn) / downsideStdDev;
}

/**
 * Calculate Monthly Performance
 */
export function calculateMonthlyPerformance(
  trades: TradeData[],
): Record<string, { profit: number; trades: number; winRate: number }> {
  const monthlyMap = new Map<
    string,
    { profit: number; trades: number; wins: number }
  >();

  trades.forEach((trade) => {
    const date = new Date(trade.date);
    const monthKey = `${date.getFullYear()}-${String(
      date.getMonth() + 1,
    ).padStart(2, "0")}`;

    if (!monthlyMap.has(monthKey)) {
      monthlyMap.set(monthKey, { profit: 0, trades: 0, wins: 0 });
    }

    const m = monthlyMap.get(monthKey)!;
    m.profit += trade.profit;
    m.trades++;
    if (trade.profit > 0) m.wins++;
  });

  const result: Record<
    string,
    { profit: number; trades: number; winRate: number }
  > = {};

  monthlyMap.forEach((value, key) => {
    result[key] = {
      profit: value.profit,
      trades: value.trades,
      winRate: (value.wins / value.trades) * 100,
    };
  });

  return result;
}

/**
 * Group trades by time of day
 */
export function groupTradesByTimeOfDay(
  trades: TradeData[],
): Record<string, TradeData[]> {
  const sessions = {
    "London Open (08:00-12:00)": [] as TradeData[],
    "US Open (12:30-17:00)": [] as TradeData[],
    "Asia Session (22:00-06:00)": [] as TradeData[],
    Other: [] as TradeData[],
  };

  trades.forEach((trade) => {
    const date = new Date(trade.date);
    const hours = date.getHours();

    if (hours >= 8 && hours < 12) {
      sessions["London Open (08:00-12:00)"].push(trade);
    } else if (hours >= 12 && hours < 17) {
      sessions["US Open (12:30-17:00)"].push(trade);
    } else if (hours >= 22 || hours < 6) {
      sessions["Asia Session (22:00-06:00)"].push(trade);
    } else {
      sessions["Other"].push(trade);
    }
  });

  return sessions;
}
```

---

### 2. API Integration Functions

**File**: `frontend/lib/apiClient.ts`

```typescript
const API_BASE = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000";
const BRIDGE_URL =
  process.env.NEXT_PUBLIC_BRIDGE_URL || "http://localhost:5003";

/**
 * Fetch Recent Trades
 */
export async function fetchRecentTrades(
  limit: number = 8,
  filters?: {
    pair?: string;
    outcome?: "Win" | "Loss" | "Breakeven";
    strategy?: string;
  },
): Promise<TradeData[]> {
  const params = new URLSearchParams({
    limit: limit.toString(),
    ...(filters?.pair && { pair: filters.pair }),
    ...(filters?.outcome && { outcome: filters.outcome }),
    ...(filters?.strategy && { strategy: filters.strategy }),
  });

  const res = await fetch(`${API_BASE}/api/trades?${params}`, {
    headers: { "ngrok-skip-browser-warning": "true" },
  });

  if (!res.ok) throw new Error("Failed to fetch trades");
  return res.json();
}

/**
 * Fetch Open Positions from MT5
 */
export async function fetchOpenPositions(
  accountId?: string,
): Promise<Position[]> {
  const res = await fetch(
    `${BRIDGE_URL}/api/positions${accountId ? `?account=${accountId}` : ""}`,
    { headers: { "ngrok-skip-browser-warning": "true" } },
  );

  if (!res.ok) return [];
  const data = await res.json();
  return data.positions || [];
}

/**
 * Fetch Economic Calendar
 */
export async function fetchEconomicCalendar(
  daysAhead: number = 7,
): Promise<CalendarEvent[]> {
  const res = await fetch(
    `${BRIDGE_URL}/api/calendar?days_ahead=${daysAhead}`,
    { headers: { "ngrok-skip-browser-warning": "true" } },
  );

  if (!res.ok) return [];
  const data = await res.json();
  return data.events || [];
}

/**
 * Fetch News Feed
 */
export async function fetchNewsFeed(): Promise<NewsItem[]> {
  const res = await fetch(`${BRIDGE_URL}/api/news`, {
    headers: { "ngrok-skip-browser-warning": "true" },
  });

  if (!res.ok) return [];
  const data = await res.json();
  return data.news || [];
}

/**
 * Fetch Risk Dashboard
 */
export async function fetchRiskDashboard(): Promise<RiskData> {
  const res = await fetch(`${API_BASE}/api/risk/dashboard`, {
    headers: { "ngrok-skip-browser-warning": "true" },
  });

  if (!res.ok) throw new Error("Failed to fetch risk data");
  return res.json();
}

/**
 * Log New Trade
 */
export async function logNewTrade(
  tradeData: Partial<TradeData>,
): Promise<TradeData> {
  const res = await fetch(`${API_BASE}/api/trades`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(tradeData),
  });

  if (!res.ok) throw new Error("Failed to log trade");
  return res.json();
}

/**
 * Fetch Active Alerts
 */
export async function fetchActiveAlerts(): Promise<Alert[]> {
  const res = await fetch(`${API_BASE}/api/alerts/active`, {
    headers: { "ngrok-skip-browser-warning": "true" },
  });

  if (!res.ok) return [];
  return res.json();
}

/**
 * Dismiss Alert
 */
export async function dismissAlert(alertId: string): Promise<void> {
  const res = await fetch(`${API_BASE}/api/alerts/${alertId}/dismiss`, {
    method: "POST",
  });

  if (!res.ok) throw new Error("Failed to dismiss alert");
}
```

---

### 3. Custom Hooks

**File**: `frontend/hooks/usePositions.ts`

```typescript
export function usePositions(fetchInterval: number = 5000) {
  const [positions, setPositions] = useState<Position[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetch = async () => {
      try {
        setLoading(true);
        const pos = await fetchOpenPositions();
        setPositions(pos);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    };

    fetch();
    const interval = setInterval(fetch, fetchInterval);
    return () => clearInterval(interval);
  }, [fetchInterval]);

  return { positions, loading, error };
}
```

**File**: `frontend/hooks/useAlerts.ts`

```typescript
export function useAlerts(fetchInterval: number = 10000) {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);

  const dismissAlert = async (alertId: string) => {
    await dismissAlertAPI(alertId);
    setAlerts((prev) => prev.filter((a) => a.id !== alertId));
  };

  useEffect(() => {
    const fetch = async () => {
      try {
        const data = await fetchActiveAlerts();
        setAlerts(data);
      } catch (err) {
        console.error("Failed to fetch alerts:", err);
      } finally {
        setLoading(false);
      }
    };

    fetch();
    const interval = setInterval(fetch, fetchInterval);
    return () => clearInterval(interval);
  }, [fetchInterval]);

  return { alerts, loading, dismissAlert };
}
```

---

# SECTION 3: EMPTY PAGES TO FILL (7 PAGES)

## 1. `/strategies` - Strategy Management

**File**: `frontend/app/strategies/page.tsx`

**Purpose**: Create, manage, and track trading strategies

**Features to Build**:

- ✅ Strategy list table
- ✅ Create new strategy form
- ✅ Edit existing strategy
- ✅ Delete strategy
- ✅ Strategy performance metrics
- ✅ Win rate per strategy
- ✅ Total trades per strategy
- ✅ Best/worst trade analysis
- ✅ Strategy tags/categories
- ✅ Notes and description

**Page Layout**:

```
[New Strategy Button]

Strategy List:
┌────────────────────────────────────┐
│ Name | Trades | Win% | P&L | Action│
├────────────────────────────────────┤
│ Support/Resistance | 15 | 73% | ... │
│ Breakout | 12 | 67% | ... │
└────────────────────────────────────┘
```

**API Endpoints Needed**:

- `POST /api/strategies` - Create
- `GET /api/strategies` - List all
- `GET /api/strategies/:id` - Get one
- `PUT /api/strategies/:id` - Update
- `DELETE /api/strategies/:id` - Delete
- `GET /api/strategies/:id/performance` - Get stats

---

## 2. `/bot` - Trading Bot Configuration

**File**: `frontend/app/bot/page.tsx`

**Purpose**: Configure and manage automated trading bot

**Features to Build**:

- ✅ Bot status toggle (On/Off)
- ✅ Strategy selection
- ✅ Risk settings
- ✅ Pair selection
- ✅ Time restrictions
- ✅ Performance log
- ✅ Real-time profit/loss
- ✅ Trade execution history
- ✅ Alert settings
- ✅ Enable/disable features

**Configuration Form**:

```
Bot Status: [Toggle On/Off]
Strategy: [Select Strategy]
Pairs: [EURUSD, GBPUSD, ...]

Risk Settings:
├─ Max Risk per Trade: 2%
├─ Max Daily Loss: 5%
└─ Position Sizing: [Auto/Manual]

Time Restrictions:
├─ Start Time: 08:00
├─ End Time: 17:00
└─ Days: [Sun-Fri checkboxes]

Notifications:
├─ Trade Executed
├─ Loss Hit
└─ Daily Goal Reached
```

---

## 3. `/calendar` - Trading Calendar Heatmap

**File**: `frontend/app/calendar/page.tsx`

**Purpose**: Visualize trading activity and performance by day

**Features to Build**:

- ✅ Monthly calendar view
- ✅ Color-coded daily P&L (green/red)
- ✅ Trade count per day
- ✅ Win rate per day
- ✅ Click day → show trades for that day
- ✅ Month navigation
- ✅ Year view option
- ✅ Filter by strategy
- ✅ Heatmap legend
- ✅ Statistics panel

**Calendar Cell Data**:

```
┌──────┐
│  27  │ ← Day number
│█████ │ ← Trade height
│+$250 │ ← Daily P&L (green)
│3W 1L │ ← Win/Loss count
└──────┘
```

**Color Scheme**:

- Deep green: High profit, multiple wins
- Light green: Small profit
- White: Breakeven
- Light red: Small loss
- Deep red: Large loss
- Gray: No trades

---

## 4. `/trading-plan` - Trading Plan Builder

**File**: `frontend/app/trading-plan/page.tsx`

**Purpose**: Create and manage daily/weekly trading plans

**Features to Build**:

- ✅ Plan template builder
- ✅ Daily plan form
- ✅ Key levels (Support/Resistance)
- ✅ Expected pairs to trade
- ✅ Risk/Reward targets
- ✅ Time zones to trade
- ✅ Plan review checklist
- ✅ Plan history
- ✅ Plan vs execution comparison
- ✅ Plan notes

**Plan Structure**:

```
Daily Trading Plan - 2025-11-27
├── Key Levels
│   ├─ EURUSD: S1: 1.0820, R1: 1.0900
│   ├─ GBPUSD: S1: 1.2650, R1: 1.2750
│   └─ USDJPY: S1: 149.50, R1: 150.50
├── Expected Pairs: EURUSD, GBPUSD
├── Risk Per Trade: 2%
├── RR Target: 1:2 minimum
├── Trading Hours: 08:00 - 17:00 (London/US)
├── Max Daily Risk: $500
└── Notes: Focus on retracements after NY open
```

---

## 5. `/wrandrr` - Win Rate & R-Multiple Analysis

**File**: `frontend/app/wrandrr/page.tsx`

**Purpose**: Detailed analysis of wins, losses, and R-multiples

**Features to Build**:

- ✅ Win rate trend chart
- ✅ R-multiple distribution
- ✅ Consecutive wins/losses tracker
- ✅ Win/loss streaks
- ✅ Best/worst R-multiple
- ✅ Cumulative R-multiple
- ✅ Win rate by time of day
- ✅ Win rate by pair
- ✅ Win rate by strategy
- ✅ Statistics dashboard

**Visualizations**:

- Win rate line chart (30-day trend)
- R-multiple histogram
- Streak tracker (calendar)
- Pair performance matrix
- Time-of-day heatmap

---

## 6. Gold Simulators (3 Pages)

### A. `/FixedGoldSimulator`

**Purpose**: Trade simulations with fixed risk

**Features**:

- Account balance simulator
- Fixed $100 per trade
- Trade execution
- Results tracking
- Success rate

### B. `/FlexibleGoldSimulator`

**Purpose**: Flexible lot size trading

**Features**:

- Adjustable lot sizes
- Risk percentage inputs
- Trade results
- P&L tracking

### C. `/GoldTradingSimulator`

**Purpose**: General gold trading playground

**Features**:

- Live gold price
- Trade entry/exit
- Position tracking
- Results history

---

## 7. Empty Page Templates

These stubs also need content:

- `/pipreference` - Pip values reference guide
- `/livemonitorchart` - Live chart monitoring
- `/RiskTableCalculation` - Risk calculation table (already has component)

---

# SECTION 4: ENHANCED FEATURES

## Backend Enhancements Needed

### 1. Endpoint: GET /api/trades/recent

```
Query: limit=8, pair=EURUSD, outcome=Win
Response: [...trades]
```

### 2. Endpoint: GET /api/strategies/:id/stats

```
Response: {
  totalTrades: 15,
  wins: 11,
  losses: 4,
  winRate: 73.3,
  profitFactor: 2.1,
  avgWin: 250,
  avgLoss: 150,
  bestTrade: 500,
  worstTrade: -300,
  totalProfit: 2500
}
```

### 3. Endpoint: POST /api/alerts/dismiss

```
Body: { alertId: "123" }
Response: { success: true }
```

### 4. Endpoint: GET /api/risk/daily-status

```
Response: {
  riskedToday: 450,
  dailyLimit: 1000,
  accountHeat: 65,
  tradesToday: 3,
  nextTradeAdvice: 200
}
```

---

# SECTION 5: COMPLETE API INTEGRATION MAP

```
FRONTEND ──→ BACKEND API ──→ DATABASE
             ├─ /api/trades ──→ PostgreSQL trades table
             ├─ /api/strategies ──→ PostgreSQL strategies
             ├─ /api/risk ──→ Calculations
             └─ /api/alerts ──→ Alert rules

FRONTEND ──→ MT5 BRIDGE ──→ METATRADER 5
             ├─ /api/positions ──→ Live positions
             ├─ /api/account ──→ Account info
             ├─ /api/calendar ──→ Economic events
             ├─ /api/news ──→ Market news
             └─ /health ──→ Connection status

FRONTEND ──→ WEBHOOK SERVICES
             ├─ Discord ──→ Notifications
             ├─ Telegram ──→ Alerts
             └─ Email ──→ Reports
```

---

# SECTION 6: IMPLEMENTATION CHECKLIST

## Phase 1: Dashboard Widgets (Week 1)

- [ ] Create widgets folder structure
- [ ] Build RecentTradesTable
- [ ] Build EquityCurveChart
- [ ] Build StrategyPerformance
- [ ] Build OpenPositionsList
- [ ] Test data integration
- [ ] Mobile responsive testing

## Phase 2: More Widgets (Week 2)

- [ ] Build EconomicNewsTicker
- [ ] Build DailyRiskDashboard
- [ ] Build QuickTradeEntry
- [ ] Build ActiveAlertsPanel
- [ ] Integrate all into dashboard
- [ ] Performance optimization

## Phase 3: Utility Functions (Week 3)

- [ ] Implement trade calculations
- [ ] Implement API clients
- [ ] Create custom hooks
- [ ] Unit tests for functions
- [ ] Error handling

## Phase 4: Empty Pages (Week 4-5)

- [ ] Build /strategies page
- [ ] Build /bot page
- [ ] Build /calendar page
- [ ] Build /trading-plan page
- [ ] Build /wrandrr page
- [ ] Build gold simulators

## Phase 5: Backend APIs (Week 6)

- [ ] Create missing endpoints
- [ ] Database schema updates
- [ ] API error handling
- [ ] Rate limiting
- [ ] Authentication

## Phase 6: Testing & Polish (Week 7-8)

- [ ] End-to-end testing
- [ ] Performance testing
- [ ] Security audit
- [ ] Mobile testing
- [ ] Bug fixes

---

## ESTIMATED HOURS BY SECTION

| Section               | Est. Hours  | Priority  |
| --------------------- | ----------- | --------- |
| Dashboard Widgets (8) | 60-80       | 🔴 URGENT |
| Utility Functions     | 20-30       | 🔴 URGENT |
| API Integration       | 30-40       | 🟠 HIGH   |
| Empty Pages (7)       | 80-120      | 🟡 MEDIUM |
| Backend Endpoints     | 40-60       | 🟠 HIGH   |
| Testing & Polish      | 40-60       | 🟡 MEDIUM |
| **TOTAL**             | **270-390** | —         |

---

## SUCCESS CRITERIA

✅ All 8 dashboard widgets working
✅ All 7 empty pages have content
✅ All utility functions tested
✅ API integration complete
✅ Dashboard loads <2 seconds
✅ Real-time updates working
✅ Mobile responsive
✅ No console errors
✅ 90%+ test coverage
✅ Production ready

---

**END OF IMPLEMENTATION GUIDE**

**Use this document to:**

1. Brief developers on work to do
2. Create sprint tasks
3. Estimate project hours
4. Track progress
5. Reference during development

**This is your complete blueprint.** 🚀
