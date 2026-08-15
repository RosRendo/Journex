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
   double atr[];
   ArraySetAsSeries(atr, true);
   int handle = iATR(_Symbol, tf, period);
   if(handle == INVALID_HANDLE) return 0.0;
   int copied = CopyBuffer(handle, 0, 0, 1, atr);
   if(copied > 0) return atr[0];
   return 0.0;
  }
