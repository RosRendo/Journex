# Macro Desk Real API Architecture & Dynamic Indicator Pipeline

## Overview
All hardcoded switches, static probabilities, and mock scoring components on the Macro Desk (`/macro/[pair]`) have been migrated to **live API data** and **real-time MT5 indicator calculations**.

## Architecture & Data Flow
1. **Live Technical Intelligence (`GET /api/terminal/technicals`)**:
   - Pulled live from MT5 terminal candles (`mt5.copy_rates_from_pos`).
   - Generates real RSI, EMA20, EMA50, MACD, Trend (`Up`/`Down`/`Sideways`), and Directional Signal Strength (%).
   - Replaces the former hardcoded `derivedMetrics` switch with live asset telemetry.
2. **Live Key Levels (`GET /api/terminal/levels`)**:
   - Calculates mathematical floor pivots from preceding MT5 daily candle (D1 High, Low, Close).
   - Generates exact Pivot, R1, R2, R3, S1, S2, S3, and current tick price.
3. **Dynamic Synthesis Scenario Engine**:
   - Uses real `levels.r1`/`r2` for bullish expansion targets, `levels.s1`/`s2` for pullback targets, and `levels.pivot` for structural invalidation.
   - Calculates dynamic probability based on real MT5 technical signal strength.
4. **Deterministic Intelligence Score**:
   - Evaluates real factors dynamically:
     - Technical Structure (MT5 EMA/Trend)
     - Momentum (MT5 RSI/MACD)
     - Currency Strength Basket (Real multi-currency delta)
     - Central Bank Rate Stance (Federal Reserve, ECB, BoE, BoJ)
     - Economic Event Risk (High impact event counter)
     - News Sentiment Flow (Live RSS feed parsing)
     - Retail Positioning Contrast (MyFXBook / broker order book)
5. **Confluence Event Log & Timeline**:
   - Synchronizes chronological ICT confluence events (sweeps, displacements, FVG retests, SMT divergence) tagged with exact UTC timestamps and session killzones.
