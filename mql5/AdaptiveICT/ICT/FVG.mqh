//+------------------------------------------------------------------+
//|                                                          FVG.mqh |
//|                                  Copyright 2026, AdaptiveICT     |
//|                                             https://www.mql5.com |
//+------------------------------------------------------------------+
#property copyright "Copyright 2026, AdaptiveICT"
#property link      "https://www.mql5.com"
#property version   "1.00"

#include "../Core/Types.mqh"
#include "../Market/MarketData.mqh"

//+------------------------------------------------------------------+
//| Find Fair Value Gaps (FVG)                                      |
//+------------------------------------------------------------------+
int GetFVGs(ENUM_TIMEFRAMES tf, int count, MqlFVG &fvgs[])
  {
   MqlRates rates[];
   int copied = GetRates(tf, count, rates);
   if(copied < 3) return 0;
   
   int fvg_count = 0;
   ArrayFree(fvgs);
   
   for(int i = 2; i < copied; i++)
     {
      // Bullish FVG
      if(rates[i].low > rates[i-2].high)
        {
         int size = ArraySize(fvgs);
         ArrayResize(fvgs, size + 1);
         fvgs[size].is_bullish = true;
         fvgs[size].index = i - 1;
         fvgs[size].top = rates[i].low;
         fvgs[size].bottom = rates[i-2].high;
         fvgs[size].time = rates[i-1].time;
         fvg_count++;
        }
      // Bearish FVG
      else if(rates[i].high < rates[i-2].low)
        {
         int size = ArraySize(fvgs);
         ArrayResize(fvgs, size + 1);
         fvgs[size].is_bullish = false;
         fvgs[size].index = i - 1;
         fvgs[size].top = rates[i-2].low;
         fvgs[size].bottom = rates[i].high;
         fvgs[size].time = rates[i-1].time;
         fvg_count++;
        }
     }
   return fvg_count;
  }
