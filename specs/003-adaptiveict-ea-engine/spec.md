# Feature Specification: AdaptiveICT EA - Adaptive Trading Engine

**Feature Branch**: `003-adaptiveict-ea-engine`

**Created**: 2026-09-23

**Status**: Draft

---

## Overview

AdaptiveICT EA is an MT5 Expert Advisor currently operating as a static signal generator that is **not yet profitable** on out-of-sample data. This specification defines the transformation into a **measurable, adaptive, capital-protecting, and self-learning trading system** for XAUUSD and major FX pairs.

Core principle: losses are addressed by understanding why, protecting capital, collecting data, and validating improvements. Never by increasing lot size or using martingale.

---

## User Scenarios & Testing

### User Story 1 - Market Regime-Aware Setup Detection (Priority: P1)

As a discretionary-assisted trader, I need the EA to classify the market regime before scanning for entries so that trend setups are only taken in trending markets and scalping setups are gated behind acceptable execution conditions.

**Why this priority**: The EA currently generates signals regardless of market regime, which is the primary driver of out-of-sample losses.

**Independent Test**: Run Research Mode on 12 months of XAUUSD data. Every detected setup must include a logged MarketRegime. Setups in RANGING regimes must not produce live entries for trend strategies.

**Acceptance Scenarios**:

1. Given ADX < 20 and price ranging within 150 pips for 8+ hours, When a bullish BOS fires, Then EA logs MarketRegime = RANGING, applies regime penalty, and blocks the trade if score < threshold.
2. Given 4H BOS bullish and 1H swing highs breaking, When EA scans, Then MarketRegime = TRENDING_BULLISH and trend setups are eligible.
3. Given ATR has spiked > 2.5x its 20-period average, When a scalping setup appears, Then EA logs MarketRegime = HIGH_VOLATILITY and blocks the scalping entry.

---

### User Story 2 - Entry Quality Scoring with Explainability (Priority: P1)

As the system operator, I need every potential entry to receive a 0-100 score with per-component breakdown logged so I can audit why a trade was or was not taken.

**Why this priority**: Without a traceable score, diagnosis and improvement are impossible.

**Independent Test**: Run 30 days in ResearchModeOnly. Every setup log must show each component's label, maximum, and awarded points summing to total.

**Acceptance Scenarios**:

1. Given HTF structure + liquidity + MSS + FVG + London session, When score computed, Then log shows breakdown (e.g. HTF Structure: 15/15, Liquidity: 14/15) totalling 87/100.
2. Given setup scoring below minimum (default 60), When evaluated, Then no trade opens and log records SKIPPED: score 58 < threshold 60.
3. Given 100 historical trades grouped into score bands, When statistics computed, Then output shows win rate, expectancy, and profit factor per band.

---

### User Story 3 - Structural Stop-Loss with Calculated Position Sizing (Priority: P1)

As the system operator, I need SL levels derived from market structure invalidation and lot size calculated from risk budget divided by stop distance, so trades with wider structures never silently assume oversized risk.

**Why this priority**: Fixed-pip stops are the second most likely failure mode in the current EA.

**Independent Test**: Place 10 simulated entries with varying ATR. Verify each SL is beyond structural invalidation and lot size = (balance * risk%) / (stop distance per lot).

**Acceptance Scenarios**:

1. Given liquidity sweep entry at price X, When EA computes SL, Then SL is placed at least 1 ATR-unit beyond X with configurable buffer, not at a fixed pip distance.
2. Given $1,000 balance and NORMAL_RISK (0.5%), When stop distance is 25 pips, Then lot size respects the $5 risk budget.
3. Given two setups with 10-pip and 40-pip stops at NORMAL_RISK, When entries computed, Then 10-pip trade has 4x lot size of 40-pip trade.

---

### User Story 4 - Trade Health Monitoring and Thesis-Based Exit (Priority: P2)

As the system operator, I need the EA to continuously evaluate whether the trade thesis remains valid after entry and close trades when objectively invalidated.

**Why this priority**: Current EA holds all trades to SL or TP regardless of in-trade thesis state.

**Independent Test**: Open a long. Cause bearish MSS on entry timeframe while price is below entry. Observe Health Score drop and EA close trade before hard SL.

**Acceptance Scenarios**:

