//+------------------------------------------------------------------+
//|                                              AdaptiveICT_EA.mq5  |
//|                                  Copyright 2026, Antigravity AI   |
//|                                             https://localhost    |
//+------------------------------------------------------------------+
#property copyright "Copyright 2026, Antigravity AI"
#property link      "https://localhost"
#property version   "1.00"
#property strict

// --- Standard Library ---
#include <Trade\Trade.mqh>
CTrade trade;

// --- Inputs: Broker & Identity ---
input group "=== Bot Identity ==="
input int      InpMagic             = 88001;          // Magic Number
input string   InpBridgeURL         = "http://127.0.0.1:5003"; // Bridge URL (No trailing slash)

input group "=== Risk & Trade Management ==="
input double   InpRiskPercent       = 1.0;            // Risk Per Trade (%)
input double   InpMaxDailyLossPct   = 3.0;            // Max Daily Loss (%)
input int      InpMaxOpenTrades     = 3;              // Max Concurrent Open Trades
input double   InpMinRR             = 1.5;            // Minimum Risk Reward Ratio
input bool     InpUseBE             = true;           // Break-Even on TP1 Activation
input bool     InpTrailingStop      = true;           // Enable Trailing Stop
input double   InpTrailATRMult      = 1.5;            // Trailing Stop ATR Multiple

input group "=== Signals Scanning Settings ==="
input int      InpMinScore          = 70;             // Minimum Confluence Score (0-100)
input string   InpTimeframe         = "ALL";          // M5 / M15 / H1 / H4 / ALL
input string   InpSession           = "both";         // london / ny / both / all
input string   InpSignalType        = "all";          // all / ict_scalper / ict_intraday

// --- Internal Global Variables ---
datetime last_settings_poll = 0;
datetime last_report_time   = 0;
datetime last_signal_poll   = 0;
int      report_interval    = 10;                     // Seconds between heartbeat reports
int      settings_interval  = 5;                      // Seconds between settings checks
int      signal_interval    = 30;                     // Seconds between signal checks

// State cached variables (can be modified dynamically via Dashboard)
double   risk_percent;
double   max_daily_loss;
int      min_score;
double   min_rr;
string   scan_session;
string   scan_type;

// Tracker for executed signals to prevent double-entries
string   executed_signals[];

//+------------------------------------------------------------------+
//| Expert initialization function                                   |
//+------------------------------------------------------------------+
int OnInit()
  {
   trade.SetExpertMagicNumber(InpMagic);
   
   // Set local params from inputs initially
   risk_percent   = InpRiskPercent;
   max_daily_loss = InpMaxDailyLossPct;
   min_score      = InpMinScore;
   min_rr         = InpMinRR;
   scan_session   = InpSession;
   scan_type      = InpSignalType;
   
   EventSetTimer(1);
   Print("Adaptive ICT EA initialized with Magic: ", InpMagic);
   return(INIT_SUCCEEDED);
  }

//+------------------------------------------------------------------+
//| Expert deinitialization function                                 |
//+------------------------------------------------------------------+
void OnDeinit(const int reason)
  {
   EventKillTimer();
   Print("Adaptive ICT EA shutdown.");
  }

//+------------------------------------------------------------------+
//| Expert tick function                                             |
//+------------------------------------------------------------------+
void OnTick()
  {
   // Manage Trailing Stops on active positions
   if(InpTrailingStop)
     {
      ManageTrailingStop();
     }
  }

//+------------------------------------------------------------------+
//| Timer event function for HTTP calls                              |
//+------------------------------------------------------------------+
void OnTimer()
  {
   datetime now = TimeCurrent();
   
   // 1. Heartbeat reporting to bridge
   if(now - last_report_time >= report_interval)
     {
      SendHeartbeatReport();
      last_report_time = now;
     }
     
   // 2. Fetch remote settings changes
   if(now - last_settings_poll >= settings_interval)
     {
      PollRemoteSettings();
      last_settings_poll = now;
     }
     
   // 3. Scan for signals from bridge
   if(now - last_signal_poll >= signal_interval)
     {
      PollSignals();
      last_signal_poll = now;
     }
  }

