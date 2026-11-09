//+------------------------------------------------------------------+
//|                                             StrategySelector.mqh |
//|                                  Copyright 2026, AdaptiveICT     |
//+------------------------------------------------------------------+
#property copyright "Copyright 2026, AdaptiveICT"
#property link      "https://www.mql5.com"
#property version   "1.00"
#property once

#include "Config.mqh"
#include "Types.mqh"
#include "../Strategies/BaseStrategy.mqh"
#include "../Strategies/ICT/ICTSniperStrategy.mqh"
#include "../Strategies/ICT/ICTScalperStrategy.mqh"
#include "../Strategies/MeanReversion/MeanReversionStrategy.mqh"
#include "../Strategies/Breakout/BreakoutStrategy.mqh"
#include "../Strategies/ICT/ZoneSniperStrategy.mqh"
#include "../Strategies/ICT/SwingTrendStrategy.mqh"

//+------------------------------------------------------------------+
//| Unified Strategy Selector                                        |
//| Maps the detected market regime to the engine best suited to     |
//| trade it, with hysteresis: minimum dwell time between switches   |
//| and a regime-confidence floor. Momentum Scalper is deliberately  |
//| NOT in the auto-pool (it is tick-driven and bypasses several     |
//| gates by design); it remains a manual, explicit choice.          |
//| The MarketRegimeGate remains the final authority per candidate.  |
//+------------------------------------------------------------------+

#define SEL_POOL_SIZE 6
#define SEL_TYPE_NONE ((ENUM_STRATEGY_TYPE)-1)

// Strategy pool (owned once, shared pointers)
BaseStrategy*       g_sel_pool[SEL_POOL_SIZE];
int                 g_sel_pool_count = 0;
ENUM_STRATEGY_TYPE  g_sel_pool_types[SEL_POOL_SIZE];

// Hysteresis state
ENUM_STRATEGY_TYPE  g_sel_current      = SEL_TYPE_NONE;
datetime            g_sel_dwell_until  = 0;
string              g_sel_last_reason  = "";

