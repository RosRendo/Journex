//+------------------------------------------------------------------+
//|                                             ExposureManager.mqh  |
//|                                  Copyright 2026, AdaptiveICT     |
//|                                             https://www.mql5.com |
//+------------------------------------------------------------------+
#property copyright "Copyright 2026, AdaptiveICT"
#property link      "https://www.mql5.com"
#property version   "1.00"
#property once

#include "../Core/Config.mqh"

//+------------------------------------------------------------------+
//| Get total margin currently used by this EA's open positions      |
//+------------------------------------------------------------------+
double GetCurrentExposurePct()
  {
   double total_margin = 0.0;
   for(int i = PositionsTotal() - 1; i >= 0; i--)
     {
      if(PositionGetSymbol(i) == _Symbol && PositionGetInteger(POSITION_MAGIC) == InpMagic)
        {
         double pos_margin = 0.0;
         // Calculate margin used per position
         double lots   = PositionGetDouble(POSITION_VOLUME);
         double price  = PositionGetDouble(POSITION_PRICE_OPEN);
         double contract = SymbolInfoDouble(_Symbol, SYMBOL_TRADE_CONTRACT_SIZE);
         double leverage = (double)AccountInfoInteger(ACCOUNT_LEVERAGE);

         if(leverage > 0)
            total_margin += (lots * contract * price) / leverage;
        }
     }

   double balance = AccountInfoDouble(ACCOUNT_BALANCE);
   if(balance <= 0) return 0.0;

   return (total_margin / balance) * 100.0;
  }

//+------------------------------------------------------------------+
//| Check if opening another trade would exceed safe exposure limits |
//| Currently limits to a simple concurrent position count cap,      |
//| but can be extended to margin % cap in the future.               |
//+------------------------------------------------------------------+
bool IsExposureAllowed()
  {
   // Exposure is managed by the max-trades gate in RiskManager.
   // This function is a placeholder for future margin-percentage
   // exposure logic (e.g., block if EA is using > 20% of balance in margin).
   return true;
  }
