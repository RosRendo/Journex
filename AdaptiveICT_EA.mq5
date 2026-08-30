//+------------------------------------------------------------------+
//|                                              AdaptiveICT_EA.mq5  |
//|                                  Copyright 2026, Antigravity AI   |
//|                                             https://localhost    |
//+------------------------------------------------------------------+
#property copyright "Copyright 2026, Antigravity AI"
#property link      "https://localhost"
#property version   "1.00"
#property strict

// --- Standard Library ---
#include <Trade\Trade.mqh>
CTrade trade;

// --- Inputs: Broker & Identity ---
input group "=== Bot Identity ==="
input int      InpMagic             = 88001;          // Magic Number
input string   InpBridgeURL         = "http://127.0.0.1:5003"; // Bridge URL (No trailing slash)

input group "=== Risk & Trade Management ==="
input double   InpRiskPercent       = 1.0;            // Risk Per Trade (%)
input double   InpMaxDailyLossPct   = 3.0;            // Max Daily Loss (%)
input int      InpMaxOpenTrades     = 3;              // Max Concurrent Open Trades
input double   InpMinRR             = 1.5;            // Minimum Risk Reward Ratio
input bool     InpUseBE             = true;           // Break-Even on TP1 Activation
input bool     InpTrailingStop      = true;           // Enable Trailing Stop
input double   InpTrailATRMult      = 1.5;            // Trailing Stop ATR Multiple

input group "=== Signals Scanning Settings ==="
input int      InpMinScore          = 70;             // Minimum Confluence Score (0-100)
input string   InpTimeframe         = "ALL";          // M5 / M15 / H1 / H4 / ALL
input string   InpSession           = "both";         // london / ny / both / all
input string   InpSignalType        = "all";          // all / ict_scalper / ict_intraday

input group "=== Technical Indicator Filters ==="
input bool     InpUseRSI            = true;           // Enable RSI Filter
input int      InpRSIPeriod         = 14;             // RSI Period
input double   InpRSIBuyMin         = 50.0;           // RSI Buy Min
input double   InpRSIBuyMax         = 70.0;           // RSI Buy Max
input double   InpRSISellMin        = 30.0;           // RSI Sell Min
input double   InpRSISellMax        = 50.0;           // RSI Sell Max
input bool     InpUseADX            = true;           // Enable ADX Filter
input int      InpADXPeriod         = 14;             // ADX Period
input double   InpADXMin            = 20.0;           // ADX Minimum strength
input double   InpADXMax            = 50.0;           // ADX Maximum strength
input bool     InpUseVolume         = true;           // Enable Volume Filter
input int      InpVolAvgPeriod      = 20;             // Volume Avg Period
input double   InpVolMinRatio       = 1.2;            // Volume Spike Ratio (e.g. 1.2x)
input bool     InpUseEMAFilter      = true;           // Enable EMA Alignment Filter
input int      InpEMA1Period        = 20;             // Fast EMA Period
input int      InpEMA2Period        = 50;             // Medium EMA Period
input int      InpEMA3Period        = 200;            // Slow EMA Period

input group "=== Execution & Spread Filters ==="
input int      InpMaxSpreadPoints   = 20;             // Maximum Spread (points)
input bool     InpAllowMonday       = true;           // Allow Monday Trading
input bool     InpAllowFriday       = true;           // Allow Friday Trading
input int      InpFridayCloseHour   = 16;             // Friday Close Hour (Server time)
input bool     InpUseNewsFilter     = true;           // Enable News Filter (Poll from Bridge)

input group "=== SMT & MTF Settings ==="
input bool     InpUseSMT            = true;           // Enable SMT Divergence Filter
input string   InpSMTSymbol         = "GBPUSD";       // Correlated SMT Symbol
input double   InpSMTMinPips        = 1.0;            // Minimum SMT Divergence (pips)
input bool     InpUseMTFConfluence  = true;           // Enable Multi-Timeframe Alignment


// --- Scanner Structures ---
struct MqlSwing
  {
   int               index;
   double            price;
   datetime          time;
   bool              is_high;
  };

struct MqlFVG
  {
   bool              is_bullish;
   int               index;
   double            top;
   double            bottom;
   datetime          time;
  };

struct MqlOB
  {
   bool              is_bullish;
   double            price_high;
   double            price_low;
   datetime          time;
  };

struct MqlSweep
  {
   string            type; // "SSL" or "BSL"
   double            level;
  };

// --- Internal Global Variables ---
datetime last_settings_poll = 0;
datetime last_report_time   = 0;
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

// Tracker for executed signals to prevent double-entries
string   executed_signals[];

// State flags
bool is_paused = false;
bool is_disabled = false;

// Last signal data cache for display
string last_sig_type = "NONE";
int last_sig_score = 0;
string last_sig_grade = "N/A";
double last_sig_entry = 0.0;
double last_sig_sl = 0.0;
double last_sig_tp = 0.0;
datetime last_sig_time = 0;
bool bridge_connected = false;

//+------------------------------------------------------------------+
//| Create text labels for the on-chart dashboard                    |
//+------------------------------------------------------------------+
void CreateLabel(string name, string text, int x, int y, int size, color col, int anchor=ANCHOR_LEFT)
  {
   if(ObjectFind(0, name) < 0)
     {
      ObjectCreate(0, name, OBJ_LABEL, 0, 0, 0);
      ObjectSetInteger(0, name, OBJPROP_XDISTANCE, x);
      ObjectSetInteger(0, name, OBJPROP_YDISTANCE, y);
      ObjectSetInteger(0, name, OBJPROP_CORNER, CORNER_LEFT_UPPER);
      ObjectSetString(0, name, OBJPROP_FONT, "Consolas");
      ObjectSetInteger(0, name, OBJPROP_FONTSIZE, size);
      ObjectSetInteger(0, name, OBJPROP_ANCHOR, anchor);
      ObjectSetInteger(0, name, OBJPROP_SELECTABLE, false);
      ObjectSetInteger(0, name, OBJPROP_SELECTED, false);
      ObjectSetInteger(0, name, OBJPROP_HIDDEN, true);
     }
   ObjectSetString(0, name, OBJPROP_TEXT, text);
   ObjectSetInteger(0, name, OBJPROP_COLOR, col);
  }

//+------------------------------------------------------------------+
//| Create (or update) background panel rectangle                    |
//+------------------------------------------------------------------+
void CreateRect(string name, int x, int y, int width, int height, color bg_col, color border_col)
  {
   if(ObjectFind(0, name) < 0)
     {
      ObjectCreate(0, name, OBJ_RECTANGLE_LABEL, 0, 0, 0);
      ObjectSetInteger(0, name, OBJPROP_CORNER,     CORNER_LEFT_UPPER);
      ObjectSetInteger(0, name, OBJPROP_SELECTABLE, false);
      ObjectSetInteger(0, name, OBJPROP_SELECTED,   false);
      ObjectSetInteger(0, name, OBJPROP_HIDDEN,     true);
     }
   ObjectSetInteger(0, name, OBJPROP_XDISTANCE,   x);
   ObjectSetInteger(0, name, OBJPROP_YDISTANCE,   y);
   ObjectSetInteger(0, name, OBJPROP_XSIZE,       width);
   ObjectSetInteger(0, name, OBJPROP_YSIZE,       height);
   ObjectSetInteger(0, name, OBJPROP_BGCOLOR,     bg_col);
   ObjectSetInteger(0, name, OBJPROP_BORDER_COLOR,border_col);
  }

