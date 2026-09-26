# Research: AdaptiveICT EA - Adaptive Trading Engine

**Phase 0 Output** | **Feature**: 003-adaptiveict-ea-engine | **Date**: 2026-09-23

---

## Research Summary

All technical unknowns resolved through direct inspection of the existing `mql5/AdaptiveICT/` codebase. No external research required. Every decision below is grounded in the current implementation.

---

## Decision 1: Regime Gate Wiring

**Question**: Does the existing MarketRegimeDetector actually block entries?

**Finding**: No. `MarketRegimeDetector::Detect()` is called in `DecisionEngine.Evaluate()` and writes `res.regime` and `res.regime_confidence`, but `is_approved` is calculated as:
```
is_approved = (score >= min_score) && risk_pass && (spread <= max) && session_pass
```
The regime field is logged but never gated. A RANGING market with ADX=12 will still approve a trend-following ICT setup if the score threshold is met.

**Decision**: Add `regime_pass` boolean to `DecisionResult`. The regime gate will be a configurable map: each strategy type declares acceptable regimes. ICTSniper accepts TRENDING_BULLISH and TRENDING_BEARISH only. ICTScalper additionally accepts TRANSITION.

**Rationale**: Minimal code change (one field, one gate condition), zero risk of breaking existing logic.

**Alternatives Considered**:
- Rewrite DecisionEngine from scratch: Rejected - existing sub-analyzers are good, only gate is missing.
- Use ADX threshold only: Rejected - too narrow, MarketRegimeDetector already does ADX+structure+volatility.

---

## Decision 2: Entry Quality Score Explainability

**Question**: Is the existing 0-100 score in ConfluenceEngine.mqh transparent enough to log per-component?

**Finding**: `ConfluenceEngine.CalculateConfluence()` adds to a local `double score` variable using 5 named categories (ICT Smart Money 60pts, Technical Indicators 20pts, Market Conditions 10pts, Execution Filters 10pts). The final result struct only carries `int score`, `string grade`, `bool is_valid`. No component breakdown is returned.

**Decision**: Introduce `EntryScoreBreakdown` struct in `Types.mqh` containing named fields for each component's awarded/max points. `ConfluenceEngine` returns this alongside the total. `TradeAnalyticsLogger` logs the full breakdown CSV column.

**Rationale**: The breakdown struct is a pure data addition. Existing callers that only read `result.score` are unaffected.

**Alternatives Considered**:
- Print breakdown inline via `Print()`: Rejected - not machine-parseable for StatisticsEngine.
- Store breakdown in a global array: Rejected - not thread-safe and creates hidden coupling.

---

## Decision 3: Structural SL Placement

**Question**: How does the current EA place SL, and is it structurally valid?

**Finding**: Each strategy's `Scan()` sets `signal.invalidation_price`. For ICTSniperStrategy this is the swing low/high that triggered the MSS. This IS structurally derived. However:
- No ATR buffer is added beyond the invalidation pivot (SL sits exactly on the swing, not beyond it).
- SL is not validated for minimum distance (could be too tight).
- `CalculateLotSize()` uses this distance directly; a 2-pip SL produces an extremely large lot size.

**Decision**: Add `StopModel::ValidateAndBuffer(entry, raw_sl, tf)` that:
1. Computes ATR on the signal TF.
2. Sets a configurable buffer (default 0.5 ATR beyond the invalidation pivot).
3. Enforces minimum SL distance (default 1.0 ATR).
Returns the validated SL price and logs a rejection if it cannot be placed safely.

**Rationale**: A 0.5 ATR buffer prevents SL being taken out by spread/noise at the exact pivot. The existing invalidation_price logic is preserved as the anchor.

**Alternatives Considered**:
- Fixed-pip buffer: Rejected - defeats structural placement purpose.
- Session-based minimum: Rejected - ATR already captures session volatility.

---

## Decision 4: TP Structural Identification

**Question**: How is TP1 currently calculated and why is it problematic?

**Finding**: `EAController.ProcessPipelineForTimeframe()` line 168:
```
plan.tp1 = entry + (SL_distance * InpMinRR)
```
`plan.tp2 = 0; plan.tp3 = 0;`
This is a pure R-multiple TP with no structural basis. The EA has a `TakeProfitModel.mqh` (1.9KB) that exists but is not wired into the main pipeline.

**Decision**: Wire `TakeProfitEngine::IdentifyTargets()` that uses existing ICT/Liquidity.mqh swing data to find:
- TP1: Nearest untapped liquidity pool in direction (within 3R)
- TP2: Next structural level (session high/low or major swing)
- TP3: HTF liquidity pool or FVG boundary

Each target is ranked by structural strength and estimated R-multiple. The minimum R:R gate remains configurable.

**Rationale**: The ICT/Liquidity.mqh and ICT/MarketStructure.mqh modules already detect these levels. TakeProfitEngine is a wiring exercise, not new detection logic.

**Alternatives Considered**:
- Keep R-multiple TP but make multiplier configurable: Rejected - does not address structural validity requirement.
- Use Fibonacci extensions: Rejected - not consistent with ICT methodology.

---

## Decision 5: Trade Health Engine Implementation

**Question**: Can trade health be evaluated within the existing OnTick() architecture?

**Finding**: `OnTick()` already calls `active_position_manager.ManagePositions()` on every tick. The analytics logger already tracks MAE/MFE tick-by-tick in `TradeAnalyticsLogger::UpdateRunningMetrics()`. The `StructureAnalyzer.mqh`, `LiquidityAnalyzer.mqh`, and `MomentumAnalyzer.mqh` can all be called post-entry.

