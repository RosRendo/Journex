//+------------------------------------------------------------------+
//|                                                        Config.mqh|
//|                                          AdaptiveRegime EA       |
//+------------------------------------------------------------------+
#property copyright "AdaptiveRegime"
#property version   "1.00"
#property once
#include "Types.mqh"

#ifndef AR_TEST_MASK
#define AR_TEST_MASK (-1)
#endif

bool AREngineAllowed(const int id)
  {
   if(AR_TEST_MASK < 0) return true;
   return ((AR_TEST_MASK & (1 << id)) != 0);
  }

int ARIntraEndHour()
  {
#ifdef AR_FORCE_INTRA_END
   return AR_FORCE_INTRA_END;
#else
   return InpIntraRangeEndHour;
#endif
  }

double ARMinRR()
  {
#ifdef AR_FORCE_MINRR
   return AR_FORCE_MINRR;
#else
   return InpMinRR;
#endif
  }

int ARTradeStartHour()
  {
#ifdef AR_FORCE_STARTHOUR
   return AR_FORCE_STARTHOUR;
#else
   return InpTradeStartHour;
#endif
  }

int ARTradeEndHour()
  {
#ifdef AR_FORCE_ENDHOUR
   return AR_FORCE_ENDHOUR;
#else
   return InpTradeEndHour;
#endif
  }

bool ARSetupOpen()
  {
#ifdef AR_SETUP_OPEN
   return true;
#else
   return false;
#endif
  }

bool ARStormSkip()
  {
#ifdef AR_STORM_SKIP
   return true;
#else
   return false;
#endif
  }

bool ARSelfThrottle()
  {
#ifdef AR_SELF_THROTTLE
   return true;
#else
   return false;
#endif
  }



double AROvershoot()
  {
#ifdef AR_FORCE_OVERSHOOT
   return AR_FORCE_OVERSHOOT;
#else
   return InpMinLotRiskOvershoot;
#endif
  }

bool ARRangeOn()
  {
#ifdef AR_NO_RANGE
   return false;
#else
   return true;
#endif
  }

double ARMarginCapPct()
  {
#ifdef AR_FORCE_MARGINCAP
   return (double)AR_FORCE_MARGINCAP;
#else
   return InpMaxMarginPerTradePct;
#endif
  }

//+------------------------------------------------------------------+
//| === 1. General ===                                               |
//+------------------------------------------------------------------+
input group "=== 1. General ==="
input int      InpMagic                 = 77001;      // Magic Number (position ownership)
input int      InpTerminalSlippagePts   = 50;         // Terminal Max Deviation (points)

//+------------------------------------------------------------------+
//| === 2. Symbols & Timeframes ===                                  |
//+------------------------------------------------------------------+
input group "=== 2. Symbols & Timeframes ==="
input ENUM_TIMEFRAMES InpBiasTF         = PERIOD_H4;  // Higher-Timeframe Bias
input ENUM_TIMEFRAMES InpSetupTF        = PERIOD_H1;  // Setup / Regime Timeframe
input ENUM_TIMEFRAMES InpEntryTF        = PERIOD_M15; // Entry / Execution Timeframe

//=== Operating Mode (changes risk multipliers & entry thresholds ONLY; hard caps are never bypassed)
input ENUM_OP_MODE InpOperatingMode     = OP_BALANCED; // Operating Mode

//+------------------------------------------------------------------+
//| === 4. Regime Detection ===                                      |
//+------------------------------------------------------------------+
input group "=== 4. Regime Detection ==="
input int      InpRegAdxPeriod          = 14;         // ADX Period
input double   InpRegAdxStrong          = 30.0;       // ADX: Strong Trend Level
input double   InpRegAdxWeak            = 20.0;       // ADX: Weak Trend Level
input int      InpRegEmaFast            = 50;         // EMA Fast Period
input int      InpRegEmaSlow            = 200;        // EMA Slow Period
input int      InpRegAtrPeriod          = 14;         // ATR Period
input int      InpRegBaselineBars       = 100;        // Volatility Baseline Window (bars)
input double   InpRegVolSpikeRatio      = 1.6;        // ATR/Baseline -> Vol EXPANSION
input double   InpRegVolDeadRatio       = 0.7;        // ATR/Baseline -> Vol COMPRESSION
input int      InpRegStructBars         = 60;         // Market Structure Lookback (bars)
input int      InpRegMinDwellBars       = 3;          // Min Regime Dwell (closed bars, hysteresis)
input int      InpRegMinConfidence      = 55;         // Min Confidence to Act on Regime (%)

