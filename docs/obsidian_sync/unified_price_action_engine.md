# Unified Price Action Engine (UPAE) Architecture

## 1. System Overview
Built to unify the most potent institutional and prop-firm price action methodologies into a single, cohesive, non-repainting execution engine.
Script location: `mql5/AdaptiveICT/Indicators/UnifiedPriceAction_Engine.pine`

## 2. Integrated Strategies & Frameworks
1. **Quarterly Theory (QT) & AMD Cycles (Module 1)**:
   - Tracks 6-Hour daily cycles (Q1 Accumulation, Q2 Manipulation, Q3 Distribution, Q4 Rebalance) and 90-minute sub-cycles.
   - Gating mechanism: Confirms higher-probability entries during Q2 sweeps and Q3 expansion moves.
2. **Candle Range Theory (CRT) Engine (Module 2)**:
   - Uses Daily/4H reference candle high and low boundaries.
   - Sweep of a boundary followed by a close back inside the range triggers a reversal targeting the **50% equilibrium midpoint** and opposite boundary.
3. **Turtle Soup Engine (Module 3)**:
   - Identifies 20-bar swing high/low penetrations with exhaustion wicks ($\ge 30\%$ wick-to-range ratio).
   - Generates high-conviction failed-breakout entries on immediate candle reclaims.
4. **Malaysian Support & Resistance (MSNR) Engine (Module 4)**:
   - Identifies structural support and resistance levels defined by clean engulfing candles.
   - Detects fresh tests and break-and-retest reactions.
5. **Confluence & Strategy Arbitration (Module 5)**:
   - Synthesizes multiple models into a unified 0–100 score:
     - Example: Q2 Manipulation + CRT Low Sweep + Turtle Soup = **A+ Institutional Reversal (95+ score)**.
   - Gated behind a minimum score threshold (default: 75) and 200 EMA macro trend alignment.

## 3. Trade Lifecycle, 3-Tier Targets & Dynamic Lines
- **TP1 (1:1.2R)**: Safety scalp (40% exit + move SL to Break-Even).
- **TP2 (1:2.5R)**: Structural liquidity / CRT opposite boundary.
- **TP3 (1:4.0R)**: Macro expansion runner with adaptive trailing stop.
- **Persistent Live Lines**: On-chart lines for `ENTRY`, `⛔ SL`, `🎯 TP1`, `🎯 TP2`, and `🎯 TP3` project forward 16 bars on `barstate.islast`, ensuring exact target levels are always visible.
