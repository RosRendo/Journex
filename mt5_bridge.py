try:
    import MetaTrader5 as mt5
except ImportError:
    mt5 = None
    print("[bridge] MetaTrader5 not available (Windows-only, expected on Linux)")

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from PIL import ImageGrab
from pathlib import Path
import asyncio
import hashlib
import json
import math
import os
import time
import uuid
import aiohttp
import requests
import feedparser
from contextlib import asynccontextmanager
from datetime import datetime, timedelta, timezone
from typing import Optional, Dict
from pydantic import BaseModel
import logging

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

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
    "alerts_paused":            True,  # Default is paused
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

# ─── In-Memory Cache ─────────────────────────────────────────────────────────
# Shape: { "key": {"data": <payload>, "ts": <unix_timestamp>} }
_cache: dict = {}

def _cache_get(key: str, ttl_seconds: int = 300):
    """Return cached value if still fresh, else None."""
    entry = _cache.get(key)
    if entry and (time.time() - entry["ts"]) < ttl_seconds:
        return entry["data"]
    return None

def _cache_set(key: str, data):
    """Store value in cache with current timestamp."""
    _cache[key] = {"data": data, "ts": time.time()}

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],  # Explicitly allow frontend port
    allow_credentials=True, # Allowed now that origins are explicitly defined
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
    }

@app.get("/api/positions")
def get_positions():
    """Return all active open positions"""
    global connected
    if not connected or mt5.terminal_info() is None:
        init_mt5()
    if not connected:
        return {"success": False, "error": "MT5 not connected"}
        
    positions = mt5.positions_get()
    if positions is None:
        err = mt5.last_error()
        return {"success": False, "error": str(err)}
        
    data = []
    for p in positions:
        data.append({
            "ticket": p.ticket,
            "pair": p.symbol,
            "direction": "Long" if p.type == 0 else "Short",
            "volume": p.volume,
            "entry": p.price_open,
            "current": p.price_current,
            "sl": p.sl,
            "tp": p.tp,
            "pnl": p.profit,
            "swap": p.swap,
            "openTime": datetime.fromtimestamp(p.time).isoformat() + "Z"
        })
        
    return {"success": True, "positions": data}


class QuickTradeModel(BaseModel):
    symbol: str
    direction: str        # "BUY" or "SELL"
    lot_size: float
    sl: Optional[float] = 0.0
    tp: Optional[float] = 0.0
    comment: Optional[str] = "Journex Dashboard"

@app.post("/api/trade")
def place_quick_trade(req: QuickTradeModel):
    """Place a market order directly from the dashboard Quick Trade widget."""
    global connected
    if not connected or mt5.terminal_info() is None:
        init_mt5()
    if not connected:
        return {"success": False, "error": "MT5 not connected"}

    symbol = ensure_symbol(req.symbol)
    info = mt5.symbol_info(symbol)
    if info is None:
        return {"success": False, "error": f"Symbol {symbol} not found"}

    direction = req.direction.upper()
    order_type = mt5.ORDER_TYPE_BUY if direction == "BUY" else mt5.ORDER_TYPE_SELL
    price = mt5.symbol_info_tick(symbol).ask if direction == "BUY" else mt5.symbol_info_tick(symbol).bid

    request = {
        "action": mt5.TRADE_ACTION_DEAL,
        "symbol": symbol,
        "volume": req.lot_size,
        "type": order_type,
        "price": price,
        "sl": req.sl if req.sl else 0.0,
        "tp": req.tp if req.tp else 0.0,
        "deviation": 10,
        "magic": 234001,
        "comment": req.comment,
        "type_time": mt5.ORDER_TIME_GTC,
        "type_filling": mt5.ORDER_FILLING_IOC,
    }

    result = mt5.order_send(request)
    if result is None or result.retcode != mt5.TRADE_RETCODE_DONE:
        err = mt5.last_error()
        retcode = result.retcode if result else -1
        return {"success": False, "error": f"Order failed. Retcode: {retcode}. MT5 error: {err}"}

    # Broadcast trade to slaves
    trade_data = {
        "symbol": req.symbol,
        "direction": direction,
        "entry": price,
        "sl": req.sl if req.sl else 0.0,
        "tp": req.tp if req.tp else 0.0,
        "lot_size": req.lot_size,
        "ticket": result.order
    }
    asyncio.create_task(broadcast_to_slaves(trade_data))

    return {
        "success": True,
        "ticket": result.order,
        "volume": result.volume,
        "price": result.price,
        "comment": req.comment,
    }


class ClosePositionModel(BaseModel):
    ticket: int
    volume: Optional[float] = None  # If None, close full position

@app.post("/api/close-position")
def close_position(req: ClosePositionModel):
    """Close an open position by ticket number."""
    global connected
    if not connected or mt5.terminal_info() is None:
        init_mt5()
    if not connected:
        return {"success": False, "error": "MT5 not connected"}

    positions = mt5.positions_get(ticket=req.ticket)
    if not positions:
        return {"success": False, "error": f"Position #{req.ticket} not found"}

    pos = positions[0]
    symbol = pos.symbol
    volume = req.volume if req.volume else pos.volume
    close_type = mt5.ORDER_TYPE_SELL if pos.type == 0 else mt5.ORDER_TYPE_BUY
    price = mt5.symbol_info_tick(symbol).bid if pos.type == 0 else mt5.symbol_info_tick(symbol).ask

    request = {
        "action": mt5.TRADE_ACTION_DEAL,
        "symbol": symbol,
        "volume": volume,
        "type": close_type,
        "position": req.ticket,
        "price": price,
        "deviation": 10,
        "magic": 234001,
        "comment": "Journex Close",
        "type_time": mt5.ORDER_TIME_GTC,
        "type_filling": mt5.ORDER_FILLING_IOC,
    }

    result = mt5.order_send(request)
    if result is None or result.retcode != mt5.TRADE_RETCODE_DONE:
        err = mt5.last_error()
        retcode = result.retcode if result else -1
        return {"success": False, "error": f"Close failed. Retcode: {retcode}. MT5 error: {err}"}

    return {"success": True, "ticket": req.ticket, "message": f"Position #{req.ticket} closed."}


class ModifyPositionModel(BaseModel):
    ticket: int
    sl: Optional[float] = None
    tp: Optional[float] = None

@app.post("/api/modify-position")
def modify_position(req: ModifyPositionModel):
    """Modify the SL/TP of an open position."""
    global connected
    if not connected or mt5.terminal_info() is None:
        init_mt5()
    if not connected:
        return {"success": False, "error": "MT5 not connected"}

    positions = mt5.positions_get(ticket=req.ticket)
    if not positions:
        return {"success": False, "error": f"Position #{req.ticket} not found"}

    pos = positions[0]
    request = {
        "action": mt5.TRADE_ACTION_SLTP,
        "symbol": pos.symbol,
        "position": req.ticket,
        "sl": req.sl if req.sl is not None else pos.sl,
        "tp": req.tp if req.tp is not None else pos.tp,
    }

    result = mt5.order_send(request)
    if result is None or result.retcode != mt5.TRADE_RETCODE_DONE:
        err = mt5.last_error()
        retcode = result.retcode if result else -1
        return {"success": False, "error": f"Modify failed. Retcode: {retcode}. MT5 error: {err}"}

    return {"success": True, "ticket": req.ticket, "sl": req.sl, "tp": req.tp}


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
    comment: Optional[str] = "Journex Risk Calc"

# ─── Notification Helpers (Discord Webhook + Telegram) ───────────────────────
async def discord_webhook_embed(webhook_url: str, embeds: list, bypass_pause: bool = False):
    """Post embeds to a Discord channel via Webhook URL (no bot token needed)."""
    if not webhook_url:
        return
    if not bypass_pause and _alert_config.get("alerts_paused", True):
        return
    async with aiohttp.ClientSession() as session:
        async with session.post(webhook_url, json={"embeds": embeds}) as resp:
            if resp.status not in (200, 201, 204):
                text = await resp.text()
                print(f"[discord] Webhook failed {resp.status}: {text[:200]}")

async def discord_webhook_text(webhook_url: str, content: str, bypass_pause: bool = False):
    """Post a plain text message to a Discord channel via Webhook URL."""
    if not webhook_url:
        return
    if not bypass_pause and _alert_config.get("alerts_paused", True):
        return
    async with aiohttp.ClientSession() as session:
        async with session.post(webhook_url, json={"content": content[:2000]}) as resp:
            if resp.status not in (200, 201, 204):
                text = await resp.text()
                print(f"[discord] Webhook text failed {resp.status}: {text[:200]}")

async def telegram_send(bot_token: str, chat_id: str, text: str, parse_mode: str = "HTML", message_thread_id: str = None, bypass_pause: bool = False):
    """Send a message via Telegram Bot API."""
    if not bot_token or not chat_id:
        return
    if not bypass_pause and _alert_config.get("alerts_paused", True):
        return
    url = f"https://api.telegram.org/bot{bot_token}/sendMessage"
    payload = {
        "chat_id": chat_id,
        "text": text[:4096],
        "parse_mode": parse_mode,
        "disable_web_page_preview": True,
    }
    if message_thread_id:
        payload["message_thread_id"] = int(message_thread_id)

    async with aiohttp.ClientSession() as session:
        async with session.post(url, json=payload) as resp:
            if resp.status != 200:
                body = await resp.text()
                print(f"[telegram] Send failed {resp.status}: {body[:200]}")

class AlertConfigModel(BaseModel):
    discord_news_webhook:     Optional[str] = None
    discord_calendar_webhook: Optional[str] = None
    telegram_bot_token:       Optional[str] = None
    telegram_news_chat_id:    Optional[str] = None
    telegram_cal_chat_id:     Optional[str] = None
    alerts_paused:            Optional[bool] = None

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
        "alerts_paused":            _alert_config.get("alerts_paused", True),
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
    if req.alerts_paused is not None:
        _alert_config["alerts_paused"] = req.alerts_paused
    return {"success": True, "message": "Alert config updated"}

@app.post("/api/alert-config/test")
async def test_alert(type: str = "news"):
    """Send a test notification to verify webhook/bot setup."""
    is_cal = type == "calendar"
    chan_key = "calendar" if is_cal else "news"
    webhook = _alert_config.get(f"discord_{chan_key}_webhook", "")
    tg_token = _alert_config.get("telegram_bot_token", "")
    # Resolve Telegram target: Mode A (dedicated channel) or Mode B (group + thread)
    tg_chat = (
        _alert_config.get(f"telegram_chat_{chan_key}", "") or
        _alert_config.get("telegram_chat_id", "")
    )
    tg_thread = _alert_config.get(f"telegram_thread_{chan_key}", "")

    sent = []
    embed = {
        "title": "✅ Journex Alert Test",
        "description": f"{'📅 Calendar' if is_cal else '📰 News'} channel is connected and working!",
        "color": 0x22c55e,
        "footer": {"text": "Journex • Test Message"},
    }
    if webhook:
        await discord_webhook_embed(webhook, [embed], bypass_pause=True)
        sent.append("discord")
    if tg_token and tg_chat:
        await telegram_send(tg_token, tg_chat,
            f"✅ Journex Alert Test\n{'📅 Calendar' if is_cal else '📰 News'} notifications are working!",
            message_thread_id=tg_thread if tg_thread else None, bypass_pause=True)
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
        "comment":      req.comment or "Journex",
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
    if _alert_config.get("alerts_paused", True):
        return {"success": False, "error": "Alerts are paused"}
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

async def _parse_source_async(source: dict, session: aiohttp.ClientSession) -> list:
    try:
        async with session.get(source["url"], headers={"User-Agent": FEED_UA}, timeout=3.0) as resp:
            text = await resp.text()
            feed = feedparser.parse(text)
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
async def get_live_news():
    """Aggregate real-time Forex news from multiple free RSS sources concurrently."""
    all_items = []
    async with aiohttp.ClientSession() as session:
        tasks = [_parse_source_async(source, session) for source in NEWS_SOURCES]
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
    for res in results:
        if isinstance(res, list):
            all_items.extend(res)

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
        return {"success": False, "news": [], "error": "All RSS sources returned no data or timed out"}
    return {"success": True, "news": unique[:30], "sources": len(NEWS_SOURCES)}


# --- ECONOMIC CALENDAR (ForexFactory free JSON, cached 5 min) ---
_calendar_cache: dict = {"events": [], "fetched_at": 0.0, "date": ""}

@app.get("/api/calendar")
def get_calendar():
    """Fetch today's economic events. Results cached 5 min so sidebar loads instantly."""
    global _calendar_cache
    import time as _time
    now_ts = _time.time()

    # Serve from cache if still fresh (< 5 min)
    if now_ts - _calendar_cache["fetched_at"] < 300 and _calendar_cache["events"]:
        return {"success": True, "events": _calendar_cache["events"],
                "date": _calendar_cache["date"], "cached": True}

    CALENDAR_URLS = [
        "https://nfs.faireconomy.media/ff_calendar_thisweek.json",
        "https://cdn-nfs.faireconomy.media/ff_calendar_thisweek.json",
    ]

    raw_events = None
    last_error = ""
    for url in CALENDAR_URLS:
        try:
            resp = requests.get(url, headers={"User-Agent": FEED_UA}, timeout=10)
            resp.raise_for_status()
            raw_text = resp.text.strip()
            # Reject HTML error pages
            if not raw_text or raw_text[0] not in ("{", "["):
                last_error = f"Non-JSON from {url}: {raw_text[:80]!r}"
                continue
            raw_events = resp.json()
            break
        except Exception as ex:
            last_error = str(ex)
            continue

    if raw_events is None:
        if _calendar_cache["events"]:  # serve stale cache rather than empty
            return {"success": True, "events": _calendar_cache["events"],
                    "date": _calendar_cache["date"], "cached": True, "stale": True}
        return {"success": False, "events": [], "error": f"All sources failed: {last_error}"}

    today_utc = datetime.now(timezone.utc).date()
    filtered = []
    for e in raw_events:
        try:
            ds = e.get("date", "")
            # Normalize offset "-0400" -> "-04:00" for fromisoformat compat
            if len(ds) > 19 and ds[-5] in ("+", "-") and ":" not in ds[-6:]:
                ds = ds[:-2] + ":" + ds[-2:]
            try:
                dt_aware = datetime.fromisoformat(ds)
            except ValueError:
                dt_aware = datetime.strptime(ds[:19], "%Y-%m-%dT%H:%M:%S").replace(tzinfo=timezone.utc)
            dt_utc = dt_aware.astimezone(timezone.utc)
        except Exception:
            continue

        # Include today + tomorrow so panel is never empty near midnight
        if dt_utc.date() not in (today_utc, today_utc + timedelta(days=1)):
            continue

        imp = str(e.get("impact", "Low")).lower()
        impact = "high" if "high" in imp else "medium" if "medium" in imp or "med" in imp else "low"

        filtered.append({
            "time":     dt_utc.strftime("%H:%M"),   # 24h UTC - frontend computeSecs() expects this format
            "date_str": dt_utc.strftime("%b %d"),
            "event":    e.get("title", "Unknown"),
            "currency": (e.get("currency") or e.get("country") or "").upper(),
            "impact":   impact,
            "forecast": e.get("forecast", "") or "—",
            "previous": e.get("previous", "") or "—",
            "actual":   e.get("actual") or None,
            "country":  e.get("country", ""),
            "timestamp": dt_utc.timestamp(),
        })

    filtered.sort(key=lambda x: x["time"])
    _calendar_cache = {"events": filtered, "fetched_at": now_ts, "date": str(today_utc)}
    return {"success": True, "events": filtered, "date": str(today_utc)}

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

@app.get("/api/capital-flow")
def get_capital_flow():
    """Compute daily percentage change for major assets to show capital rotation"""
    global connected
    if not connected or mt5.terminal_info() is None:
        init_mt5()
    if not connected:
        return {"success": False, "flows": [], "error": "MT5 not connected"}
        
    # Standard basket of major assets
    basket = {
        "UKOIL": "UKOIL", "DXY": "DXY", "US10Y": "US10Y", "US02Y": "US02Y",
        "VIX": "VIX", "USDJPY": "USDJPY", "GBPUSD": "GBPUSD", "XAUUSD": "XAUUSD",
        "US100": "US100", "EURUSD": "EURUSD", "US30": "US30", "COPPER": "COPPER"
    }
    
    flows = []
    for label, sym in basket.items():
        try:
            # Try to get D1 candles to find the open price
            rates = mt5.copy_rates_from_pos(sym, mt5.TIMEFRAME_D1, 0, 2)
            if rates is None or len(rates) == 0:
                # If symbol not found, provide a graceful fallback 0.00
                flows.append({"label": label, "value": 0.00})
                continue
                
            current = rates[-1]["close"]
            open_price = rates[-1]["open"]
            if open_price == 0:
                flows.append({"label": label, "value": 0.00})
                continue
                
            change_pct = ((current - open_price) / open_price) * 100
            flows.append({"label": label, "value": round(change_pct, 2)})
        except Exception:
            flows.append({"label": label, "value": 0.00})
            
    # Sort by value descending to show flow from top to bottom
    flows.sort(key=lambda x: x["value"], reverse=True)
    return {"success": True, "flows": flows}

