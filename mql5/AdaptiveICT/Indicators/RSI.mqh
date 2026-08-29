//+------------------------------------------------------------------+
//|                                                          RSI.mqh |
//|                                  Copyright 2026, AdaptiveICT     |
//|                                             https://www.mql5.com |
//+------------------------------------------------------------------+
#property copyright "Copyright 2026, AdaptiveICT"
#property link      "https://www.mql5.com"
#property version   "1.00"

//+------------------------------------------------------------------+
//| Get RSI indicator value                                          |
//+------------------------------------------------------------------+
double GetRSI(ENUM_TIMEFRAMES tf, int period)
  {
   double rsi_buf[];
   ArraySetAsSeries(rsi_buf, true);
   int handle = iRSI(_Symbol, tf, period, PRICE_CLOSE);
   if(handle == INVALID_HANDLE) return 50.0;
   int copied = CopyBuffer(handle, 0, 0, 1, rsi_buf);
   IndicatorRelease(handle);
   if(copied > 0) return rsi_buf[0];
   return 50.0;
  }
