//+------------------------------------------------------------------+
//|                                              LossStreakGuard.mqh |
//|                                  Copyright 2026, AdaptiveICT     |
//+------------------------------------------------------------------+
#property copyright "Copyright 2026, AdaptiveICT"
#property link      "https://www.mql5.com"
#property version   "1.00"
#property once

#include "Config.mqh"

//+------------------------------------------------------------------+
//| Consecutive-loss cooldown: after N consecutive losing closed     |
//| positions (this EA magic + symbol), new entries are frozen for a |
//| cooldown window. Protects against revenge-trading when the       |
//| RecoveryStateMachine resets instantly on external/manual closes. |
//| Counts aggregated net PnL per position (partials merge into one  |
//| result) over a rolling 3-day deal-history window.                |
//+------------------------------------------------------------------+
datetime g_lsg_last_check     = 0;
bool     g_lsg_cached_active  = false;
datetime g_lsg_cached_until   = 0;
int      g_lsg_cached_streak  = 0;

#define LSG_MAX_POSITIONS 100
#define LSG_LOOKBACK_SEC  (3 * 86400)
#define LSG_CACHE_SEC     30

//+------------------------------------------------------------------+
//| Count consecutive losing positions, newest first. Returns streak |
//| and the close time of the newest losing position.                |
//+------------------------------------------------------------------+
int GetConsecutiveLosses(datetime &last_loss_time)
  {
   last_loss_time = 0;
   int streak = 0;
   
   if(!HistorySelect(TimeCurrent() - LSG_LOOKBACK_SEC, TimeCurrent())) return 0;
   int total = HistoryDealsTotal();
   if(total <= 0) return 0;
   
   // Aggregate net PnL per closed position (partials + swaps + commission)
   long     pos_ids[LSG_MAX_POSITIONS];
   double   pos_pnl[LSG_MAX_POSITIONS];
   datetime pos_last[LSG_MAX_POSITIONS];
   int      pos_count = 0;
   
   for(int i = 0; i < total; i++)
     {
      ulong deal_ticket = HistoryDealGetTicket(i);
      if(deal_ticket == 0) continue;
      if(HistoryDealGetInteger(deal_ticket, DEAL_MAGIC) != InpMagic) continue;
      if(HistoryDealGetString(deal_ticket, DEAL_SYMBOL) != _Symbol) continue;
      
      long pos_id = HistoryDealGetInteger(deal_ticket, DEAL_POSITION_ID);
      if(pos_id == 0) continue;
      
      double pnl = HistoryDealGetDouble(deal_ticket, DEAL_PROFIT) +
                   HistoryDealGetDouble(deal_ticket, DEAL_SWAP) +
                   HistoryDealGetDouble(deal_ticket, DEAL_COMMISSION);
      datetime dtime = (datetime)HistoryDealGetInteger(deal_ticket, DEAL_TIME);
      
      int idx = -1;
      for(int j = 0; j < pos_count; j++)
        {
         if(pos_ids[j] == pos_id) { idx = j; break; }
        }
      if(idx < 0 && pos_count < LSG_MAX_POSITIONS)
        {
         idx = pos_count;
         pos_ids[idx] = pos_id;
         pos_pnl[idx] = 0.0;
         pos_last[idx] = 0;
         pos_count++;
        }
      if(idx < 0) continue; // table full
      
      pos_pnl[idx] += pnl;
      if(dtime > pos_last[idx]) pos_last[idx] = dtime;
     }
   
   // Walk positions newest -> oldest, counting consecutive net losers
   for(int step = 0; step < pos_count; step++)
     {
      int newest = -1;
      datetime best = 0;
      for(int j = 0; j < pos_count; j++)
        {
         if(pos_ids[j] != 0 && pos_last[j] > best)
           {
            best = pos_last[j];
            newest = j;
           }
        }
      if(newest < 0) break;
      
      if(pos_pnl[newest] < 0.0)
        {
         streak++;
         if(pos_last[newest] > last_loss_time) last_loss_time = pos_last[newest];
        }
      else break;
      
      pos_ids[newest] = 0; // consumed
     }
   
   return streak;
  }

//+------------------------------------------------------------------+
//| True while the loss-streak entry freeze is active                |
//+------------------------------------------------------------------+
bool IsLossStreakCooldownActive()
  {
   if(!InpUseLossStreakCooldown || InpLossStreakThreshold <= 0 || InpLossStreakCooldownMin <= 0) return false;
   
   datetime now = TimeCurrent();
   if(g_lsg_last_check == 0 || now - g_lsg_last_check >= LSG_CACHE_SEC)
     {
      g_lsg_last_check = now;
      datetime last_loss = 0;
      g_lsg_cached_streak = GetConsecutiveLosses(last_loss);
      g_lsg_cached_until = (g_lsg_cached_streak >= InpLossStreakThreshold) ? last_loss + (datetime)(InpLossStreakCooldownMin * 60) : 0;
     }
   
   return (g_lsg_cached_until > now);
  }