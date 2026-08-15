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
double CalculateLotSize(double entry, double sl)
  {
   double balance = AccountInfoDouble(ACCOUNT_BALANCE);
   double risk_amount = balance * (risk_percent / 100.0);
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
   
   return lots;
  }