//+------------------------------------------------------------------+
//| Render clean 2-column table panel directly on chart              |
//+------------------------------------------------------------------+
void RenderChartPanel()
  {
   // ── Layout constants ──────────────────────────────────────────
   int px  = 15;      // panel left
   int py  = 20;      // panel top
   int pw  = 290;     // panel width
   int lh  = 15;      // line height
   int fx  = px + 12; // text left margin
   int vx  = px + 130;// value column x
   int cur_y = py + 10;

   // ── Colors ───────────────────────────────────────────────────
   color CLR_BG      = (color)0x0D0D0D;  // near-black panel
   color CLR_BORDER  = (color)0x2B2B2B;  // dark border
   color CLR_HDRBAR  = (color)0x181818;  // slightly lighter for header bg
   color CLR_SEP     = clrDimGray;       // separator lines
   color CLR_LABEL   = clrGray;          // left column (key) color
   color CLR_VALUE   = clrSilver;        // right column (value) color
   color CLR_TITLE   = clrWhite;         // title text
   color CLR_PINK    = (color)0xF755A8;  // section header pink
   color CLR_GREEN   = clrLime;
   color CLR_RED     = clrRed;
   color CLR_ORANGE  = clrOrange;

   // ── Helpers ────────────────────────────────────────────────
   string SEP = "─────────────────────────────────────";

   // ── HEADER BAR ────────────────────────────────────────────────
   CreateRect("ea_panel_hdrbar", px, py, pw, 36, CLR_HDRBAR, CLR_BORDER);

   CreateLabel("ea_panel_title",
               "  ADAPTIVE ICT EA",
               fx, cur_y, 9, CLR_TITLE);
   CreateLabel("ea_panel_titlesub",
               "v1.0",
               px + pw - 14, cur_y, 7, CLR_SEP, ANCHOR_RIGHT);
   cur_y += lh;

   string ea_status;
   color  ea_status_col;
   if(is_disabled)    { ea_status = "  DISABLED"; ea_status_col = CLR_RED;    }
   else if(is_paused) { ea_status = "  PAUSED";   ea_status_col = CLR_ORANGE; }
   else               { ea_status = "  RUNNING";  ea_status_col = CLR_GREEN;  }

   CreateLabel("ea_panel_status_dot", "●", fx,      cur_y, 8, ea_status_col);
   CreateLabel("ea_panel_status_txt", ea_status,   fx + 8, cur_y, 8, ea_status_col);
   CreateLabel("ea_panel_magic",
               "Magic: " + IntegerToString(InpMagic),
               px + pw - 14, cur_y, 7, CLR_SEP, ANCHOR_RIGHT);
   cur_y += lh + 6;

   // ── MAIN BACKGROUND (auto-sized after header) ─────────────────
   // We draw bg first at estimate, resize at end
   CreateRect("ea_panel_bg", px, py + 36, pw, 320, CLR_BG, CLR_BORDER);
   int section_start = cur_y;

   // ── MARKET CONTEXT ────────────────────────────────────────────
   CreateLabel("ea_panel_sep1",  SEP,             fx, cur_y, 7, CLR_BORDER); cur_y += lh - 3;
   CreateLabel("ea_panel_hdr1",  "  MARKET CONTEXT", fx, cur_y, 8, CLR_PINK);  cur_y += lh;

   CreateLabel("ea_panel_m1k", "  Symbol",       fx,  cur_y, 8, CLR_LABEL);
   CreateLabel("ea_panel_m1v", _Symbol,           vx,  cur_y, 8, CLR_VALUE);  cur_y += lh;

   CreateLabel("ea_panel_m2k", "  Session",      fx,  cur_y, 8, CLR_LABEL);
   CreateLabel("ea_panel_m2v", GetCurrentSession(), vx, cur_y, 8, CLR_VALUE); cur_y += lh;

   string regime = GetMarketRegime();
   CreateLabel("ea_panel_m3k", "  Regime",       fx,  cur_y, 8, CLR_LABEL);
   CreateLabel("ea_panel_m3v", regime,            vx,  cur_y, 8, CLR_VALUE);  cur_y += lh;

   string bias    = GetHTFBias();
   color  bias_col = (bias == "BULLISH") ? CLR_GREEN : CLR_RED;
   string bias_icon = (bias == "BULLISH") ? "▲  " : "▼  ";
   CreateLabel("ea_panel_m4k", "  HTF Bias",     fx,  cur_y, 8, CLR_LABEL);
   CreateLabel("ea_panel_m4v", bias_icon + bias,  vx,  cur_y, 8, bias_col);   cur_y += lh;

   CreateLabel("ea_panel_m5k", "  Volatility",   fx,  cur_y, 8, CLR_LABEL);
   CreateLabel("ea_panel_m5v", GetVolatility(),   vx,  cur_y, 8, CLR_VALUE);  cur_y += lh;

   // ── LAST SIGNAL ───────────────────────────────────────────────
   CreateLabel("ea_panel_sep2",  SEP,              fx, cur_y, 7, CLR_BORDER); cur_y += lh - 3;
   CreateLabel("ea_panel_hdr2",  "  LAST SIGNAL",  fx, cur_y, 8, CLR_PINK);  cur_y += lh;

   color  sig_col  = (last_sig_type == "BUY") ? CLR_GREEN
                   : (last_sig_type == "SELL") ? CLR_RED
                   : CLR_LABEL;
   string sig_icon = (last_sig_type == "BUY")  ? "▲  "
                   : (last_sig_type == "SELL") ? "▼  " : "";

   CreateLabel("ea_panel_s1k", "  Direction",  fx, cur_y, 8, CLR_LABEL);
   CreateLabel("ea_panel_s1v", sig_icon + last_sig_type, vx, cur_y, 8, sig_col); cur_y += lh;

   CreateLabel("ea_panel_s2k", "  Score",      fx, cur_y, 8, CLR_LABEL);
   CreateLabel("ea_panel_s2v",
               IntegerToString(last_sig_score) + " / 100   [" + last_sig_grade + "]",
               vx, cur_y, 8, CLR_VALUE); cur_y += lh;

   CreateLabel("ea_panel_s3k", "  Timeframe",  fx, cur_y, 8, CLR_LABEL);
   CreateLabel("ea_panel_s3v", InpTimeframe,   vx, cur_y, 8, CLR_VALUE); cur_y += lh;

   // ── PERFORMANCE ───────────────────────────────────────────────
   CreateLabel("ea_panel_sep3",  SEP,               fx, cur_y, 7, CLR_BORDER); cur_y += lh - 3;
   CreateLabel("ea_panel_hdr3",  "  PERFORMANCE",   fx, cur_y, 8, CLR_PINK);  cur_y += lh;

   double balance = AccountInfoDouble(ACCOUNT_BALANCE);
   int    open_trades = 0;
   for(int i = PositionsTotal() - 1; i >= 0; i--)
      if(PositionGetSymbol(i) == _Symbol && PositionGetInteger(POSITION_MAGIC) == InpMagic)
         open_trades++;

   int    today_trades = 0, today_wins = 0, today_losses = 0;
   double today_pnl = 0.0;
   GetTodayStats(today_trades, today_wins, today_losses, today_pnl);
   double today_pct = (balance > 0) ? (today_pnl / balance * 100.0) : 0.0;

   CreateLabel("ea_panel_p1k", "  Risk / Trade",   fx, cur_y, 8, CLR_LABEL);
   CreateLabel("ea_panel_p1v",
               DoubleToString(risk_percent, 1) + "%",
               vx, cur_y, 8, CLR_VALUE); cur_y += lh;

   color  pnl_col = (today_pnl >= 0) ? CLR_GREEN : CLR_RED;
   string pnl_sign = (today_pnl >= 0) ? "+" : "";
   string pnl_str  = pnl_sign + DoubleToString(today_pct, 2) + "%  ($" + pnl_sign + DoubleToString(today_pnl, 2) + ")";
   CreateLabel("ea_panel_p2k", "  Daily P&L",   fx, cur_y, 8, CLR_LABEL);
   CreateLabel("ea_panel_p2v", pnl_str,          vx, cur_y, 8, pnl_col); cur_y += lh;

   CreateLabel("ea_panel_p3k", "  Open Trades",  fx, cur_y, 8, CLR_LABEL);
   CreateLabel("ea_panel_p3v",
               IntegerToString(open_trades) + " / " + IntegerToString(InpMaxOpenTrades),
               vx, cur_y, 8, CLR_VALUE); cur_y += lh;

   CreateLabel("ea_panel_p4k", "  W / L Today",  fx, cur_y, 8, CLR_LABEL);
   CreateLabel("ea_panel_p4v",
               IntegerToString(today_wins) + "W   " + IntegerToString(today_losses) + "L",
               vx, cur_y, 8, CLR_VALUE); cur_y += lh;

   // ── CONNECTION ────────────────────────────────────────────────
   CreateLabel("ea_panel_sep4",  SEP,              fx, cur_y, 7, CLR_BORDER); cur_y += lh - 3;
   CreateLabel("ea_panel_hdr4",  "  CONNECTION",   fx, cur_y, 8, CLR_PINK);  cur_y += lh;

   string conn_txt = bridge_connected ? "Connected"    : "Disconnected";
   color  conn_col = bridge_connected ? CLR_GREEN      : CLR_RED;
   CreateLabel("ea_panel_c1k", "  Bridge",    fx, cur_y, 8, CLR_LABEL);
   CreateLabel("ea_panel_c1dot", "●",          vx, cur_y, 8, conn_col);
   CreateLabel("ea_panel_c1v",   "  " + conn_txt, vx, cur_y, 8, conn_col); cur_y += lh;

   int hb_age = (last_report_time > 0) ? (int)(TimeCurrent() - last_report_time) : 0;
   CreateLabel("ea_panel_c2k", "  Heartbeat", fx, cur_y, 8, CLR_LABEL);
   CreateLabel("ea_panel_c2v",
               IntegerToString(hb_age) + "s ago",
               vx, cur_y, 8, (hb_age < 15) ? CLR_GREEN : CLR_ORANGE); cur_y += lh;

   string last_sig_str = (last_sig_time > 0)
                       ? TimeToString(last_sig_time, TIME_MINUTES|TIME_SECONDS)
                       : "--:--:--";
   CreateLabel("ea_panel_c3k", "  Last Signal", fx, cur_y, 8, CLR_LABEL);
   CreateLabel("ea_panel_c3v",  last_sig_str,   vx, cur_y, 8, CLR_VALUE); cur_y += lh;

   CreateLabel("ea_panel_sep5", SEP, fx, cur_y, 7, CLR_BORDER); cur_y += lh - 3;

   // ── Auto-resize main background to fit content ────────────────
   CreateRect("ea_panel_bg", px, py + 36, pw, cur_y - (py + 36) + 8, CLR_BG, CLR_BORDER);

   ChartRedraw();
  }


//+------------------------------------------------------------------+
//| Get rates in standard order (rates[0] is oldest, rates[copied-1] is newest) |
//+------------------------------------------------------------------+
int GetRates(ENUM_TIMEFRAMES tf, int count, MqlRates &rates[])
  {
   ArraySetAsSeries(rates, false);
   return CopyRates(_Symbol, tf, 0, count, rates);
  }

