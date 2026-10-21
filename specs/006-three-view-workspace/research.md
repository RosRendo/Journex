# Research & Architectural Decisions: Institutional 3-View Architecture Overhaul

**Feature**: `006-three-view-workspace`  
**Date**: 2026-10-02  
**Status**: Completed  

---

## 1. Executive Summary & Problem Resolution

The RendoOS dashboard experienced severe UI bloat, packing charts, opportunity radar grids, execution HUDs, multiple stat sub-rows, and an inline journal table into a 1,740+ line monolith (`frontend/app/dashboard/page.tsx`).

This research establishes the blueprint for decoupling this monolith into **three purpose-built, institutional workspaces** plus a **sleek top Opportunity Radar Ribbon** ("sponsor-card" style) that eliminates the heavy 400px card wall.

---

## 2. Decision Log & Technology Trade-offs

### Decision 1: Navigation & Route Decoupling Strategy

- **Decision**: Decouple the monolithic dashboard into three dedicated routes with a shared top navigation cockpit:
  - `/terminal` $\rightarrow$ **TradingView Interactive Chart Workspace**
  - `/journal` $\rightarrow$ **Notion-Style Document & Multi-View Journal**
  - `/dashboard` $\rightarrow$ **TradeZella Performance Analytics Cockpit**
- **Rationale**: 
  - Each workflow has distinct cognitive needs: charting requires maximum canvas space and low latency; journaling requires document flow, tags, and reflection; analytics requires high-contrast KPI synthesis and calendar heatmaps.
  - Squeezing all three into one scrollable page caused DOM bloat, high re-render cascades, and visual overwhelm.
- **Alternatives Considered**:
  - *Keep single route `/dashboard` with tab switches*: Rejected because browser history, direct bookmarking (`/journal`), and independent layout customization become fragile and complex.
  - *Modal-based workflows*: Rejected because charting and deep analytics need dedicated full-viewport attention.

---

### Decision 2: Opportunity Radar "Sponsor-Style" Top Ribbon & Drawer

- **Decision**: Refactor `OpportunityRadar.tsx` from a heavy 400px mid-page grid card into a **Dual-Mode System**:
  1. **Mode A (Compact Top Ribbon)**: A slim 38px horizontal ribbon pinned below the main navigation displaying interactive signal chips (`🔥 XAUUSD BUY · A+ 92% · R:R 2.0`, `⚡ EURUSD SELL · A 84%`).
  2. **Mode B (Slide-Out Deep Inspector Drawer)**: Triggered by clicking `[ ⤢ Expand ]` or clicking any signal chip, opening a focused side drawer showing the full institutional confluence factors (Sweep, MSS, FVG, Order Block, SMT, Killzone).
- **Rationale**:
  - Moves urgent trade triggers to the trader's natural peripheral vision at the very top.
  - Reclaims over 350px of vertical real estate in the center of the screen.
  - Eliminates the visual disruption of the giant "card wall".
- **Alternatives Considered**:
  - *Completely hiding the radar*: Rejected because active traders rely on real-time confluence alerts.
  - *Floating widget*: Rejected because floating dialogs frequently cover chart price action and drawings.

---

### Decision 3: TradingView Chart Workspace Architecture

- **Decision**: Build an unobstructed full-screen charting cockpit inside `/terminal`:
  - **Canvas Ratio**: Chart occupies >85% of total screen area.
  - **Custom Indicators Engine**: Modular toggles for:
    - Volume Profile Point of Control (POC, Virgin POC, Value Area VAH/VAL).
    - Asian Range High/Low & Judas Swing Killzone session bands.
    - New York Midnight Open true-day benchmark line.
    - Fair Value Gaps (FVG) and Order Blocks (OB).
  - **Collapsible Rails**:
    - Floating left toolstrip: Trendline, Fibonacci, Support/Resistance Zone box, Long/Short Risk-Reward calculator.
    - Collapsible right rail: Watchlist with live bid/ask quotes and fast symbol switching.
    - Collapsible bottom drawer: Open positions and staging ticket that tucks completely out of sight.
- **Rationale**:
  - Professional traders require uninterrupted price observation and muscle-memory drawing controls without intrusive surrounding layout elements.

---

### Decision 4: Notion-Style Trading Journal Architecture

- **Decision**: Transform `/journal` into a clean Notion-inspired workspace:
  - **Slide-Over Document Inspector**: Each trade is treated like a Notion document page featuring:
    - **Header & Badges**: Symbol, Direction, Outcome (Win/Loss/BE), Setup Tag (`#JudasSwing`, `#SilverBullet`), Mistake Tag (`#FOMO`, `#EarlyExit`), Emotion State (*Calm*, *Anxious*, *Greedy*), Planned vs Realized R:R.
    - **Interactive Checklists**: Pre-trade verification (HTF bias, liquidity swept, risk $\le$ 1%, killzone active).
    - **Rich Reflection Block**: Markdown sections for *Setup Thesis*, *Execution Commentary*, and *Lessons Learned*.
    - **Side-by-Side Screenshots**: Entry Chart (Before) and Exit Chart (After) with click-to-zoom lightbox.
  - **4 Interchangeable Database Views**:
    1. *Table View*: Sortable columns, inline status edits, filterable tags.
    2. *Board (Kanban) View*: Columns partitioned by Setup or Outcome.
    3. *Calendar View*: Monthly grid with trade cards and P&L pills.
    4. *Gallery View*: Visual screenshot cards for high-speed pattern recognition review.
- **Rationale**:
  - Transforms routine trade logging into an institutional self-coaching playbook that fosters psychological discipline.

---

### Decision 5: TradeZella-Style Performance Analytics Cockpit

- **Decision**: Re-architect `/dashboard` into an executive analytics cockpit:
  - **6-KPI Executive Row**: Net P&L ($ and %), Win Rate %, Profit Factor, Trade Expectancy ($), Avg Win / Avg Loss Ratio, Maximum Drawdown %.
  - **TradeZella Monthly Calendar Heatmap**: High-contrast daily boxes displaying net profit/loss, trade count, and win/loss breakdown (e.g. `+$420.50 | 3 trades (2W - 1L)`). Clicking any day isolates that day's trades in a slide-out drawer.
  - **Setup Performance Matrix**: Bar breakdown comparing win rates, profit factor, and total dollar contribution by setup to highlight the trader's most profitable plays vs money bleeders.
  - **Mistake Dollar-Cost Tracker**: Directly calculates the dollar leakage from emotional errors (e.g., *FOMO Cost: -$540.00*, *Revenge Cost: -$320.00*).
  - **Interactive Equity & Underwater Drawdown Curves**: Smooth area visualizations with hover inspection.
- **Rationale**:
  - Delivers immediate post-trade clarity without card overlap or duplicate metrics.

---

## 3. Best Practices & Code Conventions

1. **Component Modularity**: All components will be self-contained in `frontend/components/` and use consistent dark-mode styling (`#09090b` canvas, `#141419` panels, `#20e0b2` positive accents, `#ff5c73` negative accents, `#71717a` labels).
2. **State Management**: URL query params and local React state for filters (Symbol, Date Range, Account Number) to ensure shareable, bookmarkable views.
3. **Data Fetching**: Unified consumption of existing backend routes (`/api/trades`, `/api/analytics`, `/api/positions`, `/api/settings`) with zero breaking backend changes.
