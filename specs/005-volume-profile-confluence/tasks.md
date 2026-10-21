# Tasks: Point of Control (POC) & Institutional Confluence Engine

**Feature**: `005-volume-profile-confluence`  
**Plan**: [plan.md](plan.md) | **Spec**: [spec.md](spec.md)  
**Target File**: [`mql5/AdaptiveICT/Indicators/AdaptiveICT_DecisionEngine.pine`](file:///d:/FOR%20RENDO%20%28ONLY%20%29/Personal%20Project/Dashboard/mql5/AdaptiveICT/Indicators/AdaptiveICT_DecisionEngine.pine)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Safeguard baseline codebase and prepare upgrade structure.

- [X] T001 Create backup copy of baseline Pine Script file: duplicate `mql5/AdaptiveICT/Indicators/AdaptiveICT_DecisionEngine.pine` to `mql5/AdaptiveICT/Indicators/AdaptiveICT_DecisionEngine.v2.backup.pine`
- [X] T002 Update version header in `mql5/AdaptiveICT/Indicators/AdaptiveICT_DecisionEngine.pine` to version 2.10 with changelog block documenting Volume Profile POC, vPOC forward projection, Asian Judas Swings, CVD Absorption, and SMT Radar

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Input parameters and persistent arrays required by all subsequent modules.

⚠️ **CRITICAL**: No user story work can begin until this phase is complete.

- [X] T003 Add configurable input group `"=== Volume Profile & Institutional Benchmarks ==="` in `mql5/AdaptiveICT/Indicators/AdaptiveICT_DecisionEngine.pine`: `show_session_vp`, `show_vpoc`, `show_asian_range`, `show_midnight_open`, `show_cvd_divergence`, `show_smt_radar`, `smt_symbol` (default "PEPPERSTONE:XAGUSD")
- [X] T004 Declare persistent data structures in `mql5/AdaptiveICT/Indicators/AdaptiveICT_DecisionEngine.pine`: `var float[] virgin_pocs` (constraint: `"max_active_vpocs: 3"`), `var line[] virgin_poc_lines`, `var label[] virgin_poc_labels`, and daily reset tracker `is_new_day = ta.change(time("D")) != 0`

**Checkpoint**: Foundational inputs and arrays ready. User story implementation can begin.

---

## Phase 3: User Story 1 — Volume Profile POC & Value Area Rotation (Priority: P1) 🎯 MVP

**Goal**: Render intraday Developing POC and 70% Value Area (VAH/VAL) with 20 dynamic bins, project up to 3 untested Virgin POCs with dynamic touch-termination, and track Market Profile 80% Rule rotations.

**Independent Test**: Load script on XAUUSD M5; verify daily developing POC adjusts dynamically with volume, vPOC lines terminate with `"vPOC Mitigated"` when touched, and 80% Rule triggers on 2 consecutive closes inside Value Area.

- [X] T005 [US1] Implement `calcSessionVolumeProfile()` in `mql5/AdaptiveICT/Indicators/AdaptiveICT_DecisionEngine.pine`: resets daily on `ta.change(time("D"))`, computes verbatim constraint `"bin_count: fixed at 20 bins per daily range"`, calculates 70% Value Area (`total_vol * 0.70`), and returns `[dev_poc, dev_vah, dev_val]`
- [X] T006 [US1] Implement Virgin POC registry and forward projection in `mql5/AdaptiveICT/Indicators/AdaptiveICT_DecisionEngine.pine`: on session rollover, adds yesterday's final POC to `virgin_pocs` with constraint `"max_active_vpocs: 3"`, drawing horizontal projection lines
- [X] T007 [US1] Implement dynamic touch-termination in `mql5/AdaptiveICT/Indicators/AdaptiveICT_DecisionEngine.pine`: on every bar, evaluates verbatim constraint `"vpoc_mitigation_rule: high >= vpoc_price and low <= vpoc_price"`, truncates line at current bar, and attaches `"vPOC Mitigated"` label
- [X] T008 [US1] Implement Market Profile 80% Rule state tracker in `mql5/AdaptiveICT/Indicators/AdaptiveICT_DecisionEngine.pine`: tracks state transition when price opens outside VAH/VAL and achieves verbatim constraint `"two consecutive bar closes back inside"`, targeting developing POC and opposite VA boundary
- [X] T009 [US1] Add alert conditions for Virgin POC touch and 80% Rule re-entry in `mql5/AdaptiveICT/Indicators/AdaptiveICT_DecisionEngine.pine`: `alertcondition(vpoc_touched, "🎯 Virgin POC Mitigated — AdaptiveICT", ...)` and `alertcondition(va_80_rule_active, "📊 Value Area 80% Rule Rotation — AdaptiveICT", ...)`
- [X] T010 [US1] Validate User Story 1 in TradingView Bar Replay per `specs/005-volume-profile-confluence/quickstart.md` (Step 2 and Step 3)

**Checkpoint**: User Story 1 complete. Developing POC, Virgin POC engine, and 80% Value Area rotation fully active.

---

## Phase 4: User Story 2 — Institutional Time Benchmarks & Asian Range Liquidity (Priority: P2)

**Goal**: Automatically map Asian Session Range (00:00–08:00 UTC) and NY Midnight Open (00:00 EST / 04:00 UTC) to identify London Judas Swings and establish Daily Premium/Discount.

**Independent Test**: Monitor London Open (08:00 UTC); verify that sweeps of Asian High/Low trigger `"Judas Swing"` indicators, and NY Midnight Open plots across the session.

- [X] T011 [US2] Implement Asian Range detector in `mql5/AdaptiveICT/Indicators/AdaptiveICT_DecisionEngine.pine`: tracks High & Low during verbatim window `"00:00 – 08:00 UTC"`, locks levels at 08:00 UTC, and draws horizontal reference boundary box/lines
- [X] T012 [US2] Implement Judas Swing liquidity sweep detector in `mql5/AdaptiveICT/Indicators/AdaptiveICT_DecisionEngine.pine`: detects when London Open (08:00–11:00 UTC) pierces Asian High/Low and closes back inside with structure shift, flagging `Asian High Swept` or `Asian Low Swept`
- [X] T013 [US2] Implement New York Midnight Open benchmark in `mql5/AdaptiveICT/Indicators/AdaptiveICT_DecisionEngine.pine`: captures candle open at verbatim time `"00:00 EST / 04:00 UTC"`, plots horizontal benchmark line across session, and classifies market into Daily Discount (< Midnight Open) vs Daily Premium (> Midnight Open)
- [X] T014 [US2] Add alert condition for Judas Swing sweep in `mql5/AdaptiveICT/Indicators/AdaptiveICT_DecisionEngine.pine`: `alertcondition(judas_swing_detected, "⚡ Judas Swing Liquidity Sweep — AdaptiveICT", ...)`
- [X] T015 [US2] Validate User Story 2 in TradingView Bar Replay per `specs/005-volume-profile-confluence/quickstart.md` (Step 4)

**Checkpoint**: User Stories 1 and 2 complete. Volume distribution and institutional time benchmarks aligned.

---

## Phase 5: User Story 3 — Volume Delta Absorption & CVD Divergence at POC (Priority: P3)

**Goal**: Calculate Cumulative Volume Delta (CVD) to identify institutional absorption at key POC and Value Area turning points.

**Independent Test**: Observe swing extremes at POC; verify that price lower-low with CVD higher-low displays `"Bullish CVD Absorption"`, and price higher-high with CVD lower-high displays `"Bearish CVD Absorption"`.

- [X] T016 [US3] Implement Cumulative Volume Delta (CVD) calculator in `mql5/AdaptiveICT/Indicators/AdaptiveICT_DecisionEngine.pine`: computes bar delta volume based on intra-candle price action (`close > open ? vol : -vol` with wick adjustments) and accumulates session CVD
- [X] T017 [US3] Implement CVD swing divergence detector at POC / Value Area levels in `mql5/AdaptiveICT/Indicators/AdaptiveICT_DecisionEngine.pine`: identifies when price prints lower swing low while CVD prints higher swing low near POC/VAL (Bullish Absorption), or price prints higher swing high while CVD prints lower swing high near POC/VAH (Bearish Absorption)
- [X] T018 [US3] Add visual CVD absorption markers and structural stop-loss anchor badge in `mql5/AdaptiveICT/Indicators/AdaptiveICT_DecisionEngine.pine`

**Checkpoint**: User Stories 1, 2, and 3 complete. Order flow absorption at volume nodes visually validated.

---

## Phase 6: User Story 4 — Multi-Asset SMT Divergence Radar (Priority: P4)

**Goal**: Cross-reference correlated benchmark assets (e.g. XAUUSD vs XAGUSD or EURUSD vs DXY) to detect Smart Money Tool (SMT) divergence.

**Independent Test**: Load XAUUSD on M5; simulate or observe XAUUSD making a higher high while benchmark XAGUSD makes a lower high; verify `"Bearish SMT Divergence"` appears.

- [X] T019 [US4] Implement correlated asset security fetcher using `f_security_nonrepaint()` in `mql5/AdaptiveICT/Indicators/AdaptiveICT_DecisionEngine.pine`: safely fetches `high[1]`, `low[1]`, `close[1]` for `smt_symbol` without repainting
- [X] T020 [US4] Implement SMT Divergence swing comparative logic in `mql5/AdaptiveICT/Indicators/AdaptiveICT_DecisionEngine.pine`: compares swing high/low pivots between current symbol and benchmark to detect institutional accumulation/distribution decoupling
- [X] T021 [US4] Add SMT divergence status badge to chart overlay and HUD in `mql5/AdaptiveICT/Indicators/AdaptiveICT_DecisionEngine.pine`

**Checkpoint**: All user stories functional. Comprehensive multi-asset institutional intelligence active.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Confluence Scorecard aggregation, HUD telemetry updates, strict drawing memory cleanup, Obsidian Brain Sync, and compile verification.

- [X] T022 Integrate institutional confluence points into `calcDecisionScore()` in `mql5/AdaptiveICT/Indicators/AdaptiveICT_DecisionEngine.pine`: award +5 pts for POC/vPOC bounce, +5 pts for Asian Judas sweep / 80% Rule, and +5 pts for SMT divergence (verbatim constraint: capped at +10 pts max institutional bonus, total score clamped to 100)
- [X] T023 Update Compact and Full HUD telemetry panels in `mql5/AdaptiveICT/Indicators/AdaptiveICT_DecisionEngine.pine`: add rows for `Developing POC`, `Virgin POCs Active`, `Asian Range Bias`, and `SMT Radar`
- [X] T024 Enforce strict drawing garbage collection in `mql5/AdaptiveICT/Indicators/AdaptiveICT_DecisionEngine.pine`: ensure old vPOC lines, Asian boxes, and labels are pruned to maintain active drawing object count strictly under 100 (well within TradingView's 200 ceiling)
- [X] T025 Sync architectural decision record to Obsidian vault via Python bridge at `D:\AI\Obsidian\AI_Brain_Sync\POC_Institutional_Confluence_v2.1.md`
- [X] T026 Run TradingView Pine Script syntax and compile verification script to ensure 0 errors and 0 warnings

---

## Dependencies & Execution Order

```text
Phase 1 (Setup) ──► Phase 2 (Foundational)
                          │
       ┌──────────────────┼──────────────────┬──────────────────┐
       ▼                  ▼                  ▼                  ▼
Phase 3 (US1: P1)   Phase 4 (US2: P2)   Phase 5 (US3: P3)   Phase 6 (US4: P4)
  [Session POC/vPOC]  [Asian/NY Midnight] [CVD Absorption]    [SMT Radar]
       │                  │                  │                  │
       └──────────────────┴────────┬─────────┴──────────────────┘
                                   ▼
                            Phase 7 (Polish)
                     [Scorecard, HUD, GC, Sync, Audit]
```

### User Story Dependencies

- **User Story 1 (P1)**: Can start immediately after Foundational (Phase 2) — No dependencies on other stories. Delivers standalone MVP value.
- **User Story 2 (P2)**: Can start after Foundational (Phase 2) — Independent time benchmark logic.
- **User Story 3 (P3)**: Depends on US1 (requires POC / Value Area levels to detect volume node delta absorption).
- **User Story 4 (P4)**: Can start after Foundational (Phase 2) — Independent correlated asset security fetcher.
- **Polish (Phase 7)**: Depends on completion of stories to integrate their outputs into the unified Decision Scorecard and HUD telemetry.

---

## Parallel Execution Opportunities

- **Phase 1 & 2**: T001 and T002 can be prepared sequentially; T003 and T004 can be implemented together in inputs and declarations.
- **Phase 3 & 4 & 6**: US1 (Volume Profile), US2 (Asian Time Benchmarks), and US4 (SMT Security Fetcher) operate on distinct mathematical routines and can be authored independently.
- **Phase 5**: US3 (CVD Divergence) integrates directly once US1 POC levels are established.

---

## Implementation Strategy

### MVP First (User Story 1 Only)
1. Complete Phase 1: Setup (`T001`–`T002`).
2. Complete Phase 2: Foundational (`T003`–`T004`).
3. Complete Phase 3: User Story 1 (`T005`–`T010`).
4. **STOP and VALIDATE**: Test User Story 1 independently in TradingView Bar Replay — dynamic POC, 70% Value Area, and vPOC touch-termination verified.

### Incremental Delivery
1. Foundation + US1 (MVP) ➔ Active intraday volume profile & virgin POC magnets.
2. Add US2 ➔ Asian Judas Swings & NY Midnight Open benchmarks.
3. Add US3 ➔ Institutional CVD delta absorption at key volume nodes.
4. Add US4 ➔ Multi-Asset SMT Divergence radar.
5. Phase 7 Polish ➔ Scorecard aggregation (+10 institutional bonus), HUD telemetry, memory garbage collection, and Obsidian Brain Sync.
