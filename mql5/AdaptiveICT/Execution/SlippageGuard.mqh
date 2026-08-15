//+------------------------------------------------------------------+
//|                                               SlippageGuard.mqh  |
//|                                  Copyright 2026, AdaptiveICT     |
//|                                             https://www.mql5.com |
//+------------------------------------------------------------------+
#property copyright "Copyright 2026, AdaptiveICT"
#property link      "https://www.mql5.com"
#property version   "1.00"
#property once

#include "../Core/Config.mqh"

//+------------------------------------------------------------------+
//| Slippage Guard check namespace                                   |
//+------------------------------------------------------------------+
class SlippageGuard
  {
public:
   //+------------------------------------------------------------------+
   //| Verify execution price is acceptable compared to requested price |
   //+------------------------------------------------------------------+
   static bool IsExecutionPriceAcceptable(double requested_price, double actual_price)
     {
      if(requested_price <= 0.0 || actual_price <= 0.0) return false;
      
      double max_slippage_pips = InpMaxSlippagePoints * SymbolInfoDouble(_Symbol, SYMBOL_POINT);
      double deviation = MathAbs(actual_price - requested_price);
      
      if(deviation > max_slippage_pips)
        {
         Print("Post-trade Slippage Alert: Price slipped by ", DoubleToString(deviation / SymbolInfoDouble(_Symbol, SYMBOL_POINT), 1), " points.");
         return false;
        }
      return true;
     }
  };
