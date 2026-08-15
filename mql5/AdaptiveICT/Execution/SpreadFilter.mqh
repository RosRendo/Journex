//+------------------------------------------------------------------+
//|                                                SpreadFilter.mqh  |
//|                                  Copyright 2026, AdaptiveICT     |
//|                                             https://www.mql5.com |
//+------------------------------------------------------------------+
#property copyright "Copyright 2026, AdaptiveICT"
#property link      "https://www.mql5.com"
#property version   "1.00"
#property once

#include "../Core/Config.mqh"

//+------------------------------------------------------------------+
//| Spread Filter execution namespace                                |
//+------------------------------------------------------------------+
class SpreadFilter
  {
public:
   //+------------------------------------------------------------------+
   //| Validate spread before trade entry                               |
   //+------------------------------------------------------------------+
   static bool IsSpreadAcceptable()
     {
      int current_spread = (int)SymbolInfoInteger(_Symbol, SYMBOL_SPREAD);
      if(current_spread > InpMaxSpreadPoints)
        {
         Print("Blocked: Current spread (", current_spread, ") exceeds max spread (", InpMaxSpreadPoints, ")");
         return false;
        }
      return true;
     }
  };
