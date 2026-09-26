//+------------------------------------------------------------------+
//|                                         MarketRegimeDetector.mqh |
//|                                  Copyright 2026, AdaptiveICT     |
//|                                             https://www.mql5.com |
//+------------------------------------------------------------------+
#property copyright "Copyright 2026, AdaptiveICT"
#property link      "https://www.mql5.com"
#property version   "1.00"
#property once

#include "../Types.mqh"

class MarketRegimeDetector
  {
public:
   // Returns market regime string and populates confidence rating
   // Maps to FR-003: TRENDING_BULLISH, TRENDING_BEARISH, RANGING, HIGH_VOLATILITY, LOW_VOLATILITY, TRANSITION, UNKNOWN
   static string Detect(ENUM_TIMEFRAMES tf, int &confidence)
     {
      confidence = 50; // default
      
      double rsi_buf[];
      double adx_buf[];
      double atr_buf[];
      
      ArraySetAsSeries(rsi_buf, true);
      ArraySetAsSeries(adx_buf, true);
      ArraySetAsSeries(atr_buf, true);
      
      int h_rsi = iRSI(_Symbol, tf, 14, PRICE_CLOSE);
      int h_adx = iADX(_Symbol, tf, 14);
      int h_atr = iATR(_Symbol, tf, 14);
      
      if(h_rsi == INVALID_HANDLE || h_adx == INVALID_HANDLE || h_atr == INVALID_HANDLE)
        {
         if(h_rsi != INVALID_HANDLE) IndicatorRelease(h_rsi);
         if(h_adx != INVALID_HANDLE) IndicatorRelease(h_adx);
         if(h_atr != INVALID_HANDLE) IndicatorRelease(h_atr);
         confidence = 0;
         return "UNKNOWN";
        }
        
      int c_rsi = CopyBuffer(h_rsi, 0, 0, 1, rsi_buf);
      int c_adx = CopyBuffer(h_adx, 0, 0, 1, adx_buf);
      int c_atr = CopyBuffer(h_atr, 0, 0, 1, atr_buf);
      
      IndicatorRelease(h_rsi);
      IndicatorRelease(h_adx);
      IndicatorRelease(h_atr);
      
      if(c_rsi <= 0 || c_adx <= 0 || c_atr <= 0)
        {
         confidence = 0;
         return "UNKNOWN";
        }
      
      double rsi = rsi_buf[0];
      double adx = adx_buf[0];
      double atr = atr_buf[0];
      
      double current_price = SymbolInfoDouble(_Symbol, SYMBOL_ASK);
      double point = SymbolInfoDouble(_Symbol, SYMBOL_POINT);
      if(point == 0 || current_price == 0)
        {
         confidence = 0;
         return "UNKNOWN";
        }
      
      double atr_pct = atr / current_price;
      
      // Classifications
      if(atr_pct < 0.0004)
        {
         confidence = 85;
         return "LOW_VOLATILITY";
        }
        
      if(atr_pct > 0.0020)
        {
         confidence = 90;
         return "HIGH_VOLATILITY";
        }

      if(adx > 30)
        {
         confidence = (int)MathMin(95.0, 75.0 + (adx - 30.0) * 0.8);
         if(rsi > 75 || rsi < 25)
           {
            confidence = 80;
            return "TRANSITION";
           }
         return (rsi >= 50.0) ? "TRENDING_BULLISH" : "TRENDING_BEARISH";
        }
        
      if(adx < 20)
        {
         confidence = 75;
         if(rsi > 65 || rsi < 35) return "TRANSITION";
         return "RANGING";
        }
        
      confidence = 65;
      return (rsi > 55.0) ? "TRENDING_BULLISH" : (rsi < 45.0) ? "TRENDING_BEARISH" : "RANGING";
     }

   // Returns structured MarketRegimeState struct
   static MarketRegimeState DetectState(ENUM_TIMEFRAMES tf)
     {
      MarketRegimeState state;
      state.regime = Detect(tf, state.confidence);
      state.evaluated_at = TimeCurrent();
      return state;
     }
  };
