//+------------------------------------------------------------------+
//|                                                TradeReporter.mqh |
//|                                  Copyright 2026, AdaptiveICT     |
//|                                             https://www.mql5.com |
//+------------------------------------------------------------------+
#property copyright "Copyright 2026, AdaptiveICT"
#property link      "https://www.mql5.com"
#property version   "1.00"

#include "../Core/StateManager.mqh"

//+------------------------------------------------------------------+
//| Report Position Opens and Closes back to Dashboard log           |
//+------------------------------------------------------------------+
void SendTradeEvent(string action, ulong ticket, string type, double volume, double price, double sl, double tp, int confidence, string sig_id)
  {
   if(MQLInfoInteger(MQL_TESTER) || MQLInfoInteger(MQL_OPTIMIZATION)) return;
   string url = InpBridgeURL + "/api/ea/trade-event";
   string headers = "Content-Type: application/json\r\n";
   
   string body = "{";
   body += "\"magic\":" + IntegerToString(InpMagic) + ",";
   body += "\"account_id\":" + IntegerToString(AccountInfoInteger(ACCOUNT_LOGIN)) + ",";
   body += "\"ticket\":" + IntegerToString(ticket) + ",";
   body += "\"action\":\"" + action + "\",";
   body += "\"symbol\":\"" + _Symbol + "\",";
   body += "\"type\":\"" + type + "\",";
   body += "\"volume\":" + DoubleToString(volume, 2) + ",";
   body += "\"price\":" + DoubleToString(price, 5) + ",";
   body += "\"sl\":" + DoubleToString(sl, 5) + ",";
   body += "\"tp\":" + DoubleToString(tp, 5) + ",";
   body += "\"confidence\":" + IntegerToString(confidence) + ",";
   body += "\"signal_id\":\"" + sig_id + "\"";
   body += "}";
   
   char post_data[];
   StringToCharArray(body, post_data, 0, WHOLE_ARRAY, CP_UTF8);
   
   char result[];
   string result_headers;
   WebRequest("POST", url, headers, 1000, post_data, result, result_headers);
  }

//+------------------------------------------------------------------+
//| Report detected signal to the Python Bridge                      |
//+------------------------------------------------------------------+
void ReportSignalDetected(string id, string type, double entry, double sl, double tp, int score, string grade, string tf_str)
  {
   if(MQLInfoInteger(MQL_TESTER) || MQLInfoInteger(MQL_OPTIMIZATION)) return;
   string url = InpBridgeURL + "/api/ea/signal-detected";
   string headers = "Content-Type: application/json\r\n";
   
   string body = "{";
   body += "\"account_id\":" + IntegerToString(AccountInfoInteger(ACCOUNT_LOGIN)) + ",";
   body += "\"id\":\"" + id + "\",";
   body += "\"symbol\":\"" + _Symbol + "\",";
   body += "\"type\":\"" + type + "\",";
   body += "\"entry_price\":" + DoubleToString(entry, 5) + ",";
   body += "\"sl\":" + DoubleToString(sl, 5) + ",";
   body += "\"tp\":" + DoubleToString(tp, 5) + ",";
   body += "\"confidence\":" + IntegerToString(score) + ",";
   body += "\"grade\":\"" + grade + "\",";
   body += "\"timeframe\":\"" + tf_str + "\"";
   body += "}";
   
   char post_data[];
   StringToCharArray(body, post_data, 0, WHOLE_ARRAY, CP_UTF8);
   
   char result[];
   string result_headers;
   WebRequest("POST", url, headers, 1000, post_data, result, result_headers);
  }