//+------------------------------------------------------------------+
//| Post Heartbeat stats to Python Bridge                            |
//+------------------------------------------------------------------+
void SendHeartbeatReport()
  {
   string url = InpBridgeURL + "/api/ea/report";
   string headers = "Content-Type: application/json\r\n";
   
   // Calculate statistics
   double balance = AccountInfoDouble(ACCOUNT_BALANCE);
   double equity  = AccountInfoDouble(ACCOUNT_EQUITY);
   double profit  = AccountInfoDouble(ACCOUNT_PROFIT);
   int open_trades = 0;
   
   for(int i = PositionsTotal() - 1; i >= 0; i--)
     {
      if(PositionGetSymbol(i) == _Symbol && PositionGetInteger(POSITION_MAGIC) == InpMagic)
         open_trades++;
     }
     
   // Build JSON payload manually (MQL5 friendly)
   string body = "{";
   body += "\"magic\":" + IntegerToString(InpMagic) + ",";
   body += "\"name\":\"" + MQLInfoString(MQL_PROGRAM_NAME) + "\",";
   body += "\"symbol\":\"" + _Symbol + "\",";
   body += "\"status\":\"running\",";
   body += "\"balance\":" + DoubleToString(balance, 2) + ",";
   body += "\"equity\":" + DoubleToString(equity, 2) + ",";
   body += "\"open_trades\":" + IntegerToString(open_trades) + ",";
   body += "\"daily_pnl\":" + DoubleToString(profit, 2) + ",";
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
   if(res == -1)
     {
      Print("EA report failed. Check Tools -> Options -> Expert Advisors -> Allow WebRequest for URL: ", InpBridgeURL);
     }
  }

//+------------------------------------------------------------------+
//| Retrieve settings changes queued on the Python Bridge            |
//+------------------------------------------------------------------+
void PollRemoteSettings()
  {
   string url = InpBridgeURL + "/api/ea/settings/" + IntegerToString(InpMagic);
   string headers = "Content-Type: application/json\r\n";
   
   char post_data[];
   char result[];
   string result_headers;
   
   int res = WebRequest("GET", url, headers, 1000, post_data, result, result_headers);
   if(res == 200)
     {
      string response = CharArrayToString(result, 0, WHOLE_ARRAY, CP_UTF8);
      
      // Parse "settings" block manually
      if(StringFind(response, "\"settings\":null") == -1 && StringFind(response, "\"settings\":{") != -1)
        {
         Print("Applying dynamic settings update from Dashboard...");
         
         double new_risk = ParseJsonDouble(response, "risk");
         if(new_risk > 0) risk_percent = new_risk;
         
         double new_rr = ParseJsonDouble(response, "min_rr");
         if(new_rr > 0) min_rr = new_rr;
         
         int new_score = ParseJsonInt(response, "min_score");
         if(new_score > 0) min_score = new_score;
         
         string new_session = ParseJsonString(response, "session");
         if(new_session != "") scan_session = new_session;
         
         string new_type = ParseJsonString(response, "signal_type");
         if(new_type != "") scan_type = new_type;
         
         Print("Updated settings -> Risk: ", risk_percent, "%, Min RR: ", min_rr, ", Min Score: ", min_score, ", Session: ", scan_session);
        }
     }
  }