//+------------------------------------------------------------------+
//| Find Swings High and Low using a window lookback                 |
//+------------------------------------------------------------------+
int GetSwings(ENUM_TIMEFRAMES tf, int count, MqlSwing &swings_high[], MqlSwing &swings_low[])
  {
   MqlRates rates[];
   int copied = GetRates(tf, count, rates);
   if(copied <= 10) return 0;
   
   int window = 5;
   int high_count = 0;
   int low_count = 0;
   
   ArrayFree(swings_high);
   ArrayFree(swings_low);
   
   for(int i = window; i < copied - window; i++)
     {
      double curr_high = rates[i].high;
      double curr_low = rates[i].low;
      
      bool is_high = true;
      bool is_low = true;
      
      for(int j = i - window; j <= i + window; j++)
        {
         if(j == i) continue;
         if(rates[j].high >= curr_high) is_high = false;
         if(rates[j].low <= curr_low) is_low = false;
        }
        
      if(is_high)
        {
         int size = ArraySize(swings_high);
         ArrayResize(swings_high, size + 1);
         swings_high[size].index = i;
         swings_high[size].price = curr_high;
         swings_high[size].time = rates[i].time;
         swings_high[size].is_high = true;
         high_count++;
        }
      if(is_low)
        {
         int size = ArraySize(swings_low);
         ArrayResize(swings_low, size + 1);
         swings_low[size].index = i;
         swings_low[size].price = curr_low;
         swings_low[size].time = rates[i].time;
         swings_low[size].is_high = false;
         low_count++;
        }
     }
   return high_count + low_count;
  }

//+------------------------------------------------------------------+
//| Find Fair Value Gaps (FVG)                                      |
//+------------------------------------------------------------------+
int GetFVGs(ENUM_TIMEFRAMES tf, int count, MqlFVG &fvgs[])
  {
   MqlRates rates[];
   int copied = GetRates(tf, count, rates);
   if(copied < 3) return 0;
   
   int fvg_count = 0;
   ArrayFree(fvgs);
   
   for(int i = 2; i < copied; i++)
     {
      // Bullish FVG
      if(rates[i].low > rates[i-2].high)
        {
         int size = ArraySize(fvgs);
         ArrayResize(fvgs, size + 1);
         fvgs[size].is_bullish = true;
         fvgs[size].index = i - 1;
         fvgs[size].top = rates[i].low;
         fvgs[size].bottom = rates[i-2].high;
         fvgs[size].time = rates[i-1].time;
         fvg_count++;
        }
      // Bearish FVG
      else if(rates[i].high < rates[i-2].low)
        {
         int size = ArraySize(fvgs);
         ArrayResize(fvgs, size + 1);
         fvgs[size].is_bullish = false;
         fvgs[size].index = i - 1;
         fvgs[size].top = rates[i-2].low;
         fvgs[size].bottom = rates[i].high;
         fvgs[size].time = rates[i-1].time;
         fvg_count++;
        }
     }
   return fvg_count;
  }

//+------------------------------------------------------------------+
//| Find Order Blocks (OB) using displacement threshold              |
//+------------------------------------------------------------------+
int GetOrderBlocks(ENUM_TIMEFRAMES tf, int count, MqlOB &obs[])
  {
   MqlRates rates[];
   int copied = GetRates(tf, count, rates);
   if(copied < 10) return 0;
   
   double total_body = 0.0;
   int lookback = MathMin(20, copied);
   for(int i = copied - lookback; i < copied; i++)
     {
      total_body += MathAbs(rates[i].close - rates[i].open);
     }
   double avg_body = total_body / (double)lookback;
   
   int ob_count = 0;
   ArrayFree(obs);
   
   for(int i = 1; i < copied - 2; i++)
     {
      // Bullish OB
      if(rates[i].close < rates[i].open)
        {
         if(rates[i+1].close > rates[i+1].open && rates[i+2].close > rates[i+2].open)
           {
            double expansion = (rates[i+1].close - rates[i+1].open) + (rates[i+2].close - rates[i+2].open);
            if(expansion > avg_body * 1.5)
              {
               int size = ArraySize(obs);
               ArrayResize(obs, size + 1);
               obs[size].is_bullish = true;
               obs[size].price_high = rates[i].high;
               obs[size].price_low = rates[i].low;
               obs[size].time = rates[i].time;
               ob_count++;
              }
           }
        }
      // Bearish OB
      else if(rates[i].close > rates[i].open)
        {
         if(rates[i+1].close < rates[i+1].open && rates[i+2].close < rates[i+2].open)
           {
            double expansion = (rates[i+1].open - rates[i+1].close) + (rates[i+2].open - rates[i+2].close);
            if(expansion > avg_body * 1.5)
              {
               int size = ArraySize(obs);
               ArrayResize(obs, size + 1);
               obs[size].is_bullish = false;
               obs[size].price_high = rates[i].high;
               obs[size].price_low = rates[i].low;
               obs[size].time = rates[i].time;
               ob_count++;
              }
           }
        }
     }
   return ob_count;
  }

//+------------------------------------------------------------------+
//| Check Liquidity Sweep (SSL/BSL)                                |
//+------------------------------------------------------------------+
bool CheckLiquiditySweep(ENUM_TIMEFRAMES tf, int count, MqlSwing &swings_high[], MqlSwing &swings_low[], MqlSweep &sweep)
  {
   MqlRates rates[];
   int copied = GetRates(tf, count, rates);
   if(copied < 5) return false;
   
   MqlRates last_candle = rates[copied - 1];
   MqlRates prev_candle = rates[copied - 2];
   
   // SSL Sweep
   double lowest_swing_price = 999999.0;
   bool found_low = false;
   for(int i = 0; i < ArraySize(swings_low); i++)
     {
      if(swings_low[i].index < copied - 3)
        {
         if(swings_low[i].price < lowest_swing_price)
           {
            lowest_swing_price = swings_low[i].price;
            found_low = true;
           }
        }
     }
   if(found_low)
     {
      if((last_candle.low < lowest_swing_price && last_candle.close > lowest_swing_price) ||
         (prev_candle.low < lowest_swing_price && prev_candle.close > lowest_swing_price))
        {
         sweep.type = "SSL";
         sweep.level = lowest_swing_price;
         return true;
        }
     }
     
   // BSL Sweep
   double highest_swing_price = -999999.0;
   bool found_high = false;
   for(int i = 0; i < ArraySize(swings_high); i++)
     {
      if(swings_high[i].index < copied - 3)
        {
         if(swings_high[i].price > highest_swing_price)
           {
            highest_swing_price = swings_high[i].price;
            found_high = true;
           }
        }
     }
   if(found_high)
     {
      if((last_candle.high > highest_swing_price && last_candle.close < highest_swing_price) ||
         (prev_candle.high > highest_swing_price && prev_candle.close < highest_swing_price))
        {
         sweep.type = "BSL";
         sweep.level = highest_swing_price;
         return true;
        }
     }
     
   return false;
  }

//+------------------------------------------------------------------+
//| Check Market Structure Shift (MSS)                              |
//+------------------------------------------------------------------+
string CheckMSS(ENUM_TIMEFRAMES tf, int count, MqlSwing &swings_high[], MqlSwing &swings_low[])
  {
   MqlRates rates[];
   int copied = GetRates(tf, count, rates);
   if(copied < 3) return "NONE";
   
   int high_size = ArraySize(swings_high);
   int low_size = ArraySize(swings_low);
   if(high_size == 0 || low_size == 0) return "NONE";
   
   double last_close = rates[copied - 1].close;
   double prev_close = rates[copied - 2].close;
   
   double last_swing_high = swings_high[high_size - 1].price;
   double last_swing_low = swings_low[low_size - 1].price;
   
   if(last_close > last_swing_high && prev_close <= last_swing_high)
      return "BULLISH";
   if(last_close < last_swing_low && prev_close >= last_swing_low)
      return "BEARISH";
      
   return "NONE";
  }

//+------------------------------------------------------------------+
//| Expert initialization function                                   |
//+------------------------------------------------------------------+
int OnInit()
  {
   trade.SetExpertMagicNumber(InpMagic);
   
   risk_percent   = InpRiskPercent;
   max_daily_loss = InpMaxDailyLossPct;
   min_score      = InpMinScore;
   min_rr         = InpMinRR;
   scan_session   = InpSession;
   scan_type      = InpSignalType;
   
   EventSetTimer(1);
   Print("Adaptive ICT EA initialized with Magic: ", InpMagic);
   
   RenderChartPanel();
   return(INIT_SUCCEEDED);
  }

//+------------------------------------------------------------------+
//| Expert deinitialization function                                 |
//+------------------------------------------------------------------+
void OnDeinit(const int reason)
  {
   EventKillTimer();
   ObjectsDeleteAll(0, "ea_panel_");
   Print("Adaptive ICT EA shutdown.");
  }

//+------------------------------------------------------------------+
//| Expert tick function                                             |
//+------------------------------------------------------------------+
void OnTick()
  {
   if(InpTrailingStop)
     {
      ManageTrailingStop();
     }
  }

//+------------------------------------------------------------------+
//| Timer event function for HTTP calls                              |
//+------------------------------------------------------------------+
void OnTimer()
  {
   datetime now = TimeCurrent();
   
   RenderChartPanel();
   
   if(now - last_report_time >= report_interval)
     {
      SendHeartbeatReport();
      last_report_time = now;
     }
     
   if(now - last_settings_poll >= settings_interval)
     {
      PollRemoteSettings();
      last_settings_poll = now;
     }
     
   if(now - last_signal_poll >= signal_interval)
     {
      ScanAndExecuteLocalSignals();
      last_signal_poll = now;
     }
  }

