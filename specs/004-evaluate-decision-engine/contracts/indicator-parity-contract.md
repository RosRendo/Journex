# Interface Contract: Pine Script Indicator & MQL5 Engine Parity

**Feature**: `004-evaluate-decision-engine`  
**Date**: 2026-09-28  
**Scope**: Exact contract mapping between TradingView Pine Script (`AdaptiveICT_DecisionEngine.pine`) and MetaTrader 5 MQL5 EA (`AdaptiveICT.mq5`).

---

## 1. Confluence Weighting Contract

Both environments MUST evaluate setups against this normalized 100-point schema:

```json
{
  "confluence_matrix": {
    "version": "0.50",
    "total_maximum_points": 100,
    "entry_threshold": 60,
    "high_conviction_threshold": 80,
    "components": {
      "market_structure": {
        "weight": 20,
        "description": "BOS / CHoCH confirmation and swing pivot alignment"
      },
      "liquidity_sweep": {
        "weight": 15,
        "description": "Buy/Sell side liquidity sweeps, PDH/PDL or EQH/EQL tap"
      },
      "fvg_quality": {
        "weight": 15,
        "description": "Valid unmitigated 3-candle Fair Value Gap"
      },
      "displacement": {
        "weight": 10,
        "description": "Expansion candle ratio > 1.5x ATR and body dominance"
      },
      "session_alignment": {
        "weight": 10,
        "description": "London Killzone (08:00-11:00 UTC) or NY Killzone (13:00-16:00 UTC)"
      },
      "htf_bias": {
        "weight": 10,
        "description": "Consensus agreement across 4H, 1H, and 15M trend filters"
      },
      "premium_discount": {
        "weight": 10,
        "description": "Price located in Discount (<50%) for Longs, Premium (>50%) for Shorts"
      },
      "order_flow": {
        "weight": 5,
        "description": "CVD Divergence or directional volume delta dominance"
      },
      "volume_ratio": {
        "weight": 3,
        "description": "Volume exceeds 20-period volume moving average by >= 1.2x"
      },
      "news_clearance": {
        "weight": 2,
        "description": "No high-impact CPI/NFP/FOMC release within active hour"
      }
    }
  }
}
```

---

## 2. Regime Gate Parity Contract

| Regime Tag | Pine Script Name | MQL5 Regime String | EA Permission | Indicator Action |
| :--- | :--- | :--- | :--- | :--- |
| `BULL_TREND` | `TRENDING BULL` | `TRENDING_BULLISH` | Buy Permitted | Green bias, allow Buy signals |
| `BEAR_TREND` | `TRENDING BEAR` | `TRENDING_BEARISH` | Sell Permitted | Red bias, allow Sell signals |
| `SIDEWAYS` | `RANGING` | `RANGING` | Sniper Blocked | Amber bias, suppress trend signals |
| `SHOCK_VOL` | `LOW/HIGH VOLATILITY` | `HIGH_VOLATILITY` | ALL BLOCKED | Red warning HUD, suppress all signals |
| `TRANSITION` | `BREAKOUT/TRANSITION` | `TRANSITION` | Scalper Only | White bias, require Score >= 80 |

---

## 3. Signal Confirmation Contract

All signals transmitted or visualized MUST fulfill:
1. `barstate.isconfirmed == true` (Pine Script) / `IsNewBar() == true` (MQL5).
2. `score >= 60`.
3. `regime != HIGH_VOLATILITY`.
4. `news_active == false`.
