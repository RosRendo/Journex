//+------------------------------------------------------------------+
//|                                                     StopModel.mqh |
//|                                  Copyright 2026, AdaptiveICT     |
//|                                             https://www.mql5.com |
//+------------------------------------------------------------------+
#property copyright "Copyright 2026, AdaptiveICT"
#property link      "https://www.mql5.com"
#property version   "1.00"
#property once

#include "../Core/Types.mqh"
#include "../Core/Config.mqh"
#include "../Indicators/ATR.mqh"

//+------------------------------------------------------------------+
//| T028 [US3]: Stop Loss Model with Structural Invalidation & ATR   |
//| Maps to: FR-018, FR-020                                          |
//+------------------------------------------------------------------+
class StopModel
  {
public:
   // Validates raw structural SL and applies ATR buffer
   // (1) computes ATR
   // (2) applies InpSLATRBuffer beyond raw_sl away from entry
   // (3) enforces minimum SL of InpSLMinATR units
   // (4) returns validated SL price; returns 0.0 if ATR <= 0
   static double ValidateAndBuffer(double entry, double raw_sl, ENUM_TIMEFRAMES tf)
     {
      if(entry <= 0.0 || raw_sl <= 0.0) return 0.0;

      double atr = GetATR(tf, 14);
      if(atr <= 0.0)
        {
         Print("[WARN] StopModel::ValidateAndBuffer: ATR computation returned 0.0 for tf=", EnumToString(tf));
         return 0.0;
        }

      double point = SymbolInfoDouble(_Symbol, SYMBOL_POINT);
      double min_pips_dist = (InpMinSLPips > 0 && point > 0.0) ? (InpMinSLPips * 10.0 * point) : 0.0;
      double min_atr_dist  = InpSLMinATR * atr;
      double min_dist = MathMax(min_atr_dist, min_pips_dist);

      double buffer = InpSLATRBuffer * atr;
      double buffered_sl = raw_sl;

      if(entry > raw_sl) // BUY: SL below entry
        {
         buffered_sl = raw_sl - buffer; // buffer further below
         double sl_dist = entry - buffered_sl;
         if(sl_dist < min_dist)
           {
            buffered_sl = entry - min_dist;
           }
        }
      else if(entry < raw_sl) // SELL: SL above entry
        {
         buffered_sl = raw_sl + buffer; // buffer further above
         double sl_dist = buffered_sl - entry;
         if(sl_dist < min_dist)
           {
            buffered_sl = entry + min_dist;
           }
        }

      return NormalizeDouble(buffered_sl, _Digits);
     }
  };

// Legacy backward-compatibility function
double GetStopLossPrice(string type) { return 0.0; }
