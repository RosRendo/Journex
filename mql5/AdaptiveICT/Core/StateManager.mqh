//+------------------------------------------------------------------+
//|                                                 StateManager.mqh |
//|                                  Copyright 2026, AdaptiveICT     |
//|                                             https://www.mql5.com |
//+------------------------------------------------------------------+
#property copyright "Copyright 2026, AdaptiveICT"
#property link      "https://www.mql5.com"
#property version   "1.00"
#property once

#include "Config.mqh"
#include "../PositionManagement/BasePositionManager.mqh"
#include "../Strategies/BaseStrategy.mqh"

//+------------------------------------------------------------------+
//| Sanitize string inputs by removing MT5 preset metadata suffixes |
//+------------------------------------------------------------------+
string SanitizeStringInput(string input_val)
  {
   int find_idx = StringFind(input_val, "||");
   if(find_idx >= 0)
     {
      input_val = StringSubstr(input_val, 0, find_idx);
     }
   StringTrimLeft(input_val);
   StringTrimRight(input_val);
   return input_val;
  }

BasePositionManager* active_position_manager = NULL;
BaseStrategy*        active_strategy         = NULL;

// Internal Global Variables
datetime last_settings_poll = 0;
datetime last_signal_poll   = 0;
int      report_interval    = 10;                     // Seconds between heartbeat reports
int      settings_interval  = 5;                      // Seconds between settings checks
int      signal_interval    = 30;                     // Seconds between signal checks

// State cached variables (can be modified dynamically via Dashboard)
double   risk_percent;
double   max_daily_loss;
int      min_score;
double   min_rr;
string   scan_session;
string   scan_type;
string   signal_timeframe;
string   context_timeframe;
string   smt_symbol;

bool     is_paused         = false;
bool     is_disabled       = false;
bool     bridge_connected  = false;

// Last signal cache for display
string   last_sig_type     = "NONE";
int      last_sig_score    = 0;
double   last_sig_entry    = 0.0;
double   last_sig_sl       = 0.0;
double   last_sig_tp       = 0.0;
datetime last_sig_time     = 0;
string   last_sig_grade    = "N/A";
datetime last_report_time  = 0;

// Array to track executed signals (prevent double execution)
string   executed_signals[];

//+------------------------------------------------------------------+
//| Initialize State Variables to Input Defaults                     |
//+------------------------------------------------------------------+
void InitState()
  {
   risk_percent   = InpRiskPercent;
   max_daily_loss = InpMaxDailyLossPct;
   min_score      = InpMinScore;
   min_rr         = InpMinRR;
   scan_session   = SanitizeStringInput(InpSession);
   scan_type      = SanitizeStringInput(InpSignalType);
   signal_timeframe = SanitizeStringInput(InpSignalTimeframe);
   context_timeframe = SanitizeStringInput(InpContextTimeframe);
   smt_symbol     = SanitizeStringInput(InpSMTSymbol);
   ArrayResize(executed_signals, 0);
  }
