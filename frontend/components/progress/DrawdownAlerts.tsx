"use client";
import { useState, useEffect } from "react";
import { Bell, AlertTriangle, TrendingDown, TrendingUp, Settings, Volume2, VolumeX, CheckCircle2, X, Wifi, WifiOff } from "lucide-react";
import { Card } from "@/components/ui/card";

interface DrawdownLevel {
  id: string;
  label: string;
  percentage: number;
  enabled: boolean;
  triggered: boolean;
  color: string;
  description: string;
}

const defaultLevels: DrawdownLevel[] = [
  { id: "1", label: "Warning", percentage: 4, enabled: true, triggered: false, color: "#f97316", description: "Approaching limit - reduce risk" },
  { id: "2", label: "Caution", percentage: 6, enabled: true, triggered: false, color: "#f59e0b", description: "Further reduce exposure" },
  { id: "3", label: "Critical", percentage: 8, enabled: true, triggered: false, color: "var(--bear)", description: "Stop trading - review strategy" },
  { id: "4", label: "Breach", percentage: 10, enabled: true, triggered: false, color: "#dc2626", description: "Challenge failed - stop immediately" },
  { id: "5", label: "Account Breach", percentage: 12, enabled: false, triggered: false, color: "#991b1b", description: "Account blow - mandatory stop" },
];

