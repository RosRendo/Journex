# Live MT5 Telemetry & Dynamic Confluence Architecture

**Date**: 2026-09-05  
**Topic**: Transitioning Terminal, Macro Desk, and Psychology modules from static mocks to 100% Real MT5 & Statistical APIs.

---

## 1. Executive Summary

All static placeholders, hardcoded switch cases, and mock datasets across the Macro Desk (`/macro/[pair]`), Mood & Psychology Tracker (`/sentiment`), Performance Hub (`/performance`), and Confluence Engine have been systematically converted to **real-time MT5 broker feeds and indicator-derived models**.

---

## 2. Core Architectural Pipelines

### A. Direct MT5 Telemetry (`mt5_bridge.py` on port 5003)
- **Live Floor Pivots (`GET /api/levels?symbol=[pair]`)**:
  Calculated directly from confirmed daily broker bar closes (`mt5.copy_rates_from_pos(sym, mt5.TIMEFRAME_D1, 0, 1)`):
  $$\text{Pivot} = \frac{\text{High} + \text{Low} + \text{Close}}{3}$$
  $$\text{R1} = 2 \times \text{Pivot} - \text{Low}, \quad \text{S1} = 2 \times \text{Pivot} - \text{High}$$
  $$\text{R2} = \text{Pivot} + (\text{High} - \text{Low}), \quad \text{S2} = \text{Pivot} - (\text{High} - \text{Low})$$
- **Live Technical Indicators (`GET /api/technicals?symbol=[pair]`)**:
  Computes real H4 EMA20, EMA50, 14-period RSI, MACD signal line, trend categorization (`Up`, `Down`, `Sideways`), and signal strength percentages directly from broker candles.
- **Currency Strength & Macro Sentiment (`GET /api/macro-sentiment`)**:
  Live multi-currency basket calculation (NZD, AUD, GBP, EUR, USD, JPY, CAD, CHF) and fear/greed daily index.
- **Pair Confluence Event Log (`GET /api/confluence-log?symbol=[pair]`)**:
  Real-time event stream tracking:
  - Exact event timestamps in UTC
  - Relative time elapsed ("18m ago", "1h 5m ago", "6h 35m ago")
  - Session Killzones (New York AM, London Open, Overlap, Asian Range)
  - Factor categories (FVG Imbalance, MSS Displacement, SMT Divergence, Liquidity Raids)
  - Live price levels derived directly from current MT5 market bids/asks.

---

### B. Gateway Proxy & Security Layer (`backend/src/server.ts`)
- Public market data endpoints (`/api/terminal/*`, `/api/calendar/*`, `/api/bridge/*`) are exempted from strict user-token auth guards, ensuring zero 401 unauthenticated drops when navigating between Macro Desk pairs or refreshing market charts.
- Secure fallback pipeline: If MT5 ticks pause during weekends or broker maintenance, endpoints return the latest confirmed bar close rather than throwing `500` or returning `NaN`.

---

### C. Frontend Decision Center Modules
1. **Header KPI Cards**:
   - `Bias`: Driven by real MT5 signal + trend alignment.
   - `Structure`: Live `HH → HL` (bullish) or `LH → LL` (bearish).
   - `Technical`: MT5 H4 consensus (`BUY` / `SELL` / `NEUTRAL`).
   - `Macro`: Live base vs. quote currency strength delta from the 8-currency basket.
   - `Volatility`: Live ATR / pulse detection.
   - `Confidence`: MT5 algorithm strength index.
2. **Synthesis Scenario Engine (`ScenariosCard`)**:
   - Replaced static `+12 unit` / `+45 unit` strings with real MT5 floor pivot levels (`levels.r1`, `levels.r2`, `levels.s1`, `levels.s2`, `levels.pivot`).
   - Dynamically selects Primary vs. Alternative scenario models based on current price position relative to Daily Pivot.
3. **Macro Score Breakdown (`MacroScoreBreakdownWidget`)**:
   - Dynamically calculates asset score (0-100) from:
     1. Technical Structure (EMA20/50 cross + MACD) -> max 25
     2. Momentum Indicators (RSI distance from 50) -> max 20
     3. Currency Strength Basket -> max 15
     4. Central Bank Rate Stance -> max 15
     5. Economic Event Risk -> max 10
     6. News Sentiment Flow -> max 10
     7. Retail Positioning Contrast -> max 5
4. **Mood & Psychology Tracker (`/sentiment`)**:
   - Replaced mock array with `useCsvTrades()` integration.
   - Computes actual compliance streaks from trade history where `followedPlan !== false`.
   - Generates 30-day compliance heatmap from real trade timestamps.
   - Correlates actual P&L against emotion ratings.
5. **Performance Hub (`/performance`)**:
   - Replaced mock score with dynamically computed composite performance score derived from real win rate, profit factor, and plan discipline.

---

## 3. Verification & Health Matrix

| Service | Port | Endpoint Tested | Status |
| :--- | :--- | :--- | :--- |
| **MT5 Bridge** | 5003 | `GET /api/confluence-log?symbol=XAUUSD` | 200 OK (Live Price: ~4413.52, 4 events, 5 pairs) |
| **MT5 Bridge** | 5003 | `GET /api/levels?symbol=XAUUSD` | 200 OK (Pivot: 4457.85, R1: 4533.03, S1: 4404.70) |
| **MT5 Bridge** | 5003 | `GET /api/technicals?symbol=XAUUSD` | 200 OK (RSI: 63.7, Trend: Down, Strength: 85%) |
| **MT5 Bridge** | 5003 | `GET /api/macro-sentiment?symbol=XAUUSD` | 200 OK (8 currencies live, FearGreed: 74) |
| **Backend API** | 5000 | `GET /api/terminal/confluence-log` | 200 OK (Proxy forwarding verified) |
| **Next.js App** | 3000 | `GET /macro/XAUUSD` | 200 OK |
| **Next.js App** | 3000 | `GET /sentiment` | 200 OK |
| **Next.js App** | 3000 | `GET /performance` | 200 OK |
| **TypeScript** | - | `npx tsc --noEmit` (Frontend & Backend) | 0 Errors |
