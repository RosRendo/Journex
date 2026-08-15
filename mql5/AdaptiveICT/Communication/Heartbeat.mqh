//+------------------------------------------------------------------+
//|                                                     Heartbeat.mqh |
//|                                  Copyright 2026, AdaptiveICT     |
//|                                             https://www.mql5.com |
//+------------------------------------------------------------------+
#property copyright "Copyright 2026, AdaptiveICT"
#property link      "https://www.mql5.com"
#property version   "1.00"

#include "../Core/StateManager.mqh"
#include "../Market/MarketRegime.mqh"
#include "../Market/Session.mqh"
#include "../Risk/RiskManager.mqh"

//+------------------------------------------------------------------+
//| Build JSON Array of Open Positions                               |
//+------------------------------------------------------------------+
string BuildOpenTradesJson()
  {
   string json = "[";
   bool first = true;
   for(int i = PositionsTotal() - 1; i >= 0; i--)
     {
      if(PositionGetSymbol(i) == _Symbol && PositionGetInteger(POSITION_MAGIC) == InpMagic)
        {
         ulong ticket = PositionGetInteger(POSITION_TICKET);
         double open_price = PositionGetDouble(POSITION_PRICE_OPEN);
         double current_sl = PositionGetDouble(POSITION_SL);
         double current_tp = PositionGetDouble(POSITION_TP);
         double volume = PositionGetDouble(POSITION_VOLUME);
         double profit = PositionGetDouble(POSITION_PROFIT);
         long pos_type = PositionGetInteger(POSITION_TYPE);
         string type_str = (pos_type == POSITION_TYPE_BUY) ? "BUY" : "SELL";
         
         bool be_active = (current_sl == open_price);
         bool trail_active = false;
         if(pos_type == POSITION_TYPE_BUY && current_sl > open_price) trail_active = true;
         if(pos_type == POSITION_TYPE_SELL && current_sl < open_price && current_sl > 0) trail_active = true;
         
         if(!first) json += ",";
         json += "{";
         json += "\"ticket\":" + IntegerToString(ticket) + ",";
         json += "\"symbol\":\"" + _Symbol + "\",";
         json += "\"type\":\"" + type_str + "\",";
         json += "\"volume\":" + DoubleToString(volume, 2) + ",";
         json += "\"price\":" + DoubleToString(open_price, 5) + ",";
         json += "\"sl\":" + DoubleToString(current_sl, 5) + ",";
         json += "\"tp\":" + DoubleToString(current_tp, 5) + ",";
         json += "\"pnl\":" + DoubleToString(profit, 2) + ",";
         json += "\"breakeven_active\":" + (be_active ? "true" : "false") + ",";
         json += "\"trailing_active\":" + (trail_active ? "true" : "false");
         json += "}";
         first = false;
        }
     }
   json += "]";
   return json;
  }

//+------------------------------------------------------------------+
//| Post Heartbeat stats to Python Bridge                            |
//+------------------------------------------------------------------+
void SendHeartbeatReport()
  {
   if(MQLInfoInteger(MQL_TESTER) || MQLInfoInteger(MQL_OPTIMIZATION)) return;
   string url = InpBridgeURL + "/api/ea/report";
   string headers = "Content-Type: application/json\r\n";
   
   double balance = AccountInfoDouble(ACCOUNT_BALANCE);
   double equity  = AccountInfoDouble(ACCOUNT_EQUITY);
   
   int today_trades = 0, today_wins = 0, today_losses = 0;
   double today_pnl = 0.0;
   GetTodayStats(today_trades, today_wins, today_losses, today_pnl);
   
   string ea_status = "running";
   if(is_disabled) ea_status = "disabled";
   else if(is_paused) ea_status = "paused";
   
   string open_trades_json = BuildOpenTradesJson();
   
   string body = "{";
   body += "\"magic\":" + IntegerToString(InpMagic) + ",";
   body += "\"account_id\":" + IntegerToString(AccountInfoInteger(ACCOUNT_LOGIN)) + ",";
   body += "\"name\":\"" + MQLInfoString(MQL_PROGRAM_NAME) + "\",";
   body += "\"symbol\":\"" + _Symbol + "\",";
   body += "\"status\":\"" + ea_status + "\",";
   body += "\"balance\":" + DoubleToString(balance, 2) + ",";
   body += "\"equity\":" + DoubleToString(equity, 2) + ",";
   body += "\"regime\":\"" + GetMarketRegime() + "\",";
   body += "\"htf_bias\":\"" + GetHTFBias() + "\",";
   body += "\"session\":\"" + GetCurrentSession() + "\",";
   body += "\"volatility\":\"" + GetVolatility() + "\",";
   
   body += "\"today_stats\":{";
   body += "\"trades\":" + IntegerToString(today_trades) + ",";
   body += "\"wins\":" + IntegerToString(today_wins) + ",";
   body += "\"losses\":" + IntegerToString(today_losses) + ",";
   body += "\"pnl\":" + DoubleToString(today_pnl, 2);
   body += "},";
   
   body += "\"open_trades\":" + open_trades_json + ",";
   
   body += "\"settings\":{";
   body += "\"risk\":" + DoubleToString(risk_percent, 2) + ",";
   body += "\"min_score\":" + IntegerToString(min_score) + ",";
   body += "\"min_rr\":" + DoubleToString(min_rr, 2) + ",";
   body += "\"session\":\"" + scan_session + "\",";
   body += "\"signal_type\":\"" + scan_type + "\"";
   body += "}";
   
   body += "}";
   
   char post_data[];
   StringToCharArray(body, post_data, 0, WHOLE_ARRAY, CP_UTF8);
    
   char result[];
   string result_headers;
   
   int res = WebRequest("POST", url, headers, 1000, post_data, result, result_headers);
   if(res >= 200 && res < 300) bridge_connected = true;
   else bridge_connected = false;
  }
