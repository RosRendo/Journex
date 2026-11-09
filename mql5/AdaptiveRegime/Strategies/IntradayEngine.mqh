//+------------------------------------------------------------------+
//|                                                IntradayEngine.mqh|
//|                                          AdaptiveRegime EA       |
//+------------------------------------------------------------------+
#property copyright "AdaptiveRegime"
#property version   "1.00"
#property once
#include "StrategyBase.mqh"

//+------------------------------------------------------------------+
//| Intraday engine on the ENTRY timeframe (one shot per closed bar):|
//|  1. Session-range breakout: build server-hours session range,    |
//|     trade the close beyond range +/- ATR fraction, WITH trend    |
//|     alignment (regime bias).                                     |
//|  2. Sweep+MSS: liquidity sweep of a pivot low/high followed by   |
//|     a close back beyond the swept pivot.                         |
//| SL under structure unless too close; TP measured risk multiple.  |
//+------------------------------------------------------------------+
bool EnIntradayRange(MqlRates &r[], const int n, TradeSignal &sig)
  {
   MqlDateTime dt;
   TimeToStruct(r[0].time, dt);
   if(ARIntraEndHour() <= InpIntraRangeStartHour) return false;
   if(dt.hour < ARIntraEndHour()) return false; // range not defined yet
   
   double hi = -DBL_MAX, lo = DBL_MAX;
   int bars_in = 0;
   for(int i = 0; i < n; i++)
     {
      MqlDateTime bt;
      TimeToStruct(r[i].time, bt);
      int day_diff = (int)((r[0].time - r[i].time) / 86400);
      if(day_diff > 0) break;
      if(bt.hour >= ARIntraEndHour()) continue;
      if(bt.hour < InpIntraRangeStartHour) continue;
      hi = MathMax(hi, r[i].high);
      lo = MathMin(lo, r[i].low);
      bars_in++;
     }
   if(bars_in < 2 || hi <= lo) return false;
   
   double atr = SBAtr(InpEntryTF);
   if(atr <= 0.0) return false;
   
   double buf = InpIntraBreakFrac * atr;
   // long breakout of range top with regime bias
   if(r[0].close > hi + buf && r[0].close > r[0].open && RegBias() >= 0)
     {
      double entry = r[0].close;
      double sl = MathMin(r[0].low, hi) - 0.3 * atr;
      double dist = entry - sl;
      if(dist < SBMinSLDist(atr)) sl = entry - SBMinSLDist(atr);
      double tp_dist = MathMax(2.0 * dist, 1.0 * (hi - lo) * 0.5);
      sig.tp = entry + tp_dist;
      sig.strategy_id = "INTRADAY"; sig.dir = 1; sig.entry = entry; sig.sl = sl;
      sig.score = 65.0;
      sig.reason = StringFormat("range_break_hi=%.2f", hi);
      sig.bar_time = r[0].time; sig.tf = InpEntryTF;
      return true;
     }
   // short breakout of range bottom
   if(r[0].close < lo - buf && r[0].close < r[0].open && RegBias() <= 0)
     {
      double entry = r[0].close;
      double sl = MathMax(r[0].high, lo) + 0.3 * atr;
      double dist = sl - entry;
      if(dist < SBMinSLDist(atr)) sl = entry + SBMinSLDist(atr);
      double tp_dist = MathMax(2.0 * dist, 1.0 * (hi - lo) * 0.5);
      sig.tp = entry - tp_dist;
      sig.strategy_id = "INTRADAY"; sig.dir = -1; sig.entry = entry; sig.sl = sl;
      sig.score = 65.0;
      sig.reason = StringFormat("range_break_lo=%.2f", lo);
      sig.bar_time = r[0].time; sig.tf = InpEntryTF;
      return true;
     }
   return false;
  }

