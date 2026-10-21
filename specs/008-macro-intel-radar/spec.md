# Feature Specification: Macro Intelligence & Data Sentiment Radar

**Feature Branch**: `008-macro-intel-radar`

**Created**: 2026-10-02

**Status**: Draft

**Input**: User description: "check macro/xauusd what need to add more your suggestion pls"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - AI Macro Trend & Global News Synthesizer (Priority: P1)

As a gold and currency trader on `/macro/XAUUSD`, I want an automated AI Macro Intelligence Synthesizer that evaluates real-time global news headlines (central bank policy, inflation data, geopolitical risk) into a unified macro directional thesis (e.g. "Bullish Expansion 88% Confidence"), so that I can instantly understand the macro tailwinds behind gold without reading dozens of raw articles.

**Why this priority**: Gold and majors are fundamentally driven by macroeconomic catalysts. Providing an executive AI synthesis transforms raw headline noise into actionable directional confidence.

**Independent Test**: Can be tested by opening `/macro/XAUUSD`, viewing the Macro Intel panel, and verifying that the AI Macro Trend Badge, 2-sentence market thesis, and catalyst breakdown render dynamically based on current market context.

**Acceptance Scenarios**:

1. **Given** a trader is analyzing XAUUSD on `/macro/XAUUSD`, **When** the Macro Intel tab loads, **Then** an AI Macro Thesis displays directional bias (BULLISH / BEARISH / NEUTRAL), confidence percentage, and core macroeconomic drivers.
2. **Given** global news headlines update, **When** new catalysts arrive, **Then** the synthesis updates the Bullish vs. Bearish factor list with key invalidation price levels.

---

### User Story 2 - Retail vs. Smart Money Data Sentiment & Contrarian Gauge (Priority: P1)

As a trader looking for high-probability reversals and continuation entries, I want to see a visual Data Sentiment Gauge comparing retail crowd positioning (e.g. 74% Short) against institutional flow, so that I can exploit contrarian short-squeeze setups when retail is heavily trapped.

**Why this priority**: 70-80% of retail traders are on the losing side of major gold trends. Visualizing crowd positioning gives the trader a distinct contrarian edge for identifying liquidity pools and squeeze targets.

**Independent Test**: Can be tested by inspecting the Data Sentiment widget on `/macro/XAUUSD`, verifying that the visual arc gauge and retail long/short split bar render with a clear contrarian signal badge (e.g. "Bullish Contrarian Squeeze Edge").

**Acceptance Scenarios**:

1. **Given** retail positioning on Gold is skewed (e.g. >65% short), **When** the trader views the sentiment module, **Then** a visual horizontal bar displays the crowd ratio with a highlighted "Contrarian Squeeze Alert".
2. **Given** market sentiment shifts towards extreme greed or extreme fear, **When** the gauge crosses threshold levels (e.g. >70 or <30), **Then** visual color indicators alert the trader to impending trend exhaustion.

---

### User Story 3 - Intermarket Macro Pressure Barometer (DXY, US10Y, VIX) (Priority: P2)

As an institutional macro trader, I want live intermarket pressure dials tracking the US Dollar Index (DXY), US 10-Year Treasury Yields (US10Y), and Volatility (VIX) alongside gold price action, so that I know whether the broader macro environment supports my trade.

**Why this priority**: Gold holds strong historical inverse correlation with the US Dollar and real bond yields. An intermarket barometer ensures trades are never placed against strong dollar rallies or bond yield surges.

**Independent Test**: Can be tested by viewing the Intermarket Pressure Barometer in the Macro Hub, checking that real-time readings for DXY, US10Y, and Safe-Haven Demand display clear tailwind/headwind status badges.

**Acceptance Scenarios**:

1. **Given** DXY is dropping and US 10Y Yields are falling, **When** the trader views XAUUSD, **Then** the barometer displays a "🟢 Double Macro Tailwind (+85/100)" badge.
2. **Given** DXY experiences a sharp spike, **When** dollar momentum turns strongly positive, **Then** the barometer warns of "🔴 Macro Headwind (Strong USD Pressure)".

---

