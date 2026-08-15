//+------------------------------------------------------------------+
//|                                                   Statistics.mqh |
//|                                  Copyright 2026, AdaptiveICT     |
//|                                             https://www.mql5.com |
//+------------------------------------------------------------------+
#property copyright "Copyright 2026, AdaptiveICT"
#property link      "https://www.mql5.com"
#property version   "1.00"
#property once

//+------------------------------------------------------------------+
//| MAE and MFE tracking helper functions                            |
//+------------------------------------------------------------------+
class SignalStatistics
  {
public:
   //+------------------------------------------------------------------+
   //| Calculate Max Adverse & Favorable Excursions for open positions   |
   //+------------------------------------------------------------------+
   static void UpdateMAE_MFE()
     {
      // Iterate through active positions to track MAE/MFE relative to entry price.
      // This is a placeholder that can be linked with the TradeJournal log 
      // or printed to terminal for debugging and strategy refinement.
      for(int i = PositionsTotal() - 1; i >= 0; i--)
        {
         if(PositionGetSymbol(i) == _Symbol && PositionGetInteger(POSITION_MAGIC) == InpMagic)
           {
            double open_price = PositionGetDouble(POSITION_PRICE_OPEN);
            double current_price = PositionGetDouble(POSITION_PRICE_CURRENT);
            double current_profit = PositionGetDouble(POSITION_PROFIT);
            
            // Log MAE/MFE metrics if they reach extreme excursions
            // Helpful to answer: "Is our Stop Loss too tight or too wide?"
           }
        }
     }
  };
