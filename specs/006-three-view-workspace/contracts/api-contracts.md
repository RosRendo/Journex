# API Contracts: 3-View Architecture Overhaul

**Feature**: `006-three-view-workspace`  
**Date**: 2026-10-02  
**Status**: Completed  

---

## 1. Trade Data Endpoints

### 1.1 `GET /api/trades`
Retrieves paginated or filtered trades for the Notion Journal and TradeZella Dashboard.

#### Query Parameters:
- `accountNumber` (optional): Filter by account
- `symbol` (optional): e.g., "XAUUSD"
- `direction` (optional): "Long" | "Short"
- `outcome` (optional): "WIN" | "LOSS" | "BE"
- `setup` (optional): e.g., "JudasSwing"
- `mistake` (optional): e.g., "FOMO"
- `startDate` (optional): ISO date string
- `endDate` (optional): ISO date string

#### Response (`200 OK`):
```json
{
  "success": true,
  "data": [
    {
      "id": 142,
      "ticketNumber": "9812401",
      "symbol": "XAUUSD",
      "direction": "Long",
      "openPrice": 4424.50,
      "closePrice": 4445.50,
      "lotSize": 0.5,
      "pnl": 1050.00,
      "outcome": "WIN",
      "openTime": "2026-10-01T08:15:00Z",
      "closeTime": "2026-10-01T11:30:00Z",
      "setupTag": "#JudasSwing",
      "mistakeTag": "#None",
      "emotionTag": "Disciplined",
      "plannedRR": 2.1,
      "realizedRR": 2.1,
      "followedPlan": true,
      "checklist": {
        "htfBiasConfirmed": true,
        "liquiditySwept": true,
        "fvgOrPocRetested": true,
        "hardStopPlaced": true,
        "killzoneActive": true
      },
      "notes": {
        "setupThesis": "Asian low sweep into 15m bullish FVG during London Open.",
        "executionNotes": "Entered on 5m market structure shift. Partial at 1:1.5, full TP hit.",
        "lessonsLearned": "Patience waiting for the sweep prevented premature entry."
      },
      "screenshots": {
        "entryUrl": "/uploads/screenshots/142_entry.png",
        "exitUrl": "/uploads/screenshots/142_exit.png"
      }
    }
  ],
  "total": 1
}
```

---

### 1.2 `PUT /api/trades/:id`
Updates Notion journal properties for a trade.

#### Request Body:
```json
{
  "setupTag": "#SilverBullet",
  "mistakeTag": "#None",
  "emotionTag": "Calm",
  "plannedRR": 2.0,
  "checklist": {
    "htfBiasConfirmed": true,
    "liquiditySwept": true,
    "fvgOrPocRetested": true,
    "hardStopPlaced": true,
    "killzoneActive": true
  },
  "notes": {
    "setupThesis": "NY AM 10:00 FVG retest",
    "executionNotes": "Clean momentum",
    "lessonsLearned": "Followed plan"
  },
  "screenshots": {
    "entryUrl": "/uploads/screenshots/142_entry.png",
    "exitUrl": "/uploads/screenshots/142_exit.png"
  }
}
```

#### Response (`200 OK`):
```json
{
  "success": true,
  "message": "Trade journal entry updated successfully"
}
```

---

## 2. Real-Time Opportunity Alerts Endpoint

### 2.1 `GET /api/opportunities`
Supplies live A+/A/B confluence setups for the **Top Opportunity Ticker Ribbon**.

#### Response (`200 OK`):
```json
{
  "success": true,
  "data": [
    {
      "id": "opp-xau",
      "symbol": "XAUUSD",
      "direction": "BUY",
      "grade": "A+",
      "score": 92,
      "setupType": "Asian Low Judas Sweep & FVG",
      "session": "London Open",
      "entry": 4424.50,
      "sl": 4414.00,
      "tp": 4445.50,
      "rr": 2.0,
      "factors": {
        "sweep": true,
        "mss": true,
        "fvg": true,
        "ob": true,
        "poc": true,
        "smt": true
      },
      "status": "READY"
    }
  ]
}
```
