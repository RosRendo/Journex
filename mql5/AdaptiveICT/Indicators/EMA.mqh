//+------------------------------------------------------------------+
//|                                                          EMA.mqh |
//|                                  Copyright 2026, AdaptiveICT     |
//|                                             https://www.mql5.com |
//+------------------------------------------------------------------+
#property copyright "Copyright 2026, AdaptiveICT"
#property link      "https://www.mql5.com"
#property version   "1.00"

//+------------------------------------------------------------------+
//| Get EMA values for trend alignment checks                        |
//+------------------------------------------------------------------+
bool GetEMAs(ENUM_TIMEFRAMES tf, int p1, int p2, int p3, double &ema1, double &ema2, double &ema3)
  {
   double buf1[], buf2[], buf3[];
   ArraySetAsSeries(buf1, true);
   ArraySetAsSeries(buf2, true);
   ArraySetAsSeries(buf3, true);
   int h1 = iMA(_Symbol, tf, p1, 0, MODE_EMA, PRICE_CLOSE);
   int h2 = iMA(_Symbol, tf, p2, 0, MODE_EMA, PRICE_CLOSE);
   int h3 = iMA(_Symbol, tf, p3, 0, MODE_EMA, PRICE_CLOSE);
   if(h1 == INVALID_HANDLE || h2 == INVALID_HANDLE || h3 == INVALID_HANDLE)
     {
      if(h1 != INVALID_HANDLE) IndicatorRelease(h1);
      if(h2 != INVALID_HANDLE) IndicatorRelease(h2);
      if(h3 != INVALID_HANDLE) IndicatorRelease(h3);
      return false;
     }
   int c1 = CopyBuffer(h1, 0, 0, 1, buf1);
   int c2 = CopyBuffer(h2, 0, 0, 1, buf2);
   int c3 = CopyBuffer(h3, 0, 0, 1, buf3);
   IndicatorRelease(h1);
   IndicatorRelease(h2);
   IndicatorRelease(h3);
   if(c1 > 0 && c2 > 0 && c3 > 0)
     {
      ema1 = buf1[0];
      ema2 = buf2[0];
      ema3 = buf3[0];
      return true;
     }
   return false;
  }
