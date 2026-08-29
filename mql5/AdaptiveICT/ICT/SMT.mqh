//+------------------------------------------------------------------+
//|                                                          SMT.mqh |
//|                                  Copyright 2026, AdaptiveICT     |
//|                                             https://www.mql5.com |
//+------------------------------------------------------------------+
#property copyright "Copyright 2026, AdaptiveICT"
#property link      "https://www.mql5.com"
#property version   "1.00"

//+------------------------------------------------------------------+
//| Check SMT Intermarket Divergence against correlated symbol        |
//+------------------------------------------------------------------+
bool CheckSMT(ENUM_TIMEFRAMES tf, string smt_symbol)
  {
   MqlRates rates_main[];
   MqlRates rates_smt[];
   ArraySetAsSeries(rates_main, true);
   ArraySetAsSeries(rates_smt, true);
   
   int copied_main = CopyRates(_Symbol, tf, 0, 10, rates_main);
   int copied_smt = CopyRates(smt_symbol, tf, 0, 10, rates_smt);
   if(copied_main < 10 || copied_smt < 10) return false;
   
   double low_main_curr = rates_main[0].low;
   double low_main_prev = rates_main[3].low;
   double low_smt_curr = rates_smt[0].low;
   double low_smt_prev = rates_smt[3].low;
   
   for(int i = 1; i < 3; i++)
     {
      if(rates_main[i].low < low_main_curr) low_main_curr = rates_main[i].low;
      if(rates_smt[i].low < low_smt_curr)   low_smt_curr = rates_smt[i].low;
     }
   for(int i = 3; i < 10; i++)
     {
      if(rates_main[i].low < low_main_prev) low_main_prev = rates_main[i].low;
      if(rates_smt[i].low < low_smt_prev)   low_smt_prev = rates_smt[i].low;
     }
     
   if(low_main_curr < low_main_prev && low_smt_curr >= low_smt_prev) return true;
   if(low_main_curr >= low_main_prev && low_smt_curr < low_smt_prev) return true;
   
   double high_main_curr = rates_main[0].high;
   double high_main_prev = rates_main[3].high;
   double high_smt_curr = rates_smt[0].high;
   double high_smt_prev = rates_smt[3].high;
   
   for(int i = 1; i < 3; i++)
     {
      if(rates_main[i].high > high_main_curr) high_main_curr = rates_main[i].high;
      if(rates_smt[i].high > high_smt_curr)   high_smt_curr = rates_smt[i].high;
     }
   for(int i = 3; i < 10; i++)
     {
      if(rates_main[i].high > high_main_prev) high_main_prev = rates_main[i].high;
      if(rates_smt[i].high > high_smt_prev)   high_smt_prev = rates_smt[i].high;
     }
     
   if(high_main_curr > high_main_prev && high_smt_curr <= high_smt_prev) return true;
   if(high_main_curr <= high_main_prev && high_smt_curr > high_smt_prev) return true;
   
   return false;
  }
