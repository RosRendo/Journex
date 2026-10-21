# Data Model: Point of Control (POC) & Institutional Confluence Engine

**Feature**: `005-volume-profile-confluence`  
**Date**: 2026-09-28  
**Scope**: Entities and state transitions for Developing Volume Profile, Virgin POCs, Asian Range, and Time Benchmarks.

---

## 1. Volume Profile Session Entity (`SessionVolumeProfile`)

Represents the intraday volume distribution for the current trading day.

| Field | Type | Description |
| :--- | :--- | :--- |
| `session_date` | Date / Timestamp | The date corresponding to the daily session |
| `poc_price` | Float | The price level containing the single largest volume bin |
| `vah_price` | Float | Value Area High (Upper bound of 70% volume distribution) |
| `val_price` | Float | Value Area Low (Lower bound of 70% volume distribution) |
| `total_volume` | Float | Accumulated session volume |
| `bin_count` | Integer | Fixed at 20 bins per daily range |
| `bin_volumes` | Float Array | Array storing volume per bin |

---

## 2. Virgin POC Registry (`VirginPocRegistry`)

Represents historical untested Points of Control acting as future liquidity targets.

```
Session N Ends ──► Final POC Untouched ──► Added to Virgin POC Array (Max 3)
                                                        │
                      ┌─────────────────────────────────┴─────────────────────────────────┐
                      ▼                                                                   ▼
             (Price Touches vPOC)                                                (Remains Untouched)
                      │                                                                   │
           [Terminated & Labeled]                                                [Projected Forward]
         Line ends at touch candle                                              Drawn horizontally
```

| Field | Type | Constraint | Description |
| :--- | :--- | :--- | :--- |
| `poc_price` | Float | > 0.0 | Historical POC level |
| `origin_time` | Timestamp | Prior Session | Timestamp when POC was formed |
| `line_id` | Line Reference | Non-null | Drawing object on chart |
| `is_mitigated` | Boolean | True/False | True when price intersects `poc_price` |
| `mitigation_bar`| Integer | Bar Index | Candle index where touch occurred |

---

## 3. Time Benchmark Registry (`TimeBenchmarkRegistry`)

Represents session liquidity boundaries and institutional open prices.

| Benchmark Level | Time Window | Calculation Rule | Trading Impact |
| :--- | :--- | :--- | :--- |
| `Asian Range High` | 00:00 – 08:00 UTC | `ta.highest(high, asian_bars)` | Liquidity target for London Open |
| `Asian Range Low` | 00:00 – 08:00 UTC | `ta.lowest(low, asian_bars)` | Liquidity target for London Open |
| `NY Midnight Open` | 00:00 EST / 04:00 UTC | Open of Midnight candle | Delineates Daily Discount vs Premium |
| `London Judas State`| 08:00 – 11:00 UTC | Sweep of Asian High/Low | Triggers high-conviction reversal alert |

---

## 4. Value Area Rotation State Machine (`ValueAreaRotationState`)

Tracks compliance with the 80% Rule of Market Profile.

```
       [OUTSIDE_VALUE_AREA] (Price above VAH or below VAL)
                 │
            (Bar 1 Close Inside)
                 ▼
       [REENTRY_CANDIDATE]
                 │
            (Bar 2 Close Inside)
                 ▼
       [ROTATION_ACTIVE] ──► Target 1: Developing POC
                             Target 2: Opposite Value Area Boundary
```
