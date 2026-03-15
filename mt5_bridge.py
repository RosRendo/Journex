try:
    import MetaTrader5 as mt5
except ImportError:
    mt5 = None
    print("[bridge] MetaTrader5 not available (Windows-only, expected on Linux)")

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
import asyncio
import hashlib
import json
import math
import os
import time
import aiohttp
import requests
import feedparser
from contextlib import asynccontextmanager
from datetime import datetime, timedelta
from typing import Optional, Dict
from pydantic import BaseModel

# Load .env file if it exists (python-dotenv)
try:
    from dotenv import load_dotenv
    load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), ".env"))
    print("[bridge] .env loaded")
except ImportError:
    pass  # dotenv not installed — env vars read from system environment

# ─── Discord Webhooks (loaded from .env) ─────────────────────────────────────
DISCORD_NEWS_WEBHOOK      = os.environ.get("DISCORD_NEWS_WEBHOOK", "")
DISCORD_CALENDAR_WEBHOOK  = os.environ.get("DISCORD_CALENDAR_WEBHOOK", "")
DISCORD_SIGNALS_WEBHOOK   = os.environ.get("DISCORD_SIGNALS_WEBHOOK", "")
DISCORD_ALERTS_WEBHOOK    = os.environ.get("DISCORD_ALERTS_WEBHOOK", "")

# ─── Telegram (loaded from .env) ─────────────────────────────────────────────
TELEGRAM_BOT_TOKEN = os.environ.get("TELEGRAM_BOT_TOKEN", "")

# MODE A — 4 separate channels (each channel has its own chat_id)
TELEGRAM_CHAT_SIGNALS  = os.environ.get("TELEGRAM_CHAT_SIGNALS", "")
TELEGRAM_CHAT_ALERTS   = os.environ.get("TELEGRAM_CHAT_ALERTS", "")
TELEGRAM_CHAT_NEWS     = os.environ.get("TELEGRAM_CHAT_NEWS", "")
TELEGRAM_CHAT_CALENDAR = os.environ.get("TELEGRAM_CHAT_CALENDAR", "")

# MODE B — 1 supergroup with Topics + per-topic thread_ids
TELEGRAM_CHAT_ID         = os.environ.get("TELEGRAM_CHAT_ID", "")
TELEGRAM_THREAD_SIGNALS  = os.environ.get("TELEGRAM_THREAD_SIGNALS", "")
TELEGRAM_THREAD_ALERTS   = os.environ.get("TELEGRAM_THREAD_ALERTS", "")
TELEGRAM_THREAD_NEWS     = os.environ.get("TELEGRAM_THREAD_NEWS", "")
TELEGRAM_THREAD_CALENDAR = os.environ.get("TELEGRAM_THREAD_CALENDAR", "")

# ─── Runtime alert config (can be overridden by frontend via /api/alert-config)
_alert_config: dict = {
    # Discord — one webhook per channel
    "discord_news_webhook":     DISCORD_NEWS_WEBHOOK,
    "discord_calendar_webhook": DISCORD_CALENDAR_WEBHOOK,
    "discord_signals_webhook":  DISCORD_SIGNALS_WEBHOOK,
    "discord_alerts_webhook":   DISCORD_ALERTS_WEBHOOK,
    # Telegram bot
    "telegram_bot_token":       TELEGRAM_BOT_TOKEN,
    # MODE A — channel chat_ids
    "telegram_chat_signals":    TELEGRAM_CHAT_SIGNALS,
    "telegram_chat_alerts":     TELEGRAM_CHAT_ALERTS,
    "telegram_chat_news":       TELEGRAM_CHAT_NEWS,
    "telegram_chat_calendar":   TELEGRAM_CHAT_CALENDAR,
    # MODE B — group + topic thread_ids
    "telegram_chat_id":         TELEGRAM_CHAT_ID,
    "telegram_thread_signals":  TELEGRAM_THREAD_SIGNALS,
    "telegram_thread_alerts":   TELEGRAM_THREAD_ALERTS,
    "telegram_thread_news":     TELEGRAM_THREAD_NEWS,
    "telegram_thread_calendar": TELEGRAM_THREAD_CALENDAR,
}

# ─── Multi-user MT5 Credentials ───────────────────────────────────────────────
CREDENTIALS_FILE = "user_mt5_credentials.json"
_current_user_email: Optional[str] = None  # tracks who is logged in

def _load_all_credentials() -> dict:
    try:
        if os.path.exists(CREDENTIALS_FILE):
            with open(CREDENTIALS_FILE) as f:
                return json.load(f)
    except Exception:
        pass
    return {}

def _save_credentials(email: str, login: int, password: str, server: str):
    store = _load_all_credentials()
    store[email] = {"login": login, "password": password, "server": server}
    with open(CREDENTIALS_FILE, "w") as f:
        json.dump(store, f, indent=2)
    print(f"[credentials] Saved MT5 login for {email}")

def _get_credentials(email: str) -> Optional[dict]:
    return _load_all_credentials().get(email)

app = FastAPI(title="MT5 Free Bridge")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods
    allow_headers=["*"],  # Allows all headers
)

connected = False
calculator_running = False

# Default symbols to monitor
DEFAULT_SYMBOLS = ["EURUSD", "GBPUSD", "XAUUSD", "USDJPY", "AUDUSD"]
RISK_PERCENT = 1.0  # 1% risk per trade

# Alternative symbol names to try if primary fails (broker-specific naming)
SYMBOL_ALIASES = {
    "XAUUSD": ["XAUUSD", "GOLD", "XAUUSDm", "XAUUSDi", "XAUUSD."],
    "XAGUSD": ["XAGUSD", "SILVER", "XAGUSDm"],
    "EURUSD": ["EURUSD", "EURUSDm", "EURUSDi"],
    "GBPUSD": ["GBPUSD", "GBPUSDm"],
    "USDJPY": ["USDJPY", "USDJPYm"],
    "AUDUSD": ["AUDUSD", "AUDUSDm"],
}

def ensure_symbol(symbol: str) -> str:
    """Try to find and enable a symbol in Market Watch, including broker aliases."""
    aliases = SYMBOL_ALIASES.get(symbol, [symbol])
    for alias in aliases:
        if mt5.symbol_select(alias, True):
            info = mt5.symbol_info(alias)
            if info and info.visible:
                return alias  # Return the working alias
    return symbol  # Return original even if failed

def init_mt5():
    global connected
    if not mt5.initialize():
        print("initialize() failed, error code =", mt5.last_error())
        connected = False
        return False
    connected = True
    print("MT5 Connected!")

    # Check if an account is logged in
    acc = mt5.account_info()
    if acc:
        print(f"Account logged in: #{acc.login} | Balance: {acc.balance} | Server: {acc.server}")
        # Pre-warm all default symbols into Market Watch
        for sym in DEFAULT_SYMBOLS:
            working = ensure_symbol(sym)
            print(f"  Symbol {sym} -> {working}")
    else:
        print("MT5 terminal connected but NO account is logged in.")
        print("Please open MetaTrader5 and log in to your broker account first.")
    return True

init_mt5()

@app.get("/health")
def health_check():
    # Attempt reconnect if dropped
    global connected
    if not connected or mt5.terminal_info() is None:
        init_mt5()

    acc = None
    if connected:
        acc = mt5.account_info()

    return {
        "connected": connected,
        "status": "running",
        "balance": acc.balance if acc else None
    }

@app.get("/api/account")
def get_account():
    """Return full MT5 account details (balance, equity, profit, margin_level, etc.)"""
    global connected
    if not connected or mt5.terminal_info() is None:
        init_mt5()
    if not connected:
        return {"success": False, "error": "MT5 not connected"}
    acc = mt5.account_info()
    if acc is None:
        return {"success": False, "error": "No account logged in"}
    return {
        "success": True,
        "login": acc.login,
        "balance": acc.balance,
        "equity": acc.equity,
        "profit": acc.profit,
        "margin": acc.margin,
        "margin_free": acc.margin_free,
        "margin_level": acc.margin_level,
        "currency": acc.currency,
        "server": acc.server,
        "leverage": acc.leverage,
        "name": acc.name,
    }

class ConnectRequest(BaseModel):
    login: int
    password: str
    server: str
    email: Optional[str] = None  # User's Gmail — used to save/reload credentials per account

class AutoConnectRequest(BaseModel):
    email: str  # Try to auto-connect saved credentials for this Gmail

class TradeRequest(BaseModel):
    symbol: str
    direction: str       # "BUY" or "SELL"
    lot_size: float
    sl: float
    tp: float
    comment: Optional[str] = "TradeKiller Risk Calc"

# ─── Notification Helpers (Discord Webhook + Telegram) ───────────────────────
async def discord_webhook_embed(webhook_url: str, embeds: list):
    """Post embeds to a Discord channel via Webhook URL (no bot token needed)."""
    if not webhook_url:
        return
    async with aiohttp.ClientSession() as session:
        async with session.post(webhook_url, json={"embeds": embeds}) as resp:
            if resp.status not in (200, 201, 204):
                text = await resp.text()
                print(f"[discord] Webhook failed {resp.status}: {text[:200]}")

async def discord_webhook_text(webhook_url: str, content: str):
    """Post a plain text message to a Discord channel via Webhook URL."""
    if not webhook_url:
        return
    async with aiohttp.ClientSession() as session:
        async with session.post(webhook_url, json={"content": content[:2000]}) as resp:
            if resp.status not in (200, 201, 204):
                text = await resp.text()
                print(f"[discord] Webhook text failed {resp.status}: {text[:200]}")

async def telegram_send(bot_token: str, chat_id: str, text: str, parse_mode: str = "HTML"):
    """Send a message via Telegram Bot API."""
    if not bot_token or not chat_id:
        return
    url = f"https://api.telegram.org/bot{bot_token}/sendMessage"
    async with aiohttp.ClientSession() as session:
        async with session.post(url, json={
            "chat_id": chat_id,
            "text": text[:4096],
            "parse_mode": parse_mode,
            "disable_web_page_preview": True,
        }) as resp:
            if resp.status != 200:
                body = await resp.text()
                print(f"[telegram] Send failed {resp.status}: {body[:200]}")