export default function DrawdownAlerts() {
  const [levels, setLevels] = useState<DrawdownLevel[]>(defaultLevels);
  const [currentDrawdown, setCurrentDrawdown] = useState(3.8);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [editingLevel, setEditingLevel] = useState<string | null>(null);
  const [editValue, setEditValue] = useState(0);

  useEffect(() => {
    const updatedLevels = levels.map(level => {
      if (!level.enabled) return level;
      return {
        ...level,
        triggered: currentDrawdown >= level.percentage
      };
    });
    setLevels(updatedLevels);
  }, [currentDrawdown]);

  const toggleLevel = (id: string) => {
    setLevels(levels.map(l => l.id === id ? { ...l, enabled: !l.enabled } : l));
  };

  const updateLevelPercentage = (id: string, percentage: number) => {
    setLevels(levels.map(l => l.id === id ? { ...l, percentage } : l));
    setEditingLevel(null);
  };

  const triggeredLevels = levels.filter(l => l.enabled && l.triggered);
  const nextTriggerLevel = levels
    .filter(l => l.enabled && !l.triggered)
    .sort((a, b) => a.percentage - b.percentage)[0];
  const percentToNext = nextTriggerLevel ? nextTriggerLevel.percentage - currentDrawdown : 0;

  const renderSlider = () => (
    <div className="mb-2">
      <input
        type="range"
        min="0"
        max="12"
        step="0.1"
        value={currentDrawdown}
        onChange={(e) => setCurrentDrawdown(Number(e.target.value))}
        className="w-full h-3 rounded-lg appearance-none cursor-pointer"
        style={{ background: "var(--bg-input)" }}
      />
    </div>
  );

  return (
    <Card className="p-4" style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)" }}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Bell className="w-5 h-5" style={{ color: triggeredLevels.length > 0 ? "var(--bear)" : "var(--accent)" }} />
          <h3 className="font-bold text-sm" style={{ color: "var(--text-primary)" }}>Drawdown Alerts</h3>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="p-1.5 rounded-lg"
            style={{ 
              background: soundEnabled ? "var(--bull)" : "var(--bg-input)",
              color: soundEnabled ? "white" : "var(--text-tertiary)"
            }}
          >
            {soundEnabled ? <Volume2 className="w-3 h-3" /> : <VolumeX className="w-3 h-3" />}
          </button>
          <button
            onClick={() => setNotificationsEnabled(!notificationsEnabled)}
            className="p-1.5 rounded-lg"
            style={{ 
              background: notificationsEnabled ? "var(--accent)" : "var(--bg-input)",
              color: notificationsEnabled ? "white" : "var(--text-tertiary)"
            }}
          >
            {notificationsEnabled ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
          </button>
        </div>
      </div>

      {triggeredLevels.length > 0 && (
        <div className="mb-4 p-3 rounded-lg flex items-center gap-2" style={{ background: "rgba(239,68,68,0.15)", border: "1px solid var(--bear)" }}>
          <AlertTriangle className="w-5 h-5 flex-shrink-0" style={{ color: "var(--bear)" }} />
          <div>
            <span className="text-xs font-bold block" style={{ color: "var(--bear)" }}>
              Drawdown Alert {triggeredLevels[0].label} Triggered!
            </span>
            <span className="text-[10px]" style={{ color: "var(--text-tertiary)" }}>
              {triggeredLevels[0].description}
            </span>
          </div>
        </div>
      )}

      <div className="p-4 rounded-xl mb-4 text-center" style={{ background: "var(--bg-input)" }}>
        <div className="text-4xl font-black" style={{ color: currentDrawdown >= 8 ? "var(--bear)" : currentDrawdown >= 4 ? "#f97316" : "var(--text-primary)" }}>
          -{currentDrawdown.toFixed(1)}%
        </div>
        <div className="text-xs" style={{ color: "var(--text-tertiary)" }}>
          Current Drawdown
        </div>
        {renderSlider()}
        {nextTriggerLevel && (
          <div className="text-xs mt-2" style={{ color: nextTriggerLevel.color }}>
            {percentToNext.toFixed(1)}% to {nextTriggerLevel.label} ({nextTriggerLevel.percentage}%)
          </div>
        )}
      </div>

      <div className="space-y-1">
        {levels.map(level => (
          <div
            key={level.id}
            className={`flex items-center justify-between p-2 rounded-lg transition-all ${level.enabled ? "" : "opacity-50"}`}
            style={{ background: level.triggered && level.enabled ? "rgba(239,68,68,0.2)" : "var(--bg-input)" }}
          >
            <div className="flex items-center gap-2">
              <button
                onClick={() => toggleLevel(level.id)}
                className={`w-5 h-5 rounded flex items-center justify-center transition-colors ${
                  level.enabled ? "" : "opacity-50"
                }`}
                style={{ 
                  background: level.triggered && level.enabled ? level.color : level.enabled ? level.color : "var(--bg-primary)",
                  opacity: level.enabled ? 1 : 0.5
                }}
              >
                {(level.triggered || !level.enabled) && (
                  level.triggered && level.enabled ? <AlertTriangle className="w-3 h-3 text-white" /> :
                  level.enabled ? <Bell className="w-3 h-3 text-white" /> : null
                )}
              </button>
              <div>
                <span className="text-xs font-semibold" style={{ color: "var(--text-primary)" }}>
                  {level.label}
                </span>
                <span className="text-[10px] block" style={{ color: "var(--text-tertiary)" }}>
                  {level.description}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {editingLevel === level.id ? (
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    value={editValue}
                    onChange={(e) => setEditValue(Number(e.target.value))}
                    className="w-12 text-xs px-2 py-1 rounded text-center"
                    style={{ background: "var(--bg-primary)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
                  />
                  <button
                    onClick={() => updateLevelPercentage(level.id, editValue)}
                    className="px-2 py-1 rounded"
                    style={{ background: "var(--bull)", color: "white" }}
                  >
                    <CheckCircle2 className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <>
                  <span 
                    className="text-sm font-bold"
                    style={{ color: level.enabled ? level.color : "var(--text-tertiary)" }}
                  >
                    -{level.percentage}%
                  </span>
                  <button
                    onClick={() => {
                      setEditingLevel(level.id);
                      setEditValue(level.percentage);
                    }}
                    className="p-1 rounded hover:opacity-80"
                    style={{ color: "var(--text-tertiary)" }}
                  >
                    <Settings className="w-3 h-3" />
                  </button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 p-2 rounded-lg flex items-center gap-2" style={{ background: "var(--bg-input)" }}>
        <Settings className="w-4 h-4" style={{ color: "var(--text-tertiary)" }} />
        <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>
          Tap settings icon to customize alert thresholds
        </span>
      </div>
    </Card>
  );
}
