# Feature Specification: Terminal Cognitive Hierarchy & Execution Engine

**Feature Branch**: `002-terminal-live-intelligence`  
**Created**: 2026-09-20  
**Status**: Ready for Planning  
**Input**: User architecture: "Redesign Terminal around an obvious mental flow: What's Now → Why → Where → Can I Trade → Execute → Manage, replacing cluttered widget overload with progressive disclosure."

---

## 1. Executive Mental Model & Story Flow

The Terminal operates on a single linear cognitive story. When a trader opens `/terminal`, their eyes are guided through 5 natural decision gates:

```
                    TERMINAL
                       │
              ┌────────▼────────┐
              │ 1. WHAT'S NOW?  │  Is there a valid setup right now?
              │ Market / Signal │  (Signal Hero Card: BUY / SELL / NO TRADE)
              └────────┬────────┘
                       │
              ┌────────▼────────┐
              │ 2. WHY?         │  Why is this signal valid?
              │ Confluence      │  (Factor scores, Why Valid checks, Warnings)
              └────────┬────────┘
                       │
              ┌────────▼────────┐
              │ 3. WHERE?       │  Where is price in market structure?
              │ Chart Engine    │  (BOS, CHoCH, FVG, OB, Liquidity, TP/SL)
              └────────┬────────┘
                       │
              ┌────────▼────────┐
              │ 4. CAN I TRADE? │  Is execution legally permitted right now?
              │ Readiness Gate  │  (Spread, News, Regime, 1.0% Risk Sizing)
              └────────┬────────┘
                       │
              ┌────────▼────────┐
              │ 5. MANAGE       │  Active trade lifecycle & capital status
              │ Positions & Cap │  (BE, 50% Close, Close All, Account Strip)
              └─────────────────┘
```

---

## 2. Locked Core Decisions

Based on user feedback, the three primary UX decisions are locked as follows:

1. **Alert Threshold (FR-011)**: **Grade A & A+ Only (Confluence Score 70+)**. Audio chime and toast notifications trigger exclusively on institutional prime setups, completely eliminating spam during market chop.
2. **Execution Confirmation Mode (FR-012)**: **1-Click with Quick Safety Slide/Toggle**. A dedicated header toggle enables "Instant 1-Click Execution" for active trading, while emergency actions ("Close All") use a slide-to-confirm pattern to prevent accidental misclicks.
3. **Market Regime Classification Source (FR-013)**: **Hybrid Telemetry Stream**. Primary regime data streams live from the `AdaptiveICT` EA engine (`MarketRegimeDetector.mqh`) via `mt5_bridge.py`, with an automatic fallback frontend calculation (200 EMA + ADX + Asian range) if MT5 is offline.

---

## 3. User Scenarios & Testing *(mandatory)*

### User Story 1 - "What's Now?": The Instant Signal Hero (Priority: P1)

As a trader opening `/terminal`, I want the top hero section to answer ONE question immediately: *"Is there a trade right now?"*, so that within 2 seconds I know whether to take action or step away.

**Why this priority**: Solves cognitive overload. Prevents the trader from scanning 20 disconnected cards just to figure out the market status.

**Independent Test**: Load `/terminal` with a live signal feed. Confirm that when a setup exists, the Hero Card renders the Bias, Confluence Score, Grade (e.g. `A+ 82/100`), Entry, SL, TP1, and TP2. When no setup exists, confirm it displays `NO VALID SETUP` with a clear "Waiting for: [criteria]" list.

**Acceptance Scenarios**:
1. **Given** a valid ICT setup exists on XAUUSD M15, **When** `/terminal` loads, **Then** the Hero displays a high-visibility Card: `WAITING FOR LONG / BUY BIAS`, `82/100 A+`, Entry `4,218.30`, SL `4,207.80`, TP1 `4,239.30`, TP2 `4,260.30`, with `[VIEW SETUP]` and `[EXECUTE]` actions.
2. **Given** no setup meets the threshold (Score < 55), **Then** the Hero renders `NO VALID SETUP` (Score `46/100 C`) and explicitly lists what the engine is waiting for (e.g., `• Sell-side liquidity sweep`, `• M15 structure confirmation`).

---

### User Story 2 - "Why?": The Confluence & Warning Matrix (Priority: P2)

As a trader who sees a signal, I want to understand *why* the bot believes it is valid before risking real money, seeing factor-by-factor scoring alongside active risk warnings.

