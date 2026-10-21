# Implementation Plan: AdaptiveICT Decision Engine Quality & Integrity Evaluation

**Branch**: `004-evaluate-decision-engine` | **Date**: 2026-09-28 | **Spec**: [specs/004-evaluate-decision-engine/spec.md](spec.md)

**Input**: Feature specification from `/specs/004-evaluate-decision-engine/spec.md`

---

## Summary

Conduct a rigorous quantitative audit and engineering enhancement of [`AdaptiveICT_DecisionEngine.pine`](file:///d:/FOR%20RENDO%20%28ONLY%20%29/Personal%20Project/Dashboard/mql5/AdaptiveICT/Indicators/AdaptiveICT_DecisionEngine.pine) to answer the user's inquiry (*"is it a good indicator?"*). 

The evaluation confirmed that while the indicator is architecturally advanced (scoring 8.5/10), it requires 3 critical upgrades:
1. **Eliminate HTF Lookahead Bias**: Replace unshifted `request.security` calls with strictly non-repainting historical shift wrappers (`close[1]` + `lookahead_on`).
2. **Correct HTF Moving Average Computation**: Compute HTF EMAs directly within the security context rather than sampling M5 calculations at HTF intervals.
3. **Establish 1:1 Parity with MQL5 EA Engine**: Align confluence scoring weights with the 10-component `EntryQualityEngine.mqh` (v0.50) and integrate a responsive Compact HUD mode with strict object memory cleanup.

---

## Technical Context

**Language/Version**: Pine Script v5 (TradingView) & MQL5 (MetaTrader 5)  
**Primary Dependencies**: TradingView Charting Library, MetaTrader 5 Terminal  
**Storage**: Pine Script in-memory `var` state tables & MQL5 analytical CSV logs (`MQL5/Files/`)  
**Testing**: TradingView Bar Replay Simulation across volatile sessions + MT5 Strategy Tester tick backtesting  
**Target Platform**: TradingView Web/Desktop & MetaTrader 5 (Windows x64)  
**Project Type**: Charting Indicator & Decision Intelligence HUD  
**Performance Goals**: < 500ms Pine Script compile time; 0 repainting signals in bar-replay; 0 platform limit exceptions  
**Constraints**: Platform ceilings: max 200 lines, 200 labels, 100 boxes; execution within standard Pine Script memory quotas  
**Scale/Scope**: 1,539 lines of Pine Script v5; 11 analytical modules; 34-row HUD table overlay  

---

## Constitution Check

*GATE: Passed prior to Phase 0 research. Re-evaluated post Phase 1 design.*

| Constitutional Principle | Requirement | Status | Justification / Verification |
| :--- | :--- | :--- | :--- |
| **I. Quantitative Rigor** | No ad-hoc guesswork; anti-loop rule | **PASS** | Gating setups by empirical multi-factor scoring (0-100) and strictly non-repainting confirmed bars. |
| **II. Capital Protection** | Hard Stop Loss + Volatility (ATR) | **PASS** | Every visualized signal enforces ATR-buffered structural stop loss with dynamic break-even progression. |
| **III. Stack Boundaries** | Clear separation between visual cockpit & EA | **PASS** | Pine Script acts as the visual decision-support twin to the automated MQL5 EA (`AdaptiveICT.mq5`). |
| **IV. High Aesthetic Standards** | Institutional cockpit UX; no low-effort clutters | **PASS** | Compact (8-row) and Full (34-row) HUD modes, color-coded status badges, and automatic stale object garbage collection. |

---

## Project Structure

### Documentation (this feature)

```text
specs/004-evaluate-decision-engine/
├── spec.md              # Feature specification
├── plan.md              # Implementation plan (this file)
├── research.md          # Phase 0: Anti-repainting & HTF sampling research
├── data-model.md        # Phase 1: Confluence scorecard & regime entities
├── contracts/
│   └── indicator-parity-contract.md # Schema mapping Pine Script to MQL5 EA
├── checklists/
│   └── requirements.md  # Specification quality checklist
├── quickstart.md        # Validation & bar-replay testing guide
└── tasks.md             # Phase 2 output (/speckit-tasks command)
```

### Source Code

```text
mql5/AdaptiveICT/Indicators/
├── AdaptiveICT_DecisionEngine.pine   # Active Pine Script v5 indicator
└── AdaptiveICT_DecisionEngine copy.pine # Backup baseline
mql5/AdaptiveICT/Core/
├── EntryQualityEngine.mqh            # MQL5 Confluence Scoring twin (10 components)
└── MarketRegimeGate.mqh              # MQL5 Regime Gating twin
```

---

## Complexity Tracking

*No constitutional violations identified. Design operates strictly within existing platform architectures.*
