# Phase 0 Research: AdaptiveICT Decision Engine Quality & Integrity Audit

**Feature**: `004-evaluate-decision-engine`  
**Date**: 2026-09-28  
**Scope**: Technical analysis, mathematical soundness, anti-repainting rigor, and MQL5 engine parity for `AdaptiveICT_DecisionEngine.pine`.

---

## 1. Anti-Repainting & Higher-Timeframe Security Architecture

### Problem Analysis
In `AdaptiveICT_DecisionEngine.pine` (lines 363-375), higher-timeframe data is fetched using:
```pinescript
htf1_close = request.security(syminfo.tickerid, htf1_res, close, barmerge.gaps_off, barmerge.lookahead_off)
htf1_ema   = request.security(syminfo.tickerid, htf1_res, ema_slow_series, barmerge.gaps_off, barmerge.lookahead_off)
```
In TradingView Pine Script v5:
- When `barmerge.lookahead_off` is used with unshifted `close` on an unclosed higher-timeframe bar, historical bars display the *final closing price of the higher-timeframe candle* before it actually closed on that lower-timeframe bar.
- On historical bars, an M5 bar at 13:05 peeks forward to the 4H bar's close at 16:00!
- In real time, `close` updates on every tick.
- This creates **lookahead bias / historical repainting**, making backtested historical signals appear artificially pristine compared to live execution.

### Decision
Implement the standard, formally certified Pine Script v5 non-repainting wrapper pattern:
```pinescript
// Strictly non-repainting HTF call: reference closed historical bar [1] with lookahead_on
htf_close = request.security(syminfo.tickerid, htf_res, close[1], barmerge.gaps_off, barmerge.lookahead_on)
```
For realtime evaluation where the trader wants to know the *current unconfirmed* HTF state vs *confirmed historical* HTF state, the indicator will provide a configurable toggle:
- `Confirmed HTF Only (Zero Repaint)` (Default): Uses `close[1]` with `lookahead_on`. Guaranteed 100% stable history and bar-replay fidelity.
- `Live Real-time Intrabar`: Evaluates the developing candle in real time, but documents that historical bars prior to today are confirmed.

---

## 2. Higher-Timeframe EMA Mathematical Soundness

### Problem Analysis
Line 360 declares:
```pinescript
ema_slow_series = ta.ema(close, ema_slow_len)
htf1_ema = request.security(syminfo.tickerid, htf1_res, ema_slow_series, ...)
```
- `ta.ema(close, 200)` is calculated using **M5 candle closes** (a 200-bar M5 EMA spanning ~16.6 hours).
- `request.security` then samples that M5 series once every 4 hours.
- This does **NOT** calculate the 200 EMA of 4-hour candles (which spans 800 hours / 33 days).
- As a result, the "4H Bias" on the HUD is mathematically distorted, comparing a 4H price against a 16-hour moving average rather than an institutional 200-period 4H trendline.

### Decision
Calculate the moving average directly inside the higher-timeframe context:
```pinescript
htf1_ema = request.security(syminfo.tickerid, htf1_res, ta.ema(close, ema_slow_len)[1], barmerge.gaps_off, barmerge.lookahead_on)
```
This guarantees mathematical correctness: the 200 EMA is computed across 200 genuine 4-hour candles.

---

## 3. Confluence Scoring & MQL5 Engine Parity

### Problem Analysis
Currently, `AdaptiveICT_DecisionEngine.pine` has two modes:
1. `Momentum Scalper`: Momentum 25%, Regime 15%, Volatility 10%, Structure 15%, MTF 10%, OF 10%, Session 5%, Execution 10%.
2. `ICT Sniper`: Structure 25%, Liquidity 15%, FVG 10%, OB 10%, Premium/Discount 10%, MTF 10%, OF 10%, Session 5%, Execution 5%.

However, the automated MQL5 EA (`mql5/AdaptiveICT/Core/EntryQualityEngine.mqh`) implemented in Phase 4 of `specs/003-adaptiveict-ea-engine/` utilizes the standardized **10-Component Institutional Matrix**:
1. Market Structure: 20 pts
2. Liquidity Sweep: 15 pts
3. Fair Value Gap: 15 pts
4. Displacement / Momentum: 10 pts
5. Session Alignment: 10 pts
6. HTF Bias: 10 pts
7. Premium / Discount: 10 pts
8. Order Flow / CVD / SMT: 5 pts
9. Volume Ratio: 3 pts
10. News Clearance: 2 pts
**Total = 100 points** (Threshold: Score $\ge 60$ for valid entry, $\ge 80$ for High Conviction).

### Decision
Add a third primary trading mode option to the Pine Script indicator:
`mode = input.string("MQL5 Engine Parity (v0.50)", options=["MQL5 Engine Parity (v0.50)", "Momentum Scalper", "ICT Sniper"])`
When set to `MQL5 Engine Parity (v0.50)`:
- The scoring weights match `EntryQualityEngine.mqh` point-for-point.
- The minimum qualification threshold is 60 points (matching `NO_TRADE` block in EA).
- The regime filter matches `MarketRegimeGate.mqh`.
- This ensures that when a trader sees a score of 82 on TradingView, the MT5 EA sees a matching score of 82 and executes the trade without deviation.

---

## 4. On-Chart HUD Ergonomics & Memory Garbage Collection

### Problem Analysis
- The full HUD table occupies 34 vertical rows and 4 columns. On laptops (1080p or 1366x768 screens), this can cover up to 40% of the active price chart.
- Pine Script imposes strict ceilings: `max_lines_count=200`, `max_labels_count=200`, `max_boxes_count=100`.
- The Volume Profile module (`calcVolumeProfile`) iterates over a 15-bin array with nested loops on every single bar calculation.

### Decision
1. **Dynamic HUD Modes**:
   - `Compact (8 Rows)`: Shows only the essential decision dashboard: Setup Direction, Confluence Score & Grade, Market Regime, Active Session, Multi-Timeframe Alignment, Win Rate, Net R-Multiple, and Trade Status.
   - `Full (34 Rows)`: Full diagnostic intelligence suite (default for large monitors).
   - `Hidden`: Cleans chart entirely for pure price action analysis, keeping alerts active.
2. **Strict Object Lifecycle**:
   - Limit drawing objects to the active trade. When a trade closes or target is hit, purge stale lines (`line.delete()`) and retain only the final result summary label.
3. **Optimized Loop Execution**:
   - Ensure the Volume Profile calculation is only invoked when `show_vprof == true`, preventing unnecessary loop cycles when the overlay is disabled.