//+------------------------------------------------------------------+
//| Post Heartbeat stats to Python Bridge                            |
//+------------------------------------------------------------------+
//+------------------------------------------------------------------+
//| Get Current Session based on Server Hour                         |
//+------------------------------------------------------------------+
string GetCurrentSession()
  {
   MqlDateTime dt;
   TimeToStruct(TimeCurrent(), dt);
   int hour = dt.hour;
   if(hour >= 8 && hour < 16) return "LONDON";
   if(hour >= 13 && hour < 21) return "NEW YORK";
   return "ASIA";
  }

//+------------------------------------------------------------------+
//| Estimate Volatility based on ATR                                 |
//+------------------------------------------------------------------+
string GetVolatility()
  {
   double atr[];
   ArraySetAsSeries(atr, true);
   int handle = iATR(_Symbol, PERIOD_CURRENT, 14);
   if(handle != INVALID_HANDLE && CopyBuffer(handle, 0, 0, 1, atr) > 0)
     {
      double cur_atr = atr[0];
      double current_price = SymbolInfoDouble(_Symbol, SYMBOL_ASK);
      if(current_price > 0)
        {
         double pct = cur_atr / current_price;
         if(pct > 0.0015) return "HIGH";
         if(pct < 0.0004) return "LOW";
        }
     }
   return "NORMAL";
  }

//+------------------------------------------------------------------+
//| Estimate Market Regime using EMA alignment                       |
//+------------------------------------------------------------------+
string GetMarketRegime()
  {
   double ema50_buf[], ema200_buf[];
   ArraySetAsSeries(ema50_buf, true);
   ArraySetAsSeries(ema200_buf, true);
   int h50  = iMA(_Symbol, PERIOD_CURRENT, 50,  0, MODE_EMA, PRICE_CLOSE);
   int h200 = iMA(_Symbol, PERIOD_CURRENT, 200, 0, MODE_EMA, PRICE_CLOSE);
   if(h50 == INVALID_HANDLE || h200 == INVALID_HANDLE) return "RANGING";
   if(CopyBuffer(h50,  0, 0, 1, ema50_buf)  <= 0) return "RANGING";
   if(CopyBuffer(h200, 0, 0, 1, ema200_buf) <= 0) return "RANGING";
   double diff  = MathAbs(ema50_buf[0] - ema200_buf[0]);
   double price = SymbolInfoDouble(_Symbol, SYMBOL_ASK);
   IndicatorRelease(h50);
   IndicatorRelease(h200);
   if(price > 0 && (diff / price) > 0.0008) return "TRENDING";
   return "RANGING";
  }

//+------------------------------------------------------------------+
//| Estimate Higher Timeframe Bias using H4 EMA alignment            |
//+------------------------------------------------------------------+
string GetHTFBias()
  {
   double ema200_buf[];
   ArraySetAsSeries(ema200_buf, true);
   int h200h4 = iMA(_Symbol, PERIOD_H4, 200, 0, MODE_EMA, PRICE_CLOSE);
   if(h200h4 == INVALID_HANDLE) return "BEARISH";
   if(CopyBuffer(h200h4, 0, 0, 1, ema200_buf) <= 0) { IndicatorRelease(h200h4); return "BEARISH"; }
   double close_buf[];
   ArraySetAsSeries(close_buf, true);
   if(CopyClose(_Symbol, PERIOD_H4, 0, 1, close_buf) <= 0) { IndicatorRelease(h200h4); return "BEARISH"; }
   IndicatorRelease(h200h4);
   if(close_buf[0] > ema200_buf[0]) return "BULLISH";
   return "BEARISH";
  }

//+------------------------------------------------------------------+
//| Get Today's Trade History Stats                                  |
//+------------------------------------------------------------------+
void GetTodayStats(int &trades_count, int &wins_count, int &losses_count, double &total_pnl)
  {
   trades_count = 0;
   wins_count = 0;
   losses_count = 0;
   total_pnl = 0.0;
   
   datetime today_start = TimeCurrent() - (TimeCurrent() % 86400);
   HistorySelect(today_start, TimeCurrent());
   
   for(int i = HistoryDealsTotal() - 1; i >= 0; i--)
     {
      ulong ticket = HistoryDealGetTicket(i);
      if(HistoryDealGetInteger(ticket, DEAL_MAGIC) == InpMagic)
        {
         double profit = HistoryDealGetDouble(ticket, DEAL_PROFIT);
         double commission = HistoryDealGetDouble(ticket, DEAL_COMMISSION);
         double swap = HistoryDealGetDouble(ticket, DEAL_SWAP);
         double net_profit = profit + commission + swap;
         
         long entry = HistoryDealGetInteger(ticket, DEAL_ENTRY);
         if(entry == DEAL_ENTRY_OUT || entry == DEAL_ENTRY_OUT_BY)
           {
            trades_count++;
            total_pnl += net_profit;
            if(net_profit > 0) wins_count++;
            else if(net_profit < 0) losses_count++;
           }
        }
     }
  }

//+------------------------------------------------------------------+
//| Emergency Close all positions for this EA                        |
//+------------------------------------------------------------------+
void ExecuteEmergencyClose()
  {
   Print("EMERGENCY COMMAND ACTIVE: Closing all open positions for Magic: ", InpMagic);
   for(int i = PositionsTotal() - 1; i >= 0; i--)
     {
      if(PositionGetSymbol(i) == _Symbol && PositionGetInteger(POSITION_MAGIC) == InpMagic)
        {
         ulong ticket = PositionGetInteger(POSITION_TICKET);
         trade.PositionClose(ticket);
        }
     }
  }

//+------------------------------------------------------------------+
//| Build JSON Array of Open Positions                               |
//+------------------------------------------------------------------+
string BuildOpenTradesJson()
  {
   string json = "[";
   bool first = true;
   for(int i = PositionsTotal() - 1; i >= 0; i--)
     {
      if(PositionGetSymbol(i) == _Symbol && PositionGetInteger(POSITION_MAGIC) == InpMagic)
        {
         ulong ticket = PositionGetInteger(POSITION_TICKET);
         double open_price = PositionGetDouble(POSITION_PRICE_OPEN);
         double current_sl = PositionGetDouble(POSITION_SL);
         double current_tp = PositionGetDouble(POSITION_TP);
         double volume = PositionGetDouble(POSITION_VOLUME);
         double profit = PositionGetDouble(POSITION_PROFIT);
         long pos_type = PositionGetInteger(POSITION_TYPE);
         string type_str = (pos_type == POSITION_TYPE_BUY) ? "BUY" : "SELL";
         
         bool be_active = (current_sl == open_price);
         bool trail_active = false;
         if(pos_type == POSITION_TYPE_BUY && current_sl > open_price) trail_active = true;
         if(pos_type == POSITION_TYPE_SELL && current_sl < open_price && current_sl > 0) trail_active = true;
         
         if(!first) json += ",";
         json += "{";
         json += "\"ticket\":" + IntegerToString(ticket) + ",";
         json += "\"symbol\":\"" + _Symbol + "\",";
         json += "\"type\":\"" + type_str + "\",";
         json += "\"volume\":" + DoubleToString(volume, 2) + ",";
         json += "\"price\":" + DoubleToString(open_price, 5) + ",";
         json += "\"sl\":" + DoubleToString(current_sl, 5) + ",";
         json += "\"tp\":" + DoubleToString(current_tp, 5) + ",";
         json += "\"pnl\":" + DoubleToString(profit, 2) + ",";
         json += "\"breakeven_active\":" + (be_active ? "true" : "false") + ",";
         json += "\"trailing_active\":" + (trail_active ? "true" : "false");
         json += "}";
         first = false;
        }
     }
   json += "]";
   return json;
  }

