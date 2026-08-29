//+------------------------------------------------------------------+
//|                                                  RiskManager.mqh |
//|                                  Copyright 2026, AdaptiveICT     |
//|                                             https://www.mql5.com |
//+------------------------------------------------------------------+
#property copyright "Copyright 2026, AdaptiveICT"
#property link      "https://www.mql5.com"
#property version   "1.00"
#property once

#include "../Core/Types.mqh"
#include "../Core/StateManager.mqh"
#include "PositionSizing.mqh"
#include "ExposureManager.mqh"

//+------------------------------------------------------------------+
//| Get Today's Trade History Stats                                  |
//+------------------------------------------------------------------+
void GetTodayStats(int &trades_count, int &wins_count, int &losses_count, double &total_pnl)
  {
   trades_count = 0;
   wins_count = 0;
   losses_count = 0;
   total_pnl = 0.0;

   datetime today_start = TimeCurrent() - (TimeCurrent() % 86400);
   HistorySelect(today_start, TimeCurrent());

   for(int i = HistoryDealsTotal() - 1; i >= 0; i--)
     {
      ulong ticket = HistoryDealGetTicket(i);
      if(HistoryDealGetInteger(ticket, DEAL_MAGIC) == InpMagic)
        {
         double profit     = HistoryDealGetDouble(ticket, DEAL_PROFIT);
         double commission = HistoryDealGetDouble(ticket, DEAL_COMMISSION);
         double swap       = HistoryDealGetDouble(ticket, DEAL_SWAP);
         double net_profit = profit + commission + swap;

         long entry = HistoryDealGetInteger(ticket, DEAL_ENTRY);
         if(entry == DEAL_ENTRY_OUT || entry == DEAL_ENTRY_OUT_BY)
           {
            trades_count++;
            total_pnl += net_profit;
            if(net_profit > 0) wins_count++;
            else if(net_profit < 0) losses_count++;
           }
        }
     }
  }

//+------------------------------------------------------------------+
//| Check if daily drawdown limit is exceeded                        |
//+------------------------------------------------------------------+
bool IsDailyLossExceeded()
  {
   int trades_count = 0, wins = 0, losses = 0;
   double today_pnl = 0.0;
   GetTodayStats(trades_count, wins, losses, today_pnl);

   double balance = AccountInfoDouble(ACCOUNT_BALANCE);
   if(balance > 0)
     {
      double loss_pct = -(today_pnl / balance) * 100.0;
      if(loss_pct >= InpMaxDailyLossPct)
        {
         Print("Daily loss limit exceeded: ", DoubleToString(loss_pct, 2), "%. Blocked.");
         return true;
        }
     }
   return false;
  }

//+------------------------------------------------------------------+
//| Check if account max drawdown kill switch is triggered           |
//| This is the hard stop - once hit, no more trades are allowed.    |
//+------------------------------------------------------------------+
bool IsMaxDrawdownHit()
  {
   double balance  = AccountInfoDouble(ACCOUNT_BALANCE);
   double equity   = AccountInfoDouble(ACCOUNT_EQUITY);
   if(balance <= 0) return false;

   double dd_pct = ((balance - equity) / balance) * 100.0;
   if(dd_pct >= InpMaxDrawdownPct)
     {
      Print("KILL SWITCH: Max account drawdown hit (", DoubleToString(dd_pct, 2), "%). Trading halted.");
      return true;
     }
   return false;
  }

//+------------------------------------------------------------------+
//| Primary risk gate: Is this trade allowed to proceed?             |
//| Called by EAController before position sizing or execution.      |
//+------------------------------------------------------------------+
bool IsTradeAllowed(const TradeSignal &signal)
  {
   // 1. Max drawdown kill switch
   if(IsMaxDrawdownHit()) return false;

   // 2. Daily loss cap
   if(IsDailyLossExceeded()) return false;

   // 3. Max concurrent open trades
   int open_count = 0;
   for(int i = PositionsTotal() - 1; i >= 0; i--)
     {
      if(PositionGetSymbol(i) == _Symbol && PositionGetInteger(POSITION_MAGIC) == InpMagic)
         open_count++;
     }
   if(open_count >= InpMaxOpenTrades)
     {
      Print("Max trades limit reached (", InpMaxOpenTrades, "). Rejecting.");
      return false;
     }

   // 4. Exposure check
   if(!IsExposureAllowed()) return false;

   return true;
  }

//+------------------------------------------------------------------+
//| Get position size for a given TradeSignal                        |
//+------------------------------------------------------------------+
double GetPositionSize(const TradeSignal &signal, int score = 0)
  {
   return CalculateLotSize(signal.entry_price, signal.invalidation_price, score);
  }

//+------------------------------------------------------------------+
//| Legacy wrapper for backward compatibility with TradePlan         |
//+------------------------------------------------------------------+
bool IsRiskAllowed(const TradePlan &plan)
  {
   TradeSignal sig;
   sig.type             = plan.type;
   sig.entry_price      = plan.entry_price;
   sig.invalidation_price = plan.sl;
   return IsTradeAllowed(sig);
  }
