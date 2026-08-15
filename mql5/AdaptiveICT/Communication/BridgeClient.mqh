//+------------------------------------------------------------------+
//|                                                   BridgeClient.mqh |
//|                                  Copyright 2026, AdaptiveICT     |
//|                                             https://www.mql5.com |
//+------------------------------------------------------------------+
#property copyright "Copyright 2026, AdaptiveICT"
#property link      "https://www.mql5.com"
#property version   "1.00"

#include "../Core/StateManager.mqh"

//+------------------------------------------------------------------+
//| Simple Base HTTP WebRequest Client Helper                        |
//+------------------------------------------------------------------+
int HttpGet(string path, string &response)
  {
   string url = InpBridgeURL + path;
   string headers = "Content-Type: application/json\r\n";
   char post_data[];
   char result[];
   string result_headers;
   
   int res = WebRequest("GET", url, headers, 1000, post_data, result, result_headers);
   if(res == 200)
     {
      response = CharArrayToString(result, 0, WHOLE_ARRAY, CP_UTF8);
     }
   return res;
  }

int HttpPost(string path, string body, string &response)
  {
   string url = InpBridgeURL + path;
   string headers = "Content-Type: application/json\r\n";
   char post_data[];
   StringToCharArray(body, post_data, 0, WHOLE_ARRAY, CP_UTF8);
   char result[];
   string result_headers;
   
   int res = WebRequest("POST", url, headers, 1000, post_data, result, result_headers);
   if(res == 200)
     {
      response = CharArrayToString(result, 0, WHOLE_ARRAY, CP_UTF8);
     }
   return res;
  }