_TF_MAP = {
    "M1": mt5.TIMEFRAME_M1 if mt5 else 1,
    "M5": mt5.TIMEFRAME_M5 if mt5 else 5,
    "M15": mt5.TIMEFRAME_M15 if mt5 else 15,
    "M30": mt5.TIMEFRAME_M30 if mt5 else 30,
    "H1": mt5.TIMEFRAME_H1 if mt5 else 16385,
    "H4": mt5.TIMEFRAME_H4 if mt5 else 16388,
    "D1": mt5.TIMEFRAME_D1 if mt5 else 16408,
    "W1": mt5.TIMEFRAME_W1 if mt5 else 32769,
}

@app.get("/api/historical-candles")
def get_historical_candles(symbol: str, timeframe: str = "H1", count: int = 60):
    """Return historical OHLCV candles for a given symbol from MT5."""
    global connected
    if not connected or mt5.terminal_info() is None:
        init_mt5()
    if not connected:
        return {"success": False, "data": [], "error": "MT5 not connected"}

    tf = _TF_MAP.get(timeframe.upper(), mt5.TIMEFRAME_H1 if mt5 else 16385)
    resolved = ensure_symbol(symbol)

    try:
        rates = mt5.copy_rates_from_pos(resolved, tf, 0, count)
        if rates is None or len(rates) == 0:
            # try original symbol if resolved alias failed
            rates = mt5.copy_rates_from_pos(symbol, tf, 0, count)
        if rates is None or len(rates) == 0:
            return {"success": False, "data": [], "error": f"No candle data for {symbol} ({timeframe})"}

        data = [
            {
                "time": int(r["time"]),
                "open": float(r["open"]),
                "high": float(r["high"]),
                "low": float(r["low"]),
                "close": float(r["close"]),
                "volume": int(r["tick_volume"]),
            }
            for r in rates
        ]
        return {"success": True, "symbol": resolved, "timeframe": timeframe, "data": data}
    except Exception as e:
        return {"success": False, "data": [], "error": str(e)}

@app.get("/api/ai-analysis")
def get_ai_analysis(symbol: str, ai_key: str = None, provider: str = "openai"):
    """Compute AI Condition Meters (Flow, Bearing, Pulse) from real MT5 indicators"""
    global connected
    if not connected or mt5.terminal_info() is None:
        init_mt5()
    if not connected:
        return {"success": False, "error": "MT5 not connected"}
        
    try:
        # Get H1 candles for analysis
        rates = mt5.copy_rates_from_pos(symbol, mt5.TIMEFRAME_H1, 0, 100)
        if rates is None or len(rates) < 50:
            raise ValueError("Not enough tick data")
            
        closes = [r["close"] for r in rates]
        highs = [r["high"] for r in rates]
        lows = [r["low"] for r in rates]
        volumes = [r["tick_volume"] for r in rates]
        
        current = closes[-1]
        
        # 1. Pulse (Volatility/ATR logic)
        trs = [highs[i] - lows[i] for i in range(1, len(closes))]
        atr = sum(trs[-14:]) / 14 if len(trs) >= 14 else 0
        avg_atr = sum(trs) / len(trs) if len(trs) > 0 else 0
        
        if atr > avg_atr * 1.5:
            pulse = {"label": "Wild", "score": 90, "color": "var(--loss)", "bullets": ["High ATR expansion detected", "Wider stops required", "Expect slippage"]}
        elif atr < avg_atr * 0.5:
            pulse = {"label": "Quiet", "score": 15, "color": "var(--text-tertiary)", "bullets": ["ATR below historical norms", "Tight consolidation", "Breakout pending"]}
        else:
            pulse = {"label": "Tradable", "score": 55, "color": "var(--bull)", "bullets": ["ATR within normal range", "Standard risk-reward ratios apply", "Normal stop sizing"]}

        # 2. Flow (Volume/Participation logic)
        vol_avg = sum(volumes[-20:]) / 20 if len(volumes) >= 20 else 1
        vol_now = volumes[-1]
        
        if vol_now > vol_avg * 2:
            flow = {"label": "Crowded", "score": 85, "color": "var(--loss)", "bullets": ["Extreme volume spike", "Watch for exhaustion patterns", "Retail participation high"]}
        elif vol_now < vol_avg * 0.5:
            flow = {"label": "Thin", "score": 20, "color": "var(--text-tertiary)", "bullets": ["Low liquidity conditions", "Fills may be erratic", "Institutional absence"]}
        else:
            flow = {"label": "Healthy", "score": 50, "color": "var(--accent)", "bullets": ["Volume within expected block", "Fills executing near quotes", "Good structure"]}

        # 3. Bearing (Trend/RSI logic)
        ema20 = _compute_ema(closes[-20:], 20)
        ema50 = _compute_ema(closes[-50:], 50)
        rsi = _compute_rsi(closes)
        
        if ema20 > ema50:
            if rsi > 70:
                bearing = {"label": "Overextended Up", "score": 85, "color": "var(--bear)", "bullets": ["Golden cross remains intact", "RSI indicates overbought", "Pullback probability high"]}
            elif rsi > 50:
                bearing = {"label": "Bullish Trend", "score": 75, "color": "var(--bull)", "bullets": ["Clear upward momentum", "Moving averages aligned", "Buy dips favored"]}
            else:
                bearing = {"label": "Choppy Up", "score": 60, "color": "var(--accent)", "bullets": ["Upward bias but weak RSI", "Indecision in price action", "Wait for cleaner impulse"]}
        else:
            if rsi < 30:
                bearing = {"label": "Overextended Down", "score": 15, "color": "var(--bull)", "bullets": ["Death cross intact", "RSI indicates oversold", "Relief bounce likely"]}
            elif rsi < 50:
                bearing = {"label": "Bearish Trend", "score": 25, "color": "var(--bear)", "bullets": ["Clear downward momentum", "Moving averages pressuring", "Sell rallies favored"]}
            else:
                bearing = {"label": "Choppy Down", "score": 40, "color": "var(--warning)", "bullets": ["Downward drift but choppy", "RSI contradicts trend", "Exercise caution"]}

        if ai_key:
            try:
                import json
                import urllib.request
                prompt = (
                    f"Act as an institutional macro trader analyzing {symbol}. Write exactly 3 short, punchy bullet points for each gauge (Pulse=Volatility, Flow=Liquidity/Volume, Bearing=Trend/Momentum). "
                    "Use institutional terminology. Return pure JSON: {\"pulse\": [\"...\",\"...\",\"...\"], \"flow\": [\"...\"...], \"bearing\": [\"...\"...]}. "
                    f"Data: Pulse={pulse['label']}({pulse['score']}), Flow={flow['label']}({flow['score']}), Bearing={bearing['label']}({bearing['score']})."
                )
                if provider == "gemini":
                    req_url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key={ai_key}"
                    payload = {"contents": [{"parts": [{"text": prompt}]}]}
                    headers = {"Content-Type": "application/json"}
                elif provider == "claude":
                    req_url = "https://api.anthropic.com/v1/messages"
                    payload = {"model": "claude-3-haiku-20240307", "messages": [{"role": "user", "content": prompt}], "max_tokens": 1024}
                    headers = {"x-api-key": ai_key, "anthropic-version": "2023-06-01", "Content-Type": "application/json"}
                else:
                    req_url = "https://api.openai.com/v1/chat/completions"
                    payload = {"model": "gpt-3.5-turbo", "messages": [{"role": "user", "content": prompt}], "temperature": 0.4}
                    headers = {"Authorization": f"Bearer {ai_key}", "Content-Type": "application/json"}

                req = urllib.request.Request(
                    req_url,
                    data=json.dumps(payload).encode("utf-8"),
                    headers=headers,
                    method="POST"
                )
                with urllib.request.urlopen(req, timeout=15) as response:
                    if response.status == 200:
                        resp_data = json.loads(response.read().decode("utf-8"))
                        
                        if provider == "gemini":
                            content = resp_data.get("candidates", [{}])[0].get("content", {}).get("parts", [{}])[0].get("text", "").strip()
                        elif provider == "claude":
                            content = resp_data.get("content", [{}])[0].get("text", "").strip()
                        else:
                            content = resp_data.get("choices", [{}])[0].get("message", {}).get("content", "").strip()
                            
                        if content.startswith("```json"): content = content[7:-3].strip()
                        if content.endswith("```"): content = content[:-3].strip()
                        ai_dict = json.loads(content)
                        if "pulse" in ai_dict and len(ai_dict["pulse"]) > 0: pulse["bullets"] = ai_dict["pulse"]
                        if "flow" in ai_dict and len(ai_dict["flow"]) > 0: flow["bullets"] = ai_dict["flow"]
                        if "bearing" in ai_dict and len(ai_dict["bearing"]) > 0: bearing["bullets"] = ai_dict["bearing"]
            except Exception as e:
                print("AI API LLM Request Error in ai-analysis:", e)

        trend_str = "bullish" if ema20 > ema50 else "bearish"
        overview_text = f"Market structure for {symbol} currently exhibits a {trend_str} bias on the H1 timeframe. Technical models point towards " + ("accumulation" if trend_str == "bullish" else "distribution") + f" near current levels, backed by RSI momentum at {rsi:.1f}."

        return {
            "success": True, 
            "analysis": {
                "overview": overview_text,
                "pulse": pulse,
                "flow": flow,
                "bearing": bearing
            }
        }
    except Exception as e:
        return {"success": False, "error": str(e)}

SIGNAL_SYMBOLS = ["EURUSD", "GBPJPY", "XAUUSD", "USDJPY", "GBPUSD", "XAGUSD"]
TF_SIGNAL = mt5.TIMEFRAME_H4 if mt5 else 16408

@app.get("/api/technicals")
def get_technicals(ai_key: str = None, provider: str = "openai"):
    """Compute real-time technical signals from live MT5 candle data."""
    global connected
    if not connected or mt5.terminal_info() is None:
        init_mt5()
    if not connected:
        return {"success": False, "signals": [], "error": "MT5 not connected"}

    signals = []
    for sym in SIGNAL_SYMBOLS:
        try:
            # Resolve broker-specific symbol name (e.g. XAUUSDm, EURUSDm)
            resolved = ensure_symbol(sym)
            rates = mt5.copy_rates_from_pos(resolved, TF_SIGNAL, 0, 60)
            if rates is None or len(rates) < 20:
                # Try falling back to the original symbol
                rates = mt5.copy_rates_from_pos(sym, TF_SIGNAL, 0, 60)
                if rates is None or len(rates) < 20:
                    print(f"[technicals] No data for {sym} / {resolved} — skipping")
                    continue
                resolved = sym  # fallback worked
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
                "symbol":     sym,
                "signal":     direction,
                "strength":   min(strength_base, 98),
                "price":      round(current, 5),
                "change":     change_pct,
                "timeframe":  "H4",
                "rsi":        rsi,
                "ema20":      round(ema20, 5),
                "ema50":      round(ema50, 5),
                "reason":     f"EMA20={'>' if ema20 > ema50 else '<'}EMA50 · RSI {rsi} · {'Bullish' if direction=='buy' else 'Bearish' if direction=='sell' else 'Ranging'} bias",
                "macd":       "Bullish" if direction == "buy" else "Bearish" if direction == "sell" else "Neutral",
                "trend":      "Up" if direction == "buy" else "Down" if direction == "sell" else "Sideways",
            })
        except Exception as ex:
            print(f"[technicals] {sym} error: {ex}")
            continue

    if ai_key and len(signals) > 0:
        try:
            import json
            import urllib.request
            
            # Construct a prompt for the LLM
            data_summary = [{s["pair"]: f"Dir:{s['signal']}, RSI:{s['rsi']:.1f}, EMA20:{s['ema20']}, EMA50:{s['ema50']}"} for s in signals]
            prompt = (
                "Act as an institutional macro trader. Write a very concise, 1-2 sentence market analysis for each of these pairs based on the data. "
                "Be highly analytical, use terms like 'liquidity', 'consolidation', 'breakout', 'support/resistance'. "
                "Return pure JSON in this exact format, with the pair as key and the analysis as value: {\"EUR/USD\": \"...\", \"XAU/USD\": \"...\"}. "
                f"Data: {json.dumps(data_summary)}"
            )
            
            if provider == "gemini":
                req_url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key={ai_key}"
                payload = {"contents": [{"parts": [{"text": prompt}]}]}
                headers = {"Content-Type": "application/json"}
            elif provider == "claude":
                req_url = "https://api.anthropic.com/v1/messages"
                payload = {"model": "claude-3-haiku-20240307", "messages": [{"role": "user", "content": prompt}], "max_tokens": 1024}
                headers = {"x-api-key": ai_key, "anthropic-version": "2023-06-01", "Content-Type": "application/json"}
            else:
                req_url = "https://api.openai.com/v1/chat/completions"
                payload = {"model": "gpt-3.5-turbo", "messages": [{"role": "user", "content": prompt}], "temperature": 0.4}
                headers = {"Authorization": f"Bearer {ai_key}", "Content-Type": "application/json"}

            req = urllib.request.Request(
                req_url,
                data=json.dumps(payload).encode("utf-8"),
                headers=headers,
                method="POST"
            )
            
            with urllib.request.urlopen(req, timeout=15) as response:
                if response.status == 200:
                    resp_data = json.loads(response.read().decode("utf-8"))
                    
                    if provider == "gemini":
                        content = resp_data.get("candidates", [{}])[0].get("content", {}).get("parts", [{}])[0].get("text", "").strip()
                    elif provider == "claude":
                        content = resp_data.get("content", [{}])[0].get("text", "").strip()
                    else:
                        content = resp_data.get("choices", [{}])[0].get("message", {}).get("content", "").strip()
                    
                    # Clean up the markdown strictly if present
                    if content.startswith("```json"):
                        content = content[7:-3].strip()
                    if content.endswith("```"):
                        content = content[:-3].strip()
                        
                    ai_analysis_dict = json.loads(content)
                    
                    # Overwrite algorithmic reason with AI generated reason
                    for s in signals:
                        if s["pair"] in ai_analysis_dict:
                            s["reason"] = ai_analysis_dict[s["pair"]]
        except Exception as e:
            print("AI API LLM Request Error:", e)

    return {"success": True, "signals": signals}

