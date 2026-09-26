 //+------------------------------------------------------------------+
//|                                                  AdaptiveICT.mq5 |
//|                                  Copyright 2026, AdaptiveICT     |
//|                                             https://www.mql5.com |
//+------------------------------------------------------------------+
#property copyright "Copyright 2026, AdaptiveICT"
#property link      "https://www.mql5.com"
//+------------------------------------------------------------------+
//| CHANGELOG - AdaptiveICT v0.5                                     |
//| - v0.1: Removed MODE_GRID & multiplier violations.               |
//|         Implemented Market Regime Gate & explainable Scoring.    |
//|         Added Structural Stop Loss model with ATR buffer.        |
//|         Added Research Mode & missed opportunity logging.        |
//| - v0.4: Implemented Trade Health Engine (10 sub-factors, 0-100). |
//|         Added post-entry thesis invalidation exit.               |
//| - v0.5: Implemented StatisticsEngine with 5-band evaluation.     |
//|         Added Recovery State Machine (6 protection states).      |
//|         Added Model Status validation & risk capping.            |
//|         Hardened edge cases (ATR=0, manual exit, min lot).       |
//+------------------------------------------------------------------+
#property version   "0.50"
#property description "Professional Smart Money Concepts (SMC) & ICT Scanner EA"

#include "Core/EAController.mqh"

EAController controller;

//+------------------------------------------------------------------+
//| Expert initialization function                                   |
//+------------------------------------------------------------------+
int OnInit()
  {
   return controller.Initialize();
  }

//+------------------------------------------------------------------+
//| Expert deinitialization function                                 |
//+------------------------------------------------------------------+
void OnDeinit(const int reason)
  {
   controller.Shutdown(reason);
  }

//+------------------------------------------------------------------+
//| Expert tick function                                             |
//+------------------------------------------------------------------+
void OnTick()
  {
   controller.OnTick();
  }

//+------------------------------------------------------------------+
//| Timer event function                                             |
//+------------------------------------------------------------------+
void OnTimer()
  {
   controller.OnTimer();
  }
