# Quickstart: Point of Control (POC) & Institutional Confluence

**Feature**: `005-volume-profile-confluence`  
**Date**: 2026-09-28  
**Scope**: Verification procedures for Volume Profile POC, Virgin POCs, Asian Range Judas Swings, and NY Midnight Open.

---

## 1. How to Test on TradingView

### Step 1: Chart Configuration
1. Open TradingView on **`XAUUSD`** (Gold) or **`EURUSD`**.
2. Select the **`M5`** timeframe.
3. In indicator settings:
   - Check **Show Volume Profile POC/VAH/VAL** $\rightarrow$ ON.
   - Check **Show Virgin POCs** $\rightarrow$ ON.
   - Check **Show Asian Range & Judas Swings** $\rightarrow$ ON.
   - Check **Show NY Midnight Open** $\rightarrow$ ON.

---

### Step 2: Validate the Developing Volume Profile
1. Observe the daily session:
   - A bold purple line represents the **Developing POC** (the price with maximum volume).
   - Red and green dashed lines represent **VAH** and **VAL** (the 70% Value Area).
2. As new volume arrives during the day, the POC shifts dynamically to where heavy trading occurs.

---

### Step 3: Validate Virgin POC (vPOC) Touch
1. Locate historical horizontal lines labeled **`vPOC`**.
2. Advance bars in Bar Replay until price reaches the line:
   - When a candle wick or body touches the vPOC, the line terminates with a `"vPOC Mitigated"` tag.
   - Price frequently exhibits an immediate reaction or reversal upon contact.

---

### Step 4: Validate London Judas Swing at Asian Range
1. Observe the **Asian Range** box from 00:00 to 08:00 UTC.
2. At 08:00 UTC (London Open):
   - If price spikes below the Asian Low and reclaims it, look for the **`Judas Swing (Asian Low Swept)`** alert.
   - The HUD will show an instant confluence boost and a Grade A Buy signal.
