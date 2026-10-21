# Feature Specification: Institutional 3-View Architecture Overhaul

**Feature Branch**: `006-three-view-workspace`  
**Created**: 2026-10-01  
**Status**: Draft  
**Input**: User description: *"for that 3 view give me a docs detail what it has and what it should update, what question is i want to view like tradingview with my own cusomized , journal like notion, dashboard like tradezella what you got now here too mess up and overwhelm and overhaul card i dont see detail and visual"*

---

## 1. Architectural Motivation & Problem Diagnosis

### 1.1 What the Current System Has (The Clutter & Overwhelm Problem)

The existing dashboard implementation (`frontend/app/dashboard/page.tsx`, over 1,740 lines) attempts to pack the entire trading lifecycle into a single monolithic scrollable view. This causes severe cognitive overload, visual clutter, and layout fatigue:

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                    CURRENT MONOLITHIC DASHBOARD (OVERLOADED)                    │
├─────────────────────────────────────────────────────────────────────────────────┤
│ [Top Bar] Greeting, MT5 Pulse, Global Search, 5 Filter Dropdowns                │
│ [Zone 1]  EcosystemPulseBar + EcosystemContextLauncher                          │
│ [Ribbon]  SessionTimeline Ribbon                                                │
│ [Zone 2]  MarketRail (Assets) + CockpitChart (Squeezed into 9-cols)             │
│ [Zone 3]  OpportunityRadar Matrix                                               │
│ [Zone 4]  AccountExecutionHud                                                   │
│ [Zone 5]  Deep Reports Header + 3 Gauges (PnL, Profit Factor, Win Rate)         │
│ [Zone 6]  6-Col Stats Sub-Row (Direction, Avg W/L, Expectancy, Streaks, Trades)  │
│ [Zone 7]  Analytics Deck Switcher Tabs (Split / Calendar / Equity / Strategy)    │
│ [Zone 8]  Giant Paginated Trade Table with Inline Cells & Peek Drawers          │
└─────────────────────────────────────────────────────────────────────────────────┘
```

#### Key Deficiencies Identified:
1. **No Dedicated Chart Focus**: The chart is shoehorned into a small container alongside the MarketRail, opportunity radar, and HUD, making detailed technical inspection and customized indicator overlay impossible.
2. **Giant Middle "Overhaul Cards"**: The `OpportunityRadar` is currently a huge ~400px tall block occupying Zone 3 directly under the chart, severing visual continuity and pushing core analytics down below the fold.
3. **Scattered Trade Journaling**: Journaling is treated as a flat tabular log rather than a structured reflective environment with rich notes, tags, checklists, and visual screenshots.
4. **Diluted Performance Analytics**: Metrics are duplicated across top pulse bars, gauges, sub-rows, and split cockpit views. Traders cannot immediately digest clean TradeZella-style insights (daily P&L calendar heatmap, golden setups vs money bleeders, cost of mistakes).

---

### 1.2 Target 3-View Architecture (Clean, Purpose-Built Workspaces)

The platform will decouple this monolithic clutter into **three clean, specialized, institutional-grade views** accessible via a persistent top navigation bar, complemented by a **compact, non-intrusive Top Opportunity Ticker ("Sponsor-Style" Ribbon)**:

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                                 RENDO OS 3-VIEW COCKPIT                                 │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│ [TOP RIBBON] ⚡ LIVE OPPORTUNITIES: [XAUUSD BUY A+ 92%] [EURUSD SELL A 84%] [GBPUSD B] ⤢ │
├───────────────────────────────┬───────────────────────────┬─────────────────────────────┤
│ 1. TRADINGVIEW VIEW           │ 2. NOTION JOURNAL VIEW    │ 3. TRADEZELLA DASHBOARD     │
│  - Full-screen clean chart    │  - Document-style notes   │  - Clean executive KPIs     │
│  - Custom Pine/ICT indicators │  - Multi-tag properties   │  - P&L Calendar Heatmap     │
│  - Unobstructed canvas        │  - Pre-trade checklists   │  - Setup win/loss matrix    │
│  - Collapsible drawing tools  │  - Side-by-side screens   │  - Mistake dollar tracker   │
│  - Minimalist watchlist dock  │  - Table/Board/Calendar   │  - Equity & Drawdown curves │
└───────────────────────────────┴───────────────────────────┴─────────────────────────────┘
```

