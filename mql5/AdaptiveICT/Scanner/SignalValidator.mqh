//+------------------------------------------------------------------+
//|                                              SignalValidator.mqh |
//|                                  Copyright 2026, AdaptiveICT     |
//|                                             https://www.mql5.com |
//+------------------------------------------------------------------+
#property copyright "Copyright 2026, AdaptiveICT"
#property link      "https://www.mql5.com"
#property version   "1.00"

#include "../Core/Config.mqh"
#include "../Core/StateManager.mqh"

// Forward declaration of news block check to be resolved at assembly time
bool IsNewsBlocked();

//+------------------------------------------------------------------+
//| Verify Day, Time limits, Spread limits, and News block conditions |
//+------------------------------------------------------------------+
bool ValidateSignal(ENUM_TIMEFRAMES tf)
  {
   // Check Day & Friday Late Hours Filters
   MqlDateTime dt;
   TimeToStruct(TimeCurrent(), dt);
   if(dt.day_of_week == 1 && !InpAllowMonday) { Print("Monday trading disabled. Blocked."); return false; }
   if(dt.day_of_week == 5)
     {
      if(!InpAllowFriday) { Print("Friday trading disabled. Blocked."); return false; }
      if(dt.hour >= InpFridayCloseHour) { Print("Friday afternoon session block active. Blocked."); return false; }
     }
     
   // Check Spread Filter
   int cur_spread = (int)SymbolInfoInteger(_Symbol, SYMBOL_SPREAD);
   if(cur_spread > InpMaxSpreadPoints) { Print("Spread too high: ", cur_spread, " points (Limit: ", InpMaxSpreadPoints, "). Blocked."); return false; }
   
   // Check Economic News Filter
   if(IsNewsBlocked()) { Print("Economic News Block active. Blocked."); return false; }

   return true;
  }