class AlertConfigModel(BaseModel):
    discord_news_webhook:     Optional[str] = None
    discord_calendar_webhook: Optional[str] = None
    telegram_bot_token:       Optional[str] = None
    telegram_news_chat_id:    Optional[str] = None
    telegram_cal_chat_id:     Optional[str] = None

@app.get("/api/alert-config")
def get_alert_config():
    """Return current alert configuration (hides middle of tokens for security)."""
    def mask(s: str) -> str:
        if not s or len(s) < 12:
            return s
        return s[:8] + "..." + s[-6:]
    return {
        "discord_news_webhook":     _alert_config.get("discord_news_webhook", ""),
        "discord_calendar_webhook": _alert_config.get("discord_calendar_webhook", ""),
        "telegram_bot_token":       mask(_alert_config.get("telegram_bot_token", "")),
        "telegram_news_chat_id":    _alert_config.get("telegram_news_chat_id", ""),
        "telegram_cal_chat_id":     _alert_config.get("telegram_cal_chat_id", ""),
    }

@app.post("/api/alert-config")
def set_alert_config(req: AlertConfigModel):
    """Update alert config at runtime (persists in memory until bridge restarts — also saves to .env)."""
    global _alert_config
    if req.discord_news_webhook is not None:
        _alert_config["discord_news_webhook"] = req.discord_news_webhook
    if req.discord_calendar_webhook is not None:
        _alert_config["discord_calendar_webhook"] = req.discord_calendar_webhook
    if req.telegram_bot_token is not None:
        _alert_config["telegram_bot_token"] = req.telegram_bot_token
    if req.telegram_news_chat_id is not None:
        _alert_config["telegram_news_chat_id"] = req.telegram_news_chat_id
    if req.telegram_cal_chat_id is not None:
        _alert_config["telegram_cal_chat_id"] = req.telegram_cal_chat_id
    return {"success": True, "message": "Alert config updated"}

@app.post("/api/alert-config/test")
async def test_alert(type: str = "news"):
    """Send a test notification to verify webhook/bot setup."""
    is_cal = type == "calendar"
    webhook = _alert_config.get("discord_calendar_webhook" if is_cal else "discord_news_webhook", "")
    tg_token = _alert_config.get("telegram_bot_token", "")
    tg_chat = _alert_config.get("telegram_cal_chat_id" if is_cal else "telegram_news_chat_id", "")

    sent = []
    embed = {
        "title": "✅ TradeKiller Alert Test",
        "description": f"{'📅 Calendar' if is_cal else '📰 News'} channel is connected and working!",
        "color": 0x22c55e,
        "footer": {"text": "TradeKiller • Test Message"},
    }
    if webhook:
        await discord_webhook_embed(webhook, [embed])
        sent.append("discord")
    if tg_token and tg_chat:
        await telegram_send(tg_token, tg_chat, f"✅ TradeKiller Alert Test\n{'📅 Calendar' if is_cal else '📰 News'} notifications are working!")
        sent.append("telegram")
    if not sent:
        return {"success": False, "error": "No webhook/token configured for this alert type"}
    return {"success": True, "sent_to": sent}

@app.post("/api/connect")
def connect_account(req: ConnectRequest):
    global connected, _current_user_email
    if not connected or mt5.terminal_info() is None:
        init_mt5()
    
    # Try logging into the requested account on the open MT5 terminal
    authorized = mt5.login(req.login, password=req.password, server=req.server)
    if authorized:
        acc = mt5.account_info()
        # Save credentials per Gmail so they auto-reconnect next time
        if req.email:
            _save_credentials(req.email, req.login, req.password, req.server)
            _current_user_email = req.email
        # Pre-warm symbols
        for sym in DEFAULT_SYMBOLS:
            ensure_symbol(sym)
        return {
            "success": True,
            "message": f"Connected to #{req.login}",
            "account": {
                "login": acc.login if acc else req.login,
                "balance": acc.balance if acc else 0,
                "equity": acc.equity if acc else 0,
                "server": req.server,
                "currency": acc.currency if acc else "USD"
            }
        }
    else:
        error_code = mt5.last_error()
        return {"success": False, "error": f"Failed to connect. MT5 error: {error_code}"}

@app.post("/api/connect/auto")
def auto_connect(req: AutoConnectRequest):
    """Auto-reconnect a user's saved MT5 credentials by their Gmail."""
    global connected, _current_user_email
    creds = _get_credentials(req.email)
    if not creds:
        return {"success": False, "error": "No saved credentials for this account. Please connect manually first."}

    if not connected or mt5.terminal_info() is None:
        init_mt5()

    authorized = mt5.login(creds["login"], password=creds["password"], server=creds["server"])
    if authorized:
        acc = mt5.account_info()
        _current_user_email = req.email
        for sym in DEFAULT_SYMBOLS:
            ensure_symbol(sym)
        return {
            "success": True,
            "message": f"Auto-connected to #{creds['login']}",
            "account": {
                "login": acc.login if acc else creds["login"],
                "balance": acc.balance if acc else 0,
                "server": creds["server"]
            }
        }
    return {"success": False, "error": "Auto-connect failed — saved credentials may be outdated. Please connect manually."}

@app.get("/api/symbol-price")
def get_symbol_price(symbol: str):
    """Return live ask/bid and point/pip mapping for Risk RR calculator."""
    if not connected:
        return {"success": False, "error": "MT5 not connected"}
    working_symbol = ensure_symbol(symbol)
    symbol_info = mt5.symbol_info(working_symbol)
    if not symbol_info:
        return {"success": False, "error": f"Symbol {symbol} not found"}
    if not symbol_info.visible:
        mt5.symbol_select(working_symbol, True)
    
    tick = mt5.symbol_info_tick(working_symbol)
    if tick is None:
        return {"success": False, "error": "Could not get current price tick"}
    
    # Simple heuristic to determine "pip" size. 
    # Usually point * 10 is a pip on 5 and 3 digit brokers.
    # We will just expose Point and let frontend decide or do standard 10*point
    pip_size = symbol_info.point * (10 if symbol_info.digits in [3, 5] else 1)
    
    return {
        "success": True,
        "ask": tick.ask,
        "bid": tick.bid,
        "point": symbol_info.point,
        "pip_size": pip_size,
        "digits": symbol_info.digits
    }


@app.post("/api/execute-trade")
def execute_trade(req: TradeRequest):
    """Execute a live market order via MT5."""
    if not connected:
        return {"success": False, "error": "MT5 not connected"}
    acc = mt5.account_info()
    if acc is None:
        return {"success": False, "error": "No account logged in"}

    working_symbol = ensure_symbol(req.symbol)
    symbol_info = mt5.symbol_info(working_symbol)
    if symbol_info is None:
        return {"success": False, "error": f"Symbol {req.symbol} not found in MT5"}

    if not symbol_info.visible and not mt5.symbol_select(working_symbol, True):
        return {"success": False, "error": f"Could not activate symbol {working_symbol}"}

    tick = mt5.symbol_info_tick(working_symbol)
    if tick is None:
        return {"success": False, "error": "Could not get current price tick"}

    direction = req.direction.upper()
    order_type = mt5.ORDER_TYPE_BUY if direction == "BUY" else mt5.ORDER_TYPE_SELL
    price = tick.ask if direction == "BUY" else tick.bid

    # Validate lot size bounds
    lot = round(max(symbol_info.volume_min, min(symbol_info.volume_max,
             round(req.lot_size / symbol_info.volume_step) * symbol_info.volume_step)), 2)

    trade_request = {
        "action":       mt5.TRADE_ACTION_DEAL,
        "symbol":       working_symbol,
        "volume":       lot,
        "type":         order_type,
        "price":        price,
        "sl":           round(req.sl, symbol_info.digits),
        "tp":           round(req.tp, symbol_info.digits),
        "deviation":    30,
        "magic":        20260302,
        "comment":      req.comment or "TradeKiller",
        "type_time":    mt5.ORDER_TIME_GTC,
        "type_filling": mt5.ORDER_FILLING_IOC,
    }

    result = mt5.order_send(trade_request)
    if result is None:
        return {"success": False, "error": f"order_send returned None. MT5 error: {mt5.last_error()}"}
    if result.retcode != mt5.TRADE_RETCODE_DONE:
        return {
            "success": False,
            "error": f"Order rejected: {result.comment}",
            "retcode": result.retcode
        }
    return {
        "success":  True,
        "ticket":   result.order,
        "symbol":   working_symbol,
        "direction": direction,
        "lot_size": lot,
        "price":    result.price,
        "sl":       req.sl,
        "tp":       req.tp,
        "message":  f"Trade executed! Ticket #{result.order}"
    }


class NotifyMessage(BaseModel):
    message: str
    # channel type: "news" | "calendar" | "signal" | "alert" | "custom"
    # Determines which Discord channel to route to.
    # Telegram always gets ALL messages (single group, labeled by emoji).
    channel: Optional[str] = "news"
    # Override targets (optional — omit to use .env defaults)
    discordWebhookUrl: Optional[str] = None
    telegramBotToken:  Optional[str] = None
    telegramChatId:    Optional[str] = None


# ─── Channel → Discord webhook key ──────────────────────────────────────────
_CHANNEL_WEBHOOK_MAP = {
    "news":     "discord_news_webhook",
    "calendar": "discord_calendar_webhook",
    "signal":   "discord_signals_webhook",
    "alert":    "discord_alerts_webhook",
}
# ─── MODE A: channel → Telegram chat_id key ──────────────────────────────────
_CHANNEL_CHAT_MAP = {
    "news":     "telegram_chat_news",
    "calendar": "telegram_chat_calendar",
    "signal":   "telegram_chat_signals",
    "alert":    "telegram_chat_alerts",
}
# ─── MODE B: channel → Telegram thread_id key ────────────────────────────────
_CHANNEL_THREAD_MAP = {
    "news":     "telegram_thread_news",
    "calendar": "telegram_thread_calendar",
    "signal":   "telegram_thread_signals",
    "alert":    "telegram_thread_alerts",
}

