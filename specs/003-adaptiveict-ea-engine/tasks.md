# Tasks: AdaptiveICT EA - Adaptive Trading Engine

**Branch**: `003-adaptiveict-ea-engine`
**Generated**: 2026-09-23
**Plan**: [plan.md](./plan.md) | **Spec**: [spec.md](./spec.md) | **Research**: [research.md](./research.md)

> **Implementation order**: v0.1 Research Mode -> v0.2 Scoring -> v0.3 Structural SL/TP -> v0.4 Trade Health -> v0.5 Recovery SM -> v1.0 Validation
>
> **Constitution invariants**: Hard SL on every order. No martingale. No grid. No lot-size escalation after a loss. 1% risk ceiling. 3% daily DD kill-switch.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Remove constitution violations and verify baseline compile before any feature work.

- [x] T001 Verify all existing .mqh files compile cleanly -- run compile_check.bat and confirm zero errors in mql5/AdaptiveICT/compile.log
- [x] T002 [P] Confirm specs/003-adaptiveict-ea-engine/ directory tree (contracts/, checklists/) exists
- [x] T003 Remove MODE_GRID from ENUM_POSITION_MODE in mql5/AdaptiveICT/Core/Config.mqh and delete GridPositionManager instantiation blocks from mql5/AdaptiveICT/Core/EAController.mqh (resolves constitution violation P9)
- [x] T004 Remove the score >= 85 -> final_risk * 1.5 multiplier from mql5/AdaptiveICT/Risk/PositionSizing.mqh lines 27-29 (resolves constitution violation P8); replace with final_risk = risk_percent placeholder until tier system is wired in Phase 5
- [x] T005 Compile EA after T003 and T004 -- confirm zero errors; run compile_check.bat

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core new data structures and logging infrastructure that every user story phase depends on.

> **CRITICAL**: No user story work can begin until this phase is complete.

- [x] T006 Add EntryScoreBreakdown struct to mql5/AdaptiveICT/Core/Types.mqh -- fields: int regime_pts, htf_structure_pts, liquidity_pts, entry_location_pts, mss_pts, fvg_ob_pts, smt_pts, volatility_pts, session_pts, exec_quality_pts, int total, string tier (maps to FR-010, FR-011)
- [x] T007 [P] Add MarketRegimeState struct to mql5/AdaptiveICT/Core/Types.mqh -- fields: string regime (TRENDING_BULLISH/TRENDING_BEARISH/RANGING/HIGH_VOLATILITY/LOW_VOLATILITY/TRANSITION/UNKNOWN), int confidence, datetime evaluated_at (maps to FR-003)
- [x] T008 [P] Add TradeHealthState struct to mql5/AdaptiveICT/Core/Types.mqh -- fields: int score, string label (HEALTHY/WEAKENING/DANGER/THESIS_INVALIDATED), string factor_notes, datetime evaluated_at (maps to FR-027)
- [x] T009 [P] Add RecoveryStateEnum enum and RecoveryState struct to mql5/AdaptiveICT/Core/Types.mqh -- enum: RECOVERY_NORMAL, RECOVERY_WEAKENING, RECOVERY_RISK_PROTECTION, RECOVERY_OBSERVATION, RECOVERY_CONFIRMED, RECOVERY_INVALIDATED; struct fields: RecoveryStateEnum state, string reason, datetime transitioned_at (maps to FR-029)
- [x] T010 [P] Add ResearchSetup struct to mql5/AdaptiveICT/Core/Types.mqh -- fields: string symbol, direction, string timeframe, datetime detected_at, double entry, sl, tp1, tp2, tp3, EntryScoreBreakdown score, string regime, session, string sim_outcome (TP1_HIT/TP2_HIT/SL_HIT/OPEN/EXPIRED) (maps to FR-039)
- [x] T011 Add RiskTierEnum enum to mql5/AdaptiveICT/Core/Types.mqh -- values: TIER_NO_TRADE, TIER_LOW, TIER_NORMAL, TIER_HIGH_QUALITY, TIER_MAXIMUM (maps to FR-013)
- [x] T012 Extend mql5/AdaptiveICT/Core/StateManager.mqh -- add globals: bool research_mode_active, RecoveryState g_recovery_state, TradeHealthState g_health_state[10] plus accessor functions GetHealthState(ulong ticket) and SetHealthState(ulong ticket, TradeHealthState state) (maps to FR-025)
- [x] T013 Add new input parameters to mql5/AdaptiveICT/Core/Config.mqh: InpResearchModeOnly=false (FR-039); InpRiskTierLow=0.25, InpRiskTierNormal=0.5, InpRiskTierHigh=0.75, InpRiskTierMax=1.0 (FR-014); InpSLATRBuffer=0.5, InpSLMinATR=1.0 (FR-018); InpHealthInvalidatedThreshold=25, InpHealthDangerThreshold=50, InpHealthWeakeningThreshold=75, InpHealthDangerBarsToBlock=5 (FR-027/031); InpScoreWeightRegime=15, InpScoreWeightHTFStructure=15, InpScoreWeightLiquidity=15, InpScoreWeightEntryLocation=15, InpScoreWeightMSS=10, InpScoreWeightFVGOB=10, InpScoreWeightSMT=5, InpScoreWeightVolatility=5, InpScoreWeightSession=5, InpScoreWeightExecQuality=5 (FR-012)
- [x] T014 Compile EA after T006-T013 -- confirm zero errors; run compile_check.bat