//+------------------------------------------------------------------+
//| Post Heartbeat stats to Python Bridge                            |
//+------------------------------------------------------------------+
void SendHeartbeatReport()
  {
   string url = InpBridgeURL + "/api/ea/report";
   string headers = "Content-Type: application/json\r\n";
   
   double balance = AccountInfoDouble(ACCOUNT_BALANCE);
   double equity  = AccountInfoDouble(ACCOUNT_EQUITY);
   
   int today_trades = 0, today_wins = 0, today_losses = 0;
   double today_pnl = 0.0;
   GetTodayStats(today_trades, today_wins, today_losses, today_pnl);
   
   string ea_status = "running";
   if(is_disabled) ea_status = "disabled";
   else if(is_paused) ea_status = "paused";
   
   string open_trades_json = BuildOpenTradesJson();
   
   string body = "{";
   body += "\"magic\":" + IntegerToString(InpMagic) + ",";
   body += "\"name\":\"" + MQLInfoString(MQL_PROGRAM_NAME) + "\",";
   body += "\"symbol\":\"" + _Symbol + "\",";
   body += "\"status\":\"" + ea_status + "\",";
   body += "\"balance\":" + DoubleToString(balance, 2) + ",";
   body += "\"equity\":" + DoubleToString(equity, 2) + ",";
   body += "\"regime\":\"" + GetMarketRegime() + "\",";
   body += "\"htf_bias\":\"" + GetHTFBias() + "\",";
   body += "\"session\":\"" + GetCurrentSession() + "\",";
   body += "\"volatility\":\"" + GetVolatility() + "\",";
   
   body += "\"today_stats\":{";
   body += "\"trades\":" + IntegerToString(today_trades) + ",";
   body += "\"wins\":" + IntegerToString(today_wins) + ",";
   body += "\"losses\":" + IntegerToString(today_losses) + ",";
   body += "\"pnl\":" + DoubleToString(today_pnl, 2);
   body += "},";
   
   body += "\"open_trades\":" + open_trades_json + ",";
   
   body += "\"settings\":{";
   body += "\"risk\":" + DoubleToString(risk_percent, 2) + ",";
   body += "\"min_score\":" + IntegerToString(min_score) + ",";
   body += "\"min_rr\":" + DoubleToString(min_rr, 2) + ",";
   body += "\"session\":\"" + scan_session + "\",";
   body += "\"signal_type\":\"" + scan_type + "\"";
   body += "}";
   
   body += "}";
   
   char post_data[];
   StringToCharArray(body, post_data, 0, StringLen(body), CP_UTF8);
    
    char result[];
    string result_headers;
    
    int res = WebRequest("POST", url, headers, 1000, post_data, result, result_headers);
    if(res >= 200 && res < 300) bridge_connected = true;
    else bridge_connected = false;
   }
 
 //+------------------------------------------------------------------+
 //| Retrieve settings changes and commands from Python Bridge        |
 //+------------------------------------------------------------------+
 void PollRemoteSettings()
   {
    string url = InpBridgeURL + "/api/ea/settings/" + IntegerToString(InpMagic);
    string headers = "Content-Type: application/json\r\n";
    
    char post_data[];
    char result[];
    string result_headers;
    
    int res = WebRequest("GET", url, headers, 1000, post_data, result, result_headers);
    if(res == 200)
      {
       bridge_connected = true;
       string response = CharArrayToString(result, 0, WHOLE_ARRAY, CP_UTF8);
       
       // Parse settings
       if(StringFind(response, "\"settings\":null") == -1 && StringFind(response, "\"settings\":{") != -1)
         {
          Print("Applying dynamic settings update from Dashboard...");
          
          double new_risk = ParseJsonDouble(response, "risk");
          if(new_risk > 0) risk_percent = new_risk;
          
          double new_rr = ParseJsonDouble(response, "min_rr");
          if(new_rr > 0) min_rr = new_rr;
          
          int new_score = ParseJsonInt(response, "min_score");
          if(new_score > 0) min_score = new_score;
          
          string new_session = ParseJsonString(response, "session");
          if(new_session != "") scan_session = new_session;
          
          string new_type = ParseJsonString(response, "signal_type");
          if(new_type != "") scan_type = new_type;
         }
         
       // Parse commands
       string cmd = ParseJsonString(response, "command");
       if(cmd != "" && cmd != "null")
         {
          Print("Received Emergency Command: ", cmd);
          if(cmd == "CLOSE_ALL")
            {
             ExecuteEmergencyClose();
            }
          else if(cmd == "PAUSE")
            {
             is_paused = true;
             Print("EA Trading Paused.");
            }
          else if(cmd == "DISABLE")
            {
             is_disabled = true;
             ExecuteEmergencyClose();
             Print("EA Strategy Disabled.");
            }
          else if(cmd == "RESUME")
            {
             is_paused = false;
             is_disabled = false;
             Print("EA Strategy Resumed.");
            }
         }
      }
    else
      {
       bridge_connected = false;
      }
   }
 
 //+------------------------------------------------------------------+
//| Get RSI indicator value                                          |
//+------------------------------------------------------------------+
double GetRSI(ENUM_TIMEFRAMES tf, int period)
  {
   double rsi_buf[];
   ArraySetAsSeries(rsi_buf, true);
   int handle = iRSI(_Symbol, tf, period, PRICE_CLOSE);
   if(handle == INVALID_HANDLE) return 50.0;
   int copied = CopyBuffer(handle, 0, 0, 1, rsi_buf);
   IndicatorRelease(handle);
   if(copied > 0) return rsi_buf[0];
   return 50.0;
  }

//+------------------------------------------------------------------+
//| Get ADX indicator and directional values                         |
//+------------------------------------------------------------------+
double GetADX(ENUM_TIMEFRAMES tf, int period, double &plus_di, double &minus_di)
  {
   double adx_buf[], plus_buf[], minus_buf[];
   ArraySetAsSeries(adx_buf, true);
   ArraySetAsSeries(plus_buf, true);
   ArraySetAsSeries(minus_buf, true);
   int handle = iADX(_Symbol, tf, period);
   if(handle == INVALID_HANDLE) return 0.0;
   int copied = CopyBuffer(handle, 0, 0, 1, adx_buf);
   int copied_p = CopyBuffer(handle, 1, 0, 1, plus_buf);
   int copied_m = CopyBuffer(handle, 2, 0, 1, minus_buf);
   IndicatorRelease(handle);
   if(copied > 0 && copied_p > 0 && copied_m > 0)
     {
      plus_di = plus_buf[0];
      minus_di = minus_buf[0];
      return adx_buf[0];
     }
   return 0.0;
  }

//+------------------------------------------------------------------+
//| Get EMA values for trend alignment checks                        |
//+------------------------------------------------------------------+
bool GetEMAs(ENUM_TIMEFRAMES tf, int p1, int p2, int p3, double &ema1, double &ema2, double &ema3)
  {
   double buf1[], buf2[], buf3[];
   ArraySetAsSeries(buf1, true);
   ArraySetAsSeries(buf2, true);
   ArraySetAsSeries(buf3, true);
   int h1 = iMA(_Symbol, tf, p1, 0, MODE_EMA, PRICE_CLOSE);
   int h2 = iMA(_Symbol, tf, p2, 0, MODE_EMA, PRICE_CLOSE);
   int h3 = iMA(_Symbol, tf, p3, 0, MODE_EMA, PRICE_CLOSE);
   if(h1 == INVALID_HANDLE || h2 == INVALID_HANDLE || h3 == INVALID_HANDLE) return false;
   int c1 = CopyBuffer(h1, 0, 0, 1, buf1);
   int c2 = CopyBuffer(h2, 0, 0, 1, buf2);
   int c3 = CopyBuffer(h3, 0, 0, 1, buf3);
   IndicatorRelease(h1);
   IndicatorRelease(h2);
   IndicatorRelease(h3);
   if(c1 > 0 && c2 > 0 && c3 > 0)
     {
      ema1 = buf1[0];
      ema2 = buf2[0];
      ema3 = buf3[0];
      return true;
     }
   return false;
  }

//+------------------------------------------------------------------+
//| Check if current volume is a spike above N-period average         |
//+------------------------------------------------------------------+
bool CheckVolumeSpike(ENUM_TIMEFRAMES tf, int avg_period, double ratio)
  {
   long volume[];
   ArraySetAsSeries(volume, true);
   int copied = CopyTickVolume(_Symbol, tf, 0, avg_period + 1, volume);
   if(copied <= avg_period) return false;
   double sum = 0.0;
   for(int i = 1; i <= avg_period; i++) sum += (double)volume[i];
   double avg = sum / (double)avg_period;
   if(avg > 0 && (double)volume[0] >= avg * ratio) return true;
   return false;
  }

//+------------------------------------------------------------------+
//| Check SMT Intermarket Divergence against correlated symbol        |
//+------------------------------------------------------------------+
bool CheckSMT(ENUM_TIMEFRAMES tf, string smt_symbol)
  {
   MqlRates rates_main[];
   MqlRates rates_smt[];
   ArraySetAsSeries(rates_main, true);
   ArraySetAsSeries(rates_smt, true);
   
   int copied_main = CopyRates(_Symbol, tf, 0, 10, rates_main);
   int copied_smt = CopyRates(smt_symbol, tf, 0, 10, rates_smt);
   if(copied_main < 10 || copied_smt < 10) return false;
   
   double low_main_curr = rates_main[0].low;
   double low_main_prev = rates_main[3].low;
   double low_smt_curr = rates_smt[0].low;
   double low_smt_prev = rates_smt[3].low;
   
   for(int i = 1; i < 3; i++)
     {
      if(rates_main[i].low < low_main_curr) low_main_curr = rates_main[i].low;
      if(rates_smt[i].low < low_smt_curr)   low_smt_curr = rates_smt[i].low;
     }
   for(int i = 3; i < 10; i++)
     {
      if(rates_main[i].low < low_main_prev) low_main_prev = rates_main[i].low;
      if(rates_smt[i].low < low_smt_prev)   low_smt_prev = rates_smt[i].low;
     }
     
   if(low_main_curr < low_main_prev && low_smt_curr >= low_smt_prev) return true;
   if(low_main_curr >= low_main_prev && low_smt_curr < low_smt_prev) return true;
   
   double high_main_curr = rates_main[0].high;
   double high_main_prev = rates_main[3].high;
   double high_smt_curr = rates_smt[0].high;
   double high_smt_prev = rates_smt[3].high;
   
   for(int i = 1; i < 3; i++)
     {
      if(rates_main[i].high > high_main_curr) high_main_curr = rates_main[i].high;
      if(rates_smt[i].high > high_smt_curr)   high_smt_curr = rates_smt[i].high;
     }
   for(int i = 3; i < 10; i++)
     {
      if(rates_main[i].high > high_main_prev) high_main_prev = rates_main[i].high;
      if(rates_smt[i].high > high_smt_prev)   high_smt_prev = rates_smt[i].high;
     }
     
   if(high_main_curr > high_main_prev && high_smt_curr <= high_smt_prev) return true;
   if(high_main_curr <= high_main_prev && high_smt_curr > high_smt_prev) return true;
   
   return false;
  }

