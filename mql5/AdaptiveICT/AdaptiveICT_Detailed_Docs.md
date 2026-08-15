# AdaptiveICT Framework — Current Implementation Details
> **Version:** 1.2  
> **Architecture Pattern:** Object-Oriented Decoupled Framework  
> **Last Updated:** August 11, 2026  

This document details the exact files, class architectures, state management mechanisms, and logical workflows currently implemented in the **AdaptiveICT** project.

---

## 1. Directory Tree & File Roles

Below is the directory map of the compiled `mql5/AdaptiveICT/` codebase:

```
AdaptiveICT/
│
├── AdaptiveICT.mq5                 # EA Entry Point. Routes OnInit, OnDeinit, OnTick, and OnTimer hooks.
│
├── Core/
│   ├── Types.mqh                   # Defines data structures (MqlSwing, MqlFVG, MqlOB, TradePlan, etc.).
│   ├── Config.mqh                  # Hosts all input variables, selection enums, and thresholds.
│   ├── StateManager.mqh            # Dynamic cache of global variables, telemetry state, and framework pointers.
│   └── EAController.mqh            # Orchestrates OnInit initialization, scanner timers, tick execution, and shutdown.
│
├── Strategies/
│   ├── BaseStrategy.mqh            # Pure virtual base class interface for setup scanning and confluence.
│   └── ICT/
│       └── ICTStrategy.mqh         # Concrete ICT strategy subclass handling swing-sweeps, MSS, and SMA stacked filters.
│
├── PositionManagement/
│   ├── BasePositionManager.mqh     # Pure virtual base class interface for handling active trades.
│   └── Single/
│       └── SinglePositionManager.mqh # Concrete manager handling 33% TP1 closes, BE+5pip buffer, TP2/3 scales, and ATR trailing.
│
├── ICT/
│   ├── MarketStructure.mqh         # MSS detection and high/low swing analysis.
│   ├── Liquidity.mqh               # Swing-based liquidity sweep detectors.
│   ├── FVG.mqh                     # Gaps detection (Fair Value Gaps).
│   ├── OrderBlock.mqh              # Order block identification.
│   └── SMT.mqh                     # SMT divergence comparisons.
│
├── Indicators/
│   ├── RSI.mqh                     # RSI indicator wrapper.
│   ├── ADX.mqh                     # ADX indicator wrapper.
│   ├── ATR.mqh                     # ATR calculation (used for trailing stops and dynamic buffers).
│   ├── EMA.mqh                     # Exponential Moving Average stack checks.
│   └── Volume.mqh                  # Tick volume spikes validator.
│
├── Market/
│   ├── MarketData.mqh              # Rates history and price retrieval helpers.
│   ├── MarketRegime.mqh            # EMA stacked H4 trend regime checks (Bullish/Bearish).
│   ├── Session.mqh                 # Server-time session window mapping (London / NY).
│   └── Spread.mqh                  # Spread points checker.
│
├── Risk/
│   ├── RiskManager.mqh             # Daily loss drawdowns and open position limits filter.
│   ├── PositionSizing.mqh          # Variable lot calculations based on account risk % and stop-loss distance.
│   └── DrawdownControl.mqh         # Drawdown calculations.
│
├── Targets/
│   └── TakeProfitModel.mqh         # Constructs targets: TP1 (1.5R), TP2 (3R), TP3 (5R).
│
├── Execution/
│   └── OrderValidator.mqh          # Compliance filter: spread checks, minimum stop distance floor (15 pips).
│
├── Trade/
│   └── TradeExecutor.mqh           # Opens standard positions via CTrade (TP = 0) and registers targets.
│
├── Communication/
│   ├── SettingsClient.mqh          # Dynamic dashboard polling client.
│   ├── Heartbeat.mqh               # Telemetry reporter sending term statistics to bridge.
│   └── TradeReporter.mqh           # Open/Modify/Close event reporter.
│
└── Dashboard/
    └── MainPanel.mqh               # High-frequency on-chart status table drawing library.
```

---

## 2. Polymorphic Framework Core Classes

The system relies on virtual inheritance to decouple strategy logic and position exits.

### `BaseStrategy` (`Strategies/BaseStrategy.mqh`)
```mql5
class BaseStrategy
  {
public:
   virtual bool Scan(ENUM_TIMEFRAMES tf, string tf_str, SignalCandidate &candidate) = 0;
   virtual ConfluenceResult CalculateConfluence(const SignalCandidate &candidate) = 0;
   virtual ~BaseStrategy() {}
  };
```

### `BasePositionManager` (`PositionManagement/BasePositionManager.mqh`)
```mql5
class BasePositionManager
  {
public:
   virtual void ManagePositions() = 0;
   virtual void RegisterPosition(ulong ticket, double original_sl, double tp1, double tp2, double tp3) {}
   virtual ~BasePositionManager() {}
  };
```

---

## 3. Concrete Strategy: ICT Reversals & Shifts (`Strategies/ICT/ICTStrategy.mqh`)

Implements `BaseStrategy`. The strategy operates in two stages:

