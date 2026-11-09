//+------------------------------------------------------------------+
//|                                                    RiskEngine.mqh|
//|                                          AdaptiveRegime EA       |
//+------------------------------------------------------------------+
#property copyright "AdaptiveRegime"
#property version   "1.00"
#property once
#include "..\Core\Types.mqh"
#include "..\Core\Config.mqh"
#include "..\Core\Logger.mqh"
#include "..\Core\StateStore.mqh"
#include "..\Core\MarketData.mqh"
#include "..\Execution\Executor.mqh"

//+------------------------------------------------------------------+
//| Hard-capped risk engine. The operating mode only walks WITHIN     |
//| the configured caps — it can lower risk, never raise it.          |
//+------------------------------------------------------------------+
double _re_mode_risk_cap[3] = {0.50, 0.75, 1.00}; // conservative, balanced, aggressive

//--- sizing base: conservative (balance floor) so floating gains never inflate risk

//--- state cache
double  _re_equity        = 0.0;
double  _re_balance       = 0.0;
double  _re_peak_equity   = 0.0;
double  _re_dd_pct        = 0.0;
double  _re_day_pnl       = 0.0;
double  _re_day_pnl_pct   = 0.0;
long    _re_day_stamp     = -1;
int     _re_open_count    = 0;
double  _re_open_risk_pct = 0.0;
bool    _re_lock_daily    = false;
bool    _re_lock_dd       = false;
bool    _re_lock_streak   = false;
bool    _re_lock_profit   = false;
bool    _re_lock_emerg    = false;
int     _re_consec_losses = 0;

string  _re_day_pnl_key   = "day_pnl";
string  _re_peak_key      = "peak_equity";
string  _re_day_key       = "day_stamp";
string  _re_cool_key      = "cooldown_until";

double PipSize()
  {
   double point = SymbolInfoDouble(_Symbol, SYMBOL_POINT);
   return 10.0 * point;
  }

long _re_trades_today = 0;

void RiskNoteEntry()
  {
   _re_trades_today = IntSSGet("trades_d" + IntegerToString(_re_day_stamp), 0) + 1;
   IntSSSet("trades_d" + IntegerToString(_re_day_stamp), _re_trades_today);
  }

bool RiskLockoutAny() { return _re_lock_daily || _re_lock_dd || _re_lock_streak || _re_lock_profit || _re_lock_emerg; }

string RiskLockoutText()
  {
   if(_re_lock_emerg)  return "EMERGENCY";
   if(_re_lock_dd)     return "DRAWDOWN_LOCK";
   if(_re_lock_daily)  return "DAILY_LOSS_LOCK";
   if(_re_lock_streak) return "LOSS_STREAK_COOLDOWN";
   if(_re_lock_profit) return "PROFIT_TARGET_REACHED";
   return "";
  }

double RiskEffectivePerTradePct()
  {
   double eff = InpRiskPerTradePct * _re_mode_risk_cap[(int)InpOperatingMode];
   eff = MathMin(eff, InpRiskPerTradePct); // hard cap, never bypassed
#ifdef AR_FORCE_RISKPCT
   eff = ((AR_FORCE_RISKPCT) < eff) ? (AR_FORCE_RISKPCT) : (AR_FORCE_RISKPCT);
#endif
   if(InpMaxRiskMoneyPerTrade > 0.0 && _re_equity > 0.0)
      eff = MathMin(eff, InpMaxRiskMoneyPerTrade / _re_equity * 100.0);
   return eff;
  }