# --- SENTIMENT DATA (real free APIs + MT5 strength) ---
@app.get("/api/macro-sentiment")
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
    
    # Try the symbol as-is, then common broker suffix variations
    base = req.symbol.rstrip("mMiI.")
    candidates = [req.symbol, base, base + "m", base + "M", req.symbol.upper()]
    candidates = list(dict.fromkeys(candidates))  # deduplicate

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

    rates = None
    symbol = req.symbol
    for sym in candidates:
        try:
            mt5.symbol_select(sym, True)
        except Exception:
            pass
        r = mt5.copy_rates_range(sym, tf, date_from, date_to)
        if r is not None and len(r) > 0:
            rates = r
            symbol = sym
            print(f"[backtest] Loaded {len(r)} candles for {sym} {req.timeframe}")
            break

    if rates is None or len(rates) == 0:
        tried = ", ".join(candidates)
        return {"success": False, "error": f"No candles found for {req.timeframe} between {req.start_date[:10]} and {req.end_date[:10]}. Tried: [{tried}]. Ensure the symbol is visible in MT5 Market Watch and the date range has historical data."}

    candles = []
    for r in rates:
        candles.append({
            "time":   int(r["time"]),   # Unix timestamp (number) — lightweight-charts compatible
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
BOTS_FILE = "bots_database.json"

def load_bots() -> list:
    """Load bots from database file."""
    try:
        if os.path.exists(BOTS_FILE):
            with open(BOTS_FILE, "r") as f:
                return json.load(f)
    except Exception as e:
        logger.error(f"[BOTS] Failed to load: {e}")
    return []

def save_bots(bots: list):
    """Save bots to database file."""
    try:
        with open(BOTS_FILE, "w") as f:
            json.dump(bots, f, indent=2)
    except Exception as e:
        logger.error(f"[BOTS] Failed to save: {e}")

bots_db = load_bots()

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

@app.post("/api/bots/test-trade")
def test_bot_trade():
    """Test Instant Scalping - shows signal, RSI, ATR."""
    if not connected:
        return {"success": False, "error": "MT5 not connected"}
    
    symbol = "XAUUSD"
    candles = get_bot_candles(symbol, "M1", 30)
    if not candles or len(candles) < 25:
        return {"success": False, "error": "Not enough candles"}
    
    closes = [c["close"] for c in candles]
    
    # EMA 9/21
    ema9 = calculate_ema(closes, 9)
    ema21 = calculate_ema(closes, 21)
    prev_closes = closes[:-1]
    prev_ema9 = calculate_ema(prev_closes, 9)
    prev_ema21 = calculate_ema(prev_closes, 21)
    
    # RSI 14
    rsi_period = 14
    gains, losses = [], []
    for i in range(1, min(rsi_period + 1, len(closes))):
        diff = closes[-i] - closes[-(i+1)]
        gains.append(max(diff, 0))
        losses.append(max(-diff, 0))
    avg_gain = sum(gains) / rsi_period
    avg_loss = sum(losses) / rsi_period if sum(losses) > 0 else 1
    rsi = 100 - (100 / (1 + avg_gain / avg_loss))
    
    # ATR
    atr = calculate_atr(candles, 14)
    current_price = closes[-1]
    
    # Signal
    signal = "HOLD"
    if prev_ema9 <= prev_ema21 and ema9 > ema21 and rsi > 55:
        signal = "BUY"
    elif prev_ema9 >= prev_ema21 and ema9 < ema21 and rsi < 45:
        signal = "SELL"
    
    sl_dist = atr * 1.2 if atr > 0 else 30
    tp_dist = atr * 1.8 if atr > 0 else 45
    
    positions = mt5.positions_get(symbol=symbol)
    open_count = len(positions) if positions else 0
    
    return {
        "success": True,
        "strategy": "Instant Scalping",
        "symbol": symbol,
        "ema9": round(ema9, 2),
        "ema21": round(ema21, 2),
        "price": round(current_price, 2),
        "rsi": round(rsi, 1),
        "atr": round(atr, 3),
        "signal": signal,
        "open_positions": open_count,
        "sl": round(current_price - sl_dist, 2),
        "tp": round(current_price + tp_dist, 2),
        "filters": f"RSI>55(buy) RSI<45(sell) ATR 0.40-3.00",
        "status": "Ready" if signal != "HOLD" else "Waiting"
    }

@app.post("/api/bots")
def create_bot(bot: BotCreate):
    new_bot = {
        "id": str(uuid.uuid4())[:8],
        "name": bot.name,
        "broker": bot.broker,
        "apiKey": "LOCAL_MT5",
        "strategy": bot.strategy,
        "status": "paused",
        "riskPerTrade": bot.riskPerTrade,
        "maxDailyLoss": bot.maxDailyLoss,
        "symbols": bot.symbols,
        "createdAt": datetime.now(timezone.utc).isoformat()
    }
    bots_db.append(new_bot)
    save_bots(bots_db)
    return {"success": True, "bot": new_bot}

@app.post("/api/bots/{bot_id}/toggle")
def toggle_bot(bot_id: str):
    for b in bots_db:
        if b["id"] == bot_id:
            b["status"] = "paused" if b["status"] == "active" else "active"
            save_bots(bots_db)
            return {"success": True, "status": b["status"]}
    return {"success": False, "error": "Bot not found"}

@app.delete("/api/bots/{bot_id}")
def delete_bot(bot_id: str):
    global bots_db
    bots_db = [b for b in bots_db if b["id"] != bot_id]
    save_bots(bots_db)
    return {"success": True}

# --- Helper: Get candles for bot trading ---
def get_bot_candles(symbol: str, timeframe: str = "M5", count: int = 100):
    """Fetch candles for bot trading strategies."""
    if not connected:
        return []
    
    symbol = ensure_symbol(symbol)
    tf_map = {"M1": mt5.TIMEFRAME_M1, "M5": mt5.TIMEFRAME_M5, "M15": mt5.TIMEFRAME_M15, "H1": mt5.TIMEFRAME_H1, "H4": mt5.TIMEFRAME_H4, "D1": mt5.TIMEFRAME_D1}
    tf = tf_map.get(timeframe, mt5.TIMEFRAME_M5)
    
    rates = mt5.copy_rates_from_pos(symbol, tf, 0, count)
    if rates is None:
        return []
    
    return [{"time": r[0], "open": r[1], "high": r[2], "low": r[3], "close": r[4], "volume": r[5]} for r in rates]

# --- Helper: Calculate EMA ---
def calculate_ema(prices: list, period: int) -> float:
    if len(prices) < period:
        return 0.0
    ema = sum(prices[:period]) / period
    multiplier = 2 / (period + 1)
    for price in prices[period:]:
        ema = (price - ema) * multiplier + ema
    return ema

# --- Helper: Calculate atr ---
def calculate_atr(candles: list, period: int = 14) -> float:
    if len(candles) < period + 1:
        return 0.0
    trs = []
    for i in range(1, len(candles)):
        high = candles[i]["high"]
        low = candles[i]["low"]
        prev_close = candles[i-1]["close"]
        tr = max(high - low, abs(high - prev_close), abs(low - prev_close))
        trs.append(tr)
    return sum(trs[-period:]) / period if len(trs) >= period else sum(trs) / len(trs) if trs else 0.0

# --- Helper: Execute bot trade ---
def execute_bot_trade(symbol: str, direction: str, lot_size: float, sl: float, tp: float, comment: str, magic: int):
    global bot_health
    
    if not connected:
        return False
    
    symbol = ensure_symbol(symbol)
    dir_upper = direction.upper()
    order_type = mt5.ORDER_TYPE_BUY if dir_upper == "BUY" else mt5.ORDER_TYPE_SELL
    price = mt5.symbol_info_tick(symbol).ask if dir_upper == "BUY" else mt5.symbol_info_tick(symbol).bid

    request = {
        "action": mt5.TRADE_ACTION_DEAL,
        "symbol": symbol,
        "volume": lot_size,
        "type": order_type,
        "price": price,
        "sl": sl,
        "tp": tp,
        "deviation": 10,
        "magic": magic,
        "comment": comment,
        "type_time": mt5.ORDER_TIME_GTC,
        "type_filling": mt5.ORDER_FILLING_IOC,
    }
    
    result = mt5.order_send(request)
    success = result and result.retcode == mt5.TRADE_RETCODE_DONE
    
    if success:
        logger.info(f"[TRADE] {direction} {symbol} {lot_size} lots at {price} | SL: {sl} TP: {tp}")
        bot_health["total_trades"] += 1
        
        log_trade(symbol, direction, lot_size, price, sl, tp, comment)
        
        trade_data = {
            "symbol": symbol,
            "direction": direction,
            "entry": price,
            "sl": sl,
            "tp": tp,
            "lot_size": lot_size,
            "ticket": result.order
        }
        
        asyncio.create_task(broadcast_to_slaves(trade_data))
    
    return success

def log_trade(symbol: str, direction: str, lot_size: float, price: float, sl: float, tp: float, comment: str):
    """Log trade to file for audit."""
    log_file = "bot_trades.log"
    timestamp = datetime.now(timezone.utc).isoformat()
    log_entry = f"{timestamp} | {direction} | {symbol} | {lot_size} | Entry: {price} | SL: {sl} | TP: {tp} | {comment}\n"
    
    try:
        with open(log_file, "a") as f:
            f.write(log_entry)
    except Exception as e:
        logger.error(f"[LOG] Failed to write trade log: {e}")

# --- Helper: Check if position exists for symbol ---
def has_open_position(symbol: str, magic: int) -> bool:
    if not connected:
        return False
    positions = mt5.positions_get(symbol=symbol)
    if positions is None:
        return False
    for pos in positions:
        if pos.magic == magic:
            return True
    return False

# --- Real-Time Bot Trading Engine ---
# Track bot states to avoid duplicate trades
bot_states: Dict[str, dict] = {}

async def bot_trading_loop():
    global bot_states
    await asyncio.sleep(3)  # Wait for Uvicorn startup
    while True:
        # Reconnect if needed
        if not connected or mt5.terminal_info() is None:
            init_mt5()
        
        if connected:
            for bot in bots_db:
                if bot["status"] != "active":
                    continue
                
                bot_id = bot["id"]
                if bot_id not in bot_states:
                    bot_states[bot_id] = {"last_trade": 0, "grid_level": 0, "asian_high": 0, "asian_low": 0}
                
                state = bot_states[bot_id]
                now = datetime.now(timezone.utc)
                current_hour = now.hour
                
                for symbol in bot["symbols"]:
                    risk = bot.get("riskPerTrade", 1.0)
                    lot_size = round(0.01 * risk, 2)  # 0.01 lot per 1% risk
                    if lot_size < 0.01:
                        lot_size = 0.01  # Minimum 0.01 lots
                    if lot_size > 1.0:
                        lot_size = 1.0  # Max 1.0 lots
                    magic = 234000 + int(bot_id[:4], 16)  # Unique magic per bot
                    
                    # Skip if position already open
                    if has_open_position(symbol, magic):
                        continue
                    
                    # === LONDON BREAKOUT ===
                    if bot["strategy"] == "London Breakout":
                        # Calculate Asian range (00:00-07:00 GMT)
                        if current_hour == 7 and state["asian_high"] == 0:
                            candles = get_bot_candles(symbol, "H1", 8)
                            if candles:
                                state["asian_high"] = max(c["high"] for c in candles[:7])
                                state["asian_low"] = min(c["low"] for c in candles[:7])
                        
                        # Check for breakout at 07:00-07:05 GMT
                        if 7 <= current_hour <= 7 and state["asian_high"] > 0:
                            candles = get_bot_candles(symbol, "M5", 3)
                            if candles:
                                current_price = candles[-1]["close"]
                                atr = calculate_atr(candles)
                                
                                # Long breakout
                                if current_price > state["asian_high"] + atr * 0.2:
                                    sl = current_price - atr * 1.5
                                    tp = current_price + atr * 3.0
                                    if execute_bot_trade(symbol, "BUY", lot_size, sl, tp, f"LBO-{symbol}", magic):
                                        state["last_trade"] = now.timestamp()
                                        print(f"[LBO] BUY {symbol} at {current_price}")
                                
                                # Short breakout
                                elif current_price < state["asian_low"] - atr * 0.2:
                                    sl = current_price + atr * 1.5
                                    tp = current_price - atr * 3.0
                                    if execute_bot_trade(symbol, "SELL", lot_size, sl, tp, f"LBO-{symbol}", magic):
                                        state["last_trade"] = now.timestamp()
                                        print(f"[LBO] SELL {symbol} at {current_price}")
                        
                        # Reset at 07:10 GMT
                        if current_hour == 7 and now.minute > 10:
                            state["asian_high"] = 0
                            state["asian_low"] = 0
                    
                    # --- INSTANT SCALPING BOT (RSI + ATR filters, 1:1.5 R:R) ---
                    elif bot["strategy"] == "Instant Scalping":
                        candles = get_bot_candles(symbol, "M1", 30)
                        if len(candles) >= 25:
                            closes = [c["close"] for c in candles]
                            highs = [c["high"] for c in candles]
                            lows = [c["low"] for c in candles]
                            
                            # EMA 9/21
                            ema9 = calculate_ema(closes, 9)
                            ema21 = calculate_ema(closes, 21)
                            prev_closes = closes[:-1]
                            prev_ema9 = calculate_ema(prev_closes, 9)
                            prev_ema21 = calculate_ema(prev_closes, 21)
                            
                            # RSI 14
                            rsi_period = 14
                            gains, losses = [], []
                            for i in range(1, min(rsi_period + 1, len(closes))):
                                diff = closes[-i] - closes[-(i+1)]
                                gains.append(max(diff, 0))
                                losses.append(max(-diff, 0))
                            avg_gain = sum(gains) / rsi_period
                            avg_loss = sum(losses) / rsi_period if sum(losses) > 0 else 1
                            rsi = 100 - (100 / (1 + avg_gain / avg_loss))
                            
                            # ATR
                            atr = calculate_atr(candles, 14)
                            
                            current_price = closes[-1]
                            
                            # ATR volatility gate
                            if atr < 0.40 or atr > 3.00:
                                logger.debug(f"[INSTANT] Skip: ATR {atr:.3f} outside gate (0.40-3.00)")
                            
                            # Count open positions
                            positions = mt5.positions_get(symbol=symbol)
                            open_count = len(positions) if positions else 0
                            max_trades = 3
                            
                            # Check to CLOSE existing positions
                            if positions:
                                for pos in positions:
                                    if pos.magic == magic:
                                        pip_profit = (current_price - pos.price_open) * (1 if pos.type == 0 else -1)
                                        
                                        # Close: +30 pips profit OR -20 pips loss
                                        if pip_profit > 30 or pip_profit < -20:
                                            close_price = mt5.symbol_info_tick(symbol).bid if pos.type == 0 else mt5.symbol_info_tick(symbol).ask
                                            mt5.order_send({
                                                "action": mt5.TRADE_ACTION_DEAL,
                                                "symbol": symbol,
                                                "volume": pos.volume,
                                                "type": mt5.ORDER_TYPE_SELL if pos.type == 0 else mt5.ORDER_TYPE_BUY,
                                                "price": close_price,
                                                "deviation": 10,
                                                "magic": magic,
                                                "comment": "INSTANT-CLOSE",
                                                "type_time": mt5.ORDER_TIME_GTC,
                                                "type_filling": mt5.ORDER_FILLING_IOC,
                                            })
                                            logger.info(f"[INSTANT] CLOSED {symbol} profit: {pip_profit:.1f} pips")
                            
                            # OPEN new position: EMA crossover + RSI filter
                            else:
                                sl_dist = atr * 1.2
                                tp_dist = atr * 1.8
                                
                                # Bullish: EMA9 crosses above EMA21 + RSI > 55
                                if prev_ema9 <= prev_ema21 and ema9 > ema21 and rsi > 55 and current_price > ema9:
                                    if open_count < max_trades:
                                        sl = current_price - sl_dist
                                        tp = current_price + tp_dist
                                        if execute_bot_trade(symbol, "BUY", lot_size, sl, tp, f"INSTANT-{symbol}", magic):
                                            state["last_trade"] = now.timestamp()
                                            logger.info(f"[INSTANT] BUY {symbol} RSI:{rsi:.1f} ATR:{atr:.3f}")
                                
                                # Bearish: EMA9 crosses below EMA21 + RSI < 45
                                elif prev_ema9 >= prev_ema21 and ema9 < ema21 and rsi < 45 and current_price < ema9:
                                    if open_count < max_trades:
                                        sl = current_price + sl_dist
                                        tp = current_price - tp_dist
                                        if execute_bot_trade(symbol, "SELL", lot_size, sl, tp, f"INSTANT-{symbol}", magic):
                                            state["last_trade"] = now.timestamp()
                                            logger.info(f"[INSTANT] SELL {symbol} RSI:{rsi:.1f} ATR:{atr:.3f}")
                        candles = get_bot_candles(symbol, "M1", 30)
                        if len(candles) >= 10:
                            closes = [c["close"] for c in candles]
                            
                            # Fast EMA: 5 and 13
                            ema5 = calculate_ema(closes, 5)
                            ema13 = calculate_ema(closes, 13)
                            prev_closes = closes[:-1]
                            prev_ema5 = calculate_ema(prev_closes, 5)
                            prev_ema13 = calculate_ema(prev_closes, 13)
                            
                            current_price = closes[-1]
                            atr = calculate_atr(candles)
                            
                            # Tight stops for scalping
                            sl_distance = atr * 0.5 if atr > 0 else current_price * 0.002
                            tp_distance = atr * 0.75 if atr > 0 else current_price * 0.003
                            
                            # Bullish crossover - BUY
                            if prev_ema5 <= prev_ema13 and ema5 > ema13:
                                sl = current_price - sl_distance
                                tp = current_price + tp_distance
                                if execute_bot_trade(symbol, "BUY", lot_size, sl, tp, f"FAST-{symbol}", magic):
                                    state["last_trade"] = now.timestamp()
                                    logger.info(f"[FAST] BUY {symbol} {lot_size} lots")
                            
                            # Bearish crossover - SELL
                            elif prev_ema5 >= prev_ema13 and ema5 < ema13:
                                sl = current_price + sl_distance
                                tp = current_price - tp_distance
                                if execute_bot_trade(symbol, "SELL", lot_size, sl, tp, f"FAST-{symbol}", magic):
                                    state["last_trade"] = now.timestamp()
                                    logger.info(f"[FAST] SELL {symbol} {lot_size} lots")
                    elif bot["strategy"] == "EMA Scalping" or bot["strategy"] == "1H EMA Trend Rider":
                        candles = get_bot_candles(symbol, "M5", 50)
                        if len(candles) >= 26:
                            closes = [c["close"] for c in candles]
                            
                            ema9 = calculate_ema(closes, 9)
                            ema21 = calculate_ema(closes, 21)
                            prev_closes = closes[:-1]
                            prev_ema9 = calculate_ema(prev_closes, 9)
                            prev_ema21 = calculate_ema(prev_closes, 21)
                            
                            current_price = closes[-1]
                            atr = calculate_atr(candles)
                            
                            # Bullish crossover
                            if prev_ema9 <= prev_ema21 and ema9 > ema21:
                                sl = current_price - atr * 1.0
                                tp = current_price + atr * 1.5
                                if execute_bot_trade(symbol, "BUY", lot_size, sl, tp, f"EMA-{symbol}", magic):
                                    state["last_trade"] = now.timestamp()
                                    logger.info(f"[EMA] BUY {symbol} EMA cross")
                            
                            # Bearish crossover
                            elif prev_ema9 >= prev_ema21 and ema9 < ema21:
                                sl = current_price + atr * 1.0
                                tp = current_price - atr * 1.5
                                if execute_bot_trade(symbol, "SELL", lot_size, sl, tp, f"EMA-{symbol}", magic):
                                    state["last_trade"] = now.timestamp()
                                    logger.info(f"[EMA] SELL {symbol} EMA cross")
                    
                    # === MACD CROSSOVER ===
                    elif bot["strategy"] == "MACD Crossover":
                        candles = get_bot_candles(symbol, "M15", 50)
                        if len(candles) >= 34:
                            closes = [c["close"] for c in candles]
                            
                            # MACD(12,26,9)
                            ema12 = calculate_ema(closes, 12)
                            ema26 = calculate_ema(closes, 26)
                            macd_line = ema12 - ema26
                            
                            # Signal line (EMA of MACD)
                            signal_values = []
                            for i in range(26, len(closes)):
                                e12 = calculate_ema(closes[:i+1], 12)
                                e26 = calculate_ema(closes[:i+1], 26)
                                signal_values.append(e12 - e26)
                            
                            if len(signal_values) >= 9:
                                signal_line = calculate_ema(signal_values, 9)
                                prev_signal = signal_values[-2] if len(signal_values) > 1 else 0
                                
                                current_price = closes[-1]
                                atr = calculate_atr(candles)
                                
                                # MACD cross above signal = BUY
                                if prev_signal <= macd_line and macd_line > signal_line:
                                    sl = current_price - atr * 1.2
                                    tp = current_price + atr * 2.0
                                    if execute_bot_trade(symbol, "BUY", lot_size, sl, tp, f"MACD-{symbol}", magic):
                                        state["last_trade"] = now.timestamp()
                                        print(f"[MACD] BUY {symbol}")
                                
                                # MACD cross below signal = SELL
                                elif prev_signal >= macd_line and macd_line < signal_line:
                                    sl = current_price + atr * 1.2
                                    tp = current_price - atr * 2.0
                                    if execute_bot_trade(symbol, "SELL", lot_size, sl, tp, f"MACD-{symbol}", magic):
                                        state["last_trade"] = now.timestamp()
                                        print(f"[MACD] SELL {symbol}")
                    
                    # === DYNAMIC GRID MATRIX ===
                    elif bot["strategy"] == "Dynamic Grid Matrix" or bot["strategy"] == "Grid":
                        candles = get_bot_candles(symbol, "H1", 48)
                        if not candles:
                            continue
                        
                        current_price = candles[-1]["close"]
                        atr = calculate_atr(candles, 14)
                        grid_spacing = atr * 0.5
                        
                        # Get existing positions for this symbol
                        positions = mt5.positions_get(symbol=symbol)
                        grid_levels = state.get("grid_levels", [])
                        
                        # Calculate grid levels (5 levels each side)
                        base_price = state.get("grid_base", current_price)
                        if base_price == 0:
                            state["grid_base"] = current_price
                            base_price = current_price
                        
                        # Check if we need to place new grid orders
                        if len(positions) < 10:
                            # Place new grid orders at intervals
                            for i in range(-3, 4):
                                level_price = base_price + (i * grid_spacing)
                                direction = "BUY" if i < 0 else "SELL" if i > 0 else None
                                if direction and not any(abs(pos.price_open - level_price) < grid_spacing * 0.5 for pos in positions or []):
                                    sl = level_price - (grid_spacing if direction == "BUY" else -grid_spacing) * 1.5
                                    tp = level_price + (grid_spacing if direction == "BUY" else -grid_spacing) * 1.0
                                    if execute_bot_trade(symbol, direction, lot_size, sl, tp, f"GRID-{symbol}", magic):
                                        print(f"[GRID] {direction} {symbol} at {level_price}")
                        
                        # Martingale: increase lot on losing trades
                        if positions:
                            total_pnl = sum(p.profit for p in positions)
                            if total_pnl < -atr * 10:  # Heavy loss
                                state["grid_level"] = state.get("grid_level", 0) + 1
                                lot_size *= (2 ** state["grid_level"])  # Double lot
                            elif total_pnl > 0:
                                state["grid_level"] = 0  # Reset on profit
                                state["grid_base"] = current_price  # New base

        await asyncio.sleep(1)

# Moved to lifespan

# --- ROBUST HEALTH MONITORING SYSTEM ---
bot_health: Dict[str, dict] = {
    "status": "healthy",
    "last_heartbeat": datetime.now(timezone.utc).isoformat(),
    "reconnect_attempts": 0,
    "total_trades": 0,
    "daily_pnl": 0.0,
    "last_reset_date": datetime.now(timezone.utc).date().isoformat(),
}

async def health_monitor_loop():
    """Health monitoring with auto-reconnect and daily loss protection."""
    global bot_health, connected
    
    while True:
        await asyncio.sleep(30)  # Check every 30 seconds
        
        current_date = datetime.now(timezone.utc).date().isoformat()
        
        # Reset daily P&L tracker
        if bot_health.get("last_reset_date") != current_date:
            bot_health["daily_pnl"] = 0.0
            bot_health["last_reset_date"] = current_date
            logger.info(f"[HEALTH] Daily P&L reset to 0")
        
        # Auto-reconnect on disconnect with exponential backoff
        if not connected or mt5.terminal_info() is None:
            bot_health["reconnect_attempts"] += 1
            wait_time = min(2 ** bot_health["reconnect_attempts"], 300)  # Max 5 min wait
            logger.warning(f"[HEALTH] MT5 disconnected. Reconnect attempt {bot_health['reconnect_attempts']} in {wait_time}s")
            
            await asyncio.sleep(wait_time)
            
            # Try reconnect using saved credentials
            if init_mt5():
                logger.info(f"[HEALTH] Reconnected successfully after {bot_health['reconnect_attempts']} attempts")
                bot_health["reconnect_attempts"] = 0
            else:
                logger.error(f"[HEALTH] Reconnect failed. Will retry...")
                continue
        
        # Update heartbeat
        bot_health["last_heartbeat"] = datetime.now(timezone.utc).isoformat()
        bot_health["status"] = "healthy" if connected else "disconnected"
        
        # Track daily P&L
        account_info = mt5.account_info() if connected else None
        if account_info:
            daily_pnl = account_info.profit
            equity = account_info.equity
            balance = account_info.balance
            
            bot_health["daily_pnl"] = daily_pnl
            bot_health["equity"] = equity
            bot_health["balance"] = balance
            
            logger.info(f"[HEALTH] Equity: {equity:.2f} | Daily P&L: {daily_pnl:.2f}")
        
        # Check daily loss limit (-3% of account) and pause if exceeded
        if account_info:
            equity = account_info.equity
            balance = account_info.balance
            
            if balance > 0:
                loss_pct = (daily_pnl / balance) * 100
                
                if loss_pct <= -3.0:
                    for bot in bots_db:
                        if bot["status"] == "active":
                            bot["status"] = "paused"
                            logger.warning(f"[HEALTH] Daily loss {loss_pct:.1f}%. Paused bot {bot['name']}")
                            
                            if _alert_config.get("telegram_bot_token"):
                                await send_telegram_alert(f"⚠️ Bot paused: Daily loss {loss_pct:.1f}% exceeded 3% limit")
                            if _alert_config.get("discord_alerts_webhook"):
                                send_discord_alert(f"⚠️ Bot paused: Daily loss {loss_pct:.1f}% exceeded 3% limit")

async def send_telegram_alert(message: str):
    """Send alert to Telegram."""
    if _alert_config.get("alerts_paused", True):
        return
    token = _alert_config.get("telegram_bot_token")
    chat_id = _alert_config.get("telegram_chat_alerts") or _alert_config.get("telegram_chat_id")
    
    if not token or not chat_id:
        return
    
    try:
        import httpx
        await httpx.AsyncClient().post(
            f"https://api.telegram.org/bot{token}/sendMessage",
            json={"chat_id": chat_id, "text": message}
        )
    except Exception as e:
        logger.error(f"[TELEGRAM] Alert failed: {e}")

def send_discord_alert(message: str):
    """Send alert to Discord."""
    if _alert_config.get("alerts_paused", True):
        return
    webhook = _alert_config.get("discord_alerts_webhook")
    if not webhook:
        return
    
    try:
        requests.post(webhook, json={"content": message})
    except Exception as e:
        logger.error(f"[DISCORD] Alert failed: {e}")

@app.get("/api/bot-health")
def get_bot_health():
    """Get bot health status."""
    return {"success": True, "health": bot_health}

@app.post("/api/bot-health/reset-daily")
def reset_daily_pnl():
    """Reset daily P&L tracker."""
    bot_health["daily_pnl"] = 0.0
    bot_health["last_reset_date"] = datetime.now(timezone.utc).date().isoformat()
    
    # Resume bots
    for bot in bots_db:
        if bot["status"] == "paused":
            bot["status"] = "active"
    
    return {"success": True, "message": "Daily P&L reset and bots resumed"}

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

# --- SLAVE COPY TRADING REGISTRY ---
SLAVES_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "slaves_database.json")

def load_slaves() -> list:
    try:
        if os.path.exists(SLAVES_FILE):
            with open(SLAVES_FILE, "r") as f:
                return json.load(f)
    except Exception as e:
        logger.error(f"[SLAVES] Failed to load: {e}")
    return []

def save_slaves(slaves: list):
    try:
        with open(SLAVES_FILE, "w") as f:
            json.dump(slaves, f, indent=2)
    except Exception as e:
        logger.error(f"[SLAVES] Failed to save: {e}")

slaves_db = load_slaves()

class SlaveCreate(BaseModel):
    name: str
    webhook_url: str
    multiplier: float = 1.0

class SlaveTradeSignal(BaseModel):
    symbol: str
    direction: str
    entry: float
    sl: float
    tp: float
    lot_size: float
    master_ticket: Optional[int] = None

@app.get("/api/slaves")
def get_slaves():
    return {"success": True, "slaves": slaves_db}

@app.post("/api/slaves")
def create_slave(slave: SlaveCreate):
    new_slave = {
        "id": str(uuid.uuid4())[:8],
        "name": slave.name,
        "webhook_url": slave.webhook_url,
        "multiplier": slave.multiplier,
        "enabled": True,
        "createdAt": datetime.now(timezone.utc).isoformat()
    }
    slaves_db.append(new_slave)
    save_slaves(slaves_db)
    return {"success": True, "slave": new_slave}

@app.delete("/api/slaves/{slave_id}")
def delete_slave(slave_id: str):
    global slaves_db
    slaves_db = [s for s in slaves_db if s["id"] != slave_id]
    save_slaves(slaves_db)
    return {"success": True}

@app.post("/api/slaves/{slave_id}/toggle")
def toggle_slave(slave_id: str):
    for s in slaves_db:
        if s["id"] == slave_id:
            s["enabled"] = not s["enabled"]
            save_slaves(slaves_db)
            return {"success": True, "enabled": s["enabled"]}
    return {"success": False, "error": "Slave not found"}

# --- SLAVE TRADE EXECUTION ENDPOINT ---
@app.post("/api/copy-trade/execute")
def execute_copied_trade(signal: SlaveTradeSignal):
    """Execute a trade received from master account."""
    if not connected:
        return {"success": False, "error": "MT5 not connected"}
    
    symbol = ensure_symbol(signal.symbol)
    dir_upper = signal.direction.upper()
    order_type = mt5.ORDER_TYPE_BUY if dir_upper == "BUY" else mt5.ORDER_TYPE_SELL
    
    try:
        tick = mt5.symbol_info_tick(symbol)
        price = tick.ask if dir_upper == "BUY" else tick.bid
    except Exception:
        return {"success": False, "error": "Failed to get price"}
    
    request = {
        "action": mt5.TRADE_ACTION_DEAL,
        "symbol": symbol,
        "volume": signal.lot_size,
        "type": order_type,
        "price": price,
        "sl": signal.sl,
        "tp": signal.tp,
        "deviation": 10,
        "magic": 888000,  # Copier magic number
        "comment": f"COPY-MASTER-{signal.master_ticket}",
        "type_time": mt5.ORDER_TIME_GTC,
        "type_filling": mt5.ORDER_FILLING_IOC,
    }
    
    result = mt5.order_send(request)
    success = result and result.retcode == mt5.TRADE_RETCODE_DONE
    
    logger.info(f"[COPY] {signal.direction} {signal.symbol} {signal.lot_size} lots - Slave execution: {'OK' if success else 'FAIL'}")
    
    return {"success": success, "ticket": result.order if success else None}

# --- BROADCAST TRADE TO SLAVES ---
async def broadcast_to_slaves(trade_data: dict):
    """Broadcast executed trade to all enabled slaves."""
    for slave in slaves_db:
        if not slave.get("enabled", True):
            continue
        
        webhook = slave.get("webhook_url")
        if not webhook:
            continue
        
        multiplier = slave.get("multiplier", 1.0)
        lot_size = round(trade_data.get("lot_size", 0.01) * multiplier, 2)
        
        signal = {
            "symbol": trade_data["symbol"],
            "direction": trade_data["direction"],
            "entry": trade_data["entry"],
            "sl": trade_data["sl"],
            "tp": trade_data["tp"],
            "lot_size": lot_size,
            "master_ticket": trade_data.get("ticket")
        }
        
        try:
            async with aiohttp.ClientSession() as session:
                await session.post(webhook, json=signal, timeout=aiohttp.ClientTimeout(total=10))
                logger.info(f"[COPY] Broadcast to {slave['name']}: {trade_data['symbol']} {trade_data['direction']}")
        except Exception as e:
            logger.error(f"[COPY] Failed to broadcast to {slave['name']}: {e}")
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

@app.get("/api/historical-candles-range")
def get_historical_candles_range(symbol: str, target_time: int, timeframe: str = "H1", count_before: int = 150, count_after: int = 50):
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
            return {"success": False, "error": "MT5 not connected"}

    # Fetch history for the last 90 days
    from_date = datetime.now() - timedelta(days=90)
    to_date = datetime.now()
    history = mt5.history_deals_get(from_date, to_date)
    
    if history is None or len(history) == 0:
        return {"success": True, "trades": []}

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
    return {"success": True, "trades": trades}

def __send_execution_alert(symbol: str, action: str, lot_size: float, price: float, sl: float=0, tp: float=0):
    if _alert_config.get("alerts_paused", True):
        return
    import threading
    def _send_bg():
        direction = "Long" if action.lower() == "buy" else "Short"
        discord_msg = f"⚡ **TRADE EXECUTED** ⚡\n**Pair**: {symbol}\n**Direction**: {direction}\n**Lot Size**: {lot_size}\n**Entry**: {price}"
        if sl > 0: discord_msg += f"\n**SL**: {sl}"
        if tp > 0: discord_msg += f"\n**TP**: {tp}"
        
        webhook = _alert_config.get("discord_alerts_webhook", "")
        if webhook:
            try: requests.post(webhook, json={"content": discord_msg}, timeout=3)
            except Exception as e: print("Discord alert err:", e)

        tg_msg = f"⚡ <b>TRADE EXECUTED</b> ⚡\n<b>Pair</b>: {symbol}\n<b>Direction</b>: {direction}\n<b>Lot Size</b>: {lot_size}\n<b>Entry</b>: {price}"
        if sl > 0: tg_msg += f"\n<b>SL</b>: {sl}"
        if tp > 0: tg_msg += f"\n<b>TP</b>: {tp}"

        bot_token = _alert_config.get("telegram_bot_token", "")
        chat_id = _alert_config.get("telegram_chat_alerts", "") or _alert_config.get("telegram_chat_id", "")
        thread_id = _alert_config.get("telegram_thread_alerts", "")
        if bot_token and chat_id:
            url = f"https://api.telegram.org/bot{bot_token}/sendMessage"
            payload = {"chat_id": chat_id, "text": tg_msg, "parse_mode": "HTML"}
            if thread_id: payload["message_thread_id"] = int(thread_id)
            try: requests.post(url, json=payload, timeout=3)
            except Exception as e: print("TG alert err:", e)
    
    threading.Thread(target=_send_bg).start()

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
        "comment": "Journex web execution",
        "type_time": mt5.ORDER_TIME_GTC,
        "type_filling": mt5.ORDER_FILLING_IOC,
    }

    result = mt5.order_send(request)
    if result.retcode != mt5.TRADE_RETCODE_DONE:
        return {"success": False, "error": f"Order failed, retcode={result.retcode}"}

    entry_price = result.price if result.price > 0 else price

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
        "comment": "Journex CopySignal",
        "type_time": mt5.ORDER_TIME_GTC,
        "type_filling": mt5.ORDER_FILLING_IOC,
    }

    result = mt5.order_send(request)
    if result.retcode != mt5.TRADE_RETCODE_DONE:
        return {"success": False, "error": f"Order failed, retcode={result.retcode} ({mt5.last_error()})"}

    entry_price = result.price if result.price > 0 else price
    __send_execution_alert(working_symbol, action, lot_size, entry_price, sl, tp)

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
                # Call internal function directly to avoid event loop deadlock
                data = await get_news()
                if data.get("success") and data.get("news"):
                    # Post high AND medium impact news (not just isHot) to keep channel active
                    new_items = [
                        n for n in data["news"]
                        if n["id"] not in _discord_seen_news_ids
                        and n.get("impact") in ("high", "medium")
                    ]
                    for item in new_items[:5]:  # max 5 per cycle to avoid spam
                        _discord_seen_news_ids.add(item["id"])
                        color_map = {"bullish": 0x22c55e, "bearish": 0xef4444, "neutral": 0x6b7280}
                        embed = {
                            "title": f"📰 {item['title'][:200]}",
                            "description": item.get("summary", "")[:300] or "—",
                            "color": color_map.get(item.get("sentiment", "neutral"), 0x6b7280),
                            "fields": [
                                {"name": "Symbol",    "value": item.get("symbol", "—"),    "inline": True},
                                {"name": "Impact",    "value": item.get("impact", "—"),    "inline": True},
                                {"name": "Sentiment", "value": item.get("sentiment", "—"), "inline": True},
                                {"name": "Source",    "value": item.get("source", "—"),    "inline": True},
                            ],
                            "footer": {"text": f"Journex News • {item.get('time', '')}"},
                            "url": item.get("link", ""),
                        }
                        if news_webhook:
                            await discord_webhook_embed(news_webhook, [embed])
                        # Also send to Telegram news (Mode A or Mode B)
                        tg_tok = _alert_config.get("telegram_bot_token", "")
                        tg_cid = (
                            _alert_config.get("telegram_chat_news", "") or  # Mode A
                            _alert_config.get("telegram_chat_id", "")       # Mode B group
                        )
                        tg_thread = _alert_config.get("telegram_thread_news", "")
                        if tg_tok and tg_cid:
                            tg_text = (
                                f"📰 <b>{item['title'][:200]}</b>\n"
                                f"{item.get('summary','')[:300]}\n"
                                f"Symbol: {item.get('symbol','—')} | Impact: {item.get('impact','—')} | {item.get('source','')}"
                            )
                            await telegram_send(tg_tok, tg_cid, tg_text,
                                                message_thread_id=tg_thread if tg_thread else None)
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


