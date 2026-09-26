//+------------------------------------------------------------------+
//|                                               PositionSizing.mqh |
//|                                  Copyright 2026, AdaptiveICT     |
//|                                             https://www.mql5.com |
//+------------------------------------------------------------------+
#property copyright "Copyright 2026, AdaptiveICT"
#property link      "https://www.mql5.com"
#property version   "1.00"
#property once

#include "../Core/StateManager.mqh"
#include "../Analytics/StatisticsEngine.mqh"

//+------------------------------------------------------------------+
//| T030 [US3] & T047 [US6]: Get risk percentage based on tier       |
//| Maps to: FR-013, FR-014, FR-015 (1.0% hard risk ceiling)         |
//+------------------------------------------------------------------+
double GetTierRisk(int score)
  {
   if(score < 60)   return 0.0;
   if(score <= 69)  return MathMin(InpRiskTierLow, 1.0);
   if(score <= 79)  return MathMin(InpRiskTierNormal, 1.0);

   // T047 [US6]: Cap at InpRiskTierNormal unless scoring model is statistically validated
   if(!StatisticsEngine::IsModelValidated())
     {
      return MathMin(InpRiskTierNormal, 1.0);
     }

   if(score <= 89)  return MathMin(InpRiskTierHigh, 1.0);
   return MathMin(InpRiskTierMax, 1.0); // 90-100 tier
  }

//+------------------------------------------------------------------+
//| T031 [US3]: Calculate Lot Size based on Account Balance, Risk %, |
//| and Stop Loss distance.                                          |
//| Formula: lots = (balance * risk_pct) / ((dist / tick_sz) * val)  |
//| Maps to: FR-019                                                  |
//+------------------------------------------------------------------+
double CalculateLotSize(double entry, double sl, int score = 0)
  {
   double balance = AccountInfoDouble(ACCOUNT_BALANCE);
   if(dyn_max_balance_compounding > 0.0 && balance > dyn_max_balance_compounding)
     {
      balance = dyn_max_balance_compounding;
     }
   
   // T030/T031: Read final risk from tier system
   double final_risk = (score > 0) ? GetTierRisk(score) : risk_percent;
   if(final_risk <= 0.0) return 0.0;
   if(final_risk > 1.0)  final_risk = 1.0; // Constitution 1% risk ceiling invariant
   
   double risk_amount = balance * (final_risk / 100.0);
   double tick_size = SymbolInfoDouble(_Symbol, SYMBOL_TRADE_TICK_SIZE);
   double tick_value = SymbolInfoDouble(_Symbol, SYMBOL_TRADE_TICK_VALUE);
   double sl_distance = MathAbs(entry - sl);
   
   if(sl_distance <= 0 || tick_size <= 0 || tick_value <= 0) return 0.0;
   
   double lot_step = SymbolInfoDouble(_Symbol, SYMBOL_VOLUME_STEP);
   double lot_min  = SymbolInfoDouble(_Symbol, SYMBOL_VOLUME_MIN);
   double lot_max  = SymbolInfoDouble(_Symbol, SYMBOL_VOLUME_MAX);
   
   double calculated_lots = (risk_amount) / ((sl_distance / tick_size) * tick_value);
   double lots = MathFloor(calculated_lots / lot_step) * lot_step;
   
   // Invariant: If calculated lots are smaller than lot_min, do NOT force lot_min if that would exceed risk ceiling
   if(lots < lot_min)
     {
      double min_lot_risk = ((sl_distance / tick_size) * tick_value) * lot_min;
      if(balance > 0.0 && (min_lot_risk / balance) > 0.015) // > 1.5% exceeds acceptable risk
        {
         Print("[PositionSizing] Lot size below minimum; trade blocked");
         return 0.0;
        }
      lots = lot_min;
     }
     
   if(lots > lot_max) lots = lot_max;
   
   // Verify Margin Requirements to prevent 'Not enough money' (Error 10019)
   double margin_required = 0.0;
   if(OrderCalcMargin(ORDER_TYPE_BUY, _Symbol, lots, entry, margin_required))
     {
      double free_margin = AccountInfoDouble(ACCOUNT_MARGIN_FREE);
      // If the required margin exceeds 95% of our free margin, scale the lot size down
      if(margin_required > free_margin * 0.95 && margin_required > 0.0)
        {
         lots = lots * ((free_margin * 0.95) / margin_required);
         lots = MathFloor(lots / lot_step) * lot_step;
         if(lots < lot_min) { Print("[PositionSizing] Lot size below minimum; trade blocked"); return 0.0; }
        }
     }
   
   return lots;
  }
