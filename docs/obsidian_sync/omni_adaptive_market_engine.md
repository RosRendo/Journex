# OmniAdaptive Market Engine (OAME) Architecture

## 1. System Overview
Built in response to the requirement for a complete, multi-strategy market operating system rather than an overloaded single-strategy indicator.
The system is implemented in `mql5/AdaptiveICT/Indicators/OmniAdaptive_MarketEngine.pine`.

## 2. Multi-Engine Modular Architecture
1. **Engine 12 — Volatility Regime & Transition Gatekeeper**:
   - Classifies the market into 4 distinct states:
     - `TRENDING_BULLISH` / `TRENDING_BEARISH`
     - `RANGING_SIDEWAYS`
     - `VOLATILITY_EXPANSION`
     - `CONSOLIDATION_LOW_VOL`
   - Uses ADX, Kaufman Efficiency Ratio (ER), Normalized EMA Slopes, and ATR historical percentile.
2. **Strategy Router (The Dispatcher)**:
   - Routes executions strictly according to the detected regime:
     - In Trending -> Engine 9 (Trend Pullback).
     - In Ranging -> Engine 11 (Mean Reversion).
     - In Expansion -> Engine 10 (Breakout & Retest).
     - In Exhaustion -> Engine 8 (Reversal).
     - In Low Volatility -> Standby / Gated.
3. **Engine 8 — Reversal & Exhaustion Detector**:
   - Separates Phase 1 Early Warning (`POTENTIAL_TOP`, `POTENTIAL_BOTTOM`) from Phase 2 Confirmed Entry (`REVERSAL_CONFIRMED`).
   - Uses Swing liquidity sweeps, rejection wicks (>= 35% of candle range), and RSI divergence.
4. **Engine 9 — Trend Continuation & Pullbacks**:
   - Enters established trends without waiting for liquidity sweeps.
   - Retracements into the value zone (between 20 EMA and 50 EMA) confirmed by renewed momentum.
5. **Engine 10 — Breakout, Retest & Trap Engine**:
   - Identifies Bollinger / Keltner Squeeze releases.
   - Detects clean breakouts, retest holds, and failed breakout traps (liquidity grabs that reverse back into range).
6. **Engine 11 — Adaptive Range & Mean Reversion (Sideways Specialist)**:
   - Active only when ADX and Efficiency Ratio indicate range conditions.
   - Trades rejections at Donchian channel extremes back towards equilibrium and the opposite boundary.
7. **Signal Arbitration & Multi-Timeframe Disagreement Detector**:
   - Suppresses counter-trend signals when trends are strong.
   - Labels HTF vs LTF divergence (e.g. 5M pullback within 4H bull trend) to adjust targets appropriately.

## 3. 5-Phase Trade Lifecycle & Targets
- Standardized 3-tier profit taking:
  - **TP1 (1:1.2R)**: Safety exit (40% off, moves SL to Break-Even).
  - **TP2 (1:2.5R)**: Core structural liquidity target (40% off).
  - **TP3 (1:4.0R)**: Macro expansion runner (20% held).
- **Phase 4 Adaptive Trailing**:
  - Automatically activates on TP1 hit, trailing the remaining position behind an adaptive ATR ratchet (`2.0 * ATR`).
- **Persistent Live Projected Target Lines**:
  - Always visible on `barstate.islast`, projecting forward 16 bars with right-axis labels for ENTRY, SL, TP1, TP2, and TP3.