//+------------------------------------------------------------------+
//| Scan for signals from bridge and execute matching setups         |
//+------------------------------------------------------------------+
void PollSignals()
  {
   // Query signals specifically matching our active timeframe/symbol and scoring filters
   string url = InpBridgeURL + "/api/signals?market=all&timeframe=" + InpTimeframe + 
                "&min_score=" + IntegerToString(min_score) + 
                "&min_rr=" + DoubleToString(min_rr, 1) + 
                "&session=" + scan_session + 
                "&signal_type=" + scan_type;
                
   string headers = "Content-Type: application/json\r\n";
   
   char post_data[];
   char result[];
   string result_headers;
   
   int res = WebRequest("GET", url, headers, 2000, post_data, result, result_headers);
   if(res == 200)
     {
      string response = CharArrayToString(result, 0, WHOLE_ARRAY, CP_UTF8);
      
      // Look for signals in the response array
      int start_pos = 0;
      while((start_pos = StringFind(response, "\"symbol\":", start_pos)) != -1)
        {
         // Extract symbol
         string sym = ParseJsonStringAt(response, "symbol", start_pos);
         if(sym == _Symbol)
           {
            string sig_id = ParseJsonStringAt(response, "id", start_pos);
            string type   = ParseJsonStringAt(response, "type", start_pos);
            
            // Check if signal has already been executed
            if(type != "NO_TRADE" && !IsSignalExecuted(sig_id))
              {
               double entry_price = ParseJsonDoubleAt(response, "entry_price", start_pos);
               double sl          = ParseJsonDoubleAt(response, "sl", start_pos);
               double tp          = ParseJsonDoubleAt(response, "tp", start_pos);
               int confidence     = ParseJsonIntAt(response, "confidence", start_pos);
               
               Print("Executing Signal ID: ", sig_id, " | Type: ", type, " | Entry: ", entry_price, " | SL: ", sl, " | TP: ", tp);
               
               if(ExecuteTrade(type, entry_price, sl, tp, confidence, sig_id))
                 {
                  AddExecutedSignal(sig_id);
                 }
              }
           }
         start_pos += 10; // Increment to search for next signal block
        }
     }
  }

//+------------------------------------------------------------------+
//| Execute Buy/Sell Trade with Lot size and Risk limits             |
//+------------------------------------------------------------------+
bool ExecuteTrade(string type, double entry, double sl, double tp, int confidence, string sig_id)
  {
   // Check current active trades for symbol/magic limit
   int open_count = 0;
   for(int i = PositionsTotal() - 1; i >= 0; i--)
     {
      if(PositionGetSymbol(i) == _Symbol && PositionGetInteger(POSITION_MAGIC) == InpMagic)
         open_count++;
     }
     
   if(open_count >= InpMaxOpenTrades)
     {
      Print("Max trades limit reached (", InpMaxOpenTrades, "). Rejecting execution.");
      return false;
     }
     
   // Calculate Dynamic Lot size based on Risk Percent & Stop Loss distance
   double balance = AccountInfoDouble(ACCOUNT_BALANCE);
   double risk_amount = balance * (risk_percent / 100.0);
   double tick_size = SymbolInfoDouble(_Symbol, SYMBOL_TRADE_TICK_SIZE);
   double tick_value = SymbolInfoDouble(_Symbol, SYMBOL_TRADE_TICK_VALUE);
   double sl_distance = MathAbs(entry - sl);
   
   if(sl_distance <= 0)
     {
      Print("Invalid stop loss distance. Rejecting execution.");
      return false;
     }
     
   double lot_step = SymbolInfoDouble(_Symbol, SYMBOL_VOLUME_STEP);
   double lot_min = SymbolInfoDouble(_Symbol, SYMBOL_VOLUME_MIN);
   double lot_max = SymbolInfoDouble(_Symbol, SYMBOL_VOLUME_MAX);
   
   double calculated_lots = (risk_amount) / ((sl_distance / tick_size) * tick_value);
   double lots = MathFloor(calculated_lots / lot_step) * lot_step;
   
   if(lots < lot_min) lots = lot_min;
   if(lots > lot_max) lots = lot_max;
   
   bool success = false;
   if(type == "BUY")
     {
      success = trade.Buy(lots, _Symbol, 0, sl, tp, "Dashboard Signal " + sig_id);
     }
   else if(type == "SELL")
     {
      success = trade.Sell(lots, _Symbol, 0, sl, tp, "Dashboard Signal " + sig_id);
     }
     
   if(success)
     {
      ulong ticket = trade.ResultOrder();
      SendTradeEvent("open", ticket, type, lots, entry, sl, tp, confidence, sig_id);
     }
   else
     {
      Print("Trade execution failed: ", trade.ResultRetcodeDescription());
     }
     
   return success;
  }