### 1. `Scan()`
1.  Loads last 120 price candles on the active timeframe.
2.  Computes high/low swing points (`GetSwings`).
3.  Checks for a liquidity sweep:
    *   **Bullish sweep (SSL)**: price pierces a recent swing low and closes above it.
    *   **Bearish sweep (BSL)**: price pierces a recent swing high and closes below it.
4.  Evaluates Market Structure Shifts (MSS) by observing if recent swing highs/lows are broken by current closing prices.
5.  If a setup is detected:
    *   Entry price = current price.
    *   Invalidation price = sweep level.
    *   Returns `true` as a `SignalCandidate`.

### 2. `CalculateConfluence()`
Scores setups from 0 to 100.
*   **SMC Indicators (Max 60 pts)**: MSS (+15), Sweep (+15), FVG presence (+10), Order Block presence (+10), stacked EMA direction (+10).
*   **Momentum Filters (Max 20 pts)**: RSI filter (+5), ADX crossover (+5), Volume spike (+5), SMT divergence (+5).
*   **Market Context (Max 10 pts)**: London/NY trading session (+5), parent timeframe stacked EMA trend alignment (+5).
*   **Execution Filters (Max 10 pts)**: Min RR filter (+5), spread clearance (+5).
*   **Score Threshold**: Rejects setups scoring below `InpMinScore` (75).

---

## 4. Concrete Position Manager: Target-Scale Exits (`PositionManagement/Single/SinglePositionManager.mqh`)

Implements `BasePositionManager`. Exits are fully manual to avoid broker-side target limits.

```
       Buy Order
      (TP = 0, SL)
           │
           ├───────── Price reaches TP1 (1.5R) ─────────┐
           │                                            ▼
           │                                     Close 33% Volume
           │                                     Move SL to Entry + 5 pips
           │
           ├───────── Price reaches TP2 (3.0R) ─────────┐
           │                                            ▼
           │                                     Close 50% Remainder
           │
           ├───────── Price reaches TP3 (5.0R) ─────────┐
           │                                            ▼
           │                                     Close 100% Remainder
           │
           └───────── ATR Trailing Stop (Active) ────────┘
```

*   **Fallback Handling**: If the terminal restarts and memory-based arrays are cleared, `GetPositionState` falls back to calculating TP1 (1.5R), TP2 (3R), and TP3 (5R) from the opening price and active Stop Loss distance.
*   **Memory Cleanups**: `CleanupPositionStates` scans active tickets on every tick, matching them against `PositionsTotal()`. Closed positions are swept out of the array to maintain array capacity.

---

## 5. Global State & Telemetry Client (`Core/StateManager.mqh` & `Communication/`)

The terminal connects to `InpBridgeURL` through HTTP Requests.

*   `active_strategy` & `active_position_manager`: pointers used to run polymorphic strategies.
*   `executed_signals[]`: string cache tracking unique hashes: `SYMBOL-TIMEFRAME-BARSTARTTIME-DIRECTION` (e.g. `EURUSD-M15-1767634800-B`). This prevents duplicate entries on the same candlestick.
*   `SettingsClient.mqh`: pulls live parameters (`min_score`, `min_rr`, `risk_percent`, `is_paused`, `is_disabled`) from the dashboard server every 5 seconds.
*   `Heartbeat.mqh`: sends margin level, account balance, active positions list, and today's stats to the flask database every 10 seconds.

---

## 6. On-Chart Table Display Dashboard (`Dashboard/MainPanel.mqh`)

Displays a table overlay respecting custom offsets `InpDashboardX/Y` and anchors `InpDashboardCorner`:

```
┌──────────────────────────────────────────────────────────┐
│   ADAPTIVE ICT EA                                  v1.1  │
│   ● RUNNING                                 Magic: 88001 │
│   Strat: ICT Setup Scan                                  │
│   Mode: Single Target Exits                              │
│   ─────────────────────────────────────────────────────  │
│   MARKET CONTEXT                                         │
│     Symbol                                       EURUSD  │
│     Session                                      LONDON  │
│     Regime                                     TRENDING  │
│     HTF Bias                                ▲  BULLISH   │
│     Volatility                                   NORMAL  │
│   ─────────────────────────────────────────────────────  │
│   LAST SIGNAL                                            │
│     Direction                                   ▲   BUY  │
│     Score                               85/100      [A]  │
│     Timeframe                                        H1  │
│   ─────────────────────────────────────────────────────  │
│   PERFORMANCE                                            │
│     Risk / Trade                                   1.0%  │
│     Daily P&L                          +1.20%  (+$120.0) │
│     Open Trades                                   1 / 2  │
│     W / L Today                              2W      0L  │
│   ─────────────────────────────────────────────────────  │
│   CONNECTION                                             │
│     Bridge                                  ● Connected  │
│     Heartbeat                                   2s ago   │
│     Last Signal                               14:15:02   │
└──────────────────────────────────────────────────────────┘
```

If `InpShowDashboard = false`, all labels and background frames are swept from the chart automatically.
