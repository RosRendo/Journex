# Interface Contract: POC & Institutional Confluence Engine

**Feature**: `005-volume-profile-confluence`  
**Date**: 2026-09-28  
**Scope**: Specifications and thresholds for Volume Profile, Virgin POCs, Asian Range sweeps, and NY Midnight Open.

---

## 1. Volume Profile Calculation Contract

```json
{
  "volume_profile": {
    "session_type": "Daily",
    "session_timezone": "UTC",
    "bins_per_profile": 20,
    "value_area_percentage": 0.70,
    "max_active_vpocs": 3,
    "vpoc_mitigation_rule": "high >= vpoc_price and low <= vpoc_price"
  }
}
```

---

## 2. Institutional Time Boundaries

| Benchmark | Start (UTC) | End (UTC) | Timezone | Behavior |
| :--- | :--- | :--- | :--- | :--- |
| **Asian Range** | `00:00` | `08:00` | UTC | Records High & Low; locks at 08:00 UTC |
| **London Open Killzone** | `08:00` | `11:00` | UTC | Monitors for Asian Range sweeps (Judas Swing) |
| **NY Midnight Open** | `04:00` (EDT) / `05:00` (EST) | Day End | America/New_York | Horizontal line marking True Day Open |
| **NY Open Killzone** | `13:00` | `16:00` | UTC | Secondary sweep and trend expansion window |

---

## 3. Confluence Scorecard Weight Updates

When Institutional Confluence is enabled, the 10-Component Matrix incorporates POC & Time Benchmarks:

| Component | Normal Weight | With POC & Time Confluence |
| :--- | :---: | :---: |
| **Market Structure** | 20 pts | 20 pts |
| **Liquidity Sweeps** | 15 pts | 15 pts (+ Asian High/Low sweeps included) |
| **FVG Imbalance** | 15 pts | 15 pts |
| **Displacement** | 10 pts | 10 pts |
| **Session Alignment** | 10 pts | 10 pts (Killzones validated) |
| **HTF Bias** | 10 pts | 10 pts |
| **Premium / Discount** | 10 pts | 10 pts (Evaluated vs NY Midnight Open) |
| **POC / vPOC Confluence** | *New* | **+5 pts** (Bounce/mitigation at POC/vPOC) |
| **Value Area Rotation** | *New* | **+5 pts** (80% Rule re-entry) |
| **Order Flow / CVD** | 5 pts | 5 pts (Delta absorption at POC) |
| **Volume Ratio** | 3 pts | 3 pts |
| **News Clearance** | 2 pts | 2 pts |

*Final Score remains clamped to 100 points maximum.*