@app.post("/api/notify")
def send_notification(req: NotifyMessage):
    success = True
    errors  = []
    channel = (req.channel or "news").lower()

    # ── 1. Resolve Discord target ──────────────────────────────────────────────
    discord_url = (
        req.discordWebhookUrl
        or _alert_config.get(_CHANNEL_WEBHOOK_MAP.get(channel, "discord_news_webhook"))
        or _alert_config.get("discord_news_webhook")
    )

    # ── 2. Resolve Telegram target (auto-detect Mode A vs Mode B) ─────────────
    tele_token = req.telegramBotToken or _alert_config.get("telegram_bot_token", "")

    # MODE A — dedicated channel: each message type has its own channel chat_id
    mode_a_chat = _alert_config.get(_CHANNEL_CHAT_MAP.get(channel, ""), "")

    # MODE B — shared group with Topics: one chat_id + a per-topic thread_id
    mode_b_chat   = _alert_config.get("telegram_chat_id", "")
    thread_key    = _CHANNEL_THREAD_MAP.get(channel, "")
    mode_b_thread = _alert_config.get(thread_key, "") if thread_key else ""

    # ── 3. Send to Discord ─────────────────────────────────────────────────────
    if discord_url and discord_url.strip():
        try:
            r = requests.post(discord_url.strip(), json={"content": req.message}, timeout=8)
            if not r.ok:
                success = False
                errors.append(f"Discord error {r.status_code}: {r.text[:120]}")
        except Exception as e:
            success = False
            errors.append(f"Discord exception: {str(e)}")

    # ── 4. Send to Telegram ────────────────────────────────────────────────────
    active_mode = "none"
    if tele_token and tele_token.strip():
        tele_payload: dict = {
            "text":       req.message,
            "parse_mode": "Markdown",
        }

        if mode_a_chat and mode_a_chat.strip():
            # ✨ MODE A — dedicated channel per type
            tele_payload["chat_id"] = mode_a_chat.strip()
            active_mode = "A"
        elif mode_b_chat and mode_b_chat.strip():
            # ✨ MODE B — shared group, route to topic thread
            tele_payload["chat_id"] = mode_b_chat.strip()
            if mode_b_thread and mode_b_thread.strip():
                tele_payload["message_thread_id"] = int(mode_b_thread.strip())
            active_mode = "B"
        else:
            errors.append(f"Telegram: no chat_id configured for channel '{channel}'")

        if active_mode != "none":
            try:
                url = f"https://api.telegram.org/bot{tele_token.strip()}/sendMessage"
                r = requests.post(url, json=tele_payload, timeout=8)
                if not r.ok:
                    success = False
                    errors.append(f"Telegram error {r.status_code}: {r.text[:120]}")
            except Exception as e:
                success = False
                errors.append(f"Telegram exception: {str(e)}")

    return {"success": success, "channel": channel, "telegram_mode": active_mode, "errors": errors}


@app.get("/api/positions")
def get_positions():
    if not connected:
        return {"success": False, "error": "MT5 not connected"}
    
    positions = mt5.positions_get()
    if positions is None:
        return {"success": True, "positions": []}
        
    pos_list = []
    for p in positions:
        pos_list.append({
            "ticket": p.ticket,
            "symbol": p.symbol,
            "type": p.type,  # 0: Buy, 1: Sell
            "volume": p.volume,
            "price_open": p.price_open,
            "sl": p.sl,
            "tp": p.tp,
            "price_current": p.price_current,
            "profit": p.profit,
            "time": p.time,
            "comment": p.comment,
            "swap": p.swap
        })
    return {"success": True, "positions": pos_list}

# --- REAL-TIME MARKET NEWS (Multi-source FREE RSS) ---
# ForexLive works. FXStreet & others need a browser UA to avoid 301/403.
NEWS_SOURCES = [
    {"name": "ForexLive",    "url": "https://www.forexlive.com/feed"},
    {"name": "FXStreet",     "url": "https://www.fxstreet.com/rss/news"},
    {"name": "MarketWatch",  "url": "https://feeds.content.dowjones.io/public/rss/mw_realtimeheadlines"},
    {"name": "Reuters Biz",  "url": "https://feeds.reuters.com/reuters/businessNews"},
]

FEED_UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"

# Keyword → (symbol, impact, sentiment)
_RULES = [
    (["gold","xau","bullion"],                            "XAUUSD",  "high",   "bullish"),
    (["silver","xag"],                                   "XAGUSD",  "medium", "neutral"),
    (["oil","crude","wti","brent"],                       "OIL",     "medium", "neutral"),
    (["euro","ecb","lagarde"],                            "EURUSD",  "high",   "neutral"),
    (["sterling","pound","gbp","boe","bailey"],           "GBPUSD",  "high",   "neutral"),
    (["yen","boj","ueda","japan intervene"],              "USDJPY",  "high",   "neutral"),
    (["fed","powell","fomc","federal reserve","rate hike","rate cut","inflation","cpi","nfp","payroll"], "USD", "high", "neutral"),
    (["bitcoin","btc","crypto","ethereum"],               "BTCUSD",  "medium", "neutral"),
    (["nasdaq","s&p","dow jones","equities","stocks"],    "NAS100",  "medium", "neutral"),
    (["aussie","rba","australia"],                        "AUDUSD",  "medium", "neutral"),
    (["cad","canada","bank of canada"],                  "USDCAD",  "medium", "neutral"),
    (["chf","snb","swiss"],                              "USDCHF",  "medium", "neutral"),
]
HOT_KEYWORDS = ["breaking","urgent","flash","shock","surprise","plunge","surge","crashes","intervention","emergency"]

def _classify(title: str):
    t = title.lower()
    symbol, impact, sentiment = "GLB", "low", "neutral"
    for keywords, sym, imp, sent in _RULES:
        if any(k in t for k in keywords):
            symbol, impact, sentiment = sym, imp, sent
            break
    is_hot = any(kw in t for kw in HOT_KEYWORDS) or impact == "high"
    if "up" in t or "surge" in t or "rises" in t or "gains" in t:
        sentiment = "bullish"
    elif "down" in t or "drop" in t or "falls" in t or "slides" in t:
        sentiment = "bearish"
    return symbol, impact, sentiment, is_hot

def _parse_source(source: dict) -> list:
    try:
        # Use requests + feedparser together so we can set a real browser UA
        resp = requests.get(source["url"], headers={"User-Agent": FEED_UA}, timeout=8)
        feed = feedparser.parse(resp.text)
        items = []
        for entry in feed.entries[:10]:
            symbol, impact, sentiment, is_hot = _classify(entry.get("title", ""))
            title_text = entry.get("title", "")
            stable_id = hashlib.md5(title_text.encode()).hexdigest()[:10]
            items.append({
                "id": stable_id,
                "source": source["name"],
                "title": entry.get("title", "(no title)"),
                "summary": entry.get("summary", "")[:220] if entry.get("summary") else "",
                "link": entry.get("link", ""),
                "time": entry.get("published", datetime.now().strftime("%Y-%m-%d %H:%M")),
                "symbol": symbol,
                "impact": impact,
                "sentiment": sentiment,
                "isHot": is_hot,
            })
        return items
    except Exception as e:
        print(f"[news] {source['name']} failed: {e}")
        return []

@app.get("/api/news")
def get_live_news():
    """Aggregate real-time Forex news from multiple free RSS sources."""
    all_items = []
    for source in NEWS_SOURCES:
        all_items.extend(_parse_source(source))

    # Deduplicate by title similarity & sort by hot first
    seen_titles: set = set()
    unique: list = []
    for item in all_items:
        key = item["title"][:60].lower()
        if key not in seen_titles:
            seen_titles.add(key)
            unique.append(item)

    unique.sort(key=lambda x: (x["isHot"], x["impact"] == "high"), reverse=True)

    if not unique:
        return {"success": False, "news": [], "error": "All RSS sources returned no data"}
    return {"success": True, "news": unique[:30], "sources": len(NEWS_SOURCES)}

# --- ECONOMIC CALENDAR (ForexFactory free JSON) ---
@app.get("/api/calendar")
def get_calendar():
    """Fetch this week's economic events from ForexFactory public JSON feed."""
    try:
        url = "https://nfs.faireconomy.media/ff_calendar_thisweek.json"
        resp = requests.get(url, headers={"User-Agent": FEED_UA}, timeout=8)
        events = resp.json()

        today = datetime.now().date()
        filtered = []
        for e in events:
            try:
                event_dt = datetime.strptime(e.get("date", ""), "%Y-%m-%dT%H:%M:%S%z")
                event_date = event_dt.date()
            except Exception:
                continue

            # Only today's events
            if event_date != today:
                continue

            filtered.append({
                "time":      event_dt.strftime("%H:%M"),
                "event":     e.get("title", ""),
                "currency":  e.get("currency", ""),
                "impact":    e.get("impact", "Low").lower(),  # High / Medium / Low
                "forecast":  e.get("forecast", "—") or "—",
                "previous":  e.get("previous", "—") or "—",
                "actual":    e.get("actual", None) or None,
                "country":   e.get("country", ""),
            })

        filtered.sort(key=lambda x: x["time"])
        return {"success": True, "events": filtered, "date": str(today)}
    except Exception as ex:
        return {"success": False, "events": [], "error": str(ex)}

# --- TECHNICAL SIGNALS (live MT5 candles → indicators) ---
def _compute_ema(prices: list, period: int) -> float:
    """Simple EMA from a list of closing prices."""
    if len(prices) < period:
        return prices[-1] if prices else 0
    k = 2 / (period + 1)
    ema = prices[0]
    for p in prices[1:]:
        ema = p * k + ema * (1 - k)
    return ema

