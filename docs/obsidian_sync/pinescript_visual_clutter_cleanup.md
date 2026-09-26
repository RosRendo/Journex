# TradingView Pine Script Chart De-Cluttering & Minimal Aesthetics

**Date**: 2026-09-09  
**Target Indicator**: `AdaptiveICT_DecisionEngine.pine` (v5)  
**Issue**: Chart visual overload, label stacking, and collision with external indicators (e.g. KhanSaab Sniper Entry/Exit).

---

## 1. Root Causes of Visual Noise
1. **Oversized HUD Table (34 Rows)**: Covered >35% of the visible chart area and physically obstructed active price action candles and scales.
2. **Duplicate Swing Pivot Labels**: `show_pivots` plotting `HH/HL/LH/LL` collided directly with third-party swing high/low indicators.
3. **Stacked Sweep Markers**: `SSL Swept ✖` and `BSL Swept ✖` repeated consecutively on every tick/bar in a sweep sequence, creating unreadable vertical text stacks.
4. **Intrusive Box Overlays & Cloud Bands**: Giant solid/semi-opaque vertical or horizontal distribution boxes blocked candle bodies.
5. **Horizontal Cross-Lines**: Volume profile POC/VAH/VAL projecting across recent 50 bars intersected active structure lines.

---

## 2. Architectural Solution Implemented
1. **Compact 5-Row HUD Mode (Default)**:
   - Replaced the 34-row HUD table with a minimal 5-row card (`Score`, `Signal`, `Pattern`, `Lots`, `Regime`, `News`, `Session`, `Confluence`).
   - Slashes vertical screen space usage by ~85%, keeping candles unobstructed.
   - Preserves switchable setting: `hud_mode = ["Compact", "Full (34 Rows)", "Hidden"]`.
2. **Sweep Label De-Duplication**:
   - Gated sweep marker creation with `and not sweep[1]` to only fire on initial liquidity penetration.
   - Reduced font size to `size.tiny` for clean minimalism.
3. **Safe Third-Party Defaults**:
   - Set `show_pivots = false` by default to prevent clash with KhanSaab or external swing detectors.
   - Set `show_vprof = false` by default so horizontal POC bands are strictly opt-in.
