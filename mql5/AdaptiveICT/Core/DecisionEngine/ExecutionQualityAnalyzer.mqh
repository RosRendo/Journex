//+------------------------------------------------------------------+
//|                                     ExecutionQualityAnalyzer.mqh |
//|                                  Copyright 2026, AdaptiveICT     |
//|                                             https://www.mql5.com |
//+------------------------------------------------------------------+
#property copyright "Copyright 2026, AdaptiveICT"
#property link      "https://www.mql5.com"
#property version   "1.00"
#property once

#include "../../Market/Session.mqh"

class ExecutionQualityAnalyzer
  {
public:
   // Evaluates terminal spread and conditions. Returns execution score (0-100)
   static int Evaluate(string allowed_session, int max_spread, int &spread_points, bool &session_pass)
     {
      double bid = SymbolInfoDouble(_Symbol, SYMBOL_BID);
      double ask = SymbolInfoDouble(_Symbol, SYMBOL_ASK);
      double point = SymbolInfoDouble(_Symbol, SYMBOL_POINT);
      if(point == 0) return 0;
      
      spread_points = (int)MathRound((ask - bid) / point);
      string session = GetCurrentSession();
      
      session_pass = false;
      if(allowed_session == "all" || allowed_session == "both") session_pass = true;
      else if(allowed_session == "london" && (session == "LONDON" || session == "LONDON & NY")) session_pass = true;
      else if(allowed_session == "ny" && (session == "NEW YORK" || session == "LONDON & NY")) session_pass = true;
      else if(session != "NONE" && session != "ASIAN") session_pass = true; // both active
      
      int score = 100;
      
      // Deduct for high spread
      if(spread_points > max_spread)
        {
         score -= 50;
        }
      else if(spread_points > max_spread / 2)
        {
         score -= 20;
        }
        
      // Deduct if session is not active
      if(!session_pass)
        {
         score -= 40;
        }
        
      if(score < 0) score = 0;
      return score;
     }
  };
