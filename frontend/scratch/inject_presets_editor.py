import re

file_path = "d:/FOR RENDO (ONLY )/Personal Project/Dashboard/frontend/app/bot/page.tsx"

with open(file_path, "r", encoding="utf-8") as f:
    content = f.read().replace("\r\n", "\n")

# 1. Add DEFAULT_SETTINGS and states right after initialization states
states_to_add = """  // centralize state in page.tsx
  const DEFAULT_SETTINGS = {
    magic: 88001,
    bridge_url: "http://127.0.0.1:5003",
    strategy_type: 0,
    signal_timeframe: "H1",
    context_timeframe: "H4",
    session: "both",
    liquidity_lookback: 120,
    min_score: 80,
    signal_type: "all",
    use_rsi: false,
    rsi_period: 14,
    rsi_buy_min: 50.0,
    rsi_buy_max: 70.0,
    rsi_sell_min: 30.0,
    rsi_sell_max: 50.0,
    use_adx: true,
    adx_period: 14,
    adx_min: 20.0,
    adx_max: 50.0,
    use_volume: true,
    vol_avg_period: 20,
    vol_min_ratio: 1.5,
    use_ema_filter: true,
    ema1_period: 20,
    ema2_period: 50,
    ema3_period: 200,
    use_smt: true,
    smt_symbol: "GBPUSD",
    smt_min_pips: 1.0,
    use_mtf_confluence: true,
    mr_session_start: "22:00",
    mr_session_end: "06:00",
    mr_bb_period: 20,
    mr_bb_stddev: 2.0,
    mr_rsi_period: 14,
    mr_rsi_ob: 70.0,
    mr_rsi_os: 30.0,
    mom_lookback: 30,
    mom_threshold: 5.0,
    mom_max_holding: 120,
    pyramid_cooldown: 5,
    use_equity_trail: true,
    equity_trail_activate: 10.0,
    equity_trail_drop: 5.0,
    hard_stop_pct: 15.0,
    position_mode: 0,
    use_be: true,
    trailing_stop: true,
    trail_atr_mult: 3.5,
    partial_exit_rr: 1.0,
    partial_exit_pct: 50.0,
    move_sl_to_be: true,
    be_offset_pips: 0.0,
    risk: 3.0,
    max_daily_loss: 3.0,
    max_drawdown: 10.0,
    max_open_trades: 3,
    min_rr: 2.5,
    max_spread_points: 300,
    max_slippage_points: 30,
    min_sl_pips: 15,
    allow_monday: true,
    allow_friday: true,
    friday_close_hour: 16,
    use_news_filter: true,
    grid_step: 500.0,
    max_grid_orders: 5,
    max_basket_loss: 5.0,
    grid_emergency_close: true
  };

  const [editSettings, setEditSettings] = useState<any>(DEFAULT_SETTINGS);
  const [customPresets, setCustomPresets] = useState<any[]>([]);
  const [newPresetName, setNewPresetName] = useState("");
  const [activeTab, setActiveTab] = useState("identity"); // identity, strategy, risk, momentum, confluence, custom
  const [dragActive, setDragActive] = useState(false);

  // Settings Edit State
  const [editRisk, setEditRisk] = useState(1.0);"""

if "DEFAULT_SETTINGS" not in content:
    content = content.replace("  // Settings Edit State\n  const [editRisk, setEditRisk] = useState(1.0);", states_to_add)

