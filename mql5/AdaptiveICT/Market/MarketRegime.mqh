//+------------------------------------------------------------------+
//|                                                 MarketRegime.mqh |
//|                                  Copyright 2026, AdaptiveICT     |
//|                                             https://www.mql5.com |
//+------------------------------------------------------------------+
#property copyright "Copyright 2026, AdaptiveICT"
#property link      "https://www.mql5.com"
#property version   "1.00"

//+------------------------------------------------------------------+
//| Get Volatility State using ATR Percentage                        |
//+------------------------------------------------------------------+
string GetVolatility()
  {
   double atr[];
   ArraySetAsSeries(atr, true);
   int handle = iATR(_Symbol, PERIOD_CURRENT, 14);
   if(handle != INVALID_HANDLE && CopyBuffer(handle, 0, 0, 1, atr) > 0)
     {
      double cur_atr = atr[0];
      double current_price = SymbolInfoDouble(_Symbol, SYMBOL_ASK);
      if(current_price > 0)
        {
         double pct = cur_atr / current_price;
         if(pct > 0.0015) return "HIGH";
         if(pct < 0.0004) return "LOW";
        }
     }
   return "NORMAL";
  }

//+------------------------------------------------------------------+
//| Estimate Market Regime using EMA alignment                       |
//+------------------------------------------------------------------+
string GetMarketRegime()
  {
   double ema50_buf[], ema200_buf[];
   ArraySetAsSeries(ema50_buf, true);
   ArraySetAsSeries(ema200_buf, true);
   int h50  = iMA(_Symbol, PERIOD_CURRENT, 50,  0, MODE_EMA, PRICE_CLOSE);
   int h200 = iMA(_Symbol, PERIOD_CURRENT, 200, 0, MODE_EMA, PRICE_CLOSE);
   if(h50 == INVALID_HANDLE || h200 == INVALID_HANDLE)
     {
      return "RANGING";
     }
   int c50 = CopyBuffer(h50,  0, 0, 1, ema50_buf);
   int c200 = CopyBuffer(h200, 0, 0, 1, ema200_buf);
   if(c50 <= 0 || c200 <= 0) return "RANGING";
   double diff  = MathAbs(ema50_buf[0] - ema200_buf[0]);
   double price = SymbolInfoDouble(_Symbol, SYMBOL_ASK);
   if(price > 0 && (diff / price) > 0.0008) return "TRENDING";
   return "RANGING";
  }

//+------------------------------------------------------------------+
//| Estimate Higher Timeframe Bias using H4 EMA alignment            |
//+------------------------------------------------------------------+
string GetHTFBias()
  {
   double ema200_buf[];
   ArraySetAsSeries(ema200_buf, true);
   int h200h4 = iMA(_Symbol, PERIOD_H4, 200, 0, MODE_EMA, PRICE_CLOSE);
   if(h200h4 == INVALID_HANDLE) return "BEARISH";
   int c200 = CopyBuffer(h200h4, 0, 0, 1, ema200_buf);
   if(c200 <= 0) return "BEARISH";
   double close_buf[];
   ArraySetAsSeries(close_buf, true);
   if(CopyClose(_Symbol, PERIOD_H4, 0, 1, close_buf) <= 0) return "BEARISH";
   if(close_buf[0] > ema200_buf[0]) return "BULLISH";
   return "BEARISH";
  }