1. Given open long, When bearish BOS forms on entry timeframe, Then Trade Health Score decreases and state logs as WEAKENING.
2. Given score drops below THESIS_INVALIDATED threshold (default 25), When evaluated, Then trade is closed at market with exit reason THESIS_INVALIDATED.
3. Given health stays 25-50 for > configured bars, Then system enters RISK_PROTECTION state and blocks new exposure on same pair.

---

### User Story 5 - Research Mode and Missed Opportunity Logging (Priority: P2)

As the system developer, I need a non-trading mode where the EA logs all detected setups with simulated outcomes to diagnose systemic biases before deploying more live capital.

**Why this priority**: Before more live capital is deployed, systematic diagnosis of failure modes must be possible through research data.

**Independent Test**: Enable ResearchModeOnly. Run 3-month backtest. Confirm log shows every detected setup with simulated entry/SL/TP and whether it would have hit TP1, TP2, or SL.

**Acceptance Scenarios**:

1. Given Research Mode active, When qualifying setup detected, Then EA logs full score breakdown and levels without opening a trade.
2. Given 200 research setups logged, When StatisticsEngine processes, Then outputs per-setup-type win rate, average R, and score-outcome correlation.
3. Given Research Mode disabled, When EA restarted, Then live trading resumes with normal risk rules.

---

### User Story 6 - Statistical Validation of the Scoring Model (Priority: P3)

As the system operator, I need the Learning Engine to produce score-band performance tables so I can validate whether entry score predicts trade outcomes before trusting it with higher risk tiers.

**Why this priority**: The scoring model must be empirically validated before being trusted with higher risk allocations.

**Independent Test**: After 50+ logged trades, run StatisticsEngine. Verify output with per-band (50-59, 60-69, 70-79, 80-89, 90-100) metrics: win rate, expectancy, profit factor, avg MAE, avg MFE.

**Acceptance Scenarios**:

1. Given 50+ completed trades, When statistics requested, Then all five score bands appear in output (N/A for empty bands).
2. Given 90-100 band underperforms 70-79 band, Then system flags scoring model as UNVALIDATED and does not auto-elevate risk for high scores.
3. Given Liquidity Sweep + MSS + FVG appearing in 30+ trades, When statistics computed, Then combination metrics are reported separately.

---

### Edge Cases

- What happens when the MT5 terminal has no price data (symbol not initialized or market closed)?
- How does the system handle a position manually closed in MT5 while EA is managing it?
- What if calculated lot size rounds below broker minimum (0.01)?
- How does EA behave if spread exceeds configured maximum during an entry signal?
- What if ATR is zero (weekend or data gap)?
- What happens when daily drawdown limit is hit: close all positions or block new entries only?

---

## Requirements

### Functional Requirements

#### Module Architecture
- **FR-001**: EA MUST be organized into independent modules: EAController, MarketData, MarketRegime, ScannerEngine (sub-modules: ICT, Liquidity, MarketStructure, FVG, OrderBlock, SMT, Indicators), ConfluenceEngine, EntryQualityEngine, RiskEngine, StopLossEngine, TakeProfitEngine, TradeHealthEngine, RecoveryEngine, PositionManager, TradeExecutor, LearningEngine, TradeLogger, StatisticsEngine, BridgeClient.
- **FR-002**: OnTick() MUST act only as orchestrator delegating all decisions to named module functions. No trading decisions inline in OnTick().

#### Market Regime Detection
- **FR-003**: System MUST classify market into: TRENDING_BULLISH, TRENDING_BEARISH, RANGING, HIGH_VOLATILITY, LOW_VOLATILITY, TRANSITION, UNKNOWN.
- **FR-004**: Regime classification MUST use: multi-timeframe market structure, ATR vs 20-period average, ADX, session context, spread vs average.
- **FR-005**: Regime MUST be re-evaluated at configurable interval (default: each new bar of primary timeframe).
- **FR-006**: Setup evaluation MUST reference active regime; strategies define which regimes permit entry.

#### Setup Detection Pipeline
- **FR-007**: Every setup MUST follow: HTF Context -> Directional Bias -> Liquidity Event -> Market Structure Shift -> Entry Zone -> Confirmation -> Execution Quality.
- **FR-008**: Each ScannerEngine module MUST output structured evidence objects consumed by ConfluenceEngine, not raw buy/sell signals.
- **FR-009**: Evidence modules MUST include: liquidity sweep, BOS/MSS, FVG, Order Block, premium/discount zone, SMT, volume, RSI, ADX, ATR, session filter, news filter, spread checker, volatility classifier.

