//+------------------------------------------------------------------+
//|                                                OrderManager.mqh  |
//|                                  Copyright 2026, AdaptiveICT     |
//|                                             https://www.mql5.com |
//+------------------------------------------------------------------+
#property copyright "Copyright 2026, AdaptiveICT"
#property link      "https://www.mql5.com"
#property version   "1.00"
#property once

#include "../Core/Types.mqh"
#include "../Core/Config.mqh"
#include "SpreadFilter.mqh"
#include "SlippageGuard.mqh"
#include <Trade\Trade.mqh>

static CTrade _order_trade;

//+------------------------------------------------------------------+
//| Order Manager execution class to isolate global functions        |
//+------------------------------------------------------------------+
class OrderManager
  {
public:
   //+------------------------------------------------------------------+
   //| Initialize order trade settings                                  |
   //+------------------------------------------------------------------+
   static void Init()
     {
      _order_trade.SetExpertMagicNumber(InpMagic);
     }

   //+------------------------------------------------------------------+
   //| Validate execution parameters before trade entry                 |
   //+------------------------------------------------------------------+
   static bool IsExecutionAllowed(const TradePlan &plan)
     {
      // Spread check
      if(!SpreadFilter::IsSpreadAcceptable())
        {
         Print("Execution blocked: spread too high.");
         return false;
        }

      // Validate broker minimum stops level requirement
      double min_stop = SymbolInfoInteger(_Symbol, SYMBOL_TRADE_STOPS_LEVEL) * SymbolInfoDouble(_Symbol, SYMBOL_POINT);
      double sl_dist  = MathAbs(plan.entry_price - plan.sl);
      if(sl_dist < min_stop)
        {
         Print("SL distance (", DoubleToString(sl_dist, 5), ") < broker min stops (", DoubleToString(min_stop, 5), "). Blocked.");
         return false;
        }

      // Validate minimum SL distance in pips
      double pip_size    = (_Digits == 3 || _Digits == 5) ? 10.0 * SymbolInfoDouble(_Symbol, SYMBOL_POINT) : SymbolInfoDouble(_Symbol, SYMBOL_POINT);
      double min_sl_dist = InpMinSLPips * pip_size;
      if(sl_dist < min_sl_dist)
        {
         Print("SL (", DoubleToString(sl_dist / pip_size, 1), " pips) < InpMinSLPips (", InpMinSLPips, "). Blocked.");
         return false;
        }

      return true;
     }

   //+------------------------------------------------------------------+
   //| Execute a formulated TradePlan on the broker                    |
   //+------------------------------------------------------------------+
   static ulong ExecuteTradePlan(const TradePlan &plan)
     {
      if(!IsExecutionAllowed(plan)) return 0;

      double ask = SymbolInfoDouble(_Symbol, SYMBOL_ASK);
      double bid = SymbolInfoDouble(_Symbol, SYMBOL_BID);

      bool success = false;
      if(plan.type == "BUY")
         success = _order_trade.Buy(plan.lots, _Symbol, ask, plan.sl, plan.tp1, plan.signal_id);
      else if(plan.type == "SELL")
         success = _order_trade.Sell(plan.lots, _Symbol, bid, plan.sl, plan.tp1, plan.signal_id);

      if(!success)
        {
         Print("Order execution failed: ", _order_trade.ResultRetcode(), " - ", _order_trade.ResultRetcodeDescription());
         return 0;
        }

      // Post-fill slippage check
      double fill_price = _order_trade.ResultPrice();
      if(!SlippageGuard::IsExecutionPriceAcceptable(plan.entry_price, fill_price))
         Print("WARNING: Fill price (", fill_price, ") deviates from expected (", plan.entry_price, ") beyond slippage guard.");

      ulong ticket = _order_trade.ResultOrder();
      Print("Order executed: ticket=", ticket, " type=", plan.type, " lots=", plan.lots, " fill=", fill_price);
      return ticket;
     }
  };