def _compute_rsi(prices: list, period: int = 14) -> float:
    if len(prices) < period + 1:
        return 50.0
    gains, losses = [], []
    for i in range(1, len(prices)):
        diff = prices[i] - prices[i - 1]
        gains.append(max(diff, 0))
        losses.append(max(-diff, 0))
    avg_gain = sum(gains[-period:]) / period
    avg_loss = sum(losses[-period:]) / period
    if avg_loss == 0:
        return 100.0
    rs = avg_gain / avg_loss
    return round(100 - (100 / (1 + rs)), 1)

SIGNAL_SYMBOLS = ["EURUSD", "GBPJPY", "XAUUSD", "USDJPY", "GBPUSD"]
TF_SIGNAL = mt5.TIMEFRAME_H4 if mt5 else 16408

@app.get("/api/technicals")
def get_technicals():
    """Compute real-time technical signals from live MT5 candle data."""
    global connected
    if not connected or mt5.terminal_info() is None:
        init_mt5()
    if not connected:
        return {"success": False, "signals": [], "error": "MT5 not connected"}

    signals = []
    for sym in SIGNAL_SYMBOLS:
        try:
            rates = mt5.copy_rates_from_pos(sym, TF_SIGNAL, 0, 60)
            if rates is None or len(rates) < 20:
                continue
            closes = [r["close"] for r in rates]
            current = closes[-1]
            ema20  = _compute_ema(closes[-20:], 20)
            ema50  = _compute_ema(closes[-50:] if len(closes) >= 50 else closes, 50)
            rsi    = _compute_rsi(closes)
            change_pct = round((current - closes[-2]) / closes[-2] * 100, 3) if closes[-2] else 0

            # Simple signal logic
            if ema20 > ema50 and rsi < 70:
                direction, strength_base = "buy", 70
            elif ema20 < ema50 and rsi > 30:
                direction, strength_base = "sell", 70
            else:
                direction, strength_base = "neutral", 50

            # Boost strength if RSI confirms direction
            if direction == "buy" and rsi < 50:
                strength_base += 15
            elif direction == "sell" and rsi > 50:
                strength_base += 15
            if abs(rsi - 50) > 20:
                strength_base += 7

            pair_label = f"{sym[:3]}/{sym[3:]}"
            signals.append({
                "pair":       pair_label,
                "signal":     direction,
                "strength":   min(strength_base, 98),
                "price":      round(current, 5),
                "change":     change_pct,
                "timeframe":  "H4",
                "rsi":        rsi,
                "ema20":      round(ema20, 5),
                "ema50":      round(ema50, 5),
                "reason":     f"EMA20={'>' if ema20 > ema50 else '<'}EMA50 · RSI {rsi} · {'Bullish' if direction=='buy' else 'Bearish' if direction=='sell' else 'Ranging'} bias",
            })
        except Exception as ex:
            print(f"[technicals] {sym} error: {ex}")
            continue

    return {"success": True, "signals": signals}

# --- SENTIMENT DATA (real free APIs + MT5 strength) ---
@app.get("/api/sentiment")
def get_sentiment():
    """Aggregate Fear & Greed index history, currency strength, and news sentiment."""
    result = {}

    # 1. Fear & Greed Index – 30 days history (alternative.me – 100% free)
    try:
        fng = requests.get("https://api.alternative.me/fng/?limit=30", timeout=6).json()
        result["fearGreed"] = [
            {
                "date":  datetime.fromtimestamp(int(d["timestamp"])).strftime("%m/%d"),
                "value": int(d["value"]),
                "label": d["value_classification"],
            }
            for d in reversed(fng.get("data", []))
        ]
        result["fearGreedNow"] = result["fearGreed"][-1] if result["fearGreed"] else None
    except Exception as e:
        result["fearGreed"] = []
        result["fearGreedNow"] = None
        print(f"[sentiment] F&G error: {e}")

    # 2. Currency Strength – computed from MT5 live bid prices
    # Pair set chosen so each currency appears multiple times for a fair average
    STRENGTH_PAIRS = [
        ("EURUSD", "EUR", "USD"), ("GBPUSD", "GBP", "USD"),
        ("USDJPY", "USD", "JPY"), ("USDCHF", "USD", "CHF"),
        ("AUDUSD", "AUD", "USD"), ("NZDUSD", "NZD", "USD"),
        ("USDCAD", "USD", "CAD"), ("EURJPY", "EUR", "JPY"),
        ("GBPJPY", "GBP", "JPY"), ("EURGBP", "EUR", "GBP"),
    ]
    strength: dict = {c: [] for _, b, q in STRENGTH_PAIRS for c in (b, q)}
    if connected:
        for sym, base, quote in STRENGTH_PAIRS:
            try:
                tick = mt5.symbol_info_tick(sym)
                if tick:
                    pct = (tick.ask - tick.bid) / tick.bid * 50  # rough directional score
                    strength[base].append(pct)
                    strength[quote].append(-pct)
            except Exception:
                pass
    result["currencyStrength"] = [
        {
            "currency": cur,
            "score":    round(sum(vals) / len(vals) * 1000, 1) if vals else 0,
        }
        for cur, vals in strength.items() if vals
    ]
    result["currencyStrength"].sort(key=lambda x: x["score"], reverse=True)

    # 3. News-based sentiment counts (re-use cached news feed)
    try:
        news_data = get_live_news()
        items = news_data.get("news", [])
        counts: dict = {}
        for n in items:
            s = n.get("symbol", "GLB")
            sent = n.get("sentiment", "neutral")
            if s not in counts:
                counts[s] = {"bullish": 0, "bearish": 0, "neutral": 0, "symbol": s}
            counts[s][sent] += 1
        news_sentiment = []
        for sym, c in counts.items():
            total = c["bullish"] + c["bearish"] + c["neutral"] or 1
            news_sentiment.append({
                "symbol":  sym,
                "bullish": round(c["bullish"] / total * 100),
                "bearish": round(c["bearish"] / total * 100),
                "neutral": round(c["neutral"] / total * 100),
                "total":   total,
            })
        news_sentiment.sort(key=lambda x: x["total"], reverse=True)
        result["newsSentiment"] = news_sentiment[:8]
    except Exception as e:
        result["newsSentiment"] = []
        print(f"[sentiment] news sent error: {e}")

    return {"success": True, **result}

# ─── BACKTESTING REPLAY ENGINE ─────────────────────────────────────────────
# Sessions stored in-memory: { session_id: { ...session data } }
_replay_sessions: dict = {}

TIMEFRAME_MAP = {
    "M1": mt5.TIMEFRAME_M1,  "M5": mt5.TIMEFRAME_M5,
    "M15": mt5.TIMEFRAME_M15,"M30": mt5.TIMEFRAME_M30,
    "H1": mt5.TIMEFRAME_H1,  "H4": mt5.TIMEFRAME_H4,
    "D1": mt5.TIMEFRAME_D1,
}

def _replay_stats(session: dict) -> dict:
    trades   = session["trades"]
    bal      = session["initial_balance"]
    wins = losses = 0
    total_pnl = 0.0
    peak = bal
    max_dd = 0.0
    avg_r_list = []
    for t in trades:
        pnl = t.get("pnl", 0)
        total_pnl += pnl
        bal_now = session["initial_balance"] + total_pnl
        if pnl > 0:
            wins += 1; avg_r_list.append(pnl / max(t.get("risk_amount", 1), 0.0001))
        else:
            losses += 1; avg_r_list.append(pnl / max(t.get("risk_amount", 1), 0.0001))
        peak = max(peak, bal_now)
        dd = (peak - bal_now) / peak * 100
        max_dd = max(max_dd, dd)
    total  = wins + losses
    equity = session["initial_balance"] + total_pnl
    return {
        "total_trades": total,
        "wins": wins, "losses": losses,
        "win_rate": round(wins / total * 100, 1) if total else 0,
        "total_pnl": round(total_pnl, 2),
        "average_r": round(sum(avg_r_list) / len(avg_r_list), 2) if avg_r_list else 0,
        "expectancy": round(total_pnl / total, 2) if total else 0,
        "max_drawdown": round(max_dd, 2),
        "current_balance": round(session["initial_balance"] + total_pnl, 2),
        "equity": round(equity, 2),
    }

class ReplayCreate(BaseModel):
    symbol: str = "EURUSD"
    timeframe: str = "H1"
    start_date: str = ""
    end_date: str = ""
    initial_balance: float = 10000.0

class ReplayTrade(BaseModel):
    direction: str = "BUY"   # BUY | SELL
    entry: float = 0.0
    sl: float = 0.0
    tp: float = 0.0
    lot_size: float = 0.01

class ReplayJump(BaseModel):
    date: str = ""

@app.post("/api/replay/create")
def replay_create(req: ReplayCreate):
    if not connected:
        return {"success": False, "error": "MT5 not connected"}
    tf = TIMEFRAME_MAP.get(req.timeframe.upper(), mt5.TIMEFRAME_H1)
    symbol = req.symbol.upper()

    # Build date range
    try:
        from datetime import timezone
        if req.start_date:
            date_from = datetime.strptime(req.start_date[:10], "%Y-%m-%d").replace(tzinfo=timezone.utc)
        else:
            date_from = datetime(2024, 1, 1, tzinfo=timezone.utc)
        if req.end_date:
            date_to = datetime.strptime(req.end_date[:10], "%Y-%m-%d").replace(tzinfo=timezone.utc)
        else:
            date_to = datetime.now(timezone.utc)
    except Exception:
        date_from = datetime(2024, 1, 1)
        date_to = datetime.now()

    rates = mt5.copy_rates_range(symbol, tf, date_from, date_to)
    if rates is None or len(rates) == 0:
        return {"success": False, "error": f"No candles for {symbol} {req.timeframe} in range"}

    candles = []
    for r in rates:
        candles.append({
            "time":   datetime.utcfromtimestamp(r["time"]).strftime("%Y-%m-%dT%H:%M:%SZ"),
            "open":   float(r["open"]),
            "high":   float(r["high"]),
            "low":    float(r["low"]),
            "close":  float(r["close"]),
            "volume": int(r["tick_volume"]),
        })

    sid = hashlib.md5(f"{symbol}{req.timeframe}{req.start_date}{req.end_date}".encode()).hexdigest()[:10]
    _replay_sessions[sid] = {
        "session_id":      sid,
        "symbol":          symbol,
        "timeframe":       req.timeframe.upper(),
        "candles":         candles,
        "current_index":   0,
        "initial_balance": req.initial_balance,
        "trades":          [],
        "open_positions":  [],
    }
    return {
        "success": True,
        "session_id":   sid,
        "symbol":       symbol,
        "timeframe":    req.timeframe.upper(),
        "total_candles": len(candles),
        "candles":       candles,
    }

