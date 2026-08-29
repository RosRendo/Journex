//+------------------------------------------------------------------+
//|                                                      Session.mqh |
//|                                  Copyright 2026, AdaptiveICT     |
//|                                             https://www.mql5.com |
//+------------------------------------------------------------------+
#property copyright "Copyright 2026, AdaptiveICT"
#property link      "https://www.mql5.com"
#property version   "1.00"

//+------------------------------------------------------------------+
//| Get Current Session based on Server Hour                         |
//+------------------------------------------------------------------+
string GetCurrentSession()
  {
   MqlDateTime dt;
   TimeToStruct(TimeCurrent(), dt);
   int hour = dt.hour;
   
   // London: 8-16, NY: 13-21, Asian: 0-8 (Server Time)
   if(hour >= 8 && hour < 16) return "LONDON";
   if(hour >= 13 && hour < 21) return "NEW YORK";
   if(hour >= 0 && hour < 8) return "ASIA";
   return "NONE";
  }
