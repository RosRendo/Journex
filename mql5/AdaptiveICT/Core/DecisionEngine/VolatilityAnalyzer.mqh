//+------------------------------------------------------------------+
//|                                           VolatilityAnalyzer.mqh |
//|                                  Copyright 2026, AdaptiveICT     |
//|                                             https://www.mql5.com |
//+------------------------------------------------------------------+
#property copyright "Copyright 2026, AdaptiveICT"
#property link      "https://www.mql5.com"
#property version   "1.00"
#property once

class VolatilityAnalyzer
  {
public:
   // Classifies volatility and returns lot multiplier
   static string Analyze(ENUM_TIMEFRAMES tf, double &multiplier)
     {
      multiplier = 1.0;
      double atr_buf[];
      ArraySetAsSeries(atr_buf, true);
      
      int h_atr = iATR(_Symbol, tf, 14);
      if(h_atr == INVALID_HANDLE || CopyBuffer(h_atr, 0, 0, 1, atr_buf) <= 0)
        {
         if(h_atr != INVALID_HANDLE) IndicatorRelease(h_atr);
         return "NORMAL";
        }
      double atr = atr_buf[0];
      IndicatorRelease(h_atr);
      
      double current_price = SymbolInfoDouble(_Symbol, SYMBOL_ASK);
      if(current_price == 0) return "NORMAL";
      
      double atr_pct = atr / current_price;
      
      if(atr_pct < 0.0004)
        {
         multiplier = 0.0; // avoid trading
         return "LOW";
        }
      if(atr_pct > 0.0035)
        {
         multiplier = 0.5; // reduce size
         return "EXTREME";
        }
      if(atr_pct > 0.0015)
        {
         multiplier = 1.0; // high volatility opportunity
         return "HIGH";
        }
        
      multiplier = 1.0;
      return "NORMAL";
     }
  };
