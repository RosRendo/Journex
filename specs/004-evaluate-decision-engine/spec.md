# Feature Specification: AdaptiveICT Decision Engine Quality & Integrity Evaluation

**Feature Branch**: `004-evaluate-decision-engine`  
**Created**: 2026-09-28  
**Status**: Draft  
**Input**: User description: "Check the AdaptiveICT_DecisionEngine is it a good indicator"

---

## 1. Overview & Problem Definition

The `AdaptiveICT Decision Engine` is an institutional visual indicator and decision support cockpit designed to explain *why* setups occur through multi-factor confluence scoring (Momentum, Market Regime, ICT Market Structure, Liquidity Sweeps, Fair Value Gaps, Order Blocks, Multi-Timeframe Alignment, Order Flow, and News Filters).

To answer whether it is a **"good indicator"**, this specification defines a comprehensive, objective quality audit across four core pillars:
1. **Signal Fidelity & Anti-Repainting Rigor**: Ensuring historical chart signals accurately reflect live bar-by-bar behavior with zero lookahead bias or future-data leakage.
2. **Ecosystem Parity with MQL5 Automated Engine**: Ensuring visual scoring, regime definitions, and entry filters match the MQL5 `AdaptiveICT` Expert Advisor v0.50 so manual charting and automated execution do not produce contradictory decisions.
3. **Execution Ergonomics & Resource Efficiency**: Ensuring the 34-row on-chart heads-up display (HUD) and graphical objects provide immediate decision clarity without lagging charts or exceeding platform computation quotas.
4. **Empirical Edge & Predictive Value**: Validating that higher decision scores (Grade A / 80+) produce higher win rates and positive expectancy compared to lower scores (Grade C / 60), proving statistical utility over cosmetic appearance.

---

## 2. User Scenarios & Testing *(mandatory)*

### User Story 1 - Signal Fidelity & Anti-Repainting Verification (Priority: P1)

As a trader relying on chart signals for market bias and trade entry, I need complete assurance that all indicator signals, levels, and HUD statistics are strictly non-repainting and free of lookahead bias, so that what appears on historical charts is identical to what would have been generated in real time.

**Why this priority**: Repainting creates a false illusion of profitability and destroys live trading capital. If an indicator repaints or peeks at future data, it is fundamentally disqualified as a "good indicator".

**Independent Test**: Load the indicator in a forward bar-replay simulation and compare each emitted signal against a complete chart reload; confirm 100% signal persistence, location stability, and zero disappearing markers.

**Acceptance Scenarios**:
1. **Given** an entry signal generated on a confirmed bar close, **When** the chart is refreshed, reloaded, or timeframes are toggled, **Then** the signal marker, entry price, stop-loss level, and take-profit targets remain in the exact same positions on the exact same historical bars.
2. **Given** multi-timeframe analysis referencing higher timeframes (e.g., 4H, 1H, 15M from an M5 chart), **When** evaluating the active, uncompleted higher-timeframe bar, **Then** the indicator only references strictly closed, prior higher-timeframe periods to prevent future bar leakage.
3. **Given** higher timeframe moving averages or trend metrics, **When** sampled by the indicator, **Then** calculations reflect genuine higher timeframe data series rather than sub-timeframe approximations.

---

### User Story 2 - Ecosystem Parity with MQL5 Automated Engine (Priority: P2)

As a trader running both TradingView for visual chart analysis and MetaTrader 5 (`AdaptiveICT` EA) for automated execution, I need the indicator's market regime definitions, scoring weights, and trade filtering criteria to be consistent with the MQL5 engine, so that discretionary analysis on TradingView and automated execution on MT5 reinforce rather than contradict each other.

**Why this priority**: Disconnect between the visual indicator and the automated EA confuses the trader, undermines psychological discipline, and causes execution discrepancies (e.g. taking trades manually on TradingView that the automated EA rejected).

**Independent Test**: Audit the scoring breakdown, regime classification, and filter rules between the indicator script and the MQL5 EA codebase; verify 1-to-1 conceptual alignment.

