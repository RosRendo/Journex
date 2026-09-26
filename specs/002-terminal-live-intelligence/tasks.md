# Tasks: Terminal Live Intelligence & 5-Stage Cognitive Hierarchy

**Branch**: `002-terminal-live-intelligence`  
**Feature Spec**: [spec.md](file:///d:/FOR%20RENDO%20(ONLY%20)/Personal%20Project/Dashboard/specs/002-terminal-live-intelligence/spec.md)  
**Implementation Plan**: [plan.md](file:///d:/FOR%20RENDO%20(ONLY%20)/Personal%20Project/Dashboard/specs/002-terminal-live-intelligence/plan.md)  
**Contracts**: [contracts/terminal-api.yaml](file:///d:/FOR%20RENDO%20(ONLY%20)/Personal%20Project/Dashboard/specs/002-terminal-live-intelligence/contracts/terminal-api.yaml)  
**Data Model**: [data-model.md](file:///d:/FOR%20RENDO%20(ONLY%20)/Personal%20Project/Dashboard/specs/002-terminal-live-intelligence/data-model.md)  
**Quickstart**: [quickstart.md](file:///d:/FOR%20RENDO%20(ONLY%20)/Personal%20Project/Dashboard/specs/002-terminal-live-intelligence/quickstart.md)  

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Type definitions, route registration, and IPC bridge contracts.

- [ ] T001 Setup types file for terminal cognitive data entities in `frontend/types/terminalIntelligence.ts` matching `data-model.md` (`SignalHeroSnapshot`, `ConfluenceBreakdown`, `ChartStructuralLandmark`, `ExecutionReadinessGate`, `ActivePositionEntity`, `CapitalTelemetryStrip`)
- [ ] T002 [P] Create backend route scaffold for terminal intelligence endpoints in `backend/src/routes/terminalIntelligence.ts` matching `contracts/terminal-api.yaml`
- [ ] T003 [P] Register `/api/terminal/intelligence` router in `backend/src/index.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core real-time telemetry streaming and state distribution infrastructure.

- [ ] T004 Implement telemetry snapshot evaluator service in `backend/src/services/terminalIntelligenceService.ts` to compute or mock `SignalHeroSnapshot`, 6 weighted confluence criteria, and readiness gates
- [ ] T005 [P] Implement `useTerminalIntelligence` consolidated hook in `frontend/hooks/useTerminalIntelligence.ts` integrating WebSocket tick stream, snapshot REST fetch, and reactive state distribution with fallback 2-second polling
- [ ] T006 [P] Update `mt5_bridge.py` to serialize active setup confluence breakdown and structural markers in the IPC telemetry payload (`/terminal/snapshot`)

**Checkpoint**: Foundation ready — user story implementation can now begin.

---

## Phase 3: User Story 1 - "What's Now?": The Instant Signal Hero (Priority: P1) 🎯 MVP

**Goal**: Answer "Is there a trade right now?" within 2 seconds via a prominent `SignalHero.tsx` card displaying bias, score, grade, and targets or waiting rationale.

**Independent Test**: Load `/terminal` with active setup vs no valid setup. Confirm that when a setup exists, the Hero Card renders Bias, Confluence Score (0–100), Grade badge (`A+` to `F`), Entry, SL, TP1, and TP2. When no setup exists, confirm it displays `NO VALID SETUP` with waiting conditions list.

- [ ] T007 [P] [US1] Implement `GET /terminal/hero` endpoint in `backend/src/routes/terminalIntelligence.ts` returning `SignalHeroResponse` (`symbol`, `timeframe`, `state`, `signalType`, `confluenceScore`, `grade`, `entryPrice`, `slPrice`, `tp1Price`, `tp2Price`, `waitingReasons`)
- [ ] T008 [P] [US1] Create `frontend/components/terminal/SignalHero.tsx` rendering active setup vs `NO_VALID_SETUP` state with radial score gauge, grade badge, R:R ratio, and target prices
- [ ] T009 [US1] Implement audio chime and toast notification trigger in `frontend/components/terminal/SignalHero.tsx` on Grade A / A+ (`score >= 70`) per FR-011
- [ ] T010 [US1] Integrate `SignalHero.tsx` into the top hero section of `frontend/app/terminal/page.tsx` replacing cluttered legacy top widgets

**Checkpoint**: User Story 1 (MVP) is fully functional and independently testable.

---

## Phase 4: User Story 2 - "Why?": The Confluence & Warning Matrix (Priority: P2)

**Goal**: Expose transparent mathematical factor-by-factor scoring (6 weighted criteria = 100 max) and active risk warnings.

**Independent Test**: Click `[VIEW SETUP]` or inspect the Confluence Layer; verify 6 weighted progress bars sum accurately to total score, affirmative checkmarks render under "Why Valid", and amber risk badges display under "Active Warnings".

- [ ] T011 [P] [US2] Implement `GET /terminal/confluence-details` endpoint in `backend/src/routes/terminalIntelligence.ts` returning `ConfluenceBreakdownResponse` with 6 weighted sub-factors (Liquidity 20, Structure 20, FVG/OB 15, MTF 15, Momentum 15, Volume 10)
- [ ] T012 [P] [US2] Create `frontend/components/terminal/ConfluenceInspector.tsx` rendering 6 weighted criteria progress bars, affirmative "Why Valid" checks, and "Active Warnings" restriction chips
- [ ] T013 [US2] Integrate `ConfluenceInspector.tsx` into `frontend/app/terminal/page.tsx` directly beneath `SignalHero.tsx` with collapsible drawer toggle

**Checkpoint**: User Story 2 provides complete transparency behind signal logic.

---

## Phase 5: User Story 3 - "Where?": The Chart Structure Explanation Engine (Priority: P3)

**Goal**: Candlestick canvas visually annotates BOS, CHoCH, FVG boxes, Order Blocks, Liquidity sweep lines, and projected Entry/SL/TP levels at locked 60 FPS.

**Independent Test**: Load candlestick chart on XAUUSD; confirm semi-transparent FVG boxes, Order Block demand/supply zones, dashed liquidity sweep lines, BOS/CHoCH markers, and target levels update seamlessly without stuttering during pan/zoom.

- [ ] T014 [P] [US3] Create structural landmark coordinate calculator in `frontend/lib/chartLandmarks.ts` mapping price/timestamp landmarks to canvas pixel coordinates
- [ ] T015 [P] [US3] Create `frontend/components/terminal/ChartExplainer.tsx` SVG/Canvas landmark overlay rendering BOS, CHoCH, FVG zones, Order Blocks, and projected Entry/SL/TP levels
- [ ] T016 [US3] Integrate `ChartExplainer.tsx` into `frontend/components/terminal/Chart.tsx` and connect to `frontend/components/terminal/CenterPanel.tsx`

**Checkpoint**: User Story 3 transforms chart into an active explanation engine.

---

## Phase 6: User Story 4 - "Can I Trade?": The Execution Readiness Gate (Priority: P4)

**Goal**: Pre-flight binary safety audit (READY vs BLOCKED) + automatic 1.0% lot sizing enforcing Constitution Principle II.

**Independent Test**: Simulate upcoming news (<15 min) or spread spike (>25 pips); verify Gate switches to `BLOCKED`, highlights failure reason, disables execution, and recalculates exact 1.0% lot size when `READY`.

- [ ] T017 [P] [US4] Implement `GET /terminal/readiness` endpoint in `backend/src/routes/terminalIntelligence.ts` returning `ExecutionReadinessResponse` with binary status (READY vs BLOCKED) and 1.0% risk sizing per OpenAPI contract
- [ ] T018 [P] [US4] Create `frontend/components/terminal/ExecutionReadinessGate.tsx` auditing 7 safety gates (Market Open, Spread, Volatility, Regime, MTF, News, Liquidity) and displaying dynamic 1.0% calculated lot size
- [ ] T019 [US4] Integrate `ExecutionReadinessGate.tsx` into `frontend/app/terminal/page.tsx` directly above the execution trigger

**Checkpoint**: User Story 4 strictly prevents emotional or high-risk execution.

---

## Phase 7: User Story 5 - "Manage": Active Positions & Compact Capital Strip (Priority: P5)

**Goal**: Rapid position management (`[BE]`, `[Close 50%]`, emergency slide-to-confirm `[Close All]`), auxiliary drawer for legacy tools, and compact capital telemetry strip.

**Independent Test**: Execute order; test `[BE]`, `[Close 50%]`, and verify emergency `[Close All]` requires dragging the slide-to-confirm handle. Verify single-line capital strip renders without blocking screen.

- [ ] T020 [P] [US5] Implement `POST /terminal/positions/action` and `POST /terminal/positions/close-all` endpoints in `backend/src/routes/terminalIntelligence.ts`
- [ ] T021 [P] [US5] Create `frontend/components/terminal/CapitalTelemetryStrip.tsx` rendering compact single-line ribbon (`BALANCE $10,420 | EQUITY $10,380 | FLOATING -$40 | MARGIN 84% | DAILY P&L -0.4% | PING 12ms`)
- [ ] T022 [P] [US5] Create `frontend/components/terminal/AuxiliaryDrawer.tsx` slide-over panel housing secondary widgets (Heatmap, Tape Reader, Macro Calendar, Multi-chart comparison)
- [ ] T023 [US5] Create `frontend/components/terminal/ExecutionManagementBar.tsx` with 1-click execution actions, position table (`[BE]`, `[Close 50%]`), and slide-to-confirm emergency `[Close All]`
- [ ] T024 [US5] Wire 1-Click execution toggle into `frontend/components/terminal/TerminalHeader.tsx` and integrate `ExecutionManagementBar.tsx`, `CapitalTelemetryStrip.tsx`, and `AuxiliaryDrawer.tsx` into `frontend/app/terminal/page.tsx`

**Checkpoint**: All 5 stages of the cognitive hierarchy and auxiliary drawer are fully operational.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: High-fidelity institutional styling, latency validation, and cleanup.

- [ ] T025 [P] Add CSS glassmorphic glow effects, dark institutional theme variables, and micro-transitions in `frontend/app/globals.css`
- [ ] T026 Verify end-to-end telemetry pipeline latency < 800ms and execute validation scenarios from `specs/002-terminal-live-intelligence/quickstart.md`
- [ ] T027 [P] Clean up deprecated standalone widgets and verify zero broken imports across `frontend/components/terminal/`

---

## Dependencies & Execution Order

### Phase Dependencies
- **Setup (Phase 1)**: Can start immediately.
- **Foundational (Phase 2)**: Depends on Setup completion — BLOCKS all user stories.
- **User Stories (Phases 3–7)**: Can proceed sequentially in priority order (P1 $\rightarrow$ P2 $\rightarrow$ P3 $\rightarrow$ P4 $\rightarrow$ P5) or in parallel once Foundational completes.
- **Polish (Phase 8)**: Depends on all user stories being completed.

### User Story Dependencies
- **US1 (P1)**: Depends only on Foundational. Delivers core MVP.
- **US2 (P2)**: Extends US1 with deep factor breakdown.
- **US3 (P3)**: Enhances chart rendering with visual landmarks.
- **US4 (P4)**: Connects readiness audit and lot sizing before execution.
- **US5 (P5)**: Provides trade management, emergency liquidation, and auxiliary drawer.

### Parallel Opportunities
- T002, T003 in Phase 1 can run in parallel.
- T005, T006 in Phase 2 can run in parallel.
- Within each story, backend endpoints [P] and frontend components [P] can be developed in parallel.
- Polish tasks T025 and T027 can run in parallel.

---

## Parallel Example: User Story 1 (MVP)

```bash
# Launch backend endpoint and UI component in parallel:
Task: "Implement GET /terminal/hero in backend/src/routes/terminalIntelligence.ts"
Task: "Create SignalHero.tsx in frontend/components/terminal/SignalHero.tsx"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)
1. Complete Phase 1: Setup (`terminalIntelligence.ts` types, route scaffold).
2. Complete Phase 2: Foundational (evaluator service, `useTerminalIntelligence` hook).
3. Complete Phase 3: User Story 1 (`SignalHero.tsx` + `/terminal/hero`).
4. **STOP and VALIDATE**: Verify Hero Card on `/terminal` renders setup status within 2 seconds.

### Incremental Delivery
1. Setup + Foundational $\rightarrow$ Foundation Ready.
2. US1 $\rightarrow$ Trader knows "What's Now?" (MVP).
3. US2 $\rightarrow$ Trader knows "Why?" (Confluence Breakdown).
4. US3 $\rightarrow$ Trader sees "Where?" (Chart Landmarks).
5. US4 $\rightarrow$ Trader knows "Can I Trade?" (Readiness Gate & Lot Size).
6. US5 $\rightarrow$ Trader manages trades & has auxiliary tools in drawer.
7. Polish $\rightarrow$ Institutional dark glassmorphic styling & sub-800ms validation.
