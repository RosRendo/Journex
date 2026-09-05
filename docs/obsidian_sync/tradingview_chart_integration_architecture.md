# TradingView Chart Integration Architecture: Macro Desk & Trade Journal

**Date**: 2026-09-05  
**Topic**: Strategic Placement & Dual-Engine Implementation of TradingView Advanced Charts.

---

## 1. Overview & Strategy

Rather than overloading every screen with resource-heavy chart frames, TradingView's Advanced Charting Engine was integrated directly into two essential decision-making layers of the trading workflow:

1. **Layer 2 (Visual Entry & Market Context)**: **Macro Desk (`/macro/[pair]`)**
   - Provides an interactive higher-timeframe candlestick view (D1 / H4 / H1) alongside live MT5 floor pivots and real-time confluence timelines.
2. **Layer 3 (Post-Trade Analysis & Replay)**: **Trade Journal (`/journal`)**
   - Embedded interactive chart in the trade inspection drawer and a full-screen TradingView modal dialog for detailed trade audits.

---

## 2. Component Architecture

### `TradingViewWidget.tsx` ([frontend/components/ui/TradingViewWidget.tsx](file:///d:/FOR%20RENDO%20%28ONLY%20%29/Personal%20Project/Dashboard/frontend/components/ui/TradingViewWidget.tsx))
- **Script Embed**: Dynamically loads `https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js`.
- **Smart Symbol Mapping**:
  - `XAUUSD` / `GOLD` $\rightarrow$ `OANDA:XAUUSD`
  - `BTCUSD` $\rightarrow$ `BINANCE:BTCUSDT`
  - `US100` / `NAS100` $\rightarrow$ `CAPITALCOM:US100`
  - `US30` $\rightarrow$ `CAPITALCOM:US30`
  - `DXY` $\rightarrow$ `CAPITALCOM:DXY`
  - Forex pairs (`EURUSD`, `GBPUSD`, `USDJPY`) $\rightarrow$ `FX:[PAIR]`
- **Theme & Studies**: Dark theme (`#0d0d12`), Candlestick style, EMA & RSI studies pre-configured, clean unmount on route change.

---

## 3. Workflow Implementations

### A. Macro Desk Dual-Engine Charting (`/macro/[pair]`)
- **Toggle Switcher**:
  - `[ 📈 TradingView ]`: Full interactive candlestick chart with timeframe selector (`15m`, `1h`, `4h`, `1D`), volume histogram, and EMA/RSI studies.
  - `[ ⚡ MT5 Curve ]`: Fast, low-overhead SVG area chart powered by confirmed MT5 broker candle closes.
- **Synergy with ICT Floor Pivots**: Traders can observe candlestick wicks tapping the calculated MT5 Pivot, R1/R2, and S1/S2 levels in real time.

### B. Trade Journal Drawer & Fullscreen Review (`/journal`)
- **Tabbed Drawer**:
  - `[ 📈 Live TradingView ]`: Loads the selected trade's pair at `15m` execution resolution.
  - `[ 📷 Screenshots ]`: Displays attached screenshots and auto-captured clips.
- **Fullscreen Replay Modal**:
  - Triggered via `[ ⛶ Fullscreen ]`.
  - Expands to an 88vh modal backdrop with active crosshairs and multi-timeframe navigation for in-depth trade post-mortem.

---

## 4. Verification

- `npx tsc --noEmit` passed with 0 errors across the frontend.
- Both `http://localhost:3000/macro/XAUUSD` and `http://localhost:3000/journal` return **HTTP 200 OK**.