**Checkpoint**: Foundation structs, enums, config inputs, and state variables installed. EA compiles. Behaviour unchanged -- all new flags default off.

---

## Phase 3: User Story 1 -- Market Regime-Aware Setup Detection (P1 - v0.2)

**Goal**: Wire existing MarketRegimeDetector as a hard entry gate. Regime is computed each bar and blocks entries in incompatible regimes before scoring occurs.

**Independent Test**: Run Research Mode on 12 months XAUUSD. Every setup must log MarketRegime. Setups in RANGING must not produce live entries for trend strategies.

### Implementation for US1

- [x] T015 [US1] Create mql5/AdaptiveICT/Core/MarketRegimeGate.mqh -- static class MarketRegimeGate with method IsRegimePermitted(string strategy_id, string regime): ICTSniper/ICTScalper accept TRENDING_BULLISH, TRENDING_BEARISH, TRANSITION; all block HIGH_VOLATILITY and UNKNOWN (maps to FR-006)
- [x] T016 [US1] Modify mql5/AdaptiveICT/Core/EAController.mqh ProcessPipelineForTimeframe() -- before DecisionEngine::Evaluate(): compute MarketRegimeState from MarketRegimeDetector::Detect(), call MarketRegimeGate::IsRegimePermitted(); if false: log "[Regime Gate] Blocked" and return (maps to FR-006, US1 acceptance scenarios 1-3)
- [x] T017 [US1] Add string regime field to TradeSignal struct in mql5/AdaptiveICT/Core/Types.mqh; populate in ProcessPipelineForTimeframe() after regime detection so regime travels with signal through pipeline
- [x] T018 [US1] Modify mql5/AdaptiveICT/Analytics/TradeAnalyticsLogger.mqh -- add regime column to CSV header and RegisterTrade() call (maps to FR-036)
- [x] T019 [US1] Add regime display to mql5/AdaptiveICT/Dashboard/MainPanel.mqh -- add "Regime:" label row showing regime string and confidence % (maps to FR-043)
- [x] T020 [US1] Compile and run Strategy Tester on XAUUSD 2025 M15 3-month period -- verify Print log shows regime blocks in RANGING sessions and zero trades open when regime = RANGING

**Checkpoint**: Regime gate live. Strategy Tester confirms RANGING blocks. Regime logged in every trade record.

---

## Phase 4: User Story 2 -- Entry Quality Scoring with Explainability (P1 - v0.2)

**Goal**: Replace opaque single-integer score with fully explainable per-component breakdown logged for every evaluated setup.

**Independent Test**: Run 30 days ResearchModeOnly. Every setup log must show each component label, max, and awarded points summing to total.

