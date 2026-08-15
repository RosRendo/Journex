//+------------------------------------------------------------------+
//|                                                 BaseStrategy.mqh |
//|                                  Copyright 2026, AdaptiveICT     |
//|                                             https://www.mql5.com |
//+------------------------------------------------------------------+
#property copyright "Copyright 2026, AdaptiveICT"
#property link      "https://www.mql5.com"
#property version   "1.00"
#property once

#include "../Core/Types.mqh"

//+------------------------------------------------------------------+
//| Base class defining Strategy Interface for signal generation      |
//+------------------------------------------------------------------+
class BaseStrategy
  {
public:
   virtual bool Scan(ENUM_TIMEFRAMES tf, string tf_str, TradeSignal &candidate) = 0;
   virtual ConfluenceResult CalculateConfluence(const TradeSignal &candidate) = 0;
   
   virtual ~BaseStrategy() {}
  };
