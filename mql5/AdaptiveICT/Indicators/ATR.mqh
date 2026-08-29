//+------------------------------------------------------------------+
//|                                                          ATR.mqh |
//|                                  Copyright 2026, AdaptiveICT     |
//|                                             https://www.mql5.com |
//+------------------------------------------------------------------+
#property copyright "Copyright 2026, AdaptiveICT"
#property link      "https://www.mql5.com"
#property version   "1.00"

//+------------------------------------------------------------------+
//| Get ATR indicator value                                          |
//+------------------------------------------------------------------+
double GetATR(ENUM_TIMEFRAMES tf, int period)
  {
   MqlRates rates[];
   // We need period + 1 bars to calculate True Ranges
   int copied = CopyRates(_Symbol, tf, 0, period + 1, rates);
   if(copied < period + 1) return 0.0;
   
   ArraySetAsSeries(rates, true);
   
   double tr_sum = 0.0;
   for(int i = 0; i < period; i++)
     {
      double high = rates[i].high;
      double low = rates[i].low;
      double prev_close = rates[i+1].close;
      
      double tr = high - low;
      double diff1 = MathAbs(high - prev_close);
      double diff2 = MathAbs(low - prev_close);
      
      if(diff1 > tr) tr = diff1;
      if(diff2 > tr) tr = diff2;
      
      tr_sum += tr;
     }
   
   return tr_sum / period;
  }
