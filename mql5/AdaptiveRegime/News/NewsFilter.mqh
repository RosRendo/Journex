//+------------------------------------------------------------------+
//|                                                    NewsFilter.mqh|
//|                                          AdaptiveRegime EA       |
//+------------------------------------------------------------------+
#property copyright "AdaptiveRegime"
#property version   "1.00"
#property once
#include "..\Core\Types.mqh"
#include "..\Core\Config.mqh"

//+------------------------------------------------------------------+
//| News blackout: manual daily windows "HH:MM-HH:MM;HH:MM-HH:MM".   |
//| Deterministic and auditable (no silent fail-open): when the      |
//| filter is enabled but the schedule fails to parse, the choice    |
//| is explicit: NEWS_DATA_ALLOW trades on, NEWS_DATA_BLOCK stops.   |
//| A live provider can hook into NEWS_OnDataUnavailable() later.    |
//+------------------------------------------------------------------+
int    _nf_start_min[16];
int    _nf_end_min[16];
int    _nf_count = 0;
int    _nf_parse_day = -1;
string _nf_last_src = "";
bool   _nf_parse_ok = false;
bool   _nf_logged_today = false;

void NEWS_Parse(const string src)
  {
   _nf_parse_ok = true;
   _nf_count = 0;
   string parts[];
   int n = StringSplit(src, ';', parts);
   for(int i = 0; i < n && _nf_count < 16; i++)
     {
      string w = parts[i];
      StringTrimLeft(w);
      StringTrimRight(w);
      int dash = StringFind(w, "-");
      if(dash <= 0) { _nf_parse_ok = false; continue; }
      string s1 = StringSubstr(w, 0, dash);
      string s2 = StringSubstr(w, dash + 1);
      if(StringLen(s1) != 5 || StringLen(s2) != 5)
        { _nf_parse_ok = false; continue; }
      int h1 = (int)StringToInteger(StringSubstr(s1, 0, 2));
      int m1 = (int)StringToInteger(StringSubstr(s1, 3, 2));
      int h2 = (int)StringToInteger(StringSubstr(s2, 0, 2));
      int m2 = (int)StringToInteger(StringSubstr(s2, 3, 2));
      if(h1 < 0 || h1 > 23 || m1 < 0 || m1 > 59 || h2 < 0 || h2 > 23 || m2 < 0 || m2 > 59
         || StringSubstr(s1, 2, 1) != ":" || StringSubstr(s2, 2, 1) != ":")
        { _nf_parse_ok = false; continue; }
      _nf_start_min[_nf_count] = h1 * 60 + m1;
      _nf_end_min[_nf_count]   = h2 * 60 + m2;
      _nf_count++;
     }
   if(src != _nf_last_src || !_nf_logged_today)
     {
      LogInfo(StringFormat("NEWS: schedule parsed windows=%d ok=%s", _nf_count, _nf_parse_ok ? "yes" : "NO"));
      _nf_logged_today = true;
      _nf_last_src = src;
     }
  }

string NewsStateText()
  {
   if(!InpNewsEnabled) return "OFF";
   return NewsBlocked() ? "BLOCKED" : "OK";
  }

bool NewsBlocked()
  {
   if(!InpNewsEnabled) return false;
   
   // re-parse once per day or when source changes
   int day = (int)(TimeCurrent() / 86400);
   if(day != _nf_parse_day || _nf_last_src != InpNewsManualBlackout)
     {
      _nf_parse_day = day;
      NEWS_Parse(InpNewsManualBlackout);
     }
   
   // explicit, audible unavailable-policy (never silent)
   if(!_nf_parse_ok)
     {
      bool block = (InpNewsUnavailablePolicy == NEWS_DATA_BLOCK);
      LogError(StringFormat("NEWS: schedule unavailable -> policy %s",
                            block ? "BLOCK" : "ALLOW"));
      return block;
     }
   
   MqlDateTime dt;
   TimeToStruct(TimeCurrent(), dt);
   int now = dt.hour * 60 + dt.min;
   for(int i = 0; i < _nf_count; i++)
      if(now >= _nf_start_min[i] && now < _nf_end_min[i])
         return true;
   return false;
  }