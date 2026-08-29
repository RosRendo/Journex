//+------------------------------------------------------------------+
//|                                             ConfluenceScorer.mqh |
//|                                  Copyright 2026, AdaptiveICT     |
//|                                             https://www.mql5.com |
//+------------------------------------------------------------------+
#property copyright "Copyright 2026, AdaptiveICT"
#property link      "https://www.mql5.com"
#property version   "1.00"
#property once

class ConfluenceScorer
  {
public:
   // Universal scoring mapper based on inputs and weighted parameters
   static int Calculate(int strategy_type, int mom_score, int vol_score, int exec_score, int regime_score, int trend_score,
                        int struct_score, int liq_score, int fvg_score, int ob_score, int htf_score)
     {
      double score = 0.0;
      
      // Momentum Scalper Mode
      if(strategy_type == 4) // STRATEGY_MOMENTUM_SCALPER
        {
         score += mom_score * 0.35;
         score += vol_score * 0.20;
         score += exec_score * 0.20;
         score += regime_score * 0.15;
         score += trend_score * 0.10;
        }
      else // SMC/ICT Mode
        {
         score += struct_score * 0.30;
         score += liq_score * 0.20;
         score += fvg_score * 0.15;
         score += ob_score * 0.15;
         score += htf_score * 0.10;
         score += exec_score * 0.10;
        }
        
      int final_score = (int)MathRound(score);
      if(final_score < 0) final_score = 0;
      if(final_score > 100) final_score = 100;
      
      return final_score;
     }

   // Map score to Grades
   static string GetGrade(int score)
     {
      if(score >= 90) return "A+";
      if(score >= 80) return "A";
      if(score >= 70) return "B";
      if(score >= 60) return "C";
      return "F";
     }
  };