//+------------------------------------------------------------------+
//| Consecutive losing positions (aggregated per position, 3 days),  |
//| newest-first walk — the same aggregation proven in testing.      |
//+------------------------------------------------------------------+
int RiskConsecutiveLosses()
  {
   datetime from = TimeCurrent() - 3 * 86400;
   if(!HistorySelect(from, TimeCurrent())) return _re_consec_losses;
   
   int total = HistoryDealsTotal();
   long   bpos[32];
   double bpnl[32];
   int    bn = 0;
   
   // Newest-first walk: bucket deals by position id, sum full P/L per position.
   // A "position" is one trade; win/loss = total incl. swap + commissions.
   for(int i = total - 1; i >= 0 && bn < 32; i--)
     {
      ulong dticket = HistoryDealGetTicket(i);
      if(dticket == 0) continue;
      if(HistoryDealGetInteger(dticket, DEAL_MAGIC) != InpMagic) continue;
      if(HistoryDealGetString(dticket, DEAL_SYMBOL) != _Symbol) continue;
      
      long pos_id = HistoryDealGetInteger(dticket, DEAL_POSITION_ID);
      double pnl = HistoryDealGetDouble(dticket, DEAL_PROFIT)
                 + HistoryDealGetDouble(dticket, DEAL_SWAP)
                 + HistoryDealGetDouble(dticket, DEAL_COMMISSION);
      
      int idx = -1;
      for(int k = 0; k < bn; k++)
         if(bpos[k] == pos_id) { idx = k; break; }
      if(idx < 0 && bn < 32) { idx = bn; bpos[idx] = pos_id; bpnl[idx] = 0.0; bn++; }
      if(idx < 0) break;
      bpnl[idx] += pnl;
     }
   
   int consec = 0;
   for(int i = 0; i < bn; i++)
     {
      if(bpnl[i] < 0.0)
         consec++;
      else
         break; // streak ends at first winning position
     }
   return consec;
  }

//+------------------------------------------------------------------+
//| Risk state update — call throttled (~10s) from OnTick            |
//+------------------------------------------------------------------+
void RiskUpdateState()
  {
   _re_equity  = AccountInfoDouble(ACCOUNT_EQUITY);
   _re_balance = AccountInfoDouble(ACCOUNT_BALANCE);
   
   // persistent equity peak
   _re_peak_equity = DoubleSSGet(_re_peak_key, _re_equity);
   if(_re_equity > _re_peak_equity)
     {
      _re_peak_equity = _re_equity;
      DoubleSSSet(_re_peak_key, _re_peak_equity);
     }
   if(_re_peak_equity > 0.0)
      _re_dd_pct = (_re_peak_equity - _re_equity) / _re_peak_equity * 100.0;
   else
      _re_dd_pct = 0.0;
   
   // daily anchor stamp
   long day_stamp = 0;
   if(InpDayAnchor == DAY_SERVER_MIDNIGHT)
     {
      MqlDateTime dt;
      TimeToStruct(TimeCurrent(), dt);
      day_stamp = (long)dt.year * 10000 + dt.mon * 100 + dt.day;
     }
   else
      day_stamp = (long)(TimeCurrent() / 86400);
   
   _re_day_stamp = IntSSGet(_re_day_key, day_stamp);
   if(_re_day_stamp != day_stamp)
     {
      IntSSSet(_re_day_key, day_stamp);
      DoubleSSSet(_re_day_pnl_key, 0.0);
      _re_day_pnl = 0.0;
     }
   else
      _re_day_pnl = DoubleSSGet(_re_day_pnl_key, 0.0);
   
   if(_re_balance > 0.0)
      _re_day_pnl_pct = _re_day_pnl / _re_balance * 100.0;
   
   // open exposure
   _re_open_count = 0;
   for(int i = PositionsTotal() - 1; i >= 0; i--)
     {
      ulong pticket = PositionGetTicket(i);
      if(pticket == 0) continue;
      if(PositionGetInteger(POSITION_MAGIC) != InpMagic) continue;
      if(PositionGetString(POSITION_SYMBOL) != _Symbol) continue;
      _re_open_count++;
     }
   
   // trades-today counter follows the day anchor
   _re_trades_today = IntSSGet("trades_d" + IntegerToString(day_stamp), 0);
   
   // lockouts
   _re_lock_daily  = (InpMaxDailyLossPct > 0.0 && _re_day_pnl_pct <= -InpMaxDailyLossPct);
   _re_lock_dd     = (InpMaxDrawdownPct  > 0.0 && _re_dd_pct    >=  InpMaxDrawdownPct);
   _re_lock_profit = (InpDailyProfitLockout && InpDailyProfitTargetPct > 0.0 && _re_day_pnl_pct >= InpDailyProfitTargetPct);
   _re_lock_emerg  = (InpEmergencyStopPct > 0.0 && _re_dd_pct >= InpEmergencyStopPct);
   
   datetime cool_until = (datetime)IntSSGet(_re_cool_key, 0);
   _re_lock_streak = (cool_until > 0 && TimeCurrent() < cool_until);
   
   if(!_re_lock_streak)
     {
      _re_consec_losses = RiskConsecutiveLosses();
      if(InpMaxConsecutiveLosses > 0 && _re_consec_losses >= InpMaxConsecutiveLosses)
        {
         IntSSSet(_re_cool_key, (long)(TimeCurrent() + InpConsecLossCooldownMin * 60));
         _re_lock_streak = true;
         LogError(StringFormat("RISK: %d consecutive losing positions -> cooldown %d min",
                               _re_consec_losses, InpConsecLossCooldownMin));
        }
     }
   
   if(_re_lock_emerg && InpEmergencyCloseAll)
     {
      LogError(StringFormat("RISK: EMERGENCY STOP dd=%.2f%% >= %.2f%% -> closing all", _re_dd_pct, InpEmergencyStopPct));
      RiskCloseAllMine();
     }
  }

