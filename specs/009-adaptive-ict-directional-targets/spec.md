# Feature Specification: AdaptiveICT Directional Targets & Indicator Health Fix

**Feature Branch**: `009-adaptive-ict-directional-targets`

**Created**: 2026-10-22

**Status**: Draft

**Input**: User description: "check adaptiveICT_DecisionEngine.pine why tp 1 tp 2 tp3 always on bottom it doens't flexible to buy back is indicator okay? check everything"

---

## 1. Executive Problem Summary & Forensic Root Cause

### 1.1 The Primary Symptoms
1. **Target Levels Fixed to Bottom**: On chart rendering and in HUD rows 21–23 (or rows 9–10 in Compact mode), `TP1`, `TP2`, and `TP3` persistently project **below current price** (subtracted from entry), even when the asset is in a sustained bullish trend or when the trader is looking for a long setup.
2. **Cannot "Buy Back" / Inflexible Retracements**: When price retraces into a discount zone, Fair Value Gap (FVG), or bullish Order Block (OB) to present a long continuation ("buy back" setup), the indicator continues projecting downward sell targets and an overhead stop loss.
3. **Contradictory Signal Gating**: The user observes that buy signals rarely print or trigger trades during bullish pullbacks, keeping the indicator permanently parked in short projection mode.

---

### 1.2 Forensic Root Cause Analysis

#### A. The Hardcoded Default Bias in `disp_dir` (Lines 1064–1071)
```pinescript
// Original Lines 1064-1071 in AdaptiveICT_DecisionEngine.pine
float disp_entry = trade_active ? trade_entry : close
float disp_sl    = trade_active ? trade_sl : curr_sl_px
float disp_sl_dist = math.max(syminfo.mintick * 10, math.abs(disp_entry - disp_sl))
int   disp_dir   = trade_active ? trade_dir : (buy_signal or struct_bias_v == 1 ? 1 : -1)

float disp_tp1   = trade_active and not na(trade_tp1) ? trade_tp1 : (disp_dir == 1 ? disp_entry + disp_sl_dist * tp1_rr : disp_entry - disp_sl_dist * tp1_rr)
float disp_tp2   = trade_active and not na(trade_tp2) ? trade_tp2 : (disp_dir == 1 ? disp_entry + disp_sl_dist * tp2_rr : disp_entry - disp_sl_dist * tp2_rr)
float disp_tp3   = trade_active and not na(trade_tp3) ? trade_tp3 : (disp_dir == 1 ? disp_entry + disp_sl_dist * tp3_rr : disp_entry - disp_sl_dist * tp3_rr)
```
- When no trade is actively open (`trade_active == false`), `disp_dir` evaluates `(buy_signal or struct_bias_v == 1 ? 1 : -1)`.
- On the live developing bar (`barstate.islast`), `barstate.isconfirmed` is `false`, meaning `buy_signal` is guaranteed to be `false`.
- `struct_bias_v` is only `1` if `struct_lbl == "BULLISH"` or `"CHOCH BULL"`. In all other conditions (`NEUTRAL`, `BEARISH`, `CHOCH BEAR`), `struct_bias_v != 1`.
- Because `detectStructure()` resets `ph1 := na` immediately after a breakout candle closes, `struct_lbl` resets to `"NEUTRAL"` (`struct_bias_v = 0`) on almost every single bar!
- Therefore, `(buy_signal or struct_bias_v == 1)` evaluates to `false` ~95% of the time, and the ternary defaults to `-1` (SELL / SHORT).
- For `disp_dir == -1`, all TP targets are calculated as `disp_entry - disp_sl_dist * rr` (placed below the entry on the bottom).

#### B. Complete Amnesia on Trade Exit (`last_signal_dir` missing)
- When a trade closes, `trade_dir` is reset to `0` and all variables are set to `na`.
- The indicator has no persistent state (`var int last_signal_dir`) remembering what direction the engine last fired or what the dominant bias was. It instantly drops into `disp_dir = -1`.

#### C. Inflexible Pullbacks / "Buy Back" Lockout
- In ICT methodology, a "buy back" occurs when price retraces downward into **Discount** (<30% or <50% of range), mitigating an FVG or Order Block.
- However, line 905 requires:
  `buy_signal := struct_bias_v == 1 and liq_active and (bull_fvg_v or bull_ob_v) and pd_zone == "DISCOUNT" and regime_lbl != "HIGH_VOLATILITY" ...`
