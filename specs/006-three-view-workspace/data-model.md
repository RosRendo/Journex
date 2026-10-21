# Data Model: Institutional 3-View Architecture Overhaul

**Feature**: `006-three-view-workspace`  
**Date**: 2026-10-02  
**Status**: Completed  

---

## 1. Core Entity Schemas

### 1.1 `TradeRecord` (Notion Journal Entity)

Represents an individual executed trade with rich documentation attributes for reflective journaling:

```typescript
export interface TradeRecord {
  id: string | number;
  ticketNumber?: string;
  accountNumber?: string;
  symbol: string;                       // e.g., "XAUUSD", "EURUSD"
  direction: "Long" | "Short" | "BUY" | "SELL";
  outcome: "WIN" | "LOSS" | "BE" | "OPEN";
  openPrice: number;
  closePrice?: number;
  stopLoss?: number;
  takeProfit?: number;
  lotSize: number;
  pnl: number;                           // Net dollar profit/loss
  pips?: number;
  commission?: number;
  swap?: number;
  openTime: string;                      // ISO timestamp
  closeTime?: string;                     // ISO timestamp
  
  // Notion-Style Qualitative Properties
  setupTag: string;                      // e.g., "#JudasSwing", "#SilverBullet", "#TurtleSoup"
  mistakeTag?: string;                   // e.g., "#FOMO", "#EarlyExit", "#Chasing", "#None"
  emotionTag?: string;                   // e.g., "Calm", "Anxious", "Greedy", "Disciplined"
  plannedRR?: number;                    // e.g., 2.5
  realizedRR?: number;                   // e.g., 2.1
  followedPlan: boolean;
  
  // Notion Document Block Details
  checklist: {
    htfBiasConfirmed: boolean;
    liquiditySwept: boolean;
    fvgOrPocRetested: boolean;
    hardStopPlaced: boolean;
    killzoneActive: boolean;
  };
  notes: {
    setupThesis: string;                 // Why was trade taken
    executionNotes: string;              // What happened during management
    lessonsLearned: string;              // Post-trade takeaway
  };
  screenshots: {
    entryUrl?: string;                   // Before chart image URL
    exitUrl?: string;                    // After chart image URL
    additionalUrls?: string[];
  };
}
```

---

### 1.2 `OpportunityAlert` (Top Sponsor-Style Ribbon Entity)

Represents a real-time confluence alert displayed in the compact top ribbon:

```typescript
export interface OpportunityAlert {
  id: string;
  symbol: string;                       // "XAUUSD"
  direction: "BUY" | "SELL";
  grade: "A+" | "A" | "B";
  score: number;                         // 0 - 100 confluence score
  setupType: string;                     // e.g., "Asian High Judas Swing"
  session: string;                       // e.g., "London Open Killzone"
  entry: number;
  sl: number;
  tp: number;
  rr: number;
  factors: {
    sweep: boolean;                      // Liquidity sweep verified
    mss: boolean;                        // Market Structure Shift verified
    fvg: boolean;                        // Fair Value Gap presence
    ob: boolean;                         // Order Block retest
    poc: boolean;                        // Volume Profile POC alignment
    smt?: boolean;                       // SMT divergence
  };
  status: "READY" | "FORMING" | "MONITORING";
  timestamp: string;
}
```

---

### 1.3 `AnalyticsPerformanceSummary` (TradeZella Performance Entity)

Aggregated statistical metrics calculated over the active filter range:

```typescript
export interface AnalyticsPerformanceSummary {
  // Executive 6-KPI Row
  totalProfit: number;                   // Net dollar P&L
  profitPercentage: number;              // Account % growth
  winRate: number;                       // Win % (0 - 100)
  profitFactor: number;                  // Total Wins / Total Losses
  expectancy: number;                    // Average expected $ per trade
  avgWin: number;                        // Average winning trade $
  avgLoss: number;                       // Average losing trade $
  maxDrawdown: number;                   // Maximum peak-to-trough drawdown %
  totalTrades: number;

  // TradeZella Calendar Heatmap
  calendarDays: Map<string, {            // Key: "YYYY-MM-DD"
    pnl: number;
    tradeCount: number;
    wins: number;
    losses: number;
    breakevens: number;
  }>;

  // Setup & Playbook Edge Matrix
  setupBreakdown: Array<{
    setupName: string;
    tradeCount: number;
    winRate: number;
    totalProfit: number;
    profitFactor: number;
  }>;

  // Mistake Dollar-Cost Breakdown
  mistakeCostBreakdown: Array<{
    mistakeName: string;
    dollarCost: number;
    incidentCount: number;
  }>;

  // Time & Session Performance
  hourlyPerformance: Array<{ hour: number; pnl: number; winRate: number }>;
  dayOfWeekPerformance: Array<{ day: string; pnl: number; winRate: number }>;

  // Equity & Drawdown Curves
  equityCurve: Array<{ date: string; balance: number }>;
  drawdownCurve: Array<{ date: string; drawdownPct: number }>;
}
```

---

### 1.4 `ChartWorkspaceState` (TradingView View Entity)

Represents user workspace configuration for the interactive chart:

```typescript
export interface ChartWorkspaceState {
  activeSymbol: string;
  activeTimeframe: "M1" | "M5" | "M15" | "M30" | "H1" | "H4" | "D1" | "W1";
  chartType: "Candles" | "HeikinAshi" | "Line";
  
  // Custom Indicator Toggles
  indicators: {
    poc: boolean;                        // Developing POC & Value Area
    virginPoc: boolean;                  // Untested prior session POCs
    asianRange: boolean;                 // Asian session range & Judas swing zones
    nyMidnightOpen: boolean;             // 00:00 EST true day benchmark
    fvg: boolean;                        // Fair Value Gaps
    orderBlocks: boolean;                // Order Blocks
  };
  
  // Layout Panel States
  panels: {
    isWatchlistOpen: boolean;
    isExecutionDrawerOpen: boolean;
    isToolstripOpen: boolean;
  };
}
```

---

## 2. Relationships & State Synchronization

```
┌────────────────────────────────────────────────────────┐
│                   GLOBAL APP CONTEXT                   │
│   - Selected Account                                   │
│   - Global Date Range                                  │
│   - Top Opportunity Ticker State                       │
└───────────────┬────────────────────────┬───────────────┘
                │                        │
       ┌────────▼────────┐      ┌────────▼────────┐
       │   /terminal     │      │   /dashboard    │
       │ (TradingView)   │      │  (TradeZella)   │
       └────────┬────────┘      └────────┬────────┘
                │                        │
                └────────► /journal ◄────┘
                         (Notion)
```

- When a trader clicks a signal chip in the **Top Opportunity Ticker**, the symbol propagates to the **Chart Workspace (`/terminal`)** and stages the order.
- When trades are imported via CSV or synced live via MT5 bridge, both the **TradeZella Analytics Dashboard** and the **Notion Journal** update reactively with zero page refresh.
