# Phase 1: XAUUSD Optimal Settings (M1 Momentum Scalper V3)

The strategy was successfully optimized on the M1 timeframe utilizing the H4 200-EMA trend filter. The MT5 genetic optimizer found highly profitable parameters for the Controlled Grid strategy on Gold.

## Option A: Maximum Profit (Aggressive Grid)
This setting generated $41,263 profit in 43 days (~400% gain) with a 32.8% max drawdown.
It uses a small grid step ($3.00) but uses a massive 25-minute cooldown to prevent stacking.

- `InpSignalTimeframe`: **M1**
- `InpMomThresholdPips`: **1.2** (Requires 1.2x ATR breakout)
- `InpPyramidCooldownSec`: **1500** (25 minutes between grid orders)
- `InpGridStep`: **3000.0** ($3.00 grid step)
- `InpMinRR`: **2.5** (High risk-reward targets)

## Option B: Safest Curve (Wide Grid)
This setting generated $37,258 profit with a much lower 27.6% drawdown.
It uses a much wider grid step ($14.00) with a medium 15-minute cooldown, making it much harder for a strong trend against you to open the full basket.

- `InpSignalTimeframe`: **M1**
- `InpMomThresholdPips`: **1.4** (Requires 1.4x ATR breakout)
- `InpPyramidCooldownSec`: **900** (15 minutes between grid orders)
- `InpGridStep`: **14000.0** ($14.00 grid step)
- `InpMinRR`: **2.5**

## How these compare to the old logic:
Before V3, the strategy took counter-trend trades and blew the account in 40 days.
By adding the **H4 Trend Filter** and the **Pyramid Cooldown**, the strategy now safely compounds without instant-stacking the grid during fast price action.
