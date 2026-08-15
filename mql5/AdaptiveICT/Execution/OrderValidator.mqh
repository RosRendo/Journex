//+------------------------------------------------------------------+
//|                                               OrderValidator.mqh |
//|                                  Copyright 2026, AdaptiveICT     |
//|                                             https://www.mql5.com |
//+------------------------------------------------------------------+
#property copyright "Copyright 2026, AdaptiveICT"
#property link      "https://www.mql5.com"
#property version   "1.00"

#include "../Core/Types.mqh"
#include "../Core/Config.mqh"

//+------------------------------------------------------------------+
//| Validate proposed TradePlan against broker trading requirements   |
//+------------------------------------------------------------------+
bool IsExecutionAllowed(const TradePlan &plan)
  {
   // Validate against broker minimum stops level requirement
   double min_stop = SymbolInfoInteger(_Symbol, SYMBOL_TRADE_STOPS_LEVEL) * SymbolInfoDouble(_Symbol, SYMBOL_POINT);
   double sl_dist = MathAbs(plan.entry_price - plan.sl);
   if(sl_dist < min_stop)
     {
      Print("SL distance (", DoubleToString(sl_dist, 5), ") is smaller than broker min stops level (", DoubleToString(min_stop, 5), "). Blocked.");
      return false;
     }
     
   // Validate against minimum SL distance filter in pips
   double pip_size = (_Digits == 3 || _Digits == 5) ? 10.0 * SymbolInfoDouble(_Symbol, SYMBOL_POINT) : SymbolInfoDouble(_Symbol, SYMBOL_POINT);
   double min_sl_dist = InpMinSLPips * pip_size;
   if(sl_dist < min_sl_dist)
     {
      Print("SL distance (", DoubleToString(sl_dist / pip_size, 1), " pips) is smaller than minimum SL filter InpMinSLPips (", InpMinSLPips, " pips). Blocked.");
      return false;
     }
     
   return true;
  }