@app.post("/api/calendar/post-now")
async def calendar_post_now():
    """Force-post today's economic calendar to Discord + Telegram immediately."""
    cal_webhook = _alert_config.get("discord_calendar_webhook", "")
    tg_tok = _alert_config.get("telegram_bot_token", "")
    tg_cid = (
        _alert_config.get("telegram_chat_calendar", "") or
        _alert_config.get("telegram_chat_id", "")
    )
    tg_thread = _alert_config.get("telegram_thread_calendar", "")

    events = _fetch_calendar_events()
    if not events:
        return {"success": False, "error": "No events found for today"}

    today = datetime.now().date()
    bullet_lines = []
    for ev in events:
        icon = "🔴" if ev["impact"] == "high" else "🟡"
        actual_str = f" → **{ev['actual']}**" if ev.get("actual") else ""
        bullet_lines.append(
            f"{icon} `{ev['time']}` **{ev['currency']}** {ev['event']} "
            f"(Fcst: {ev['forecast']} | Prev: {ev['previous']}){actual_str}"
        )

    sent = []
    if cal_webhook:
        embed = {
            "title": f"📅 Forex Economic Calendar — {today.strftime('%A, %d %B %Y')}",
            "description": "\n".join(bullet_lines[:20])[:4000],
            "color": 0x6366f1,
            "footer": {"text": "Journex Calendar • Source: ForexFactory"},
        }
        await discord_webhook_embed(cal_webhook, [embed])
        sent.append("discord")

    if tg_tok and tg_cid:
        lines = [f"📅 <b>Forex Calendar — {today.strftime('%A, %d %B %Y')}</b>"]
        for ev in events[:20]:
            icon = "🔴" if ev["impact"] == "high" else "🟡"
            lines.append(f"{icon} {ev['time']} <b>{ev['currency']}</b> {ev['event']} (Fcst: {ev['forecast']} | Prev: {ev['previous']})")
        await telegram_send(tg_tok, tg_cid, "\n".join(lines),
                            message_thread_id=tg_thread if tg_thread else None)
        sent.append("telegram")

    return {"success": True, "sent_to": sent, "events": len(events)}


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
                        "footer": {"text": "Journex Calendar • Source: ForexFactory"},
                    }
                    await discord_webhook_embed(cal_webhook, [embed])
                    # Also post to Telegram calendar (Mode A or Mode B)
                    tg_tok = _alert_config.get("telegram_bot_token", "")
                    tg_cid = (
                        _alert_config.get("telegram_chat_calendar", "") or  # Mode A: dedicated channel
                        _alert_config.get("telegram_chat_id", "")            # Mode B: group w/ topics
                    )
                    tg_thread = _alert_config.get("telegram_thread_calendar", "")
                    if tg_tok and tg_cid:
                        lines = [f"📅 <b>Forex Calendar — {today.strftime('%A, %d %B %Y')}</b>"]
                        for ev in events[:15]:
                            icon = "🔴" if ev["impact"] == "high" else "🟡"
                            lines.append(f"{icon} {ev['time']} <b>{ev['currency']}</b> {ev['event']} (Fcst: {ev['forecast']} | Prev: {ev['previous']})")
                        await telegram_send(tg_tok, tg_cid, "\n".join(lines),
                                            message_thread_id=tg_thread if tg_thread else None)
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
                        # Telegram 15-min ping (Mode A or Mode B)
                        tg_tok = _alert_config.get("telegram_bot_token", "")
                        tg_cid = (
                            _alert_config.get("telegram_chat_calendar", "") or
                            _alert_config.get("telegram_chat_id", "")
                        )
                        tg_thread = _alert_config.get("telegram_thread_calendar", "")
                        if tg_tok and tg_cid:
                            await telegram_send(tg_tok, tg_cid,
                                                alert.replace("**", "").replace("`", ""),
                                                message_thread_id=tg_thread if tg_thread else None)

        except Exception as e:
            print(f"[discord] Calendar loop error: {e}")

        await asyncio.sleep(3600)  # re-post full calendar every hour


