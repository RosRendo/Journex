//+------------------------------------------------------------------+
//|                                            LiquidityAnalyzer.mqh |
//|                                  Copyright 2026, AdaptiveICT     |
//|                                             https://www.mql5.com |
//+------------------------------------------------------------------+
#property copyright "Copyright 2026, AdaptiveICT"
#property link      "https://www.mql5.com"
#property version   "1.00"
#property once

#include "../../ICT/Liquidity.mqh"
#include "../../ICT/SMT.mqh"

class LiquidityAnalyzer
  {
public:
   // Analyzes liquidity levels and SMT divergences
   static void Analyze(ENUM_TIMEFRAMES tf, string type, bool &has_sweep, bool &smt_div, string p_smt_symbol)
     {
      has_sweep = false;
      smt_div = false;
      
      MqlSwing swings_high[], swings_low[];
      GetSwings(tf, 120, swings_high, swings_low);
      
      MqlSweep sweep;
      has_sweep = CheckLiquiditySweep(tf, 120, swings_high, swings_low, sweep);
      
      // SMT checks
      smt_div = CheckSMT(tf, p_smt_symbol);
     }
  };