# 2. Add local presets loader and .set parser
parser_logic = """
  // Load Presets from LocalStorage
  useEffect(() => {
    const saved = localStorage.getItem("ea_custom_presets");
    if (saved) {
      try {
        setCustomPresets(JSON.parse(saved));
      } catch (e) {
        console.error(e);
      }
    }
  }, []);

  const saveCustomPreset = () => {
    if (!newPresetName.trim()) {
      toast.error("Please enter a preset name");
      return;
    }
    const updated = [...customPresets, { name: newPresetName.trim(), settings: editSettings }];
    setCustomPresets(updated);
    localStorage.setItem("ea_custom_presets", JSON.stringify(updated));
    setNewPresetName("");
    toast.success(`Preset '${newPresetName}' saved!`);
  };

  const deleteCustomPreset = (name: string) => {
    const updated = customPresets.filter(p => p.name !== name);
    setCustomPresets(updated);
    localStorage.setItem("ea_custom_presets", JSON.stringify(updated));
    toast.success(`Preset '${name}' deleted.`);
  };

  const loadCustomPreset = (settings: any) => {
    setEditSettings(settings);
    toast.success("Loaded custom preset values!");
  };

  const handleSetFileParsing = (text: string) => {
    const lines = text.split("\\n");
    const parsed: any = { ...editSettings };
    
    const INP_MAP: Record<string, string> = {
      InpMagic: "magic",
      InpBridgeURL: "bridge_url",
      InpStrategyType: "strategy_type",
      InpSignalTimeframe: "signal_timeframe",
      InpContextTimeframe: "context_timeframe",
      InpSession: "session",
      InpLiquidityLookback: "liquidity_lookback",
      InpMinScore: "min_score",
      InpSignalType: "signal_type",
      InpUseRSI: "use_rsi",
      InpRSIPeriod: "rsi_period",
      InpRSIBuyMin: "rsi_buy_min",
      InpRSIBuyMax: "rsi_buy_max",
      InpRSISellMin: "rsi_sell_min",
      InpRSISellMax: "rsi_sell_max",
      InpUseADX: "use_adx",
      InpADXPeriod: "adx_period",
      InpADXMin: "adx_min",
      InpADXMax: "adx_max",
      InpUseVolume: "use_volume",
      InpVolAvgPeriod: "vol_avg_period",
      InpVolMinRatio: "vol_min_ratio",
      InpUseEMAFilter: "use_ema_filter",
      InpEMA1Period: "ema1_period",
      InpEMA2Period: "ema2_period",
      InpEMA3Period: "ema3_period",
      InpUseSMT: "use_smt",
      InpSMTSymbol: "smt_symbol",
      InpSMTMinPips: "smt_min_pips",
      InpUseMTFConfluence: "use_mtf_confluence",
      InpMRSessionStart: "mr_session_start",
      InpMRSessionEnd: "mr_session_end",
      InpMRBBPeriod: "mr_bb_period",
      InpMRBBStdDev: "mr_bb_stddev",
      InpMRRSIPeriod: "mr_rsi_period",
      InpMRRSIOB: "mr_rsi_ob",
      InpMRRSIOS: "mr_rsi_os",
      InpMomLookbackSec: "mom_lookback",
      InpMomThresholdPips: "mom_threshold",
      InpMomMaxHoldingSec: "mom_max_holding",
      InpPyramidCooldownSec: "pyramid_cooldown",
      InpUseEquityTrail: "use_equity_trail",
      InpEquityTrailActivatePct: "equity_trail_activate",
      InpEquityTrailDropPct: "equity_trail_drop",
      InpHardEquityStopPct: "hard_stop_pct",
      InpPositionMode: "position_mode",
      InpUseBE: "use_be",
      InpTrailingStop: "trailing_stop",
      InpTrailATRMult: "trail_atr_mult",
      InpPartialExitRR: "partial_exit_rr",
      InpPartialExitPct: "partial_exit_pct",
      InpMoveSLToBE: "move_sl_to_be",
      InpBEOffsetPips: "be_offset_pips",
      InpRiskPercent: "risk",
      InpMaxDailyLossPct: "max_daily_loss",
      InpMaxDrawdownPct: "max_drawdown",
      InpMaxOpenTrades: "max_open_trades",
      InpMinRR: "min_rr",
      InpMaxSpreadPoints: "max_spread_points",
      InpMaxSlippagePoints: "max_slippage_points",
      InpMinSLPips: "min_sl_pips",
      InpAllowMonday: "allow_monday",
      InpAllowFriday: "allow_friday",
      InpFridayCloseHour: "friday_close_hour",
      InpUseNewsFilter: "use_news_filter",
      InpGridStep: "grid_step",
      InpMaxGridOrders: "max_grid_orders",
      InpMaxBasketLossPct: "max_basket_loss",
      InpGridEmergencyClose: "grid_emergency_close"
    };

    let count = 0;
    lines.forEach(line => {
      const clean = line.trim();
      if (!clean || clean.startsWith(";")) return;
      const parts = clean.split("=");
      if (parts.length < 2) return;
      const mqlKey = parts[0].trim();
      const valStr = parts[1].split("||")[0].trim();
      
      const mappedKey = INP_MAP[mqlKey];
      if (mappedKey) {
        let val: any = valStr;
        if (valStr === "true" || valStr === "1") val = true;
        else if (valStr === "false" || valStr === "0") val = false;
        else if (!isNaN(Number(valStr))) val = Number(valStr);
        
        parsed[mappedKey] = val;
        count++;
      }
    });

    setEditSettings(parsed);
    toast.success(`Successfully parsed ${count} variables from .set file!`);
  };

  const handleDrag = (e: any) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: any) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          handleSetFileParsing(event.target.result as string);
        }
      };
      reader.readAsText(file);
    }
  };

  const handleFileInput = (e: any) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          handleSetFileParsing(event.target.result as string);
        }
      };
      reader.readAsText(file);
    }
  };

  const handleLoadPreset = async (presetName: string) => {"""

