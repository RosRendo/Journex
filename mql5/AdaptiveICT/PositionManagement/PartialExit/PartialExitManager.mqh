//+------------------------------------------------------------------+
//|                                           PartialExitManager.mqh |
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
//| Partial Exit Position Manager Class implementing Path 3 Exits   |
//+------------------------------------------------------------------+
class PartialExitManager : public BasePositionManager
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
   PartialExitManager()
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
            
            bool   tp1_hit = false, tp2_hit = false;
            double reg_sl = 0, tp1_val = 0, tp2_val = 0, tp3_val = 0;
            bool   has_state = GetPositionState(ticket, tp1_hit, tp2_hit, reg_sl, tp1_val, tp2_val, tp3_val);
            
            if(!has_state || reg_sl == 0.0)
              {
               reg_sl = current_sl;
               if(reg_sl == 0.0) // Fallback SL if not set
                 {
                  reg_sl = is_buy ? open_price - current_atr * 2.0 : open_price + current_atr * 2.0;
                 }
              }
            
            double sl_distance = MathAbs(open_price - reg_sl);
            double partial_exit_target = is_buy ? open_price + (InpPartialExitRR * sl_distance) : open_price - (InpPartialExitRR * sl_distance);
            
            // ── Stage 1: Path 3 Partial Exit (Close defined % at defined RR) ─────
            if(!tp1_hit)
              {
               bool trigger_tp1 = (is_buy && current_price >= partial_exit_target) || (!is_buy && current_price <= partial_exit_target);
               if(trigger_tp1)
                 {
                  double close_vol = NormalizeDouble(volume * (InpPartialExitPct / 100.0), 2);
                  if(close_vol >= lot_min && trade.PositionClosePartial(ticket, close_vol))
                    {
                     Print("Path 3 Partial Close (", DoubleToString(InpPartialExitPct, 1), "%): ticket ", ticket, " | closed ", close_vol, " lots at ", current_price);
                     TradeJournal::LogEvent("partial_close", ticket, _Symbol, dir, close_vol, current_price, current_sl, partial_exit_target, "Path 3 TP1");
                    }
                  tp1_hit = true;
                  UpdatePositionState(ticket, tp1_hit, tp2_hit, reg_sl, partial_exit_target, tp2_val, tp3_val);
                  
                  if(InpMoveSLToBE)
                    {
                     double pip = (_Digits == 3 || _Digits == 5) ? 10.0 * SymbolInfoDouble(_Symbol, SYMBOL_POINT) : SymbolInfoDouble(_Symbol, SYMBOL_POINT);
                     double be_price = is_buy ? open_price + (InpBEOffsetPips * pip) : open_price - (InpBEOffsetPips * pip);
                     be_price = NormalizeDouble(be_price, _Digits);
                     trade.PositionModify(ticket, be_price, 0);
                     Print("Path 3 SL moved to BE+Offset: ticket ", ticket, " | BE=", be_price);
                     TradeJournal::LogEvent("modify_sl", ticket, _Symbol, dir, volume - close_vol, open_price, be_price, tp2_val, "Path 3 BE");
                    }
                 }
              }
              
            // ── Stage 2: ATR Trailing Stop (On remaining runner) ────────────────
            if(tp1_hit && InpTrailingStop)
              {
               if(is_buy)
                 {
                  double new_sl = NormalizeDouble(current_price - trail_distance, _Digits);
                  if(new_sl > current_sl && new_sl > open_price)
                    {
                     trade.PositionModify(ticket, new_sl, 0);
                     TradeJournal::LogEvent("trail_sl", ticket, _Symbol, dir, volume, current_price, new_sl, tp2_val, "ATR Trail");
                    }
                 }
               else
                 {
                  double new_sl = NormalizeDouble(current_price + trail_distance, _Digits);
                  if((new_sl < current_sl || current_sl == 0) && new_sl < open_price)
                    {
                     trade.PositionModify(ticket, new_sl, 0);
                     TradeJournal::LogEvent("trail_sl", ticket, _Symbol, dir, volume, current_price, new_sl, tp2_val, "ATR Trail");
                    }
                 }
              }
           }
        }
     }
  };
