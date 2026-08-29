//+------------------------------------------------------------------+
//|                                                   PriceUtils.mqh |
//|                                  Copyright 2026, AdaptiveICT     |
//|                                             https://www.mql5.com |
//+------------------------------------------------------------------+
#property copyright "Copyright 2026, AdaptiveICT"
#property link      "https://www.mql5.com"
#property version   "1.00"

#include "../Core/StateManager.mqh"

//+------------------------------------------------------------------+
//| Simple string parsing helpers for JSON payload parsing            |
//+------------------------------------------------------------------+
double ParseJsonDouble(string json, string key)
  {
   return ParseJsonDoubleAt(json, key, 0);
  }

double ParseJsonDoubleAt(string json, string key, int search_start)
  {
   int key_pos = StringFind(json, "\"" + key + "\"", search_start);
   if(key_pos == -1) return 0;
   
   int val_start = StringFind(json, ":", key_pos);
   if(val_start == -1) return 0;
   val_start++;
   
   // Skip spaces
   while(val_start < StringLen(json) && (StringSubstr(json, val_start, 1) == " " || StringSubstr(json, val_start, 1) == "\t"))
      val_start++;
      
   int val_end = val_start;
   while(val_end < StringLen(json) && 
         (StringSubstr(json, val_end, 1) == "." || 
          (StringGetCharacter(json, val_end) >= '0' && StringGetCharacter(json, val_end) <= '9') ||
          StringSubstr(json, val_end, 1) == "-"))
      val_end++;
      
   string val_str = StringSubstr(json, val_start, val_end - val_start);
   return StringToDouble(val_str);
  }

int ParseJsonInt(string json, string key)
  {
   return ParseJsonIntAt(json, key, 0);
  }

int ParseJsonIntAt(string json, string key, int search_start)
  {
   return (int)ParseJsonDoubleAt(json, key, search_start);
  }

string ParseJsonString(string json, string key)
  {
   return ParseJsonStringAt(json, key, 0);
  }

string ParseJsonStringAt(string json, string key, int search_start)
  {
   int key_pos = StringFind(json, "\"" + key + "\"", search_start);
   if(key_pos == -1) return "";
   
   int val_start = StringFind(json, ":", key_pos);
   if(val_start == -1) return "";
   val_start++;
   
   // Skip spaces/quotes
   while(val_start < StringLen(json) && 
         (StringSubstr(json, val_start, 1) == " " || 
          StringSubstr(json, val_start, 1) == "\t" || 
          StringSubstr(json, val_start, 1) == "\""))
      val_start++;
      
   int val_end = val_start;
   while(val_end < StringLen(json) && StringSubstr(json, val_end, 1) != "\"")
      val_end++;
      
   return StringSubstr(json, val_start, val_end - val_start);
  }

//+------------------------------------------------------------------+
//| Manage Executed Signal tracking to prevent double executions      |
//| Signals are only blocked within the same calendar day.           |
//| The array auto-clears at the start of each new trading day so    |
//| the bot never goes silent for multiple days due to stale IDs.   |
//+------------------------------------------------------------------+
datetime _last_signal_clear_day = 0;

void ClearSignalsIfNewDay()
  {
   datetime now = TimeCurrent();
   // Get the start of the current day (midnight)
   datetime today_start = now - (now % 86400);
   if(today_start != _last_signal_clear_day)
     {
      ArrayResize(executed_signals, 0);
      _last_signal_clear_day = today_start;
     }
  }

bool IsSignalExecuted(string sig_id)
  {
   ClearSignalsIfNewDay();
   for(int i = 0; i < ArraySize(executed_signals); i++)
     {
      if(executed_signals[i] == sig_id) return true;
     }
   return false;
  }

void AddExecutedSignal(string sig_id)
  {
   ClearSignalsIfNewDay();
   int size = ArraySize(executed_signals);
   ArrayResize(executed_signals, size + 1);
   executed_signals[size] = sig_id;
  }
