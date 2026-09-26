# Quickstart & End-to-End Validation Guide: Terminal Cognitive Hierarchy

**Feature**: `002-terminal-live-intelligence`  
**Date**: 2026-09-20  
**Status**: Ready for Validation

---

## 1. Prerequisites & Services Setup

Ensure all three core ecosystem processes are running:

### Terminal 1: MT5 IPC Bridge
```powershell
# From project root
python .\mt5_bridge.py
# Verified running on: http://127.0.0.1:8000 (or internal IPC pipe)
```

### Terminal 2: Dashboard Backend API
```powershell
cd backend
npm run dev
# Verified running on: http://localhost:5003
```

### Terminal 3: Cockpit Frontend
```powershell
cd frontend
npm run dev
# Verified running on: http://localhost:3000
```

---

## 2. End-to-End Validation Scenarios

### Scenario 1: Level 1 Signal Hero Card (State Evaluation)
* **Goal**: Validate that the top hero card immediately answers *"Is there a valid trade right now?"* without user confusion.
* **Test Steps**:
  1. Open browser to `http://localhost:3000/terminal`.
  2. Inspect the top Hero card (`SignalHero.tsx`).
  3. **Case A: Active Setup (Confluence >= 55)**:
     - Verify badge shows `[BUY]` (emerald green) or `[SELL]` (crimson red).
     - Verify Confluence Score circle displays animated percentage (e.g. `82%`) and Grade badge (`A` or `A+`).
     - Verify Entry, SL, and TP target prices are rendered cleanly with R:R display (e.g. `1:2.4`).
  4. **Case B: No Valid Setup (Confluence < 55)**:
     - Verify card transitions to neutral institutional slate gray.
     - Verify headline displays `NO VALID SETUP`.
     - Verify "Waiting for..." chip list details missing conditions (e.g., `Waiting for M15 FVG retest`, `Liquidity sweep pending`).
* **Expected Outcome**: Instant cognitive clarity in < 2 seconds of viewing.

---

### Scenario 2: Level 2 Confluence Factor Inspector
* **Goal**: Validate the transparent mathematical breakdown behind the score.
* **Test Steps**:
  1. Below the Hero card, inspect `ConfluenceInspector.tsx`.
  2. Verify 6 weighted sub-factors are displayed with current scores vs max points:
     - Liquidity (max 20 pts)
     - Market Structure (max 20 pts)
     - FVG / Order Block (max 15 pts)
     - MTF Alignment (max 15 pts)
     - Momentum (max 15 pts)
     - Volume & Volatility (max 10 pts)
  3. Verify affirmative bullet points under "Why Valid" (e.g. `Asian low liquidity swept at 2742.10`, `M5 bullish CHoCH closed above 2745.50`).
  4. Verify amber warning chips under "Active Warnings" if any gating condition is marginal (e.g. `NY high-impact news in 22m`).
* **Expected Outcome**: Complete transparency without guessing or black-box feelings.

---

### Scenario 3: Level 3 Structural Chart Explainer
* **Goal**: Validate that price action landmarks visually annotate the candlestick chart.
* **Test Steps**:
  1. Inspect the central chart canvas (`ChartExplainer.tsx`).
  2. Ensure the following landmarks are visually rendered via SVG/Canvas overlay:
     - **FVG Boxes**: Tinted shaded rectangles with border highlights.
     - **Order Blocks**: Shaded supply/demand boxes.
     - **Liquidity Sweeps**: Dashed horizontal levels with target sweeps labeled.
     - **Structure Shifts**: Crisp `BOS` and `CHoCH` marker tags.
     - **Trade Projections**: Visual entry line (blue), SL line (red), TP lines (green).
  3. Pan and zoom chart to verify overlay maintains 60 FPS smooth rendering without stuttering.
* **Expected Outcome**: The chart directly explains *where* and *why* the setup exists in price space.

---

### Scenario 4: Level 4 Execution Readiness Gate & Lot Sizing
* **Goal**: Validate that pre-trade safety audits automatically prevent illegal or high-risk entries.
* **Test Steps**:
  1. Inspect `ExecutionReadinessGate.tsx`.
  2. Check status indicator:
     - If all checks pass (Spread <= 25p, No news < 15m, Session active, Regimes aligned): Badge shows `[EXECUTION READY]`.
     - If any check fails: Badge turns amber/red `[EXECUTION BLOCKED]` with the specific blocking reason highlighted.
  3. Verify automatic 1.0% lot sizing calculation:
     - Account Balance: `$10,000`
     - Risk: `1.0%` ($100 risk)
     - SL Distance: `25 pips`
     - Verify Lot Sizing displays `0.40 Lots` automatically without manual calculation required.
* **Expected Outcome**: Non-negotiable adherence to Principle II (Hard Risk Limits) and zero math errors.

---

### Scenario 5: Level 5 Execution & Position Management
* **Goal**: Validate 1-click execution safety, position management, and emergency master kill-switch.
* **Test Steps**:
  1. Click `[EXECUTE BUY / SELL]` on an active setup.
  2. Verify active order appears in the bottom position management bar.
  3. Click `[BE]` (Breakeven): Verify SL updates immediately to entry price + spread buffer in MT5.
  4. Click `[CLOSE 50%]`: Verify position volume is halved in MT5.
  5. Test Master Emergency Kill-Switch:
     - Verify `[CLOSE ALL]` is shielded by a slide-to-confirm slider.
     - Drag slider across to activate: Verify all active orders liquidate simultaneously.
* **Expected Outcome**: Lightning-fast position control with zero accidental liquidation triggers.

---

### Scenario 6: Subordinate Capital Telemetry Strip
* **Goal**: Validate that account equity, balance, margin, and ping are available in a single horizontal strip.
* **Test Steps**:
  1. Review the compact bottom bar (`CapitalTelemetryStrip`).
  2. Verify:
     - Account Balance & Equity
     - Floating PnL & Daily % Return
     - Free Margin & Margin Level
     - Connection status dot (Green = Live, Yellow = Fallback Poll, Red = Disconnected) with ping latency in ms.
* **Expected Outcome**: Critical telemetry accessible without wasting vertical screen space.
