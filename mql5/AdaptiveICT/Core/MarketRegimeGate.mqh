//+------------------------------------------------------------------+
//|                                             MarketRegimeGate.mqh |
//|                                  Copyright 2026, AdaptiveICT     |
//|                                             https://www.mql5.com |
//+------------------------------------------------------------------+
#property copyright "Copyright 2026, AdaptiveICT"
#property link      "https://www.mql5.com"
#property version   "1.00"
#property once

#include "Types.mqh"

//+------------------------------------------------------------------+
//| T015: Market Regime Gate                                         |
//| Hard entry gate that enforces strategy-to-regime compatibility   |
//| before scoring or order generation occurs.                       |
//| Maps to: FR-006, US1                                             |
//+------------------------------------------------------------------+
class MarketRegimeGate
  {
public:
   // Evaluates whether a strategy is permitted to enter under the given market regime.
   // Maps to FR-006: Setup evaluation MUST reference active regime; strategies define which regimes permit entry.
   static bool IsRegimePermitted(string strategy_id, string regime)
     {
      string reg = regime;
      StringToUpper(reg);
      StringTrimLeft(reg);
      StringTrimRight(reg);

      string strat = strategy_id;
      StringToUpper(strat);
      StringTrimLeft(strat);
      StringTrimRight(strat);

      // Universally blocked regimes across all strategies
      if(reg == "UNKNOWN" || reg == "HIGH_VOLATILITY" || reg == "HIGH VOLATILITY")
        {
         return false;
        }

      // ICT Sniper and ICT Scalper (Trend & Structure-based strategies)
      // Accept: TRENDING_BULLISH, TRENDING_BEARISH, TRENDING, TRANSITION
      // Block: RANGING, LOW_VOLATILITY, HIGH_VOLATILITY, UNKNOWN
      if(StringFind(strat, "SNIPER") >= 0 || StringFind(strat, "SCALPER") >= 0 || StringFind(strat, "ICT") >= 0)
        {
         if(reg == "TRENDING_BULLISH" || reg == "TRENDING_BEARISH" || reg == "TRENDING" || reg == "TRANSITION")
           {
            return true;
           }
         return false; // Blocks RANGING, LOW_VOLATILITY, etc.
        }

      // Mean Reversion Strategy (trades exhaustion in ranging / low vol environments)
      if(StringFind(strat, "MEAN") >= 0 || StringFind(strat, "REVERSION") >= 0)
        {
         if(reg == "RANGING" || reg == "LOW_VOLATILITY" || reg == "LOW VOLATILITY")
           {
            return true;
           }
         return false;
        }

      // Breakout Strategy
      if(StringFind(strat, "BREAKOUT") >= 0)
        {
         if(reg == "TRENDING_BULLISH" || reg == "TRENDING_BEARISH" || reg == "TRENDING" || reg == "TRANSITION")
           {
            return true;
           }
         return false;
        }

      // Default fallback: allow if trending or transition, block ranging
      if(reg == "TRENDING_BULLISH" || reg == "TRENDING_BEARISH" || reg == "TRENDING" || reg == "TRANSITION")
        {
         return true;
        }

      return false;
     }
  };
