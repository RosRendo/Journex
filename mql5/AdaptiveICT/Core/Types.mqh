//+------------------------------------------------------------------+
//|                                                        Types.mqh |
//|                                  Copyright 2026, AdaptiveICT     |
//|                                             https://www.mql5.com |
//+------------------------------------------------------------------+
#property copyright "Copyright 2026, AdaptiveICT"
#property link      "https://www.mql5.com"
#property version   "1.00"
#property once

//+------------------------------------------------------------------+
//| Custom Structures for Scanner Core                               |
//+------------------------------------------------------------------+
struct MqlSwing
  {
   int               index;
   double            price;
   datetime          time;
   bool              is_high;
  };

struct MqlFVG
  {
   bool              is_bullish;
   int               index;
   double            top;
   double            bottom;
   datetime          time;
  };

struct MqlOB
  {
   bool              is_bullish;
   double            price_high;
   double            price_low;
   datetime          time;
  };

struct MqlSweep
  {
   string            type; // "SSL" or "BSL"
   double            level;
  };

struct MqlPositionState
  {
   ulong             ticket;
   bool              tp1_hit;
   bool              tp2_hit;
   double            original_sl;
   double            tp1;
   double            tp2;
   double            tp3;
  };

//+------------------------------------------------------------------+
//| Decoupled Data Transfer Objects (DTOs)                           |
//+------------------------------------------------------------------+
// TradeSignal is the core DTO produced by the Strategy layer.
// It carries all information needed by Risk, Execution, and Analytics layers.
// Strategies generate this. They do NOT call Buy() or Sell() directly.
struct TradeSignal
  {
   string            symbol;
   string            type;                  // "BUY", "SELL", "NO_TRADE"
   string            strategy_id;           // e.g. "ICT_SNIPER", "ICT_SCALPER"
   ENUM_TIMEFRAMES   signal_tf;             // Timeframe the signal was detected on
   ENUM_TIMEFRAMES   confirmation_tf;       // Higher TF used for confirmation bias
   ENUM_TIMEFRAMES   context_tf;            // Highest TF for directional context
   string            tf_str;               // Human-readable signal timeframe label
   double            entry_price;
   double            invalidation_price;    // Raw swing boundary (pre-risk sizing)
   string            reason;               // Human-readable signal reason
   string            signal_id;            // Unique signal de-duplication key
  };

// Kept as alias for backward compatibility during migration
#define SignalCandidate TradeSignal

struct ConfluenceResult
  {
   int               score;      // 0 to 100
   string            grade;      // "A+", "A", "B", "C", "Reject"
   bool              is_valid;
  };

struct TradePlan
  {
   string            symbol;
   string            type;       // "BUY", "SELL"
   double            entry_price;
   double            sl;
   double            tp1;
   double            tp2;
   double            tp3;
   double            risk_reward;
   string            reasoning;
   string            signal_id;
   int               confidence;
   double            lots;       // Calculated lot size based on risk parameters
  };
