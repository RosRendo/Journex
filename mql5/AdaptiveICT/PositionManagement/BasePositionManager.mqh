//+------------------------------------------------------------------+
//|                                          BasePositionManager.mqh |
//|                                  Copyright 2026, AdaptiveICT     |
//|                                             https://www.mql5.com |
//+------------------------------------------------------------------+
#property copyright "Copyright 2026, AdaptiveICT"
#property link      "https://www.mql5.com"
#property version   "1.00"
#property once

//+------------------------------------------------------------------+
//| Base class defining Position Manager Interface for open trades   |
//+------------------------------------------------------------------+
class BasePositionManager
  {
public:
   virtual void ManagePositions() = 0;
   virtual void RegisterPosition(ulong ticket, double original_sl, double tp1, double tp2, double tp3) {}
   
   virtual ~BasePositionManager() {}
  };