//+------------------------------------------------------------------+
//| === 5. Scalping Engine (enabled in later phases) ===             |
//+------------------------------------------------------------------+
input group "=== 5. Scalping Engine ==="
input bool     InpScalpEnabled          = false;       // Enable Scalping Engine
input double   InpScalpMinMoveATR       = 0.5;        // Min Burst (x ATR of entry TF)
input bool     InpScalpAdaptiveThreshold= true;       // Scale Burst by sqrt(bars)
input int      InpScalpLookbackSec      = 900;        // Burst Lookback (Seconds, >= 2 bars)
input int      InpScalpCooldownSec      = 300;        // Entry Cooldown (Seconds)
input int      InpScalpMaxHoldSec       = 600;        // Max Holding (Seconds)
input double   InpScalpSLAtrMult        = 1.5;        // Scalp SL ATR Multiple
input int      InpScalpMaxSpreadPts     = 200;        // Scalp-Only Max Spread (points)

//+------------------------------------------------------------------+
//| === 6. Intraday Engine ===                                       |
//+------------------------------------------------------------------+
input group "=== 6. Intraday Engine ==="
input bool     InpIntradayEnabled       = true;       // Enable Intraday Engine
input int      InpIntraRangeStartHour   = 0;          // Session Range Start (server hour)
input int      InpIntraRangeEndHour     = 9;          // Session Range End (server hour)
input double   InpIntraBreakFrac        = 0.15;       // Breakout ATR Fraction
input bool     InpIntraSweepEnabled     = true;       // Enable Sweep+MSS Setups
input int      InpIntraSweepLookback    = 40;         // Sweep/MSS Lookback (bars)
input double   InpIntraSLAtrMult        = 2.0;        // Intraday SL ATR Multiple

//+------------------------------------------------------------------+
//| === 7. Swing Engine ===                                          |
//+------------------------------------------------------------------+
input group "=== 7. Swing Engine ==="
input bool     InpSwingEnabled          = false;       // Enable Swing Engine
input int      InpSwingRangeBars        = 60;         // Pullback Range (bars, entry TF)
input double   InpSwingPullbackPct      = 35.0;       // Discount/Premium Band (%)
input double   InpSwingSLAtrMult        = 2.5;        // Swing SL ATR Fallback
input bool     InpSwingUseBE            = true;       // Move SL to BE+0.1R
input double   InpSwingBETriggerRR      = 1.0;        // BE Trigger (RR)
input double   InpSwingPartialRR        = 2.0;        // Partial Exit RR (0=off)
input double   InpSwingPartialPct       = 50.0;       // Partial Size (%)
input double   InpSwingTrailATRMult     = 4.0;        // Trail ATR Multiple (setup TF ATR)

//+------------------------------------------------------------------+
//| === 8. Reversal Engine ===                                       |
//+------------------------------------------------------------------+
input group "=== 8. Reversal Engine ==="
input bool     InpReversalEnabled       = false;       // Enable Reversal Engine
input bool     InpReversalEarlyEntry    = false;      // Early Entry Mode (higher risk)
input int      InpRevLookback           = 60;         // Sweep Structure Lookback (bars)
input double   InpRevSLAtrMult          = 2.0;        // Reversal SL ATR Multiple
input double   InpRevWickMinPct         = 45.0;       // Rejection Wick Min (% of bar)

//+------------------------------------------------------------------+
//| === 9. Range / Mean-Reversion Engine ===                         |
//+------------------------------------------------------------------+
input group "=== 9. Range Engine ==="
input bool     InpRangeEnabled          = false;       // Enable Range Engine
input int      InpRangeLookback         = 80;         // Range Candidate Window (bars)
input int      InpRangeMinAge           = 10;         // Min Range Age (bars)
input double   InpRangeMinADX           = 20.0;       // Max Trend Strength in Range (ADX <)
input double   InpRangeSLAtrMult        = 1.2;        // Range SL ATR Multiple

//+------------------------------------------------------------------+
//| === 10. Breakout Engine ===                                      |
//+------------------------------------------------------------------+
input group "=== 10. Breakout Engine ==="
input bool     InpBreakoutEnabled       = false;       // Enable Breakout Engine
input int      InpBOLookback            = 50;         // Consolidation Lookback (bars)
input double   InpBOCompressionRatio    = 0.7;        // ATR/Baseline -> Compression (<)
input double   InpBOSLBufferAtr         = 0.5;        // SL Beyond Range (ATR fraction)
input int      InpBOValidBars           = 8;          // Breakout Signal Valid (bars)

