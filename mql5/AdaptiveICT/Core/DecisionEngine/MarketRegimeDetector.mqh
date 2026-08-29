//+------------------------------------------------------------------+
//|                                         MarketRegimeDetector.mqh |
//|                                  Copyright 2026, AdaptiveICT     |
//|                                             https://www.mql5.com |
//+------------------------------------------------------------------+
#property copyright "Copyright 2026, AdaptiveICT"
#property link      "https://www.mql5.com"
#property version   "1.00"
#property once

class MarketRegimeDetector
  {
public:
   // Returns market regime string and populates confidence rating
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
         return "RANGING";
        }
        
      int c_rsi = CopyBuffer(h_rsi, 0, 0, 1, rsi_buf);
      int c_adx = CopyBuffer(h_adx, 0, 0, 1, adx_buf);
      int c_atr = CopyBuffer(h_atr, 0, 0, 1, atr_buf);
      
      IndicatorRelease(h_rsi);
      IndicatorRelease(h_adx);
      IndicatorRelease(h_atr);
      
      if(c_rsi <= 0 || c_adx <= 0 || c_atr <= 0) return "RANGING";
      
      double rsi = rsi_buf[0];
      double adx = adx_buf[0];
      double atr = atr_buf[0];
      
      double current_price = SymbolInfoDouble(_Symbol, SYMBOL_ASK);
      double point = SymbolInfoDouble(_Symbol, SYMBOL_POINT);
      if(point == 0 || current_price == 0) return "RANGING";
      
      double atr_pct = atr / current_price;
      
      // Classifications
      if(atr_pct < 0.0004)
        {
         confidence = 85;
         return "LOW VOLATILITY";
        }
        
      if(adx > 35)
        {
         confidence = 80 + (int)MathMin(15.0, (adx - 35.0) * 0.5);
         if(rsi > 70 || rsi < 30) return "BREAKOUT";
         return "TRENDING";
        }
        
      if(adx < 20)
        {
         confidence = 75;
         if(rsi > 65 || rsi < 35) return "REVERSAL";
         return "RANGING";
        }
        
      if(atr_pct > 0.0020)
        {
         confidence = 90;
         return "HIGH VOLATILITY";
        }
        
      confidence = 70;
      return "RANGING";
     }
  };
