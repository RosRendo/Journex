# Quickstart Validation Guide: AdaptiveICT Decision Engine

**Feature**: `004-evaluate-decision-engine`  
**Date**: 2026-09-28  
**Scope**: Step-by-step audit, verification, and upgrade instructions for `AdaptiveICT_DecisionEngine.pine`.

---

## 1. Quick Verification on TradingView

Follow these steps to inspect the indicator in your TradingView chart:

### Step 1: Open Pine Editor in TradingView
1. Open [TradingView](https://www.tradingview.com/chart/).
2. Select **`XAUUSD`** on the **`M5`** or **`M15`** timeframe.
3. Open the **Pine Editor** tab at the bottom of the screen.
4. Paste the contents of [`mql5/AdaptiveICT/Indicators/AdaptiveICT_DecisionEngine.pine`](file:///d:/FOR%20RENDO%20%28ONLY%20%29/Personal%20Project/Dashboard/mql5/AdaptiveICT/Indicators/AdaptiveICT_DecisionEngine.pine).
5. Click **Add to Chart**.

---

### Step 2: Validate Anti-Repainting via Bar Replay
1. Click the **Replay** button at the top toolbar in TradingView.
2. Select a point 30 days in the past during a volatile session (e.g. London or NY open).
3. Play forward at 3x speed.
4. **Pass Criteria**:
   - Arrows only appear on candle close (confirmed bars).
   - Once an arrow or trade line is drawn, it **never disappears, shifts forward, or changes price** upon further bar progression.

---

### Step 3: Inspect Multi-Timeframe Alignment
1. In indicator settings:
   - Check **HTF 1 (4H)**, **HTF 2 (1H)**, **HTF 3 (15M)**.
2. Observe the HUD **MULTI-TIMEFRAME** rows:
   - When 4H, 1H, and 15M agree $\rightarrow$ Status reads **`BULLISH (100)`** or **`BEARISH (100)`**.
   - When mixed $\rightarrow$ Status reads **`MIXED (50)`**.

---

### Step 4: Verify Cross-System Parity with MT5 EA
1. Compare an active M5 setup on TradingView with MetaTrader 5 running `AdaptiveICT.ex5`.
2. Check the on-chart Dashboard on MT5:
   - Regime on MT5 matches Regime on TradingView HUD.
   - Confluence Score on MT5 matches Confluence Score on TradingView HUD ($\pm 3$ points due to broker tick differences).