if "handleSetFileParsing" not in content:
    content = content.replace("  const handleLoadPreset = async (presetName: string) => {", parser_logic)

# 3. Update activeEa useEffect hook to merge with editSettings
active_ea_effect = """  // Load Settings on Magic number selection change
  const activeEa = eas.find(e => e.magic === selectedMagic);
  useEffect(() => {
    if (activeEa && activeEa.last_report?.settings) {
      const s = activeEa.last_report.settings;
      setEditRisk(s.risk ?? 1.0);
      setEditMinScore(s.min_score ?? 70);
      setEditMinRr(s.min_rr ?? 1.5);
      setEditSession(s.session ?? "both");
      setEditSignalType(s.signal_type ?? "all");

      // Merge dynamic settings into the central editSettings state
      setEditSettings(prev => ({
        ...prev,
        risk: s.risk ?? prev.risk,
        min_score: s.min_score ?? prev.min_score,
        min_rr: s.min_rr ?? prev.min_rr,
        session: s.session ?? prev.session,
        signal_type: s.signal_type ?? prev.signal_type,
        position_mode: s.position_mode === "MODE_SINGLE" ? 0 : s.position_mode === "MODE_PARTIAL_EXIT" ? 1 : s.position_mode === "MODE_GRID" ? 2 : prev.position_mode,
        use_equity_trail: s.use_equity_trail ?? prev.use_equity_trail,
        equity_trail_activate: s.equity_trail_activate ?? prev.equity_trail_activate,
        hard_stop_pct: s.hard_stop_pct ?? prev.hard_stop_pct,
        pyramid_cooldown: s.pyramid_cooldown ?? prev.pyramid_cooldown
      }));
    }
  }, [selectedMagic, eas.length]);"""

content = content.replace("""  // Load Settings on Magic number selection change
  const activeEa = eas.find(e => e.magic === selectedMagic);
  useEffect(() => {
    if (activeEa && activeEa.last_report?.settings) {
      const s = activeEa.last_report.settings;
      setEditRisk(s.risk ?? 1.0);
      setEditMinScore(s.min_score ?? 70);
      setEditMinRr(s.min_rr ?? 1.5);
      setEditSession(s.session ?? "both");
      setEditSignalType(s.signal_type ?? "all");
    }
  }, [selectedMagic, eas.length]);""", active_ea_effect)

# 4. Modify handlePushSettings to serialize editSettings
push_settings_logic = """  const handlePushSettings = async () => {
    try {
      setPushing(true);
      // Map React position mode numerical values back to expected string mode
      const posModes = ["SINGLE", "PARTIAL_EXIT", "GRID"];
      const payload = {
        risk: editSettings.risk,
        min_score: editSettings.min_score,
        min_rr: editSettings.min_rr,
        session: editSettings.session,
        signal_type: editSettings.signal_type,
        position_mode: posModes[editSettings.position_mode] || "SINGLE",
        use_equity_trail: editSettings.use_equity_trail ? "true" : "false",
        equity_trail_activate: editSettings.equity_trail_activate,
        hard_stop_pct: editSettings.hard_stop_pct,
        pyramid_cooldown: editSettings.pyramid_cooldown
      };
      
      const res = await fetch(`${BRIDGE}/api/ea/settings/${selectedMagic}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Dynamic configuration queued for Magic #${selectedMagic}`);
        loadData();
      } else {
        toast.error("Failed to queue configuration update");
      }
    } catch (e) {
      toast.error("Bridge connection failure");
    } finally {
      setPushing(false);
    }
  };"""

content = content.replace("""  const handlePushSettings = async () => {
    try {
      setPushing(true);
      const res = await fetch(`${BRIDGE}/api/ea/settings/${selectedMagic}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          risk: editRisk,
          min_score: editMinScore,
          min_rr: editMinRr,
          session: editSession,
          signal_type: editSignalType
        })
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Dynamic configuration queued for Magic #${selectedMagic}`);
        loadData();
      } else {
        toast.error("Failed to queue configuration update");
      }
    } catch (e) {
      toast.error("Bridge connection failure");
    } finally {
      setPushing(false);
    }
  };""", push_settings_logic)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)
print("State and parser injected successfully!")
