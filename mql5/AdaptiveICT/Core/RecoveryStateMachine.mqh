//+------------------------------------------------------------------+
//|                                       RecoveryStateMachine.mqh   |
//|                                  Copyright 2026, AdaptiveICT     |
//|                                             https://www.mql5.com |
//+------------------------------------------------------------------+
#property copyright "Copyright 2026, AdaptiveICT"
#property link      "https://www.mql5.com"
#property version   "1.00"
#property once

#include "Types.mqh"
#include "Config.mqh"

//+------------------------------------------------------------------+
//| T049: Recovery State Machine                                     |
//| Tracks per-symbol protection states:                             |
//| NORMAL -> WEAKENING -> RISK_PROTECTION -> OBSERVATION ->         |
//| CONFIRMED / INVALIDATED                                          |
//| Maps to: FR-029, FR-030, FR-031                                  |
//+------------------------------------------------------------------+
class RecoveryStateMachine
  {
public:
   //+------------------------------------------------------------------+
   //| Transition: advances machine state based on health evaluation    |
   //+------------------------------------------------------------------+
   static RecoveryState Transition(ulong ticket, const TradeHealthState &health, const RecoveryState &current)
     {
      RecoveryState next = current;

      // 1. Terminal invalidation
      if(health.label == "THESIS_INVALIDATED")
        {
         if(next.state != RECOVERY_INVALIDATED)
           {
            Print(StringFormat("[RecoverySM] Ticket %d: State change %s -> INVALIDATED (Health: %d/100)",
                               ticket, StateToString(next.state), health.score));
           }
         next.state = RECOVERY_INVALIDATED;
         next.reason = "THESIS_INVALIDATED: Health dropped below invalidation threshold";
         next.danger_bar_count = 0;
         next.healthy_bar_count = 0;
         next.transitioned_at = TimeCurrent();
         return next;
        }

      // 2. State-specific transitions
      switch(current.state)
        {
         case RECOVERY_NORMAL:
           {
            if(health.label == "WEAKENING" || health.label == "DANGER")
              {
               next.state = RECOVERY_WEAKENING;
               next.reason = "Trade health weakening observed: " + health.factor_notes;
               next.danger_bar_count = (health.label == "DANGER") ? 1 : 0;
               next.healthy_bar_count = 0;
               next.transitioned_at = TimeCurrent();
               Print(StringFormat("[RecoverySM] Ticket %d: NORMAL -> WEAKENING (%s)", ticket, health.label));
              }
            break;
           }

         case RECOVERY_WEAKENING:
           {
            if(health.label == "DANGER")
              {
               next.danger_bar_count++;
               if(next.danger_bar_count >= InpHealthDangerBarsToBlock)
                 {
                  next.state = RECOVERY_RISK_PROTECTION;
                  next.reason = StringFormat("Persistent DANGER (%d bars) triggered Risk Protection", next.danger_bar_count);
                  next.healthy_bar_count = 0;
                  next.transitioned_at = TimeCurrent();
                  Print(StringFormat("[RecoverySM] Ticket %d: WEAKENING -> RISK_PROTECTION (danger bars: %d)",
                                     ticket, next.danger_bar_count));
                 }
              }
            else if(health.label == "HEALTHY")
              {
               next.state = RECOVERY_NORMAL;
               next.reason = "Health recovered to HEALTHY";
               next.danger_bar_count = 0;
               next.healthy_bar_count = 0;
               next.transitioned_at = TimeCurrent();
               Print(StringFormat("[RecoverySM] Ticket %d: WEAKENING -> NORMAL (recovered)", ticket));
              }
            break;
           }

         case RECOVERY_RISK_PROTECTION:
           {
            if(health.label == "HEALTHY")
              {
               next.healthy_bar_count++;
               if(next.healthy_bar_count >= 3)
                 {
                  next.state = RECOVERY_OBSERVATION;
                  next.reason = "3 consecutive HEALTHY bars: moved to OBSERVATION";
                  next.transitioned_at = TimeCurrent();
                  Print(StringFormat("[RecoverySM] Ticket %d: RISK_PROTECTION -> OBSERVATION (%d healthy bars)",
                                     ticket, next.healthy_bar_count));
                 }
              }
            else
              {
               next.healthy_bar_count = 0;
              }
            break;
           }

         case RECOVERY_OBSERVATION:
           {
            if(health.label == "HEALTHY")
              {
               next.healthy_bar_count++;
               if(next.healthy_bar_count >= 5)
                 {
                  next.state = RECOVERY_CONFIRMED;
                  next.reason = "Structure revalidated over 5 consecutive healthy bars";
                  next.transitioned_at = TimeCurrent();
                  Print(StringFormat("[RecoverySM] Ticket %d: OBSERVATION -> CONFIRMED (revalidated)", ticket));
                 }
              }
            else if(health.label == "DANGER")
              {
               next.state = RECOVERY_RISK_PROTECTION;
               next.reason = "Relapse into DANGER during observation";
               next.danger_bar_count = 1;
               next.healthy_bar_count = 0;
               next.transitioned_at = TimeCurrent();
               Print(StringFormat("[RecoverySM] Ticket %d: OBSERVATION -> RISK_PROTECTION (relapse)", ticket));
              }
            break;
           }

         case RECOVERY_CONFIRMED:
           {
            if(health.label == "HEALTHY")
              {
               next.state = RECOVERY_NORMAL;
               next.reason = "Confirmed structure sustained; returned to NORMAL";
               next.danger_bar_count = 0;
               next.healthy_bar_count = 0;
               next.transitioned_at = TimeCurrent();
               Print(StringFormat("[RecoverySM] Ticket %d: CONFIRMED -> NORMAL", ticket));
              }
            else if(health.label == "WEAKENING" || health.label == "DANGER")
              {
               next.state = RECOVERY_WEAKENING;
               next.reason = "Weakening after confirmation";
               next.danger_bar_count = (health.label == "DANGER") ? 1 : 0;
               next.healthy_bar_count = 0;
               next.transitioned_at = TimeCurrent();
               Print(StringFormat("[RecoverySM] Ticket %d: CONFIRMED -> WEAKENING", ticket));
              }
            break;
           }

         case RECOVERY_INVALIDATED:
           {
            // Position closure resets state to NORMAL
            next.state = RECOVERY_NORMAL;
            next.reason = "Reset to NORMAL after position closure";
            next.danger_bar_count = 0;
            next.healthy_bar_count = 0;
            next.transitioned_at = TimeCurrent();
            break;
           }
        }

      return next;
     }

   //+------------------------------------------------------------------+
   //| IsNewEntryBlocked: checks if risk protection or observation is on|
   //| Maps to: FR-030, FR-031                                          |
   //+------------------------------------------------------------------+
   static bool IsNewEntryBlocked(string symbol, RecoveryStateEnum state)
     {
      if(state == RECOVERY_RISK_PROTECTION)
        {
         Print(StringFormat("[RecoverySM] New entries blocked on %s: RISK_PROTECTION active", symbol));
         return true;
        }
      if(state == RECOVERY_OBSERVATION)
        {
         Print(StringFormat("[RecoverySM] New entries blocked on %s: RECOVERY_OBSERVATION active", symbol));
         return true;
        }
      return false;
     }

   //+------------------------------------------------------------------+
   //| Helper to convert enum to display string                         |
   //+------------------------------------------------------------------+
   static string StateToString(RecoveryStateEnum state)
     {
      switch(state)
        {
         case RECOVERY_NORMAL:          return "NORMAL";
         case RECOVERY_WEAKENING:       return "WEAKENING";
         case RECOVERY_RISK_PROTECTION: return "RISK_PROTECTION";
         case RECOVERY_OBSERVATION:     return "OBSERVATION";
         case RECOVERY_CONFIRMED:       return "CONFIRMED";
         case RECOVERY_INVALIDATED:     return "INVALIDATED";
         default:                       return "UNKNOWN";
        }
     }
  };
