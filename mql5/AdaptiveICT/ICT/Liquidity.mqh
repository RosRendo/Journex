//+------------------------------------------------------------------+
//|                                                    Liquidity.mqh |
//|                                  Copyright 2026, AdaptiveICT     |
//|                                             https://www.mql5.com |
//+------------------------------------------------------------------+
#property copyright "Copyright 2026, AdaptiveICT"
#property link      "https://www.mql5.com"
#property version   "1.00"

#include "../Core/Types.mqh"
#include "../Market/MarketData.mqh"

//+------------------------------------------------------------------+
//| Check Liquidity Sweep (SSL/BSL sweeps on recent swing points)     |
//+------------------------------------------------------------------+
bool CheckLiquiditySweep(ENUM_TIMEFRAMES tf, int count, MqlSwing &swings_high[], MqlSwing &swings_low[], MqlSweep &sweep)
  {
   MqlRates rates[];
   int copied = GetRates(tf, count, rates);
   if(copied < 5) return false;
   
   MqlRates last_candle = rates[0];
   MqlRates prev_candle = rates[1];
   
   // SSL Sweep
   double lowest_swing_price = 999999.0;
   bool found_low = false;
   for(int i = 0; i < ArraySize(swings_low); i++)
     {
      if(swings_low[i].index > 2)
        {
         if(swings_low[i].price < lowest_swing_price)
           {
            lowest_swing_price = swings_low[i].price;
            found_low = true;
           }
        }
     }
   if(found_low)
     {
      if((last_candle.low < lowest_swing_price && last_candle.close > lowest_swing_price) ||
         (prev_candle.low < lowest_swing_price && prev_candle.close > lowest_swing_price))
        {
         sweep.type = "SSL";
         sweep.level = lowest_swing_price;
         return true;
        }
     }
     
   // BSL Sweep
   double highest_swing_price = -999999.0;
   bool found_high = false;
   for(int i = 0; i < ArraySize(swings_high); i++)
     {
      if(swings_high[i].index > 2)
        {
         if(swings_high[i].price > highest_swing_price)
           {
            highest_swing_price = swings_high[i].price;
            found_high = true;
           }
        }
     }
   if(found_high)
     {
      if((last_candle.high > highest_swing_price && last_candle.close < highest_swing_price) ||
         (prev_candle.high > highest_swing_price && prev_candle.close < highest_swing_price))
        {
         sweep.type = "BSL";
         sweep.level = highest_swing_price;
         return true;
        }
     }
     
   return false;
  }