def _advance_replay(session: dict, new_index: int):
    """Close open positions whose SL/TP was hit in traversed candles."""
    candles = session["candles"]
    closed  = []
    for pos in list(session["open_positions"]):
        # Scan candles from old index to new_index
        for ci in range(min(session["current_index"] + 1, len(candles)), min(new_index + 1, len(candles))):
            c = candles[ci]
            hit_tp = (pos["direction"] == "BUY"  and c["high"] >= pos["tp"]) or \
                     (pos["direction"] == "SELL" and c["low"]  <= pos["tp"])
            hit_sl = (pos["direction"] == "BUY"  and c["low"]  <= pos["sl"]) or \
                     (pos["direction"] == "SELL" and c["high"] >= pos["sl"])
            if hit_tp or hit_sl:
                exit_price = pos["tp"] if hit_tp else pos["sl"]
                pip_diff   = (exit_price - pos["entry"]) * (1 if pos["direction"] == "BUY" else -1)
                pnl        = pip_diff * pos["lot_size"] * 10  # rough $10/pip/lot
                risk_amount  = abs(pos["entry"] - pos["sl"]) * pos["lot_size"] * 10
                session["trades"].append({
                    "id":           pos["id"],
                    "symbol":       session["symbol"],
                    "direction":    pos["direction"],
                    "entry":        pos["entry"],
                    "exit":         exit_price,
                    "sl":           pos["sl"],
                    "tp":           pos["tp"],
                    "lot_size":     pos["lot_size"],
                    "pnl":          round(pnl, 2),
                    "risk_amount":  round(risk_amount, 2),
                    "result":       "tp" if hit_tp else "sl",
                    "closed_on":    candles[ci]["time"],
                })
                session["open_positions"].remove(pos)
                closed.append(pos["id"])
                break

@app.post("/api/replay/{session_id}/next")
def replay_next(session_id: str):
    s = _replay_sessions.get(session_id)
    if not s:
        return {"success": False, "error": "Session not found"}
    idx    = s["current_index"]
    candles = s["candles"]
    if idx >= len(candles) - 1:
        return {"success": True, "progress": {"current_index": idx, "total_candles": len(candles), "progress_percent": 100}, "candle": None, "statistics": _replay_stats(s), "open_positions": s["open_positions"]}
    new_idx = idx + 1
    _advance_replay(s, new_idx)
    s["current_index"] = new_idx
    pct = new_idx / (len(candles) - 1) * 100
    return {"success": True, "progress": {"current_index": new_idx, "total_candles": len(candles), "progress_percent": round(pct, 2)}, "candle": candles[new_idx], "statistics": _replay_stats(s), "open_positions": s["open_positions"]}

@app.post("/api/replay/{session_id}/previous")
def replay_previous(session_id: str):
    s = _replay_sessions.get(session_id)
    if not s:
        return {"success": False, "error": "Session not found"}
    new_idx = max(0, s["current_index"] - 1)
    s["current_index"] = new_idx
    candles = s["candles"]
    pct = new_idx / max(len(candles) - 1, 1) * 100
    return {"success": True, "progress": {"current_index": new_idx, "total_candles": len(candles), "progress_percent": round(pct, 2)}, "candle": candles[new_idx], "statistics": _replay_stats(s)}

@app.post("/api/replay/{session_id}/jump")
def replay_jump(session_id: str, req: ReplayJump):
    s = _replay_sessions.get(session_id)
    if not s:
        return {"success": False, "error": "Session not found"}
    target = req.date[:10]
    candles = s["candles"]
    idx = next((i for i, c in enumerate(candles) if c["time"][:10] >= target), 0)
    _advance_replay(s, idx)
    s["current_index"] = idx
    pct = idx / max(len(candles) - 1, 1) * 100
    return {"success": True, "progress": {"current_index": idx, "total_candles": len(candles), "progress_percent": round(pct, 2)}, "candle": candles[idx]}

@app.get("/api/replay/{session_id}/status")
def replay_status(session_id: str):
    s = _replay_sessions.get(session_id)
    if not s:
        return {"success": False, "error": "Session not found"}
    idx = s["current_index"]
    candles = s["candles"]
    pct = idx / max(len(candles) - 1, 1) * 100
    return {"success": True, "current_candle": candles[idx] if idx < len(candles) else None, "progress": {"current_index": idx, "total_candles": len(candles), "progress_percent": round(pct, 2)}, "statistics": _replay_stats(s), "open_positions": s["open_positions"]}

@app.post("/api/replay/{session_id}/trade")
def replay_trade(session_id: str, req: ReplayTrade):
    s = _replay_sessions.get(session_id)
    if not s:
        return {"success": False, "error": "Session not found"}
    candles = s["candles"]
    idx = s["current_index"]
    entry = req.entry if req.entry else candles[idx]["close"]
    pos = {
        "id":        hashlib.md5(f"{session_id}{idx}{req.direction}".encode()).hexdigest()[:8],
        "symbol":    s["symbol"],
        "direction": req.direction.upper(),
        "entry":     entry,
        "sl":        req.sl,
        "tp":        req.tp,
        "lot_size":  req.lot_size,
    }
    s["open_positions"].append(pos)
    return {"success": True, "position": pos, "statistics": _replay_stats(s)}

# --- BOTS & TRADE COPIER MANAGEMENT ---
bots_db = [
    {
        "id": "master-mt5", "name": "Alpha Trend Scalper", "broker": "Local MT5", "apiKey": "LOCAL",
        "strategy": "London Breakout", "status": "active", "riskPerTrade": 1, "maxDailyLoss": 3,
        "symbols": ["EURUSD", "GBPUSD"], "createdAt": datetime.now().isoformat()
    }
]

class BotCreate(BaseModel):
    name: str
    broker: str
    strategy: str
    symbols: list[str]
    riskPerTrade: float
    maxDailyLoss: float

@app.get("/api/bots")
def get_bots():
    return {"success": True, "bots": bots_db}

@app.post("/api/bots")
def create_bot(bot: BotCreate):
    new_bot = {
        "id": str(uuid4())[:8],
        "name": bot.name,
        "broker": bot.broker,
        "apiKey": "LOCAL_MT5",
        "strategy": bot.strategy,
        "status": "active",
        "riskPerTrade": bot.riskPerTrade,
        "maxDailyLoss": bot.maxDailyLoss,
        "symbols": bot.symbols,
        "createdAt": datetime.now().isoformat()
    }
    bots_db.append(new_bot)
    return {"success": True, "bot": new_bot}

@app.post("/api/bots/{bot_id}/toggle")
def toggle_bot(bot_id: str):
    for b in bots_db:
        if b["id"] == bot_id:
            b["status"] = "paused" if b["status"] == "active" else "active"
            return {"success": True, "status": b["status"]}
    return {"success": False, "error": "Bot not found"}

@app.delete("/api/bots/{bot_id}")
def delete_bot(bot_id: str):
    global bots_db
    bots_db = [b for b in bots_db if b["id"] != bot_id]
    return {"success": True}

# --- REAL-TIME BOT TRADING ENGINE ---
async def bot_trading_loop():
    while True:
        if connected:
            for bot in bots_db:
                if bot["status"] != "active":
                    continue
                
                # Here is where you add MORE STRATEGIES!
                for symbol in bot["symbols"]:
                    
                    if bot["strategy"] == "London Breakout":
                        # Logic: Check time, find Asian range, wait for breakout
                        pass
                        
                    elif bot["strategy"] == "MACD Crossover":
                        # Logic: Fetch last 2 candles, check MACD lines, fire MT5 order
                        # Example usage:
                        # macd_val = calculate_macd(symbol)
                        # if macd_val > 0:
                        #    mt5.order_send(...)
                        pass
                        
                    elif bot["strategy"] == "EMA Scalping":
                        # Logic for Scalping
                        pass

        # Throttle loop to check every 1 second (1000ms)
        await asyncio.sleep(1.0)

@app.on_event("startup")
async def startup_event():
    # Start the continuous background trading engine
    asyncio.create_task(bot_trading_loop())

@app.get("/api/performance")
def get_bot_performance():
    # Return simulated performance for the local MT5 bots
    perf = []
    for index, b in enumerate(bots_db):
        uptime = f"{14 - index}d 6h" if b["status"] == "active" else "0d 0h"
        stat = "running" if b["status"] == "active" else "stopped"
        perf.append({
            "id": b["id"], "name": b["name"], 
            "totalTrades": 342 - (index * 50), "winRate": max(45.0, 68.4 - (index * 5)), 
            "pnl": 4250 - (index * 800), "roi": 12.5 - (index * 2), 
            "maxDrawdown": 3.2 + index, "sharpe": 1.85 - (index * 0.2), 
            "status": stat, "uptime": uptime
        })
    return {"success": True, "performance": perf}

class WebhookSignal(BaseModel):
    source: str
    symbol: str
    direction: str
    entry: float
    sl: float
    tp: float

signals_db = [
    { "id": "ini-1", "source": "TradingView Alerts", "symbol": "XAUUSD", "direction": "long", "entry": 2025.5, "sl": 2015.0, "tp": 2045.0, "status": "executed", "timestamp": datetime.now().isoformat() }
]

