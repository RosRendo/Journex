# Implementation Plan: Point of Control (POC) & Institutional Confluence Engine

**Branch**: `005-volume-profile-confluence` | **Date**: 2026-09-28 | **Spec**: [specs/005-volume-profile-confluence/spec.md](spec.md)

**Input**: Feature specification from `/specs/005-volume-profile-confluence/spec.md`

---

## Summary

Incorporate institutional **Point of Control (POC)** and high-probability time benchmarks into `AdaptiveICT_DecisionEngine.pine` to allow traders to identify high-edge setups across all market sessions:
1. **Developing Daily Volume Profile**: Real-time POC and 70% Value Area (VAH/VAL) calculated from daily session volume.
2. **Virgin POC (vPOC) Engine**: Forward projection of up to 3 untested prior session POCs with dynamic touch-termination.
3. **Asian Session Judas Swing Radar**: Tracking Asian Range High/Low (00:00–08:00 UTC) with automatic alerts when London Open engineers a liquidity run.
4. **New York Midnight Open**: Institutional True Day Open benchmark for Discount (< Open) vs Premium (> Open) evaluation.
5. **Confluence Scorecard Integration**: Up to +10 bonus points awarded when setups align with institutional volume and time levels.

---

## Technical Context

**Language/Version**: Pine Script v5 (TradingView) & MQL5 (MetaTrader 5)  
**Primary Dependencies**: TradingView Charting Engine, MetaTrader 5 Terminal  
**Storage**: In-memory Pine Script `var` arrays for Virgin POC tracking  
**Testing**: TradingView Bar Replay across London and New York session killzones  
**Target Platform**: TradingView Web/Desktop & MetaTrader 5  
**Performance Goals**: Session volume profile calculated in < 15ms; max active drawing objects strictly bounded < 100  
**Constraints**: Zero repainting; strictly confirmed bar calculations; strict garbage collection on mitigated levels  
**Scale/Scope**: ~180 lines of specialized volume and time logic integrated into `AdaptiveICT_DecisionEngine.pine`  

---

## Constitution Check

*GATE: Passed prior to Phase 0 research. Re-evaluated post Phase 1 design.*

| Constitutional Principle | Requirement | Status | Justification / Verification |
| :--- | :--- | :--- | :--- |
| **I. Quantitative Rigor** | No ad-hoc guesswork; anti-loop rule | **PASS** | POC and Value Area represent mathematically verified volume distribution, not lagging indicator lines. |
| **II. Capital Protection** | Hard Stop Loss + Volatility (ATR) | **PASS** | Every entry setup anchors stop loss behind absorption wicks or structural POC boundaries. |
| **III. Stack Boundaries** | Clear separation between visual cockpit & EA | **PASS** | Visual alerts and HUD displays run on TradingView; execution rules mirror MQL5 architecture. |
| **IV. High Aesthetic Standards** | Institutional cockpit UX; no low-effort clutter | **PASS** | Clean horizontal dashed levels with automatic termination on touch; configurable display toggles. |

---

## Project Structure

### Documentation (this feature)

```text
specs/005-volume-profile-confluence/
├── spec.md              # Feature specification
├── plan.md              # Implementation plan (this file)
├── research.md          # Phase 0: Developing POC, vPOC, and Judas Swing research
├── data-model.md        # Phase 1: Volume Profile & Time Benchmark data models
├── contracts/
│   └── poc-confluence-contract.md # Interface contract & scoring weights
├── checklists/
│   └── requirements.md  # Specification quality checklist
├── quickstart.md        # Validation & bar-replay testing guide
└── tasks.md             # Phase 2 output (/speckit-tasks command)
```

### Source Code

```text
mql5/AdaptiveICT/Indicators/
└── AdaptiveICT_DecisionEngine.pine   # Core Pine Script indicator
mql5/AdaptiveICT/Core/
├── EntryQualityEngine.mqh            # MQL5 Confluence Scoring twin
└── MarketRegimeGate.mqh              # MQL5 Regime Gating twin
```

---

## Complexity Tracking

*No constitutional violations identified. Enhancements extend existing modular components.*