### User Story 4 - Economic Catalyst Timeline & Volatility Embargo Warning (Priority: P2)

As a risk-conscious trader, I want a visual countdown timer for upcoming high-impact economic releases (CPI, NFP, FOMC) displayed directly on the macro workstation, so that I avoid entering trades immediately before high-slippage economic releases.

**Why this priority**: Slippage during major news releases can invalidate technical stop losses. A visual embargo window protects trader capital from unpredictable spreads.

**Independent Test**: Can be tested by simulating or observing high-impact news releases, verifying that an amber/red countdown pill appears in the top header and news panel when an event is within 60 minutes.

**Acceptance Scenarios**:

1. **Given** a high-impact USD economic event is scheduled within 60 minutes, **When** viewing `/macro/XAUUSD`, **Then** a prominent "⚠️ Event Embargo: CPI in 34m" banner warns against market orders.
2. **Given** no high-impact events are scheduled in the next 4 hours, **When** the trader inspects the catalyst timeline, **Then** a "🟢 Clear Economic Docket" badge confirms safe trading conditions.

---

### Edge Cases

- **Macro API Unavailable / Rate Limited**: If external sentiment feeds are temporarily unreachable, the system must display cached consensus baseline data with an "Offline consensus mode" indicator without crashing the chart canvas.
- **Extreme News Volatility Spike**: During actual news release moments, the spread indicator should highlight spread widening in real-time.
- **Multiple Currency Pairs**: The component must seamlessly adapt when switching symbols from `XAUUSD` to `EURUSD`, `GBPUSD`, or `USDJPY` with pair-relevant macro drivers.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST render an AI Macro Trend Synthesizer in the Right Rail and Research Desk of `/macro/[pair]`, providing directional bias, confidence score, and executive thesis.
- **FR-002**: System MUST render a visual Data Sentiment Gauge displaying retail long vs. short percentage and a derived contrarian market bias.
- **FR-003**: System MUST render an Intermarket Macro Barometer tracking DXY (US Dollar), US10Y (Bond Yields), and VIX/Safe-Haven demand with composite tailwind scoring.
- **FR-004**: System MUST render a High-Impact Catalyst Timeline showing upcoming economic events with a countdown timer and volatility embargo warnings.
- **FR-005**: System MUST allow 1-click switching between Setup & Risk, Technical Confluence, and the new Macro Intel & AI Radar tabs in the collapsible Right Rail.
- **FR-006**: System MUST maintain real-time responsiveness (<200ms tab transitions) and preserve active candlestick chart interaction.
- **FR-007**: System MUST provide a direct breadcrumb link back to `/dashboard` and `/signals` in the top command bar.

### Key Entities

- **AIMacroIntelligence**: Represents synthesized macro market state, containing symbol, directional bias, confidence (0-100), thesis narrative, bullish catalysts, and risk factors.
- **DataSentimentProfile**: Represents market positioning metrics, including retail long percentage, retail short percentage, contrarian signal rating, and crowd sentiment status (Extreme Fear to Extreme Greed).
- **IntermarketPressure**: Represents intermarket correlation drivers, tracking DXY price & delta, US10Y yield & delta, VIX reading, and overall macro tailwind score.
- **EconomicCatalyst**: Represents an economic calendar event with event name, currency impact level (High/Medium/Low), release timestamp, and minutes remaining.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A trader can assess the overall macro bias (AI synthesis, DXY tailwind, and retail sentiment) on `/macro/XAUUSD` within 5 seconds of opening the page.
- **SC-002**: 100% of high-impact releases within a 60-minute window trigger a prominent visual volatility embargo alert.
- **SC-003**: The new Macro Intel component loads and updates with zero page reloads and maintains sub-second rendering.
- **SC-004**: System users achieve full visual clarity on why gold is moving based on real macroeconomic correlations.

## Assumptions

- Gold (XAUUSD) continues to respond to fundamental drivers: real yields, DXY, and geopolitical safe-haven flows.
- Backend news and sentiment endpoints (`/api/news/analyze` and `/api/sentiment-gauge`) supply real or consensus algorithmic metrics.
- Desktop layout width is sufficient for 3-pane workstation or vertical collapsible rails.