//+------------------------------------------------------------------+
//| Check Economic Calendar news block from Python Bridge            |
//+------------------------------------------------------------------+
bool IsNewsBlocked()
  {
   if(!InpUseNewsFilter) return false;
   
   string url = InpBridgeURL + "/api/ea/news-block?symbol=" + _Symbol;
   string headers = "Content-Type: application/json\r\n";
   
   char post_data[];
   char result[];
   string result_headers;
   
   int res = WebRequest("GET", url, headers, 1000, post_data, result, result_headers);
   if(res == 200)
     {
      string response = CharArrayToString(result, 0, WHOLE_ARRAY, CP_UTF8);
      string blocked_str = ParseJsonString(response, "blocked");
      if(blocked_str == "true" || ParseJsonInt(response, "blocked") == 1)
        {
         string reason = ParseJsonString(response, "reason");
         Print("Trading blocked due to news: ", reason);
         return true;
        }
     }
   return false;
  }

//+------------------------------------------------------------------+
//| Report detected signal to the Python Bridge                      |
//+------------------------------------------------------------------+
void ReportSignalDetected(string id, string type, double entry, double sl, double tp, int score, string grade, string tf_str)
  {
   string url = InpBridgeURL + "/api/ea/signal-detected";
   string headers = "Content-Type: application/json\r\n";
   
   string body = "{";
   body += "\"id\":\"" + id + "\",";
   body += "\"symbol\":\"" + _Symbol + "\",";
   body += "\"type\":\"" + type + "\",";
   body += "\"entry_price\":" + DoubleToString(entry, 5) + ",";
   body += "\"sl\":" + DoubleToString(sl, 5) + ",";
   body += "\"tp\":" + DoubleToString(tp, 5) + ",";
   body += "\"confidence\":" + IntegerToString(score) + ",";
   body += "\"grade\":\"" + grade + "\",";
   body += "\"timeframe\":\"" + tf_str + "\"";
   body += "}";
   
   char post_data[];
   StringToCharArray(body, post_data, 0, StringLen(body), CP_UTF8);
   
   char result[];
   string result_headers;
   WebRequest("POST", url, headers, 1000, post_data, result, result_headers);
  }

//+------------------------------------------------------------------+
//| Scan specific timeframe chart for confluence setups              |
//+------------------------------------------------------------------+
void ScanTimeframe(ENUM_TIMEFRAMES tf, string tf_str)
  {
   // Check Day & Friday Late Hours Filters
   MqlDateTime dt;
   TimeToStruct(TimeCurrent(), dt);
   if(dt.day_of_week == 1 && !InpAllowMonday) { Print("Monday trading disabled. Blocked."); return; }
   if(dt.day_of_week == 5)
     {
      if(!InpAllowFriday) { Print("Friday trading disabled. Blocked."); return; }
      if(dt.hour >= InpFridayCloseHour) { Print("Friday afternoon session block active. Blocked."); return; }
     }
     
   // Check Spread Filter
   int cur_spread = (int)SymbolInfoInteger(_Symbol, SYMBOL_SPREAD);
   if(cur_spread > InpMaxSpreadPoints) { Print("Spread too high: ", cur_spread, " points (Limit: ", InpMaxSpreadPoints, "). Blocked."); return; }
   
   // Check Economic News Filter
   if(IsNewsBlocked()) { Print("Economic News Block active. Blocked."); return; }
   
   MqlSwing swings_high[], swings_low[];
   MqlFVG fvgs[];
   MqlOB obs[];
   MqlSweep sweep;
   
   GetSwings(tf, 120, swings_high, swings_low);
   GetFVGs(tf, 120, fvgs);
   GetOrderBlocks(tf, 120, obs);
   
   bool has_sweep = CheckLiquiditySweep(tf, 120, swings_high, swings_low, sweep);
   string mss = CheckMSS(tf, 120, swings_high, swings_low);
   string bias = GetHTFBias();
   
   // FVG and OB triggering triggers
   bool recent_fvg_bull = false;
   bool recent_fvg_bear = false;
   int fvg_size = ArraySize(fvgs);
   for(int i = MathMax(0, fvg_size - 10); i < fvg_size; i++)
     {
      if(fvgs[i].is_bullish) recent_fvg_bull = true;
      else recent_fvg_bear = true;
     }
     
   bool recent_ob_bull = false;
   bool recent_ob_bear = false;
   int ob_size = ArraySize(obs);
   for(int i = MathMax(0, ob_size - 15); i < ob_size; i++)
     {
      if(obs[i].is_bullish) recent_ob_bull = true;
      else recent_ob_bear = true;
     }
     
   // Check displacement
   MqlRates rates[];
   int copied = GetRates(tf, 30, rates);
   if(copied < 10) return;
   double total_body = 0.0;
   for(int i = copied - 10; i < copied; i++)
      total_body += MathAbs(rates[i].close - rates[i].open);
   double avg_body = total_body / 10.0;
   bool displacement = MathAbs(rates[copied - 1].close - rates[copied - 1].open) > avg_body * 1.5;
   
   // Technical Indicator values
   double rsi_val = GetRSI(tf, InpRSIPeriod);
   double plus_di = 0.0, minus_di = 0.0;
   double adx_val = GetADX(tf, InpADXPeriod, plus_di, minus_di);
   bool vol_spike = CheckVolumeSpike(tf, InpVolAvgPeriod, InpVolMinRatio);
   bool smt_div = CheckSMT(tf, InpSMTSymbol);
   
   // Compute BUY score
   double buy_score = 0.0;
   
   // 1. ICT Smart Money (Max 60 pts)
   if(mss == "BULLISH") buy_score += 15.0;
   if(has_sweep && sweep.type == "SSL") buy_score += 15.0;
   if(recent_fvg_bull) buy_score += 10.0;
   if(recent_ob_bull) buy_score += 10.0;
   if(bias == "BULLISH") buy_score += 10.0;
   
   // 2. Technical Indicators (Max 20 pts)
   if(InpUseRSI)
     {
      if(rsi_val >= InpRSIBuyMin && rsi_val <= InpRSIBuyMax) buy_score += 5.0;
     }
   else buy_score += 5.0;
   if(InpUseADX)
     {
      if(adx_val >= InpADXMin && adx_val <= InpADXMax && plus_di > minus_di) buy_score += 5.0;
     }
   else buy_score += 5.0;
   if(InpUseVolume)
     {
      if(vol_spike) buy_score += 5.0;
     }
   else buy_score += 5.0;
   if(InpUseSMT)
     {
      if(smt_div) buy_score += 5.0;
     }
   else buy_score += 5.0;
     
   // 3. Market Conditions (Max 10 pts)
   string current_session = GetCurrentSession();
   bool sess_ok = false;
   if(scan_session == "all" || 
      (scan_session == "london" && current_session == "LONDON") ||
      (scan_session == "ny" && current_session == "NEW YORK") ||
      (scan_session == "both" && (current_session == "LONDON" || current_session == "NEW YORK")))
      sess_ok = true;
   if(sess_ok) buy_score += 5.0;
   
   bool mtf_align = false;
   if(InpUseMTFConfluence)
     {
      ENUM_TIMEFRAMES parent_tf = (tf == PERIOD_M5) ? PERIOD_M15 : ((tf == PERIOD_M15) ? PERIOD_H1 : PERIOD_H4);
      double p_ema1 = 0, p_ema2 = 0, p_ema3 = 0;
      if(GetEMAs(parent_tf, InpEMA1Period, InpEMA2Period, InpEMA3Period, p_ema1, p_ema2, p_ema3))
        {
         if(p_ema1 > p_ema2 && p_ema2 > p_ema3) mtf_align = true;
        }
     }
   else mtf_align = true;
   if(mtf_align) buy_score += 5.0;
   
   // 4. Execution Conditions (Max 10 pts)
   buy_score += 5.0; // Spread filter passed (hard filter, already checked)
   
   // Risk Reward ratio estimation for score
   double lowest_low = 999999.0;
   int low_size = ArraySize(swings_low);
   int count = 0;
   for(int i = low_size - 1; i >= 0 && count < 5; i--)
     {
      if(swings_low[i].price < lowest_low) lowest_low = swings_low[i].price;
      count++;
     }
   double entry = rates[copied - 1].close;
   double cur_atr = 0.0;
   double atr_array[];
   ArraySetAsSeries(atr_array, true);
   int atr_handle = iATR(_Symbol, tf, 14);
   if(atr_handle != INVALID_HANDLE && CopyBuffer(atr_handle, 0, 0, 1, atr_array) > 0)
      cur_atr = atr_array[0];
   IndicatorRelease(atr_handle);
   if(cur_atr <= 0) cur_atr = entry * 0.001;
   
   double est_sl = lowest_low;
   if(est_sl == 999999.0) est_sl = entry - (cur_atr * 2.0);
   est_sl = NormalizeDouble(est_sl - (cur_atr * 0.2), _Digits);
   double buy_dist = entry - est_sl;
   double est_tp = NormalizeDouble(entry + (buy_dist * min_rr), _Digits);
   double rr = buy_dist > 0 ? (est_tp - entry)/buy_dist : 0.0;
   if(rr >= min_rr) buy_score += 5.0;
   
   // Conflict penalty
   if(bias == "BEARISH") buy_score = MathMax(0.0, buy_score - 10.0);
   
   // Compute SELL score
   double sell_score = 0.0;
   
   // 1. ICT Smart Money (Max 60 pts)
   if(mss == "BEARISH") sell_score += 15.0;
   if(has_sweep && sweep.type == "BSL") sell_score += 15.0;
   if(recent_fvg_bear) sell_score += 10.0;
   if(recent_ob_bear) sell_score += 10.0;
   if(bias == "BEARISH") sell_score += 10.0;
   
   // 2. Technical Indicators (Max 20 pts)
   if(InpUseRSI)
     {
      if(rsi_val >= InpRSISellMin && rsi_val <= InpRSISellMax) sell_score += 5.0;
     }
   else sell_score += 5.0;
   if(InpUseADX)
     {
      if(adx_val >= InpADXMin && adx_val <= InpADXMax && minus_di > plus_di) sell_score += 5.0;
     }
   else sell_score += 5.0;
   if(InpUseVolume)
     {
      if(vol_spike) sell_score += 5.0;
     }
   else sell_score += 5.0;
   if(InpUseSMT)
     {
      if(smt_div) sell_score += 5.0;
     }
   else sell_score += 5.0;
     
   // 3. Market Conditions (Max 10 pts)
   if(sess_ok) sell_score += 5.0;
   
   bool sell_mtf_align = false;
   if(InpUseMTFConfluence)
     {
      ENUM_TIMEFRAMES parent_tf = (tf == PERIOD_M5) ? PERIOD_M15 : ((tf == PERIOD_M15) ? PERIOD_H1 : PERIOD_H4);
      double p_ema1 = 0, p_ema2 = 0, p_ema3 = 0;
      if(GetEMAs(parent_tf, InpEMA1Period, InpEMA2Period, InpEMA3Period, p_ema1, p_ema2, p_ema3))
        {
         if(p_ema1 < p_ema2 && p_ema2 < p_ema3) sell_mtf_align = true;
        }
     }
   else sell_mtf_align = true;
   if(sell_mtf_align) sell_score += 5.0;
   
   // 4. Execution Conditions (Max 10 pts)
   sell_score += 5.0; // Spread filter passed
   
   double highest_high = -999999.0;
   int high_size = ArraySize(swings_high);
   count = 0;
   for(int i = high_size - 1; i >= 0 && count < 5; i--)
     {
      if(swings_high[i].price > highest_high) highest_high = swings_high[i].price;
      count++;
     }
   double est_sell_sl = highest_high;
   if(est_sell_sl == -999999.0) est_sell_sl = entry + (cur_atr * 2.0);
   est_sell_sl = NormalizeDouble(est_sell_sl + (cur_atr * 0.2), _Digits);
   double sell_dist = est_sell_sl - entry;
   double est_sell_tp = NormalizeDouble(entry - (sell_dist * min_rr), _Digits);
   double sell_rr = sell_dist > 0 ? (entry - est_sell_tp)/sell_dist : 0.0;
   if(sell_rr >= min_rr) sell_score += 5.0;
   
   // Conflict penalty
   if(bias == "BULLISH") sell_score = MathMax(0.0, sell_score - 10.0);
   
   // Decision making
   int final_score = 0;
   string type = "NO_TRADE";
   if(buy_score >= sell_score)
     {
      final_score = (int)MathRound(buy_score);
      if(final_score >= min_score) type = "BUY";
     }
   else
     {
      final_score = (int)MathRound(sell_score);
      if(final_score >= min_score) type = "SELL";
     }
     
   if(type != "NO_TRADE")
     {
      double sl = 0.0, tp = 0.0;
      if(type == "BUY")
        {
         sl = est_sl;
         tp = est_tp;
        }
      else // SELL
        {
         sl = est_sell_sl;
         tp = est_sell_tp;
        }
        
      string sig_id = _Symbol + "-" + tf_str + "-" + IntegerToString((int)rates[copied - 1].time) + "-" + StringSubstr(type, 0, 1);
      
      // Update display cache
      last_sig_type = type;
      last_sig_score = final_score;
      last_sig_entry = entry;
      last_sig_sl = sl;
      last_sig_tp = tp;
      last_sig_time = TimeCurrent();
      if(final_score >= 90) last_sig_grade = "A+";
      else if(final_score >= 80) last_sig_grade = "A";
      else if(final_score >= 70) last_sig_grade = "B";
      else last_sig_grade = "C";
      
      // Report signal detection
      ReportSignalDetected(sig_id, type, entry, sl, tp, final_score, last_sig_grade, tf_str);
      
      if(!IsSignalExecuted(sig_id))
        {
         Print("Local Scanner Executing Signal: ", sig_id, " | Type: ", type, " | Entry: ", entry, " | SL: ", sl, " | TP: ", tp);
         if(ExecuteTrade(type, entry, sl, tp, final_score, sig_id))
           {
            AddExecutedSignal(sig_id);
           }
        }
     }
  }

