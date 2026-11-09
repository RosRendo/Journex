# AdaptiveRegime — Test Plan

Every item must be verified in the journal/log before the EA is trusted with risk.
Do NOT claim any pass without seeing the evidence line.

## 0. Compile gate
- [ ] `metaeditor64 /compile ...AdaptiveRegime.mq5 /log` → `0 errors, 0 warnings`

## 1. Init / self-test
- [ ] Attach to XAUUSD H1 → journal: `INIT COMPLETE`, mode/caps line correct
- [ ] `SELFTEST T1..T7 PASS` lines present; set `InpRunSelfTest=false` afterwards
- [ ] Bad config rejected: set `InpRiskPerTradePct=3.0` → init fails with message

## 2. Regime behavior (visual, 1 week demo)
- [ ] One `REG:` line per new H1 bar with regime/confidence/bars
- [ ] SEL line lists only engines permitted by the regime map (README table)
- [ ] Vol-expansion day → REG flips to VOL_EXPANSION, SEL shows SCALP

## 3. Risk engine (demo account)
- [ ] Open a test position ~2R against it → after -1.5% day P/L: entries rejected with
      `DAILY_LOSS_LOCK` and management continues
- [ ] 3 consecutive losing positions → `LOSS_STREAK_COOLDOWN` + 120min timer set
- [ ] Restart terminal during cooldown → lockout still present (StateStore)
- [ ] Aggregate cap: with 1 open trade, second entry rejected `aggregate_risk` number
- [ ] Emergency dd (4%) → close-all executes and locks

## 4. Execution
- [ ] Log shows planned vs actual fill; drift beyond 0.30% warn-logged
- [ ] SL/TP prices tick-aligned; spread rejects beyond 400 pts
- [ ] No trade ever without both engines' cooldown and selector permission

## 5. Trade management
- [ ] SCALP position closes exactly at `held>=MaxHoldSec` with `R=` logged
- [ ] INTRADAY: BE@1R → partial 50%@1.5R → trail moves only toward profit
- [ ] SWING: no decay/timeouts; wide trail 4×H1 ATR; partial 2R verified
- [ ] Position adopted after restart retains BE/partial stage (pd/bs persisted)
- [ ] Closed position meta forgotten (`TM: position ... closed`)

## 6. News
- [ ] `InpNewsEnabled=true`, schedule `14:00-14:15` → no entries in window, entries
      resume 14:15; dashboard shows BLOCKED
- [ ] Malformed schedule → explicit ERR + policy applied (never silent)

## 7. Strategy Tester
- [ ] XAUUSD M15, every-tick model, 3+ months: trades occur, no order errors
- [ ] Two presets run: ScalpOnly & IntradayOnly produce isolated behavior
- [ ] Log file `MQL5\Files\AdaptiveRegime\log_*.txt` written daily

## 8. Live smoke (1% risk cap, smallest preset)
- [ ] 2 weeks demo before any real account
- [ ] Weekly review: equity curve, lockout events, rejected-reason distribution
