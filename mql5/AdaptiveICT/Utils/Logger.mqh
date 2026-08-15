//+------------------------------------------------------------------+
//|                                                       Logger.mqh |
//|                                  Copyright 2026, AdaptiveICT     |
//|                                             https://www.mql5.com |
//+------------------------------------------------------------------+
#property copyright "Copyright 2026, AdaptiveICT"
#property link      "https://www.mql5.com"
#property version   "1.00"

//+------------------------------------------------------------------+
//| Simple console output logging helper                             |
//+------------------------------------------------------------------+
void Log(string message)
  {
   Print("[AdaptiveICT] ", message);
  }
