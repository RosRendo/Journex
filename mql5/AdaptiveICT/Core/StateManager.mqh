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

// Dynamic Pyramiding & Nuke variables
ENUM_POSITION_MODE dyn_position_mode;
bool     dyn_use_equity_trail;
double   dyn_equity_trail_activate;
double   dyn_equity_trail_drop;
double   dyn_hard_stop_pct;
int      dyn_pyramid_cooldown;
double   dyn_max_balance_compounding;

bool     is_paused         = false;
bool     is_disabled       = false;
bool     bridge_connected  = false;

ENUM_TIMEFRAMES parsed_signal_tf;
string   parsed_signal_tf_str;

// Last signal cache for display
string   last_sig_type     = "NONE";
string   last_sig_grade    = "N/A";
int      last_sig_score    = 0;
double   last_sig_entry    = 0.0;
double   last_sig_sl       = 0.0;
double   last_sig_tp       = 0.0;
datetime last_sig_time     = 0;
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
   
   dyn_position_mode = InpPositionMode;
   dyn_use_equity_trail = InpUseEquityTrail;
   dyn_equity_trail_activate = InpEquityTrailActivatePct;
   dyn_equity_trail_drop = InpEquityTrailDropPct;
   dyn_hard_stop_pct = InpHardEquityStopPct;
   dyn_pyramid_cooldown = InpPyramidCooldownSec;
   dyn_max_balance_compounding = InpMaxBalanceCompounding;
   
   // Parse timeframe once to optimize scanning ticks
   string tf_upper = SanitizeStringInput(InpSignalTimeframe);
   StringToUpper(tf_upper);
   parsed_signal_tf_str = tf_upper;
   if(tf_upper == "M1") parsed_signal_tf = PERIOD_M1;
   else if(tf_upper == "M5") parsed_signal_tf = PERIOD_M5;
   else if(tf_upper == "M15") parsed_signal_tf = PERIOD_M15;
   else if(tf_upper == "H1") parsed_signal_tf = PERIOD_H1;
   else if(tf_upper == "H4") parsed_signal_tf = PERIOD_H4;
   else 
     {
      parsed_signal_tf = PERIOD_H1;
      parsed_signal_tf_str = "H1";
     }
   
   ArrayResize(executed_signals, 0);
  }
