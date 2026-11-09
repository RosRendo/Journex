//+------------------------------------------------------------------+
//|                                           SwingPositionManager.mqh|
//|                                  Copyright 2026, AdaptiveICT     |
//+------------------------------------------------------------------+
#property copyright "Copyright 2026, AdaptiveICT"
#property link      "https://www.mql5.com"
#property version   "1.00"
#property once

#include "../BasePositionManager.mqh"
#include "../PositionStateStore.mqh"
#include "../../Trade/TradeExecutor.mqh"
#include "../../Indicators/ATR.mqh"
#include "../../Analytics/TradeJournal.mqh"
#include "../../Core/TradeHealthEngine.mqh"
#include "../../Core/RecoveryStateMachine.mqh"
#include "../../Core/StateManager.mqh"

//+------------------------------------------------------------------+
//| Swing Position Manager (Phase 4)                                 |
//| Difference vs Single/Partial managers:                           |
//|  - NO time-decay force close (swings need room to breathe)       |
//|  - Health monitoring on H1 (less intrabar noise than chart TF)   |
//|  - Optional partial at configurable RR (0 = disabled)            |
//|  - Wide ATR trail (InpSwingTrailATRMult) as the main exit        |
//|  - State persisted to disk via PositionStateStore ("SWING" tag)  |
//+------------------------------------------------------------------+
class SwingPositionManager : public BasePositionManager
  {
private:
   MqlPositionState  position_states[100];
   int               pos_states_count;

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
            PersistState();
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
      PersistState();
     }

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
         else
           {
            RemoveHealthState(ticket);
           }
        }
        
      pos_states_count = active_count;
      for(int i = 0; i < pos_states_count; i++)
        {
         position_states[i] = active_states[i];
        }
      PersistState();
     }

   datetime GetPositionHealthBarTime(ulong ticket)
     {
      for(int i = 0; i < pos_states_count; i++)
        {
         if(position_states[i].ticket == ticket)
            return position_states[i].last_health_bar;
        }
      return 0;
     }

   void SetPositionHealthBarTime(ulong ticket, datetime bar_time)
     {
      for(int i = 0; i < pos_states_count; i++)
        {
         if(position_states[i].ticket == ticket)
           {
            position_states[i].last_health_bar = bar_time;
            return;
           }
        }
     }

   void PersistState()
     {
      PMStateSave("SWING", position_states, pos_states_count);
     }

