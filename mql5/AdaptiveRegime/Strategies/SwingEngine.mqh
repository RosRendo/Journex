//+------------------------------------------------------------------+
//|                                                   SwingEngine.mqh|
//|                                          AdaptiveRegime EA       |
//+------------------------------------------------------------------+
#property copyright "AdaptiveRegime"
#property version   "1.00"
#property once
#include "StrategyBase.mqh"

//+------------------------------------------------------------------+
//| Swing engine on the SETUP timeframe (one shot per setup bar):    |
//| HTF (bias TF) SMA200 filter -> only trade with macro trend;      |
//| pullback into discount (longs) / premium (shorts) band of the    |
//| recent range; confirmation = rejection candle + optional sweep.  |
//| No broker TP: position managed by BE / partial / wide trail.     |
//+------------------------------------------------------------------+
bool EnSwing(TradeSignal &sig)
  {
   if(!InpSwingEnabled || !AREngineAllowed(2)) return false;
   if(!SelAllowed("SWING")) return false;
   if(!SBCooldownOk("SWING", 1800)) return false;
   
   //--- HTF macro filter on closed bias-TF bar
   double ema_htf, close_htf;
   if(!MdIndValue(InpBiasTF, 1, 200, 1, ema_htf)) return false;
   close_htf = iClose(_Symbol, InpBiasTF, 1);
   int bias = (close_htf > ema_htf) ? 1 : -1;
   
   //--- setup-TF recent range
   MqlRates r[];
   int n = MdGetClosedRates(InpSetupTF, InpSwingRangeBars + 3, r);
   if(n < 20) return false;
   
   double hi = -DBL_MAX, lo = DBL_MAX;
   for(int i = n - 1; i >= 1; i--)
     {
      hi = MathMax(hi, r[i].high);
      lo = MathMin(lo, r[i].low);
     }
   if(hi <= lo) return false;
   double band = (hi - lo) * InpSwingPullbackPct / 100.0;
   
   double atr = SBAtr(InpSetupTF);
   if(atr <= 0.0) return false; // never trade without ATR
   
   double entry = r[0].close;
   
   //--- longs: discount band + rejection candle
   if(bias > 0 && RegBias() >= 0
      && entry >= lo && entry <= lo + band
      && r[0].close > r[0].open)
     {
      double swept_low = DBL_MAX;
      for(int i = 0; i < n; i++)
         if(r[i].low < r[0].low) { swept_low = MathMin(swept_low, r[i].low); }
      double sl_base = (swept_low < DBL_MAX) ? MathMin(swept_low, r[0].low) : r[0].low;
      double sl = sl_base - 0.3 * atr;
      double dist = entry - sl;
      if(dist < SBMinSLDist(atr))
        {
         sl = entry - SBMinSLDist(atr);
         dist = SBMinSLDist(atr);
        }
      if(dist > SBMaxSLDist(atr)) return false;
      
      sig.strategy_id = "SWING"; sig.dir = 1;
      sig.entry = entry; sig.sl = sl;
      sig.tp = 0.0; // managed exits
      sig.score = 70.0 + (swept_low < DBL_MAX ? 10.0 : 0.0);
      sig.reason = StringFormat("discount_pullback lo=%.2f band=%.2f", lo, band);
      sig.bar_time = r[0].time; sig.tf = InpSetupTF;
      SBMarkFired("SWING");
      return true;
     }
   
   //--- shorts: premium band + rejection candle
   if(bias < 0 && RegBias() <= 0
      && entry <= hi && entry >= hi - band
      && r[0].close < r[0].open)
     {
      double swept_high = -DBL_MAX;
      for(int i = 0; i < n; i++)
         if(r[i].high > r[0].high) { swept_high = MathMax(swept_high, r[i].high); }
      double sl_base = (swept_high > -DBL_MAX) ? MathMax(swept_high, r[0].high) : r[0].high;
      double sl = sl_base + 0.3 * atr;
      double dist = sl - entry;
      if(dist < SBMinSLDist(atr))
        {
         sl = entry + SBMinSLDist(atr);
         dist = SBMinSLDist(atr);
        }
      if(dist > SBMaxSLDist(atr)) return false;
      
      sig.strategy_id = "SWING"; sig.dir = -1;
      sig.entry = entry; sig.sl = sl;
      sig.tp = 0.0;
      sig.score = 70.0 + (swept_high > -DBL_MAX ? 10.0 : 0.0);
      sig.reason = StringFormat("premium_pullback hi=%.2f band=%.2f", hi, band);
      sig.bar_time = r[0].time; sig.tf = InpSetupTF;
      SBMarkFired("SWING");
      return true;
     }
   return false;
  }