# Technical Research & Architecture Decisions: Terminal Live Intelligence & Cognitive Flow

**Feature**: `002-terminal-live-intelligence`  
**Date**: 2026-09-20  
**Status**: Completed

---

## 1. Research Topics & Architectural Decisions

### Decision 1: Cognitive Hierarchy Component Architecture
- **Problem**: The current `/terminal` page loads 20 disconnected cards simultaneously, causing cognitive friction.
- **Chosen Pattern**: **Unified 5-Stage Top-to-Bottom Linear Story Flow**:
  1. `SignalHero.tsx` (Level 1: Is there a setup right now?)
  2. `ConfluenceInspector.tsx` (Level 2: Why is it valid? 6 weighted sub-factors, affirmative reasons, warnings)
  3. `ChartExplainer.tsx` (Level 3: Where in price structure? Candlestick canvas with BOS, CHoCH, FVG boxes, OBs, Entry, SL, TP)
  4. `ExecutionReadinessGate.tsx` (Level 4: Can I trade? Binary gate auditing Spread, News, Regime, Liquidity + 1.0% Lot Sizing)
  5. `ExecutionManagementBar.tsx` (Level 5: Manage active positions & compact single-line account strip)
- **Rationale**: Direct alignment with user's decision-making process. Non-essential details (economic calendar history, deep telemetry) are placed in slide-over drawers or tabs rather than occupying primary viewport real estate.

### Decision 2: Real-Time Telemetry Pipeline (Bridge to UI)
- **Problem**: How to stream real-time confluence, regime, and account telemetry from MT5 with sub-second latency.
- **Chosen Architecture**:
  - `AdaptiveICT.mq5` writes real-time evaluation snapshots into memory/local IPC (`DecisionResult` with score, grade, factors, reasons).
  - `mt5_bridge.py` (`/terminal/snapshot` and WebSocket `/ws`) broadcasts `SignalSnapshot`, `AccountTelemetry`, and `MarketRegime`.
  - Frontend `useTerminalData.ts` consumes the WebSocket stream with fallback 2-second polling to ensure zero data dropouts.
- **Latency Target**: Sub-800ms updates from MT5 tick to UI render.

### Decision 3: Chart Structure Visualizer (Exposing ICT Landmarks)
- **Problem**: Trading charts often act as generic price visualizers without explaining *why* the bot entered.
- **Chosen Implementation**:
  - Lightweight Canvas / SVG overlay integrated directly into `Chart.tsx`.
  - Renders:
    - **FVG Zones**: Semi-transparent rectangular polygons with high/low price labels.
    - **Order Blocks (OB)**: Shaded supply/demand zones.
    - **Liquidity Sweeps**: Dashed horizontal guides marking swept highs/lows.
    - **Structural Shifts**: Text tags for `BOS` (Break of Structure) and `CHoCH` (Change of Character).
    - **Trade Projections**: Horizontal price lines for Entry, SL, TP1, and TP2.
- **Performance**: Rendered via requestAnimationFrame / SVG viewport coordinates so candle pan and zoom stay at a locked 60 FPS.

### Decision 4: Risk-Calibrated Lot Sizing & Emergency Kill-Switch
- **Problem**: Preventing fat-finger errors and enforcing the project constitution's 1.0% risk rule.
- **Chosen Implementation**:
  - `CalculateLotSize(balance, slDistance, symbol)` computes exact lot volume.
  - Formula: $\text{Lots} = \frac{\text{Balance} \times 0.01}{(\text{SL Distance} / \text{TickSize}) \times \text{TickValue}}$
  - Auto-clamps to broker minimum/maximum volume steps.
  - Emergency Kill-Switch (`[CLOSE ALL]`): Dispatches parallel market-close commands for all open tickets via `/api/orders/close-all` with a slide-to-confirm UX pattern.

---

## 2. Technology Stack Compatibility Matrix

| Layer | Technology | Role |
|---|---|---|
| **Frontend UI** | Next.js 15, React 19, Tailwind CSS | High-performance institutional dark cockpit with Lucide icons |
| **State & Stream** | React Hooks, WebSocketProvider | Real-time tick & snapshot streaming with zero UI freeze |
| **Backend API** | Node.js / Express / TypeScript | REST & WebSocket aggregation on port 5003 |
| **Bridge Engine** | Python 3 (`mt5_bridge.py`) | Native MetaTrader5 IPC bridge |
| **EA Core** | MQL5 (`AdaptiveICT.mq5`) | Confluence scoring, regime detection, order execution |
