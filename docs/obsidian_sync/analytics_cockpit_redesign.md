# Analytics Studio Cockpit Redesign

## Overview
Transformed `http://localhost:3000/analytics` (`frontend/app/analytics/page.tsx`) from a text-heavy, vertically overwhelming page into a high-performance **80% Visual Trading Analytics Cockpit**.

## Visual & Functional Upgrades
1. **5 Cockpit Radial Dials (Visual Telemetry)**:
   - **Win Rate Dial**: Circular SVG gauge with total Win/Loss counter sublabel.
   - **Profit Factor Dial**: Circular SVG gauge normalized to 3.0.
   - **Sharpe Ratio Dial**: Volatility-adjusted return gauge.
   - **Expectancy Dial**: Mathematical payoff expectation per trade.
   - **Realized PnL Hero Card**: Bold PnL display with dynamic sparkline and Long/Short ratio progress bar.

2. **Interactive Workspace Lenses (No more endless vertical scrolling)**:
   - **Performance & Growth**: Hero interactive Equity Curve with dynamic Drawdown Curve toggle, Year-to-Date PnL Calendar Heatmap, and Monthly Performance Grid.
   - **Asset Edge & Symbols**: 100% Real Symbol Performance cards (trade count, win rate %, volume in lots), Long vs Short directional edge comparison, Pair Efficiency Matrix (Win Rate vs R:R scatter), and Daily PnL Distribution histogram.
   - **Session & Psychology**: Session Performance Grid (London, NY, Asian sessions), Trade Duration Scatter Plot, Habit & Rule Cost Analyzer, and Retail Sentiment Gauge.
   - **Unified Studio**: View all dimensions combined on demand.

3. **1-Click Time Filtering & Account Isolation**:
   - `1W`, `1M`, `3M`, `YTD`, `ALL` instant filters with smooth motion transitions.
   - Switch between all imported MT5 accounts or specific broker accounts.

4. **100% Real Trade Data**:
   - Uses genuine closed trades from SQLite / CSV without fake modulo logic.
