//+------------------------------------------------------------------+
//|                                                        Volume.mqh |
//|                                  Copyright 2026, AdaptiveICT     |
//|                                             https://www.mql5.com |
//+------------------------------------------------------------------+
#property copyright "Copyright 2026, AdaptiveICT"
#property link      "https://www.mql5.com"
#property version   "1.00"

//+------------------------------------------------------------------+
//| Check if current volume is a spike above N-period average         |
//+------------------------------------------------------------------+
bool CheckVolumeSpike(ENUM_TIMEFRAMES tf, int avg_period, double ratio)
  {
   long volume[];
   ArraySetAsSeries(volume, true);
   int copied = CopyTickVolume(_Symbol, tf, 0, avg_period + 1, volume);
   if(copied <= avg_period) return false;
   double sum = 0.0;
   for(int i = 1; i <= avg_period; i++) sum += (double)volume[i];
   double avg = sum / (double)avg_period;
   if(avg > 0 && (double)volume[0] >= avg * ratio) return true;
   return false;
  }
