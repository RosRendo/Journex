# Quickstart Guide: AdaptiveICT EA v0.5 Engine

This guide documents the configuration, parameters, architecture, and Strategy Tester validation workflow for the **AdaptiveICT Expert Advisor v0.5**.

---

## 1. Core Architecture Overview

AdaptiveICT EA is built around a non-negotiable quantitative and risk constitution:
- **No Martingale, No Grid, No Averaging Down**: Every trade executes with a hard structural stop loss and predefined risk ceiling.
- **Hard Risk Ceiling (1.0%)**: No trade may risk more than 1.0% of account equity.
- **Daily Drawdown Kill-Switch (3.0%)**: If daily drawdown reaches 3.0%, all EA execution stops immediately until the next trading day.
- **Explainable Entry Quality Scoring (0-100)**: Evaluates 10 weighted market components; setups below 60 points are blocked (`NO_TRADE`).
- **Post-Entry Trade Health Engine (0-100)**: Evaluates ongoing trade thesis continuation on each new bar; automatically closes the position at market if the thesis is invalidated (< 25).
- **Recovery State Machine**: Tracks symbol protection through 6 discrete states (`NORMAL` -> `WEAKENING` -> `RISK_PROTECTION` -> `OBSERVATION` -> `CONFIRMED` / `INVALIDATED`).
- **Score-Band Statistical Validation**: Dynamic risk tier gating. Scores 80+ are capped at `NORMAL` tier risk until statistically proven to outperform lower score bands.

---

## 2. Configurable Input Parameters

### 2.1 Research & Simulation Mode
| Input Parameter | Type | Default | Description |
|---|---|---|---|
| `InpResearchModeOnly` | `bool` | `false` | When `true`, suppresses all live execution. Evaluates and scores all qualifying setups, tracking virtual entry, SL, TP1-3, and bar-by-bar outcomes in `RESEARCH_[symbol]_[date].csv`. |

### 2.2 Dynamic Risk Tiers (Constitution-Constrained)
| Input Parameter | Type | Default | Description |
|---|---|---|---|
| `InpRiskTierMax` | `double` | `1.0%` | Risk allocated to MAXIMUM quality tier (Score 90-100). Capped at Normal tier until statistically validated. |
| `InpRiskTierHigh` | `double` | `0.75%` | Risk allocated to HIGH_QUALITY tier (Score 80-89). Capped at Normal tier until statistically validated. |
| `InpRiskTierNormal` | `double` | `0.5%` | Risk allocated to NORMAL tier (Score 70-79). |
| `InpRiskTierLow` | `double` | `0.25%` | Risk allocated to LOW tier (Score 60-69). |

### 2.3 Structural Stop Loss & Take Profit
| Input Parameter | Type | Default | Description |
|---|---|---|---|
| `InpSLATRBuffer` | `double` | `0.2` | Fraction of 14-period ATR added beyond structural swing boundary to prevent liquidity sweep stop-outs. |
| `InpSLMinATR` | `double` | `1.0` | Minimum allowable stop loss distance in ATR units. |
| `InpMinRR` | `double` | `1.5` | Minimum risk-to-reward ratio required for execution plan. |

### 2.4 Trade Health & Recovery State Machine
| Input Parameter | Type | Default | Description |
|---|---|---|---|
| `InpHealthWeakeningThreshold` | `int` | `75` | Score below 75 transitions trade health to `WEAKENING`. |
| `InpHealthDangerThreshold` | `int` | `50` | Score below 50 transitions trade health to `DANGER`. |
| `InpHealthInvalidatedThreshold`| `int` | `25` | Score below 25 triggers immediate market emergency close (`THESIS_INVALIDATED`). |
| `InpHealthDangerBarsToBlock` | `int` | `5` | Consecutive bars spent in `DANGER` required to transition symbol to `RISK_PROTECTION` (blocks all new entries). |

### 2.5 Explainable Score Component Weights (Total: 100)
- `InpScoreWeightRegime` (15)
- `InpScoreWeightHTFStructure` (15)
- `InpScoreWeightLiquidity` (15)
- `InpScoreWeightEntryLocation` (10)
- `InpScoreWeightMSS` (10)
- `InpScoreWeightFVGOB` (10)
- `InpScoreWeightSMT` (10)
- `InpScoreWeightVolatility` (5)
- `InpScoreWeightSession` (5)
- `InpScoreWeightExecQuality` (5)

---

## 3. Strategy Tester Validation Sequence (FR-045)

All EA engine updates must follow this strict 6-stage validation sequence:

```
[Development / Compile Check]
            │
            ▼
[Research Mode 90-Day Simulation] ──> Confirm zero orders, setup count > 0, full telemetry CSV
            │
            ▼
[Out-of-Sample Historical Backtest] ──> Full 12-month XAUUSD.a, realistic spread (20 pts), commission ($3/lot)
            │
            ▼
[Score-Band Statistical Validation] ──> Run StatisticsEngine; verify Bands 80-89 & 90-100 outperform 60-69
            │
            ▼
[Walk-Forward Multi-Regime Test] ──> Test across Trending, Ranging, and High-Volatility periods
            │
            ▼
[Demo / Forward Paper Execution] ──> Live VPS deployment with Active Bridge telemetry
```

### Realistic Broker Simulation Settings (FR-046)
- **Symbol**: `XAUUSD.a` (or standard `XAUUSD`)
- **Model**: "Every tick based on real ticks"
- **Spread**: Current or fixed 20 points (0.20 on Gold)
- **Commission**: $3.00 per lot ($6.00 round turn)
- **Execution**: Instant / Market execution with slippage enabled

---

## 4. Verification Checkpoint Commands

Compile and verify 0 errors from workspace:
```cmd
compile_check.bat
```
Output log is generated in `mql5/AdaptiveICT/compile_check.log`. Confirm:
```
Result: 0 errors, 1 warnings, cpu='X64 Regular'
```
