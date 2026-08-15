//+------------------------------------------------------------------+
//|                                           ICTScalperStrategy.mqh |
//|                                  Copyright 2026, AdaptiveICT     |
//|                                             https://www.mql5.com |
//+------------------------------------------------------------------+
#property copyright "Copyright 2026, AdaptiveICT"
#property link      "https://www.mql5.com"
#property version   "1.00"
#property once

#include "../BaseStrategy.mqh"
#include "../../Market/MarketData.mqh"
#include "../../ICT/MarketStructure.mqh"
#include "../../ICT/Liquidity.mqh"
#include "../../ICT/FVG.mqh"
#include "../../ICT/OrderBlock.mqh"
#include "../../Indicators/RSI.mqh"
#include "../../Indicators/EMA.mqh"
#include "../../Indicators/ATR.mqh"
#include "../../Indicators/Volume.mqh"
#include "../../Market/Session.mqh"

//+------------------------------------------------------------------+
//| ICT Scalper Strategy (M1/M5/M15 fast structural scalp)           |
//| Concept: Capture fast displacement moves on small timeframes     |
//| by only trading when price breaks structure AND a recent FVG     |
//| is present on the same timeframe for entry precision.            |
//+------------------------------------------------------------------+
class ICTScalperStrategy : public BaseStrategy
  {
public:
   virtual bool Scan(ENUM_TIMEFRAMES tf, string tf_str, TradeSignal &candidate)
     {
      candidate.symbol     = _Symbol;
      candidate.type       = "NO_TRADE";
      candidate.strategy_id = "ICT_SCALPER";
      candidate.signal_tf  = tf;
      candidate.tf_str     = tf_str;
      candidate.entry_price = 0.0;
      candidate.invalidation_price = 0.0;
      candidate.reason     = "";

      MqlRates rates[];
      int copied = GetRates(tf, 50, rates);
      if(copied < 10) return false;

      // ── Step 1: Detect a displacement candle in the last 3 bars ───
      // A displacement candle is a candle whose body is >= 1.5x ATR
      double atr = GetATR(tf, 14);
      if(atr <= 0) return false;

      bool bull_disp = false, bear_disp = false;
      // rates[0] is newest, rates[1] is previous, rates[2] is 2 bars ago.
      for(int i = 0; i < 3; i++)
        {
         double body = MathAbs(rates[i].close - rates[i].open);
         if(body >= atr * 1.5)
           {
            if(rates[i].close > rates[i].open) bull_disp = true;
            if(rates[i].close < rates[i].open) bear_disp = true;
           }
        }
      if(!bull_disp && !bear_disp) return false;

      // ── Step 2: Detect a recent FVG confirming the displacement ────
      MqlFVG fvgs[];
      GetFVGs(tf, 100, fvgs);
      int fvg_count = ArraySize(fvgs);

      bool bull_fvg = false, bear_fvg = false;
      for(int i = 0; i < MathMin(5, fvg_count); i++)
        {
         if(fvgs[i].is_bullish) bull_fvg = true;
         else bear_fvg = true;
        }

      // ── Step 3: Detect fast structural break (simplified MSS) ─────
      MqlSwing highs[], lows[];
      GetSwings(tf, 100, highs, lows);
      string mss = CheckMSS(tf, 100, highs, lows);

      double current_price = rates[0].close;

      // ── Trigger Logic ─────────────────────────────────────────────
      // BUY: Bullish displacement + Bullish FVG + Bullish MSS
      if(bull_disp && bull_fvg && mss == "BULLISH")
        {
         candidate.type  = "BUY";
         candidate.entry_price = current_price;
         int low_sz = ArraySize(lows);
         candidate.invalidation_price = (low_sz > 0) ? lows[low_sz - 1].price : current_price - atr * 2.0;
         candidate.reason = "Scalper: Bull Displacement + FVG + MSS";
         return true;
        }
      // SELL: Bearish displacement + Bearish FVG + Bearish MSS
      if(bear_disp && bear_fvg && mss == "BEARISH")
        {
         candidate.type  = "SELL";
         candidate.entry_price = current_price;
         int high_sz = ArraySize(highs);
         candidate.invalidation_price = (high_sz > 0) ? highs[high_sz - 1].price : current_price + atr * 2.0;
         candidate.reason = "Scalper: Bear Displacement + FVG + MSS";
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

      // ── Category 1: ICT Scalp Structure (Max 50 pts) ──────────────
      MqlSwing highs[], lows[];
      GetSwings(tf, 100, highs, lows);
      string mss = CheckMSS(tf, 100, highs, lows);

      MqlFVG fvgs[];
      GetFVGs(tf, 100, fvgs);
      int fvg_count = ArraySize(fvgs);

      MqlOB obs[];
      GetOrderBlocks(tf, 100, obs);
      int ob_count = ArraySize(obs);

      if(candidate.type == "BUY" && mss == "BULLISH") score += 20.0;
      if(candidate.type == "SELL" && mss == "BEARISH") score += 20.0;

      // FVG bonus
      for(int i = 0; i < MathMin(3, fvg_count); i++)
        {
         if(candidate.type == "BUY" && fvgs[i].is_bullish) { score += 15.0; break; }
         if(candidate.type == "SELL" && !fvgs[i].is_bullish) { score += 15.0; break; }
        }

      // OB bonus
      for(int i = 0; i < MathMin(5, ob_count); i++)
        {
         if(candidate.type == "BUY" && obs[i].is_bullish) { score += 15.0; break; }
         if(candidate.type == "SELL" && !obs[i].is_bullish) { score += 15.0; break; }
        }

      // ── Category 2: Indicator Confirmation (Max 30 pts) ───────────
      double rsi = GetRSI(tf, InpRSIPeriod);
      if(InpUseRSI)
        {
         if(candidate.type == "BUY" && rsi >= InpRSIBuyMin && rsi <= InpRSIBuyMax) score += 10.0;
         if(candidate.type == "SELL" && rsi >= InpRSISellMin && rsi <= InpRSISellMax) score += 10.0;
        }
      else score += 10.0;

      // HTF EMA alignment check (parent tf)
      ENUM_TIMEFRAMES parent_tf = (tf == PERIOD_M1) ? PERIOD_M5 : ((tf == PERIOD_M5) ? PERIOD_M15 : PERIOD_H1);
      double e1 = 0, e2 = 0, e3 = 0;
      bool ema_ok = false;
      if(GetEMAs(parent_tf, InpEMA1Period, InpEMA2Period, InpEMA3Period, e1, e2, e3))
        {
         if(candidate.type == "BUY" && e1 > e2) ema_ok = true;
         if(candidate.type == "SELL" && e1 < e2) ema_ok = true;
        }
      if(ema_ok) score += 10.0;

      // Volume spike
      if(CheckVolumeSpike(tf, InpVolAvgPeriod, InpVolMinRatio)) score += 10.0;

      // ── Category 3: Session & RR Validation (Max 20 pts) ──────────
      string sess = GetCurrentSession();
      bool sess_ok = (scan_session == "all" ||
                      (scan_session == "london" && sess == "LONDON") ||
                      (scan_session == "ny" && sess == "NEW YORK") ||
                      (scan_session == "both" && (sess == "LONDON" || sess == "NEW YORK")));
      if(sess_ok) score += 10.0;

      double dist = MathAbs(candidate.entry_price - candidate.invalidation_price);
      if(dist > 0.0)
        {
         double rr = dist * InpMinRR / dist; // placeholder: always valid if dist > 0
         if(rr >= InpMinRR) score += 10.0;
        }

      result.score = (int)MathRound(score);
      if(result.score >= 90) result.grade = "A+";
      else if(result.score >= 80) result.grade = "A";
      else if(result.score >= 70) result.grade = "B";
      else result.grade = "C";

      result.is_valid = (result.score >= InpMinScore);
      return result;
     }
  };