@app.get("/api/signals")
def get_signals():
    return {"success": True, "signals": signals_db}

@app.post("/api/webhook/copier")
def receive_signal(sig: WebhookSignal):
    new_sig = {
        "id": str(uuid4())[:8],
        "source": sig.source,
        "symbol": sig.symbol,
        "direction": sig.direction,
        "entry": sig.entry,
        "sl": sig.sl,
        "tp": sig.tp,
        "status": "pending",
        "timestamp": datetime.now().isoformat()
    }
    signals_db.insert(0, new_sig)
    
    # In a real environment, we'd fire an MT5 order right here!
    # e.g., run_mt5_buy_order(symbol=sig.symbol, sl=sig.sl, tp=sig.tp)
    
    return {"success": True, "signal": new_sig}

@app.get("/account")
def get_account():
    if not connected:
        return {"error": "Not connected"}
    acc = mt5.account_info()
    if acc is None:
        return {"error": "Could not get account info"}
    return {
        "balance": acc.balance,
        "equity": acc.equity,
        "profit": acc.profit,
        "margin": acc.margin,
        "margin_level": acc.margin_level,
        "margin_free": acc.margin_free
    }

def get_pip_value(symbol: str) -> float:
    """Get pip value in account currency for 1 standard lot"""
    info = mt5.symbol_info(symbol)
    if info is None:
        return 1.0
    # For JPY pairs, 1 pip = 0.01; for others 0.0001
    # pip_value_per_lot = contract_size * pip_size / current_price (for USD quoted)
    # Simplified: use tick_value * (pip_size / tick_size)
    tick_value = info.trade_tick_value
    tick_size = info.trade_tick_size
    if tick_size == 0:
        return 1.0
    
    # Determine pip size
    if "JPY" in symbol or "XAG" in symbol:
        pip_size = 0.01
    elif "XAU" in symbol:
        pip_size = 0.1  # Gold: 1 pip = $0.1 movement
    else:
        pip_size = 0.0001
    
    return tick_value * (pip_size / tick_size)

def calculate_atr(symbol: str, period: int = 14) -> float:
    """Calculate Average True Range in pips"""
    info = mt5.symbol_info(symbol)
    if info is None:
        return 0.0
    
    rates = mt5.copy_rates_from_pos(symbol, mt5.TIMEFRAME_H1, 0, period + 1)
    if rates is None or len(rates) < period:
        return 0.0
    
    # Determine pip size
    if "JPY" in symbol or "XAG" in symbol:
        pip_divisor = 0.01
    elif "XAU" in symbol:
        pip_divisor = 0.1
    else:
        pip_divisor = 0.0001
    
    tr_values = []
    for i in range(1, len(rates)):
        high = rates[i]['high']
        low = rates[i]['low']
        prev_close = rates[i-1]['close']
        tr = max(high - low, abs(high - prev_close), abs(low - prev_close))
        tr_values.append(tr / pip_divisor)
    
    if not tr_values:
        return 0.0
    
    return sum(tr_values[-period:]) / min(len(tr_values), period)

def compute_calculations(balance: float, risk_percent: float, rr_ratio: float = 2.0, atr_sl_multiplier: float = 1.5) -> list:
    """Compute risk calculations for all monitored symbols using dynamic strategy settings"""
    calculations = []
    risk_amount = balance * (risk_percent / 100)
    
    for symbol in DEFAULT_SYMBOLS:
        try:
            # Ensure symbol is visible
            if not mt5.symbol_select(symbol, True):
                continue
            
            tick = mt5.symbol_info_tick(symbol)
            info = mt5.symbol_info(symbol)
            if tick is None or info is None:
                continue
            
            current_price = (tick.ask + tick.bid) / 2
            spread_pts = tick.ask - tick.bid
            
            # Determine pip size
            if "JPY" in symbol or "XAG" in symbol:
                pip_size = 0.01
            elif "XAU" in symbol:
                pip_size = 0.1
            else:
                pip_size = 0.0001
            
            spread_pips = spread_pts / pip_size
            
            # ATR-based SL/TP Strategy
            atr_pips = calculate_atr(symbol)
            if atr_pips <= 0:
                atr_pips = 20.0  # fallback in case of no history
            
            # SL distance = ATR * multiplier
            sl_pips = atr_pips * atr_sl_multiplier
            # TP distance = SL distance * Reward Ratio
            tp_pips = sl_pips * rr_ratio
            actual_rr_ratio = tp_pips / sl_pips if sl_pips > 0 else rr_ratio
            
            # Pip value for 1 lot
            pip_val = get_pip_value(symbol)
            
            # Lot size = risk_amount / (sl_pips * pip_value_per_lot)
            lot_size = risk_amount / (sl_pips * pip_val) if (sl_pips * pip_val) > 0 else 0.01
            
            # Round lot size to broker step
            lot_step = info.volume_step if info.volume_step > 0 else 0.01
            lot_size = round(lot_size / lot_step) * lot_step
            lot_size = max(info.volume_min, min(info.volume_max, lot_size))
            
            potential_profit = tp_pips * pip_val * lot_size
            actual_risk = sl_pips * pip_val * lot_size
            
            # BUY levels
            buy_tp = tick.ask + (tp_pips * pip_size)
            buy_sl = tick.ask - (sl_pips * pip_size)
            
            # SELL levels
            sell_tp = tick.bid - (tp_pips * pip_size)
            sell_sl = tick.bid + (sl_pips * pip_size)
            
            calculations.append({
                "symbol": symbol,
                "current_price": round(current_price, info.digits),
                "spread": round(spread_pips, 1),
                "atr": round(atr_pips, 1),
                "lot_size": round(lot_size, 2),
                "tp_pips": round(tp_pips, 1),
                "sl_pips": round(sl_pips, 1),
                "rr_ratio": round(actual_rr_ratio, 2),
                "risk_amount": round(actual_risk, 2),
                "potential_profit": round(potential_profit, 2),
                "buy": {
                    "tp": round(buy_tp, info.digits),
                    "sl": round(buy_sl, info.digits)
                },
                "sell": {
                    "tp": round(sell_tp, info.digits),
                    "sl": round(sell_sl, info.digits)
                },
                "timestamp": datetime.now().isoformat()
            })
        except Exception as e:
            print(f"Error computing {symbol}: {e}")
            continue
    
    return calculations

@app.get("/api/calculations")
def get_calculations(risk_percent: float = 1.0, rr_ratio: float = 2.0, atr_sl_multiplier: float = 1.5):
    """Get real-time risk calculations for all symbols with dynamic settings"""
    global connected, calculator_running
    
    if not connected or mt5.terminal_info() is None:
        init_mt5()
    
    if not connected:
        return {
            "calculations": [],
            "last_update": None,
            "account_balance": 0,
            "risk_percent": risk_percent,
            "is_running": False,
            "error": "MT5 not connected"
        }
    
    acc = mt5.account_info()
    if acc is None:
        return {
            "calculations": [],
            "last_update": datetime.now().strftime("%H:%M:%S"),
            "account_balance": 0,
            "risk_percent": risk_percent,
            "is_running": False,
            "error": "MT5 connected but no account logged in. Open MetaTrader5 and log in to your broker account."
        }
    
    balance = acc.balance
    calculations = compute_calculations(balance, risk_percent, rr_ratio, atr_sl_multiplier)
    calculator_running = True
    
    return {
        "calculations": calculations,
        "last_update": datetime.now().strftime("%H:%M:%S"),
        "account_balance": balance,
        "risk_percent": risk_percent,
        "rr_ratio": rr_ratio,
        "atr_sl_multiplier": atr_sl_multiplier,
        "is_running": calculator_running
    }

@app.get("/api/live-data")
def get_live_data():
    """Get real-time raw feed for multi-asset monitoring"""
    global connected
    
    if not connected or mt5.terminal_info() is None:
        init_mt5()
        if not connected:
            return {"success": False, "error": "MT5 not connected"}
    
    data_list = []
    
    # We can fetch a few common symbols, or all from DEFAULT_SYMBOLS
    for sym in DEFAULT_SYMBOLS:
        if not mt5.symbol_select(sym, True):
            continue
            
        tick = mt5.symbol_info_tick(sym)
        if tick is None:
            continue
            
        data_list.append({
            "symbol": sym,
            "bid": tick.bid,
            "ask": tick.ask,
            "time": tick.time
        })
        
    return {"success": True, "data": data_list}

@app.post("/api/start")
def start_calculator():
    """Start the risk calculator"""
    global calculator_running
    calculator_running = True
    return {"success": True, "message": "Calculator started", "is_running": True}

@app.post("/api/stop")
def stop_calculator():
    """Stop the risk calculator"""
    global calculator_running
    calculator_running = False
    return {"success": True, "message": "Calculator stopped", "is_running": False}

# Map string timeframe names to MT5 constants
TF_MAP = {
    "M1":  mt5.TIMEFRAME_M1,
    "M5":  mt5.TIMEFRAME_M5,
    "M15": mt5.TIMEFRAME_M15,
    "M30": mt5.TIMEFRAME_M30,
    "H1":  mt5.TIMEFRAME_H1,
    "H4":  mt5.TIMEFRAME_H4,
    "D1":  mt5.TIMEFRAME_D1,
    "W1":  mt5.TIMEFRAME_W1,
}