### Implementation for US2

- [x] T021 [US2] Create mql5/AdaptiveICT/Core/EntryQualityEngine.mqh -- static class EntryQualityEngine with method Evaluate(ENUM_TIMEFRAMES tf, const TradeSignal &signal, const MarketRegimeState &regime) returning EntryScoreBreakdown; scores each component using InpScoreWeight* inputs using existing ICT modules (FVG.mqh, Liquidity.mqh, MarketStructure.mqh, SMT.mqh, VolatilityAnalyzer.mqh, ExecutionQualityAnalyzer.mqh) (maps to FR-010, FR-012)
- [x] T022 [US2] Modify mql5/AdaptiveICT/Scanner/ConfluenceEngine.mqh CalculateConfluence() -- call EntryQualityEngine::Evaluate() instead of building local score; preserve backward-compatible ConfluenceResult.score field
- [x] T023 [US2] Modify mql5/AdaptiveICT/Core/DecisionEngine/DecisionEngine.mqh Evaluate() -- add EntryScoreBreakdown breakdown field to DecisionResult struct in Types.mqh; populate from EntryQualityEngine::Evaluate()
- [x] T024 [US2] Modify mql5/AdaptiveICT/Analytics/TradeAnalyticsLogger.mqh -- extend CSV log header with columns regime_pts, htf_struct_pts, liquidity_pts, entry_loc_pts, mss_pts, fvg_ob_pts, smt_pts, vol_pts, session_pts, exec_quality_pts, total_score, score_tier; populate in RegisterTrade() from DecisionResult.breakdown (maps to FR-011, FR-036)
- [x] T025 [US2] Add score < 60 guard to mql5/AdaptiveICT/Core/EAController.mqh ProcessPipelineForTimeframe() -- if breakdown.total < 60 set is_approved=false and log "SKIPPED: score X < threshold 60" (maps to FR-013, US2 acceptance scenario 2)
- [x] T026 [US2] Add score breakdown display to mql5/AdaptiveICT/Dashboard/MainPanel.mqh -- show top 3 component labels with pts/max (maps to FR-043)
- [x] T027 [US2] Compile and run 30-day Research Mode backtest -- verify output CSV has all 10 component columns with values summing to total_score

**Checkpoint**: Score breakdown fully logged. Every setup has traceable breakdown. Panel shows top components.

---

## Phase 5: User Story 3 -- Structural SL with Calculated Position Sizing (P1 - v0.3)

**Goal**: Replace raw signal.invalidation_price SL with structurally validated ATR-buffered stop. Position size computed from AccountRisk / StopDistancePerLot.

**Independent Test**: Place 10 simulated entries with varying ATR. Verify each SL is beyond structural invalidation and lot size = (balance * risk%) / (stop distance per lot).

### Implementation for US3

