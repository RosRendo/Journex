# Feature Specification: Enterprise Visual Dashboard & Live Journal Flow

**Feature Branch**: `007-enterprise-visual-dashboard`

**Created**: 2026-10-02

**Status**: Draft

**Input**: User description: "check everything it is all good as trading dashboard now i want to journal and i see the flow of journal and easy to use i want more visual on dashboard it has like that,what is your suggestion update enterprise so i could use it i have no idea what to add more"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Live Signals Radar on the Main Dashboard (Priority: P1)

As an active trader landing on the Dashboard, I want to immediately see top algorithmic trade setup signals (with confidence scores, entry zones, SL, TP, and confluence matrix) right next to my live account pulse, so that I can discover high-probability opportunities without switching between multiple tabs.

**Why this priority**: The Dashboard is the primary Decision OS. Currently, a trader sees past equity and balance but cannot see what to trade right now. Embedding the live setup scanner directly bridges the opportunity phase with the decision phase.

**Independent Test**: Can be fully tested by opening `/dashboard`, verifying that active institutional signals (e.g. XAUUSD BUY 95% A+, EURUSD BUY 75%) load dynamically, and clicking "Stage Order" opens the pre-populated order ticket.

**Acceptance Scenarios**:

1. **Given** a trader is on `/dashboard`, **When** the page loads, **Then** a dedicated "Live Signals Radar" widget displays active scanned setups sorted by confluence confidence with entry, SL, TP1, and TP2 levels.
2. **Given** an active signal card on the dashboard, **When** the trader clicks "Execute" or "Stage Order", **Then** the Order Ticket opens with symbol, direction, entry, SL, and TP automatically filled.
3. **Given** market conditions change, **When** new signals trigger on M5/M15, **Then** the radar updates automatically in real-time.

---

### User Story 2 - Visual Daily Journal & Mindset Stream on Dashboard (Priority: P1)

As a trader who wants disciplined daily review, I want to see today's journal reflection, mood badge (e.g. Disciplined, In The Zone, FOMO Tempted), execution grade, and a 1-click "Quick Journal" drawer directly on the dashboard, so that journaling becomes an effortless habit rather than a tedious chore.

**Why this priority**: Journaling is only useful if it is frictionless. Surfacing the daily reflection, mood state, and rule deviation cost on the main dashboard ensures the trader stays accountable before placing their next trade.

**Independent Test**: Can be fully tested by saving a daily reflection note on `/journal/day/[date]`, returning to `/dashboard`, and observing that today's reflection summary, mood pill, and grade appear prominently in the dashboard overview.

**Acceptance Scenarios**:

1. **Given** a trader has executed trades today, **When** they view `/dashboard`, **Then** a "Today's Journal & Mindset" card displays the current session grade, mood indicator, and plan adherence score.
2. **Given** a trader wants to log a thought immediately after a trade, **When** they click "Quick Note" on the dashboard, **Then** a slide-out drawer lets them record their emotion and rule checklist without navigating away.
3. **Given** a trader clicks on any day in the Dashboard Calendar, **When** the date is selected, **Then** it seamlessly opens the upgraded Daily Review page with the Intraday P&L curve and session breakdown.

---

### User Story 3 - Enterprise Bot Fleet Matrix & Circuit Breaker Telemetry (Priority: P2)

As an algorithmic and manual hybrid trader, I want an Enterprise Fleet overview on the dashboard showing all running MT5 EAs (Scalper, Breakout, Trend), today's automated P&L, and a global portfolio circuit breaker status (daily loss limit guard), so that I have total control over automated execution.

**Why this priority**: Elevates the platform from a retail hobby tool to an enterprise-grade prop desk with automated risk safeguards and fleet-level transparency.

**Independent Test**: Can be tested by viewing the Enterprise Bot Fleet section on `/dashboard`, verifying active EA status indicators, and confirming that the daily circuit breaker meter accurately reflects distance to the portfolio drawdown limit.

**Acceptance Scenarios**:

1. **Given** one or more automated EAs are running, **When** the trader views `/dashboard`, **Then** an EA Fleet widget shows active symbols, running trades, and today's automated P&L.
2. **Given** account drawdown approaches the user-configured daily safety threshold (e.g., 2.5%), **When** the circuit breaker warning fires, **Then** an emergency lockout banner is displayed with a 1-click Emergency Halt button.

---

### Edge Cases

- **Zero Trades on Current Date**: The Journal card should gracefully display an encouraging "Ready to trade / Capital strictly protected" state with a prompt to set pre-market intent.
- **Backend Signals Offline / Network Disconnected**: The Live Signals Radar should show an informative retry state without breaking the dashboard's balance and positions display.
- **Multiple Disconnected Broker Accounts**: The Enterprise Fleet widget should clearly flag which broker account is active and warn if any instance loses MT5 socket connection.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST render a "Live Signals Radar" widget on `/dashboard` fetching real-time algorithmic setups from `/api/terminal/signals`.
- **FR-002**: System MUST allow 1-click trade staging from any signal card on the dashboard directly into the execution order ticket.
- **FR-003**: System MUST display a "Daily Journal & Mindset" module on `/dashboard` showcasing today's mood tag, execution grade, plan adherence %, and reflection notes.
- **FR-004**: System MUST provide a quick-action drawer on `/dashboard` enabling instant trade reflection logging without page redirection.
- **FR-005**: System MUST link all dashboard calendar date clicks directly to `/journal/day/[date]`, displaying the Intraday P&L progression curve and session breakdown.
- **FR-006**: System MUST provide an Enterprise Bot Fleet status overview displaying running EA magic numbers, active symbols, and today's bot P&L.
- **FR-007**: System MUST display a visual Daily Circuit Breaker gauge representing current daily drawdown versus the hard safety limit.
- **FR-008**: System MUST maintain real-time sync with local browser storage and MT5 bridge telemetry for sub-second visual updates.

### Key Entities

- **TradeSignal**: Represents an algorithmic trade opportunity with symbol, direction, entry zone, SL, TP1, TP2, confidence score (0-100), and confluence reasoning.
- **DailyJournalSummary**: Represents the trader's daily psychological and operational state for a specific date, including mood, grade, market narrative, mistake tags, and rules for tomorrow.
- **BotFleetInstance**: Represents an active EA bot instance with magic number, target symbol, strategy regime, open trade count, and net session P&L.
- **CircuitBreakerState**: Represents the real-time capital protection limits, tracking current daily loss, maximum allowable drawdown ceiling, and emergency killswitch readiness.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A trader can discover an A+ setup signal and stage an order directly from `/dashboard` in under 3 clicks (under 5 seconds).
- **SC-002**: Daily journal reflection and mood state can be reviewed or recorded from the dashboard in under 10 seconds.
- **SC-003**: 100% of calendar day selections smoothly transition into the upgraded Daily Review page with complete intraday curve and session breakdown rendering.
- **SC-004**: The dashboard maintains zero layout shifts and loads all real-time widgets in under 1 second.
- **SC-005**: Platform user reports complete clarity on the visual flow from trade execution → journal reflection → performance analytics.

## Assumptions

- The user operates primarily on desktop and tablet viewport widths (minimum 1024px) for multi-column dashboard layouts.
- MT5 bridge and backend APIs remain accessible via `http://localhost:5000` or local network proxy.
- Existing CSV trade data and live MT5 bridge positions continue serving as the primary source of truth for historical and floating calculations.
