//+------------------------------------------------------------------+
//|                                                RiskEvaluator.mqh |
//|                                  Copyright 2026, AdaptiveICT     |
//|                                             https://www.mql5.com |
//+------------------------------------------------------------------+
#property copyright "Copyright 2026, AdaptiveICT"
#property link      "https://www.mql5.com"
#property version   "1.00"
#property once

#include "../StateManager.mqh"

class RiskEvaluator
  {
public:
   // Evaluates account safety limits (daily loss limit, max drawdown limit, open trade cap)
   static bool Evaluate(double p_max_daily_loss, double max_drawdown, int max_open_trades)
     {
      double balance = AccountInfoDouble(ACCOUNT_BALANCE);
      double equity = AccountInfoDouble(ACCOUNT_EQUITY);
      if(balance == 0) 
        { 
         if(!MQLInfoInteger(MQL_TESTER) && !MQLInfoInteger(MQL_OPTIMIZATION)) Print("[RiskEvaluator] FAILED: Balance is 0"); 
         return false; 
        }
      
      // Drawdown check
      double dd_pct = ((balance - equity) / balance) * 100.0;
      if(dd_pct > max_drawdown) 
        { 
         if(!MQLInfoInteger(MQL_TESTER) && !MQLInfoInteger(MQL_OPTIMIZATION)) Print("[RiskEvaluator] FAILED: DD% (", dd_pct, ") > max_drawdown (", max_drawdown, ")"); 
         return false; 
        }
      
      // Daily loss check
      int trades = 0, wins = 0, losses = 0;
      double pnl = 0.0;
      GetTodayStats(trades, wins, losses, pnl);
      double daily_loss_pct = (-pnl / balance) * 100.0;
      if(pnl < 0 && daily_loss_pct > p_max_daily_loss) 
        { 
         if(!MQLInfoInteger(MQL_TESTER) && !MQLInfoInteger(MQL_OPTIMIZATION)) Print("[RiskEvaluator] FAILED: Daily Loss% (", daily_loss_pct, ") > max (", p_max_daily_loss, ")"); 
         return false; 
        }
      
      // Open trades cap check
      int open_count = 0;
      for(int i = PositionsTotal() - 1; i >= 0; i--)
        {
         if(PositionGetSymbol(i) == _Symbol && PositionGetInteger(POSITION_MAGIC) == InpMagic)
            open_count++;
        }
      if(open_count >= max_open_trades) 
        { 
         if(!MQLInfoInteger(MQL_TESTER) && !MQLInfoInteger(MQL_OPTIMIZATION)) Print("[RiskEvaluator] FAILED: Open trades (", open_count, ") >= max (", max_open_trades, ")"); 
         return false; 
        }
      
      return true;
     }
  };
