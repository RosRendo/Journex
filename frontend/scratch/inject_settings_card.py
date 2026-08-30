import re

file_path = "d:/FOR RENDO (ONLY )/Personal Project/Dashboard/frontend/app/bot/page.tsx"

with open(file_path, "r", encoding="utf-8") as f:
    content = f.read().replace("\r\n", "\n")

settings_card_logic = """          {/* Section 1: Settings Sync Panel */}
          <div className="p-5 bg-[--bg-card] border border-[--border] rounded-2xl space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider font-mono text-white flex items-center justify-between border-b border-zinc-900 pb-3">
              <span className="flex items-center gap-1.5">
                <Settings className="w-4 h-4 text-purple-400" /> Advanced Configurator
              </span>
              <span className="text-[10px] text-zinc-500 font-mono">Magic: #{selectedMagic}</span>
            </h3>

            {/* Presets Quick Actions (Static presets from previous task + local presets) */}
            <div className="bg-black/35 border border-zinc-900 rounded-xl p-3.5 space-y-3 font-mono text-xs">
              <div className="flex justify-between items-center text-[10px] text-zinc-500 uppercase tracking-wider font-bold">
                <span>Quick Preset Profiles</span>
                <span className="text-[9px] text-purple-400 lowercase italic">Instant Push</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => handleLoadPreset('safe')}
                  disabled={pushing}
                  className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 py-2 px-1 rounded-lg text-[10px] font-bold transition-all flex flex-col items-center gap-1"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" /> Safe Scalp
                </button>
                <button
                  onClick={() => handleLoadPreset('controlled')}
                  disabled={pushing}
                  className="bg-amber-500/10 text-amber-400 border border-amber-500/20 hover:bg-amber-500/20 py-2 px-1 rounded-lg text-[10px] font-bold transition-all flex flex-col items-center gap-1"
                >
                  <Activity className="w-3.5 h-3.5" /> Controlled Grid
                </button>
                <button
                  onClick={() => handleLoadPreset('wild')}
                  disabled={pushing}
                  className="bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 py-2 px-1 rounded-lg text-[10px] font-bold transition-all flex flex-col items-center gap-1"
                >
                  <Zap className="w-3.5 h-3.5" /> Wild Pyramid
                </button>
              </div>
            </div>

            {/* Drag & Drop Zone */}
            <div
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-xl p-3 text-center transition-all ${
                dragActive ? "border-purple-500 bg-purple-950/20" : "border-zinc-800 bg-black/10 hover:border-zinc-700"
              }`}
            >
              <label className="cursor-pointer flex flex-col items-center gap-1">
                <Download className="w-5 h-5 text-zinc-500" />
                <span className="text-[10px] font-mono text-zinc-400">
                  Drag & Drop MT5 <code className="text-purple-400">.set</code> file or <span className="underline">browse</span>
                </span>
                <input type="file" accept=".set" onChange={handleFileInput} className="hidden" />
              </label>
            </div>

            {/* Accordion Tabs Selection */}
            <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-none border-b border-zinc-900">
              {[
                { id: "identity", label: "Identity", icon: Bot },
                { id: "strategy", label: "Strategy", icon: Cpu },
                { id: "risk", label: "Risk", icon: Shield },
                { id: "momentum", label: "Momentum/Grid", icon: Zap },
                { id: "confluence", label: "Filters", icon: Target },
                { id: "custom", label: "My Presets", icon: Copy },
              ].map(t => {
                const Icon = t.icon;
                const active = activeTab === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => setActiveTab(t.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-mono font-bold transition-all whitespace-nowrap ${
                      active ? "bg-purple-950/45 text-purple-400 border border-purple-900/40" : "text-zinc-500 hover:text-zinc-350"
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {t.label}
                  </button>
                );
              })}
            </div>

            {/* Tab Panels */}
            <div className="space-y-4 text-xs font-mono pt-2">
              {activeTab === "identity" && (
                <div className="space-y-4">
                  <div className="space-y-1">
                    <div className="flex justify-between items-center text-[10px] font-bold text-zinc-500 uppercase">
                      <span>Magic Number</span>
                      <span className="text-[8px] text-zinc-650 flex items-center gap-1"><AlertCircle className="w-2.5 h-2.5" /> Static</span>
                    </div>
                    <input
                      type="number"
                      value={editSettings.magic}
                      onChange={(e) => setEditSettings({ ...editSettings, magic: parseInt(e.target.value) || 88001 })}
                      className="w-full bg-black/45 border border-zinc-900 rounded-xl px-3.5 py-2 text-zinc-300 text-xs focus:outline-none focus:border-purple-500 font-mono"
                    />
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between items-center text-[10px] font-bold text-zinc-500 uppercase">
                      <span>Bridge Server URL</span>
                      <span className="text-[8px] text-zinc-650 flex items-center gap-1"><AlertCircle className="w-2.5 h-2.5" /> Static</span>
                    </div>
                    <input
                      type="text"
                      value={editSettings.bridge_url}
                      onChange={(e) => setEditSettings({ ...editSettings, bridge_url: e.target.value })}
                      className="w-full bg-black/45 border border-zinc-900 rounded-xl px-3.5 py-2 text-zinc-350 text-xs focus:outline-none focus:border-purple-500 font-mono"
                    />
                  </div>
                </div>
              )}

              {activeTab === "strategy" && (
                <div className="space-y-4">
                  <div className="space-y-1">
                    <div className="flex justify-between items-center text-[10px] font-bold text-zinc-500 uppercase">
                      <span>Strategy Selection</span>
                      <span className="text-[8px] text-zinc-650 flex items-center gap-1"><AlertCircle className="w-2.5 h-2.5" /> Static</span>
                    </div>
                    <select
                      value={editSettings.strategy_type}
                      onChange={(e) => setEditSettings({ ...editSettings, strategy_type: parseInt(e.target.value) })}
                      className="w-full bg-black/45 border border-zinc-900 rounded-xl px-3.5 py-2 text-zinc-300 text-xs focus:outline-none focus:border-purple-500 font-mono"
                    >
                      <option value="0">ICT Sniper Strategy</option>
                      <option value="1">ICT Scalper Strategy</option>
                      <option value="2">Mean Reversion Strategy</option>
                      <option value="3">Breakout Strategy</option>
                      <option value="4">Momentum Scalper Strategy</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between items-center text-[10px] font-bold text-zinc-500 uppercase">
                      <span>Signal Timeframe</span>
                      <span className="text-[8px] text-zinc-650 flex items-center gap-1"><AlertCircle className="w-2.5 h-2.5" /> Static</span>
                    </div>
                    <input
                      type="text"
                      value={editSettings.signal_timeframe}
                      onChange={(e) => setEditSettings({ ...editSettings, signal_timeframe: e.target.value })}
                      className="w-full bg-black/45 border border-zinc-900 rounded-xl px-3.5 py-2 text-zinc-300 text-xs focus:outline-none focus:border-purple-500 font-mono"
                    />
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between items-center text-[10px] font-bold text-zinc-500 uppercase">
                      <span>Allowed Session</span>
                      <span className="text-[8px] text-emerald-450 flex items-center gap-1"><CheckCircle2 className="w-2.5 h-2.5" /> Live-Synced</span>
                    </div>
                    <select
                      value={editSettings.session}
                      onChange={(e) => setEditSettings({ ...editSettings, session: e.target.value })}
                      className="w-full bg-black/45 border border-zinc-900 rounded-xl px-3.5 py-2 text-zinc-300 text-xs focus:outline-none focus:border-purple-500 font-mono"
                    >
                      <option value="both">London & New York</option>
                      <option value="london">London Only</option>
                      <option value="ny">New York Only</option>
                      <option value="all">All Times</option>
                    </select>
                  </div>
                </div>
              )}

              {activeTab === "risk" && (
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between font-bold text-[10px] mb-1.5">
                      <span className="text-zinc-500 uppercase tracking-wider flex items-center gap-1">
                        Risk Per Trade <CheckCircle2 className="w-2.5 h-2.5 text-emerald-400" />
                      </span>
                      <span className="text-purple-400">{editSettings.risk.toFixed(1)}%</span>
                    </div>
                    <input
                      type="range"
                      min="0.1"
                      max="10.0"
                      step="0.1"
                      value={editSettings.risk}
                      onChange={(e) => setEditSettings({ ...editSettings, risk: parseFloat(e.target.value) })}
                      className="w-full accent-purple-500 h-1 bg-zinc-900 rounded-full appearance-none cursor-pointer mt-1"
                    />
                  </div>
                  <div>
                    <div className="flex justify-between font-bold text-[10px] mb-1.5">
                      <span className="text-zinc-500 uppercase tracking-wider flex items-center gap-1">
                        Max Daily Loss <CheckCircle2 className="w-2.5 h-2.5 text-emerald-400" />
                      </span>
                      <span className="text-purple-400">{editSettings.max_daily_loss}%</span>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="20"
                      step="1"
                      value={editSettings.max_daily_loss}
                      onChange={(e) => setEditSettings({ ...editSettings, max_daily_loss: parseFloat(e.target.value) })}
                      className="w-full accent-purple-500 h-1 bg-zinc-900 rounded-full appearance-none cursor-pointer mt-1"
                    />
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between items-center text-[10px] font-bold text-zinc-500 uppercase">
                      <span>Minimum Setup RR</span>
                      <span className="text-[8px] text-emerald-455 flex items-center gap-1"><CheckCircle2 className="w-2.5 h-2.5" /> Live-Synced</span>
                    </div>
                    <select
                      value={editSettings.min_rr}
                      onChange={(e) => setEditSettings({ ...editSettings, min_rr: parseFloat(e.target.value) })}
                      className="w-full bg-black/45 border border-zinc-900 rounded-xl px-3.5 py-2 text-zinc-300 text-xs focus:outline-none focus:border-purple-500 font-mono"
                    >
                      <option value="1.0">1:1.0 Minimum</option>
                      <option value="1.5">1:1.5 Minimum</option>
                      <option value="2.0">1:2.0 Minimum</option>
                      <option value="2.5">1:2.5 Minimum</option>
                      <option value="3.0">1:3.0 Minimum</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between items-center text-[10px] font-bold text-zinc-500 uppercase">
                      <span>Max Open Trades Cap</span>
                      <span className="text-[8px] text-zinc-650 flex items-center gap-1"><AlertCircle className="w-2.5 h-2.5" /> Static</span>
                    </div>
                    <input
                      type="number"
                      value={editSettings.max_open_trades}
                      onChange={(e) => setEditSettings({ ...editSettings, max_open_trades: parseInt(e.target.value) })}
                      className="w-full bg-black/45 border border-zinc-900 rounded-xl px-3.5 py-2 text-zinc-300 text-xs focus:outline-none focus:border-purple-500 font-mono"
                    />
                  </div>
                </div>
              )}

              {activeTab === "momentum" && (
                <div className="space-y-4">
                  <div className="space-y-1">
                    <div className="flex justify-between items-center text-[10px] font-bold text-zinc-500 uppercase">
                      <span>Position Mode Selection</span>
                      <span className="text-[8px] text-emerald-450 flex items-center gap-1"><CheckCircle2 className="w-2.5 h-2.5" /> Live-Synced</span>
                    </div>
                    <select
                      value={editSettings.position_mode}
                      onChange={(e) => setEditSettings({ ...editSettings, position_mode: parseInt(e.target.value) })}
                      className="w-full bg-black/45 border border-zinc-900 rounded-xl px-3.5 py-2 text-zinc-300 text-xs focus:outline-none focus:border-purple-500 font-mono"
                    >
                      <option value="0">Single Position Mode</option>
                      <option value="1">Partial Exit Mode</option>
                      <option value="2">Grid / Pyramiding Mode</option>
                    </select>
                  </div>
                  
                  <div className="flex items-center justify-between bg-black/20 border border-zinc-900 rounded-xl p-3">
                    <div>
                      <span className="text-[10px] font-bold text-zinc-400 block uppercase">Equity Trailing Stop</span>
                      <span className="text-[8px] text-emerald-450 flex items-center gap-1 mt-0.5"><CheckCircle2 className="w-2 h-2" /> Live-Synced</span>
                    </div>
                    <button
                      onClick={() => setEditSettings({ ...editSettings, use_equity_trail: !editSettings.use_equity_trail })}
                      className={`w-10 h-5 rounded-full p-0.5 transition-all ${
                        editSettings.use_equity_trail ? "bg-purple-600 flex justify-end" : "bg-zinc-800 flex justify-start"
                      }`}
                    >
                      <span className="w-4 h-4 bg-white rounded-full block shadow-md" />
                    </button>
                  </div>

                  {editSettings.use_equity_trail && (
                    <div className="grid grid-cols-2 gap-3.5 border-l-2 border-purple-900/40 pl-3">
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-zinc-500 uppercase">Trail Activation %</label>
                        <input
                          type="number"
                          step="0.5"
                          value={editSettings.equity_trail_activate}
                          onChange={(e) => setEditSettings({ ...editSettings, equity_trail_activate: parseFloat(e.target.value) })}
                          className="w-full bg-black/45 border border-zinc-900 rounded-xl px-3 py-1.5 text-zinc-300 text-xs focus:outline-none focus:border-purple-500 font-mono"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-zinc-500 uppercase">Trail Drop Stop %</label>
                        <input
                          type="number"
                          step="0.5"
                          value={editSettings.equity_trail_drop}
                          onChange={(e) => setEditSettings({ ...editSettings, equity_trail_drop: parseFloat(e.target.value) })}
                          className="w-full bg-black/45 border border-zinc-900 rounded-xl px-3 py-1.5 text-zinc-300 text-xs focus:outline-none focus:border-purple-500 font-mono"
                        />
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <div className="flex justify-between items-center text-[9px] font-bold text-zinc-500 uppercase">
                        <span>Pyramid Cooldown</span>
                        <span className="text-[7px] text-emerald-450">Live</span>
                      </div>
                      <input
                        type="number"
                        value={editSettings.pyramid_cooldown}
                        onChange={(e) => setEditSettings({ ...editSettings, pyramid_cooldown: parseInt(e.target.value) })}
                        className="w-full bg-black/45 border border-zinc-900 rounded-xl px-3 py-1.5 text-zinc-300 text-xs focus:outline-none focus:border-purple-500 font-mono"
                      />
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between items-center text-[9px] font-bold text-zinc-500 uppercase">
                        <span>Equity Stop %</span>
                        <span className="text-[7px] text-emerald-450">Live</span>
                      </div>
                      <input
                        type="number"
                        value={editSettings.hard_stop_pct}
                        onChange={(e) => setEditSettings({ ...editSettings, hard_stop_pct: parseFloat(e.target.value) })}
                        className="w-full bg-black/45 border border-zinc-900 rounded-xl px-3 py-1.5 text-zinc-300 text-xs focus:outline-none focus:border-purple-500 font-mono"
                      />
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "confluence" && (
                <div className="space-y-4 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
                  <div className="flex items-center justify-between bg-black/20 border border-zinc-900 rounded-xl p-3">
                    <div>
                      <span className="text-[10px] font-bold text-zinc-400 block uppercase font-mono">Use SMT Divergence</span>
                      <span className="text-[8px] text-zinc-650 flex items-center gap-1 mt-0.5"><AlertCircle className="w-2.5 h-2.5" /> Static</span>
                    </div>
                    <button
                      onClick={() => setEditSettings({ ...editSettings, use_smt: !editSettings.use_smt })}
                      className={`w-10 h-5 rounded-full p-0.5 transition-all ${
                        editSettings.use_smt ? "bg-purple-600 flex justify-end" : "bg-zinc-800 flex justify-start"
                      }`}
                    >
                      <span className="w-4 h-4 bg-white rounded-full block shadow-md" />
                    </button>
                  </div>
                  {editSettings.use_smt && (
                    <div className="grid grid-cols-2 gap-3 border-l-2 border-purple-900/40 pl-3">
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-zinc-500 uppercase">SMT Symbol</label>
                        <input
                          type="text"
                          value={editSettings.smt_symbol}
                          onChange={(e) => setEditSettings({ ...editSettings, smt_symbol: e.target.value })}
                          className="w-full bg-black/45 border border-zinc-900 rounded-xl px-3 py-1.5 text-zinc-300 text-xs focus:outline-none"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-zinc-500 uppercase">Min SMT Divergence</label>
                        <input
                          type="number"
                          step="0.1"
                          value={editSettings.smt_min_pips}
                          onChange={(e) => setEditSettings({ ...editSettings, smt_min_pips: parseFloat(e.target.value) })}
                          className="w-full bg-black/45 border border-zinc-900 rounded-xl px-3 py-1.5 text-zinc-300 text-xs focus:outline-none"
                        />
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between bg-black/20 border border-zinc-900 rounded-xl p-3">
                    <div>
                      <span className="text-[10px] font-bold text-zinc-400 block uppercase font-mono">Use RSI Filter</span>
                      <span className="text-[8px] text-zinc-650 flex items-center gap-1 mt-0.5"><AlertCircle className="w-2.5 h-2.5" /> Static</span>
                    </div>
                    <button
                      onClick={() => setEditSettings({ ...editSettings, use_rsi: !editSettings.use_rsi })}
                      className={`w-10 h-5 rounded-full p-0.5 transition-all ${
                        editSettings.use_rsi ? "bg-purple-600 flex justify-end" : "bg-zinc-800 flex justify-start"
                      }`}
                    >
                      <span className="w-4 h-4 bg-white rounded-full block shadow-md" />
                    </button>
                  </div>

                  <div className="flex items-center justify-between bg-black/20 border border-zinc-900 rounded-xl p-3">
                    <div>
                      <span className="text-[10px] font-bold text-zinc-400 block uppercase font-mono">Use ADX Strength Filter</span>
                      <span className="text-[8px] text-zinc-650 flex items-center gap-1 mt-0.5"><AlertCircle className="w-2.5 h-2.5" /> Static</span>
                    </div>
                    <button
                      onClick={() => setEditSettings({ ...editSettings, use_adx: !editSettings.use_adx })}
                      className={`w-10 h-5 rounded-full p-0.5 transition-all ${
                        editSettings.use_adx ? "bg-purple-600 flex justify-end" : "bg-zinc-800 flex justify-start"
                      }`}
                    >
                      <span className="w-4 h-4 bg-white rounded-full block shadow-md" />
                    </button>
                  </div>
                </div>
              )}

              {activeTab === "custom" && (
                <div className="space-y-4">
                  <div className="space-y-2 bg-black/20 border border-zinc-900 rounded-xl p-3">
                    <span className="text-[10px] font-bold text-zinc-400 block uppercase">Save Current to Presets</span>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Preset Name (e.g. MyGoldScalper)"
                        value={newPresetName}
                        onChange={(e) => setNewPresetName(e.target.value)}
                        className="bg-black/50 border border-zinc-800 rounded-xl px-3 py-1.5 text-xs text-white placeholder-zinc-600 font-mono focus:outline-none focus:border-purple-600 flex-1"
                      />
                      <button
                        onClick={saveCustomPreset}
                        className="bg-purple-500 hover:bg-purple-400 text-purple-950 font-bold px-4 py-1.5 rounded-xl transition-all flex items-center gap-1 text-[10px]"
                      >
                        <Plus className="w-3.5 h-3.5" /> Save
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1 custom-scrollbar">
                    <span className="text-[10px] font-bold text-zinc-550 block uppercase font-mono">My Saved presets</span>
                    {customPresets.length === 0 ? (
                      <div className="text-zinc-600 text-center py-4 text-[10px]">No custom presets saved yet</div>
                    ) : (
                      customPresets.map((p, idx) => (
                        <div key={idx} className="flex justify-between items-center bg-black/35 border border-zinc-900 rounded-xl p-3.5">
                          <div>
                            <span className="text-white font-bold block text-[11px]">{p.name}</span>
                            <span className="text-[8px] text-zinc-600 font-mono">
                              Risk: {p.settings.risk}% | Mode: {p.settings.position_mode === 2 ? "Grid" : "Single"}
                            </span>
                          </div>
                          <div className="flex gap-1.5">
                            <button
                              onClick={() => loadCustomPreset(p.settings)}
                              className="bg-purple-500/10 text-purple-400 border border-purple-500/25 hover:bg-purple-500/25 px-2.5 py-1 rounded-lg text-[9px] font-bold transition-all"
                            >
                              Load
                            </button>
                            <button
                              onClick={() => deleteCustomPreset(p.name)}
                              className="text-zinc-500 hover:text-red-400 p-1 transition-all"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="pt-2 border-t border-zinc-900 flex gap-2">
                <button
                  onClick={() => setEditSettings(DEFAULT_SETTINGS)}
                  className="bg-zinc-900/50 hover:bg-zinc-800 text-zinc-400 border border-zinc-900 rounded-xl px-3 py-2.5 transition-all text-[11px] flex items-center justify-center gap-1 font-bold"
                  title="Reset to Factory Defaults"
                >
                  <RefreshCcw className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={handlePushSettings}
                  disabled={pushing}
                  className="flex-1 py-2.5 bg-purple-500 hover:bg-purple-400 text-purple-950 font-bold uppercase tracking-wider rounded-xl transition-all shadow-[0_0_10px_rgba(168,85,247,0.15)] flex items-center justify-center gap-1.5"
                >
                  {pushing ? (
                    "Pushing..."
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" /> Push Settings to EA
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>"""

