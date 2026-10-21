# UI Component Contracts: 3-View Architecture

**Feature**: `006-three-view-workspace`  
**Date**: 2026-10-02  
**Status**: Completed  

---

## 1. Top Opportunity Ticker Ribbon (`OpportunityTickerRibbon`)

Slim, non-intrusive 38px horizontal ribbon mounted beneath the navigation bar.

### Props Contract
```typescript
export interface OpportunityTickerRibbonProps {
  opportunities: OpportunityAlert[];
  isLoading?: boolean;
  onSelectOpportunity: (opp: OpportunityAlert) => void;
  onOpenDeepRadar: () => void;           // Opens slide-out deep factor drawer
}
```

### Rendering Behavior
- Renders horizontal sliding pills: `[⚡ RADAR LIVE] [🔥 XAUUSD BUY · A+ 92%] [⚡ EURUSD SELL · A 84%]`.
- Shows green pulsing dot when a setup is in the active killzone.
- Clicking any pill calls `onSelectOpportunity(opp)`.
- Clicking `[ ⤢ Expand ]` calls `onOpenDeepRadar()`.

---

## 2. TradingView Chart Workspace (`TradingViewWorkspace`)

Full-viewport interactive technical analysis environment.

### Props Contract
```typescript
export interface TradingViewWorkspaceProps {
  symbol: string;
  timeframe: string;
  onSymbolChange: (newSymbol: string) => void;
  onTimeframeChange: (newTf: string) => void;
  activeIndicators: {
    poc: boolean;
    asianRange: boolean;
    judasSwing: boolean;
    nyMidnightOpen: boolean;
    fvg: boolean;
    orderBlocks: boolean;
  };
  onToggleIndicator: (indicatorKey: string) => void;
  onOpenOrderTicket?: (stagedData?: any) => void;
}
```

---

## 3. Notion Trading Journal Workspace (`NotionJournalWorkspace`)

Multi-view database with slide-out document inspector.

### Props Contract
```typescript
export interface NotionJournalWorkspaceProps {
  trades: TradeRecord[];
  viewMode: "table" | "board" | "calendar" | "gallery";
  onViewModeChange: (mode: "table" | "board" | "calendar" | "gallery") => void;
  selectedTrade: TradeRecord | null;
  onSelectTrade: (trade: TradeRecord | null) => void;
  onSaveTradeDetails: (tradeId: string | number, updates: Partial<TradeRecord>) => Promise<void>;
  filterSetup: string;
  filterMistake: string;
  onFilterSetupChange: (setup: string) => void;
  onFilterMistakeChange: (mistake: string) => void;
}
```

---

## 4. TradeZella Analytics Dashboard (`TradeZellaDashboard`)

Executive metrics cockpit with interactive calendar heatmap.

### Props Contract
```typescript
export interface TradeZellaDashboardProps {
  metrics: AnalyticsPerformanceSummary;
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
  onFilterDayClick: (dayDateStr: string) => void;
  filterDateRange: "today" | "week" | "month" | "year" | "all";
  onFilterDateRangeChange: (range: "today" | "week" | "month" | "year" | "all") => void;
  onOpenDayDrawer: (dayTrades: TradeRecord[]) => void;
}
```
