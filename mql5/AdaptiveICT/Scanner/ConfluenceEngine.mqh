//+------------------------------------------------------------------+
//|                                             ConfluenceEngine.mqh |
//|                                  Copyright 2026, AdaptiveICT     |
//|                                             https://www.mql5.com |
//+------------------------------------------------------------------+
#property copyright "Copyright 2026, AdaptiveICT"
#property link      "https://www.mql5.com"
#property version   "1.00"

#include "../Core/Types.mqh"
#include "../Core/Config.mqh"
#include "../Core/StateManager.mqh"
#include "../Indicators/RSI.mqh"
#include "../Indicators/ADX.mqh"
#include "../Indicators/EMA.mqh"
#include "../Indicators/Volume.mqh"
#include "../Market/MarketRegime.mqh"
#include "../Market/Session.mqh"
#include "../ICT/MarketStructure.mqh"
#include "../ICT/Liquidity.mqh"
#include "../ICT/FVG.mqh"
#include "../ICT/OrderBlock.mqh"
#include "../ICT/SMT.mqh"

//+------------------------------------------------------------------+
//| Compute Confluence Score (0-100) and assign setup Grade          |
//+------------------------------------------------------------------+
ConfluenceResult CalculateConfluence(const SignalCandidate &candidate)
  {
   ConfluenceResult result;
   result.score = 0;
   result.grade = "Reject";
   result.is_valid = false;

   if(candidate.type == "NO_TRADE") return result;

   double score = 0.0;
   ENUM_TIMEFRAMES tf = candidate.tf;

   // Retrieve structure data
   MqlSwing swings_high[], swings_low[];
   GetSwings(tf, 120, swings_high, swings_low);
   
   MqlSweep sweep;
   bool has_sweep = CheckLiquiditySweep(tf, 120, swings_high, swings_low, sweep);
   string mss = CheckMSS(tf, 120, swings_high, swings_low);
   string bias = GetHTFBias();
   
   MqlFVG fvgs[];
   GetFVGs(tf, 120, fvgs);
   bool recent_fvg = false;
   int fvg_size = ArraySize(fvgs);
   for(int i = MathMax(0, fvg_size - 10); i < fvg_size; i++)
     {
      if(candidate.type == "BUY" && fvgs[i].is_bullish) recent_fvg = true;
      if(candidate.type == "SELL" && !fvgs[i].is_bullish) recent_fvg = true;
     }

   MqlOB obs[];
   GetOrderBlocks(tf, 120, obs);
   bool recent_ob = false;
   int ob_size = ArraySize(obs);
   for(int i = MathMax(0, ob_size - 15); i < ob_size; i++)
     {
      if(candidate.type == "BUY" && obs[i].is_bullish) recent_ob = true;
      if(candidate.type == "SELL" && !obs[i].is_bullish) recent_ob = true;
     }

   // Technical Indicators
   double rsi_val = GetRSI(tf, InpRSIPeriod);
   double plus_di = 0.0, minus_di = 0.0;
   double adx_val = GetADX(tf, InpADXPeriod, plus_di, minus_di);
   bool vol_spike = CheckVolumeSpike(tf, InpVolAvgPeriod, InpVolMinRatio);
   bool smt_div = CheckSMT(tf, SanitizeStringInput(InpSMTSymbol));

   // ── Category 1: ICT Smart Money (Max 60 pts) ──────────────────────
   if(candidate.type == "BUY")
     {
      if(mss == "BULLISH") score += 15.0;
      if(has_sweep && sweep.type == "SSL") score += 15.0;
      if(recent_fvg) score += 10.0;
      if(recent_ob) score += 10.0;
      if(bias == "BULLISH") score += 10.0;
     }
   else if(candidate.type == "SELL")
     {
      if(mss == "BEARISH") score += 15.0;
      if(has_sweep && sweep.type == "BSL") score += 15.0;
      if(recent_fvg) score += 10.0;
      if(recent_ob) score += 10.0;
      if(bias == "BEARISH") score += 10.0;
     }

   // ── Category 2: Technical Indicators (Max 20 pts) ──────────────────
   if(InpUseRSI)
     {
      if(candidate.type == "BUY" && rsi_val >= InpRSIBuyMin && rsi_val <= InpRSIBuyMax) score += 5.0;
      if(candidate.type == "SELL" && rsi_val >= InpRSISellMin && rsi_val <= InpRSISellMax) score += 5.0;
     }
   else score += 5.0;

   if(InpUseADX)
     {
      if(candidate.type == "BUY" && adx_val >= InpADXMin && adx_val <= InpADXMax && plus_di > minus_di) score += 5.0;
      if(candidate.type == "SELL" && adx_val >= InpADXMin && adx_val <= InpADXMax && minus_di > plus_di) score += 5.0;
     }
   else score += 5.0;

   if(InpUseVolume)
     {
      if(vol_spike) score += 5.0;
     }
   else score += 5.0;

   if(InpUseSMT)
     {
      if(smt_div) score += 5.0;
     }
   else score += 5.0;

   // ── Category 3: Market Conditions (Max 10 pts) ───────────────────
   // Session Hour Match
   string current_session = GetCurrentSession();
   bool sess_ok = false;
   if(scan_session == "all" || 
      (scan_session == "london" && current_session == "LONDON") ||
      (scan_session == "ny" && current_session == "NEW YORK") ||
      (scan_session == "both" && (current_session == "LONDON" || current_session == "NEW YORK")))
      sess_ok = true;
   if(sess_ok) score += 5.0;

   // Multi-Timeframe Confirmation
   bool mtf_align = false;
   if(InpUseMTFConfluence)
     {
      ENUM_TIMEFRAMES parent_tf = (tf == PERIOD_M5) ? PERIOD_M15 : ((tf == PERIOD_M15) ? PERIOD_H1 : PERIOD_H4);
      double p_ema1 = 0, p_ema2 = 0, p_ema3 = 0;
      if(GetEMAs(parent_tf, InpEMA1Period, InpEMA2Period, InpEMA3Period, p_ema1, p_ema2, p_ema3))
        {
         if(candidate.type == "BUY" && p_ema1 > p_ema2 && p_ema2 > p_ema3) mtf_align = true;
         if(candidate.type == "SELL" && p_ema1 < p_ema2 && p_ema2 < p_ema3) mtf_align = true;
        }
     }
   else mtf_align = true;
   if(mtf_align) score += 5.0;

   // ── Category 4: Execution Filters (Max 10 pts) ────────────────────
   score += 5.0; // Spread filter passed (hard filtered earlier)
   
   double invalidation_dist = MathAbs(candidate.entry_price - candidate.invalidation_price);
   if(invalidation_dist > 0.0)
     {
      double est_tp = (candidate.type == "BUY") ? candidate.entry_price + (invalidation_dist * min_rr) : candidate.entry_price - (invalidation_dist * min_rr);
      double rr = MathAbs(est_tp - candidate.entry_price) / invalidation_dist;
      if(rr >= min_rr) score += 5.0;
     }

   // ── Category 5: Directional Bias Check ────────────────────────────
   if(candidate.type == "BUY" && bias == "BEARISH") score = MathMax(0.0, score - 10.0);
   if(candidate.type == "SELL" && bias == "BULLISH") score = MathMax(0.0, score - 10.0);

   result.score = (int)MathRound(score);
   
   if(result.score >= 90) result.grade = "A+";
   else if(result.score >= 80) result.grade = "A";
   else if(result.score >= 70) result.grade = "B";
   else result.grade = "C";

   if(result.score >= min_score)
      result.is_valid = true;

   return result;
  }