#### Compact Top Opportunity Ticker ("Sponsor-Card" Ribbon):
- **Positioning**: Slim 38px ribbon fixed right below the top navigation or integrated directly into the header bar.
- **Visual Design**: Horizontal scrolling chip carousel with subtle ambient glassmorphism (`bg-[#101014]/80 backdrop-blur-md`).
- **Interactive Signal Chips**:
  - `🔥 XAUUSD BUY · A+ 92% · R:R 2.0` (green pulse indicator)
  - `⚡ EURUSD SELL · A 84% · R:R 2.1`
  - `🎯 GBPUSD BUY · B 74% · R:R 1.9`
- **Instant Action**: Clicking any chip automatically updates the active chart to that symbol and previews entry/SL/TP levels without cluttering the screen.
- **On-Demand Expand**: A subtle `[Expand All ⤢]` button triggers a slide-out peek drawer for traders who want the deep factors matrix, keeping the primary workspace 100% clean.

---

## 2. Detailed View Specifications: Current State vs. What It Should Update

### View 1: TradingView-Style Interactive Chart View (`/terminal` or `/chart`)

#### What It Has Currently:
- Squeezed `CockpitChart.tsx` or basic `CenterPanel.tsx` embedded in heavy surrounding layout cards.
- Fixed indicator definitions (MA20, MA50, RSI, MACD) without unified ICT / AdaptiveICT customization.
- Screen space is invaded by opportunity radars, pulse bars, and multi-asset rails.

