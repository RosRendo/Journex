//+--+
//|                                          ZoneSniperStrategy.mqh |
//|                                  Copyright 2026, AdaptiveICT     |
//|                                             https://www.mql5.com |
//+--+
//| Ported from Pine Script v2.11 "Zone Sniper (Low/High)" mode:    |
//|   BUY  only from the BOTTOM  (Discount zone, lower 30% of the   |
//|        InpZoneRangeBars range)                                   |
//|   SELL only from the TOP    (Premium zone, upper 30%)            |
//|   EQUILIBRIUM (middle)     = momentum continuation SCALP          |
//| TP scheme (handled in TakeProfitModel.mqh via reason keywords):  |
//|   TP1 = ATR-based volatility target for ALL Zone Sniper entries  |
//|   TP2/TP3 runners only for base entries; mid scalps exit @ TP1   |
//+--+
#property copyright "Copyright 2026, AdaptiveICT"
#property link      "https://www.mql5.com"
#property version   "2.11"
#property once

#include "../BaseStrategy.mqh"
#include "../../Market/MarketData.mqh"
#include "../../ICT/MarketStructure.mqh"
#include "../../ICT/Liquidity.mqh"
#include "../../ICT/FVG.mqh"
#include "../../ICT/OrderBlock.mqh"
#include "../../ICT/SMT.mqh"
#include "../../Indicators/ATR.mqh"
#include "../../Indicators/RSI.mqh"
#include "../../Indicators/ADX.mqh"
#include "../../Indicators/EMA.mqh"
#include "../../Indicators/Volume.mqh"
#include "../../Market/MarketRegime.mqh"
#include "../../Market/Session.mqh"
#include "../../Core/DecisionEngine/VolatilityAnalyzer.mqh"

