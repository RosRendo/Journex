//+------------------------------------------------------------------+
//|                                                   OrderBlock.mqh |
//|                                  Copyright 2026, AdaptiveICT     |
//|                                             https://www.mql5.com |
//+------------------------------------------------------------------+
#property copyright "Copyright 2026, AdaptiveICT"
#property link      "https://www.mql5.com"
#property version   "1.00"

#include "../Core/Types.mqh"
#include "../Market/MarketData.mqh"

//+------------------------------------------------------------------+
//| Find Order Blocks (OB) using displacement threshold              |
//+------------------------------------------------------------------+
int GetOrderBlocks(ENUM_TIMEFRAMES tf, int count, MqlOB &obs[])
  {
   MqlRates rates[];
   int copied = GetRates(tf, count, rates);
   if(copied < 10) return 0;
   
   double total_body = 0.0;
   int lookback = MathMin(20, copied);
   for(int i = 0; i < lookback; i++)
     {
      total_body += MathAbs(rates[i].close - rates[i].open);
     }
   double avg_body = total_body / (double)lookback;
   
   int ob_count = 0;
   ArrayFree(obs);
   
   // Note: i=2 is newest expansion, i=1 is next, i=0 is newest base? 
   // Actually, we iterate starting from older candles, checking newer candles.
   // Or better: iterate i from 2 to copied - 1. i is the base candle.
   // i-1 is the 1st expansion candle. i-2 is the 2nd expansion candle.
   for(int i = 2; i < copied - 1; i++)
     {
      // Bullish OB: down candle at i, followed by up at i-1 and up at i-2
      if(rates[i].close < rates[i].open)
        {
         if(rates[i-1].close > rates[i-1].open && rates[i-2].close > rates[i-2].open)
           {
            double expansion = (rates[i-1].close - rates[i-1].open) + (rates[i-2].close - rates[i-2].open);
            if(expansion > avg_body * 1.5)
              {
               int size = ArraySize(obs);
               ArrayResize(obs, size + 1);
               obs[size].is_bullish = true;
               // Rates[i+2] is the oldest part of the expansion, i+1 is next, i is the base
               // Wait, actually an OB is the LAST down candle before an up move.
               // So if rates[i] (recent) is down, and rates[i-1] (newer) is up, and rates[i-2] (newest) is up.
               // My indices were i, i+1, i+2 where i is base, and i+1, i+2 are expansion.
               // Because it's a series: i is base, i-1 is next candle, i-2 is next candle.
               obs[size].price_high = rates[i].high;
               obs[size].price_low = rates[i].low;
               obs[size].time = rates[i].time;
               ob_count++;
              }
           }
        }
      // Bearish OB
      else if(rates[i].close > rates[i].open)
        {
         if(rates[i-1].close < rates[i-1].open && rates[i-2].close < rates[i-2].open)
           {
            double expansion = (rates[i-1].open - rates[i-1].close) + (rates[i-2].open - rates[i-2].close);
            if(expansion > avg_body * 1.5)
              {
               int size = ArraySize(obs);
               ArrayResize(obs, size + 1);
               obs[size].is_bullish = false;
               obs[size].price_high = rates[i].high;
               obs[size].price_low = rates[i].low;
               obs[size].time = rates[i].time;
               ob_count++;
              }
           }
        }
     }
   return ob_count;
  }
