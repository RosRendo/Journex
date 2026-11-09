//+------------------------------------------------------------------+
//|                                                    Dashboard.mqh |
//|                                          AdaptiveRegime EA       |
//+------------------------------------------------------------------+
#property copyright "AdaptiveRegime"
#property version   "1.00"
#property once
#include "..\Core\Types.mqh"
#include "..\Core\Config.mqh"
#include "..\Core\Logger.mqh"

//+------------------------------------------------------------------+
//| Lightweight chart panel: fixed label rows on the right side.     |
//| Skipped in tester optimization; throttled updates.               |
//+------------------------------------------------------------------+
#define DB_PREFIX    "ARD_"
#define DB_MAX_ROWS  10
datetime _db_last_update = 0;
color    _db_fg          = clrSilver;

// forward decls (implemented in RegimeDetector.mqh, linked later by EA)
string RegName(const ENUM_REGIME r);
string VolName(const ENUM_VOL_STATE v);
#define RegimeNameForDb(r) RegName(r)
#define VolNameForDb(v)    VolName(v)

string DBRowName(const int i)
  {
   return DB_PREFIX + IntegerToString(i);
  }

void DbInit()
  {
   for(int i = 0; i < DB_MAX_ROWS; i++)
     {
      string name = DBRowName(i);
      if(ObjectFind(0, name) < 0)
        {
         ObjectCreate(0, name, OBJ_LABEL, 0, 0, 0);
         ObjectSetInteger(0, name, OBJPROP_CORNER, CORNER_RIGHT_LOWER);
         ObjectSetInteger(0, name, OBJPROP_ANCHOR, ANCHOR_RIGHT_LOWER);
         ObjectSetInteger(0, name, OBJPROP_XDISTANCE, 10);
         ObjectSetInteger(0, name, OBJPROP_YDISTANCE, 14 + i * 16);
         ObjectSetInteger(0, name, OBJPROP_FONTSIZE, 9);
         ObjectSetString(0, name, OBJPROP_FONT, "Consolas");
         ObjectSetInteger(0, name, OBJPROP_COLOR, _db_fg);
         ObjectSetInteger(0, name, OBJPROP_SELECTABLE, false);
         ObjectSetInteger(0, name, OBJPROP_HIDDEN, true);
         ObjectSetString(0, name, OBJPROP_TEXT, " ");
        }
     }
  }

void DbShutdown()
  {
   ObjectsDeleteAll(0, DB_PREFIX);
  }

void DbSetRow(const int i, const string text, const color clr)
  {
   string name = DBRowName(i);
   if(ObjectFind(0, name) < 0) DbInit();
   ObjectSetString(0, name, OBJPROP_TEXT, text);
   ObjectSetInteger(0, name, OBJPROP_COLOR, clr);
  }

//+------------------------------------------------------------------+
//| Refresh all rows (call throttled ~1s; skipped in optimization)   |
//+------------------------------------------------------------------+
void DbUpdate(const RegimeResult &regime, const string risk_line,
              const string lockout_text, const double spread_pts,
              const int open_positions, const string sel_text,
              const string news_text)
  {
   if(!InpDashboardEnabled) return;
   if(MQLInfoInteger(MQL_OPTIMIZATION)) return;
   datetime now = TimeCurrent();
   if(now == _db_last_update) return;
   _db_last_update = now;
   
   color regime_clr = clrSilver;
   switch(regime.regime)
     {
      case REGIME_BULL_STRONG: regime_clr = clrLime;      break;
      case REGIME_BEAR_STRONG: regime_clr = clrTomato;    break;
      case REGIME_VOL_EXPANSION: regime_clr = clrOrange;  break;
      case REGIME_RANGE: regime_clr = clrGold;            break;
      case REGIME_REVERSAL: regime_clr = clrAqua;         break;
      default:                                            break;
     }
   
   MqlDateTime dt;
   TimeToStruct(now, dt);
   
   DbSetRow(0, "AdaptiveRegime " + TimeToString(now, TIME_MINUTES), clrWhite);
   DbSetRow(1, StringFormat("Regime %s conf=%d vol=%s bars=%d",
                            RegimeNameForDb(regime.regime), regime.confidence,
                            VolNameForDb(regime.vol), (int)regime.bars_in_regime), regime_clr);
   DbSetRow(2, "Engines: " + sel_text, (sel_text == "NONE") ? clrGray : clrDeepSkyBlue);
   DbSetRow(3, StringFormat("Spread %.0f pts  Open %d  News %s", spread_pts, open_positions, news_text),
            (news_text == "BLOCKED") ? clrOrange : _db_fg);
   DbSetRow(4, risk_line, (lockout_text != "") ? clrRed : clrLime);
   for(int i = 5; i < DB_MAX_ROWS; i++) DbSetRow(i, " ", _db_fg);
  }