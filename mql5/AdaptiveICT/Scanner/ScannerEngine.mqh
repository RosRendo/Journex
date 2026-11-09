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
//| Cached for 60s so tick-driven strategies (5s polls) do not hit    |
//| the HTTP bridge every scan; a downed bridge reads as no block     |
//| (fail-open) but the cached verdict keeps validation deterministic.|
//+------------------------------------------------------------------+
datetime g_news_cache_time = 0;
bool     g_news_cached_blocked = false;

bool IsNewsBlocked()
  {
   if(!InpUseNewsFilter) return false;
   
   datetime now = TimeCurrent();
   if(now - g_news_cache_time < 60) return g_news_cached_blocked; // 60s TTL cache
   
   string url = "/api/ea/news-block?symbol=" + _Symbol;
   string headers = "Content-Type: application/json\r\n";
   
   char post_data[];
   char result[];
   string result_headers;
   
   int res = WebRequest("GET", SanitizeStringInput(InpBridgeURL) + url, headers, 1000, post_data, result, result_headers);
   g_news_cache_time = now;
   g_news_cached_blocked = false;
   if(res == 200)
     {
      string response = CharArrayToString(result, 0, WHOLE_ARRAY, CP_UTF8);
      string blocked_str = ParseJsonString(response, "blocked");
      if(blocked_str == "true" || ParseJsonInt(response, "blocked") == 1)
        {
         string reason = ParseJsonString(response, "reason");
         Print("Trading blocked due to news: ", reason);
         g_news_cached_blocked = true;
        }
     }
   return g_news_cached_blocked;
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
