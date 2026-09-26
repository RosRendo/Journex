//+------------------------------------------------------------------+
//|                                                       Config.mqh |
//|                                  Copyright 2026, AdaptiveICT     |
//|                                             https://www.mql5.com |
//+------------------------------------------------------------------+
#property copyright "Copyright 2026, AdaptiveICT"
#property link      "https://www.mql5.com"
#property version   "1.00"
#property once

//+------------------------------------------------------------------+
//| Strategy Type Enum                                               |
//+------------------------------------------------------------------+
enum ENUM_STRATEGY_TYPE
  {
   STRATEGY_ICT_SNIPER,   // ICT Sniper (Liquidity Sweep + MSS)
   STRATEGY_ICT_SCALPER,  // ICT Scalper (Fast structural scalp)
   STRATEGY_MEAN_REVERSION, // Mean Reversion (Session boundary reversal)
   STRATEGY_BREAKOUT,     // Breakout (Session range breakout)
   STRATEGY_MOMENTUM_SCALPER // Momentum Scalper (High-frequency Tick Data)
  };

//+------------------------------------------------------------------+
//| Position Manager Type Enum                                       |
//+------------------------------------------------------------------+
enum ENUM_POSITION_MODE
  {
   MODE_SINGLE,       // Single Position (Multi-TP + ATR Trail)
   MODE_PARTIAL_EXIT  // Partial Exit (Close % at RR, BE, trail remainder)
   // MODE_GRID removed: Constitution violation — grid/martingale permanently disabled (v0.1+)
  };

//+------------------------------------------------------------------+
//| === Bot Identity ===                                             |
//+------------------------------------------------------------------+
input group "=== Bot Identity ==="
input int      InpMagic             = 88001;          // Magic Number
input string   InpBridgeURL         = "http://127.0.0.1:5003"; // Bridge URL (No trailing slash)

//+------------------------------------------------------------------+
//| === Strategy Selection ===                                       |
//+------------------------------------------------------------------+
input group "=== Strategy Selection ==="
input ENUM_STRATEGY_TYPE InpStrategyType = STRATEGY_ICT_SNIPER; // Strategy Type
input string   InpSignalTimeframe   = "H1";           // Signal Timeframe (M1/M5/M15/H1/H4/ALL)
input string   InpContextTimeframe  = "H4";           // Context Timeframe (H4/D1)
input string   InpSession           = "both";         // Active Sessions (london/ny/both/all)
input bool     InpFilterToxicHours  = true;           // Filter Toxic Hours (London Lunch 10-12 & Rollover 23)

//+------------------------------------------------------------------+
//| === ICT Strategy Parameters ===                                  |
//+------------------------------------------------------------------+
input group "=== ICT Strategy Parameters ==="
input int      InpLiquidityLookback = 120;            // Swing Lookback (bars)
input int      InpMinScore          = 80;             // Minimum Confluence Score (0-100)
input string   InpSignalType        = "all";          // Signal Filter (all/ict_scalper/ict_intraday)

//+------------------------------------------------------------------+
//| === Technical Indicator Filters ===                              |
//+------------------------------------------------------------------+
input group "=== Technical Indicator Filters ==="
input bool     InpUseRSI            = false;          // Enable RSI Filter
input int      InpRSIPeriod         = 14;             // RSI Period
input double   InpRSIBuyMin         = 50.0;           // RSI Buy Min
input double   InpRSIBuyMax         = 70.0;           // RSI Buy Max
input double   InpRSISellMin        = 30.0;           // RSI Sell Min
input double   InpRSISellMax        = 50.0;           // RSI Sell Max
input bool     InpUseADX            = true;           // Enable ADX Filter
input int      InpADXPeriod         = 14;             // ADX Period
input double   InpADXMin            = 20.0;           // ADX Minimum strength
input double   InpADXMax            = 50.0;           // ADX Maximum strength
input bool     InpUseVolume         = true;           // Enable Volume Filter
input int      InpVolAvgPeriod      = 20;             // Volume Avg Period
input double   InpVolMinRatio       = 1.5;            // Volume Spike Ratio (e.g. 1.5x)
input bool     InpUseEMAFilter      = true;           // Enable EMA Alignment Filter
input int      InpEMA1Period        = 20;             // Fast EMA Period
input int      InpEMA2Period        = 50;             // Medium EMA Period
input int      InpEMA3Period        = 200;            // Slow EMA Period