- [x] T028 [US3] Modify mql5/AdaptiveICT/Targets/StopModel.mqh -- implement static double ValidateAndBuffer(double entry, double raw_sl, ENUM_TIMEFRAMES tf): (1) compute ATR via Indicators/ATR.mqh, (2) apply InpSLATRBuffer ATR units beyond raw_sl away from entry, (3) enforce minimum SL of InpSLMinATR ATR units, (4) return validated SL price; if ATR=0.0 log warning and return 0.0 (maps to FR-018, US3 acceptance scenario 1)
- [x] T029 [US3] Modify mql5/AdaptiveICT/Core/EAController.mqh ProcessPipelineForTimeframe() -- after strategy Scan(), call StopModel::ValidateAndBuffer(signal.entry_price, signal.invalidation_price, tf) and replace all downstream uses of signal.invalidation_price with the buffered SL (maps to FR-018)
- [x] T030 [US3] Modify mql5/AdaptiveICT/Risk/RiskManager.mqh -- implement GetTierRisk(int score) function: score<60 returns 0.0; 60-69 returns InpRiskTierLow; 70-79 returns InpRiskTierNormal; 80-89 returns InpRiskTierHigh; 90-100 returns InpRiskTierMax (maps to FR-013, FR-014, FR-015)
- [x] T031 [US3] Modify mql5/AdaptiveICT/Risk/PositionSizing.mqh CalculateLotSize() -- read final_risk from RiskManager::GetTierRisk(score); formula: lots = (balance * risk_pct) / (sl_distance / tick_size * tick_value) (maps to FR-019, US3 acceptance scenarios 2-3)
- [x] T032 [US3] Implement structural TP identification in mql5/AdaptiveICT/Targets/TakeProfitModel.mqh -- static void IdentifyTargets(ENUM_TIMEFRAMES tf, const TradeSignal &signal, double &tp1, double &tp2, double &tp3): TP1=nearest untapped liquidity pool within 3R; TP2=next structural swing or session high/low; TP3=HTF liquidity pool from ICT/Liquidity.mqh; fallback to entry + SL_distance * InpMinRR with warning logged if no structural target within 5R (maps to FR-022, FR-024)
- [x] T033 [US3] Wire TakeProfitModel::IdentifyTargets() into mql5/AdaptiveICT/Core/EAController.mqh -- replace plan.tp1 = entry + invalidation_dist * InpMinRR at current line 168 with structural TP output; populate plan.tp2 and plan.tp3 (maps to FR-022)
- [x] T034 [US3] Compile and run 10 simulated Strategy Tester entries -- check Print log for ATR-buffered SL values; verify lot size formula against manual calculation for each entry

**Checkpoint**: SL structurally buffered. Lot size follows tier risk formula. TP1/TP2/TP3 structurally derived.

---

## Phase 6: User Story 5 -- Research Mode and Missed Opportunity Logging (P2 - v0.1)

> Note: US5 implemented before US4 because Research Mode is the v0.1 data collection vehicle. Requires scoring and SL/TP from Phases 3-5; does not require Trade Health Engine.

**Goal**: InpResearchModeOnly flag suppresses all live execution and logs every qualifying setup with simulated levels and outcome tracking.

**Independent Test**: Enable ResearchModeOnly. Run 3-month backtest. Confirm log shows every detected setup with simulated entry/SL/TP and outcome. Zero live orders placed.

### Implementation for US5

- [x] T035 [US5] Create mql5/AdaptiveICT/Core/ResearchMode.mqh -- static class ResearchMode with: LogSetup(const ResearchSetup &setup) writes CSV row to RESEARCH_[symbol]_[date].csv in MT5 Files/; UpdateOutcome(string setup_id, datetime bar_time, double high, double low) tracks TP/SL hit on subsequent bars; IsActive() returns InpResearchModeOnly (maps to FR-039, FR-040)
- [x] T036 [US5] Modify mql5/AdaptiveICT/Core/EAController.mqh ProcessPipelineForTimeframe() -- after DecisionEngine approval gate: if ResearchMode::IsActive(), build ResearchSetup from signal/decision data, call ResearchMode::LogSetup(), and return without calling OrderManager::ExecuteTradePlan() (maps to FR-039, US5 acceptance scenario 1)
- [x] T037 [US5] Add research outcome updater to OnTimer() in mql5/AdaptiveICT/Core/EAController.mqh -- call ResearchMode::UpdateOutcome() for all open simulated setups each timer interval (maps to FR-039)
- [x] T038 [US5] Add "RESEARCH MODE ACTIVE" amber indicator to mql5/AdaptiveICT/Dashboard/MainPanel.mqh -- displayed prominently when InpResearchModeOnly=true (maps to FR-043)
- [x] T039 [US5] Compile and run 90-day Strategy Tester backtest with InpResearchModeOnly=true -- confirm RESEARCH_XAUUSD.a_*.csv files created in MT5 Files/, verify zero orders placed, verify setup count > 0, all rows have score breakdown columns

**Checkpoint**: Research Mode fully operational. 90-day backtest produces research CSV. No live trades placed. v0.1 MVP GATE REACHED.

---

## Phase 7: User Story 4 -- Trade Health Monitoring and Thesis-Based Exit (P2 - v0.4)

