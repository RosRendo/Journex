//+------------------------------------------------------------------+
//|                                               DecisionEngine.mqh |
//|                                  Copyright 2026, AdaptiveICT     |
//|                                             https://www.mql5.com |
//+------------------------------------------------------------------+
#property copyright "Copyright 2026, AdaptiveICT"
#property link      "https://www.mql5.com"
#property version   "1.00"
#property once

#include "MomentumAnalyzer.mqh"
#include "MarketRegimeDetector.mqh"
#include "VolatilityAnalyzer.mqh"
#include "StructureAnalyzer.mqh"
#include "LiquidityAnalyzer.mqh"
#include "ExecutionQualityAnalyzer.mqh"
#include "RiskEvaluator.mqh"
#include "ConfluenceScorer.mqh"

// Types.mqh now declares DecisionResult struct to prevent circular dependencies

class DecisionEngine
  {
public:
   // Runs multi-factor evaluation matrix and returns DecisionResult struct DTO
   static DecisionResult Evaluate(ENUM_TIMEFRAMES tf, string type, int strategy_type, int p_min_score, int custom_score = 0)
     {
      DecisionResult res;
      res.reason_count = 0;
      res.warning_count = 0;
      res.is_approved = false;

      // 1. Momentum & Volatility
      int mom_score = MomentumAnalyzer::CalculateScore(tf, 5);
      res.volatility = VolatilityAnalyzer::Analyze(tf, res.vol_multiplier);
      int vol_score = (res.volatility == "HIGH") ? 100 : (res.volatility == "NORMAL") ? 80 : (res.volatility == "EXTREME") ? 40 : 10;

      // 2. Market Regime
      res.regime = MarketRegimeDetector::Detect(tf, res.regime_confidence);
      int regime_score = res.regime_confidence;

      // 3. Trend Alignment (Optimized with direct CopyClose to avoid iMA memory leaks/sync lags)
      int trend_score = 0;
      int bias = 0;
      double h4_close[];
      ArraySetAsSeries(h4_close, true);
      int period = 200;
      int copied = CopyClose(_Symbol, PERIOD_H4, 0, period, h4_close);
      if(copied >= period)
        {
         double sum = 0.0;
         for(int i = 0; i < period; i++)
            sum += h4_close[i];
         double sma200 = sum / period;
         double cur_price = SymbolInfoDouble(_Symbol, SYMBOL_BID);
         bias = (cur_price > sma200) ? 1 : -1;
         trend_score = ((type == "BUY" && bias == 1) || (type == "SELL" && bias == -1)) ? 100 : 0;
        }

      // 4. SMC Structure
      bool mss_valid = false, recent_fvg = false, recent_ob = false;
      string mss_state = "";
      StructureAnalyzer::Analyze(tf, type, mss_valid, recent_fvg, recent_ob, mss_state);
      int struct_score = mss_valid ? 100 : 0;
      int fvg_score = recent_fvg ? 100 : 0;
      int ob_score = recent_ob ? 100 : 0;

      // 5. Liquidity & SMT
      bool has_sweep = false, smt_div = false;
      LiquidityAnalyzer::Analyze(tf, type, has_sweep, smt_div, SanitizeStringInput(InpSMTSymbol));
      int liq_score = has_sweep ? 100 : 0;

      // 6. Execution Quality
      res.execution_score = ExecutionQualityAnalyzer::Evaluate(SanitizeStringInput(InpSession), InpMaxSpreadPoints, res.spread_points, res.session_pass);

      // 7. Risk Limits check
      res.risk_pass = RiskEvaluator::Evaluate(InpMaxDailyLossPct, InpMaxDrawdownPct, InpMaxOpenTrades);

      // 8. Calculate Universal Decision Score
      if(strategy_type == 4) // STRATEGY_MOMENTUM_SCALPER
        {
         res.score = ConfluenceScorer::Calculate(strategy_type, mom_score, vol_score, res.execution_score, regime_score, trend_score,
                                                 struct_score, liq_score, fvg_score, ob_score, trend_score);
        }
      else
        {
         // Use the strategy's own specific confluence scoring system
         res.score = custom_score;
        }
      res.grade = ConfluenceScorer::GetGrade(res.score);

      // 9. Evaluate final permission approval
      if(strategy_type == 4) // STRATEGY_MOMENTUM_SCALPER
        {
         res.is_approved = res.risk_pass && (res.spread_points <= InpMaxSpreadPoints) && res.session_pass;
        }
      else
        {
         res.is_approved = (res.score >= p_min_score) && res.risk_pass && (res.spread_points <= InpMaxSpreadPoints) && res.session_pass;
        }

      // 10. Generate Explanations (Reasons & Warnings)
      // Reasons
      if(strategy_type == 4) // STRATEGY_MOMENTUM_SCALPER
        {
         if(mom_score >= 70) AddReason(res, "Momentum accelerating");
         if(res.session_pass) AddReason(res, "London/NY session active");
         if(res.spread_points <= InpMaxSpreadPoints) AddReason(res, "Spread acceptable");
         if(res.volatility == "HIGH") AddReason(res, "Volatility expanding");
         if(res.regime == "TRENDING") AddReason(res, "Market regime trending");
        }
      else if(strategy_type == 2) // MEAN_REVERSION
        {
         AddReason(res, "BB Boundary touch detected");
         AddReason(res, "RSI exhaustion confirmed");
         if(trend_score == 100) AddReason(res, "Trend direction aligned");
        }
      else if(strategy_type == 3) // BREAKOUT
        {
         AddReason(res, "Session range breakout detected");
         if(trend_score == 100) AddReason(res, "HTF Trend aligned");
        }
      else // SMC Mode (0 & 1)
        {
         if(mss_valid) AddReason(res, "Market structure shift (MSS) confirmed");
         if(has_sweep) AddReason(res, "Liquidity sweep executed");
         if(recent_fvg) AddReason(res, "Fair Value Gap tapped");
         if(recent_ob) AddReason(res, "Order block tap detected");
         if(trend_score == 100) AddReason(res, "HTF Trend aligned");
         if(smt_div) AddReason(res, "SMT Divergence confirmed");
        }

      // Warnings
      if(!res.risk_pass) AddWarning(res, "Risk allocation limits violated");
      if(res.spread_points > InpMaxSpreadPoints) AddWarning(res, "High spread threshold exceeded");
      if(res.volatility == "EXTREME") AddWarning(res, "Extreme volatility - caution applied");
      if(res.volatility == "LOW") AddWarning(res, "Low volatility regime - scalp range thin");

      return res;
     }

private:
   static void AddReason(DecisionResult &res, string reason)
     {
      if(res.reason_count < 10)
        {
         res.reasons[res.reason_count] = reason;
         res.reason_count++;
        }
     }

   static void AddWarning(DecisionResult &res, string warning)
     {
      if(res.warning_count < 5)
        {
         res.warnings[res.warning_count] = warning;
         res.warning_count++;
        }
     }
  };
