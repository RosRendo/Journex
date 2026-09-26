# AMD (Power of 3) & POC Visual Engine in Pine Script v5

**Date**: 2026-09-09  
**Component**: `mql5/AdaptiveICT/Indicators/AdaptiveICT_DecisionEngine.pine`  
**Topic**: On-Chart Visual Rendering of Accumulation, Manipulation, Distribution, and Volume Profile POC

---

## 1. Architectural Overview
The `AdaptiveICT_DecisionEngine.pine` script was enhanced with an on-chart visual subsystem to track **Institutional AMD (Power of 3 - PO3)** and **Volume Profile Point of Control (POC)**.

---

## 2. Visual Elements Implemented

### A. Accumulation Phase (Asian Session)
- **Visual**: Shaded soft blue box (`#3b82f6` with 92% transparency) enclosing the entire Asian session high/low range.
- **Label**: `ACCUMULATION (Asian Range)`.
- **Liquidity Extensions**: Dotted reference lines projecting the Asian High (Buy-Side Liquidity) and Asian Low (Sell-Side Liquidity) forward into the London open.

### B. Manipulation Phase (Judas Swing)
- **Visual**: High-contrast red/amber alert box (`#ef4444` with 82% transparency) drawn around the exact wick that breaches the Asian liquidity pool.
- **Bullish Judas**: Price sweeps below Asian Low (SSL) and closes back inside $\rightarrow$ `⚡ MANIPULATION (Judas Low / SSL Swept)`.
- **Bearish Judas**: Price sweeps above Asian High (BSL) and closes back inside $\rightarrow$ `⚡ MANIPULATION (Judas High / BSL Swept)`.

### C. Distribution Phase (Expansion)
- **Visual**: Forward-projected green/red expansion target channel from the confirmation bar to the opposing liquidity pool or Volume POC.
- **Bullish Expansion**: `🚀 DISTRIBUTION (Target: Asian High / POC)`.
- **Bearish Expansion**: `🚀 DISTRIBUTION (Target: Asian Low / POC)`.

### D. Volume Profile POC & Value Area Cloud
- **Value Area Cloud**: Shaded royal purple box (`#a855f7` with 94% transparency) covering the 70% volume range between VAH and VAL.
- **POC Line & Badge**: 2px royal purple line with badge `🎯 POC: <price>` anchored to the highest volume node.
- **VAH / VAL Lines**: Dashed amber/teal reference lines marking the Value Area boundaries.

### E. HUD Integration
- **Row 28**: Live `PO3 / AMD Phase` status (`ACCUMULATION` / `MANIPULATION` / `DISTRIBUTION`).
- **Row 33**: Live `Volume POC` price level.
