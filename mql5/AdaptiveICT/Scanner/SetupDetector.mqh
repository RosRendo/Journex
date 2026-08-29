//+------------------------------------------------------------------+
//|                                                SetupDetector.mqh |
//|                                  Copyright 2026, AdaptiveICT     |
//|                                             https://www.mql5.com |
//+------------------------------------------------------------------+
#property copyright "Copyright 2026, AdaptiveICT"
#property link      "https://www.mql5.com"
#property version   "1.00"

#include "../Core/Types.mqh"
#include "../Market/MarketData.mqh"
#include "../ICT/MarketStructure.mqh"
#include "../ICT/Liquidity.mqh"
#include "../ICT/FVG.mqh"
#include "../ICT/OrderBlock.mqh"

//+------------------------------------------------------------------+
//| Detect raw Smart Money / ICT structure setups                    |
//+------------------------------------------------------------------+
bool DetectSetup(ENUM_TIMEFRAMES tf, string tf_str, SignalCandidate &candidate)
  {
   // Initialize candidate DTO
   candidate.symbol = _Symbol;
   candidate.type = "NO_TRADE";
   candidate.tf = tf;
   candidate.tf_str = tf_str;
   candidate.entry_price = 0.0;
   candidate.invalidation_price = 0.0;
   candidate.reason = "";

   MqlSwing swings_high[], swings_low[];
   GetSwings(tf, 120, swings_high, swings_low);
   
   MqlSweep sweep;
   bool has_sweep = CheckLiquiditySweep(tf, 120, swings_high, swings_low, sweep);
   string mss = CheckMSS(tf, 120, swings_high, swings_low);
   
   MqlRates rates[];
   int copied = GetRates(tf, 5, rates);
   if(copied < 2) return false;
   double current_price = rates[copied - 1].close;

   // Scenario A: Liquidity Sweep followed by MSS (Strong SMC Reversal setup)
   if(mss == "BULLISH" && has_sweep && sweep.type == "SSL")
     {
      candidate.type = "BUY";
      candidate.entry_price = current_price;
      candidate.invalidation_price = sweep.level;
      candidate.reason = "MSS Bullish + SSL Sweep";
      return true;
     }
   if(mss == "BEARISH" && has_sweep && sweep.type == "BSL")
     {
      candidate.type = "SELL";
      candidate.entry_price = current_price;
      candidate.invalidation_price = sweep.level;
      candidate.reason = "MSS Bearish + BSL Sweep";
      return true;
     }
     
   // Scenario B: Pure Structure Shift
   if(mss == "BULLISH")
     {
      candidate.type = "BUY";
      candidate.entry_price = current_price;
      double lowest_low = current_price;
      int low_size = ArraySize(swings_low);
      if(low_size > 0) lowest_low = swings_low[low_size - 1].price;
      candidate.invalidation_price = lowest_low;
      candidate.reason = "MSS Bullish Structure Shift";
      return true;
     }
   if(mss == "BEARISH")
     {
      candidate.type = "SELL";
      candidate.entry_price = current_price;
      double highest_high = current_price;
      int high_size = ArraySize(swings_high);
      if(high_size > 0) highest_high = swings_high[high_size - 1].price;
      candidate.invalidation_price = highest_high;
      candidate.reason = "MSS Bearish Structure Shift";
      return true;
     }
     
   return false;
  }
