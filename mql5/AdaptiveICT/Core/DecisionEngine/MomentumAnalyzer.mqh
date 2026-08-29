//+------------------------------------------------------------------+
//|                                             MomentumAnalyzer.mqh |
//|                                  Copyright 2026, AdaptiveICT     |
//|                                             https://www.mql5.com |
//+------------------------------------------------------------------+
#property copyright "Copyright 2026, AdaptiveICT"
#property link      "https://www.mql5.com"
#property version   "1.00"
#property once

class MomentumAnalyzer
  {
public:
   // Calculate Price Velocity: pips per bar
   static double GetVelocity(ENUM_TIMEFRAMES tf, int lookback)
     {
      double point = SymbolInfoDouble(_Symbol, SYMBOL_POINT);
      if(point == 0) return 0.0;
      
      MqlRates rates[];
      if(CopyRates(_Symbol, tf, 0, lookback + 1, rates) < lookback + 1) return 0.0;
      
      double price_change = rates[lookback].close - rates[0].close;
      return price_change / (point * 10.0 * lookback); // in pips per bar
     }

   // Calculate Acceleration: current velocity - previous velocity
   static double GetAcceleration(ENUM_TIMEFRAMES tf, int lookback)
     {
      double vel_curr = GetVelocity(tf, lookback);
      
      double point = SymbolInfoDouble(_Symbol, SYMBOL_POINT);
      if(point == 0) return 0.0;
      
      MqlRates rates[];
      if(CopyRates(_Symbol, tf, 1, lookback + 1, rates) < lookback + 1) return 0.0;
      
      double vel_prev = (rates[lookback].close - rates[0].close) / (point * 10.0 * lookback);
      return vel_curr - vel_prev;
     }

   // Calculate Candle Expansion: current range / average candle range
   static double GetCandleExpansion(ENUM_TIMEFRAMES tf, int atr_period)
     {
      MqlRates rates[];
      if(CopyRates(_Symbol, tf, 0, atr_period + 1, rates) < atr_period + 1) return 1.0;
      
      double cur_range = rates[atr_period].high - rates[atr_period].low;
      
      double sum_range = 0.0;
      for(int i = 0; i < atr_period; i++)
         sum_range += rates[i].high - rates[i].low;
      
      double avg_range = sum_range / atr_period;
      if(avg_range == 0) return 1.0;
      
      return cur_range / avg_range;
     }

   // Calculate Tick Activity: current tick volume vs average tick volume
   static double GetTickActivity(ENUM_TIMEFRAMES tf, int period)
     {
      MqlRates rates[];
      if(CopyRates(_Symbol, tf, 0, period + 1, rates) < period + 1) return 1.0;
      
      double cur_tick_vol = (double)rates[period].tick_volume;
      
      double sum_tick_vol = 0.0;
      for(int i = 0; i < period; i++)
         sum_tick_vol += (double)rates[i].tick_volume;
      
      double avg_tick_vol = sum_tick_vol / period;
      if(avg_tick_vol == 0) return 1.0;
      
      return cur_tick_vol / avg_tick_vol;
     }

   // Universal Momentum Score: 0 to 100
   static int CalculateScore(ENUM_TIMEFRAMES tf, int lookback)
     {
      double vel = MathAbs(GetVelocity(tf, lookback));
      double accel = GetAcceleration(tf, lookback);
      double exp = GetCandleExpansion(tf, 14);
      double tick_act = GetTickActivity(tf, 14);
      
      double score = 0.0;
      
      // 1. Velocity (Max 40 points)
      score += MathMin(40.0, vel * 8.0);
      
      // 2. Acceleration (Max 20 points)
      if(accel > 0) score += 20.0;
      else if(accel > -0.5) score += 10.0;
      
      // 3. Candle Expansion (Max 20 points)
      score += MathMin(20.0, (exp - 1.0) * 20.0);
      
      // 4. Tick Activity (Max 20 points)
      score += MathMin(20.0, (tick_act - 1.0) * 15.0);
      
      // Bounding
      int final_score = (int)MathRound(score);
      if(final_score < 0) final_score = 0;
      if(final_score > 100) final_score = 100;
      
      return final_score;
     }
  };
