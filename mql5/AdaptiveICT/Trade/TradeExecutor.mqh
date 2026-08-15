//+------------------------------------------------------------------+
//|                                                TradeExecutor.mqh |
//|                                  Copyright 2026, AdaptiveICT     |
//|                                             https://www.mql5.com |
//+------------------------------------------------------------------+
#property copyright "Copyright 2026, AdaptiveICT"
#property link      "https://www.mql5.com"
#property version   "1.00"
#property once

#include <Trade\Trade.mqh>
#include "../Core/Types.mqh"
#include "../Core/StateManager.mqh"
#include "../Risk/PositionSizing.mqh"
#include "../Communication/TradeReporter.mqh"

CTrade trade;

//+------------------------------------------------------------------+
//| Execute Buy/Sell Trade according to formulated TradePlan         |
//+------------------------------------------------------------------+
bool ExecuteTradePlan(const TradePlan &plan)
  {
   double lots = CalculateLotSize(plan.entry_price, plan.sl);
   if(lots <= 0.0)
     {
      Print("Invalid dynamic lot size calculations. Rejecting execution.");
      return false;
     }
     
   bool success = false;
   if(plan.type == "BUY")
     {
      success = trade.Buy(lots, plan.symbol, 0, plan.sl, 0, "Dashboard Signal " + plan.signal_id);
     }
   else if(plan.type == "SELL")
     {
      success = trade.Sell(lots, plan.symbol, 0, plan.sl, 0, "Dashboard Signal " + plan.signal_id);
     }
     
   if(success)
     {
      ulong ticket = trade.ResultOrder();
      if(active_position_manager != NULL)
        {
         active_position_manager.RegisterPosition(ticket, plan.sl, plan.tp1, plan.tp2, plan.tp3);
        }
      SendTradeEvent("open", ticket, plan.type, lots, plan.entry_price, plan.sl, plan.tp1, plan.confidence, plan.signal_id);
     }
   else
     {
      Print("Trade execution failed: ", trade.ResultRetcodeDescription());
     }
     
   return success;
  }

//+------------------------------------------------------------------+
//| Emergency Close all positions for this EA                        |
//+------------------------------------------------------------------+
void ExecuteEmergencyClose()
  {
   Print("Executing emergency close for Magic: ", InpMagic);
   for(int i = PositionsTotal() - 1; i >= 0; i--)
     {
      if(PositionGetSymbol(i) == _Symbol && PositionGetInteger(POSITION_MAGIC) == InpMagic)
        {
         ulong ticket = PositionGetInteger(POSITION_TICKET);
         double price = PositionGetDouble(POSITION_PRICE_CURRENT);
         string type = (PositionGetInteger(POSITION_TYPE) == POSITION_TYPE_BUY) ? "BUY" : "SELL";
         double volume = PositionGetDouble(POSITION_VOLUME);
         
         if(trade.PositionClose(ticket))
           {
            Print("Closed position ticket: ", ticket);
            SendTradeEvent("close", ticket, type, volume, price, 0, 0, 100, "EMERGENCY_CLOSE");
           }
        }
     }
  }