@app.get("/api/candles")
def get_candles(symbol: str = "XAUUSD", timeframe: str = "M5", count: int = 150):
    """
    Return OHLC candles from MT5 for the given symbol and timeframe.
    timeframe: M1 | M5 | M15 | M30 | H1 | H4 | D1 | W1
    count: number of candles (max 500)
    """
    if not connected:
        return {"error": "MT5 not connected", "candles": []}

    # Check account is logged in
    acc = mt5.account_info()
    if acc is None:
        return {"error": "MT5 terminal open but no account logged in. Please log in to your broker in MetaTrader5 first.", "candles": []}

    tf = TF_MAP.get(timeframe.upper(), mt5.TIMEFRAME_M5)
    count = min(count, 500)

    # Try to find the symbol (including broker-specific aliases)
    working_symbol = ensure_symbol(symbol)
    
    rates = mt5.copy_rates_from_pos(working_symbol, tf, 0, count)
    if rates is None or len(rates) == 0:
        error = mt5.last_error()
        return {"error": f"No data for {symbol} (tried as '{working_symbol}'). MT5 error: {error}. Add it to Market Watch in MT5.", "candles": []}

    candles = [
        {
            "time":  int(r["time"]),   # Unix timestamp (seconds) — already UTC
            "open":  float(r["open"]),
            "high":  float(r["high"]),
            "low":   float(r["low"]),
            "close": float(r["close"]),
        }
        for r in rates
    ]
    return {"symbol": working_symbol, "timeframe": timeframe, "candles": candles}

@app.get("/api/historical-candles")
def get_historical_candles(symbol: str, target_time: int, timeframe: str = "H1", count_before: int = 150, count_after: int = 50):
    """
    Return OHLC candles around a specific historical timestamp.
    target_time: Unix timestamp in seconds (UTC)
    """
    if not connected:
        return {"error": "MT5 not connected", "candles": []}

    tf = TF_MAP.get(timeframe.upper(), mt5.TIMEFRAME_H1)
    working_symbol = ensure_symbol(symbol)
    
    # We load data up until target_time + count_after candles
    # MT5 copy_rates_from retrieves from date backwards
    # First convert target_time to datetime
    target_dt = datetime.utcfromtimestamp(target_time)
    
    # Simple logic: we copy a chunk from target_time backwards, and chunk forwards using range?
    # Or just copy range from target_time - a few weeks to target_time + a few weeks, and slice
    # M15 is 15 min, so let's just do generous bounds
    
    # Best way: copy_rates_range
    # Calculate bounds based on timeframe to get approx count_before and count_after
    tf_seconds = {
        mt5.TIMEFRAME_M1: 60,
        mt5.TIMEFRAME_M5: 300,
        mt5.TIMEFRAME_M15: 900,
        mt5.TIMEFRAME_M30: 1800,
        mt5.TIMEFRAME_H1: 3600,
        mt5.TIMEFRAME_H4: 14400,
        mt5.TIMEFRAME_D1: 86400,
        mt5.TIMEFRAME_W1: 604800,
    }.get(tf, 3600)
    
    # Add buffer for weekends (multiply required time by 2)
    start_ts = target_time - (count_before * tf_seconds * 2)
    end_ts = target_time + (count_after * tf_seconds * 2)
    
    rates = mt5.copy_rates_range(working_symbol, tf, start_ts, end_ts)
    if rates is None or len(rates) == 0:
        error = mt5.last_error()
        return {"error": f"No historical data for {symbol}. MT5 error: {error}", "candles": []}

    candles = [
        {
            "time":  int(r["time"]),
            "open":  float(r["open"]),
            "high":  float(r["high"]),
            "low":   float(r["low"]),
            "close": float(r["close"]),
        }
        for r in rates
    ]
    
    # We might have grabbed too many. Let's slice based on target_time
    # Find index of target_time
    idx = -1
    for i, c in enumerate(candles):
        if c["time"] >= target_time:
            idx = i
            break
            
    if idx != -1:
        start_idx = max(0, idx - count_before)
        end_idx = min(len(candles), idx + count_after)
        candles = candles[start_idx:end_idx]
        
    return {"symbol": working_symbol, "timeframe": timeframe, "candles": candles}


@app.get("/api/status")
def bot2_status():
    global connected
    if not connected or mt5.terminal_info() is None:
        init_mt5()
        
    if not connected:
        return {"is_running": False, "connected": False}
    
    # Mock some data for bot2's TradingDashboard
    acc = mt5.account_info()
    if acc is None:
        init_mt5()
        acc = mt5.account_info()

    positions = mt5.positions_get()
    parsed_positions = []
    
    if positions:
        for p in positions:
            parsed_positions.append({
                "ticket": p.ticket,
                "symbol": p.symbol,
                "type": "BUY" if p.type == 0 else "SELL",
                "volume": p.volume,
                "open_price": p.price_open,
                "current_price": p.price_current,
                "tp": p.tp,
                "sl": p.sl,
                "profit": p.profit,
                "time": str(p.time)
            })

    return {
        "is_running": True,  # fake running for now
        "connected": True,
        "config": {
            "trading_style": "scalping",
            "enable_auto_trade": True,
            "max_risk_percent": 2,
            "symbols": ["XAUUSD", "EURUSD"],
            "breakeven_trigger": 0.4,
            "partial_close_percent": 60,
        },
        "account": {
            "balance": acc.balance if acc else 0,
            "equity": acc.equity if acc else 0,
            "profit": acc.profit if acc else 0,
            "margin_level": acc.margin_level if acc else 0,
            "free_margin": acc.margin_free if acc else 0,
        },
        "positions": parsed_positions
    }

@app.get("/api/history")
def get_history():
    global connected
    if not connected or mt5.terminal_info() is None:
        init_mt5()
        
    if not connected:
        return {"data": []}

    # Fetch history for the last 90 days
    from_date = datetime.now() - timedelta(days=90)
    to_date = datetime.now()
    history = mt5.history_deals_get(from_date, to_date)
    
    if history is None or len(history) == 0:
        return {"data": []}

    # Separate open (entry=0) and close (entry=1) deals, keyed by position_id
    open_deals: dict = {}   # position_id -> deal
    close_deals: list = []

    for h in history:
        if h.entry == 0:  # IN — trade opened
            open_deals[h.position_id] = h
        elif h.entry == 1:  # OUT — trade closed
            close_deals.append(h)

    trades = []
    for close in close_deals:
        if not close.symbol:
            continue
        open_d = open_deals.get(close.position_id)
        entry_price = open_d.price if open_d else close.price
        open_time   = open_d.time  if open_d else close.time

        # direction: open deal type 0=buy, 1=sell
        if open_d:
            direction = "Long" if open_d.type == 0 else "Short"
        else:
            # fallback from close-side type (opposite)
            direction = "Short" if close.type == 0 else "Long"

        trades.append({
            "id":           close.ticket,
            "ticket":       str(close.ticket),
            "pair":         close.symbol,
            "direction":    direction,
            "entry":        entry_price,
            "closePrice":   close.price,
            "openTime":     datetime.fromtimestamp(open_time).isoformat() + "Z",
            "date":         datetime.fromtimestamp(close.time).isoformat() + "Z",   # close time
            "lotSize":      close.volume,
            "profit":       close.profit,
            "outcome":      "W" if close.profit > 0 else ("L" if close.profit < 0 else "E"),
        })

    # Most recent first
    trades.sort(key=lambda x: x["date"], reverse=True)
    return {"data": trades}

@app.post("/api/execute-trade")
def execute_trade(data: dict):
    """
    Execute a live market order via MT5.
    Expects json: {"symbol": "XAUUSD", "action": "buy" | "sell", "lot_size": 0.01}
    """
    if not connected:
        return {"success": False, "error": "MT5 not connected"}
    
    symbol = data.get("symbol", "XAUUSD")
    action = data.get("action", "").lower()
    lot_size = float(data.get("lot_size", 0.01))
    
    working_symbol = ensure_symbol(symbol)
    symbol_info = mt5.symbol_info(working_symbol)
    
    if symbol_info is None:
        return {"success": False, "error": f"{symbol} not found"}
        
    if not symbol_info.visible:
        if not mt5.symbol_select(working_symbol, True):
            return {"success": False, "error": f"Failed to select {working_symbol}"}
            
    tick = mt5.symbol_info_tick(working_symbol)
    order_type = mt5.ORDER_TYPE_BUY if action == "buy" else mt5.ORDER_TYPE_SELL
    price = tick.ask if action == "buy" else tick.bid

    request = {
        "action": mt5.TRADE_ACTION_DEAL,
        "symbol": working_symbol,
        "volume": lot_size,
        "type": order_type,
        "price": price,
        "sl": 0.0,
        "tp": 0.0,
        "deviation": 20,
        "magic": 999111,
        "comment": "TradeKiller web execution",
        "type_time": mt5.ORDER_TIME_GTC,
        "type_filling": mt5.ORDER_FILLING_IOC,
    }

    result = mt5.order_send(request)
    if result.retcode != mt5.TRADE_RETCODE_DONE:
        return {"success": False, "error": f"Order failed, retcode={result.retcode}"}

    direction = "Long" if action == "buy" else "Short"
    return {
        "success": True, 
        "message": f"Successfully executed {direction} {lot_size} lot on {working_symbol} at {price}",
        "ticket": result.order,
        "price": result.price
    }

