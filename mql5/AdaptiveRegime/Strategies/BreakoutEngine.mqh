//+------------------------------------------------------------------+
//|                                                BreakoutEngine.mqh|
//|                                          AdaptiveRegime EA       |
//+------------------------------------------------------------------+
#property copyright "AdaptiveRegime"
#property version   "1.00"
#property once
#include "StrategyBase.mqh"

//+------------------------------------------------------------------+
//| Breakout engine on the SETUP timeframe: consolidated box         |
//| (compression via ATR-vs-baseline ratio) broken by a closed bar   |
//| with volume-style follow-through. Measured-move TP; cooldown     |
//| prevents repeated fires off the same box for InpBOValidBars.     |
//+------------------------------------------------------------------+
bool EnBreakout(TradeSignal &sig)
  {
   if(!InpBreakoutEnabled || !AREngineAllowed(5)) return false;
   if(!SelAllowed("BREAKOUT")) return false;
   if(!SBCooldownOk("BREAKOUT", InpBOValidBars * PeriodSeconds(InpSetupTF))) return false;
   
   //--- compression precondition (or strong trend continuation)
   double atr_ratio = 1.0, atr_now = 0.0;
   bool vol_ok = MdAtrRatio(InpSetupTF, InpRegAtrPeriod, InpRegBaselineBars, atr_ratio, atr_now);
   bool compression = (vol_ok && atr_ratio < InpBOCompressionRatio)
                   || RegCurrent() == REGIME_VOL_COMPRESSION;
   bool trend_cont  = (RegCurrent() == REGIME_BULL_STRONG || RegCurrent() == REGIME_BEAR_STRONG);
   if(!compression && !trend_cont) return false;
   
   MqlRates r[];
   int n = MdGetClosedRates(InpSetupTF, InpBOLookback + 3, r);
   if(n < 20) return false;
   
   //--- box: extremes BEFORE the breakout bar (1..n-1)
   double hi = -DBL_MAX, lo = DBL_MAX;
   for(int i = n - 1; i >= 1; i--)
     {
      hi = MathMax(hi, r[i].high);
      lo = MathMin(lo, r[i].low);
     }
   if(hi <= lo) return false;
   
   //--- box quality: compact, meaningful size
   double box = hi - lo;
   if(atr_now > 0.0 && box < 1.5 * atr_now) return false;   // too tight = noise
   if(atr_now > 0.0 && box > 8.0 * atr_now) return false;   // too wide = trend, not box
   
   double atr = atr_now;
   if(atr <= 0.0) return false; // never trade without ATR
   double entry = r[0].close;
   
   //--- long breakout: closed bar above box, strong body
   if(r[0].close > hi && r[0].close > r[0].open
      && (r[0].high - r[0].low) > atr) // displacement bar
     {
      double sl = lo + InpBOSLBufferAtr * atr;  // inside-box invalidation
      double dist = entry - sl;
      if(dist < SBMinSLDist(atr))
        {
         sl = entry - SBMinSLDist(atr);
         dist = SBMinSLDist(atr);
        }
      double tp = entry + box; // measured move
      
      sig.strategy_id = "BREAKOUT"; sig.dir = 1;
      sig.entry = entry; sig.sl = EENormPrice(sl); sig.tp = EENormPrice(tp);
      sig.score = 72.0 + (compression ? 8.0 : 0.0);
      sig.reason = StringFormat("break_box_hi=%.2f comp=%d", hi, compression ? 1 : 0);
      sig.bar_time = r[0].time; sig.tf = InpSetupTF;
      SBMarkFired("BREAKOUT");
      return true;
     }
   
   //--- short breakout below the box
   if(r[0].close < lo && r[0].close < r[0].open
      && (r[0].high - r[0].low) > atr)
     {
      double sl = hi - InpBOSLBufferAtr * atr;
      double dist = sl - entry;
      if(dist < SBMinSLDist(atr))
        {
         sl = entry + SBMinSLDist(atr);
         dist = SBMinSLDist(atr);
        }
      double tp = entry - box;
      
      sig.strategy_id = "BREAKOUT"; sig.dir = -1;
      sig.entry = entry; sig.sl = EENormPrice(sl); sig.tp = EENormPrice(tp);
      sig.score = 72.0 + (compression ? 8.0 : 0.0);
      sig.reason = StringFormat("break_box_lo=%.2f comp=%d", lo, compression ? 1 : 0);
      sig.bar_time = r[0].time; sig.tf = InpSetupTF;
      SBMarkFired("BREAKOUT");
      return true;
     }
   return false;
  }