#### Entry Quality Score
- **FR-010**: Every entry MUST receive 0-100 score with configurable component weights (defaults: Market Regime 15, HTF Structure 15, Liquidity 15, Entry Location 15, MSS/BOS 10, FVG/OB 10, SMT 5, Volatility 5, Session 5, Execution Quality 5).
- **FR-011**: Full score breakdown MUST be written to trade log for every evaluated setup.
- **FR-012**: Component weights MUST be configurable via EA input parameters without recompilation.

#### Risk Engine
- **FR-013**: Risk tiers: score < 60 = NO TRADE; 60-69 = LOW RISK; 70-79 = NORMAL RISK; 80-89 = HIGH-QUALITY RISK; 90-100 = MAXIMUM PREDEFINED RISK.
- **FR-014**: Each tier MUST map to configurable risk % (defaults: LOW=0.25%, NORMAL=0.5%, HIGH=0.75%, MAX=1.0%).
- **FR-015**: Hard maximum risk ceiling MUST be enforced at all times regardless of score.
- **FR-016**: Risk MUST additionally consider: daily drawdown consumed, consecutive loss count, existing exposure, symbol correlation, spread, ATR, market regime.
- **FR-017**: System MUST NEVER increase lot size because a prior trade was a loss. Martingale is strictly prohibited.

#### Adaptive Stop-Loss Engine
- **FR-018**: SL MUST be derived from structural invalidation: liquidity sweep -> beyond sweep origin with ATR buffer; structure -> beyond structural pivot; FVG -> boundary invalidating the imbalance.
- **FR-019**: Position size MUST equal: AccountRisk / StopDistanceInAccountCurrencyPerLot.
- **FR-020**: EA MUST never tighten SL to achieve a larger lot size.
- **FR-021**: MAE MUST be recorded for every completed trade.

#### Adaptive Take-Profit Engine
- **FR-022**: Each trade MUST generate up to TP1, TP2, TP3 derived from: liquidity pools, session highs/lows, FVG boundaries, structural targets, support/resistance, HTF levels.
- **FR-023**: Each TP MUST log: price, R-multiple, structural strength, estimated probability (High/Medium/Low).
- **FR-024**: EA MUST NOT force a TP that lacks structural justification to achieve a desired R:R ratio.

#### Trade Health Engine
- **FR-025**: System MUST maintain a Trade Health Score 0-100 re-evaluated each new bar after entry.
- **FR-026**: Score MUST evaluate: structure continuation, liquidity, momentum, price location, volatility, SMT, volume, session alignment, current MFE, current MAE.
- **FR-027**: Health states: 75-100 = HEALTHY; 50-74 = WEAKENING; 25-49 = DANGER; 0-24 = THESIS_INVALIDATED.
- **FR-028**: When THESIS_INVALIDATED, EA MUST close trade at market on next tick.

#### Recovery State Machine
- **FR-029**: States: NORMAL -> THESIS_WEAKENING -> RISK_PROTECTION -> RECOVERY_OBSERVATION -> CONFIRMED_REVALIDATION or THESIS_INVALIDATED.
- **FR-030**: In RISK_PROTECTION: block new entries on affected pair; MAY reduce exposure via configurable partial-close rules.
- **FR-031**: Full risk re-entry only permitted after CONFIRMED_REVALIDATION with objective evidence.
- **FR-032**: System MUST NEVER open a larger position because an existing one is losing. No averaging-down. No martingale. No revenge trading.

#### Trade Management
- **FR-033**: EA MUST support: initial hold -> breakeven trigger -> partial TP at TP1 -> structural trailing -> runner to TP2/TP3.
- **FR-034**: All management triggers MUST be configurable (R-multiple for BE, % to close at TP1, trail method).
- **FR-035**: MFE and MAE MUST be tracked tick-by-tick and recorded at close.

#### Learning Engine
- **FR-036**: System MUST log for every completed trade: timestamp, symbol, direction, session, market regime, entry, SL, TP1/TP2/TP3, entry score with component breakdown, spread, ATR, ADX, volume at entry, MAE, MFE, time in trade, exit reason, P&L, R-multiple, structure/liquidity/FVG/SMT state at entry.
- **FR-037**: StatisticsEngine MUST compute by grouping dimension (setup type, regime, session, symbol, direction, score band, SL model, TP model, confluence combination): trade count, win rate, avg win R, avg loss R, expectancy, profit factor, avg MAE, avg MFE.
- **FR-038**: Score band validation MUST group trades 50-59 / 60-69 / 70-79 / 80-89 / 90-100 and compare performance across bands.

