//+------------------------------------------------------------------+
//|                                                   ScalpEngine.mqh|
//|                                          AdaptiveRegime EA       |
//+------------------------------------------------------------------+
#property copyright "AdaptiveRegime"
#property version   "1.00"
#property once
#include "StrategyBase.mqh"

//+------------------------------------------------------------------+
//| Scalping engine: momentum burst on the ENTRY timeframe.          |
//| Tick-driven (not gated to new bar), so throttled by its own      |
//| cooldown. Burst measured over closed bars only; threshold is     |
//| adaptive-scaled by sqrt(lookback bars).          |
//+------------------------------------------------------------------+
bool EnScalp(TradeSignal &sig)
  {
   if(!InpScalpEnabled || !AREngineAllowed(0)) return false;
   if(!SelAllowed("SCALP")) return false;
   if(!SBCooldownOk("SCALP", InpScalpCooldownSec)) return false;
   
   // scalp is spread-sensitive: own hard cap (global gate re-checks too)
   if(MdSpreadPoints() > InpScalpMaxSpreadPts) return false;
   
   int tf_sec = PeriodSeconds(InpEntryTF);
   if(tf_sec <= 0) return false;
   int lb = (int)MathMax(2, InpScalpLookbackSec / tf_sec); // never 1-bar noise
   lb = (int)MathMin(lb, 50);
   
   double atr0 = SBAtr(InpEntryTF);
   if(atr0 <= 0.0) return false;
   
   MqlRates r[];
   int n = MdGetClosedRates(InpEntryTF, lb + 2, r);
   if(n < lb + 1) return false;
   
   double move = r[0].close - r[lb].close; // from close of lb bars ago to newest close
   double threshold = InpScalpMinMoveATR * atr0;
   if(InpScalpAdaptiveThreshold)
      threshold *= MathSqrt((double)lb);
   
   int dir = 0;
   if(move >= threshold) dir = 1;
   else if(move <= -threshold) dir = -1;
   if(dir == 0) return false;
   
   double sl_dist = MathMax(InpScalpSLAtrMult * atr0, MdMinSLDist(atr0));
   
   MqlTick tick;
   if(!MdTick(tick)) return false;
   
   double entry = (dir > 0) ? tick.ask : tick.bid;
   
   sig.strategy_id = "SCALP";
   sig.dir = dir;
   sig.entry = entry;
   sig.sl = (dir > 0) ? entry - sl_dist : entry + sl_dist;
   sig.tp = 0.0; // managed exits (time stop + BE), no broker TP
   sig.score = 60.0;
   sig.reason = StringFormat("burst %.2f ATR/%dbars", move / atr0, lb);
   sig.bar_time = iTime(_Symbol, InpEntryTF, 0);
   sig.tf = InpEntryTF;
   
   SBMarkFired("SCALP");
   LogInfo(StringFormat("SIG SCALP %s %s", dir > 0 ? "BUY" : "SELL", sig.reason));
   return true;
  }