//+------------------------------------------------------------------+
//| Report Position Opens and Closes back to Dashboard log           |
//+------------------------------------------------------------------+
void SendTradeEvent(string action, ulong ticket, string type, double volume, double price, double sl, double tp, int confidence, string sig_id)
  {
   string url = InpBridgeURL + "/api/ea/trade-event";
   string headers = "Content-Type: application/json\r\n";
   
   string body = "{";
   body += "\"magic\":" + IntegerToString(InpMagic) + ",";
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
//| Manage trailing stop and move stop to Breakeven                  |
//+------------------------------------------------------------------+
void ManageTrailingStop()
  {
   // Calculate dynamic trailing distance using ATR
   double atr[];
   ArraySetAsSeries(atr, true);
   int atr_handle = iATR(_Symbol, PERIOD_CURRENT, 14);
   if(atr_handle == INVALID_HANDLE) return;
   
   if(CopyBuffer(atr_handle, 0, 0, 1, atr) <= 0) return;
   double current_atr = atr[0];
   double trail_distance = current_atr * InpTrailATRMult;
   
   for(int i = PositionsTotal() - 1; i >= 0; i--)
     {
      if(PositionGetSymbol(i) == _Symbol && PositionGetInteger(POSITION_MAGIC) == InpMagic)
        {
         ulong ticket = PositionGetInteger(POSITION_TICKET);
         double open_price = PositionGetDouble(POSITION_PRICE_OPEN);
         double current_sl = PositionGetDouble(POSITION_SL);
         double current_tp = PositionGetDouble(POSITION_TP);
         double current_price = (PositionGetInteger(POSITION_TYPE) == POSITION_TYPE_BUY) ? SymbolInfoDouble(_Symbol, SYMBOL_BID) : SymbolInfoDouble(_Symbol, SYMBOL_ASK);
         
         // Move to Breakeven
         if(InpUseBE && current_sl != open_price)
           {
            double break_even_target = (PositionGetInteger(POSITION_TYPE) == POSITION_TYPE_BUY) ? open_price + (MathAbs(open_price - current_sl) * 1.0) : open_price - (MathAbs(open_price - current_sl) * 1.0);
            if(PositionGetInteger(POSITION_TYPE) == POSITION_TYPE_BUY && current_price >= break_even_target)
              {
               trade.PositionModify(ticket, open_price, current_tp);
               SendTradeEvent("modify", ticket, "BUY", PositionGetDouble(POSITION_VOLUME), open_price, open_price, current_tp, 100, "BE");
              }
            else if(PositionGetInteger(POSITION_TYPE) == POSITION_TYPE_SELL && current_price <= break_even_target)
              {
               trade.PositionModify(ticket, open_price, current_tp);
               SendTradeEvent("modify", ticket, "SELL", PositionGetDouble(POSITION_VOLUME), open_price, open_price, current_tp, 100, "BE");
              }
           }
           
         // Trail the Stop Loss
         if(PositionGetInteger(POSITION_TYPE) == POSITION_TYPE_BUY)
           {
            double new_sl = current_price - trail_distance;
            if(new_sl > current_sl && new_sl > open_price)
              {
               trade.PositionModify(ticket, NormalizeDouble(new_sl, _Digits), current_tp);
              }
           }
         else if(PositionGetInteger(POSITION_TYPE) == POSITION_TYPE_SELL)
           {
            double new_sl = current_price + trail_distance;
            if((new_sl < current_sl || current_sl == 0) && new_sl < open_price)
              {
               trade.PositionModify(ticket, NormalizeDouble(new_sl, _Digits), current_tp);
              }
           }
        }
     }
  }

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
//+------------------------------------------------------------------+
bool IsSignalExecuted(string sig_id)
  {
   for(int i = 0; i < ArraySize(executed_signals); i++)
     {
      if(executed_signals[i] == sig_id) return true;
     }
   return false;
  }

void AddExecutedSignal(string sig_id)
  {
   int size = ArraySize(executed_signals);
   ArrayResize(executed_signals, size + 1);
   executed_signals[size] = sig_id;
   
   // Keep bounded tracking size
   if(ArraySize(executed_signals) > 100)
     {
      for(int i = 1; i < ArraySize(executed_signals); i++)
        {
         executed_signals[i-1] = executed_signals[i];
        }
      ArrayResize(executed_signals, 100);
     }
  }