//+------------------------------------------------------------------+
//| === SMT & MTF Settings ===                                       |
//+------------------------------------------------------------------+
input group "=== SMT & MTF Settings ==="
input bool     InpUseSMT            = true;           // Enable SMT Divergence Filter
input string   InpSMTSymbol         = "GBPUSD";       // Correlated SMT Symbol
input double   InpSMTMinPips        = 1.0;            // Minimum SMT Divergence (pips)
input bool     InpUseMTFConfluence  = true;           // Enable Multi-Timeframe Alignment

//+------------------------------------------------------------------+
//| === Mean Reversion Parameters ===                                |
//+------------------------------------------------------------------+
input group "=== Mean Reversion Parameters (Active when Strategy = Mean Reversion) ==="
input string   InpMRSessionStart    = "22:00";        // Asian Session Start (Server Time)
input string   InpMRSessionEnd      = "06:00";        // Asian Session End (Server Time)
input int      InpMRBBPeriod        = 20;             // Bollinger Band Period
input double   InpMRBBStdDev        = 2.0;            // Bollinger Band Std Deviation
input int      InpMRRSIPeriod       = 14;             // Mean Reversion RSI Period
input double   InpMRRSIOB           = 70.0;           // RSI Overbought Level
input double   InpMRRSIOS           = 30.0;           // RSI Oversold Level

//+------------------------------------------------------------------+
//| === Momentum Scalper Parameters ===                              |
//+------------------------------------------------------------------+
input group "=== Momentum Scalper Parameters ==="
input int      InpMomLookbackSec    = 30;             // Momentum Lookback (Seconds)
input double   InpMomThresholdPips  = 5.0;            // Required Tick Movement (Pips)
input double   InpMomSLATRMult      = 1.5;            // Momentum SL ATR Multiplier (Scalp SL)
input int      InpMomMaxHoldingSec  = 120;            // Max Holding Time (Seconds)
input int      InpPyramidCooldownSec = 5;             // Pyramid Entry Cooldown (Seconds)

//+------------------------------------------------------------------+
//| === Global Equity Nuke (Pyramiding) ===                          |
//+------------------------------------------------------------------+
input group "=== Global Equity Nuke (Pyramiding) ==="
input bool     InpUseEquityTrail         = true;      // Use Global Equity Trailing Stop
input double   InpEquityTrailActivatePct = 10.0;      // Activation Target (+% of Balance)
input double   InpEquityTrailDropPct     = 5.0;       // Trailing Distance (-% from Peak)
input double   InpHardEquityStopPct      = 15.0;      // Emergency Parachute (-% of Balance)

//+------------------------------------------------------------------+
//| === Position Management ===                                      |
//+------------------------------------------------------------------+
input group "=== Position Management ==="
input ENUM_POSITION_MODE InpPositionMode = MODE_SINGLE; // Position Manager Type
input bool     InpUseBE             = true;           // Break-Even on TP1 Activation (Single mode)
input bool     InpTrailingStop      = true;           // Enable Trailing Stop
input double   InpTrailATRMult      = 3.5;            // Trailing Stop ATR Multiple
// Partial Exit Mode settings
input double   InpPartialExitRR     = 1.0;            // RR to trigger partial exit (e.g. 1.0 = 1:1)
input double   InpPartialExitPct    = 50.0;           // % of position to close at partial exit
input bool     InpMoveSLToBE        = true;           // Move SL to Break-Even after partial exit
input double   InpBEOffsetPips      = 0.0;            // Break-Even offset (pips above/below entry)

//+------------------------------------------------------------------+
//| === Risk ===                                                     |
//+------------------------------------------------------------------+
input group "=== Risk ==="
input double   InpRiskPercent       = 3.0;            // Risk Per Trade (%)
input double   InpMaxDailyLossPct   = 3.0;            // Max Daily Loss (%)
input double   InpMaxDrawdownPct    = 10.0;           // Max Account Drawdown % (Kill Switch)
input int      InpMaxOpenTrades     = 3;              // Max Concurrent Open Trades
input double   InpMinRR             = 2.5;            // Minimum Risk Reward Ratio
input double   InpMaxBalanceCompounding = 0.0;        // Max Balance for Lot Sizing (0 = unlimited)

//+------------------------------------------------------------------+
//| === Execution & Spread Filters ===                               |
//+------------------------------------------------------------------+
input group "=== Execution & Spread Filters ==="
input int      InpMaxSpreadPoints   = 300;            // Maximum Spread (points)
input int      InpMaxSlippagePoints = 30;             // Maximum Slippage (points)
input int      InpMinSLPips         = 15;             // Minimum Stop Loss (Pips)
input bool     InpAllowMonday       = true;           // Allow Monday Trading
input bool     InpAllowFriday       = true;           // Allow Friday Trading
input int      InpFridayCloseHour   = 16;             // Friday Close Hour (Server time)
input bool     InpUseNewsFilter     = true;           // Enable News Filter (Poll from Bridge)