**Acceptance Scenarios**:
1. **Given** an active market condition, **When** analyzed by both the indicator and the EA, **Then** both classify the market under the same regime taxonomy (Trending Bullish, Trending Bearish, Ranging, High Volatility, Transition).
2. **Given** an entry candidate, **When** evaluating confluence factors, **Then** the indicator's decision score breakdown directly maps to the 10-component scoring architecture of the EA (Structure, Liquidity, FVG, Displacement, Session, HTF Bias, Premium/Discount, Order Flow, Volume, News).
3. **Given** an adverse market regime (such as high-volatility news spikes or counter-trend conditions), **When** the regime gate blocks the trade in the EA, **Then** the indicator visually flags the setup as gated or blocked.

---

### User Story 3 - Chart Ergonomics & Platform Resource Safety (Priority: P3)

As an active intraday trader, I need the on-chart HUD and graphical zones (FVG boxes, Order Blocks, Liquidity Sweeps) to render efficiently without obscuring price action or crashing the charting platform due to resource exhaustion.

**Why this priority**: An indicator that causes browser lag, chart freezing, or excessive visual noise hinders fast decision-making during high-volatility killzones.

**Independent Test**: Run the indicator on high-activity sessions across volatile symbols (e.g., XAUUSD during London/NY overlap); monitor chart rendering speed, memory stability, and visual clarity across multiple monitor resolutions.

**Acceptance Scenarios**:
1. **Given** a chart with active price candles, **When** the HUD panel is displayed, **Then** the user can toggle between compact and full views, reposition the HUD, or hide non-critical rows so that candlesticks and key levels remain unobstructed.
2. **Given** multiple graphical objects (BOS lines, FVG boxes, sweep labels), **When** new bars form continuously, **Then** the indicator cleans up stale historical objects and operates well within platform limits (e.g., 200 lines, 200 labels, 100 boxes).
3. **Given** computational subroutines (such as volume profile binning or recursive multi-bar loops), **When** recalculating on new ticks, **Then** calculations execute within safe memory and timeout constraints without triggering platform execution errors.

---

### User Story 4 - Empirical Predictive Value & Score Calibration (Priority: P4)

As a quantitative trader, I need to know whether the indicator's decision score (0-100) actually correlates with market follow-through and positive expectancy, confirming whether the scoring model has genuine predictive power or is merely an arbitrary number generator.

**Why this priority**: A high score must mean higher probability and expectancy. If Grade C setups outperform Grade A setups, the scoring algorithm gives false confidence and fails as a decision tool.

**Independent Test**: Aggregate paper-trading performance statistics over 100+ indicator setups, grouped by score band (60-69, 70-79, 80-89, 90-100); verify that win rate and expectancy scale positively with score.

**Acceptance Scenarios**:
1. **Given** 100 or more completed trade setups tracked by the indicator's paper-trading module, **When** grouped by score tiers, **Then** high-score setups (80-100) demonstrate higher average win rate and expectancy than borderline setups (60-69).
2. **Given** session-based trade tracking, **When** reviewing historical outcomes, **Then** high-volume institutional sessions (London and New York) demonstrate measurably higher win rates and lower drawdowns than off-hours/Asian sessions.
3. **Given** trade outcomes across setup patterns (Reversal vs Continuation vs Breakout), **When** analyzed in the performance table, **Then** win rates by pattern provide clear actionable feedback on which setups hold an edge.

---

### Edge Cases

- **Intrabar Wicks & Dual-Hit Bars**: What happens when a single volatile candle hits both the Stop Loss and Take Profit levels within the same bar? (Indicator must conservatively assume Stop Loss hit first unless granular intrabar tick sequence proves otherwise).
- **Session Boundary & Weekend Gaps**: How does the indicator handle weekend price gaps or holiday session rollovers where higher-timeframe data may contain missing bars?
- **Extreme Volatility Spikes**: What occurs when ATR expands 500%+ during high-impact news releases (NFP, FOMC)? (News and volatility gates must trigger immediately to prevent erroneous breakout signals).
- **Zero / Low Volume Feeds**: How does the order flow and volume delta engine behave on symbols or brokers where volume data is zero or unreliably reported?

---

