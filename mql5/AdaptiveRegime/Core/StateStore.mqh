//+------------------------------------------------------------------+
//|                                                     StateStore.mqh|
//|                                          AdaptiveRegime EA       |
//+------------------------------------------------------------------+
#property copyright "AdaptiveRegime"
#property version   "1.00"
#property once

//+------------------------------------------------------------------+
//| Persistent key/value store for risk lockouts and management      |
//| state. Flat ANSI text file (one key=line) so it survives EA and  |
//| terminal restarts deterministically. Write-through on every Set. |
//| Not used in Strategy Tester (each run starts clean).             |
//+------------------------------------------------------------------+
#define SS_MAX_KEYS 64

string _ss_keys[SS_MAX_KEYS];
string _ss_vals[SS_MAX_KEYS];
int    _ss_count = 0;
bool   _ss_loaded = false;

string SSFileName()
  {
   return "AdaptiveRegime\\state_" + IntegerToString(InpMagic) + ".txt";
  }

void SSLoad()
  {
   _ss_count = 0;
   
   string fname = SSFileName();
   if(!FileIsExist(fname)) { _ss_loaded = true; return; }
   
   int fh = FileOpen(fname, FILE_READ|FILE_TXT|FILE_ANSI);
   if(fh == INVALID_HANDLE) { _ss_loaded = true; return; }
   
   while(!FileIsEnding(fh) && _ss_count < SS_MAX_KEYS)
     {
      string line = FileReadString(fh);
      int sep = StringFind(line, "=");
      if(sep <= 0) continue;
      _ss_keys[_ss_count] = StringSubstr(line, 0, sep);
      _ss_vals[_ss_count] = StringSubstr(line, sep + 1);
      _ss_count++;
     }
   FileClose(fh);
   _ss_loaded = true;
  }

//+------------------------------------------------------------------+
//| Full-array rewrite (bounded file, cheap) — call after batch sets |
//| Mirrors the "persist management state/lockouts across restarts"  |
//| requirement. Dirty-flag write-through is done by callers calling |
//| SSFlush().                                                       |
//+------------------------------------------------------------------+
void SSFlush()
  {
   if(MQLInfoInteger(MQL_TESTER) || MQLInfoInteger(MQL_OPTIMIZATION)) return;
   
   int fh = FileOpen(SSFileName(), FILE_WRITE|FILE_TXT|FILE_ANSI);
   if(fh == INVALID_HANDLE)
     {
      LogError("StateStore flush failed: " + IntegerToString(GetLastError()));
      return;
     }
   for(int i = 0; i < _ss_count; i++)
      FileWrite(fh, _ss_keys[i] + "=" + _ss_vals[i]);
   FileClose(fh);
  }

int SSFind(const string key)
  {
   for(int i = 0; i < _ss_count; i++)
      if(_ss_keys[i] == key) return i;
   return -1;
  }

void StringSSSet(const string key, const string value)
  {
   if(!_ss_loaded) SSLoad();
   int idx = SSFind(key);
   if(idx >= 0) { _ss_vals[idx] = value; return; }
   if(_ss_count < SS_MAX_KEYS)
     {
      _ss_keys[_ss_count] = key;
      _ss_vals[_ss_count] = value;
      _ss_count++;
     }
   else
      LogError("StateStore full; cannot store key " + key);
  }

string StringSSGet(const string key, const string defval)
  {
   if(!_ss_loaded) SSLoad();
   int idx = SSFind(key);
   if(idx < 0) return defval;
   return _ss_vals[idx];
  }

//+------------------------------------------------------------------+
//| Remove key (trade meta cleanup). Compact in place.               |
//+------------------------------------------------------------------+
void SSDelete(const string key)
  {
   if(!_ss_loaded) SSLoad();
   int idx = SSFind(key);
   if(idx < 0) return;
   for(int i = idx; i < _ss_count - 1; i++)
     {
      _ss_keys[i] = _ss_keys[i + 1];
      _ss_vals[i] = _ss_vals[i + 1];
     }
   _ss_count--;
   SSFlush();
  }

void IntSSSet(const string key, const long value)
  {
   StringSSSet(key, IntegerToString(value));
   SSFlush();
  }

long IntSSGet(const string key, const long defval)
  {
   string v = StringSSGet(key, "");
   if(StringLen(v) == 0) return defval;
   return StringToInteger(v);
  }

void DoubleSSSet(const string key, const double value)
  {
   StringSSSet(key, DoubleToString(value, 8));
   SSFlush();
  }

double DoubleSSGet(const string key, const double defval)
  {
   string v = StringSSGet(key, "");
   if(StringLen(v) == 0) return defval;
   return StringToDouble(v);
  }