//+------------------------------------------------------------------+
//| === Research Mode (v0.1 Data Collection) ===                     |
//+------------------------------------------------------------------+
input group "=== Research Mode ==="
input bool     InpResearchModeOnly  = false;          // Research Mode Only (Simulate & Log Setups)

//+------------------------------------------------------------------+
//| === Risk Tiers (Score-Based Sizing) ===                          |
//+------------------------------------------------------------------+
input group "=== Risk Tiers ==="
input double   InpRiskTierLow       = 0.25;           // Low Quality Tier Risk (Score 60-69) %
input double   InpRiskTierNormal    = 0.5;            // Normal Tier Risk (Score 70-79) %
input double   InpRiskTierHigh      = 0.75;           // High Quality Tier Risk (Score 80-89) %
input double   InpRiskTierMax       = 1.0;            // Maximum Tier Risk (Score 90-100) %

//+------------------------------------------------------------------+
//| === Structural SL/TP Model ===                                   |
//+------------------------------------------------------------------+
input group "=== Structural SL/TP Model ==="
input double   InpSLATRBuffer       = 0.5;            // SL ATR Buffer (ATR units beyond structure)
input double   InpSLMinATR          = 1.0;            // Minimum SL in ATR units

//+------------------------------------------------------------------+
//| === Trade Health Monitoring ===                                  |
//+------------------------------------------------------------------+
input group "=== Trade Health Monitoring ==="
input int      InpHealthInvalidatedThreshold = 25;    // Health Score Invalidation Threshold (<25)
input int      InpHealthDangerThreshold      = 50;    // Health Score Danger Threshold (<50)
input int      InpHealthWeakeningThreshold   = 75;    // Health Score Weakening Threshold (<75)
input int      InpHealthDangerBarsToBlock    = 5;     // Danger Bars Count to Trigger Risk Protection

//+------------------------------------------------------------------+
//| === Entry Quality Scoring Component Weights ===                  |
//+------------------------------------------------------------------+
input group "=== Entry Quality Scoring Component Weights ==="
input int      InpScoreWeightRegime          = 15;    // Regime Weight (pts)
input int      InpScoreWeightHTFStructure    = 15;    // HTF Structure Weight (pts)
input int      InpScoreWeightLiquidity       = 15;    // Liquidity Weight (pts)
input int      InpScoreWeightEntryLocation   = 15;    // Entry Location Weight (pts)
input int      InpScoreWeightMSS             = 10;    // MSS / Market Structure Weight (pts)
input int      InpScoreWeightFVGOB           = 10;    // FVG / Order Block Weight (pts)
input int      InpScoreWeightSMT             = 5;     // SMT Divergence Weight (pts)
input int      InpScoreWeightVolatility      = 5;     // Volatility Weight (pts)
input int      InpScoreWeightSession         = 5;     // Session Weight (pts)
input int      InpScoreWeightExecQuality     = 5;     // Execution Quality Weight (pts)

//+------------------------------------------------------------------+
//| === Dashboard Display Settings ===                               |
//+------------------------------------------------------------------+
input group "=== Dashboard Display Settings ==="
input bool             InpShowDashboard     = true;               // Show Chart Dashboard Overlay
input bool             InpShowVisuals       = true;               // Show On-Chart Trade Drawings
input ENUM_BASE_CORNER InpDashboardCorner   = CORNER_LEFT_UPPER;  // Dashboard Chart Corner
input int              InpDashboardX        = 15;                 // Dashboard X Offset (pixels)
input int              InpDashboardY        = 20;                 // Dashboard Y Offset (pixels)

//+------------------------------------------------------------------+
//| Sanitize string inputs by removing MT5 preset metadata suffixes  |
//| (e.g. "H1||0||0||0||N" -> "H1"). .set files can deliver the raw  |
//| suffixed string into input variables, so every string consumer   |
//| must sanitize before literal comparisons or URL construction.    |
//+------------------------------------------------------------------+
string SanitizeStringInput(string input_val)
  {
   int find_idx = StringFind(input_val, "||");
   if(find_idx >= 0)
     {
      input_val = StringSubstr(input_val, 0, find_idx);
     }
   StringTrimLeft(input_val);
   StringTrimRight(input_val);
   return input_val;
  }

// Legacy alias kept for backward compatibility with existing ScannerEngine references
#define InpTimeframe InpSignalTimeframe
