# Implementation Plan: Terminal Live Intelligence & 5-Stage Cognitive Hierarchy

**Branch**: `002-terminal-live-intelligence` | **Date**: 2026-09-20 | **Spec**: [spec.md](file:///d:/FOR%20RENDO%20%28ONLY%20%29/Personal%20Project/Dashboard/specs/002-terminal-live-intelligence/spec.md)

**Input**: Feature specification from `/specs/002-terminal-live-intelligence/spec.md`

---

## 1. Summary

The Terminal interface (`/terminal`) is being redesigned from an overwhelming 20+ widget scatter-grid into an intuitive, institutional **5-Stage Cognitive Hierarchy**:
1. **WHAT'S NOW?**: `SignalHero.tsx` (Level 1) — Hero cockpit displaying instantaneous setup state (`BUY`, `SELL`, or `NO VALID SETUP`), confluence score, grade (`A+` to `F`), and key price targets or waiting rationale.
2. **WHY?**: `ConfluenceInspector.tsx` (Level 2) — Granular 6-factor weight breakdown (Liquidity 20, Structure 20, FVG/OB 15, MTF 15, Momentum 15, Volume 10), affirmative "Why Valid" points, and active risk warnings.
3. **WHERE?**: `ChartExplainer.tsx` (Level 3) — Canvas/SVG-augmented candlestick visualizer plotting BOS, CHoCH, FVG zones, Order Blocks, Liquidity sweep lines, and projected Entry/SL/TP levels at locked 60 FPS.
4. **CAN I TRADE?**: `ExecutionReadinessGate.tsx` (Level 4) — Pre-flight safety audit (Spread, News, Toxic Hours, Regimes, Liquidity) yielding binary `READY` vs `BLOCKED`, paired with automated 1.0% risk lot sizing.
5. **MANAGE & EXECUTE**: `ExecutionManagementBar.tsx` (Level 5) — Rapid position management (`[BE]`, `[Close 50%]`, emergency slide-to-confirm `[Close All]`), alongside a compact single-line capital telemetry strip.

Auxiliary widgets (Order Ticket, Broker Settings, Heatmap, Tape Reader, Macro Calendar) are preserved but relocated to slide-over drawers or modal sheets to keep the primary trading flow uncluttered.

---

## 2. Technical Context

- **Language/Version**: TypeScript 5.x (Node.js 20+ / Next.js 15 App Router / React 19) + Python 3.11 (`mt5_bridge.py`) + MQL5 (`AdaptiveICT.mq5`)
- **Primary Dependencies**: Next.js 15, React 19, Lucide React, Tailwind CSS, Axios, WebSocket client, MetaTrader5 Python package
- **Storage**: In-memory snapshot cache in Node backend; PostgreSQL / TimescaleDB for trade records; MT5 internal memory buffer
- **Testing**: Vitest unit/contract tests, end-to-end browser verification via `quickstart.md`
- **Target Platform**: Desktop Institutional Trading Browser (1080p to 4K responsive layouts)
- **Project Type**: Financial Intelligence Cockpit & Execution Terminal
- **Performance Goals**:
  - Telemetry pipeline latency: < 800ms from MT5 tick to UI render
  - Chart canvas landmark overlay: 60 FPS during zoom/pan
  - Execution command transit: < 200ms
- **Constraints**:
  - Strict 1.0% account risk per entry (Constitution Principle II)
  - Zero ad-hoc curve-fit indicators (Constitution Principle I)
  - Mandatory slide-to-confirm safeguard on emergency liquidation
- **Scale/Scope**: Real-time multi-asset terminal monitoring XAUUSD, EURUSD, BTCUSD, US30, and GBPUSD.

---

## 3. Constitution Check

*GATE: Evaluated against `.specify/memory/constitution.md`.*

| Principle | Requirement | Plan Status | Details |
|---|---|---|---|
| **I. Quantitative Rigor** | No ad-hoc guessing; data-driven confluence scoring | **PASS** | Signal logic and 6-factor weights directly mirror validated `AdaptiveICT` mathematical formulations. |
| **II. Capital Protection** | Hard SL, 1.0% risk ceiling, emergency kill-switch | **PASS** | Automated 1.0% lot sizing built into Level 4 gate; slide-to-confirm `[Close All]` emergency kill switch in Level 5. |
| **III. Stack Boundaries** | MT5 $\rightarrow$ Python Bridge $\rightarrow$ Node API $\rightarrow$ Next.js UI | **PASS** | Architecture boundaries strictly maintained; no bypassing of the API/bridge layers. |
| **IV. Non-Destructive Evolution** | Preserve existing tools; institutional aesthetics | **PASS** | Secondary widgets moved to drawers without deleting functionality; sleek dark-mode glassmorphic styling applied. |

---

## 4. Project Structure

### Documentation (`specs/002-terminal-live-intelligence/`)

```text
specs/002-terminal-live-intelligence/
├── spec.md              # Feature specification & requirements
├── plan.md              # This implementation plan
├── research.md          # Phase 0 architectural & technical decisions
├── data-model.md        # Phase 1 TypeScript entity definitions & state transitions
├── contracts/           
│   └── terminal-api.yaml# OpenAPI 3.0 contract specification
├── quickstart.md        # Phase 1 end-to-end test scenarios
├── checklists/
│   └── requirements.md  # Spec verification checklist (100% passed)
└── tasks.md             # Phase 2 implementation task list (generated via /speckit-tasks)
```

### Source Code Architecture

```text
frontend/
├── app/
│   └── terminal/
│       └── page.tsx                          # Primary Cockpit View (orchestrates 5 levels)
├── components/
│   └── terminal/
│       ├── SignalHero.tsx                    # [NEW] Level 1: What's Now? (Hero Card)
│       ├── ConfluenceInspector.tsx           # [NEW] Level 2: Why? (6 Factors & Reasons)
│       ├── ChartExplainer.tsx                # [NEW] Level 3: Where? (Visual Structure Overlay)
│       ├── ExecutionReadinessGate.tsx        # [NEW] Level 4: Can I Trade? (Audit & Lot Sizing)
│       ├── ExecutionManagementBar.tsx        # [NEW] Level 5: Manage & Execute (1-Click Actions)
│       ├── CapitalTelemetryStrip.tsx         # [NEW] Compact single-line account ribbon
│       ├── AuxiliaryDrawer.tsx               # [NEW] Slide-over drawer for Heatmap/Tape/Macro
│       ├── Chart.tsx                         # [MODIFY] Expose canvas viewport hooks for landmarks
│       ├── TerminalHeader.tsx                # [MODIFY] Add 1-click execution toggle & drawer triggers
│       └── StatusBar.tsx                     # [MODIFY] Compact latency & bridge indicator
├── hooks/
│   ├── useTerminalIntelligence.ts            # [NEW] Consolidated hook for 5-layer telemetry stream
│   └── useTerminalData.ts                    # [MAINTAIN] Underlying raw data provider
backend/
├── src/
│   ├── routes/
│   │   └── terminal.ts                       # [MODIFY] Expose /hero, /confluence-details, /readiness
│   └── services/
│       └── terminalService.ts                # [NEW] Confluence evaluator & lot sizing logic
mt5_bridge.py                                 # [MODIFY] Stream extended DecisionResult & order actions
```

---

## 5. Implementation Phases & Component Detail

### Phase 1: Core Telemetry & State Hooks
- Construct `frontend/hooks/useTerminalIntelligence.ts`:
  - Merges WebSocket tick stream with cached REST snapshots.
  - Exposes reactive observables for `signalHero`, `confluence`, `landmarks`, `readiness`, and `positions`.
  - Fallback polling ensures continuous updates even if WebSocket reconnections occur.

### Phase 2: Level 1 & Level 2 Visual Intelligence
- Build `frontend/components/terminal/SignalHero.tsx`:
  - Instantaneous visual hierarchy: Emerald for Buy, Crimson for Sell, Slate Gray for No Valid Setup.
  - Large radial progress gauge for Confluence Score (0–100) with Grade badge (`A+`, `A`, `B`, `C`, `F`).
  - Clear R:R ratio, Entry, SL, and TP targets.
  - "Waiting for..." chip list when inactive.
- Build `frontend/components/terminal/ConfluenceInspector.tsx`:
  - 6 weighted progress bars: Liquidity (20), Structure (20), FVG/OB (15), MTF (15), Momentum (15), Volume (10).
  - Green checkmark list for "Why Valid" affirmative factors.
  - Amber badge list for "Active Warnings" (e.g. news embargoes, elevated spread).

### Phase 3: Level 3 Chart Structural Landmark Engine
- Build `frontend/components/terminal/ChartExplainer.tsx`:
  - Integrates directly with `Chart.tsx`.
  - SVG/Canvas overlay synchronizes with candle coordinate transformations.
  - Renders FVG boxes (tinted rectangles), Order Blocks (supply/demand zones), swept liquidity levels (dashed horizontal markers), BOS/CHoCH badges, and projected trade target lines.

### Phase 4: Level 4 Execution Readiness Gate & Risk Sizing
- Build `frontend/components/terminal/ExecutionReadinessGate.tsx`:
  - Multi-point pre-flight checklist: Spread (< 25p), High-Impact News (> 15m), Regime Alignment, HTF Bias, Volatility Filter.
  - Binary Status Banner: `[EXECUTION READY]` (Emerald) vs `[EXECUTION BLOCKED]` (Amber/Rose).
  - Risk Calculator widget: Fixed 1.0% risk formula, dynamically computing exact lot size from Stop Loss pip distance and account balance.

### Phase 5: Level 5 Execution Bar & Auxiliary Drawer
- Build `frontend/components/terminal/ExecutionManagementBar.tsx`:
  - Fast execution buttons (`[BUY]`, `[SELL]`) with 1-Click header toggle guard.
  - Active position management: `[BE]` (Breakeven), `[CLOSE 50%]`, `[CLOSE FULL]`.
  - Master Emergency Kill-Switch: `[CLOSE ALL]` shielded behind a slide-to-confirm slider.
  - Compact bottom `CapitalTelemetryStrip.tsx` with Balance, Equity, Daily PnL %, Free Margin, and Bridge Ping.
- Build `frontend/components/terminal/AuxiliaryDrawer.tsx`:
  - Collapsible slide-over drawer tab holding secondary modules (Heatmap, Tape Reader, Volume Profile, Macro Calendar) to keep main viewport dedicated to cognitive flow.

---

## 6. Complexity Tracking & Justifications

*No constitutional violations. All implementations adhere to standard project boundaries, risk limits, and quantitative validation standards.*

| Item | Status | Justification |
|---|---|---|
| New dedicated components | Approved | Separating each cognitive stage into dedicated modular components improves testability and eliminates monolithic card clutter. |
| Auxiliary Slide-Over Drawer | Approved | Preserves 100% of existing widget functionality without sacrificing primary screen real estate. |

---

## 7. Post-Design Constitution Check

- **Principle I (Quantitative Rigor)**: Confirmed. All decision matrices and factor point weightings match MQL5 quantitative engine specifications.
- **Principle II (Capital Protection)**: Confirmed. Hard SL enforcement and 1.0% risk calculation are integral to Level 4 gate.
- **Principle III (Stack Boundaries)**: Confirmed. Frontend purely reflects state and issues commands through the standard bridge pipeline.
- **Principle IV (Aesthetics & Non-Destructive)**: Confirmed. Institutional dark-mode design with fluid animations, zero placeholders, and zero loss of existing tool features.

**Final Gate Assessment: PASSED**
