//+------------------------------------------------------------------+
//|                                         BreakoutStrategy.mqh    |
//|                                  Copyright 2026, AdaptiveICT     |
//|                                             https://www.mql5.com |
//+------------------------------------------------------------------+
#property copyright "Copyright 2026, AdaptiveICT"
#property link      "https://www.mql5.com"
#property version   "1.00"
#property once

#include "../BaseStrategy.mqh"
#include "../../Market/MarketData.mqh"
#include "../../Indicators/ATR.mqh"
#include "../../Indicators/Volume.mqh"
#include "../../Indicators/EMA.mqh"
#include "../../Market/Session.mqh"
#include "../../ICT/KillZones.mqh"

//+------------------------------------------------------------------+
//| Breakout Strategy (London/NY Session Range Breakout)             |
//| Concept: The pre-London Asian consolidation builds a tight range. |
//| When London opens and price breaks cleanly above/below that range |
//| with a volume surge, we ride the momentum (this is the "London   |
//| Open Breakout" — one of the most reliable setups in FX/Gold).    |
//+------------------------------------------------------------------+
class BreakoutStrategy : public BaseStrategy
  {
private:
   //+------------------------------------------------------------------+
   //| Build the Asian session consolidation range (H1 data)           |
   //+------------------------------------------------------------------+
   bool GetPreSessionRange(ENUM_TIMEFRAMES tf, double &range_high, double &range_low)
     {
      MqlRates rates[];
      int copied = GetRates(tf, 100, rates);
      if(copied < 10) return false;

      range_high = -1e9;
      range_low  =  1e9;
      bool found = false;

      // Look back up to 24 bars to find the pre-session consolidation
      // Consolidation = Asian session roughly 22:00-06:00
      for(int i = 0; i < MathMin(copied, 24); i++)
        {
         MqlDateTime dt;
         TimeToStruct(rates[i].time, dt);

         // Asian hours: 22-6 (overnight)
         bool is_asian = (dt.hour >= 22 || dt.hour < 6);
         if(is_asian)
           {
            if(rates[i].high > range_high) range_high = rates[i].high;
            if(rates[i].low  < range_low)  range_low  = rates[i].low;
            found = true;
           }
        }

      return found && (range_high > range_low);
     }

public:
   virtual bool Scan(ENUM_TIMEFRAMES tf, string tf_str, TradeSignal &candidate)
     {
      candidate.symbol     = _Symbol;
      candidate.type       = "NO_TRADE";
      candidate.strategy_id = "BREAKOUT";
      candidate.signal_tf  = tf;
      candidate.tf_str     = tf_str;
      candidate.entry_price = 0.0;
      candidate.invalidation_price = 0.0;
      candidate.reason     = "";

      // Only fire during London or NY open (not during consolidation)
      string sess = GetCurrentSession();
      bool in_breakout_session = (sess == "LONDON" || sess == "NEW YORK");
      if(!in_breakout_session) return false;

      MqlRates rates[];
      int copied = GetRates(tf, 5, rates);
      if(copied < 2) return false;

      double current_price = rates[0].close;
      double prev_close    = rates[1].close;
      double atr           = GetATR(tf, 14);
      if(atr <= 0) return false;

      // Build the pre-session range
      double range_high = 0, range_low = 0;
      if(!GetPreSessionRange(tf, range_high, range_low)) return false;

      double range_size = range_high - range_low;
      if(range_size <= atr * 0.5) return false; // Range is too small – ignore

      // ── BUY breakout: close cleanly above Asian range high ────────────
      if(prev_close <= range_high && current_price > range_high + atr * 0.1)
        {
         candidate.type               = "BUY";
         candidate.entry_price        = current_price;
         // SL is the midpoint of the range (below range midpoint = invalidation)
         candidate.invalidation_price = range_high - atr * 0.5;
         candidate.reason = StringFormat("Breakout BUY: Break above %.2f (Asian Range)", range_high);
         return true;
        }

      // ── SELL breakout: close cleanly below Asian range low ────────────
      if(prev_close >= range_low && current_price < range_low - atr * 0.1)
        {
         candidate.type               = "SELL";
         candidate.entry_price        = current_price;
         candidate.invalidation_price = range_low + atr * 0.5;
         candidate.reason = StringFormat("Breakout SELL: Break below %.2f (Asian Range)", range_low);
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

      double atr = GetATR(tf, 14);
      bool vol_spike = CheckVolumeSpike(tf, InpVolAvgPeriod, InpVolMinRatio);

      double range_high = 0, range_low = 0;
      bool has_range = GetPreSessionRange(tf, range_high, range_low);
      double range_size = has_range ? (range_high - range_low) : 0.0;

      // ── Category 1: Breakout Quality (Max 50 pts) ─────────────────────
      // Tight range = higher-quality breakout (ranges that are tight but clean)
      if(has_range && atr > 0)
        {
         // Tight range is 0.5-2.0x ATR
         double range_ratio = range_size / atr;
         if(range_ratio >= 0.5 && range_ratio <= 3.0)  score += 20.0;

         // Check breakout distance (how far we broke – clean break = more pts)
         double break_dist = MathAbs(candidate.entry_price - (candidate.type == "BUY" ? range_high : range_low));
         if(break_dist >= atr * 0.1) score += 15.0;
         if(break_dist >= atr * 0.3) score += 15.0;
        }

      // ── Category 2: Volume Surge (Max 20 pts) ─────────────────────────
      if(vol_spike) score += 20.0;

      // ── Category 3: HTF Alignment (Max 20 pts) ────────────────────────
      ENUM_TIMEFRAMES htf = (tf == PERIOD_M5) ? PERIOD_H1 : ((tf == PERIOD_M15) ? PERIOD_H1 : PERIOD_H4);
      double e1 = 0, e2 = 0, e3 = 0;
      if(GetEMAs(htf, InpEMA1Period, InpEMA2Period, InpEMA3Period, e1, e2, e3))
        {
         if(candidate.type == "BUY" && e1 > e2 && e2 > e3)  score += 20.0;
         if(candidate.type == "SELL" && e1 < e2 && e2 < e3) score += 20.0;
        }

      // ── Category 4: Session Quality & RR (Max 10 pts) ─────────────────
      string sess = GetCurrentSession();
      if(sess == "LONDON" || sess == "NEW YORK") score += 5.0;

      double dist = MathAbs(candidate.entry_price - candidate.invalidation_price);
      if(dist > 0)
        {
         double target = dist * InpMinRR;
         if(target >= dist * InpMinRR) score += 5.0;
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
