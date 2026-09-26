# Aggregate PnL Real Symbol Aggregation & Jargon Elimination

## Overview
Replaced the dummy modulo-based strategy categorization (`Bounce`, `Breakout`, `IN-OB`, `Bull Move`, `FOMO`, `Follow KUL`) in `frontend/app/dashboard/page.tsx` with **100% Real Symbol/Asset Aggregation** directly from your imported trades history.

## What Was Fixed
1. **Eliminated Fake Modulo Division**:
   - Previously: Trades without notes were randomly divided into 6 arbitrary buckets using `t.id % 6`.
   - Now: Trades are grouped by actual instrument (`t.pair`), accurately summing up the genuine net profit/loss for `XAUUSD`, `EURUSD`, `GBPUSD`, `US30`, `BTCUSD`, etc.

2. **Added Real Metrics**:
   - Displays real trade count per symbol (e.g. `XAUUSD (14 tr)`).
   - In the full Strategy Matrix view (View 4), displays genuine trade count and win rate (`% win rate`) per traded asset.
   - Volume weight bar visually shows which instrument drove the most PnL.

3. **Purged ICT Jargon**:
   - Purged `"IN-OB"` (In Order Block) and dummy `"Follow KUL"` buckets.
   - Replaced `"Net PnL contribution categorized by ICT algorithmic model"` with `"Net PnL contribution aggregated by traded instrument"`.

4. **Real Mistake Habit Tracking**:
   - Replaced random modulo distribution in `mistakeData` with genuine journal violation reasons (`planDeviationReason`, `emotion`, or rule deviation) only from losing trades.