- During a pullback, price is falling, so `struct_bias_v` is 0 or -1. And when price is breaking out upward to make `struct_bias_v == 1`, price is at swing highs in **Premium** (`pd_zone == "PREMIUM"`). The two conditions virtually never coincide on the same candle!
- Furthermore, `disp_dir` ignores `potential_dir`, `ema_bias_v`, and `mtf_align_bias`.

#### D. Volatility Regime Inversion Bug (Line 207)
```pinescript
if atr_pct < 0.0003 or atr_pct > 0.0025
    regime := "HIGH_VOLATILITY"
```
- If ATR is compressed/small (`atr_pct < 0.0003`, or 0.03% of price), the indicator classifies the regime as `HIGH_VOLATILITY`!
- And because lines 898 and 905 strictly forbid trades during `HIGH_VOLATILITY`, all signals are shut down during low-volatility accumulation or consolidation.

#### E. Structure Pivot Stop Loss Inversion
- In Structure Pivot mode, line 1054 sets `curr_sl_px := (buy_signal or struct_bias_v == 1) ? pl1 : ph1`.
- If `pl1` is higher than `close` (e.g. erratic swing or delayed pivot update), a buy trade calculates a stop loss above entry price, which triggers immediate false exit or negative risk calculations.

---

## 2. User Scenarios & Testing *(mandatory)*

### User Story 1 - Adaptive Directional Target Projection (Priority: P1)

As a trader using the AdaptiveICT indicator, I need the projected TP1, TP2, TP3 and Stop Loss levels to dynamically adjust above entry for BUY setups and below entry for SELL setups based on a clear hierarchical direction ladder, so that I can see realistic targets whether I am buying, selling, or buying back on a pullback.

**Why this priority**: Directly solves the primary user issue ("why tp 1 tp 2 tp3 always on bottom it doesn't flexible to buy back").

**Independent Test**:
Switch the indicator between bullish markets, bearish markets, and pullback conditions. Observe `live_ln_tp1/2/3` on the chart and HUD target rows:
- When bias is Bullish: Entry at price, SL below price, TP1/TP2/TP3 above price.
- When bias is Bearish: Entry at price, SL above price, TP1/TP2/TP3 below price.

**Acceptance Scenarios**:
1. **Given** no active trade is open and prevailing market bias is bullish (via EMA bias, MTF alignment, or recent BUY signal), **When** inspecting on-chart lines and HUD rows 21–23, **Then** `disp_tp1`, `disp_tp2`, and `disp_tp3` are plotted **above** current price (`disp_entry + sl_dist * rr`), and `disp_sl` is plotted **below** current price.
2. **Given** an active BUY trade hits TP1 or exits, **When** the trade resets to flat (`trade_dir == 0`), **Then** the engine maintains `last_signal_dir == 1` and continues projecting BUY targets above price rather than snapping down to the bottom.

---

### User Story 2 - Flexible "Buy Back" Pullback Resolution (Priority: P2)

As an ICT trader looking to enter on discount pullbacks ("buy back" into a bull trend), I need the indicator to recognize pullback confluence (Discount zone + Bullish FVG/OB + HTF Bullish bias) so that it projects long continuation targets instead of forcing a sell short projection.

**Why this priority**: Directly satisfies the user requirement ("it doesn't flexible to buy back").

**Independent Test**:
On an asset trending upward on higher timeframes (e.g. XAUUSD 1H), observe a 5M pullback into a Discount zone / FVG.
- Indicator must identify `potential_dir == 1` and project Long targets (TP above, SL below).

**Acceptance Scenarios**:
1. **Given** 4H/1H MTF bias is Bullish (`mtf_align_bias == 1`) or EMA fast > slow (`ema_bias_v == 1`), **When** price pulls back into Discount (`pd_zone == "DISCOUNT"`) near a Bullish FVG or Bullish OB, **Then** `disp_dir` resolves to `+1` (Long), displaying projected Buy targets.
2. **Given** "Momentum Scalper" mode is selected, **When** `mom_dir == 1` and `ema_bias_v == 1`, **Then** projected targets align with momentum direction (+1) rather than falling back to `-1`.

---

### User Story 3 - Comprehensive Indicator Health & Sanity Guardrails (Priority: P3)

As an institutional trader, I need all underlying math calculations (volatility classification, structure pivot SL safety, order block impulse thresholds, and equal high/low liquidity detection) to be mathematically sound across any symbol (Forex, Gold, Crypto, Indices) without false deadlocks.