@app.post("/api/execute-signal")
def execute_signal(data: dict):
    """
    Execute a community signal on MT5, auto-calculating lot size based on 1% risk of balance.
    Expects json: {"symbol": "XAUUSD", "action": "buy" | "sell", "tp": 2000.0, "sl": 1990.0}
    """
    if not connected:
        return {"success": False, "error": "MT5 not connected"}
    
    symbol = data.get("symbol", "XAUUSD")
    action = data.get("action", "").lower()
    tp = float(data.get("tp", 0.0))
    sl = float(data.get("sl", 0.0))
    
    working_symbol = ensure_symbol(symbol)
    symbol_info = mt5.symbol_info(working_symbol)
    
    if symbol_info is None:
        return {"success": False, "error": f"{symbol} not found in Market Watch"}
        
    if not symbol_info.visible:
        if not mt5.symbol_select(working_symbol, True):
            return {"success": False, "error": f"Failed to select {working_symbol}"}
    
    acc = mt5.account_info()
    if acc is None:
        return {"success": False, "error": "No broker account logged in"}
        
    tick = mt5.symbol_info_tick(working_symbol)
    order_type = mt5.ORDER_TYPE_BUY if action == "buy" else mt5.ORDER_TYPE_SELL
    price = tick.ask if action == "buy" else tick.bid

    # Determine pip size
    if "JPY" in working_symbol or "XAG" in working_symbol:
        pip_size = 0.01
    elif "XAU" in working_symbol:
        pip_size = 0.1
    else:
        pip_size = 0.0001
        
    sl_distance = abs(price - sl)
    sl_pips = sl_distance / pip_size
    
    # Auto-calculate Risk Amount (1% of balance)
    risk_percent = 1.0
    risk_amount = acc.balance * (risk_percent / 100)
    
    pip_val = get_pip_value(working_symbol)
    if pip_val <= 0 or sl_pips <= 0:
        lot_size = 0.01  # safe fallback if math fails
    else:
        lot_size = risk_amount / (sl_pips * pip_val)
        
    # Round to broker step
    lot_step = symbol_info.volume_step if symbol_info.volume_step > 0 else 0.01
    lot_size = round(lot_size / lot_step) * lot_step
    lot_size = max(symbol_info.volume_min, min(symbol_info.volume_max, lot_size))
    
    request = {
        "action": mt5.TRADE_ACTION_DEAL,
        "symbol": working_symbol,
        "volume": float(lot_size),
        "type": order_type,
        "price": price,
        "sl": sl,
        "tp": tp,
        "deviation": 20,
        "magic": 999112,
        "comment": "TradeKiller CopySignal",
        "type_time": mt5.ORDER_TIME_GTC,
        "type_filling": mt5.ORDER_FILLING_IOC,
    }

    result = mt5.order_send(request)
    if result.retcode != mt5.TRADE_RETCODE_DONE:
        return {"success": False, "error": f"Order failed, retcode={result.retcode} ({mt5.last_error()})"}

    return {
        "success": True, 
        "message": f"Automatically risked 1% on {lot_size} lot {action} for {working_symbol}",
        "ticket": result.order,
        "price": result.price,
        "lot_size": lot_size
    }


# ─── Discord Background Task: News → CHANNEL_ID ──────────────────────────────
_discord_seen_news_ids: set = set()

async def discord_news_loop():
    """Poll news every 5 minutes, post new HOT headlines to Discord."""
    global _discord_seen_news_ids
    await asyncio.sleep(10)  # small startup delay
    print("[discord] News poster loop started")
    while True:
        try:
            news_webhook = _alert_config.get("discord_news_webhook", "")
            tg_tok_check = _alert_config.get("telegram_bot_token", "")
            if news_webhook or tg_tok_check:
                resp = requests.get("http://localhost:5003/api/news", timeout=10)
                data = resp.json()
                if data.get("success") and data.get("news"):
                    hot = [n for n in data["news"] if n.get("isHot") and n["id"] not in _discord_seen_news_ids]
                    for item in hot[:5]:  # max 5 per cycle to avoid spam
                        _discord_seen_news_ids.add(item["id"])
                        color_map = {"bullish": 0x22c55e, "bearish": 0xef4444, "neutral": 0x6b7280}
                        embed = {
                            "title": f"🔥 {item['title'][:200]}",
                            "description": item.get("summary", "")[:300] or "—",
                            "color": color_map.get(item.get("sentiment", "neutral"), 0x6b7280),
                            "fields": [
                                {"name": "Symbol",    "value": item.get("symbol", "—"),    "inline": True},
                                {"name": "Impact",    "value": item.get("impact", "—"),    "inline": True},
                                {"name": "Sentiment", "value": item.get("sentiment", "—"), "inline": True},
                                {"name": "Source",    "value": item.get("source", "—"),    "inline": True},
                            ],
                            "footer": {"text": f"TradeKiller News • {item.get('time', '')}"},
                            "url": item.get("link", ""),
                        }
                        await discord_webhook_embed(news_webhook, [embed])
                        # Also send to Telegram news
                        tg_tok = _alert_config.get("telegram_bot_token", "")
                        tg_cid = _alert_config.get("telegram_news_chat_id", "")
                        if tg_tok and tg_cid:
                            tg_text = (
                                f"🔥 <b>{item['title'][:200]}</b>\n"
                                f"{item.get('summary','')[:300]}\n"
                                f"Symbol: {item.get('symbol','—')} | Impact: {item.get('impact','—')}"
                            )
                            await telegram_send(tg_tok, tg_cid, tg_text)
                        await asyncio.sleep(1.5)  # small delay between posts
        except Exception as e:
            print(f"[discord] News loop error: {e}")
        await asyncio.sleep(300)  # poll every 5 minutes


# ─── Discord Background Task: Calendar → CALENDAR_CHANNEL_ID ─────────────────
_discord_posted_cal_events: set = set()

def _fetch_calendar_events() -> list:
    """Fetch today's high-impact economic events."""
    try:
        url = "https://nfs.faireconomy.media/ff_calendar_thisweek.json"
        resp = requests.get(url, headers={"User-Agent": FEED_UA}, timeout=8)
        events = resp.json()
        today = datetime.now().date()
        filtered = []
        for e in events:
            try:
                dt = datetime.strptime(e.get("date", ""), "%Y-%m-%dT%H:%M:%S%z")
                if dt.date() != today:
                    continue
                impact = e.get("impact", "Low").lower()
                if impact not in ("high", "medium"):
                    continue
                filtered.append({
                    "time":     dt.strftime("%H:%M UTC"),
                    "event":    e.get("title", ""),
                    "currency": e.get("currency", ""),
                    "impact":   impact,
                    "forecast": e.get("forecast", "—") or "—",
                    "previous": e.get("previous", "—") or "—",
                    "actual":   e.get("actual", None),
                    "key":      f"{dt.strftime('%H%M')}-{e.get('title','')[:30]}",
                })
            except Exception:
                continue
        filtered.sort(key=lambda x: x["time"])
        return filtered
    except Exception as ex:
        print(f"[discord] Calendar fetch error: {ex}")
        return []


async def discord_calendar_loop():
    """Post today's forex calendar to Discord on startup, then every 1 hour for new events."""
    await asyncio.sleep(15)  # wait for server fully up
    print("[discord] Calendar poster loop started")
    posted_today = False
    last_post_date = None

    while True:
        try:
            cal_webhook = _alert_config.get("discord_calendar_webhook", "")
            if cal_webhook:
                today = datetime.now().date()
                events = _fetch_calendar_events()

                if events and (not posted_today or last_post_date != today):
                    # Post a summary embed for the full day
                    bullet_lines = []
                    for ev in events:
                        icon = "🔴" if ev["impact"] == "high" else "🟡"
                        actual_str = f" → **{ev['actual']}**" if ev["actual"] else ""
                        bullet_lines.append(
                            f"{icon} `{ev['time']}` **{ev['currency']}** {ev['event']} "
                            f"(Fcst: {ev['forecast']} | Prev: {ev['previous']}){actual_str}"
                        )

                    description = "\n".join(bullet_lines[:20])  # Discord embed limit
                    embed = {
                        "title": f"📅 Forex Economic Calendar — {today.strftime('%A, %d %B %Y')}",
                        "description": description[:4000],
                        "color": 0x6366f1,
                        "footer": {"text": "TradeKiller Calendar • Source: ForexFactory"},
                    }
                    await discord_webhook_embed(cal_webhook, [embed])
                    # Also post to Telegram calendar
                    tg_tok = _alert_config.get("telegram_bot_token", "")
                    tg_cid = _alert_config.get("telegram_cal_chat_id", "")
                    if tg_tok and tg_cid:
                        lines = [f"📅 <b>Forex Calendar — {today.strftime('%A, %d %B %Y')}</b>"]
                        for ev in events[:15]:
                            icon = "🔴" if ev["impact"] == "high" else "🟡"
                            lines.append(f"{icon} {ev['time']} <b>{ev['currency']}</b> {ev['event']} (Fcst: {ev['forecast']} | Prev: {ev['previous']})")
                        await telegram_send(tg_tok, tg_cid, "\n".join(lines))
                    posted_today = True
                    last_post_date = today
                    print(f"[discord] Calendar posted: {len(events)} events")

                # Also check for events happening in the next 15 minutes and ping
                now_min = datetime.utcnow().hour * 60 + datetime.utcnow().minute
                for ev in events:
                    ev_time_min = int(ev["time"][:2]) * 60 + int(ev["time"][3:5])
                    mins_until = ev_time_min - now_min
                    if 0 <= mins_until <= 15 and ev["key"] not in _discord_posted_cal_events:
                        _discord_posted_cal_events.add(ev["key"])
                        icon = "🚨" if ev["impact"] == "high" else "⚠️"
                        alert = (
                            f"{icon} **UPCOMING IN {mins_until} MIN:** "
                            f"`{ev['currency']}` {ev['event']} at `{ev['time']}` "
                            f"(Forecast: **{ev['forecast']}**, Previous: {ev['previous']})"
                        )
                        await discord_webhook_text(cal_webhook, alert)
                        # Telegram 15-min ping
                        tg_tok = _alert_config.get("telegram_bot_token", "")
                        tg_cid = _alert_config.get("telegram_cal_chat_id", "")
                        if tg_tok and tg_cid:
                            await telegram_send(tg_tok, tg_cid, alert.replace("**", "").replace("`", ""))

        except Exception as e:
            print(f"[discord] Calendar loop error: {e}")

        await asyncio.sleep(3600)  # re-post full calendar every hour


# ─── Lifespan (replaces deprecated on_event) ─────────────────────────────────

@asynccontextmanager
async def lifespan(app):
    # Startup
    asyncio.create_task(discord_news_loop())
    asyncio.create_task(discord_calendar_loop())
    print("[bridge] Background tasks started (Discord news + calendar)")
    yield
    # Shutdown — nothing special needed

app.router.lifespan_context = lifespan


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("mt5_bridge:app", host="0.0.0.0", port=5003, reload=True)
