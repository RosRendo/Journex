# Implementation Plan: Institutional 3-View Architecture Overhaul

**Branch**: `006-three-view-workspace` | **Date**: 2026-10-02 | **Spec**: [specs/006-three-view-workspace/spec.md](file:///d:/FOR%20RENDO%20(ONLY%20)/Personal%20Project/Dashboard/specs/006-three-view-workspace/spec.md)

**Input**: Feature specification from `specs/006-three-view-workspace/spec.md`

---

## Summary

Decouple the existing 1,740+ line monolithic dashboard into three dedicated institutional workspaces (TradingView Chart at `/terminal`, Notion-Style Multi-View Journal at `/journal`, and TradeZella Performance Analytics Cockpit at `/dashboard`), complemented by a compact top Opportunity Radar Ticker Ribbon (~38px) that eliminates the heavy 400px mid-page card wall.

---

## Technical Context

**Language/Version**: TypeScript 5.x, JavaScript (ES2022+), React 18, Next.js 14+ (App Router)  
**Primary Dependencies**: TailwindCSS, Vanilla CSS, Framer Motion, Lucide React, Recharts, Sonner (Toasts)  
**Storage**: SQLite (`ea_analytics.db`) / PostgreSQL with Express backend API; LocalStorage for UI preference caching  
**Testing**: End-to-end browser walkthrough, Next.js type-checking (`tsc --noEmit`), and API contract validation  
**Target Platform**: Modern desktop web browsers (Chrome, Edge, Firefox, Safari) with responsive ultra-wide and tablet support  
**Project Type**: Web Application Cockpit (Frontend Next.js App Router + Node.js Backend API + MT5 Python Bridge)  
**Performance Goals**: <300ms route transitions, 60fps charting interactions, zero layout shifts on drawer open  
**Constraints**: Zero breaking changes to existing MT5 telemetry ingestion (`mt5_bridge.py`) or database schemas  
**Scale/Scope**: 3 core pages (`/terminal`, `/journal`, `/dashboard`), 1 persistent top navigation header with opportunity ticker, 4 journal view modes, 1 interactive calendar heatmap  

---

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Requirement | Assessment | Result |
| :--- | :--- | :--- | :--- |
| **I. Quantitative Rigor Over Guesswork** | Analytics must compute mathematically verified metrics (Win Rate, Profit Factor, Expectancy, Drawdown). | TradeZella analytics module computes verified trade metrics from closed trades. | **PASS** |
| **II. Capital Protection & Hard Risk Limits** | Display risk limits, drawdown circuit breakers, and R:R ratios prominently. | Journal checklists and dashboard KPI cards enforce $\le$ 1.0% risk and drawdown tracking. | **PASS** |
| **III. Stack Boundaries** | Frontend in Next.js/React/TypeScript, Backend in Node.js, EA in MQL5, Telemetry in Python. | Strict architectural boundaries preserved; no stack bleed. | **PASS** |
| **IV. Non-Destructive Evolution & High Aesthetics** | High visual aesthetics, zero low-effort placeholders, no breaking existing chart/journal logic. | Replaces clutter with institutional dark-mode design, glassmorphism, and responsive drawers. | **PASS** |

---

## Project Structure

### Documentation (this feature)

```text
specs/006-three-view-workspace/
├── spec.md              # Feature specification & problem diagnosis
├── plan.md              # Implementation plan (this file)
├── research.md          # Architectural decisions & component trade-offs
├── data-model.md        # Schemas for TradeRecord, OpportunityAlert, Analytics
├── quickstart.md        # Step-by-step runnable validation scenarios
├── contracts/
│   ├── ui-contracts.md  # UI component props & interaction contracts
│   └── api-contracts.md # REST API payloads & query parameters
└── checklists/
    └── requirements.md  # Specification quality checklist
```

### Source Code (Concrete Layout)

```text
frontend/
├── app/
│   ├── dashboard/
│   │   └── page.tsx                         # Refactored: Pure TradeZella Analytics Cockpit
│   ├── journal/
│   │   └── page.tsx                         # Refactored: Notion-Style Multi-View Journal
│   └── terminal/
│       └── page.tsx                         # Refactored: Unobstructed TradingView Chart
├── components/
│   ├── navigation/
│   │   └── PersistentTopNav.tsx             # Shared top navigation with view switcher
│   ├── dashboard/
│   │   ├── cockpit/
│   │   │   ├── OpportunityTickerRibbon.tsx  # NEW: Pinned 38px top opportunity ribbon
│   │   │   ├── OpportunityRadarDrawer.tsx   # NEW: Slide-out deep factor inspector
│   │   │   └── CockpitChart.tsx             # Upgraded TradingView container
│   │   └── tradezella/
│   │       ├── ExecutiveKpiCards.tsx        # 6 clean metric summary cards
│   │       ├── TradeZellaCalendar.tsx       # Interactive monthly P&L heatmap
│   │       ├── SetupPerformanceMatrix.tsx   # Setup edge breakdown
│   │       └── MistakeCostTracker.tsx       # Dollar cost of psychological leaks
│   └── journal/
│       ├── NotionTradeDrawer.tsx            # Slide-over document page with checklists & notes
│       ├── NotionTableView.tsx              # Multi-column sortable table
│       ├── NotionBoardView.tsx              # Kanban board grouped by setup/outcome
│       ├── NotionCalendarView.tsx           # Monthly trade pill grid
│       └── NotionGalleryView.tsx            # Screenshot thumbnail gallery
```

---

## Complexity Tracking

| Component | Why Needed | Simpler Alternative Rejected Because |
| :--- | :--- | :--- |
| **Top Opportunity Ticker Ribbon** | Pinned 38px horizontal ribbon | Squeezing a 400px card into Zone 3 caused massive screen clutter and layout disruption. |
| **4-View Notion Database Switcher** | Table, Board, Calendar, Gallery | Single flat table failed to give traders visual pattern recognition and setup categorization. |
| **Slide-Out Peek Drawers** | Non-modal drawers for radar & trade review | Full-page navigation interrupts charting and causes jarring page reloads. |
