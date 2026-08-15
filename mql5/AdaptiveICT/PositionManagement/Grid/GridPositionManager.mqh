//+------------------------------------------------------------------+
//|                                         GridPositionManager.mqh  |
//|                                  Copyright 2026, AdaptiveICT     |
//|                                             https://www.mql5.com |
//+------------------------------------------------------------------+
#property copyright "Copyright 2026, AdaptiveICT"
#property link      "https://www.mql5.com"
#property version   "1.00"
#property once

#include "../BasePositionManager.mqh"
#include "../../Trade/TradeExecutor.mqh"
#include "../../Indicators/ATR.mqh"
#include "../../Analytics/TradeJournal.mqh"

//+------------------------------------------------------------------+
//| Grid Position Manager (Stage 6 — Advanced Basket Recovery)       |
//|                                                                   |
//| Logic summary:                                                    |
//|   1. When a trade is registered, record its initial direction.   |
//|   2. If price moves InpGridStep points against the initial trade, |
//|      add a recovery order in the SAME direction.                  |
//|   3. Hard limits — absolutely never exceed:                      |
//|      - InpMaxGridOrders (total open orders in basket)            |
//|      - InpMaxBasketLossPct% drawdown on the whole basket         |
//|   4. When basket equity loss >= InpMaxBasketLossPct, execute      |
//|      an emergency close of ALL basket positions.                  |
//|   5. ATR trailing stop still applied to ALL positions.            |
//+------------------------------------------------------------------+
class GridPositionManager : public BasePositionManager
  {
private:
   // Basket tracking state
   string basket_direction;     // "BUY" or "SELL" — direction of first position
   double basket_entry_balance; // Account balance at the time basket was opened
   int    basket_order_count;   // Current grid order count
   bool   basket_active;        // Is there an active basket?

   //+------------------------------------------------------------------+
   //| Count active positions belonging to this EA                     |
   //+------------------------------------------------------------------+
   int CountBasketPositions()
     {
      int count = 0;
      for(int i = PositionsTotal() - 1; i >= 0; i--)
        {
         if(PositionGetSymbol(i) == _Symbol && PositionGetInteger(POSITION_MAGIC) == InpMagic)
            count++;
        }
      return count;
     }

   //+------------------------------------------------------------------+
   //| Calculate basket net profit/loss as % of capture balance        |
   //+------------------------------------------------------------------+
   double GetBasketLossPct()
     {
      if(basket_entry_balance <= 0) return 0.0;
      double total_pnl = 0.0;
      for(int i = PositionsTotal() - 1; i >= 0; i--)
        {
         if(PositionGetSymbol(i) == _Symbol && PositionGetInteger(POSITION_MAGIC) == InpMagic)
            total_pnl += PositionGetDouble(POSITION_PROFIT) + PositionGetDouble(POSITION_SWAP);
        }
      double loss_pct = -(total_pnl / basket_entry_balance) * 100.0;
      return loss_pct; // positive means we are in loss
     }

   //+------------------------------------------------------------------+
   //| Emergency close all basket positions                             |
   //+------------------------------------------------------------------+
   void ExecuteEmergencyBasketClose()
     {
      Print("GRID EMERGENCY CLOSE: Basket loss >= ", InpMaxBasketLossPct, "%. Closing ALL positions.");
      for(int i = PositionsTotal() - 1; i >= 0; i--)
        {
         if(PositionGetSymbol(i) == _Symbol && PositionGetInteger(POSITION_MAGIC) == InpMagic)
           {
            ulong ticket = PositionGetInteger(POSITION_TICKET);
            if(trade.PositionClose(ticket))
              {
               Print("Grid emergency closed ticket: ", ticket);
               TradeJournal::LogEvent("grid_emergency_close", ticket, _Symbol, "CLOSE",
                                     PositionGetDouble(POSITION_VOLUME),
                                     PositionGetDouble(POSITION_PRICE_CURRENT), 0, 0, "EMERGENCY");
              }
           }
        }
      // Reset basket state
      basket_active       = false;
      basket_order_count  = 0;
      basket_direction    = "";
      basket_entry_balance = 0;
     }

   //+------------------------------------------------------------------+
   //| Place a recovery order at the next grid level                    |
   //+------------------------------------------------------------------+
   void PlaceGridRecoveryOrder(const string direction, double sl_distance)
     {
      if(basket_order_count >= InpMaxGridOrders)
        {
         Print("Grid hard cap reached (", InpMaxGridOrders, " orders). No more recovery orders.");
         return;
        }

      // Compute grid entry
      double ask = SymbolInfoDouble(_Symbol, SYMBOL_ASK);
      double bid = SymbolInfoDouble(_Symbol, SYMBOL_BID);
      double atr = GetATR(PERIOD_CURRENT, 14);

      // Lot sizing escalation: double lot size with each grid level
      // (conservative: use fixed lots = InpRiskPercent-based)
      double balance  = AccountInfoDouble(ACCOUNT_BALANCE);
      double risk_amt = balance * (InpRiskPercent / 100.0);
      double tick_v   = SymbolInfoDouble(_Symbol, SYMBOL_TRADE_TICK_VALUE);
      double tick_s   = SymbolInfoDouble(_Symbol, SYMBOL_TRADE_TICK_SIZE);
      double sl_dist  = sl_distance > 0 ? sl_distance : atr * 2.0;
      double lots     = NormalizeDouble((risk_amt / ((sl_dist / tick_s) * tick_v)), 2);
      lots = MathMax(lots, SymbolInfoDouble(_Symbol, SYMBOL_VOLUME_MIN));
      lots = MathMin(lots, SymbolInfoDouble(_Symbol, SYMBOL_VOLUME_MAX));

      string comment = "GridRecovery_#" + IntegerToString(basket_order_count + 1);
      bool success = false;
      double sl = 0, entry = 0;

      if(direction == "BUY")
        {
         sl      = ask - sl_dist;
         entry   = ask;
         success = trade.Buy(lots, _Symbol, ask, sl, 0, comment);
        }
      else if(direction == "SELL")
        {
         sl      = bid + sl_dist;
         entry   = bid;
         success = trade.Sell(lots, _Symbol, bid, sl, 0, comment);
        }

      if(success)
        {
         basket_order_count++;
         ulong ticket = trade.ResultOrder();
         Print("Grid recovery order placed: ticket=", ticket, " dir=", direction, " lot=", lots, " (#", basket_order_count, ")");
         TradeJournal::LogEvent("grid_recovery", ticket, _Symbol, direction, lots, entry, sl, 0, comment);
        }
      else
        {
         Print("Grid recovery order FAILED: ", trade.ResultRetcodeDescription());
        }
     }

public:
   GridPositionManager()
     {
      basket_active       = false;
      basket_order_count  = 0;
      basket_direction    = "";
      basket_entry_balance = 0;
     }

   //+------------------------------------------------------------------+
   //| Register the initial trade that opens the basket                |
   //+------------------------------------------------------------------+
   virtual void RegisterPosition(ulong ticket, double original_sl, double tp1, double tp2, double tp3)
     {
      if(!basket_active)
        {
         // Read the trade direction from the ticket
         if(PositionSelectByTicket(ticket))
           {
            basket_direction    = (PositionGetInteger(POSITION_TYPE) == POSITION_TYPE_BUY) ? "BUY" : "SELL";
            basket_entry_balance = AccountInfoDouble(ACCOUNT_BALANCE);
            basket_active       = true;
            basket_order_count  = 1;
            Print("Grid basket opened: direction=", basket_direction, " balance=", basket_entry_balance);
           }
        }
      else
        {
         // Basket already active — just increment count
         basket_order_count++;
        }
     }

   //+------------------------------------------------------------------+
   //| Core grid management: check limits, expand basket, trail stops  |
   //+------------------------------------------------------------------+
   virtual void ManagePositions()
     {
      int active = CountBasketPositions();

      // If no positions, reset basket state
      if(active == 0)
        {
         basket_active      = false;
         basket_order_count = 0;
         basket_direction   = "";
         basket_entry_balance = 0;
         return;
        }

      // ── Step 1: EMERGENCY CLOSE CHECK (always first) ─────────────────
      if(basket_active && InpGridEmergencyClose)
        {
         double loss_pct = GetBasketLossPct();
         if(loss_pct >= InpMaxBasketLossPct)
           {
            ExecuteEmergencyBasketClose();
            return;
           }
        }

      // ── Step 2: ATR TRAILING STOP on all basket positions ─────────────
      double atr = GetATR(PERIOD_CURRENT, 14);
      if(atr <= 0) return;
      double trail_distance = atr * InpTrailATRMult;

      for(int i = PositionsTotal() - 1; i >= 0; i--)
        {
         if(PositionGetSymbol(i) == _Symbol && PositionGetInteger(POSITION_MAGIC) == InpMagic)
           {
            ulong  ticket      = PositionGetInteger(POSITION_TICKET);
            bool   is_buy      = (PositionGetInteger(POSITION_TYPE) == POSITION_TYPE_BUY);
            double current_sl  = PositionGetDouble(POSITION_SL);
            double open_price  = PositionGetDouble(POSITION_PRICE_OPEN);
            double cur_price   = is_buy ? SymbolInfoDouble(_Symbol, SYMBOL_BID) : SymbolInfoDouble(_Symbol, SYMBOL_ASK);

            if(is_buy)
              {
               double new_sl = NormalizeDouble(cur_price - trail_distance, _Digits);
               if(new_sl > current_sl && new_sl > open_price)
                  trade.PositionModify(ticket, new_sl, 0);
              }
            else
              {
               double new_sl = NormalizeDouble(cur_price + trail_distance, _Digits);
               if((new_sl < current_sl || current_sl == 0) && new_sl < open_price)
                  trade.PositionModify(ticket, new_sl, 0);
              }
           }
        }

      // ── Step 3: GRID EXPANSION CHECK ──────────────────────────────────
      // Add a recovery order if price has moved InpGridStep points against
      // the basket direction AND we haven't hit the hard order cap yet.
      if(!basket_active || basket_order_count >= InpMaxGridOrders) return;

      double grid_step_price = InpGridStep * SymbolInfoDouble(_Symbol, SYMBOL_POINT);

      // Find the WORST open position (deepest in loss)
      double worst_price = 0, avg_open = 0;
      int pos_count = 0;
      for(int i = PositionsTotal() - 1; i >= 0; i--)
        {
         if(PositionGetSymbol(i) == _Symbol && PositionGetInteger(POSITION_MAGIC) == InpMagic)
           {
            avg_open += PositionGetDouble(POSITION_PRICE_OPEN);
            pos_count++;
           }
        }
      if(pos_count == 0) return;
      avg_open /= pos_count;

      double current_mid = (SymbolInfoDouble(_Symbol, SYMBOL_ASK) + SymbolInfoDouble(_Symbol, SYMBOL_BID)) / 2.0;
      double sl_dist     = atr * 2.0;

      if(basket_direction == "BUY")
        {
         // Price has dropped InpGridStep below the average open
         if(avg_open - current_mid >= grid_step_price)
           {
            Print("Grid BUY recovery trigger: avg_open=", avg_open, " current=", current_mid, " step=", grid_step_price);
            PlaceGridRecoveryOrder("BUY", sl_dist);
           }
        }
      else if(basket_direction == "SELL")
        {
         // Price has risen InpGridStep above the average open
         if(current_mid - avg_open >= grid_step_price)
           {
            Print("Grid SELL recovery trigger: avg_open=", avg_open, " current=", current_mid, " step=", grid_step_price);
            PlaceGridRecoveryOrder("SELL", sl_dist);
           }
        }
     }
  };
