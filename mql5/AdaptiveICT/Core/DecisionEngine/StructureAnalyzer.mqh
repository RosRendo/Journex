//+------------------------------------------------------------------+
//|                                            StructureAnalyzer.mqh |
//|                                  Copyright 2026, AdaptiveICT     |
//|                                             https://www.mql5.com |
//+------------------------------------------------------------------+
#property copyright "Copyright 2026, AdaptiveICT"
#property link      "https://www.mql5.com"
#property version   "1.00"
#property once

#include "../../ICT/MarketStructure.mqh"
#include "../../ICT/FVG.mqh"
#include "../../ICT/OrderBlock.mqh"

class StructureAnalyzer
  {
public:
   // Analyzes current structure and populates flags
   static void Analyze(ENUM_TIMEFRAMES tf, string type, bool &mss_valid, bool &recent_fvg, bool &recent_ob, string &mss_state)
     {
      mss_valid = false;
      recent_fvg = false;
      recent_ob = false;
      
      MqlSwing swings_high[], swings_low[];
      GetSwings(tf, 120, swings_high, swings_low);
      
      mss_state = CheckMSS(tf, 120, swings_high, swings_low);
      if(type == "BUY" && mss_state == "BULLISH") mss_valid = true;
      if(type == "SELL" && mss_state == "BEARISH") mss_valid = true;
      
      // FVG checks
      MqlFVG fvgs[];
      GetFVGs(tf, 120, fvgs);
      int fvg_size = ArraySize(fvgs);
      for(int i = 0; i < MathMin(10, fvg_size); i++)
        {
         if(type == "BUY" && fvgs[i].is_bullish) recent_fvg = true;
         if(type == "SELL" && !fvgs[i].is_bullish) recent_fvg = true;
        }
        
      // Order Block checks
      MqlOB obs[];
      GetOrderBlocks(tf, 120, obs);
      int ob_size = ArraySize(obs);
      for(int i = 0; i < MathMin(15, ob_size); i++)
        {
         if(type == "BUY" && obs[i].is_bullish) recent_ob = true;
         if(type == "SELL" && !obs[i].is_bullish) recent_ob = true;
        }
     }
  };