**Why this priority**: Fulfills the user request to "is indicator okay? check everything".

**Independent Test**:
Audit regime classifications, order block triggers, and SL bounds on XAUUSD, EURUSD, and BTCUSD:
- Low volatility must classify as `LOW` or `COMPRESSION`, never `HIGH_VOLATILITY`.
- SL in Structure Pivot mode must always satisfy `sl < entry` for Buy and `sl > entry` for Sell.

**Acceptance Scenarios**:
1. **Given** market volatility is low (`atr_pct < 0.0003`), **When** `detectRegime()` runs, **Then** it classifies as `COMPRESSION` or `LOW_VOLATILITY`, without blocking normal trend evaluation.
2. **Given** `sl_mode == "Structure Pivot"`, **When** `pl1 >= close` during a BUY evaluation, **Then** the system automatically clamps or falls back to `close - atr_v * sl_atr_mult`, guaranteeing that SL is strictly below entry.

---

## 3. Requirements & Architecture

### 3.1 Direction Resolution Hierarchy Ladder (`disp_dir`)
Instead of a brittle single-condition ternary, `disp_dir` MUST resolve through a deterministic 5-step hierarchy:
1. **Step 1 (Active Trade)**: If `trade_active`, use `trade_dir` (1 for BUY, -1 for SELL).
2. **Step 2 (Active Signal on Bar)**: If `buy_signal`, use `1`; if `sell_signal`, use `-1`.
3. **Step 3 (Last Confirmed Signal Memory)**: If `last_signal_dir != 0`, use `last_signal_dir`.
4. **Step 4 (Confluence Bias Ladder)**:
   - In "Momentum Scalper" mode: Use `mom_dir != 0 ? mom_dir : ema_bias_v`.
   - In "ICT Sniper" / "MQL5 Parity" mode: If `mtf_align_bias != 0`, use `mtf_align_bias`; else if `potential_dir != 0`, use `potential_dir`; else use `ema_bias_v`.
5. **Step 5 (Fallback)**: If completely indeterminate, default to `ema_bias_v` (price vs EMA 200), ensuring trend alignment instead of hardcoded short bias.

### 3.2 Functional Requirements

- **FR-001**: Persistent Direction Memory: The script MUST declare `var int last_signal_dir = 0` updated on every confirmed `buy_signal` (setting `last_signal_dir := 1`) and `sell_signal` (setting `last_signal_dir := -1`).
- **FR-002**: Dynamic `disp_dir` Calculation: Execution targets (`disp_tp1`, `disp_tp2`, `disp_tp3`, `disp_sl`) MUST be computed using the resolved `disp_dir`.
- **FR-003**: Directional HUD Labels: HUD table target rows and on-chart labels MUST indicate target orientation (e.g. `🎯 BUY TP1 (1.2R)` vs `🎯 SELL TP1 (1.2R)`).
- **FR-004**: Stop Loss Bound Validation: In both ATR and Structure Pivot modes, Stop Loss MUST be strictly enforced:
  - If `disp_dir == 1`: `disp_sl` MUST be `< disp_entry`. If pivot `pl1 >= disp_entry`, clamp to `disp_entry - atr_v * sl_atr_mult`.
  - If `disp_dir == -1`: `disp_sl` MUST be `> disp_entry`. If pivot `ph1 <= disp_entry`, clamp to `disp_entry + atr_v * sl_atr_mult`.
- **FR-005**: Volatility Regime Fix: Line 207 `atr_pct < 0.0003` MUST be removed from `HIGH_VOLATILITY` and classified appropriately so low volatility does not trigger false risk stops.
- **FR-006**: Order Block Impulse Scaling: Order Block candle impulse detection MUST be normalized using ATR (`(close - close[1]) > atr_v * 0.8`) rather than fixed `1.002` percentage multiplier, enabling correct detection across Forex pairs.

---

## 4. Measurable Success Criteria

- **SC-001**: In any bullish trend or on any BUY signal, `disp_tp1 > disp_entry`, `disp_tp2 > disp_tp1`, `disp_tp3 > disp_tp2`, and `disp_sl < disp_entry` 100% of the time.
- **SC-002**: During a pullback into Discount in an overall bullish market, target lines stay oriented upward for buying back.
- **SC-003**: 0 compilation errors or warnings in Pine Script v5 / TradingView.
- **SC-004**: Exact synchronization between on-chart persistent target lines (`live_ln_tp1/2/3`) and HUD table display values.