**Why this priority**: Builds mathematical trust and eliminates black-box trading.

**Independent Test**: Click `[VIEW SETUP]` or view the Confluence Layer. Verify that all 6 weighted criteria (Liquidity 18/20, Structure 17/20, FVG/OB 15/15, MTF 14/15, Momentum 10/15, Volume 8/10) render with progress bars, affirmative checkmarks (`✓ Sell-side liquidity swept`), and active warnings (`⚠ NY News in 18 min`).

**Acceptance Scenarios**:
1. **Given** a signal is displayed, **When** inspecting the Confluence layer, **Then** the UI displays an itemized breakdown of all 6 components summing to the total score.
2. **Given** a high-impact news event is approaching or spread is elevated, **Then** prominent amber/red Warning Badges appear directly below the score.

---

### User Story 3 - "Where?": The Chart Structure Explanation Engine (Priority: P3)

As an institutional technical trader, I want the candlestick chart to visually expose the exact market structure behind the signal (BOS, CHoCH, Liquidity pools, FVG zones, Order Blocks, and Entry/SL/TP levels) so that the chart acts as an explanation engine rather than a passive picture.

**Why this priority**: Transforms the chart from generic lines into visual verification of ICT concepts.

**Independent Test**: Load the chart for the active signal. Verify that structural markers (BOS, CHoCH), liquidity sweep lines, FVG rectangular zones, Order Blocks, and entry/SL/TP price tags are plotted cleanly on the candle canvas.

**Acceptance Scenarios**:
1. **Given** a Buy signal generated by an M15 FVG and H1 Order Block, **When** viewing the chart, **Then** the FVG is highlighted as a semi-transparent colored box, the Order Block is labeled, and entry/SL/TP1/TP2 horizontal price guides are projected to the right axis.
2. **Given** timeframe switching between M5, M15, and H1, **Then** the chart retains structural markers relevant to that resolution without lagging.

---

### User Story 4 - "Can I Trade?": The Execution Readiness Gate (Priority: P4)

As a disciplined risk manager, I want an unambiguous **Execution Readiness Gate** that audits Market Open, Spread, Volatility, Regime, MTF Alignment, News, and Liquidity into a single status (`READY` vs `BLOCKED`), with automated 1.0% lot sizing.

**Why this priority**: Eliminates emotional trading, prevents entries during toxic spread/news spikes, and strictly enforces the project constitution's 1.0% risk cap.

**Independent Test**: Simulate an upcoming high-impact news event (<15 min) or a spread spike (>25 pips). Verify that the Gate immediately switches to `BLOCKED (✕ HIGH IMPACT NEWS / ✕ SPREAD TOO HIGH)` and disables the Execute button.

**Acceptance Scenarios**:
1. **Given** all 7 conditions pass, **Then** the gate displays `READY (✓ SPREAD, ✓ REGIME, ✓ MTF, ✓ LIQUIDITY)`, auto-calculates position size for 1.0% account risk, and enables `[EXECUTE BUY]`.
2. **Given** any critical failure occurs, **Then** the gate switches to `BLOCKED`, highlights the red failure reason, and disables execution.

---

### User Story 5 - "Manage": Active Positions & Compact Capital Strip (Priority: P5)

As a trader with open market exposure, I want open positions consolidated into a dedicated bottom execution zone with 1-click trade management (Break-Even, Close 50%, Market Close) and a compact account status strip that stays visible without crowding the analysis.

**Why this priority**: Keeps post-trade execution disciplined and accessible while ensuring account balance doesn't distract from setup analysis.

**Independent Test**: Open a test trade. Verify it renders in the Open Positions bar with live PnL, entry, current price, SL, TP, and clicking `[BE]` immediately updates MT5 stop-loss to entry price.

**Acceptance Scenarios**:
1. **Given** active trades exist, **When** viewing the management zone, **Then** each position displays Ticket, Volume, Entry, Live PnL ($ and pips), and instant buttons for `[BE]`, `[CLOSE 50%]`, and `[CLOSE]`.
2. **Given** account metrics are displayed, **Then** they appear in a sleek single-line summary strip (`BALANCE $10,420 | EQUITY $10,380 | FLOATING -$40 | MARGIN 84% | DAILY P&L -0.4%`).

---

## 4. Progressive Disclosure Hierarchy

To keep the interface clean while supporting deep analysis, the Terminal is organized into 5 progressive layers:

