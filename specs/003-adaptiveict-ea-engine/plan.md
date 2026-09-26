# Implementation Plan: AdaptiveICT EA - Adaptive Trading Engine

**Branch**: `003-adaptiveict-ea-engine` | **Date**: 2026-09-23 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/003-adaptiveict-ea-engine/spec.md`

---

## Summary

Transform the AdaptiveICT MQL5 Expert Advisor from a profitable-in-sample but failing out-of-sample static signal generator into a measurable, adaptive, and self-learning trading system. The EA already has a modular directory structure and a working confluence scoring skeleton. The refactor focuses on seven critical missing capabilities:

1. **Regime-gated setup evaluation** (MarketRegime detection exists but does not gate entries)
2. **Explainable, component-level Entry Quality Score** (current score is opaque aggregate)
3. **Structural SL placement** (current SL is from strategy scan, not validated structurally)
4. **Trade Health Engine** (does not exist - EA blindly holds to hard SL)
5. **Recovery State Machine** (does not exist - no thesis-weakening logic)
6. **Research Mode** (does not exist - no simulation/logging without live execution)
7. **Score-band statistical validation** (analytics exist but score-band correlation is not computed)

Implementation follows strict versioned, incremental progression:
`v0.1 (Research Mode)` -> `v0.2 (Scoring)` -> `v0.3 (Structural SL/TP)` -> `v0.4 (Trade Health)` -> `v0.5 (Recovery SM)` -> `v1.0 (Full Validation)`

---

## Technical Context

**Language/Version**: MQL5 (MetaQuotes Language 5) on MetaTrader 5 platform

**Primary Dependencies**:
- MQL5 standard library (CTrade, CPositionInfo, CSymbolInfo)
- MT5 built-in indicators (ATR, ADX, RSI, EMA, Volume)
- BridgeClient HTTP socket to Python telemetry service (mt5_bridge.py)
- Node.js/Express Dashboard API (receiving telemetry)

**Storage**:
- MQL5 file system (CSV trade logs written to MT5 Files/ directory)
- Python bridge forwards to PostgreSQL/TimescaleDB
- Dashboard reads from PostgreSQL

**Testing**:
- MT5 Strategy Tester (single-symbol backtesting, multi-currency manual)
- MQL5 Print() debug logging (no unit test framework available natively)
- Out-of-sample walk-forward: development window 2024, OOS window 2025-2026

**Target Platform**: Windows (VPS) running MetaTrader 5 terminal, Exness broker

**Project Type**: Algorithmic trading EA (event-driven, tick-based)

**Performance Goals**:
- OnTick() execution < 5ms (MQL5 hard constraint for live trading responsiveness)
- Setup detection within first 200ms of new bar open
- No tick-blocking file I/O (all CSV writes are buffered or async via bridge)

**Constraints**:
- MQL5 is single-threaded on the EA thread; no true parallelism
- All MT5 API calls must be serialized
- No dynamic memory allocation inside OnTick() critical path
- Grid position manager and martingale-style recovery are permanently disabled in new architecture
- Exness raw spread account: XAUUSD.a typical spread 15-30 points

**Scale/Scope**: Single-symbol primary (XAUUSD.a), up to 3 secondary FX pairs, 1 EA instance per symbol

---

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|---|---|---|
| Quantitative rigor: multi-year OOS validation | PASS | Plan mandates dev/OOS/walk-forward sequence |
| Capital protection: Hard SL on every order | PASS | SL is mandatory in TradePlan; never removed |
| No martingale/unbounded cost-averaging | PASS | GridPositionManager removed from v0.1+ scope |
| Risk cap 1.0% per trade | PASS | Risk tiers enforce ceiling |
| Daily DD circuit breaker 3.0% | PASS | IsDailyLossExceeded() retained and strengthened |
| Master DD kill-switch 15.0% | PASS | IsMaxDrawdownHit() retained |
| Compounding cap (InpMaxBalanceCompounding) | PASS | Retained in PositionSizing.mqh |
| MQL5 EA on MT5 only (no stack boundary crossing) | PASS | EA stays in MQL5 |
| Bridge layer: Python real-time telemetry | PASS | BridgeClient.mqh retained |
| Dashboard backend: Node.js/Express | PASS | No changes to backend in this refactor |
| Non-destructive evolution | PASS | Incremental versioned changes, no rewrites |

**No constitution violations. Gate PASSED.**

---

## Current Architecture Audit

### What Exists (REUSE)

| Component | File(s) | Quality | Reuse Decision |
|---|---|---|---|
| EA entry point | AdaptiveICT.mq5 | Good - clean delegate pattern | Keep as-is |
| EAController | Core/EAController.mqh | Good structure, fat OnTick | Keep, refactor OnTick |
| Types/DTOs | Core/Types.mqh | Clean structs (TradeSignal, TradePlan, DecisionResult) | Keep, extend |
| Config | Core/Config.mqh | 12KB - all input params | Keep, add new params |
| StateManager | Core/StateManager.mqh | Global state variables | Keep, extend |
| ConfluenceEngine | Scanner/ConfluenceEngine.mqh | Working 0-100 score | Upgrade to explainable |
| DecisionEngine | Core/DecisionEngine/ | Multi-factor evaluation | Upgrade score transparency |
| ICT modules | ICT/*.mqh | FVG, OB, Liquidity, MSS, SMT | Reuse directly |
| MarketRegime | Market/MarketRegime.mqh + DecisionEngine/MarketRegimeDetector.mqh | Regime detection exists | Wire to entry gate |
| RiskManager | Risk/RiskManager.mqh | Daily DD + drawdown + max trades | Extend with tier system |
| PositionSizing | Risk/PositionSizing.mqh | Correct formula, has score scaling | Replace score scaling with tier system |
| TradeAnalyticsLogger | Analytics/TradeAnalyticsLogger.mqh | 24KB, MAE/MFE tracking exists | Extend for score breakdown + band stats |
| BridgeClient | Communication/BridgeClient.mqh | HTTP socket | Keep as-is |
| Dashboard | Dashboard/MainPanel.mqh | 12KB panel | Extend for new states |
| Strategies | Strategies/*.mqh | ICTSniper, ICTScalper, MomentumScalper, Breakout, MeanReversion | Keep ICTSniper/Scalper; disable Momentum/Breakout/MeanReversion in v0.1 |

### Critical Problems Identified

| # | Problem | Location | Impact |
|---|---|---|---|
| P1 | Regime detected but does NOT gate entries - trending EA trades in RANGING market | EAController.ProcessPipelineForTimeframe() | PRIMARY loss driver |
| P2 | Score breakdown is not logged per-component - "score 72" with no explanation | ConfluenceEngine.mqh, TradeAnalyticsLogger | Cannot diagnose or improve |
| P3 | TP1 is calculated as entry + (SL_distance * MinRR) - structural levels not used | EAController line 168 | Bad TP placement, premature closure |
| P4 | SL comes from strategy signal.invalidation_price with no structural validation layer | All strategies | SL may be too tight or lack buffer |
| P5 | No Trade Health Engine - EA holds blindly to hard SL even when thesis is invalidated | Missing entirely | Capital destroyed on failed thesis |
| P6 | No Research Mode - cannot simulate setups without live exposure | Missing entirely | Cannot diagnose bias safely |
| P7 | No Recovery State Machine - no WEAKENING/DANGER/INVALIDATED states | Missing entirely | No capital protection on failing trades |
| P8 | Score scaling in PositionSizing: score>=85 -> 1.5x risk is undocumented martingale | PositionSizing.mqh lines 27-29 | Violates constitution |
| P9 | GridPositionManager active - uses grid/averaging-down pattern | PositionManagement/Grid/ | Constitution violation |
| P10 | Score-band statistics not computed - no correlation of score to outcome | Analytics layer | Cannot validate scoring model |

---

## Project Structure

### Documentation (this feature)

```text
specs/003-adaptiveict-ea-engine/
├── plan.md              <- This file
├── research.md          <- Phase 0 output
├── data-model.md        <- Phase 1 output
├── quickstart.md        <- Phase 1 output
├── contracts/           <- Phase 1 output
│   ├── score-breakdown.md
│   ├── trade-health.md
│   └── research-mode-log.md
└── tasks.md             <- Phase 2 output (/speckit-tasks)
```

### Source Code - AdaptiveICT EA

```text
mql5/AdaptiveICT/
|
|- AdaptiveICT.mq5                    [KEEP - no changes]
|
|- Core/
|   |- Config.mqh                     [MODIFY - add new input params]
|   |- Types.mqh                      [MODIFY - add new structs]
|   |- StateManager.mqh               [MODIFY - add health/recovery state]
|   |- EAController.mqh               [MODIFY - wire regime gate, research mode]
|   |- DecisionEngine/
|   |   |- DecisionEngine.mqh         [MODIFY - return explainable breakdown]
|   |   |- MarketRegimeDetector.mqh   [KEEP]
|   |   |- ConfluenceScorer.mqh       [MODIFY - component-level output]
|   |   |- StructureAnalyzer.mqh      [KEEP]
|   |   |- LiquidityAnalyzer.mqh      [KEEP]
|   |   |- VolatilityAnalyzer.mqh     [KEEP]
|   |   |- MomentumAnalyzer.mqh       [KEEP]
|   |   |- ExecutionQualityAnalyzer.mqh [KEEP]
|   |   |- RiskEvaluator.mqh          [KEEP]
|
|- NEW: Core/EntryQualityEngine.mqh   [NEW - explainable 0-100 score]
|- NEW: Core/TradeHealthEngine.mqh    [NEW - post-entry thesis monitoring]
|- NEW: Core/RecoveryStateMachine.mqh [NEW - NORMAL->WEAKENING->DANGER->INVALIDATED]
|- NEW: Core/ResearchMode.mqh         [NEW - no-trade simulation + logging]
|
|- Scanner/
|   |- ConfluenceEngine.mqh           [MODIFY - log component breakdown]
|   |- ScannerEngine.mqh              [KEEP]
|   |- SetupDetector.mqh              [KEEP]
|
|- Risk/
|   |- RiskManager.mqh                [MODIFY - add tier system]
|   |- PositionSizing.mqh             [MODIFY - remove score multiplier, use tiers]
|   |- DrawdownControl.mqh            [KEEP]
|   |- ExposureManager.mqh            [KEEP]
|
|- Targets/
|   |- StopModel.mqh                  [MODIFY - structural SL validation]
|   |- TakeProfitModel.mqh            [MODIFY - structural TP identification]
|   |- EntryModel.mqh                 [KEEP]
|
|- Analytics/
|   |- TradeAnalyticsLogger.mqh       [MODIFY - add score breakdown fields, band stats]
|   |- NEW: StatisticsEngine.mqh      [NEW - score-band correlation reports]
|   |- TradeJournal.mqh               [KEEP]
|   |- PerformanceAnalyzer.mqh        [KEEP]
|
|- PositionManagement/
|   |- Single/SinglePositionManager.mqh    [KEEP - primary mode]
|   |- PartialExit/PartialExitManager.mqh  [KEEP - keep for TP1 partial]
|   |- Grid/GridPositionManager.mqh        [DISABLE - remove from InpPositionMode options]
|
|- Strategies/ (no changes to scan logic in v0.1-v0.3)
|   |- ICT/ICTSniperStrategy.mqh      [KEEP]
|   |- ICT/ICTScalperStrategy.mqh     [KEEP]
|   |- Momentum/MomentumScalperStrategy.mqh [DISABLE in v0.1]
|   |- Breakout/BreakoutStrategy.mqh  [DISABLE in v0.1]
|   |- MeanReversion/MeanReversionStrategy.mqh [DISABLE in v0.1]
|
|- Dashboard/
|   |- MainPanel.mqh                  [MODIFY - show regime, health, recovery state]
|
|- Communication/
|   |- BridgeClient.mqh               [KEEP]
|   |- TradeReporter.mqh              [MODIFY - add health/recovery fields]
```

**Structure Decision**: Multi-directory flat-module MQL5 architecture is retained. New modules are added as `.mqh` header files following the existing `#property once` + static class pattern already used throughout the codebase.

---

## Complexity Tracking

No constitution violations requiring justification.

The only architectural deviation from the current codebase is **disabling Grid/Martingale position management** - this resolves a constitution violation, not introduces one.

---

## Implementation Versioning

| Version | Scope | Gate to Advance |
|---|---|---|
| v0.1 | Research Mode only - no live trading, log all setups | 200 setups logged with score breakdown |
| v0.2 | Explainable Entry Quality Score + regime gate wired | All 14 spec checklist items pass in 1-month backtest |
| v0.3 | Structural SL/TP replacement | SL placement validated on 50 paper trades |
| v0.4 | Trade Health Engine | THESIS_INVALIDATED closure working on Strategy Tester |
| v0.5 | Recovery State Machine | State transitions verified manually |
| v1.0 | Full 3-month OOS walk-forward, positive expectancy | PF > 1.0 on OOS data |