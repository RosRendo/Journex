"""
Journex Desktop Client Bridge (Option A)
Runs locally on trader's computer to connect personal MetaTrader 5 terminal to Journex Dashboard.
Zero credentials sent to cloud servers - 100% private, ultra-low latency local execution.
"""

import sys
import os
import json
import logging
from flask import Flask, jsonify, request
from flask_cors import CORS

logging.basicConfig(
    level=logging.INFO,
    format="[%(asctime)s] %(levelname)s: %(message)s",
    datefmt="%H:%M:%S"
)

app = Flask(__name__)
# Allow CORS from any origin so the web dashboard can talk directly to this local client
CORS(app, resources={r"/*": {"origins": "*"}})

@app.after_request
def add_cors_headers(response):
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization, x-broker-account-id, ngrok-skip-browser-warning"
    response.headers["Access-Control-Allow-Private-Network"] = "true"
    return response

# Attempt to load MetaTrader 5
try:
    import MetaTrader5 as mt5
    MT5_AVAILABLE = True
except ImportError:
    MT5_AVAILABLE = False
    logging.warning("MetaTrader5 python module not installed. Run: pip install -r requirements.txt")

def ensure_mt5():
    if not MT5_AVAILABLE:
        return False, "MetaTrader5 module not installed"
    if not mt5.initialize():
        err = mt5.last_error()
        return False, f"Failed to initialize MetaTrader 5 (Error: {err})"
    return True, "Connected"

@app.route("/", methods=["GET"])
@app.route("/health", methods=["GET"])
def health():
    ok, msg = ensure_mt5()
    account_info = None
    if ok:
        info = mt5.account_info()
        if info:
            account_info = {
                "login": info.login,
                "server": info.server,
                "balance": info.balance,
                "equity": info.equity,
                "currency": info.currency
            }
    return jsonify({
        "status": "online",
        "service": "Journex Personal Client Bridge",
        "version": "1.0.0",
        "mt5_connected": ok,
        "message": msg,
        "account": account_info
    })

@app.route("/api/account", methods=["GET"])
def get_account():
    ok, msg = ensure_mt5()
    if not ok:
        return jsonify({"success": False, "error": msg}), 503
    
    info = mt5.account_info()
    if not info:
        return jsonify({"success": False, "error": "No active MT5 account logged in"}), 404
        
    return jsonify({
        "success": True,
        "balance": info.balance,
        "equity": info.equity,
        "profit": info.profit,
        "margin": info.margin,
        "margin_free": info.margin_free,
        "margin_level": info.margin_level,
        "server": info.server,
        "login": info.login,
        "currency": info.currency,
        "company": info.company
    })

@app.route("/api/positions", methods=["GET"])
def get_positions():
    ok, msg = ensure_mt5()
    if not ok:
        return jsonify({"success": False, "error": msg}), 503
        
    positions = mt5.positions_get()
    if positions is None:
        return jsonify({"success": True, "positions": []})
        
    out = []
    for p in positions:
        out.append({
            "ticket": p.ticket,
            "pair": p.symbol,
            "direction": "buy" if p.type == 0 else "sell",
            "volume": p.volume,
            "entry": p.price_open,
            "current": p.price_current,
            "sl": p.sl,
            "tp": p.tp,
            "pnl": p.profit,
            "openTime": p.time
        })
    return jsonify({"success": True, "positions": out})

@app.route("/api/live-data", methods=["GET"])
def get_live_data():
    ok, msg = ensure_mt5()
    if not ok:
        return jsonify({"success": False, "error": msg}), 503
        
    symbols = ["EURUSD", "GBPUSD", "USDJPY", "XAUUSD", "AUDUSD", "USDCHF", "USDCAD", "NZDUSD", "BTCUSD"]
    data = []
    for s in symbols:
        tick = mt5.symbol_info_tick(s)
        if tick:
            data.append({
                "symbol": s,
                "bid": tick.bid,
                "ask": tick.ask,
                "time": tick.time
            })
    return jsonify({"success": True, "data": data})

