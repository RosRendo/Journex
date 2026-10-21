# Implementation Tasks: Institutional 3-View Architecture Overhaul

**Feature**: `006-three-view-workspace`  
**Plan**: [specs/006-three-view-workspace/plan.md](file:///d:/FOR%20RENDO%20(ONLY%20)/Personal%20Project/Dashboard/specs/006-three-view-workspace/plan.md)  
**Spec**: [specs/006-three-view-workspace/spec.md](file:///d:/FOR%20RENDO%20(ONLY%20)/Personal%20Project/Dashboard/specs/006-three-view-workspace/spec.md)  

---

## Phase 1: Setup (Shared Infrastructure & Types)

**Purpose**: Establish core TypeScript definitions, shared navigation, and stream adapters across all workspaces.

- [ ] T001 Define unified TypeScript interfaces (`TradeRecord`, `OpportunityAlert`, `AnalyticsPerformanceSummary`, `ChartWorkspaceState`) in `frontend/types/cockpit.ts`
- [ ] T002 Implement persistent top navigation cockpit with 3-view switcher tabs (`[ 📈 Chart ] [ 📓 Journal ] [ 📊 Analytics ]`) in `frontend/components/navigation/PersistentTopNav.tsx`
- [ ] T003 [P] Implement real-time opportunity alert stream hook in `frontend/hooks/useOpportunityStream.ts`

---

## Phase 2: Foundational (Blocking Prerequisites & Shared Components)

**Purpose**: Core UI components and state management that MUST be complete before user story routes are assembled.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [ ] T004 Implement compact Top Opportunity Ticker Ribbon (38px height, horizontal scrolling chips) in `frontend/components/dashboard/cockpit/OpportunityTickerRibbon.tsx`
- [ ] T005 [P] Implement Opportunity Deep Inspector slide-out peek drawer in `frontend/components/dashboard/cockpit/OpportunityRadarDrawer.tsx`
- [ ] T006 [P] Create centralized workspace context for active symbol, account selector, and global date range in `frontend/context/WorkspaceContext.tsx`
- [ ] T007 Remove the 400px mid-page Zone 3 `OpportunityRadar` card and redundant circular gauges from `frontend/app/dashboard/page.tsx`

**Checkpoint**: Foundation ready — user story implementation can now proceed.

---

## Phase 3: User Story 1 - TradingView-Style Interactive Charting (Priority: P1) 🎯 MVP

**Goal**: Deliver a dedicated, full-screen technical analysis charting workspace at `/terminal` with custom indicator overlays (POC, Asian Range, Judas Swing, Midnight Open) and collapsible rails.

**Independent Test**: Navigate to `http://localhost:3000/terminal`; verify the chart occupies >85% of viewport area without clutter cards, custom indicators toggle cleanly, drawing tools operate, and clicking a top opportunity chip stages entry/SL/TP levels.

### Implementation for User Story 1

- [ ] T008 [P] [US1] Build full-screen canvas layout with zero card clutter in `frontend/app/terminal/page.tsx`
- [ ] T009 [P] [US1] Implement custom Volume Profile overlay (developing POC, Virgin POC, Value Area VAH/VAL) in `frontend/components/terminal/indicators/VolumeProfileOverlay.tsx`
- [ ] T010 [P] [US1] Implement Asian Range & Judas Swing Killzone session overlay in `frontend/components/terminal/indicators/SessionKillzonesOverlay.tsx`
- [ ] T011 [US1] Implement timeframe selector (M1 to D1) and instant symbol switcher in `frontend/components/terminal/TerminalHeader.tsx`
- [ ] T012 [P] [US1] Build collapsible right-rail Watchlist dock in `frontend/components/terminal/CollapsibleWatchlist.tsx`
- [ ] T013 [P] [US1] Build collapsible bottom Execution & Positions drawer in `frontend/components/terminal/ExecutionDrawer.tsx`
- [ ] T014 [US1] Connect Opportunity Ticker click-to-stage action to auto-focus symbol and plot entry/SL/TP lines in `frontend/app/terminal/page.tsx`

**Checkpoint**: At this point, User Story 1 (TradingView Chart View) is fully functional and testable independently as the core MVP.

---

## Phase 4: User Story 2 - TradeZella-Style Performance Analytics Dashboard (Priority: P2)

**Goal**: Deliver an executive analytics cockpit at `/dashboard` featuring a clean 6-KPI row, interactive monthly P&L Calendar heatmap, setup performance matrix, and mistake dollar-cost tracker.

**Independent Test**: Navigate to `http://localhost:3000/dashboard`; verify the 6 KPI cards calculate correctly, monthly calendar displays bold green/red daily P&L figures, clicking any day isolates that day's trades in a drawer, and mistake dollar leakage is quantified.

### Implementation for User Story 2

- [ ] T015 [P] [US2] Implement Executive 6-KPI row (Net P&L, Win Rate %, Profit Factor, Expectancy, Avg Win/Loss, Max Drawdown) in `frontend/components/dashboard/tradezella/ExecutiveKpiCards.tsx`
- [ ] T016 [P] [US2] Implement TradeZella-style interactive Monthly P&L Calendar heatmap with daily dollar figures in `frontend/components/dashboard/tradezella/TradeZellaCalendar.tsx`
- [ ] T017 [P] [US2] Implement Setup & Playbook Performance Matrix in `frontend/components/dashboard/tradezella/SetupPerformanceMatrix.tsx`
- [ ] T018 [P] [US2] Implement Mistake & Psychology Dollar-Cost Tracker in `frontend/components/dashboard/tradezella/MistakeCostTracker.tsx`
- [ ] T019 [P] [US2] Implement interactive Cumulative Equity & Underwater Drawdown curves in `frontend/components/dashboard/tradezella/EquityDrawdownCurves.tsx`
- [ ] T020 [US2] Implement Day-Review slide-out peek drawer (triggered when clicking any calendar day) in `frontend/components/dashboard/tradezella/DayReviewDrawer.tsx`
- [ ] T021 [US2] Assemble pure TradeZella dashboard page layout in `frontend/app/dashboard/page.tsx`

**Checkpoint**: At this point, User Stories 1 AND 2 both work independently and integrate seamlessly.

---

## Phase 5: User Story 3 - Notion-Style Trading Journal & Multi-View Database (Priority: P3)

**Goal**: Deliver a structured, reflective trading journal at `/journal` with slide-over document pages, pre-trade checklists, markdown reflection notes, side-by-side Before/After screenshots, and 4 database views (Table, Board, Calendar, Gallery).

**Independent Test**: Navigate to `http://localhost:3000/journal`; verify switching between Table, Board, Calendar, and Gallery views, open a trade document to toggle checklist items, add reflection notes, and view screenshot lightbox.

### Implementation for User Story 3

- [ ] T022 [P] [US3] Build Notion slide-over trade document inspector with property badges in `frontend/components/journal/notion/NotionTradeDrawer.tsx`
- [ ] T023 [P] [US3] Implement interactive pre-trade & execution checklist block in `frontend/components/journal/notion/TradeChecklistBlock.tsx`
- [ ] T024 [P] [US3] Implement rich text reflection & notes block (Thesis, Execution, Lessons) in `frontend/components/journal/notion/TradeReflectionBlock.tsx`
- [ ] T025 [P] [US3] Implement side-by-side Before/After chart screenshot gallery with lightbox zoom in `frontend/components/journal/notion/TradeScreenshotsBlock.tsx`
- [ ] T026 [P] [US3] Implement 4-view database switcher (Table, Board, Calendar, Gallery) in `frontend/components/journal/notion/NotionViewSwitcher.tsx`
- [ ] T027 [P] [US3] Implement Kanban Board View (grouped by setup/outcome) in `frontend/components/journal/notion/NotionBoardView.tsx`
- [ ] T028 [P] [US3] Implement Screenshot Gallery View for pattern recognition in `frontend/components/journal/notion/NotionGalleryView.tsx`
- [ ] T029 [US3] Assemble full Notion-style journal page layout in `frontend/app/journal/page.tsx`

**Checkpoint**: All three user stories are now independently functional and fully decoupled.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Visual excellence, dark-mode institutional polish, and end-to-end responsiveness across the ecosystem.

- [ ] T030 [P] Standardize institutional dark-mode styling and smooth transitions in `frontend/app/globals.css`
- [ ] T031 [P] Ensure responsive viewport behavior and mobile drawer fallbacks across all 3 routes
- [ ] T032 Run full end-to-end validation scenarios documented in `specs/006-three-view-workspace/quickstart.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately.
- **Foundational (Phase 2)**: Depends on Setup completion — BLOCKS all user stories.
- **User Stories (Phase 3+)**: All depend on Foundational phase completion:
  - Phase 3 (US1 - TradingView Chart) 🎯 MVP
  - Phase 4 (US2 - TradeZella Dashboard)
  - Phase 5 (US3 - Notion Journal)
- **Polish (Phase 6)**: Depends on completion of all desired user stories.

### User Story Dependencies

- **User Story 1 (P1)**: Can start immediately after Phase 2 — zero dependencies on US2 or US3.
- **User Story 2 (P2)**: Can start after Phase 2 — operates on the shared trade dataset independently.
- **User Story 3 (P3)**: Can start after Phase 2 — utilizes the shared `TradeRecord` model independently.

---

## Parallel Execution Opportunities

```bash
# Parallel Launch for Setup & Types:
Task T001: "frontend/types/cockpit.ts"
Task T003: "frontend/hooks/useOpportunityStream.ts"

# Parallel Launch for Foundational Components:
Task T004: "frontend/components/dashboard/cockpit/OpportunityTickerRibbon.tsx"
Task T005: "frontend/components/dashboard/cockpit/OpportunityRadarDrawer.tsx"
Task T006: "frontend/context/WorkspaceContext.tsx"

# Parallel Launch for US1 (TradingView Charting):
Task T008: "frontend/app/terminal/page.tsx"
Task T009: "frontend/components/terminal/indicators/VolumeProfileOverlay.tsx"
Task T010: "frontend/components/terminal/indicators/SessionKillzonesOverlay.tsx"
Task T012: "frontend/components/terminal/CollapsibleWatchlist.tsx"
Task T013: "frontend/components/terminal/ExecutionDrawer.tsx"

# Parallel Launch for US2 (TradeZella Analytics):
Task T015: "frontend/components/dashboard/tradezella/ExecutiveKpiCards.tsx"
Task T016: "frontend/components/dashboard/tradezella/TradeZellaCalendar.tsx"
Task T017: "frontend/components/dashboard/tradezella/SetupPerformanceMatrix.tsx"
Task T018: "frontend/components/dashboard/tradezella/MistakeCostTracker.tsx"
Task T019: "frontend/components/dashboard/tradezella/EquityDrawdownCurves.tsx"

# Parallel Launch for US3 (Notion Journal):
Task T022: "frontend/components/journal/notion/NotionTradeDrawer.tsx"
Task T023: "frontend/components/journal/notion/TradeChecklistBlock.tsx"
Task T024: "frontend/components/journal/notion/TradeReflectionBlock.tsx"
Task T025: "frontend/components/journal/notion/TradeScreenshotsBlock.tsx"
Task T027: "frontend/components/journal/notion/NotionBoardView.tsx"
Task T028: "frontend/components/journal/notion/NotionGalleryView.tsx"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)
1. Complete **Phase 1: Setup** (T001–T003)
2. Complete **Phase 2: Foundational** (T004–T007) — removes the 400px card wall and mounts the 38px top ribbon.
3. Complete **Phase 3: User Story 1** (T008–T014) — delivers the full-screen TradingView chart.
4. **Validate MVP**: Test charting, indicator toggles, and opportunity staging independently.

### Incremental Delivery
1. Add **Phase 4: User Story 2** (T015–T021) — delivers TradeZella KPI cards, calendar heatmap, and mistake tracker.
2. Add **Phase 5: User Story 3** (T022–T029) — delivers Notion-style multi-view journal and document inspector.
3. Finish with **Phase 6: Polish** (T030–T032) — end-to-end responsiveness and quickstart verification.