//+------------------------------------------------------------------+
//| Scan and Execute Local signals                                   |
//+------------------------------------------------------------------+
void ScanAndExecuteLocalSignals()
  {
   if(is_paused || is_disabled) return;
   
   string tf_upper = InpTimeframe;
   if(tf_upper == "M5" || tf_upper == "ALL")   ScanTimeframe(PERIOD_M5, "M5");
   if(tf_upper == "M15" || tf_upper == "ALL")  ScanTimeframe(PERIOD_M15, "M15");
   if(tf_upper == "H1" || tf_upper == "ALL")   ScanTimeframe(PERIOD_H1, "H1");
   if(tf_upper == "H4" || tf_upper == "ALL")   ScanTimeframe(PERIOD_H4, "H4");
  }

//+------------------------------------------------------------------+
//| Execute Buy/Sell Trade with Lot size and Risk limits             |
//+------------------------------------------------------------------+
bool ExecuteTrade(string type, double entry, double sl, double tp, int confidence, string sig_id)
  {
   // Check current active trades for symbol/magic limit
   int open_count = 0;
   for(int i = PositionsTotal() - 1; i >= 0; i--)
     {
      if(PositionGetSymbol(i) == _Symbol && PositionGetInteger(POSITION_MAGIC) == InpMagic)
         open_count++;
     }
     
   if(open_count >= InpMaxOpenTrades)
     {
      Print("Max trades limit reached (", InpMaxOpenTrades, "). Rejecting execution.");
      return false;
     }
     
   // Calculate Dynamic Lot size based on Risk Percent & Stop Loss distance
   double balance = AccountInfoDouble(ACCOUNT_BALANCE);
   double risk_amount = balance * (risk_percent / 100.0);
   double tick_size = SymbolInfoDouble(_Symbol, SYMBOL_TRADE_TICK_SIZE);
   double tick_value = SymbolInfoDouble(_Symbol, SYMBOL_TRADE_TICK_VALUE);
   double sl_distance = MathAbs(entry - sl);
   
   if(sl_distance <= 0)
     {
      Print("Invalid stop loss distance. Rejecting execution.");
      return false;
     }
     
   double lot_step = SymbolInfoDouble(_Symbol, SYMBOL_VOLUME_STEP);
   double lot_min = SymbolInfoDouble(_Symbol, SYMBOL_VOLUME_MIN);
   double lot_max = SymbolInfoDouble(_Symbol, SYMBOL_VOLUME_MAX);
   
   double calculated_lots = (risk_amount) / ((sl_distance / tick_size) * tick_value);
   double lots = MathFloor(calculated_lots / lot_step) * lot_step;
   
   if(lots < lot_min) lots = lot_min;
   if(lots > lot_max) lots = lot_max;
   
   bool success = false;
   if(type == "BUY")
     {
      success = trade.Buy(lots, _Symbol, 0, sl, tp, "Dashboard Signal " + sig_id);
     }
   else if(type == "SELL")
     {
      success = trade.Sell(lots, _Symbol, 0, sl, tp, "Dashboard Signal " + sig_id);
     }
     
   if(success)
     {
      ulong ticket = trade.ResultOrder();
      SendTradeEvent("open", ticket, type, lots, entry, sl, tp, confidence, sig_id);
     }
   else
     {
      Print("Trade execution failed: ", trade.ResultRetcodeDescription());
     }
     
   return success;
  }

//+------------------------------------------------------------------+
//| Report Position Opens and Closes back to Dashboard log           |
//+------------------------------------------------------------------+
void SendTradeEvent(string action, ulong ticket, string type, double volume, double price, double sl, double tp, int confidence, string sig_id)
  {
   string url = InpBridgeURL + "/api/ea/trade-event";
   string headers = "Content-Type: application/json\r\n";
   
   string body = "{";
   body += "\"magic\":" + IntegerToString(InpMagic) + ",";
   body += "\"ticket\":" + IntegerToString(ticket) + ",";
   body += "\"action\":\"" + action + "\",";
   body += "\"symbol\":\"" + _Symbol + "\",";
   body += "\"type\":\"" + type + "\",";
   body += "\"volume\":" + DoubleToString(volume, 2) + ",";
   body += "\"price\":" + DoubleToString(price, 5) + ",";
   body += "\"sl\":" + DoubleToString(sl, 5) + ",";
   body += "\"tp\":" + DoubleToString(tp, 5) + ",";
   body += "\"confidence\":" + IntegerToString(confidence) + ",";
   body += "\"signal_id\":\"" + sig_id + "\"";
   body += "}";
   
   char post_data[];
   StringToCharArray(body, post_data, 0, StringLen(body), CP_UTF8);
   
   char result[];
   string result_headers;
   WebRequest("POST", url, headers, 1000, post_data, result, result_headers);
  }

