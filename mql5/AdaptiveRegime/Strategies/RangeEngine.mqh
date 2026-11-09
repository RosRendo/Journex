//+------------------------------------------------------------------+
//|                                                   RangeEngine.mqh|
//|                                          AdaptiveRegime EA       |
//+------------------------------------------------------------------+
#property copyright "AdaptiveRegime"
#property version   "1.00"
#property once
#include "StrategyBase.mqh"

//+------------------------------------------------------------------+
//| Range / mean-reversion engine on the SETUP timeframe:            |
//| trades fades at mean-reversion level of an established sideways  |
//| range (old extremes at rotational levels), inside RANGING regime |
//| and below trend-strength threshold. TP = opposite extreme side;  |
//| RR must clear the floor or the fade is skipped.                  |
//+------------------------------------------------------------------+
bool EnRange(TradeSignal &sig)
  {
   if(!InpRangeEnabled || !AREngineAllowed(4)) return false;
   if(!SelAllowed("RANGE")) return false;
   if(!SBCooldownOk("RANGE", 1800)) return false;
   
   double adx;
   if(!MdIndBuffer(InpSetupTF, 2, InpRegAdxPeriod, 0, 1, adx)) return false;
   if(adx >= InpRangeMinADX) return false; // too much trend for a fade
   
   MqlRates r[];
   int n = MdGetClosedRates(InpSetupTF, InpRangeLookback + 3, r);
   if(n < 30) return false;
   
   int plows[], phighs[];
   SBPivots(r, n, InpRangeLookback, plows, phighs);
   if(ArraySize(plows) < 2 || ArraySize(phighs) < 2) return false;
   
   // range proxies: extreme close levels of the window
   double hi = -DBL_MAX, lo = DBL_MAX;
   for(int i = n - 1; i >= 1; i--)
     {
      hi = MathMax(hi, r[i].high);
      lo = MathMin(lo, r[i].low);
     }
   if(hi <= lo) return false;
   
   double band25 = (hi - lo) * 0.25;
   double atr = SBAtr(InpSetupTF);
   if(atr <= 0.0) return false; // never trade without ATR
   
   double entry = r[0].close;
   
   //--- long fade at rotational bottom with bounce candle
   if(entry <= lo + band25 && r[0].close > r[0].open && SBWickPct(r[0], 1) >= 20.0)
     {
      double sl = lo - MathMax(0.5 * atr, (hi - lo) * 0.05);
      double dist = entry - sl;
      if(dist < SBMinSLDist(atr))
        {
         sl = entry - SBMinSLDist(atr);
         dist = SBMinSLDist(atr);
        }
      double tp = hi - band25 * 0.5;
      double rr = (tp - entry) / MathMax(1e-9, dist);
      if(rr < InpMinRR) return false; // only take fades with acceptable RR
      
      sig.strategy_id = "RANGE"; sig.dir = 1;
      sig.entry = entry; sig.sl = EENormPrice(sl); sig.tp = EENormPrice(tp);
      sig.score = 70.0;
      sig.reason = StringFormat("fade_bottom lo=%.2f rr=%.2f adx=%.1f", lo, rr, adx);
      sig.bar_time = r[0].time; sig.tf = InpSetupTF;
      SBMarkFired("RANGE");
      return true;
     }
   
   //--- short fade at rotational top
   if(entry >= hi - band25 && r[0].close < r[0].open && SBWickPct(r[0], -1) >= 20.0)
     {
      double sl = hi + MathMax(0.5 * atr, (hi - lo) * 0.05);
      double dist = sl - entry;
      if(dist < SBMinSLDist(atr))
        {
         sl = entry + SBMinSLDist(atr);
         dist = SBMinSLDist(atr);
        }
      double tp = lo + band25 * 0.5;
      double rr = (entry - tp) / MathMax(1e-9, dist);
      if(rr < InpMinRR) return false;
      
      sig.strategy_id = "RANGE"; sig.dir = -1;
      sig.entry = entry; sig.sl = EENormPrice(sl); sig.tp = EENormPrice(tp);
      sig.score = 70.0;
      sig.reason = StringFormat("fade_top hi=%.2f rr=%.2f adx=%.1f", hi, rr, adx);
      sig.bar_time = r[0].time; sig.tf = InpSetupTF;
      SBMarkFired("RANGE");
      return true;
     }
   return false;
  }