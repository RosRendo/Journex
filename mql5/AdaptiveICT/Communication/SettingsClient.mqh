//+------------------------------------------------------------------+
//|                                               SettingsClient.mqh |
//|                                  Copyright 2026, AdaptiveICT     |
//|                                             https://www.mql5.com |
//+------------------------------------------------------------------+
#property copyright "Copyright 2026, AdaptiveICT"
#property link      "https://www.mql5.com"
#property version   "1.00"

#include "../Core/StateManager.mqh"
#include "../Utils/PriceUtils.mqh"

// Forward declaration of emergency close function to avoid circular includes
void ExecuteEmergencyClose();

//+------------------------------------------------------------------+
//| Poll remote settings and command queue from the bridge           |
//+------------------------------------------------------------------+
void PollRemoteSettings()
  {
   string url = SanitizeStringInput(InpBridgeURL) + "/api/ea/settings/" + IntegerToString(InpMagic);
   string headers = "Content-Type: application/json\r\n";
   
   char post_data[];
   char result[];
   string result_headers;
   
   int res = WebRequest("GET", url, headers, 1000, post_data, result, result_headers);
   if(res == 200)
     {
      bridge_connected = true;
      string response = CharArrayToString(result, 0, WHOLE_ARRAY, CP_UTF8);
      
      // Parse settings
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
         if(new_session != "") scan_session = SanitizeStringInput(new_session);
         
         string new_type = ParseJsonString(response, "signal_type");
         if(new_type != "") scan_type = SanitizeStringInput(new_type);
         
         // Parse Preset fields
         string pos_mode = ParseJsonString(response, "position_mode");
         if(pos_mode == "SINGLE") dyn_position_mode = MODE_SINGLE;
         else if(pos_mode == "PARTIAL_EXIT") dyn_position_mode = MODE_PARTIAL_EXIT;
         // "GRID" is permanently disabled — ignore remote preset requests for MODE_GRID
         
         string use_trail = ParseJsonString(response, "use_equity_trail");
         if(use_trail == "true" || use_trail == "1") dyn_use_equity_trail = true;
         else if(use_trail == "false" || use_trail == "0") dyn_use_equity_trail = false;
         
         double eq_trail_act = ParseJsonDouble(response, "equity_trail_activate");
         if(eq_trail_act > 0) dyn_equity_trail_activate = eq_trail_act;
         
         double hard_stop = ParseJsonDouble(response, "hard_stop_pct");
         if(hard_stop > 0) dyn_hard_stop_pct = hard_stop;
         
         int cd = ParseJsonInt(response, "pyramid_cooldown");
         if(cd > 0) dyn_pyramid_cooldown = cd;

         double max_comp = ParseJsonDouble(response, "max_balance_compounding");
         if(max_comp >= 0) dyn_max_balance_compounding = max_comp;
        }
        
      // Parse commands
      string cmd = ParseJsonString(response, "command");
      if(cmd != "" && cmd != "null")
        {
         Print("Received Emergency Command: ", cmd);
         if(cmd == "CLOSE_ALL")
           {
            ExecuteEmergencyClose();
           }
         else if(cmd == "PAUSE")
           {
            is_paused = true;
            Print("EA Trading Paused.");
           }
         else if(cmd == "DISABLE")
           {
            is_disabled = true;
            ExecuteEmergencyClose();
            Print("EA Strategy Disabled.");
           }
         else if(cmd == "RESUME")
           {
            is_paused = false;
            is_disabled = false;
            Print("EA Strategy Resumed.");
           }
        }
     }
   else
     {
      bridge_connected = false;
     }
  }
