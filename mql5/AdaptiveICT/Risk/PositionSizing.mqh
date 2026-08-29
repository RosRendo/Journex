//+------------------------------------------------------------------+
//|                                               PositionSizing.mqh |
//|                                  Copyright 2026, AdaptiveICT     |
//|                                             https://www.mql5.com |
//+------------------------------------------------------------------+
#property copyright "Copyright 2026, AdaptiveICT"
#property link      "https://www.mql5.com"
#property version   "1.00"

#include "../Core/StateManager.mqh"

//+------------------------------------------------------------------+
//| Calculate Lot Size based on Account Balance, Risk %, and SL distance|
//+------------------------------------------------------------------+
double CalculateLotSize(double entry, double sl, int score = 0)
  {
   double balance = AccountInfoDouble(ACCOUNT_BALANCE);
   if(dyn_max_balance_compounding > 0.0 && balance > dyn_max_balance_compounding)
     {
      balance = dyn_max_balance_compounding;
     }
   
   // Confluence-Weighted Sizing: scale risk dynamically based on setup score
   double final_risk = risk_percent;
   if(score > 0)
     {
      if(score >= 85)       final_risk = risk_percent * 1.5; // Grade A: 1.5x risk
      else if(score <= 55)  final_risk = risk_percent * 0.5; // Grade C: 0.5x risk
     }
   
   double risk_amount = balance * (final_risk / 100.0);
   double tick_size = SymbolInfoDouble(_Symbol, SYMBOL_TRADE_TICK_SIZE);
   double tick_value = SymbolInfoDouble(_Symbol, SYMBOL_TRADE_TICK_VALUE);
   double sl_distance = MathAbs(entry - sl);
   
   if(sl_distance <= 0) return 0.0;
   
   double lot_step = SymbolInfoDouble(_Symbol, SYMBOL_VOLUME_STEP);
   double lot_min = SymbolInfoDouble(_Symbol, SYMBOL_VOLUME_MIN);
   double lot_max = SymbolInfoDouble(_Symbol, SYMBOL_VOLUME_MAX);
   
   double calculated_lots = (risk_amount) / ((sl_distance / tick_size) * tick_value);
   double lots = MathFloor(calculated_lots / lot_step) * lot_step;
   
   if(lots < lot_min) lots = lot_min;
   if(lots > lot_max) lots = lot_max;
   
   // Verify Margin Requirements to prevent 'Not enough money' (Error 10019)
   double margin_required = 0.0;
   if(OrderCalcMargin(ORDER_TYPE_BUY, _Symbol, lots, entry, margin_required))
     {
      double free_margin = AccountInfoDouble(ACCOUNT_MARGIN_FREE);
      // If the required margin exceeds 95% of our free margin, scale the lot size down
      if(margin_required > free_margin * 0.95)
        {
         lots = lots * ((free_margin * 0.95) / margin_required);
         lots = MathFloor(lots / lot_step) * lot_step;
         if(lots < lot_min) return 0.0; // Cannot even afford minimum lot
        }
     }
   
   return lots;
  }