bool EnIntradayOpen(MqlRates &r[], const int n, TradeSignal &sig)
  {
   MqlDateTime dt;
   TimeToStruct(r[0].time, dt);
   if(dt.hour != 2) return false;
   double fr_hi = -DBL_MAX, fr_lo = DBL_MAX;
   int fb = 0;
   for(int i = 0; i < n; i++)
     {
      MqlDateTime bt;
      TimeToStruct(r[i].time, bt);
      int day_diff = (int)((r[0].time - r[i].time) / 86400);
      if(day_diff > 0) break;
      if(bt.hour != 0) continue;
      fr_hi = MathMax(fr_hi, r[i].high);
      fr_lo = MathMin(fr_lo, r[i].low);
      fb++;
     }
   double atr = SBAtr(InpEntryTF);
   double buf = 0.15 * atr;
   if(fb < 2 || fr_hi <= fr_lo || atr <= 0.0) return false;
   if(r[0].close > fr_hi + buf && r[0].close > r[0].open && RegBias() > 0)
     {
      double entry = r[0].close;
      double sl = fr_lo - 0.3 * atr;
      double dist = entry - sl;
      if(dist < SBMinSLDist(atr)) sl = entry - SBMinSLDist(atr);
      sig.tp = entry + 2.0 * dist;
      sig.strategy_id = "INTRADAY"; sig.dir = 1; sig.entry = entry; sig.sl = sl;
      sig.score = 70.0;
      sig.reason = StringFormat("open_break_hi=%.2f", fr_hi);
      sig.bar_time = r[0].time; sig.tf = InpEntryTF;
      return true;
     }
   if(r[0].close < fr_lo - buf && r[0].close < r[0].open && RegBias() < 0)
     {
      double entry = r[0].close;
      double sl = fr_hi + 0.3 * atr;
      double dist = sl - entry;
      if(dist < SBMinSLDist(atr)) sl = entry + SBMinSLDist(atr);
      sig.tp = entry - 2.0 * dist;
      sig.strategy_id = "INTRADAY"; sig.dir = -1; sig.entry = entry; sig.sl = sl;
      sig.score = 70.0;
      sig.reason = StringFormat("open_break_lo=%.2f", fr_lo);
      sig.bar_time = r[0].time; sig.tf = InpEntryTF;
      return true;
     }
   return false;
  }

bool EnIntradaySweep(MqlRates &r[], const int n, TradeSignal &sig)
  {
   if(!InpIntraSweepEnabled) return false;
   if(ARStormSkip())
     {
      double mr1 = 0.0, mr0 = 0.0;
      int c1 = 0, c0 = 0;
      for(int i = 0; i < n && i < 64; i++)
        {
         double rng = r[i].high - r[i].low;
         if(i < 32)
           { mr1 += rng; c1++; }
         else
           { mr0 += rng; c0++; }
        }
      if(c1 > 0 && c0 > 0 && (mr1 / c1) > 1.5 * (mr0 / c0)) return false;
     }
   int plows[], phighs[];
   SBPivots(r, n, InpIntraSweepLookback, plows, phighs);
   if(ArraySize(plows) < 1 || ArraySize(phighs) < 1) return false;
   
   double pivot_low  = r[plows[0]].low;   // most recent pivot low
   double pivot_high = r[phighs[0]].high; // most recent pivot high
   double atr = SBAtr(InpEntryTF);
   if(atr <= 0.0) return false;
   
   // long: bar 1 swept below pivot low but closed back above; bar 0 confirms above bar-1 high
   if(n >= 3 && r[1].low < pivot_low && r[1].close > pivot_low
      && r[0].close > r[1].high && RegBias() >= 0)
     {
      double entry = r[0].close;
      double sl = MathMin(r[1].low, pivot_low) - 0.3 * atr;
      double dist = entry - sl;
      if(dist < SBMinSLDist(atr)) sl = entry - SBMinSLDist(atr);
      sig.tp = entry + 2.0 * dist;
      sig.strategy_id = "INTRADAY"; sig.dir = 1; sig.entry = entry; sig.sl = sl;
      sig.score = 75.0;
      sig.reason = StringFormat("sweep_low+MSS pl=%.2f", pivot_low);
      sig.bar_time = r[0].time; sig.tf = InpEntryTF;
      return true;
     }
   // short mirror
   if(n >= 3 && r[1].high > pivot_high && r[1].close < pivot_high
      && r[0].close < r[1].low && RegBias() <= 0)
     {
      double entry = r[0].close;
      double sl = MathMax(r[1].high, pivot_high) + 0.3 * atr;
      double dist = sl - entry;
      if(dist < SBMinSLDist(atr)) sl = entry + SBMinSLDist(atr);
      sig.tp = entry - 2.0 * dist;
      sig.strategy_id = "INTRADAY"; sig.dir = -1; sig.entry = entry; sig.sl = sl;
      sig.score = 75.0;
      sig.reason = StringFormat("sweep_high+MSS ph=%.2f", pivot_high);
      sig.bar_time = r[0].time; sig.tf = InpEntryTF;
      return true;
     }
   return false;
  }

bool EnIntraday(TradeSignal &sig)
  {
   if(!InpIntradayEnabled || !AREngineAllowed(1)) return false;
   if(!SelAllowed("INTRADAY")) return false;
   if(!SBCooldownOk("INTRADAY", 300)) return false;
   
   MqlRates r[];
   int n = MdGetClosedRates(InpEntryTF, 210, r);
   if(n < 10) return false;
   
   if(!ThrottleBlock("sweep") && EnIntradaySweep(r, n, sig))
     { SBMarkFired("INTRADAY"); return true; }
   if(!ThrottleBlock("openbreak") && EnIntradayOpen(r, n, sig))
     { SBMarkFired("INTRADAY"); return true; }
   if(ARRangeOn() && EnIntradayRange(r, n, sig))
     { SBMarkFired("INTRADAY"); return true; }
   return false;
  }