void RiskCloseAllMine()
  {
   for(int i = PositionsTotal() - 1; i >= 0; i--)
     {
      ulong pticket = PositionGetTicket(i);
      if(pticket == 0) continue;
      if(PositionGetInteger(POSITION_MAGIC) != InpMagic) continue;
      if(PositionGetString(POSITION_SYMBOL) != _Symbol) continue;
      if(!EEClosePosition(pticket))
         LogError("RISK: failed to close ticket " + IntegerToString((int)pticket));
     }
  }

//+------------------------------------------------------------------+
//| Real aggregate open risk %: sum of stop-distance value per owned  |
//| position. Uses the INITIAL SL from management meta when present   |
//| (trailing a winner must not free up phantom risk budget).         |
//+------------------------------------------------------------------+
double RiskOpenAggregatePct()
  {
   double tick_size  = SymbolInfoDouble(_Symbol, SYMBOL_TRADE_TICK_SIZE);
   double tick_value = SymbolInfoDouble(_Symbol, SYMBOL_TRADE_TICK_VALUE);
   if(tick_size <= 0.0 || tick_value <= 0.0) return 0.0;
   
   double total = 0.0;
   ulong tickets[];
   int n = EEMine(tickets);
   for(int i = 0; i < n; i++)
     {
      if(!PositionSelectByTicket(tickets[i])) continue;
      double tkt = (double)tickets[i];
      double entry = PositionGetDouble(POSITION_PRICE_OPEN);
      double sl = DoubleSSGet("tm" + DoubleToString(tkt, 0) + "_isl", 0.0);
      if(sl <= 0.0)
         sl = PositionGetDouble(POSITION_SL);
      if(sl <= 0.0)
         continue;
      double dist = MathAbs(entry - sl);
      double lots = PositionGetDouble(POSITION_VOLUME);
      total += (dist / tick_size) * tick_value * lots;
     }
   if(_re_equity <= 0.0) return 0.0;
   return total / _re_equity * 100.0;
  }

//+------------------------------------------------------------------+
//| Raw volume calculation from risk math (no normalization)         |
//+------------------------------------------------------------------+
double RiskRawLots(const double entry, const double sl, const double risk_pct)
  {
   double sizing_base = MathMin(_re_equity, _re_balance);
   double tick_size  = SymbolInfoDouble(_Symbol, SYMBOL_TRADE_TICK_SIZE);
   double tick_value = SymbolInfoDouble(_Symbol, SYMBOL_TRADE_TICK_VALUE);
   if(tick_size <= 0.0 || tick_value <= 0.0) return 0.0;
   
   double dist = MathAbs(entry - sl);
   if(dist <= 0.0) return 0.0;
   
   double money_per_lot = (dist / tick_size) * tick_value;
   if(money_per_lot <= 0.0) return 0.0;
   
   double risk_money = sizing_base * risk_pct / 100.0;
   return risk_money / money_per_lot;
  }