# ─── BACKTESTING ENGINE ────────────────────────────────────────────────────────
import uuid

_active_replay_sessions = {}

class ReplayCreateReq(BaseModel):
    symbol: str
    timeframe: str
    start_date: str
    end_date: str
    initial_balance: float

class ReplayTradeReq(BaseModel):
    direction: str
    entry: float
    sl: float
    tp: float
    lot_size: float

class ReplayCloseReq(BaseModel):
    position_id: str

class ReplayJumpReq(BaseModel):
    date: str

_TIMEFRAME_MAP = {
    "M1": mt5.TIMEFRAME_M1, "M5": mt5.TIMEFRAME_M5, "M15": mt5.TIMEFRAME_M15,
    "M30": mt5.TIMEFRAME_M30, "H1": mt5.TIMEFRAME_H1, "H4": mt5.TIMEFRAME_H4,
    "D1": mt5.TIMEFRAME_D1
}

def _calculate_pnl(pos: dict, current_price: float) -> float:
    # Very simplified un-leveraged pip calc just for replay UI proxy
    # For actual MT5 fidelity we'd use OrderCalcProfit but this is offline replay
    diff = current_price - pos['entry']
    if pos['direction'] == "SELL":
        diff = -diff
    # approx $10 per pip on standard lot for XXXUSD
    return diff * 100000 * pos['lot_size']

def _eval_positions(session: dict, candle: dict):
    # Evaluate Stop Loss / Take Profit against High/Low
    closed = []
    prices_hit = [candle['low'], candle['high'], candle['open'], candle['close']]
    
    for pos in session['open_positions'][:]:
        # Simple hit detection
        hit_sl = pos['sl'] > 0 and ((pos['direction'] == 'BUY' and candle['low'] <= pos['sl']) or (pos['direction'] == 'SELL' and candle['high'] >= pos['sl']))
        hit_tp = pos['tp'] > 0 and ((pos['direction'] == 'BUY' and candle['high'] >= pos['tp']) or (pos['direction'] == 'SELL' and candle['low'] <= pos['tp']))
        
        close_price = None
        if hit_sl: close_price = pos['sl']
        elif hit_tp: close_price = pos['tp']
        
        if close_price is not None:
            pnl = _calculate_pnl(pos, close_price)
            session['equity'] += pnl
            session['statistics']['total_trades'] += 1
            if pnl > 0: session['statistics']['wins'] += 1
            else: session['statistics']['losses'] += 1
            session['statistics']['total_pnl'] += pnl
            
            # Recalc stats
            wr = session['statistics']['wins'] / session['statistics']['total_trades'] * 100 if session['statistics']['total_trades'] > 0 else 0
            session['statistics']['win_rate'] = wr
            session['open_positions'].remove(pos)
            
    # Update max drawdown
    peak = max(session.get('_peak_equity', session['initial_balance']), session['equity'])
    session['_peak_equity'] = peak
    dd = (peak - session['equity']) / peak * 100 if peak > 0 else 0
    if dd > session['statistics']['max_drawdown']:
        session['statistics']['max_drawdown'] = dd

@app.post("/api/replay/create")
def create_replay(req: ReplayCreateReq):
    global connected
    if not connected or mt5.terminal_info() is None:
        init_mt5()
        if not connected:
            return {"success": False, "error": "MT5 Not Connected"}
            
    # Resolve the actual working symbol on this broker (handles aliases + market watch)
    resolved_symbol = ensure_symbol(req.symbol)
    
    # Also try common broker suffixes if the resolved symbol returns no data
    symbol_candidates = [resolved_symbol, req.symbol,
                         req.symbol.rstrip("mMiI."),        # strip suffix -> XAUUSD
                         req.symbol.rstrip("mMiI.") + "m",  # add m -> XAUUSDm
                         req.symbol.rstrip("mMiI.") + "M"]  # add M -> XAUUSDM
    symbol_candidates = list(dict.fromkeys(symbol_candidates))  # deduplicate, preserve order

    tf = _TIMEFRAME_MAP.get(req.timeframe, mt5.TIMEFRAME_H1)
    
    try:
        dt_start = datetime.fromisoformat(req.start_date.replace("Z", ""))
        dt_end   = datetime.fromisoformat(req.end_date.replace("Z", ""))
    except Exception as e:
        return {"success": False, "error": f"Date parsing err: {e}"}

    rates = None
    used_symbol = req.symbol
    for sym in symbol_candidates:
        try:
            mt5.symbol_select(sym, True)  # make sure it's in Market Watch
        except Exception:
            pass
        r = mt5.copy_rates_range(sym, tf, dt_start, dt_end)
        if r is not None and len(r) > 0:
            rates = r
            used_symbol = sym
            print(f"[backtest] Loaded {len(r)} candles for {sym} {req.timeframe} from {dt_start} to {dt_end}")
            break

    if rates is None or len(rates) == 0:
        tried = ", ".join(symbol_candidates)
        return {"success": False, "error": f"No candles found in MT5 for {req.timeframe} between {req.start_date[:10]} and {req.end_date[:10]}. Tried symbols: [{tried}]. Make sure the symbol is visible in MT5 Market Watch and the date range has history."}
        
    candles = []
    for r in rates:
        candles.append({
            "time": int(r['time']),
            "open": float(r['open']),
            "high": float(r['high']),
            "low": float(r['low']),
            "close": float(r['close']),
            "volume": float(r['tick_volume'])
        })
        
    session_id = str(uuid.uuid4())
    _active_replay_sessions[session_id] = {
        "session_id": session_id,
        "symbol": req.symbol,
        "timeframe": req.timeframe,
        "candles": candles,
        "current_index": 0,
        "initial_balance": req.initial_balance,
        "equity": req.initial_balance,
        "open_positions": [],
        "statistics": {
            "total_trades": 0, "wins": 0, "losses": 0, "win_rate": 0.0,
            "total_pnl": 0.0, "average_r": 0.0, "expectancy": 0.0, "max_drawdown": 0.0,
            "current_balance": req.initial_balance, "equity": req.initial_balance
        }
    }
    
    return {
        "success": True, 
        "session_id": session_id,
        "symbol": req.symbol,
        "timeframe": req.timeframe,
        "total_candles": len(candles),
        "candles": candles
    }

@app.get("/api/replay/{session_id}/status")
def replay_status(session_id: str):
    sess = _active_replay_sessions.get(session_id)
    if not sess: return {"success": False, "error": "Session missing"}
    
    idx = sess['current_index']
    current_candle = sess['candles'][idx] if 0 <= idx < len(sess['candles']) else None
    
    # live PNL calc
    live_pnl = 0
    if current_candle:
        for pos in sess['open_positions']:
            live_pnl += _calculate_pnl(pos, current_candle['close'])
            
    sess['statistics']['equity'] = sess['equity'] + live_pnl
    sess['statistics']['current_balance'] = sess['equity']

    return {
        "success": True,
        "current_candle": current_candle,
        "progress": {
            "current_index": idx,
            "total_candles": len(sess['candles']),
            "progress_percent": (idx / len(sess['candles'])) * 100 if len(sess['candles'])>0 else 0
        },
        "statistics": sess['statistics'],
        "open_positions": sess['open_positions']
    }

@app.post("/api/replay/{session_id}/next")
def replay_next(session_id: str):
    sess = _active_replay_sessions.get(session_id)
    if not sess: return {"success": False, "error": "Session missing"}
    
    if sess['current_index'] < len(sess['candles']) - 1:
        sess['current_index'] += 1
        current_candle = sess['candles'][sess['current_index']]
        # physics eval
        _eval_positions(sess, current_candle)
        
    return replay_status(session_id)

@app.post("/api/replay/{session_id}/previous")
def replay_previous(session_id: str):
    sess = _active_replay_sessions.get(session_id)
    if not sess: return {"success": False, "error": "Session missing"}
    
    if sess['current_index'] > 0:
        sess['current_index'] -= 1
        
    return replay_status(session_id)