* **Level 1 — The Hero Cockpit**: "What is happening now?" (Signal, Score, Grade, Readiness status).
* **Level 2 — Confluence Drawer / Panel**: "Why?" (Factor scores, checklist items, warning reasons).
* **Level 3 — Chart Canvas**: "Where?" (BOS, CHoCH, FVG, OB, Liquidity, Entry/SL/TP).
* **Level 4 — Deep Telemetry Inspector**: "How was it calculated?" (Raw indicator values, tick latency, MT5 EA ConfluenceScorer weights).
* **Level 5 — Execution & Management Bar**: "What happens if I trade?" (Risk sizing, open positions, emergency close).

---

## 5. Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The Terminal MUST render a prominent **Signal Hero Card** answering *"Is there a valid trade right now?"* showing Signal Type, Score (0–100), Grade (A+ to F), Entry, SL, TP1, TP2, or a explicit *"NO VALID SETUP - Waiting for [X]"* state.
- **FR-002**: The Terminal MUST provide a **Confluence Breakdown Layer** displaying 6 weighted sub-scores: Liquidity (20), Market Structure (20), FVG/OB (15), MTF Alignment (15), Momentum (15), Volume (10).
- **FR-003**: The Terminal MUST display explicit **"Why Valid" affirmative badges** and **"Active Warnings" restriction tags** directly adjacent to the Confluence Breakdown.
- **FR-004**: The interactive chart MUST visually render structural market landmarks: BOS, CHoCH, Fair Value Gaps (FVG boxes), Order Blocks (OB), Liquidity Sweeps, Entry Price line, Stop Loss, and TP1/TP2 targets.
- **FR-005**: The Terminal MUST display a compact **Multi-Timeframe Alignment Matrix** showing Direction, Structure, and Momentum across H4, H1, M15, and M5, with a cumulative HTF Bias % score.
- **FR-006**: The Terminal MUST display an **Execution Readiness Gate** auditing 7 parameters (Market Open, Spread, Volatility, Regime, MTF, News, Liquidity), outputting a binary `READY` or `BLOCKED` status.
- **FR-007**: When in `READY` status, the Order Ticket MUST automatically calculate lot size to risk exactly **1.0% of live account balance** based on the ATR stop-loss distance.
- **FR-008**: The Terminal MUST provide a compact **News Radar** displaying only imminent releases (<6 hours) with countdown timers, opening a detailed calendar drawer upon user click.
- **FR-009**: Account telemetry MUST be rendered as a **Compact Capital Strip** (Balance, Equity, Floating PnL, Margin %, Daily PnL) subordinate to market intelligence.
- **FR-010**: Open positions MUST be displayed in an **Execution & Management Zone** with 1-click action triggers: `[BE]` (Break-Even), `[CLOSE 50%]`, individual `[CLOSE]`, and a slide-to-confirm `[CLOSE ALL]`.
- **FR-011**: The Terminal MUST fire a toast notification and audio chime when a setup reaches **Grade A or A+ (Score >= 70)**.
- **FR-012**: The Terminal MUST support a **1-Click Execution Toggle** in the header, enabling zero-dialog fast execution for active scalping while preserving slide safety for emergency actions.
- **FR-013**: The Market Regime classification MUST stream directly from `AdaptiveICT`'s `MarketRegimeDetector.mqh` via `mt5_bridge.py`, falling back to local frontend calculation if the bridge is disconnected.

---

## 6. Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A trader can determine if a trade exists, its direction, and its quality grade in under **1.5 seconds** of opening `/terminal`.
- **SC-002**: A trader can understand the complete "Why" (confluence factors + warnings) in under **4 seconds**.
- **SC-003**: 100% of order execution suggestions enforce the 1.0% risk cap, preventing margin over-allocation.
- **SC-004**: Execution requests (`[BE]`, `[CLOSE 50%]`, `[EXECUTE]`) trigger broker confirmation in under **800 milliseconds** via live WebSocket.
- **SC-005**: Zero visual clutter: Non-essential details (economic history, deep telemetry) are tucked behind progressive drawers/tabs, keeping the primary viewport strictly focused on decision-making.

---

## 7. Assumptions

- The Python `mt5_bridge.py` service streams real-time tick and signal telemetry from `AdaptiveICT.mq5`.
- XAUUSD M15 is the primary flagship asset and timeframe, with instant switching available for other watchlist instruments.
- Risk management parameters strictly conform to the project constitution in `.specify/memory/constitution.md`.