@app.route("/api/trade", methods=["POST"])
def execute_trade():
    ok, msg = ensure_mt5()
    if not ok:
        return jsonify({"success": False, "error": msg}), 503
        
    body = request.get_json() or {}
    symbol = body.get("symbol", "EURUSD")
    direction = body.get("direction", "buy").lower()
    lot_size = float(body.get("lot_size", 0.01))
    sl = float(body.get("sl", 0.0))
    tp = float(body.get("tp", 0.0))
    comment = body.get("comment", "Journex Option A")
    
    # Check symbol availability
    info = mt5.symbol_info(symbol)
    if not info:
        return jsonify({"success": False, "error": f"Symbol {symbol} not found on broker"}), 400
    if not info.visible:
        mt5.symbol_select(symbol, True)
        
    tick = mt5.symbol_info_tick(symbol)
    if not tick:
        return jsonify({"success": False, "error": f"Failed to get price tick for {symbol}"}), 400
        
    order_type = mt5.ORDER_TYPE_BUY if direction == "buy" else mt5.ORDER_TYPE_SELL
    price = tick.ask if direction == "buy" else tick.bid
    
    trade_req = {
        "action": mt5.TRADE_ACTION_DEAL,
        "symbol": symbol,
        "volume": lot_size,
        "type": order_type,
        "price": price,
        "sl": sl,
        "tp": tp,
        "deviation": 20,
        "magic": 202611,
        "comment": comment,
        "type_time": mt5.ORDER_TIME_GTC,
        "type_filling": mt5.ORDER_FILLING_IOC,
    }
    
    result = mt5.order_send(trade_req)
    if result is None or result.retcode != mt5.TRADE_RETCODE_DONE:
        err_code = result.retcode if result else mt5.last_error()
        return jsonify({
            "success": False,
            "error": f"Order execution rejected by broker (Retcode: {err_code})"
        }), 400
        
    return jsonify({
        "success": True,
        "ticket": result.order,
        "volume": result.volume,
        "price": result.price,
        "bid": tick.bid,
        "ask": tick.ask,
        "comment": comment
    })

@app.route("/api/close-trade", methods=["POST"])
def close_trade():
    ok, msg = ensure_mt5()
    if not ok:
        return jsonify({"success": False, "error": msg}), 503
        
    body = request.get_json() or {}
    ticket = body.get("ticket")
    if not ticket:
        return jsonify({"success": False, "error": "Missing ticket ID"}), 400
        
    positions = mt5.positions_get(ticket=int(ticket))
    if not positions or len(positions) == 0:
        return jsonify({"success": False, "error": f"Position #{ticket} not found"}), 404
        
    p = positions[0]
    close_type = mt5.ORDER_TYPE_SELL if p.type == mt5.ORDER_TYPE_BUY else mt5.ORDER_TYPE_BUY
    tick = mt5.symbol_info_tick(p.symbol)
    if not tick:
        return jsonify({"success": False, "error": f"Cannot get tick for {p.symbol}"}), 400
    price = tick.bid if close_type == mt5.ORDER_TYPE_SELL else tick.ask
    
    close_req = {
        "action": mt5.TRADE_ACTION_DEAL,
        "position": p.ticket,
        "symbol": p.symbol,
        "volume": p.volume,
        "type": close_type,
        "price": price,
        "deviation": 20,
        "magic": 202611,
        "comment": "Journex Close Deal",
        "type_time": mt5.ORDER_TIME_GTC,
        "type_filling": mt5.ORDER_FILLING_IOC,
    }
    
    result = mt5.order_send(close_req)
    if result is None or result.retcode != mt5.TRADE_RETCODE_DONE:
        err_code = result.retcode if result else mt5.last_error()
        return jsonify({"success": False, "error": f"Close failed (Retcode: {err_code})"}), 400
        
    return jsonify({"success": True, "message": f"Closed ticket #{ticket}"})

if __name__ == "__main__":
    print("=" * 60)
    print("  JOURNEX DESKTOP CLIENT BRIDGE (OPTION A)")
    print("  Running on: http://127.0.0.1:5003")
    print("  Status: Waiting for browser connection...")
    print("=" * 60)
    app.run(host="127.0.0.1", port=5003, debug=False)