**Decision**: `TradeHealthEngine.mqh` as a static class called from `ManagePositions()` on each new bar (not every tick - bar-by-bar is sufficient and avoids performance impact). It reads current MFE/MAE from `TradeAnalyticsLogger` and re-runs structural/liquidity/momentum sub-analyzers. Returns a health score + state. EAController acts on THESIS_INVALIDATED by calling trade.PositionClose().

**Rationale**: Bar-by-bar evaluation (not tick-by-tick) is sufficient for structural thesis monitoring and prevents OnTick() performance degradation. Tick-by-tick monitoring is only needed for MFE/MAE updates which are already happening.

**Alternatives Considered**:
- Run health check on every tick: Rejected - re-running structure/liquidity analysis 10-100x per bar is too expensive.
- Health check in OnTimer(): Rejected - OnTimer() doesn't fire in Strategy Tester.

---

## Decision 6: Recovery State Machine

**Question**: Should the Recovery State Machine be a new module or extend the existing StateManager?

**Finding**: `StateManager.mqh` manages global EA state (is_paused, is_disabled, risk_percent, etc.). It does not have per-position or per-thesis state. The existing `MqlPositionState` struct in `Types.mqh` tracks tp1_hit, tp2_hit, original_sl.

**Decision**: Extend `MqlPositionState` with `recovery_state` (enum) and `health_score` (int). `RecoveryStateMachine.mqh` is a static class that takes the current position state + health score and returns the new recovery state + permitted actions. EAController consults this before allowing new entries or resizing.

**Rationale**: Keeping recovery state inside the position tracking struct (rather than a global) allows correct multi-position handling. Each position has its own thesis state.

**Alternatives Considered**:
- Global recovery state (one per EA): Rejected - incorrect when managing 2 open positions on different setups.

---

## Decision 7: Research Mode Architecture

**Question**: How should Research Mode coexist with live trading mode without code duplication?

**Finding**: The entire scanner pipeline runs in `ProcessPipelineForTimeframe()`. Execution is at the `OrderManager::ExecuteTradePlan()` call. Research Mode only needs to suppress that call and instead call a new `ResearchMode::LogSimulatedSetup()` function.

**Decision**: Add `InpResearchModeOnly` (bool input). When true, `ProcessPipelineForTimeframe()` skips the `IsSignalExecuted/ExecuteTradePlan` block and instead calls `ResearchMode::LogSimulatedSetup()`. Simulated outcomes are computed on the next bars and appended to the log. Research logs use filename prefix `RESEARCH_` to distinguish them from live logs.

**Rationale**: Single flag, minimal pipeline branching. The entire scanner, scorer, regime-gate, SL/TP engine still run normally - only the execution call is suppressed.

**Alternatives Considered**:
- Separate EA file for research: Rejected - creates two codebases to maintain.

---

## Decision 8: Score-Band Statistical Validation

**Question**: How should the StatisticsEngine compute score-band performance without external tools?

**Finding**: `TradeAnalyticsLogger` already stores `entry_score` per trade. The log CSV is written to the MT5 Files/ directory. `PerformanceAnalyzer.mqh` has `PrintStats()` but does not group by score band.

**Decision**: `StatisticsEngine.mqh` reads the completed trade log CSV on EA shutdown (OnDeinit) and computes per-band metrics. Output is printed to the MT5 Journal tab and also written to a separate `STATS_[symbol]_[date].csv`. The Python bridge can optionally pick up this file for dashboard display.

**Rationale**: Computing stats at shutdown avoids any OnTick() performance impact. CSV export allows external analysis in Excel or Python if needed.

**Alternatives Considered**:
- In-memory rolling statistics: Rejected - lost on EA restart; CSV persists across restarts.
- Real-time statistics: Rejected - too expensive for OnTick().

---

## Decision 9: Grid Position Manager Disposition

**Question**: How to disable GridPositionManager without breaking existing users?

**Finding**: `InpPositionMode` enum includes `MODE_GRID`. GridPositionManager implements averaging-down by opening new positions at grid intervals. This is a constitution violation.

**Decision**: Remove `MODE_GRID` from the `ENUM_POSITION_MODE` enum. Existing `.set` files using grid mode will need updating. Document this as a breaking change in the v0.1 changelog. Users who need grid behavior must acknowledge this is prohibited.

**Rationale**: Keeping a disabled option creates confusion and risk. Hard removal is cleaner.

**Alternatives Considered**:
- Keep grid but log warning: Rejected - constitution violation cannot be "warned"; it must be blocked.

---

## Decision 10: Score Multiplier Removal from PositionSizing

**Question**: The current PositionSizing uses `score >= 85 -> 1.5x risk`. Is this acceptable?

**Finding**: This is an undocumented scaling factor that increases risk by 50% for high-score setups. It is:
- Not configurable
- Not validated (no evidence score>=85 actually outperforms score 70-84)
- A subtle form of undocumented risk escalation

**Decision**: Remove the multiplier entirely in v0.2. Replace with the Risk Tier system: each tier maps to a specific configurable risk percentage. High-quality tier (80-89) and maximum tier (90-100) are still higher-risk than lower tiers, but:
- The percentages are explicit and configurable
- The tier thresholds are configurable
- No tier can exceed the hard ceiling

**Rationale**: The constitution requires explicit, configurable, hard-capped risk. Implicit multipliers violate this.