**Goal**: Post-entry evaluate thesis health each new bar and close automatically when THESIS_INVALIDATED.

**Independent Test**: Open long. Cause bearish MSS on entry TF while price below entry. Observe Health Score drop and EA close trade before hard SL.

### Implementation for US4

- [x] T040 [US4] Create mql5/AdaptiveICT/Core/TradeHealthEngine.mqh -- static class TradeHealthEngine with Evaluate(ulong ticket, ENUM_TIMEFRAMES entry_tf, const TradeSignal &original_signal) returning TradeHealthState: re-runs StructureAnalyzer, LiquidityAnalyzer, MomentumAnalyzer, VolatilityAnalyzer on current bar; reads MFE/MAE from TradeAnalyticsLogger::GetRunningMetrics(ticket); sub-factor weights: structure(25), liquidity(15), momentum(15), price location(10), volatility(10), SMT(10), volume(5), session(5), MFE progress(3), MAE/ATR(2); state: >=75=HEALTHY, 50-74=WEAKENING, 25-49=DANGER, 0-24=THESIS_INVALIDATED (maps to FR-025, FR-026, FR-027)
- [x] T041 [US4] Modify mql5/AdaptiveICT/PositionManagement/Single/SinglePositionManager.mqh ManagePositions() -- add health evaluation loop: for each managed position, call TradeHealthEngine::Evaluate() on new bar only; store via SetHealthState(ticket, health); if health.label="THESIS_INVALIDATED" call trade.PositionClose(ticket) and log exit reason (maps to FR-028, US4 acceptance scenario 2)
- [x] T042 [US4] Apply same health evaluation pattern to mql5/AdaptiveICT/PositionManagement/PartialExit/PartialExitManager.mqh ManagePositions() (maps to FR-028)
- [x] T043 [US4] Add Trade Health display to mql5/AdaptiveICT/Dashboard/MainPanel.mqh -- show "Health: [score]/100 [state]" per open position with color coding green/yellow/orange/red (maps to FR-043)
- [x] T044 [US4] Compile and test in Strategy Tester -- verify bearish BOS on entry TF causes health decrement; verify THESIS_INVALIDATED triggers market close before hard SL hit

**Checkpoint**: Trade Health Engine live. Positions close on thesis invalidation. Health score visible on dashboard.

---

## Phase 8: User Story 6 -- Statistical Validation of Scoring Model (P3 - v0.5/v1.0)

**Goal**: StatisticsEngine computes score-band performance tables from completed trade log to validate scoring model before trusting higher risk tiers.

**Independent Test**: After 50+ logged trades, run StatisticsEngine. Verify per-band (50-59, 60-69, 70-79, 80-89, 90-100) output with win rate, expectancy, profit factor, avg MAE, avg MFE.

### Implementation for US6

- [x] T045 [US6] Create mql5/AdaptiveICT/Analytics/StatisticsEngine.mqh -- static class StatisticsEngine with: ComputeBandStats() reads completed trade CSV; groups by bands 50-59/60-69/70-79/80-89/90-100; outputs per band: count, win rate, avg win R, avg loss R, expectancy=(wr*avgWinR)-(lr*avgLossR), profit factor, avg MAE, avg MFE; ComputeSetupCombinationStats() groups by setup combination; IsModelValidated() returns true only if bands 80-89 and 90-100 outperform 60-69 in expectancy; writes STATS_[symbol]_[date].csv and prints to MT5 Journal (maps to FR-037, FR-038)
- [x] T046 [US6] Call StatisticsEngine::ComputeBandStats() in mql5/AdaptiveICT/Core/EAController.mqh Shutdown() -- runs on every EA deinit (maps to FR-037)
- [x] T047 [US6] Modify mql5/AdaptiveICT/Risk/RiskManager.mqh GetTierRisk() -- check StatisticsEngine::IsModelValidated() before returning InpRiskTierHigh or InpRiskTierMax; if not validated, cap at InpRiskTierNormal regardless of score (maps to US6 acceptance scenario 2, FR-015)
- [x] T048 [US6] Add score validation status to mql5/AdaptiveICT/Dashboard/MainPanel.mqh -- display "Model: VALIDATED / UNVALIDATED" label; UNVALIDATED caps risk display at NORMAL tier (maps to FR-043)

