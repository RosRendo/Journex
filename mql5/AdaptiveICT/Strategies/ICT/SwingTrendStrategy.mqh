//+------------------------------------------------------------------+
//|                                            SwingTrendStrategy.mqh|
//|                                  Copyright 2026, AdaptiveICT     |
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
#include "../../Indicators/ADX.mqh"
#include "../../Indicators/EMA.mqh"
#include "../../Indicators/Volume.mqh"
#include "../../Market/MarketRegime.mqh"
#include "../../Market/Session.mqh"
#include "../../Indicators/ATR.mqh"

//+------------------------------------------------------------------+
//| Swing Trend Strategy (Phase 4)                                   |
//| Purpose: capture large directional moves, not quick scalps.      |
//| 1. HTF trend filter: H4 bias (GetHTFBias: close vs 200-SMA).     |
//| 2. Pullback entry: price must pull back into the discount        |
//|    (uptrend) / premium (downtrend) band of the last              |
//|    InpSwingRangeBars bars before entry.                          |
//| 3. Confirmation: MSS shift on the entry TF, or a liquidity       |
//|    sweep of SSL/BSL plus a same-direction completed candle.      |
//| 4. Exits are managed by SwingPositionManager (no time decay):    |
//|    BE lock, optional partial, wide ATR trail. No broker TP.      |
//| Evaluates only CLOSED candles (GetRates + g_scan_closed_bars).   |
//+------------------------------------------------------------------+
class SwingTrendStrategy : public BaseStrategy
  {
public:
   virtual bool Scan(ENUM_TIMEFRAMES tf, string tf_str, TradeSignal &candidate)
     {
      candidate.symbol = _Symbol;
      candidate.signal_tf = tf;
      candidate.type = "NO_TRADE";
      candidate.strategy_id = "SWING_TREND";
      candidate.invalidation_price = 0.0;
      candidate.reason = "";
      
      // 1. Higher-timeframe trend gate
      string bias = GetHTFBias();
      if(bias != "BULLISH" && bias != "BEARISH") return false;
      
      MqlRates rates[];
      int copied = GetRates(tf, InpSwingRangeBars + 6, rates);
      if(copied < 20) return false;
      
      // Range over the last InpSwingRangeBars completed bars (skip rates[0]
      // context building: range includes the just-closed bar)
      double range_hi = rates[0].high;
      double range_lo = rates[0].low;
      for(int i = 1; i <= InpSwingRangeBars && i < copied; i++)
        {
         if(rates[i].high > range_hi) range_hi = rates[i].high;
         if(rates[i].low  < range_lo) range_lo = rates[i].low;
        }
      double rng = range_hi - range_lo;
      if(rng <= 0.0) return false;
      
      double atr = GetATR(tf, 14);
      if(atr <= 0.0) return false;
      
      // Structure data
      MqlSwing swings_high[], swings_low[];
      GetSwings(tf, InpSwingRangeBars, swings_high, swings_low);
      MqlSweep sweep;
      bool   has_sweep = CheckLiquiditySweep(tf, InpSwingRangeBars, swings_high, swings_low, sweep);
      string mss       = CheckMSS(tf, InpSwingRangeBars, swings_high, swings_low);
      
      double closed    = rates[0].close;
      double bar_low   = rates[0].low;
      double bar_high  = rates[0].high;
      
      double discount_level = range_lo + rng * (InpSwingPullbackPct / 100.0);
      double premium_level  = range_hi - rng * (InpSwingPullbackPct / 100.0);
      
      // ── BUY: HTF uptrend + pullback into discount + confirmation ──
      if(bias == "BULLISH")
        {
         bool in_discount = (bar_low <= discount_level) || (closed <= discount_level);
         bool confirm = (mss == "BULLISH") ||
                        (has_sweep && sweep.type == "SSL" && closed > rates[0].open);
         if(in_discount && confirm)
           {
            candidate.type = "BUY";
            candidate.entry_price = closed;
            int low_sz = ArraySize(swings_low);
            candidate.invalidation_price = (low_sz > 0) ? swings_low[0].price : closed - atr * InpSwingSLAtrMult;
            candidate.reason = "Swing: HTF Uptrend + Discount Pullback" + (has_sweep && sweep.type == "SSL" ? " + SSL Sweep" : "");
            return true;
           }
        }
      
      // ── SELL: HTF downtrend + pullback into premium + confirmation ──
      if(bias == "BEARISH")
        {
         bool in_premium = (bar_high >= premium_level) || (closed >= premium_level);
         bool confirm = (mss == "BEARISH") ||
                        (has_sweep && sweep.type == "BSL" && closed < rates[0].open);
         if(in_premium && confirm)
           {
            candidate.type = "SELL";
            candidate.entry_price = closed;
            int high_sz = ArraySize(swings_high);
            candidate.invalidation_price = (high_sz > 0) ? swings_high[0].price : closed + atr * InpSwingSLAtrMult;
            candidate.reason = "Swing: HTF Downtrend + Premium Pullback" + (has_sweep && sweep.type == "BSL" ? " + BSL Sweep" : "");
            return true;
           }
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
      bool   is_buy = (candidate.type == "BUY");
      ENUM_TIMEFRAMES tf = candidate.signal_tf;
      
      string bias = GetHTFBias();
      bool bias_ok = (is_buy && bias == "BULLISH") || (!is_buy && bias == "BEARISH");
      
      MqlSwing swings_high[], swings_low[];
      GetSwings(tf, InpSwingRangeBars, swings_high, swings_low);
      MqlSweep sweep;
      bool   has_sweep = CheckLiquiditySweep(tf, InpSwingRangeBars, swings_high, swings_low, sweep);
      string mss       = CheckMSS(tf, InpSwingRangeBars, swings_high, swings_low);
      
      bool sweep_ok = has_sweep && ((is_buy && sweep.type == "SSL") || (!is_buy && sweep.type == "BSL"));
      bool mss_ok   = (is_buy && mss == "BULLISH") || (!is_buy && mss == "BEARISH");
      
      // FVG / OB alignment (recency-capped like the other engines)
      bool fvg_ok = false;
      MqlFVG fvgs[];
      int fvg_count = GetFVGs(tf, InpSwingRangeBars, fvgs);
      for(int i = 0; i < fvg_count; i++)
        {
         if(iBarShift(_Symbol, tf, fvgs[i].time) > 15) continue;
         if(is_buy && fvgs[i].is_bullish)  { fvg_ok = true; break; }
         if(!is_buy && !fvgs[i].is_bullish) { fvg_ok = true; break; }
        }
      
      bool ob_ok = false;
      MqlOB obs[];
      int ob_count = GetOrderBlocks(tf, InpSwingRangeBars, obs);
      for(int i = 0; i < ob_count; i++)
        {
         if(iBarShift(_Symbol, tf, obs[i].time) > 20) continue;
         if(is_buy && obs[i].is_bullish)  { ob_ok = true; break; }
         if(!is_buy && !obs[i].is_bullish) { ob_ok = true; break; }
        }
      
      // Technical indicators
      double rsi_val = GetRSI(tf, InpRSIPeriod);
      double plus_di = 0.0, minus_di = 0.0;
      double adx_val = GetADX(tf, InpADXPeriod, plus_di, minus_di);
      bool   vol_spike = CheckVolumeSpike(tf, InpVolAvgPeriod, InpVolMinRatio);
      
      // ── Score (max 100) ──────────────────────────────────────────
      if(bias_ok) score += 20.0;                       // HTF trend aligned
      if(mss_ok) score += 15.0;                        // structure shift
      if(sweep_ok) score += 15.0;                      // liquidity grabbed
      if(fvg_ok) score += 10.0;                        // imbalance support
      if(ob_ok) score += 10.0;                         // institutional base
      
      // Pullback depth quality: deep pullback = better entry location
      MqlRates rates[];
      int copied = GetRates(tf, InpSwingRangeBars + 6, rates);
      if(copied > InpSwingRangeBars)
        {
         double hi = rates[0].high, lo = rates[0].low;
         for(int i = 1; i <= InpSwingRangeBars && i < copied; i++)
           {
            if(rates[i].high > hi) hi = rates[i].high;
            if(rates[i].low  < lo) lo = rates[i].low;
           }
         double rng = hi - lo;
         if(rng > 0.0)
           {
            double pos_pct = (is_buy ? (candidate.entry_price - lo) : (hi - candidate.entry_price)) / rng * 100.0;
            if(pos_pct <= InpSwingPullbackPct) score += 10.0;      // inside band
            if(pos_pct <= InpSwingPullbackPct * 0.5) score += 5.0; // deep in band
           }
        }
      
      if(adx_val >= InpADXMin) score += 10.0;          // trend strength
      
      if(is_buy && rsi_val < 65.0) score += 5.0;       // not chasing overbought
      if(!is_buy && rsi_val > 35.0) score += 5.0;
      
      if(vol_spike) score += 5.0;
      
      string current_session = GetCurrentSession();
      if(current_session == "LONDON" || current_session == "NEW YORK") score += 10.0;
      else if(current_session == "ASIA") score += 5.0;
      
      result.score = (int)MathMin(score, 100.0);
      result.grade = (result.score >= 80.0) ? "A" : (result.score >= 70.0) ? "B" : (result.score >= 60.0) ? "C" : "Reject";
      result.is_valid = (result.score >= 60.0);
      return result;
     }
  };