//+------------------------------------------------------------------+
//| === 11. Risk Management ===                                      |
//+------------------------------------------------------------------+
input group "=== 11. Risk Management ==="
input double   InpRiskPerTradePct       = 0.25;       // Risk Per Trade (% equity) [hard cap]
input double   InpMaxAggregateRiskPct   = 1.0;        // Max Aggregate Open Risk (% equity)
input int      InpMaxOpenPositions      = 3;          // Max Open Positions
input int      InpMaxTradesPerDay       = 3;          // Max Entries per Day (0=off)
input double   InpMaxDailyLossPct       = 1.5;        // Max Daily Loss (% equity)
input double   InpMaxDrawdownPct        = 6.0;        // Max Equity Drawdown from Peak (%)
input int      InpMaxConsecutiveLosses  = 3;          // Max Consecutive Loss Positions
input int      InpConsecLossCooldownMin = 120;        // Cooldown After Loss Streak (minutes)
input double   InpMinRR                 = 1.5;        // Min Reward:Risk at Entry
input double   InpMinSLAtrMult          = 1.0;        // Min SL Distance (x ATR entry TF)
input double   InpMaxSLAtrMult          = 6.0;        // Max SL Distance (x ATR setup TF)
input double   InpMaxMarginPerTradePct  = 15.0;       // Max Margin per Trade (% equity)
input double   InpMaxMarginTotalPct     = 35.0;       // Max Total Margin (% equity)
input double   InpMaxRiskMoneyPerTrade  = 0.0;        // Hard Max Risk Money/Trade (0=off)
input double   InpMinLotRiskOvershoot   = 2.0;        // Allow Min Lot if Risk <= cap x this (0=off)
input bool     InpDailyProfitLockout    = false;      // Stop After Daily Profit Target
input double   InpDailyProfitTargetPct  = 1.0;        // Daily Profit Target (% equity)
input ENUM_DAY_ANCHOR InpDayAnchor      = DAY_SERVER_MIDNIGHT; // Daily Reset Anchor
input bool     InpLockoutCloseOpenTrades= false;      // Lockouts Also Close Open Trades
input double   InpEmergencyStopPct      = 4.0;        // Emergency Equity Stop from Peak (%)
input bool     InpEmergencyCloseAll     = true;       // Emergency Stop Closes All Trades

input group "=== 12. Stops & Targets ==="
input int      InpMinSLSpreadMult       = 3;          // SL >= 3x Spread (execution safety)

//+------------------------------------------------------------------+
//| === 13. Position Management ===                                  |
//+------------------------------------------------------------------+
input group "=== 13. Position Management ==="
input bool     InpUseBreakeven          = true;       // Master BE Switch
input bool     InpUseTrailing           = true;       // Master Trailing Switch
input double   InpTrailATRMultDefault   = 3.5;        // Default Trail ATR Multiple

//+------------------------------------------------------------------+
//| === 14. Sessions ===                                             |
//+------------------------------------------------------------------+
input group "=== 14. Sessions ==="
input bool     InpSessionFilter         = false;       // Restrict Trading Hours
input int      InpTradeStartHour        = 7;          // Trade Window Start (server hour)
input int      InpTradeEndHour          = 21;         // Trade Window End (server hour, excl)
input bool     InpAllowMonday           = true;       // Trade Mondays
input bool     InpAllowFriday           = true;       // Trade Fridays
input int      InpFridayCutoffHour      = 18;         // Friday Last Entry Hour (server)

//+------------------------------------------------------------------+
//| === 15. News Filters ===                                         |
//+------------------------------------------------------------------+
input group "=== 15. News Filters ==="
input bool     InpNewsEnabled           = false;      // Enable News Blackout
input string   InpNewsManualBlackout    = "";         // Manual Windows "HH:MM-HH:MM;..." (server, daily)
input ENUM_NEUNAVAILABLE_POLICY InpNewsUnavailablePolicy = NEWS_DATA_ALLOW; // When News Data Unavailable

//+------------------------------------------------------------------+
//| === 16. Execution Constraints ===                                |
//+------------------------------------------------------------------+
input group "=== 16. Execution Constraints ==="
input int      InpMaxSpreadPoints       = 400;        // Max Spread (points)
input double   InpMaxFillDeviationPct   = 0.30;       // Max Fill Deviation vs Planned Entry (%)

//+------------------------------------------------------------------+
//| === 17. Logging & Diagnostics ===                                |
//+------------------------------------------------------------------+
input group "=== 17. Logging & Diagnostics ==="
input int      InpLogLevel              = 1;          // Log Verbosity (0=errors, 1=info, 2=debug)
input bool     InpLogToFile             = true;       // Write Daily Log File
input bool     InpDashboardEnabled      = true;       // Enable Chart Dashboard
input bool     InpRunSelfTest           = true;       // Run Deterministic Self-Test on Init
