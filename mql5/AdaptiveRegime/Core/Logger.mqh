//+------------------------------------------------------------------+
//|                                                        Logger.mqh|
//|                                          AdaptiveRegime EA       |
//+------------------------------------------------------------------+
#property copyright "AdaptiveRegime"
#property version   "1.00"
#property once

//+------------------------------------------------------------------+
//| Leveled logger: journal print + optional daily file. File and    |
//| journal lines carry the level so failures are never silent.      |
//+------------------------------------------------------------------+
#define LOG_ERROR   0
#define LOG_INFO    1
#define LOG_DEBUG   2

string   g_log_file_path   = "";
int      g_log_day         = -1;

string LogLevelTag(const int level)
  {
   if(level == LOG_ERROR) return "ERR ";
   if(level == LOG_DEBUG) return "DBG ";
   return "INFO";
  }

bool LoggerInit(const int magic)
  {
   g_log_day = -1;
   g_log_file_path = "";
   return true;
  }

void LoggerShutdown()
  {
  }

string LoggerRollFile()
  {
   MqlDateTime dt;
   TimeToStruct(TimeCurrent(), dt);
   if(dt.day_of_year == g_log_day && StringLen(g_log_file_path) > 0) return g_log_file_path;
   
   g_log_day = dt.day_of_year;
   g_log_file_path = StringFormat("AdaptiveRegime\\log_%d_%04d%02d%02d.txt",
                                  InpMagic, dt.year, dt.mon, dt.day);
   return g_log_file_path;
  }

void LoggerWriteFile(const int level, const string msg)
  {
   if(!InpLogToFile) return;
   string path = LoggerRollFile();
   int fh = FileOpen(path, FILE_READ|FILE_WRITE|FILE_TXT|FILE_ANSI);
   if(fh == INVALID_HANDLE) return;
   FileSeek(fh, 0, SEEK_END);
   FileWrite(fh, TimeToString(TimeCurrent(), TIME_DATE|TIME_SECONDS) + " " + LogLevelTag(level) + " " + msg);
   FileClose(fh);
  }

void LoggerLog(const int level, const string msg)
  {
   if(level > InpLogLevel) return;
   Print("[AR] ", LogLevelTag(level), " ", msg);
   LoggerWriteFile(level, msg);
  }

void LogError(const string msg)  { LoggerLog(LOG_ERROR, msg); }
void LogInfo(const string msg)   { LoggerLog(LOG_INFO,  msg); }
void LogDebug(const string msg)  { LoggerLog(LOG_DEBUG, msg); }