# Feature Specification: Point of Control (POC) & Institutional Confluence Engine

**Feature Branch**: `005-volume-profile-confluence`  
**Created**: 2026-09-28  
**Status**: Draft  
**Input**: User description: "it should include poc and what else suggest me to spot the prifitable everywhere"

---

## 1. Overview & High-Edge Confluence Framework

To spot profitable setups consistently across volatile markets (like Gold, FX, and Crypto), price action must not be viewed in isolation. True institutional edge is unlocked when **Price Structure (ICT)** intersects with **Volume Distribution (Market Profile)** and **Time-Based Liquidity Benchmarks**.

This specification defines the integration of **Point of Control (POC)** and the four highest-probability institutional confluence anchors:

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                 INSTITUTIONAL HIGH-PROBABILITY CONFLUENCE MATRIX                │
├─────────────────────────┬─────────────────────────┬─────────────────────────────┤
│ 1. VOLUME PROFILE (POC) │ 2. TIME BENCHMARKS      │ 3. CORRELATED DIVERGENCE    │
│  - Developing POC       │  - Asian Range High/Low │  - SMT Divergence           │
│  - Virgin / Naked POC   │  - NY Midnight Open     │  - Volume Delta Absorption  │
│  - VAH / VAL (70% Area) │  - London Judas Swing   │  - CVD Exhaustion           │
└─────────────────────────┴─────────────────────────┴─────────────────────────────┘
```

1. **Point of Control (POC) & Value Area (VAH / VAL)**:
   - **POC**: The single price level where the absolute highest volume was transacted. Price acts as a magnetic elastic band to this level.
   - **Virgin POC (vPOC)**: A prior session's POC that has never been retested by price. Unfilled institutional orders make vPOCs magnet levels with an over 75% historical touch rate.
   - **Market Profile 80% Rule**: If price opens outside the Value Area (VAH/VAL) and subsequently accepts back inside for two consecutive bars, there is an 80% statistical probability of filling the entire range toward the opposite Value Area boundary through the POC.
2. **Institutional Time Benchmarks**:
   - **New York Midnight Open (00:00 EST / 04:00 UTC)**: The "True Day Open". Institutional long positions should strictly be sought below Midnight Open (Discount); shorts above Midnight Open (Premium).
   - **Asian Range High/Low (00:00 – 08:00 UTC)**: Asian session liquidity pool. London Open (08:00 UTC) frequently creates a fakeout ("Judas Swing") sweeping Asian High or Low directly into a POC/FVG before the true daily trend begins.
3. **Order Flow Absorption & SMT Divergence**:
   - Aggressive market orders absorbed by passive limit orders at POC levels (CVD Divergence), confirming institutional defense of key price levels.

---

## 2. User Scenarios & Testing *(mandatory)*

### User Story 1 - Volume Profile POC & Value Area Rotation (Priority: P1) 🎯 MVP

As an active trader, I need to see real-time Point of Control (POC), Value Area High (VAH), Value Area Low (VAL), and prior Virgin POCs (vPOC) on my chart, so that I can anticipate high-probability rotations and avoid entering trades into heavy volume resistance.

**Why this priority**: Volume Profile levels represent genuine executed capital. Trading with POC context prevents taking breakouts into high-volume brick walls and provides magnetic take-profit targets.

**Independent Test**: Load the indicator across 20 trading sessions; verify that every day's developing POC, VAH, and VAL are tracked, and that untested prior POCs are highlighted as "Virgin POC" lines until touched.

**Acceptance Scenarios**:
1. **Given** an active session, **When** price trades above VAH and then drops back inside the Value Area with a confirmed bar close, **Then** the indicator flags a "Value Area Re-entry" setup with a projected rotation target to the developing POC.
2. **Given** a prior day's POC that remained untouched during the previous session, **When** the new trading day begins, **Then** the indicator projects a horizontal "Virgin POC (vPOC)" line forward across the chart until price touches it.
3. **Given** an entry signal aligning within 10 points of a major POC, **When** the confluence score is evaluated, **Then** the indicator awards bonus confluence points for volume confluence.

---

### User Story 2 - Institutional Time Benchmarks & Asian Range Liquidity (Priority: P2)

As an intraday trader, I need the indicator to automatically map the Asian Session High/Low and the New York Midnight Open price, so that I can spot "Judas Swing" liquidity traps during the London and New York session openings.

**Why this priority**: Institutions accumulate liquidity by engineering stop-runs outside the Asian session range before driving the genuine trend during London and New York killzones.

**Independent Test**: Monitor the London Open (08:00 UTC) across 10 consecutive sessions; verify that sweeps of the Asian Range High/Low followed by structure shifts trigger high-conviction "Judas Reversal" alerts.

**Acceptance Scenarios**:
1. **Given** the Asian session completion (08:00 UTC), **When** London session opens, **Then** the Asian High and Low are plotted as dashed reference boundaries on the chart.
2. **Given** price spikes below the Asian Low during London Open and then closes back inside with a bullish Market Structure Shift (MSS), **When** evaluated by the indicator, **Then** the setup pattern is identified as an "Asian Low Sweep / Judas Swing" with Grade A confluence.
3. **Given** an intraday buy signal, **When** the entry price is above the New York Midnight Open, **Then** the indicator flags a warning that the trade is in Premium territory relative to the daily open.

---

### User Story 3 - Volume Delta Absorption & CVD Divergence at POC (Priority: P3)

As an order flow trader, I need to detect when market orders are being absorbed by institutional limit orders at POC / VAH / VAL levels via Cumulative Volume Delta (CVD) divergence, so that I can catch reversals at the exact turning point.

**Why this priority**: Delta absorption proves that "Smart Money" is stepping in to stop a market run, providing the tightest possible stop losses and highest risk-to-reward entries.

**Independent Test**: Identify market swing extremes where price makes a lower low but CVD makes a higher low; verify that the indicator flags "Bullish CVD Absorption" at structural support.

**Acceptance Scenarios**:
1. **Given** price testing a key POC or Value Area boundary, **When** price forms a lower low while Cumulative Volume Delta (CVD) forms a higher low, **Then** the indicator displays a "Bullish Delta Absorption" badge.
2. **Given** an active trade setup, **When** order flow absorption is confirmed, **Then** the trade lifecycle assigns a structural stop loss immediately behind the absorption candle wick.

---

### User Story 4 - Multi-Asset SMT Divergence Radar (Priority: P4)

As a macro desk trader, I need the indicator to cross-reference correlated assets (e.g. Gold XAUUSD vs Silver XAGUSD, or EURUSD vs DXY) to detect Smart Money Tool (SMT) divergence, confirming institutional accumulation or distribution.

**Why this priority**: SMT divergence is the single most reliable footprint of smart money manipulation; when correlated assets decouple at swing highs/lows, an immediate macro reversal is imminent.

**Independent Test**: Compare historical swing points where XAUUSD made a higher high but XAGUSD failed to make a higher high; confirm that SMT divergence is visually flagged and logged.

**Acceptance Scenarios**:
1. **Given** XAUUSD forms a new swing high during London session, **When** correlated asset XAGUSD forms a lower high at the same timestamp, **Then** the indicator flags "Bearish SMT Divergence" on the HUD.
2. **Given** confirmed SMT divergence, **When** calculating confluence score, **Then** SMT divergence adds +5 points to the Decision Scorecard.

---

### Edge Cases

- **Missing / Zero Volume Symbols**: What happens on FX pairs or brokers where tick volume is flat or zero? (Indicator must gracefully fall back to Price Action and Time Benchmarks, marking Volume Profile as "Unavailable").
- **Extended Holiday / Rollover Gaps**: How does the engine treat Asian Session ranges when market opens on Sunday afternoon with weekend gaps?
- **Multiple Untested Virgin POCs**: When market trends heavily for 5 days without touching prior POCs, how does the chart prevent line clutter? (Indicator caps maximum active vPOCs to the most recent 3 levels).

---

## 3. Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Indicator MUST calculate and display the active session's Point of Control (POC), Value Area High (VAH), and Value Area Low (VAL) using standard 70% volume distribution.
- **FR-002**: Indicator MUST project up to 3 most recent untested Virgin Point of Control (vPOC) lines from previous sessions, terminating each line dynamically when touched by subsequent price action.
- **FR-003**: Indicator MUST automatically detect and plot the Asian Session Range (High/Low) from 00:00 to 08:00 UTC as key liquidity benchmark levels for London session trading.
- **FR-004**: Indicator MUST plot the New York Midnight Open price (00:00 EST / 04:00 UTC) as a benchmark line to delineate Daily Premium vs Daily Discount pricing.
- **FR-005**: Indicator MUST identify and label "Judas Swing" liquidity sweep events when price pierces the Asian High or Low and immediately rejects back inside during the London/NY killzones.
- **FR-006**: Indicator MUST evaluate the 80% Rule of Market Profile: when price opens outside the Value Area and achieves two consecutive bar closes back inside, trigger a Value Area Rotation setup toward the opposite Value Area boundary through the POC.
- **FR-007**: Indicator MUST evaluate Cumulative Volume Delta (CVD) divergence at key levels, identifying institutional absorption where price and delta diverge at swing pivots.
- **FR-008**: Indicator MUST incorporate POC, Value Area, and Institutional Time confluence into the 100-point Decision Scorecard, awarding up to +10 bonus points for multi-factor alignment.
- **FR-009**: Indicator MUST provide toggle inputs for each visual overlay group (`Show Volume Profile POC/VAH/VAL`, `Show Virgin POCs`, `Show Asian Range`, `Show NY Midnight Open`, `Show SMT Alerts`) to prevent chart clutter.
- **FR-010**: Indicator MUST emit real-time alert notifications for: (a) Virgin POC touch, (b) Asian Range liquidity sweep, and (c) Value Area 80% Rule re-entry.

---

### Key Entities

- **VolumeProfileEntity**: Represents the price-volume histogram for a defined lookback period, containing POC price, VAH price, VAL price, and total volume.
- **VirginPocLevel**: Represents a historical Point of Control that has never been pierced by price after its session ended.
- **TimeBenchmarkRegistry**: Represents institutional session time boundaries (Asian Range High/Low, NY Midnight Open, London Open Judas threshold).
- **OrderFlowAbsorptionState**: Represents the state of delta pressure vs price action (Delta Divergence, CVD Slope, Absorption Wick).

---

## 4. Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: **POC Touch Precision**: 100% of plotted Virgin POC lines terminate on the exact historical candle where price first intersected the level.
- **SC-002**: **High-Confluence Win Rate**: Trade setups that combine an ICT Liquidity Sweep + Fair Value Gap + Virgin POC touch achieve a measured win rate $\ge 68\%$ across a 100-trade historical sample.
- **SC-003**: **80% Rule Fulfillment**: Value Area re-entries satisfying the two-bar acceptance criteria reach the developing POC in $\ge 75\%$ of observed instances.
- **SC-004**: **Chart Load Speed**: Adding Volume Profile POC and Time Benchmarks adds no more than 80ms to overall indicator calculation time on TradingView.
- **SC-005**: **Clutter Control**: With all overlays enabled, max lines and labels remain strictly under 150 (well within TradingView's 200 ceiling).

---

## 5. Assumptions

- **Market Focus**: Primary instrument is Spot Gold (XAUUSD) on M5/M15 timeframes, where institutional session liquidity and volume profile dynamics are most pronounced.
- **Timezone**: All session calculations reference standard UTC/GMT or America/New_York (UTC-4 / UTC-5 depending on Daylight Saving Time).
- **Volume Source**: On OTC FX and Spot Gold, broker-provided tick volume serves as an accurate proxy for relative volume distribution and Point of Control calculation.
