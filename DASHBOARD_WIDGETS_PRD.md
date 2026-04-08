# Dashboard Widgets - Product Requirements Document (PRD)

**Last Updated**: April 7, 2026  
**Project**: TradeKiller Pro Dashboard Enhancement  
**Scope**: Add 8 critical widgets to dashboard

---

## 📋 TABLE OF CONTENTS

1. [Executive Summary](#executive-summary)
2. [Current State vs Target State](#current-state-vs-target-state)
3. [Widget Specifications](#widget-specifications)
4. [Data Requirements](#data-requirements)
5. [Integration Architecture](#integration-architecture)
6. [UI/UX Specifications](#uiux-specifications)
7. [Implementation Roadmap](#implementation-roadmap)

---

## EXECUTIVE SUMMARY

The current TradeKiller Pro dashboard displays 10 widgets covering account status and market conditions. However, **8 critical widgets are missing** that would complete the trader's command center with:

- Real-time trading activity visibility
- Performance analysis
- Risk management overview
- Community engagement
- Quick-access trading tools

**Goal**: Add these 8 widgets to provide a complete, actionable dashboard in **2-3 development iterations**.

**KPIs**:

- Dashboard load time: <2s
- Widget interactions: <100ms
- Real-time data updates: <500ms
- Mobile responsiveness: 100%

---

## CURRENT STATE vs TARGET STATE

### Current Dashboard Sections

```
SECTION 1: Header + Session Timeline
   └─ Welcome message
   └─ SessionTimeline component

SECTION 2: AI Macro + Discipline + Capital Flow
   └─ AIMacroDeskSection (left col, 8 cols)
   └─ DisciplineScoreWidget (right col, 4 cols)
   └─ For You Briefing
   └─ CapitalFlow

SECTION 3: Market Conditions
   └─ ConditionMeter 3x (Flow, Bearing, Pulse)

SECTION 4: Account Pulse (5 cards)
   └─ Balance
   └─ Floating P&L
   └─ Margin Level
   └─ Drawdown %
   └─ Win Rate (donut)

DASHBOARD ENDS HERE
```

### Target State (With New Widgets)

```
SECTION 1: Header + Session Timeline
   └─ Welcome message
   └─ SessionTimeline component

SECTION 2: AI Macro + Discipline + Capital Flow
   └─ AIMacroDeskSection (left col, 8 cols)
   └─ DisciplineScoreWidget (right col, 4 cols)
   └─ For You Briefing
   └─ CapitalFlow

SECTION 3: Market Conditions
   └─ ConditionMeter 3x (Flow, Bearing, Pulse)

SECTION 4: Account Pulse (5 cards)
   └─ Balance
   └─ Floating P&L
   └─ Margin Level
   └─ Drawdown %
   └─ Win Rate (donut)

SECTION 5: Quick Actions + Alerts ⚡ NEW
   └─ Quick Trade Entry Widget (span 6 cols)
   └─ Active Alerts Panel (span 6 cols)

SECTION 6: Trading Activity ⚡ NEW
   └─ Recent Trades Table (span 12 cols)

SECTION 7: Performance Analytics ⚡ NEW
   └─ Equity Curve Chart (span 6 cols)
   └─ Strategy Performance (span 6 cols)

SECTION 8: Market & Positions ⚡ NEW
   └─ Open Positions List (span 7 cols)
   └─ Economic News Ticker (span 5 cols)

SECTION 9: Risk & Community ⚡ NEW
   └─ Daily Risk Dashboard (span 6 cols)
   └─ Community Feed Snippet (span 6 cols)

DASHBOARD ENDS HERE
```

---

## WIDGET SPECIFICATIONS

### 1️⃣ RECENT TRADES TABLE

**Purpose**: Display last 8-12 trades with quick filtering and sorting

**Location**: Below Account Pulse (full width, 12 cols)

**Data Source**: `useCsvTrades()` hook → `trades` array

**Columns**:
| Column | Width | Format | Color |
|--------|-------|--------|-------|
| Date | 15% | DD/MM/YYYY | text-gray-400 |
| Pair | 15% | EURUSD | text-white |
| Direction | 12% | Long/Short badge | green/red badge |
| Entry | 12% | 1.0850 | font-mono |
| SL | 10% | 1.0820 | font-mono |
| TP | 10% | 1.0900 | font-mono |
| Profit | 16% | +$250 / -$125 | green/red text |
| Status | 10% | Win/Loss/Pending | badge |

**Features**:

- Sortable columns (click header to sort)
- Filterable by outcome (Win/Loss/All)
- Filterable by pair (dropdown)
- Pagination (show 8/12 per page)
- Click row → expand details
- Responsive (stack on mobile)

**Styling**:

```
Background: var(--bg-card)
Border: 1px solid var(--border)
Header BG: rgba(255, 255, 255, 0.03)
Row hover: rgba(255, 255, 255, 0.05)
Win text: var(--bull) #00dc82
Loss text: var(--bear) #ef4444
Trade ID: monospace, gray-500
```

**Interactions**:

- Hover row → highlight + show 3-dot menu
- Click 3-dot menu → Edit / Delete / Copy options
- Click pair → filter table to that pair
- Click Win/Loss badge → filter to outcome type

**Load State**:

- Skeleton loading (8 rows)
- Animation: fade-in

**Empty State**:

```
┌─────────────────────────────┐
│  📊 No trades yet           │
│  Start logging trades or    │
│  import CSV to see them here│
│  [Import CSV] [Log Trade]   │
└─────────────────────────────┘
```

---

### 2️⃣ EQUITY CURVE CHART

**Purpose**: Visualize account balance progression over last 30 trades/days

**Location**: Performance Analytics Section (left, 6 cols)

**Data Source**: `equityCurve` calculation from `useCsvTrades()`

**Chart Type**: Area chart (Recharts)

**Dimensions**:

- Width: Full container (responsive)
- Height: 280px
- Padding: 16px

**Data Points**:

```
X-axis: Date (MM/DD format)
Y-axis: Balance ($)
Points: 30 recent trades
```

**Visual Style**:

```
Area fill: linear-gradient(to top, rgba(0, 220, 130, 0.1), transparent)
Line stroke: #00dc82 (green)
Stroke width: 2px
Area: semi-transparent green
Grid: subtle, gray-700
Dot on hover: 6px radius, white border
```

**Features**:

- Tooltip on hover (date + balance + change)
- X-axis labels every 5 days
- Y-axis auto-scale
- Responsive (reflow on resize)
- Animation on load

**Title**:

```
Equity Curve
└─ Last 30 trades | Max: $12,500 | Min: $8,200
```

**Interactions**:

- Hover → show tooltip with exact values
- Click legend to toggle visibility
- Zoom on selection (future)

**Edge Cases**:

- Less than 30 trades: show available data
- No trades: show placeholder
- Negative equity: draw in red
- Large swings: auto-scale Y-axis

---

### 3️⃣ STRATEGY PERFORMANCE

**Purpose**: Show P&L breakdown by strategy and win rate per strategy

**Location**: Performance Analytics Section (right, 6 cols)

**Data Source**: `strategyStats` calculation from `useCsvTrades()`

**Chart Type**: Horizontal bar chart (Recharts)

**Data Format**:

```
[
  { strategy: "Support/Resistance", pnl: 2500, trades: 15, winRate: 73.3 },
  { strategy: "Breakout", pnl: 1800, trades: 12, winRate: 66.7 },
  { strategy: "Scalp", pnl: -300, trades: 8, winRate: 37.5 }
]
```

**Bars**:

- Max 8 strategies displayed
- Bar length = P&L amount
- Green bar if pnl > 0
- Red bar if pnl < 0
- Length normalized to max value

**Alongside Each Bar**:

```
Strategy Name | Bar | PnL Amount | Trades | Win Rate %
```

**Styling**:

```
Positive bar: linear-gradient(90deg, #00dc82 0%, #00b570 100%)
Negative bar: linear-gradient(90deg, #ef4444 0%, #dc2626 100%)
Bar height: 28px
Gap between bars: 8px
Label color: text-white
Value color: gray-400
```

**Interactive**:

- Hover bar → show tooltip:
  ```
  Support/Resistance
  P&L: +$2,500
  Win Rate: 73.3%
  Trades: 15
  ```
- Click strategy → filter trades table to that strategy
- Click bar → open strategy details page

**Empty State**:

```
No strategy data
Log trades with strategy names to see breakdown
```

**Legend**:

```
□ Win  □ Loss  □ Breakeven
(at bottom of chart)
```

---

### 4️⃣ OPEN POSITIONS LIST

**Purpose**: Display active trades from MT5 in real-time

**Location**: Market & Positions Section (left, 7 cols)

**Data Source**: `mt5Data` from bridge API → `/bridge/accounts/:id/positions`

**Columns**:
| Column | Width | Format |
|--------|-------|--------|
| Ticket | 10% | #123456 |
| Pair | 12% | EURUSD |
| Type | 10% | Long/Short |
| Entry | 12% | 1.0850 |
| Current | 12% | 1.0875 |
| SL | 10% | 1.0820 |
| TP | 10% | 1.0900 |
| P&L | 14% | +$125 (5.2%) |

**Row Styling**:

```
Profitable trade: border-left-4 solid #00dc82
Losing trade: border-left-4 solid #ef4444
Breakeven: border-left-4 solid gray-600
```

**Features**:

- Real-time updates (every 2 seconds)
- Sort by P&L, Entry, Profit %
- Filter by pair
- Color-coded P&L (green/red)
- Live pip counter (if available)

**Interactions**:

- Hover → show full details (commission, time open)
- Click ticket → show position details modal
- Swipe (mobile) → reveal Close button

**Empty State**:

```
No open positions
Your account has no active trades
[Manual Entry] [Review Closed Trades]
```

**Connection States**:

```
✅ Connected - 3 open positions (updating)
⏳ Connecting... (grayed out)
❌ Disconnected - Last update: 2m ago
🔄 Reconnecting (1/3 attempts)
```

---

### 5️⃣ ECONOMIC NEWS TICKER

**Purpose**: Display upcoming economic events + latest news with sentiment

**Location**: Market & Positions Section (right, 5 cols)

**Data Source**:

- `/api/macro/calendar` for events
- `/api/macro/news` for news feed
- AI sentiment classification

**Layout**: Vertical scrolling feed

**Item Types**:

**Type 1: Economic Event**

```
┌─────────────────────────┐
│ 🔴 HIGH IMPORTANCE      │
│ 22:30 UTC / 5h 14m      │
│ ECB Interest Rate       │
│ Decision                │
│ EUR | Forecast: 4.25%   │
│ Sentiment: Bullish      │
└─────────────────────────┘
```

**Type 2: News Item**

```
┌─────────────────────────┐
│ 📰 MARKET NEWS          │
│ 14:22 UTC               │
│ Dollar softens as...    │
│ 🟢 Bullish for EURUSD   │
│ [Read More]             │
└─────────────────────────┘
```

**Features**:

- Auto-scroll (every 5 seconds advance 1 item)
- Manual scroll (left/right arrows)
- Timestamp countdown for upcoming events
- Sentiment badge (Bullish/Bearish/Neutral)
- Importance indicator (🔴 High, 🟡 Medium, 🟢 Low)

**Styling**:

```
Background: var(--bg-card)
Border: 1px solid var(--border)
Event icon: text-yellow-400
News icon: text-blue-400
Sentiment badge:
  - Bullish: bg-green-900/20, text-green-400
  - Bearish: bg-red-900/20, text-red-400
  - Neutral: bg-gray-900/20, text-gray-400
```

**Interactions**:

- Click event → open calendar details
- Click news → open news link (new tab)
- Pause auto-scroll on hover
- Keyboard: left/right arrows to navigate

---

### 6️⃣ DAILY RISK DASHBOARD

**Purpose**: Display risk usage and limits for today

**Location**: Risk & Community Section (left, 6 cols)

**Data Source**: Risk calculations from trades + account settings

**Components**:

**A. Risk Used Today**

```
Risk Used: $450 / $1,000 (45%)
▓▓▓▓░░░░░░ [Progress bar]

Risk per trade:
- Target: 2%
- Actual today: 1.8% avg
- Next trade risk: 2% ($200)
```

**B. Daily Limits**

```
Status: ✅ HEALTHY (55% remaining)

Daily Limit: $1,000
├─ Used: $450
├─ Remaining: $550
└─ Trades Today: 3

Max per Trade: $250
├─ Largest: $200
├─ Smallest: $50
└─ Safe Margin: $50
```

**C. Account Heat Gauge**

```
Account Heat: WARM (65°)
├─ Cold: <30% risk
├─ Warm: 30-70% risk  ← YOU ARE HERE
├─ Hot: 70-90% risk
└─ Danger: >90% risk

Heat affects: Position sizing advice
```

**D. Next Trade Recommendation**

```
For your next $250 trade:
✅ Recommended risk: 1.5% = $15
✅ Recommended lot: 0.50 (using 1:2 RR)
✅ Safe to enter: YES
```

**Styling**:

```
Progress bar (0-50%): gradient green-500
Progress bar (50-75%): gradient yellow-500
Progress bar (75-100%): gradient red-500

Alert colors:
- Healthy: text-green-400, bg-green-900/20
- Caution: text-yellow-400, bg-yellow-900/20
- Danger: text-red-400, bg-red-900/20
```

**Interactions**:

- Click progress bar → edit daily limit
- Click "Next Trade" → open lot calculator
- Hover stats → show formula explanation

**Edge Cases**:

- No trades today: Show "No risk today, first trade is safe"
- Limit exceeded: Show red warning with advice

---

### 7️⃣ QUICK TRADE ENTRY WIDGET

**Purpose**: Fast trade logging without leaving dashboard

**Location**: Quick Actions + Alerts Section (left, 6 cols)

**Layout**: Compact form (3 rows, 4 columns each)

**Row 1: Pair & Direction**

```
[EURUSD ▼] [📈 Long] [📉 Short]
```

**Row 2: Price Inputs**

```
[Entry: 1.0850] [SL: 1.0820] [TP: 1.0900]
```

**Row 3: Notes & Submit**

```
[Notes: Quick SMA bounce...] [LOG] [CALC RR]
```

**Features**:

- Autocomplete pair (EURUSD, GBPUSD, etc.)
- Quick direction toggle
- RR auto-calculation on blur
- One-click logging
- Clear/reset button

**Styling**:

```
Input: bg-white/5, border-white/10, rounded-lg
Input focus: border-blue-500, bg-white/8
Placeholder: text-gray-500
Button (LOG): bg-green-600 hover:bg-green-700
Button (CALC): bg-blue-600 hover:bg-blue-700
```

**Interactions**:

- Tab key → move to next field
- Enter in last field → submit form
- Click LOG → create trade, show confirmation
- Click CALC RR → calculate & fill TP field
- Click CLEAR → reset form

**Validation**:

- Entry price required
- Pair must be valid
- Direction required
- Show inline error messages (red text below field)

**Success Message**:

```
✅ Trade logged successfully
Date: 2025-11-27
Pair: EURUSD
Profit: +$250 (Win)
View in journal
```

**Empty State/Placeholder**:

```
"Log a trade in 10 seconds"
Quick way to record your trades
```

---

### 8️⃣ ACTIVE ALERTS PANEL

**Purpose**: Show pending alerts and recent notifications

**Location**: Quick Actions + Alerts Section (right, 6 cols)

**Alert Types**:

1. **Position Alerts** (from MT5)
   - Stop loss hit
   - Take profit reached
   - Position opened
   - Position closed

2. **Account Alerts**
   - Balance changed >X%
   - Margin level low
   - Order rejected

3. **System Alerts**
   - CSV import complete
   - Economic event (15min warning)
   - CSV import failed

**Layout**: Timeline format

```
┌─────────────────────────────────┐
│ ACTIVE ALERTS (3)               │
├─────────────────────────────────┤
│ 🔴 EURUSD TP Hit               │
│ 14:32 | +$250 | Trade Closed   │
│ [Dismiss] [Replay]              │
├─────────────────────────────────┤
│ 🟡 Margin Level: 250%           │
│ 14:28 | Risk Medium             │
│ [Dismiss] [View Account]        │
├─────────────────────────────────┤
│ 🟢 CSV Import Complete          │
│ 14:15 | 125 trades imported     │
│ [Dismiss] [View Details]        │
└─────────────────────────────────┘

📋 Alert History (Last 7 days)
├─ 45 position alerts
├─ 8 account alerts
└─ 3 system alerts
```

**Color Coding**:

```
🔴 Critical (SL hit, margin low): red
🟡 Warning (TP hit, import done): yellow
🟢 Success (Position opened): green
⚪ Info (News event): white
```

**Styling**:

```
Alert item: border-left-4 colored, bg-white/3, p-3, rounded
Icon: 20px, colored to match alert type
Time: text-gray-500, monospace, text-xs
Action buttons: text-xs, underline, hover color change
Timeline dot: 8px circle, colored, with connecting line
```

**Features**:

- Auto-refresh (every 5 seconds)
- Dismiss individual alerts (removes from active)
- View alert history (last 7 days)
- Filter by type (Position/Account/System)
- Click alert → navigate to relevant page

**Interactions**:

- Hover alert → show full details tooltip
- Click [Dismiss] → remove alert, move to history
- Click [Replay] → show trade details or playback
- Click alert itself → navigate to source (trade, account, etc.)

**Empty State**:

```
✅ No Active Alerts
Your account is running smoothly
Last alert: 3 hours ago
Check history for 7-day log
```

---

## DATA REQUIREMENTS

### API/Hook Integration

**From useCsvTrades() Hook**:

```typescript
{
  trades: Trade[],
  analytics: {
    totalTrades: number,
    winningTrades: number,
    losingTrades: number,
    breakEvenTrades: number,
    winRate: number,
    totalProfit: number,
    profitFactor: number,
    avgWin: number,
    avgLoss: number,
    bestTrade: number,
    worstTrade: number,
  },
  loading: boolean,
  error: string | null
}
```

**From MT5 Bridge** (`/bridge/accounts/:id/positions`):

```json
{
  "positions": [
    {
      "ticket": 123456,
      "pair": "EURUSD",
      "direction": "Long",
      "lotSize": 0.5,
      "entry": 1.085,
      "current": 1.0875,
      "sl": 1.082,
      "tp": 1.09,
      "pnl": 125.0,
      "openTime": "2025-11-27T10:15:00Z"
    }
  ]
}
```

**From Economic Calendar API** (`/api/macro/calendar`):

```json
{
  "events": [
    {
      "eventId": "123",
      "name": "ECB Interest Rate Decision",
      "country": "EUR",
      "date": "2025-12-12T13:45:00Z",
      "importance": "High",
      "forecast": 4.25,
      "previous": 4.0,
      "sentiment": "Bullish"
    }
  ]
}
```

**From News API** (`/api/macro/news`):

```json
{
  "news": [
    {
      "id": "123",
      "title": "Dollar softens into London",
      "body": "The Dollar is seeing...",
      "url": "https://...",
      "timestamp": "2025-11-27T14:22:00Z",
      "sentiment": "Bullish",
      "pairs": ["EURUSD", "GBPUSD"]
    }
  ]
}
```

**From Risk Calculator** (`/api/risk/dashboard`):

```json
{
  "dailyRiskUsed": 450.0,
  "dailyRiskLimit": 1000.0,
  "riskPercentageUsed": 45,
  "tradesToday": 3,
  "accountHeat": 65,
  "nextTradeRiskAdvice": 200.0,
  "maxPerTrade": 250.0
}
```

**From Alerts API** (`/api/alerts/active`):

```json
{
  "alerts": [
    {
      "id": "123",
      "type": "TP_HIT",
      "message": "EURUSD TP Hit",
      "pair": "EURUSD",
      "profit": 250.0,
      "timestamp": "2025-11-27T14:32:00Z",
      "severity": "info",
      "actionUrl": "/trades/123"
    }
  ]
}
```

---

## INTEGRATION ARCHITECTURE

### Component File Structure

```
frontend/components/dashboard/
├── widgets/
│   ├── RecentTradesTable.tsx
│   ├── EquityCurveChart.tsx
│   ├── StrategyPerformance.tsx
│   ├── OpenPositionsList.tsx
│   ├── EconomicNewsTicker.tsx
│   ├── DailyRiskDashboard.tsx
│   ├── QuickTradeEntry.tsx
│   └── ActiveAlertsPanel.tsx
├── sections/
│   ├── QuickActionsSection.tsx
│   ├── TradeActivitySection.tsx
│   ├── PerformanceSection.tsx
│   ├── MarketPositionsSection.tsx
│   └── RiskCommunitySection.tsx
└── hooks/
    ├── usePositions.ts (fetch open positions)
    ├── useAlerts.ts (fetch active alerts)
    ├── useEconomicEvents.ts (fetch calendar)
    └── useRiskDashboard.ts (fetch risk data)
```

### Data Flow

```
Dashboard Page
├─ useCsvTrades [hook]
├─ useState mt5Data
├─ useEffect fetchMT5 (every 5s)
├─ useMemo equityCurve
├─ useMemo strategyStats
├─ useMemo recentTrades
│
├─ Pass to <RecentTradesTable trades={recentTrades} />
├─ Pass to <EquityCurveChart data={equityCurve} />
├─ Pass to <StrategyPerformance data={strategyStats} />
├─ Pass to <OpenPositionsList positions={mt5Data.positions} />
├─ useEffect fetchEconomicEvents → <EconomicNewsTicker />
├─ useEffect fetchAlerts → <ActiveAlertsPanel />
├─ useEffect fetchRiskData → <DailyRiskDashboard />
└─ Form state → <QuickTradeEntry />
```

### Real-Time Updates

**MT5 Bridge Data** (every 5 seconds):

- Balance
- Equity
- Floating P&L
- Open positions
- Margin level

**Economic Events** (every 60 seconds):

- Upcoming events
- Countdown to event
- Event impact

**Alerts** (every 10 seconds):

- New alerts
- Alert dismissal

**Risk Dashboard** (every 30 seconds):

- Risk used today
- Account heat
- Remaining risk

---

## UI/UX SPECIFICATIONS

### Layout Grid

```
Dashboard (max-width: 1600px)
└── Sections
    ├── Section 1: Header (full width)
    ├── Section 2: AI Macro + Discipline (12 cols)
    │   ├── Left: 8 cols
    │   └── Right: 4 cols
    ├── Section 3: Market Conditions (3 × 4 cols)
    ├── Section 4: Account Pulse (5 cards, flexible)
    ├── Section 5: Quick Actions (2 × 6 cols) ⚡ NEW
    ├── Section 6: Trading Activity (1 × 12 cols) ⚡ NEW
    ├── Section 7: Performance Analytics (2 × 6 cols) ⚡ NEW
    ├── Section 8: Market & Positions (7 + 5 cols) ⚡ NEW
    └── Section 9: Risk & Community (2 × 6 cols) ⚡ NEW
```

### Responsive Design

**Desktop (>1024px)**:

- Full layout as specified
- Charts at full size
- Tables with all columns
- Sidebar visible

**Tablet (768px - 1023px)**:

- Stack to 2-column grid
- Charts maintain aspect ratio
- Tables remain scrollable
- Sidebar collapsible

**Mobile (<768px)**:

- Single column layout
- Stack all widgets vertically
- Tables horizontal scroll
- Charts responsive
- Sidebar under hamburger
- Widget height capped at viewport

### Color Palette

```
Primary Colors:
- Bull (green): #00dc82
- Bear (red): #ef4444
- Accent (blue): #3b82f6
- Neutral: #6b7280

Background:
- Primary: #0c0c0d
- Card: rgba(15, 23, 42, 0.5)
- Hover: rgba(255, 255, 255, 0.05)

Text:
- Primary: #f9fafb
- Secondary: #d1d5db
- Tertiary: #9ca3af
- Muted: #6b7280
```

### Typography

```
Headings:
- h1: 28px, font-bold, Syne, letter-spacing
- h2: 20px, font-semibold, Syne
- h3: 16px, font-semibold

Body:
- Large: 14px, regular
- Normal: 12px, regular
- Small: 10px, regular

Mono (prices, numbers):
- Font: IBM Plex Mono
- Size: 12px-16px
- Weight: bold
```

### Animations

```
Entry: fade-in 600ms ease-out
Hover: bg-color lighten 200ms ease-in
Toggle: scale 300ms ease-out
Chart: draw 800ms ease-in-out
Alert: slide-in-right 300ms ease-out
Loading: pulse 1.5s infinite
```

---

## IMPLEMENTATION ROADMAP

### Phase 1: Foundation (Week 1)

- [ ] Create widget components folder structure
- [ ] Create RecentTradesTable component
- [ ] Create EquityCurveChart component
- [ ] Integrate with dashboard page
- [ ] Test with sample data

**Deliverable**: 2 working widgets on dashboard

### Phase 2: Analytics & Positions (Week 2)

- [ ] Create StrategyPerformance component
- [ ] Create OpenPositionsList component
- [ ] Create custom hooks (usePositions, useAlerts)
- [ ] Connect to MT5 bridge
- [ ] Connect to backend APIs

**Deliverable**: 4 working widgets on dashboard

### Phase 3: Risk & Quick Entry (Week 3)

- [ ] Create DailyRiskDashboard component
- [ ] Create QuickTradeEntry component
- [ ] Create form validation & submission
- [ ] Add success/error feedback

**Deliverable**: 6 working widgets on dashboard

### Phase 4: News & Alerts (Week 4)

- [ ] Create EconomicNewsTicker component
- [ ] Create ActiveAlertsPanel component
- [ ] Connect to news/calendar APIs
- [ ] Implement real-time updates
- [ ] Add filtering & interactions

**Deliverable**: All 8 widgets working + dashboard complete

### Phase 5: Polish & Optimization (Week 5)

- [ ] Performance optimization
- [ ] Mobile responsiveness testing
- [ ] Accessibility audit
- [ ] Error boundary handling
- [ ] Loading states refinement
- [ ] Bug fixes & edge cases

**Deliverable**: Production-ready dashboard

---

## SUCCESS CRITERIA

### User Engagement

- ✅ Dashboard load time < 2s
- ✅ Each widget loads < 500ms
- ✅ Real-time updates < 500ms latency
- ✅ Mobile experience >90 Lighthouse score
- ✅ Zero layout shifts (CLS < 0.1)

### Functionality

- ✅ All 8 widgets display correctly
- ✅ All data sources connected
- ✅ Real-time updates working
- ✅ Responsive on all breakpoints
- ✅ Interactive elements working (filters, sorts, clicks)

### User Satisfaction

- ✅ Traders rate dashboard >4.5/5 stars
- ✅ Dashboard usage >70% of active traders
- ✅ Feature adoption >80% in 30 days
- ✅ Reduced support tickets related to "missing data"
- ✅ Traders log more trades (+40% increase)

---

## APPENDIX: CODE EXAMPLES

### RecentTradesTable Component Structure

```typescript
interface RecentTradesTableProps {
  trades: Trade[];
  loading?: boolean;
  onTradeClick?: (tradeId: number) => void;
  onStrategyFilter?: (strategy: string) => void;
}

export function RecentTradesTable({
  trades,
  loading,
  onTradeClick,
  onStrategyFilter
}: RecentTradesTableProps) {
  const [sortBy, setSortBy] = useState<'date' | 'profit' | 'pair'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [outcomeFilter, setOutcomeFilter] = useState<'All' | 'Win' | 'Loss'>('All');
  const [pairFilter, setPairFilter] = useState<string>('All');

  // Render table with sorted/filtered trades
  return (
    <div className="rounded-xl border bg-card">
      {/* Header with title */}
      {/* Filter bar */}
      {/* Table */}
      {/* Pagination */}
    </div>
  );
}
```

### EquityCurveChart Component Structure

```typescript
interface EquityCurveChartProps {
  data: Array<{ date: string; balance: number }>;
  loading?: boolean;
}

export function EquityCurveChart({ data, loading }: EquityCurveChartProps) {
  // Calculate stats
  const maxBalance = Math.max(...data.map(d => d.balance));
  const minBalance = Math.min(...data.map(d => d.balance));

  return (
    <div className="rounded-xl border bg-card p-4">
      {/* Title with stats */}
      {/* Recharts Area Chart */}
      {/* Tooltip on hover */}
    </div>
  );
}
```

### usePositions Custom Hook

```typescript
interface Position {
  ticket: number;
  pair: string;
  direction: "Long" | "Short";
  entry: number;
  current: number;
  sl: number;
  tp: number;
  pnl: number;
  openTime: string;
}

export function usePositions(accountId?: string) {
  const [positions, setPositions] = useState<Position[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPositions = async () => {
      try {
        const res = await fetch("/bridge/positions");
        const data = await res.json();
        setPositions(data.positions);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to fetch");
      } finally {
        setLoading(false);
      }
    };

    fetchPositions();
    const interval = setInterval(fetchPositions, 5000); // Poll every 5s
    return () => clearInterval(interval);
  }, [accountId]);

  return { positions, loading, error };
}
```

---

## GLOSSARY

| Term             | Definition                                           |
| ---------------- | ---------------------------------------------------- |
| Widget           | Self-contained UI component displaying specific data |
| Real-time        | Data updates within 1 second                         |
| CLS              | Cumulative Layout Shift (page stability metric)      |
| Responsiveness   | UI adapts to different screen sizes                  |
| Skeleton Loading | Placeholder loading state                            |
| Pagination       | Page through large data sets                         |
| Tooltip          | Hover popup with additional info                     |
| Polling          | Fetching data at regular intervals                   |
| Milestone        | Significant date/trade event                         |

---

**END OF WIDGETS PRD**

**Next Steps**:

1. Review and approve widget specifications
2. Assign implementation tasks
3. Set up component file structure
4. Begin Phase 1 development
5. Weekly progress reviews
