//+------------------------------------------------------------------+
//| SetupThrottle: rolling per-setup performance self-throttle       |
//| Tracks last K closed-trade PnL per setup (attr via order         |
//| comment) and blocks new entries of a setup whose rolling net     |
//| went negative after MinTrades observed. Reset on EA restart.     |
//+------------------------------------------------------------------+
#define ST_K 12
#define ST_MIN_TRADES 8

datetime g_st_block_until[3]      = {0, 0, 0};
int     g_st_pos[3]              = {0, 0, 0};
int     g_st_cnt[3]              = {0, 0, 0};
bool    g_st_block_logged[3]     = {false, false, false};
double  g_st_buf[3][ST_K];

int StIndex(const string &comment)
  {
   if(StringFind(comment, "sweep") >= 0)      return 0;
   if(StringFind(comment, "open_break") >= 0) return 1;
   if(StringFind(comment, "range_break") >= 0) return 2;
   return -1;
  }

string StName(const int idx)
  {
   switch(idx)
     {
      case 0: return "sweep";
      case 1: return "openbreak";
      case 2: return "rangebreak";
     }
   return "";
  }

void ThrottleRecordClosed(const string &comment, const double pnl)
  {
   int idx = StIndex(comment);
   if(idx < 0) return;
   g_st_buf[idx][g_st_pos[idx]] = pnl;
   g_st_pos[idx] = (g_st_pos[idx] + 1) % ST_K;
   if(g_st_cnt[idx] < ST_K) g_st_cnt[idx]++;
  }

bool ThrottleBlock(const string &setup_name)
  {
   if(!ARSelfThrottle()) return false;
   int idx = -1;
   for(int i = 0; i < 3; i++)
      if(StName(i) == setup_name) { idx = i; break; }
   if(idx < 0) return false;
   datetime now = TimeCurrent();
   if(g_st_block_until[idx] > now)
      return true;
   if(g_st_block_until[idx] > 0 && g_st_block_until[idx] <= now)
     {
      LogInfo(StringFormat("THROTTLE: %s released after cooldown, counters reset", StName(idx)));
      g_st_block_until[idx] = 0;
      g_st_cnt[idx] = 0;
      g_st_pos[idx] = 0;
      g_st_block_logged[idx] = false;
      return false;
     }
   if(g_st_cnt[idx] < ST_MIN_TRADES)
     {
      g_st_block_logged[idx] = false;
      return false;
     }
   int newest = (g_st_pos[idx] + ST_K - 1) % ST_K;
   double net = 0.0;
   for(int k = 0; k < ST_MIN_TRADES; k++)
      net += g_st_buf[idx][(newest - k + ST_K) % ST_K];
   bool block = (net < 0.0);
   if(block && !g_st_block_logged[idx])
     {
      LogInfo(StringFormat("THROTTLE: %s blocked (last %d trades net=%.2f), cooldown 24h", StName(idx), ST_MIN_TRADES, net));
      g_st_block_until[idx] = now + 86400;
      g_st_block_logged[idx] = true;
     }
   return block;
  }
