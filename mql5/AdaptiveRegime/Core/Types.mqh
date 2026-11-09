//+------------------------------------------------------------------+
//|                                                        Types.mqh |
//|                                          AdaptiveRegime EA       |
//+------------------------------------------------------------------+
#property copyright "AdaptiveRegime"
#property version   "1.00"
#property once

//+------------------------------------------------------------------+
//| Enums                                                            |
//+------------------------------------------------------------------+
enum ENUM_REGIME
  {
   REGIME_UNCERTAIN = 0,     // Unknown / conflicting conditions
   REGIME_BULL_STRONG,       // Strong bullish trend
   REGIME_BULL_WEAK,         // Weak / developing bullish
   REGIME_BEAR_STRONG,       // Strong bearish trend
   REGIME_BEAR_WEAK,         // Weak / developing bearish
   REGIME_RANGE,             // Sideways / ranging
   REGIME_VOL_EXPANSION,     // Volatility expansion event
   REGIME_VOL_COMPRESSION,   // Volatility compression
   REGIME_REVERSAL           // Potential reversal conditions
  };

enum ENUM_VOL_STATE
  {
   VOL_UNKNOWN = 0,
   VOL_COMPRESSION,
   VOL_NORMAL,
   VOL_EXPANSION
  };

enum ENUM_OP_MODE
  {
   OP_CONSERVATIVE = 0,
   OP_BALANCED,
   OP_AGGRESSIVE
  };

enum ENUM_DAY_ANCHOR
  {
   DAY_SERVER_MIDNIGHT = 0,
   DAY_ROLLING_24H
  };

enum ENUM_NEUNAVAILABLE_POLICY
  {
   NEWS_DATA_ALLOW = 0,      // Trade when news data unavailable
   NEWS_DATA_BLOCK           // Stop trading when news data unavailable
  };

//+------------------------------------------------------------------+
//| Structured Data Types                                            |
//+------------------------------------------------------------------+
struct RegimeResult
  {
   ENUM_REGIME       regime;
   int               confidence;      // 0..100
   ENUM_VOL_STATE    vol;             // volatility state
   int               bias;            // -1 bear / 0 flat / +1 bull
   string            reasons[5];      // component summaries (max 5)
   int               reason_count;
   datetime          evaluated_at;
   datetime          since;           // when current regime started (hysteresis)
   long              bars_in_regime;  // closed bars since regime start
  };

struct TradeSignal
  {
   string            strategy_id;     // e.g. "SCALP", "INTRADAY", "SWING"
   int               dir;             // +1 buy / -1 sell
   double            entry;           // planned entry (market: live price)
   double            sl;              // initial stop (broker-ready, normalized)
   double            tp;              // initial target (0 = managed exit only)
   double            score;           // strategy score 0..100
   string            reason;          // why this signal
   datetime          bar_time;        // signal bar open time (dedupe key)
   ENUM_TIMEFRAMES   tf;              // signal timeframe
  };

struct TradeAllocation
  {
   double            lots;            // broker-ready volume (0 = rejected)
   double            risk_pct;        // effective risk %
   double            risk_money;      // money at risk
   bool              ok;
   string            reject_reason;
  };
