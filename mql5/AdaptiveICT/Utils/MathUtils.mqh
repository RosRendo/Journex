//+------------------------------------------------------------------+
//|                                                    MathUtils.mqh |
//|                                  Copyright 2026, AdaptiveICT     |
//|                                             https://www.mql5.com |
//+------------------------------------------------------------------+
#property copyright "Copyright 2026, AdaptiveICT"
#property link      "https://www.mql5.com"
#property version   "1.00"

//+------------------------------------------------------------------+
//| General purpose Math helper utilities (Placeholder)               |
//+------------------------------------------------------------------+
double SafeDivide(double num, double den)
  {
   if(den == 0.0) return 0.0;
   return num / den;
  }