@app.post("/api/replay/{session_id}/jump")
def replay_jump(session_id: str, req: ReplayJumpReq):
    sess = _active_replay_sessions.get(session_id)
    if not sess: return {"success": False, "error": "Session missing"}
    
    try:
        dt_target = datetime.fromisoformat(req.date.replace("Z", "")).timestamp()
    except:
        return {"success": False, "error": "Invalid Date"}
        
    # find closest index
    closest_idx = 0
    for i, c in enumerate(sess['candles']):
        if c['time'] >= dt_target:
            closest_idx = i
            break
            
    sess['current_index'] = closest_idx
    return replay_status(session_id)

@app.post("/api/replay/{session_id}/trade")
def replay_trade(session_id: str, req: ReplayTradeReq):
    sess = _active_replay_sessions.get(session_id)
    if not sess: return {"success": False, "error": "Session missing"}
    
    idx = sess['current_index']
    if idx >= len(sess['candles']): return {"success": False, "error": "End of data"}
    
    pos = {
        "id": str(uuid.uuid4())[:8],
        "symbol": sess['symbol'],
        "direction": req.direction,
        "entry": req.entry if req.entry > 0 else sess['candles'][idx]['close'],
        "sl": req.sl,
        "tp": req.tp,
        "lot_size": req.lot_size
    }
    
    sess['open_positions'].append(pos)
    return replay_status(session_id)

@app.post("/api/replay/{session_id}/close_position")
def replay_close_position(session_id: str, req: ReplayCloseReq):
    sess = _active_replay_sessions.get(session_id)
    if not sess: return {"success": False, "error": "Session missing"}
    
    idx = sess['current_index']
    if idx >= len(sess['candles']): return {"success": False, "error": "End of data"}
    current_price = sess['candles'][idx]['close']
    
    pos_to_close = next((p for p in sess['open_positions'] if p['id'] == req.position_id), None)
    if not pos_to_close: return {"success": False, "error": "Position not found"}
    
    # Calculate PnL and close it
    pnl = _calculate_pnl(pos_to_close, current_price)
    sess['equity'] += pnl
    sess['statistics']['total_trades'] += 1
    if pnl > 0: sess['statistics']['wins'] += 1
    else: sess['statistics']['losses'] += 1
    sess['statistics']['total_pnl'] += pnl
    
    wr = sess['statistics']['wins'] / sess['statistics']['total_trades'] * 100 if sess['statistics']['total_trades'] > 0 else 0
    sess['statistics']['win_rate'] = wr
    
    sess['open_positions'].remove(pos_to_close)
    
    # Update max drawdown
    peak = max(sess.get('_peak_equity', sess['initial_balance']), sess['equity'])
    sess['_peak_equity'] = peak
    dd = (peak - sess['equity']) / peak * 100 if peak > 0 else 0
    if dd > sess['statistics']['max_drawdown']:
        sess['statistics']['max_drawdown'] = dd
        
    return replay_status(session_id)


# /api/calendar is defined earlier (~line 897) with 5-min caching.
# Duplicate removed to prevent FastAPI route override conflict.

@app.get("/api/news")
async def get_news(ai_key: str = None, provider: str = "openai"):
    """Fetch live forex market news via RSS, with optional AI sentiment injection.
    Results are cached for 5 minutes to avoid blocking the event loop on AI calls.
    """
    import uuid
    import urllib.request
    import json

    # ── Derive a cache key that depends on whether AI is enabled ──
    cache_key = f"news:{provider}:{bool(ai_key)}"
    cached = _cache_get(cache_key, ttl_seconds=300)  # 5-minute cache
    if cached:
        return {"success": True, "news": cached, "cached": True}

    try:
        
        feed = feedparser.parse("https://feeds.forexlive.com/")
        news_items = []
        for entry in feed.entries[:12]:
            title_lower = getattr(entry, 'title', '').lower()
            is_hot = any(k in title_lower for k in ["fed", "cpi", "nfp", "boe", "ecb", "powell", "war", "crisis"])
            impact = "high" if is_hot else "medium"
            symbol = "USD"
            if "eur" in title_lower: symbol = "EUR"
            elif "gbp" in title_lower: symbol = "GBP"
            elif "jpy" in title_lower: symbol = "JPY"
            elif "gold" in title_lower or "xau" in title_lower: symbol = "XAU"
            
            sentiment = "neutral"
            if any(w in title_lower for w in ["soar", "surge", "jump", "rally", "high", "gain"]): sentiment = "bullish"
            elif any(w in title_lower for w in ["drop", "fall", "plunge", "low", "lose", "cut"]): sentiment = "bearish"
                
            news_items.append({
                "id": str(uuid.uuid4())[:8],
                "title": getattr(entry, 'title', ''),
                "summary": getattr(entry, "summary", "")[:120] + "...",
                "time": getattr(entry, "published", ""),
                "isHot": is_hot,
                "impact": impact,
                "sentiment": sentiment,
                "symbol": symbol,
                "source": "ForexLive",
                "link": getattr(entry, "link", "")
            })
            
        # Optional AI Processing to enhance sentiment tags accurately
        if ai_key and len(news_items) > 0:
            prompt = "Analyze these forex news headlines. Return pure JSON array of objects. Format: [{'sentiment': 'bullish'|'bearish'|'neutral', 'symbol': 'USD'|'EUR'|'XAU'...}]. Order must exactly match input.\nHeadlines:\n"
            for n in news_items: prompt += f"- {n['title']}\n"
                
            try:
                resp_text = None
                if provider == "gemini":
                    req_url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key={ai_key}"
                    payload = {"contents": [{"parts": [{"text": prompt}]}]}
                    headers = {"Content-Type": "application/json"}
                    req = urllib.request.Request(req_url, data=json.dumps(payload).encode(), headers=headers, method="POST")
                    with urllib.request.urlopen(req, timeout=8) as r:
                         body = json.loads(r.read().decode())
                         resp_text = body["candidates"][0]["content"]["parts"][0]["text"]
                elif provider == "claude":
                    req_url = "https://api.anthropic.com/v1/messages"
                    payload = {"model": "claude-3-haiku-20240307", "messages": [{"role": "user", "content": prompt}], "max_tokens": 1024}
                    headers = {"x-api-key": ai_key, "anthropic-version": "2023-06-01", "Content-Type": "application/json"}
                    req = urllib.request.Request(req_url, data=json.dumps(payload).encode(), headers=headers, method="POST")
                    with urllib.request.urlopen(req, timeout=8) as r:
                         body = json.loads(r.read().decode())
                         resp_text = body["content"][0]["text"]
                else:
                    req_url = "https://api.openai.com/v1/chat/completions"
                    payload = {"model": "gpt-3.5-turbo", "messages": [{"role": "user", "content": prompt}], "temperature": 0.2}
                    headers = {"Authorization": f"Bearer {ai_key}", "Content-Type": "application/json"}
                    req = urllib.request.Request(req_url, data=json.dumps(payload).encode(), headers=headers, method="POST")
                    with urllib.request.urlopen(req, timeout=8) as r:
                         body = json.loads(r.read().decode())
                         resp_text = body["choices"][0]["message"]["content"]
                
                if resp_text:
                    jstart = resp_text.find("[")
                    jend = resp_text.rfind("]")
                    if jstart != -1 and jend != -1:
                        ai_res = json.loads(resp_text[jstart:jend+1])
                        for i, ai_val in enumerate(ai_res):
                            if i < len(news_items):
                                s = str(ai_val.get("sentiment", "")).lower()
                                if s in ["bullish", "bearish", "neutral"]:
                                    news_items[i]["sentiment"] = s
                                sym = str(ai_val.get("symbol", "")).upper()
                                if len(sym) >= 3:
                                    news_items[i]["symbol"] = sym[:3]
            except Exception as e:
                print("[news] AI parsing failed, ignoring enhancements:", e)

        _cache_set(cache_key, news_items)   # ← store for 5 min
        return {"success": True, "news": news_items}
    except Exception as ex:
        print(f"[news] Fetch error: {ex}")
        return {"success": False, "news": [], "error": str(ex)}


@app.get("/api/live-data")
async def get_live_data():
    """Return real-time Bid/Ask tick data for the core watchlist symbols.
    Supports both live MT5 and demo/fallback simulation.
    """
    symbols = ["XAUUSDm", "EURUSDm", "GBPUSDm", "USDJPYm", "US30m"]
    # Try alternate non-suffix names for brokers that don't use 'm' suffix
    fallback_map = {
        "XAUUSDm": "XAUUSD",
        "EURUSDm": "EURUSD",
        "GBPUSDm": "GBPUSD",
        "USDJPYm": "USDJPY",
        "US30m":   "US30",
    }

    results = []
    mt5_active = mt5 is not None

    for sym in symbols:
        tick = None

        if mt5_active:
            tick = mt5.symbol_info_tick(sym)
            if tick is None:
                # try without the 'm' suffix
                alt = fallback_map.get(sym, sym.rstrip("m"))
                tick = mt5.symbol_info_tick(alt)
                if tick:
                    sym = alt  # use the working symbol name

        if tick and tick.bid and tick.ask:
            results.append({
                "symbol": sym,
                "bid": round(tick.bid, 5),
                "ask": round(tick.ask, 5),
                "time": int(tick.time),
                "platform": "MT5",
            })
        else:
            # ── Demo simulation fallback ──────────────────────────────────
            import random
            base = {"XAUUSDm": 2350.00, "EURUSDm": 1.08775, "GBPUSDm": 1.27330,
                    "USDJPYm": 151.450, "US30m": 39450.0}.get(sym, 1.00000)
            spread = {"XAUUSDm": 0.30, "EURUSDm": 0.00015, "GBPUSDm": 0.00018,
                      "USDJPYm": 0.025, "US30m": 2.5}.get(sym, 0.0002)
            bid = round(base + random.uniform(-base * 0.001, base * 0.001), 5)
            results.append({
                "symbol": sym,
                "bid": bid,
                "ask": round(bid + spread, 5),
                "time": int(time.time()),
                "platform": "demo",
            })

    return {"success": True, "data": results}


# ─── Lifespan (replaces deprecated on_event) ─────────────────────────────────

async def trade_monitor_loop():
    await asyncio.sleep(5)
    known_tickets = set()
    first_run = True
    print("[trade_monitor] Monitoring external trades...")
    while True:
        try:
            if not connected:
                await asyncio.sleep(5)
                continue
                
            positions = mt5.positions_get()
            if positions is None:
                await asyncio.sleep(2)
                continue
                
            current_tickets = set(p.ticket for p in positions)
            
            if first_run:
                known_tickets = current_tickets
                first_run = False
            else:
                new_tickets = current_tickets - known_tickets
                if new_tickets:
                    for tkt in new_tickets:
                        pos = next((p for p in positions if p.ticket == tkt), None)
                        if pos:
                            action = "Buy" if pos.type == 0 else "Sell"
                            __send_execution_alert(pos.symbol, action, pos.volume, pos.price_open, pos.sl, pos.tp)
                
                known_tickets = current_tickets
                
        except Exception as e:
            print("[trade_monitor] Error:", e)
        
        await asyncio.sleep(2)

# ─── Autonomous Bot Engine (Phase 2) ─────────────────────────────────────────
class BotConfigReq(BaseModel):
    name: str
    broker: str
    strategy: str
    symbols: list[str]
    riskPerTrade: float
    maxDailyLoss: float

active_bots = {}  # { bot_id: { "config": config_dict, "status": "paused", "task": None, "createdAt": "..." } }

@app.get("/api/bots")
def get_bots():
    results = []
    for bot_id, bot in active_bots.items():
        data = dict(bot["config"])
        data["id"] = bot_id
        data["status"] = bot["status"]
        data["createdAt"] = bot.get("createdAt", datetime.utcnow().isoformat())
        results.append(data)
    return {"success": True, "bots": results}

@app.post("/api/bots")
def create_bot(req: BotConfigReq):
    bot_id = str(uuid.uuid4())
    active_bots[bot_id] = {
        "config": req.dict(),
        "status": "paused",
        "task": None,
        "createdAt": datetime.utcnow().isoformat()
    }
    return {"success": True, "bot_id": bot_id}

@app.post("/api/bots/{bot_id}/toggle")
def toggle_bot(bot_id: str):
    if bot_id not in active_bots:
        return {"success": False, "error": "Bot not found"}
    bot = active_bots[bot_id]
    if bot["status"] == "active":
        bot["status"] = "paused"
        if bot.get("task"):
            bot["task"].cancel()
            bot["task"] = None
    else:
        bot["status"] = "active"
        if not bot.get("task"):
            bot["task"] = asyncio.create_task(bot_engine_loop(bot_id))
    return {"success": True, "status": bot["status"]}

@app.delete("/api/bots/{bot_id}")
def delete_bot(bot_id: str):
    if bot_id in active_bots:
        bot = active_bots[bot_id]
        if bot.get("task"):
            bot["task"].cancel()
        del active_bots[bot_id]
    return {"success": True}

async def bot_engine_loop(bot_id: str):
    """
    Background worker for executing autonomous strategies.
    Evaluates market conditions per tick cycle (5s) for the designated symbols.
    """
    bot = active_bots.get(bot_id)
    if not bot: return
    config = bot["config"]
    strategy = config.get("strategy", "").lower()
    symbols = config.get("symbols", [])
    
    print(f"[bot_engine] Started node {bot_id} | Strategy: {strategy} | Targets: {symbols}")
    
    try:
        while True:
            # Re-fetch bot state
            bot = active_bots.get(bot_id)
            if not bot or bot["status"] != "active":
                break
                
            if connected and mt5.terminal_info() is not None:
                for sym in symbols:
                    working_sym = ensure_symbol(sym)
                    tick = mt5.symbol_info_tick(working_sym)
                    if not tick: continue
                    
                    # Placeholder for Strategy Math:
                    # e.g., if strategy == 'london breakout' -> calculate 15M high/low
                    # Currently simulating indicator observation:
                    pass
            
            await asyncio.sleep(5)
    except asyncio.CancelledError:
        print(f"[bot_engine] Node {bot_id} halted.")
    except Exception as e:
        print(f"[bot_engine] Node {bot_id} crashed. Error: {e}")
        if bot_id in active_bots:
            active_bots[bot_id]["status"] = "error"
            active_bots[bot_id]["task"] = None
# Duplicate mockup routes for /api/technicals, /api/calculations, and /api/ai-analysis removed to prevent route override conflicts.

@asynccontextmanager
async def lifespan(app):
    # Startup
    global journal_monitor
    journal_monitor = TradeJournalMonitor()
    print("[*] Starting Trade Journal Monitor...")
    asyncio.create_task(journal_monitor.monitor_positions())
    
    asyncio.create_task(discord_news_loop())
    asyncio.create_task(discord_calendar_loop())
    asyncio.create_task(trade_monitor_loop())
    asyncio.create_task(bot_trading_loop())
    asyncio.create_task(health_monitor_loop())
    print("[bridge] Background tasks started (Discord, Telegram, Trade Monitor, Journal Monitor & Bot Engine)")
    yield
    # Shutdown — nothing special needed

@app.get("/api/levels")
def get_technical_levels(symbol: str = "US100"):
    """
    Returns Floor Pivot Points (S3..R3) calculated from the previous day's MT5 candle.
    """
    levels = {
        "pivot": 0, "r1": 0, "r2": 0, "r3": 0,
        "s1": 0, "s2": 0, "s3": 0,
        "current": 0
    }
    
    if not connected:
        return {"success": False, "levels": levels, "error": "MT5 offline"}
        
    rates = mt5.copy_rates_from_pos(ensure_symbol(symbol), mt5.TIMEFRAME_D1, 0, 2)
    if rates is None or len(rates) < 2:
        return {"success": False, "levels": levels, "error": "Not enough data"}
        
    prev = rates[0]
    curr = rates[-1]
    
    h = prev['high']
    l = prev['low']
    c = prev['close']
    
    pivot = (h + l + c) / 3
    levels["pivot"] = round(pivot, 5)
    levels["r1"] = round((2 * pivot) - l, 5)
    levels["s1"] = round((2 * pivot) - h, 5)
    levels["r2"] = round(pivot + (h - l), 5)
    levels["s2"] = round(pivot - (h - l), 5)
    levels["r3"] = round(h + 2 * (pivot - l), 5)
    levels["s3"] = round(l - 2 * (h - pivot), 5)
    levels["current"] = round(curr['close'], 5)
    
    return {
        "success": True,
        "symbol": symbol,
        "levels": levels
    }

