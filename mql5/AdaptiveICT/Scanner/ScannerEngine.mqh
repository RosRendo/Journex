//+------------------------------------------------------------------+
//|                                                ScannerEngine.mqh |
//|                                  Copyright 2026, AdaptiveICT     |
//|                                             https://www.mql5.com |
//+------------------------------------------------------------------+
#property copyright "Copyright 2026, AdaptiveICT"
#property link      "https://www.mql5.com"
#property version   "1.00"
#property once

#include "../Core/Types.mqh"
#include "../Core/Config.mqh"
#include "../Core/StateManager.mqh"
#include "SignalValidator.mqh"

//+------------------------------------------------------------------+
//| Check Economic Calendar news block from Python Bridge            |
//+------------------------------------------------------------------+
bool IsNewsBlocked()
  {
   if(MQLInfoInteger(MQL_TESTER) || MQLInfoInteger(MQL_OPTIMIZATION)) return false;
   if(!InpUseNewsFilter) return false;
   
   string url = "/api/ea/news-block?symbol=" + _Symbol;
   string headers = "Content-Type: application/json\r\n";
   
   char post_data[];
   char result[];
   string result_headers;
   
   int res = WebRequest("GET", InpBridgeURL + url, headers, 1000, post_data, result, result_headers);
   if(res == 200)
     {
      string response = CharArrayToString(result, 0, WHOLE_ARRAY, CP_UTF8);
      string blocked_str = ParseJsonString(response, "blocked");
      if(blocked_str == "true" || ParseJsonInt(response, "blocked") == 1)
        {
         string reason = ParseJsonString(response, "reason");
         Print("Trading blocked due to news: ", reason);
         return true;
        }
     }
   return false;
  }

//+------------------------------------------------------------------+
//| Scan specific timeframe and populates validated candidate DTO    |
//+------------------------------------------------------------------+
bool ScanTimeframeForCandidate(ENUM_TIMEFRAMES tf, string tf_str, SignalCandidate &candidate, ConfluenceResult &confluence)
  {
   if(active_strategy == NULL) return false;
   
   // 1. Detect Raw Setup via polymorphic strategy scan
   if(!active_strategy.Scan(tf, tf_str, candidate)) return false;
   
   // 2. Compute Confluence Score & Filter minimum confluences
   confluence = active_strategy.CalculateConfluence(candidate);
   if(!confluence.is_valid) return false;
   
   // 3. Hard Filters Validation (News, Spread, Sessions)
   if(!ValidateSignal(tf)) return false;
   
   return true;
  }