class StrategySelector
  {
public:
   //+------------------------------------------------------------------+
   //| Build the strategy pool (closed-bar engines only)                |
   //+------------------------------------------------------------------+
   static void BuildPool()
     {
      g_sel_pool_count = 0;
      g_sel_pool_types[0] = STRATEGY_SWING_TREND;      g_sel_pool[0] = new SwingTrendStrategy();
      g_sel_pool_types[1] = STRATEGY_ZONE_SNIPER;      g_sel_pool[1] = new ZoneSniperStrategy();
      g_sel_pool_types[2] = STRATEGY_ICT_SNIPER;       g_sel_pool[2] = new ICTSniperStrategy();
      g_sel_pool_types[3] = STRATEGY_ICT_SCALPER;      g_sel_pool[3] = new ICTScalperStrategy();
      g_sel_pool_types[4] = STRATEGY_MEAN_REVERSION;   g_sel_pool[4] = new MeanReversionStrategy();
      g_sel_pool_types[5] = STRATEGY_BREAKOUT;         g_sel_pool[5] = new BreakoutStrategy();
      g_sel_pool_count = SEL_POOL_SIZE;
      
      g_sel_current = SEL_TYPE_NONE;
      g_sel_dwell_until = 0;
     }
   
   //+------------------------------------------------------------------+
   //| Destroy the pool                                                 |
   //+------------------------------------------------------------------+
   static void DestroyPool()
     {
      for(int i = 0; i < g_sel_pool_count; i++)
        {
         if(g_sel_pool[i] != NULL)
           {
            delete g_sel_pool[i];
            g_sel_pool[i] = NULL;
           }
        }
      g_sel_pool_count = 0;
     }
   
   //+------------------------------------------------------------------+
   //| Currently selected strategy type                                 |
   //+------------------------------------------------------------------+
   static ENUM_STRATEGY_TYPE CurrentType()
     {
      return g_sel_current;
     }
   
   static string LastReason()
     {
      return g_sel_last_reason;
     }
   
   //+------------------------------------------------------------------+
   //| Strategy instance pointer for a pool type (NULL if not in pool)  |
   //+------------------------------------------------------------------+
   static BaseStrategy* GetStrategy(ENUM_STRATEGY_TYPE st)
     {
      for(int i = 0; i < g_sel_pool_count; i++)
         if(g_sel_pool_types[i] == st) return g_sel_pool[i];
      return NULL;
     }
   
   //+------------------------------------------------------------------+
   //| Rank engines for the given regime (most preferred first)         |
   //+------------------------------------------------------------------+
   static int GetPreference(ENUM_STRATEGY_TYPE st, string regime, string &reason)
     {
      StringToUpper(regime);
      
      if(regime == "TRENDING_BULLISH" || regime == "TRENDING_BEARISH")
        {
         if(st == STRATEGY_SWING_TREND)    { reason = "ride the trend: pullback entry, wide trail";   return 4; }
         if(st == STRATEGY_ZONE_SNIPER)    { reason = "trend continuation at discount/premium zones"; return 3; }
         if(st == STRATEGY_ICT_SNIPER)     { reason = "trend pullback with structure confirmation";   return 2; }
         if(st == STRATEGY_BREAKOUT)       { reason = "range break in established trend";             return 1; }
        }
      else if(regime == "RANGING")
        {
         if(st == STRATEGY_ZONE_SNIPER)    { reason = "premium/discount reversal inside range";       return 3; }
         if(st == STRATEGY_MEAN_REVERSION) { reason = "band exhaustion in range";                     return 2; }
        }
      else if(regime == "LOW_VOLATILITY")
        {
         if(st == STRATEGY_MEAN_REVERSION) { reason = "quiet market reverts to mean";                 return 2; }
         if(st == STRATEGY_ZONE_SNIPER)    { reason = "range extremes in quiet tape";                 return 1; }
        }
      else if(regime == "TRANSITION")
        {
         if(st == STRATEGY_ICT_SCALPER)    { reason = "fast structural scalps during regime shift";   return 2; }
         if(st == STRATEGY_ZONE_SNIPER)    { reason = "zone reversal at turn candidates";             return 1; }
        }
      
      return 0; // not viable for this regime
     }
   
   //+------------------------------------------------------------------+
   //| Choose the best viable engine for the regime (SEL_TYPE_NONE if   |
   //| nothing is viable — caller keeps the current engine and lets     |
   //| MarketRegimeGate block unsuitable entries).                      |
   //+------------------------------------------------------------------+
   static ENUM_STRATEGY_TYPE PickBest(const string regime, const int confidence, string &reason)
     {
      reason = "";
      if(confidence < InpSelMinRegimeConfidence)
        {
         reason = "regime confidence " + IntegerToString(confidence) + "% < " + IntegerToString(InpSelMinRegimeConfidence) + "%";
         return SEL_TYPE_NONE;
        }
      
      ENUM_STRATEGY_TYPE best = SEL_TYPE_NONE;
      int best_rank = 0;
      string best_reason = "";
      for(int i = 0; i < g_sel_pool_count; i++)
        {
         string why = "";
         int rank = GetPreference(g_sel_pool_types[i], regime, why);
         if(rank > best_rank)
           {
            best_rank = rank;
            best = g_sel_pool_types[i];
            best_reason = why;
           }
        }
      reason = best_reason;
      return best;
     }
   
   //+------------------------------------------------------------------+
   //| Hysteresis-aware selection update. Returns true if switched.     |
   //+------------------------------------------------------------------+
   static bool Update(const string regime, const int confidence, string &log_reason)
     {
      log_reason = "";
      string why = "";
      ENUM_STRATEGY_TYPE want = PickBest(regime, confidence, why);
      
      if(want == SEL_TYPE_NONE)
        {
         // Nothing viable: keep current engine; MarketRegimeGate blocks entries.
         g_sel_last_reason = "stand down: " + why;
         return false;
        }
      
      if(want == g_sel_current)
        {
         g_sel_last_reason = why;
         return false;
        }
      
      datetime now = TimeCurrent();
      if(g_sel_current != SEL_TYPE_NONE && now < g_sel_dwell_until)
        {
         g_sel_last_reason = "dwell hold until " + TimeToString(g_sel_dwell_until, TIME_MINUTES) + " (want: " + why + ")";
         return false;
        }
      
      // Switch engines
      g_sel_current = want;
      g_sel_dwell_until = now + (datetime)(InpSelMinDwellMin * 60);
      g_sel_last_reason = why;
      log_reason = why;
      return true;
     }
  };