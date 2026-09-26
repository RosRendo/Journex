//+------------------------------------------------------------------+
//|                                           EntryQualityEngine.mqh |
//|                                  Copyright 2026, AdaptiveICT     |
//|                                             https://www.mql5.com |
//+------------------------------------------------------------------+
#property copyright "Copyright 2026, AdaptiveICT"
#property link      "https://www.mql5.com"
#property version   "1.00"
#property once

#include "Types.mqh"
#include "Config.mqh"
#include "DecisionEngine/StructureAnalyzer.mqh"
#include "DecisionEngine/LiquidityAnalyzer.mqh"
#include "DecisionEngine/VolatilityAnalyzer.mqh"
#include "DecisionEngine/ExecutionQualityAnalyzer.mqh"
#include "../Market/Session.mqh"
#include "../Market/MarketRegime.mqh"

//+------------------------------------------------------------------+
//| T021: Entry Quality Engine with Explainable Breakdown            |
//| Scores setups using configurable InpScoreWeight* inputs          |
//| Maps to: FR-010, FR-011, FR-012, FR-013                          |
//+------------------------------------------------------------------+
class EntryQualityEngine
  {
public:
   // Evaluates all 10 components and returns an EntryScoreBreakdown struct
   static EntryScoreBreakdown Evaluate(ENUM_TIMEFRAMES tf, const TradeSignal &signal, const MarketRegimeState &regime)
     {
      EntryScoreBreakdown b;
      ZeroMemory(b);

      if(signal.type == "NO_TRADE")
        {
         b.tier = "NO_TRADE";
         return b;
        }

      bool is_buy = (signal.type == "BUY");

      // 1. Market Regime Alignment (Max InpScoreWeightRegime)
      if((is_buy && regime.regime == "TRENDING_BULLISH") || (!is_buy && regime.regime == "TRENDING_BEARISH"))
        {
         b.regime_pts = InpScoreWeightRegime;
        }
      else if(regime.regime == "TRANSITION")
        {
         b.regime_pts = (int)MathRound(InpScoreWeightRegime * 0.5);
        }
      else if(regime.regime == "TRENDING")
        {
         b.regime_pts = (int)MathRound(InpScoreWeightRegime * 0.8);
        }
      else
        {
         b.regime_pts = 0;
        }

      // 2. Higher Timeframe Structure Bias (Max InpScoreWeightHTFStructure)
      string htf_bias = GetHTFBias();
      if((is_buy && htf_bias == "BULLISH") || (!is_buy && htf_bias == "BEARISH"))
        {
         b.htf_structure_pts = InpScoreWeightHTFStructure;
        }
      else
        {
         b.htf_structure_pts = 0;
        }

      // 3. Liquidity Sweep (Max InpScoreWeightLiquidity)
      bool has_sweep = false;
      bool smt_div = false;
      LiquidityAnalyzer::Analyze(tf, signal.type, has_sweep, smt_div, SanitizeStringInput(InpSMTSymbol));
      if(has_sweep || StringFind(signal.reason, "sweep") >= 0 || StringFind(signal.reason, "Sweep") >= 0)
        {
         b.liquidity_pts = InpScoreWeightLiquidity;
        }
      else
        {
         b.liquidity_pts = 0;
        }

      // 4. Entry Location - Premium / Discount (Max InpScoreWeightEntryLocation)
      MqlSwing swings_high[], swings_low[];
      GetSwings(tf, 120, swings_high, swings_low);
      double highest = 0.0, lowest = 999999.0;
      for(int i = 0; i < ArraySize(swings_high); i++)
         if(swings_high[i].price > highest) highest = swings_high[i].price;
      for(int i = 0; i < ArraySize(swings_low); i++)
         if(swings_low[i].price < lowest) lowest = swings_low[i].price;

      if(highest > lowest && lowest > 0.0)
        {
         double eq = (highest + lowest) * 0.5;
         double range = highest - lowest;
         double pos = (signal.entry_price - lowest) / range; // 0.0 = extreme discount, 1.0 = extreme premium

         if(is_buy)
           {
            if(pos < 0.45) b.entry_location_pts = InpScoreWeightEntryLocation; // Deep discount
            else if(pos <= 0.55) b.entry_location_pts = (int)MathRound(InpScoreWeightEntryLocation * 0.6); // Equilibrium
            else b.entry_location_pts = 0; // In premium: unfavorable for BUY
           }
         else
           {
            if(pos > 0.55) b.entry_location_pts = InpScoreWeightEntryLocation; // Deep premium
            else if(pos >= 0.45) b.entry_location_pts = (int)MathRound(InpScoreWeightEntryLocation * 0.6); // Equilibrium
            else b.entry_location_pts = 0; // In discount: unfavorable for SELL
           }
        }
      else
        {
         b.entry_location_pts = (int)MathRound(InpScoreWeightEntryLocation * 0.5); // Fallback neutral
        }

      // 5. Market Structure Shift / BOS (Max InpScoreWeightMSS)
      bool mss_valid = false;
      bool recent_fvg = false;
      bool recent_ob = false;
      string mss_state = "";
      StructureAnalyzer::Analyze(tf, signal.type, mss_valid, recent_fvg, recent_ob, mss_state);

      if(mss_valid || StringFind(signal.reason, "MSS") >= 0 || StringFind(signal.reason, "mss") >= 0)
        {
         b.mss_pts = InpScoreWeightMSS;
        }
      else
        {
         b.mss_pts = 0;
        }

      // 6. FVG / Order Block Tap (Max InpScoreWeightFVGOB)
      if(recent_fvg && recent_ob)
        {
         b.fvg_ob_pts = InpScoreWeightFVGOB;
        }
      else if(recent_fvg || recent_ob || StringFind(signal.reason, "FVG") >= 0 || StringFind(signal.reason, "OB") >= 0)
        {
         b.fvg_ob_pts = (int)MathRound(InpScoreWeightFVGOB * 0.7);
        }
      else
        {
         b.fvg_ob_pts = 0;
        }

      // 7. SMT Divergence (Max InpScoreWeightSMT)
      if(InpUseSMT)
        {
         b.smt_pts = smt_div ? InpScoreWeightSMT : 0;
        }
      else
        {
         b.smt_pts = InpScoreWeightSMT; // Filter disabled, grant full points
        }

      // 8. Volatility Alignment (Max InpScoreWeightVolatility)
      double vol_mult = 1.0;
      string vol_state = VolatilityAnalyzer::Analyze(tf, vol_mult);
      if(vol_state == "NORMAL" || vol_state == "HIGH")
        {
         b.volatility_pts = InpScoreWeightVolatility;
        }
      else if(vol_state == "LOW")
        {
         b.volatility_pts = (int)MathRound(InpScoreWeightVolatility * 0.4);
        }
      else // EXTREME
        {
         b.volatility_pts = (int)MathRound(InpScoreWeightVolatility * 0.2);
        }

      // 9. Session Window (Max InpScoreWeightSession)
      string current_session = GetCurrentSession();
      if(StringFind(current_session, "London") >= 0 || StringFind(current_session, "New York") >= 0 || StringFind(current_session, "NY") >= 0)
        {
         b.session_pts = InpScoreWeightSession;
        }
      else if(StringFind(current_session, "Asian") >= 0)
        {
         b.session_pts = (int)MathRound(InpScoreWeightSession * 0.4);
        }
      else
        {
         b.session_pts = 0;
        }

      // 10. Execution Quality / Spread (Max InpScoreWeightExecQuality)
      long cur_spread = SymbolInfoInteger(_Symbol, SYMBOL_SPREAD);
      if(cur_spread <= InpMaxSpreadPoints * 0.5)
        {
         b.exec_quality_pts = InpScoreWeightExecQuality;
        }
      else if(cur_spread <= InpMaxSpreadPoints)
        {
         b.exec_quality_pts = (int)MathRound(InpScoreWeightExecQuality * 0.6);
        }
      else
        {
         b.exec_quality_pts = 0;
        }

      // Total sum calculation
      b.total = b.regime_pts + b.htf_structure_pts + b.liquidity_pts + b.entry_location_pts +
                b.mss_pts + b.fvg_ob_pts + b.smt_pts + b.volatility_pts +
                b.session_pts + b.exec_quality_pts;

      if(b.total > 100) b.total = 100;
      if(b.total < 0)   b.total = 0;

      // Assign Tier mapping according to FR-013
      if(b.total >= 90)      b.tier = "MAXIMUM";
      else if(b.total >= 80) b.tier = "HIGH_QUALITY";
      else if(b.total >= 70) b.tier = "NORMAL";
      else if(b.total >= 60) b.tier = "LOW";
      else                   b.tier = "NO_TRADE";

      return b;
     }
  };
