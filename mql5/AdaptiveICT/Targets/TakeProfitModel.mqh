//+------------------------------------------------------------------+
//|                                              TakeProfitModel.mqh |
//|                                  Copyright 2026, AdaptiveICT     |
//|                                             https://www.mql5.com |
//+------------------------------------------------------------------+
#property copyright "Copyright 2026, AdaptiveICT"
#property link      "https://www.mql5.com"
#property version   "1.00"

#include "../Core/Types.mqh"
#include "../Core/Config.mqh"
#include "../Core/StateManager.mqh"

//+------------------------------------------------------------------+
//| Formulate the full TradePlan containing SL, TP1, TP2, TP3 targets|
//+------------------------------------------------------------------+
TradePlan CreateTradePlan(const SignalCandidate &candidate, const ConfluenceResult &confluence)
  {
   TradePlan plan;
   plan.symbol = candidate.symbol;
   plan.type = candidate.type;
   plan.entry_price = candidate.entry_price;
   plan.sl = candidate.invalidation_price;
   plan.confidence = confluence.score;
   plan.reasoning = candidate.reason;
   plan.signal_id = "";
   
   double entry = candidate.entry_price;
   double sl = candidate.invalidation_price;
   double dist = MathAbs(entry - sl);
   
   // Formulate multi-targets: TP1 (1.5R / BE trigger), TP2 (3R), TP3 (5R)
   if(candidate.type == "BUY")
     {
      plan.tp1 = NormalizeDouble(entry + (dist * 1.5), _Digits);
      plan.tp2 = NormalizeDouble(entry + (dist * 3.0), _Digits);
      plan.tp3 = NormalizeDouble(entry + (dist * 5.0), _Digits);
     }
   else if(candidate.type == "SELL")
     {
      plan.tp1 = NormalizeDouble(entry - (dist * 1.5), _Digits);
      plan.tp2 = NormalizeDouble(entry - (dist * 3.0), _Digits);
      plan.tp3 = NormalizeDouble(entry - (dist * 5.0), _Digits);
     }
     
   plan.risk_reward = dist > 0.0 ? MathAbs(plan.tp1 - entry) / dist : 0.0;
   
   return plan;
  }
