# Macro Desk Dynamic Data Wiring & Jargon Cleanup

## Overview
Replaced all static/hardcoded dummy metrics and theoretical ICT/SMC jargon inside `http://localhost:3000/macro/[pair]` (`frontend/app/macro/[pair]/page.tsx` and components `MarketStateBar`, `ChartWorkspace`, `IntelligenceDock`) with live dynamic calculation and clean price-action terminology.

## Key Changes
1. **Dynamic Confluence Scoring Engine**:
   - Replaced static `93 (A+)` / `84` score with real multi-factor evaluation:
     - Multi-timeframe trend alignment (price vs pivot/EMA) (+15 pts)
     - Key support/resistance retest proximity (+15 pts)
     - Momentum direction & RSI health (+15 pts)
     - High liquidity session window (London/NY active) (+15 pts)
     - Currency flow spread alignment (+10 pts)
     - Volatility & expansion headroom (+10 pts)
     - Support/resistance held (+10 pts)
     - Favorable Risk:Reward ratio (> 1.5) (+10 pts)
   - Dynamic grading: `A+` (>= 85), `A` (>= 75), `B` (>= 60), `C` (< 60).

2. **Live MT5 Account Integration for Risk & Sizing**:
   - Connected `IntelligenceDock` Tab 6 to `/api/bridge/api/account`.
   - Dynamic 1.0% risk sizing calculated from actual account balance/equity.
   - Dynamic lot sizing for Gold (points) vs Forex (pips) based on stop loss distance.
   - Dynamic max loss limit based on 3% account rule.

3. **Live UTC Market Clock & Session Telemetry**:
   - Replaced static "London / NY Overlap" with real-time UTC session tracking.
   - Dynamic status for Sydney, Tokyo, London, and New York sessions.
   - Dynamic overlap detector.

4. **Purged ICT/SMC Jargon**:
   - Removed: `AdaptiveICT Displacement Model`, `Fair Value Gap (FVG)`, `MSS Displacement`, `SMT Divergence`, `Asian Swept`.
   - Replaced with: `Support & Resistance Projection Model`, `Key Support / Resistance Retest`, `Trend Structure Continuation`, `Relative Currency Strength Alignment`.

5. **Dead File Cleanup**:
   - Deleted orphaned `frontend/components/macro/PairConfluenceLog.tsx`.
