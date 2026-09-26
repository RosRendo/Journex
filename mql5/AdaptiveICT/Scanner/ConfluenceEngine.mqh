//+------------------------------------------------------------------+
//|                                             ConfluenceEngine.mqh |
//|                                  Copyright 2026, AdaptiveICT     |
//|                                             https://www.mql5.com |
//+------------------------------------------------------------------+
#property copyright "Copyright 2026, AdaptiveICT"
#property link      "https://www.mql5.com"
#property version   "1.00"
#property once

#include "../Core/Types.mqh"
#include "../Core/Config.mqh"
#include "../Core/StateManager.mqh"
#include "../Core/EntryQualityEngine.mqh"
#include "../Core/DecisionEngine/MarketRegimeDetector.mqh"

//+------------------------------------------------------------------+
//| Compute Confluence Score (0-100) and assign setup Grade          |
//| T022: Delegated to EntryQualityEngine with explainable breakdown |
//+------------------------------------------------------------------+
ConfluenceResult CalculateConfluence(const SignalCandidate &candidate)
  {
   ConfluenceResult result;
   result.score = 0;
   result.grade = "Reject";
   result.is_valid = false;

   if(candidate.type == "NO_TRADE") return result;

   ENUM_TIMEFRAMES tf = (candidate.signal_tf != 0) ? candidate.signal_tf : Period();

   MarketRegimeState reg_state;
   if(candidate.regime != "")
     {
      reg_state.regime = candidate.regime;
      reg_state.confidence = 80;
      reg_state.evaluated_at = TimeCurrent();
     }
   else
     {
      reg_state = MarketRegimeDetector::DetectState(tf);
     }

   EntryScoreBreakdown breakdown = EntryQualityEngine::Evaluate(tf, candidate, reg_state);

   result.score = breakdown.total;
   
   if(result.score >= 90) result.grade = "A+";
   else if(result.score >= 80) result.grade = "A";
   else if(result.score >= 70) result.grade = "B";
   else result.grade = "C";

   if(result.score >= min_score)
      result.is_valid = true;

   return result;
  }