# Replace the dynamic settings card block in page.tsx
# In page.tsx, the dynamic card is:
# {/* Section 1: Settings Sync Panel */}
# <div className="p-5 bg-[--bg-card] ... flex items-center justify-center gap-1.5" ... </div>
# Wait, let's look for:
#           {/* Section 1: Settings Sync Panel */}
#           <div className="p-5 bg-[--bg-card] border border-[--border] rounded-2xl space-y-4">
#           ...
#           </div>
# Let's extract the start and end line indices of this card.
# The card has "Push Settings to EA" button.
# Let's use re to replace from `{/* Section 1: Settings Sync Panel */}` up to the close of the div, before `{/* Section 2: Settings Change History */}`.

start_pattern = r"\{\/\* Section 1: Settings Sync Panel \*\/\}\s*<div"
# Let's search using direct strings or regex.
# Actually, since it has some comments, let's find the indices.

idx_start = content.find("{/* Section 1: Settings Sync Panel */}")
if idx_start != -1:
    idx_next_section = content.find("{/* Section 2: Settings Change History */}", idx_start)
    if idx_next_section != -1:
        # Find the last </div> before Section 2
        # Section 2 starts with:
        # {/* Section 2: Settings Change History */}
        # <div className="p-5 bg-[--bg-card] ...
        # So we need to cut everything from idx_start up to the line right before idx_next_section.
        pre_content = content[:idx_start]
        post_content = content[idx_next_section:]
        content = pre_content + settings_card_logic + "\\n\\n          " + post_content
        print("Settings card replaced!")
    else:
        print("Could not find section 2 tracker!")
else:
    print("Could not find section 1 tracker!")

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)
print("Updated page.tsx settings UI")
