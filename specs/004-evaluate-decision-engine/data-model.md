# Data Model: AdaptiveICT Decision Engine Quality & Integrity

**Feature**: `004-evaluate-decision-engine`  
**Date**: 2026-09-28  
**Scope**: Unified data structures and state definitions bridging the TradingView Pine Script indicator and MQL5 EA engine.

---

## 1. Confluence Scorecard Entity (`IndicatorConfluenceScorecard`)

Represents the multi-factor scoring evaluation generated on every confirmed bar.

| Field | Type | Range / Options | Description |
| :--- | :--- | :--- | :--- |
| `total_score` | Integer | `0 – 100` | Normalized aggregate score |
| `grade` | String | `A+` (>=90), `A` (80-89), `B` (70-79), `C` (60-69), `F` (<60) | Actionability grade |
| `qualification` | String | `HIGH_CONVICTION`, `NORMAL`, `LOW`, `NO_TRADE` | Maps to MQL5 Risk Tiers |
| `structure_pts` | Float | `0.0 – 20.0` | Market Structure Shift, BOS, CHoCH |
| `liquidity_pts` | Float | `0.0 – 15.0` | BSL/SSL Sweeps, PDH/PDL sweeps, EQH/EQL |
| `fvg_pts` | Float | `0.0 – 15.0` | Fair Value Gap displacement and mitigation |
| `displacement_pts`| Float | `0.0 – 10.0` | Candle body expansion vs ATR average |
| `session_pts` | Float | `0.0 – 10.0` | London / NY Killzone alignment |
| `htf_pts` | Float | `0.0 – 10.0` | 4H / 1H / 15M directional consensus |
| `pd_pts` | Float | `0.0 – 10.0` | Discount (Buy) or Premium (Sell) location |
| `orderflow_pts` | Float | `0.0 – 5.0` | CVD Divergence & Volume Delta pressure |
| `volume_pts` | Float | `0.0 – 3.0` | Volume ratio vs 20-period moving average |
| `news_pts` | Float | `0.0 – 2.0` | High-impact event clearance |

---

## 2. Market Regime Entity (`MarketRegimeClassification`)

Represents macroeconomic volatility and structural trend conditions governing setup permissibility.

```
                  ┌──────────────────────┐
                  │    DetectRegime()    │
                  └──────────┬───────────┘
                             │
       ┌─────────────┬───────┴────────┬──────────────┬─────────────┐
       ▼             ▼                ▼              ▼             ▼
TRENDING_BULL  TRENDING_BEAR       RANGING     HIGH_VOLATILITY TRANSITION
  (ADX > 25,     (ADX > 25,      (ADX < 25,      (ATR% > 0.20,  (ChOP/Mixed
 Close > EMA)   Close < EMA)     RSI 35-65)       News Hours)    Direction)
```

| State Name | Permitted Trading Styles | Indicator Action |
| :--- | :--- | :--- |
| `TRENDING_BULLISH` | ICT Sniper (Buy), Trend Continuation | Emits Long signals |
| `TRENDING_BEARISH` | ICT Sniper (Sell), Trend Continuation | Emits Short signals |
| `RANGING` | Mean Reversion, Range Scalp | Blocks Sniper trend signals |
| `HIGH_VOLATILITY` | NONE (All styles blocked) | Visual HUD warning: "AVOID EXECUTION" |
| `TRANSITION` | Scalper Breakout (with Score >= 80) | Strict filtering |

---

## 3. Simulated Trade Lifecycle (`TradeLifecycleState`)

State machine managing visual on-chart trade tracking.

```
       [IDLE / FLAT]
             │
      (Confirmed Signal)
             ▼
       [TRADE_OPEN] ──(SL Hit)──► [EXIT_LOSS (-1.0R)]
             │
          (TP1 Hit)
             ▼
     [TP1_HIT_BE] ──(BE Hit)──► [EXIT_BE (+0.4R)]
             │
          (TP2 Hit)
             ▼
     [TP2_HIT] ────(BE Hit)──► [EXIT_RUNNER_STOP (+1.2R)]
             │
          (TP3 Hit)
             ▼
     [EXIT_FULL_PROFIT (+1.8R)]
```

---

## 4. Performance Registry (`PerformanceStats`)

Cumulative analytics computed and displayed on HUD rows 17–33:
- `total_trades_count`: Cumulative trades generated.
- `wins_count`: Trades achieving > 0 R-multiple.
- `win_rate`: `(wins_count / total_trades_count) * 100`.
- `net_r_gained`: Sum of all realized R returns.
- `max_r_drawdown`: Peak-to-trough net R drawdown.
- `session_distribution`: London WR%, New York WR%, Asian WR%.
- `pattern_distribution`: Reversal WR%, Continuation WR%, Breakout WR%.
