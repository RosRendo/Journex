import re

file_path = "d:/FOR RENDO (ONLY )/Personal Project/Dashboard/frontend/app/bot/page.tsx"

with open(file_path, "r", encoding="utf-8") as f:
    content = f.read().replace("\r\n", "\n")

# 1. Add handleLoadPreset function
func_logic = """
  const handleLoadPreset = async (presetName: string) => {
    let payload = {};
    if(presetName === 'safe') {
      payload = { position_mode: "SINGLE", pyramid_cooldown: 15, use_equity_trail: "false" };
    } else if(presetName === 'controlled') {
      payload = { position_mode: "GRID", pyramid_cooldown: 5, use_equity_trail: "true", equity_trail_activate: 10.0, hard_stop_pct: 15.0 };
    } else if(presetName === 'wild') {
      payload = { position_mode: "GRID", pyramid_cooldown: 1, use_equity_trail: "true", equity_trail_activate: 20.0, hard_stop_pct: 40.0 };
    }
    
    try {
      setPushing(true);
      const res = await fetch(`${BRIDGE}/api/ea/settings/${selectedMagic}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Preset loaded for Magic #${selectedMagic}`);
        loadData();
      } else {
        toast.error("Failed to queue preset update");
      }
    } catch (e) {
      toast.error("Bridge connection failure");
    } finally {
      setPushing(false);
    }
  };

  const handlePushSettings = async () => {"""

if "handleLoadPreset" not in content:
    content = content.replace("  const handlePushSettings = async () => {", func_logic)

# 2. Add UI for Presets
ui_logic = """            <div className="p-5 bg-[--bg-card] border border-[--border] rounded-2xl">
              <h3 className="text-xs font-bold uppercase tracking-wider font-mono text-zinc-400 mb-4 flex items-center gap-1.5">
                <Settings className="w-4 h-4 text-purple-400" />
                Live Configuration
              </h3>
              
              {/* STRATEGY PRESETS */}
              <div>
                <div className="flex justify-between font-bold text-[10px] mb-2 text-zinc-500 uppercase tracking-wider">
                  Quick Load Strategy Presets
                </div>
                <div className="grid grid-cols-3 gap-2 mb-4">
                  <button onClick={() => handleLoadPreset('safe')} disabled={pushing} className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 p-2 rounded-xl text-xs font-bold hover:bg-emerald-500/30 transition-all flex flex-col items-center gap-1 justify-center">
                    <CheckCircle2 className="w-4 h-4" /> Safe
                  </button>
                  <button onClick={() => handleLoadPreset('controlled')} disabled={pushing} className="bg-amber-500/20 text-amber-400 border border-amber-500/30 p-2 rounded-xl text-xs font-bold hover:bg-amber-500/30 transition-all flex flex-col items-center gap-1 justify-center">
                    <Activity className="w-4 h-4" /> Grid
                  </button>
                  <button onClick={() => handleLoadPreset('wild')} disabled={pushing} className="bg-rose-500/20 text-rose-400 border border-rose-500/30 p-2 rounded-xl text-xs font-bold hover:bg-rose-500/30 transition-all flex flex-col items-center gap-1 justify-center">
                    <Zap className="w-4 h-4" /> Wild
                  </button>
                </div>
              </div>

              <div className="space-y-6">"""

old_ui = """            <div className="p-5 bg-[--bg-card] border border-[--border] rounded-2xl">
              <h3 className="text-xs font-bold uppercase tracking-wider font-mono text-zinc-400 mb-4 flex items-center gap-1.5">
                <Settings className="w-4 h-4 text-purple-400" />
                Live Configuration
              </h3>
              <div className="space-y-6">"""

if "Quick Load Strategy Presets" not in content:
    content = content.replace(old_ui, ui_logic)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)
print("Updated page.tsx")
