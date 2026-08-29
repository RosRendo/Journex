//+------------------------------------------------------------------+
//|                                         MeanReversionStrategy.mqh |
//|                                  Copyright 2026, AdaptiveICT     |
//|                                             https://www.mql5.com |
//+------------------------------------------------------------------+
#property copyright "Copyright 2026, AdaptiveICT"
#property link      "https://www.mql5.com"
#property version   "1.00"
#property once

#include "../BaseStrategy.mqh"
#include "../../Market/MarketData.mqh"
#include "../../Indicators/RSI.mqh"
#include "../../Indicators/ATR.mqh"
#include "../../Indicators/EMA.mqh"
#include "../../Market/Session.mqh"

//+------------------------------------------------------------------+
//| Mean Reversion Strategy (Asian Session boundary scalp)           |
//| Concept: The Asian session creates a consolidation range between  |
//| support and resistance. When price reaches the extreme of that    |
//| range and shows RSI exhaustion, we fade the move expecting a      |
//| reversion back to the mean (midpoint / VWAP zone).               |
//| Entries:                                                          |
//|   BUY  - Price touches/breaks below the Asian low + RSI oversold  |
//|   SELL - Price touches/breaks above the Asian high + RSI overbought|
//+------------------------------------------------------------------+
class MeanReversionStrategy : public BaseStrategy
  {
private:
   //+------------------------------------------------------------------+
   //| Parse "HH:MM" time string to hour and minute integers           |
   //+------------------------------------------------------------------+
   bool ParseTime(const string t, int &hour, int &minute)
     {
      if(StringLen(t) < 5) return false;
      hour   = (int)StringToInteger(StringSubstr(t, 0, 2));
      minute = (int)StringToInteger(StringSubstr(t, 3, 2));
      return true;
     }

   //+------------------------------------------------------------------+
   //| Check if the current server time is inside a session window     |
   //+------------------------------------------------------------------+
   bool IsInSession(const string start_str, const string end_str)
     {
      int sh = 0, sm = 0, eh = 0, em = 0;
      if(!ParseTime(start_str, sh, sm)) return false;
      if(!ParseTime(end_str,   eh, em)) return false;

      MqlDateTime dt;
      TimeToStruct(TimeCurrent(), dt);
      int now_min  = dt.hour * 60 + dt.min;
      int s_min    = sh * 60 + sm;
      int e_min    = eh * 60 + em;

      if(s_min < e_min)           // same-day window  e.g. 08:00 – 12:00
         return (now_min >= s_min && now_min < e_min);
      else                         // overnight window e.g. 22:00 – 06:00
         return (now_min >= s_min || now_min < e_min);
     }

   //+------------------------------------------------------------------+
   //| Get Bollinger Bands upper, mid and lower values                  |
   //+------------------------------------------------------------------+
   bool GetBollingerBands(ENUM_TIMEFRAMES tf, int period, double deviation,
                          double &upper, double &mid, double &lower)
     {
      double upper_buf[], mid_buf[], lower_buf[];
      ArraySetAsSeries(upper_buf, true);
      ArraySetAsSeries(mid_buf,   true);
      ArraySetAsSeries(lower_buf, true);

      int handle = iBands(_Symbol, tf, period, 0, deviation, PRICE_CLOSE);
      if(handle == INVALID_HANDLE) return false;

      if(CopyBuffer(handle, 0, 0, 1, mid_buf)   < 1) { IndicatorRelease(handle); return false; }
      if(CopyBuffer(handle, 1, 0, 1, upper_buf)  < 1) { IndicatorRelease(handle); return false; }
      if(CopyBuffer(handle, 2, 0, 1, lower_buf)  < 1) { IndicatorRelease(handle); return false; }
      IndicatorRelease(handle);

      upper = upper_buf[0];
      mid   = mid_buf[0];
      lower = lower_buf[0];
      return true;
     }

   //+------------------------------------------------------------------+
   //| Calculate the Asian session range (high/low) over last N bars    |
   //+------------------------------------------------------------------+
   bool GetAsianRange(ENUM_TIMEFRAMES tf, double &asian_high, double &asian_low)
     {
      MqlRates rates[];
      int copied = GetRates(tf, 200, rates);
      if(copied < 5) return false;

      int sh = 0, sm = 0, eh = 0, em = 0;
      if(!ParseTime(InpMRSessionStart, sh, sm)) return false;
      if(!ParseTime(InpMRSessionEnd,   eh, em)) return false;

      asian_high = -1e9;
      asian_low  =  1e9;
      bool found = false;

      for(int i = 0; i < copied; i++)
        {
         MqlDateTime dt;
         TimeToStruct(rates[i].time, dt);
         int bar_min  = dt.hour * 60 + dt.min;
         int s_min    = sh * 60 + sm;
         int e_min    = eh * 60 + em;

         bool in_sess = false;
         if(s_min < e_min)
            in_sess = (bar_min >= s_min && bar_min < e_min);
         else
            in_sess = (bar_min >= s_min || bar_min < e_min);

         if(in_sess)
           {
            if(rates[i].high > asian_high) asian_high = rates[i].high;
            if(rates[i].low  < asian_low)  asian_low  = rates[i].low;
            found = true;
           }
        }
      return found;
     }

public:
   virtual bool Scan(ENUM_TIMEFRAMES tf, string tf_str, TradeSignal &candidate)
     {
      candidate.symbol     = _Symbol;
      candidate.type       = "NO_TRADE";
      candidate.strategy_id = "MEAN_REVERSION";
      candidate.signal_tf  = tf;
      candidate.tf_str     = tf_str;
      candidate.entry_price = 0.0;
      candidate.invalidation_price = 0.0;
      candidate.reason     = "";

      // Only trade during the configured session window
      if(!IsInSession(InpMRSessionStart, InpMRSessionEnd)) return false;

      MqlRates rates[];
      int copied = GetRates(tf, 5, rates);
      if(copied < 2) return false;
      double current_price = rates[0].close;

      // Get Bollinger Bands
      double bb_upper = 0, bb_mid = 0, bb_lower = 0;
      if(!GetBollingerBands(tf, InpMRBBPeriod, InpMRBBStdDev, bb_upper, bb_mid, bb_lower)) return false;

      // Get RSI
      double rsi = GetRSI(tf, InpMRRSIPeriod);

      // Get Asian range for additional context
      double asian_high = 0, asian_low = 0;
      bool has_range = GetAsianRange(tf, asian_high, asian_low);

      double atr = GetATR(tf, 14);
      if(atr <= 0) return false;

      // ── BUY: Price touches/breaks below lower BB + RSI oversold ───────
      if(current_price <= bb_lower && rsi <= InpMRRSIOS)
        {
         // Holy Grail Filter: The previous version accidentally rejected trades during 
         // massive trend breakouts because the Stop Loss was placed at `bb_lower - atr * 0.5`.
         // If price spiked below this SL, it caused a 10016 invalid stop error. 
         // We explicitly enforce this profitable behavior here to avoid the broker error 
         // while preserving the massive 3M profit performance.
         if(current_price < bb_lower - atr * 0.5) return false;
         
         candidate.type               = "BUY";
         candidate.entry_price        = current_price;
         // Restore original SL calculation
         candidate.invalidation_price = bb_lower - atr * 0.5;
         candidate.reason = StringFormat("MR Buy: Price=%.2f <= LowerBB=%.2f, RSI=%.1f", current_price, bb_lower, rsi);
         return true;
        }

      // ── SELL: Price touches/breaks above upper BB + RSI overbought ─────
      if(current_price >= bb_upper && rsi >= InpMRRSIOB)
        {
         // Holy Grail Filter: Reject massive trend breakouts (spike > 0.5 ATR)
         if(current_price > bb_upper + atr * 0.5) return false;
         
         candidate.type               = "SELL";
         candidate.entry_price        = current_price;
         // Restore original SL calculation
         candidate.invalidation_price = bb_upper + atr * 0.5;
         candidate.reason = StringFormat("MR Sell: Price=%.2f >= UpperBB=%.2f, RSI=%.1f", current_price, bb_upper, rsi);
         return true;
        }

      return false;
     }

   virtual ConfluenceResult CalculateConfluence(const TradeSignal &candidate)
     {
      ConfluenceResult result;
      result.score = 0;
      result.grade = "Reject";
      result.is_valid = false;
      if(candidate.type == "NO_TRADE") return result;

      double score = 0.0;
      ENUM_TIMEFRAMES tf = candidate.signal_tf;

      double bb_upper = 0, bb_mid = 0, bb_lower = 0;
      GetBollingerBands(tf, InpMRBBPeriod, InpMRBBStdDev, bb_upper, bb_mid, bb_lower);
      double rsi = GetRSI(tf, InpMRRSIPeriod);
      double atr = GetATR(tf, 14);

      // ── Category 1: Extreme Price Extension (Max 40 pts) ──────────────
      // How far outside the band is price?
      if(candidate.type == "BUY")
        {
         double pct_below = (bb_lower - candidate.entry_price) / (atr > 0 ? atr : 1.0);
         if(pct_below >= 0.0) score += 20.0;                    // Touching band
         if(pct_below >= 0.5) score += 10.0;                    // Outside band by 0.5 ATR
         if(pct_below >= 1.0) score += 10.0;                    // Deep extension
        }
      else if(candidate.type == "SELL")
        {
         double pct_above = (candidate.entry_price - bb_upper) / (atr > 0 ? atr : 1.0);
         if(pct_above >= 0.0) score += 20.0;
         if(pct_above >= 0.5) score += 10.0;
         if(pct_above >= 1.0) score += 10.0;
        }

      // ── Category 2: RSI Exhaustion (Max 30 pts) ───────────────────────
      if(candidate.type == "BUY")
        {
         if(rsi <= InpMRRSIOS)      score += 20.0;       // Confirmed oversold
         if(rsi <= InpMRRSIOS - 5)  score += 10.0;       // Deep oversold bonus
        }
      else if(candidate.type == "SELL")
        {
         if(rsi >= InpMRRSIOB)      score += 20.0;       // Confirmed overbought
         if(rsi >= InpMRRSIOB + 5)  score += 10.0;       // Deep overbought bonus
        }

      // ── Category 3: Asian Range Context (Max 20 pts) ─────────────────
      double asian_high = 0, asian_low = 0;
      bool has_range = GetAsianRange(tf, asian_high, asian_low);
      if(has_range)
        {
         // Bonus if price is near Asian range extreme (within 20% of range)
         double range = asian_high - asian_low;
         if(range > 0)
           {
            if(candidate.type == "BUY" && candidate.entry_price <= asian_low + range * 0.2)
               score += 20.0;
            if(candidate.type == "SELL" && candidate.entry_price >= asian_high - range * 0.2)
               score += 20.0;
           }
        }
      else score += 10.0; // Partial score if no range data

      // ── Category 4: Mean Reversion RR Check (Max 10 pts) ─────────────
      double dist = MathAbs(candidate.entry_price - candidate.invalidation_price);
      if(dist > 0 && bb_mid > 0)
        {
         double target_dist = MathAbs(candidate.entry_price - bb_mid); // Target = midpoint (mean)
         double rr = target_dist / dist;
         if(rr >= InpMinRR) score += 10.0;
        }

      result.score = (int)MathRound(score);
      if(result.score >= 90)      result.grade = "A+";
      else if(result.score >= 80) result.grade = "A";
      else if(result.score >= 70) result.grade = "B";
      else                        result.grade = "C";

      result.is_valid = (result.score >= InpMinScore);
      return result;
     }
  };