**Checkpoint**: StatisticsEngine produces 5-band output at shutdown. Risk tier capped at NORMAL until scoring model validated.

---

## Phase 9: Recovery State Machine (P2 - v0.5)

**Goal**: Per-position recovery state tracking NORMAL -> WEAKENING -> RISK_PROTECTION -> OBSERVATION -> CONFIRMED/INVALIDATED.

**Independent Test**: Force position into DANGER state. Verify new entries on same pair blocked. Verify state transitions logged.

### Implementation for Recovery SM

- [x] T049 [REC] Create mql5/AdaptiveICT/Core/RecoveryStateMachine.mqh -- static class RecoveryStateMachine with: Transition(ulong ticket, const TradeHealthState &health, RecoveryState current) applying state machine from FR-029: NORMAL->WEAKENING on 1+ WEAKENING bars; WEAKENING->RISK_PROTECTION after InpHealthDangerBarsToBlock DANGER bars; RISK_PROTECTION->OBSERVATION after 3+ consecutive HEALTHY bars; OBSERVATION->CONFIRMED on structure revalidation; any->INVALIDATED on THESIS_INVALIDATED; IsNewEntryBlocked(string symbol, RecoveryStateEnum state) returns true if RISK_PROTECTION or OBSERVATION (maps to FR-029, FR-030, FR-031)
- [x] T050 [REC] Modify mql5/AdaptiveICT/Core/EAController.mqh ProcessPipelineForTimeframe() -- before DecisionEngine approval: call RecoveryStateMachine::IsNewEntryBlocked(_Symbol, g_recovery_state.state); if blocked, print reason and return (maps to FR-030)
- [x] T051 [REC] Update RecoveryState in OnTick()/ManagePositions() -- after TradeHealthEngine::Evaluate() per position, call RecoveryStateMachine::Transition() and persist result in g_recovery_state via StateManager (maps to FR-029)
- [x] T052 [REC] Add recovery state display to mql5/AdaptiveICT/Dashboard/MainPanel.mqh -- show "Recovery: NORMAL/RISK_PROTECTION/OBSERVATION/CONFIRMED" with colour coding (maps to FR-043)
- [x] T053 [REC] Compile and verify in Strategy Tester -- trigger DANGER state; confirm new entries blocked; confirm THESIS_INVALIDATED closes position and transitions to INVALIDATED state

**Checkpoint**: Recovery SM live. No new entries during RISK_PROTECTION. State transitions logged and visible on dashboard.

---

## Phase 10: Polish & Cross-Cutting Concerns

**Purpose**: Edge case hardening, backtest validation, and final clean compile.