//+------------------------------------------------------------------+
//| Volume normalization: step, min, max + margin feasibility        |
//+------------------------------------------------------------------+
bool ExecNormalizeLots(double &lots, string &err)
  {
   double minv  = SymbolInfoDouble(_Symbol, SYMBOL_VOLUME_MIN);
   double maxv  = SymbolInfoDouble(_Symbol, SYMBOL_VOLUME_MAX);
   double step  = SymbolInfoDouble(_Symbol, SYMBOL_VOLUME_STEP);
   if(minv <= 0.0 || step <= 0.0) { err = "bad volume specs"; return false; }
   
   lots = MathFloor(lots / step) * step;
   if(lots < minv) { err = "lots below min"; return false; }
   if(maxv > 0.0 && lots > maxv) lots = maxv;
   lots = NormalizeDouble(lots, 2);
   return true;
  }

//+------------------------------------------------------------------+
//| Full pre-trade gate + allocation. Returns reject reason on fail. |
//| Called by an engine before it fires a signal at the executor.    |
//+------------------------------------------------------------------+
TradeAllocation RiskGateSignal(const TradeSignal &sig, const string symbol_ctx)
  {
   double sizing_base_g = MathMin(_re_equity, _re_balance); // align with RiskRawLots base
   TradeAllocation a;
   a.ok = false; a.lots = 0.0; a.risk_pct = 0.0; a.risk_money = 0.0; a.reject_reason = "";
   
   if(RiskLockoutAny() && _re_lock_emerg)
     { a.reject_reason = "lockout:" + RiskLockoutText(); return a; }
   
   if(RiskLockoutAny())
     { a.reject_reason = RiskLockoutText(); return a; }
   
   // sessions
   if(InpSessionFilter)
     {
      MqlDateTime dt;
      TimeToStruct(TimeCurrent(), dt);
      if(dt.day_of_week == 1 && !InpAllowMonday) { a.reject_reason = "session:monday_blocked"; return a; }
      if(dt.day_of_week == 5 && !InpAllowFriday) { a.reject_reason = "session:friday_blocked"; return a; }
      if(dt.hour < ARTradeStartHour() || dt.hour >= ARTradeEndHour())
         { a.reject_reason = "session:outside_window"; return a; }
      if(dt.day_of_week == 5 && dt.hour >= InpFridayCutoffHour)
         { a.reject_reason = "session:friday_cutoff"; return a; }
     }
   
   // spread
   double spread = MdSpreadPoints();
   if(spread > InpMaxSpreadPoints)
     { a.reject_reason = StringFormat("spread:%.0f>%.0f", spread, (double)InpMaxSpreadPoints); return a; }
   
   // position count cap
   if(InpMaxOpenPositions > 0 && _re_open_count >= InpMaxOpenPositions)
     { a.reject_reason = StringFormat("max_positions:%d", _re_open_count); return a; }
   
   // trades-per-day cap
   if(InpMaxTradesPerDay > 0 && _re_trades_today >= InpMaxTradesPerDay)
     { a.reject_reason = StringFormat("daily_trade_cap:%d", (int)_re_trades_today); return a; }
   
   // SL distance sanity: ATR floor + spread floor (digit-safe, no pips)
   MqlTick g_t;
   double g_spread_price = SymbolInfoTick(_Symbol, g_t) ? (g_t.ask - g_t.bid) : 0.0;
   double atr_entry_g = 0.0, atr_setup_g = 0.0;
   MdIndValue(InpEntryTF, 0, InpRegAtrPeriod, 1, atr_entry_g);
   MdIndValue(InpSetupTF, 0, InpRegAtrPeriod, 1, atr_setup_g);
   double dist_money = MathAbs(sig.entry - sig.sl);
   double min_sl = MdMinSLDist(atr_entry_g);
   if(dist_money < min_sl)
     { a.reject_reason = StringFormat("sl_below_floor:%.2f<%.2f", dist_money, min_sl); return a; }
   double max_sl = MdMaxSLDist(atr_setup_g);
   if(max_sl > 0.0 && dist_money > max_sl)
     { a.reject_reason = StringFormat("sl_above_cap:%.2f>%.2f", dist_money, max_sl); return a; }
   
   // RR floor at entry
   double rr = 0.0;
   if(sig.tp > 0.0)
     {
      double rr_buy  = (sig.tp - sig.entry) / MathMax(1e-9, sig.entry - sig.sl);
      double rr_sell = (sig.entry - sig.tp) / MathMax(1e-9, sig.sl - sig.entry);
      rr = (sig.dir > 0) ? rr_buy : rr_sell;
      if(rr < ARMinRR())
        { a.reject_reason = StringFormat("rr:%.2f<%.2f", rr, ARMinRR()); return a; }
     }
   
   double eff_pct = RiskEffectivePerTradePct();
   if(eff_pct <= 0.0) { a.reject_reason = "risk_pct<=0"; return a; }
   double open_risk = RiskOpenAggregatePct();
   if(open_risk + eff_pct > InpMaxAggregateRiskPct)
     { a.reject_reason = StringFormat("aggregate_risk:%.2f+%.2f>%.2f", open_risk, eff_pct, InpMaxAggregateRiskPct); return a; }
    
   double lots = RiskRawLots(sig.entry, sig.sl, eff_pct);
   string lerr = "";
   if(!ExecNormalizeLots(lots, lerr))
     {
      bool minv_ok = (lerr == "lots below min") && (AROvershoot() > 0.0);
      if(minv_ok)
        {
         double minv_lot = SymbolInfoDouble(_Symbol, SYMBOL_VOLUME_MIN);
         double tks = SymbolInfoDouble(_Symbol, SYMBOL_TRADE_TICK_SIZE);
         double tkv = SymbolInfoDouble(_Symbol, SYMBOL_TRADE_TICK_VALUE);
         if(minv_lot > 0.0 && tks > 0.0 && tkv > 0.0)
           {
            double mp_lot = (MathAbs(sig.entry - sig.sl) / tks) * tkv;
            double risk_minlot = mp_lot * minv_lot;
            double risk_cap = sizing_base_g * eff_pct * AROvershoot() / 100.0;
            if(risk_minlot <= risk_cap)
              {
               lots = minv_lot;
               LogInfo(StringFormat("RISK: min-lot forced %.2f (risk=%.1f cap=%.1f)", lots, risk_minlot, risk_cap));
              }
            else
              { a.reject_reason = StringFormat("lots:minlot risk %.1f > cap %.1f", risk_minlot, risk_cap); return a; }
           }
         else
           { a.reject_reason = "lots:" + lerr; return a; }
        }
      else
        { a.reject_reason = "lots:" + lerr; return a; }
     }
   
   //--- margin guards: tight stops must not create outsized notional exposure
   ENUM_ORDER_TYPE ot = (sig.dir > 0) ? ORDER_TYPE_BUY : ORDER_TYPE_SELL;
   double margin_need = 0.0;
   if(!OrderCalcMargin(ot, _Symbol, lots, sig.entry, margin_need))
     { a.reject_reason = "margin_calc_fail"; return a; }
   double margin_now = AccountInfoDouble(ACCOUNT_MARGIN);
   if(margin_need > _re_equity * ARMarginCapPct() / 100.0)
      {
      a.reject_reason = StringFormat("margin_single:%.1f%%", margin_need / _re_equity * 100.0);
      return a;
     }
   if(margin_now + margin_need > _re_equity * InpMaxMarginTotalPct / 100.0)
     {
      a.reject_reason = StringFormat("margin_total:%.1f+%.1f", margin_now, margin_need);
      return a;
     }
   
   a.lots = lots;
   a.risk_pct = eff_pct;
   a.risk_money = sizing_base_g * eff_pct / 100.0;
   a.ok = true;
   return a;
  }

//+------------------------------------------------------------------+
//| Register actual P/L into the daily counter (called on close)     |
//+------------------------------------------------------------------+
void RiskRegisterClosedPnL(const double pnl)
  {
   _re_day_pnl = DoubleSSGet(_re_day_pnl_key, 0.0) + pnl;
   DoubleSSSet(_re_day_pnl_key, _re_day_pnl);
  }

string RiskStateText()
  {
   return StringFormat("eq=%.2f bal=%.2f dd=%.2f%% dayPNL=%.2f(%.2f%%) open=%d blk=%s",
                       _re_equity, _re_balance, _re_dd_pct, _re_day_pnl, _re_day_pnl_pct,
                       _re_open_count,
                       RiskLockoutAny() ? RiskLockoutText() : "none");
  }