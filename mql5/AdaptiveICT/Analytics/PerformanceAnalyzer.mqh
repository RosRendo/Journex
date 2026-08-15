//+------------------------------------------------------------------+
//|                                         PerformanceAnalyzer.mqh  |
//|                                  Copyright 2026, AdaptiveICT     |
//|                                             https://www.mql5.com |
//+------------------------------------------------------------------+
#property copyright "Copyright 2026, AdaptiveICT"
#property link      "https://www.mql5.com"
#property version   "1.00"
#property once

#include "../Core/Config.mqh"

//+------------------------------------------------------------------+
//| Performance Analyzer Class                                       |
//+------------------------------------------------------------------+
class PerformanceAnalyzer
  {
public:
   //+------------------------------------------------------------------+
   //| Calculate and Print account performance statistics               |
   //+------------------------------------------------------------------+
   static void PrintStats()
     {
      HistorySelect(0, TimeCurrent());
      int total_deals = HistoryDealsTotal();
      
      int trades_count = 0;
      int wins_count = 0;
      double gross_profit = 0.0;
      double gross_loss = 0.0;
      double total_pnl = 0.0;
      
      for(int i = 0; i < total_deals; i++)
        {
         ulong ticket = HistoryDealGetTicket(i);
         if(HistoryDealGetInteger(ticket, DEAL_MAGIC) == InpMagic)
           {
            long entry = HistoryDealGetInteger(ticket, DEAL_ENTRY);
            if(entry == DEAL_ENTRY_OUT || entry == DEAL_ENTRY_OUT_BY)
              {
               double pnl = HistoryDealGetDouble(ticket, DEAL_PROFIT);
               double comm = HistoryDealGetDouble(ticket, DEAL_COMMISSION);
               double swap = HistoryDealGetDouble(ticket, DEAL_SWAP);
               double net = pnl + comm + swap;
               
               trades_count++;
               total_pnl += net;
               
               if(net > 0)
                 {
                  wins_count++;
                  gross_profit += net;
                 }
               else
                 {
                  gross_loss += MathAbs(net);
                 }
              }
           }
        }
      
      double win_rate = (trades_count > 0) ? ((double)wins_count / trades_count) * 100.0 : 0.0;
      double pf = (gross_loss > 0) ? (gross_profit / gross_loss) : gross_profit;
      
      Print("=== AdaptiveICT Performance Summary ===");
      Print("Total Trades: ", trades_count);
      Print("Win Rate: ", DoubleToString(win_rate, 2), "%");
      Print("Gross Profit: ", DoubleToString(gross_profit, 2));
      Print("Gross Loss: ", DoubleToString(gross_loss, 2));
      Print("Profit Factor: ", DoubleToString(pf, 2));
      Print("Net PnL: ", DoubleToString(total_pnl, 2));
     }
  };
