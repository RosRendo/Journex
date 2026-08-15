//+------------------------------------------------------------------+
//|                                                       Spread.mqh |
//|                                  Copyright 2026, AdaptiveICT     |
//|                                             https://www.mql5.com |
//+------------------------------------------------------------------+
#property copyright "Copyright 2026, AdaptiveICT"
#property link      "https://www.mql5.com"
#property version   "1.00"

//+------------------------------------------------------------------+
//| Get Current Broker Spread in points                              |
//+------------------------------------------------------------------+
int GetSpread()
  {
   return (int)SymbolInfoInteger(_Symbol, SYMBOL_SPREAD);
  }