public:
   SwingPositionManager()
     {
      pos_states_count = 0;
      ZeroMemory(position_states);
     }

   virtual void RegisterPosition(ulong ticket, double original_sl, double tp1, double tp2, double tp3)
     {
      UpdatePositionState(ticket, false, false, original_sl, tp1, tp2, tp3);
     }

   virtual void RestoreState()
     {
      MqlPositionState loaded[];
      int n = PMStateLoad("SWING", loaded);
      if(n <= 0) return;
      
      pos_states_count = 0;
      ZeroMemory(position_states);
      
      int kept = 0;
      for(int i = 0; i < n && pos_states_count < 100; i++)
        {
         if(!PositionSelectByTicket(loaded[i].ticket)) continue;
         position_states[pos_states_count] = loaded[i];
         pos_states_count++;
         kept++;
        }
      PersistState();
      Print("[PM] Restored ", kept, " swing position state(s) from disk after restart.");
     }

   virtual void ManagePositions()
     {
      // Trail ATR from H1 to stay stable across chart TFs
      double swing_atr = GetATR(PERIOD_H1, 14);
      if(swing_atr <= 0) swing_atr = GetATR(PERIOD_CURRENT, 14);
      if(swing_atr <= 0) return;
      
      double trail_distance = swing_atr * InpSwingTrailATRMult;
      double lot_min = SymbolInfoDouble(_Symbol, SYMBOL_VOLUME_MIN);
      
      CleanupPositionStates();
      
      for(int i = PositionsTotal() - 1; i >= 0; i--)
        {
         if(PositionGetSymbol(i) == _Symbol && PositionGetInteger(POSITION_MAGIC) == InpMagic)
           {
            ulong ticket = PositionGetInteger(POSITION_TICKET);
            double open_price = PositionGetDouble(POSITION_PRICE_OPEN);
            double current_sl = PositionGetDouble(POSITION_SL);
            double current_price = (PositionGetInteger(POSITION_TYPE) == POSITION_TYPE_BUY) ? SymbolInfoDouble(_Symbol, SYMBOL_BID) : SymbolInfoDouble(_Symbol, SYMBOL_ASK);
            
            bool   is_buy = (PositionGetInteger(POSITION_TYPE) == POSITION_TYPE_BUY);
            string dir = is_buy ? "BUY" : "SELL";
            double volume = PositionGetDouble(POSITION_VOLUME);
            
            // ── Trade Health Monitoring (H1 bar cadence) ──
            datetime current_bar_time = iTime(_Symbol, PERIOD_H1, 0);
            datetime last_health_time = GetPositionHealthBarTime(ticket);
            if(current_bar_time != last_health_time)
              {
               SetPositionHealthBarTime(ticket, current_bar_time);
               TradeHealthState health = TradeHealthEngine::Evaluate(ticket, PERIOD_H1);
               SetHealthState(ticket, health);
               
               g_recovery_state = RecoveryStateMachine::Transition(ticket, health, g_recovery_state);
               
               if(health.label == "THESIS_INVALIDATED")
                 {
                  Print("[THESIS_INVALIDATED] Swing position ", ticket, " health dropped to ", health.score, "/100. Factors: ", health.factor_notes, ". Force closing.");
                  if(trade.PositionClose(ticket))
                    {
                     TradeJournal::LogEvent("close", ticket, _Symbol, dir, volume, current_price, current_sl, current_price, "ThesisInvalidated");
                     RemoveHealthState(ticket);
                     continue;
                    }
                 }
              }
            
            bool   be_done = false, partial_done = false;
            double reg_sl = 0, tp1_val = 0, tp2_val = 0, tp3_val = 0;
            bool   has_state = GetPositionState(ticket, be_done, partial_done, reg_sl, tp1_val, tp2_val, tp3_val);
            
            if(!has_state || reg_sl == 0.0)
              {
               reg_sl = current_sl;
               if(reg_sl == 0.0) reg_sl = is_buy ? open_price - swing_atr * InpSwingSLAtrMult : open_price + swing_atr * InpSwingSLAtrMult;
               UpdatePositionState(ticket, be_done, partial_done, reg_sl, tp1_val, tp2_val, tp3_val);
              }
            
            double sl_distance = MathAbs(open_price - reg_sl);
            if(sl_distance <= 0) sl_distance = swing_atr * InpSwingSLAtrMult;
            
            double be_trigger = is_buy ? open_price + (InpSwingBE_RR * sl_distance) : open_price - (InpSwingBE_RR * sl_distance);
            double partial_trigger = (InpSwingPartialRR > 0.0) ? (is_buy ? open_price + (InpSwingPartialRR * sl_distance) : open_price - (InpSwingPartialRR * sl_distance)) : 0.0;
            
            // ── Stage 1: BE lock at InpSwingBE_RR ──
            if(!be_done)
              {
               bool trigger = (is_buy && current_price >= be_trigger) || (!is_buy && current_price <= be_trigger);
               if(trigger)
                 {
                  be_done = true;
                  if(InpSwingUseBE)
                    {
                     double be_price = is_buy ? open_price + (sl_distance * 0.1) : open_price - (sl_distance * 0.1);
                     be_price = NormalizeDouble(be_price, _Digits);
                     trade.PositionModify(ticket, be_price, 0);
                     Print("[Swing] SL locked to BE+0.1R at ", DoubleToString(InpSwingBE_RR, 1), "R: ticket ", ticket, " | SL=", be_price);
                     TradeJournal::LogEvent("modify_sl", ticket, _Symbol, dir, volume, open_price, be_price, 0, "Swing BE Lock");
                    }
                  UpdatePositionState(ticket, be_done, partial_done, reg_sl, tp1_val, tp2_val, tp3_val);
                 }
              }
            
            // ── Stage 2: optional partial scale-out at InpSwingPartialRR ──
            if(!partial_done && partial_trigger > 0.0 && be_done)
              {
               bool trigger = (is_buy && current_price >= partial_trigger) || (!is_buy && current_price <= partial_trigger);
               if(trigger)
                 {
                  double close_vol = NormalizeDouble(volume * (InpSwingPartialPct / 100.0), 2);
                  if(close_vol >= lot_min && trade.PositionClosePartial(ticket, close_vol))
                    {
                     Print("[Swing] Partial scale-out (", DoubleToString(InpSwingPartialPct, 1), "%) at ", DoubleToString(InpSwingPartialRR, 1), "R: ticket ", ticket);
                     TradeJournal::LogEvent("partial_close", ticket, _Symbol, dir, close_vol, current_price, current_sl, partial_trigger, "Swing Partial");
                    }
                  partial_done = true;
                  UpdatePositionState(ticket, be_done, partial_done, reg_sl, tp1_val, tp2_val, tp3_val);
                 }
              }
            
            // ── Stage 3: wide ATR trail (main swing exit) ──
            if(be_done && InpTrailingStop)
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