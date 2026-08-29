//+------------------------------------------------------------------+
//|                                                          ADX.mqh |
//|                                  Copyright 2026, AdaptiveICT     |
//|                                             https://www.mql5.com |
//+------------------------------------------------------------------+
#property copyright "Copyright 2026, AdaptiveICT"
#property link      "https://www.mql5.com"
#property version   "1.00"

//+------------------------------------------------------------------+
//| Get ADX indicator and directional values                         |
//+------------------------------------------------------------------+
double GetADX(ENUM_TIMEFRAMES tf, int period, double &plus_di, double &minus_di)
  {
   double adx_buf[], plus_buf[], minus_buf[];
   ArraySetAsSeries(adx_buf, true);
   ArraySetAsSeries(plus_buf, true);
   ArraySetAsSeries(minus_buf, true);
   int handle = iADX(_Symbol, tf, period);
   if(handle == INVALID_HANDLE) return 0.0;
   int copied = CopyBuffer(handle, 0, 0, 1, adx_buf);
   int copied_p = CopyBuffer(handle, 1, 0, 1, plus_buf);
   int copied_m = CopyBuffer(handle, 2, 0, 1, minus_buf);
   IndicatorRelease(handle);
   if(copied > 0 && copied_p > 0 && copied_m > 0)
     {
      plus_di = plus_buf[0];
      minus_di = minus_buf[0];
      return adx_buf[0];
     }
   return 0.0;
  }