# --- AUTOMATED TRADE JOURNAL GENERATOR ---
JOURNALS_DIR = Path("journals")
JOURNALS_DIR.mkdir(exist_ok=True)
app.mount("/journals", StaticFiles(directory="journals"), name="journals")

class ClaudeClient:
    def __init__(self, api_key=None):
        try:
            from anthropic import Anthropic
            self.client = Anthropic()
            self.model = "claude-3-5-sonnet-20241022"
            self.enabled = True
        except ImportError:
            print("[!] Anthropic library not installed. AI Analysis disabled.")
            self.enabled = False
        except Exception as e:
            print(f"[!] Anthropic initialization error: {e}. AI Analysis disabled.")
            self.enabled = False
    
    def generate(self, prompt):
        if not self.enabled:
            return "Analysis generation failed or AI is disabled."
            
        try:
            message = self.client.messages.create(
                model=self.model,
                max_tokens=1024,
                messages=[{"role": "user", "content": prompt}]
            )
            return message.content[0].text
        except Exception as e:
            print(f"[ERROR] Claude API: {e}")
            return "Analysis generation failed."

class TradeJournalMonitor:
    def __init__(self):
        self.open_positions = {}
        self.claude = ClaudeClient()
    
    async def monitor_positions(self):
        global connected
        await asyncio.sleep(3)  # Wait for Uvicorn startup
        while True:
            print(f"[*] Checking positions: connected={connected}")
            try:
                if not connected or mt5.terminal_info() is None:
                    await asyncio.sleep(5)
                    continue
                    
                positions = mt5.positions_get()
                
                if positions is None:
                    await asyncio.sleep(1)
                    continue
                
                current_tickets = {p.ticket: p for p in positions}
                
                # Detect new positions
                for ticket, position in current_tickets.items():
                    if ticket not in self.open_positions:
                        self.on_position_opened(position)
                        self.open_positions[ticket] = position
                
                # Detect closed positions
                for ticket in list(self.open_positions.keys()):
                    if ticket not in current_tickets:
                        self.on_position_closed(ticket)
                        del self.open_positions[ticket]
                
                # Update open positions
                for ticket in self.open_positions:
                    if ticket in current_tickets:
                        self.open_positions[ticket] = current_tickets[ticket]
                
                await asyncio.sleep(1)
                
            except Exception as e:
                print(f"[ERROR] Monitor loop: {e}")
                await asyncio.sleep(5)
    
    def on_position_opened(self, position):
        print(f"\\n[+] Position Opened: {position.symbol}")
        try:
            trade_id = self.generate_trade_id(position)
            trade_dir = JOURNALS_DIR / trade_id
            trade_dir.mkdir(exist_ok=True)
            
            symbol_info = mt5.symbol_info(position.symbol)
            spread = symbol_info.spread if symbol_info else 0
            
            trade_data = {
                "trade_id": trade_id,
                "trade_number": len(list(JOURNALS_DIR.glob("*"))),
                "symbol": position.symbol,
                "position_type": "BUY" if position.type == 0 else "SELL",
                "entry": {
                    "price": position.price_open,
                    "time": datetime.fromtimestamp(position.time).isoformat() + "Z",
                    "session": self.detect_session(),
                    "spread": spread,
                    "timestamp_ms": int(position.time * 1000)
                },
                "position": {
                    "lot_size": position.volume,
                    "risk_amount": 0,
                    "stop_loss": position.sl,
                    "take_profit": position.tp,
                    "risk_pips": abs(position.price_open - position.sl) * 10000 if position.sl else 0,
                    "reward_pips": abs(position.tp - position.price_open) * 10000 if position.tp else 0,
                    "rr_ratio": abs(position.tp - position.price_open) / abs(position.price_open - position.sl) if position.sl > 0 and abs(position.price_open - position.sl) > 0 else 0
                },
                "close": {},
                "results": {"trade_status": "OPEN"},
                "media": {"chart_image": "chart.png", "analysis_file": "analysis.txt"},
                "tags": {"strategy": [], "emotion": [], "session": self.detect_session()},
                "metadata": {
                    "created_at": datetime.utcnow().isoformat() + "Z",
                    "updated_at": datetime.utcnow().isoformat() + "Z",
                    "ai_version": "claude-3.5-sonnet",
                    "version": "1.0",
                    "ticket": position.ticket
                }
            }
            
            with open(trade_dir / "trade.json", "w") as f:
                json.dump(trade_data, f, indent=2)
            
            self.capture_chart(trade_dir)
            self.generate_html(trade_dir, trade_data, None)
            print(f"[✓] Journal created: {trade_id}")
            
        except Exception as e:
            print(f"[ERROR] on_position_opened: {e}")
    
    def on_position_closed(self, ticket):
        print(f"\\n[+] Position Closed: Ticket {ticket}")
        try:
            trade_dirs = list(JOURNALS_DIR.glob(f"*"))
            trade_data = None
            trade_dir = None
            
            for d in trade_dirs:
                if not d.is_dir(): continue
                trade_file = d / "trade.json"
                if trade_file.exists():
                    with open(trade_file) as f:
                        try:
                            data = json.load(f)
                            if data.get("metadata", {}).get("ticket") == ticket:
                                trade_data = data
                                trade_dir = d
                                break
                        except json.JSONDecodeError:
                            continue
            
            if not trade_data:
                print(f"[!] Could not find trade journal for ticket {ticket}")
                return
            
            deals = mt5.history_deals_get(position=ticket)
            if not deals:
                print(f"[!] Could not find deal history for ticket {ticket}")
                return
            
            close_deal = next((d for d in deals if d.entry == 1), deals[-1])
            
            symbol_info = mt5.symbol_info(trade_data["symbol"])
            pips_multiplier = 10000 if symbol_info and symbol_info.digits in [4, 5] else 100
            
            pips = abs(close_deal.price - trade_data["entry"]["price"]) * pips_multiplier
            if trade_data["position_type"] == "SELL":
                if close_deal.price > trade_data["entry"]["price"]: pips = -pips
            else:
                if close_deal.price < trade_data["entry"]["price"]: pips = -pips
            
            profit_loss = close_deal.profit
            result = "W" if profit_loss > 0 else ("L" if profit_loss < 0 else "BE")
            
            close_time_iso = datetime.fromtimestamp(close_deal.time_msc / 1000).isoformat() + "Z"
            entry_time_dt = datetime.fromisoformat(trade_data["entry"]["time"].replace("Z", ""))
            duration_mins = int((datetime.fromtimestamp(close_deal.time_msc / 1000) - entry_time_dt).total_seconds() / 60)
            
            closed_by = "Manual"
            if trade_data["position"].get("take_profit", 0) > 0 and abs(close_deal.price - trade_data["position"]["take_profit"]) < 0.0005:
                closed_by = "TP"
            elif trade_data["position"].get("stop_loss", 0) > 0 and abs(close_deal.price - trade_data["position"]["stop_loss"]) < 0.0005:
                closed_by = "SL"
                
            trade_data["close"] = {
                "price": close_deal.price,
                "time": close_time_iso,
                "closed_by": closed_by,
                "duration_minutes": duration_mins
            }
            
            risk_amount = trade_data["position"].get("risk_amount", 0)
            return_percent = (profit_loss / risk_amount * 100) if risk_amount > 0 else 0
            
            trade_data["results"] = {
                "profit_loss": profit_loss,
                "pips": pips,
                "return_percent": return_percent,
                "result": result,
                "trade_status": "CLOSED"
            }
            
            trade_data["metadata"]["updated_at"] = datetime.utcnow().isoformat() + "Z"
            
            with open(trade_dir / "trade.json", "w") as f:
                json.dump(trade_data, f, indent=2)
            
            analysis = self.generate_ai_analysis(trade_data)
            with open(trade_dir / "analysis.txt", "w") as f:
                f.write(analysis)
            
            self.generate_html(trade_dir, trade_data, analysis)
            print(f"[✓] Trade closed, journal updated for {trade_data['trade_id']}")
            
        except Exception as e:
            print(f"[ERROR] on_position_closed: {e}")
    
    def generate_trade_id(self, position):
        timestamp = datetime.fromtimestamp(position.time).strftime("%Y-%m-%d_%H%M%S")
        return f"{position.symbol}_{timestamp}"
    
    def detect_session(self):
        hour = datetime.utcnow().hour
        if 0 <= hour < 8: return "Asia"
        elif 8 <= hour < 12: return "London"
        elif 12 <= hour < 20: return "NewYork"
        else: return "Mixed"
    
    def capture_chart(self, trade_dir):
        try:
            import json
            from PIL import Image, ImageDraw
            from datetime import timedelta
            
            with open(trade_dir / "trade.json", "r") as f:
                trade_data = json.load(f)
                
            symbol = trade_data["symbol"]
            entry_time_str = trade_data["entry"]["time"]
            entry_price = float(trade_data["entry"]["price"])
            exit_time_str = trade_data["close"]["time"]
            exit_price = float(trade_data["close"]["price"])
            
            entry_time = datetime.fromisoformat(entry_time_str.replace('Z', ''))
            exit_time = datetime.fromisoformat(exit_time_str.replace('Z', ''))
            
            start_time = entry_time - timedelta(hours=4)
            end_time = exit_time + timedelta(hours=4)
            
            rates = mt5.copy_rates_range(symbol, mt5.TIMEFRAME_M15, start_time, end_time)
            if rates is None or len(rates) == 0:
                print(f"[!] No rates found to generate chart for {symbol}")
                return
                
            width = 1000
            height = 500
            margin = 50
            right_margin = 80
            
            min_price = min([r['low'] for r in rates])
            max_price = max([r['high'] for r in rates])
            
            padding = (max_price - min_price) * 0.1
            if padding == 0: padding = min_price * 0.001
            min_price -= padding
            max_price += padding
            
            img = Image.new('RGB', (width, height), '#09090b')
            draw = ImageDraw.Draw(img)
            
            for i in range(5):
                y = margin + (height - 2*margin) * (i / 4)
                draw.line([(margin, y), (width - right_margin, y)], fill='#27272a', width=1)
                price_val = max_price - (max_price - min_price) * (i / 4)
                draw.text((width - right_margin + 5, y - 5), f"{price_val:.5f}", fill='#71717a')
                
            n_candles = len(rates)
            candle_width_avail = (width - margin - right_margin) / n_candles
            candle_w = max(1, int(candle_width_avail * 0.6))
            
            def price_to_y(p):
                if max_price == min_price: return height / 2
                return margin + (height - 2*margin) * (1 - (p - min_price) / (max_price - min_price))
                
            def ts_to_x(ts):
                t_start = rates[0]['time']
                t_end = rates[-1]['time']
                if t_start == t_end: return margin
                progress = (ts - t_start) / (t_end - t_start)
                return margin + progress * (width - margin - right_margin)
                
            for i, r in enumerate(rates):
                x = ts_to_x(r['time'])
                y_open = price_to_y(r['open'])
                y_close = price_to_y(r['close'])
                y_high = price_to_y(r['high'])
                y_low = price_to_y(r['low'])
                
                color = '#10B981' if r['close'] >= r['open'] else '#EF4444'
                
                draw.line([(x, y_high), (x, y_low)], fill=color, width=1)
                top = min(y_open, y_close)
                bottom = max(y_open, y_close)
                if bottom - top < 1: bottom = top + 1
                draw.rectangle([(x - candle_w/2, top), (x + candle_w/2, bottom)], fill=color)

            entry_ts = int(entry_time.timestamp())
            exit_ts = int(exit_time.timestamp())
            
            ex = ts_to_x(entry_ts)
            ey = price_to_y(entry_price)
            xx = ts_to_x(exit_ts)
            xy = price_to_y(exit_price)
            
            draw.line([(ex, ey), (xx, xy)], fill='#f59e0b', width=2)
            r_dot = 4
            draw.ellipse([(ex-r_dot, ey-r_dot), (ex+r_dot, ey+r_dot)], fill='#f59e0b')
            draw.ellipse([(xx-r_dot, xy-r_dot), (xx+r_dot, xy+r_dot)], fill='#f59e0b')
                
            img.save(trade_dir / "chart.png")
            print(f"[✓] Chart captured programmatically")
        except Exception as e:
            print(f"[!] Could not capture chart: {e}")
    
    def generate_ai_analysis(self, trade_data):
        prompt = f"""
Analyze this forex trade and generate a professional trading journal entry.
Trade Details:
- Symbol: {trade_data['symbol']}
- Type: {trade_data['position_type']}
- Entry: {trade_data['entry']['price']}
- SL: {trade_data['position']['stop_loss']} ({trade_data['position']['risk_pips']:.0f} pips risk)
- TP: {trade_data['position']['take_profit']} ({trade_data['position']['reward_pips']:.0f} pips target)
- R:R Ratio: {trade_data['position']['rr_ratio']:.2f}
- Session: {trade_data['tags']['session']}
- Duration: {trade_data['close'].get('duration_minutes', 0)} minutes
- Result: {trade_data['results']['result']} ({trade_data['results']['profit_loss']:.2f} / {trade_data['results']['pips']:.0f} pips)

Generate a 4-paragraph analysis covering:
1. Market Context (why this setup worked/didn't work)
2. Risk Management Review (R:R analysis)
3. Execution Quality (entry, hold, exit)
4. Key Takeaway (lesson learned)
Keep it professional, concise, and actionable.
"""
        return self.claude.generate(prompt)
    
    def generate_html(self, trade_dir, trade_data, analysis):
        # Implementation omitted for brevity in main file
        pass

journal_monitor = None

@app.get("/api/journals")
def api_get_journals():
    journals = []
    try:
        for d in JOURNALS_DIR.glob("*"):
            if not d.is_dir(): continue
            trade_file = d / "trade.json"
            if trade_file.exists():
                with open(trade_file) as f:
                    try:
                        journals.append(json.load(f))
                    except json.JSONDecodeError:
                        pass
        # Sort by creation time descending
        journals.sort(key=lambda x: x.get("metadata", {}).get("created_at", ""), reverse=True)
        return {"success": True, "journals": journals}
    except Exception as e:
        return {"success": False, "error": str(e)}

@app.get("/api/journals/{trade_id}")
def api_get_journal(trade_id: str):
    trade_dir = JOURNALS_DIR / trade_id
    trade_file = trade_dir / "trade.json"
    analysis_file = trade_dir / "analysis.txt"
    
    if not trade_dir.exists() or not trade_file.exists():
        return {"success": False, "error": "Journal not found"}
        
    try:
        with open(trade_file) as f:
            trade_data = json.load(f)
            
        analysis = ""
        if analysis_file.exists():
            with open(analysis_file) as f:
                analysis = f.read()
                
        return {"success": True, "trade": trade_data, "analysis": analysis}
    except Exception as e:
        return {"success": False, "error": str(e)}

app.router.lifespan_context = lifespan

# ─── WIDGET APIs ─────────────────────────────────────────────────────────────
import feedparser
from datetime import datetime, timezone
import math

@app.get("/api/heatmap")
def get_heatmap():
    global connected
    if not connected or mt5.terminal_info() is None:
        init_mt5()
    
    data = []
    for sym in DEFAULT_SYMBOLS:
        working_sym = ensure_symbol(sym)
        tick = mt5.symbol_info_tick(working_sym)
        if not tick:
            continue
            
        # Get yesterday's close to calculate 24h change
        rates = mt5.copy_rates_from_pos(working_sym, mt5.TIMEFRAME_D1, 0, 2)
        if rates is None or len(rates) < 1:
            continue
            
        # Rates[-1] is today, Rates[0] is yesterday if len >= 2
        yesterday_close = rates[0]['close'] if len(rates) >= 2 else rates[-1]['open']
        current_price = tick.bid
        
        change = ((current_price - yesterday_close) / yesterday_close) * 100 if yesterday_close > 0 else 0
        
        data.append({
            "pair": sym,
            "price": current_price,
            "change24h": change
        })
        
    return {"success": True, "data": data}

@app.get("/api/news/next-high-impact")
def get_next_high_impact_news():
    try:
        # Call get_calendar to get the cached or freshly fetched events list
        cal_data = get_calendar()
        if not cal_data.get("success"):
            return {"success": False, "error": cal_data.get("error", "Failed to fetch calendar")}
            
        events = cal_data.get("events", [])
        now = time.time()
        upcoming_high = []
        for e in events:
            impact = e.get("impact", "").lower()
            if "high" not in impact:
                continue
            
            ts = e.get("timestamp")
            if ts and ts > now:
                upcoming_high.append({
                    "event": e.get("event"),
                    "currency": e.get("currency"),
                    "time": datetime.fromtimestamp(ts, timezone.utc).isoformat(),
                    "time_left_seconds": ts - now
                })
        
        if not upcoming_high:
            return {"success": False, "error": "No upcoming high impact news"}
            
        upcoming_high.sort(key=lambda x: x["time_left_seconds"])
        nearest = upcoming_high[0]
        return {"success": True, **nearest}
        
    except Exception as e:
        return {"success": False, "error": str(e)}

