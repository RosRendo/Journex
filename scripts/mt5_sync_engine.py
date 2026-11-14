"""
Journex On-Demand MT5 Cloud Sync Engine
Acts as your self-hosted 'MetaApi' bridge.
Accepts credentials dynamically, extracts real trade history, and shuts down cleanly.
"""

import sys
import os
import datetime
import logging
from typing import Optional, List, Dict, Any
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn

try:
    import MetaTrader5 as mt5
    MT5_AVAILABLE = True
except ImportError:
    mt5 = None
    MT5_AVAILABLE = False

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("mt5_sync_engine")

app = FastAPI(title="Journex MT5 On-Demand Sync Engine", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class SyncRequest(BaseModel):
    server: str
    login: int
    password: str
    days: Optional[int] = 90

@app.get("/health")
def health():
    return {
        "status": "healthy",
        "mt5_available": MT5_AVAILABLE,
        "service": "Journex MT5 Sync Engine"
    }

@app.post("/api/sync-account")
def sync_account(req: SyncRequest):
    if not MT5_AVAILABLE:
        raise HTTPException(status_code=500, detail="MetaTrader5 library is not available.")

    logger.info(f"Connecting to MT5 broker: {req.server} for account: {req.login}")

    # 1. Initialize and authenticate with the requested broker account
    init_success = mt5.initialize(
        login=req.login,
        password=req.password,
        server=req.server,
        timeout=30000
    )

    if not init_success:
        err_code, err_desc = mt5.last_error()
        mt5.shutdown()
        logger.error(f"Failed to authenticate account {req.login} on {req.server}: {err_code} - {err_desc}")
        raise HTTPException(
            status_code=400,
            detail=f"Broker login failed: {err_desc} (Code: {err_code}). Check your server, login, and investor password."
        )

    try:
        # 2. Get account balance and info
        acc_info = mt5.account_info()
        balance = acc_info.balance if acc_info else 0.0
        equity = acc_info.equity if acc_info else 0.0
        currency = acc_info.currency if acc_info else "USD"

        # 3. Fetch deal history
        now = datetime.datetime.now()
        from_date = now - datetime.timedelta(days=req.days)
        deals = mt5.history_deals_get(from_date, now)

        if deals is None:
            deals = []

        # 4. Pair ENTRY_IN (entry=0) and ENTRY_OUT (entry=1) by position_id into complete trades
        positions: Dict[int, Dict[str, Any]] = {}
        for d in deals:
            if not d.symbol:
                continue
            pid = d.position_id
            if pid not in positions:
                positions[pid] = {"in": None, "out": None}
            if d.entry == 0:
                positions[pid]["in"] = d
            elif d.entry == 1:
                positions[pid]["out"] = d

        completed_trades = []
        for pid, p in positions.items():
            din = p["in"]
            dout = p["out"]
            if din and dout:
                completed_trades.append({
                    "ticket": str(pid),
                    "symbol": din.symbol,
                    "direction": "BUY" if din.type == 0 else "SELL",
                    "lot_size": round(din.volume, 2),
                    "entry": din.price,
                    "close_price": dout.price,
                    "profit": round(dout.profit, 2),
                    "commission": round((din.commission or 0.0) + (dout.commission or 0.0), 2),
                    "open_time": din.time,
                    "close_time": dout.time,
                    "date": datetime.datetime.fromtimestamp(dout.time, tz=datetime.timezone.utc).isoformat()
                })

        # Sort newest trades first
        completed_trades.sort(key=lambda t: t["close_time"], reverse=True)

        logger.info(f"Successfully extracted {len(completed_trades)} completed trades for {req.login}")

        return {
            "success": True,
            "account": req.login,
            "server": req.server,
            "balance": balance,
            "equity": equity,
            "currency": currency,
            "trade_count": len(completed_trades),
            "trades": completed_trades
        }

    finally:
        # 5. ALWAYS disconnect so the process is clean and frees RAM
        mt5.shutdown()

if __name__ == "__main__":
    port = int(os.environ.get("SYNC_PORT", 5005))
    logger.info(f"Starting MT5 Sync Engine on port {port}...")
    uvicorn.run(app, host="0.0.0.0", port=port)