- [x] T054 [P] Verify ATR=0.0 guard in mql5/AdaptiveICT/Targets/StopModel.mqh -- if ATR returns 0.0 (weekend or data gap), log warning and return 0.0 to block trade (spec edge case)
- [x] T055 [P] Add guard in mql5/AdaptiveICT/Core/EAController.mqh -- if position manually closed in MT5 while EA managing: detect via PositionSelectByTicket() returning false; clean health/recovery state for that ticket (spec edge case)
- [x] T056 [P] Verify mql5/AdaptiveICT/Risk/PositionSizing.mqh -- confirm lots < lot_min path logs "Lot size below minimum; trade blocked" (spec edge case)
- [x] T057 [P] Verify spread gate in mql5/AdaptiveICT/Core/DecisionEngine/ExecutionQualityAnalyzer.mqh -- confirm trade blocked when spread > InpMaxSpreadPoints with logged reason (spec edge case)
- [x] T058 Add version comment to mql5/AdaptiveICT/AdaptiveICT.mq5 -- set property version "0.5" and add changelog comment block (maps to FR-044)
- [ ] T059 Run full 12-month XAUUSD.a Strategy Tester backtest (2025 data) with realistic Exness spread 20 points, commission $3 per lot, mode "Every tick based on real ticks" (maps to FR-046)
- [x] T060 Update specs/003-adaptiveict-ea-engine/quickstart.md -- document all new inputs (InpResearchModeOnly, InpRiskTier*, InpSLATRBuffer, InpHealth*) and Strategy Tester validation sequence from FR-045
- [x] T061 [P] Final clean compile -- run compile_check.bat; confirm 0 errors, 0 warnings; all new files included in compile.log

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies -- start immediately
- **Phase 2 (Foundational)**: Depends on Phase 1 -- BLOCKS all user stories
- **Phase 3 (US1)**: Depends on Phase 2
- **Phase 4 (US2)**: Depends on Phase 2; can run in parallel with Phase 3
- **Phase 5 (US3)**: Depends on Phase 4 (needs EntryScoreBreakdown)
- **Phase 6 (US5)**: Depends on Phases 3+4+5 (needs regime + score + SL/TP)
- **Phase 7 (US4)**: Depends on Phase 2; begin after Phase 6 data validates v0.1
- **Phase 8 (US6)**: Depends on Phase 6 (needs completed trade CSV)
- **Phase 9 (Recovery)**: Depends on Phase 7 (needs health states)
- **Phase 10 (Polish)**: Depends on all phases complete

### Story Dependency Graph

```
Phase 1 -> Phase 2
Phase 2 -> Phase 3 (US1) + Phase 4 (US2) [parallel]
Phase 3 + Phase 4 -> Phase 5 (US3)
Phase 3 + Phase 4 + Phase 5 -> Phase 6 (US5)   <- v0.1 GATE: 200 setups collected
Phase 6 -> Phase 7 (US4)
Phase 7 -> Phase 9 (Recovery SM)
Phase 6 -> Phase 8 (US6 Statistics)
All -> Phase 10 (Polish)
```

---

## Parallel Opportunities

```bash
# Phase 2: All struct additions are independent -- safe to do in any order
T006: EntryScoreBreakdown struct
T007: MarketRegimeState struct
T008: TradeHealthState struct
T009: RecoveryState struct/enum
T010: ResearchSetup struct
T011: RiskTierEnum

# Phase 3 + Phase 4 after Phase 2:
US1 group: MarketRegimeGate.mqh (new file -- no conflicts)
US2 group: EntryQualityEngine.mqh (new file -- no conflicts)
```

---

## Implementation Strategy

### v0.1 MVP -- Phases 1-6 Only

1. Phase 1: Remove constitution violations
2. Phase 2: Install all new structs and inputs
3. Phase 3: Wire regime gate
4. Phase 4: Install score breakdown
5. Phase 5: Install structural SL/TP
6. Phase 6: Enable Research Mode

**GATE**: Run InpResearchModeOnly=true for 200+ setups on XAUUSD M15. Review RESEARCH_*.csv. Diagnose biases before enabling live trade management.

### Versioned Gate Progression

| Gate | Condition | Unlock |
|---|---|---|
| v0.1 -> v0.2 | 200 research setups logged with breakdown | Regime gate + score breakdown wiring |
| v0.2 -> v0.3 | 1-month backtest all spec items pass | Structural SL/TP live |
| v0.3 -> v0.4 | 50 paper trade SL validations | Trade Health Engine |
| v0.4 -> v0.5 | THESIS_INVALIDATED tested in Strategy Tester | Recovery SM |
| v0.5 -> v1.0 | 3-month OOS walk-forward profit factor > 1.0 | System considered validated |

---

## Notes

- [P] = no file conflicts with sibling tasks; safe to implement simultaneously
- [US1]-[US6] = maps task to user story for traceability; [REC] = Recovery SM tasks
- Every task must compile clean before moving to the next
- InpResearchModeOnly=true is the safe default for any new deployment
- SC-010: zero lot-size increases after a losing trade; StatisticsEngine flag monitors this
- All new .mqh files must begin with #property once to prevent double-inclusion
- Total tasks: 61 across 10 phases covering all 6 user stories