//+--+
//| Zone Sniper Strategy (Pine v2.11 port)  Buy Low / Sell High     |
//+--+
class ZoneSniperStrategy : public BaseStrategy
  {
public:
   //+--+
   //| Scan specific timeframe and populate Zone Sniper candidates     |
   //+--+
   virtual bool Scan(ENUM_TIMEFRAMES tf, string tf_str, TradeSignal &candidate)
     {
      // Initialize candidate DTO
      candidate.symbol       = _Symbol;
      candidate.type         = "NO_TRADE";
      candidate.strategy_id  = "ZONE_SNIPER";
      candidate.signal_tf    = tf;
      candidate.tf_str       = tf_str;
      candidate.entry_price  = 0.0;
      candidate.invalidation_price = 0.0;
      candidate.reason       = "";

      if(InpZoneRangeBars < 10) return false;

      //  Premium/Discount zone (Pine getPD: highest/lowest over N bars)
      MqlRates rates[];
      int copied = GetRates(tf, InpZoneRangeBars + 6, rates);
      if(copied < 6) return false;

      double rng_hi = -DBL_MAX, rng_lo = DBL_MAX;
      for(int i = 0; i < copied && i < InpZoneRangeBars; i++)
        {
         if(rates[i].high > rng_hi) rng_hi = rates[i].high;
         if(rates[i].low  < rng_lo) rng_lo = rates[i].low;
        }
      double current_price = rates[0].close; // series: index 0 = newest bar
      double range = rng_hi - rng_lo;
      if(range <= 0.0 || current_price <= 0.0) return false;

      double pos_pct = (current_price - rng_lo) / range * 100.0;
      bool zone_discount = (pos_pct < 30.0);  // BOTTOM   buy zone
      bool zone_premium  = (pos_pct > 70.0);  // TOP      sell zone
      bool zone_mid      = (!zone_discount && !zone_premium);

      //  ICT triggers (mirror Pine variable set)
      MqlSwing swings_high[], swings_low[];
      GetSwings(tf, InpLiquidityLookback, swings_high, swings_low);

      MqlSweep sweep;
      bool   has_sweep = CheckLiquiditySweep(tf, InpLiquidityLookback, swings_high, swings_low, sweep);
      string mss       = CheckMSS(tf, InpLiquidityLookback, swings_high, swings_low);

      bool bull_fvg = false, bear_fvg = false;
      MqlFVG fvgs[];
      int fvg_count = GetFVGs(tf, InpLiquidityLookback, fvgs);
      for(int i = 0; i < fvg_count; i++)
        {
         if(fvgs[i].is_bullish) bull_fvg = true; else bear_fvg = true;
        }

      bool bull_ob = false, bear_ob = false;
      MqlOB obs[];
      int ob_count = GetOrderBlocks(tf, InpLiquidityLookback, obs);
      for(int i = 0; i < ob_count; i++)
        {
         if(obs[i].is_bullish) bull_ob = true; else bear_ob = true;
        }

      //  Bias helpers
      double ema_f = 0.0, ema_m = 0.0, ema_s = 0.0;
      bool emas_ok = GetEMAs(tf, InpEMA1Period, InpEMA2Period, InpEMA3Period, ema_f, ema_m, ema_s);
      bool ema_bias_bull = (emas_ok && current_price > ema_s); // Pine: close > EMA slow
      bool ema_bias_bear = (emas_ok && current_price < ema_s);
      string htf_bias = GetHTFBias();

      //  Momentum (Pine mom_dir + mom_s proxy)
      double price_5ago = rates[5].close;
      double mom_delta  = current_price - price_5ago;
      bool   mom_bull   = (mom_delta > 0.0);
      bool   mom_bear   = (mom_delta < 0.0);
      double atr        = GetATR(tf, 14);
      if(atr <= 0.0) return false;
      double slope_norm = MathAbs(mom_delta) / atr; // >= ~0.75  Pine strong velocity

      //  Volatility gate
      double vol_mult_unused = 1.0;
      string vol_state = VolatilityAnalyzer::Analyze(tf, vol_mult_unused);

      //  Trigger sets (Pine bull/bear trigger OR-chain)
      bool bull_trigger = (mss == "BULLISH") || (has_sweep && sweep.type == "SSL") ||
                          bull_fvg || bull_ob || ema_bias_bull;
      bool bear_trigger = (mss == "BEARISH") || (has_sweep && sweep.type == "BSL") ||
                          bear_fvg || bear_ob || ema_bias_bear;

      //  Base entries: BUY from bottom / SELL from top (regime gate: no extreme)
      bool base_buy  = zone_discount && bull_trigger && vol_state != "EXTREME";
      bool base_sell = zone_premium  && bear_trigger && vol_state != "EXTREME";

      //  Middle scalps: aligned momentum, no hostile HTF, sane volatility
      bool mid_buy  = zone_mid && mom_bull  && ema_bias_bull && htf_bias != "BEARISH" &&
                      slope_norm >= InpZoneMinVel && vol_state != "EXTREME";
      bool mid_sell = zone_mid && mom_bear  && ema_bias_bear && htf_bias != "BULLISH" &&
                      slope_norm >= InpZoneMinVel && vol_state != "EXTREME";

      bool is_buy  = base_buy  || mid_buy;
      bool is_sell = base_sell || mid_sell;
      if(is_buy == is_sell) return false; // ambiguous  no trade

      //  Build signal DTO (reason keywords drive TakeProfitModel)
      double entry = (is_buy) ? SymbolInfoDouble(_Symbol, SYMBOL_ASK)
                              : SymbolInfoDouble(_Symbol, SYMBOL_BID);
      if(entry <= 0.0) entry = current_price;

      candidate.entry_price       = entry;
      candidate.invalidation_price = is_buy ? entry - atr * InpZoneSLAtrMult
                                            : entry + atr * InpZoneSLAtrMult;

      if(is_buy)
        {
         candidate.type = "BUY";
         if(mid_buy)
            candidate.reason = StringFormat("ZONE_SNIPER Mid-Range Momentum SCALP (vel %.2f)", slope_norm);
         else
            candidate.reason = StringFormat("ZONE_SNIPER Discount Base Reversal%s%s%s",
                                            bull_fvg ? " +Bull FVG" : "", bull_ob ? " +Bull OB" : "",
                                            (has_sweep && sweep.type == "SSL") ? " +SSL Sweep" : "");
         return true;
        }
      else
        {
         candidate.type = "SELL";
         if(mid_sell)
            candidate.reason = StringFormat("ZONE_SNIPER Mid-Range Momentum SCALP (vel %.2f)", slope_norm);
         else
            candidate.reason = StringFormat("ZONE_SNIPER Premium Base Reversal%s%s%s",
                                            bear_fvg ? " +Bear FVG" : "", bear_ob ? " +Bear OB" : "",
                                            (has_sweep && sweep.type == "BSL") ? " +BSL Sweep" : "");
         return true;
        }
     }

   //+--+
   //| Confluence scoring (mirrors Pine Parity 10-component matrix)    |
   //+--+
   virtual ConfluenceResult CalculateConfluence(const TradeSignal &candidate)
     {
      ConfluenceResult result;
      result.score    = 0;
      result.grade    = "Reject";
      result.is_valid = false;

      if(candidate.type == "NO_TRADE") return result;

      bool   is_buy = (candidate.type == "BUY");
      double score  = 0.0;
      ENUM_TIMEFRAMES tf = candidate.signal_tf;

      // Structure data
      MqlSwing swings_high[], swings_low[];
      GetSwings(tf, InpLiquidityLookback, swings_high, swings_low);

      MqlSweep sweep;
      bool   has_sweep = CheckLiquiditySweep(tf, InpLiquidityLookback, swings_high, swings_low, sweep);
      string mss       = CheckMSS(tf, InpLiquidityLookback, swings_high, swings_low);
      string bias      = GetHTFBias();

      bool recent_fvg = false, recent_ob = false;
      MqlFVG fvgs[];
      int fvg_count = GetFVGs(tf, InpLiquidityLookback, fvgs);
      // Confluence bonus only for structures formed within the last 15 bars
      for(int i = 0; i < fvg_count; i++)
        {
         if(iBarShift(_Symbol, tf, fvgs[i].time) > 15) continue;
         if(is_buy && fvgs[i].is_bullish) recent_fvg = true;
         if(!is_buy && !fvgs[i].is_bullish) recent_fvg = true;
        }
      MqlOB obs[];
      int ob_count = GetOrderBlocks(tf, InpLiquidityLookback, obs);
      // Confluence bonus only for blocks formed within the last 20 bars
      for(int i = 0; i < ob_count; i++)
        {
         if(iBarShift(_Symbol, tf, obs[i].time) > 20) continue;
         if(is_buy && obs[i].is_bullish) recent_ob = true;
         if(!is_buy && !obs[i].is_bullish) recent_ob = true;
        }

      // Technical indicators
      double rsi_val = GetRSI(tf, InpRSIPeriod);
      double plus_di = 0.0, minus_di = 0.0;
      double adx_val = GetADX(tf, InpADXPeriod, plus_di, minus_di);
      bool   vol_spike = CheckVolumeSpike(tf, InpVolAvgPeriod, InpVolMinRatio);
      bool   smt_div   = CheckSMT(tf, SanitizeStringInput(InpSMTSymbol));

      //  Category 1: ICT Smart Money (structure/sweep/FVG/OB)
      if(is_buy)
        {
         if(mss == "BULLISH") score += 15.0;
         if(has_sweep && sweep.type == "SSL") score += 15.0;
         if(recent_fvg) score += 10.0;
         if(recent_ob)  score += 10.0;
         if(bias == "BULLISH") score += 10.0;
        }
      else
        {
         if(mss == "BEARISH") score += 15.0;
         if(has_sweep && sweep.type == "BSL") score += 15.0;
         if(recent_fvg) score += 10.0;
         if(recent_ob)  score += 10.0;
         if(bias == "BEARISH") score += 10.0;
        }

      //  Category 2: Zone entry location (the core of Zone Sniper)
      // Base reversal entries get the full zone bonus; mid scalps get partial.
      bool is_scalp = (StringFind(candidate.reason, "SCALP") >= 0);
      if(!is_scalp) score += 15.0;
      else score += 8.0;

      //  Category 3: Technical facilities (mirrors Pine component weights)
      if(!InpUseRSI) score += 5.0;
      else if(is_buy  && rsi_val >= InpRSIBuyMin  && rsi_val <= InpRSIBuyMax)  score += 5.0;
      else if(!is_buy && rsi_val >= InpRSISellMin && rsi_val <= InpRSISellMax) score += 5.0;

      if(!InpUseADX) score += 5.0;
      else if(is_buy  && adx_val >= InpADXMin && adx_val <= InpADXMax && plus_di > minus_di)  score += 5.0;
      else if(!is_buy && adx_val >= InpADXMin && adx_val <= InpADXMax && minus_di > plus_di)  score += 5.0;

      if(!InpUseVolume) score += 3.0;
      else if(vol_spike) score += 3.0;

      if(!InpUseSMT) score += 5.0;
      else if(smt_div) score += 5.0;

      //  Category 4: Session & MTF (mirrors Pine session/MTF components)
      string current_session = GetCurrentSession();
      string sess_cfg = SanitizeStringInput(InpSession);
      string sess_upper = sess_cfg;
      StringToUpper(sess_upper);
      bool sess_ok = false;
      if(sess_upper == "ALL" || sess_upper == "BOTH") sess_ok = true;
      else if(sess_upper == "LONDON" && (current_session == "LONDON" || current_session == "LONDON & NY")) sess_ok = true;
      else if(sess_upper == "NY"     && (current_session == "NEW YORK" || current_session == "LONDON & NY")) sess_ok = true;
      else if(current_session != "NONE" && current_session != "ASIAN") sess_ok = true;
      if(sess_ok) score += 10.0;

      double ema_f = 0.0, ema_m = 0.0, ema_s = 0.0;
      if(GetEMAs(tf, InpEMA1Period, InpEMA2Period, InpEMA3Period, ema_f, ema_m, ema_s))
        {
         bool mtf_ok = is_buy ? (ema_f > ema_m && ema_m > ema_s) : (ema_f < ema_m && ema_m < ema_s);
         if(mtf_ok) score += 10.0;
        }

      //  Category 5: Directional bias penalty (hostile HTF)
      if(is_buy  && bias == "BEARISH") score = MathMax(0.0, score - 15.0);
      if(!is_buy && bias == "BULLISH") score = MathMax(0.0, score - 15.0);

      result.score = (int)MathRound(MathMin(100.0, score));

      if(result.score >= 90)      result.grade = "A+";
      else if(result.score >= 80) result.grade = "A";
      else if(result.score >= 70) result.grade = "B";
      else                        result.grade = "C";

      if(result.score >= InpMinScore)
         result.is_valid = true;

      return result;
     }
  };