## 3. Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Indicator MUST evaluate signals strictly on confirmed bar closes (`barstate.isconfirmed`) to prevent intra-candle signal flickering and disappearing alerts.
- **FR-002**: Multi-timeframe data queries MUST use non-repainting historical shift semantics (referencing closed higher-timeframe bars) to guarantee historical bar parity with live execution.
- **FR-003**: Indicator MUST correctly calculate higher-timeframe indicators (such as HTF EMAs) directly on the higher-timeframe series rather than sampling lower-timeframe calculations across intervals.
- **FR-004**: Indicator MUST provide a standardized Market Regime taxonomy matching the automated trading system (`TRENDING_BULLISH`, `TRENDING_BEARISH`, `RANGING`, `HIGH_VOLATILITY`, `TRANSITION`).
- **FR-005**: Indicator MUST compute a 0-100 Confluence Decision Score with transparent component weights, displaying letter grades (`A+`, `A`, `B`, `C`, `F`) to explain why a setup qualifies.
- **FR-006**: Indicator MUST allow traders to toggle between execution styles (e.g. *Momentum Scalper* vs *ICT Sniper / Swing*), dynamically re-weighting confluence factors based on the active style.
- **FR-007**: Indicator MUST provide a configurable on-chart HUD panel displaying real-time market bias, active session, volume delta, CVD divergence, news gating state, and trade performance.
- **FR-008**: Indicator MUST include display options for the HUD panel (Compact mode, Full 34-row mode, and Hidden mode) and quadrant positioning (Top-Right, Top-Left, Bottom-Right, Bottom-Left) to prevent chart obstruction.
- **FR-009**: Indicator MUST provide structural trade visualization (Entry, Stop Loss, TP1, TP2, TP3) with automatic break-even progression and structural trailing stops.
- **FR-010**: Indicator MUST track internal performance statistics (total trades, win rate, net R-multiple, max drawdown, session breakdown, pattern breakdown) with an optional user reset input.
- **FR-011**: Indicator MUST enforce drawing object memory management, deleting expired lines, boxes, and labels to prevent exceeding platform drawing limits (200 lines, 200 labels, 100 boxes).
- **FR-012**: Indicator MUST provide standard alert conditions for high-quality setups (`Score >= 85`), momentum exhaustion, and structure invalidation warnings.

---

### Key Entities

- **DecisionScorecard**: Represents the quantitative evaluation of market conditions on a 0-100 scale, with component weights across Momentum, Regime, Volatility, Market Structure, Liquidity, FVG, Order Block, Premium/Discount, Multi-Timeframe, Order Flow, and Session.
- **MarketRegime**: Represents the active macroeconomic volatility and trend state governing which trading styles are permissible.
- **TradeLifecycleState**: Represents the simulated paper-trade tracking state of an active setup (Entry, Current SL, Dynamic TPs, Break-Even status, R-Multiple outcome).
- **PerformanceRegistry**: Represents cumulative historical telemetry tracked by the indicator (Win Rate, Total R Gained, Peak R, Maximum Drawdown, Session Distribution, Pattern Distribution).

---

## 4. Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: **Zero Repainting Verification**: 100% of signals emitted in live forward bar-replay remain identical in timing, price, and magnitude after full chart reload.
- **SC-002**: **System Parity Rate**: >= 90% alignment in market regime identification and directional bias between the indicator and the MQL5 `AdaptiveICT` EA engine across 50 simultaneous market snapshots.
- **SC-003**: **Platform Performance Compliance**: Indicator renders in under 500ms on initial chart load and executes tick calculations without memory leaks, drawing limit crashes, or loop timeouts.
- **SC-004**: **Statistical Score Validity**: Across 100+ recorded trade setups, setups graded `A` or `A+` (Score >= 80) achieve at least 15% higher win rate and greater net R-multiple expectancy than setups graded `C` (Score 60-69).
- **SC-005**: **Ergonomic Clarity**: Traders can determine overall market bias, confluence score, and regime state within 3 seconds of glancing at the chart without moving price candles.

---

## 5. Assumptions

- **Target Charting Platform**: The primary indicator implementation is built in TradingView Pine Script v5, operating on standard currency and commodity instruments (specifically XAUUSD and major FX pairs).
- **Timeframe Focus**: The indicator is primarily utilized on M5 and M15 timeframes for intraday analysis, with H1 and H4 serving as contextual higher timeframes.
- **Volume Data Availability**: For Forex and Spot Gold, tick volume or broker-provided volume is used for Volume Delta and CVD approximations; on symbols lacking volume feeds, volume-dependent score components default to neutral weighting.
- **Execution Role**: The indicator serves as a visual decision-support cockpit and manual confirmation tool; automated order execution is handled independently by the MT5 MQL5 EA.