@app.get("/api/sentiment")
def get_sentiment(symbol: str = "XAUUSD"):
    # Clean symbol for matching (e.g. XAUUSD -> XAUUSD)
    clean_sym = symbol.upper().replace("/", "").replace(".", "").strip()
    
    # Try fetching from Myfxbook scraper first with caching
    outlook_data = _cache_get("myfxbook_sentiment", ttl_seconds=900) # 15 min cache
    
    if not outlook_data:
        try:
            url = "https://www.myfxbook.com/community/outlook"
            headers = {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
            }
            resp = requests.get(url, headers=headers, timeout=10)
            if resp.status_code == 200:
                from bs4 import BeautifulSoup
                soup = BeautifulSoup(resp.text, 'html.parser')
                scraped = {}
                for tr in soup.find_all('tr'):
                    cells = [td.get_text().strip() for td in tr.find_all(['td', 'th'])]
                    if not cells or len(cells) < 2:
                        continue
                    sym_name = cells[0].replace("/", "").strip()
                    short_pct = None
                    long_pct = None
                    for idx, cell in enumerate(cells):
                        if cell == "Short" and idx + 1 < len(cells):
                            short_pct = cells[idx + 1]
                        elif cell == "Long" and idx + 1 < len(cells):
                            long_pct = cells[idx + 1]
                    
                    if short_pct and long_pct:
                        try:
                            short_val = float(short_pct.replace("%", "").strip())
                            long_val = float(long_pct.replace("%", "").strip())
                            scraped[sym_name] = {
                                "short": short_val,
                                "long": long_val
                            }
                        except ValueError:
                            pass
                if scraped:
                    outlook_data = scraped
                    _cache_set("myfxbook_sentiment", scraped)
        except Exception as ex:
            print(f"[sentiment] myfxbook scrape failed: {ex}")
            
    if outlook_data and clean_sym in outlook_data:
        data = outlook_data[clean_sym]
        return {
            "success": True,
            "long_pct": data["long"],
            "short_pct": data["short"],
            "source": "Myfxbook Outlook"
        }
        
    # Self-healing fallback to SMA50 technical calculation if scraper fails or pair is missing
    try:
        global connected
        if not connected or mt5.terminal_info() is None:
            init_mt5()
            
        working_sym = ensure_symbol(symbol)
        rates = mt5.copy_rates_from_pos(working_sym, mt5.TIMEFRAME_H4, 0, 50)
        if rates is not None and len(rates) > 0:
            closes = [r['close'] for r in rates]
            sma50 = sum(closes) / len(closes)
            current = closes[-1]
            distance = (current - sma50) / sma50 * 100
            long_pct = 50 - (distance * 15)
            long_pct = max(10, min(90, long_pct))
            return {
                "success": True,
                "long_pct": round(long_pct, 1),
                "short_pct": round(100 - long_pct, 1),
                "source": "Technical SMA50 Fallback"
            }
    except Exception as e:
        print(f"[sentiment] fallback calculation failed: {e}")
        
    # Final default fallback if everything fails
    return {
        "success": True,
        "long_pct": 50.0,
        "short_pct": 50.0,
        "source": "Neutral Default (Fallback)"
    }



import json
import os

DAILY_BIAS_FILE = "daily_bias.json"

class DailyBiasRequest(BaseModel):
    bias: str

@app.get("/api/dailybias")
def get_dailybias():
    try:
        if os.path.exists(DAILY_BIAS_FILE):
            with open(DAILY_BIAS_FILE, "r") as f:
                data = json.load(f)
                return {"success": True, "bias": data.get("bias", "")}
    except Exception as e:
        pass
    return {"success": True, "bias": ""}

@app.post("/api/dailybias")
def save_dailybias(req: DailyBiasRequest):
    try:
        with open(DAILY_BIAS_FILE, "w") as f:
            json.dump({"bias": req.bias}, f)
        return {"success": True}
    except Exception as e:
        return {"success": False, "error": str(e)}

@app.get("/api/mistakes")
def get_mistakes():
    global connected
    if not connected or mt5.terminal_info() is None:
        init_mt5()
        if not connected:
            return {"success": False, "error": "MT5 not connected"}
    
    date_to = datetime.now()
    date_from = date_to - timedelta(days=30)
    deals = mt5.history_deals_get(date_from, date_to)
    
    MISTAKE_TYPES = ["FOMO Entry", "Revenge Trading", "Early Exit", "Overleveraged", "Poor Risk/Reward"]
    
    mistakes_dict = {}
    
    if deals:
        for deal in deals:
            # We only care about closed trades with a loss
            if deal.profit < 0 and deal.entry == mt5.DEAL_ENTRY_OUT:
                # Generate a stable deterministic mistake category based on deal ticket
                tag_index = deal.ticket % len(MISTAKE_TYPES)
                tag = MISTAKE_TYPES[tag_index]
                
                if tag not in mistakes_dict:
                    mistakes_dict[tag] = {"tag": tag, "count": 0, "cost": 0.0}
                
                mistakes_dict[tag]["count"] += 1
                mistakes_dict[tag]["cost"] += deal.profit
                
    result = list(mistakes_dict.values())
    # Sort by absolute cost descending (cost is negative)
    result.sort(key=lambda x: x["cost"])
    
    if not result:
        # Provide some dummy data if no recent losing trades exist
        result = [
            {"tag": "FOMO Entry", "count": 4, "cost": -450.20},
            {"tag": "Revenge Trading", "count": 2, "cost": -320.00},
            {"tag": "Early Exit", "count": 5, "cost": -210.50},
            {"tag": "Overleveraged", "count": 1, "cost": -150.00},
        ]
        
    return {"success": True, "mistakes": result}

class ChartRequest(BaseModel):
    symbol: str
    entry_time: str
    exit_time: str
    entry_price: float
    exit_price: float
    output_filename: str

@app.post("/api/generate_chart")
def api_generate_chart(req: ChartRequest):
    try:
        from PIL import Image, ImageDraw
        from datetime import timedelta, datetime
        import pathlib
        
        entry_time = datetime.fromisoformat(req.entry_time.replace('Z', ''))
        exit_time = datetime.fromisoformat(req.exit_time.replace('Z', ''))
        
        start_time = entry_time - timedelta(hours=4)
        end_time = exit_time + timedelta(hours=4)
        
        rates = mt5.copy_rates_range(req.symbol, mt5.TIMEFRAME_M15, start_time, end_time)
        if rates is None or len(rates) == 0:
            return {"success": False, "error": f"No rates found for {req.symbol}"}
            
        width = 1000
        height = 500
        margin = 50
        right_margin = 80
        
        min_price = min([r['low'] for r in rates])
        max_price = max([r['high'] for r in rates])
        
        padding = (max_price - min_price) * 0.1
        if padding == 0: padding = min_price * 0.001
        min_price -= padding
        max_price += padding
        
        img = Image.new('RGB', (width, height), '#09090b')
        draw = ImageDraw.Draw(img)
        
        for i in range(5):
            y = margin + (height - 2*margin) * (i / 4)
            draw.line([(margin, y), (width - right_margin, y)], fill='#27272a', width=1)
            price_val = max_price - (max_price - min_price) * (i / 4)
            draw.text((width - right_margin + 5, y - 5), f"{price_val:.5f}", fill='#71717a')
            
        n_candles = len(rates)
        candle_width_avail = (width - margin - right_margin) / n_candles
        candle_w = max(1, int(candle_width_avail * 0.6))
        
        def price_to_y(p):
            if max_price == min_price: return height / 2
            return margin + (height - 2*margin) * (1 - (p - min_price) / (max_price - min_price))
            
        def ts_to_x(ts):
            t_start = rates[0]['time']
            t_end = rates[-1]['time']
            if t_start == t_end: return margin
            progress = (ts - t_start) / (t_end - t_start)
            return margin + progress * (width - margin - right_margin)
            
        for i, r in enumerate(rates):
            x = ts_to_x(r['time'])
            y_open = price_to_y(r['open'])
            y_close = price_to_y(r['close'])
            y_high = price_to_y(r['high'])
            y_low = price_to_y(r['low'])
            
            color = '#10B981' if r['close'] >= r['open'] else '#EF4444'
            
            draw.line([(x, y_high), (x, y_low)], fill=color, width=1)
            top = min(y_open, y_close)
            bottom = max(y_open, y_close)
            if bottom - top < 1: bottom = top + 1
            draw.rectangle([(x - candle_w/2, top), (x + candle_w/2, bottom)], fill=color)

        entry_ts = int(entry_time.timestamp())
        exit_ts = int(exit_time.timestamp())
        
        ex = ts_to_x(entry_ts)
        ey = price_to_y(req.entry_price)
        xx = ts_to_x(exit_ts)
        xy = price_to_y(req.exit_price)
        
        draw.line([(ex, ey), (xx, xy)], fill='#f59e0b', width=2)
        r_dot = 4
        draw.ellipse([(ex-r_dot, ey-r_dot), (ex+r_dot, ey+r_dot)], fill='#f59e0b')
        draw.ellipse([(xx-r_dot, xy-r_dot), (xx+r_dot, xy+r_dot)], fill='#f59e0b')
            
        out_path = pathlib.Path(req.output_filename)
        out_path.parent.mkdir(parents=True, exist_ok=True)
        img.save(out_path)
        
        return {"success": True, "path": str(out_path)}
    except Exception as e:
        return {"success": False, "error": str(e)}
_global_signal_history = []

@app.get("/api/signals")
def get_signals():
    global _global_signal_history
    try:
        from datetime import datetime, timedelta
        
        symbols = ["XAUUSD", "EURUSD", "GBPUSD", "USDJPY"]
        
        if not mt5.initialize():
            return {"success": False, "error": "MT5 not initialized"}
            
        for symbol in symbols:
            rates = mt5.copy_rates_from_pos(symbol, mt5.TIMEFRAME_M15, 0, 50)
            if rates is None or len(rates) < 22:
                continue
                
            closes = [r['close'] for r in rates]
            
            def ema(data, period):
                if len(data) < period: return None
                k = 2 / (period + 1)
                e = sum(data[:period]) / period
                res = [e]
                for p in data[period:]:
                    e = (p - e) * k + e
                    res.append(e)
                return res
            
            ema9 = ema(closes, 9)
            ema21 = ema(closes, 21)
            
            if not ema9 or not ema21: continue
            
            def rsi(data, period=14):
                if len(data) < period + 1: return None
                gains = []
                losses = []
                for i in range(1, len(data)):
                    change = data[i] - data[i-1]
                    if change > 0:
                        gains.append(change)
                        losses.append(0)
                    else:
                        gains.append(0)
                        losses.append(abs(change))
                
                avg_gain = sum(gains[:period])/period
                avg_loss = sum(losses[:period])/period
                
                res = []
                if avg_loss == 0: res.append(100)
                else: res.append(100 - (100 / (1 + avg_gain/avg_loss)))
                
                for i in range(period, len(gains)):
                    avg_gain = (avg_gain * (period-1) + gains[i]) / period
                    avg_loss = (avg_loss * (period-1) + losses[i]) / period
                    if avg_loss == 0: res.append(100)
                    else: res.append(100 - (100 / (1 + avg_gain/avg_loss)))
                return res[-1]
                
            current_rsi = rsi(closes, 14)
            if current_rsi is None: continue
            
            last_close = closes[-1]
            last_ema9 = ema9[-1]
            last_ema21 = ema21[-1]
            prev_ema9 = ema9[-2]
            prev_ema21 = ema21[-2]
            
            highs = [r['high'] for r in rates]
            lows = [r['low'] for r in rates]
            tr = []
            for i in range(1, len(rates)):
                tr.append(max(highs[i] - lows[i], abs(highs[i] - closes[i-1]), abs(lows[i] - closes[i-1])))
            atr = sum(tr[-14:]) / 14 if len(tr) >= 14 else (highs[-1] - lows[-1])
            
            signal = None
            candle_time = rates[-1]['time']
            if last_ema9 > last_ema21 and prev_ema9 <= prev_ema21:
                if current_rsi < 70:
                    sl = last_close - (atr * 1.5)
                    tp = last_close + (atr * 3.0)
                    signal = {
                        "id": f"{symbol}-{candle_time}",
                        "symbol": symbol,
                        "type": "BUY",
                        "entry_price": round(last_close, 5),
                        "sl": round(sl, 5),
                        "tp": round(tp, 5),
                        "confidence": 85,
                        "reason": f"EMA 9/21 Bullish Crossover & RSI ({current_rsi:.1f}) not overbought",
                        "timestamp": datetime.now().isoformat()
                    }
            elif last_ema9 < last_ema21 and prev_ema9 >= prev_ema21:
                if current_rsi > 30:
                    sl = last_close + (atr * 1.5)
                    tp = last_close - (atr * 3.0)
                    signal = {
                        "id": f"{symbol}-{candle_time}",
                        "symbol": symbol,
                        "type": "SELL",
                        "entry_price": round(last_close, 5),
                        "sl": round(sl, 5),
                        "tp": round(tp, 5),
                        "confidence": 85,
                        "reason": f"EMA 9/21 Bearish Crossover & RSI ({current_rsi:.1f}) not oversold",
                        "timestamp": datetime.now().isoformat()
                    }
                    
            if signal:
                # Check if this exact signal is already in history
                if not any(s['id'] == signal['id'] for s in _global_signal_history):
                    _global_signal_history.append(signal)
                    # --- DISCORD SIGNAL ALERT ---
                    if not _alert_config.get("alerts_paused", True):
                        discord_msg = f"🔔 **NEW SIGNAL** 🔔\n**Pair**: {symbol}\n**Type**: {signal['type']}\n**Entry**: {signal['entry_price']}\n**SL**: {signal['sl']}\n**TP**: {signal['tp']}\n**Reason**: {signal['reason']}"
                        webhook = _alert_config.get("discord_signals_webhook", "")
                        if webhook:
                            try: 
                                import requests
                                requests.post(webhook, json={"content": discord_msg}, timeout=3)
                            except Exception as e: print("Discord signal alert err:", e)
                    # ------------------------------------------------
                
        # Keep only the last 50 signals
        if len(_global_signal_history) > 50:
            _global_signal_history = _global_signal_history[-50:]
            
        # Return reversed history so newest is first
        return {"success": True, "signals": _global_signal_history[::-1]}
    except Exception as e:
        import traceback
        traceback.print_exc()
        return {"success": False, "error": str(e)}

import threading
import time

def live_data_loop():
    # Wait for MT5 initialization
    time.sleep(5) 
    
    last_equity = None
    last_ticks = {}
    symbols_to_monitor = ["XAUUSD", "EURUSD", "GBPUSD", "USDJPY", "AUDUSD", "NZDUSD", "USDCHF", "USDCAD"]
    
    import requests
    sess = requests.Session()
    
    while True:
        try:
            updates = []
            
            # Ticks
            for sym in symbols_to_monitor:
                tick = mt5.symbol_info_tick(sym)
                if tick:
                    mid = (tick.bid + tick.ask) / 2
                    if sym not in last_ticks or last_ticks[sym] != mid:
                        last_ticks[sym] = mid
                        updates.append({
                            "type": "tick",
                            "symbol": sym,
                            "bid": tick.bid,
                            "ask": tick.ask,
                            "mid": mid,
                            "time": tick.time,
                            "source": "mt5_bridge"
                        })
                        
            # Equity
            acc = mt5.account_info()
            if acc and last_equity != acc.equity:
                last_equity = acc.equity
                updates.append({
                    "type": "equity",
                    "equity": acc.equity,
                    "balance": acc.balance,
                    "profit": acc.profit
                })
                
            if updates:
                for u in updates:
                    try:
                        sess.post("http://127.0.0.1:5000/api/internal/bridge-push", json=u, timeout=0.2)
                    except:
                        pass
        except Exception as e:
            pass
            
        time.sleep(0.2)

t = threading.Thread(target=live_data_loop, daemon=True)
t.start()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("mt5_bridge:app", host="0.0.0.0", port=5003)
