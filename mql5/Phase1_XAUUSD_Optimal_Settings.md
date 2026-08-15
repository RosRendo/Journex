# AdaptiveICT Optimization Journey: A Comprehensive Log
**Asset:** XAUUSD (Gold)  
**Testing Period:** Jan 01 2026 - Aug 10 2026  
**Spread Simulation:** 300 points (30 pips fixed)

This document tracks the step-by-step quantitative testing process that transformed the base AdaptiveICT framework into an institutional-grade algorithmic system.

---

## 🕒 Prelude: The Timeframe War (H1 vs M15)
Before beginning the optimization phases, we tested the core logic on both the 1-Hour (H1) and 15-Minute (M15) timeframes to see how structural target geometry interacts with Gold's massive 30-pip spread.

*   **The M15 Result:** The bot took 1,107 trades but only managed a 1.21 Profit Factor. The tiny structural targets of the 15-minute chart were consistently consumed by the 30-pip spread, forcing the algorithm to take massive risk (30.5% drawdown) just to break even.
*   **The H1 Result:** The bot took 134 trades with a massive 2.61 Profit Factor. Because H1 structural swings are hundreds of pips wide, the 30-pip spread became mathematically irrelevant.

**Verdict:** The H1 Timeframe was permanently selected for all further optimization.

---

## 🧬 Phase 1: Core Logic Optimization
**Goal:** Find the baseline Risk-to-Reward (RR) and Confluence Score required to mathematically defeat the spread.
*   **Method:** Fast Genetic Algorithm testing `InpMinRR`, `InpMinScore`, and `InpMaxOpenTrades`.
*   **Baseline Default settings used during test:** `InpRiskPercent = 1.0`, `InpUseRSI = true`, `InpTrailATRMult = 1.5`.

**Phase 1 Results:**
*   **Best Settings:** `InpMinRR` = 2.5, `InpMinScore` = 80, `InpMaxOpenTrades` = 3
*   **Net Profit:** **+$1,273.70**
*   **Profit Factor:** 2.61
*   **Max Drawdown:** 11.23%
*   **Conclusion:** A highly selective "Sniper" profile (requiring an 80/100 confluence score and a minimum 1:2.5 payout) created a massive mathematical edge.

---

## 📈 Phase 2: Technical Filters (The RSI Experiment)
**Goal:** Test if tightening the default RSI momentum filter could filter out remaining losses and push the Profit Factor above 3.0.
*   **Method:** Locked in the Phase 1 settings. Ran optimization on `InpRSIPeriod`, `InpRSIBuyMax`, and `InpRSISellMin`.

**Phase 2 Results:**
*   **Best Settings Found:** Period = 18, BuyMax = 70, SellMin = 25
*   **Net Profit:** Dropped to **+$500.00**
*   **Sharpe Ratio:** Exploded to **4.03**
*   **Analysis:** The strict RSI filter successfully blocked almost all losing trades (creating a god-tier 4.03 Sharpe Ratio), but it accidentally blocked our biggest winning "home run" trades as well.

**The "Aha!" Moment:** Since tightening the RSI dropped our profit, what if we turned it off completely?
*   **Test:** Disabled RSI entirely (`InpUseRSI = false`).
*   **Result:** Net Profit skyrocketed to **+$3,232.04**! 
*   **Conclusion:** Traditional momentum indicators choke the pure Price Action (ICT Liquidity Sweeps + MSS) logic. RSI was permanently disabled.

---

## 🏃 Phase 3: Trade Management (Trailing Stops)
**Goal:** With the entry logic perfected and RSI disabled, test if we can squeeze more money out of the winning trades by optimizing the exit logic (Trailing Stop).
*   **Method:** Locked in Phase 1 settings and `InpUseRSI = false`. Ran optimization on `InpTrailATRMult` (Start: 1.0, Step: 0.5, Stop: 4.0).

**Phase 3 Results:**
*   **Best Setting:** `InpTrailATRMult` = 3.5
*   **Previous Default Setting:** `InpTrailATRMult` = 1.5
*   **Analysis:** A tight trailing stop of 1.5 was choking trades out too early. Loosening the trailing stop to 3.5x ATR allowed the trades to survive deep daily pullbacks. Average holding time increased to 28 hours, capturing massive $1,300+ swings.

**The Final Run (Risk scaled to 3.0%):**
*   **Net Profit:** **+$11,657.60**
*   **Final Balance:** $21,657.60 *(116% Account Growth)*
*   **Profit Factor:** 1.46
*   **Max Drawdown:** 25.64%

---

## 🏆 Final Locked-In Configuration
*   `InpTimeframe` = **H1**
*   `InpMaxSpreadPoints` = **300**
*   `InpRiskPercent` = **3.0**
*   `InpMaxOpenTrades` = **3**
*   `InpMinRR` = **2.5**
*   `InpMinScore` = **80**
*   `InpUseRSI` = **false**
*   `InpTrailingStop` = **true**
*   `InpTrailATRMult` = **3.5**

---

## 🚀 Phase 2: M15 MachineGun Optimization & Production Stabilization (August 2026)

### 1. Key Code Enhancements (Production Readiness)
*   **Resolved Scalper Tautology Bug:** Fixed a placeholder Risk-to-Reward (RR) scoring logic in `ICTScalperStrategy.mqh` where points were always awarded regardless of actual RR. The corrected system validates entry-to-invalidation distances relative to current ATR.
*   **Added Higher-Timeframe (HTF) Filter to Scalper:** Integrated H4 bias checks using the 200 EMA (`GetHTFBias()`) to align scalps with intermediate trend structure:
    *   **+10 pts** score bonus when matching H4 bias.
    *   **-10 pts** score penalty when trading counter-trend (preventing dangerous entries).
*   **Improved Session Overlap Detection:** Adjusted `Session.mqh` to correctly identify the London/NY Overlap (13:00 to 16:00 server time). Added handling inside the strategies to allow trading in high-volume overlapping windows.
*   **Fixed Partial Exit Volume Rounding:** Modified `SinglePositionManager.mqh` to floor partial closes against `SYMBOL_VOLUME_STEP` rather than using standard decimal formatting. This prevents brokerage rejections due to invalid lot steps, and correctly updates the re-fetched volume for secondary (TP2) closes.
*   **Added Exposure Margin Math:** Resolved a silent margin accumulation issue in `Risk/ExposureManager.mqh` to correctly track live account exposure.

### 2. Multi-Timeframe Integration Matrix
| Strategy | Signal Timeframe | Context Timeframe | Default Focus |
| :--- | :--- | :--- | :--- |
| **Sniper** | H1 | H4 | Swing entries, high-confluence |
| **MachineGun** | M15 | H1 | Rapid intraday scalps, high volume |

### 3. Recommended Optimization Ranges for `XAUUSD_M15_MachineGun.set`
The preset file has been prepared with full MT5 Genetic Optimizer configurations (`||min||step||max||Y` format). Use the following parameters to sweep:
*   `InpLiquidityLookback` (20 to 100, step 10): Sweeps structural key levels.
*   `InpMinScore` (40 to 70, step 5): Tweaks entry sensitivity.
*   `InpRSIBuyMax`/`InpRSISellMin`: Fine-tunes extreme overbought/oversold filtering bounds.
*   `InpMinRR` (1.0 to 2.0, step 0.1): Matches expected risk-reward profiles for high frequency scalps.
*   `InpTrailATRMult` (2.0 to 6.0, step 0.5): Sweeps trailing stop tightness for intraday volatility.

