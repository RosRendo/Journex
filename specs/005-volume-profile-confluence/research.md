# Phase 0 Research: Point of Control (POC) & Institutional Confluence Engine

**Feature**: `005-volume-profile-confluence`  
**Date**: 2026-09-28  
**Scope**: Technical architecture, algorithms, and data structures for Developing POC, Virgin POC, Value Area (VAH/VAL), Asian Range, and NY Midnight Open.

---

## 1. Intraday Developing Volume Profile (POC, VAH, VAL)

### Problem Analysis
Standard Volume Profile indicators on TradingView often calculate profiles over fixed bar lookbacks (e.g. 50 bars) or use heavy historical loops that lag the chart. For institutional day trading, the Volume Profile must anchor to the **Current Daily Session (00:00 UTC to 23:59 UTC)**:
- Must dynamically bin volume into price buckets as the session progresses.
- Must identify the **POC** (price bin with the highest accumulated volume).
- Must calculate the **70% Value Area** (VAH and VAL) by expanding outward from the POC until 70% of total session volume is encompassed.

### Technical Decision
Implement a daily session-resetting volume histogram:
- On session start (`ta.change(time("D"))`), reset session volume array.
- Use 20 dynamic price bins between session high and session low.
- At each bar close, map the bar's volume into the corresponding price bin:
  $$\text{bin\_index} = \text{clamp}\left(0, 19, \left\lfloor \frac{\text{close} - \text{session\_low}}{\text{bin\_size}} \right\rfloor \right)$$
- Calculate POC price:
  $$\text{POC} = \text{session\_low} + (\text{poc\_bin} + 0.5) \times \text{bin\_size}$$
- Expand Value Area outward from POC until accumulated volume $\ge 0.70 \times \text{total\_session\_vol}$.

---

## 2. Virgin POC (vPOC) Tracking & Dynamic Termination

### Problem Analysis
When a daily session finishes, its POC becomes a historical benchmark. If price in subsequent sessions never touches that POC, it is a **Virgin / Naked POC**. Unfilled institutional orders make vPOCs magnets. However, drawing unlimited vPOC lines causes chart clutter and hits TradingView's 200-line ceiling.

### Technical Decision
- Store the 3 most recent session POCs in a managed array: `var float[] virgin_pocs = array.new_float(0)`.
- At each daily rollover:
  - Add yesterday's final POC to `virgin_pocs` (capped at max 3).
  - Create a forward horizontal line for each active vPOC.
- On each active bar:
  - Check if `low <= vpoc and high >= vpoc`.
  - If touched: terminate line at current `bar_index`, label `"vPOC Mitigated"`, and remove from active tracking.

---

## 3. Asian Session Range (00:00 - 08:00 UTC) & Judas Swing Detection

### Problem Analysis
The Asian Session (Tokyo/Sydney) establishes the baseline liquidity pool of the day. Retail traders place stop losses directly above the Asian High and below the Asian Low.
London Open (08:00 UTC) frequently creates a "Judas Swing" (false move):
- Price sweeps 10–30 points below Asian Low (triggering retail sell stops).
- Immediately reclaims the Asian Low with a bullish Market Structure Shift (MSS).
- Rockets upward in the real daily trend.

### Technical Decision
- Identify Asian session window: `in_session("0000-0800:1234567", "UTC")`.
- During 00:00 - 08:00 UTC: track `asia_high = math.max(asia_high, high)` and `asia_low = math.min(asia_low, low)`.
- At 08:00 UTC: lock `asia_high` and `asia_low`. Draw horizontal dashed reference lines across London/NY sessions.
- Detect **Judas Sweep**:
  - `bull_judas = (low < asia_low and close > asia_low) and in_london_ny`
  - `bear_judas = (high > asia_high and close < asia_high) and in_london_ny`
- Display visual marker on chart and boost Decision Score by +10 points.

---

## 4. New York Midnight Open (00:00 EST / 04:00 UTC)

### Problem Analysis
Institutional algorithmic pricing engines reference the New York Midnight Open as the true daily benchmark:
- Any price **BELOW** Midnight Open is in **Daily Discount** (favorable for Buys).
- Any price **ABOVE** Midnight Open is in **Daily Premium** (favorable for Sells).
- Buying in Premium or selling in Discount leads to high failure rates.

### Technical Decision
- Capture the candle open price at 00:00 EST (04:00 UTC in winter / 05:00 UTC in summer):
  ```pinescript
  var float ny_midnight_open = na
  is_midnight = hour(time, "America/New_York") == 0 and minute(time, "America/New_York") == 0
  if is_midnight
      ny_midnight_open := open
  ```
- Draw a subtle horizontal benchmark line across the session.
- Add Discount/Premium filter to signal generation:
  - Long signals require `close < ny_midnight_open` or award bonus points.
  - Short signals require `close > ny_midnight_open` or award bonus points.

---

## 5. Scoring Integration: Institutional Confluence Scorecard

| Institutional Confluence Element | Condition | Scorecard Contribution |
| :--- | :--- | :---: |
| **POC Proximity / Bounce** | Price within 0.1% of developing POC or vPOC | **+5 pts** |
| **Asian Range Liquidity Sweep** | Judas Swing (Asian High or Low swept & reclaimed) | **+5 pts** |
| **NY Midnight Discount/Premium** | Long below Midnight Open / Short above Midnight Open | **+5 pts** |
| **Value Area 80% Rule Acceptance**| Re-entry into Value Area with 2 consecutive closes | **+5 pts** |

Maximum institutional bonus: **+10 pts** capped into the 100-point Decision Scorecard.