#### Research Mode
- **FR-039**: ResearchModeOnly flag MUST detect and score setups without opening trades, logging simulated entry/SL/TP1/TP2/TP3 and simulated outcome tracking.
- **FR-040**: Research Mode logs MUST be distinguishable from live trade logs.

#### Scalping Filter
- **FR-041**: Before scalping entry, system MUST check: spread vs normal, slippage estimate, ATR vs session average, session timing, news embargo, liquidity depth.
- **FR-042**: System MUST classify: GOOD / NORMAL / BAD scalping environment and block entries in BAD conditions.

#### Dashboard
- **FR-043**: On-chart dashboard MUST display: symbol, timeframe, session, market regime, HTF bias, entry quality score with component summary, trade health score, liquidity/MSS/BOS/FVG/OB/SMT/volatility/news/spread states, entry/SL/TP1/TP2/TP3, risk tier, position size, MFE/MAE, trade state, thesis state, next action.

#### Versioning and Backtesting
- **FR-044**: Every backtest configuration MUST be stored with version identifier (AdaptiveICT v0.1, v0.2, etc.).
- **FR-045**: Backtesting MUST follow: development -> optimization -> out-of-sample -> walk-forward -> different regimes -> demo/forward. No change goes live without completing this sequence.
- **FR-046**: Simulations MUST include realistic Exness spread, commission, and slippage.

---

### Key Entities

- **SetupSignal**: Detected opportunity with symbol, direction, evidence components, score breakdown, entry zone, SL, TP1/TP2/TP3, regime, session.
- **EntryQualityScore**: Component scores, total, tier classification, score band.
- **TradeRecord**: Complete lifecycle record with all FR-036 fields.
- **MarketRegimeState**: Regime type, driving indicators, timestamp.
- **TradeHealthState**: Score, label, factor breakdown, recommended action.
- **RecoveryState**: Current state, reason for transition, revalidation conditions.
- **StatisticsReport**: Aggregated metrics by configurable dimension.
- **ResearchSetup**: Research Mode record with simulated levels and outcome.

---

## Success Criteria

- **SC-001**: Every detected setup produces a complete score breakdown log entry within 200ms of new bar open.
- **SC-002**: In Research Mode over any 3-month period, at least 80% of visually identifiable setups are detected and logged.
- **SC-003**: After 50+ completed trades, StatisticsEngine produces a complete 5-band performance table.
- **SC-004**: System never exceeds configured daily drawdown limit (default 3%) on any single live trading day.
- **SC-005**: When THESIS_INVALIDATED is reached, trade closes within 1 bar of the signal.
- **SC-006**: Position size on any trade is within +/- 0.01 lots of the mathematically correct size.
- **SC-007**: EA compiles and runs without error after every incremental implementation step.
- **SC-008**: All parameters configurable via MT5 input panel without source code modification.
- **SC-009**: Out-of-sample forward test demonstrates positive expectancy and profit factor > 1.0 over minimum 3-month evaluation before the system is considered validated.
- **SC-010**: Zero instances of lot size increasing following a losing trade in any log file.

---

## Assumptions

- EA runs on MT5 with multi-timeframe OHLCV data for XAUUSD and major FX pairs (EURUSD, GBPUSD, USDJPY).
- Broker is Exness. Spread, commission, and slippage from Exness are used as backtest baselines.
- BridgeClient connects to mt5_bridge.py for logging and dashboard telemetry but is not a hard dependency for trading logic.
- Mobile and web-based EA parameter configuration are out of scope for v1.
- The Learning Engine collects data for human review; it does not autonomously modify live parameters.
- MQL5 DLL threading constraints apply; all MT5 API calls are serialized on the EA thread.
- v0.1 begins with architecture scaffolding and Research Mode only. Live trading is not enabled until the scoring model is validated on out-of-sample data.
- Primary target is XAUUSD.a on Exness raw spread account. FX pairs are secondary.
- Lot-doubling, averaging-down, and martingale-style recovery are permanently out of scope.