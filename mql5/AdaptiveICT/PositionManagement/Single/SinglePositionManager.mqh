//+------------------------------------------------------------------+
//|                                         SinglePositionManager.mqh |
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

//+------------------------------------------------------------------+
//| Single Position Manager Class implementing BasePositionManager  |
//+------------------------------------------------------------------+
class SinglePositionManager : public BasePositionManager
  {
private:
   MqlPositionState  position_states[100];
   int               pos_states_count;

   //+------------------------------------------------------------------+
   //| Update state tracking flags and levels                           |
   //+------------------------------------------------------------------+
   void UpdatePositionState(ulong ticket, bool tp1, bool tp2, double original_sl, double tp1_val, double tp2_val, double tp3_val)
     {
      for(int i = 0; i < pos_states_count; i++)
        {
         if(position_states[i].ticket == ticket)
           {
            position_states[i].tp1_hit = tp1;
            position_states[i].tp2_hit = tp2;
            position_states[i].original_sl = original_sl;
            position_states[i].tp1 = tp1_val;
            position_states[i].tp2 = tp2_val;
            position_states[i].tp3 = tp3_val;
            return;
           }
        }
      if(pos_states_count < 100)
        {
         position_states[pos_states_count].ticket = ticket;
         position_states[pos_states_count].tp1_hit = tp1;
         position_states[pos_states_count].tp2_hit = tp2;
         position_states[pos_states_count].original_sl = original_sl;
         position_states[pos_states_count].tp1 = tp1_val;
         position_states[pos_states_count].tp2 = tp2_val;
         position_states[pos_states_count].tp3 = tp3_val;
         pos_states_count++;
        }
     }

   //+------------------------------------------------------------------+
   //| Retrieve state tracking flags and levels                         |
   //+------------------------------------------------------------------+
   bool GetPositionState(ulong ticket, bool &tp1, bool &tp2, double &original_sl, double &tp1_val, double &tp2_val, double &tp3_val)
     {
      for(int i = 0; i < pos_states_count; i++)
        {
         if(position_states[i].ticket == ticket)
           {
            tp1 = position_states[i].tp1_hit;
            tp2 = position_states[i].tp2_hit;
            original_sl = position_states[i].original_sl;
            tp1_val = position_states[i].tp1;
            tp2_val = position_states[i].tp2;
            tp3_val = position_states[i].tp3;
            return true;
           }
        }
      return false;
     }

   //+------------------------------------------------------------------+
   //| Clean up states array for positions that are no longer active    |
   //+------------------------------------------------------------------+
   void CleanupPositionStates()
     {
      int active_count = 0;
      MqlPositionState active_states[100];
      
      for(int i = 0; i < pos_states_count; i++)
        {
         ulong ticket = position_states[i].ticket;
         bool exists = false;
         
         for(int j = PositionsTotal() - 1; j >= 0; j--)
           {
            if(PositionGetSymbol(j) == _Symbol && PositionGetInteger(POSITION_TICKET) == ticket)
              {
               exists = true;
               break;
              }
           }
           
         if(exists && active_count < 100)
           {
            active_states[active_count] = position_states[i];
            active_count++;
           }
        }
        
      pos_states_count = active_count;
      for(int i = 0; i < pos_states_count; i++)
        {
         position_states[i] = active_states[i];
        }
     }

public:
   SinglePositionManager()
     {
      pos_states_count = 0;
      ZeroMemory(position_states);
     }

   //+------------------------------------------------------------------+
   //| Register a new position's planning targets                       |
   //+------------------------------------------------------------------+
   virtual void RegisterPosition(ulong ticket, double original_sl, double tp1, double tp2, double tp3)
     {
      UpdatePositionState(ticket, false, false, original_sl, tp1, tp2, tp3);
     }

   //+------------------------------------------------------------------+
   //| Manage trailing stop, dynamic TP1 partial closes, and breakeven  |
   //+------------------------------------------------------------------+
   virtual void ManagePositions()
     {
      double current_atr = GetATR(PERIOD_CURRENT, 14);
      if(current_atr <= 0) return;
      
      double trail_distance = current_atr * InpTrailATRMult;
      double lot_min = SymbolInfoDouble(_Symbol, SYMBOL_VOLUME_MIN);
      
      CleanupPositionStates();
      
      for(int i = PositionsTotal() - 1; i >= 0; i--)
        {
         if(PositionGetSymbol(i) == _Symbol && PositionGetInteger(POSITION_MAGIC) == InpMagic)
           {
            ulong ticket = PositionGetInteger(POSITION_TICKET);
            double open_price = PositionGetDouble(POSITION_PRICE_OPEN);
            double current_sl = PositionGetDouble(POSITION_SL);
            double volume = PositionGetDouble(POSITION_VOLUME);
            double current_price = (PositionGetInteger(POSITION_TYPE) == POSITION_TYPE_BUY) ? SymbolInfoDouble(_Symbol, SYMBOL_BID) : SymbolInfoDouble(_Symbol, SYMBOL_ASK);
            
            bool   is_buy = (PositionGetInteger(POSITION_TYPE) == POSITION_TYPE_BUY);
            string dir = is_buy ? "BUY" : "SELL";
            
            // Retrieve registered TradePlan levels
            bool   tp1_hit = false, tp2_hit = false;
            double reg_sl = 0, tp1_val = 0, tp2_val = 0, tp3_val = 0;
            bool   has_state = GetPositionState(ticket, tp1_hit, tp2_hit, reg_sl, tp1_val, tp2_val, tp3_val);
            
            // Fallback if no state registered (e.g. EA restarted)
            if(!has_state || tp1_val == 0)
              {
               double stop_dist = MathAbs(open_price - current_sl);
               if(stop_dist <= 0) stop_dist = current_atr * 2.0;
               tp1_val = is_buy ? open_price + stop_dist * 1.5 : open_price - stop_dist * 1.5;
               tp2_val = is_buy ? open_price + stop_dist * 3.0 : open_price - stop_dist * 3.0;
               tp3_val = is_buy ? open_price + stop_dist * 5.0 : open_price - stop_dist * 5.0;
               reg_sl  = current_sl;
              }
            
            // ── Stage 1: TP1 Partial Close (33%) + Move SL to BE+5pips ─────
            if(!tp1_hit)
              {
               bool trigger_tp1 = (is_buy && current_price >= tp1_val) || (!is_buy && current_price <= tp1_val);
               if(trigger_tp1)
                 {
                   double close_vol = MathFloor(volume * 0.33 / lot_min) * lot_min;
                   close_vol = NormalizeDouble(close_vol, 2);
                   if(close_vol >= lot_min && trade.PositionClosePartial(ticket, close_vol))
                    {
                     Print("TP1 Partial Close (33%): ticket ", ticket, " | closed ", close_vol, " lots at ", current_price);
                     SendTradeEvent("modify", ticket, dir, volume - close_vol, current_price, current_sl, tp1_val, 100, "TP1");
                    }
                  tp1_hit = true;
                  UpdatePositionState(ticket, tp1_hit, tp2_hit, reg_sl, tp1_val, tp2_val, tp3_val);
                  
                  if(InpUseBE)
                    {
                     double pip = (_Digits == 3 || _Digits == 5) ? 10.0 * SymbolInfoDouble(_Symbol, SYMBOL_POINT) : SymbolInfoDouble(_Symbol, SYMBOL_POINT);
                     double be_price = is_buy ? open_price + (5.0 * pip) : open_price - (5.0 * pip);
                     be_price = NormalizeDouble(be_price, _Digits);
                     trade.PositionModify(ticket, be_price, 0);
                     Print("SL moved to BE+5pips after TP1: ticket ", ticket, " | BE=", be_price);
                     SendTradeEvent("modify", ticket, dir, volume - close_vol, open_price, be_price, tp2_val, 100, "BE");
                    }
                 }
              }
              
            // ── Stage 2: TP2 Partial Close (50% of remainder) ───────────────
            if(tp1_hit && !tp2_hit && tp2_val > 0)
              {
               bool trigger_tp2 = (is_buy && current_price >= tp2_val) || (!is_buy && current_price <= tp2_val);
               if(trigger_tp2)
                 {
                   double remaining_vol = PositionGetDouble(POSITION_VOLUME); // Re-fetch remaining after TP1
                   double close_vol = MathFloor(remaining_vol * 0.5 / lot_min) * lot_min;
                   close_vol = NormalizeDouble(close_vol, 2);
                   if(close_vol >= lot_min && trade.PositionClosePartial(ticket, close_vol))
                    {
                     Print("TP2 Partial Close (50%): ticket ", ticket, " | closed ", close_vol, " lots at ", current_price);
                     SendTradeEvent("modify", ticket, dir, volume - close_vol, current_price, current_sl, tp2_val, 100, "TP2");
                    }
                  tp2_hit = true;
                  UpdatePositionState(ticket, tp1_hit, tp2_hit, reg_sl, tp1_val, tp2_val, tp3_val);
                 }
              }
              
            // ── Stage 3: TP3 Full Close (remainder) ─────────────────────────
            if(tp1_hit && tp2_hit && tp3_val > 0)
              {
               bool trigger_tp3 = (is_buy && current_price >= tp3_val) || (!is_buy && current_price <= tp3_val);
               if(trigger_tp3)
                 {
                  if(trade.PositionClose(ticket))
                    {
                     Print("TP3 Full Close: ticket ", ticket, " | closed at ", current_price);
                     SendTradeEvent("close", ticket, dir, volume, current_price, current_sl, tp3_val, 100, "TP3");
                    }
                  continue;
                 }
              }
              
            // ── Stage 4: ATR Trailing Stop ───────────────────────────────────
            if(InpTrailingStop)
              {
               if(is_buy)
                 {
                  double new_sl = NormalizeDouble(current_price - trail_distance, _Digits);
                  if(new_sl > current_sl && new_sl > open_price)
                     trade.PositionModify(ticket, new_sl, 0);
                 }
               else
                 {
                  double new_sl = NormalizeDouble(current_price + trail_distance, _Digits);
                  if((new_sl < current_sl || current_sl == 0) && new_sl < open_price)
                     trade.PositionModify(ticket, new_sl, 0);
                 }
              }
           }
        }
     }
  };
