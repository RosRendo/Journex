//+------------------------------------------------------------------+
//|                                              MarketStructure.mqh |
//|                                  Copyright 2026, AdaptiveICT     |
//|                                             https://www.mql5.com |
//+------------------------------------------------------------------+
#property copyright "Copyright 2026, AdaptiveICT"
#property link      "https://www.mql5.com"
#property version   "1.00"

#include "../Core/Types.mqh"
#include "../Market/MarketData.mqh"

//+------------------------------------------------------------------+
//| Find Swing Highs and Swing Lows                                  |
//+------------------------------------------------------------------+
int GetSwings(ENUM_TIMEFRAMES tf, int count, MqlSwing &swings_high[], MqlSwing &swings_low[])
  {
   MqlRates rates[];
   int copied = GetRates(tf, count, rates);
   if(copied <= 10) return 0;
   
   int window = 5;
   int high_count = 0;
   int low_count = 0;
   
   ArrayFree(swings_high);
   ArrayFree(swings_low);
   
   for(int i = window; i < copied - window; i++)
     {
      double curr_high = rates[i].high;
      double curr_low = rates[i].low;
      
      bool is_high = true;
      bool is_low = true;
      
      for(int j = i - window; j <= i + window; j++)
        {
         if(j == i) continue;
         if(rates[j].high >= curr_high) is_high = false;
         if(rates[j].low <= curr_low) is_low = false;
        }
        
      if(is_high)
        {
         int size = ArraySize(swings_high);
         ArrayResize(swings_high, size + 1);
         swings_high[size].index = i;
         swings_high[size].price = curr_high;
         swings_high[size].time = rates[i].time;
         swings_high[size].is_high = true;
         high_count++;
        }
      if(is_low)
        {
         int size = ArraySize(swings_low);
         ArrayResize(swings_low, size + 1);
         swings_low[size].index = i;
         swings_low[size].price = curr_low;
         swings_low[size].time = rates[i].time;
         swings_low[size].is_high = false;
         low_count++;
        }
     }
   return high_count + low_count;
  }

//+------------------------------------------------------------------+
//| Check Market Structure Shift (MSS)                              |
//+------------------------------------------------------------------+
string CheckMSS(ENUM_TIMEFRAMES tf, int count, MqlSwing &swings_high[], MqlSwing &swings_low[])
  {
   MqlRates rates[];
   int copied = GetRates(tf, count, rates);
   if(copied < 3) return "NONE";
   
   int high_size = ArraySize(swings_high);
   int low_size = ArraySize(swings_low);
   if(high_size == 0 || low_size == 0) return "NONE";
   
   double last_close = rates[0].close;
   double prev_close = rates[1].close;
   
   double last_swing_high = swings_high[0].price; // Index 0 is newest swing (smallest index i)
   double last_swing_low = swings_low[0].price;
   
   if(last_close > last_swing_high && prev_close <= last_swing_high)
      return "BULLISH";
   if(last_close < last_swing_low && prev_close >= last_swing_low)
      return "BEARISH";
      
   return "NONE";
  }
