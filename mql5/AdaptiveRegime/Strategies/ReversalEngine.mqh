//+------------------------------------------------------------------+
//|                                                 ReversalEngine.mqh|
//|                                          AdaptiveRegime EA       |
//+------------------------------------------------------------------+
#property copyright "AdaptiveRegime"
#property version   "1.00"
#property once
#include "StrategyBase.mqh"

//+------------------------------------------------------------------+
//| Reversal engine on the SETUP timeframe: sweep of the most        |
//| recent structural pivot with an immediate close back inside,     |
//| plus a rejection wick (wick% floor) and confirmation close.      |
//| Modes: standard (close-back-confirm) or early (wick only).       |
//| No broker TP: BE + managed exits.              |
//+------------------------------------------------------------------+
bool EnReversal(TradeSignal &sig)
  {
   if(!InpReversalEnabled || !AREngineAllowed(3)) return false;
   if(!SelAllowed("REVERSAL")) return false;
   if(!SBCooldownOk("REVERSAL", 1800)) return false;
   
   MqlRates r[];
   int n = MdGetClosedRates(InpSetupTF, InpRevLookback + 3, r);
   if(n < 15) return false;
   
   int plows[], phighs[];
   SBPivots(r, n, InpRevLookback, plows, phighs);
   
   double atr = SBAtr(InpSetupTF);
   if(atr <= 0.0) return false; // never trade without ATR
   
   //--- short: sweep of a recent pivot high, close back below, upper-wick rejection
   if(ArraySize(phighs) >= 1)
     {
      double p_high = r[phighs[0]].high;
      // find the sweep bar: any bar 1..3 ago that traded above p_high and closed below it
      for(int s = 1; s <= 3 && s < n; s++)
        {
         if(r[s].high > p_high && r[s].close < p_high) // sweep + close back inside
           {
            bool confirm;
            if(InpReversalEarlyEntry)
               confirm = SBWickPct(r[0], -1) >= InpRevWickMinPct || r[0].close < r[1].close;
            else
               confirm = r[0].close < p_high && (SBWickPct(r[0], -1) >= InpRevWickMinPct || r[0].close < r[1].close);
            if(!confirm) break;
            
            double entry = r[0].close;
            double sl = MathMax(p_high, r[s].high) + 0.2 * atr;
            double dist = sl - entry;
            if(dist < SBMinSLDist(atr))
              {
               sl = entry + SBMinSLDist(atr);
               dist = SBMinSLDist(atr);
              }
            if(dist > SBMaxSLDist(atr)) return false;
            
            sig.strategy_id = "REVERSAL"; sig.dir = -1;
            sig.entry = entry; sig.sl = sl;
            sig.tp = 0.0;
            sig.score = 65.0;
            sig.reason = StringFormat("sweep_high=%.2f wick=%.0f%%", p_high, SBWickPct(r[0], -1));
            sig.bar_time = r[0].time; sig.tf = InpSetupTF;
            SBMarkFired("REVERSAL");
            return true;
           }
        }
     }
   
   //--- long: sweep of a recent pivot low, close back above, lower-wick rejection
   if(ArraySize(plows) >= 1)
     {
      double p_low = r[plows[0]].low;
      for(int s = 1; s <= 3 && s < n; s++)
        {
         if(r[s].low < p_low && r[s].close > p_low)
           {
            bool confirm;
            if(InpReversalEarlyEntry)
               confirm = SBWickPct(r[0], 1) >= InpRevWickMinPct || r[0].close > r[1].close;
            else
               confirm = r[0].close > p_low && (SBWickPct(r[0], 1) >= InpRevWickMinPct || r[0].close > r[1].close);
            if(!confirm) break;
            
            double entry = r[0].close;
            double sl = MathMin(p_low, r[s].low) - 0.2 * atr;
            double dist = entry - sl;
            if(dist < SBMinSLDist(atr))
              {
               sl = entry - SBMinSLDist(atr);
               dist = SBMinSLDist(atr);
              }
            if(dist > SBMaxSLDist(atr)) return false;
            
            sig.strategy_id = "REVERSAL"; sig.dir = 1;
            sig.entry = entry; sig.sl = sl;
            sig.tp = 0.0;
            sig.score = 65.0;
            sig.reason = StringFormat("sweep_low=%.2f wick=%.0f%%", p_low, SBWickPct(r[0], 1));
            sig.bar_time = r[0].time; sig.tf = InpSetupTF;
            SBMarkFired("REVERSAL");
            return true;
           }
        }
     }
   return false;
  }