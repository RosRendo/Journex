# Dashboard Architecture: Layered Trading Command Center (Market Cockpit)

**Date**: 2026-09-05  
**Topic**: AdaptiveICT Dashboard Redesign — From 20 Standalone Cards to a Coordinated Layered Workspace  
**Status**: Architecture Approved / Implementation Blueprint

---

## 1. Core Vision: The 5-Layer Cockpit Hierarchy

Instead of competing for dashboard vertical space with 20 standalone cards (`Calendar → PnL → Risk → Bias → Session → Overview → ...`), the dashboard organizes the entire trading ecosystem into **5 Coordinated Functional Layers** and **3 Interaction Depths**.

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ LEVEL 1: GLOBAL TELEMETRY BAR                                                          │
│ UTC 09:48:22  ●  MT5 EXNESS CONNECTED  ●  NY AM KILLZONE (28m left)  ●  DAILY RISK OK   │
├────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                        │
│ ┌──────────────────────┐ ┌───────────────────────────────────────────────────────────┐ │
│ │ 1. MARKET RAIL       │ │ MAIN PRO CHART                                            │ │
│ │ EURUSD 1.1610  +0.3% │ │ Interactive Lightweight-Chart / TradingView               │ │
│ │ GBPUSD 1.3512  +0.1% │ │ Live ICT Overlay (FVG, Order Blocks, Liquidity Pools)    │ │
│ │ XAUUSD 4424.5  +0.8% │ │                                                           │ │
│ │ USDJPY 156.18  -0.2% │ │                                                           │ │
│ │ BTCUSD 79560   +2.1% │ │                                                           │ │
│ └──────────────────────┘ └───────────────────────────────────────────────────────────┘ │
│                                                                                        │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ 2. CONTEXT DECK (Coordinated Information Rail)                                         │
│ ◀ [DAILY BIAS]  [SESSION MATRIX]  [ECONOMIC CALENDAR]  [NEWS & MACRO]  [RISK GUARD] ▶  │
│ ┌────────────────────────────────────────────────────────────────────────────────────┐ │
│ │ [ Active Deck View with Instant Glance Metrics + "Peek" Detail Trigger ]           │ │
│ └────────────────────────────────────────────────────────────────────────────────────┘ │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ 3. OPPORTUNITY RADAR (Live Algorithmic ICT Edge Scanner)                               │
│ EURUSD: A+ [MSS + FVG Retest]  ┃  XAUUSD: A [Asian SSL Swept]  ┃  GBPUSD: Watch [M15 OB]│
├────────────────────────────────────────────────────────────────────────────────────────┤
│ 4. ACCOUNT HUD & EXECUTION ACTIVITY                                                    │
│ Equity: $35.18  ┃  Day P&L: +$4.20 (+1.2%)  ┃  Risk: 0.8%  ┃  Recent: EURUSD +1.8R     │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. The 3 Interaction Depths (Progressive Disclosure)

- **Level 1: Overview (Cockpit Glance)**: Dense, scannable, color-coded telemetry. No long text walls.
- **Level 2: Peek (Slide-Over Action Drawer)**: Clicking any element opens a slide-over panel on the right side without disturbing the chart or market focus.
- **Level 3: Route (Full Specialist Tool)**: Deep link to specialist routes (`/terminal`, `/calendar`, `/risk`, `/macro/XAUUSD`, `/journal`).

### Peek Drawer Workflows:
1. **Opportunity Peek**: Detailed FVG range, ATR, SMT divergence chart, and a **1-Click Staging Ticket** calculated for 1% risk on current MT5 equity.
2. **Calendar Event Peek**: Consensus vs forecast, historical volatility impact on Gold/EUR, risk embargo timer.
3. **Daily Risk Peek**: Drawdown thermometer, remaining trade allotment, 1-click circuit breaker cooldown.
4. **Recent Trade Activity Peek**: Post-trade 2-click tagger (emotion + discipline adherence).

---

## 3. High-Value Cockpit Extensions

1. **Temporal Anchoring & Macro Embargo**:
   - Institutional clock synchronized with London (07:00-10:00 UTC), NY AM (12:00-15:00 UTC), and Asia ranges.
   - Dynamic warning when high-impact red news is within 30 minutes.
2. **Multi-Timeframe Fractal Matrix**:
   - D1 Bias + H4 Order Flow + H1 Liquidity + M15 Execution setup alignment.
3. **Workspace View Presets (Focus Modes)**:
   - **Market Radar Mode**: Watchlist + Opportunities expanded.
   - **Sniper Chart Mode**: Main chart occupies 80% width with floating compact HUDs.
   - **Review & Risk Mode**: Context Deck and Journal metrics highlighted.
4. **Keyboard Hotkey Control**:
   - `1-5`: Switch active symbol instantly.
   - `Q / E`: Cycle Context Deck tabs.
   - `Space`: Toggle active Peek Drawer.
   - `Esc`: Dismiss Peek Drawer.
5. **Real Live Data Ground Truth**:
   - Live MT5 broker feed (`127.0.0.1:5003`), Exness account balance ($35.18), real ICT confluence engine, and user's CSV trade records. 0% mock/placeholder data.
