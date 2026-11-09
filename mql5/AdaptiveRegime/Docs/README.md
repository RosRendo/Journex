# AdaptiveRegime EA — Architecture & Usage

**Version 1.000** · MQL5 · MT5 terminal build with standard `Trade.mqh`
Folder: `mql5/AdaptiveRegime/` — completely separate from the legacy `AdaptiveICT` EA.

## Architecture

```
AdaptiveRegime.mq5 (orchestrator)
 ├─ Core/Types.mqh            DTOs: RegimeResult, TradeSignal, TradeAllocation
 ├─ Core/Config.mqh           ALL inputs (17 groups)
 ├─ Core/Logger.mqh           leveled logging + daily file (MQL5\Files\AdaptiveRegime\)
 ├─ Core/StateStore.mqh       persistent k/v store → lockouts & position meta survive restarts
 ├─ Core/MarketData.mqh       CLOSED-bar rates, cached indicator handles, ATR-vs-baseline
 ├─ Execution/Executor.mqh    CTrade wrapper: tick-size norm, retcode + fill drift logging
 ├─ Risk/RiskEngine.mqh       sizing + hard caps + lockouts + emergency stop
 ├─ Regime/RegimeDetector.mqh EMA alignment / ADX+DI / structure pivots / ATR ratio
 ├─ Regime/StrategySelector.mqh regime→engine permission matrix
 ├─ Strategies/               6 engines, each selector-gated + cooldown-gated:
 │   ScalpEngine.mqh          momentum burst (tick-driven, adaptive threshold)
 │   IntradayEngine.mqh       session range break + sweep/MSS (M15)
 │   SwingEngine.mqh          HTF-SMA filter + discount/premium pullback (H1)
 │   ReversalEngine.mqh       pivot sweep + rejection wick + close-back
 │   RangeEngine.mqh          fade at range extremes, RR-gated, ADX-capped
 │   BreakoutEngine.mqh       compression box break + measured-move TP
 │   StrategyBase.mqh         bar-time dedupe, cooldowns, pivots, wick math
 ├─ News/NewsFilter.mqh       manual daily blackout windows, explicit unavailable-policy
 ├─ Management/TradeManager.mqh strategy-aware exits (BE/partial/trail/time-stop)
 └─ UI/Dashboard.mqh          throttled corner panel (regime/engines/risk/news)
```

## Per-tick flow
1. Risk state refresh (10s throttle).
2. New closed SETUP-TF bar → regime re-eval → selector recomputed.
3. `TMOnTick()` manages all owned positions (persists partial/BE stages in StateStore).
4. If news-blocked or risk-locked: **management only, no entries.**
5. Pipeline: setup-TF engines (swing → reversal → range → breakout), then entry-TF
   intraday, then tick-driven scalper. One signal, conflict-checked (no same-direction
   stacking), risk-gated (sessions/spread/caps/RR/sizing), executed, registered.

## Strategy exit profiles
| Engine | BE | Partial | Trail | Time stop | Broker TP |
|---|---|---|---|---|---|
| SCALP    | 0.5R | - | - | max hold (default 300s) | no |
| INTRADAY | 1R | 1.5R @50% | ATR 3.5 | - | yes |
| SWING    | 1R (+0.1R) | 2R @50% | ATR 4 (H1) | - | no |
| REVERSAL | 1R | - | ATR 3.5 | - | no |
| RANGE    | - | - | - | - | yes (opposite band) |
| BREAKOUT | 1R | - | ATR 3.5 | - | yes (measured move) |

## Regime → engines
- BULL/BEAR STRONG → SWING, INTRADAY, BREAKOUT
- BULL/BEAR WEAK → INTRADAY, RANGE
- RANGE → RANGE
- VOL_COMPRESSION → BREAKOUT, RANGE
- VOL_EXPANSION → SCALP, BREAKOUT
- REVERSAL → REVERSAL
- confidence < `InpRegMinConfidence` → none (never traded blindly)

## Hard guarantees
- All evaluations on **closed bars**; seconds never counted as bars; volume normalization
  always via step/min/max; sub-min lots rejected (rare 4-digit FX broker exception is
  documented: pip = 10 × point);
- Operating mode only walks within caps (0.50×/0.75×/1.00× of the risk input);
- Loss-streak cooldown persists through restarts (`state_*.txt`);
- News unavailable → explicit ALLOW/BLOCK policy, logged, never silent;
- Deterministic self-test on init (T1–T7) — journal shows PASS/FAIL lines.

## Presets
- `XAUUSD_H1_Balanced.set` — full engine set, moderate caps (H1 chart recommended).
- `XAUUSD_M15_ScalpOnly.set` — scalper only (M15 chart).
- `XAUUSD_M15_IntradayOnly.set` — intraday only (M15 chart).

## Known limitations (honest)
- News windows are manual (no auto calendar); wire a provider later.
- No pyramiding by design (conflict rule), hedging accounts are fine — netting will
  merge opposite closes (MT5 netting accounts: one position per symbol).
- Managed-exit engines (SWING/REVERSAL/SCALP) rely on the EA running continuously.

See `TESTPLAN.md` for the verification checklist.