#### What It Should Update Into:
- **Maximized Visual Canvas**: 100% viewport chart area with institutional dark-mode palette (#09090b / #121216).
- **Custom Institutional Indicator System**:
  - Toggles for proprietary confluences: Point of Control (developing POC, Virgin POC, Value Area VAH/VAL), Asian Range High/Low & Judas Swing zones, New York Midnight Open line, Fair Value Gaps (FVG), Order Blocks, and SMT Divergence markers.
  - Ability for traders to toggle indicators on/off with dedicated visual opacity and color controls.
- **TradingView Interaction Paradigm**:
  - Top Timeframe Selector (M1, M5, M15, M30, H1, H4, D1).
  - Symbol switcher with instant search and asset class filtering (Crypto, Metals, Forex, Indices).
  - Left Floating Toolstrip: Trendline, Fibonacci Retracement, Price Range/Box, Long/Short Position Risk-Reward visual calculator.
  - Collapsible Right Watchlist Dock: Clean symbol ticker with bid/ask, daily change %, and quick chart switching.
  - Collapsible Bottom Drawer: Open positions & staging ticket that can be toggled without cluttering the chart.

---

### View 2: Notion-Style Trading Journal View (`/journal`)

#### What It Has Currently:
- A generic paginated table of CSV trades with basic tag dropdowns and popups.
- Missing rich document feel, structured checklists, reflection questions, and multiple database perspectives.

#### What It Should Update Into:
- **Notion Document & Database Philosophy**:
  - Each trade entry opens as a clean slide-over document or focused full-page workspace.
  - **Structured Property Block**:
    - Symbol badge, Direction badge (Long / Short), Outcome badge (Win / Loss / Break-Even).
    - Setup Tags (e.g., `#JudasSwing`, `#SilverBullet`, `#TurtleSoup`, `#BreakerBlock`).
    - Mistake Tags (e.g., `#FOMO`, `#EarlyExit`, `#ChasingEntry`, `#Overleveraged`, `#None`).
    - Psychological State (e.g., *Calm*, *Anxious*, *Greedy*, *Disciplined*).
    - Planned R:R vs Realized R:R, Net Profit / Loss ($).
  - **Interactive Pre-Trade & Execution Checklist**:
    - [ ] Higher Timeframe (HTF) directional bias confirmed.
    - [ ] Liquidity swept / Judas Swing confirmed.
    - [ ] Key Volume Profile level (POC / VAH / VAL) or FVG retested.
    - [ ] Hard stop-loss placed; risk strictly $\le$ 1.0%.
    - [ ] Killzone active (London Open / NY AM / NY PM).
  - **Rich Reflection Block**:
    - Markdown-enabled note sections: *Setup Thesis*, *Execution Notes*, *What Went Well*, *Lessons for Tomorrow*.
  - **Visual Trade Screenshot Gallery**:
    - Side-by-side or tabbed *Entry Chart (Before)* and *Exit Chart (After)* with instant lightbox zoom.
  - **4 Notion-Style Database Views**:
    1. **Table View**: Multi-column sorting, filtering by setup/mistake, tag badges.
    2. **Board (Kanban) View**: Grouped by Setup (e.g., Silver Bullet, Judas Swing) or by Outcome (Wins, Losses, Break-Even).
    3. **Calendar View**: Month grid with trade cards showing P&L pills and setup tags.
    4. **Gallery View**: Visual screenshot cards for high-speed pattern recognition review.

---

### View 3: TradeZella-Style Performance Analytics Dashboard (`/dashboard`)

#### What It Has Currently:
- Overcrowded single page mixing live charts, MT5 account pulse, opportunity radars, 9 different stats cards, and an inline journal table.
- Difficult to extract actionable performance insights.

#### What It Should Update Into:
- **Clean Executive KPI Row**:
  - Six clean, high-contrast metric cards with micro-trends:
    1. **Net P&L** ($ and % growth)
    2. **Win Rate %** (Wins vs Losses ratio)
    3. **Profit Factor** (Gross Profits / Gross Losses)
    4. **Average Trade Expectancy** ($ return per trade)
    5. **Average Win vs Average Loss** (Risk/Reward efficiency)
    6. **Maximum Drawdown** (Peak-to-trough decline)
- **TradeZella Interactive P&L Calendar Heatmap**:
  - Dedicated monthly calendar where each active day clearly displays:
    - Net daily dollar profit/loss in bold institutional typography (Green for positive, Red for negative, Muted for flat).
    - Number of trades executed and win/loss count (e.g., `+ $420.50` | `3 trades (2W - 1L)`).
    - Clicking any day instantly filters the breakdown below or opens a daily performance drawer.
- **Setup & Playbook Performance Matrix**:
  - Bar breakdown comparing trade setups (e.g., Judas Swing vs Silver Bullet vs Trend Following) by Win Rate %, Total Profit, and Average R:R to identify the trader's true statistical edge.
- **Mistake & Behavioral Dollar-Cost Tracker**:
  - Direct quantifiable cost of psychological leaks (e.g., *FOMO trades cost: -$540.00*, *Revenge trades cost: -$320.00*).
  - Rule Adherence Gauge (% of trades strictly following the trading plan).
- **Interactive Cumulative Equity & Underwater Drawdown Curves**:
  - Smooth area charts displaying account equity growth alongside underwater drawdown depth over time.
- **Clean Unified Global Filter Bar**:
  - Date Range presets (Today, This Week, This Month, This Year, All-Time, Custom Range).
  - Account Selector, Symbol Filter, Setup Filter, and Side Filter without screen clutter.

---

## 3. User Scenarios & Testing *(mandatory)*

### User Story 1 - TradingView-Style Interactive Charting (Priority: P1) 🎯 MVP

As a technical trader, I need a dedicated, uncluttered charting workspace where I can analyze price action with custom indicators (AdaptiveICT, POC, Judas Swing, Killzones) and drawing tools, so that I can make precise, undistracted execution decisions.

**Why this priority**: The chart is the primary decision engine for an active trader. Squeezing it into a crowded dashboard compromises execution quality.

**Independent Test**: Navigate to the Chart view; verify the full-screen canvas loads cleanly with zero card clutter, indicators toggle seamlessly, drawing tools work, and the symbol switcher updates price immediately.

**Acceptance Scenarios**:
1. **Given** the user navigates to the Chart view, **When** the page renders, **Then** the chart occupies the primary viewport without overlapping widgets or secondary dashboard cards.
2. **Given** the indicator toggle menu, **When** the user enables "Volume Profile POC" and "Judas Swing Killzone", **Then** the chart renders developing POC, VAH/VAL lines, and highlighted killzone ranges.
3. **Given** an active chart session, **When** the user clicks the collapsible right dock icon, **Then** the watchlist smoothly slides out without disrupting the chart dimensions.

---

### User Story 2 - TradeZella-Style Performance Analytics Dashboard (Priority: P2)

As a trader reviewing my performance, I need a clean executive dashboard with an interactive P&L Calendar heatmap, KPI summary cards, and setup/mistake breakdowns, so that I can identify what is making me money and eliminate psychological leaks.

**Why this priority**: Sustainable profitability requires post-trade statistical clarity. The current dashboard overwhelms rather than clarifies.

**Independent Test**: Load the dashboard with 50+ imported trades; verify the KPI cards calculate correct figures, the monthly calendar displays daily P&L blocks accurately, and clicking a calendar day isolates that day's trades.

**Acceptance Scenarios**:
1. **Given** trade data in the system, **When** the user accesses the Dashboard view, **Then** the top shows 6 clean KPI cards (Net P&L, Win Rate, Profit Factor, Expectancy, Avg Win/Loss, Max Drawdown) with zero redundant cards.
2. **Given** the P&L Calendar heatmap, **When** the user selects October 2026, **Then** every trading day displays the net profit/loss in large green/red font and the trade count badge.
3. **Given** the Mistake Tracker, **When** a trade with the tag `#FOMO` is logged, **Then** the system accumulates the loss under the FOMO leak category and displays its total dollar cost.

---

### User Story 3 - Notion-Style Trading Journal & Multi-View Database (Priority: P3)

As a disciplined trader, I need to log and review trades in a Notion-style document and database format with customizable tags, pre-trade checklists, reflection notes, and visual screenshots, so that I can build a structured trading playbook.

**Why this priority**: Journaling bridges execution with psychology. A Notion-like document structure provides the depth needed for meaningful daily review.

**Independent Test**: Create a new journal entry; verify property fields (Setup, Mistake, Emotion, R:R), complete the pre-trade checklist, attach Before/After screenshots, and switch between Table, Board, Calendar, and Gallery views.

**Acceptance Scenarios**:
1. **Given** an open trade entry, **When** the user views the trade detail modal, **Then** it renders with Notion-style property badges, a checklist, rich text note blocks, and side-by-side screenshots.
2. **Given** the journal database, **When** the user clicks the "Board" view tab, **Then** trade cards are grouped into Kanban columns by Setup Category (#JudasSwing, #SilverBullet, etc.).
3. **Given** the journal database, **When** the user clicks the "Gallery" view tab, **Then** a visual grid of chart screenshot thumbnails is displayed for quick pattern review.

---

## 4. Edge Cases

- **Missing Screenshots**: If a trade is imported from MT5 CSV without attached screenshots, the Notion trade inspector displays a clean drag-and-drop screenshot placeholder without layout breaks.
- **Zero-Trade Days on Calendar**: Days without trade activity on the TradeZella calendar render with subtle neutral styling and an empty state when clicked.
- **Extreme Profit Factor / Division by Zero**: If gross losses equal zero, Profit Factor displays `∞` (or `99.9+`) with a tooltip indicating zero recorded losses.
- **Responsive Viewport Transitions**: When switching between mobile, tablet, and ultra-wide desktop displays, the TradingView chart tools collapse into mobile-friendly slide-over drawers, and Notion database tables enable horizontal scrolling.
- **Disconnected MT5 Bridge**: If MT5 telemetry is offline, the Chart view displays an informative non-blocking status pill ("Offline / Cached Feed") while still permitting offline analysis and journal review.

---

## 5. Functional Requirements *(mandatory)*

### Global Navigation & Layout
- **FR-001**: System MUST provide a persistent, minimalist top navigation bar with three primary tabs: **Chart** (`/terminal`), **Journal** (`/journal`), and **Dashboard** (`/dashboard`).
- **FR-002**: System MUST eliminate the single-page monolith architecture by decoupling chart canvas, journal entries, and deep analytics into their respective dedicated routes.
- **FR-003**: System MUST provide a consistent global date-range and account filter bar that propagates user selections across all views.

### View 1: TradingView Chart View
- **FR-004**: System MUST render an unobstructed full-screen candlestick chart canvas supporting standard timeframes (M1, M5, M15, M30, H1, H4, D1, W1).
- **FR-005**: System MUST provide custom overlay toggles for institutional confluences: Volume Profile Point of Control (developing POC, Virgin POC, Value Area VAH/VAL), Asian Range High/Low, New York Midnight Open, and Killzone Session Bands.
- **FR-006**: System MUST provide interactive drawing tools (Trendline, Fibonacci Retracement, Support/Resistance Zone Box, Long/Short Position Risk-Reward visualizer).
- **FR-007**: System MUST offer a collapsible right-hand Watchlist dock and a collapsible bottom-docked Execution/Positions drawer that do not obscure the chart when closed.

### View 2: Notion-Style Trading Journal
- **FR-008**: System MUST display a dedicated trade document view containing customizable properties: Symbol, Direction, Outcome, Setup Tag, Mistake Tag, Emotion Tag, Planned R:R, and Realized P&L.
- **FR-009**: System MUST support Notion-style interactive pre-trade checklists (e.g., HTF bias, liquidity sweep, stop-loss confirmation).
- **FR-010**: System MUST support rich structured markdown notes with sections for *Setup Thesis*, *Execution Commentary*, and *Lessons Learned*.
- **FR-011**: System MUST allow uploading and viewing side-by-side Before (Entry) and After (Exit) chart screenshots with click-to-expand lightbox zoom.
- **FR-012**: System MUST provide 4 interchangeable database view modes: Table View, Kanban Board View (grouped by Setup or Outcome), Calendar View, and Screenshot Gallery View.

### View 3: TradeZella-Style Performance Dashboard
- **FR-013**: System MUST display 6 executive KPI cards (Net P&L, Win Rate %, Profit Factor, Trade Expectancy, Avg Win / Avg Loss Ratio, Maximum Drawdown %) with clean typography and zero clutter.
- **FR-014**: System MUST feature a full-month P&L Calendar heatmap where each day displays total net profit/loss, trade count, and win/loss breakdown in high-contrast color coding.
- **FR-015**: System MUST provide a Setup Performance Matrix comparing win rates, total profit, and average return by setup category to highlight the trader's most profitable plays.
- **FR-016**: System MUST provide a Mistake & Psychology Tracker quantifying the total dollar cost incurred by rule deviations and emotional errors.
- **FR-017**: System MUST render interactive Cumulative Equity and Underwater Drawdown curves with tooltip hover inspection.

---

## 6. Key Entities

- **TradeRecord**: Represents an executed trade. Attributes include `id`, `ticketNumber`, `accountNumber`, `symbol`, `direction` (Long/Short), `openTime`, `closeTime`, `openPrice`, `closePrice`, `lotSize`, `pnl`, `pips`, `setupTag`, `mistakeTag`, `emotionTag`, `checklistItems` (array of boolean items), `screenshots` (array of image URLs for entry/exit), and `notes` (markdown string).
- **ChartConfiguration**: Represents user preferences for the TradingView workspace. Attributes include `activeSymbol`, `activeTimeframe`, `enabledIndicators` (object tracking POC, Asian Range, Judas Swing, etc.), and `drawingData` (JSON array of user annotations).
- **PerformanceMetrics**: Aggregated metrics computed over a filtered date range. Attributes include `totalProfit`, `winRate`, `profitFactor`, `expectancy`, `avgWin`, `avgLoss`, `maxDrawdown`, `calendarPnL` (map of date $\rightarrow$ {pnl, count, wins, losses}), `setupBreakdown`, and `mistakeCostBreakdown`.

---

## 7. Success Criteria *(mandatory)*

- **SC-001**: **Zero Monolithic Overwhelm**: 100% of clutter cards from the current dashboard are categorized and separated into their dedicated views, eliminating repetitive widget stacking.
- **SC-002**: **Chart Usability**: Traders can launch the chart view, switch symbols, and toggle custom indicators within 2 clicks, with the chart canvas occupying over 85% of viewport area.
- **SC-003**: **Journal Depth & Accessibility**: Traders can create or review a trade in under 30 seconds with complete Notion-style properties, checklist, and screenshots.
- **SC-004**: **Instant P&L Insight**: Traders can identify their monthly net P&L and daily profit distribution on the TradeZella calendar heatmap in under 3 seconds upon opening the dashboard.
- **SC-005**: **Performance**: Each view loads and transitions in under 300ms without UI freezing or layout shifting.

---

## 8. Assumptions

- Existing CSV trade import mechanisms and MT5 database schemas (`ea_analytics.db`, `mt5_bridge.py`) will remain the underlying data provider for all three views.
- The user prefers dark-mode institutional aesthetics (deep zinc/slate backgrounds, teal/green positive accents, crimson/rose negative accents, sleek monospace data fonts).
- Custom indicator calculations (POC, Value Area, Asian Range, Judas Swing) will leverage historical candlestick data already available in the backend/bridge pipeline.

---

## 9. Clarifications Needed

The following key implementation decisions will refine the exact design:

### Question 1: Default Landing Page
**Context**: With 3 distinct views (TradingView Chart, Notion Journal, TradeZella Dashboard), which view should be the default route when opening the application?

| Option | Answer | Implications |
|--------|--------|--------------|
| A (Recommended) | **TradeZella Performance Dashboard (`/dashboard`)** | Trader immediately sees daily P&L calendar, account health, and KPIs upon login; can click through to Chart or Journal as needed. |
| B | **TradingView Chart (`/terminal` or `/chart`)** | Directly drops the trader into live execution and chart analysis mode. |
| C | **Unified Cockpit with Persistent Top Tab Switcher** | Remembers the user's last visited view using local storage preferences. |

### Question 2: Notion Journal Storage for Screenshots
**Context**: Notion-style trade journaling relies on Before (Entry) and After (Exit) chart screenshots. How should screenshot images be stored and uploaded?

| Option | Answer | Implications |
|--------|--------|--------------|
| A (Recommended) | **Local File Storage in Backend + Auto-Paste from Clipboard** | Trader can simply press Ctrl+V to paste screenshot directly into the trade note, saved into backend `/uploads/screenshots/`. |
| B | **Cloud Storage (Cloudinary / S3 / Supabase Storage)** | Images are hosted externally on CDN for global accessibility across devices. |
| C | **Direct TradingView Chart Snapshot URL integration** | Embeds snapshot URLs generated directly from the chart widget. |

### Question 3: Existing Dashboard Page (`/dashboard`) Transition Strategy
**Context**: The current `frontend/app/dashboard/page.tsx` has 1,740+ lines with multiple legacy widgets (EcosystemPulseBar, OpportunityRadar, MarketRail, CockpitChart, etc.).

| Option | Answer | Implications |
|--------|--------|--------------|
| A (Recommended) | **Clean Re-architecture**: Transform `/dashboard` into the pure TradeZella-style Analytics & Calendar cockpit; move the chart fully into `/terminal` (TradingView style); move the journal fully into `/journal` (Notion style). | Complete elimination of clutter and confusion; achieves 100% clean visual separation. |
| B | **Multi-Tab Mode on `/dashboard`**: Keep a single route `/dashboard` with high-level switcher tabs `[Live Chart | Journal | Analytics]` that switch full-page layouts dynamically. | Keeps everything under one URL while cleanly swapping entire viewports. |
| C | **Side-by-Side Dual-Pane Option**: Allow splitting the screen into Chart on the left and Notion Journal or TradeZella stats on the right for ultra-wide monitors. | Maximizes screen real-estate on large monitors, with single-view mode on standard laptops. |