struct MqlPositionState
  {
   ulong             ticket;
   bool              tp1_hit;
   bool              tp2_hit;
  };

MqlPositionState position_states[100];
int              pos_states_count = 0;

void UpdatePositionState(ulong ticket, bool tp1, bool tp2)
  {
   for(int i = 0; i < pos_states_count; i++)
     {
      if(position_states[i].ticket == ticket)
        {
         position_states[i].tp1_hit = tp1;
         position_states[i].tp2_hit = tp2;
         return;
        }
     }
   if(pos_states_count < 100)
     {
      position_states[pos_states_count].ticket = ticket;
      position_states[pos_states_count].tp1_hit = tp1;
      position_states[pos_states_count].tp2_hit = tp2;
      pos_states_count++;
     }
  }

bool GetPositionState(ulong ticket, bool &tp1, bool &tp2)
  {
   for(int i = 0; i < pos_states_count; i++)
     {
      if(position_states[i].ticket == ticket)
        {
         tp1 = position_states[i].tp1_hit;
         tp2 = position_states[i].tp2_hit;
         return true;
        }
     }
   tp1 = false;
   tp2 = false;
   return false;
  }

//+------------------------------------------------------------------+
//| Manage trailing stop, dynamic TP1 partial closes, and breakeven  |
//+------------------------------------------------------------------+
void ManageTrailingStop()
  {
   double atr[];
   ArraySetAsSeries(atr, true);
   int atr_handle = iATR(_Symbol, PERIOD_CURRENT, 14);
   if(atr_handle == INVALID_HANDLE) return;
   
   if(CopyBuffer(atr_handle, 0, 0, 1, atr) <= 0)
     {
      IndicatorRelease(atr_handle);
      return;
     }
   double current_atr = atr[0];
   IndicatorRelease(atr_handle);
   double trail_distance = current_atr * InpTrailATRMult;
   double lot_min = SymbolInfoDouble(_Symbol, SYMBOL_VOLUME_MIN);
   
   for(int i = PositionsTotal() - 1; i >= 0; i--)
     {
      if(PositionGetSymbol(i) == _Symbol && PositionGetInteger(POSITION_MAGIC) == InpMagic)
        {
         ulong ticket = PositionGetInteger(POSITION_TICKET);
         double open_price = PositionGetDouble(POSITION_PRICE_OPEN);
         double current_sl = PositionGetDouble(POSITION_SL);
         double current_tp = PositionGetDouble(POSITION_TP);
         double volume = PositionGetDouble(POSITION_VOLUME);
         double current_price = (PositionGetInteger(POSITION_TYPE) == POSITION_TYPE_BUY) ? SymbolInfoDouble(_Symbol, SYMBOL_BID) : SymbolInfoDouble(_Symbol, SYMBOL_ASK);
         
         double stop_distance = MathAbs(open_price - current_sl);
         if(stop_distance <= 0) stop_distance = current_atr * 2.0;
         
         bool tp1_hit = false;
         bool tp2_hit = false;
         GetPositionState(ticket, tp1_hit, tp2_hit);
         
         // 1. Partial close at TP1 (1:1 risk-reward)
         if(!tp1_hit)
           {
            double tp1_price = (PositionGetInteger(POSITION_TYPE) == POSITION_TYPE_BUY) ? open_price + stop_distance : open_price - stop_distance;
            bool trigger_tp1 = false;
            if(PositionGetInteger(POSITION_TYPE) == POSITION_TYPE_BUY && current_price >= tp1_price) trigger_tp1 = true;
            if(PositionGetInteger(POSITION_TYPE) == POSITION_TYPE_SELL && current_price <= tp1_price) trigger_tp1 = true;
            
            if(trigger_tp1)
              {
               double close_vol = NormalizeDouble(volume * 0.5, 2);
               if(close_vol >= lot_min)
                 {
                  if(trade.PositionClosePartial(ticket, close_vol))
                    {
                     Print("TP1 Partial Close triggered: ticket ", ticket, " | closed ", close_vol, " lots.");
                     SendTradeEvent("modify", ticket, (PositionGetInteger(POSITION_TYPE) == POSITION_TYPE_BUY) ? "BUY" : "SELL", volume - close_vol, current_price, current_sl, current_tp, 100, "TP1");
                    }
                 }
               tp1_hit = true;
               UpdatePositionState(ticket, tp1_hit, tp2_hit);
               
               // Move remaining position to Breakeven
               if(InpUseBE && current_sl != open_price)
                 {
                  trade.PositionModify(ticket, open_price, current_tp);
                  Print("SL moved to Breakeven after TP1: ticket ", ticket);
                  SendTradeEvent("modify", ticket, (PositionGetInteger(POSITION_TYPE) == POSITION_TYPE_BUY) ? "BUY" : "SELL", volume - close_vol, open_price, open_price, current_tp, 100, "BE");
                 }
              }
           }
           
         // 2. Trailing Stop
         if(InpTrailingStop)
           {
            if(PositionGetInteger(POSITION_TYPE) == POSITION_TYPE_BUY)
              {
               double new_sl = current_price - trail_distance;
               if(new_sl > current_sl && new_sl > open_price)
                 {
                  trade.PositionModify(ticket, NormalizeDouble(new_sl, _Digits), current_tp);
                 }
              }
            else if(PositionGetInteger(POSITION_TYPE) == POSITION_TYPE_SELL)
              {
               double new_sl = current_price + trail_distance;
               if((new_sl < current_sl || current_sl == 0) && new_sl < open_price)
                 {
                  trade.PositionModify(ticket, NormalizeDouble(new_sl, _Digits), current_tp);
                 }
              }
           }
        }
     }
  }

//+------------------------------------------------------------------+
//| Simple string parsing helpers for JSON payload parsing            |
//+------------------------------------------------------------------+
double ParseJsonDouble(string json, string key)
  {
   return ParseJsonDoubleAt(json, key, 0);
  }

double ParseJsonDoubleAt(string json, string key, int search_start)
  {
   int key_pos = StringFind(json, "\"" + key + "\"", search_start);
   if(key_pos == -1) return 0;
   
   int val_start = StringFind(json, ":", key_pos);
   if(val_start == -1) return 0;
   val_start++;
   
   // Skip spaces
   while(val_start < StringLen(json) && (StringSubstr(json, val_start, 1) == " " || StringSubstr(json, val_start, 1) == "\t"))
      val_start++;
      
   int val_end = val_start;
   while(val_end < StringLen(json) && 
         (StringSubstr(json, val_end, 1) == "." || 
          (StringGetCharacter(json, val_end) >= '0' && StringGetCharacter(json, val_end) <= '9') ||
          StringSubstr(json, val_end, 1) == "-"))
      val_end++;
      
   string val_str = StringSubstr(json, val_start, val_end - val_start);
   return StringToDouble(val_str);
  }

int ParseJsonInt(string json, string key)
  {
   return ParseJsonIntAt(json, key, 0);
  }

int ParseJsonIntAt(string json, string key, int search_start)
  {
   return (int)ParseJsonDoubleAt(json, key, search_start);
  }

string ParseJsonString(string json, string key)
  {
   return ParseJsonStringAt(json, key, 0);
  }

string ParseJsonStringAt(string json, string key, int search_start)
  {
   int key_pos = StringFind(json, "\"" + key + "\"", search_start);
   if(key_pos == -1) return "";
   
   int val_start = StringFind(json, ":", key_pos);
   if(val_start == -1) return "";
   val_start++;
   
   // Skip spaces/quotes
   while(val_start < StringLen(json) && 
         (StringSubstr(json, val_start, 1) == " " || 
          StringSubstr(json, val_start, 1) == "\t" || 
          StringSubstr(json, val_start, 1) == "\""))
      val_start++;
      
   int val_end = val_start;
   while(val_end < StringLen(json) && StringSubstr(json, val_end, 1) != "\"")
      val_end++;
      
   return StringSubstr(json, val_start, val_end - val_start);
  }

//+------------------------------------------------------------------+
//| Manage Executed Signal tracking to prevent double executions      |
//+------------------------------------------------------------------+
bool IsSignalExecuted(string sig_id)
  {
   for(int i = 0; i < ArraySize(executed_signals); i++)
     {
      if(executed_signals[i] == sig_id) return true;
     }
   return false;
  }

void AddExecutedSignal(string sig_id)
  {
   int size = ArraySize(executed_signals);
   ArrayResize(executed_signals, size + 1);
   executed_signals[size] = sig_id;
   
   // Keep bounded tracking size
   if(ArraySize(executed_signals) > 100)
     {
      for(int i = 1; i < ArraySize(executed_signals); i++)
        {
         executed_signals[i-1] = executed_signals[i];
        }
      ArrayResize(executed_signals, 100);
     }
  }
